"""Display-boundary credential redaction for the Harmonexus dashboard."""

from __future__ import annotations

import re
from collections.abc import Mapping
from typing import Any, Iterable

import pandas as pd


REDACTED = "[REDACTED]"
_SENSITIVE_KEY_RE = re.compile(
    r"(?:^|[_\-\s])(?:webhook[_\-]?secret|secret|token|password|api[_\-]?key|"
    r"authorization|bearer|private[_\-]?key|client[_\-]?secret|access[_\-]?token|"
    r"refresh[_\-]?token)(?:$|[_\-\s])",
    re.IGNORECASE,
)
_KEY_VALUE_RE = re.compile(
    r"((?:webhook[_-]?secret|secret|token|password|api[_-]?key|authorization|"
    r"private[_-]?key|client[_-]?secret|access[_-]?token|refresh[_-]?token)"
    r"[\"']?\s*[:=]\s*)(?:\"[^\"]*\"|'[^']*'|[^,\s}&]+)",
    re.IGNORECASE,
)
_BEARER_RE = re.compile(r"\bBearer\s+[A-Za-z0-9._~+/=:-]+", re.IGNORECASE)
_BOT_URL_RE = re.compile(r"/bot[^/\s]+", re.IGNORECASE)
_PRIVATE_KEY_RE = re.compile(
    r"-----BEGIN PRIVATE KEY-----[\s\S]*?-----END PRIVATE KEY-----",
    re.IGNORECASE,
)


def is_sensitive_key(key: Any) -> bool:
    return bool(_SENSITIVE_KEY_RE.search(str(key or "")))


def sensitive_values_from_mapping(mapping: Mapping[str, Any] | None) -> tuple[str, ...]:
    """Collect configured credential values without exposing them to callers or logs."""
    values: set[str] = set()

    def visit(value: Any, sensitive_parent: bool = False) -> None:
        if isinstance(value, Mapping):
            for key, child in value.items():
                visit(child, sensitive_parent or is_sensitive_key(key))
        elif sensitive_parent and value not in (None, ""):
            text = str(value)
            if len(text) >= 4:
                values.add(text)

    if mapping:
        visit(mapping)
    return tuple(sorted(values, key=len, reverse=True))


def redact_text(value: Any, secret_values: Iterable[str] = ()) -> str:
    text = str(value if value is not None else "")
    for secret in sorted({str(item) for item in secret_values if str(item)}, key=len, reverse=True):
        text = text.replace(secret, REDACTED)
    text = _PRIVATE_KEY_RE.sub("[REDACTED PRIVATE KEY]", text)
    text = _BEARER_RE.sub("Bearer [REDACTED]", text)
    text = _BOT_URL_RE.sub("/bot[REDACTED]", text)
    return _KEY_VALUE_RE.sub(lambda match: f"{match.group(1)}\"{REDACTED}\"", text)


def redact_for_display(value: Any, secret_values: Iterable[str] = ()) -> Any:
    """Recursively redact objects immediately before public rendering."""
    if isinstance(value, Mapping):
        return {
            key: REDACTED if is_sensitive_key(key) else redact_for_display(child, secret_values)
            for key, child in value.items()
        }
    if isinstance(value, list):
        return [redact_for_display(item, secret_values) for item in value]
    if isinstance(value, tuple):
        return tuple(redact_for_display(item, secret_values) for item in value)
    if isinstance(value, str):
        return redact_text(value, secret_values)
    return value


def redact_dataframe(frame: pd.DataFrame, secret_values: Iterable[str] = ()) -> pd.DataFrame:
    """Return a redacted display copy; never mutate the engine's source dataframe."""
    result = frame.copy()
    for column in result.columns:
        if is_sensitive_key(column):
            result[column] = REDACTED
        else:
            result[column] = result[column].map(
                lambda value: redact_for_display(value, secret_values)
            )
    return result
