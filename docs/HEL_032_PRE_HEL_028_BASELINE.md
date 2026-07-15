# HEL-032 Pre-HEL-028 Production Baseline

Status: last-known-good baseline

Captured: 2026-07-15 (America/New_York)

Branch: `codex/hel-028-operator-layer`

Baseline parent commit: `41c93ea4d5cf0f422c0d42853f77ab291927ffdf`

Application entry point: `app.py`

Environment under test: HEL-032 — The Cartographer's Chamber

HEL-028 runtime status: not implemented and not imported

## Purpose

This record freezes the approved HEL-032 visual, behavioral, and functional
state before HEL-028 implementation begins. It is comparison evidence, not a
request to correct pre-existing behavior. Application code, market logic,
scores, ingestion, notification delivery, triggers, secrets, and production
data were not changed during capture.

The live validation path used the existing ignored local Streamlit secrets and
read the authorized backup Google Sheet through the service account. No Sheet
write, notification, scheduler, webhook, or production mutation was invoked.
The secrets file was never printed and was restored byte-for-byte after a
controlled invalid-ID error-state capture.

## Startup contract

Canonical local command:

```powershell
$env:PYTHONPATH=(Resolve-Path '.deps').Path
python -B -m streamlit.web.cli run app.py `
  --global.developmentMode false `
  --server.headless true `
  --server.port 8779 `
  --browser.gatherUsageStats false
```

Equivalent ordinary developer command after activating an environment with
`requirements.txt` installed:

```powershell
python -m streamlit run app.py
```

Observed application response:

| Measure | Result |
|---|---:|
| Local HTTP response | `200` |
| Process start to HTTP 200 | 5,068 ms |
| Cold live-Sheet render to 19 cards | 27,247 ms |
| Warm Overview-to-Signal-Audit render | 410 ms |
| Browser console warnings/errors on valid live views | 0 |

The cold live render includes Google Sheets workbook discovery and all worksheet
reads. Subsequent workspace changes benefited from the five-minute Streamlit
data cache.

## Live data baseline

The live baseline reported:

- source: `LIVE SHEETS`;
- contract: `V5`;
- freshness: `FRESH 20H` at capture time;
- credentials: `CONFIGURED`;
- worksheets detected: 56;
- instruments detected: 19;
- material changes shown by Operations: 19.

All expected instruments were present:

`XAGUSD`, `GOLD`, `COPPER`, `PLATINUM`, `US30`, `SPX500`, `NAS100`,
`RUSSELL2000`, `DXY`, `EURUSD`, `GBPUSD`, `GBPJPY`, `EURJPY`, `USDJPY`,
`USDDKK`, `US2Y`, `US5Y`, `US10Y`, and `US30Y`.

The live Sheet remains the source of truth. Values in these screenshots are a
time-bound visual record and are not duplicated as application constants.

## Screenshot manifest

Durable review assets are stored under
`review/baselines/hel-032-pre-hel-028/`.

| File | State captured | Raster |
|---|---|---:|
| `01-overview-1536x864-bundled-fallback-warning.png` | Bundled demo, stale/V4.7 fallback, card fronts | 1536×864 |
| `02-empty-upload-workbook-required-1536x864.png` | Uploaded-workbook empty state | 1536×864 |
| `03-warning-live-sheets-credentials-missing-1536x864.png` | Missing live-Sheet credentials warning | 1536×864 |
| `04-loading-reload-1536x864.png` | Immediate reload/loading frame | 1536×864 |
| `05-overview-live-1536x864-sidebar-open.png` | Live Overview with navigation open | 1536×864 |
| `06-overview-card-back-xagusd-1536x864.png` | XAGUSD Context Alignment card back | 1536×864 |
| `07-instrument-lab-xagusd-chart-and-interpretation-1536.png` | Instrument Lab, gauge, interpretation | 1536×864 |
| `08-signal-audit-xagusd-confidence-contradictions-trace-1536.png` | Signal Audit, confidence, contradictions, explanation trace | 1536×864 |
| `09-operations-live-status-health-and-logs-1536.png` | Operations, source status, health, tables | 1536×864 |
| `10-data-explorer-dashboard-table-1536.png` | Data Explorer and dashboard table | 1536×864 |
| `11-overview-reduced-sensory-1536x864.png` | Reduced-sensory mode | 1536×864 |
| `12-keyboard-focus-overview-radio-1536x864.png` | Keyboard focus on Overview control | 1536×864 |
| `13-overview-live-1920x1080.png` | Primary live Overview | 1920×1080 |
| `14-overview-live-1536x864.png` | Primary live Overview | 1536×864 |
| `15-overview-live-1366x768.png` | Primary live Overview | 1366×768 |
| `16-overview-live-tablet-820x1180.png` | Tablet live Overview | 820×1180 |
| `17-overview-live-mobile-390x844.png` | 390 CSS-pixel mobile live Overview | 390×844 |
| `18-mobile-card-back-xagusd-390x844.png` | Mobile Context Alignment card back | 390×844 |
| `19-mobile-navigation-open-390x844.png` | Mobile navigation overlay | 390×844 |
| `20-error-live-sheet-404-redacted-1536x864.png` | Redacted live-Sheet 404 error | 1536×864 |

