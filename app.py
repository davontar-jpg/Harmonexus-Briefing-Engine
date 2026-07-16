import io
import html
import json
import os
import re
from pathlib import Path
from typing import Any, Dict, Iterable, Optional

import pandas as pd
import plotly.graph_objects as go
import streamlit as st

import hel_cartographer as hel
from hel_runtime import SemanticTokenRole
from market_calendar_watch import get_market_calendar_watch
from security_redaction import redact_dataframe, redact_for_display, sensitive_values_from_mapping

APP_NAME = "HARMONEXUS"
APP_SUBTITLE = "Cross-Asset Intelligence System"
DEFAULT_WORKBOOK = Path(__file__).parent / "data" / "Market_Machine_Dashboard_v4_7_BriefingEngine.xlsx"
FAMILIES = {"All": None, "Metals": "metal", "Equities": "equity", "FX": "fx", "Rates": "rate"}

st.set_page_config(page_title=APP_NAME, page_icon="◈", layout="wide", initial_sidebar_state="collapsed")

st.markdown(r"""
<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Manrope:wght@400;500;600;700;800&display=swap');
:root{--bg:#06080b;--panel:#0d1117;--panel2:#111822;--line:rgba(255,255,255,.075);--text:#f3f5f7;--muted:#87909d;--cyan:#58d8e6;--green:#62d69a;--red:#ff6b78;--amber:#f0bd63}
html,body,[class*="css"]{font-family:Manrope,sans-serif}.stApp{background:radial-gradient(circle at 80% -10%,rgba(88,216,230,.09),transparent 28%),radial-gradient(circle at 8% 32%,rgba(120,90,255,.07),transparent 24%),var(--bg);color:var(--text)}
.block-container{max-width:1540px;padding:1rem 2.1rem 4rem}.stApp header{background:transparent}
[data-testid="stSidebar"]{background:#090c11;border-right:1px solid var(--line)}
h1,h2,h3{letter-spacing:-.045em}.mono{font-family:'DM Mono',monospace}.muted{color:var(--muted)}
.topbar{display:flex;align-items:center;justify-content:space-between;padding:8px 0 22px;border-bottom:1px solid var(--line);margin-bottom:22px}.brand{font-weight:800;letter-spacing:.18em;font-size:.9rem}.brand i{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--cyan);box-shadow:0 0 18px var(--cyan);margin-right:10px}.asof{font:500 .72rem 'DM Mono';color:var(--muted)}
.hero{position:relative;overflow:hidden;border:1px solid var(--line);border-radius:24px;padding:28px 30px;background:linear-gradient(125deg,rgba(19,27,38,.96),rgba(9,13,19,.92));box-shadow:0 28px 80px rgba(0,0,0,.28)}.hero:after{content:"";position:absolute;inset:-120% -30%;background:linear-gradient(100deg,transparent 43%,rgba(255,255,255,.035) 50%,transparent 57%);animation:sheen 8s linear infinite}@keyframes sheen{to{transform:translateX(38%)}}.hero h1{position:relative;z-index:1;margin:0;font-size:clamp(2rem,4vw,4.4rem);font-weight:700}.hero p{position:relative;z-index:1;color:var(--muted);max-width:720px;margin:10px 0 0}
.eyebrow{font:500 .68rem 'DM Mono';letter-spacing:.16em;text-transform:uppercase;color:var(--cyan);margin-bottom:10px}
.flip-shell{position:relative;display:block;min-height:205px;perspective:1200px;cursor:pointer;transition:transform .28s cubic-bezier(.2,.8,.2,1);isolation:isolate}.flip-shell:hover{transform:translateY(-5px) scale(1.008)}.flip-toggle{position:absolute;inset:0 auto auto 0;width:1px;height:1px;margin:0;opacity:0;pointer-events:auto}.flip-card-inner{position:relative;min-height:205px;transform-style:preserve-3d;-webkit-transform-style:preserve-3d;transform:translateZ(0);will-change:transform;transition:transform .62s cubic-bezier(.2,.78,.2,1)}.flip-toggle:checked+.flip-card-inner{transform:rotateY(180deg) translateZ(0)}.flip-shell:focus-visible .flip-card-inner{transform:rotateY(180deg) translateZ(0)}.flip-shell:focus-visible .flip-card-inner,.flip-toggle:focus-visible+.flip-card-inner{outline:2px solid var(--cyan);outline-offset:3px;border-radius:19px}
.signal-card{position:relative;overflow:hidden;min-height:205px;padding:20px;border:1px solid var(--line);border-radius:19px;background:linear-gradient(150deg,rgba(18,25,35,.98),rgba(10,14,20,.98));transition:border-color .28s,box-shadow .28s;box-sizing:border-box}.flip-shell:hover .signal-card{border-color:rgba(88,216,230,.28);box-shadow:0 24px 50px rgba(0,0,0,.34)}.signal-card:before{content:"";position:absolute;width:120px;height:120px;border-radius:50%;filter:blur(55px);opacity:.13;right:-30px;top:-40px;background:var(--tone)}
.card-face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;transform-style:preserve-3d;-webkit-transform-style:preserve-3d;will-change:transform}.card-front{transform:rotateY(0deg) translateZ(.1px);display:flex;flex-direction:column;padding:18px 20px 15px}.card-back{transform:rotateY(180deg) translateZ(.1px);display:flex;flex-direction:column;justify-content:space-between;padding:14px 16px 12px}.back-title{font:500 .66rem/1 'DM Mono';letter-spacing:.14em;color:var(--cyan);margin-bottom:2px}.alignment-row{display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid var(--line);font-size:.72rem;line-height:1.2}.alignment-row span{color:var(--muted)}.alignment-row b{font:500 .68rem/1.2 'DM Mono'}.agreement{display:flex;justify-content:space-between;align-items:end;margin-top:4px;line-height:1}.agreement strong{font:600 1.1rem/1 'DM Mono';color:var(--tone)}.regime-age{font:500 .59rem/1 'DM Mono';color:var(--muted);text-transform:uppercase;letter-spacing:.04em}.flip-hint{font:400 .53rem/1.1 'DM Mono';color:#59626f;text-align:right;margin-top:2px}
.card-head{display:flex;align-items:flex-start;justify-content:space-between;flex:0 0 auto}.ticker{font:500 .72rem 'DM Mono';letter-spacing:.09em;color:var(--muted)}.asset-name{font-weight:650;font-size:1rem;margin-top:4px}.reading{font-size:1.65rem;font-weight:700;line-height:1.05;letter-spacing:-.04em;margin-top:18px}.reading span{color:var(--tone)}.score{font:500 1.2rem 'DM Mono';color:var(--tone)}.confidence{height:3px;background:rgba(255,255,255,.07);border-radius:5px;margin-top:17px;overflow:hidden;flex:0 0 auto}.confidence i{display:block;height:100%;background:var(--tone);box-shadow:0 0 10px var(--tone)}.meta{display:flex;justify-content:space-between;font:400 .65rem 'DM Mono';color:var(--muted);margin-top:7px}.delta{padding:4px 7px;border-radius:7px;border:1px solid var(--line);font:500 .65rem 'DM Mono'}
.reliability{display:inline-flex;align-self:flex-start;margin-top:10px;padding:4px 8px;border:1px solid var(--line);border-radius:999px;font:500 .62rem 'DM Mono';letter-spacing:.05em;color:var(--muted)}
.panel{border:1px solid var(--line);border-radius:20px;background:rgba(13,17,23,.86);padding:21px;height:100%;box-shadow:inset 0 1px rgba(255,255,255,.025)}.panel-title{font-size:.76rem;text-transform:uppercase;letter-spacing:.12em;color:var(--muted);margin-bottom:18px}.driver{display:grid;grid-template-columns:1fr 62px 70px;gap:10px;align-items:center;padding:12px 0;border-bottom:1px solid var(--line);font-size:.84rem}.driver:last-child{border:0}.driver b{font:500 .72rem 'DM Mono';text-align:right}.driver em{font-style:normal;text-align:right;color:var(--muted);font-size:.72rem}
.brief{font-size:1.04rem;line-height:1.65;color:#d8dde4}.brief strong{color:var(--text)}
.pill{display:inline-flex;align-items:center;gap:7px;padding:7px 10px;border:1px solid var(--line);border-radius:999px;font:500 .66rem 'DM Mono';color:var(--muted);margin-right:6px}.pill i{width:6px;height:6px;border-radius:50%;background:var(--green);box-shadow:0 0 10px var(--green)}
.status-strip{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 18px}.status-chip{padding:7px 10px;border:1px solid var(--line);border-radius:999px;font:500 .65rem 'DM Mono';color:var(--muted);background:rgba(255,255,255,.02)}.status-chip.ok{color:#9be7bc;border-color:rgba(98,214,154,.25)}.status-chip.warn{color:#f3cc86;border-color:rgba(240,189,99,.28)}
[data-testid="stDataFrame"]{border:1px solid var(--line);border-radius:15px;overflow:hidden}.stTabs [data-baseweb="tab-list"]{gap:26px;border-bottom:1px solid var(--line)}.stTabs [data-baseweb="tab"]{font-size:.78rem;letter-spacing:.04em;padding:12px 0}.stButton button{border-radius:999px;border:1px solid rgba(88,216,230,.24);background:rgba(88,216,230,.07);color:var(--text)}
@media(max-width:700px){.block-container{padding:.7rem .8rem 3rem}.hero{padding:22px 19px;border-radius:18px}.topbar{padding-bottom:14px}.signal-card,.flip-shell,.flip-card-inner{min-height:180px}.card-front{padding:15px 18px 12px}.reading{margin-top:12px;font-size:1.5rem}.confidence{margin-top:13px}.meta{margin-top:6px}.reliability{margin-top:8px}.card-back{padding:11px 14px 9px}.back-title{font-size:.62rem}.alignment-row{padding:2px 0;font-size:.69rem}.alignment-row b{font-size:.65rem}.agreement{margin-top:3px}.agreement strong{font-size:1rem}.regime-age{font-size:.55rem}.flip-hint{font-size:.5rem}.hero p{font-size:.85rem}}
</style>
""", unsafe_allow_html=True)
st.markdown(hel.css(), unsafe_allow_html=True)
st.markdown(hel.operator_shell_css(), unsafe_allow_html=True)


