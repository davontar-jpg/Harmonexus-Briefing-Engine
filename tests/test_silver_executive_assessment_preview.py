from __future__ import annotations

import pytest

from silver_intelligence import (
    INTERNAL_PREVIEW_ENV,
    executive_market_assessment_preview,
)


def payload() -> dict:
    paragraph = (
        "Silver is in a continuation environment. Market Structure and Monetary "
        "Environment support the assessment. Liquidity Environment remains "
        "unavailable and supplies no confirmation. The primary risk is liquidity "
        "confirmation is unavailable. Market Structure must remain aligned. "
        "Current operational bias is Continuation Favored with high confidence."
    )
    detail = {
        "current_market_state": "Continuation environment",
        "supporting_evidence": [{"section_name": "Market Structure"}],
        "contradicting_evidence": [],
        "primary_risk": "Liquidity confirmation is unavailable.",
        "required_confirmation": "Market Structure must remain aligned.",
        "current_operational_bias": "Continuation Favored",
        "confidence": {"score": None, "label": "high", "source": "Market Structure"},
        "section_evidence": [],
        "intended_long_briefing_order": 1,
    }
    dashboard = {
        "target_instrument": "XAGUSD",
        "headline": "Executive Market Assessment",
        "status": "partial",
        "freshness": "current",
        "silver_impact": "Continuation Favored",
        "action_bias": "continuation_favored",
        "action_language": "Continuation Favored",
        "confidence_score": None,
        "confidence_label": "high",
        "primary_risk": detail["primary_risk"],
        "required_confirmation": detail["required_confirmation"],
        "expandable": {},
    }
    return {
        "section_id": "executive_market_assessment",
        "section_name": "Executive Market Assessment",
        "target_instrument": "XAGUSD",
        "as_of": "2026-07-24T14:00:00.000Z",
        "source_status": "partial",
        "freshness_status": "current",
        "evidence_state": "production_authoritative",
        "current_state": "Continuation environment",
        "silver_impact": "Continuation Favored",
        "action_bias": "continuation_favored",
        "primary_risk": detail["primary_risk"],
        "required_confirmation": detail["required_confirmation"],
        "confidence_score": None,
        "confidence_label": "high",
        "dashboard_summary": dashboard,
        "source_provenance": {
            "new_evidence_created": False,
            "statistics_summarized": False,
            "production_effect": "none",
        },
        "executive_market_assessment": detail,
        "supporting_evidence": detail["supporting_evidence"],
        "contradicting_evidence": detail["contradicting_evidence"],
        "operator_summary": paragraph,
        "long_summary": "EXECUTIVE MARKET ASSESSMENT\n\n" + paragraph,
        "short_summary": paragraph,
        "confidence_basis": {"selected_existing_confidence": "Market Structure"},
        "reason_codes": ["NO_NEW_EVIDENCE", "NO_STATISTICAL_SUMMARY"],
        "intended_long_briefing_order": 1,
        "production_effect": "none",
        "schema_version": "HEL-035.schema.1.0.0",
        "rule_version": "HEL-035.rules.1.0.0",
    }


def test_preview_requires_explicit_internal_flag() -> None:
    with pytest.raises(PermissionError):
        executive_market_assessment_preview(payload(), {})


def test_preview_projects_one_authoritative_paragraph() -> None:
    value = payload()
    preview = executive_market_assessment_preview(
        value,
        {INTERNAL_PREVIEW_ENV: "true"},
    )
    assert preview["structured_interpretation"] == value
    assert preview["paragraph"] == value["operator_summary"]
    assert preview["long_rendering"] == value["long_summary"]
    assert preview["short_rendering"] == value["short_summary"]
    assert preview["current_operational_bias"] == "Continuation Favored"
    assert preview["confidence_label"] == "high"
    assert preview["production_effect"] == "none"


def test_preview_rejects_new_evidence_statistics_order_and_activation() -> None:
    new_evidence = payload()
    new_evidence["source_provenance"]["new_evidence_created"] = True
    with pytest.raises(ValueError, match="create evidence"):
        executive_market_assessment_preview(
            new_evidence,
            {INTERNAL_PREVIEW_ENV: "true"},
        )

    statistical = payload()
    statistical["operator_summary"] += " Correlation was high."
    with pytest.raises(ValueError, match="statistical"):
        executive_market_assessment_preview(
            statistical,
            {INTERNAL_PREVIEW_ENV: "true"},
        )

    wrong_order = payload()
    wrong_order["intended_long_briefing_order"] = 2
    with pytest.raises(ValueError, match="must be first"):
        executive_market_assessment_preview(
            wrong_order,
            {INTERNAL_PREVIEW_ENV: "true"},
        )

    active = payload()
    active["production_effect"] = "briefing_changed"
    with pytest.raises(ValueError, match="production_effect"):
        executive_market_assessment_preview(
            active,
            {INTERNAL_PREVIEW_ENV: "true"},
        )
