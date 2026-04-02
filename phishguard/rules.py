from __future__ import annotations

from phishguard.config_store import get_runtime_config
from phishguard.models import MailFeatures, RuleMatch


def evaluate_rules(features: MailFeatures) -> list[RuleMatch]:
    runtime_config = get_runtime_config()
    disabled_rules = set(runtime_config.get("disabled_rules", []))

    rules = [
        _domain_link_mismatch(features, runtime_config),
        _display_target_mismatch(features, runtime_config),
        _suspicious_tld(features, runtime_config),
        _shortener_link(features, runtime_config),
        _suspicious_attachment(features, runtime_config),
        _double_extension(features, runtime_config),
        _phishing_keywords(features, runtime_config),
        _ip_link(features, runtime_config),
        _urgency_language(features, runtime_config),
        _account_threat_language(features, runtime_config),
        _extortion_language(features, runtime_config),
        _unexpected_attachment_request(features, runtime_config),
        _payment_request_language(features, runtime_config),
        _bank_change_language(features, runtime_config),
        _invoice_pressure_language(features, runtime_config),
        _spf_fail(features, runtime_config),
        _spf_softfail(features, runtime_config),
        _dkim_fail(features, runtime_config),
        _dmarc_fail(features, runtime_config),
    ]
    rules.extend(_custom_phrase_rules(features, runtime_config))
    return [rule for rule in rules if rule.matched and rule.rule_id not in disabled_rules]


def _domain_link_mismatch(features: MailFeatures, runtime_config: dict) -> RuleMatch:
    domains = runtime_config["domains"]
    trusted_domains = {
        _normalize_domain(item)
        for item in set(domains["trusted_related_domains"]) | set(domains["company_trusted_domains"])
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
        weight=_rule_weight(runtime_config, "DOMAIN_LINK_MISMATCH"),
        confidence="low",
        reason="Gönderen alan adı ile bağlantı alan adı uyuşmuyor",
        details={"domains": mismatches},
    )


def _display_target_mismatch(features: MailFeatures, runtime_config: dict) -> RuleMatch:
    return RuleMatch(
        rule_id="DISPLAY_TARGET_MISMATCH",
        matched=bool(features.display_target_mismatches),
        weight=_rule_weight(runtime_config, "DISPLAY_TARGET_MISMATCH"),
        confidence="high",
        reason="Görünen bağlantı ile gerçek hedef farklı",
        details={"mismatches": features.display_target_mismatches},
    )


def _suspicious_tld(features: MailFeatures, runtime_config: dict) -> RuleMatch:
    return RuleMatch(
        rule_id="SUSPICIOUS_TLD",
        matched=bool(features.suspicious_tlds),
        weight=_rule_weight(runtime_config, "SUSPICIOUS_TLD"),
        confidence="medium",
        reason="Şüpheli alan adı uzantısı bulundu",
        details={"tlds": features.suspicious_tlds},
    )


def _shortener_link(features: MailFeatures, runtime_config: dict) -> RuleMatch:
    return RuleMatch(
        rule_id="SHORTENER_LINK",
        matched=bool(features.shortener_domains),
        weight=_rule_weight(runtime_config, "SHORTENER_LINK"),
        confidence="low",
        reason="Kısa bağlantı servisi kullanılıyor",
        details={"domains": features.shortener_domains},
    )


def _suspicious_attachment(features: MailFeatures, runtime_config: dict) -> RuleMatch:
    return RuleMatch(
        rule_id="SUSPICIOUS_ATTACHMENT",
        matched=bool(features.suspicious_attachments),
        weight=_rule_weight(runtime_config, "SUSPICIOUS_ATTACHMENT"),
        confidence="medium",
        reason="Şüpheli ek dosya bulundu",
        details={"attachments": features.suspicious_attachments},
    )


def _double_extension(features: MailFeatures, runtime_config: dict) -> RuleMatch:
    return RuleMatch(
        rule_id="DOUBLE_EXTENSION",
        matched=bool(features.double_extension_attachments),
        weight=_rule_weight(runtime_config, "DOUBLE_EXTENSION"),
        confidence="high",
        reason="Çift uzantılı ek dosya tespit edildi",
        details={"attachments": features.double_extension_attachments},
    )


