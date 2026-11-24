# Silver temporal intelligence — research acceptance, 2026-11-24

Status: **local research only; not cleared for production publication**. Dashboard base: `bc5e72b`. Existing Apps Script base: `6a62d05`. Neither checkout was rewritten, and no Google Sheet, trigger, notification destination or webhook was modified.

## Capability inventory

| Requested capability | Prior state | Reuse or new result |
|---|---|---|
| Weekly H/L and daily extreme timing | C/D — Timing_Calibration and Research_Timing_Windows contain summarized weekday/hour observations. One silver timing row was derived from COMEX continuous futures. No live spot timing model found. | Separate spot distributions, checkpoint frequencies and a chronologically evaluated prefix-range candidate. COMEX is not treated as spot. |
| Range completion and session expansion | D — legacy Expansion_Profile, Sequence_Stats, timing research and HEL-034 session analytics. | Complete-period spot baselines, remaining expansion, rolling median/mean comparison and fixed ET window attribution; descriptive only. |
| Auction requirement | C — V4 briefing already consumes Structure-sheet evidence; XAGUSD rows include manual placeholders. | Preserve V4. A historical numeric example uses two confirmed hourly closes and the actual prior-session boundary. |
| Day/week regime, retracement, activation and trailing frontier | E — no qualifying candle-path research implementation found in inspected branches. | Observable prefix classifier, retrospective outcome, research-only daily/weekly simulation grid and sensitivity checks. No regime classifier or trailing band was promoted. |
| Event paths and analogs | C/D — Market Calendar Watch already feeds the briefing; existing summaries are not timestamped event paths. | No new promotion. Event-history alignment and an independent usable analog cohort are still unverified. |
| Silver gauges, seasonality and research authority | A for existing presentation / D for unpromoted factors. | Existing HEL-034/035 and Seasonal Watch untouched; no gauge is promoted. |
| Output parity, discipline and calibration | A for existing dry-run/scheduled renderer and scoring calibration; E for the new archive holdout ledger and discipline maxim. | Opt-in archive view on the dashboard branch; separate local briefing candidate adds one discipline reminder subject to available Telegram budget; offline replay ledger does not touch the existing OOS ledger. |

## Data and provenance

The private source is the existing `FX_XAGUSD, 60.csv` export: 20,267 closed hourly spot bars, January 2, 2023 23:00 UTC through June 8, 2026 04:00 UTC (last bar close). OHLC only; exported indicator columns were not treated as point-in-time research features. The derived snapshot records the source hash and model version. 861 complete sessions and 156 complete weeks qualified. 25 observed sessions and 23 observed weeks did not qualify.

Separate OANDA spot overlap: 73 matched full sessions and 13 full weeks. Daily extreme-hour agreement was 63/73 for highs and 71/73 for lows; weekly agreement was 13/13 for high weekday and 12/13 for low weekday. Median absolute daily range difference was $0.049/oz. Agreement on overlapping dates is a feed consistency check, not independent predictive validation. Do not stitch these feeds, or splice in COMEX, an ETF or monthly candles.

