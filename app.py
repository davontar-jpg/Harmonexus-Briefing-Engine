import io
import html
import json
import os
import re
from pathlib import Path
from typing import Any, Dict, Optional

import pandas as pd
import plotly.graph_objects as go
import streamlit as st

import hel_cartographer as hel
from security_redaction import redact_dataframe, redact_for_display, sensitive_values_from_mapping
from silver_intelligence import (
    INTERNAL_PREVIEW_ENV,
    internal_preview_enabled,
    silver_briefing_integration_preview,
)

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
.flip-shell{position:relative;display:block;min-height:205px;perspective:1200px;cursor:pointer;transition:transform .28s cubic-bezier(.2,.8,.2,1);isolation:isolate}.flip-shell:hover{transform:translateY(-5px) scale(1.008)}.flip-toggle{position:absolute;opacity:0;pointer-events:none}.flip-card-inner{position:relative;min-height:205px;transform-style:preserve-3d;-webkit-transform-style:preserve-3d;transform:translateZ(0);will-change:transform;transition:transform .62s cubic-bezier(.2,.78,.2,1)}.flip-toggle:checked+.flip-card-inner{transform:rotateY(180deg) translateZ(0)}.flip-toggle:focus-visible+.flip-card-inner{outline:2px solid var(--cyan);outline-offset:3px;border-radius:19px}
.signal-card{position:relative;overflow:hidden;min-height:205px;padding:20px;border:1px solid var(--line);border-radius:19px;background:linear-gradient(150deg,rgba(18,25,35,.98),rgba(10,14,20,.98));transition:border-color .28s,box-shadow .28s;box-sizing:border-box}.flip-shell:hover .signal-card{border-color:rgba(88,216,230,.28);box-shadow:0 24px 50px rgba(0,0,0,.34)}.signal-card:before{content:"";position:absolute;width:120px;height:120px;border-radius:50%;filter:blur(55px);opacity:.13;right:-30px;top:-40px;background:var(--tone)}
.card-face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;transform-style:preserve-3d;-webkit-transform-style:preserve-3d;will-change:transform}.card-front{transform:rotateY(0deg) translateZ(.1px);display:flex;flex-direction:column;padding:18px 20px 15px}.card-back{transform:rotateY(180deg) translateZ(.1px);display:flex;flex-direction:column;justify-content:space-between;padding:14px 16px 12px}.back-title{font:500 .66rem/1 'DM Mono';letter-spacing:.14em;color:var(--cyan);margin-bottom:2px}.alignment-row{display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid var(--line);font-size:.72rem;line-height:1.2}.alignment-row span{color:var(--muted)}.alignment-row b{font:500 .68rem/1.2 'DM Mono'}.agreement{display:flex;justify-content:space-between;align-items:end;margin-top:4px;line-height:1}.agreement strong{font:600 1.1rem/1 'DM Mono';color:var(--tone)}.regime-age{font:500 .59rem/1 'DM Mono';color:var(--muted);text-transform:uppercase;letter-spacing:.04em}.flip-hint{font:400 .53rem/1.1 'DM Mono';color:#59626f;text-align:right;margin-top:2px}
.card-head{display:flex;align-items:flex-start;justify-content:space-between;flex:0 0 auto}.ticker{font:500 .72rem 'DM Mono';letter-spacing:.09em;color:var(--muted)}.asset-name{font-weight:650;font-size:1rem;margin-top:4px}.reading{font-size:1.65rem;font-weight:700;line-height:1.05;letter-spacing:-.04em;margin-top:18px}.reading span{color:var(--tone)}.score{font:500 1.2rem 'DM Mono';color:var(--tone)}.confidence{height:3px;background:rgba(255,255,255,.07);border-radius:5px;margin-top:17px;overflow:hidden;flex:0 0 auto}.confidence i{display:block;height:100%;background:var(--tone);box-shadow:0 0 10px var(--tone)}.meta{display:flex;justify-content:space-between;font:400 .65rem 'DM Mono';color:var(--muted);margin-top:7px}.delta{padding:4px 7px;border-radius:7px;border:1px solid var(--line);font:500 .65rem 'DM Mono'}
.reliability{display:inline-flex;align-self:flex-start;margin-top:10px;padding:4px 8px;border:1px solid var(--line);border-radius:999px;font:500 .62rem 'DM Mono';letter-spacing:.05em;color:var(--muted)}
.panel{border:1px solid var(--line);border-radius:20px;background:rgba(13,17,23,.86);padding:21px;height:100%;box-shadow:inset 0 1px rgba(255,255,255,.025)}.panel-title{font-size:.76rem;text-transform:uppercase;letter-spacing:.12em;color:var(--muted);margin-bottom:18px}.driver{display:grid;grid-template-columns:1fr 62px 70px;gap:10px;align-items:center;padding:12px 0;border-bottom:1px solid var(--line);font-size:.84rem}.driver:last-child{border:0}.driver b{font:500 .72rem 'DM Mono';text-align:right}.driver em{font-style:normal;text-align:right;color:var(--muted);font-size:.72rem}
.brief{font-size:1.04rem;line-height:1.65;color:#d8dde4}.brief strong{color:var(--text)}
.pill{display:inline-flex;align-items:center;gap:7px;padding:7px 10px;border:1px solid var(--line);border-radius:999px;font:500 .66rem 'DM Mono';color:var(--muted);margin-right:6px}.pill i{width:6px;height:6px;border-radius:50%;background:var(--green);box-shadow:0 0 10px var(--green)}
.status-strip{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 18px}.status-chip{padding:7px 10px;border:1px solid var(--line);border-radius:999px;font:500 .65rem 'DM Mono';color:var(--muted);background:rgba(255,255,255,.02)}.status-chip.ok{color:#9be7bc;border-color:rgba(98,214,154,.25)}.status-chip.warn{color:#f3cc86;border-color:rgba(240,189,99,.28)}
.hel035-desk-head{margin:4px 0 22px}.hel035-desk-head .eyebrow{margin-bottom:7px}.hel035-desk-head h1{font-size:clamp(2rem,4vw,3.6rem);margin:0}.hel035-desk-head p{max-width:760px;color:var(--muted);margin:8px 0 0;line-height:1.55}
.hel035-operator-card{border:1px solid var(--line);border-radius:20px;background:linear-gradient(145deg,rgba(15,21,29,.96),rgba(9,13,19,.94));padding:22px;margin:0 0 8px;box-shadow:inset 0 1px rgba(255,255,255,.025)}.hel035-operator-card.executive{border-color:rgba(88,216,230,.25);padding:26px;background:linear-gradient(135deg,rgba(17,31,40,.98),rgba(9,14,20,.96))}
.hel035-section-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:14px}.hel035-section-name{font:500 .68rem 'DM Mono';letter-spacing:.14em;text-transform:uppercase;color:var(--cyan)}.hel035-authority{font:500 .61rem 'DM Mono';letter-spacing:.06em;text-transform:uppercase;color:var(--muted);border:1px solid var(--line);border-radius:999px;padding:5px 8px;white-space:nowrap}.hel035-state{font-size:clamp(1.35rem,2.4vw,2.2rem);font-weight:700;letter-spacing:-.04em;line-height:1.12;margin-bottom:10px}.hel035-interpretation{color:#d8dde4;font-size:1rem;line-height:1.65;max-width:1080px}.hel035-decision-grid{display:grid;grid-template-columns:1.35fr 1fr .58fr;gap:10px;margin-top:18px}.hel035-decision-cell{border-top:1px solid var(--line);padding-top:11px}.hel035-decision-cell span,.hel035-watch span,.hel035-risk span{display:block;font:500 .6rem 'DM Mono';letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-bottom:5px}.hel035-decision-cell strong{font-size:.86rem;line-height:1.4}.hel035-watch,.hel035-risk{margin-top:14px;color:#cbd2da;font-size:.86rem;line-height:1.45}.hel035-card-foot{display:flex;gap:16px;flex-wrap:wrap;margin-top:17px;padding-top:11px;border-top:1px solid var(--line);font:500 .61rem 'DM Mono';letter-spacing:.05em;text-transform:uppercase;color:var(--muted)}
[data-testid="stExpander"]{border-color:var(--line);background:rgba(10,14,20,.6)}
[data-testid="stDataFrame"]{border:1px solid var(--line);border-radius:15px;overflow:hidden}.stTabs [data-baseweb="tab-list"]{gap:26px;border-bottom:1px solid var(--line)}.stTabs [data-baseweb="tab"]{font-size:.78rem;letter-spacing:.04em;padding:12px 0}.stButton button{border-radius:999px;border:1px solid rgba(88,216,230,.24);background:rgba(88,216,230,.07);color:var(--text)}
@media(max-width:700px){.block-container{padding:.7rem .8rem 3rem}.hero{padding:22px 19px;border-radius:18px}.topbar{padding-bottom:14px}.signal-card,.flip-shell,.flip-card-inner{min-height:180px}.card-front{padding:15px 18px 12px}.reading{margin-top:12px;font-size:1.5rem}.confidence{margin-top:13px}.meta{margin-top:6px}.reliability{margin-top:8px}.card-back{padding:11px 14px 9px}.back-title{font-size:.62rem}.alignment-row{padding:2px 0;font-size:.69rem}.alignment-row b{font-size:.65rem}.agreement{margin-top:3px}.agreement strong{font-size:1rem}.regime-age{font-size:.55rem}.flip-hint{font-size:.5rem}.hero p{font-size:.85rem}.hel035-operator-card,.hel035-operator-card.executive{padding:18px}.hel035-decision-grid{grid-template-columns:1fr}.hel035-section-head{align-items:center}.hel035-state{font-size:1.45rem}}
</style>
""", unsafe_allow_html=True)
st.markdown(hel.css(), unsafe_allow_html=True)


def safe_json(value: Any, default):
    if isinstance(value, (list, dict)):
        return value
    try:
        return json.loads(value) if value not in (None, "") else default
    except Exception:
        return default


def hel035_runtime_payload(data: Dict[str, pd.DataFrame]) -> Optional[Dict[str, Any]]:
    """Read the published production runtime without rebuilding interpretation."""

    frame = data.get("HEL_035_Runtime", pd.DataFrame())
    if frame.empty:
        return None
    if {"Runtime ID", "Payload Chunk", "Chunk Index"}.issubset(frame.columns):
        latest_runtime_id = frame.iloc[-1].get("Runtime ID")
        chunks = frame[frame["Runtime ID"].astype(str) == str(latest_runtime_id)].copy()
        if not chunks.empty:
            chunks["__chunk_index"] = pd.to_numeric(
                chunks["Chunk Index"], errors="coerce"
            )
            payload = "".join(
                chunks.sort_values("__chunk_index")["Payload Chunk"]
                .fillna("")
                .astype(str)
                .tolist()
            )
            parsed = safe_json(payload, None)
            if not isinstance(parsed, dict):
                return None
            integration = parsed.get("integration")
            return integration if isinstance(integration, dict) else None
    for column in ("Payload", "Integration JSON", "JSON"):
        if column in frame.columns:
            parsed = safe_json(frame.iloc[-1].get(column), None)
            if not isinstance(parsed, dict):
                return None
            integration = parsed.get("integration")
            return integration if isinstance(integration, dict) else None
    return None


def hel035_confidence_text(card: Dict[str, Any]) -> str:
    confidence = card["confidence"]
    label = str(confidence.get("label", "unavailable"))
    score = confidence.get("score")
    return label if score is None else f"{label} · {float(score):.0f}/100"


def hel035_operator_card_html(card: Dict[str, Any]) -> str:
    executive_class = " executive" if card.get("is_executive") else ""
    freshness = card["freshness"]
    timestamp = freshness.get("as_of") or "timestamp unavailable"
    return (
        f'<div class="hel035-operator-card{executive_class}">'
        f'<div class="hel035-section-head"><div class="hel035-section-name">'
        f'{html.escape(str(card["section_name"]))}</div>'
        f'<div class="hel035-authority">{html.escape(str(card["authority_label"]))}</div></div>'
        f'<div class="hel035-state">{html.escape(str(card["headline"]))}</div>'
        f'<div class="hel035-interpretation">{html.escape(str(card["interpretation"]))}</div>'
        f'<div class="hel035-decision-grid">'
        f'<div class="hel035-decision-cell"><span>Silver Impact</span><strong>'
        f'{html.escape(str(card["silver_impact"]))}</strong></div>'
        f'<div class="hel035-decision-cell"><span>Operational Conclusion</span><strong>'
        f'{html.escape(str(card["operational_conclusion"]))}</strong></div>'
        f'<div class="hel035-decision-cell"><span>Confidence</span><strong>'
        f'{html.escape(hel035_confidence_text(card))}</strong></div></div>'
        f'<div class="hel035-watch"><span>What to watch</span>'
        f'{html.escape(str(card["required_confirmation"]))}</div>'
        f'<div class="hel035-risk"><span>Primary risk</span>'
        f'{html.escape(str(card["primary_risk"]))}</div>'
        f'<div class="hel035-card-foot"><span>Freshness · '
        f'{html.escape(str(freshness["status"]))}</span><span>As of · '
        f'{html.escape(str(timestamp))}</span></div></div>'
    )


def render_hel035_expandable(card: Dict[str, Any]) -> None:
    details = card["expandable_details"]
    labels = (
        ("evidence", "Evidence"),
        ("metrics", "Metrics and raw statistics"),
        ("sources", "Sources and underlying HEL artifacts"),
        ("freshness", "Freshness, provider, and timestamp"),
        ("reason_codes", "Reason codes"),
        ("research_notes", "Research notes"),
        ("limitations", "Limitations"),
    )
    with st.expander("Evidence, sources, and freshness"):
        for key, label in labels:
            value = details.get(key)
            if value in (None, "", [], {}):
                continue
            st.markdown(f"#### {label}")
            st.markdown(
                hel.json_block(
                    redact_for_display(value, display_secret_values)
                ),
                unsafe_allow_html=True,
            )


def render_hel035_dashboard_preview(preview: Dict[str, Any]) -> None:
    """Render the silver market decision flow before any raw evidence."""

    dashboard = preview["dashboard"]
    st.markdown(
        '<div class="hel035-desk-head"><div class="eyebrow">XAGUSD · OPERATOR VIEW</div>'
        '<h1>Silver Market Desk</h1>'
        '<p>The current market conclusion, its drivers, the silver implication, '
        'what must confirm next, and the system confidence—assembled in one flow.</p></div>',
        unsafe_allow_html=True,
    )
    for card in dashboard["sections"]:
        st.markdown(hel035_operator_card_html(card), unsafe_allow_html=True)
        render_hel035_expandable(card)
        st.write("")


def render_hel035_silver_card_preview(preview: Dict[str, Any]) -> None:
    """Add concise silver context below—not inside—the production card."""

    card_preview = preview["silver_card_preview"]
    with st.expander("Silver Intelligence context"):
        st.markdown(
            f'<div class="panel"><div class="panel-title">'
            f'{html.escape(str(card_preview["authority_label"]))} · INTERNAL PREVIEW</div>'
            f'<div class="brief"><strong>'
            f'{html.escape(str(card_preview["headline"]))}</strong><br>'
            f'{html.escape(str(card_preview["silver_impact"]))}<br>'
            f'Confidence: {html.escape(str(card_preview["confidence_label"]))}</div></div>',
            unsafe_allow_html=True,
        )


@st.cache_data(show_spinner=False, max_entries=8)
def cached_hel035_preview(payload_json: str) -> Dict[str, Any]:
    """Cache the already-built interpretation contract; do not recompute it."""

    return dict(
        silver_briefing_integration_preview(
            payload_json,
            {INTERNAL_PREVIEW_ENV: "true"},
        )
    )


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
    return "#62d69a" if "bull" in d else "#ff6b78" if "bear" in d else "#f0bd63"


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
    <label class="flip-shell" for="{card_id}" aria-label="Flip {html.escape(instrument)} context card">
      <input class="flip-toggle" id="{card_id}" type="checkbox">
      <div class="flip-card-inner">
        <div class="hel-surface hel-map-card card-face card-front" style="--tone:{tone(direction)};--confidence:{confidence}%">
          <div class="hel-card-head"><div><div class="hel-ticker">{html.escape(instrument)}</div><div class="hel-asset">{html.escape(name)}</div></div><div class="hel-delta">{delta_text}</div></div>
          <div class="hel-reading"><span>{html.escape(direction)}</span> <small class="hel-score">{strength:.1f}/10</small></div>
          <div class="hel-confidence"><i></i></div>
          <div class="hel-meta"><span>CONFIDENCE</span><span>{confidence}%</span></div>
          <div class="hel-reliability">{html.escape(reliability.upper())}</div>
        </div>
        <div class="hel-surface hel-map-card card-face card-back" style="--tone:{tone(direction)};--confidence:{confidence}%">
          <div><div class="hel-title">CONTEXT ALIGNMENT<strong>Layer agreement</strong></div>{alignment}</div>
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
    fig = go.Figure(go.Indicator(mode="gauge+number", value=value, number={"suffix":" / 10","font":{"size":28,"color":color}}, gauge={"axis":{"range":[-10,10],"tickcolor":"rgba(240,244,230,.38)"},"bar":{"color":color,"thickness":.2},"bgcolor":"rgba(0,0,0,0)","borderwidth":0,"steps":[{"range":[-10,-1.5],"color":"rgba(255,107,120,.09)"},{"range":[-1.5,1.5],"color":"rgba(240,189,99,.08)"},{"range":[1.5,10],"color":"rgba(98,214,154,.09)"}]}))
    fig.update_layout(height=240,margin=dict(l=20,r=20,t=30,b=10),paper_bgcolor="rgba(0,0,0,0)",plot_bgcolor="rgba(0,0,0,0)",font={"family":"IBM Plex Mono","color":"rgba(240,244,230,.72)"})
    return fig


secrets = streamlit_secrets()
display_secret_values = sensitive_values_from_mapping(secrets)
source_options = ["Bundled demo", "Upload workbook", "Live Google Sheets"]
live_sheet_configured = bool(
    (secrets.get("GOOGLE_SHEET_ID") or os.getenv("GOOGLE_SHEET_ID"))
    and secrets.get("gcp_service_account")
)

with st.sidebar:
    st.markdown("### Data connection")
    source_mode = st.radio("Source mode", source_options, index=2 if live_sheet_configured else 0)
    uploaded = st.file_uploader("Upload engine workbook", type=["xlsx"]) if source_mode == "Upload workbook" else None
    workspace_options = ["Overview", "Instrument Lab", "Signal Audit", "Operations", "Data Explorer"]
    if internal_preview_enabled():
        workspace_options.append("Silver Market Desk")
    page = st.radio("Workspace", workspace_options)
    family = st.selectbox("Universe", list(FAMILIES))
    reduced_sensory = st.checkbox(
        "Reduced sensory",
        value=False,
        help="Removes environmental motion, optical texture, translucency, and depth effects.",
    )

if reduced_sensory:
    st.markdown(hel.reduced_sensory_css(), unsafe_allow_html=True)

connection_status = "DEMO"
credential_status = "NOT REQUIRED"
loading_surface = st.empty()
loading_surface.markdown(
    hel.notice(
        "Mapping market terrain",
        "Resolving source lineage, freshness, and score contracts.",
        tone="var(--hel-color-semantic-signal-primary)",
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
                hel.notice("Live Sheets unavailable", "Live mode requires GOOGLE_SHEET_ID and [gcp_service_account] in Streamlit secrets."),
                unsafe_allow_html=True,
            )
            st.stop()
        data = load_google_sheet(str(spreadsheet_id), dict(service_account))
        connection_status, credential_status = "LIVE SHEETS", "CONFIGURED"
    elif source_mode == "Upload workbook":
        if not uploaded:
            loading_surface.empty()
            st.markdown(
                hel.notice("Workbook handoff required", "Choose an .xlsx workbook to enter uploaded-workbook mode."),
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
        hel.notice("Data source failed", f"Could not load the selected data source: {safe_error}", tone="var(--hel-color-semantic-signal-critical)"),
        unsafe_allow_html=True,
    )
    st.stop()
loading_surface.empty()

scores = enrich_score_context(data, score_frame(data))
if scores.empty:
    st.markdown(
        hel.notice("No score field detected", "No score data is available yet. Run setupHarmonexus() and calculateAllScores(), or upload the legacy workbook."),
        unsafe_allow_html=True,
    )
    st.stop()

as_of = scores.get("As Of", pd.Series([""])).dropna().astype(str).max() if len(scores) else ""
freshness, freshness_class = freshness_state(scores)
contract_mode = "V5" if "Instrument_Scores" in data and not data.get("Instrument_Scores", pd.DataFrame()).empty else "V4.7 FALLBACK"
hel035_preview = None
hel035_preview_error = ""
if internal_preview_enabled():
    try:
        payload = hel035_runtime_payload(data)
        if payload:
            hel035_preview = cached_hel035_preview(
                json.dumps(payload, sort_keys=True, separators=(",", ":"))
            )
    except Exception as exc:
        hel035_preview_error = str(redact_for_display(str(exc), display_secret_values))
st.markdown(f'<div class="topbar"><div class="brand"><i></i>{APP_NAME}</div><div class="asof">SYSTEM ONLINE · {as_of or "WORKBOOK MODE"}</div></div>', unsafe_allow_html=True)
st.markdown(f'<div class="status-strip"><span class="status-chip ok">{connection_status}</span><span class="status-chip {freshness_class}">{freshness}</span><span class="status-chip {"ok" if contract_mode == "V5" else "warn"}">{contract_mode}</span><span class="status-chip {"ok" if credential_status == "CONFIGURED" else "warn"}">CREDENTIALS {credential_status}</span></div>', unsafe_allow_html=True)

if page == "Overview":
    st.markdown('<div class="hero"><div class="eyebrow">Market regime · evidence intelligence</div><h1>See the pressure<br>before the narrative.</h1><p>A cross-asset operating picture that separates observations, normalized evidence, calculated signals, directional scores, interpretation, and delivery.</p></div>', unsafe_allow_html=True)
    st.write("")
    filtered = scores
    target = FAMILIES[family]
    if target and "Family" in filtered:
        filtered = filtered[filtered["Family"].astype(str).str.contains(target, case=False, na=False)]
    cols = st.columns(4)
    for i, (_, row) in enumerate(filtered.head(20).iterrows()):
        with cols[i % 4]: card(row)
    watches = [(row, seasonal_watch(row)) for _, row in filtered.iterrows() if seasonal_watch(row)]
    if watches:
        st.markdown("### Seasonal Watch")
        watch_cols = st.columns(min(2, len(watches)))
        for i, (watch_row, watch) in enumerate(watches[:2]):
            watch = redact_for_display(watch, display_secret_values)
            limited = " · LIMITED SAMPLE" if watch.get("limitedSample") else ""
            with watch_cols[i % len(watch_cols)]:
                st.markdown(
                    f'<div class="panel"><div class="panel-title">{html.escape(str(watch_row.get("Instrument", "")))} · {html.escape(str(watch.get("status", "DEVELOPING")))}{limited}</div>'
                    f'<div class="brief"><strong>{html.escape(str(watch.get("title", "")))}</strong><br>{html.escape(str(watch.get("detail", "")))}</div></div>',
                    unsafe_allow_html=True,
                )
    st.write("")
    left, right = st.columns([1.1, .9])
    focus = filtered.sort_values("Strength", ascending=False).iloc[0]
    with left:
        st.markdown('<div class="panel"><div class="panel-title">Highest-conviction evidence stack</div>', unsafe_allow_html=True)
        for item in driver_rows(focus):
            factor = redact_for_display(item.get("factor", "Evidence"), display_secret_values)
            contribution = float(item.get("contribution", 0) or 0)
            signal = redact_for_display(item.get("signal", ""), display_secret_values)
            st.markdown(f'<div class="driver"><span>{html.escape(str(factor))}</span><b style="color:{tone("Bullish" if contribution>0 else "Bearish" if contribution<0 else "Neutral")}">{contribution:+.2f}</b><em>{html.escape(str(signal))}</em></div>', unsafe_allow_html=True)
        st.markdown('</div>', unsafe_allow_html=True)
    with right:
        st.markdown('<div class="panel"><div class="panel-title">Directional pressure</div>', unsafe_allow_html=True)
        st.plotly_chart(gauge(focus), width="stretch", config={"displayModeBar":False})
        st.markdown('</div>', unsafe_allow_html=True)

elif page == "Instrument Lab":
    selected = st.selectbox("Instrument", scores["Instrument"].tolist(), format_func=lambda value: str(redact_for_display(value, display_secret_values)))
    row = scores[scores["Instrument"] == selected].iloc[0]
    a, b = st.columns([.72, 1.28])
    with a: card(row); st.plotly_chart(gauge(row), width="stretch", config={"displayModeBar":False})
    with b:
        layer = st.radio(
            "Inspection layer",
            ["Interpretation", "Drivers", "History", "Raw contract"],
            horizontal=True,
            key="instrument_layer",
        )
        if layer == "Interpretation":
            ai = data.get("AI_Interpretations", pd.DataFrame())
            match = ai[ai.get("Instrument", pd.Series(dtype=str)).astype(str) == selected] if not ai.empty and "Instrument" in ai else pd.DataFrame()
            output = safe_json(match.iloc[-1].get("Output", "{}"), {}) if not match.empty else {}
            summary = output.get("summary", f"{selected} is {row.get('Direction','neutral').lower()} at {float(row.get('Strength',1)):.1f}/10. AI interpretation has not been generated for this snapshot.")
            summary = redact_for_display(summary, display_secret_values)
            st.markdown(f'<div class="panel"><div class="panel-title">Institutional read</div><div class="brief">{html.escape(str(summary))}</div></div>', unsafe_allow_html=True)
        elif layer == "Drivers":
            st.markdown(hel.table_shell_start(), unsafe_allow_html=True)
            st.dataframe(redact_dataframe(pd.DataFrame(driver_rows(row)), display_secret_values), width="stretch", hide_index=True)
            st.markdown(hel.table_shell_end(), unsafe_allow_html=True)
        elif layer == "History":
            history = data.get("Score_History", pd.DataFrame())
            st.markdown(hel.table_shell_start(), unsafe_allow_html=True)
            history_display = history[history.get("Instrument", pd.Series(dtype=str)).astype(str) == selected] if not history.empty and "Instrument" in history else history
            st.dataframe(redact_dataframe(history_display, display_secret_values), width="stretch", hide_index=True)
            st.markdown(hel.table_shell_end(), unsafe_allow_html=True)
        else:
            st.markdown(hel.table_shell_start(), unsafe_allow_html=True)
            st.dataframe(redact_dataframe(pd.DataFrame([row]), display_secret_values), width="stretch", hide_index=True)
            st.markdown(hel.table_shell_end(), unsafe_allow_html=True)
    watch = seasonal_watch(row)
    if watch:
        watch = redact_for_display(watch, display_secret_values)
        limited = " · LIMITED SAMPLE" if watch.get("limitedSample") else ""
        st.markdown(
            f'<div class="panel"><div class="panel-title">SEASONAL WATCH · {html.escape(str(watch.get("status", "DEVELOPING")))}{limited}</div>'
            f'<div class="brief"><strong>{html.escape(str(watch.get("title", "")))}</strong><br>{html.escape(str(watch.get("detail", "")))}</div></div>',
            unsafe_allow_html=True,
        )
    if internal_preview_enabled() and str(selected).upper() == "XAGUSD":
        st.markdown("### Silver Intelligence context")
        if hel035_preview:
            render_hel035_silver_card_preview(hel035_preview)
        else:
            detail = hel035_preview_error or "No current Silver Market Desk payload is available."
            st.markdown(
                hel.notice(
                    "Preview unavailable",
                    detail,
                    tone="var(--hel-color-semantic-signal-secondary)",
                ),
                unsafe_allow_html=True,
            )

elif page == "Signal Audit":
    st.markdown("## Signal Audit")
    st.markdown(
        '<div class="hel-muted">Trace every published reading from source observation through normalization, weighting, calibration, and change detection.</div>',
        unsafe_allow_html=True,
    )
    selected = st.selectbox("Instrument", scores["Instrument"].astype(str).tolist(), key="audit_instrument", format_func=lambda value: str(redact_for_display(value, display_secret_values)))
    row = scores[scores["Instrument"].astype(str) == selected].iloc[0]
    audit = signal_audit_rows(data, selected, row)
    st.markdown(
        hel.statline(
            [
                ("Published score", f"{float(row.get('Strength', 1)):.1f}/10", str(row.get("Direction", "Neutral"))),
                ("Confidence", f"{float(row.get('Confidence', 0)):.0f}%", str(row.get("Reliability", row.get("Evidence Status", "Uncalibrated")))),
                ("Freshness", freshness, contract_mode),
                ("Material change", "YES" if bool(row.get("Material Change", False)) else "NO", str(row.get("Score Change", ""))),
            ]
        ),
        unsafe_allow_html=True,
    )
    st.markdown("### Source inputs, weights, and calculations")
    st.markdown(hel.table_shell_start(), unsafe_allow_html=True)
    st.dataframe(redact_dataframe(audit, display_secret_values), width="stretch", hide_index=True)
    st.markdown(hel.table_shell_end(), unsafe_allow_html=True)
    left, right = st.columns(2)
    with left:
        st.markdown("### Contradictions")
        contradictions = safe_json(row.get("Contradictions", "[]"), [])
        st.markdown(hel.table_shell_start(), unsafe_allow_html=True)
        st.dataframe(redact_dataframe(pd.DataFrame(contradictions if isinstance(contradictions, list) else [{"detail": contradictions}]), display_secret_values), width="stretch", hide_index=True)
        st.markdown(hel.table_shell_end(), unsafe_allow_html=True)
    with right:
        st.markdown("### Explanation trace")
        trace = safe_json(row.get("Explanation Trace", "{}"), {})
        st.markdown(
            hel.json_block(redact_for_display(trace if trace else {"status": "Trace will populate after the calibrated Apps Script scorer runs."}, display_secret_values)),
            unsafe_allow_html=True,
        )
    st.markdown("### Prior reading and change")
    prior = {"Prior direction": row.get("Prior Direction", ""), "Prior strength": row.get("Prior Strength", ""),
             "Score change": row.get("Score Change", ""), "Material change": row.get("Material Change", False),
             "Evidence status": row.get("Evidence Status", "Uncalibrated")}
    st.markdown(hel.table_shell_start(), unsafe_allow_html=True)
    st.dataframe(redact_dataframe(pd.DataFrame([prior]), display_secret_values), width="stretch", hide_index=True)
    st.markdown(hel.table_shell_end(), unsafe_allow_html=True)
    history = data.get("Score_History", pd.DataFrame())
    if not history.empty and "Instrument" in history:
        history = history[history["Instrument"].astype(str) == selected]
    st.markdown("### Calibration history")
    calibration = data.get("Calibration_History", pd.DataFrame())
    if not calibration.empty and "Instrument" in calibration:
        calibration = calibration[calibration["Instrument"].astype(str) == selected]
    st.markdown(hel.table_shell_start(), unsafe_allow_html=True)
    st.dataframe(redact_dataframe(calibration if not calibration.empty else history, display_secret_values), width="stretch", hide_index=True)
    st.markdown(hel.table_shell_end(), unsafe_allow_html=True)

elif page == "Silver Market Desk":
    if hel035_preview:
        render_hel035_dashboard_preview(hel035_preview)
    else:
        detail = hel035_preview_error or "No current Silver Market Desk payload is available."
        st.markdown(
            hel.notice(
                "Silver Market Desk unavailable",
                detail,
                tone="var(--hel-color-semantic-signal-secondary)",
            ),
            unsafe_allow_html=True,
        )

elif page == "Operations":
    st.markdown("## System operations")
    st.markdown(
        hel.statline(
            [
                ("Sheets detected", len(data), "Data contract"),
                ("Instruments", len(scores), "Score engine"),
                ("Material changes", int(scores.get("Material Change", pd.Series(False)).astype(bool).sum()), "Change monitor"),
                ("Credentials", credential_status, connection_status),
            ]
        ),
        unsafe_allow_html=True,
    )
    st.markdown(
        f'<div class="hel-muted hel-mono">Source: {html.escape(connection_status)} · Contract: {html.escape(contract_mode)} · Freshness: {html.escape(freshness)} · Live credentials: {html.escape(credential_status)}</div>',
        unsafe_allow_html=True,
    )
    for name in ["Deployment_Status", "Health_Check", "System_Log", "Notification_Log", "Webhook_Log", "AI_Interpretations"]:
        st.markdown(f"### {name.replace('_',' ')}")
        st.markdown(hel.table_shell_start(), unsafe_allow_html=True)
        st.dataframe(redact_dataframe(data.get(name, pd.DataFrame()), display_secret_values), width="stretch", hide_index=True)
        st.markdown(hel.table_shell_end(), unsafe_allow_html=True)

else:
    sheet = st.selectbox("Data layer", list(data), format_func=lambda value: str(redact_for_display(value, display_secret_values)))
    st.markdown(hel.table_shell_start(), unsafe_allow_html=True)
    st.dataframe(redact_dataframe(data[sheet], display_secret_values), width="stretch", hide_index=True)
    st.markdown(hel.table_shell_end(), unsafe_allow_html=True)

st.markdown('<br><div class="muted mono" style="font-size:.68rem">HARMONEXUS · DECISION SUPPORT ONLY · NO LIVE TRADE EXECUTION</div>', unsafe_allow_html=True)
