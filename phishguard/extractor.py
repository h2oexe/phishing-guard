from __future__ import annotations

from pathlib import Path
import re

from phishguard.config_store import get_runtime_config
from phishguard.models import MailFeatures, MailInput
from phishguard.parser import extract_domain, parse_links


def extract_features(mail: MailInput) -> MailFeatures:
    runtime_config = get_runtime_config()
    domains = runtime_config["domains"]
    attachments_config = runtime_config["attachments"]
    phrases = runtime_config["phrases"]
    trusted_ibans = {_normalize_iban(value) for value in domains.get("trusted_ibans", []) if _normalize_iban(value)}

    suspicious_tlds = set(domains["suspicious_tlds"])
    shortener_domains_config = set(domains["shortener_domains"])
    suspicious_attachment_extensions = set(attachments_config["suspicious_extensions"])
    double_extension_bait_extensions = set(attachments_config["double_extension_bait_extensions"])

    links = parse_links(mail.body_text, mail.body_html)
    link_domains = sorted({link.domain for link in links if link.domain})
    auth_results = _extract_auth_results(mail.transport_headers)
    detected_ibans = _extract_ibans(" ".join([mail.subject, mail.body_text]))
    trusted_iban_hits = sorted(iban for iban in detected_ibans if iban in trusted_ibans)

    suspicious_tld_hits = sorted(
        {
            tld
            for domain in [mail.sender_domain, *link_domains]
            for tld in suspicious_tlds
            if domain.endswith(tld)
        }
    )
    shortener_domains = sorted({domain for domain in link_domains if domain in shortener_domains_config})

    suspicious_attachments: list[str] = []
    double_extension_attachments: list[str] = []
    for attachment in mail.attachments:
        suffixes = [suffix.lower() for suffix in Path(attachment).suffixes]
        if suffixes and suffixes[-1] in suspicious_attachment_extensions:
            suspicious_attachments.append(attachment)
        if (
            len(suffixes) >= 2
            and suffixes[-1] in suspicious_attachment_extensions
            and suffixes[-2] in double_extension_bait_extensions
        ):
            double_extension_attachments.append(attachment)

    combined_text = " ".join([mail.subject, mail.body_text]).lower()
    keyword_hits = sorted({keyword for keyword in phrases["phishing_keywords"] if keyword in combined_text})
    urgency_hits = sorted({phrase for phrase in phrases["urgency_phrases"] if phrase in combined_text})
    account_threat_hits = sorted({phrase for phrase in phrases["account_threat_phrases"] if phrase in combined_text})
    extortion_hits = sorted({phrase for phrase in phrases["extortion_phrases"] if phrase in combined_text})
    attachment_request_hits = sorted({phrase for phrase in phrases["attachment_request_phrases"] if phrase in combined_text})
    payment_request_hits = sorted({phrase for phrase in phrases["payment_request_phrases"] if phrase in combined_text})
    bank_change_hits = _extract_bank_change_hits(combined_text, phrases["bank_change_phrases"])
    bank_context_hits = _extract_bank_context_hits(combined_text)
    invoice_pressure_hits = sorted({phrase for phrase in phrases["invoice_pressure_phrases"] if phrase in combined_text})
    custom_phrase_hits: dict[str, list[str]] = {}
    custom_privileged_missing: dict[str, list[str]] = {}
    custom_rule_modes = runtime_config.get("custom_rule_modes", {})
    custom_rule_missing_policies = runtime_config.get("custom_rule_missing_policies", {})
    custom_rule_missing_contexts = runtime_config.get("custom_rule_missing_contexts", {})

    for rule_id, rule_phrases in phrases.get("custom_rule_phrases", {}).items():
        normalized_phrases = [
            phrase.strip().lower()
            for phrase in rule_phrases
            if isinstance(phrase, str) and phrase and phrase.strip()
        ]
        hits = sorted({phrase for phrase in normalized_phrases if phrase in combined_text})
        if hits:
            custom_phrase_hits[rule_id] = hits
        elif custom_rule_modes.get(rule_id) == "privileged" and custom_rule_missing_policies.get(rule_id) and normalized_phrases:
            context_phrases = [
                phrase.strip().lower()
                for phrase in custom_rule_missing_contexts.get(rule_id, [])
                if isinstance(phrase, str) and phrase and phrase.strip()
            ]
            context_hits = sorted({phrase for phrase in context_phrases if phrase in combined_text})
            if context_hits:
                custom_privileged_missing[rule_id] = context_hits

    display_target_mismatches = []
    for link in links:
        if not link.display_text:
            continue
        display_domain = extract_domain(link.display_text) if "://" in link.display_text else link.display_text.lower()
        if display_domain and "." in display_domain and display_domain != link.domain:
            display_target_mismatches.append(f"{link.display_text} -> {link.domain}")

    return MailFeatures(
        sender_domain=mail.sender_domain.lower(),
        transport_headers=mail.transport_headers,
        attachments=list(mail.attachments),
        links=links,
        link_domains=link_domains,
        suspicious_tlds=suspicious_tld_hits,
        shortener_domains=shortener_domains,
        suspicious_attachments=suspicious_attachments,
        double_extension_attachments=double_extension_attachments,
        keyword_hits=keyword_hits,
        display_target_mismatches=display_target_mismatches,
        urgency_hits=urgency_hits,
        account_threat_hits=account_threat_hits,
        extortion_hits=extortion_hits,
        attachment_request_hits=attachment_request_hits,
        payment_request_hits=payment_request_hits,
        bank_change_hits=bank_change_hits,
        bank_context_hits=bank_context_hits,
        invoice_pressure_hits=invoice_pressure_hits,
        spf_result=auth_results["spf"],
        dkim_result=auth_results["dkim"],
        dmarc_result=auth_results["dmarc"],
        detected_ibans=detected_ibans,
        trusted_iban_hits=trusted_iban_hits,
        custom_phrase_hits=custom_phrase_hits,
        custom_privileged_missing=custom_privileged_missing,
    )


