# HEL-028 Analytical Surfaces

## Scope

This phase completes the visual and interaction contract for analytical and
decision-support surfaces. It does not change score calculation, normalization,
source ingestion, market-state logic, notification delivery, scheduling, or
integration behavior.

The immutable law remains:

> HEL-032 controls the world; HEL-028 controls the instruments.

HEL-032 continues to own page geography, terrain, route and relationship
semantics, environmental material, discovery language, regime context, and
world-scale behavior. HEL-028 supplies exact readout housing, tabular numerics,
axes, labels, warning states, inspection behavior, confidence treatment, and
decision-boundary clarity inside those world surfaces.

## Registered analytical contracts

The centralized component resolver now registers these additional roles:

- `primary_briefing`
- `cross_asset_consensus`
- `contradiction_analysis`
- `priority_instruments`
- `auction_rhythm`
- `calendar_structure`
- `scenario_analysis`
- `regime_state`
- `confidence_instrument`
- `relationship_visualization`
- `instrument_history`
- `audit_trace`

Each role has HEL-032 as structure owner and HEL-028 as interaction owner. The
role-specific authority domain prevents the operator treatment from replacing
the Cartographer's Chamber world model.

## Converted views

### Overview / primary briefing

- Published priority instrument, regime, regime age, composite strength,
  confidence, reliability, and source freshness use a single precision
  briefing surface.
- Key contradictions remain plain-language published evidence.
- Priority instruments retain existing score ranking and show exact direction,
  strength, and confidence.
- Seasonal Watch remains event-driven and uses existing published content.
- Highest-conviction driver rows display the existing factor contribution
  contract.
- The directional-pressure gauge uses resolver-provided Plotly-safe colors.

### Relationship intelligence

- The latest `Relationship_Cache` payload is rendered without recalculation.
- Macro Consensus preserves its exact 0–100 score, classification, coverage,
  evaluated count, confirmations, and contradictions.
- Lead-Lag Watch preserves its exact supported-pair count, leaders, followers,
  confidence, and note.
- Missing relationship evidence remains `UNKNOWN` / `UNAVAILABLE`; it is never
  converted to zero.
- The consensus visualization is explicitly labeled as supplemental confidence
  context and never as direction.

### Calendar and auction rhythm

- `market_calendar_watch.get_market_calendar_watch()` remains the sole source
  for week structure, rhythm risk, liquidity, calendar confidence, conditions,
  catalysts, auction adjustment, and operational assessment.
- Calendar context is presented as participation/liquidity context only.
- No calendar field changes instrument direction.

### Instrument Lab

- Regime, age, strength, confidence, reliability, and freshness are explicit.
- The directional gauge is mounted in registered chart housing.
- Interpretation uses the existing AI interpretation output or the existing
  fallback sentence.
- Drivers and raw contracts preserve the centralized dense-data renderer.
- History adds an exact timestamp/value Plotly trace above the existing table.
- Scenario, confirmation, risk, and invalidation expose only fields already
  published by the score row. Missing values remain `UNKNOWN`.

### Signal Audit

- Source inputs, factor weights, calculations, freshness, material change,
  prior reading, calibration history, contradictions, explanation trace, risk,
  and invalidation remain visible.
- Contradictions use a compact analytical list rather than a generic grid.
- Explanation JSON retains the raw-inspection contract inside an `audit_trace`
  ownership boundary.
- Published score history is charted without changing the stored observations.

### Card backs

- Front-card identity and dimensions are unchanged.
- The back remains the same-size Context Alignment surface with five existing
  alignment layers, exact direction/confidence, regime age, and agreement.
- Pointer/tap toggles the native checkbox.
- Keyboard focus reveals the back with a visible focus boundary.
- Reduced motion removes the transform transition.
- Desktop and 390 px faces matched within 0.07 px and did not clip.

## Data and calculation boundaries

The Streamlit layer reads existing evidence from:

- `Instrument_Scores`
- `Calculated_Signals`
- `Score_History`
- `Calibration_History`
- `AI_Interpretations`
- `Relationship_Cache`
- the existing dependency-light Market Calendar Watch module

No new scorer, signal, relationship statistic, confidence threshold, market
direction, or source-ingestion route was introduced. The 19-instrument visual
test used a temporary synthetic workbook outside this repository. That fixture
was not bundled, staged, or committed.

