from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass(slots=True)
class MailInput:
    subject: str
    sender_name: str
    sender_email: str
    sender_domain: str
    body_text: str
    body_html: str
    attachments: list[str] = field(default_factory=list)


@dataclass(slots=True)
class ExtractedLink:
    url: str
    domain: str
    display_text: str = ""
    is_ip: bool = False


@dataclass(slots=True)
class MailFeatures:
    sender_domain: str
    attachments: list[str] = field(default_factory=list)
    links: list[ExtractedLink] = field(default_factory=list)
    link_domains: list[str] = field(default_factory=list)
    suspicious_tlds: list[str] = field(default_factory=list)
    shortener_domains: list[str] = field(default_factory=list)
    suspicious_attachments: list[str] = field(default_factory=list)
    double_extension_attachments: list[str] = field(default_factory=list)
    keyword_hits: list[str] = field(default_factory=list)
    display_target_mismatches: list[str] = field(default_factory=list)
    urgency_hits: list[str] = field(default_factory=list)
    account_threat_hits: list[str] = field(default_factory=list)
    extortion_hits: list[str] = field(default_factory=list)
    attachment_request_hits: list[str] = field(default_factory=list)
    payment_request_hits: list[str] = field(default_factory=list)
    bank_change_hits: list[str] = field(default_factory=list)
    invoice_pressure_hits: list[str] = field(default_factory=list)
    custom_phrase_hits: dict[str, list[str]] = field(default_factory=dict)


@dataclass(slots=True)
class RuleMatch:
    rule_id: str
    matched: bool
    weight: int
    confidence: str
    reason: str
    details: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class AnalysisResult:
    score: int
    level: str
    summary: str
    matched_rules: list[str]
    reasons: list[str]
    details: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)
