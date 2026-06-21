# v4.7 → v5 migration

## Safety model

v5 is additive. Do not delete the legacy `Dashboard`, `Signal_Engine`, `Machine_Input`, `Briefing`, timing, seasonality, or structure sheets during the initial rollout.

1. Make a copy of the production Google Sheet.
2. Install the `src/` scripts in the copy.
3. Run `setupHarmonexus()` to add the v5 contract sheets.
4. Seed `Calculated_Signals` for the four legacy instruments from the existing Signal Engine or TradingView.
5. Compare v4.7 direction and v5 direction for XAGUSD, US30, SPX500, and NAS100 for at least five refresh cycles.
6. Review disagreements as methodology questions, not merely software defects. Missing v5 factors should lower confidence.
7. Configure one push channel and test `sendDailyBriefing()`.
8. Configure `WEBHOOK_SECRET`, redeploy the Web App, and send a duplicate-event test.
9. Enable triggers only after health and log sheets show expected results.

Run `validateHarmonexusInstallation()` after setup and `runParallelComparison()` after every score cycle during the parallel-test period.

## New sheets

- `Instrument_Registry`: modular universe and weights
- `Normalized_Data`: source-independent observations
- `Calculated_Signals`: factor values normalized to -1..+1
- `Instrument_Scores`: current score snapshot
- `Score_History`: append-only prior readings
- `AI_Interpretations`: evidence and model/fallback output

## Rollback

Disable the four v5 triggers and continue using the legacy sheets/functions. Because the migration does not replace legacy calculation sheets, rollback does not require restoring formulas.

The exact rollback procedure is in `docs/ROLLBACK.md`.

## Known calibration work

The registry supplies an architecture and initial factor-weight framework, not a claim that every new instrument is statistically calibrated. Gold, copper, platinum, Russell 2000, FX crosses, and rates should graduate from provisional to calibrated only after their history, thresholds, timing, and proxy behavior are validated.