def safe_json(value: Any, default):
    if isinstance(value, (list, dict)):
        return value
    try:
        return json.loads(value) if value not in (None, "") else default
    except Exception:
        return default


@st.cache_data(show_spinner=False)
def load_workbook(file_bytes: Optional[bytes]) -> Dict[str, pd.DataFrame]:
    source = io.BytesIO(file_bytes) if file_bytes else DEFAULT_WORKBOOK
    excel = pd.ExcelFile(source)
    return {name: pd.read_excel(excel, sheet_name=name) for name in excel.sheet_names}


@st.cache_data(show_spinner=False, ttl=300)
def load_google_sheet(spreadsheet_id: str, service_account_info: Dict[str, Any]) -> Dict[str, pd.DataFrame]:
    import gspread

    client = gspread.service_account_from_dict(service_account_info)
    workbook = client.open_by_key(spreadsheet_id)
    result: Dict[str, pd.DataFrame] = {}
    for worksheet in workbook.worksheets():
        values = worksheet.get_all_values()
        if not values:
            result[worksheet.title] = pd.DataFrame()
            continue
        width = max(len(row) for row in values)
        padded = [row + [""] * (width - len(row)) for row in values]
        headers, seen = [], {}
        for index, value in enumerate(padded[0]):
            base = str(value).strip() or f"Column_{index + 1}"
            seen[base] = seen.get(base, 0) + 1
            headers.append(base if seen[base] == 1 else f"{base}_{seen[base]}")
        result[worksheet.title] = pd.DataFrame(padded[1:], columns=headers)
    return result


def streamlit_secrets() -> Dict[str, Any]:
    try:
        return dict(st.secrets)
    except Exception:
        return {}


def freshness_state(scores: pd.DataFrame) -> tuple[str, str]:
    if "As Of" not in scores or scores.empty:
        return "UNKNOWN", "warn"
    parsed = pd.to_datetime(scores["As Of"], errors="coerce", utc=True).dropna()
    if parsed.empty:
        return "UNKNOWN", "warn"
    hours = max(0.0, (pd.Timestamp.now(tz="UTC") - parsed.max()).total_seconds() / 3600)
    return (f"FRESH {hours:.0f}H", "ok") if hours <= 48 else (f"STALE {hours:.0f}H", "warn")


def legacy_scores(data: Dict[str, pd.DataFrame]) -> pd.DataFrame:
    frame = data.get("Signal_Engine", pd.DataFrame()).copy()
    if frame.empty or "Asset" not in frame.columns:
        return pd.DataFrame(columns=["Instrument", "Name", "Family", "Direction", "Strength", "Confidence"])
    direction = frame.get("Final Machine Reading", frame.get("Machine Bias", "Neutral"))
    zero = pd.Series(0.0, index=frame.index)
    bull = pd.to_numeric(frame.get("Final Bullish %", frame.get("Weighted Bullish %", zero)), errors="coerce").fillna(0)
    bear = pd.to_numeric(frame.get("Final Bearish %", frame.get("Weighted Bearish %", zero)), errors="coerce").fillna(0)
    confidence = (pd.concat([bull, bear], axis=1).max(axis=1) * 100).clip(0, 100)
    strength = (1 + confidence * .09).clip(1, 10)
    return pd.DataFrame({
        "Instrument": frame["Asset"], "Name": frame["Asset"], "Family": "legacy",
        "Direction": direction.astype(str).str.replace("Strong ", "", regex=False).str.replace("Moderate ", "", regex=False).str.replace(" / Mixed", "", regex=False),
        "Strength": strength.round(1), "Directional Score": ((bull - bear) * 10).round(1), "Confidence": confidence.round(),
        "Strongest Drivers": frame.get("Final Score Notes", frame.get("Evidence Text", "")), "Contradictions": "[]",
        "Score Change": None, "Material Change": False, "As Of": frame.get("Last Updated", "")
    })


def score_frame(data: Dict[str, pd.DataFrame]) -> pd.DataFrame:
    scores = data.get("Instrument_Scores", pd.DataFrame()).copy()
    if scores.empty or "Instrument" not in scores.columns:
        return legacy_scores(data)
    for col in ["Strength", "Directional Score", "Confidence", "Score Change"]:
        if col in scores:
            scores[col] = pd.to_numeric(scores[col], errors="coerce")
    return scores


