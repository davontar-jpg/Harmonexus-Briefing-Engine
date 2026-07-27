from __future__ import annotations

import copy
import json
from pathlib import Path

import pytest

from silver_intelligence import (
    INTEGRATION_SECTION_ORDER,
    INTERNAL_PREVIEW_ENV,
    OPERATOR_DECISION_FLOW,
    silver_briefing_integration_preview,
)


ROOT = Path(__file__).resolve().parents[1]
FIXTURE = json.loads(
    (ROOT / "tests/fixtures/hel_035_briefing_integration.json").read_text(
        encoding="utf-8"
    )
)


def payload() -> dict:
    source = copy.deepcopy(FIXTURE)
    section_map = source["bundle"]["sections"]
    keys = (
        "executive_market_assessment",
        "evidence_integrity",
        "monetary_environment",
        "vix_environment",
        "liquidity_environment",
        "silver_intelligence",
        "market_structure",
    )
    sections = [section_map[key] for key in keys]
    long_sections = []
    for section in sections:
        rendered = section["long_summary"]
        if section["section_id"] == "silver_intelligence":
            lines = rendered.splitlines()
            lines.insert(1, "Authority: Shadow Observation")
            rendered = "\n".join(lines)
        long_sections.append(rendered)
    header, body = source["existing_briefing"].split("\nMARKET REGIME:\n", 1)
    short = "\n".join(
        f'{section["section_name"]} — Current State: {section["current_state"]}; '
        f'Silver Impact: {section["silver_impact"]}; '
        f'Confidence: {section["confidence_label"]}.'
        + (
            " Authority: Shadow Observation."
            if section["section_id"] == "silver_intelligence"
            else ""
        )
        for section in sections
    )
    dashboard_sections = []
    for section in sections:
        authority = {
            "production_authoritative": "Production Approved",
            "shadow": "Shadow Observation",
            "placeholder": "Unavailable",
        }[section["evidence_state"]]
        dashboard_sections.append(
            {
                "section_id": section["section_id"],
                "section_name": section["section_name"],
                "headline": section["current_state"],
                "authority_label": authority,
                "interpretation": section.get(
                    "operator_summary", section.get("interpretation", "")
                ),
                "silver_impact": section["silver_impact"],
                "operational_conclusion": section["action_bias"],
                "primary_risk": section["primary_risk"],
                "required_confirmation": section["required_confirmation"],
                "confidence": {
                    "label": section["confidence_label"],
                    "score": section.get("confidence_score"),
                },
                "freshness": {
                    "status": section["freshness_status"],
                    "as_of": section["as_of"],
                },
                "expandable_details": {
                    "evidence": [],
                    "metrics": (
                        {
                            "vix_level": 22.4,
                            "vix_daily_change_pct": 8.1,
                            "vix_percentile": 76,
                        }
                        if section["section_id"] == "vix_volatility_environment"
                        else {}
                    ),
                    "sources": section["source_provenance"],
                    "freshness": {
                        "status": section["freshness_status"],
                        "as_of": section["as_of"],
                    },
                    "reason_codes": section["reason_codes"],
                    "research_notes": [],
                    "limitations": section["limitations"],
                },
            }
        )
    return {
        "target_instrument": "XAGUSD",
        "section_order": list(INTEGRATION_SECTION_ORDER),
        "sections": sections,
        "long_briefing": (
            header
            + "\n\n"
            + "\n\n".join(long_sections)
            + "\n\nMARKET REGIME:\n"
            + body
        ),
        "short_briefing": short,
        "dashboard": {
            "target_instrument": "XAGUSD",
            "layout_policy": "headline_interpretation_conclusion_expandable_evidence",
            "operator_flow": list(OPERATOR_DECISION_FLOW),
            "section_order": list(INTEGRATION_SECTION_ORDER),
            "sections": dashboard_sections,
            "performance": {
                "cached_interpretation_preferred": True,
                "source_objects_reused": True,
                "network_calls_added": 0,
                "background_jobs_added": 0,
            },
            "production_effect": "none",
        },
        "silver_card_preview": {
            "target_instrument": "XAGUSD",
            "status": "preview_only",
            "current_production_card_preserved": True,
            "card_redesigned": False,
            "authority_label": "Shadow Observation",
            "production_effect": "none",
        },
        "notification": {
            "existing_daily_delivery_path": True,
            "new_alerts": False,
            "independent_section_notifications": False,
            "message_surface": "long_briefing",
        },
        "production_effect": "none",
        "integration_version": "HEL-035.integration.1.1.0",
    }


def test_integration_preview_requires_explicit_flag() -> None:
    with pytest.raises(PermissionError):
        silver_briefing_integration_preview(payload(), {})


def test_integration_preview_preserves_all_surfaces_and_order() -> None:
    value = payload()
    preview = silver_briefing_integration_preview(
        value, {INTERNAL_PREVIEW_ENV: "true"}
    )
    assert preview["section_order"] == list(INTEGRATION_SECTION_ORDER)
    assert preview["long_briefing"] == value["long_briefing"]
    assert preview["short_briefing"] == value["short_briefing"]
    assert preview["dashboard"] == value["dashboard"]
    assert preview["production_effect"] == "none"


def test_shadow_and_silver_card_boundaries_remain_explicit() -> None:
    preview = silver_briefing_integration_preview(
        payload(), {INTERNAL_PREVIEW_ENV: "true"}
    )
    shadow = next(
        section
        for section in preview["dashboard"]["sections"]
        if section["section_id"] == "silver_intelligence"
    )
    assert shadow["authority_label"] == "Shadow Observation"
    assert preview["silver_card_preview"]["current_production_card_preserved"] is True
    assert preview["silver_card_preview"]["card_redesigned"] is False
    assert preview["notification"]["new_alerts"] is False


def test_integration_rejects_order_activation_and_notification_drift() -> None:
    wrong_order = payload()
    wrong_order["section_order"][0], wrong_order["section_order"][1] = (
        wrong_order["section_order"][1],
        wrong_order["section_order"][0],
    )
    with pytest.raises(ValueError, match="order"):
        silver_briefing_integration_preview(
            wrong_order, {INTERNAL_PREVIEW_ENV: "true"}
        )

    active = payload()
    active["production_effect"] = "briefing_changed"
    with pytest.raises(ValueError, match="production_effect"):
        silver_briefing_integration_preview(
            active, {INTERNAL_PREVIEW_ENV: "true"}
        )

    alert = payload()
    alert["notification"]["new_alerts"] = True
    with pytest.raises(ValueError, match="notification"):
        silver_briefing_integration_preview(
            alert, {INTERNAL_PREVIEW_ENV: "true"}
        )


def test_streamlit_preview_is_guarded_and_production_card_remains_separate() -> None:
    source = (ROOT / "app.py").read_text(encoding="utf-8")
    assert 'workspace_options.append("Silver Market Desk")' in source
    assert "if internal_preview_enabled():" in source
    assert "def card(row: pd.Series):" in source
    assert "def render_hel035_silver_card_preview" in source
    assert 'data.get("HEL_035_Runtime"' in source
    assert 'data.get("HEL_035_Preview"' not in source
    assert '"Payload Chunk"' in source
    assert '"Chunk Index"' in source
    assert 'latest_runtime_id = frame.iloc[-1].get("Runtime ID")' in source
    assert "@st.cache_data(show_spinner=False, max_entries=8)" in source
    assert "current_production_card_preserved" not in source[
        source.index("def card(row: pd.Series):"):
        source.index("def driver_rows")
    ]
