"""Build executive points from accepted evidence; run separate qualification checks."""
import argparse
import hashlib
import json
import sqlite3
import sys
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from silver_candle_store import EV, HISTDATA, aggregate, read_bars
from silver_intraday import coherent_periods
from silver_temporal import dist
from silver_trend_preservation import FIT_END, HORIZONS, trading_days, windows

POINT = Decimal("0.001")
TITLE = "TREND-PRESERVATION INTELLIGENCE"
PENDING = "Pending sufficient evidence."


def points(price):
    return None if price is None else int((Decimal(str(price)) / POINT).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def monthly_probe(days):
    month_starts = {}
    for day, _ in days:
        key = day.year, day.month
        if key not in month_starts:
            first = trading_days(date(*key, 1), 20)
            if first[-1].month == day.month:
                month_starts[key] = first[0]
    paths = list(windows(days, ("calendar_month", "Calendar month", 20, None),5,
                         anchor_dates=set(month_starts.values()),anatomy=True))
    groups = {}
    for label, side in (("Bullish",1),("Bearish",-1)):
        healthy = [p for p in paths if p["side"]==side and p["state"]=="healthy" and p["recovered"]>0]
        groups[label] = {"archiveYears":len({p["day"].year for p in healthy}),
                         "recovered":dist([p["recovered"] for p in healthy])}
    return {"nonoverlappingWindows":len(paths),"directions":groups}


def normalized_probe(archive, recent):
    goal = next(h for h in HORIZONS if h[0]=="weekly")
    old_paths = list(windows(archive,goal,5))
    recent_paths = list(windows(recent,goal,5))
    report = {}
    for label, side in (("Bullish",1),("Bearish",-1)):
        def eligible(paths):
            return [p for p in paths if p["side"]==side and p["state"]=="healthy" and p["recovered"]>0]
        fit = eligible([p for p in old_paths if p["end"]<FIT_END])
        later = eligible([p for p in old_paths if p["day"]>=FIT_END])
        current = eligible(recent_paths)
        normalized = dist([p["recovered"]/p["lag"] for p in fit])
        cutoff = normalized.get("p75") if normalized["n"]>=25 else None
        report[label] = {"fitN":len(fit),"archiveCheckN":len(later),"recentCheckN":len(current),
                         "fitP75":cutoff,"archiveCovered":sum(p["recovered"]/p["lag"]<=cutoff for p in later) if cutoff is not None else None,
                         "recentCovered":sum(p["recovered"]/p["lag"]<=cutoff for p in current) if cutoff is not None else None}
    return report


def executive(accepted):
    rows = []
    for key in ("daily","weekly","monthly"):
        h = accepted["long"]["horizons"][key]
        values = {side:points(h["directions"][side]["retrospective"]["reference"]) for side in ("Bullish","Bearish")}
        rows.append({"key":key,"label":h["label"],"points":values})
    interpretation = "Weekly is the main holding reference; ordinary pullbacks did not always end the trend."
    qualification = "Historical references, not validated stops. Assumes $0.001/oz per point; broker unverified. Not adjusted to current volatility."
    lines = []
    for row in rows:
        title = row["label"]+" trend trail"
        if all(p is None for p in row["points"].values()):
            lines.append(title+": "+PENDING)
        else:
            lines.append(title+"\n"+"\n".join(f"{side}: {value} pts" if value is not None else f"{side}: {PENDING}"
                                                for side,value in row["points"].items()))
    text = "\n\n".join(lines+["Interpretation:\n"+interpretation,qualification])
    return dict(title=TITLE,rows=rows,pending=PENDING,interpretation=interpretation,qualification=qualification,text=text)


def main():
    p=argparse.ArgumentParser()
    p.add_argument("--research",required=True,type=Path)
    p.add_argument("--db",required=True,type=Path)
    p.add_argument("--out",required=True,type=Path)
    a=p.parse_args()
    raw=a.research.read_text(encoding="utf-8")
    accepted=json.loads(raw)
    if (accepted["version"],accepted["instrument"],accepted["status"],accepted["operationalValidated"],accepted["brokerPointVerified"])!=(
        "xagusd-trend-preservation.1","XAGUSD","historical_only",False,False
    ):
        p.error("Unexpected accepted evidence authority")
    with sqlite3.connect(a.db.resolve(strict=True).as_uri()+"?mode=ro",uri=True) as db:
        ev=read_bars(db,EV,5)
        hist=aggregate(read_bars(db,HISTDATA,1),1,5)
    full=coherent_periods(ev,5)[0]
    core=coherent_periods(ev,5,core=True)[0]
    recent=coherent_periods(hist,5,core=True)[0]
    payload={"version":"xagusd-trend-executive.1","researchSHA256":hashlib.sha256(raw.encode()).hexdigest(),
             "pointBasis":"assumed","usdPerOuncePerPoint":str(POINT),"executive":executive(accepted),
             "checks":{"archiveFullMonthly":monthly_probe(full),"archiveCoreMonthly":monthly_probe(core),
                       "recentCoreMonthly":monthly_probe(recent),"weeklyNormalized":normalized_probe(core,recent),
                       "monthlyQualified":False,"currentNormalizationQualified":False}}
    a.out.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")


if __name__=="__main__":
    main()