## Responsive geometry

The browser viewport override and DOM geometry were measured independently of
the PNG dimensions.

| CSS viewport | Card count | First-row card width | Horizontal overflow | Navigation default |
|---|---:|---:|---|---|
| 1920×1080 | 19 | 357 px | No | Collapsed |
| 1536×864 | 19 | 353 px | No | Collapsed |
| 1366×768 | 19 | 311 px | No | Collapsed |
| 820×1180 | 19 | 182 px | No | Collapsed |
| 390×844 | 19 | 356 px | No | Collapsed |

At 820 px the application retains four columns. It is technically contained
but unusually dense. At 390 px it changes to one card per row. The mobile
navigation opens as a 300 px overlay and closes through the visible double-arrow
control.

## Functional baseline

| Capability | Result | Evidence |
|---|---|---|
| 19-instrument live universe | Pass | DOM count and screenshots 05, 13–17 |
| Card fronts | Pass | Screenshots 01, 05, 13–17 |
| Pointer/tap card flip | Pass | Screenshots 06 and 18 |
| Same-size card faces | Pass | Desktop: 278.48×217.98 vs 278.52×218.02 px; mobile: 355.97×205.98 vs 356.03×206.02 px |
| Overview navigation | Pass | Workspace radio and Overview render |
| Instrument Lab | Pass | Screenshot 07 |
| Signal Audit | Pass | Screenshot 08 |
| Operations | Pass | Screenshot 09 |
| Data Explorer | Pass | Screenshot 10 |
| Source selection | Pass | Bundled, upload, and live modes exercised |
| Uploaded-workbook empty state | Pass | Screenshot 02 |
| Live-credential warning | Pass | Screenshot 03 |
| Redacted data-source error | Pass | Screenshot 20; no secret or local path exposed |
| Source freshness | Pass | `FRESH 20H` in live views; stale fallback in screenshot 01 |
| Gauge and chart render | Pass | Screenshot 07 |
| Tables and dataframe tools | Pass | Screenshots 08–10 |
| Confidence and reliability | Pass | Cards and Signal Audit |
| Contradiction and explanation trace | Pass | Signal Audit screenshot 08 |
| Risk surface | Partial | Contradictions, prior reading/change, and calibration are available in Signal Audit |
| Explicit invalidation surface | Not present | No Streamlit invalidation component exists in the approved implementation |
| Calendar state in Streamlit | Not present | Calendar logic remains in the notification/test layer; no dashboard calendar component exists |
| Loading state | Pass with defect | Immediate blank loading frame captured in screenshot 04; custom loading notice was observed in the DOM |
| Reduced-sensory control | Pass | Checkbox applies effect suppression; screenshot 11 |
| Reduced-motion contract | Static pass | `prefers-reduced-motion: reduce` disables nonessential transitions/effects in `hel_cartographer.py`; the available browser could not emulate the OS media preference independently |
| Keyboard focus | Pass | Visible focus state in screenshot 12 |
| Keyboard card flip | Fail | Hidden checkbox receives focus and a solid outline, but Space did not toggle XAGUSD |
| Mobile navigation | Pass | Screenshot 19 |
| Data refresh behavior | Pass with latency note | Live source reloads through a cached 300-second data function; no manual refresh button exists |

## Tests and commands

Python:

```powershell
$env:PYTHONPATH=(Resolve-Path '.deps').Path
python -B -m pytest -q -p no:cacheprovider
```

Result: **12 passed in 2.36 seconds**.

JavaScript:

```powershell
node --test tests/scoring.test.mjs tests/production.test.mjs `
  tests/research.test.mjs tests/relationships.test.mjs tests/security.test.mjs
