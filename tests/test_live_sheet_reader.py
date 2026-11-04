from types import SimpleNamespace

import pytest

from live_sheet_reader import read_sheet_frames


class FakeWorkbook:
    titles = ["Owner's snapshot", "Empty", *[f"Tab {i}" for i in range(61)]]

    def __init__(self):
        self.calls = []

    def worksheets(self):
        return [SimpleNamespace(title=title) for title in self.titles]

    def values_batch_get(self, ranges, *, params):
        self.calls.append(ranges)
        assert params == {"majorDimension": "ROWS", "valueRenderOption": "FORMATTED_VALUE"}
        return {
            "valueRanges": [
                {"values": [["A", "", "A"], ["19", "11/4/2026"], [], ["21", "", "note"]]}
                if name == "'Owner''s snapshot'"
                else {}
                for name in ranges
            ]
        }


def test_batch_read_preserves_sheet_order_and_formatted_values():
    workbook = FakeWorkbook()
    result = read_sheet_frames(workbook)
    assert list(result) == workbook.titles
    assert [len(batch) for batch in workbook.calls] == [20, 20, 20, 3]
    assert workbook.calls[0][:2] == ["'Owner''s snapshot'", "'Empty'"]
    assert result["Empty"].empty
    frame = result["Owner's snapshot"]
    assert list(frame.columns) == ["A", "Column_2", "A_2"]
    assert frame.values.tolist() == [["19", "11/4/2026", ""], ["", "", ""], ["21", "", "note"]]


def test_incomplete_batch_is_not_silently_accepted():
    workbook = FakeWorkbook()
    workbook.values_batch_get = lambda *args, **kwargs: {}
    with pytest.raises(ValueError, match="incomplete batch"):
        read_sheet_frames(workbook)
