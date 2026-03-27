from __future__ import annotations

from phishguard.config_store import get_runtime_config
from phishguard.models import AnalysisResult, MailFeatures, RuleMatch


def score_analysis(features: MailFeatures, matches: list[RuleMatch]) -> AnalysisResult:
    runtime_config = get_runtime_config()
    raw_score = sum(match.weight for match in matches)
    normalization_base = _normalization_base(runtime_config)
    normalized_score = _normalize_score(raw_score, normalization_base)
    score = normalized_score

    confidence_counts = {
        "low": sum(1 for match in matches if match.confidence == "low"),
        "medium": sum(1 for match in matches if match.confidence == "medium"),
        "high": sum(1 for match in matches if match.confidence == "high"),
    }

    if confidence_counts["high"] >= 2 and score < 70:
        score = 70
    elif confidence_counts["high"] >= 1 and confidence_counts["medium"] >= 2 and score < 60:
        score = 60
    elif confidence_counts["high"] >= 1 and score < 40:
        score = 40
    elif confidence_counts["medium"] >= 3 and score < 35:
        score = 35

    level, summary, intensity = classify_score(score, runtime_config["thresholds"], confidence_counts)
    matched_rules = [match.rule_id for match in matches]
    reasons = [match.reason for match in matches][:4]

    details = {
        "sender_domain": features.sender_domain,
        "link_domains": features.link_domains,
        "raw_score": raw_score,
        "normalized_score": normalized_score,
        "normalization_base": normalization_base,
        "confidence_counts": confidence_counts,
        "intensity": intensity,
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


def classify_score(
    score: int,
    thresholds: dict[str, int],
    confidence_counts: dict[str, int],
) -> tuple[str, str, str]:
    low_risk_max = int(thresholds["low_risk_max"])
    medium_risk_max = int(thresholds["medium_risk_max"])

    if score <= low_risk_max:
        if score <= 10:
            return "Düşük Risk", "Şimdilik belirgin bir tehdit görünmüyor.", "çok düşük"
        return "Düşük Risk", "Düşük seviyede işaretler var, yine de temel kontrolleri yapın.", "düşük"

    if score <= medium_risk_max:
        if confidence_counts["high"] >= 1 or score >= max(low_risk_max + 10, 45):
            return "Orta Risk", "Risk artıyor, işlem yapmadan önce göndereni doğrulayın.", "orta-yüksek"
        return "Orta Risk", "Bazı şüpheli işaretler var, dikkatli ilerleyin.", "orta"

    if confidence_counts["high"] >= 2 or score >= 85:
        return "Yüksek Risk", "Kritik tehdit işaretleri bulundu. Bu iletiyle işlem yapmayın.", "kritik"
    if confidence_counts["high"] >= 1 or score >= 70:
        return "Yüksek Risk", "Bu ileti kimlik avı veya dolandırıcılık girişimi olabilir.", "yüksek"
    return "Yüksek Risk", "Yüksek riskli işaretler bulundu. İşlem yapmadan önce mutlaka doğrulayın.", "yüksek"


def _normalization_base(runtime_config: dict[str, object]) -> int:
    disabled_rules = set(runtime_config.get("disabled_rules", []))
    active_weights = [
        int(weight)
        for rule_id, weight in runtime_config.get("rule_weights", {}).items()
        if rule_id not in disabled_rules
    ]
    if not active_weights:
        return 100

    active_weights.sort(reverse=True)
    top_signal_budget = sum(active_weights[:5])
    return max(100, top_signal_budget)


def _normalize_score(raw_score: int, normalization_base: int) -> int:
    if raw_score <= 0 or normalization_base <= 0:
        return 0
    return min(round((raw_score / normalization_base) * 100), 100)