def enrich_score_context(data: Dict[str, pd.DataFrame], scores: pd.DataFrame) -> pd.DataFrame:
    scores = scores.copy()
    if "Regime" not in scores:
        scores["Regime"] = scores.get("Direction", "Neutral")
    if "Regime Age (Trading Days)" not in scores:
        scores["Regime Age (Trading Days)"] = 0
    ages = pd.to_numeric(scores["Regime Age (Trading Days)"], errors="coerce").fillna(0)
    history = data.get("Score_History", pd.DataFrame()).copy()
    if not history.empty and {"Instrument", "Direction", "As Of"}.issubset(history.columns):
        history["_date"] = pd.to_datetime(history["As Of"], errors="coerce", utc=True)
        for index, row in scores.iterrows():
            if ages.loc[index] > 0:
                continue
            instrument = str(row.get("Instrument", ""))
            regime = str(row.get("Regime", row.get("Direction", "Neutral")))
            current = pd.to_datetime(row.get("As Of"), errors="coerce", utc=True)
            seen, age = set(), 0
            if not pd.isna(current) and current.weekday() < 5:
                seen.add(current.date())
                age = 1
            subset = history[history["Instrument"].astype(str).str.upper() == instrument.upper()].sort_values("_date", ascending=False)
            for _, prior in subset.iterrows():
                when = prior.get("_date")
                if pd.isna(when) or when.weekday() >= 5 or when.date() in seen:
                    continue
                if str(prior.get("Regime", prior.get("Direction", "Neutral"))) != regime:
                    break
                seen.add(when.date())
                age += 1
            ages.loc[index] = age
    scores["Regime Age (Trading Days)"] = ages.astype(int)
    return scores


def tone(direction: str) -> str:
    d = str(direction).lower()
    return "var(--hel-color-semantic-signal-primary)" if "bull" in d else "var(--hel-color-semantic-signal-critical)" if "bear" in d else "var(--hel-color-semantic-signal-secondary)"


def plotly_tone(direction: str) -> str:
    d = str(direction).lower()
    role = (
        SemanticTokenRole.ENVIRONMENTAL_ROUTE_ACCENT
        if "bull" in d
        else SemanticTokenRole.CARTOGRAPHIC_RISK
        if "bear" in d
        else SemanticTokenRole.ENVIRONMENTAL_ROUTE_SECONDARY
    )
    return hel.environment_runtime().plotly_color(role)


def plotly_palette() -> Dict[str, str]:
    """Return renderer-safe values from the centralized dual-HEL resolver."""

    runtime = hel.environment_runtime()
    return {
        "route": runtime.plotly_color(SemanticTokenRole.ENVIRONMENTAL_ROUTE_ACCENT),
        "secondary": runtime.plotly_color(SemanticTokenRole.ENVIRONMENTAL_ROUTE_SECONDARY),
        "risk": runtime.plotly_color(SemanticTokenRole.CARTOGRAPHIC_RISK),
        "text": runtime.plotly_color(SemanticTokenRole.WORLD_CONTENT_PRIMARY),
        "muted": runtime.plotly_color(SemanticTokenRole.OPERATOR_CONTENT_SECONDARY),
        "instrument": runtime.plotly_color(SemanticTokenRole.OPERATOR_INSTRUMENT_SURFACE),
    }


def plotly_alpha(color: str, alpha: float) -> str:
    """Apply opacity to a resolver-provided hex value without inventing a color."""

    value = color.lstrip("#")
    red, green, blue = (int(value[index:index + 2], 16) for index in (0, 2, 4))
    return f"rgba({red},{green},{blue},{max(0.0, min(1.0, alpha)):.3f})"


def relationship_intelligence(data: Dict[str, pd.DataFrame]) -> Dict[str, Any]:
    """Read the latest persisted relationship result without recalculating it."""

    cache = data.get("Relationship_Cache", pd.DataFrame())
    if cache.empty:
        return {}
    row = cache.iloc[-1]
    payload = row.get("Payload JSON", row.get("Payload", ""))
    parsed = safe_json(payload, {})
    return parsed if isinstance(parsed, dict) else {}


def exact_list(value: Any) -> list[str]:
    """Normalize an existing list-shaped field for display; never create evidence."""

    parsed = safe_json(value, value)
    if isinstance(parsed, list):
        return [str(item) for item in parsed if str(item).strip()]
    if isinstance(parsed, str) and parsed.strip():
        return [parsed.strip()]
    return []


def scenario_readouts(row: pd.Series) -> list[tuple[str, str, str]]:
    """Expose scenario fields already published by the engine, preserving UNKNOWN."""

    candidates = (
        ("Expected direction", ("Expected Direction", "Direction", "Regime")),
        ("Confirmation", ("Confirmation", "Watch Conditions", "Confirming Condition")),
        ("Risk state", ("Risk State", "Risk")),
        ("Invalidation", ("Invalidation",)),
    )
    output = []
    for label, keys in candidates:
        value = next((row.get(key) for key in keys if key in row and str(row.get(key, "")).strip()), "UNKNOWN")
        output.append((label, str(value), "Published engine field" if value != "UNKNOWN" else "Evidence unavailable"))
    return output


def seasonal_watch(row: pd.Series) -> Optional[Dict[str, Any]]:
    watch = safe_json(row.get("Seasonal Watch", ""), None)
    return watch if isinstance(watch, dict) and watch.get("title") else None


def context_alignment(row: pd.Series) -> tuple[Dict[str, str], int]:
    trace = safe_json(row.get("Explanation Trace", "{}"), {})
    contributions = trace.get("factorContributions", []) if isinstance(trace, dict) else []
    if not contributions:
        contributions = driver_rows(row)
    factor_map: Dict[str, float] = {}
    for item in contributions:
        factor = str(item.get("factor", "")).upper()
        factor_map[factor] = factor_map.get(factor, 0.0) + float(item.get("contribution", 0) or 0)

    def label(factors) -> str:
        value = sum(factor_map.get(factor, 0.0) for factor in factors)
        return "Bullish" if value > .03 else "Bearish" if value < -.03 else "Neutral"

    watch = seasonal_watch(row)
    context = {
        "Trend": label(["TREND"]),
        "Positioning": label(["POSITIONING", "COMMERCIAL", "OI"]),
        "Seasonality": str(watch.get("bias", "Neutral")) if watch else label(["SEASONALITY"]),
        "Macro": label(["DXY", "FED", "INFLATION", "RISK"]),
        "Yields": label(["REAL10Y", "US2Y", "US5Y", "US10Y", "US30Y"]),
    }
    direction = str(row.get("Regime", row.get("Direction", "Neutral")))
    directional = [value for value in context.values() if value != "Neutral"]
    if direction in ("Bullish", "Bearish") and directional:
        agreement = round(100 * sum(value == direction for value in directional) / len(directional))
    elif directional:
        agreement = round(100 * max(directional.count("Bullish"), directional.count("Bearish")) / len(directional))
    else:
        agreement = 0
    return context, agreement


def card(row: pd.Series):
    direction = str(redact_for_display(row.get("Direction", "Neutral"), display_secret_values))
    strength = float(row.get("Strength", 1) or 1)
    confidence = int(float(row.get("Confidence", 0) or 0))
    delta = row.get("Score Change")
    delta_text = "NEW" if pd.isna(delta) else f"{float(delta):+.1f}"
    reliability = str(redact_for_display(row.get("Reliability", row.get("Evidence Status", "Uncalibrated")), display_secret_values))
    instrument = str(redact_for_display(row.get("Instrument", ""), display_secret_values))
    name = str(redact_for_display(row.get("Name", instrument), display_secret_values))
    regime_age = int(float(row.get("Regime Age (Trading Days)", 0) or 0))
    context, agreement = context_alignment(row)
    card_id = "flip-" + re.sub(r"[^a-zA-Z0-9_-]", "-", instrument)
    alignment = "".join(
        f'<div class="hel-context-row"><span>{html.escape(label)}</span><b style="color:{tone(value)}">{html.escape(value)}</b></div>'
        for label, value in context.items()
    )
    st.markdown(f"""
    <label class="flip-shell" for="{card_id}" tabindex="0" aria-label="Flip {html.escape(instrument)} context card" aria-controls="{card_id}" {hel.contract_attributes(hel.ComponentRole.BRIEFING_CARD)}>
      <input class="flip-toggle" id="{card_id}" type="checkbox" role="switch" aria-label="Show {html.escape(instrument)} context alignment" tabindex="-1">
      <div class="flip-card-inner">
        <div class="hel-surface hel-map-card card-face card-front" {hel.contract_attributes(hel.ComponentRole.BRIEFING_CARD)} style="--tone:{tone(direction)};--confidence:{confidence}%">
          <div class="hel-card-head"><div><div class="hel-ticker">{html.escape(instrument)}</div><div class="hel-asset">{html.escape(name)}</div></div><div class="hel-delta">{delta_text}</div></div>
          <div class="hel-reading"><span>{html.escape(direction)}</span> <small class="hel-score">{strength:.1f}/10</small></div>
          <div class="hel-confidence" {hel.contract_attributes(hel.ComponentRole.CONFIDENCE_INSTRUMENT)}><i></i></div>
          <div class="hel-meta"><span>CONFIDENCE</span><span>{confidence}%</span></div>
          <div class="hel-reliability">{html.escape(reliability.upper())}</div>
        </div>
        <div class="hel-surface hel-map-card card-face card-back" {hel.contract_attributes(hel.ComponentRole.CONTEXT_CARD_BACK)} style="--tone:{tone(direction)};--confidence:{confidence}%">
          <div><div class="hel-title">CONTEXT ALIGNMENT<strong>{html.escape(direction)} · {confidence}% confidence</strong></div>{alignment}</div>
          <div><div class="agreement"><span class="regime-age">Age: {regime_age} trading days</span><strong>{agreement}%</strong></div><div class="flip-hint">AGREEMENT · TAP TO RETURN</div></div>
        </div>
      </div>
    </label>""", unsafe_allow_html=True)


