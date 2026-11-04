"""Display calibrated strength with direction; never changes the scoring model."""
import math


def signed_bias(direction, strength):
    if strength is None or strength == "":
        return None
    try:
        value = float(strength)
    except (TypeError, ValueError):
        return None
    label = str(direction).lower()
    if not math.isfinite(value) or label not in {"bullish", "bearish", "neutral"}:
        return None
    return 0.0 if label == "neutral" else min(10.0, abs(value)) * (-1 if label == "bearish" else 1)


def format_signed_bias(direction, strength):
    value = signed_bias(direction, strength)
    return "UNKNOWN" if value is None else (f"{value:+.1f}/10" if value else "0.0/10")


def signed_change(row):
    previous = signed_bias(row.get("Prior Direction"), row.get("Prior Strength"))
    current = signed_bias(row.get("Direction"), row.get("Strength"))
    return None if previous is None or current is None else current - previous
