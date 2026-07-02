"""Market Calendar Watch intelligence for Harmonexus briefings.

This module is intentionally dependency-light. It uses static U.S. exchange
holiday rules and a small maintained FOMC fallback list where public calendar
packages are not available. The output is briefing context only; it does not
produce directional trade signals.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo


FOMC_DECISION_DATES = {
    date(2026, 1, 28),
    date(2026, 3, 18),
    date(2026, 4, 29),
    date(2026, 6, 17),
    date(2026, 7, 29),
    date(2026, 9, 16),
    date(2026, 10, 28),
    date(2026, 12, 9),
}


@dataclass(frozen=True)
class CalendarCondition:
    label: str
    date: date
    detail: str
    type: str


def get_market_calendar_watch(current_date: date | datetime | str | None = None, timezone: str = "America/New_York") -> dict[str, Any]:
    """Return Market Calendar Watch context for the week containing current_date."""

    today = _coerce_date(current_date, timezone)
    week_start = today - timedelta(days=today.weekday())
    weekdays = [week_start + timedelta(days=i) for i in range(5)]
    holidays = _holiday_conditions(today.year)
    holidays.update(_holiday_conditions((today + timedelta(days=370)).year))
    holidays.update(_holiday_conditions((today - timedelta(days=370)).year))

    closures = [holidays[d] for d in weekdays if d in holidays]
    early_closes = _early_close_conditions(weekdays, holidays)
    catalysts = _major_catalysts_for_week(weekdays, holidays)
    trading_sessions = max(0, 5 - len(closures))

    week_structure = _week_structure(trading_sessions, closures, early_closes)
    market_rhythm_risk = _market_rhythm_risk(trading_sessions, bool(closures), bool(early_closes), bool(catalysts))
    liquidity_score = _liquidity_score(trading_sessions, bool(closures), bool(early_closes), today, closures)
    operational = _operational_assessment(trading_sessions, closures, early_closes, catalysts)
    adjustment = _historical_auction_adjustment(trading_sessions, closures, early_closes, catalysts)
    confidence = "HIGH" if closures or early_closes or catalysts else "MODERATE"

    calendar_conditions = [
        f"{c.label}: {_format_day(c.date)} — {c.detail}" for c in closures + early_closes
    ]
    major_catalysts = [
        f"{c.label}: {_format_day(c.date)} — {c.detail}" for c in catalysts
    ]
    briefing_text = _briefing_text(
        week_structure,
        market_rhythm_risk,
        liquidity_score,
        calendar_conditions,
        major_catalysts,
        operational,
        adjustment,
        confidence,
    )

    return {
        "week_structure": week_structure,
        "market_rhythm_risk": market_rhythm_risk,
        "liquidity_score": liquidity_score,
        "calendar_conditions": calendar_conditions,
        "major_catalysts": major_catalysts,
        "operational_assessment": operational,
        "historical_auction_adjustment": adjustment,
        "operator_guidance": [
            "Treat this as an abnormal auction environment." if week_structure != "NORMAL_WEEK" else "Treat this as a standard auction week unless live participation changes.",
            "Avoid assuming standard weekly timing." if week_structure != "NORMAL_WEEK" else "Standard weekly timing assumptions remain usable but subordinate to live evidence.",
            "Give less weight to late-week moves after liquidity deterioration." if early_closes or closures else "Keep conviction tied to participation quality, not calendar routine.",
            "Use catalysts as participation/liquidity events, not directional predictions." if catalysts else "Do not infer direction from the calendar alone.",
        ],
        "confidence": confidence,
        "briefing_text": briefing_text,
    }


def _coerce_date(value: date | datetime | str | None, timezone: str) -> date:
    if value is None:
        return datetime.now(ZoneInfo(timezone)).date()
    if isinstance(value, datetime):
        return value.astimezone(ZoneInfo(timezone)).date() if value.tzinfo else value.date()
    if isinstance(value, date):
        return value
    return datetime.fromisoformat(str(value)).date()


def _holiday_conditions(year: int) -> dict[date, CalendarCondition]:
    holidays: dict[date, CalendarCondition] = {}

    def add(actual: date, label: str, detail: str) -> None:
        observed = _observed(actual)
        holidays[observed] = CalendarCondition(label, observed, detail if observed == actual else f"observed {detail}", "closure")

    add(date(year, 1, 1), "NYSE/Nasdaq Closed", "New Year's Day")
    add(_nth_weekday(year, 1, 0, 3), "NYSE/Nasdaq Closed", "Martin Luther King Jr. Day")
    add(_nth_weekday(year, 2, 0, 3), "NYSE/Nasdaq Closed", "Presidents Day")
    add(_easter(year) - timedelta(days=2), "NYSE/Nasdaq Closed", "Good Friday")
    add(_last_weekday(year, 5, 0), "NYSE/Nasdaq Closed", "Memorial Day")
    add(date(year, 6, 19), "NYSE/Nasdaq Closed", "Juneteenth")
    add(date(year, 7, 4), "NYSE/Nasdaq Closed", "Independence Day")
    add(_nth_weekday(year, 9, 0, 1), "NYSE/Nasdaq Closed", "Labor Day")
    add(_nth_weekday(year, 11, 3, 4), "NYSE/Nasdaq Closed", "Thanksgiving Day")
    add(date(year, 12, 25), "NYSE/Nasdaq Closed", "Christmas Day")
    return holidays


def _early_close_conditions(weekdays: list[date], holidays: dict[date, CalendarCondition]) -> list[CalendarCondition]:
    out: list[CalendarCondition] = []
    for day in weekdays:
        if day in holidays:
            continue
        if day.month == 11 and day.weekday() == 4 and (day - timedelta(days=1)) in holidays:
            out.append(CalendarCondition("NYSE/Nasdaq Early Close", day, "day after Thanksgiving", "early_close"))
        if day.month == 12 and day.day == 24 and day.weekday() < 5 and day not in holidays:
            out.append(CalendarCondition("NYSE/Nasdaq Early Close", day, "Christmas Eve liquidity decay", "early_close"))
        next_day = day + timedelta(days=1)
        if next_day in holidays and "Independence Day" in holidays[next_day].detail:
            out.append(CalendarCondition("Bond Market", day, "early close before observed Independence Day", "early_close"))
    return out


def _major_catalysts_for_week(weekdays: list[date], holidays: dict[date, CalendarCondition]) -> list[CalendarCondition]:
    out: list[CalendarCondition] = []
    seen_months = {(day.year, day.month) for day in weekdays}
    for year, month in seen_months:
        first = date(year, month, 1)
        first_friday = first + timedelta(days=(4 - first.weekday()) % 7)
        nfp_date = first_friday
        if nfp_date in holidays:
            nfp_date = nfp_date - timedelta(days=1)
        if nfp_date in weekdays and not any(c.date == nfp_date and "NFP" in c.detail for c in out):
            out.append(CalendarCondition("Major Catalyst", nfp_date, "NFP / Nonfarm Payrolls", "catalyst"))
    for day in weekdays:
        if day in FOMC_DECISION_DATES:
            out.append(CalendarCondition("Major Catalyst", day, "FOMC rate decision", "catalyst"))
    return out


def _week_structure(trading_sessions: int, closures: list[CalendarCondition], early_closes: list[CalendarCondition]) -> str:
    if trading_sessions <= 3:
        return "THREE_DAY_WEEK"
    if trading_sessions == 4:
        return "FOUR_DAY_WEEK"
    if early_closes:
        return "EARLY_CLOSE_WEEK"
    if closures:
        return "HOLIDAY_DISTORTED_WEEK"
    return "NORMAL_WEEK"


def _market_rhythm_risk(trading_sessions: int, has_closure: bool, has_early_close: bool, has_catalyst: bool) -> float:
    score = 2.2
    if has_catalyst:
        score = 5.2
    if trading_sessions == 4:
        score = 7.2
    if trading_sessions == 4 and has_catalyst:
        score = 8.7
    if trading_sessions <= 3:
        score = 9.2
    if has_early_close:
        score += 0.4
    if has_closure and has_early_close and has_catalyst:
        score += 0.3
    return round(min(score, 10.0), 1)


def _liquidity_score(trading_sessions: int, has_closure: bool, has_early_close: bool, today: date, closures: list[CalendarCondition]) -> float:
    score = 8.4
    if has_closure:
        score = 5.6
    if has_early_close:
        score = min(score, 4.8)
    if trading_sessions <= 3:
        score = 3.2
    if any(0 <= (c.date - today).days <= 1 for c in closures):
        score = min(score, 4.2)
    return round(max(score, 1.0), 1)


def _operational_assessment(trading_sessions: int, closures: list[CalendarCondition], early_closes: list[CalendarCondition], catalysts: list[CalendarCondition]) -> list[str]:
    if not closures and not early_closes and not catalysts:
        return ["Weekly auction rhythm is structurally normal.", "Calendar conditions are not reducing auction conviction by themselves."]
    assessment = []
    if trading_sessions < 5:
        assessment.append("Weekly auction likely compressed")
        assessment.append("Institutional positioning may occur earlier than normal")
    if early_closes or closures:
        assessment.append("Late-week liquidity may deteriorate")
        assessment.append("Price action may feel displaced from normal weekly rhythm")
    if catalysts:
        assessment.append("Liquidity sweeps are more probable around major release windows")
        assessment.append("Auction completion may be delayed into the catalyst")
    return assessment


def _historical_auction_adjustment(trading_sessions: int, closures: list[CalendarCondition], early_closes: list[CalendarCondition], catalysts: list[CalendarCondition]) -> dict[str, str]:
    normal = "LOW → MIDWEEK EXPANSION → FRIDAY FOLLOW-THROUGH"
    if trading_sessions <= 3:
        current = "LOW → COMPRESSED MIDWEEK AUCTION → HOLIDAY LIQUIDITY GAP"
    elif trading_sessions == 4 and catalysts:
        current = "LOW → TUESDAY/WEDNESDAY EXPANSION → CATALYST LIQUIDITY DECAY"
    elif trading_sessions == 4:
        current = "LOW → EARLY-WEEK POSITIONING → PRE-HOLIDAY LIQUIDITY DECAY"
    elif early_closes:
        current = "LOW → MIDWEEK EXPANSION → EARLY-CLOSE LIQUIDITY DECAY"
    else:
        current = normal
    return {"normal_week": normal, "current_week": current}


def _briefing_text(week_structure: str, risk: float, liquidity: float, conditions: list[str], catalysts: list[str], operational: list[str], adjustment: dict[str, str], confidence: str) -> str:
    lines = [
        "MARKET CALENDAR WATCH",
        "",
        f"Week Structure: {week_structure}",
        f"Market Rhythm Risk: {risk:.1f}/10",
        f"Liquidity Score: {liquidity:.1f}/10",
        "",
        "Key Calendar Conditions:",
    ]
    for item in conditions or ["No abnormal holiday or early-close condition detected."]:
        lines.append(f"• {item}")
    for item in catalysts:
        lines.append(f"• {item}")
    lines.extend(["", "Operational Assessment:"])
    lines.extend(f"• {item}" for item in operational)
    lines.extend([
        "",
        "Historical Auction Adjustment:",
        "Normal Week:",
        adjustment["normal_week"],
        "",
        "This Week:",
        adjustment["current_week"],
        "",
        "Operator Guidance:",
    ])
    guidance = [
        "Treat this as an abnormal auction environment." if week_structure != "NORMAL_WEEK" else "Treat this as a standard auction week unless live participation changes.",
        "Avoid assuming standard weekly timing." if week_structure != "NORMAL_WEEK" else "Standard weekly timing assumptions remain usable but subordinate to live evidence.",
        "Give less weight to late-week moves after liquidity deterioration." if week_structure != "NORMAL_WEEK" else "Do not infer direction from the calendar alone.",
        "Use catalysts as participation/liquidity events, not directional predictions.",
    ]
    lines.extend(f"• {item}" for item in guidance)
    lines.extend(["", f"Confidence: {confidence}"])
    return "\n".join(lines)


def _observed(day: date) -> date:
    if day.weekday() == 5:
        return day - timedelta(days=1)
    if day.weekday() == 6:
        return day + timedelta(days=1)
    return day


def _nth_weekday(year: int, month: int, weekday: int, nth: int) -> date:
    day = date(year, month, 1)
    day += timedelta(days=(weekday - day.weekday()) % 7)
    return day + timedelta(days=7 * (nth - 1))


def _last_weekday(year: int, month: int, weekday: int) -> date:
    if month == 12:
        day = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        day = date(year, month + 1, 1) - timedelta(days=1)
    return day - timedelta(days=(day.weekday() - weekday) % 7)


def _easter(year: int) -> date:
    a = year % 19
    b = year // 100
    c = year % 100
    d = b // 4
    e = b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i = c // 4
    k = c % 4
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    month = (h + l - 7 * m + 114) // 31
    day = ((h + l - 7 * m + 114) % 31) + 1
    return date(year, month, day)


def _format_day(day: date) -> str:
    return day.strftime("%A")