def driver_rows(row: pd.Series):
    drivers = safe_json(row.get("Strongest Drivers", "[]"), [])
    if isinstance(drivers, str):
        return [{"factor": "Evidence stack", "contribution": 0, "signal": drivers}]
    return drivers[:5]


def signal_audit_rows(data: Dict[str, pd.DataFrame], instrument: str, score: pd.Series) -> pd.DataFrame:
    signals = data.get("Calculated_Signals", pd.DataFrame()).copy()
    if not signals.empty and "Instrument" in signals:
        signals = signals[signals["Instrument"].astype(str).str.upper() == instrument.upper()]
    drivers = pd.DataFrame(driver_rows(score))
    if signals.empty:
        return drivers
    rename = {"Normalized Signal": "signal", "Raw Value": "rawValue", "Source": "source", "Quality": "quality", "As Of": "asOf", "Factor": "factor"}
    signals = signals.rename(columns=rename)
    if drivers.empty or "factor" not in drivers:
        return signals
    keep = [c for c in ["factor", "weight", "contribution"] if c in drivers]
    return signals.merge(drivers[keep], on="factor", how="left")


def gauge(row: pd.Series):
    value = float(row.get("Directional Score", 0) or 0)
    color = plotly_tone(row.get("Direction", "Neutral"))
    palette = plotly_palette()
    fig = go.Figure(go.Indicator(mode="gauge+number", value=value, number={"suffix":" / 10","font":{"size":28,"color":color}}, gauge={"axis":{"range":[-10,10],"tickcolor":palette["muted"]},"bar":{"color":color,"thickness":.2},"bgcolor":palette["instrument"],"borderwidth":0,"steps":[{"range":[-10,-1.5],"color":plotly_alpha(palette["risk"], .13)},{"range":[-1.5,1.5],"color":plotly_alpha(palette["secondary"], .11)},{"range":[1.5,10],"color":plotly_alpha(palette["route"], .13)}]}))
    fig.update_layout(height=240,margin=dict(l=20,r=20,t=30,b=10),paper_bgcolor=palette["instrument"],plot_bgcolor=palette["instrument"],font={"family":"IBM Plex Mono","color":palette["muted"]})
    return fig


def history_figure(history: pd.DataFrame, instrument: str) -> Optional[go.Figure]:
    """Plot published history values only; return None when the contract is absent."""

    if history.empty or "Instrument" not in history:
        return None
    frame = history[history["Instrument"].astype(str).str.upper() == instrument.upper()].copy()
    time_col = next((col for col in ("As Of", "Timestamp", "Date") if col in frame), None)
    value_col = next((col for col in ("Directional Score", "Strength") if col in frame), None)
    if frame.empty or time_col is None or value_col is None:
        return None
    frame[time_col] = pd.to_datetime(frame[time_col], errors="coerce", utc=True)
    frame[value_col] = pd.to_numeric(frame[value_col], errors="coerce")
    frame = frame.dropna(subset=[time_col, value_col]).sort_values(time_col)
    if frame.empty:
        return None
    palette = plotly_palette()
    fig = go.Figure(
        go.Scatter(
            x=frame[time_col],
            y=frame[value_col],
            mode="lines+markers",
            line={"color": palette["route"], "width": 2},
            marker={"color": palette["secondary"], "size": 6},
            hovertemplate=f"%{{x|%Y-%m-%d}}<br>{html.escape(value_col)}: %{{y:.2f}}<extra></extra>",
        )
    )
    fig.update_layout(
        height=286,
        margin=dict(l=42, r=18, t=24, b=38),
        paper_bgcolor=palette["instrument"],
        plot_bgcolor=palette["instrument"],
        font={"family": "IBM Plex Mono", "color": palette["muted"], "size": 11},
        hovermode="x unified",
        xaxis={"title": "Time", "gridcolor": palette["muted"], "zeroline": False},
        yaxis={"title": value_col, "gridcolor": palette["muted"], "zerolinecolor": palette["secondary"]},
    )
    return fig


def consensus_figure(macro: Dict[str, Any]) -> Optional[go.Figure]:
    """Render the cached Macro Consensus Score without recalculating it."""

    if macro.get("score") is None:
        return None
    palette = plotly_palette()
    score = float(macro["score"])
    fig = go.Figure(
        go.Bar(
            x=[score],
            y=["Consensus"],
            orientation="h",
            marker={"color": palette["route"]},
            text=[f"{score:.0f} / 100"],
            textposition="inside",
            insidetextanchor="end",
            textfont={"family": "IBM Plex Mono", "size": 18, "color": palette["instrument"]},
            hovertemplate="Macro Consensus: %{x:.0f}/100<extra></extra>",
        )
    )
    fig.add_vrect(x0=0, x1=50, fillcolor=plotly_alpha(palette["risk"], .12), line_width=0, layer="below")
    fig.add_vrect(x0=50, x1=70, fillcolor=plotly_alpha(palette["secondary"], .13), line_width=0, layer="below")
    fig.add_vrect(x0=70, x1=100, fillcolor=plotly_alpha(palette["route"], .12), line_width=0, layer="below")
    fig.update_layout(
        height=180,
        margin=dict(l=24, r=28, t=34, b=36),
        paper_bgcolor=palette["instrument"],
        plot_bgcolor=palette["instrument"],
        font={"family": "IBM Plex Mono", "color": palette["muted"]},
        showlegend=False,
        xaxis={"range": [0, 100], "title": "Confirmation score", "gridcolor": plotly_alpha(palette["muted"], .18)},
        yaxis={"showticklabels": False},
    )
    return fig


def render_data_instrument(
    frame: pd.DataFrame,
    title: str,
    *,
    key: str,
    source: str,
    freshness: str,
    state: str,
    display_values: Iterable[str],
):
    """Render a selectable native data grid inside registered HEL-028 housing."""

    display = redact_dataframe(frame, display_values)
    st.markdown(
        hel.data_instrument_header(
            title,
            len(display),
            source=source,
            freshness=freshness,
            state=state,
        ),
        unsafe_allow_html=True,
    )
    if display.empty:
        st.markdown(
            hel.empty_state(
                f"{title} unavailable",
                "No observations are present in the selected source contract.",
            ),
            unsafe_allow_html=True,
        )
        return None
    return st.dataframe(
        display,
        width="stretch",
        hide_index=True,
        key=key,
        on_select="rerun",
        selection_mode="single-row",
    )