def _phishing_keywords(features: MailFeatures, runtime_config: dict) -> RuleMatch:
    return RuleMatch(
        rule_id="PHISHING_KEYWORDS",
        matched=bool(features.keyword_hits),
        weight=_rule_weight(runtime_config, "PHISHING_KEYWORDS"),
        confidence="low",
        reason="Şüpheli ifadeler tespit edildi",
        details={"keywords": features.keyword_hits},
    )


def _ip_link(features: MailFeatures, runtime_config: dict) -> RuleMatch:
    ip_links = [link.url for link in features.links if link.is_ip]
    return RuleMatch(
        rule_id="IP_LINK",
        matched=bool(ip_links),
        weight=_rule_weight(runtime_config, "IP_LINK"),
        confidence="medium",
        reason="Bağlantı doğrudan IP adresine yönleniyor",
        details={"links": ip_links},
    )


def _urgency_language(features: MailFeatures, runtime_config: dict) -> RuleMatch:
    return RuleMatch(
        rule_id="URGENCY_LANGUAGE",
        matched=bool(features.urgency_hits),
        weight=_rule_weight(runtime_config, "URGENCY_LANGUAGE"),
        confidence="medium",
        reason="Zaman baskısı oluşturan ifadeler bulundu",
        details={"phrases": features.urgency_hits},
    )


def _account_threat_language(features: MailFeatures, runtime_config: dict) -> RuleMatch:
    return RuleMatch(
        rule_id="ACCOUNT_THREAT_LANGUAGE",
        matched=bool(features.account_threat_hits),
        weight=_rule_weight(runtime_config, "ACCOUNT_THREAT_LANGUAGE"),
        confidence="medium",
        reason="Hesap güvenliği veya kapatma tehdidi içeren ifadeler bulundu",
        details={"phrases": features.account_threat_hits},
    )


def _extortion_language(features: MailFeatures, runtime_config: dict) -> RuleMatch:
    return RuleMatch(
        rule_id="EXTORTION_LANGUAGE",
        matched=bool(features.extortion_hits),
        weight=_rule_weight(runtime_config, "EXTORTION_LANGUAGE"),
        confidence="high",
        reason="Şantaj, veri şifreleme veya erişim kaybı tehdidi içeren ifadeler bulundu",
        details={"phrases": features.extortion_hits},
    )


def _unexpected_attachment_request(features: MailFeatures, runtime_config: dict) -> RuleMatch:
    matched = (
        bool(features.attachment_request_hits)
        and bool(features.attachments)
        and (
            bool(features.suspicious_attachments)
            or bool(features.double_extension_attachments)
            or bool(features.account_threat_hits)
            or bool(features.extortion_hits)
            or bool(features.urgency_hits)
        )
    )
    return RuleMatch(
        rule_id="UNEXPECTED_ATTACHMENT_REQUEST",
        matched=matched,
        weight=_rule_weight(runtime_config, "UNEXPECTED_ATTACHMENT_REQUEST"),
        confidence="medium",
        reason="Beklenmedik ek dosya açma veya indirme talebi bulundu",
        details={
            "phrases": features.attachment_request_hits,
            "attachments": features.attachments,
        },
    )


def _payment_request_language(features: MailFeatures, runtime_config: dict) -> RuleMatch:
    return RuleMatch(
        rule_id="PAYMENT_REQUEST_LANGUAGE",
        matched=bool(features.payment_request_hits),
        weight=_rule_weight(runtime_config, "PAYMENT_REQUEST_LANGUAGE"),
        confidence="medium",
        reason="Ödeme veya fatura talebi içeren ifadeler bulundu",
        details={"phrases": features.payment_request_hits},
    )


def _bank_change_language(features: MailFeatures, runtime_config: dict) -> RuleMatch:
    only_trusted_ibans = bool(features.detected_ibans) and len(features.detected_ibans) == len(features.trusted_iban_hits)
    has_untrusted_iban = bool(features.detected_ibans) and len(features.detected_ibans) > len(features.trusted_iban_hits)
    has_bank_context = bool(features.bank_change_hits or features.bank_context_hits or features.payment_request_hits)
    mixed_iban_suspicion = has_untrusted_iban and has_bank_context
    return RuleMatch(
        rule_id="BANK_CHANGE_LANGUAGE",
        matched=(bool(features.bank_change_hits) and not only_trusted_ibans) or mixed_iban_suspicion,
        weight=_rule_weight(runtime_config, "BANK_CHANGE_LANGUAGE"),
        confidence="medium",
        reason="IBAN veya banka bilgisi değişikliği bildirimi bulundu",
        details={
            "phrases": features.bank_change_hits,
            "bank_context_hits": features.bank_context_hits,
            "payment_request_hits": features.payment_request_hits,
            "detected_ibans": features.detected_ibans,
            "trusted_iban_hits": features.trusted_iban_hits,
        },
    )


