from __future__ import annotations

import pytest

from silver_intelligence import (
    INTERNAL_PREVIEW_ENV,
    silver_external_intelligence_preview,
)


def payload() -> dict:
    subsection = {
        "subsection_id": "china_liquidity",
        "subsection_name": "China Liquidity",
        "source_label": "Blocked",
        "current_state": "Data Blocked",
        "interpretation": "Daily offshore CNH validation incomplete.",
        "silver_impact": "No production interpretation authorized.",
        "action_bias": "no_operational_conclusion",
        "primary_risk": "Blocked data must not be treated as neutral.",
        "required_confirmation": "Complete reliable daily offshore CNH validation in HEL-034.",
        "confidence": {"score": None, "label": "unavailable"},
        "evidence": {"expandable": {"ticker": "USDCNH"}},
        "freshness": {"status": "stale"},
        "provenance": {"authority": "HEL-034", "read_only": True},
    }
    dashboard = {
        "target_instrument": "XAGUSD",
        "headline": "Silver Intelligence — Unavailable",
        "status": "blocked",
        "freshness": "stale",
        "silver_impact": "No production interpretation authorized.",
        "action_bias": "no_operational_conclusion",
        "action_language": "No operational conclusion",
        "confidence_score": None,
        "confidence_label": "unavailable",
        "primary_risk": subsection["primary_risk"],
        "required_confirmation": subsection["required_confirmation"],
        "expandable": {},
    }
    return {
        "section_id": "silver_intelligence",
        "section_name": "Silver Intelligence",
        "target_instrument": "XAGUSD",
        "as_of": "2026-07-24T14:00:00.000Z",
        "source_status": "blocked",
        "freshness_status": "stale",
        "evidence_state": "shadow",
        "current_state": "Unavailable",
        "silver_impact": "No production interpretation authorized.",
        "action_bias": "no_operational_conclusion",
        "confidence_score": None,
        "confidence_label": "unavailable",
        "dashboard_summary": dashboard,
        "source_provenance": {
            "authority": "HEL-034",
            "read_only": True,
            "oos_mutation": False,
        },
        "silver_intelligence": {
            "overall_external_confirmation": {
                "state": "Unavailable",
                "production_effect": "none",
            },
            "subsections": [subsection],
        },
        "long_summary": "SILVER INTELLIGENCE\nUnavailable",
        "short_summary": "Silver Intelligence: Unavailable.",
        "confidence_basis": {"conclusion_precision": "qualitative"},
        "limitations": ["blocked evidence is excluded from synthesis"],
        "reason_codes": ["HEL034_DATA_BLOCKED"],
        "production_effect": "none",
        "schema_version": "HEL-035.schema.1.0.0",
        "rule_version": "HEL-035.rules.1.0.0",
    }


def test_preview_is_disabled_without_explicit_flag() -> None:
    with pytest.raises(PermissionError):
        silver_external_intelligence_preview(payload(), {})


def test_preview_exposes_the_authoritative_surfaces_without_recalculation() -> None:
    value = payload()
    preview = silver_external_intelligence_preview(
        value,
        {INTERNAL_PREVIEW_ENV: "true"},
    )
    assert preview["structured_interpretation"] == value
    assert preview["long_rendering"] == value["long_summary"]
    assert preview["short_rendering"] == value["short_summary"]
    assert preview["dashboard_view_model"] == value["dashboard_summary"]
    assert preview["subsections"][0]["source_label"] == "Blocked"
    assert preview["subsections"][0]["current_state"] == "Data Blocked"
    assert preview["production_effect"] == "none"
    assert preview["provenance"]["oos_mutation"] is False


def test_preview_rejects_promoted_or_unlabeled_payloads() -> None:
    promoted = payload()
    promoted["production_effect"] = "score_changed"
    with pytest.raises(ValueError, match="production_effect"):
        silver_external_intelligence_preview(
            promoted,
            {INTERNAL_PREVIEW_ENV: "true"},
        )

    unlabeled = payload()
    unlabeled["silver_intelligence"]["subsections"][0]["source_label"] = "Neutral"
    with pytest.raises(ValueError, match="authority label"):
        silver_external_intelligence_preview(
            unlabeled,
            {INTERNAL_PREVIEW_ENV: "true"},
        )
