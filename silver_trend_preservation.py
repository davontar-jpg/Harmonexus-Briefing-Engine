"""Research only: closed historical XAGUSD paths, never a live stop or score."""
from bisect import bisect_left, bisect_right
from collections import Counter, defaultdict
from datetime import date, timedelta
from math import sqrt
from random import Random
from statistics import median, quantiles

from silver_intraday import hourly_path
from silver_temporal import NY, dist, estimate, price_range, simulate

VERSION = "xagusd-trend-preservation.1"
HORIZONS = (
    ("weekly", "Weekly", 4, 1),
    ("rolling_weekly", "Rolling weekly", 5, 2),
    ("daily", "Daily", 1, None),
    ("multi_day", "Multi-day", 3, 2),
    ("monthly", "Monthly", 20, 2),
)
FIT_END, DEVELOPMENT_END = date(2023, 1, 1), date(2024, 1, 1)
OUTCOMES = ("healthy", "consolidation", "failure", "reversal")
MIN_REFERENCE = 25
ONE_DAY = timedelta(days=1)


def trading_days(day, count):
    days = []
    while len(days) < count:
        if day.weekday() < 5:
            days.append(day)
        day += ONE_DAY
    return days


def path_outcome(bars, entry, side, unit):
    peak, peak_at, trough, trough_at = 0., bars[0].start, 0., bars[0].start
    recovered, drawdown, durations, recovery = 0., 0., [], []
    mfe, mae = 0., 0.
    for b in bars:
        favorable, adverse = (b.high, b.low) if side == 1 else (b.low, b.high)
        mfe, mae = max(mfe, side*(favorable-entry)), max(mae, -side*(adverse-entry))
        value = side*(b.close-entry)
        drawdown = max(drawdown, peak-value)
        if value > peak:
            if trough < peak:
                recovered = max(recovered, peak-trough)
                durations.append((trough_at-peak_at).total_seconds()/60)
                recovery.append((b.start-trough_at).total_seconds()/60)
            peak, peak_at, trough, trough_at = value, b.start, value, b.start
        elif value < trough:
            trough, trough_at = value, b.start
    # Only the retrospective outcome uses the suffix. The prefix sets the side.
    if value >= .25*unit and peak > 0 and value >= .40*peak:
        state = "healthy"
    elif value <= -.25*unit and peak >= .25*unit:
        state = "reversal"
    elif abs(value) < .25*unit and peak < .50*unit:
        state = "consolidation"
    else:
        state = "failure"
    return dict(state=state, recovered=recovered, drawdown=drawdown, mfe=mfe, mae=mae,
                expansion=peak, pullbackMinutes=max(durations, default=None),
                recoveryMinutes=max(recovery, default=None))


def windows(days, horizon, minutes, *, anchor_override=None, anatomy=False):
    key, _, count, weekday = horizon
    lookup = dict(days)
    offsets = {d: i for i, (d, _) in enumerate(days)}
    ranges = [price_range(bars) for _, bars in days]
    for day, session in days:
        if weekday is not None and day.weekday() != weekday:
            continue
        if key == "monthly" and (day-date(2015, 1, 7)).days % 28:
            continue
        dates = trading_days(day, count)
        # Calendar-week windows require Monday to have been observed, even
        # though the Tuesday entry did not yet exist at its open.
        if any(d not in lookup for d in dates) or key == "weekly" and day-ONE_DAY not in lookup:
            continue
        index = offsets[day]
        if index < 25:
            continue
        lag = median(ranges[max(0, index-60):index])
        vol = median([abs(bars[-1].close-bars[0].open) for _, bars in days[max(0, index-60):index]])
        cut = next((i for i, b in enumerate(session) if b.start.astimezone(NY).hour == (anchor_override or 9)), None)
        if not cut or lag <= 0:
            continue
        prefix = session[:cut]
        entry = session[cut].open
        if anatomy:
            # Outcome-defined direction is used ONLY for descriptive anatomy.
            finish = lookup[dates[-1]][-1].close
            if finish == entry:
                continue
            side = 1 if finish > entry else -1
        else:
            label, side = estimate(hourly_path(prefix, minutes), lag)
            if label not in ("bullish trend", "bearish trend"):
                continue
        later = session[cut:] + [b for d in dates[1:] for b in lookup[d]]
        structure = price_range(prefix)
        tags = []
        if day.weekday() in (0, 1):
            tags.append("Early-week NY prefix")
        if index and dates[0]-days[index-1][0] <= timedelta(days=3):
            prior = days[index-1][1]
            prior_edge = max(b.high for b in prior) if side == 1 else min(b.low for b in prior)
            if all(side*(b.close-prior_edge) > 0 for b in prefix[-2:]):
                tags.append("Two closes beyond prior session")
        prior_week = [b for d in trading_days(day-timedelta(days=day.weekday()), day.weekday()) if d in lookup for b in lookup[d]]
        if prior_week:
            edge = max(b.high for b in prior_week) if side == 1 else min(b.low for b in prior_week)
            opposite_edge = min(b.low for b in prior_week) if side == 1 else max(b.high for b in prior_week)
            if all(side*(b.close-edge) > 0 for b in prefix[-2:]):
                tags.append("Two closes beyond developing week")
            if any(side*((b.low if side == 1 else b.high)-opposite_edge) <= 0 for b in prefix) and all(
                side*(b.close-opposite_edge) > 0 for b in prefix[-2:]
            ):
                tags.append("Reclaim after touching observed weekly extreme")
        yield dict(day=day, end=dates[-1], side=side, bars=later, entry=entry, lag=lag, vol=vol, structure=structure,
                   tags=tags, **path_outcome(later, entry, side, lag*sqrt(count)))


