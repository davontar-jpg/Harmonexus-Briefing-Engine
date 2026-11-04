from math import isfinite
from numbers import Real

import pandas as pd

_BATCH_SIZE = 20
_SCORE_TIME_SHEETS = ("Instrument_Scores", "Score_History")


def _frame(values: list[list[str]]) -> pd.DataFrame:
    if not values:
        return pd.DataFrame()
    width = max(len(row) for row in values)
    padded = [row + [""] * (width - len(row)) for row in values]
    headers, seen = [], {}
    for index, value in enumerate(padded[0]):
        base = str(value).strip() or f"Column_{index + 1}"
        seen[base] = seen.get(base, 0) + 1
        headers.append(base if seen[base] == 1 else f"{base}_{seen[base]}")
    return pd.DataFrame(padded[1:], columns=headers)


def _a1_sheet(title: str) -> str:
    return "'" + title.replace("'", "''") + "'"


def _batch(workbook, ranges, params):
    values = workbook.values_batch_get(ranges, params=params).get("valueRanges", [])
    if len(values) != len(ranges):
        raise ValueError("Google Sheets returned an incomplete batch.")
    return values


def _score_timestamp(value, timezone: str):
    if not isinstance(value, Real) or isinstance(value, bool) or not isfinite(value):
        return value
    # Sheets serials store local wall time in the spreadsheet's timezone.
    local = pd.to_datetime(round(value * 86_400_000), unit="ms", origin="1899-12-30", errors="coerce")
    if pd.isna(local):
        return ""
    localized = local.tz_localize(timezone, ambiguous="NaT", nonexistent="NaT")
    return "" if pd.isna(localized) else localized.tz_convert("UTC").isoformat()


def read_sheet_frames(workbook) -> dict[str, pd.DataFrame]:
    """Read the same formatted cells while staying within the Sheets read quota."""
    metadata = workbook.fetch_sheet_metadata(params={"fields": "properties.timeZone,sheets.properties.title"})
    titles = [sheet["properties"]["title"] for sheet in metadata["sheets"]]
    result = {}
    for start in range(0, len(titles), _BATCH_SIZE):
        group = titles[start : start + _BATCH_SIZE]
        # Quote whole-sheet A1 ranges, even if a title matches a named range.
        values = _batch(
            workbook, [_a1_sheet(title) for title in group],
            {"majorDimension": "ROWS", "valueRenderOption": "FORMATTED_VALUE"},
        )
        # values.batchGet preserves request order and omits values for empty ranges.
        result.update((title, _frame(item.get("values", []))) for title, item in zip(group, values))
    # Display formatting truncates the score timestamps. Use one additional
    # request for only the score time and instrument columns.
    score_sheets = [
        title for title in _SCORE_TIME_SHEETS
        if title in result and not result[title].empty
        and result[title].columns[:2].tolist() == ["As Of", "Instrument"]
    ]
    if score_sheets:
        timezone = metadata["properties"]["timeZone"]
        times = _batch(
            workbook, [f"{_a1_sheet(title)}!A1:B{len(result[title]) + 1}" for title in score_sheets],
            {"majorDimension": "ROWS", "valueRenderOption": "UNFORMATTED_VALUE", "dateTimeRenderOption": "SERIAL_NUMBER"},
        )
        for title, item in zip(score_sheets, times):
            frame, rows = result[title], item.get("values", [])
            if (not rows or rows[0] != ["As Of", "Instrument"]
                    or len(rows) != len(frame) + 1
                    or [str(row[1]) if len(row) > 1 else "" for row in rows[1:]] != frame["Instrument"].tolist()):
                raise ValueError("Google Sheets score timestamp rows changed during read.")
            frame["As Of"] = [_score_timestamp(row[0], timezone) if row else "" for row in rows[1:]]
    return result
