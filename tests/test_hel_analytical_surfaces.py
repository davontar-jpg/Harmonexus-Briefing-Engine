from pathlib import Path

import hel_cartographer as hel
from hel_environment_contract import EnvironmentOwner
from hel_runtime import get_runtime
from hel_runtime.components import COMPONENT_OWNERSHIP, ComponentRole


REPO_ROOT = Path(__file__).resolve().parents[1]


ANALYTICAL_ROLES = {
    ComponentRole.PRIMARY_BRIEFING,
    ComponentRole.CROSS_ASSET_CONSENSUS,
    ComponentRole.CONTRADICTION_ANALYSIS,
    ComponentRole.PRIORITY_INSTRUMENTS,
    ComponentRole.AUCTION_RHYTHM,
    ComponentRole.CALENDAR_STRUCTURE,
    ComponentRole.SCENARIO_ANALYSIS,
    ComponentRole.REGIME_STATE,
    ComponentRole.CONFIDENCE_INSTRUMENT,
    ComponentRole.RELATIONSHIP_VISUALIZATION,
    ComponentRole.INSTRUMENT_HISTORY,
    ComponentRole.AUDIT_TRACE,
}


def test_every_analytical_surface_has_deterministic_dual_hel_ownership():
    runtime = get_runtime()
    assert ANALYTICAL_ROLES.issubset(COMPONENT_OWNERSHIP)
    for role in ANALYTICAL_ROLES:
        ownership = runtime.component_ownership(role)
        assert ownership.role is role
        assert ownership.structure_owner is EnvironmentOwner.WORLD
        assert ownership.interaction_owner is EnvironmentOwner.OPERATOR


def test_analytical_markup_exposes_exact_values_states_and_contracts():
    panel = hel.analytical_instrument(
        "Regime and confidence",
        "XAGUSD · PUBLISHED MARKET STATE",
        [("Regime", "Bearish", "Age 41 trading days"), ("Confidence", "61%", "Strong")],
        role=ComponentRole.REGIME_STATE,
        state="warning",
    )
    evidence = hel.analytical_list(
        "Contradictions",
        "EVIDENCE CONFLICTS",
        [("Open interest weakens continuation quality.", "CONTRADICTION")],
        role=ComponentRole.CONTRADICTION_ANALYSIS,
        state="warning",
    )

    assert 'data-hel-contract="regime_state"' in panel
    assert 'data-state="warning"' in panel
    assert "Bearish" in panel and "41 trading days" in panel and "61%" in panel
    assert 'data-hel-contract="contradiction_analysis"' in evidence
    assert "Open interest weakens continuation quality." in evidence


def test_chart_housing_preserves_world_structure_and_operator_inspection():
    header = hel.chart_instrument_header(
        "Instrument history",
        "Exact published observations.",
        role=ComponentRole.INSTRUMENT_HISTORY,
        state="stale",
    )
    ownership = get_runtime().component_ownership(ComponentRole.INSTRUMENT_HISTORY)

    assert 'data-hel-contract="instrument_history"' in header
    assert 'data-state="stale"' in header
    assert ownership.structure_owner is EnvironmentOwner.WORLD
    assert ownership.interaction_owner is EnvironmentOwner.OPERATOR


def test_application_reads_published_analytical_contracts_without_replacing_scorers():
    source = (REPO_ROOT / "app.py").read_text(encoding="utf-8")

    for published_source in (
        'data.get("Relationship_Cache"',
        'data.get("Score_History"',
        "get_market_calendar_watch()",
        'row.get("Contradictions"',
        'row.get("Invalidation"',
        'row.get("Confidence"',
    ):
        assert published_source in source
    assert "def score_frame(" in source
    assert "def enrich_score_context(" in source
    assert "formatTelegram" not in source
    assert "sendTelegram" not in source


def test_analytical_css_covers_precision_mobile_and_reduced_motion_states():
    css = hel.operator_shell_css()

    for selector in (
        ".hel-analytical-instrument",
        ".hel-analytical-readout",
        ".hel-analytical-list",
        ".hel-chart-instrument-head",
        '[data-state="unavailable"]',
    ):
        assert selector in css
    assert "font-variant-numeric:tabular-nums" in css
    assert "@media(max-width:640px)" in css
    assert "@media(prefers-reduced-motion:reduce)" in css


def test_card_flip_keeps_native_keyboard_control_and_separate_face_contracts():
    source = (REPO_ROOT / "app.py").read_text(encoding="utf-8")

    assert 'type="checkbox" role="switch"' in source
    assert 'tabindex="0"' in source
    assert "ComponentRole.BRIEFING_CARD" in source
    assert "ComponentRole.CONTEXT_CARD_BACK" in source
    assert ".flip-toggle:checked+.flip-card-inner{transform:rotateY(180deg)" in source
    assert ".flip-shell:focus-visible .flip-card-inner{transform:rotateY(180deg)" in source
    assert "prefers-reduced-motion: reduce" in hel.css()
