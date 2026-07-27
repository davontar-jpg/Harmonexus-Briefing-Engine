# HEL-035 Production Reconnaissance

## Executive finding

The production engine is a hybrid Google Apps Script, Google Sheets, bundled
Excel workbook, and Streamlit system. Its production intelligence contract is
flat Apps Script modules under `src/`, Sheet tables, and a single Streamlit
entry point. HEL-033/034 are not present in the committed production tree and
no production surface currently consumes their artifacts.

## Baseline validation

All commands ran from the clean HEL-035 worktree at
`1b75f0903e31afefbf35b35961a9e3bc0e2e0a15`.

| Check | Result |
|---|---|
| `python -m pytest -q` | 12 passed, 0 failed, 0 skipped; 2.88 s |
| Full Node test command from `package.json` | 43 passed, 0 failed, 0 skipped; 149.8944 ms |
| `node tools/check-gas-syntax.mjs` | manifest and 12 Apps Script modules passed |
| `node tools/build-apps-script.mjs` | passed; ignored `dist/apps-script` generated |
| Workbook validator | 34 sheets, legacy compatible, exit 0 |
| Streamlit `AppTest` | bundled demo/Overview/All, 0 exceptions |
| Streamlit HTTP health | `ok` |
| Visible browser render | blocked: no browser backend was available |

The workbook validator reports that the bundled workbook is v4.7 fallback, not
a v5 installation: `Calculated_Signals`, `Instrument_Scores`,
`Score_History`, and `System_Log` are absent. Streamlit emitted a development
configuration warning about CORS/XSRF during the in-process test; it did not
fail. Synthetic notification-log failures printed by Node test doubles were
expected and the suite passed.

Exact machine results and baseline hashes are in
`artifacts/hel_035/baseline/validation_results.json` and
`artifacts/hel_035/baseline/manifest.json`.

## Long briefing architecture

- Assembly: `src/05_Notifications.gs::sendDailyBriefing()` reads
  `Instrument_Scores` through `hxLatestScoreRows_`.
- Renderer: the final `hxBuildDailyBriefing_` declaration in the same file is
  authoritative under Apps Script V8. An earlier formatter with the same name
  remains in the file and is overridden.
- Sections: header, market regime, cross-asset consensus, consensus strength,
  primary driver, capital rotation, conviction, macro interpretation, key
  drivers, contradictions, material change, priority instruments, optional
  seasonal watch, relationship intelligence, market-calendar watch, and watch
  conditions.
- Relationship data: `src/10_RelationshipEngines.gs`; failure renders explicit
  unavailable lines.
- Calendar data: `src/11_MarketCalendarWatch.gs`; failure renders an unavailable
  section.
- Persistence and delivery: the text is not stored as a canonical briefing
  object. It passes directly to the unified notification sender; events are
  written to `Notification_Log` and `System_Log`.
- Schedule: `installTriggers()` schedules `sendDailyBriefing` daily at hour 7
  in the Apps Script project timezone (`America/New_York`).

## Short briefing architecture

There is no separately scheduled, constrained short-briefing pipeline.
`src/06_Webhooks_Triggers.gs::generateBriefingText()` emits one
`Instrument: Direction Strength/10` line per score and is a compatibility entry
point. It has no explicit character/token budget, selection policy, persistence,
or dedicated delivery path. The bundled workbook `Briefing` sheet contains a
compact legacy front-page briefing, but that is separate from the current Apps
Script daily formatter.

This gap requires a later pure short renderer with explicit content priority
and limits. ATL-035-01 does not add it.

## Dashboard architecture

- Entry point and framework: `app.py`, Streamlit.
- Source modes: bundled workbook, uploaded workbook, or read-only live Google
  Sheets.
- Contract choice: prefers v5 `Instrument_Scores`; otherwise adapts the bundled
  `Signal_Engine`.
- Layout: sidebar source/workspace/universe controls; Overview, Instrument Lab,
  Signal Audit, Operations, and Data Explorer workspaces.
- Card primitive: `card()` emits a CSS-only same-size flip card. The front shows
  direction, strength, confidence, and reliability; the back shows context
  alignment and regime age.
- Silver: XAGUSD is one registry-driven card, not a dedicated operator layer.
- Macro: no dedicated dashboard macro card; cross-asset context is primarily in
  the Apps Script briefing.
