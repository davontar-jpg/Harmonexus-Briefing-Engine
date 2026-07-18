from pathlib import Path

import hel_cartographer as hel
from hel_runtime import OperationalState, get_runtime
from hel_runtime.components import COMPONENT_OWNERSHIP, ComponentRole


REPO_ROOT = Path(__file__).resolve().parents[1]


def test_complete_operational_layer_has_registered_dual_hel_contracts():
    runtime = get_runtime()
    expected = {
        ComponentRole.INSTRUMENT_SELECTOR,
        ComponentRole.SOURCE_SELECTOR,
        ComponentRole.TIME_FRESHNESS_CONTROL,
        ComponentRole.STATUS_SUMMARY,
        ComponentRole.METRIC_INSTRUMENT,
        ComponentRole.DATA_TABLE,
        ComponentRole.SCENARIO_CONTROL,
        ComponentRole.RISK_AND_INVALIDATION,
        ComponentRole.ALERT_NOTICE,
        ComponentRole.PROGRESS_LOADING,
        ComponentRole.EMPTY_STATE,
        ComponentRole.EXPANDABLE_INSPECTION,
        ComponentRole.JSON_RAW_INSPECTION,
        ComponentRole.FILTER_CONTROL,
        ComponentRole.DATE_CALENDAR_CONTROL,
    }

    assert expected.issubset(COMPONENT_OWNERSHIP)
    for role in expected:
        ownership = runtime.component_ownership(role)
        assert ownership.role is role
        assert ownership.structure_owner.value in {"HEL-032", "HEL-028"}
        assert ownership.interaction_owner.value == "HEL-028"


def test_all_required_states_are_text_first_and_not_color_only():
    for state in OperationalState:
        markup = hel.notice("System state", "Evidence message", state=state)
        assert f'data-state="{state.value}"' in markup
        assert f">{state.value} · system feedback<" in markup
        expected_contract = "progress_loading" if state is OperationalState.LOADING else "alert_notice"
        assert f'data-hel-contract="{expected_contract}"' in markup
    assert 'role="alert"' in hel.notice("Failure", "Stopped", state="failed")
    assert 'role="status"' in hel.notice("Loading", "Working", state="loading")


def test_metrics_tables_empty_and_risk_surfaces_expose_state_and_ownership():
    stats = hel.statline(
        [
            ("Source", "LIVE", "Sheets", "nominal"),
            ("Freshness", "STALE", "72H", "stale"),
            ("Risk", "HIGH", "Review", "critical"),
            ("Delivery", "SEEN", "Operator", "acknowledged"),
        ]
    )
    table = hel.data_instrument_header(
        "Signal ledger", 19, source="LIVE SHEETS", freshness="FRESH 2H", state="nominal"
    )
    empty = hel.empty_state("No rows", "No observations are available.")
    risk = hel.risk_instrument("Elevated", "Close below mapped boundary")

    assert stats.count('data-hel-contract="metric_instrument"') == 4
    for state in ("nominal", "stale", "critical", "acknowledged"):
        assert f'data-state="{state}"' in stats
    assert 'data-hel-contract="data_table"' in table
    assert "19 rows" in table and "LIVE SHEETS" in table and "FRESH 2H" in table
    assert 'data-hel-contract="empty_state"' in empty
    assert "UNAVAILABLE · NO OBSERVATIONS" in empty
    assert 'data-hel-contract="risk_and_invalidation"' in risk
    assert "Elevated" in risk and "Close below mapped boundary" in risk


def test_inspection_and_json_contracts_are_keyboard_native_and_escaped():
    panel = hel.inspection_surface("Institutional read", "Evidence remains mixed.")
    raw = hel.json_block({"unsafe": "<script>"}, title="Explanation trace")

    assert 'data-hel-contract="expandable_inspection"' in panel
    assert '<details class="hel-json-inspector" open' in raw
    assert 'data-hel-contract="json_raw_inspection"' in raw
    assert "Explanation trace" in raw
    assert "&lt;script&gt;" in raw
    assert "<script>" not in raw


def test_app_routes_all_dense_grids_through_one_selectable_instrument_helper():
    source = (REPO_ROOT / "app.py").read_text(encoding="utf-8")

    assert source.count("st.dataframe(") == 1
    assert 'on_select="rerun"' in source
    assert 'selection_mode="single-row"' in source
    assert "render_data_instrument(" in source
    assert "hel.table_shell_start()" not in source
    for workspace in ("Instrument Lab", "Signal Audit", "System Operations", "Data Explorer"):
        assert f'"{workspace}"' in source
    assert "hel.risk_instrument(" in source


def test_operational_css_covers_native_controls_tables_states_and_accessibility():
    css = hel.operator_shell_css()

    for selector in (
        '[data-testid="stDataFrame"]',
        '[data-testid="stProgress"]',
        '[data-testid="stSpinner"]',
        '[data-testid="stAlert"]',
        '[data-testid="stExpander"]',
        '[data-testid="stDateInput"]',
        '[data-testid="stMultiSelect"]',
        ".stDownloadButton>button",
        ".hel-json-inspector summary:focus-visible",
    ):
        assert selector in css
    for state in ("nominal", "stale", "warning", "critical", "failed", "loading"):
        assert f'data-state="{state}"' in css
    assert "font-variant-numeric:tabular-nums" in css
    assert "min-height:44px" in css
    assert "overflow-x:auto" in css
    assert "prefers-reduced-motion:reduce" in css


def test_status_rail_time_and_footer_expose_specific_dual_contracts():
    rail = hel.operator_rail("Harmonexus", "2026-07-16", [("Freshness", "FRESH", "success")])
    seal = hel.operator_risk_seal("Decision support only")

    assert rail.count('data-hel-contract="status_summary"') == 2
    assert 'data-hel-contract="time_freshness_control"' in rail
    assert 'data-hel-contract="risk_and_invalidation"' in seal
