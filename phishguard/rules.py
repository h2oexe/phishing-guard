from __future__ import annotations

from phishguard.config import COMPANY_TRUSTED_DOMAINS, RULE_WEIGHTS, TRUSTED_RELATED_DOMAINS
from phishguard.models import MailFeatures, RuleMatch


def evaluate_rules(features: MailFeatures) -> list[RuleMatch]:
    rules = [
        _domain_link_mismatch(features),
        _display_target_mismatch(features),
        _suspicious_tld(features),
        _shortener_link(features),
        _suspicious_attachment(features),
        _double_extension(features),
        _phishing_keywords(features),
        _ip_link(features),
        _urgency_language(features),
        _account_threat_language(features),
        _unexpected_attachment_request(features),
        _payment_request_language(features),
        _bank_change_language(features),
        _invoice_pressure_language(features),
    ]
    return [rule for rule in rules if rule.matched]


def _domain_link_mismatch(features: MailFeatures) -> RuleMatch:
    trusted_domains = {
        _normalize_domain(item) for item in TRUSTED_RELATED_DOMAINS | COMPANY_TRUSTED_DOMAINS
    }
    mismatches = [
        domain
        for domain in features.link_domains
        if _normalize_domain(domain) != _normalize_domain(features.sender_domain)
        and _normalize_domain(domain) not in trusted_domains
    ]
    return RuleMatch(
        rule_id="DOMAIN_LINK_MISMATCH",
        matched=bool(mismatches),
        weight=RULE_WEIGHTS["DOMAIN_LINK_MISMATCH"],
        confidence="low",
        reason="Gonderen domaini ile link domaini uyusmuyor",
        details={"domains": mismatches},
    )


def _display_target_mismatch(features: MailFeatures) -> RuleMatch:
    return RuleMatch(
        rule_id="DISPLAY_TARGET_MISMATCH",
        matched=bool(features.display_target_mismatches),
        weight=RULE_WEIGHTS["DISPLAY_TARGET_MISMATCH"],
        confidence="high",
        reason="Gorunen link ile gercek hedef farkli",
        details={"mismatches": features.display_target_mismatches},
    )


def _suspicious_tld(features: MailFeatures) -> RuleMatch:
    return RuleMatch(
        rule_id="SUSPICIOUS_TLD",
        matched=bool(features.suspicious_tlds),
        weight=RULE_WEIGHTS["SUSPICIOUS_TLD"],
        confidence="medium",
        reason="Supheli alan adi uzantisi bulundu",
        details={"tlds": features.suspicious_tlds},
    )


def _shortener_link(features: MailFeatures) -> RuleMatch:
    return RuleMatch(
        rule_id="SHORTENER_LINK",
        matched=bool(features.shortener_domains),
        weight=RULE_WEIGHTS["SHORTENER_LINK"],
        confidence="low",
        reason="Kisa link servisi kullaniliyor",
        details={"domains": features.shortener_domains},
    )


def _suspicious_attachment(features: MailFeatures) -> RuleMatch:
    return RuleMatch(
        rule_id="SUSPICIOUS_ATTACHMENT",
        matched=bool(features.suspicious_attachments),
        weight=RULE_WEIGHTS["SUSPICIOUS_ATTACHMENT"],
        confidence="medium",
        reason="Supheli ek dosya bulundu",
        details={"attachments": features.suspicious_attachments},
    )


def _double_extension(features: MailFeatures) -> RuleMatch:
    return RuleMatch(
        rule_id="DOUBLE_EXTENSION",
        matched=bool(features.double_extension_attachments),
        weight=RULE_WEIGHTS["DOUBLE_EXTENSION"],
        confidence="high",
        reason="Cift uzantili ek dosya tespit edildi",
        details={"attachments": features.double_extension_attachments},
    )


def _phishing_keywords(features: MailFeatures) -> RuleMatch:
    return RuleMatch(
        rule_id="PHISHING_KEYWORDS",
        matched=bool(features.keyword_hits),
        weight=RULE_WEIGHTS["PHISHING_KEYWORDS"],
        confidence="low",
        reason="Supheli ifadeler tespit edildi",
        details={"keywords": features.keyword_hits},
    )


def _ip_link(features: MailFeatures) -> RuleMatch:
    ip_links = [link.url for link in features.links if link.is_ip]
    return RuleMatch(
        rule_id="IP_LINK",
        matched=bool(ip_links),
        weight=RULE_WEIGHTS["IP_LINK"],
        confidence="medium",
        reason="Link dogrudan IP adresine gidiyor",
        details={"links": ip_links},
    )


def _urgency_language(features: MailFeatures) -> RuleMatch:
    return RuleMatch(
        rule_id="URGENCY_LANGUAGE",
        matched=bool(features.urgency_hits),
        weight=RULE_WEIGHTS["URGENCY_LANGUAGE"],
        confidence="medium",
        reason="Baski ve zaman baskisi olusturan ifadeler tespit edildi",
        details={"phrases": features.urgency_hits},
    )


def _account_threat_language(features: MailFeatures) -> RuleMatch:
    return RuleMatch(
        rule_id="ACCOUNT_THREAT_LANGUAGE",
        matched=bool(features.account_threat_hits),
        weight=RULE_WEIGHTS["ACCOUNT_THREAT_LANGUAGE"],
        confidence="medium",
        reason="Hesap guvenligi veya kapatma tehdidi iceren ifadeler bulundu",
        details={"phrases": features.account_threat_hits},
    )


def _unexpected_attachment_request(features: MailFeatures) -> RuleMatch:
    matched = bool(features.attachment_request_hits and features.suspicious_attachments or features.attachment_request_hits)
    return RuleMatch(
        rule_id="UNEXPECTED_ATTACHMENT_REQUEST",
        matched=matched,
        weight=RULE_WEIGHTS["UNEXPECTED_ATTACHMENT_REQUEST"],
        confidence="medium",
        reason="Beklenmedik bir eki acma veya indirme talebi tespit edildi",
        details={"phrases": features.attachment_request_hits},
    )


def _payment_request_language(features: MailFeatures) -> RuleMatch:
    return RuleMatch(
        rule_id="PAYMENT_REQUEST_LANGUAGE",
        matched=bool(features.payment_request_hits),
        weight=RULE_WEIGHTS["PAYMENT_REQUEST_LANGUAGE"],
        confidence="medium",
        reason="Odeme veya fatura talebi iceren ifadeler bulundu",
        details={"phrases": features.payment_request_hits},
    )


def _bank_change_language(features: MailFeatures) -> RuleMatch:
    return RuleMatch(
        rule_id="BANK_CHANGE_LANGUAGE",
        matched=bool(features.bank_change_hits),
        weight=RULE_WEIGHTS["BANK_CHANGE_LANGUAGE"],
        confidence="medium",
        reason="IBAN, hesap veya banka bilgisi degisikligi bildirimi tespit edildi",
        details={"phrases": features.bank_change_hits},
    )


def _invoice_pressure_language(features: MailFeatures) -> RuleMatch:
    return RuleMatch(
        rule_id="INVOICE_PRESSURE_LANGUAGE",
        matched=bool(features.invoice_pressure_hits),
        weight=RULE_WEIGHTS["INVOICE_PRESSURE_LANGUAGE"],
        confidence="medium",
        reason="Odeme baskisi veya sure siniri iceren ifadeler bulundu",
        details={"phrases": features.invoice_pressure_hits},
    )


def _normalize_domain(domain: str) -> str:
    value = domain.strip().lower()
    if value.startswith("www."):
        return value[4:]
    return value
