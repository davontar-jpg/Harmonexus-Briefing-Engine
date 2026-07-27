# HEL-035 Monetary Environment

## Scope

The permanent section is `Monetary Environment`, section ID
`monetary_environment`, target `XAGUSD`. It translates the current production
dollar, nominal-yield, real-yield, curve, COT, positioning, open-interest, and
silver-response contracts into one deterministic interpretation.

Implementation is in `src/14_SilverMonetaryEnvironment.gs`. The engine is pure
and read-only. It has no Sheets, score, scheduler, notification, briefing, or
research mutation call. Its internal preview flag defaults to false, and every
result declares `production_effect: none`.

## Production source map

| Evidence | Existing path | Transformation | Known boundary |
|---|---|---|---|
| Dollar pressure | `Calculated_Signals`, latest `XAGUSD\|DXY` factor | Classify the normalized signal as increasing, easing, or stable dollar pressure | Production has no dedicated DXY price-history adapter |
| Dollar proxy | Existing legacy/proxy row supplied explicitly as `dollar_proxy` | Same classification, with `DOLLAR_PROXY_ONLY` | Never silently treated as direct DXY history |
| Nominal yields | `FRED_Raw`: `US2Y`/DGS2, `US5Y`/DGS5, `US10Y`/DGS10, `US30Y`/DGS30 | Latest-minus-prior daily change; front/intermediate/long segmentation | Daily frequency; no 20Y series |
| Real yield | `FRED_Raw`: `REAL10Y`/DFII10 | Latest-minus-prior daily change | One 10Y real-yield series; no real-yield curve |
| Yield curve | Derived from `FRED_Raw` 10Y minus 2Y | Shape, spread change, and average nominal-yield direction | No generic recession claim |
| COT and positioning | `CFTC_Raw`, `XAGUSD`, CFTC legacy report | Managed-money and commercial net positions, weekly change, sample percentile | Weekly report; publication lag always disclosed |
| Open interest | `CFTC_Raw`, `XAGUSD`, current and prior reports | Weekly absolute and percentage change joined to a separately timestamped silver return | No live exchange OI feed |
| Silver response | Explicit current production silver-market snapshot | Return direction and optional volume/roll context | Absence remains unavailable |

No new provider is added. HEL-033 and HEL-034 are not inputs. Breakeven
inflation, rate expectations, financial-conditions detail, current exchange
volume, and live open interest remain unavailable unless a later
repository-native production adapter is approved.

## Read-only snapshot contract

`hxSilverBuildMonetaryEnvironment_(snapshot, evaluatedAt)` accepts explicit
copies of existing contracts:

- `Calculated_Signals`;
- `FRED_Raw`;
- `CFTC_Raw`;
- `market`, containing the separately timestamped current silver response;
- optional, explicitly labeled `dollar_proxy`.

The adapter does not open a spreadsheet. A future authorized consumer may read
the existing sheets and pass their rows into this function, but this character
does not wire that consumer.

## Output contract

The root `SilverInterpretation` preserves source status, freshness, authority,
interpretation, silver impact, action bias, support, challenge, risk,
confirmation, nullable confidence, provenance, reason codes, every renderer,
and all rule versions.

`monetary_environment` additionally preserves:

- `current_state`;
- `dollar_pressure`;
- `nominal_yield_pressure`;
- front-end, intermediate, and long-end nominal-yield states;
- `real_yield_pressure`;
- `yield_curve_state`;
- `positioning`;
- dated `cot_context`;
- `open_interest`;
- `participation_quality`;
- per-input timestamps, source status, freshness, proxy state, and reason
  codes;
- `as_of`;
- monetary rule version.

`monetary_contradictions` preserves the dominant driver, named secondary
conflicts, confidence effect, required confirmation, and missing metrics.

## Deterministic classification rules

Daily changes use a 0.015 percentage-point neutral band. The normalized dollar
factor uses a 0.15 neutral band. Silver return uses a 0.1% neutral band.
Open-interest change uses a 0.5% neutral band.

Dollar and real-yield direction are interpreted as pressure, not deterministic
causality. Rising pressure challenges silver; falling pressure supports the
monetary backdrop. The separately observed silver response can demonstrate
resilience or non-response.

Nominal yields are separated into:

- front end: 2Y;
- intermediate: average direction of 5Y and 10Y;
- long end: 30Y.

All three rising is a parallel rise; all three falling is a parallel decline.
Other combinations are non-parallel. They are not collapsed into one policy
label.

The curve uses 10Y minus 2Y:

