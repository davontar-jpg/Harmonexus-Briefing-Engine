# HEL-032 + HEL-028 Operator Ergonomics Validation

Date: 2026-07-18  
Branch: `codex/hel-028-operator-layer`  
Pre-refinement HEAD: `7dd95f4b7b2ab1abcd20ca5c6132d8bb5d58dee5`

## Scope and invariants

This pass refines only presentation density, control reach, responsive
recomposition, accessibility mechanics, and render efficiency. HEL-032 remains
the environmental world and HEL-028 remains the operational instrument layer.
No scoring, market calculation, source ingestion, alert, notification,
scheduler, persistence, or integration behavior changed.

The legacy pre-HEL CSS remains in `app.py` as a sealed migration reference but
is no longer emitted into the runtime DOM. The active application receives
presentation only from the centralized HEL-032 renderer and HEL-028 operator
renderer.

## Repairs completed

- Changed the instrument-card render order from column-major to row-major so
  visual order, DOM order, and keyboard order now agree.
- Restored the native card checkbox as the only focusable flip control. Space
  toggles the card, focus remains on the switch, and the focus ring is visible.
- Kept permanent compositor hints off card faces; `will-change` is enabled only
  for hover, focus, or active flips.
- Added independent main-canvas and operator-rail scrolling, stable scrollbar
  gutters, contained overscroll, and focus scroll margins.
- Recompacted workspace headings, status banks, stat instruments, inspection
  surfaces, analytical instruments, and vertical section rhythm.
- Reflowed instrument cards to two columns at 1100 px and one column at 640 px,
  eliminating the narrow four-column tablet state.
- Preserved the same card front identity and same-size flip. Front and back
  dimensions match; the observed one-to-two-pixel outer-bound difference is
  border rasterization, not a content-size change.
- Bounded table height to 176–420 px from row count and reduced Plotly gauge,
  history, and consensus heights without removing information.
- Cached the HEL Plotly palette and eliminated duplicate seasonal-watch
  evaluation.
- Added labelled regions and heading semantics to analytical, data, risk, and
  chart instruments.
- Added `content-visibility` as a progressive paint optimization for analytical
  and inspection instruments. Unsupported browsers keep the normal render.

## Exact viewport validation

The 19-instrument deterministic validation workbook was used. All widths are
CSS pixels and every measurement was taken after the complete 19-card DOM
settled.

| Physical layout | Card arrangement | First card | Horizontal overflow | Status clips | Result |
|---|---:|---:|---:|---:|---|
| 1366×768 | 4 columns | 311×218 | No | 0 | Pass |
| 1536×864 | 4 columns | 353×218 | No | 0 | Pass |
| 1920×1080 | 4 columns in governed max-width world | 357×218 | No | 0 | Pass |
| Tablet landscape 1024×768 | 2 columns | 469×218 | No | 0 | Pass |
| Tablet portrait 768×1024 | 2 columns | 357×218 | No | 0 | Pass |
| Mobile 390×844 | 1 column | 356×206 | No | 0 | Pass |

The mobile route control remained visible, the operator rail remained
independently scrollable, and no selected visible control target measured below
44 px.

## Browser zoom and high-DPI validation

Browser zoom was validated by testing the equivalent CSS viewports while the
physical browser frame remained 1366×768.

| Scale | Equivalent viewport | Card arrangement | Horizontal overflow | Status clips | Result |
|---|---:|---:|---:|---:|---|
| 100% | 1366×768 | 4 × 311 px | No | 0 | Pass |
| 125% | 1093×614 | 2 × 503 px | No | 0 | Pass |
| 150% | 911×512 | 2 × 428 px | No | 0 | Pass |

A separate 1536×864, device-pixel-ratio 2 run retained the 1536×864 CSS
viewport, 353×218 card geometry, zero status clips, and zero horizontal
overflow. `text-size-adjust: 100%` keeps numerical labels predictable on
high-density and mobile displays.

## Accessibility matrix

