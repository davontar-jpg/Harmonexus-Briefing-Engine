from directional_display import format_signed_bias, signed_change


def test_calibrated_display_and_missingness():
    assert format_signed_bias("Bearish", 4.8) == "-4.8/10"
    assert format_signed_bias("Bullish", 6.5) == "+6.5/10"
    assert format_signed_bias("Neutral", 1) == "0.0/10"
    assert format_signed_bias("Bullish", None) == "UNKNOWN"


def test_reversal_is_signed_net_change():
    assert signed_change({"Prior Direction": "Bullish", "Prior Strength": 3.5,
                          "Direction": "Bearish", "Strength": 4.5}) == -8
