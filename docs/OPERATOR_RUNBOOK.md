# Harmonexus Operator Runbook

## Operating mode

The v5 Google Sheet and Streamlit app are a parallel decision-support system. They do not execute trades and must not overwrite the production v4.7 workbook during observation.

## Daily sequence

1. Confirm `Deployment_Status` has no new configuration failure.
2. Confirm `FRED_Raw` and `CFTC_Raw` refreshed; cached data is acceptable only when marked stale.
3. Run `refreshAll()` if the scheduled cycle failed.
4. Inspect `Instrument_Scores`, then review low-confidence or contradictory readings in Streamlit **Signal Audit**.
5. Confirm the daily Telegram entry and `Notification_Log` delivery result.
6. Record anomalies in `System_Log`; never repair a score by manually overwriting calculated output.

## Expected healthy state

- Streamlit: `LIVE SHEETS`, `V5`, `CREDENTIALS CONFIGURED`.
- Instrument count: 19.
- Freshness: under 48 hours for the score snapshot.
- Scheduled triggers: FRED, CFTC, scoring, and daily briefing present.
- Scores with confidence below 25% read `INSUFFICIENT EVIDENCE` and cannot publish above 3.9/10.

## Incident response

- **Feed failure:** retain the last successful raw sheet, inspect `System_Log`, rerun the failed refresh once.
- **Telegram failure:** run `testTelegramNotification()`; email is used only when no push channel is available.
- **Webhook rejection:** verify the Web App URL, `WEBHOOK_SECRET`, event ID, instrument, factor, and normalized range.
- **Unexpected score:** inspect Calculated Signals, contradictions, factor weights, explanation trace, and calibration history before changing methodology.

## Parallel-observation exit criteria

Observe v4.7 and v5 together for at least 20 market sessions. Review direction disagreements, material-change precision, score stability, missing evidence, and alert usefulness. Production cutover requires an explicit owner decision and a tested rollback window.

