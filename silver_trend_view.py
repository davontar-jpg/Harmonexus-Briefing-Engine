"""Presentation only. The exact operator copy also feeds Apps Script."""
import json
from hashlib import sha256
from html import escape
from functools import lru_cache
from pathlib import Path

import pandas as pd
import streamlit as st

import hel_cartographer as hel

DATA = Path(__file__).resolve().parent / "data/research/xagusd-trend-preservation.json"
EXECUTIVE = DATA.with_name("xagusd-trend-executive.json")
ORDER = ("weekly", "rolling_weekly", "daily", "multi_day", "monthly")
EXECUTIVE_CSS = """<style>
.hx-trend-grid{display:grid;grid-template-columns:1fr 1.27fr 1fr;gap:.75rem}
.hx-trend-card{min-width:0;padding:1rem;border:1px solid color-mix(in oklch,var(--hel-color-semantic-signal-primary),transparent 77%);border-radius:var(--hel-dimension-radius-architectural);background:var(--hel-color-semantic-surface-optical)}
.hx-trend-card.hx-trend-weekly{border-color:var(--hel-color-semantic-signal-primary);background:color-mix(in oklch,var(--hel-color-semantic-surface-optical),var(--hel-color-semantic-signal-primary) 8%)}
.hx-trend-card h4{font:600 .79rem/1.35 var(--hel-font-interface),sans-serif;letter-spacing:.08em;text-transform:uppercase;margin:0 0 .7rem}
.hx-trend-card .hx-trend-priority{color:var(--hel-color-semantic-signal-primary);font-size:.73rem;margin-bottom:.35rem}
.hx-trend-card dl{display:grid;grid-template-columns:1fr 1fr;margin:0;gap:.55rem}
.hx-trend-card dt{font-size:.8rem;color:var(--hel-color-semantic-content-secondary)}
.hx-trend-card dd{margin:0;font:650 clamp(1.2rem,3vw,1.9rem)/1.2 var(--hel-font-numeric),monospace;font-variant-numeric:tabular-nums}
.hx-trend-card.hx-trend-weekly dd{font-size:clamp(1.5rem,3.5vw,2.3rem)}
.hx-trend-card dd small{font-size:.68em;font-weight:500}
@media(max-width:700px){.hx-trend-grid{grid-template-columns:minmax(0,1fr)}}
</style>"""


@lru_cache(maxsize=1)
def load_trend_reference():
    packet = json.loads(DATA.read_text(encoding="utf-8"))
    if (packet.get("version"),packet.get("instrument"),packet.get("status")) != (
        "xagusd-trend-preservation.1","XAGUSD","historical_only"
    ) or packet.get("operationalValidated") is not False or packet.get("brokerPointVerified") is not False:
        raise ValueError("Trend research must stay historical and non-operational.")
    return packet


@lru_cache(maxsize=1)
def load_executive_points():
    q = json.loads(EXECUTIVE.read_text(encoding="utf-8"))
    if (q["version"],q["researchSHA256"],q["pointBasis"]) != (
        "xagusd-trend-executive.1",sha256(DATA.read_text(encoding="utf-8").encode()).hexdigest(),"assumed"
    ):
        raise ValueError("Executive projection did not match the published research")
    return q


def render_point_cards(executive):
    cards = []
    for row in executive["rows"]:
        weekly = row["key"] == "weekly"
        title = escape(row["label"].upper()+" TREND-PRESERVATION TRAIL")
        sides = []
        for direction,value in row["points"].items():
            reading = f'<span>{int(value)}</span> <small>pts</small>' if value is not None else "Pending"
            sides.append(f"<div><dt>{escape(direction)}</dt><dd>{reading}</dd></div>")
        content = "<dl>"+"".join(sides)+"</dl>" if any(row["points"].values()) else escape(executive["pending"])
        priority = '<div class="hx-trend-priority">PRIMARY HOLDING REFERENCE</div>' if weekly else ""
        cssclass = "hx-trend-card hx-trend-weekly" if weekly else "hx-trend-card"
        cards.append(f'<section class="{cssclass}">{priority}<h4>{title}</h4>{content}</section>')
    return EXECUTIVE_CSS+'<div class="hx-trend-grid">'+"".join(cards)+"</div>"


def _percent(v):
    return f'{v["hits"]}/{v["n"]} ({v["rate"]:.0%})' if v["n"] else "Unavailable"


def _references(horizons):
    for key in ORDER:
        h = horizons[key]
        for side, r in h["directions"].items():
            t = r["retrospective"]
            d = t["recovered"]
            ref = t["reference"]
            yield {"Horizon":h["label"],"Direction":side,"Healthy":t["outcomes"]["healthy"],
                   "Recovered n":d["n"],
                   **{k.upper():d.get(k) for k in ("p50","p75","p80","p90","p95")},
                   "Reference ($/oz)":f"{ref:.3f}" if ref is not None else "Withheld",
                   "P75 95% year-block ($/oz)":" – ".join(f"{v:.3f}" for v in t["p75YearBlock95"]) if t["p75YearBlock95"] else "Unavailable"}


