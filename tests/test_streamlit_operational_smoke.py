from pathlib import Path

from streamlit.testing.v1 import AppTest


APP_PATH = Path(__file__).resolve().parents[1] / "app.py"


def _widget(elements, label):
    return next(element for element in elements if element.label == label)


def _markdown_contains(app, text):
    return any(text in str(element.value) for element in app.markdown)


def test_all_operational_workspaces_render_without_runtime_exceptions():
    app = AppTest.from_file(APP_PATH, default_timeout=30).run()
    assert not app.exception

    expected_tables = {
        "Overview": 0,
        "Instrument Lab": 0,
        "Signal Audit": 1,
        "Operations": 2,
        "Data Explorer": 1,
    }
    for workspace, table_count in expected_tables.items():
        _widget(app.radio, "Workspace").set_value(workspace)
        app.run()
        assert not app.exception, workspace
        if workspace == "Instrument Lab":
            _widget(app.selectbox, "Instrument").set_value("US30")
            app.run()
            assert not app.exception, workspace
        assert len(app.dataframe) == table_count, workspace

    assert _widget(app.selectbox, "Data layer").value
    assert _markdown_contains(app, 'data-hel-contract="data_table"')
    assert _markdown_contains(app, 'data-hel-contract="filter_control"')


def test_safe_upload_empty_state_and_signal_audit_contracts_render():
    app = AppTest.from_file(APP_PATH, default_timeout=30).run()
    _widget(app.radio, "Source mode").set_value("Upload workbook")
    app.run()
    assert not app.exception
    assert _markdown_contains(app, "Workbook handoff required")
    assert _markdown_contains(app, 'data-state="unavailable"')

    _widget(app.radio, "Source mode").set_value("Bundled demo")
    _widget(app.radio, "Workspace").set_value("Signal Audit")
    app.run()
    assert not app.exception
    assert _markdown_contains(app, 'data-hel-contract="metric_instrument"')
    assert _markdown_contains(app, 'data-hel-contract="json_raw_inspection"')
    assert _markdown_contains(app, 'data-hel-contract="risk_and_invalidation"')


def test_xagusd_public_archive_shows_source_boundaries_and_real_counts(monkeypatch):
    monkeypatch.delenv("HARMONEXUS_SILVER_ARCHIVE_SNAPSHOT", raising=False)
    app = AppTest.from_file(APP_PATH, default_timeout=30).run()
    _widget(app.radio, "Workspace").set_value("Instrument Lab")
    app.run()
    _widget(app.selectbox, "Instrument").set_value("XAGUSD")
    app.run()
    assert not app.exception and not app.warning
    assert _markdown_contains(app, "Archive observations only")
    assert "Weekly high and low formation" in [x.label for x in app.expander]
    assert "Retracement and trailing comparisons" in [x.label for x in app.expander]
    frame = next(x.value for x in app.dataframe if "Complete weeks" in x.value.columns)
    assert len(frame) == 12 and int(frame.iloc[0]["Complete weeks"]) > 156
    _widget(app.selectbox, "Silver evidence source").set_value("histCoreM5")
    app.run()
    assert not app.exception and not app.warning
    assert any("core window" in str(x.value) for x in app.caption)