def render_chart_instrument(
    fig: Optional[go.Figure],
    title: str,
    detail: str,
    *,
    key: str,
    role: hel.ComponentRole = hel.ComponentRole.CHART_AND_GAUGE,
    state: str = "informational",
    inspection_tools: bool = False,
):
    """Mount an exact Plotly readout in dual-HEL chart housing."""

    if fig is None:
        st.markdown(hel.empty_state(f"{title} unavailable", "No published observations are available for this analytical view."), unsafe_allow_html=True)
        return
    st.markdown(hel.chart_instrument_header(title, detail, role=role, state=state), unsafe_allow_html=True)
    config = {"displayModeBar": inspection_tools, "displaylogo": False, "scrollZoom": False}
    st.plotly_chart(fig, width="stretch", config=config, key=key)


def render_primary_briefing(filtered: pd.DataFrame, freshness: str, freshness_state_name: str):
    """Present already-published score evidence as an institutional briefing surface."""

    focus = filtered.sort_values("Strength", ascending=False).iloc[0]
    drivers = driver_rows(focus)
    primary_driver = str(drivers[0].get("factor", "UNKNOWN")) if drivers else "UNKNOWN"
    regime = str(focus.get("Regime", focus.get("Direction", "Neutral")))
    confidence = float(focus.get("Confidence", 0) or 0)
    strength = float(focus.get("Strength", 1) or 1)
    instrument = str(focus.get("Instrument", "UNKNOWN"))
    left, right = st.columns([1.04, .96])
    with left:
        st.markdown(
            hel.analytical_instrument(
                "Morning market briefing",
                "PRIMARY BRIEFING · PUBLISHED EVIDENCE",
                [
                    ("Priority instrument", instrument, "Highest published strength"),
                    ("Regime", regime, f"Age {int(float(focus.get('Regime Age (Trading Days)', 0) or 0))} trading days"),
                    ("Strength", f"{strength:.1f}/10", "Existing composite reading"),
                    ("Confidence", f"{confidence:.0f}%", str(focus.get("Reliability", focus.get("Evidence Status", "Uncalibrated")))),
                    ("Source freshness", freshness, "Live evidence remains authoritative"),
                ],
                role=hel.ComponentRole.PRIMARY_BRIEFING,
                state=freshness_state_name,
                narrative=f"Primary driver: {primary_driver}. Decision support only; historical context does not override live market evidence.",
            ),
            unsafe_allow_html=True,
        )
    with right:
        contradictions = exact_list(focus.get("Contradictions", "[]"))
        st.markdown(
            hel.analytical_list(
                "Key contradictions",
                f"{instrument} · EVIDENCE CONFLICTS",
                [(item, "CONTRADICTION") for item in contradictions[:4]],
                role=hel.ComponentRole.CONTRADICTION_ANALYSIS,
                state="warning" if contradictions else "acknowledged",
                empty_message="No published contradictions in the current reading.",
            ),
            unsafe_allow_html=True,
        )
    priorities = filtered.sort_values("Strength", ascending=False).head(3)
    st.markdown(
        hel.analytical_list(
            "Priority instruments",
            "DECISION RAIL · RELATIVE EVIDENCE STRENGTH",
            [
                (
                    f"{index + 1} · {row.get('Instrument', 'UNKNOWN')}",
                    f"{row.get('Direction', 'Neutral')} {float(row.get('Strength', 1) or 1):.1f}/10 · {float(row.get('Confidence', 0) or 0):.0f}%",
                )
                for index, (_, row) in enumerate(priorities.iterrows())
            ],
            role=hel.ComponentRole.PRIORITY_INSTRUMENTS,
            state="informational",
        ),
        unsafe_allow_html=True,
    )


def render_relationship_surfaces(data: Dict[str, pd.DataFrame]):
    """Render cached cross-asset and lead-lag intelligence without recomputation."""

    intel = relationship_intelligence(data)
    macro = intel.get("macroConsensus", {}) if isinstance(intel, dict) else {}
    lead_lag = intel.get("leadLag", {}) if isinstance(intel, dict) else {}
    score = macro.get("score")
    available = score is not None and int(macro.get("evaluated", 0) or 0) > 0
    left, right = st.columns(2)
    with left:
        st.markdown(
            hel.analytical_instrument(
                "Cross-asset consensus",
                "MACRO GEOGRAPHY · CACHED RELATIONSHIPS",
                [
                    ("Consensus score", f"{float(score):.0f}/100" if available else "UNKNOWN", "Supplemental confidence only"),
                    ("Classification", str(macro.get("confidence", "UNKNOWN")), "Published relationship class"),
                    ("Coverage", f"{float(macro.get('coverage', 0)):.0f}%" if available else "UNKNOWN", "Synchronized relationships"),
                    ("Evaluated", str(macro.get("evaluated", "UNKNOWN")), f"Unknown {macro.get('unknown', 'UNKNOWN')}"),
                ],
                role=hel.ComponentRole.CROSS_ASSET_CONSENSUS,
                state="nominal" if available else "unavailable",
            ),
            unsafe_allow_html=True,
        )
        render_chart_instrument(
            consensus_figure(macro),
            "Macro consensus pressure",
            "Cached 0–100 confirmation score; never a directional signal.",
            key="macro_consensus_chart",
            role=hel.ComponentRole.RELATIONSHIP_VISUALIZATION,
            state="nominal" if available else "unavailable",
        )
    with right:
        supported = int(lead_lag.get("supportedCount", 0) or 0)
        leaders = exact_list(lead_lag.get("currentLeaders", []))
        followers = exact_list(lead_lag.get("currentFollowers", []))
        st.markdown(
            hel.analytical_instrument(
                "Lead-lag watch",
                "ROUTES · EARLY AND LATE CONFIRMATION",
                [
                    ("Confidence", str(lead_lag.get("confidence", "UNKNOWN")), "Statistical reliability"),
                    ("Supported pairs", str(supported) if supported else "UNKNOWN", "Weak relationships excluded"),
                    ("Current leaders", ", ".join(leaders) if leaders else "UNKNOWN", "Early confirmation"),
                    ("Current followers", ", ".join(followers) if followers else "UNKNOWN", "Late confirmation"),
                ],
                role=hel.ComponentRole.RELATIONSHIP_VISUALIZATION,
                state="nominal" if supported else "unavailable",
                narrative=str(lead_lag.get("note", "Insufficient cached relationship evidence.")),
            ),
            unsafe_allow_html=True,
        )
        confirmations = exact_list(macro.get("confirmations", []))
        conflicts = exact_list(macro.get("contradictions", []))
        items = [(item, "CONFIRMS") for item in confirmations[:3]] + [(item, "CONTRADICTS") for item in conflicts[:3]]
        st.markdown(
            hel.analytical_list(
                "Relationship evidence",
                "CONFIRMATIONS · CONTRADICTIONS",
                items,
                role=hel.ComponentRole.CROSS_ASSET_CONSENSUS,
                state="warning" if conflicts else "nominal" if confirmations else "unavailable",
                empty_message="UNKNOWN — relationship cache has no synchronized evidence.",
            ),
            unsafe_allow_html=True,
        )