- widening with falling average yields: bull steepening;
- widening with rising average yields: bear steepening;
- narrowing: flattening;
- stable negative spread: inverted curve stable;
- stable near-zero spread: near-flat curve stable;
- stable positive spread: positive curve stable.

The curve modifies interpretation; it does not independently claim recession,
policy intent, or causality.

## Monetary regimes

The controlled taxonomy is:

- supportive monetary environment;
- restrictive monetary environment;
- easing monetary pressure;
- tightening monetary pressure;
- dollar-led pressure;
- real-yield-led pressure;
- positioning-led fragility;
- liquidation regime;
- mixed monetary environment;
- monetary decoupling;
- insufficient evidence.

Dollar and real yields agreeing define the strongest supportive or restrictive
states. A two-of-three dollar/nominal/real majority defines easing or
tightening pressure. Dollar-only or real-yield-only challenges retain their
named driver. Restrictive pressure with rising silver, or supportive pressure
with falling silver, is monetary decoupling. Falling price with falling open
interest is a liquidation regime when no stronger dollar/real-yield regime
dominates. No eligible dollar or yield evidence produces insufficient
evidence.

## COT and positioning

Managed-money net equals long minus short. Commercial net is calculated
separately. Latest-minus-prior weekly changes show expansion or contraction.
A percentile is emitted only with at least five observations.

The section always displays the CFTC report date and:

- `COT_PUBLICATION_LAG`;
- `publication lag applies`;
- `weekly futures positioning is not live`.

COT cannot independently create the action bias or a trade instruction.

## Price and open interest

| Price | Open interest | Permitted interpretation |
|---|---|---|
| Rising | Rising | Possible new participation or trend commitment |
| Rising | Falling | Possible short covering or participation contraction |
| Falling | Rising | Possible new short participation or hedging pressure |
| Falling | Falling | Possible liquidation or position reduction |

The language is deliberately conditional. It does not call an OI increase
accumulation and does not claim institutional participation. Missing volume,
weekly timing, futures roll, and spot-versus-futures timing are disclosed.

## Contradiction rules

Named contradictions include:

- dollar rising while real yields fall;
- dollar falling while nominal yields rise;
- silver rising despite restrictive pressure;
- silver falling despite easing pressure;
- managed-money positioning expanding while OI contracts;
- nominal and real yields disagreeing;
- current silver data paired with stale COT.

The highest-weight eligible evidence is the dominant driver. Conflicts remain
named as secondary conflicts. Material disagreement reduces confidence one
level; unresolved conflict reduces it two levels and prevents an operational
conclusion. Missing evidence is never converted to neutral.

## Freshness policy

- Authenticated current-market inputs use `live_market`.
- Existing daily FRED observations use `fred_daily`.
- COT and CFTC open interest use `cot_weekly`.
- Legacy or explicit proxy dollar observations use `manual_structure`.

Primary section freshness is derived from current dollar, nominal-yield,
real-yield, and curve evidence. A stale COT report therefore remains explicitly
stale and reduces confidence without falsely making a current daily monetary
complex stale. Every input retains its own timestamp and status.

## Confidence

Confidence uses the HEL-035 qualitative-first resolver. Completeness,
authority, freshness, named conflicts, and provider agreement are structured
inputs. A numeric score remains null unless an existing
production-authoritative score or documented approved calculation is supplied.
The monetary engine does not manufacture percentages.

## Renderers and preview

Long, short, dashboard, and JSON outputs derive from the same frozen object.
The long rendering ends with Action Bias, Primary Risk, Required Confirmation,
and Confidence. The short rendering retains regime, silver impact, and
confidence or limitation. Dashboard detail contains the monetary contract,
evidence, provenance, confidence basis, reason codes, freshness, and
contradictions.

Notifications remain disabled. `telegram_summary` is null.

The Apps Script preview function refuses to run while the global HEL-035
preview flag is false. The Python `monetary_environment_preview` projection
also requires `HARMONEXUS_HEL035_INTERNAL_PREVIEW=true`; `app.py` does not
import it.

## Test coverage

Fixtures and tests cover:

1. restrictive dollar and real yields;
2. easing dollar and real yields;
3. silver resilience;
4. silver non-response;
5. all four price/OI combinations;
6. stale COT;
7. missing real yields;
8. dollar proxy only;
9. contradictory yields;
10. all inputs unavailable;
11. partial current inputs;
12. renderer consistency;
13. nullable confidence;
14. prohibited unsupported participation language;
15. preview inactivity and no mutation APIs.
