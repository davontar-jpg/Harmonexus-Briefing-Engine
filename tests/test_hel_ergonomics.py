from pathlib import Path

import hel_cartographer as hel


REPO_ROOT = Path(__file__).resolve().parents[1]


def test_runtime_uses_only_centralized_hel_styles():
    source = (REPO_ROOT / "app.py").read_text(encoding="utf-8")

    assert "_LEGACY_CSS =" in source
    assert "st.markdown(_LEGACY_CSS" not in source
    assert source.count("st.markdown(hel.css()") == 1
    assert source.count("st.markdown(hel.operator_shell_css()") == 1
    assert "@lru_cache(maxsize=1)\ndef plotly_palette" in source


def test_cards_have_row_major_order_and_native_keyboard_control():
    source = (REPO_ROOT / "app.py").read_text(encoding="utf-8")

    assert "for start in range(0, len(card_rows), 4):" in source
    assert "for column, (_, row) in zip(cols, card_rows[start:start + 4]):" in source
    assert 'type="checkbox" role="switch"' in source
    assert 'role="switch" aria-label="Show {html.escape(instrument)} context alignment" tabindex="0">' in source
    assert 'role="switch" aria-label="Show {html.escape(instrument)} context alignment" tabindex="-1"' not in source


def test_operator_css_declares_scroll_recomposition_and_fallbacks():
    css = hel.operator_shell_css()

    for requirement in (
        'scrollbar-gutter:stable',
        'overscroll-behavior-y:contain',
        'clip-path:inset(50%)',
        '[data-testid="stHorizontalBlock"]:has(.flip-shell)',
        'grid-template-columns:repeat(2,minmax(0,1fr))',
        'grid-template-columns:1fr',
        '@supports(content-visibility:auto)',
        '@media(prefers-reduced-motion:reduce)',
        'scroll-behavior:auto',
    ):
        assert requirement in css


def test_dense_surfaces_are_bounded_without_hiding_status_meaning():
    source = (REPO_ROOT / "app.py").read_text(encoding="utf-8")

    assert 'height=min(420, max(176, 36 * (len(display) + 1)))' in source
    assert 'height=220' in source
    assert 'height=264' in source
    assert 'height=164' in source
    assert 'watches = [(row, seasonal_watch(row))' not in source


def test_analytical_surfaces_expose_regions_and_heading_hierarchy():
    instrument = hel.analytical_instrument(
        "Confidence",
        "AUDIT",
        [("Reading", "72%", "Published confidence")],
        role=hel.ComponentRole.CONFIDENCE_INSTRUMENT,
    )
    risk = hel.risk_instrument("Warning", "Close below published threshold")
    chart = hel.chart_instrument_header("Directional pressure", "Published score")

    assert 'role="region" aria-label="Confidence"' in instrument
    assert 'role="heading" aria-level="3"' in instrument
    assert 'role="region" aria-label="Risk and invalidation"' in risk
    assert 'role="group" aria-label="Directional pressure"' in chart
    assert 'role="heading" aria-level="3"' in chart
