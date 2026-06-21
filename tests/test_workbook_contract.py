from pathlib import Path

from tools.validate_workbook import validate


def test_bundled_workbook_preserves_legacy_contract():
    path = Path("data/Market_Machine_Dashboard_v4_7_BriefingEngine.xlsx")
    result = validate(path)
    assert result["legacy_compatible"]
    assert result["sheet_count"] >= 30
