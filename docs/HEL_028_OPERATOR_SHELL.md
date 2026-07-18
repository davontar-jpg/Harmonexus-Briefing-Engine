# HEL-028 Operator Shell Installation

Status: validated first visible implementation phase

Captured: 2026-07-16 (America/New_York)

Branch: `codex/hel-028-operator-layer`

Foundation commit: `32520b56ed81fb47aae2fc6bec5f52eb7766fa91`

Authority law: **HEL-032 controls the world; HEL-028 controls the instruments.**

## Scope

This phase installs a private institutional operator apparatus inside the
production-approved Cartographer's Chamber. It changes presentation and
interaction anatomy only. Market logic, calculations, data contracts,
ingestion, notifications, scheduling, secrets, persistence, authentication,
and integrations remain unchanged.

The HEL-032 CSS renderer remains a separate, unchanged world layer.
`hel.operator_shell_css()` is loaded after it and consumes only centralized
dual-runtime tokens, materials, motion, and typography.

## Components converted

- Top operational rail and operator identity
- Source, freshness, contract, and credential status bank
- Sidebar operator reach zone and environmental mounting surface
- Source-mode controls
- Workspace navigation controls
- Universe, instrument, and data-layer selectors
- File-upload and standard action controls
- Reduced-sensory control and operator-specific sensory override
- Decision-support / no-execution risk seal
- Keyboard focus, active, disabled, and compact mobile control behavior

The action contract declares distinct primary, secondary, destructive,
confirmatory, and passive roles. Idle, hover, focus, active, disabled, loading,
success, warning, and failure states are present. The current Streamlit app has
no real destructive, acknowledgement, refresh, briefing-send, or execution
buttons, so no fictitious actions were added merely to demonstrate those
roles.

## Before / after evidence

Before-state evidence remains sealed under
`review/baselines/hel-032-pre-hel-028/`.

| Comparison | Before | After |
|---|---|---|
| Bundled fallback overview and controls | `01-overview-1536x864-bundled-fallback-warning.png` | `hel-028-operator-shell/01-overview-1536x864.png` |
| Operator bay at desktop | `01-overview-1536x864-bundled-fallback-warning.png` | `hel-028-operator-shell/02-operator-bay-1536x864.png` |
| Instrument inspection | `07-instrument-lab-xagusd-chart-and-interpretation-1536.png` | `hel-028-operator-shell/03-instrument-lab-1536x864.png` |
| Mobile overview | `17-overview-live-mobile-390x844.png` | `hel-028-operator-shell/04-mobile-overview-390x844.png` |
| Mobile navigation | `19-mobile-navigation-open-390x844.png` | `hel-028-operator-shell/05-mobile-operator-bay-390x844.png` |

The world-scale green stone, cartographic glass, map grid, environmental
lighting, discovery language, hero geography, cards, charts, and page
composition remain visibly HEL-032. HEL-028 adds a restrained blue-slate
instrument layer only where operators reach, select, inspect, or acknowledge
state.

## Functional preservation

- All five workspace routes rendered: Overview, Instrument Lab, Signal Audit,
  Operations, and Data Explorer.
- All three source choices remain present.
- Universe, instrument, inspection-layer, and data-layer selection remain
  present.
- Reduced-sensory mode removed operator blur, shadows, and transitions.
- Card flipping remained operational.
- Mobile XAGUSD card geometry remained same-size: shell `356x206`; front and
  back differed by less than `0.06px` in either dimension.
- The 390px viewport measured `390px` page width and `390px` scroll width: no
  horizontal overflow.
- Mobile status information recomposed into a two-by-two bank and all control
  targets retain a minimum 44px height.
- Browser console warnings/errors: zero.
- Streamlit runtime exceptions: zero.

## Validation

| Check | Result |
|---|---|
| Focused dual-HEL/operator-shell tests | 19 passed |
| Complete Python suite | 31 passed |
| JavaScript suite | 43 passed, 0 failed |
| Apps Script syntax | Manifest plus 12 modules passed |
| Apps Script build | 12 modules built successfully |
| Python source compilation | 20 files passed |
| Streamlit HTTP/render smoke | Passed |
| Desktop visual check | Passed at 1536x864 |
| Mobile visual check | Passed at 390x844 |
| Workspace navigation | 5/5 routes passed |
| Reduced sensory | Passed |
| Card flip and same-size faces | Passed |

No notification, scheduler, webhook, Sheet write, deployment, or production
integration was invoked.

## Deviations and known inherited behavior

1. The current Streamlit surface does not contain real refresh, briefing-send,
   acknowledgement, destructive, or execution actions. Their HEL-028 anatomy
   is defined, but no inert or misleading controls were introduced.
2. The bundled V4.7 fallback workbook continues to expose five cards including
   `Custom`; the production V5 live-Sheet universe is intentionally outside
   this local presentation test.
3. Operations and Data Explorer cause Streamlit to log its existing automatic
   Arrow-coercion warnings for heterogeneous legacy fallback columns. Streamlit
   applies its fallback conversion, the tables render, and no browser or app
   exception is exposed. This presentation phase does not modify table data.
4. The full timestamp remains present in the DOM and truncates visually at very
   narrow widths to protect the active status and risk context.

## Rollback boundary

Remove the `hel.operator_shell_css()` injection and restore the prior topbar,
status-strip, sidebar heading, and footer markup in `app.py`. The sealed
HEL-032 renderer and business behavior remain independently intact.
