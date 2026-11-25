"""Build one reviewed historical aggregate for Instrument Lab and the briefing."""
import argparse
import hashlib
import json
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from silver_candle_store import EV, HISTDATA, aggregate, read_bars
from silver_intraday import coherent_periods
from silver_temporal import dist, price_range
from silver_trend_preservation import VERSION, study


def projection(long, recent):
    short = []
    for key in ("weekly", "rolling_weekly", "daily", "multi_day", "monthly"):
        h = long["horizons"][key]
        fragments = []
        for direction in ("Bullish", "Bearish"):
            r = h["directions"][direction]["retrospective"]
            label = direction.lower()
            if r["reference"] is None:
                fragments.append(f'{label} withheld (n={r["recovered"]["n"]})')
            else:
                fragments.append(f'{label} ${r["reference"]:.3f}/oz (n={r["recovered"]["n"]})')
        short.append(h["label"]+" historical tolerance (p75): "+" · ".join(fragments)+".")
    short += [
        "Weekly holding reference: about 3 in 4 recovered pullbacks stayed within the listed distances in hindsight-confirmed Tuesday–Friday trends. Not a validated trailing stop.",
        "No current-volatility adjustment. Execution-broker points unverified.",
    ]
    detail = []
    for key in ("weekly", "rolling_weekly", "daily", "multi_day", "monthly"):
        h = long["horizons"][key]
        for direction, r in h["directions"].items():
            m = r["replay"]["comparator"]
            t = r["retrospective"]
            lohi = t["p75YearBlock95"]
            quant = t["recovered"]
            pct = " / ".join(f'${quant[k]:.3f}' if k in quant else "—" for k in ("p50","p75","p80","p90","p95"))
            detail.append(f'{h["label"]} {direction.lower()} (retrospective): healthy {t["outcomes"]["healthy"]}, recovered {quant["n"]}; '
                          f'p50/p75/p80/p90/p95 {pct}/oz'+
                          (f'; p75 year-block interval ${lohi[0]:.3f}–${lohi[1]:.3f}/oz.' if lohi else '; limited sample.'))
            if m["n"]:
                ratio = lambda v: f'{v["hits"]}/{v["n"]}' if v["n"] else "unavailable"
                delta = lambda x: ("−" if x<0 else "")+f'${abs(x):.3f}'
                detail.append(f'Observable-prefix replay: healthy survived {ratio(m["survival"])}, deterioration exited {ratio(m["deteriorationExit"])}; '
                              f'median net retained {delta(m["retained"]["p50"])}/oz, giveback {delta(m["giveback"]["p50"])}/oz.')
    recent_median = recent["coreDayRange"].get("p50")
    older_median = recent["archiveCoreDayRange"].get("p50")
    context = (f'Recent HistData median core range ${recent_median:.3f}/oz vs archive EV core ${older_median:.3f}/oz '
               'on the same clock, a different feed and period. No transfer to current volatility.' if recent_median and older_median
               else "Recent comparable volatility sample unavailable.")
    detail.extend([context,
                   "Broker point equivalents are conditional only: if $0.001/oz per broker point, multiply USD/oz by 1,000.",
                   "Replay uses lagged daily range width, activation after half a lagged daily range and modeled cost of 1% of that range. "
                   "These are historical comparisons on previously examined data, not an operational stop test pass."])
    return {"short":short,"email":short+detail}


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--db",type=Path,required=True)
    p.add_argument("--out",type=Path,required=True)
    a = p.parse_args()
    with sqlite3.connect(a.db.resolve(strict=True).as_uri()+"?mode=ro",uri=True) as db:
        evidence = db.execute("SELECT provider, digest FROM imports WHERE provider IN (?,?) ORDER BY provider,digest",(EV,HISTDATA)).fetchall()
        ev = read_bars(db,EV,5)
        hist = aggregate(read_bars(db,HISTDATA,1),1,5)
    long_days, _, quality = coherent_periods(ev, 5)
    old_core, _, _ = coherent_periods(ev, 5, core=True)
    new_core, _, context_quality = coherent_periods(hist, 5, core=True)
    long = {"provider":EV,"quality":quality,"barCount":len(ev),"first":ev[0].start.isoformat(),"last":ev[-1].start.isoformat(),
            **study(long_days,5)}
    context = {"provider":HISTDATA,"quality":context_quality,"barCount":len(hist),"last":hist[-1].start.isoformat(),
               "coreDayRange":dist([price_range(bs) for _,bs in new_core]),
               "archiveCoreDayRange":dist([price_range(bs) for _,bs in old_core]),
               **study(new_core,5,recent=True)}
    result = {"version":VERSION,"instrument":"XAGUSD","status":"historical_only","operationalValidated":False,
              "brokerPointVerified":False,"archiveFingerprint":hashlib.sha256(json.dumps(evidence).encode()).hexdigest(),
              "long":long,"recent":context,"briefing":projection(long,context)}
    a.out.write_text(json.dumps(result,ensure_ascii=False,sort_keys=True,separators=(",",":"))+"\n",encoding="utf-8")


if __name__ == "__main__":
    main()
