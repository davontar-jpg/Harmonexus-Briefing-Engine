import pandas as pd

_BATCH_SIZE = 20


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


def read_sheet_frames(workbook) -> dict[str, pd.DataFrame]:
    """Read the same formatted cells while staying within the Sheets read quota."""
    titles = [worksheet.title for worksheet in workbook.worksheets()]
    result = {}
    for start in range(0, len(titles), _BATCH_SIZE):
        group = titles[start : start + _BATCH_SIZE]
        # Quote whole-sheet A1 ranges, even if a title matches a named range.
        ranges = ["'" + title.replace("'", "''") + "'" for title in group]
        response = workbook.values_batch_get(
            ranges, params={"majorDimension": "ROWS", "valueRenderOption": "FORMATTED_VALUE"}
        )
        values = response.get("valueRanges", [])
        if len(values) != len(group):
            raise ValueError("Google Sheets returned an incomplete batch.")
        # values.batchGet preserves request order and omits values for empty ranges.
        result.update((title, _frame(item.get("values", []))) for title, item in zip(group, values))
    return result
