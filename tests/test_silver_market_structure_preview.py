from __future__ import annotations

import pytest

from silver_intelligence import INTERNAL_PREVIEW_ENV, market_structure_preview


def payload() -> dict:
    detail = {
        "current_structure": "bearish",
        "auction_state": "unavailable",
        "liquidity_sweep_status": "unavailable",
        "higher_timeframe_bias": "unavailable",
        "current_session": {"name": "unavailable", "condition": "unavailable"},
        "continuation_state": "unavailable",
        "exhaustion_state": "unavailable",
        "structural_confirmation": {
            "overall": "Structural confirmation is unavailable or unresolved."
        },
        "structural_weakness": ["Auction state unavailable"],
        "internal_harmonexus_structure": {
            "note": "Update manually",
            "structure_score": -1,
        },
        "data_freshness": {
            "status": "unknown",
            "source_timestamp": None,
            "reason_code": "OBSERVATION_TIMESTAMP_MISSING",
        },
    }
    dashboard = {
        "target_instrument": "XAGUSD",
        "headline": "Market Structure — bearish",
        "status": "partial",
        "freshness": "unknown",
        "silver_impact": "Existing structure is incomplete.",
        "action_bias": "no_operational_conclusion",
        "action_language": "No Operational Conclusion",
        "confidence_score": None,
        "confidence_label": "very low",
        "primary_risk": "Auction state unavailable",
        "required_confirmation": "Require current structure fields.",
        "expandable": {},
    }
    return {
        "section_id": "market_structure",
        "section_name": "Market Structure",
        "target_instrument": "XAGUSD",
        "as_of": "2026-07-24T14:00:00.000Z",
        "source_status": "partial",
        "freshness_status": "unknown",
        "evidence_state": "production_authoritative",
        "current_state": "bearish",
        "silver_impact": "Existing structure is incomplete.",
        "action_bias": "no_operational_conclusion",
        "confidence_score": None,
        "confidence_label": "very low",
        "dashboard_summary": dashboard,
        "source_provenance": {
            "authority": "Existing Harmonexus Market Structure",
            "read_only": True,
            "structure_recalculated": False,
            "order_book_consumed": False,
        },
        "market_structure": detail,
        "long_summary": "MARKET STRUCTURE\nCurrent Structure: bearish",
        "short_summary": "Market Structure: bearish.",
        "confidence_basis": {"conclusion_precision": "qualitative"},
        "limitations": ["existing Harmonexus structure is partial"],
        "reason_codes": ["NO_STRUCTURE_RECALCULATION"],
        "production_effect": "none",
        "schema_version": "HEL-035.schema.1.0.0",
        "rule_version": "HEL-035.rules.1.0.0",
    }


def test_preview_requires_the_internal_flag() -> None:
    with pytest.raises(PermissionError):
        market_structure_preview(payload(), {})


def test_preview_projects_existing_structure_without_recalculation() -> None:
    value = payload()
    preview = market_structure_preview(
        value,
        {INTERNAL_PREVIEW_ENV: "true"},
    )
    assert preview["structured_interpretation"] == value
    assert preview["market_structure"] == value["market_structure"]
    assert preview["long_rendering"] == value["long_summary"]
    assert preview["short_rendering"] == value["short_summary"]
    assert preview["dashboard_view_model"] == value["dashboard_summary"]
    assert preview["provenance"]["structure_recalculated"] is False
    assert preview["provenance"]["order_book_consumed"] is False
    assert preview["production_effect"] == "none"


def test_preview_rejects_recalculation_order_book_and_activation() -> None:
    recalculated = payload()
    recalculated["source_provenance"]["structure_recalculated"] = True
    with pytest.raises(ValueError, match="unrecalculated"):
        market_structure_preview(
            recalculated,
            {INTERNAL_PREVIEW_ENV: "true"},
        )

    order_book = payload()
    order_book["source_provenance"]["order_book_consumed"] = True
    with pytest.raises(ValueError, match="order-book"):
        market_structure_preview(
            order_book,
            {INTERNAL_PREVIEW_ENV: "true"},
        )

    active = payload()
    active["production_effect"] = "briefing_changed"
    with pytest.raises(ValueError, match="production_effect"):
        market_structure_preview(
            active,
            {INTERNAL_PREVIEW_ENV: "true"},
        )
