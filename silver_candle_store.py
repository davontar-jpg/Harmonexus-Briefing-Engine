"""Local, provider-separated XAGUSD archives. No broker or scheduler integration."""
from __future__ import annotations

import csv
import gzip
import hashlib
import io
import json
import math
import re
import sqlite3
import zipfile
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.request import Request, urlopen

from silver_temporal import UTC, Bar

GETDATA_REPO = "getdata-finance/xagusd-1m-ohlcv-metals-historical-data"
GETDATA = "GetData XAGUSD M1 evaluation sample"
EV = "EV Trading Labs / Dukascopy XAGUSD M5 bid"
HISTDATA = "HistData XAGUSD M1 bid"
HISTDATA_EST = timezone(timedelta(hours=-5))
MAX_BYTES = 30_000_000
UA = "HarmonexusSilverResearch/1.0"


def connect(path: Path):
    db = sqlite3.connect(path)
    db.executescript("""
        CREATE TABLE IF NOT EXISTS imports (
            provider TEXT, digest TEXT, url TEXT NOT NULL, acquired_utc TEXT NOT NULL,
            n INTEGER NOT NULL, first_epoch INTEGER NOT NULL, last_epoch INTEGER NOT NULL,
            PRIMARY KEY(provider, digest)
        );
        CREATE TABLE IF NOT EXISTS candles (
            provider TEXT, minutes INTEGER, epoch INTEGER,
            o REAL NOT NULL, h REAL NOT NULL, l REAL NOT NULL, c REAL NOT NULL,
            PRIMARY KEY(provider, minutes, epoch)
        ) WITHOUT ROWID;
        CREATE TABLE IF NOT EXISTS quarantined (
            provider TEXT, digest TEXT, epoch INTEGER, reason TEXT NOT NULL,
            PRIMARY KEY(provider, digest, epoch)
        );
    """)
    return db


def read_http(url: str, cap=MAX_BYTES):
    # Public routes only. No credentials and no retry loop on auth or rate-limit responses.
    with urlopen(Request(url, headers={"User-Agent": UA}), timeout=25) as response:
        payload = response.read(cap + 1)
    if not payload or len(payload) > cap:
        raise ValueError("No valid archive body, or response exceeded its size limit")
    return payload


def getdata_current():
    url = f"https://api.github.com/repos/{GETDATA_REPO}/commits/main"
    commit = json.loads(read_http(url, 100_000))["sha"]
    if not re.fullmatch("[0-9a-f]{40}", commit):
        raise ValueError("Could not pin the GetData sample")
    return f"https://raw.githubusercontent.com/{GETDATA_REPO}/{commit}/XAGUSD_1m.csv"


def parse(payload: bytes, provider: str):
    if provider == GETDATA:
        source = csv.DictReader(io.StringIO(payload.decode("utf-8-sig")))
        for row in source:
            dt = datetime.fromisoformat(row["datetime"])
            if dt.utcoffset() != timedelta(0):
                raise ValueError("GetData sample must carry UTC offsets")
            yield int(dt.timestamp()), *(float(row[k]) for k in ("open", "high", "low", "close"))
    elif provider == EV:
        # EV supplies pre-aggregated bid/ask; do not mix the price sides or sanitize gaps.
        with gzip.GzipFile(fileobj=io.BytesIO(payload)) as compressed:
            expanded = compressed.read(MAX_BYTES + 1)
        if len(expanded) > MAX_BYTES:
            raise ValueError("Uncompressed candle archive exceeded its size limit")
        for row in json.loads(expanded):
            yield int(row["ts"]), *(float(row[k]) for k in "ohlc")
    elif provider == HISTDATA:
        with zipfile.ZipFile(io.BytesIO(payload)) as archive:
            files = [f for f in archive.infolist()
                     if re.fullmatch(r"DAT_ASCII_XAGUSD_M1_\d{4}(?:\d{2})?\.csv", f.filename)]
            if len(files) != 1 or files[0].file_size > MAX_BYTES:
                raise ValueError("Expected a single bounded HistData XAGUSD M1 archive")
            with archive.open(files[0]) as file:
                for row in csv.reader(io.TextIOWrapper(file, encoding="ascii"), delimiter=";"):
                    if not row:
                        continue
                    local = datetime.strptime(row[0], "%Y%m%d %H%M%S").replace(tzinfo=HISTDATA_EST)
                    yield int(local.timestamp()), *(float(value) for value in row[1:5])
    else:
        raise ValueError("Unsupported source; use an explicit validated adapter")


