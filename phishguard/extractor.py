from __future__ import annotations

from pathlib import Path

from phishguard.config_store import get_runtime_config
from phishguard.models import MailFeatures, MailInput
from phishguard.parser import extract_domain, parse_links


def extract_features(mail: MailInput) -> MailFeatures:
    runtime_config = get_runtime_config()
    domains = runtime_config["domains"]
    attachments_config = runtime_config["attachments"]
    phrases = runtime_config["phrases"]

    suspicious_tlds = set(domains["suspicious_tlds"])
    shortener_domains_config = set(domains["shortener_domains"])
    suspicious_attachment_extensions = set(attachments_config["suspicious_extensions"])
    double_extension_bait_extensions = set(attachments_config["double_extension_bait_extensions"])

    links = parse_links(mail.body_text, mail.body_html)
    link_domains = sorted({link.domain for link in links if link.domain})

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
    bank_change_hits = sorted({phrase for phrase in phrases["bank_change_phrases"] if phrase in combined_text})
    invoice_pressure_hits = sorted({phrase for phrase in phrases["invoice_pressure_phrases"] if phrase in combined_text})
    custom_phrase_hits: dict[str, list[str]] = {}

    for rule_id, rule_phrases in phrases.get("custom_rule_phrases", {}).items():
        hits = sorted(
            {
                phrase
                for phrase in rule_phrases
                if isinstance(phrase, str) and phrase and phrase.lower() in combined_text
            }
        )
        if hits:
            custom_phrase_hits[rule_id] = hits

    display_target_mismatches = []
    for link in links:
        if not link.display_text:
            continue
        display_domain = extract_domain(link.display_text) if "://" in link.display_text else link.display_text.lower()
        if display_domain and "." in display_domain and display_domain != link.domain:
            display_target_mismatches.append(f"{link.display_text} -> {link.domain}")

    return MailFeatures(
        sender_domain=mail.sender_domain.lower(),
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
        invoice_pressure_hits=invoice_pressure_hits,
        custom_phrase_hits=custom_phrase_hits,
    )