- State: Streamlit rerun/widget state only; no production writes.
- Data loading: pandas/openpyxl for workbook, gspread service account for
  read-only live Sheets.
- Responsive behavior: four-column Overview with CSS sizing; no HEL-035
  responsive surface exists.

The baseline uses the bundled v4.7 workbook. Its XAGUSD fallback card is
Neutral, 1.6/10, confidence 6%, uncalibrated. This is stored evidence, not a
live reading.

## Notification architecture

`sendNotification()` is the unified path for Telegram, Pushover, and
email/text-to-email. `sendProductionBriefingNotification()` supports validated
dry runs and state-mutation suppression. Per-recipient failures are isolated
and logged. `sendBriefingEmail()` aliases `sendDailyBriefing()` and therefore
does not form a distinct email-only formatter. Telegram and email currently
receive the same daily payload.

Material-change alerts originate in scoring and call
`sendMajorChangeAlert_`. Trigger ownership is limited to FRED, CFTC, scoring,
and daily briefing handlers.

## Production data paths

| Intelligence | Source → normalization → consumer | Current limitation |
|---|---|---|
| XAGUSD | CFTC legacy report, authenticated TradingView factor events, or legacy `Signal_Engine` → `Normalized_Data`/`Calculated_Signals` → score, dashboard, briefing | Webhook stores factor events, not historical candles |
| DXY | CFTC DXY report, webhook/legacy factors → calculated signal → registry weights and macro formatter | No direct production DXY price-history adapter |
| USDDKK | registry plus webhook/legacy factors → scoring | No CFTC mapping or dedicated acquisition |
| Nominal yields | FRED DGS2/DGS5/DGS10/DGS30 → `FRED_Raw` → normalized/calculated signals → scores/macro | Daily only; 120-hour stale threshold |
| Real yield | FRED DFII10 → same path → XAGUSD and other weights | Daily only; no curve of real yields |
| COT/positioning/OI | CFTC legacy/TFF → `CFTC_Raw` → normalized net values → calculated changes → scores | Weekly; 240-hour stale threshold; no exchange OI feed |
| VIX | no production registry/source/score | Only an unsupported research-library entry and legacy workbook rule |
| VVIX | absent | unavailable |
| Market structure | bundled workbook `Structure` sheet | manual, not consumed by v5 Apps Script or dedicated Streamlit section |
| Session/timing | bundled Timing/Seasonality sheets and static normalized research library | context only; not a live session-state authority |
| Auction/order book | no provider or production contract | unavailable |
| Priority instruments | runtime top three by `strength × confidence` | not a silver-specific priority contract |
| Macro state | score rows → `hxCrossAssetBriefingContext_` | briefing-local derived object, not a persisted view model |
| Freshness | source-specific Apps Script thresholds plus Streamlit maximum `As Of` age | Streamlit freshness is aggregate, not per section/source |

Source precedence in `buildCalculatedSignals()` is deterministic by priority:
authenticated webhook 400, CFTC 320, FRED 300/290, legacy fallback 100.
Missing factors are omitted and lower score coverage; they are not intended to
become neutral evidence.

## HEL-033/034 boundary proof

The production/feature source scan found no reference to HEL-033, HEL-034,
`silver_gauges`, `shadow_current`, `oos_ledger`, finalist symbols, or
`production_effect`. Therefore no current score, briefing, notification, or
dashboard consumes HEL-034.

The research worktree remained clean at `d69fbe1`. Key architecture, registry,
report, shadow, OOS, and provenance files were hashed read-only. HEL-034
`shadow_current.json` declares `mode: read_only_shadow` and
`production_effect: none`. All finalists have zero new daily and intraday OOS
observations; USDCNH remains `DATA BLOCKED`. Details are in
`artifacts/hel_035/hel_033_034_read_only_audit.json`.

## Current risks and limitations

- Production has two uncommitted tracked files overlapping likely future
  briefing work. They were excluded from the feature base.
- Two `hxBuildDailyBriefing_` declarations create maintenance ambiguity.
- No distinct short renderer exists.
- VIX, VVIX, liquidity, and order-book intelligence lack production contracts.
- Market structure is manual and disconnected from the v5 score pipeline.
- The bundled workbook is stale demo evidence, not live production truth.
- A visible dashboard screenshot remains an environmental blocker.
- Live Sheet, Telegram, email, webhook, and scheduler behavior were not invoked
  because doing so would mutate or deliver production state.
