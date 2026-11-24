"""Evidence-only second pass over provider-separated XAGUSD candles."""
from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timedelta
from math import comb, sqrt
from statistics import median
from zoneinfo import ZoneInfo

from silver_temporal import (
    NY, WEEKDAY, Bar, auction, dist, estimate, extreme_index, path_metrics,
    price_range, probability, simulate, split,
)

LONDON, TOKYO = ZoneInfo("Europe/London"), ZoneInfo("Asia/Tokyo")
WINDOWS = (4, 8, 12, 26, 52)


def coherent_periods(bars, minutes, *, core=False):
    if 60 % minutes:
        raise ValueError("Resolution must divide an hour")
    delta = timedelta(minutes=minutes)
    slots = (14 if core else 23) * 60 // minutes
    grouped = defaultdict(list)
    for bar in bars:
        t = bar.start.astimezone(NY)
        if core and not 2 <= t.hour < 16:
            continue
        trade_date = t.date() + timedelta(days=not core and t.hour >= 18)
        grouped[trade_date].append(bar)
    days, weeks, short = [], defaultdict(list), 0
    missing_slots = missing_days = 0
    if not grouped:
        return [], [], {"sessions": 0, "weeks": 0}
    start, end = min(grouped), max(grouped)
    for idx in range((end - start).days + 1):
        dt = start + timedelta(days=idx)
        if dt.weekday() >= 5:
            continue
        group = grouped[dt]
        # Derive the time grid from the published NY 17:00 close, then validate each UTC bar.
        closed = bar_close_utc(dt, 16 if core else 17)
        begin = closed - slots * delta
        expected = {begin + j * delta for j in range(slots)}
        observed = {b.start for b in group}
        missing_slots += len(expected - observed)
        missing_days += not group
        if len(group) != slots or len(observed) != slots or observed != expected:
            short += bool(group)
            continue
        if any(a.start >= b.start for a, b in zip(group, group[1:])):
            raise ValueError("Provider bars are out of order")
        days.append((dt, group))
        weeks[dt - timedelta(days=dt.weekday())].append((dt, group))
    complete_weeks = [(d, [b for _, day in group for b in day]) for d, group in sorted(weeks.items())
                      if [day.weekday() for day, _ in group] == list(range(5))]
    return days, complete_weeks, {"sessions": len(days), "weeks": len(complete_weeks),
                                  "observedIncompleteWeekdays": short, "unobservedWeekdays": missing_days,
                                  "missingExpectedSlotsIncludingClosures": missing_slots,
                                  "latestCompleteSession": days[-1][0].isoformat() if days else None,
                                  "latestCompleteWeek": complete_weeks[-1][0].isoformat() if complete_weeks else None}


def bar_close_utc(dt, hour=17):
    from datetime import datetime, time, timezone
    return datetime.combine(dt, time(hour), NY).astimezone(timezone.utc)


def two_sided_fisher(a, b, c, d):
    n, k, m = a + b + c + d, a + c, a + b
    if not n or not m or m == n:
        return None
    norm = comb(n, m)
    weight = comb(k, a) * comb(n - k, m - a)
    return min(1., sum(comb(k, i) * comb(n - k, m - i)
                       for i in range(max(0, m - (n-k)), min(m, k) + 1)
                       if comb(k, i) * comb(n-k, m-i) <= weight) / norm)


def distribution(values, names):
    counts = Counter(values)
    return {name: probability(counts[name], len(values)) for name in names}


