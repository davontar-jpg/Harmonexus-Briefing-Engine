"""Read-only Streamlit display of the versioned, opt-in research snapshot."""
import json
from pathlib import Path

import pandas as pd
import streamlit as st

import hel_cartographer as hel
from security_redaction import redact_for_display
from silver_temporal import VERSION


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
