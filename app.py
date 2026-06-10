import io
from pathlib import Path
from typing import Any, Dict, Optional

import pandas as pd
import plotly.graph_objects as go
import streamlit as st

APP_NAME = "Harmonexus Engine"
APP_SUBTITLE = "Market Weather Observatory"
DEFAULT_WORKBOOK = Path(__file__).parent / "data" / "Market_Machine_Dashboard_v4_7_BriefingEngine.xlsx"
ASSETS = ["XAGUSD", "US30", "SPX500", "NAS100", "Custom"]

st.set_page_config(
    page_title=APP_NAME,
    page_icon="◈",
    layout="wide",
    initial_sidebar_state="expanded",
)

CSS = r"""
<style>
:root{
  --bg:#080908;
  --bg2:#10120f;
  --panel:#151813;
  --panel2:#1b2019;
  --panel3:#22281f;
  --text:#f4efe3;
  --muted:#a89f8f;
  --soft:#d7c6a1;
  --accent:#c99743;
  --accent2:#e2b86a;
  --bronze:#8f6428;
  --green:#7fb685;
  --red:#b8655c;
  --blue:#70899e;
  --line:rgba(226,184,106,.18);
  --shadow:rgba(0,0,0,.42);
}

.stApp {
  background:
    radial-gradient(circle at 18% 0%, rgba(201,151,67,.12) 0%, transparent 34%),
    radial-gradient(circle at 82% 18%, rgba(127,182,133,.08) 0%, transparent 30%),
    linear-gradient(135deg, #080908 0%, #10120f 48%, #060706 100%);
  color:var(--text);
}

.block-container {
  padding-top: 1.15rem;
  padding-bottom: 3rem;
  max-width: 1420px;
}

[data-testid="stSidebar"] {
  background: linear-gradient(180deg, rgba(14,16,13,.98), rgba(8,9,8,.98));
  border-right:1px solid var(--line);
}

[data-testid="stSidebar"] * {
  color: var(--text);
}

[data-testid="stSidebar"] .stRadio label,
[data-testid="stSidebar"] .stSelectbox label,
[data-testid="stSidebar"] .stFileUploader label {
  color: var(--soft) !important;
}

h1,h2,h3 {
  letter-spacing:-.04em;
}

.hero {
  position:relative;
  padding: 26px 28px;
  border:1px solid var(--line);
  border-radius: 26px;
  background:
    linear-gradient(135deg, rgba(201,151,67,.18), rgba(21,24,19,.88) 45%, rgba(127,182,133,.07));
  box-shadow: 0 22px 80px var(--shadow);
  overflow:hidden;
}

.hero:before {
  content:"";
  position:absolute;
  inset:-40%;
  background:
    linear-gradient(115deg, transparent 0%, rgba(226,184,106,.08) 45%, transparent 55%);
  transform:rotate(8deg);
}

.hero h1 {
  position:relative;
  margin:0;
  font-size:2.35rem;
  color:var(--text);
}

.hero p {
  position:relative;
  color:var(--soft);
  margin:7px 0 0 0;
  font-size:.98rem;
}

.card {
  background:
    linear-gradient(180deg, rgba(27,32,25,.88), rgba(15,18,14,.88));
  border:1px solid var(--line);
  border-radius: 22px;
  padding: 18px;
  box-shadow: 0 16px 45px var(--shadow);
  height:100%;
}

.card-soft {
  background: rgba(21,24,19,.72);
  border:1px solid var(--line);
  border-radius: 18px;
  padding: 14px;
}

.metric-title {
  color:var(--soft);
  font-size:.76rem;
  letter-spacing:.11em;
  text-transform:uppercase;
  margin-bottom:7px;
}

.metric-value {
  font-size:1.45rem;
  font-weight:780;
  letter-spacing:-.03em;
  color:var(--text);
}

.badge {
  display:inline-block;
  padding: 5px 10px;
  border-radius: 999px;
  font-size:.76rem;
  font-weight:750;
  border:1px solid var(--line);
}

.bull {
  background: rgba(127,182,133,.13);
  color:#bce0bd;
  border-color:rgba(127,182,133,.36);
}

.bear {
  background: rgba(184,101,92,.13);
  color:#e7aca4;
  border-color:rgba(184,101,92,.36);
}

.neutral {
  background: rgba(168,159,143,.13);
  color:#d8d0c2;
  border-color:rgba(168,159,143,.30);
}

.warn {
  background: rgba(201,151,67,.16);
  color:#e9c37a;
  border-color:rgba(201,151,67,.42);
}

.small {
  color:var(--muted);
  font-size:.88rem;
}

.divider {
  height:1px;
  background:var(--line);
  margin: 14px 0;
}

.asset-card {
  cursor:default;
  transition:.18s ease;
}

.asset-card:hover {
  transform:translateY(-2px);
  border-color:rgba(226,184,106,.48);
  box-shadow:0 18px 60px rgba(0,0,0,.52);
}

[data-testid="stDataFrame"] {
  border:1px solid var(--line);
  border-radius:16px;
  overflow:hidden;
}

button, .stButton button {
  border-radius: 999px !important;
  border:1px solid var(--line) !important;
  background:rgba(201,151,67,.11) !important;
  color:var(--text) !important;
}

.stSelectbox > div > div,
.stRadio > div,
.stFileUploader {
  border-color:var(--line) !important;
}

@media(max-width:900px){
  .hero h1{font-size:1.65rem;}
}

@media(max-width:600px){
  .card{padding:14px;border-radius:16px;}
  .hero{padding:20px;}
}
</style>
"""
st.markdown(CSS, unsafe_allow_html=True)


