from __future__ import annotations

import hashlib
import hmac
import json
import secrets
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from phishguard.config import (
    ACCOUNT_THREAT_PHRASES,
    ATTACHMENT_REQUEST_PHRASES,
    BANK_CHANGE_PHRASES,
    COMPANY_TRUSTED_DOMAINS,
    DOUBLE_EXTENSION_BAIT_EXTENSIONS,
    EXTORTION_PHRASES,
    INVOICE_PRESSURE_PHRASES,
    LOW_RISK_MAX,
    MEDIUM_RISK_MAX,
    PAYMENT_REQUEST_PHRASES,
    PHISHING_KEYWORDS,
    RULE_WEIGHTS,
    SHORTENER_DOMAINS,
    SUSPICIOUS_ATTACHMENT_EXTENSIONS,
    SUSPICIOUS_TLDS,
    TRUSTED_RELATED_DOMAINS,
    URGENCY_PHRASES,
)

BUILTIN_RULE_IDS = tuple(RULE_WEIGHTS.keys())

BUILTIN_RULE_DISPLAY_META: dict[str, dict[str, str]] = {
    "DOMAIN_LINK_MISMATCH": {
        "title": "Alan Adı Uyuşmazlığı",
        "description": "Bağlantı adresi ile mailin geldiği alan adı arasındaki farkı açıklar.",
    },
    "DISPLAY_TARGET_MISMATCH": {
        "title": "Sahte Hedef Uyarısı",
        "description": "Görünen bağlantı ile açılan gerçek adres arasındaki farkı açıklar.",
    },
    "SUSPICIOUS_TLD": {
        "title": "Şüpheli Uzantı Uyarısı",
        "description": "Riskli alan uzantıları içeren bağlantıları işaretler.",
    },
    "SHORTENER_LINK": {
        "title": "Kısa Bağlantı Uyarısı",
        "description": "Kısaltılmış bağlantı servislerinden gelen linkleri işaretler.",
    },
    "SUSPICIOUS_ATTACHMENT": {
        "title": "Şüpheli Ek Uyarısı",
        "description": "Yüksek riskli dosya uzantılarına sahip ekleri işaretler.",
    },
    "DOUBLE_EXTENSION": {
        "title": "Çift Uzantı Uyarısı",
        "description": "Dosya adında gizlenmiş uzantı kullanımı ihtimalini açıklar.",
    },
    "PHISHING_KEYWORDS": {
        "title": "Phishing Anahtar Kelimeleri",
        "description": "Metin tabanlı sinyalleri etkiler.",
    },
    "IP_LINK": {
        "title": "IP Bağlantısı Uyarısı",
        "description": "Alan adı yerine doğrudan IP adresine giden bağlantıları işaretler.",
    },
    "URGENCY_LANGUAGE": {
        "title": "Aciliyet İfadeleri",
        "description": "Zaman baskısı oluşturan metinleri yönetir.",
    },
    "ACCOUNT_THREAT_LANGUAGE": {
        "title": "Hesap Tehdidi İfadeleri",
        "description": "Hesap kapanması veya askıya alma söylemlerini yönetir.",
    },
    "EXTORTION_LANGUAGE": {
        "title": "Şantaj ve Şifreleme İfadeleri",
        "description": "Dosya şifreleme, veri sızdırma veya erişim kaybı tehdidi içeren metinleri yönetir.",
    },
    "UNEXPECTED_ATTACHMENT_REQUEST": {
        "title": "Ek Açma İfadeleri",
        "description": "Ek dosya açmaya yönlendiren cümleleri tutar.",
    },
    "PAYMENT_REQUEST_LANGUAGE": {
        "title": "Ödeme Talebi İfadeleri",
        "description": "Ödeme ve dekont çağrılarını yönetir.",
    },
    "BANK_CHANGE_LANGUAGE": {
        "title": "Banka Değişikliği İfadeleri",
        "description": "IBAN veya banka hesabı değişikliği sinyallerini yönetir.",
    },
    "INVOICE_PRESSURE_LANGUAGE": {
        "title": "Fatura Baskısı İfadeleri",
        "description": "Süre baskısı ve fatura takibi söylemlerini yönetir.",
    },
}


REPO_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = REPO_ROOT / "data"
CONFIG_PATH = DATA_DIR / "runtime_config.json"

