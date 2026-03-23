from __future__ import annotations

from phishguard.config import LOW_RISK_MAX, MEDIUM_RISK_MAX
from phishguard.models import AnalysisResult, MailFeatures, RuleMatch


def score_analysis(features: MailFeatures, matches: list[RuleMatch]) -> AnalysisResult:
    raw_score = sum(match.weight for match in matches)
    score = min(raw_score, 100)

    confidence_counts = {
        "low": sum(1 for match in matches if match.confidence == "low"),
        "medium": sum(1 for match in matches if match.confidence == "medium"),
        "high": sum(1 for match in matches if match.confidence == "high"),
    }

    if confidence_counts["high"] >= 1 and score < 30:
        score = 30
    if confidence_counts["medium"] >= 2 and score < 40:
        score = 40

    level, summary = classify_score(score)
    matched_rules = [match.rule_id for match in matches]
    reasons = [match.reason for match in matches][:4]

    details = {
        "sender_domain": features.sender_domain,
        "link_domains": features.link_domains,
        "confidence_counts": confidence_counts,
        "rule_details": {match.rule_id: match.details for match in matches},
    }

    return AnalysisResult(
        score=score,
        level=level,
        summary=summary,
        matched_rules=matched_rules,
        reasons=reasons,
        details=details,
    )


def classify_score(score: int) -> tuple[str, str]:
    if score <= LOW_RISK_MAX:
        return "Low Risk", "Supheli sinyaller sinirli duzeyde"
    if score <= MEDIUM_RISK_MAX:
        return "Medium Risk", "Dikkatli olun"
    return "High Risk", "Bu e-posta phishing olabilir"