## Visual validation

Durable evidence is stored in
`review/baselines/hel-028-analytical-surfaces/`.

| Screenshot | Evidence |
| --- | --- |
| `01-overview-1536x864.png` | Existing stale/V4.7 fallback warning state |
| `02-overview-19-instruments-1536x864.png` | V5 19-instrument overview |
| `03-instrument-lab-1536x864.png` | Regime/confidence and Instrument Lab shell |
| `04-instrument-history-1536x864.png` | History layer and chart housing |
| `05-card-back-keyboard-1536x864.png` | Desktop card-back interaction |
| `06-mobile-card-back-390x844.png` | Same-size, unclipped mobile back face |
| `07-mobile-overview-front-390x844.png` | Mobile front face and one-column composition |
| `08-signal-audit-mobile-390x844.png` | Mobile audit metrics, table, and contradiction state |
| `09-signal-audit-1536x864.png` | Desktop Signal Audit |
| `10-live-source-unavailable-1536x864.png` | Missing-credential unavailable state without exception |
| `11-reduced-sensory-1536x864.png` | Reduced-sensory operator state |
| `12-briefing-relationship-surfaces-1536x864.png` | 19-card terrain and responsive density |
| `13-briefing-relationship-surfaces-1536x864.png` | Seasonal, consensus, lead-lag, calendar, and auction instruments |

### 19-instrument result

The local V5 validation render displayed exactly these 19 instruments with no
Streamlit exception and no horizontal document overflow:

`XAGUSD`, `GOLD`, `COPPER`, `PLATINUM`, `US30`, `SPX500`, `NAS100`,
`RUSSELL2000`, `DXY`, `EURUSD`, `GBPUSD`, `GBPJPY`, `EURJPY`, `USDJPY`,
`USDDKK`, `US2Y`, `US5Y`, `US10Y`, and `US30Y`.

The order in the four-column terrain follows Streamlit column flow, while the
instrument set remains complete.

### Geometry and state results

- Desktop first-card front: 278.52 × 218.02 px
- Desktop first-card back: 278.48 × 217.98 px
- Mobile first-card front: 355.97 × 205.98 px
- Mobile first-card back: 356.03 × 206.02 px
- Desktop and mobile back-face clipping: false
- Desktop and mobile horizontal document overflow: 0 px
- Keyboard focus: visible and back face revealed
- Pointer click: checkbox selected and 180-degree transform active
- Reduced sensory: selected with optical/motion override present
- Live Sheets without local credentials: controlled `unavailable` state, no
  stack trace or Streamlit exception
- Stale bundled source: explicit stale state retained

## Accessibility and precision

- Analytical states include visible text (`nominal`, `informational`, `stale`,
  `warning`, `critical`, `acknowledged`, `unavailable`, `loading`, `failed`), so
  color is never the sole signal.
- Numerical readouts and table surfaces use tabular numerics.
- Charts preserve exact axis titles and hover values.
- History charts expose mode-bar inspection tools; compact gauges suppress
  irrelevant controls.
- Card backs are keyboard discoverable and retain pointer/tap behavior.
- Existing reduced-motion and reduced-sensory contracts cover the new housing.
- Mobile controls remain at least 44 px and analytical readouts recompose to two
  columns without changing the global HEL-032 world.

## Deviations

1. Relationship and history charts remain unavailable when their source sheets
   have no published observations. No synthetic value is shown in that state.
2. Scenario fields not published by an instrument remain `UNKNOWN`; the UI does
   not infer base/upside/downside cases.
3. The bundled V4.7 workbook still contains its historical five-row universe,
   including the legacy `Custom` row. That source data was not changed.
4. Browser validation used the existing responsive Streamlit sidebar behavior;
   this phase does not replace navigation architecture.

## Regression gate

- Python: 46 passed
- JavaScript: 43 passed
- Apps Script syntax: manifest plus 12 modules passed
- Apps Script package build: 12 modules passed
- Python compilation: passed
- Streamlit local response: HTTP 200
- V5 synthetic render: 19 cards, 0 runtime exceptions, 0 px horizontal
  document overflow at desktop and 390 px
- Notification scheduler and live integrations: not invoked