def weekly_extremes(weeks, minutes, *, core=False, through=None):
    rows, past = [], []
    stride = (14 if core else 23) * 60 // minutes
    for monday, bars in weeks:
        r = price_range(bars)
        net = bars[-1].close - bars[0].open
        efficiency = abs(net) / r if r else 0.
        band = "directional" if efficiency >= .55 else "rotational" if efficiency <= .25 else "mixed"
        scale = median(past[-26:]) if len(past) >= 13 else None
        vol = ("above prior median" if r > scale else "at or below prior median") if scale else "not measured"
        weekday = {key: WEEKDAY[extreme_index(bars, key) // stride] for key in ("high", "low")}
        rows.append((monday, weekday, "up" if net > 0 else "down" if net < 0 else "flat", band, vol))
        past.append(r)
    full, rolling, conditional, tests = {}, {}, {}, []
    for side in ("high", "low"):
        full[side] = distribution([x[1][side] for x in rows], WEEKDAY)
        rolling[side] = {}
        conditional[side] = {}
        for w in WINDOWS:
            anchor = through or (rows[-1][0] if rows else None)
            boundary = anchor - timedelta(weeks=w - 1) if anchor else None
            early = [x[1][side] for x in rows if x[0] < boundary]
            late = [x[1][side] for x in rows if x[0] >= boundary]
            counts = distribution(late, WEEKDAY)
            rolling[side][str(w)] = counts
            p = two_sided_fisher(late.count("Wed"), len(late)-late.count("Wed"),
                                 early.count("Wed"), len(early)-early.count("Wed"))
            tests.append({"side": side, "weeks": w, "wednesdayRecent": counts["Wed"],
                          "wednesdayDisjointPrior": probability(early.count("Wed"), len(early)), "p": p})
        for field, name in ((2, "completedDirection"), (3, "completedRangeEfficiency"), (4, "completedRangeMagnitude")):
            conditional[side][name] = {key: distribution([x[1][side] for x in rows if x[field] == key], WEEKDAY)
                                       for key in sorted({x[field] for x in rows})}
    # Predeclared family: Wednesday specifically, two extremes across five rolling windows.
    adjusted = 0
    usable = sorted((x for x in tests if x["p"] is not None), key=lambda x: x["p"])
    for i, x in enumerate(usable):
        adjusted = max(adjusted, min(1, x["p"] * (len(tests) - i)))
        x["holmP"] = round(adjusted, 5)
    return {"full": full, "rollingCalendarWeeks": rolling, "wednesdayTests": tests,
            "retrospectiveConditioning": conditional,
            "warning": "Completed-period cohorts are labels, not predictors. Small rolling counts are descriptive."}


def market_window(stamp):
    ldn, ny, tokyo = (stamp.astimezone(tz).hour for tz in (LONDON, NY, TOKYO))
    if 8 <= ldn < 17 and 8 <= ny < 17:
        return "London–New York overlap"
    if 8 <= ny < 17:
        return "New York only"
    if 8 <= ldn < 17:
        return "London only"
    if 9 <= tokyo < 17:
        return "Asia (Tokyo hours)"
    return "Other trading hours"


def daily_extremes(days, minutes, *, core=False):
    names = ("Asia (Tokyo hours)", "London only", "London–New York overlap", "New York only", "Other trading hours")
    hours = tuple(str(h).zfill(2) for h in (*range(18, 24), *range(17)))
    _, test = split(len(days))
    prefix_regimes = {}
    past = []
    anchor = (7 if core else 15) * 60 // minutes
    for date, bars in days:
        if len(past) >= 25:
            prefix = bars[:anchor]
            label, _ = estimate(hourly_path(prefix, minutes), median(past[-60:]))
            prefix_regimes[date] = (label, price_range(bars) - price_range(prefix))
        past.append(price_range(bars))
    result = {}
    for name, periods in (("full", days), ("latest60", days[-60:]), ("holdout", days[test:])):
        extreme = {}
        for side in ("high", "low"):
            stamps = [b[extreme_index(b, side)].start for _, b in periods]
            extreme[side] = {"hourET": distribution([f"{t.astimezone(NY).hour:02d}" for t in stamps], hours),
                             "marketWindows": distribution([market_window(t) for t in stamps], names)}
        contributions, remainder, winners = defaultdict(list), defaultdict(list), Counter()
        for _, bars in periods:
            h = l = bars[0].open
            added, time = Counter(), Counter()
            for b in bars:
                group = market_window(b.start)
                added[group] += max(0., b.high - h) + max(0., l - b.low)
                time[group] += minutes / 60
                h, l = max(h, b.high), min(l, b.low)
                if b.start.astimezone(NY).minute == (60-minutes) and b.start.astimezone(NY).hour in (2, 8, 11):
                    label = f"{(b.start.astimezone(NY).hour + 1):02d}:00 ET"
                    remainder[label].append(price_range(bars) - (h-l))
            if time and h > l:
                winners[max(time, key=lambda name: added[name] / time[name])] += 1
                for group in time:
                    contributions[group].append(added[group] / time[group])
        conditioned = defaultdict(list)
        for date, _ in periods:
            if date in prefix_regimes:
                label, value = prefix_regimes[date]
                conditioned[label].append(value)
        result[name] = {"extremes": extreme, "remainingRange": {k: dist(v) for k, v in remainder.items()},
                        "remainingAfter09ETByPrefixRegime": {k: dist(v) for k, v in conditioned.items()},
                        "expansionPerHour": {k: dist(v) for k, v in contributions.items()},
                        "dominantPerHour": {k: probability(winners[k], len(periods)) for k in names}}
    return result


def hourly_path(bars, minutes):
    """Compare classifications at a fixed frequency, not a resolution-dependent noise scale."""
    step = 60 // minutes
    if len(bars) % step:
        raise ValueError("The regime boundary must be aligned to a closed hour")
    out = []
    for offset in range(0, len(bars), step):
        g = bars[offset:offset+step]
        out.append(Bar(g[0].start, g[0].open, max(b.high for b in g), min(b.low for b in g), g[-1].close))
    return out


def retracement_trials(periods, minutes, *, week=False, anchor_hour=9, core=False):
    """Chronological validation; refit nothing on the holdout; no execution recommendations."""
    hours_per_session = 14 if core else 23
    stride = hours_per_session * 60 // minutes
    anchor = 2 * stride if week else ((anchor_hour - (2 if core else 18)) % 24) * 60 // minutes
    if (not week and not 0 < anchor < stride) or minutes not in (1, 5, 15, 60):
        raise ValueError("Unsupported hypothesis")
    k1, k2 = split(len(periods))
    histories, realized_paths = [], []
    cohorts = defaultdict(list)
    for i, (_, bars) in enumerate(periods):
        scale = median(histories[-60:]) if len(histories) >= 25 else 0.
        realized_scale = median(realized_paths[-60:]) if scale else 0.
        histories.append(price_range(bars))
        hourly = hourly_path(bars, minutes)
        # One-period realized dollar volatility, summed over within-session hourly
        # moves, not the lagged high–low range or an overnight gap proxy.
        realized_paths.append(sqrt(sum((b.close - (b.open if j % hours_per_session == 0
                                                    else hourly[j-1].close)) ** 2
                                       for j, b in enumerate(hourly))))
        if not scale:
            continue
        label, side = estimate(hourly_path(bars[:anchor], minutes), scale)
        if label == "unresolved":
            continue
        entry, suffix = bars[anchor].open, bars[anchor:]
        path = path_metrics(suffix, entry, side)
        # Define the evaluated subset at a common horizon/measurement grid,
        # independently of the cadence used to test a policy.
        outcome = path_metrics(hourly_path(suffix, minutes), entry, side)
        healthy = outcome["confirmedContinuation"] and side * (bars[-1].close - entry) >= .25 * scale
        prefix = bars[:anchor]
        structure = max(b.high for b in prefix)-min(b.low for b in prefix)
        cohorts[label].append((i, suffix, entry, side, scale, path, healthy, structure, realized_scale))
    result = {}
    for label, cohort in cohorts.items():
        train, validation, test = ([x for x in cohort if low <= x[0] < high]
                                   for low, high in ((0, k1), (k1, k2), (k2, len(periods))))
        learned = [x[5]["recoveredPullback"] for x in train if x[5]["recoveredPullback"] is not None]
        levels = dist(learned)
        output = {"trainN": len(train), "validationN": len(validation), "testN": len(test),
                  "healthyOutcome": probability(sum(x[6] for x in test), len(test)),
                  "pullback": dist([x[5]["recoveredPullback"] for x in test if x[5]["recoveredPullback"] is not None]),
                  "normalizedPullback": dist([x[5]["recoveredPullback"]/x[4] for x in test if x[5]["recoveredPullback"] is not None]),
                  "healthyPullback": dist([x[5]["recoveredPullback"] for x in test if x[6] and x[5]["recoveredPullback"] is not None]),
                  "otherPullback": dist([x[5]["recoveredPullback"] for x in test if not x[6] and x[5]["recoveredPullback"] is not None]),
                  "maxFavorable": dist([x[5]["mfe"] for x in test]), "maxAdverse": dist([x[5]["mae"] for x in test]),
                  "terminalGiveback": dist([x[5]["terminalPullback"] for x in test]),
                  "recoveryMinutes": dist([x[5]["recoveryHours"]*minutes for x in test if x[5]["recoveryHours"] is not None]),
                  "candidates": [], "promoted": False}
        if len(learned) >= 25:
            scales = {
                "fixed training p75": lambda x: levels["p75"],
                "lagged median range × .25": lambda x: x[4]*.25,
                "lagged median range × .50": lambda x: x[4]*.50,
                "lagged realized volatility × .50": lambda x: x[8]*.50,
                "observed structure range × .50": lambda x: x[7]*.50,
            }
            for name, distance in scales.items():
                for activate in (0., .25, .50):
                    for cost in (.01, .03):
                        scored = {}
                        for part, sample in (("validation", validation), ("holdout", test)):
                            runs = [(x, simulate(x[1], x[2], x[3], distance(x), activate*x[4], cost*x[4])) for x in sample]
                            active = [run for x, run in runs if x[6]]
                            other = [run for x, run in runs if not x[6]]
                            scored[part] = {
                                "n": len(runs),
                                "trendSurvival": probability(sum(not run["stopped"] for run in active), len(active)),
                                "prematureStop": probability(sum(run["stopped"] for run in active), len(active)),
                                "otherExit": probability(sum(run["stopped"] for run in other), len(other)),
                                "giveback": dist([run["giveback"] for _, run in runs]),
                                "retained": dist([run["netRetained"] for _, run in runs]),
                                "distance": dist([distance(x) for x, _ in runs]),
                            }
                        output["candidates"].append({"policy": name, "activationFraction": activate,
                                                     "costFraction": cost, **scored})
        result[label] = output
    return result


def event_paths(days, weeks, minutes, catalog):
    """Pre/post release path on exact aligned bars, with no forecast claim."""
    if not catalog or 30 % minutes:
        return None
    by_day, by_week = dict(days), dict(weeks)
    width = 30 // minutes
    out = {}
    for label, values in catalog["events"].items():
        measured, week_high, week_low = [], [], []
        omitted = 0
        for val in values:
            t = datetime.fromisoformat(val).replace(tzinfo=NY)
            dt = t.date()
            b = by_day.get(dt, [])
            ix = next((i for i, bar in enumerate(b) if bar.start == t), None)
            if ix is None or ix < width or ix+width > len(b):
                omitted += 1
                continue
            before, after = b[ix-width:ix], b[ix:ix+width]
            measured.append((price_range(before), price_range(after),
                             b[extreme_index(b,"high")].start >= t,
                             b[extreme_index(b,"low")].start >= t))
            week = by_week.get(dt - timedelta(days=dt.weekday()))
            if week:
                week_high.append(week[extreme_index(week,"high")].start >= t)
                week_low.append(week[extreme_index(week,"low")].start >= t)
        n = len(measured)
        out[label] = {"eventsWithCompleteSession": n, "unmatchedScheduleEntries": omitted,
                      "pre30Range": dist([x[0] for x in measured]), "post30Range": dist([x[1] for x in measured]),
                      "dailyHighAfter": probability(sum(x[2] for x in measured), n),
                      "dailyLowAfter": probability(sum(x[3] for x in measured), n),
                      "weeklyHighAfter": probability(sum(week_high), len(week_high)),
                      "weeklyLowAfter": probability(sum(week_low), len(week_low)),
                      "limitedSample": n < 25, "source": catalog["sources"][label]}
    return out


def lagged_analogs(days, minutes, *, core=False):
    """Match prior prefix regimes only; test suffix prediction against an unsliced baseline."""
    cut = (7 if core else 15) * 60 // minutes
    _, boundary = split(len(days))
    full, broader, errors, baseline_errors = [], defaultdict(list), [], []
    for i, (_, b) in enumerate(days):
        # Compare within one feed and use only lagged period data.
        if len(full) < 25:
            full.append((price_range(b), price_range(b) - price_range(b[:cut])))
            continue
        scale = median([row[0] for row in full[-60:]])
        actual = price_range(b)-price_range(b[:cut])
        label, _ = estimate(hourly_path(b[:cut], minutes), scale)
        analogs = broader[label][-60:]
        if i >= boundary and len(analogs) >= 25:
            errors.append(abs(actual - median(analogs)))
            baseline_errors.append(abs(actual - median([row[1] for row in full[-60:]])))
        broader[label].append(actual)
        full.append((price_range(b), actual))
    return {"pairedHoldoutN": len(errors), "analogAbsoluteError": dist(errors),
            "baselineAbsoluteError": dist(baseline_errors), "promoted": False}


def overlap(left, right, minutes):
    """Compare matched timestamps, never concatenate sources."""
    a, b = {x.start: x for x in left}, {x.start: x for x in right}
    both = sorted(a.keys() & b.keys())
    left_days, _, _ = coherent_periods(left, minutes)
    right_days, _, _ = coherent_periods(right, minutes)
    ld, rd = dict(left_days), dict(right_days)
    days = sorted(ld.keys() & rd.keys())
    def sign(v):
        return 1 if v > 0 else -1 if v < 0 else 0
    paired = [(x, y) for x, y in zip(both,both[1:]) if y-x == timedelta(minutes=minutes)]
    return {"pairedBars": len(both), "resolutionMinutes": minutes,
            "first": both[0].isoformat() if both else None, "last": both[-1].isoformat() if both else None,
            "absoluteCloseDifference": dist([abs(a[k].close-b[k].close) for k in both]),
            "changeSignAgreement": probability(sum(sign(a[y].close-a[x].close)==sign(b[y].close-b[x].close)
                                                   for x,y in paired), len(paired)),
            "pairedCompleteSessions": len(days),
            "absoluteDailyRangeDifference": dist([abs(price_range(ld[d])-price_range(rd[d])) for d in days])}


def archive_summary(bars, minutes, *, as_of, event_catalog=None, core=False):
    days, weeks, quality = coherent_periods(bars, minutes, core=core)
    if not weeks or not days:
        raise ValueError("No complete weeks for second-pass research")
    cutoff = bars[-1].start + timedelta(minutes=minutes)
    if cutoff > as_of:
        raise ValueError("Future source observations are not allowed")
    local = cutoff.astimezone(NY)
    through = local.date() - timedelta(days=local.weekday())
    if local.weekday() < 4 or (local.weekday() == 4 and local.hour < (16 if core else 17)):
        through -= timedelta(weeks=1)
    return {
        "resolutionMinutes": minutes, "bars": len(bars), "first": bars[0].start.isoformat(),
        "sessionScope": "02:00–16:00 ET core window" if core else "18:00–17:00 ET full research session",
        "sourceAsOf": cutoff.isoformat(), "quality": quality,
        "weeklyExtremes": weekly_extremes(weeks, minutes, core=core, through=through),
        "dailyExtremesAndWindows": daily_extremes(days, minutes, core=core),
        "range": {"daily": dist([price_range(b) for _, b in days]), "weekly": dist([price_range(b) for _, b in weeks])},
        "events": event_paths(days, weeks, minutes, event_catalog),
        "analogCandidate": lagged_analogs(days, minutes, core=core),
        "trailing": {"dailyNewYork": retracement_trials(days, minutes, core=core),
                     "dailyLondonProxy": retracement_trials(days, minutes, anchor_hour=3, core=core),
                     "weekly": retracement_trials(weeks, minutes, week=True, core=core)},
        "auctionArchive": (auction(hourly_path(days[-1][1], minutes), hourly_path(days[-2][1], minutes)) if len(days) >= 2
                           and days[-1][0] - days[-2][0] == timedelta(days=3 if days[-1][0].weekday() == 0 else 1)
                           else None),
        "mode": "historical_research", "currentEligible": False,
    }