def render_trend_preservation(table):
    try:
        packet = load_trend_reference()
        projection = load_executive_points()
    except (OSError, ValueError, KeyError):
        st.caption("Trend-preservation research unavailable. Existing archive evidence is unchanged.")
        return
    st.markdown(hel.inspection_surface(
        "Trend-Preservation Intelligence",
        "XAGUSD · executive reference",state="informational"),
        unsafe_allow_html=True)
    executive = projection["executive"]
    st.markdown(render_point_cards(executive),unsafe_allow_html=True)
    st.markdown("**Interpretation:** "+executive["interpretation"])
    st.caption(executive["qualification"].replace("$",r"\$"))
    horizons = packet["long"]["horizons"]
    with st.expander("Supporting Research & Validation", expanded=False):
        st.caption("EV Trading Labs / Dukascopy M5 bid, 2015–2025. Recovered depths are USD/oz. "
                   "Small samples are shown for inspection, not published as references.")
        table(pd.DataFrame(_references(horizons)), "Historical trend anatomy", "trend_anatomy")
        selection = st.selectbox("Holding horizon", ORDER, format_func=lambda k:horizons[k]["label"],key="trend_horizon")
        side = st.selectbox("Continuation direction", ("Bullish","Bearish"),key="trend_side")
        r = horizons[selection]["directions"][side]
        d = r["discrimination"]
        auc = f'{d["largerDrawdownAUC"]:.3f}' if d["largerDrawdownAUC"] is not None else "unavailable"
        st.caption(f"Observable-prefix cohort: {d['healthyN']} healthy and {d['deterioratingN']} failed/reversed. "
                   f"Empirical drawdown separation AUC: {auc} (0.5 is no rank separation; not a live signal).")
        descriptions = []
        for state, values in r["outcomesDrawdown"].items():
            descriptions.append({"Outcome":state.title(),"N":values["n"],"Drawdown median ($/oz)":values.get("p50"),
                                 "Drawdown p75 ($/oz)":values.get("p75"),"Drawdown p90 ($/oz)":values.get("p90")})
        table(pd.DataFrame(descriptions),"Observable-prefix drawdowns by outcome","trend_comparison")
        detail = [{"Metric":label,"N":v["n"],"Median":v.get("p50"),"P75":v.get("p75"),"P90":v.get("p90")}
                  for label,v in (("Recovered / lagged daily range",r["retrospective"]["normalized"]),
                                  ("Recovered / price expansion",r["retrospective"]["fractionOfExpansion"]),
                                  ("Pullback duration (minutes)",r["retrospective"]["pullbackMinutes"]),
                                  ("Recovery after trough (minutes)",r["retrospective"]["recoveryMinutes"]),
                                  ("Favorable excursion ($/oz)",r["mfe"]),("Adverse excursion ($/oz)",r["mae"]))]
        table(pd.DataFrame(detail),"Normalized retracement and excursion","trend_excursion")
        split = st.selectbox("Chronological evaluation", ("2024–25 reviewed replay", "2023 validation"),key="trend_split")
        v = r["replay"]
        label = "previouslyExaminedReplay" if split.startswith("2024") else "validation"
        cases = [{"Width":c["policy"],"Activation":c["activation"],"Cost / lagged day range":f"{c['costFraction']:.0%}",
                  "N":c["n"],"Healthy survival":_percent(c["survival"]),
                  "Deterioration exit":_percent(c["deteriorationExit"]),"Consolidation exit":_percent(c["consolidationExit"]),
                  "Net retained median ($/oz)":c["retained"].get("p50"),"Giveback median ($/oz)":c["giveback"].get("p50")}
                 for c in v[label] if c["n"]]
        if cases:
            table(pd.DataFrame(cases),"Simulated widths and activation · no policy promoted","trend_frontier")
        else:
            st.caption("No qualifying observable-prefix episodes for this replay slice.")
        timing = [{"Entry clock":k,"Direction":b,"Healthy":x["outcomes"].get("healthy",0),
                   "Recovered n":x["recovered"]["n"],"Median ($/oz)":x["recovered"].get("p50")}
                  for k,p in packet["long"]["timing"].items() for b,x in p.items() if b==side]
        table(pd.DataFrame(timing),"Five-session entry-time sensitivity · separate overlapping cohorts","trend_timing")
        for line in packet["briefing"]["email"][-3:]:
            st.caption(line)
        checks = projection["checks"]
        monthly = [{"Archive":name,"Nonoverlapping windows":checks[key]["nonoverlappingWindows"],
                    **{side:part["recovered"]["n"] for side,part in checks[key]["directions"].items()}}
                   for key,name in (("archiveFullMonthly","EV full session"),("archiveCoreMonthly","EV core hours"),
                                    ("recentCoreMonthly","HistData core hours"))]
        table(pd.DataFrame(monthly),"First 20 weekdays · monthly sensitivity (not pooled)","trend_monthly_probe")
        normalized = [{"Direction":side,"Archive fit":p["fitN"],"Later archive":p["archiveCheckN"],
                       "Recent HistData":p["recentCheckN"],"Fit p75 available":p["fitP75"] is not None}
                      for side,p in checks["weeklyNormalized"].items()]
        table(pd.DataFrame(normalized),"Weekly volatility normalization · insufficient fit and recent coverage","trend_normalized_probe")