The canonical workbook's `Structure`, `Live_Inputs` and `Webhook_Log` expose manual levels, observations and factor events, not a verified historical and up-to-date spot OHLC sequence. `HEL_035_Runtime` and all 19 published scores were present on November 24; those timestamps are not spot candle freshness. No additional dataset was downloaded. [TradingView's supported historical chart access](https://www.tradingview.com/support/solutions/43000480679-historical-intraday-data-bars-and-limits-explained/) is subject to symbol and account limits. [OANDA documents candle granularity and complete bars](https://developer.oanda.com/rest-live-v20/instrument-df/); account entitlement and continuity were not established. Neither source establishes the operator's broker point convention.

## Computed results

All distances are USD per troy ounce. The historical cohort admits only full 23-hour 18:00–17:00 New York trading sessions as observed on the FX spot export, with five complete weekdays per week. Time conversion is DST-aware. Incomplete, shortened and gap-containing sessions are removed; holiday-specific behavior is not inferred. First observation wins ties. These frequencies are not live forecasts, particularly during holiday weeks.

| Weekly extreme | Mon | Tue | Wed | Thu | Fri |
|---|---:|---:|---:|---:|---:|
| High | 23.7% | 10.9% | 10.9% | 14.7% | 39.7% |
| Low | 34.0% | 16.7% | 10.9% | 16.0% | 22.4% |

Friday's 62/156 high frequency has a descriptive Wilson interval of 32.4%–47.6%. Monday's 53/156 low frequency has a descriptive interval of 27.0%–41.7%. The largest single daily high bucket was 09:00 ET (89/861); the largest single daily low bucket was the 18:00 ET reopening hour (144/861). Weekday-only probabilities after Tuesday close: 34.6% already-formed highs and 50.6% already-formed lows, averaged across complete weeks. The prefix-range candidate did not improve both extremes consistently across validation and holdout. For example, after Tuesday its holdout Brier loss improved from 0.261 to 0.240 for lows but worsened from 0.212 to 0.230 for highs. No conditional forecast was promoted.

Median completed range: **$0.770/day**, **$1.840/week**. Median remaining archive expansion: $0.145 after 09:00 ET and $0.733 after Tuesday close. Among 173 held-out days, 79 expanded after 09:00 ET by more than one quarter of their lagged median full range. Rolling median daily MAE was $2.351 vs $2.450 for mean; weekly median MAE was $8.273 vs $6.583 for mean. The large holdout errors argue against a current range target. Historical ranges can exceed a benchmark.

The overnight ET window accounted for the largest added session range on 610/861 days. This includes the opening range, so it is not a fair same-length comparison. The fixed 09:00–12:00 ET bucket led on 109/861 days and just 12/173 holdout days. No forward expansion window was promoted. The archive auction example on June 5 records two hourly closes below the June 4 low ($72.276). A close back inside the previous range challenges that interpretation. It is a historical candle observation, not proof of order flow.

### Holdout retracement and stop sensitivity

The first 60% is fitting history, the next 20% validation, and the last 20% holdout. Holdout cohorts and comparable feeds are not pooled. Simulations use next-bar opens after the 09:00 ET daily checkpoint or after Tuesday's close for weekly episodes, use only prior periods for the scale, and do not ratchet a stop inside an unresolved OHLC bar. Stop crossing uses the prior ratchet plus adverse gaps. Modeled costs are sensitivity scenarios, not broker fills. A healthy continuation must recover a close-to-close pullback in the finite horizon and close at least 0.25 lagged median ranges beyond entry. The comparator below is the training p75 distance at 0.25-range activation and 0.01-range costs, not a recommendation. Quantiles with small samples are exploratory.

| Horizon | Prefix regime | Holdout episodes / recovered | Median | P75 | P90 | Candidate distance | Survival | Premature stop | Median giveback | Validated reference |
|---|---|---:|---:|---:|---:|---:|---|---|---:|---|
| Daily | Bullish trend | 36 / 24 | 0.361 | 0.620 | 0.976 | 0.649 | 4/10 | 6/10 | 0.609 | None |
| Daily | Bearish trend | 14 / 10 | 0.542 | 1.561 | 1.945 | — | — | — | — | None; inadequate fit sample |
| Daily | Consolidation | 80 / 34 | 0.279 | 0.507 | 0.812 | 0.712 | 1/18 | 17/18 | 0.836 | None |
| Weekly | Bullish trend | 1 / 1 | — | — | — | — | — | — | — | None; insufficient holdout |
| Weekly | Bearish trend | 0 / 0 | — | — | — | — | — | — | — | None; no holdout |
| Weekly | Consolidation | 25 / 18 | 1.599 | 2.304 | 4.246 | 0.782 | 0/8 | 8/8 | 0.834 | None |

No activation threshold was promoted. Open/high/low/close do not establish intrabar fill order, especially on catalyst candles. No 5/15/30-minute, separate London-local holiday-aware, event-path, directional analog, multiday two/three-day, or broker-point claim is made. The JSON contains all tested tight/balanced/expansive scenarios and their denominators, along with 173 daily and 32 weekly holdout checkpoints in the separate JSONL. Wilson intervals are descriptive binomial intervals, not a serial-dependence correction.

## Preservation and release gates

The November 24 07:04 ET sent Gmail copy retains HARMONEXUS / Chief Investment Officer Robinson, the canonical macro and CIO sections, VIX, Silver Intelligence, and Calendar Watch. The production log records 2,254 JavaScript string units for Telegram and 10,568 for the plain formatter's email output. The retrieved Gmail MIME text has 11,093 characters including transport line endings. A private local copy contains the actual Gmail text without headers. No Telegram body can be independently retrieved from the available connector; the production formatter length is not receipt verification.

The dashboard loads this versioned archive file only when `HARMONEXUS_SILVER_ARCHIVE_SNAPSHOT` is explicitly configured and XAGUSD is selected in Instrument Lab. Missing or malformed data does not change live scores or delivery. The briefing candidate has an isolated text-only reminder addition and a removal-equivalence regression test. It does not consume the archive or add live claims. There is no new scheduled task, publication step, trigger or notification destination.

Reproduce with `python tools/build_silver_temporal.py <FX export> --comparison <OANDA export> --as-of <ISO timestamp with offset> --out <private snapshot.json> --ledger-out <new private ledger.jsonl>`. Keep the source files and generated research artifacts outside Git. Removing the opt-in environment variable hides the local view. Existing production needs no rollback because neither candidate was deployed.

Before operational release: obtain current continuous spot candles with provider calendar/precision provenance, acquire signed point-in-time event timestamps and, for sub-hourly simulation, verified candle/spread data. Replay forward without retuning the holdout, then establish shared runtime acceptance and real provider receipt. Do not run an attended send against this archive-only candidate.