DEFAULT_CONFIG: dict[str, Any] = {
    "app_version": "1.0.0",
    "version_note": "",
    "updated_at": "",
    "change_history": [],
    "disabled_rules": [],
    "rule_weights": dict(RULE_WEIGHTS),
    "thresholds": {
        "low_risk_max": LOW_RISK_MAX,
        "medium_risk_max": MEDIUM_RISK_MAX,
    },
    "domains": {
        "trusted_related_domains": sorted(TRUSTED_RELATED_DOMAINS),
        "company_trusted_domains": sorted(COMPANY_TRUSTED_DOMAINS),
        "shortener_domains": sorted(SHORTENER_DOMAINS),
        "suspicious_tlds": sorted(SUSPICIOUS_TLDS),
    },
    "attachments": {
        "suspicious_extensions": sorted(SUSPICIOUS_ATTACHMENT_EXTENSIONS),
        "double_extension_bait_extensions": sorted(DOUBLE_EXTENSION_BAIT_EXTENSIONS),
    },
    "phrases": {
        "phishing_keywords": sorted(PHISHING_KEYWORDS),
        "urgency_phrases": sorted(URGENCY_PHRASES),
        "account_threat_phrases": sorted(ACCOUNT_THREAT_PHRASES),
        "extortion_phrases": sorted(EXTORTION_PHRASES),
        "attachment_request_phrases": sorted(ATTACHMENT_REQUEST_PHRASES),
        "payment_request_phrases": sorted(PAYMENT_REQUEST_PHRASES),
        "bank_change_phrases": sorted(BANK_CHANGE_PHRASES),
        "invoice_pressure_phrases": sorted(INVOICE_PRESSURE_PHRASES),
        "custom_rule_phrases": {},
    },
    "rule_chip_labels": {
        "DOMAIN_LINK_MISMATCH": "Ba\u011flant\u0131 Uyu\u015fmazl\u0131\u011f\u0131",
        "DISPLAY_TARGET_MISMATCH": "Sahte Hedef",
        "SUSPICIOUS_TLD": "\u015e\u00fcpheli Uzant\u0131",
        "SHORTENER_LINK": "K\u0131sa Ba\u011flant\u0131",
        "SUSPICIOUS_ATTACHMENT": "\u015e\u00fcpheli Ek",
        "DOUBLE_EXTENSION": "\u00c7ift Uzant\u0131",
        "PHISHING_KEYWORDS": "\u015e\u00fcpheli \u0130fadeler",
        "IP_LINK": "IP Ba\u011flant\u0131s\u0131",
        "URGENCY_LANGUAGE": "Zaman Bask\u0131s\u0131",
        "ACCOUNT_THREAT_LANGUAGE": "Hesap Tehdidi",
        "EXTORTION_LANGUAGE": "\u015eantaj Dili",
        "UNEXPECTED_ATTACHMENT_REQUEST": "Ek A\u00e7ma Talebi",
        "PAYMENT_REQUEST_LANGUAGE": "\u00d6deme Talebi",
        "BANK_CHANGE_LANGUAGE": "IBAN De\u011fi\u015fikli\u011fi",
        "INVOICE_PRESSURE_LANGUAGE": "Fatura Bask\u0131s\u0131"
    },
    "rule_display_meta": deepcopy(BUILTIN_RULE_DISPLAY_META),
    "admin_access": {
        "password_enabled": False,
        "password_hint": "",
        "password_hash": "",
        "password_salt": "",
    },
}


def ensure_runtime_config() -> dict[str, Any]:
    config = load_runtime_config()
    if not CONFIG_PATH.exists():
        save_runtime_config(config)
    return config


def load_runtime_config() -> dict[str, Any]:
    config = deepcopy(DEFAULT_CONFIG)
    if CONFIG_PATH.exists():
        loaded = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
        _deep_merge(config, loaded)
    _synchronize_custom_rules(config)
    return config


def get_runtime_config() -> dict[str, Any]:
    return ensure_runtime_config()


def save_runtime_config(config: dict[str, Any], history_entry: dict[str, Any] | None = None) -> dict[str, Any]:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    merged = deepcopy(DEFAULT_CONFIG)
    _deep_merge(merged, config)
    _synchronize_custom_rules(merged)
    merged["updated_at"] = datetime.now(timezone.utc).isoformat()
    if history_entry:
        entry = deepcopy(history_entry)
        entry["timestamp"] = merged["updated_at"]
        history = list(merged.get("change_history", []))
        history.insert(0, entry)
        merged["change_history"] = history[:100]
    CONFIG_PATH.write_text(json.dumps(merged, indent=2, ensure_ascii=False), encoding="utf-8")
    return merged


def build_factory_reset_config(current_config: dict[str, Any]) -> dict[str, Any]:
    reset_config = deepcopy(DEFAULT_CONFIG)
    reset_config["admin_access"] = deepcopy(current_config.get("admin_access", DEFAULT_CONFIG["admin_access"]))
    return reset_config


def get_admin_config() -> dict[str, Any]:
    config = ensure_runtime_config()
    public_config = deepcopy(config)
    public_access = public_config.setdefault("admin_access", {})
    public_access.pop("password_hash", None)
    public_access.pop("password_salt", None)
    public_access.setdefault("password_enabled", False)
    public_access.setdefault("password_hint", "")
    return public_config


