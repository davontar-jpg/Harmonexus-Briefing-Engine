"""Versioned Streamlit entry point; Cloud may retain older imports after a source rerun."""
import json
import hashlib
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import streamlit as st

import hel_cartographer as hel
from security_redaction import redact_for_display
from silver_temporal import VERSION

PUBLIC_ARCHIVE = Path(__file__).resolve().parent / "data" / "research" / "xagusd-archive-observations.json"
PUBLIC_SCHEMA = "xagusd-descriptive-archive.2"
WEEKDAYS = ("Mon", "Tue", "Wed", "Thu", "Fri")


def published_runtime_id(frame):
    """Only identify the shared Apps Script snapshot; never expose its raw chunks."""
    if frame is None or frame.empty or "Runtime ID" not in frame:
        return None
    value = str(frame.iloc[-1]["Runtime ID"])
    try:
        if not value.startswith("HEL-035:"):
            return None
        stamp = datetime.fromisoformat(value.removeprefix("HEL-035:"))
        return value if stamp.tzinfo and stamp <= datetime.now(timezone.utc) else None
    except ValueError:
        return None


def read_archive_snapshot(path):
    if not path:
        return None
    source = Path(path)
    if source.stat().st_size > 1_000_000:
        raise ValueError("Archive snapshot exceeds the size limit")
    result = json.loads(source.read_text(encoding="utf-8"))
    if (not isinstance(result, dict) or result.get("version") != VERSION
            or result.get("instrument") != "XAGUSD"
            or result.get("mode") != "historical_research"
            or result.get("currentEligible") is not False
            or result.get("brokerPointIncrement") is not None):
        raise ValueError("Incompatible archive snapshot")
    return result


def render_silver_archive(path, render_table):
    """No payload can affect scoring, notifications, or other workspaces."""
    st.markdown(hel.inspection_surface(
        "Silver historical intelligence", "Archive evidence only. This view does not publish a live forecast.",
        state="informational"), unsafe_allow_html=True)
    try:
        report = read_archive_snapshot(path)
        if report is None:
            st.info("No validated research snapshot is configured. Live scores are unchanged.")
            return
        st.text(f"Closed source bars through {report['observation']['sourceAsOf']} · "
                f"{report['quality']['completeSessions']} sessions · {report['quality']['completeWeeks']} weeks")
        st.caption("All distances are USD per troy ounce. No broker-point conversion or operating stop is inferred.")
        with st.expander("Weekly and daily extreme history"):
            for name in ("weeklyExtremes", "dailyExtremes"):
                for side, detail in report[name].items():
                    title = ("Weekly" if name.startswith("week") else "Daily") + f" {side} frequency"
                    render_table(pd.DataFrame.from_dict(detail["full"], orient="index").reset_index(names="Window"),
                                 title, key=f"xag_{name}_{side}")
                st.json(redact_for_display({k: v["checkpoints"] for k, v in report[name].items()}), expanded=False)
        with st.expander("Range, expansion and auction evidence"):
            st.json(redact_for_display({k: report[k] for k in ("dailyRange", "weeklyRange", "expansion", "archiveAuctionExample")}),
                    expanded=False)
            if "feedComparison" in report:
                st.json(redact_for_display(report["feedComparison"]), expanded=False)
        with st.expander("Retracement distributions and trailing simulations"):
            for horizon in ("dailyTrailing", "weeklyTrailing"):
                rows = [{"Regime": regime, "Holdout periods": cohort["testN"],
                         **cohort["holdoutRecoveredPullback"]} for regime, cohort in report[horizon].items()]
                render_table(pd.DataFrame(rows), f"{horizon.removesuffix('Trailing').title()} recovered pullbacks",
                             key=f"xag_{horizon}")
            st.json(redact_for_display({k: report[k] for k in ("dailyTrailing", "weeklyTrailing")}), expanded=False)
        st.caption(f"Research snapshot {report['runtimeId']} · {VERSION}")
    except (OSError, ValueError, KeyError, TypeError, AttributeError):
        st.warning("Silver archive evidence is unavailable or invalid. Live scores are unchanged.")


@st.cache_data(show_spinner=False)
def read_published_observations(path: Path, modified_ns: int):
    if path.stat().st_size > 950_000:
        raise ValueError("Oversized aggregate")
    raw = path.read_text(encoding="utf-8")
    report = json.loads(raw)
    if (report.get("version") != PUBLIC_SCHEMA or report.get("instrument") != "XAGUSD"
            or report.get("mode") != "historical_research" or report.get("currentEligible") is not False):
        raise ValueError("Archive authority mismatch")
    if set(report["sections"]) != {"longM5", "longCoreM5", "histCoreM5"}:
        raise ValueError("Unexpected public feed inventory")
    return {**report, "archiveDigest": hashlib.sha256(raw.encode()).hexdigest()}


