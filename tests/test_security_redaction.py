from pathlib import Path

import pandas as pd

from security_redaction import REDACTED, redact_dataframe, redact_for_display, sensitive_values_from_mapping


def test_streamlit_display_redaction_masks_sensitive_fields_and_values():
    configured_secret = "configured-webhook-secret-value"
    values = sensitive_values_from_mapping(
        {"WEBHOOK_SECRET": configured_secret, "gcp_service_account": {"private_key": "private-key-material"}}
    )
    frame = pd.DataFrame(
        [{
            "Instrument": "XAGUSD",
            "secret": "unknown-secret-value",
            "Raw Payload": f'{{"secret":"{configured_secret}","authorization":"Bearer bearer-value"}}',
            "Notes": "token=inline-token password: inline-password",
        }]
    )

    displayed = redact_dataframe(frame, values)
    rendered = displayed.to_string()
    assert displayed.loc[0, "secret"] == REDACTED
    for forbidden in [configured_secret, "unknown-secret-value", "bearer-value", "inline-token", "inline-password"]:
        assert forbidden not in rendered
    assert REDACTED in rendered


def test_recursive_redaction_masks_secret_like_keys_and_bearer_credentials():
    displayed = redact_for_display(
        {"summary": "Authorization: Bearer abc.def", "nested": {"api_key": "key-value", "driver": "DXY"}}
    )
    assert "abc.def" not in str(displayed)
    assert displayed["nested"]["api_key"] == REDACTED
    assert displayed["nested"]["driver"] == "DXY"


def test_public_streamlit_tables_use_display_boundary_redaction():
    source = Path("app.py").read_text(encoding="utf-8")
    assert "display = redact_dataframe(frame, display_values)" in source
    assert "render_data_instrument(data.get(name" in source
    assert "render_data_instrument(data[sheet]" in source
    assert "hel.json_block(redact_for_display(" in source
