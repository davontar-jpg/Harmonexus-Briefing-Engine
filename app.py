import io
import json
import os
from pathlib import Path
from typing import Any, Dict, Optional

import pandas as pd
import plotly.graph_objects as go
import streamlit as st

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
.signal-card{position:relative;overflow:hidden;min-height:205px;padding:20px;border:1px solid var(--line);border-radius:19px;background:linear-gradient(150deg,rgba(18,25,35,.98),rgba(10,14,20,.98));transition:transform .28s cubic-bezier(.2,.8,.2,1),border-color .28s,box-shadow .28s}.signal-card:hover{transform:translateY(-5px) scale(1.008);border-color:rgba(88,216,230,.28);box-shadow:0 24px 50px rgba(0,0,0,.34)}.signal-card:before{content:"";position:absolute;width:120px;height:120px;border-radius:50%;filter:blur(55px);opacity:.13;right:-30px;top:-40px;background:var(--tone)}
.card-head{display:flex;align-items:flex-start;justify-content:space-between}.ticker{font:500 .72rem 'DM Mono';letter-spacing:.09em;color:var(--muted)}.asset-name{font-weight:650;font-size:1rem;margin-top:5px}.reading{font-size:1.65rem;font-weight:700;letter-spacing:-.04em;margin-top:26px}.reading span{color:var(--tone)}.score{font:500 1.2rem 'DM Mono';color:var(--tone)}.confidence{height:3px;background:rgba(255,255,255,.07);border-radius:5px;margin-top:22px;overflow:hidden}.confidence i{display:block;height:100%;background:var(--tone);box-shadow:0 0 10px var(--tone)}.meta{display:flex;justify-content:space-between;font:400 .65rem 'DM Mono';color:var(--muted);margin-top:8px}.delta{padding:4px 7px;border-radius:7px;border:1px solid var(--line);font:500 .65rem 'DM Mono'}
.reliability{display:inline-flex;margin-top:13px;padding:4px 8px;border:1px solid var(--line);border-radius:999px;font:500 .62rem 'DM Mono';letter-spacing:.05em;color:var(--muted)}
.panel{border:1px solid var(--line);border-radius:20px;background:rgba(13,17,23,.86);padding:21px;height:100%;box-shadow:inset 0 1px rgba(255,255,255,.025)}.panel-title{font-size:.76rem;text-transform:uppercase;letter-spacing:.12em;color:var(--muted);margin-bottom:18px}.driver{display:grid;grid-template-columns:1fr 62px 70px;gap:10px;align-items:center;padding:12px 0;border-bottom:1px solid var(--line);font-size:.84rem}.driver:last-child{border:0}.driver b{font:500 .72rem 'DM Mono';text-align:right}.driver em{font-style:normal;text-align:right;color:var(--muted);font-size:.72rem}
.brief{font-size:1.04rem;line-height:1.65;color:#d8dde4}.brief strong{color:var(--text)}
.pill{display:inline-flex;align-items:center;gap:7px;padding:7px 10px;border:1px solid var(--line);border-radius:999px;font:500 .66rem 'DM Mono';color:var(--muted);margin-right:6px}.pill i{width:6px;height:6px;border-radius:50%;background:var(--green);box-shadow:0 0 10px var(--green)}
.status-strip{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 18px}.status-chip{padding:7px 10px;border:1px solid var(--line);border-radius:999px;font:500 .65rem 'DM Mono';color:var(--muted);background:rgba(255,255,255,.02)}.status-chip.ok{color:#9be7bc;border-color:rgba(98,214,154,.25)}.status-chip.warn{color:#f3cc86;border-color:rgba(240,189,99,.28)}
[data-testid="stDataFrame"]{border:1px solid var(--line);border-radius:15px;overflow:hidden}.stTabs [data-baseweb="tab-list"]{gap:26px;border-bottom:1px solid var(--line)}.stTabs [data-baseweb="tab"]{font-size:.78rem;letter-spacing:.04em;padding:12px 0}.stButton button{border-radius:999px;border:1px solid rgba(88,216,230,.24);background:rgba(88,216,230,.07);color:var(--text)}
@media(max-width:700px){.block-container{padding:.7rem .8rem 3rem}.hero{padding:22px 19px;border-radius:18px}.topbar{padding-bottom:14px}.signal-card{min-height:180px}.hero p{font-size:.85rem}}
</style>
""", unsafe_allow_html=True)


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


def tone(direction: str) -> str:
    d = str(direction).lower()
    return "#62d69a" if "bull" in d else "#ff6b78" if "bear" in d else "#f0bd63"


def card(row: pd.Series):
    direction = str(row.get("Direction", "Neutral"))
    strength = float(row.get("Strength", 1) or 1)
    confidence = int(float(row.get("Confidence", 0) or 0))
    delta = row.get("Score Change")
    delta_text = "NEW" if pd.isna(delta) else f"{float(delta):+.1f}"
    reliability = str(row.get("Reliability", row.get("Evidence Status", "Uncalibrated")))
    st.markdown(f"""
    <div class="signal-card" style="--tone:{tone(direction)}">
      <div class="card-head"><div><div class="ticker">{row.get('Instrument','')}</div><div class="asset-name">{row.get('Name',row.get('Instrument',''))}</div></div><div class="delta">{delta_text}</div></div>
      <div class="reading"><span>{direction}</span> <small class="score">{strength:.1f}/10</small></div>
      <div class="confidence"><i style="width:{confidence}%"></i></div>
      <div class="meta"><span>CONFIDENCE</span><span>{confidence}%</span></div>
      <div class="reliability">{reliability.upper()}</div>
    </div>""", unsafe_allow_html=True)


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
    color = tone(row.get("Direction", "Neutral"))
    fig = go.Figure(go.Indicator(mode="gauge+number", value=value, number={"suffix":" / 10","font":{"size":28,"color":color}}, gauge={"axis":{"range":[-10,10],"tickcolor":"#56606d"},"bar":{"color":color,"thickness":.2},"bgcolor":"rgba(0,0,0,0)","borderwidth":0,"steps":[{"range":[-10,-1.5],"color":"rgba(255,107,120,.09)"},{"range":[-1.5,1.5],"color":"rgba(240,189,99,.08)"},{"range":[1.5,10],"color":"rgba(98,214,154,.09)"}]}))
    fig.update_layout(height=240,margin=dict(l=20,r=20,t=30,b=10),paper_bgcolor="rgba(0,0,0,0)",font={"family":"DM Mono","color":"#87909d"})
    return fig


secrets = streamlit_secrets()
source_options = ["Bundled demo", "Upload workbook", "Live Google Sheets"]
live_sheet_configured = bool(
    (secrets.get("GOOGLE_SHEET_ID") or os.getenv("GOOGLE_SHEET_ID"))
    and secrets.get("gcp_service_account")
)

with st.sidebar:
    st.markdown("### Data connection")
    source_mode = st.radio("Source mode", source_options, index=2 if live_sheet_configured else 0)
    uploaded = st.file_uploader("Upload engine workbook", type=["xlsx"]) if source_mode == "Upload workbook" else None
    page = st.radio("Workspace", ["Overview", "Instrument Lab", "Signal Audit", "Operations", "Data Explorer"])
    family = st.selectbox("Universe", list(FAMILIES))

connection_status = "DEMO"
credential_status = "NOT REQUIRED"
try:
    if source_mode == "Live Google Sheets":
        spreadsheet_id = secrets.get("GOOGLE_SHEET_ID") or os.getenv("GOOGLE_SHEET_ID")
        service_account = secrets.get("gcp_service_account")
        if not spreadsheet_id or not service_account:
            st.error("Live mode requires GOOGLE_SHEET_ID and [gcp_service_account] in Streamlit secrets.")
            st.stop()
        data = load_google_sheet(str(spreadsheet_id), dict(service_account))
        connection_status, credential_status = "LIVE SHEETS", "CONFIGURED"
    elif source_mode == "Upload workbook":
        if not uploaded:
            st.info("Choose an .xlsx workbook to enter uploaded-workbook mode.")
            st.stop()
        data = load_workbook(uploaded.getvalue())
        connection_status, credential_status = "UPLOADED", "NOT REQUIRED"
    else:
        data = load_workbook(None)
except Exception as exc:
    st.error(f"Could not load the selected data source: {exc}")
    st.stop()

scores = score_frame(data)
if scores.empty:
    st.warning("No score data is available yet. Run setupHarmonexus() and calculateAllScores(), or upload the legacy workbook.")
    st.stop()

as_of = scores.get("As Of", pd.Series([""])).dropna().astype(str).max() if len(scores) else ""
freshness, freshness_class = freshness_state(scores)
contract_mode = "V5" if "Instrument_Scores" in data and not data.get("Instrument_Scores", pd.DataFrame()).empty else "V4.7 FALLBACK"
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
    st.write("")
    left, right = st.columns([1.1, .9])
    focus = filtered.sort_values("Strength", ascending=False).iloc[0]
    with left:
        st.markdown('<div class="panel"><div class="panel-title">Highest-conviction evidence stack</div>', unsafe_allow_html=True)
        for item in driver_rows(focus):
            factor = item.get("factor", "Evidence")
            contribution = float(item.get("contribution", 0) or 0)
            signal = item.get("signal", "")
            st.markdown(f'<div class="driver"><span>{factor}</span><b style="color:{tone("Bullish" if contribution>0 else "Bearish" if contribution<0 else "Neutral")}">{contribution:+.2f}</b><em>{signal}</em></div>', unsafe_allow_html=True)
        st.markdown('</div>', unsafe_allow_html=True)
    with right:
        st.markdown('<div class="panel"><div class="panel-title">Directional pressure</div>', unsafe_allow_html=True)
        st.plotly_chart(gauge(focus), width="stretch", config={"displayModeBar":False})
        st.markdown('</div>', unsafe_allow_html=True)

elif page == "Instrument Lab":
    selected = st.selectbox("Instrument", scores["Instrument"].tolist())
    row = scores[scores["Instrument"] == selected].iloc[0]
    a, b = st.columns([.72, 1.28])
    with a: card(row); st.plotly_chart(gauge(row), width="stretch", config={"displayModeBar":False})
    with b:
        tabs = st.tabs(["Interpretation", "Drivers", "History", "Raw contract"])
        with tabs[0]:
            ai = data.get("AI_Interpretations", pd.DataFrame())
            match = ai[ai.get("Instrument", pd.Series(dtype=str)).astype(str) == selected] if not ai.empty and "Instrument" in ai else pd.DataFrame()
            output = safe_json(match.iloc[-1].get("Output", "{}"), {}) if not match.empty else {}
            summary = output.get("summary", f"{selected} is {row.get('Direction','neutral').lower()} at {float(row.get('Strength',1)):.1f}/10. AI interpretation has not been generated for this snapshot.")
            st.markdown(f'<div class="panel"><div class="panel-title">Institutional read</div><div class="brief">{summary}</div></div>', unsafe_allow_html=True)
        with tabs[1]: st.dataframe(pd.DataFrame(driver_rows(row)), width="stretch", hide_index=True)
        with tabs[2]:
            history = data.get("Score_History", pd.DataFrame())
            st.dataframe(history[history.get("Instrument", pd.Series(dtype=str)).astype(str) == selected] if not history.empty and "Instrument" in history else history, width="stretch", hide_index=True)
        with tabs[3]: st.dataframe(pd.DataFrame([row]), width="stretch", hide_index=True)

elif page == "Signal Audit":
    st.markdown("## Signal Audit")
    st.caption("Trace every published reading from source observation through normalization, weighting, calibration, and change detection.")
    selected = st.selectbox("Instrument", scores["Instrument"].astype(str).tolist(), key="audit_instrument")
    row = scores[scores["Instrument"].astype(str) == selected].iloc[0]
    audit = signal_audit_rows(data, selected, row)
    a, b, c, d = st.columns(4)
    a.metric("Published score", f"{float(row.get('Strength', 1)):.1f}/10")
    b.metric("Confidence", f"{float(row.get('Confidence', 0)):.0f}%")
    c.metric("Reliability", str(row.get("Reliability", row.get("Evidence Status", "Uncalibrated"))))
    d.metric("Freshness", freshness)
    st.markdown("### Source inputs, weights, and calculations")
    st.dataframe(audit, width="stretch", hide_index=True)
    left, right = st.columns(2)
    with left:
        st.markdown("### Contradictions")
        contradictions = safe_json(row.get("Contradictions", "[]"), [])
        st.dataframe(pd.DataFrame(contradictions if isinstance(contradictions, list) else [{"detail": contradictions}]), width="stretch", hide_index=True)
    with right:
        st.markdown("### Explanation trace")
        trace = safe_json(row.get("Explanation Trace", "{}"), {})
        st.json(trace if trace else {"status": "Trace will populate after the calibrated Apps Script scorer runs."})
    st.markdown("### Prior reading and change")
    prior = {"Prior direction": row.get("Prior Direction", ""), "Prior strength": row.get("Prior Strength", ""),
             "Score change": row.get("Score Change", ""), "Material change": row.get("Material Change", False),
             "Evidence status": row.get("Evidence Status", "Uncalibrated")}
    st.dataframe(pd.DataFrame([prior]), width="stretch", hide_index=True)
    history = data.get("Score_History", pd.DataFrame())
    if not history.empty and "Instrument" in history:
        history = history[history["Instrument"].astype(str) == selected]
    st.markdown("### Calibration history")
    calibration = data.get("Calibration_History", pd.DataFrame())
    if not calibration.empty and "Instrument" in calibration:
        calibration = calibration[calibration["Instrument"].astype(str) == selected]
    st.dataframe(calibration if not calibration.empty else history, width="stretch", hide_index=True)

elif page == "Operations":
    st.markdown("## System operations")
    c1, c2, c3 = st.columns(3)
    with c1: st.markdown('<span class="pill"><i></i>DATA CONTRACT</span>', unsafe_allow_html=True); st.metric("Sheets detected", len(data))
    with c2: st.markdown('<span class="pill"><i></i>SCORE ENGINE</span>', unsafe_allow_html=True); st.metric("Instruments", len(scores))
    with c3: st.markdown('<span class="pill"><i></i>CHANGE MONITOR</span>', unsafe_allow_html=True); st.metric("Material changes", int(scores.get("Material Change", pd.Series(False)).astype(bool).sum()))
    st.caption(f"Source: {connection_status} · Contract: {contract_mode} · Freshness: {freshness} · Live credentials: {credential_status}")
    for name in ["Deployment_Status", "Health_Check", "System_Log", "Notification_Log", "Webhook_Log", "AI_Interpretations"]:
        st.markdown(f"### {name.replace('_',' ')}")
        st.dataframe(data.get(name, pd.DataFrame()), width="stretch", hide_index=True)

else:
    sheet = st.selectbox("Data layer", list(data))
    st.dataframe(data[sheet], width="stretch", hide_index=True)

st.markdown('<br><div class="muted mono" style="font-size:.68rem">HARMONEXUS · DECISION SUPPORT ONLY · NO LIVE TRADE EXECUTION</div>', unsafe_allow_html=True)