| Requirement | Evidence | Result |
|---|---|---|
| Complete keyboard navigation | Native workspace controls retained; all 19 card switches remain in row-major DOM order | Pass |
| Logical tab order | Sidebar route order precedes Overview card order; no duplicate focusable card label | Pass |
| Visible focus | Focused card switch produced a solid HEL-028 operator outline | Pass |
| Focus restoration | Space toggled the first card and focus remained on its native switch | Pass |
| Semantic labels | Overview exposed one live status and ten labelled analytical/briefing regions; data/risk/chart headings have explicit levels | Pass |
| Contrast | Approved HEL-032 and HEL-028 AA-gated content/status tokens remain unchanged; no new color token was introduced | Pass |
| Reduced motion | Main scrolling resolves to `auto`; card transition resolves to `0s` | Pass |
| Reduced sensory | Enabling the existing mode left zero running animations after settling | Pass |
| No color-only meaning | Nominal, stale, warning, critical, failed, and unavailable states retain visible text labels | Pass |
| Touch targets | Zero selected visible navigation, control, select, or card targets below 44 px at 390 px | Pass |
| Numerical readability | HEL-028 tabular/numeric typography and exact score labels remain intact | Pass |
| Screen-reader statuses | Status, region labels, headings, definitions, and native switch semantics remain exposed | Pass |

## Functional and interaction validation

- All 19 instrument cards rendered.
- Overview rendered two Plotly instruments.
- Instrument Lab rendered its chart and existing selectors.
- Signal Audit rendered three tables and one chart.
- Operations rendered six tables.
- Data Explorer rendered its table.
- Every workspace had zero horizontal overflow.
- Keyboard Space flipped a card, retained focus, and front/back faces remained
  dimensionally stable after the transition.
- Source mode, market values, scoring, risk state, and notification behavior
  were not invoked or mutated.

## Performance comparison

The baseline and refined DOM comparison below uses the same five-instrument
fallback fixture at 1366×768 so the values are comparable.

| Metric | Pre-refinement | Refined | Change |
|---|---:|---:|---:|
| DOM elements | 908 | 726 | −182 (−20.0%) |
| Runtime style tags | 9 | 7 | −2 (−22.2%) |
| Runtime CSS bytes | 147,890 | 141,638 | −6,252 (−4.2%) |
| Main scroll height | 2,757 px | 2,616 px | −141 px (−5.1%) |

The full 19-instrument page reached a settled card DOM in 4.819 seconds in a
fresh headless browser against the already-running local server. All workspace
validation envelopes completed in 0.915–0.969 seconds, including a fixed
0.900-second observation delay. The settled Overview had zero running animation
loops. Plotly colors are now resolved once per process, charts retain explicit
bounded heights, and off-screen analytical paint is deferred where supported.

## Validation commands and results

- Python compilation: pass.
- Python test suite: `51 passed in 6.72s`.
- JavaScript test suite: `43 passed, 0 failed`.
- Apps Script syntax validation: manifest plus 12 modules passed.
- Apps Script package build: 12 modules built successfully.
- Local Streamlit response: HTTP 200 on both fallback and 19-instrument
  validation servers.
- Exact-resolution visual capture: pass at all six target physical layouts.
- No notification, scheduler, production source, or live integration was run.

## Retained evidence

- `review/baselines/hel-028-ergonomics/briefing-1366x768.png`
- `review/baselines/hel-028-ergonomics/briefing-1536x864.png`
- `review/baselines/hel-028-ergonomics/briefing-1920x1080.png`
- `review/baselines/hel-028-ergonomics/briefing-tablet-landscape-1024x768.png`
- `review/baselines/hel-028-ergonomics/briefing-tablet-portrait-768x1024.png`
- `review/baselines/hel-028-ergonomics/briefing-mobile-390x844.png`
- `review/baselines/hel-028-ergonomics/instrument-lab-1536x864.png`
- `review/baselines/hel-028-ergonomics/signal-audit-1536x864.png`
- `review/baselines/hel-028-ergonomics/operations-1536x864.png`
- `review/baselines/hel-028-ergonomics/data-explorer-1536x864.png`

## Known non-ergonomic states

The review workbook intentionally presents demo/stale source labels. Those are
data-state facts and remain visible by design; they are not visual defects. The
mobile evidence image is a physical viewport capture rather than a full-page
stitch, so the full briefing remains available by vertical scrolling.