def bounded_p75(rows):
    """Resample whole calendar-year blocks; interval is sensitivity, not a forecast."""
    by_year = defaultdict(list)
    for row in rows:
        by_year[row["day"].year].append(row["recovered"])
    if len(by_year) < 4 or len(rows) < MIN_REFERENCE:
        return None
    blocks = list(by_year.values())
    rng = Random(35028)
    draws = [dist([v for block in rng.choices(blocks, k=len(blocks)) for v in block])["p75"] for _ in range(300)]
    return [round(x, 5) for x in (quantiles(draws, n=40, method="inclusive")[0],
                                  quantiles(draws, n=40, method="inclusive")[-1])]


def measure(rows):
    recovered = [x for x in rows if x["state"] == "healthy" and x["recovered"] > 0]
    d = dist([x["recovered"] for x in recovered])
    return dict(outcomes={k: sum(x["state"] == k for x in rows) for k in OUTCOMES}, recovered=d,
                p75YearBlock95=bounded_p75(recovered),
                normalized=dist([x["recovered"]/x["lag"] for x in recovered]),
                fractionOfExpansion=dist([x["recovered"]/x["expansion"] for x in recovered]),
                pullbackMinutes=dist([x["pullbackMinutes"] for x in recovered]),
                recoveryMinutes=dist([x["recoveryMinutes"] for x in recovered]),
                mfe=dist([x["mfe"] for x in rows]), mae=dist([x["mae"] for x in rows]),
                outcomesDrawdown={k:dist([x["drawdown"] for x in rows if x["state"] == k]) for k in OUTCOMES})


def fraction(numerator, denominator):
    return {"hits": numerator, "n": denominator, "rate": round(numerator/denominator, 4) if denominator else None}


def evaluate(rows, width, activate, cost):
    runs = [(x, simulate(x["bars"], x["entry"], x["side"], width(x), activate(x), cost*x["lag"]))
            for x in rows if width(x) > 0]
    def rates(states, stopped):
        candidates = [r for x, r in runs if x["state"] in states]
        return fraction(sum(r["stopped"] == stopped for r in candidates), len(candidates))
    return dict(n=len(runs), survival=rates(["healthy"], False), premature=rates(["healthy"], True),
                deteriorationExit=rates(["failure", "reversal"], True), consolidationExit=rates(["consolidation"], True),
                retained=dist([r["netRetained"] for _, r in runs]), giveback=dist([r["giveback"] for _, r in runs]),
                candidateDistance=dist([width(x) for x, _ in runs]))


def frontier(fit, sample):
    learned = dist([r["recovered"] for r in fit if r["state"] == "healthy" and r["recovered"] > 0])
    widths = {
        "Lagged day range × 0.50": lambda x: .50*x["lag"],
        "Lagged day range × 1.00": lambda x: x["lag"],
        "Lagged day range × 1.50": lambda x: 1.50*x["lag"],
        "Lagged absolute daily move × 1.00": lambda x: x["vol"],
        "Observed prefix range × 1.00": lambda x: x["structure"],
    }
    if learned["n"] >= MIN_REFERENCE:
        widths["Fit healthy p75 USD/oz"] = lambda _: learned["p75"]
    activate = {
        "Immediate": lambda _: 0.,
        "After 0.50 lagged day range": lambda x: .50*x["lag"],
        "After favorable expansion by prefix width": lambda x: x["structure"],
    }
    # All entries already require a confirmed prefix; no pre-confirmation fill is simulated.
    return [dict(policy=name, activation=label, costFraction=cost, **evaluate(sample,width,activation,cost))
            for name,width in widths.items() for label,activation in activate.items() for cost in (.01,.03)]


