from streamlit.testing.v1 import AppTest


def _widget(elements, label):
    return next(element for element in elements if element.label == label)


def _markdown_contains(app, text):
    return any(text in str(element.value) for element in app.markdown)


def test_all_operational_workspaces_render_without_runtime_exceptions():
    app = AppTest.from_file("app.py", default_timeout=30).run()
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
        assert len(app.dataframe) == table_count, workspace

    assert _widget(app.selectbox, "Data layer").value
    assert _markdown_contains(app, 'data-hel-contract="data_table"')
    assert _markdown_contains(app, 'data-hel-contract="filter_control"')


def test_safe_upload_empty_state_and_signal_audit_contracts_render():
    app = AppTest.from_file("app.py", default_timeout=30).run()
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
