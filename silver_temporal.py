"""Offline, non-authoritative research on FX:XAGUSD hourly spot bars."""
from __future__ import annotations

import csv
import hashlib
import math
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from statistics import mean, median, quantiles
from zoneinfo import ZoneInfo

UTC = timezone.utc
NY = ZoneInfo("America/New_York")
HOUR = timedelta(hours=1)
VERSION = "fx-xagusd-h1-temporal.1"
WEEKDAY = ("Mon", "Tue", "Wed", "Thu", "Fri")
SESSION_HOURS = tuple(range(18, 24)) + tuple(range(17))
WINDOWS = {"Overnight 18–03 ET": (0, 9), "London proxy 03–09 ET": (9, 15),
           "New York morning 09–12 ET": (15, 18), "US afternoon 12–17 ET": (18, 23)}
MIN_SAMPLE = 25


@dataclass(frozen=True)
class Bar:
    start: datetime
    open: float
    high: float
    low: float
    close: float


def load_hourly(path: Path, as_of: datetime) -> tuple[list[Bar], dict]:
    """Only ingest closed H1 bars; never infer higher resolution from this export."""
    if as_of.utcoffset() is None:
        raise ValueError("As-of must include an offset")
    by_start = {}
    dup = 0
    excluded = 0
    with path.open(encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)
        if not {"time", "open", "high", "low", "close"} <= set(reader.fieldnames or []):
            raise ValueError("Expected TradingView time/open/high/low/close headers")
        for row in reader:
            stamp = datetime.fromtimestamp(int(row["time"]), UTC)
            if stamp + HOUR > as_of:
                excluded += 1
                continue
            o, h, l, c = (float(row[k]) for k in ("open", "high", "low", "close"))
            if stamp.minute or stamp.second or not all(math.isfinite(v) and v > 0 for v in (o, h, l, c)):
                raise ValueError("Invalid hourly timestamp or non-positive/non-finite OHLC")
            if l > min(o, c) or h < max(o, c):
                raise ValueError("Inconsistent OHLC")
            bar = Bar(stamp, o, h, l, c)
            if stamp in by_start:
                if by_start[stamp] != bar:
                    raise ValueError("Conflicting candles at the same timestamp")
                dup += 1
            else:
                by_start[stamp] = bar
    bars = sorted(by_start.values(), key=lambda x: x.start)
    if not bars:
        raise ValueError("No closed candles")
    return bars, {"bars": len(bars), "exactDuplicates": dup, "notYetClosed": excluded,
                  "begin": bars[0].start.isoformat(), "sourceAsOf": (bars[-1].start + HOUR).isoformat(),
                  "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}


def periods(bars: list[Bar]) -> tuple[list[tuple], list[tuple], dict]:
    """Conservative full-session cohort: no gaps, shortened days or four-day weeks."""
    groups = defaultdict(list)
    for bar in bars:
        local = bar.start.astimezone(NY)
        date = local.date() + timedelta(days=local.hour >= 18)
        groups[date].append(bar)
    days, by_week = [], defaultdict(list)
    for date, group in sorted(groups.items()):
        local = [x.start.astimezone(NY) for x in group]
        if (date.weekday() >= 5 or tuple(x.hour for x in local) != SESSION_HOURS
                or any(y.start - x.start != HOUR for x, y in zip(group, group[1:]))):
            continue
        days.append((date, group))
        by_week[date - timedelta(days=date.weekday())].append((date, group))
    weeks = [(date, [b for _, day in rows for b in day]) for date, rows in sorted(by_week.items())
             if [d.weekday() for d, _ in rows] == list(range(5))]
    return days, weeks, {"completeSessions": len(days), "excludedObservedSessions": len(groups) - len(days),
                         "completeWeeks": len(weeks), "excludedObservedWeeks": len(by_week) - len(weeks)}


def dist(values: list[float]) -> dict:
    if not values:
        return {"n": 0}
    q = quantiles(values, n=100, method="inclusive") if len(values) > 1 else [values[0]] * 99
    return {"n": len(values), **{f"p{k}": round(q[k - 1], 5) for k in (25, 50, 75, 80, 90, 95)
                               if k != 95 or len(values) >= 100}}


def probability(hits: int, n: int) -> dict:
    if not n:
        return {"n": 0, "hits": 0, "frequency": None, "wilson95": None}
    rate, z = hits / n, 1.96
    center = (rate + z * z / (2 * n)) / (1 + z * z / n)
    margin = z * math.sqrt(rate * (1 - rate) / n + z * z / (4 * n * n)) / (1 + z * z / n)
    return {"n": n, "hits": hits, "frequency": round(rate, 5),
            "wilson95": [round(max(0, center - margin), 5), round(min(1, center + margin), 5)]}


def price_range(bars: list[Bar]) -> float:
    return max(b.high for b in bars) - min(b.low for b in bars)


def extreme_index(bars: list[Bar], side: str) -> int:
    # First observation wins ties. This also defines "already formed".
    return (max if side == "high" else min)(range(len(bars)), key=lambda i: getattr(bars[i], side))


def split(n: int) -> tuple[int, int]:
    return n * 3 // 5, n * 4 // 5


def temporal(rows: list[tuple], *, week: bool) -> dict:
    labels = WEEKDAY if week else tuple(f"{h:02d}:00 ET" for h in SESSION_HOURS)
    stride = 23 if week else 1
    result = {}
    cuts = (23, 46, 69, 92) if week else (15, 18)
    lists = [b for _, b in rows]
    train_end, test_start = split(len(rows))
    for side in ("high", "low"):
        ix = [extreme_index(b, side) for b in lists]
        count = Counter(j // stride for j in ix)
        recent = Counter(j // stride for j in ix[-(52 if week else 120):])
        detail = []
        for cut in cuts:
            remaining = [j // stride for j in ix if j >= cut]
            # Condition only on the observed prefix range. Fixed bins are learned
            # on training history; validation and untouched holdout are scored separately.
            prefix = [price_range(b[:cut]) for b in lists]
            threshold = median(prefix[:train_end]) if train_end else None
            historic = [i for i in range(train_end)]
            base = (1 + sum(ix[i] < cut for i in historic)) / (2 + train_end)
            fitted = {}
            for bucket in (False, True):
                indices = [i for i in historic if (prefix[i] >= threshold) == bucket] if threshold is not None else []
                fitted[bucket] = ((1 + sum(ix[i] < cut for i in indices)) / (2 + len(indices))
                                  if len(indices) >= MIN_SAMPLE else base)
            def brier(start, end):
                if start >= end or threshold is None:
                    return None
                obs = [float(ix[i] < cut) for i in range(start, end)]
                return {"n": len(obs), "weekdayOrClockBaseline": round(mean((x - base)**2 for x in obs), 5),
                        "prefixRangeCandidate": round(mean((y - fitted[prefix[i] >= threshold])**2
                                                         for i, y in zip(range(start, end), obs)), 5)}
            detail.append({"completedSlots": cut, "alreadyFormed": probability(len(ix) - len(remaining), len(ix)),
                           "remaining": {label: probability(remaining.count(j), len(remaining))
                                         for j, label in enumerate(labels) if j * stride >= cut},
                           "validation": brier(train_end, test_start), "test": brier(test_start, len(ix))})
        result[side] = {"full": {x: probability(count[i], len(ix)) for i, x in enumerate(labels)},
                        "recent": {x: probability(recent[i], sum(recent.values())) for i, x in enumerate(labels)},
                        "checkpoints": detail}
    return result


def ranges(rows: list[tuple], *, week: bool) -> dict:
    data = [x[1] for x in rows]
    full = [price_range(b) for b in data]
    checkpoints = (23, 46, 69, 92) if week else (15, 18)
    _, test_start = split(len(rows))
    # Fixed rolling-origin benchmark; the target never enters its own forecast.
    errors = {"medianRange": [], "meanRange": []}
    evaluated = []
    for i in range(max(test_start, MIN_SAMPLE), len(full)):
        history = full[max(0, i - 60):i]
        benchmark = median(history)
        errors["medianRange"].append(abs(full[i] - benchmark))
        errors["meanRange"].append(abs(full[i] - mean(history)))
        evaluated.append((data[i], benchmark))
    latest = None
    if len(full) > MIN_SAMPLE:
        prior = full[max(0, len(full) - 61):-1]
        baseline = median(prior)
        percentile = sum(r <= full[-1] for r in prior) / len(prior)
        label = ("Underdeveloped" if percentile < .2 else "Developing" if percentile < .4 else
                 "Normal" if percentile < .8 else "Extended" if percentile < .95 else "Exceptional")
        latest = {"period": rows[-1][0].isoformat(), "actual": round(full[-1], 5),
                  "expectedMedian": round(baseline, 5), "expectedN": len(prior),
                  "percentOfMedian": round(100 * full[-1] / baseline, 2) if baseline else None,
                  "priorPercentile": round(100 * percentile, 1), "state": label}
    return {"full": dist(full), "archiveLastCompletePeriod": latest,
            "holdoutMAE": {k: round(mean(v), 5) if v else None for k, v in errors.items()},
            "holdoutN": len(evaluated),
            "checkpoints": [{"completedSlots": cut,
                             "remainingExpansion": dist([price_range(b) - price_range(b[:cut]) for b in data]),
                             "abovePriorMedianOnHoldout": probability(sum(price_range(b) > m for b, m in evaluated), len(evaluated)),
                             "furtherExpansionAboveQuarterMedianOnHoldout":
                                 probability(sum(price_range(b) - price_range(b[:cut]) > .25 * m
                                                 for b, m in evaluated), len(evaluated))}
                            for cut in checkpoints]}


def window_expansion(days: list[tuple]) -> dict:
    counts = Counter()
    test_counts = Counter()
    shares = defaultdict(list)
    _, test_start = split(len(days))
    for i, (_, bars) in enumerate(days):
        total = price_range(bars)
        # Incremental range contribution, not sum of overlapping session ranges.
        increments = {name: price_range(bars[:stop]) - (price_range(bars[:start]) if start else 0)
                      for name, (start, stop) in WINDOWS.items()}
        for name, inc in increments.items():
            if total:
                shares[name].append(inc / total)
        winner = max(increments, key=increments.get)
        counts[winner] += 1
        if i >= test_start:
            test_counts[winner] += 1
    return {name: {"dominantShare": probability(counts[name], len(days)), "rangeShare": dist(shares[name]),
                   "holdoutDominantShare": probability(test_counts[name], len(days) - test_start)}
            for name in WINDOWS}


def estimate(bars: list[Bar], scale: float) -> tuple[str, int]:
    closes = [bars[0].open] + [b.close for b in bars]
    net = closes[-1] - closes[0]
    distance = sum(abs(y - x) for x, y in zip(closes, closes[1:]))
    eff = abs(net) / distance if distance else 0
    side = 1 if net > 0 else -1
    if scale > 0 and abs(net) >= .30 * scale and eff >= .40:
        return ("bullish trend" if side == 1 else "bearish trend"), side
    if eff <= .25:
        return "consolidation", side
    return "unresolved", side


def simulate(bars: list[Bar], entry: float, side: int, distance: float, activation: float, costs: float) -> dict:
    """Conservative OHLC sequencing; trail ratchets only after a candle closes."""
    peak = 0.
    activated = activation == 0
    for bar in bars:
        opening = side * (bar.open - entry)
        adverse = side * ((bar.low if side == 1 else bar.high) - entry)
        favorable = side * ((bar.high if side == 1 else bar.low) - entry)
        if activated and adverse <= peak - distance:
            fill = min(opening, peak - distance) - costs
            return {"stopped": True, "netRetained": fill, "giveback": peak - fill}
        peak = max(peak, favorable)
        activated = activated or peak >= activation
    retained = side * (bars[-1].close - entry) - costs
    return {"stopped": False, "netRetained": retained, "giveback": peak - retained}


def path_metrics(bars: list[Bar], entry: float, side: int) -> dict:
    # Close-to-close pullbacks avoid guessing the order of intrabar extremes.
    closes = [0.] + [side * (b.close - entry) for b in bars]
    peak = 0.
    active = []
    recovered = []
    durations = []
    for value in closes[1:]:
        if value > peak:
            if active:
                recovered.append(max(active))
                durations.append(len(active))
            peak, active = value, []
        else:
            active.append(peak - value)
    return {
        "mfe": max(0., max(side * ((b.high if side == 1 else b.low) - entry) for b in bars)),
        "mae": max(0., max(-side * ((b.low if side == 1 else b.high) - entry) for b in bars)),
        "recoveredPullback": max(recovered) if recovered else None,
        "pullbackBeforeLastNewExtreme": recovered[-1] if recovered else None,
        "recoveryHours": durations[-1] if durations else None,
        "recoveryCount": len(recovered),
        "terminalPullback": max(active) if active else 0.,
        "confirmedContinuation": recovered != [] and closes[-1] > 0,
    }


def trailing(rows: list[tuple], *, week: bool) -> dict:
    cut = 46 if week else 15
    k1, k2 = split(len(rows))
    cohorts = defaultdict(list)
    last_ranges = []
    for i, (date, b) in enumerate(rows):
        past = last_ranges[-60:]
        last_ranges.append(price_range(b))
        if len(past) < MIN_SAMPLE:
            continue
        scale = median(past)
        if not scale:
            continue
        label, side = estimate(b[:cut], scale)
        if label == "unresolved":
            continue
        entry = b[cut].open  # next bar open, never used by the prefix classifier
        path = path_metrics(b[cut:], entry, side)
        # Finite continuation must still close at least 25% of prior median ahead.
        healthy = path["confirmedContinuation"] and side * (b[-1].close - entry) >= .25 * scale
        cohorts[label].append((i, date, scale, b[cut:], entry, side, path, healthy))
    result = {}
    for label, cohort in cohorts.items():
        testing = [x for x in cohort if x[0] >= k2]
        fitting = [x for x in cohort if x[0] < k1]
        valid = [x for x in cohort if k1 <= x[0] < k2]
        drawdowns = [x[6]["recoveredPullback"] / x[2] for x in fitting if x[6]["recoveredPullback"] is not None]
        fitted = dist(drawdowns)
        bands = []
        if len(drawdowns) >= MIN_SAMPLE:
            for band, q in (("tight", "p50"), ("balanced", "p75"), ("expansive", "p90")):
                ratio = fitted[q]
                if ratio <= 0:
                    continue
                for activation in (0., .25, .50):
                    for cost in (.01, .025):
                        def stats(sample):
                            run = [(x, simulate(x[3], x[4], x[5], ratio*x[2], activation*x[2], cost*x[2]))
                                   for x in sample]
                            trend = [status for x, status in run if x[7]]
                            other = [status for x, status in run if not x[7]]
                            return {"n": len(run), "healthySurvival": probability(sum(not m["stopped"] for m in trend), len(trend)),
                                    "prematureStop": probability(sum(m["stopped"] for m in trend), len(trend)),
                                    "otherExit": probability(sum(m["stopped"] for m in other), len(other)),
                                    "giveback": dist([m["giveback"] for _, m in run]),
                                    "netRetained": dist([m["netRetained"] for _, m in run]),
                                    "medianDistance": round(median([x[2]*ratio for x, _ in run]), 5) if run else None}
                        bands.append({"band": band, "distanceInPriorMedianRanges": ratio,
                                      "activationInPriorMedianRanges": activation,
                                      "stressCostInPriorMedianRanges": cost,
                                      "validation": stats(valid), "test": stats(testing)})
        result[label] = {"trainN": len(fitting), "validationN": len(valid), "testN": len(testing),
                         "holdoutHealthyContinuation": probability(sum(x[7] for x in testing), len(testing)),
                         "holdoutRecoveredPullback": dist([x[6]["recoveredPullback"] for x in testing
                                                          if x[6]["recoveredPullback"] is not None]),
                         "holdoutTerminalPullback": dist([x[6]["terminalPullback"] for x in testing]),
                         "holdoutPullbackBeforeLastNewExtreme": dist([
                             x[6]["pullbackBeforeLastNewExtreme"] for x in testing
                             if x[6]["pullbackBeforeLastNewExtreme"] is not None]),
                         "holdoutRecoveryBars": dist([x[6]["recoveryHours"] for x in testing
                                                      if x[6]["recoveryHours"] is not None]),
                         "holdoutMFE": dist([x[6]["mfe"] for x in testing]),
                         "holdoutMAE": dist([x[6]["mae"] for x in testing]), "frontier": bands,
                         "validationStatus": "research_only",
                         "reason": "No venue spread or fine-bar sequence validation; no reference promoted."}
    return result


def auction(day: list[Bar], prior: list[Bar]) -> dict:
    """Range boundary evidence only; not depth, order flow, or a trade instruction."""
    high, low = max(b.high for b in prior), min(b.low for b in prior)
    if len(day) < 2:
        state = "unresolved"
    elif min(b.close for b in day[-2:]) > high:
        state = "two closes above prior session high"
    elif max(b.close for b in day[-2:]) < low:
        state = "two closes below prior session low"
    else:
        state = "not confirmed outside prior session range"
    return {"priorHigh": high, "priorLow": low, "priceBasedState": state,
            "confirmation": "Two closed hourly bars beyond the relevant prior session boundary.",
            "challenge": "A closed hourly bar back within the prior session range.",
            "basis": "hourly candle closes; not order-book evidence"}


def compare_spot_sources(primary: Path, comparison: Path, as_of: datetime) -> dict:
    """Compare only matching complete periods; never splice distinct spot feeds."""
    a, a_meta = load_hourly(primary, as_of)
    b, b_meta = load_hourly(comparison, as_of)
    ad, aw, _ = periods(a)
    bd, bw, _ = periods(b)
    result = {}
    for horizon, x, y, stride in (("daily", ad, bd, 1), ("weekly", aw, bw, 23)):
        left, right = dict(x), dict(y)
        common = sorted(left.keys() & right.keys())
        result[horizon] = {
            "n": len(common),
            "start": common[0].isoformat() if common else None,
            "end": common[-1].isoformat() if common else None,
            "absoluteRangeDifference": dist([abs(price_range(left[k]) - price_range(right[k])) for k in common]),
            "extremeSlotAgreement": {side: probability(
                sum(extreme_index(left[k], side) // stride == extreme_index(right[k], side) // stride for k in common),
                len(common)) for side in ("high", "low")},
        }
    return {"sources": {"FX:XAGUSD": a_meta["sourceAsOf"], "OANDA:XAGUSD": b_meta["sourceAsOf"]},
            "comparisonHash": b_meta["sha256"], "matchedPeriods": result,
            "use": "Feed disagreement check on overlapping observations; not independent predictive validation."}


def replay_ledger(path: Path, as_of: datetime, runtime_id: str):
    """Portable holdout records, separate from the existing HEL-034 OOS ledger."""
    bars, _ = load_hourly(path, as_of)
    days, weeks, _ = periods(bars)
    for horizon, rows, cut in (("daily", days, 15), ("weekly", weeks, 46)):
        _, start = split(len(rows))
        for i in range(max(MIN_SAMPLE, start), len(rows)):
            date, period = rows[i]
            history = [b for _, b in rows[max(0, i - 60):i]]
            actual = price_range(period)
            prefix = period[:cut]
            scale = median([price_range(b) for b in history])
            label, _ = estimate(prefix, scale)
            key = f"{VERSION}|XAGUSD|{horizon}|{date.isoformat()}"
            yield {
                "key": key, "modelVersion": VERSION, "runtimeId": runtime_id,
                "authority": "offline_holdout_replay", "instrument": "XAGUSD", "horizon": horizon,
                "predictionAt": (prefix[-1].start + HOUR).isoformat(),
                "resolvedAt": (period[-1].start + HOUR).isoformat(),
                "sampleCount": len(history), "prefixRegime": label,
                "observedRangeAtPrediction": round(price_range(prefix), 5),
                "priorMedianRange": round(scale, 5),
                "baselineHighAlreadyFormed": (1 + sum(extreme_index(b, "high") < cut for b in history)) / (2 + len(history)),
                "baselineLowAlreadyFormed": (1 + sum(extreme_index(b, "low") < cut for b in history)) / (2 + len(history)),
                "highAlreadyFormed": extreme_index(period, "high") < cut,
                "lowAlreadyFormed": extreme_index(period, "low") < cut,
                "realizedRange": round(actual, 5),
                "realizedRemainingRange": round(actual - price_range(prefix), 5),
            }


def research(path: Path, as_of: datetime) -> dict:
    bars, source = load_hourly(path, as_of)
    days, weeks, quality = periods(bars)
    if len(days) < MIN_SAMPLE:
        raise ValueError("Not enough complete sessions for archive research")
    cutoff = bars[-1].start + HOUR
    identity = hashlib.sha256(f'{VERSION}|{source["sha256"]}|{cutoff.isoformat()}'.encode()).hexdigest()[:20]
    return {"version": VERSION, "runtimeId": identity, "instrument": "XAGUSD",
            "source": "TradingView export FX:XAGUSD hourly spot", "observation": source,
            "asOf": as_of.isoformat(), "mode": "historical_research", "currentEligible": False,
            "priceUnit": "USD per troy ounce", "brokerPointIncrement": None,
            "quality": quality, "calendar": "NY 18:00–17:00, complete observed hours only",
            "dailyExtremes": temporal(days, week=False), "weeklyExtremes": temporal(weeks, week=True),
            "dailyRange": ranges(days, week=False), "weeklyRange": ranges(weeks, week=True),
            "expansion": window_expansion(days), "dailyTrailing": trailing(days, week=False),
            "weeklyTrailing": trailing(weeks, week=True),
            "archiveAuctionExample": ({**auction(days[-1][1], days[-2][1]),
                                       "session": days[-1][0].isoformat(),
                                       "priorSession": days[-2][0].isoformat()}
                                      if days[-2][0] == days[-1][0] - timedelta(
                                          days=3 if days[-1][0].weekday() == 0 else 1) else None),
            "withheld": ["Current forecast: no continuous verified live OHLC in this input.",
                         "Incomplete and shortened sessions are excluded; no independent holiday calendar was supplied.",
                         "Sub-hourly, point conversions, event paths and order flow are not supported by these bars.",
                         "No trailing distance is validated for operational use."]}
