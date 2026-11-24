import json
from datetime import datetime, timedelta, timezone

import pytest

from silver_temporal import (
    HOUR, NY, Bar, auction, extreme_index, load_hourly, path_metrics, periods,
    price_range, probability, ranges, replay_ledger, simulate, temporal, window_expansion,
)
from silver_temporal_view import read_archive_snapshot


def day(date="2026-03-09", start=20.0):
    end = datetime.fromisoformat(date + "T17:00:00").replace(tzinfo=NY)
    first = end.astimezone(timezone.utc) - 23 * HOUR
    return [Bar(first+i*HOUR, start, start+i/10+1, start-1, start+i/10) for i in range(23)]


def test_session_reconstruction_respects_dst_and_weekend():
    fri, mon = day("2026-03-06"), day("2026-03-09")
    assert fri[0].start.hour == 23 and mon[0].start.hour == 22
    days, weeks, audit = periods(fri + mon)
    assert len(days) == 2 and not weeks
    assert audit["completeSessions"] == 2
    assert periods(mon[:4] + mon[5:])[2]["completeSessions"] == 0


def test_incomplete_week_and_first_tie():
    start = datetime(2026, 3, 9)
    bars = [b for i in range(5) for b in day((start+timedelta(days=i)).date().isoformat())]
    days, weeks, _ = periods(bars)
    assert len(weeks) == 1
    assert not periods(bars[:-1])[1]
    b = weeks[0][1]
    assert extreme_index(b, "low") == 0
    assert extreme_index(b, "high") == 22
    stats = temporal(weeks, week=True)
    assert stats["low"]["full"]["Mon"]["hits"] == 1
    assert stats["high"]["checkpoints"][0]["alreadyFormed"]["frequency"] == 1
    assert stats["high"]["checkpoints"][0]["remaining"]["Tue"]["frequency"] is None
    assert all(p["holdoutDominantShare"]["n"] == 1 for p in window_expansion(days).values())


def test_split_and_range_benchmark_cannot_include_target():
    start = datetime(2026, 1, 1)
    rows = [(start+timedelta(days=i), day(start=20)) for i in range(29)]
    b = day(start=25)
    b[-1] = Bar(b[-1].start, 25., 40., 24., 25.)
    rows.append((start+timedelta(days=29), b))
    last = ranges(rows, week=False)["archiveLastCompletePeriod"]
    assert last["actual"] == 16 and last["expectedMedian"] == pytest.approx(price_range(rows[0][1]))


def test_asof_and_duplicate_conflict(tmp_path):
    p = tmp_path / "x.csv"
    time = 1773050400
    p.write_text(f"time,open,high,low,close\n{time},30,31,29,30\n{time},30,31,29,30\n{time+3600},30,31,29,30\n")
    _, audit = load_hourly(p, datetime.fromtimestamp(time+3600, timezone.utc))
    assert audit["bars"] == 1 and audit["exactDuplicates"] == audit["notYetClosed"] == 1
    p.write_text(f"time,open,high,low,close\n{time},30,31,29,30\n{time},30,32,29,30\n")
    with pytest.raises(ValueError, match="Conflicting"):
        load_hourly(p, datetime.fromtimestamp(time+3600, timezone.utc))


def test_trail_crossing_before_intrabar_ratchet_and_gap_fill():
    t = datetime(2026, 1, 1, tzinfo=timezone.utc)
    first = Bar(t, 100, 110, 90, 107)
    second = Bar(t+HOUR, 101, 122, 99, 110)
    # First wide bar can activate but cannot raise and cross its own unobservable trail.
    assert not simulate([first], 100, 1, 3, 5, .1)["stopped"]
    assert simulate([first, second], 100, 1, 3, 5, .1)["netRetained"] == .9
    fall = [Bar(t, 100, 105, 89, 92), Bar(t+HOUR, 96, 100, 85, 92)]
    assert simulate(fall, 100, -1, 3, 5, .1)["netRetained"] == 3.9


def test_path_and_auction_use_distinct_candle_evidence():
    t = datetime(2026, 1, 1, tzinfo=timezone.utc)
    b = [Bar(t+i*HOUR, 100, max(100,c), min(100,c), c) for i,c in enumerate([105, 103, 106, 100])]
    path = path_metrics(b, 100, 1)
    assert path["recoveredPullback"] == 2 and path["terminalPullback"] == 6
    assert auction(b, day())["priceBasedState"] == "two closes above prior session high"
    assert probability(0, 0)["frequency"] is None


def test_dashboard_archive_rejects_current_or_unverified_points(tmp_path):
    from silver_temporal import VERSION

    p = tmp_path / "research.json"
    artifact = {"version": VERSION, "instrument": "XAGUSD", "mode": "historical_research",
                "currentEligible": False, "brokerPointIncrement": None}
    p.write_text(json.dumps(artifact))
    assert read_archive_snapshot(p) == artifact
    for changes in ({"currentEligible": True}, {"brokerPointIncrement": .001}, {"instrument": "SI"}):
        p.write_text(json.dumps({**artifact, **changes}))
        with pytest.raises(ValueError, match="Incompatible"):
            read_archive_snapshot(p)


def test_replay_ledger_does_not_look_at_later_bars_to_form_prediction(tmp_path):
    start = datetime(2026, 3, 2)
    bars = [bar for i in range(49) if (start + timedelta(days=i)).weekday() < 5
            for bar in day((start + timedelta(days=i)).date().isoformat())]
    end = bars[-1]
    def write(last_high):
        file = tmp_path / "bars.csv"
        rows = [*bars[:-1], Bar(end.start, end.open, last_high, end.low, end.close)]
        file.write_text("time,open,high,low,close\n" + "".join(
            f"{int(b.start.timestamp())},{b.open},{b.high},{b.low},{b.close}\n" for b in rows
        ))
        return list(replay_ledger(file, end.start + HOUR, "replay"))[-1]
    baseline, changed = write(end.high), write(end.high + 100)
    assert baseline["realizedRange"] != changed["realizedRange"]
    for field in ("predictionAt", "prefixRegime", "observedRangeAtPrediction", "priorMedianRange",
                  "baselineHighAlreadyFormed", "baselineLowAlreadyFormed"):
        assert baseline[field] == changed[field]
    assert datetime.fromisoformat(changed["predictionAt"]) < datetime.fromisoformat(changed["resolvedAt"])