def _invoice_pressure_language(features: MailFeatures, runtime_config: dict) -> RuleMatch:
    return RuleMatch(
        rule_id="INVOICE_PRESSURE_LANGUAGE",
        matched=bool(features.invoice_pressure_hits),
        weight=_rule_weight(runtime_config, "INVOICE_PRESSURE_LANGUAGE"),
        confidence="medium",
        reason="Ödeme baskısı veya süre sınırı içeren ifadeler bulundu",
        details={"phrases": features.invoice_pressure_hits},
    )


def _custom_phrase_rules(features: MailFeatures, runtime_config: dict) -> list[RuleMatch]:
    labels = runtime_config.get("rule_chip_labels", {})
    custom_rule_modes = runtime_config.get("custom_rule_modes", {})
    matches: list[RuleMatch] = []

    for rule_id in sorted(features.custom_phrase_hits):
        if custom_rule_modes.get(rule_id) == "privileged":
            continue
        label = str(labels.get(rule_id, rule_id)).strip() or rule_id
        matches.append(
            RuleMatch(
                rule_id=rule_id,
                matched=True,
                weight=_rule_weight(runtime_config, rule_id),
                confidence="medium",
                reason=f"{label} ile ilgili Ã¶zel ifadeler bulundu",
                details={"phrases": features.custom_phrase_hits[rule_id]},
            )
        )

    for rule_id in sorted(features.custom_privileged_missing):
        if custom_rule_modes.get(rule_id) != "privileged":
            continue
        label = str(labels.get(rule_id, rule_id)).strip() or rule_id
        matches.append(
            RuleMatch(
                rule_id=rule_id,
                matched=True,
                weight=_rule_weight(runtime_config, rule_id),
                confidence="medium",
                reason=f"{label} için güvenli ifade bulunamadı",
                details={"context_hits": features.custom_privileged_missing[rule_id]},
            )
        )

    return matches


def _spf_fail(features: MailFeatures, runtime_config: dict) -> RuleMatch:
    return RuleMatch(
        rule_id="SPF_FAIL",
        matched=features.spf_result == "fail",
        weight=_rule_weight(runtime_config, "SPF_FAIL"),
        confidence="medium",
        reason="SPF doğrulaması başarısız oldu",
        details={"spf_result": features.spf_result},
    )


def _spf_softfail(features: MailFeatures, runtime_config: dict) -> RuleMatch:
    return RuleMatch(
        rule_id="SPF_SOFTFAIL",
        matched=features.spf_result == "softfail",
        weight=_rule_weight(runtime_config, "SPF_SOFTFAIL"),
        confidence="low",
        reason="SPF doğrulaması softfail sonucu verdi",
        details={"spf_result": features.spf_result},
    )


def _dkim_fail(features: MailFeatures, runtime_config: dict) -> RuleMatch:
    return RuleMatch(
        rule_id="DKIM_FAIL",
        matched=features.dkim_result == "fail",
        weight=_rule_weight(runtime_config, "DKIM_FAIL"),
        confidence="high",
        reason="DKIM imza doğrulaması başarısız oldu",
        details={"dkim_result": features.dkim_result},
    )


def _dmarc_fail(features: MailFeatures, runtime_config: dict) -> RuleMatch:
    return RuleMatch(
        rule_id="DMARC_FAIL",
        matched=features.dmarc_result == "fail",
        weight=_rule_weight(runtime_config, "DMARC_FAIL"),
        confidence="high",
        reason="DMARC doğrulaması başarısız oldu",
        details={"dmarc_result": features.dmarc_result},
    )


def _normalize_domain(domain: str) -> str:
    value = domain.strip().lower()
    if value.startswith("www."):
        return value[4:]
    return value


def _rule_weight(runtime_config: dict, rule_id: str) -> int:
    return int(runtime_config["rule_weights"].get(rule_id, 0))
