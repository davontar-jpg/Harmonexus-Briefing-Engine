from datetime import date, datetime, timedelta, timezone
import io
import zipfile

import pytest

from silver_candle_store import GETDATA, HISTDATA, aggregate, connect, import_archive, read_bars
from silver_intraday import bar_close_utc, coherent_periods, event_paths, two_sided_fisher, weekly_extremes
from silver_temporal import Bar


ASOF = datetime(2026, 11, 24, tzinfo=timezone.utc)
HEADER = b"datetime,open,high,low,close,volume\n"


def test_sqlite_import_dedup_and_reject_source_revisions(tmp_path):
    db = connect(tmp_path / "local.sqlite")
    old = HEADER + b"2026-11-23T12:00:00+00:00,25,26,24,25,0\n"
    newer = old + b"2026-11-23T12:01:00+00:00,25,26,24,25,0\n"
    mismatch = newer.replace(b"25,26,24", b"25,27,24")
    assert import_archive(db, old, GETDATA, "https://example.test", ASOF)["new"] == 1
    assert import_archive(db, newer, GETDATA, "https://example.test", ASOF)["new"] == 1
    assert import_archive(db, newer, GETDATA, "https://example.test", ASOF)["cached"]
    with pytest.raises(ValueError, match="disagrees"):
        import_archive(db, mismatch, GETDATA, "https://example.test", ASOF)
    assert len(read_bars(db, GETDATA, 1)) == 2


def test_conflicting_histdata_minutes_are_quarantined_not_flat_filled(tmp_path):
    db = connect(tmp_path / "local.sqlite")
    body = io.BytesIO()
    with zipfile.ZipFile(body, "w") as z:
        z.writestr("DAT_ASCII_XAGUSD_M1_202611.csv", "\n".join([
            "20261123 080000;25;26;24;25;0",
            "20261123 080000;25;27;24;25;0",
            "20261123 080100;25;26;24;25;0",
        ]))
    result = import_archive(db, body.getvalue(), HISTDATA, "https://example.test", ASOF)
    assert result["quarantined"] == 1 and result["bars"] == 1
    t = read_bars(db, HISTDATA, 1)[0].start
    assert t.isoformat() == "2026-11-23T13:01:00+00:00"


def make_session(day, minutes=5):
    first = bar_close_utc(day) - timedelta(hours=23)
    return [Bar(first + timedelta(minutes=i*minutes), 20., 22. if i == 1 else 21., 19., 20.)
            for i in range(23*60//minutes)]


def test_aggregate_drops_incomplete_bucket_and_preserves_extremes():
    session = make_session(date(2026, 11, 23))
    a = aggregate(session, 5, 15)
    assert len(a) == 92 and a[0].high == 22
    b = aggregate(session[1:], 5, 15)
    assert len(b) == 91 and b[0].start > a[0].start
    assert coherent_periods(b, 15)[2]["sessions"] == 0


def test_calendar_windows_do_not_skip_missing_weeks_into_the_lookback():
    w1 = date(2026, 9, 7)
    w2 = date(2026, 11, 9)
    weeks = [(m, [b for i in range(5) for b in make_session(m+timedelta(days=i))])
             for m in (w1, w2)]
    o = weekly_extremes(weeks, 5)
    assert o["full"]["high"]["Mon"]["n"] == 2
    assert o["rollingCalendarWeeks"]["high"]["4"]["Mon"]["n"] == 1
    assert two_sided_fisher(0, 5, 5, 0) == pytest.approx(2/252)


def test_events_exclude_incomplete_and_future_windows():
    dt = date(2026, 11, 23)
    days = [(dt, make_session(dt))]
    catalog = {"events": {"CPI": ["2026-11-23T08:30", "2026-11-24T08:30"]},
               "sources": {"CPI": "https://example.test"}}
    assert event_paths(days, [], 5, catalog)["CPI"]["eventsWithCompleteSession"] == 1
    assert event_paths(days, [], 5, catalog)["CPI"]["unmatchedScheduleEntries"] == 1
