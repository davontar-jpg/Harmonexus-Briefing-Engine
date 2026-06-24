# Harmonexus System Architecture

## Data flow

`FRED / CFTC / legacy workbook / TradingView` → `Raw sheets` → `Normalized_Data` → `Calculated_Signals` → `Instrument_Scores` → `AI_Interpretations / Streamlit / notifications`.

Each layer is intentionally separate:

- **Raw:** source observations and retrieval timestamps.
- **Normalized:** typed, source-attributed values.
- **Calculated signals:** deterministic -1…+1 factors with source, quality, confidence, prior value, delta, and contradiction state.
- **Scores:** weighted direction, raw strength, calibrated strength, confidence, reliability, evidence status, and explanation trace.
- **Context refinements:** instrument regime age is counted from distinct weekday score-history observations; material-change attribution compares factor contributions between readings; Seasonal Watch is emitted only for supported timing or seasonality events and never changes the score.
- **Dashboard interaction:** instrument cards retain the existing front face and use a CSS-only, same-size flip for dashboard-only context alignment.
- **Interpretation:** constrained AI or deterministic fallback using score evidence only.
- **Delivery:** Telegram, Pushover, email fallback, webhook log, and audit log.

## Runtime boundaries

- Google Apps Script owns refresh, scoring, interpretation, triggers, webhooks, and notifications.
- The backup Google Sheet is the v5 parallel data contract.
- Streamlit reads the backup Sheet through a read-only service account. It performs no Sheet writes.
- GitHub is the source of truth for Apps Script modules, dashboard code, tests, and documentation.

## Security and resilience

Secrets live in Apps Script Properties or Streamlit Secrets, never source control. Webhooks fail closed, use a shared secret, and reject duplicate event IDs. Refresh and scoring use locks, retries, audit logging, and last-good-data fallback. Production v4.7 remains isolated until explicit cutover.