def render_published_observations(render_table, runtime_frame=None):
    """Read only reproducible aggregate observations; no credentials or network calls."""
    try:
        if not PUBLIC_ARCHIVE.is_file():
            return
        report = read_published_observations(PUBLIC_ARCHIVE, PUBLIC_ARCHIVE.stat().st_mtime_ns)
        st.markdown(hel.inspection_surface(
            "Silver historical intelligence",
            "Archive observations only. Source datasets are separate; these are not live prices or stop recommendations.",
            state="informational"), unsafe_allow_html=True)
        runtime_id = published_runtime_id(runtime_frame)
        if runtime_id:
            st.caption(f"Published briefing runtime: {runtime_id}. Runtime time is not the candle observation time.")
        st.caption(f"Research reference {report['archiveDigest'][:12]} · same archive as the executive briefing. "
                   "No verified current spot feed, range completion, or operational trailing reference.")
        labels = {"longM5": "Full sessions · EV Trading Labs / Dukascopy",
                  "longCoreM5": "Core hours, long history · EV Trading Labs / Dukascopy",
                  "histCoreM5": "Core hours, recent archive · HistData"}
        key = st.selectbox("Silver evidence source", list(labels), format_func=labels.__getitem__)
        data = report["sections"][key]
        source_time = datetime.fromisoformat(data["sourceAsOf"])
        age = max(0, (datetime.now(timezone.utc) - source_time).days)
        first = datetime.fromisoformat(data["first"]).astimezone(timezone.utc).date()
        last = source_time.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M")
        st.caption(f"ARCHIVE · {first} through {last} UTC · "
                   f"{age} days since last source bar · {data['quality']['sessions']:,} complete sessions · "
                   f"{data['quality']['weeks']:,} complete weeks · 5-minute observations · {data['sessionScope']}")
        st.caption(f"Last complete session: {data['quality']['latestCompleteSession']} · "
                   f"last complete week began: {data['quality']['latestCompleteWeek']} (ET)")
        with st.expander("Weekly high and low formation", expanded=False):
            week = data["weeklyExtremes"]
            rows = []
            for side in ("high", "low"):
                windows = {"Full sample": week["full"][side], **{
                    f"{x} calendar weeks": week["rollingCalendarWeeks"][side][x]
                    for x in ("4", "8", "12", "26", "52")}}
                for window, values in windows.items():
                    row = {"Extreme": side.title(), "Lookback": window, "Complete weeks": values["Mon"]["n"]}
                    for day in WEEKDAYS:
                        c = values[day]
                        row[day] = f"{c['hits']} · {100*c['frequency']:.1f}%" if c["n"] else "—"
                    rows.append(row)
            render_table(pd.DataFrame(rows), "Historical weekday counts and frequencies", key="xag_public_week")
            st.caption("4–12 week windows are descriptive. Completed-period regimes have no forecast authority.")
            st.json(redact_for_display(week["wednesdayTests"]), expanded=False)
        with st.expander("Daily extremes, session windows and ranges", expanded=False):
            st.caption("Market-center windows label local financial hours, not centralized spot-exchange sessions.")
            daily = data["daily"]["full"]
            rows = []
            for window, expansion in daily["expansionPerHour"].items():
                high = daily["extremes"]["high"]["marketWindows"][window]
                low = daily["extremes"]["low"]["marketWindows"][window]
                rows.append({"Window": window, "Highs": high["hits"], "Lows": low["hits"],
                             "Median added range ($/oz/hour)": expansion["p50"], "Sessions": expansion["n"]})
            render_table(pd.DataFrame(rows), "Historical extremes and range expansion", key="xag_public_sessions")
            render_table(pd.DataFrame.from_dict(data["range"], orient="index").reset_index(names="Horizon"),
                         "Completed ranges ($/oz)", key="xag_public_ranges")
            st.json(redact_for_display({"timingAndExpansion": data["daily"], "range": data["range"]}), expanded=False)
        auction = data.get("auctionArchive")
        if auction:
            with st.expander("Historical auction requirement", expanded=False):
                st.caption(f"Archive session {data['quality']['latestCompleteSession']} · {auction['basis']}.")
                st.text(auction["priceBasedState"].capitalize())
                st.write(f"Confirmation: {auction['confirmation']} Challenge: {auction['challenge']}")
        if data.get("events") and any(x["eventsWithCompleteSession"] for x in data["events"].values()):
            with st.expander("Historical release paths", expanded=False):
                st.caption("Small retrospective CPI, employment and FOMC cohorts. No release forecast or causal claim.")
                st.json(redact_for_display(data["events"]), expanded=False)
        with st.expander("Retracement and trailing comparisons", expanded=False):
            rows = []
            for horizon, groups in data["trailing"].items():
                for name, part in groups.items():
                    for subset, key in (("All recovered paths", "pullback"), ("Healthy continuations", "healthyPullback")):
                        q = part.get(key, {})
                        if q.get("n", 0) == 0:
                            continue
                        rows.append({"Horizon": horizon, "Prefix regime": name, "Evidence subset": subset,
                                     "Sample": q["n"], "Median": q.get("p50"), "75th": q.get("p75"),
                                     "90th": q.get("p90"), "Limited sample": "Yes" if q["n"] < 20 else "No"})
            render_table(pd.DataFrame(rows), "Recovered historical pullbacks ($/oz)", key="xag_public_pullback")
            st.caption("No operating band was promoted. The comparison uses hypothetical activation and costs.")
            st.json(redact_for_display({"frontier": data["trailing"], "analog": data["analogCandidate"]}),
                    expanded=False)
        st.caption("Data attribution: EV Trading Labs (aggregated Dukascopy bid candles) and HistData (bid archive). "
                   "Separate feeds; core-hour findings exclude overnight extremes.")
    except (OSError, ValueError, KeyError, AttributeError, TypeError):
        st.warning("Published silver archive is unavailable. Live scores are unchanged.")
