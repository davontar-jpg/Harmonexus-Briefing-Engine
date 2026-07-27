# HEL-035 Runtime Cutover

Status: implemented, inactive by default, awaiting operator approval

## Root cause

The previous Streamlit preview read `HEL_035_Preview`, whose payload was
assembled from static test fixtures. `hxSilverBuildOperatorDesk_` was only a
presentation transformer; no production process created or published the six
section objects it expected. The scheduler also passed neither a bundle nor an
activation option to the briefing path.

## Single-runtime architecture

`src/22_SilverProductionRuntime.gs` now:

1. captures one read-only snapshot of `Calculated_Signals`, `FRED_Raw`,
   `CFTC_Raw`, `Instrument_Scores`, `Webhook_Log`, optional `Structure`, and
   optional `HEL_034_Shadow_Current`;
2. builds Monetary, VIX, Liquidity, Silver Intelligence, and Market Structure
   once;
3. builds Executive Market Assessment from exactly those five completed
   interpretations;
4. derives Evidence Integrity from source and section metadata;
5. creates one briefing/dashboard integration object;
6. publishes the serialized runtime to `HEL_035_Runtime` only when
   `HEL_035_RUNTIME_ENABLED=true`.

The long briefing, short briefing, dashboard, silver-card preview, and
notification delivery all consume `runtime.integration`. They do not build
independent interpretations.

## Source truth

- TradingView supplies authenticated factor events, normalized signals,
  optional alert prices, and optional exchange/timeframe metadata through
  `Webhook_Log`.
- The webhook does not provide historical candles.
- The instrument registry does not authorize a standalone VIX instrument, so
  TradingView events cannot be reclassified as VIX observations.
- FRED supplies the repository's daily nominal yields, real yields, and delayed
  daily `VIXCLS` close when the canonical FRED refresh has run.
- CFTC supplies dated weekly positioning and open-interest observations.
- Market Structure is read from the optional existing `Structure` sheet.
- No order-book provider is connected; Liquidity Environment remains
  unavailable.

## HEL-034 handoff

`HEL_034_Shadow_Current` is a read-only handoff sheet. Supported rows use:

| Column | Meaning |
|---|---|
| `Artifact` | `shadow_current`, `finalist_registry`, `validation_results`, or `oos_ledger` |
| `Payload` | serialized authoritative HEL-034 artifact |

HEL-035 reads and copies these artifacts. It never writes the handoff, changes
a disposition, increments OOS observations, promotes a candidate, or changes
source confidence. Each Silver Intelligence subsection displays shadow
confidence, production contribution (`none`), freshness, timestamp, source,
disposition, and provenance.

## Activation and rollback

Two independent flags remain required:

- `HEL_035_RUNTIME_ENABLED=true` publishes the derived runtime after the
  existing hourly scoring run.
- `HEL_035_BRIEFING_INTEGRATION_ENABLED=true` permits the existing daily
  notification path to consume the published runtime.

Streamlit additionally requires
`HARMONEXUS_HEL035_INTERNAL_PREVIEW=true` and reads only `HEL_035_Runtime`.

With flags absent or false, current production scoring, briefing, dashboard,
notifications, cards, and schedules remain unchanged. Rollback is disabling
the flags; no score or research state must be restored.
