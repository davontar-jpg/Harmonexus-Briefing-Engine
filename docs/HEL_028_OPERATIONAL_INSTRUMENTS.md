# HEL-028 Operational Instrument Conversion

Status: validated complete operational-component phase

Captured: 2026-07-16 (America/New_York)

Branch: `codex/hel-028-operator-layer`

Parent phase: `1c3e82abe25a24e9b9f6614b18d425edf893d765`

Authority law: **HEL-032 controls the world; HEL-028 controls the instruments.**

## Scope and protection boundary

This phase replaces weak or framework-identifiable operational presentation
without changing the Cartographer's Chamber world architecture. It does not
change calculations, scoring, source ingestion, data selection, risk logic,
market-state logic, notifications, scheduling, persistence, authentication,
secrets, or production data.

All data used during runtime validation came from the bundled fallback
workbook. No live source write, notification send, webhook, scheduler, or
production integration was invoked.

Neither authoritative package under `HEL/HEL-032_cartographers-chamber/` or
`HEL/HEL-028_institutional-dealing-room/` was modified.

## Registered component contracts

The centralized runtime now registers explicit ownership for:

- instrument and source selectors;
- time/freshness controls and status summaries;
- metric instruments and dense data tables;
- scenario, filter, and date/calendar controls;
- risk and invalidation surfaces;
- alerts/notices and progress/loading feedback;
- empty states;
- expandable inspection and JSON/raw inspection.

Each rendered HEL component exposes its resolved role, structure owner, and
interaction owner through `data-hel-*` attributes. HEL-032 owns environmental
support, cartographic causality, page placement, and discovery language.
HEL-028 owns instrument housing, labels, numeric treatment, feedback,
inspection, dense-data ergonomics, and control behavior.

Scenario and date/calendar controls do not exist in the current application.
Their contracts and native-control styling are registered, but no fictitious
controls were introduced.

## Components converted

- Sidebar source, workbook, workspace, universe, and sensory selectors
- Instrument Lab selector and inspection-layer control
- Instrument Lab interpretation, driver, history, and raw-contract surfaces
- Signal Audit selector, metric bank, evidence tables, contradictions, JSON
  explanation trace, prior reading, calibration history, and risk/invalidation
- Operations metric bank, runtime lineage, health/log/notification/webhook/AI
  tables, and unavailable states
- Data Explorer layer selector and dense data grid
- Global loading, unavailable, failure, and empty-source presentation
- Native dataframe, progress, spinner, alert, expander, text/number/date,
  multiselect, slider, file-upload, and download presentation contracts
- Reduced-motion and reduced-sensory behavior for operational surfaces

The Overview hero, cartographic cards, card flip, map surfaces, environmental
lighting, world motion, charts, gauges, page geography, and route metaphor
remain HEL-032.

## Table behavior

Every visible dataframe now passes through one `render_data_instrument()`
boundary. That boundary:

- redacts sensitive display values before rendering;
- exposes source, freshness, state, and row count;
- uses tabular numeric treatment;
- retains Streamlit's native sorting, search, selection, and download tools;
- enables single-row selection with a visible selected-row state;
- renders empty frames as explicit unavailable instruments;
- contains horizontal table scrolling on narrow screens without introducing
  page-level overflow.

Streamlit's legacy bundled workbook still emits automatic Arrow-coercion log
warnings for heterogeneous object columns. Streamlit applies its built-in
fallback and the grids render successfully. This inherited data-shape warning
was not altered because the phase cannot change source data or ingestion.

## Status behavior

The shared state model distinguishes these states with visible text as well as
color and border treatment:

`nominal`, `informational`, `stale`, `warning`, `critical`, `acknowledged`,
`unavailable`, `loading`, and `failed`.

Critical and failed notices use an alert role. Other system feedback uses a
polite status role. Loading resolves to its own progress/loading component
contract. Current bundled data exercised nominal, informational, stale,
acknowledged, and unavailable states visually; deterministic unit tests
exercised every state, including warning, critical, loading, and failed.

## Functional and responsive validation

| Check | Result |
|---|---|
| Streamlit HTTP response | 200 |
| Runtime exceptions | 0 |
| Browser console errors | 0 |
| Instrument Lab | Passed |
| Signal Audit | Passed |
| Operations | Passed |
| Data Explorer | Passed |
| Upload-workbook empty state | Passed |
| Dataframe row selection | Passed |
| Dataframe sorting/search/download engine | Preserved |
| JSON inspection | Native keyboard-accessible `details` control |
| Risk/invalidation surface | Present; missing source evidence remains `Unavailable` |
| 1536px horizontal overflow | None; 1536/1536 px |
| 390px horizontal overflow | None; 390/390 px |
| Mobile table behavior | Internal horizontal scroll; page remains contained |
| Focus visibility | 2px solid semantic outline; focused select is 44px high |
| Reduced motion | Media query active; transition reduced to 1ms |
| Reduced sensory | Backdrop filter none; shadow none; transition 0s |
| Mobile control targets | All observed control targets at least 44px high |

The bundled fallback exposes five instruments and stale V4.7 data. That is an
intentional offline validation mode, not a change to the production V5 source
contract.

## Screenshot evidence

Durable assets are stored under
`review/baselines/hel-028-operational-instruments/`:

1. `01-instrument-lab-1536x864.png`
2. `02-signal-audit-1536x864.png`
3. `03-operations-1536x864.png`
4. `04-data-explorer-1536x864.png`
5. `05-empty-upload-state-1536x864.png`
6. `06-signal-audit-mobile-390x844.png`
7. `07-data-explorer-mobile-390x844.png`
8. `08-operations-reduced-motion-1536x864.png`
9. `09-keyboard-focus-data-explorer-1536x864.png`
10. `10-data-explorer-reduced-sensory-1536x864.png`

The sealed before-state remains under
`review/baselines/hel-032-pre-hel-028/` for forensic comparison.

## Test evidence

| Suite | Result |
|---|---|
| Python unit and Streamlit AppTest suite | 40 passed |
| JavaScript engine suite | 43 passed, 0 failed |
| Apps Script syntax | Manifest plus 12 modules passed |
| Apps Script build | 12 modules built successfully |
| Python compileall | Passed |
| Desktop browser pass | Passed at 1536×864 |
| Mobile browser pass | Passed at 390×844 |

The JavaScript notification suite uses mocks. No real Telegram message, email,
notification log mutation, scheduler run, webhook call, or Sheet write
occurred.

## Preserved functions

- all three source routes and upload behavior;
- all five workspace destinations;
- instrument, family, inspection-layer, and data-layer selection;
- card flipping and contextual alignment;
- charts and directional gauges;
- score, confidence, contradiction, calibration, freshness, and prior-reading
  display;
- native dataframe selection, sorting, search, and download controls;
- sensitive-value redaction;
- reduced-sensory control;
- decision-support-only/no-execution boundary.

## Rollback boundary

Revert this phase's single commit. The prior operator shell commit and sealed
HEL-032 world remain independently recoverable. No database, Sheet, secret,
deployment, notification, or integration rollback is required because none was
changed or invoked.