def render_calendar_surfaces():
    """Expose the existing calendar-watch output as auction context, never direction."""

    watch = get_market_calendar_watch()
    conditions = list(watch.get("calendar_conditions", [])) + list(watch.get("major_catalysts", []))
    adjustment = watch.get("historical_auction_adjustment", "UNKNOWN")
    if isinstance(adjustment, dict):
        adjustment = adjustment.get("current_week", adjustment.get("normal_week", "UNKNOWN"))
    assessment = watch.get("operational_assessment", "UNKNOWN")
    if isinstance(assessment, list):
        assessment = " ".join(str(item) for item in assessment)
    state = "warning" if watch.get("week_structure") != "NORMAL_WEEK" else "nominal"
    left, right = st.columns(2)
    with left:
        st.markdown(
            hel.analytical_instrument(
                "Calendar and week structure",
                "MARKET CALENDAR · SESSION GEOGRAPHY",
                [
                    ("Week structure", str(watch.get("week_structure", "UNKNOWN")), "Exchange-session structure"),
                    ("Confidence", str(watch.get("confidence", "UNKNOWN")), "Calendar-rule coverage"),
                    ("Conditions", str(len(conditions)), "Closures, early closes, catalysts"),
                ],
                role=hel.ComponentRole.CALENDAR_STRUCTURE,
                state=state,
                narrative=" · ".join(conditions[:3]) if conditions else "No qualifying calendar distortion is published for the current week.",
            ),
            unsafe_allow_html=True,
        )
    with right:
        st.markdown(
            hel.analytical_instrument(
                "Auction rhythm",
                "WEEK STRUCTURE · LIQUIDITY DISCIPLINE",
                [
                    ("Rhythm risk", f"{float(watch.get('market_rhythm_risk', 0)):.1f}/10", "Existing calendar-watch result"),
                    ("Liquidity", f"{float(watch.get('liquidity_score', 0)):.1f}/10", "Existing calendar-watch result"),
                    ("Adjustment", str(adjustment), "Context only"),
                ],
                role=hel.ComponentRole.AUCTION_RHYTHM,
                state="warning" if float(watch.get("market_rhythm_risk", 0)) >= 6 else "informational",
                narrative=str(assessment),
            ),
            unsafe_allow_html=True,
        )


def render_scenario_surface(row: pd.Series):
    st.markdown(
        hel.analytical_instrument(
            "Scenario and invalidation",
            f"{row.get('Instrument', 'UNKNOWN')} · PUBLISHED DECISION BOUNDARIES",
            scenario_readouts(row),
            role=hel.ComponentRole.SCENARIO_ANALYSIS,
            state="warning" if str(row.get("Invalidation", "")).strip() else "unavailable",
            narrative="No scenario is inferred: unavailable fields remain UNKNOWN.",
        ),
        unsafe_allow_html=True,
    )
    st.markdown(hel.risk_instrument(row.get("Risk State", row.get("Risk", "Unavailable")), row.get("Invalidation", "Unavailable")), unsafe_allow_html=True)


secrets = streamlit_secrets()
display_secret_values = sensitive_values_from_mapping(secrets)
source_options = ["Bundled demo", "Upload workbook", "Live Google Sheets"]
live_sheet_configured = bool(
    (secrets.get("GOOGLE_SHEET_ID") or os.getenv("GOOGLE_SHEET_ID"))
    and secrets.get("gcp_service_account")
)

with st.sidebar:
    st.markdown(
        hel.operator_panel_heading(
            "Operator apparatus",
            "Source · route · instrument · sensory discipline",
        ),
        unsafe_allow_html=True,
    )
    st.markdown(hel.control_legend("Source mode", "Lineage and credential route", role=hel.ComponentRole.SOURCE_SELECTOR), unsafe_allow_html=True)
    source_mode = st.radio("Source mode", source_options, index=2 if live_sheet_configured else 0, label_visibility="collapsed")
    if source_mode == "Upload workbook":
        st.markdown(hel.control_legend("Workbook handoff", "Local evidence contract", role=hel.ComponentRole.SOURCE_SELECTOR), unsafe_allow_html=True)
        uploaded = st.file_uploader("Upload engine workbook", type=["xlsx"], label_visibility="collapsed")
    else:
        uploaded = None
    st.markdown(hel.control_legend("Workspace", "Cartographic destination", role=hel.ComponentRole.GLOBAL_NAVIGATION), unsafe_allow_html=True)
    page = st.radio("Workspace", ["Overview", "Instrument Lab", "Signal Audit", "Operations", "Data Explorer"], label_visibility="collapsed")
    st.markdown(hel.control_legend("Universe", "Instrument family filter", role=hel.ComponentRole.FILTER_CONTROL), unsafe_allow_html=True)
    family = st.selectbox("Universe", list(FAMILIES), label_visibility="collapsed")
    st.markdown(hel.control_legend("Sensory discipline", "Environmental accessibility", role=hel.ComponentRole.OPERATOR_CONTROL), unsafe_allow_html=True)
    reduced_sensory = st.checkbox(
        "Reduced sensory",
        value=False,
        help="Removes environmental motion, optical texture, translucency, and depth effects.",
    )

if reduced_sensory:
    st.markdown(hel.reduced_sensory_css(), unsafe_allow_html=True)
    st.markdown(hel.operator_reduced_sensory_css(), unsafe_allow_html=True)

connection_status = "DEMO"
credential_status = "NOT REQUIRED"
loading_surface = st.empty()
loading_surface.markdown(
    hel.notice(
        "Mapping market terrain",
        "Resolving source lineage, freshness, and score contracts.",
        state="loading",
    ),
    unsafe_allow_html=True,
)
try:
    if source_mode == "Live Google Sheets":
        spreadsheet_id = secrets.get("GOOGLE_SHEET_ID") or os.getenv("GOOGLE_SHEET_ID")
        service_account = secrets.get("gcp_service_account")
        if not spreadsheet_id or not service_account:
            loading_surface.empty()
            st.markdown(
                hel.notice("Live Sheets unavailable", "Live mode requires GOOGLE_SHEET_ID and [gcp_service_account] in Streamlit secrets.", state="unavailable"),
                unsafe_allow_html=True,
            )
            st.stop()
        data = load_google_sheet(str(spreadsheet_id), dict(service_account))
        connection_status, credential_status = "LIVE SHEETS", "CONFIGURED"
    elif source_mode == "Upload workbook":
        if not uploaded:
            loading_surface.empty()
            st.markdown(
                hel.notice("Workbook handoff required", "Choose an .xlsx workbook to enter uploaded-workbook mode.", state="unavailable"),
                unsafe_allow_html=True,
            )
            st.stop()
        data = load_workbook(uploaded.getvalue())
        connection_status, credential_status = "UPLOADED", "NOT REQUIRED"
    else:
        data = load_workbook(None)
except Exception as exc:
    loading_surface.empty()
    safe_error = redact_for_display(str(exc), display_secret_values)
    st.markdown(
        hel.notice("Data source failed", f"Could not load the selected data source: {safe_error}", state="failed"),
        unsafe_allow_html=True,
    )
    st.stop()
loading_surface.empty()

scores = enrich_score_context(data, score_frame(data))
if scores.empty:
    st.markdown(
        hel.notice("No score field detected", "No score data is available yet. Run setupHarmonexus() and calculateAllScores(), or upload the legacy workbook.", state="unavailable"),
        unsafe_allow_html=True,
    )
    st.stop()

as_of = scores.get("As Of", pd.Series([""])).dropna().astype(str).max() if len(scores) else ""
freshness, freshness_class = freshness_state(scores)
contract_mode = "V5" if "Instrument_Scores" in data and not data.get("Instrument_Scores", pd.DataFrame()).empty else "V4.7 FALLBACK"
operational_freshness_state = "nominal" if freshness_class == "ok" else "stale"
st.markdown(
    hel.operator_rail(
        APP_NAME,
        as_of,
        [
            ("Source", connection_status, "success" if connection_status != "DEMO" else "passive"),
            ("Freshness", freshness, "success" if freshness_class == "ok" else "warning"),
            ("Contract", contract_mode, "success" if contract_mode == "V5" else "warning"),
            ("Credentials", credential_status, "success" if credential_status == "CONFIGURED" else "passive"),
        ],
    ),
    unsafe_allow_html=True,
)

