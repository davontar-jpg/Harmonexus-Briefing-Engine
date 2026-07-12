# HEL-032 Cartographer's Chamber Implementation

This note documents the repository-wide presentation integration of the selected Harmonexus Environment Library package:

`HEL/HEL-032_cartographers-chamber`

SAFE_MODE was preserved. The implementation is presentation-only and does not modify market logic, calculations, ingestion, scheduling, alerts, authentication, persistence, caching, secrets, production URLs, or business rules.

## Environment mapping

- Observation zone: Overview workspace, instrument map cards, seasonal watch, directional pressure.
- Interpretation zone: Instrument Lab, institutional read, driver layer, gauge.
- Risk zone: Signal Audit, contradiction table, explanation trace, prior reading/change.
- Decision zone: Operations status, deployment/health/notification logs.
- Memory zone: Data Explorer, calibration/history tables.

## HEL components implemented

- `MarketObject`: instrument flip cards with directional tone, regime age, confidence, reliability, and context alignment.
- `RegimeField`: top status strip, freshness, contract mode, credential state, and market-regime hero.
- `DiscoveryMap`: overview grid and seasonal watch surfaces.
- `AuctionSurface`: gauge/pressure visualization and driver contribution rows.
- `RiskVault`: Signal Audit surfaces for contradictions, explanation traces, prior readings, and calibration history.

## Framework-default replacement/control

- Streamlit app chrome is suppressed.
- Sidebar controls are restyled as chamber controls.
- Metrics are replaced with HEL stat surfaces on Signal Audit and Operations.
- Instrument Lab tabs were replaced with a HEL-styled inspection-layer selector.
- Dataframes are wrapped in HEL table shells.
- JSON output is rendered through a HEL code block instead of the raw Streamlit JSON block.
- Alerts, selectors, uploader, tables, focus states, mobile layout, reduced motion, and reduced sensory modes are governed by the HEL environment layer.

## Deliberate deviations

- Streamlit widgets remain as accessibility-capable controls in the DOM, but their visual presentation is governed by HEL CSS. This avoids fragile rewrites of data loading and uploaded-workbook behavior.
- Plotly gauge colors use equivalent hex fallback values because Plotly does not reliably consume the generated OKLCH/CSS-variable token values inside SVG/canvas rendering.
- Audio behavior from the HEL package is not implemented; the current Streamlit deployment has no approved audio subsystem.
- The original inline app CSS remains below the HEL override layer for rollback safety. HEL CSS is loaded after it and controls the visible presentation.

## Validation expectations

- Python compilation must pass.
- Existing JavaScript tests must pass.
- Existing Python tests must pass where dependencies are available.
- Streamlit smoke test should return HTTP 200 locally.
- No scheduler, secrets, notification send, market calculation, ingestion, or deployment mutation is required for this environment-only implementation.
