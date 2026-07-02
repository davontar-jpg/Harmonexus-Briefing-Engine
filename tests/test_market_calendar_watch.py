from datetime import date

from market_calendar_watch import get_market_calendar_watch


def test_normal_week():
    watch = get_market_calendar_watch(date(2026, 6, 9))
    assert watch["week_structure"] == "NORMAL_WEEK"
    assert 1 <= watch["market_rhythm_risk"] <= 3
    assert watch["liquidity_score"] >= 7


def test_july_4_saturday_observed_friday_closure():
    watch = get_market_calendar_watch(date(2026, 7, 2))
    assert watch["week_structure"] == "FOUR_DAY_WEEK"
    assert any("observed Independence Day" in item for item in watch["calendar_conditions"])
    assert any("NFP" in item for item in watch["major_catalysts"])
    assert watch["market_rhythm_risk"] >= 8


def test_thanksgiving_week():
    watch = get_market_calendar_watch(date(2026, 11, 25))
    assert watch["week_structure"] == "FOUR_DAY_WEEK"
    assert any("Thanksgiving Day" in item for item in watch["calendar_conditions"])
    assert any("Early Close" in item for item in watch["calendar_conditions"])
    assert watch["liquidity_score"] <= 5


def test_christmas_observed_closure():
    watch = get_market_calendar_watch(date(2027, 12, 24))
    assert watch["week_structure"] == "FOUR_DAY_WEEK"
    assert any("observed Christmas Day" in item for item in watch["calendar_conditions"])


def test_fomc_week():
    watch = get_market_calendar_watch(date(2026, 7, 29))
    assert any("FOMC rate decision" in item for item in watch["major_catalysts"])
    assert 4 <= watch["market_rhythm_risk"] <= 6


def test_nfp_week():
    watch = get_market_calendar_watch(date(2026, 8, 7))
    assert any("NFP" in item for item in watch["major_catalysts"])
    assert 4 <= watch["market_rhythm_risk"] <= 6


def test_four_day_week_plus_nfp():
    watch = get_market_calendar_watch(date(2026, 7, 2))
    assert watch["week_structure"] == "FOUR_DAY_WEEK"
    assert any("NFP" in item for item in watch["major_catalysts"])
    assert watch["market_rhythm_risk"] >= 8


def test_early_close_day():
    watch = get_market_calendar_watch(date(2026, 11, 27))
    assert any("Early Close" in item for item in watch["calendar_conditions"])
    assert "MARKET CALENDAR WATCH" in watch["briefing_text"]