def get_public_meta() -> dict[str, Any]:
    config = ensure_runtime_config()
    return {
        "app_version": config["app_version"],
        "version_note": config.get("version_note", ""),
        "updated_at": config["updated_at"],
        "rule_chip_labels": config.get("rule_chip_labels", {}),
        "disabled_rules": config.get("disabled_rules", []),
    }


def get_admin_access_public() -> dict[str, Any]:
    config = ensure_runtime_config()
    access = config.get("admin_access", {})
    return {
        "password_enabled": bool(access.get("password_enabled", False)),
        "password_hint": str(access.get("password_hint", "")),
    }


def verify_admin_password(password: str) -> bool:
    config = ensure_runtime_config()
    access = config.get("admin_access", {})
    if not access.get("password_enabled"):
        return True

    stored_hash = str(access.get("password_hash", ""))
    stored_salt = str(access.get("password_salt", ""))
    if not stored_hash or not stored_salt:
        return False

    candidate_hash = _hash_password(password, stored_salt)
    return hmac.compare_digest(stored_hash, candidate_hash)


def build_admin_access_update(payload: dict[str, Any], current_access: dict[str, Any]) -> dict[str, Any]:
    updated = deepcopy(current_access)
    updated["password_enabled"] = bool(payload.get("password_enabled", False))
    updated["password_hint"] = str(payload.get("password_hint", "")).strip()

    current_password = str(payload.get("current_password", "")).strip()
    new_password = str(payload.get("new_password", "")).strip()
    confirm_password = str(payload.get("confirm_password", "")).strip()

    if new_password or confirm_password:
        if new_password != confirm_password:
            raise ValueError("Yeni parola ile parola tekrarı uyuşmuyor.")
        if updated.get("password_hash") and not _verify_password_against_access(current_password, updated):
            raise ValueError("Eski parola doğrulanamadı.")
        salt = secrets.token_hex(16)
        updated["password_salt"] = salt
        updated["password_hash"] = _hash_password(new_password, salt)
    elif updated.get("password_enabled") and not updated.get("password_hash"):
        raise ValueError("Parola korumasını açmak için bir parola belirlemelisiniz.")

    return updated


def _deep_merge(target: dict[str, Any], source: dict[str, Any]) -> None:
    for key, value in source.items():
        if key not in target:
            target[key] = value
            continue
        if isinstance(target[key], dict) and isinstance(value, dict):
            _deep_merge(target[key], value)
        else:
            target[key] = value


def _hash_password(password: str, salt: str) -> str:
    return hashlib.sha256((salt + password).encode("utf-8")).hexdigest()


def _verify_password_against_access(password: str, access: dict[str, Any]) -> bool:
    stored_hash = str(access.get("password_hash", ""))
    stored_salt = str(access.get("password_salt", ""))
    if not stored_hash or not stored_salt:
        return False

    candidate_hash = _hash_password(password, stored_salt)
    return hmac.compare_digest(stored_hash, candidate_hash)


def _synchronize_custom_rules(config: dict[str, Any]) -> None:
    rule_labels = config.setdefault("rule_chip_labels", {})
    rule_display_meta = config.setdefault("rule_display_meta", {})
    rule_weights = config.setdefault("rule_weights", {})
    disabled_rules = config.setdefault("disabled_rules", [])
    phrases = config.setdefault("phrases", {})
    custom_rule_phrases = phrases.setdefault("custom_rule_phrases", {})

    custom_rule_ids = sorted(rule_id for rule_id in rule_labels if rule_id not in BUILTIN_RULE_IDS)

    for rule_id, default_meta in BUILTIN_RULE_DISPLAY_META.items():
        meta = rule_display_meta.setdefault(rule_id, {})
        if not str(meta.get("title", "")).strip():
            meta["title"] = default_meta["title"]
        if not str(meta.get("description", "")).strip():
            meta["description"] = default_meta["description"]

    for rule_id in custom_rule_ids:
        rule_weights.setdefault(rule_id, 0)
        value = custom_rule_phrases.get(rule_id, [])
        custom_rule_phrases[rule_id] = value if isinstance(value, list) else []
        rule_display_meta.setdefault(
            rule_id,
            {
                "title": str(rule_labels.get(rule_id, rule_id)),
                "description": "",
            },
        )

    for rule_id in list(rule_weights):
        if rule_id not in BUILTIN_RULE_IDS and rule_id not in custom_rule_ids:
            rule_weights.pop(rule_id, None)

    for rule_id in list(rule_display_meta):
        if rule_id not in BUILTIN_RULE_IDS and rule_id not in custom_rule_ids:
            rule_display_meta.pop(rule_id, None)

    for rule_id in list(custom_rule_phrases):
        if rule_id not in custom_rule_ids:
            custom_rule_phrases.pop(rule_id, None)

    config["disabled_rules"] = [
        rule_id for rule_id in disabled_rules if rule_id in BUILTIN_RULE_IDS or rule_id in custom_rule_ids
    ]