def import_archive(db, payload: bytes, provider: str, url: str, as_of: datetime):
    if as_of.utcoffset() is None:
        raise ValueError("As-of requires an offset")
    minutes = {GETDATA: 1, EV: 5, HISTDATA: 1}[provider]
    digest = hashlib.sha256(payload).hexdigest()
    known = db.execute("SELECT n, first_epoch, last_epoch FROM imports WHERE provider=? AND digest=?",
                       (provider, digest)).fetchone()
    if known:
        rejected = db.execute("SELECT count(*) FROM quarantined WHERE provider=? AND digest=?",
                              (provider, digest)).fetchone()[0]
        return {"digest": digest, "bars": known[0], "new": 0, "cached": True, "quarantined": rejected}
    unique = {}
    conflicts = set()
    for epoch, o, h, l, c in parse(payload, provider):
        if epoch + 60 * minutes > as_of.timestamp():
            # Historical imports must be immutable and fully closed.
            raise ValueError("Archive contains a candle not closed by the supplied as-of")
        if epoch % (60 * minutes) or not all(math.isfinite(v) and v > 0 for v in (o, h, l, c)):
            raise ValueError("Invalid time grid or quote")
        if l > min(o, c) or h < max(o, c):
            raise ValueError("Invalid OHLC ordering")
        key = (o, h, l, c)
        if epoch in unique and unique[epoch] != key:
            if provider != HISTDATA:
                raise ValueError("Conflicting duplicates in the same source")
            # HistData supplies different OHLC on several identical timestamps.
            # Record the affected times and discard every alternative for those minutes.
            conflicts.add(epoch)
        unique[epoch] = key
    for epoch in conflicts:
        unique.pop(epoch)
    if not unique:
        raise ValueError("Archive contains no usable candles")
    before = db.total_changes
    with db:
        db.execute("CREATE TEMP TABLE IF NOT EXISTS incoming(epoch INTEGER PRIMARY KEY,o,h,l,c)")
        db.execute("DELETE FROM incoming")
        db.executemany("INSERT INTO incoming VALUES (?,?,?,?,?)", [(k, *v) for k, v in unique.items()])
        collision = db.execute(
            "SELECT count(*) FROM incoming i JOIN candles c ON i.epoch=c.epoch "
            "WHERE c.provider=? AND c.minutes=? AND (i.o!=c.o OR i.h!=c.h OR i.l!=c.l OR i.c!=c.c)",
            (provider, minutes)).fetchone()[0]
        if collision:
            raise ValueError(f"Overlapping source revision disagrees at {collision} bar(s); nothing imported")
        if conflicts:
            first, last = min(conflicts), max(conflicts)
            prior = db.execute("SELECT epoch FROM candles WHERE provider=? AND minutes=? AND epoch BETWEEN ? AND ?",
                               (provider, minutes, first, last))
            if any(r[0] in conflicts for r in prior):
                raise ValueError("Source revision newly disputes an already stored quote; nothing imported")
            db.executemany("INSERT INTO quarantined VALUES(?,?,?,?)",
                           [(provider, digest, t, "conflicting intra-file OHLC") for t in sorted(conflicts)])
        after_stage = db.total_changes
        db.execute("INSERT OR IGNORE INTO candles SELECT ?, ?, epoch, o, h, l, c FROM incoming", (provider, minutes))
        added = db.total_changes - after_stage
        db.execute("INSERT INTO imports VALUES(?,?,?,?,?,?,?)",
                   (provider, digest, url, as_of.isoformat(), len(unique), min(unique), max(unique)))
    assert db.total_changes >= before
    return {"digest": digest, "bars": len(unique), "new": added, "cached": False, "quarantined": len(conflicts)}


def read_bars(db, provider: str, minutes: int):
    curs = db.execute("SELECT epoch,o,h,l,c FROM candles WHERE provider=? AND minutes=? ORDER BY epoch",
                      (provider, minutes))
    return [Bar(datetime.fromtimestamp(t, UTC), o, h, l, c) for t, o, h, l, c in curs]


def aggregate(bars: list[Bar], source_minutes: int, target_minutes: int):
    """Only output complete UTC bins. A missing source bar never becomes a flat bar."""
    if source_minutes <= 0 or target_minutes % source_minutes or target_minutes < source_minutes:
        raise ValueError("Target resolution must be an integer multiple of the source")
    segments = defaultdict(list)
    for bar in bars:
        start = int(bar.start.timestamp())
        window = start - start % (target_minutes * 60)
        segments[window].append(bar)
    output = []
    count = target_minutes // source_minutes
    delta = timedelta(minutes=source_minutes)
    for t, group in sorted(segments.items()):
        start = datetime.fromtimestamp(t, UTC)
        if len(group) == count and all(bar.start == start + i*delta for i, bar in enumerate(group)):
            output.append(Bar(start, group[0].open, max(b.high for b in group),
                              min(b.low for b in group), group[-1].close))
    return output
