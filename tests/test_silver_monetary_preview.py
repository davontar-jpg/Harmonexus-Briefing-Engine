import copy

import pytest

from silver_intelligence import (
    INTERNAL_PREVIEW_ENV,
    monetary_environment_preview,
)


def monetary_payload():
    freshness = {
        "dollar_pressure": {
            "timestamp": "2026-07-24T13:55:00.000Z",
            "freshness_status": "current",
            "source_status": "available",
            "proxy": False,
            "reason_codes": ["LIVE_MARKET_CURRENT"],
        }
    }
    return {
        "section_id": "monetary_environment",
        "section_name": "Monetary Environment",
        "target_instrument": "XAGUSD",
        "as_of": "2026-07-24T14:00:00.000Z",
        "source_status": "available",
        "freshness_status": "current",
        "evidence_state": "production_authoritative",
        "current_state": "supportive monetary environment",
        "silver_impact": "Monetary conditions support silver continuation.",
        "action_bias": "supportive_confirmation_required",
        "confidence_score": None,
        "confidence_label": "high",
        "confidence_basis": [{"code": "ELIGIBLE_EVIDENCE_COUNT"}],
        "reason_codes": ["COT_PUBLICATION_LAG"],
        "source_provenance": {"source_contracts": ["FRED_Raw"]},
        "monetary_environment": {
            "data_freshness": freshness,
            "rule_version": "HEL-035.monetary.1.0.0",
        },
        "monetary_contradictions": {
            "status": "agreement",
            "secondary_conflicts": [],
        },
        "long_summary": "MONETARY ENVIRONMENT\nAction Bias: Confirmation required",
        "short_summary": "Monetary Environment: supportive monetary environment.",
        "production_effect": "none",
        "schema_version": "HEL-035.schema.1.0.0",
        "rule_version": "HEL-035.rules.1.0.0",
        "dashboard_summary": {
            "target_instrument": "XAGUSD",
            "headline": "Monetary Environment — supportive monetary environment",
            "status": "available",
            "freshness": "current",
            "silver_impact": "Monetary conditions support silver continuation.",
            "action_bias": "supportive_confirmation_required",
            "action_language": "Continuation possible but unconfirmed",
            "confidence_score": None,
            "confidence_label": "high",
            "primary_risk": "The regime may change.",
            "required_confirmation": "Confirm persistence.",
            "expandable": {},
        },
    }


def test_monetary_preview_requires_explicit_internal_flag():
    with pytest.raises(PermissionError, match="preview is disabled"):
        monetary_environment_preview(monetary_payload(), {})


def test_monetary_preview_projects_every_surface_without_recomputation():
    payload = monetary_payload()
    preview = monetary_environment_preview(
        payload,
        {INTERNAL_PREVIEW_ENV: "true"},
    )
    assert preview["structured_interpretation"] == payload
    assert preview["long_rendering"] == payload["long_summary"]
    assert preview["short_rendering"] == payload["short_summary"]
    assert preview["dashboard_view_model"] == payload["dashboard_summary"]
    assert preview["provenance"] == payload["source_provenance"]
    assert preview["confidence_basis"] == payload["confidence_basis"]
    assert preview["reason_codes"] == payload["reason_codes"]
    assert preview["freshness"] == payload["monetary_environment"]["data_freshness"]
    assert preview["production_effect"] == "none"


def test_monetary_preview_rejects_incomplete_freshness_contract():
    payload = copy.deepcopy(monetary_payload())
    del payload["monetary_environment"]["data_freshness"]
    with pytest.raises(ValueError, match="freshness contract"):
        monetary_environment_preview(
            payload,
            {INTERNAL_PREVIEW_ENV: "true"},
        )