def clean_value(v: Any) -> Any:
    if pd.isna(v):
        return ""
    if isinstance(v, float):
        if abs(v - round(v)) < 1e-9:
            return int(round(v))
        return round(v, 4)
    return v


def pct(v: Any) -> str:
    if v in [None, ""] or pd.isna(v):
        return "—"
    try:
        f = float(v)
        if 0 <= f <= 1:
            return f"{f*100:.0f}%"
        return f"{f:.0f}%"
    except Exception:
        return str(v)


def badge_class(text: str) -> str:
    t = str(text).lower()
    if "bull" in t:
        return "bull"
    if "bear" in t:
        return "bear"
    if "pass" in t or "good" in t:
        return "bull"
    if "fail" in t or "error" in t:
        return "bear"
    if "warn" in t or "mixed" in t:
        return "warn"
    return "neutral"


def norm_cols(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.columns = [str(c).strip() for c in df.columns]
    return df


@st.cache_data(show_spinner=False)
def load_excel(file_bytes: Optional[bytes]) -> Dict[str, pd.DataFrame]:
    source = io.BytesIO(file_bytes) if file_bytes else DEFAULT_WORKBOOK
    xl = pd.ExcelFile(source)
    data = {}
    for s in xl.sheet_names:
        try:
            data[s] = pd.read_excel(xl, sheet_name=s)
        except Exception:
            data[s] = pd.DataFrame()
    return data


@st.cache_data(show_spinner=False)
def load_sheet_headerless(file_bytes: Optional[bytes], sheet_name: str) -> pd.DataFrame:
    source = io.BytesIO(file_bytes) if file_bytes else DEFAULT_WORKBOOK
    return pd.read_excel(source, sheet_name=sheet_name, header=None)


def get_signal(data: Dict[str, pd.DataFrame]) -> pd.DataFrame:
    df = data.get("Signal_Engine", pd.DataFrame())
    if df.empty:
        return pd.DataFrame()
    df = norm_cols(df)
    if "Asset" not in df.columns:
        try:
            df2 = pd.read_excel(DEFAULT_WORKBOOK, sheet_name="Signal_Engine", header=0)
            return norm_cols(df2)
        except Exception:
            return pd.DataFrame()
    return df[df["Asset"].notna()].copy()


def get_row(df: pd.DataFrame, asset: str) -> Dict[str, Any]:
    if df.empty or "Asset" not in df.columns:
        return {}
    match = df[df["Asset"].astype(str).str.upper() == asset.upper()]
    if match.empty:
        return {}
    return match.iloc[0].to_dict()


def read_briefing_kv(file_bytes: Optional[bytes]) -> Dict[str, Any]:
    try:
        raw = load_sheet_headerless(file_bytes, "Briefing")
    except Exception:
        return {}

    out = {}
    for _, row in raw.iterrows():
        vals = [v for v in row.tolist() if not pd.isna(v)]
        if len(vals) >= 2:
            key = str(vals[0]).strip()
            if key in ["Selected Asset", "Current Environment", "Primary Conflict", "Highest Probability Window", "Operational Note"]:
                out[key] = vals[1]

        if len(vals) >= 4 and str(vals[2]).strip() in ["Machine State Used", "Conviction", "Historical Alignment"]:
            out[str(vals[2]).strip()] = vals[3]

        if len(vals) >= 7 and str(vals[6]).strip() == "Last Refresh":
            out["Last Refresh"] = vals[7] if len(vals) > 7 else ""

    return out


def score_bundle(row: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "bullish": row.get("Final Bullish %", row.get("Weighted Bullish %", row.get("Bullish %", ""))),
        "bearish": row.get("Final Bearish %", row.get("Weighted Bearish %", row.get("Bearish %", ""))),
        "neutral": row.get("Final Neutral %", row.get("Weighted Neutral %", row.get("Neutral %", ""))),
        "reading": row.get("Final Machine Reading", row.get("Machine Bias", "Neutral / Mixed")),
        "notes": row.get("Final Score Notes", row.get("Evidence Text", "")),
    }


def conviction_from_row(row: Dict[str, Any]) -> int:
    sb = score_bundle(row)
    vals = []
    for key in ["bullish", "bearish"]:
        try:
            x = float(sb[key])
            vals.append(x * 100 if x <= 1 else x)
        except Exception:
            pass
    if not vals:
        return 0
    return int(round(max(vals)))


def to_num(x: Any) -> float:
    try:
        f = float(x)
        return f * 100 if f <= 1 else f
    except Exception:
        return 0.0


def mini_gauge(bullish, bearish, neutral, title="Weighted Environment"):
    b, r, n = to_num(bullish), to_num(bearish), to_num(neutral)

    fig = go.Figure()
    fig.add_trace(go.Bar(
        x=[b], y=["Bullish"], orientation="h", name="Bullish",
        marker_color="#7fb685"
    ))
    fig.add_trace(go.Bar(
        x=[r], y=["Bearish"], orientation="h", name="Bearish",
        marker_color="#b8655c"
    ))
    fig.add_trace(go.Bar(
        x=[n], y=["Neutral"], orientation="h", name="Neutral",
        marker_color="#c99743"
    ))

    fig.update_layout(
        height=230,
        barmode="group",
        margin=dict(l=10, r=10, t=38, b=10),
        title=dict(text=title, font=dict(size=15, color="#f4efe3")),
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        font=dict(color="#f4efe3"),
        xaxis=dict(range=[0, 100], gridcolor="rgba(226,184,106,.12)"),
        yaxis=dict(gridcolor="rgba(255,255,255,0)"),
        legend=dict(orientation="h", y=-.18),
    )
    return fig


def card(title, value, sub="", cls="neutral"):
    st.markdown(f"""
    <div class="card asset-card">
      <div class="metric-title">{title}</div>
      <div class="metric-value">{value}</div>
      <div style="margin-top:10px"><span class="badge {cls}">{sub}</span></div>
    </div>
    """, unsafe_allow_html=True)


with st.sidebar:
    st.markdown("### ◈ Harmonexus Engine")
    st.caption("Market weather, not trade signals.")
    uploaded = st.file_uploader("Upload latest engine workbook", type=["xlsx"])
    file_bytes = uploaded.getvalue() if uploaded else None

    page = st.radio(
        "Navigation",
        ["Briefing", "Asset Drill-Down", "Health Check", "Notification Log", "Raw Tables"],
        index=0
    )

    st.divider()

    selected_asset = st.selectbox("Selected Asset", ASSETS, index=0)
    st.caption("Workbook = backend. Streamlit = observatory cockpit.")

try:
    data = load_excel(file_bytes)
except Exception as e:
    st.error(f"Could not load workbook: {e}")
    st.stop()

signal = get_signal(data)
row = get_row(signal, selected_asset)
brief = read_briefing_kv(file_bytes)

st.markdown(f"""
<div class="hero">
  <h1>{APP_NAME}</h1>
  <p>{APP_SUBTITLE} · environment → evidence stack → timing window → drill-down</p>
</div>
""", unsafe_allow_html=True)

st.write("")

if page == "Briefing":
    cols = st.columns([1.25, 1, 1])
    sb = score_bundle(row)
    reading = sb["reading"] or brief.get("Current Environment", "Neutral / Mixed")
    conviction = conviction_from_row(row)

    with cols[0]:
        card(selected_asset, reading, f"Conviction {conviction}/100", badge_class(reading))

    with cols[1]:
        card(
            "Primary Conflict",
            brief.get("Primary Conflict", "Mixed crosscurrents / review drill-down"),
            "Briefing layer",
            "warn"
        )

    with cols[2]:
        card(
            "Timing Window",
            brief.get("Highest Probability Window", "Open drill-down for timing"),
            "Timing layer",
            "neutral"
        )

    st.write("")

    c1, c2 = st.columns([1.05, .95])

    with c1:
        st.markdown("<div class='card'>", unsafe_allow_html=True)
        st.markdown("### Evidence Stack")

        evidence_rows = [
            ("DXY", row.get("DXY Signal", row.get("DXY Live Status", "")), row.get("DXY Score", ""), "Dollar pressure / relief"),
            ("Real Yields", row.get("Real Yield Signal", row.get("Real Yield Live Status", "")), row.get("Real Yield Score", ""), "Discount-rate pressure"),
            ("Commercials", row.get("Commercial Context", ""), row.get("Commercial Score", ""), "Commercial net change"),
            ("Managed Money", row.get("Positioning Signal", row.get("MM Live Status", "")), row.get("Positioning Score", ""), "Noncommercial positioning"),
            ("Open Interest", row.get("Open Interest Signal", row.get("OI Live Status", "")), row.get("OI Score", ""), "Participation / conviction"),
        ]

        ev = pd.DataFrame(evidence_rows, columns=["Layer", "Status", "Score", "Interpretation"])
        st.dataframe(ev, use_container_width=True, hide_index=True)
        st.markdown("</div>", unsafe_allow_html=True)

    with c2:
        st.markdown("<div class='card'>", unsafe_allow_html=True)
        st.plotly_chart(mini_gauge(sb["bullish"], sb["bearish"], sb["neutral"]), use_container_width=True)

        st.markdown("<div class='divider'></div>", unsafe_allow_html=True)
        st.markdown("### Briefing Text")

        note = brief.get("Operational Note", row.get("Interpretation", "Review dashboard details before taking action."))
        st.write(note)
        st.caption(sb.get("notes", ""))
        st.markdown("</div>", unsafe_allow_html=True)

    st.write("")
    st.markdown("### Asset Weather Cards")

    grid = st.columns(4)
    for i, asset in enumerate(ASSETS[:4]):
        rr = get_row(signal, asset)
        ss = score_bundle(rr)
        with grid[i % 4]:
            card(
                asset,
                ss.get("reading", "Neutral / Mixed"),
                f"Conviction {conviction_from_row(rr)}/100",
                badge_class(ss.get("reading", ""))
            )

elif page == "Asset Drill-Down":
    st.markdown(f"## {selected_asset} Drill-Down")

    sb = score_bundle(row)
    st.plotly_chart(
        mini_gauge(sb["bullish"], sb["bearish"], sb["neutral"], f"{selected_asset} Weighted Machine"),
        use_container_width=True
    )

    tabs = st.tabs(["Signal Engine", "Timing", "Seasonality", "Structure", "Alerts"])

    with tabs[0]:
        if row:
            st.dataframe(pd.DataFrame([row]).T.rename(columns={0: "Value"}), use_container_width=True)
        else:
            st.warning("No Signal_Engine row found for this asset.")

    with tabs[1]:
        df = data.get("Timing_Calibration", data.get("Timing", pd.DataFrame()))
        st.dataframe(df, use_container_width=True)

    with tabs[2]:
        st.dataframe(data.get("Seasonality", pd.DataFrame()), use_container_width=True)

    with tabs[3]:
        st.dataframe(data.get("Structure", pd.DataFrame()), use_container_width=True)

    with tabs[4]:
        st.dataframe(data.get("Alert_Rules", pd.DataFrame()), use_container_width=True)

elif page == "Health Check":
    st.markdown("## System Health")
    health = data.get("Health_Check", pd.DataFrame())

    if not health.empty:
        st.dataframe(health, use_container_width=True)
    else:
        st.info("Health_Check tab not found.")

elif page == "Notification Log":
    st.markdown("## Notification / Briefing Log")
    log = data.get("Notification_Log", pd.DataFrame())

    if not log.empty:
        st.dataframe(log, use_container_width=True)
    else:
        st.info("Notification_Log tab not found.")

    st.caption("Later stage: email, calendar, Telegram, Pushover, or app notifications.")

elif page == "Raw Tables":
    st.markdown("## Backend Tables")
    sheet_names = list(data.keys())
    default_index = sheet_names.index("Signal_Engine") if "Signal_Engine" in sheet_names else 0
    sheet = st.selectbox("Sheet", sheet_names, index=default_index)
    st.dataframe(data.get(sheet, pd.DataFrame()), use_container_width=True)

st.markdown(
    "<br><div class='small'>Harmonexus Engine is a decision-support briefing system. It does not place trades or replace judgment.</div>",
    unsafe_allow_html=True
)