def _extract_auth_results(transport_headers: str) -> dict[str, str]:
    unfolded_headers = _unfold_headers(transport_headers)
    auth_values = {"spf": "", "dkim": "", "dmarc": ""}

    preferred_blocks: list[str] = []
    fallback_blocks: list[str] = []
    received_spf_blocks: list[str] = []

    for line in unfolded_headers:
        lowered = line.lower()
        if lowered.startswith("authentication-results:"):
            preferred_blocks.append(line)
        elif lowered.startswith("arc-authentication-results:"):
            fallback_blocks.append(line)
        elif lowered.startswith("received-spf:"):
            received_spf_blocks.append(line)

    for token in ("spf", "dkim", "dmarc"):
        auth_values[token] = _extract_token_result(preferred_blocks, token)
        if not auth_values[token]:
            auth_values[token] = _extract_token_result(fallback_blocks, token)

    if not auth_values["spf"]:
        auth_values["spf"] = _extract_received_spf(received_spf_blocks)

    return auth_values


def _unfold_headers(transport_headers: str) -> list[str]:
    if not transport_headers:
        return []

    text = transport_headers.replace("\r\n", "\n").replace("\r", "\n")
    lines = text.split("\n")
    unfolded: list[str] = []

    for line in lines:
        if not line:
            continue
        if line.startswith((" ", "\t")) and unfolded:
            unfolded[-1] = unfolded[-1] + " " + line.strip()
        else:
            unfolded.append(line.strip())

    return unfolded


def _extract_token_result(header_lines: list[str], token: str) -> str:
    pattern = re.compile(
        rf"\b{re.escape(token)}\s*=\s*(pass|fail|softfail|neutral|none|temperror|permerror)\b",
        re.IGNORECASE,
    )

    for line in header_lines:
        match = pattern.search(line)
        if match:
            return match.group(1).lower()

    return ""


def _extract_received_spf(header_lines: list[str]) -> str:
    pattern = re.compile(r"\b(pass|fail|softfail|neutral|none|temperror|permerror)\b", re.IGNORECASE)

    for line in header_lines:
        match = pattern.search(line)
        if match:
            return match.group(1).lower()

    return ""


def _extract_bank_change_hits(combined_text: str, configured_phrases: list[str]) -> list[str]:
    raw_hits = {
        phrase
        for phrase in configured_phrases
        if isinstance(phrase, str) and phrase and phrase in combined_text
    }

    generic_bank_terms = {
        "iban",
        "swift",
        "account details",
        "hesap detaylari",
        "hesap detayları",
    }
    change_markers = (
        "new",
        "updated",
        "update",
        "degis",
        "değiş",
        "guncelle",
        "güncelle",
    )

    explicit_hits = sorted(
        phrase for phrase in raw_hits if phrase not in generic_bank_terms or any(marker in phrase for marker in change_markers)
    )

    return explicit_hits


def _extract_bank_context_hits(combined_text: str) -> list[str]:
    context_terms = {
        "iban",
        "swift",
        "banka",
        "hesap",
        "hesap bilgisi",
        "hesap detay",
        "payment",
        "ödeme",
        "odeme",
        "dekont",
        "havale",
        "eft",
        "transfer",
        "alıcı",
        "alici",
        "recipient",
    }
    return sorted(term for term in context_terms if term in combined_text)


def _extract_ibans(text: str) -> list[str]:
    if not text:
        return []

    pattern = re.compile(r"\bTR\d{2}(?:\s?\d{4}){5}\s?\d{2}\b", re.IGNORECASE)
    normalized = {_normalize_iban(match.group(0)) for match in pattern.finditer(text)}
    return sorted(value for value in normalized if value)


def _normalize_iban(value: str) -> str:
    return re.sub(r"\s+", "", str(value or "")).upper()