```

Result: **43 passed, 0 failed**. Notification activity in this suite is mocked;
no Telegram, email, scheduler, webhook, or Sheet delivery occurred.

Apps Script syntax:

```powershell
node tools/check-gas-syntax.mjs
```

Result: **manifest JSON and 12 Apps Script modules passed**.

Apps Script build:

```powershell
node tools/build-apps-script.mjs
```

Result: **12-module package built successfully**. The ignored `dist/` output was
removed after validation and is not part of the baseline commit.

## Known pre-existing visual and behavioral defects

These defects existed before HEL-028 and must not be attributed to later work:

1. After the desktop sidebar is opened, its collapse button has an empty
   accessible name and could not be activated through the inspected desktop
   browser path. Mobile exposes and activates the double-arrow close control.
2. With the sidebar open, dense workspaces can clip their rightmost content in
   a 1536 px capture. Instrument Lab inspection tabs, Signal Audit stat blocks,
   Operations status cards, and wide Data Explorer tables are most affected.
3. Full-page captures with the open sidebar occasionally render radio labels as
   initials or partial text. Normal viewport captures stabilize after a short
   repaint delay.
4. Tablet width remains a four-column market-card grid. Cards are 182 px wide,
   producing heavy wrapping and reduced scan comfort despite no measured page
   overflow.
5. The bundled fallback workbook contains five visible cards, including
   `Custom`, instead of the production 19-instrument V5 universe. Status chips
   correctly identify this as stale `V4.7 FALLBACK`, but the contrast with live
   mode is substantial.
6. The first reload frame is nearly blank before HEL content appears. The
   `Mapping market terrain` notice exists but may be too transient to replace
   the blank first frame consistently.
7. The live data-source error is redacted but only reports `<Response [404]>`;
   it provides no operator recovery action.
8. Keyboard focus reaches the card checkbox and displays an outline, but Space
   does not perform the flip. Pointer and tap operation work.
9. The Streamlit dashboard has no explicit invalidation surface and no market
   calendar surface, despite related contracts and notification-layer logic.
10. The System Operations heading permalink was observed pointing to
    `#signal-audit` in the accessibility snapshot.

## Known HEL-032 deviations

The existing approved deviations remain unchanged:

- Streamlit widgets remain in the DOM for accessible controls and application
  stability; HEL governs their presentation rather than replacing their
  behavior.
- Plotly uses explicit hexadecimal fallbacks because CSS custom properties are
  unreliable inside SVG/canvas rendering.
- HEL audio hooks are not implemented.
- Legacy inline CSS remains in `app.py` as rollback-compatible presentation
  scaffolding while `hel_cartographer.py` overrides the visible environment.
- Reduced sensory is an explicit application control; reduced motion is an OS
  media-query response rather than a second dashboard toggle.

## Framework residue

The visible shell no longer resembles default Streamlit, but framework residue
is intentionally not zero:

- 35 distinct `st*` data-test-id families were present in the Overview DOM;
- the sidebar expand/collapse chevrons remain framework controls;
- selectboxes, radio groups, uploader behavior, Plotly container, and dataframe
  toolbar behavior remain Streamlit-backed;
- dataframe show/hide, CSV download, search, and fullscreen controls remain
  visible in dense operational views.

This is consistent with the approved HEL-032 implementation document, which
prioritizes accessibility and rollback safety over removing working framework
semantics.

## Protected business behavior

The baseline operation did not change or invoke:

- instrument scoring or calibration;
- live evidence, market values, workbook formulas, or normalized signals;
- FRED, CFTC, webhook, or TradingView ingestion;
- Telegram, Pushover, or email delivery;
- scheduler timing or Apps Script triggers;
- Google Sheet data or permissions;
- secrets, tokens, recipients, chat IDs, or webhook URLs;
- production URLs, deployments, caches, authentication, or persistence.

Only read-only Sheet access, local rendering, controlled local error simulation,
mock test paths, and local screenshot generation were used.

## Comparison law for HEL-028 work

Future HEL-028 implementation must compare against this record and the dual-HEL
authority contract. A change is a regression unless it either:

1. preserves the captured HEL-032 world and behavior; or
2. intentionally repairs a defect listed above without changing business
   behavior or transferring world authority from HEL-032.

The governing law remains: **HEL-032 controls the world; HEL-028 controls the
instruments.**
