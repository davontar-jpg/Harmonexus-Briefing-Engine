import copy

import pytest

from silver_intelligence import (
    INTERNAL_PREVIEW_ENV,
    vix_volatility_environment_preview,
)


def vix_payload():
    freshness = {
        "vix_level": {
            "timestamp": "2026-07-24T13:55:00.000Z",
            "source": "authorized VIX fixture",
            "provider": "fixture_provider",
            "source_status": "available",
            "freshness_status": "current",
            "reason_codes": ["LIVE_MARKET_CURRENT"],
            "expected_next_update": "2026-07-24T13:56:00.000Z",
            "observation_type": "intraday",
            "live_claim_permitted": True,
        }
    }
    return {
        "section_id": "vix_volatility_environment",
        "section_name": "VIX — Volatility Environment",
        "target_instrument": "XAGUSD",
        "as_of": "2026-07-24T14:00:00.000Z",
        "source_status": "available",
        "freshness_status": "current",
        "evidence_state": "production_authoritative",
        "current_state": "volatility expanding",
        "silver_impact": "Volatility supports wider silver ranges.",
        "action_bias": "range_expansion_risk",
        "confidence_score": None,
        "confidence_label": "moderate",
        "confidence_basis": [{"code": "ELIGIBLE_EVIDENCE_COUNT"}],
        "reason_codes": ["LIVE_MARKET_CURRENT"],
        "source_provenance": {
            "source_contracts": ["authorized vix_snapshot"],
            "current_production_vix_source": False,
        },
        "vix_volatility_environment": {
            "current_vix_state": "volatility expanding",
            "risk_appetite": "risk appetite weakening",
            "data_freshness": freshness,
            "rule_version": "HEL-035.vix.1.0.0",
        },
        "vix_contradictions": {
            "status": "agreement",
            "contradictions": [],
        },
        "long_summary": "VIX — VOLATILITY ENVIRONMENT\nAction Bias: Range expansion risk",
        "short_summary": "VIX — Volatility Environment: volatility expanding.",
        "notification_preview": "VIX volatility is volatility expanding.",
        "production_effect": "none",
        "schema_version": "HEL-035.schema.1.0.0",
        "rule_version": "HEL-035.rules.1.0.0",
        "dashboard_summary": {
            "target_instrument": "XAGUSD",
            "headline": "VIX — Volatility Environment",
            "status": "available",
            "freshness": "current",
            "silver_impact": "Volatility supports wider silver ranges.",
            "action_bias": "range_expansion_risk",
            "action_language": "Range expansion risk",
            "confidence_score": None,
            "confidence_label": "moderate",
            "primary_risk": "The regime may change.",
            "required_confirmation": "Confirm persistence.",
            "expandable": {},
        },
    }


def test_vix_preview_requires_explicit_internal_flag():
    with pytest.raises(PermissionError, match="preview is disabled"):
        vix_volatility_environment_preview(vix_payload(), {})


def test_vix_preview_projects_all_surfaces_without_recomputing():
    payload = vix_payload()
    preview = vix_volatility_environment_preview(
        payload,
        {INTERNAL_PREVIEW_ENV: "true"},
    )
    assert preview["structured_interpretation"] == payload
    assert preview["long_rendering"] == payload["long_summary"]
    assert preview["short_rendering"] == payload["short_summary"]
    assert preview["dashboard_view_model"] == payload["dashboard_summary"]
    assert preview["notification_rendering"] == payload["notification_preview"]
    assert preview["provenance"] == payload["source_provenance"]
    assert preview["confidence_basis"] == payload["confidence_basis"]
    assert preview["freshness"] == payload["vix_volatility_environment"]["data_freshness"]
    assert preview["reason_codes"] == payload["reason_codes"]
    assert preview["production_effect"] == "none"


def test_vix_preview_rejects_incomplete_freshness_contract():
    payload = copy.deepcopy(vix_payload())
    del payload["vix_volatility_environment"]["data_freshness"]
    with pytest.raises(ValueError, match="freshness contract"):
        vix_volatility_environment_preview(
            payload,
            {INTERNAL_PREVIEW_ENV: "true"},
        )
