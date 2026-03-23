from __future__ import annotations

from pathlib import Path

from phishguard.config import (
    ACCOUNT_THREAT_PHRASES,
    ATTACHMENT_REQUEST_PHRASES,
    BANK_CHANGE_PHRASES,
    INVOICE_PRESSURE_PHRASES,
    PAYMENT_REQUEST_PHRASES,
    PHISHING_KEYWORDS,
    SHORTENER_DOMAINS,
    SUSPICIOUS_ATTACHMENT_EXTENSIONS,
    SUSPICIOUS_TLDS,
    URGENCY_PHRASES,
)
from phishguard.models import MailFeatures, MailInput
from phishguard.parser import extract_domain, parse_links


def extract_features(mail: MailInput) -> MailFeatures:
    links = parse_links(mail.body_text, mail.body_html)
    link_domains = sorted({link.domain for link in links if link.domain})

    suspicious_tlds = sorted(
        {
            tld
            for domain in [mail.sender_domain, *link_domains]
            for tld in SUSPICIOUS_TLDS
            if domain.endswith(tld)
        }
    )
    shortener_domains = sorted({domain for domain in link_domains if domain in SHORTENER_DOMAINS})

    suspicious_attachments: list[str] = []
    double_extension_attachments: list[str] = []
    for attachment in mail.attachments:
        suffixes = [suffix.lower() for suffix in Path(attachment).suffixes]
        if suffixes and suffixes[-1] in SUSPICIOUS_ATTACHMENT_EXTENSIONS:
            suspicious_attachments.append(attachment)
        if len(suffixes) >= 2 and suffixes[-1] in SUSPICIOUS_ATTACHMENT_EXTENSIONS:
            double_extension_attachments.append(attachment)

    combined_text = " ".join([mail.subject, mail.body_text]).lower()
    keyword_hits = sorted({keyword for keyword in PHISHING_KEYWORDS if keyword in combined_text})
    urgency_hits = sorted({phrase for phrase in URGENCY_PHRASES if phrase in combined_text})
    account_threat_hits = sorted({phrase for phrase in ACCOUNT_THREAT_PHRASES if phrase in combined_text})
    attachment_request_hits = sorted({phrase for phrase in ATTACHMENT_REQUEST_PHRASES if phrase in combined_text})
    payment_request_hits = sorted({phrase for phrase in PAYMENT_REQUEST_PHRASES if phrase in combined_text})
    bank_change_hits = sorted({phrase for phrase in BANK_CHANGE_PHRASES if phrase in combined_text})
    invoice_pressure_hits = sorted({phrase for phrase in INVOICE_PRESSURE_PHRASES if phrase in combined_text})

    display_target_mismatches = []
    for link in links:
        if not link.display_text:
            continue
        display_domain = extract_domain(link.display_text) if "://" in link.display_text else link.display_text.lower()
        if display_domain and "." in display_domain and display_domain != link.domain:
            display_target_mismatches.append(f"{link.display_text} -> {link.domain}")

    return MailFeatures(
        sender_domain=mail.sender_domain.lower(),
        links=links,
        link_domains=link_domains,
        suspicious_tlds=suspicious_tlds,
        shortener_domains=shortener_domains,
        suspicious_attachments=suspicious_attachments,
        double_extension_attachments=double_extension_attachments,
        keyword_hits=keyword_hits,
        display_target_mismatches=display_target_mismatches,
        urgency_hits=urgency_hits,
        account_threat_hits=account_threat_hits,
        attachment_request_hits=attachment_request_hits,
        payment_request_hits=payment_request_hits,
        bank_change_hits=bank_change_hits,
        invoice_pressure_hits=invoice_pressure_hits,
    )
