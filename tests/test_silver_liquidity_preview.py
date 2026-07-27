import copy

import pytest

from silver_intelligence import (
    INTERNAL_PREVIEW_ENV,
    liquidity_environment_preview,
)


def liquidity_payload():
    capability = {
        "provider_name": "none",
        "provider_version": "unavailable",
        "connection_status": "not_connected",
        "exchange": "COMEX",
        "instrument": "SI",
        "contract": None,
        "data_type": [],
        "depth_levels": None,
        "quality_status": "unavailable",
    }
    return {
        "section_id": "liquidity_environment",
        "section_name": "Liquidity Environment",
        "target_instrument": "XAGUSD",
        "as_of": "2026-07-24T14:00:00.000Z",
        "source_status": "unavailable",
        "freshness_status": "unknown",
        "evidence_state": "placeholder",
        "current_state": "provider unavailable",
        "silver_impact": "No liquidity interpretation is authorized.",
        "action_bias": "no_operational_conclusion",
        "confidence_score": None,
        "confidence_label": "unavailable",
        "confidence_basis": [{"code": "LIQUIDITY_PROVIDER_UNAVAILABLE"}],
        "limitations": ["order-book provider not connected"],
        "reason_codes": ["ORDER_BOOK_PROVIDER_NOT_CONNECTED"],
        "source_provenance": {
            "provider": "none",
            "institutional_reference": "COMEX Silver / SI",
        },
        "liquidity_environment": {
            "provider_status": "Not connected.",
            "capability": capability,
            "current_state": "Institutional order-book data unavailable.",
            "rule_version": "HEL-035.liquidity.1.0.0",
        },
        "long_summary": "LIQUIDITY ENVIRONMENT\nCurrent State: Unavailable.",
        "short_summary": "Liquidity: Order-book provider not connected.",
        "production_effect": "none",
        "schema_version": "HEL-035.schema.1.0.0",
        "rule_version": "HEL-035.rules.1.0.0",
        "dashboard_summary": {
            "target_instrument": "XAGUSD",
            "headline": "Liquidity Environment",
            "status": "unavailable",
            "freshness": "unknown",
            "silver_impact": "No liquidity interpretation is authorized.",
            "action_bias": "no_operational_conclusion",
            "action_language": "No operational conclusion",
            "confidence_score": None,
            "confidence_label": "unavailable",
            "primary_risk": "Unavailable is not neutral.",
            "required_confirmation": "Connect an approved provider.",
            "expandable": {"capability": capability},
        },
    }


def test_liquidity_preview_requires_explicit_internal_flag():
    with pytest.raises(PermissionError, match="preview is disabled"):
        liquidity_environment_preview(liquidity_payload(), {})


def test_liquidity_preview_exposes_unavailable_state_without_recomputation():
    payload = liquidity_payload()
    preview = liquidity_environment_preview(
        payload,
        {INTERNAL_PREVIEW_ENV: "true"},
    )
    assert preview["capability"] == payload["liquidity_environment"]["capability"]
    assert preview["provider_status"] == "Not connected."
    assert preview["structured_interpretation"] == payload
    assert preview["long_rendering"] == payload["long_summary"]
    assert preview["short_rendering"] == payload["short_summary"]
    assert preview["dashboard_view_model"] == payload["dashboard_summary"]
    assert preview["provenance"] == payload["source_provenance"]
    assert preview["limitations"] == payload["limitations"]
    assert preview["reason_codes"] == payload["reason_codes"]
    assert preview["production_effect"] == "none"


def test_liquidity_preview_rejects_missing_capability_contract():
    payload = copy.deepcopy(liquidity_payload())
    del payload["liquidity_environment"]["capability"]
    with pytest.raises(ValueError, match="capability contract"):
        liquidity_environment_preview(
            payload,
            {INTERNAL_PREVIEW_ENV: "true"},
        )