if page == "Overview":
    st.markdown('<div class="hero"><div class="eyebrow">Market regime · evidence intelligence</div><h1>See the pressure<br>before the narrative.</h1><p>A cross-asset operating picture that separates observations, normalized evidence, calculated signals, directional scores, interpretation, and delivery.</p></div>', unsafe_allow_html=True)
    st.write("")
    filtered = scores
    target = FAMILIES[family]
    if target and "Family" in filtered:
        filtered = filtered[filtered["Family"].astype(str).str.contains(target, case=False, na=False)]
    if filtered.empty:
        st.markdown(
            hel.empty_state("No instruments in this universe", "The selected source has no published score rows for this instrument family."),
            unsafe_allow_html=True,
        )
        st.stop()
    cols = st.columns(4)
    for i, (_, row) in enumerate(filtered.head(20).iterrows()):
        with cols[i % 4]: card(row)
    st.write("")
    render_primary_briefing(filtered, freshness, operational_freshness_state)
    watches = [(row, seasonal_watch(row)) for _, row in filtered.iterrows() if seasonal_watch(row)]
    if watches:
        watch_cols = st.columns(min(2, len(watches)))
        for i, (watch_row, watch) in enumerate(watches[:2]):
            watch = redact_for_display(watch, display_secret_values)
            limited = " · LIMITED SAMPLE" if watch.get("limitedSample") else ""
            with watch_cols[i % len(watch_cols)]:
                st.markdown(
                    hel.analytical_instrument(
                        str(watch.get("title", "Seasonal Watch")),
                        f'{watch_row.get("Instrument", "UNKNOWN")} · SEASONAL WATCH{limited}',
                        [("Status", str(watch.get("status", "DEVELOPING")), "Historical context only")],
                        role=hel.ComponentRole.REGIME_STATE,
                        state="informational",
                        narrative=str(watch.get("detail", "")),
                    ),
                    unsafe_allow_html=True,
                )
    render_relationship_surfaces(data)
    render_calendar_surfaces()
    st.write("")
    left, right = st.columns([1.1, .9])
    focus = filtered.sort_values("Strength", ascending=False).iloc[0]
    with left:
        st.markdown(
            hel.analytical_list(
                "Highest-conviction evidence stack",
                f'{focus.get("Instrument", "UNKNOWN")} · PRIMARY DRIVERS',
                [
                    (
                        str(redact_for_display(item.get("factor", "Evidence"), display_secret_values)),
                        f'{float(item.get("contribution", 0) or 0):+.2f} · {redact_for_display(item.get("signal", ""), display_secret_values)}',
                    )
                    for item in driver_rows(focus)
                ],
                role=hel.ComponentRole.PRIMARY_BRIEFING,
                state="informational",
            ),
            unsafe_allow_html=True,
        )
    with right:
        render_chart_instrument(
            gauge(focus),
            "Directional pressure",
            f'{focus.get("Instrument", "UNKNOWN")} · exact composite score on the published −10…+10 axis.',
            key="overview_directional_pressure",
            role=hel.ComponentRole.CHART_AND_GAUGE,
        )

elif page == "Instrument Lab":
    st.markdown(
        hel.workspace_header(
            "Instrument Lab",
            "Inspect one mapped instrument without changing its published score contract.",
            code="SURVEY BAY · INSTRUMENT INSPECTION",
            role=hel.ComponentRole.INSTRUMENT_LAB,
        ),
        unsafe_allow_html=True,
    )
    st.markdown(hel.control_legend("Active instrument", "Select inspection target", role=hel.ComponentRole.INSTRUMENT_SELECTOR), unsafe_allow_html=True)
    selected = st.selectbox("Instrument", scores["Instrument"].tolist(), format_func=lambda value: str(redact_for_display(value, display_secret_values)), label_visibility="collapsed")
    row = scores[scores["Instrument"] == selected].iloc[0]
    st.markdown(
        hel.analytical_instrument(
            "Regime and confidence",
            f"{selected} · PUBLISHED MARKET STATE",
            [
                ("Regime", str(row.get("Regime", row.get("Direction", "Neutral"))), f"Age {int(float(row.get('Regime Age (Trading Days)', 0) or 0))} trading days"),
                ("Strength", f"{float(row.get('Strength', 1) or 1):.1f}/10", "Existing composite score"),
                ("Confidence", f"{float(row.get('Confidence', 0) or 0):.0f}%", str(row.get("Reliability", row.get("Evidence Status", "Uncalibrated")))),
                ("Freshness", freshness, connection_status),
            ],
            role=hel.ComponentRole.REGIME_STATE,
            state=operational_freshness_state,
        ),
        unsafe_allow_html=True,
    )
    a, b = st.columns([.72, 1.28])
    with a:
        card(row)
        render_chart_instrument(
            gauge(row),
            "Composite pressure",
            f"{selected} · published directional score.",
            key="instrument_lab_gauge",
            role=hel.ComponentRole.CHART_AND_GAUGE,
        )
    with b:
        st.markdown(hel.control_legend("Inspection layer", "Interpretation and evidence depth", role=hel.ComponentRole.EXPANDABLE_INSPECTION), unsafe_allow_html=True)
        layer = st.radio(
            "Inspection layer",
            ["Interpretation", "Drivers", "History", "Raw contract"],
            horizontal=True,
            key="instrument_layer",
            label_visibility="collapsed",
        )
        if layer == "Interpretation":
            ai = data.get("AI_Interpretations", pd.DataFrame())
            match = ai[ai.get("Instrument", pd.Series(dtype=str)).astype(str) == selected] if not ai.empty and "Instrument" in ai else pd.DataFrame()
            output = safe_json(match.iloc[-1].get("Output", "{}"), {}) if not match.empty else {}
            summary = output.get("summary", f"{selected} is {row.get('Direction','neutral').lower()} at {float(row.get('Strength',1)):.1f}/10. AI interpretation has not been generated for this snapshot.")
            summary = redact_for_display(summary, display_secret_values)
            st.markdown(
                hel.analytical_instrument(
                    "Institutional read",
                    "BRIEFING INTERPRETATION · PUBLISHED OUTPUT",
                    [
                        ("Direction", str(row.get("Direction", "Neutral")), "Expected direction"),
                        ("Confidence", f"{float(row.get('Confidence', 0) or 0):.0f}%", str(row.get("Reliability", "Uncalibrated"))),
                    ],
                    role=hel.ComponentRole.PRIMARY_BRIEFING,
                    state="informational",
                    narrative=str(summary),
                ),
                unsafe_allow_html=True,
            )
        elif layer == "Drivers":
            render_data_instrument(pd.DataFrame(driver_rows(row)), "Primary driver contributions", key="lab_drivers", source=connection_status, freshness=freshness, state=operational_freshness_state, display_values=display_secret_values)
        elif layer == "History":
            history = data.get("Score_History", pd.DataFrame())
            history_display = history[history.get("Instrument", pd.Series(dtype=str)).astype(str) == selected] if not history.empty and "Instrument" in history else history
            render_chart_instrument(
                history_figure(history_display, selected),
                "Instrument history",
                f"{selected} · exact published observations by timestamp.",
                key="instrument_lab_history_chart",
                role=hel.ComponentRole.INSTRUMENT_HISTORY,
                state=operational_freshness_state,
                inspection_tools=True,
            )
            render_data_instrument(history_display, "Score history", key="lab_history", source=connection_status, freshness=freshness, state=operational_freshness_state, display_values=display_secret_values)
        else:
            render_data_instrument(pd.DataFrame([row]), "Published score contract", key="lab_raw_contract", source=connection_status, freshness=freshness, state=operational_freshness_state, display_values=display_secret_values)
    watch = seasonal_watch(row)
    if watch:
        watch = redact_for_display(watch, display_secret_values)
        limited = " · LIMITED SAMPLE" if watch.get("limitedSample") else ""
        st.markdown(
            hel.analytical_instrument(
                str(watch.get("title", "Seasonal Watch")),
                f'SEASONAL WATCH · {watch.get("status", "DEVELOPING")}{limited}',
                [("Instrument", selected, "Historical context only")],
                role=hel.ComponentRole.REGIME_STATE,
                state="informational",
                narrative=str(watch.get("detail", "")),
            ),
            unsafe_allow_html=True,
        )
    render_scenario_surface(row)