def distinction(rows):
    good = [x["drawdown"] for x in rows if x["state"] == "healthy"]
    bad = sorted(x["drawdown"] for x in rows if x["state"] in ("failure", "reversal"))
    auc = (sum(len(bad)-(bisect_left(bad, x)+bisect_right(bad, x))/2 for x in good)/(len(good)*len(bad))
           if good and bad else None)
    return {"healthyN":len(good), "deterioratingN":len(bad), "largerDrawdownAUC":round(auc, 3) if auc is not None else None}


def study(days, minutes, *, recent=False):
    horizon_rows = {}
    for horizon in HORIZONS:
        key, label, count, _ = horizon
        groups = list(windows(days, horizon, minutes))
        anatomy = list(windows(days, horizon, minutes, anatomy=True))
        directions = {}
        for direction, side in (("Bullish", 1), ("Bearish", -1)):
            rows = [x for x in groups if x["side"] == side]
            summary = measure(rows)
            reference = summary["recovered"].get("p75") if summary["p75YearBlock95"] else None
            summary["reference"] = reference
            summary["withinReference"] = (fraction(sum(x["state"] == "healthy" and 0 < x["recovered"] <= reference for x in rows),
                                                    summary["recovered"]["n"]) if reference is not None else None)
            summary["conditions"] = dict(Counter(tag for x in rows for tag in x["tags"]))
            summary["discrimination"] = distinction(rows)
            # This cohort can never enter a simulator, out-of-sample score or live regime.
            retrospective = measure([x for x in anatomy if x["side"] == side])
            retrospective["reference"] = retrospective["recovered"].get("p75") if retrospective["p75YearBlock95"] else None
            summary["retrospective"] = retrospective
            if not recent:
                # Purge any holding window that crosses the chronological boundaries.
                fit = [x for x in rows if x["end"] < FIT_END]
                validation = [x for x in rows if x["day"] >= FIT_END and x["end"] < DEVELOPMENT_END]
                test = [x for x in rows if x["day"] >= DEVELOPMENT_END]
                comparison = lambda sample: evaluate(sample, lambda x:x["lag"], lambda x:.50*x["lag"], .01)
                summary["replay"] = {"fitN": len(fit), "validationN": len(validation), "replayN":len(test),
                                     "comparator":comparison(test), "validationComparator":comparison(validation),
                                     "validation":frontier(fit, validation), "previouslyExaminedReplay":frontier(fit,test)}
                p75 = dist([x["recovered"] for x in fit if x["state"] == "healthy" and x["recovered"] > 0])
                threshold = p75.get("p75") if p75["n"] >= MIN_REFERENCE else None
                if threshold is not None:
                    for name, sample in (("validationCoverage", validation), ("replayCoverage", test)):
                        depths = [x["recovered"] for x in sample if x["state"] == "healthy" and x["recovered"] > 0]
                        summary["replay"][name] = fraction(sum(v <= threshold for v in depths),len(depths))
                    summary["replay"]["fixedFitThreshold"] = threshold
            directions[direction] = summary
        horizon_rows[key] = {"label":label,"maxSessions":count,"directions":directions}
    # Separate sensitivity cohorts, not pooled; use fixed Wednesday rolling
    # reference above so the Monday–Thursday panels do not inflate its n.
    sensitivity = {}
    if not recent:
        for weekday, anchor in [(0,9),(1,9),(2,9),(3,9),(2,3)]:
            rows = list(windows(days,("timing","Timing",5,weekday),minutes,anchor_override=anchor))
            sensitivity[f"{('Mon','Tue','Wed','Thu')[weekday]} {anchor:02}:00 ET"] = {
                bias: {"outcomes":dict(Counter(x["state"] for x in rows if x["side"] == side)),
                       "recovered":dist([x["recovered"] for x in rows if x["side"] == side and x["state"] == "healthy" and x["recovered"] > 0])}
                for bias,side in (("Bullish",1),("Bearish",-1))
            }
    return dict(horizons=horizon_rows,timing=sensitivity)
