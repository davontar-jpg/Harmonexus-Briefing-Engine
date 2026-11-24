"""Import pinned archives, calculate evidence, and emit an aggregate-only public candidate."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from silver_candle_store import EV, GETDATA, GETDATA_REPO, HISTDATA, aggregate, connect, import_archive, read_bars
from silver_intraday import archive_summary, overlap
from silver_temporal import load_hourly
from tools.fetch_silver_histdata import source_link

PINNED_REVISION = "c1526cc158ae8cba722383ad18f36ea1a333cbeb"
PUBLIC_SCHEMA = "xagusd-descriptive-archive.2"


def public_projection(results, as_of, source_records):
    sections = {}
    for source, label in (("longM5", EV), ("longCoreM5", EV), ("histCoreM5", HISTDATA)):
        item = results[source]
        # A compact and intentionally closed selection: no bar stream, exact
        # price boundary, timestamped episode ledger, credential, or local path.
        auction = item["auctionArchive"]
        sections[source] = {
            "provider": label, "first": item["first"], "sourceAsOf": item["sourceAsOf"], "sessionScope": item["sessionScope"],
            "bars": item["bars"], "quality": item["quality"],
            "resolutionMinutes": item["resolutionMinutes"],
            "range": item["range"], "weeklyExtremes": item["weeklyExtremes"],
            "daily": item["dailyExtremesAndWindows"],
            "events": item["events"], "analogCandidate": item["analogCandidate"],
            "auctionArchive": {k: auction[k] for k in ("priceBasedState", "confirmation", "challenge", "basis")} if auction else None,
            "trailing": {horizon: {regime: {
                "testN": cohort["testN"], "pullback": cohort["pullback"],
                "normalizedPullback": cohort["normalizedPullback"],
                **{k: cohort[k] for k in ("healthyPullback", "otherPullback", "healthyOutcome", "maxFavorable", "maxAdverse", "terminalGiveback", "recoveryMinutes")},
                "candidates": [x for x in cohort["candidates"]
                               if (x["activationFraction"] == .25 and x["costFraction"] == .01)
                               or x["policy"] == "lagged median range × .50"
                               and (x["costFraction"] == .01 or x["activationFraction"] == .25)],
                "promoted": False,
            } for regime, cohort in regimes.items()} for horizon, regimes in item["trailing"].items()},
        }
    return {"version": PUBLIC_SCHEMA, "instrument": "XAGUSD", "mode": "historical_research",
            "currentEligible": False, "asOf": as_of.isoformat(), "priceUnit": "USD per troy ounce",
            "sources": source_records, "sections": sections}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--cache", required=True, type=Path)
    p.add_argument("--as-of", required=True, type=datetime.fromisoformat)
    p.add_argument("--original", required=True, type=Path)
    p.add_argument("--sample-revision", default=PINNED_REVISION)
    p.add_argument("--refresh-sample", action="store_true",
                   help="Check the public sample head; import only if its immutable revision changed")
    p.add_argument("--public-output", type=Path)
    args = p.parse_args()
    if args.as_of.utcoffset() is None or not re.fullmatch("[0-9a-f]{40}", args.sample_revision):
        p.error("Use an offset-aware timestamp and a full sample revision")
    db = connect(args.cache / "xagusd.sqlite3")
    reports = []
    def add(file, provider, url):
        digest = import_archive(db, file.read_bytes(), provider, url, args.as_of)
        reports.append({**digest, "provider": provider, "url": url})
    revision = args.sample_revision
    if args.refresh_sample:
        from silver_candle_store import getdata_current, read_http
        url = getdata_current()
        revision = url.split("/")[-2]
        file = args.cache / f"getdata-xagusd-{revision[:12]}.csv"
        if not file.exists():
            file.write_bytes(read_http(url))
    sample_url = f"https://raw.githubusercontent.com/{GETDATA_REPO}/{revision}/XAGUSD_1m.csv"
    add(args.cache / f"getdata-xagusd-{revision[:12]}.csv", GETDATA, sample_url)
    for file in sorted(args.cache.glob("evtradelabs-xagusd-m5-*.json.gz")):
        yr = file.name.removesuffix(".json.gz").split("-")[-1]
        if not re.fullmatch(r"20\d{2}", yr):
            raise ValueError("Unknown EV archive identity")
        add(file, EV, f"https://evtradelabs.com/api/simulator/data/XAGUSD/M5/{yr}.json.gz")
    for file in sorted(args.cache.glob("histdata-xagusd-m1-*.zip")):
        ym = file.name.split("-")[3][:6]
        if not re.fullmatch(r"20\d{2}(0[1-9]|1[0-2])", ym):
            raise ValueError("Unknown HistData archive identity")
        add(file, HISTDATA, source_link(int(ym[:4]), int(ym[4:])))
    original, original_audit = load_hourly(args.original, args.as_of)
    hist_m1 = read_bars(db, HISTDATA, 1)
    sample_m1 = read_bars(db, GETDATA, 1)
    ev_m5 = read_bars(db, EV, 5)
    feeds = {"HistData M1": hist_m1, "GetData M1": sample_m1, "EV M5": ev_m5}
    histories = {name: {"bars": len(bars), "first": bars[0].start.isoformat(),
                        "last": bars[-1].start.isoformat()} for name,bars in feeds.items() if bars}
    events = json.loads((ROOT / "config/silver-events-2026.json").read_text())
    datasets = {"sampleCoreM5": (aggregate(sample_m1, 1, 5), 5, True),
                "sampleCoreM15": (aggregate(sample_m1, 1, 15), 15, True),
                "longM5": (ev_m5, 5, False), "longM15": (aggregate(ev_m5, 5, 15), 15, False),
                "longH1": (aggregate(ev_m5, 5, 60), 60, False), "longCoreM5": (ev_m5, 5, True)}
    comparisons = {"sampleVersusOriginal": overlap(aggregate(sample_m1,1,60), original,60)}
    if hist_m1:
        datasets["histM5"] = (aggregate(hist_m1, 1, 5), 5, False)
        datasets["histCoreM5"] = (datasets["histM5"][0], 5, True)
        datasets["histCoreM15"] = (aggregate(hist_m1, 1, 15), 15, True)
        comparisons["histVersusOriginal"] = overlap(aggregate(hist_m1,1,60), original,60)
        comparisons["histVersusSample"] = overlap(aggregate(hist_m1,1,60), aggregate(sample_m1,1,60),60)
    checksum_paths = ("silver_intraday.py", "silver_temporal.py", "silver_candle_store.py",
                      "tools/build_silver_second_pass.py", "config/silver-events-2026.json")
    fingerprint = hashlib.sha256(b"".join((ROOT / f).read_bytes() for f in checksum_paths)
                                 + json.dumps(sorted(x["digest"] for x in reports)).encode()).hexdigest()
    destination = args.cache / "second-pass-research.json"
    previous = json.loads(destination.read_text(encoding="utf-8")) if destination.exists() else {}
    if previous.get("analysisFingerprint") == fingerprint and all(
            not bars or bars[-1].start.timestamp() + resolution * 60 <= args.as_of.timestamp()
            for bars, resolution, _ in datasets.values()):
        results = previous["results"]
        print("Reusing matching historical analysis", flush=True)
    else:
        results = {}
        for name, (bars, resolution, core) in datasets.items():
            print(f"Computing {name}: {len(bars)} closed bars", flush=True)
            try:
                results[name] = archive_summary(bars, resolution, as_of=args.as_of, event_catalog=events, core=core)
            except ValueError as error:
                if "No complete weeks" not in str(error):
                    raise
                results[name] = {"error": "No complete weeks on the strict expected session grid"}
    private = {"schema": PUBLIC_SCHEMA, "asOf": args.as_of.isoformat(), "imports": reports,
               "analysisFingerprint": fingerprint,
               "original": original_audit, "candles": histories, "overlap": comparisons, "results": results}
    destination.write_text(
        json.dumps(private, indent=2, ensure_ascii=False, allow_nan=False) + "\n", encoding="utf-8")
    if args.public_output:
        selected = [{k: x[k] for k in ("provider", "url", "digest", "bars")} for x in reports
                    if x["provider"] in (EV, HISTDATA)]
        public = public_projection(results, args.as_of, selected)
        payload = json.dumps(public, indent=2, ensure_ascii=False, allow_nan=False) + "\n"
        if len(payload.encode("utf-8")) > 950_000:
            raise ValueError("Public aggregate is too large")
        args.public_output.write_text(payload, encoding="utf-8")
    print(json.dumps({"candles": histories, "complete": {k:v.get("quality") for k,v in results.items()},
                      "newBars": sum(x["new"] for x in reports)}))


if __name__ == "__main__":
    main()