elif page == "Signal Audit":
    st.markdown(
        hel.workspace_header(
            "Signal Audit",
            "Trace every published reading through source observations, normalization, weighting, calibration, and change detection.",
            code="CAUSALITY TRACE · EVIDENCE LEDGER",
            role=hel.ComponentRole.SIGNAL_AUDIT,
        ),
        unsafe_allow_html=True,
    )
    st.markdown(hel.control_legend("Audit instrument", "Select evidence trace", role=hel.ComponentRole.INSTRUMENT_SELECTOR), unsafe_allow_html=True)
    selected = st.selectbox("Instrument", scores["Instrument"].astype(str).tolist(), key="audit_instrument", format_func=lambda value: str(redact_for_display(value, display_secret_values)), label_visibility="collapsed")
    row = scores[scores["Instrument"].astype(str) == selected].iloc[0]
    audit = signal_audit_rows(data, selected, row)
    st.markdown(
        hel.statline(
            [
                ("Published score", f"{float(row.get('Strength', 1)):.1f}/10", str(row.get("Direction", "Neutral")), "nominal"),
                ("Confidence", f"{float(row.get('Confidence', 0)):.0f}%", str(row.get("Reliability", row.get("Evidence Status", "Uncalibrated"))), "informational"),
                ("Freshness", freshness, contract_mode, operational_freshness_state),
                ("Material change", "YES" if bool(row.get("Material Change", False)) else "NO", str(row.get("Score Change", "")), "warning" if bool(row.get("Material Change", False)) else "acknowledged"),
            ]
        ),
        unsafe_allow_html=True,
    )
    render_data_instrument(audit, "Source inputs, weights, and calculations", key="audit_calculations", source=connection_status, freshness=freshness, state=operational_freshness_state, display_values=display_secret_values)
    left, right = st.columns(2)
    with left:
        contradictions = exact_list(row.get("Contradictions", "[]"))
        st.markdown(
            hel.analytical_list(
                "Contradictions",
                f"{selected} · EVIDENCE CONFLICTS",
                [(item, "CONTRADICTION") for item in contradictions],
                role=hel.ComponentRole.CONTRADICTION_ANALYSIS,
                state="warning" if contradictions else "acknowledged",
                empty_message="No published contradictions in the current reading.",
            ),
            unsafe_allow_html=True,
        )
    with right:
        trace = safe_json(row.get("Explanation Trace", "{}"), {})
        trace_payload = trace if trace else {"status": "Trace will populate after the calibrated Apps Script scorer runs."}
        st.markdown(
            f'<div {hel.contract_attributes(hel.ComponentRole.AUDIT_TRACE)}>'
            + hel.json_block(redact_for_display(trace_payload, display_secret_values), title="Explanation trace")
            + "</div>",
            unsafe_allow_html=True,
        )
    prior = {"Prior direction": row.get("Prior Direction", ""), "Prior strength": row.get("Prior Strength", ""),
             "Score change": row.get("Score Change", ""), "Material change": row.get("Material Change", False),
             "Evidence status": row.get("Evidence Status", "Uncalibrated")}
    render_data_instrument(pd.DataFrame([prior]), "Prior reading and change", key="audit_prior", source=connection_status, freshness=freshness, state="warning" if bool(row.get("Material Change", False)) else "nominal", display_values=display_secret_values)
    history = data.get("Score_History", pd.DataFrame())
    if not history.empty and "Instrument" in history:
        history = history[history["Instrument"].astype(str) == selected]
    calibration = data.get("Calibration_History", pd.DataFrame())
    if not calibration.empty and "Instrument" in calibration:
        calibration = calibration[calibration["Instrument"].astype(str) == selected]
    render_chart_instrument(
        history_figure(history, selected),
        "Published score history",
        f"{selected} · exact score observations supporting the audit trace.",
        key="signal_audit_history_chart",
        role=hel.ComponentRole.INSTRUMENT_HISTORY,
        state=operational_freshness_state,
        inspection_tools=True,
    )
    render_data_instrument(calibration if not calibration.empty else history, "Calibration history", key="audit_calibration", source=connection_status, freshness=freshness, state=operational_freshness_state, display_values=display_secret_values)
    st.markdown(hel.risk_instrument(row.get("Risk State", row.get("Risk", "Unavailable")), row.get("Invalidation", "Unavailable")), unsafe_allow_html=True)

elif page == "Operations":
    st.markdown(
        hel.workspace_header(
            "System Operations",
            "Inspect runtime health, delivery records, source lineage, and deployment evidence without invoking integrations.",
            code="OPERATIONS RAIL · READ-ONLY STATUS",
            role=hel.ComponentRole.OPERATIONS,
        ),
        unsafe_allow_html=True,
    )
    st.markdown(
        hel.statline(
            [
                ("Sheets detected", len(data), "Data contract", "nominal"),
                ("Instruments", len(scores), "Score engine", "nominal"),
                ("Material changes", int(scores.get("Material Change", pd.Series(False)).astype(bool).sum()), "Change monitor", "warning" if bool(scores.get("Material Change", pd.Series(False)).astype(bool).any()) else "acknowledged"),
                ("Credentials", credential_status, connection_status, "nominal" if credential_status == "CONFIGURED" else "informational"),
            ]
        ),
        unsafe_allow_html=True,
    )
    st.markdown(
        hel.inspection_surface("Runtime lineage", f"Source: {html.escape(connection_status)} · Contract: {html.escape(contract_mode)} · Freshness: {html.escape(freshness)} · Live credentials: {html.escape(credential_status)}", state=operational_freshness_state),
        unsafe_allow_html=True,
    )
    for name in ["Deployment_Status", "Health_Check", "System_Log", "Notification_Log", "Webhook_Log", "AI_Interpretations"]:
        render_data_instrument(data.get(name, pd.DataFrame()), name.replace("_", " "), key=f"operations_{name.lower()}", source=connection_status, freshness=freshness, state=operational_freshness_state, display_values=display_secret_values)

else:
    st.markdown(
        hel.workspace_header(
            "Data Explorer",
            "Survey one source layer at full fidelity with native sorting, search, selection, and download controls.",
            code="SOURCE TERRAIN · DENSE DATA SURVEY",
            role=hel.ComponentRole.DATA_EXPLORER,
        ),
        unsafe_allow_html=True,
    )
    st.markdown(hel.control_legend("Data layer", "Select source contract", role=hel.ComponentRole.FILTER_CONTROL), unsafe_allow_html=True)
    sheet = st.selectbox("Data layer", list(data), format_func=lambda value: str(redact_for_display(value, display_secret_values)), label_visibility="collapsed")
    render_data_instrument(data[sheet], str(sheet).replace("_", " "), key="data_explorer_grid", source=connection_status, freshness=freshness, state=operational_freshness_state, display_values=display_secret_values)

st.markdown(
    hel.operator_risk_seal(
        "HARMONEXUS · DECISION SUPPORT ONLY · NO LIVE TRADE EXECUTION"
    ),
    unsafe_allow_html=True,
)
