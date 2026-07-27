import json

import pytest

from silver_intelligence import (
    INTERNAL_PREVIEW_ENV,
    dashboard_view_model,
    internal_preview_enabled,
    parse_silver_interpretation,
)


def interpretation_payload():
    return {
        "section_id": "silver_core",
        "section_name": "Silver Intelligence",
        "target_instrument": "XAGUSD",
        "as_of": "2026-07-24T14:00:00.000Z",
        "source_status": "available",
        "freshness_status": "current",
        "evidence_state": "production_authoritative",
        "current_state": "strengthening",
        "silver_impact": "supportive",
        "action_bias": "continuation_favored",
        "confidence_score": 82,
        "confidence_label": "high",
        "source_provenance": {"providers": ["fixture_provider"]},
        "schema_version": "HEL-035.schema.1.0.0",
        "rule_version": "HEL-035.rules.1.0.0",
        "dashboard_summary": {
            "target_instrument": "XAGUSD",
            "headline": "Silver Intelligence — strengthening",
            "status": "available",
            "freshness": "current",
            "silver_impact": "supportive",
            "action_bias": "continuation_favored",
            "action_language": "Continuation favored",
            "confidence_score": 82,
            "confidence_label": "high",
            "primary_risk": "Rates could challenge the conclusion.",
            "required_confirmation": "Confirm persistence.",
            "expandable": {"evidence": [], "provenance": {}, "limitations": []},
        },
    }


def test_internal_preview_is_explicit_and_disabled_by_default():
    assert internal_preview_enabled({}) is False
    assert internal_preview_enabled({INTERNAL_PREVIEW_ENV: "false"}) is False
    assert internal_preview_enabled({INTERNAL_PREVIEW_ENV: "true"}) is True


def test_dashboard_consumer_preserves_authoritative_renderer_values():
    payload = interpretation_payload()
    view = dashboard_view_model(json.dumps(payload))
    assert view.target_instrument == "XAGUSD"
    assert view.current_state == payload["current_state"]
    assert view.silver_impact == payload["silver_impact"]
    assert view.action_bias == payload["action_bias"]
    assert view.confidence_score == payload["confidence_score"]
    assert view.headline == payload["dashboard_summary"]["headline"]


def test_dashboard_consumer_rejects_missing_or_non_silver_contracts():
    payload = interpretation_payload()
    del payload["source_status"]
    with pytest.raises(ValueError, match="Missing SilverInterpretation fields"):
        parse_silver_interpretation(payload)

    payload = interpretation_payload()
    payload["target_instrument"] = "GOLD"
    with pytest.raises(ValueError, match="XAGUSD only"):
        parse_silver_interpretation(payload)


def test_dashboard_consumer_does_not_invent_missing_dashboard_state():
    payload = interpretation_payload()
    del payload["dashboard_summary"]["action_language"]
    with pytest.raises(KeyError):
        dashboard_view_model(payload)
