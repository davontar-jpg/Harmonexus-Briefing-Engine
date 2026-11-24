# Silver temporal intelligence — second-pass release evidence

This release publishes historical observations in Instrument Lab → XAGUSD. It does not feed the archive into live scoring, price freshness, directional forecasts, or notification decisions. `SILVER_TEMPORAL_ACCEPTANCE.md` records the earlier hourly baseline; it is not the release status of this second pass.

## Sources, coverage, and refresh

| Source | Accepted bars and UTC coverage (bar starts) | Qualified periods | Use |
| --- | --- | --- | --- |
| [EV Trading Labs](https://evtradelabs.com/data), Dukascopy-derived bid candles | 778,441 M5, 2015-01-01 23:00 through 2025-12-31 21:55 | Full: 2,311 sessions / 304 weeks. Core: 2,712 / 447. | Public aggregate. Independent M15 and H1 aggregations: 259,007 and 64,225 complete bins. |
| [HistData XAGUSD M1 archive](https://www.histdata.com/download-free-forex-historical-data/?/ascii/1-minute-bar-quotes/xagusd/2026/11) | 251,999 M1, 2026-03-01 23:08 through 2026-11-13 21:58 | Full: 2 sessions / 0 weeks. Core: 125 / 14. | Core-only public aggregate. 50,180 complete M5 and 16,491 complete M15 bins. Latest source M5 close: Nov 13, 21:55 UTC; latest complete five-day core week began Oct 12. |
| [GetData pinned public sample](https://github.com/getdata-finance/xagusd-1m-ohlcv-metals-historical-data/tree/c1526cc158ae8cba722383ad18f36ea1a333cbeb) | 179,847 M1, 2026-03-26 02:28 through 2026-09-25 20:44 | Core: 126 sessions / 21 weeks | Overlap/research only; withheld from dashboard. |
| Existing FX hourly export | 20,267 H1, 2023-01-02 to 2026-06-08 close | 861 sessions / 156 weeks | Prior private baseline and overlap audit. |

The [HistData time convention](https://www.histdata.com/f-a-q/) is fixed UTC−5 with no DST. Ingestion normalizes timestamps to UTC, then constructs New York trading-date grids with DST. The full grid is 18:00–17:00 ET; the core grid is 02:00–16:00 ET. Complete weeks require five fully observed weekdays. Holidays and gaps are not forward-filled. Full EV excluded 527 observed incomplete and 31 unobserved weekdays; HistData core excluded 59 incomplete and one unobserved weekday. Closures are included in exclusions, not counted as provider outages. HistData quarantined 312 timestamps with conflicting OHLC. The latest complete session and latest source bar are separate UI fields.

HistData vs. existing FX paired 1,467 H1 bars (median absolute close difference $0.160/oz; sign agreement 857/1,392 contiguous returns). GetData vs. FX paired 1,160 ($4.5225/oz; 1,107/1,108 sign agreement is not evidence of level compatibility). HistData vs. GetData paired 2,631 ($1.2435/oz; 1,210/2,405 sign agreement). No splicing or substitution with futures. No verified broker-point size, live candle access, or tick data. The current month archive stopped on November 13; current spot observations after that cutoff remain unverified. Direct [Dukascopy historical access](https://www.dukascopy.com/api/data/get/historical-data-export) did not yield an independently usable backfill in this environment. No paid bulk source or unprovisioned broker account was used.

The repeatable local path is `python tools/fetch_silver_histdata.py YEAR MONTH --cache <private-directory> --refresh-month MONTH`, followed by `python tools/build_silver_second_pass.py --cache <private-directory> --original <FX-export> --as-of <offset-aware-time> --public-output <reviewed-aggregate.json>`. Keep archive files, SQLite and the detailed research report out of Git. The SQLite store isolates provider and resolution, records content hashes/provenance and rejects inconsistent revisions transactionally. An identical rerun added zero bars. Calculation results are cached by code and source fingerprints. The public artifact carries attribution, hashes, complete/incomplete counts, and freshness, but no raw price stream. This is a refreshable archive, not an unattended feed or job.

## Weekly and daily findings

Percentages below are descriptive, not forward probabilities. The dashboard shows counts and percentages in 4/8/12/26/52 calendar-week and full windows, and the retrospective direction, magnitude and efficiency cuts remain in the research artifact.

| Source and extreme | Weeks | Mon | Tue | Wed | Thu | Fri |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| EV full high | 304 | 82 (27.0%) | 40 (13.2%) | 39 (12.8%) | 47 (15.5%) | 96 (31.6%) |
| EV full low | 304 | 100 (32.9%) | 45 (14.8%) | 39 (12.8%) | 44 (14.5%) | 76 (25.0%) |
| EV core high | 447 | 115 (25.7%) | 64 (14.3%) | 52 (11.6%) | 81 (18.1%) | 135 (30.2%) |
| EV core low | 447 | 129 (28.9%) | 76 (17.0%) | 58 (13.0%) | 78 (17.4%) | 106 (23.7%) |
| HistData core high | 14 | 5 (35.7%) | 4 (28.6%) | 2 (14.3%) | 1 (7.1%) | 2 (14.3%) |
| HistData core low | 14 | 3 (21.4%) | 2 (14.3%) | 3 (21.4%) | 3 (21.4%) | 3 (21.4%) |

Wednesday is not established as a recent special case. The recent 4-week window has no qualifying weeks, the 8/12-week windows have two each (Wednesday: 0 highs, 1 low), and the 26-week window has six (0 highs, 2 lows). The comparison tests the same feed against disjoint prior data with a multiple-test adjustment; small samples and the change of venue prevent treating a raw cross-feed difference as a change in probability.

Full EV daily highs most often fell in the 09:00 ET hour (239/2,311); the 18:00 ET reopen was the largest low bucket (231/2,311). The London–New York overlap contained 751 highs and 760 lows and added a median $0.0255/oz per hour, versus Asia $0.0193, London-only $0.0100, and New York-only $0.0000. Other hours, which include reopening, added $0.0440/oz per hour. Median remaining full-session range was $0.219 after 03:00 ET, $0.090 after 09:00, and $0.000 after 12:00. HistData core highs and lows most often fell in its first observed hour (02:00 ET; 33 and 22 out of 125): this reflects the bounded measurement window and is not a full-day finding. The artifact includes recent, holdout, and 09:00 prefix-regime range statistics. No next expansion window met a forward validation gate.

Median daily/weekly ranges ($/oz): EV full 0.483/1.1865, EV core 0.4125/1.011, HistData core 2.387/8.456. These are different market and archive periods, not transferable targets. The historical HistData example on Nov 13 had two hourly closes below the prior core-session low; a closed hour back inside that range challenges that observation. It says nothing about resting orders or current price.

The exact-time [Fed](https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm) and [BLS](https://www.bls.gov/schedule/2026/home.htm) path cohorts are four FOMC, six CPI and two Employment Situation days. Median pre/post 30-minute ranges were $0.426/$0.3785, $0.520/$0.374 and $0.3755/$0.359, respectively. Weekly before/after counts are smaller still (2, 4, and 2 observations). No event effect or timing signal is promoted. EV full analogs had median holdout absolute error $0.1180 vs. $0.1205 for the simple lagged baseline (463 paired episodes); recent HistData core was worse, $0.3968 vs. $0.2673 (16). No analog was promoted.

## Trailing and activation findings

Chronological 60/20/20 split, observable hourly prefix classifier across resolutions, next-bar open after the 09:00 or 03:00 ET checkpoint or after two completed weekly sessions. The simulator moves a trail only after a closed bar; it cannot reconstruct bid/ask fills or intrabar order. Compared fit-only fixed distance, two lagged range widths, lagged realized-volatility width and prefix structure width, covering three activation thresholds and two hypothetical costs. Outcomes exclude unresolved prefixes; a “healthy” window recovered a pullback and closed ≥0.25 prior median ranges beyond the hypothetical anchor. The comparison is not execution guidance.

| EV full M5 holdout | Total periods | Median recovered pullback: all / healthy / other ($/oz) | Survival: no threshold → 0.25-range → 0.50-range | Other exit at 0.25 activation |
| --- | ---: | --- | --- | --- |
| New York bullish prefix | 76 | 0.140 / 0.224 / 0.114 | 8/16 → 11/16 → 13/16 | 20/60 |
| New York bearish prefix | 38 | 0.160 / 0.251 / 0.121 | 4/8 → 5/8 → 7/8 | 5/30 |
| New York consolidating prefix | 250 | 0.1365 / 0.1705 / 0.1195 | 31/47 → 36/47 → 40/47 | 44/203 |
| Weekly consolidating prefix | 48 | 0.344 / 0.551 / 0.205 | 6/13 → 8/13 → 9/13 | 10/35 |

The table uses a predeclared 0.50-range width and 0.01-range cost, not the best row. At middle activation the validation survival counts were 13/16, 9/10, 38/47 and 13/14, so some cohorts deteriorated materially in holdout. Other exits fell as activation was delayed, and holding survival is not evidence of capture: median net retained at middle activation was negative in all four rows. The fixed fit-p75 comparator at middle activation survived just 1/16, 0/8, 4/47 and 2/13 in holdout. Daily consolidation median healthy recovered pullback varied from $0.084 on H1 to $0.157 on M15 and $0.1705 on M5 using the same outcome cohort. Resolution matters, but does not fix finite-sample or fill-order uncertainty. Weekly directional holdouts were empty on the full grid; the long core sample had 6 bullish and 3 bearish periods. Do not promote a daily or weekly operational trailing stop, activation level or forecast. Percentiles, MFE/MAE, recovery timing, giveback and retained move are included in the aggregate with denominators and in the full private report.

## Production boundaries

The dashboard publishes descriptive archive distributions, range and session statistics, event paths, historical price-only auction evidence, analog comparison and a trailing frontier. The existing live score and gauge sign remain the only live directional interpretation. The production notification change is independent and limited to the final discipline line, `Quod acquisitum est, custodi — Protect what has been gained.` No historical result is inserted in the live executive brief. A dry run is not a delivery; do not bypass the daily duplicate-send guard for a visual test. For a dashboard rollback, revert only the dashboard release PR; the existing workbook, scoring, scheduler and notification settings are not migration targets.
