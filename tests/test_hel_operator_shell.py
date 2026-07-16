from pathlib import Path

import hel_cartographer as hel


REPO_ROOT = Path(__file__).resolve().parents[1]


def test_operator_shell_uses_dual_runtime_without_replacing_world_css():
    world_css = hel.css()
    operator_css = hel.operator_shell_css()

    assert "--hel-world-color-semantic-environment-void" in operator_css
    assert "--hel-operator-color-semantic-surface-base" in operator_css
    assert "--hel-semantic-operator-control-primary" in operator_css
    assert ".hel-operator-shell" in operator_css
    assert ".hel-hero" in world_css
    assert ".hel-hero" not in operator_css


def test_action_hierarchy_and_all_interactive_states_are_declared():
    css = hel.operator_shell_css()

    for action in (
        "primary",
        "secondary",
        "destructive",
        "confirmatory",
        "passive",
    ):
        assert f".hel-action--{action}" in css
    for state in ("idle", "disabled", "loading", "success", "warning", "failure"):
        assert f'[data-state="{state}"]' in css
    for pseudo_state in (":hover", ":focus-visible", ":active", ":disabled"):
        assert pseudo_state in css
    assert "aria-disabled" in css


def test_operator_controls_recompose_and_retain_minimum_target_size():
    css = hel.operator_shell_css()

    assert "min-height:44px" in css
    assert "@media(max-width:640px)" in css
    assert "grid-template-columns:repeat(2,minmax(0,1fr))" in css
    assert "width:min(92vw,340px)" in css
    assert "prefers-reduced-motion:reduce" in css


def test_operator_rail_is_accessible_compact_and_escaped():
    rail = hel.operator_rail(
        "Harmonexus <Engine>",
        "2026-07-16 & current",
        [
            ("Source", "Live <Sheets>", "success"),
            ("Risk", "Warning", "warning"),
            ("Unknown", "Safe", "unsupported-state"),
        ],
    )

    assert 'aria-label="Operator status"' in rail
    assert 'role="status"' in rail
    assert 'aria-live="polite"' in rail
    assert "Harmonexus &lt;Engine&gt;" in rail
    assert "Live &lt;Sheets&gt;" in rail
    assert "2026-07-16 &amp; current" in rail
    assert rail.count('class="status-chip"') == 3
    assert 'data-state="passive"' in rail


def test_application_preserves_existing_controls_and_destinations():
    source = (REPO_ROOT / "app.py").read_text(encoding="utf-8")

    assert 'source_options = ["Bundled demo", "Upload workbook", "Live Google Sheets"]' in source
    assert '["Overview", "Instrument Lab", "Signal Audit", "Operations", "Data Explorer"]' in source
    assert 'st.selectbox("Universe", list(FAMILIES))' in source
    assert 'st.checkbox(' in source and '"Reduced sensory"' in source
    assert source.count("hel.operator_shell_css()") == 1
    assert source.count("hel.operator_rail(") == 1


def test_reduced_sensory_mode_disables_operator_effects_only():
    css = hel.operator_reduced_sensory_css()

    assert ".hel-operator-shell" in css
    assert "backdrop-filter:none" in css
    assert "transition:none" in css
    assert ".hel-hero" not in css
