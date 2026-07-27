# HEL-035 VIX — Volatility Environment

## Scope

The permanent heading is `VIX — Volatility Environment`, section ID
`vix_volatility_environment`, target `XAGUSD`. The implementation is
`src/15_SilverVixVolatilityEnvironment.gs`.

The section interprets VIX state, risk appetite, cross-market conditions, and
silver-specific impact. It does not reduce VIX to up/down, infer a direct trade
signal, or assume that rising volatility is automatically supportive or
challenging for silver.

## Repository VIX audit

Production now has a repository-native delayed daily VIX data path through the
existing FRED refresh contract.

| Capability | Verified state |
|---|---|
| Production instrument | VIX is not registered as a scored `INSTRUMENTS` member |
| Provider and symbol | FRED public CSV, `VIXCLS` |
| Interval and update frequency | Daily close, delayed publication |
| Delay and timezone | Delayed daily; America/New_York |
| Session behavior | Closing value only; no live intraday claim |
| Cache and stale threshold | Existing `FRED_Raw` cache with `fred_daily` freshness |
| Historical range | Last retained FRED rows from the normal `refreshFRED()` window |
| Production consumers | No score, briefing, dashboard, notification, or scheduler consumer |
| Existing tests | Research test confirms `TVC_VIX` is unsupported |
| Research context | One legacy workbook risk-confirmation rule and unsupported research-library entry |
| VVIX/MOVE/term structure/credit stress | Absent |

The ATL-035-01 baseline artifact
`artifacts/hel_035/baseline/vix_representation.json` remains the original
baseline. The attended-staging implementation completes VIX by adding
`FRED_Raw.VIXCLS`; research context is still not current VIX intelligence.

## Smallest safe adapter

ATL-035-04 added the pure `vix_snapshot` contract. Attended staging connects the
existing FRED provider by translating `FRED_Raw.VIXCLS` into that contract
inside `hxSilverRuntimeFredVix_`. It does not add credentials, a new provider
subsystem, a new scheduled job, alerts, scoring, or a public consumer.

An available snapshot must explicitly provide:

- authorized symbol `VIX`, `^VIX`, or `CBOE:VIX`;
- level;
- timestamp;
- provider;
- source;
- interval;
- timezone;
- observation type;
- market-session state;
- evidence authority;
- optional historical observations.

For the repository-native VIX path, the runtime discloses:

- source contract `FRED_Raw:VIXCLS`;
- provider `FRED`;
- interval `1d`;
- observation type `closing_value`;
- live claim permitted `false`;
- delayed daily publication cadence.

Missing symbol, source metadata, level, or timestamp fails closed to
`unavailable`. The adapter never falls back to the unsupported research symbol.

Optional supporting snapshots are accepted only when explicitly supplied:

- equities;
- silver;
- VVIX;
- VIX front- and second-month futures;
- MOVE;
- credit stress.

Absent optional inputs remain `null` with limitations. No value is imputed.

## Empirical percentile and regime logic

The VIX level percentile is its empirical rank in the supplied history. The
rate-of-change percentile is the empirical rank of the absolute current change
within historical absolute changes. At least 20 observations are required.

The engine therefore does not use one universal VIX-level threshold.

Deterministic states:

- `volatility shock`: level and positive rate of change are both in the
  empirical upper tail;
- `volatility normalization`: an elevated level is falling at a historically
  material rate;
- `volatility elevated and stable`: level is elevated while rate of change is
  stable or historically quiet;
- `volatility subdued`: level is in the lower distribution and change is
  quiet;
- `volatility expanding`: positive rate of change or short-term trend is
  historically material without meeting shock conditions;
- `volatility compressing`: negative rate of change or short-term trend is
  historically material without meeting normalization conditions;
- `mixed`: available evidence does not establish another state;
- `stale` and `unavailable`: degraded states that cannot form a current
  conclusion.

Short-term trend compares current VIX with the trailing five-observation mean.
Medium-term trend uses twenty observations. These trends support the state;
they do not replace percentile evidence.

## Risk-appetite logic

Risk appetite requires available cross-market confirmation.

| VIX/equity relationship | Assessment |
|---|---|
| VIX rising, equities falling | Defensive positioning increasing |
| VIX falling, equities rising | Risk appetite strengthening |
| VIX rising, equities rising | Risk conditions mixed |
| VIX falling, equities falling | Risk conditions mixed |
| VIX stable | Risk appetite stable |
| VIX shock | Defensive positioning increasing |
| VIX stale or absent | Signal unconfirmed or unavailable |

Optional credit stress can confirm or challenge the assessment. VIX alone does
not claim a complete market regime.

## Cross-market interpretation

The section describes the current environment:

- volatility shock: cross-asset liquidation risk, correlation instability,
  and intraday-range uncertainty;
- confirmed expansion: wider ranges, defensive flows, and lower breakout
  reliability;
- unconfirmed expansion: range risk without complete broad-market
  confirmation;
- confirmed compression: more orderly continuation conditions;
- VIX falling while equities weaken: risk signal unconfirmed;
- elevated stable VIX: persistent wider-range and correlation risk;
- subdued VIX: orderly ranges with renewed-expansion vulnerability;
- normalization: declining defensive pressure without claiming that risk has
  disappeared.

## Silver-impact logic

Silver is evaluated independently from VIX:

- rising VIX, falling equities, rising silver: silver is resisting broader
  risk deterioration; possible defensive demand remains conditional;
- rising VIX and rising silver without equity confirmation: VIX/silver
  decoupling;
- rising VIX and falling silver: liquidation risk is elevated and
  industrial/risk-asset behavior may dominate;
- expanding VIX with no directional silver response: wider-range risk,
  direction unconfirmed;
- falling VIX and rising silver: orderly continuation environment, subject to
  structure;
- falling VIX and falling silver: VIX/silver divergence requiring stronger
  confirmation;
- elevated stable VIX: wider ranges and defensive-flow sensitivity remain;
- no eligible state: volatility remains neutral or unavailable for silver.

No output automatically labels silver bullish or bearish. Market structure is
never overridden.

## VVIX and term structure

VVIX is used only when an authorized snapshot exists. Opposing VIX/VVIX
directions create a named contradiction.

Term structure requires front- and second-month observations from one
timestamped source:

- second month above front month: contango;
- front month above second month: backwardation;
- equal: flat.

Production currently supplies neither VVIX nor term structure, so both remain
unavailable in the normal contract.

## Contradictions

The engine names:

- VIX rising while equities rise;
- VIX falling while equities weaken;
- VIX rising while silver strengthens;
- VIX falling while silver weakens;
- VIX and VVIX disagreement;
- elevated but compressing VIX;
- low but rapidly accelerating VIX;
- credit stress disagreement;
- stale VIX paired with fresh market evidence.

VIX state remains the dominant state. One or two conflicts are material
disagreement and reduce confidence one level. Three or more conflicts are an
unresolved conflict, reduce confidence two levels, and produce
`volatility_signal_unconfirmed`.

## Freshness and market hours

Every snapshot retains:

- observation timestamp;
- source and provider;
- interval and timezone;
- observation type;
- freshness status and reason;
- expected next update;
- whether a live claim is permitted.

Intraday evidence can be labeled live only when current and the market session
is open. A prior close during an open session is delayed. A prior close during
a verified weekend or holiday closure may be current for the closed-session
context, but it is explicitly labeled `prior_close` and
`live_claim_permitted: false`. Stale observations remain stale.

## Output contract

The root `SilverInterpretation` preserves authority, source status, freshness,
current state, cross-market impact, silver impact, action bias, support,
challenge, risk, confirmation, confidence, provenance, reason codes, and
versioning.

`vix_volatility_environment` preserves:

- current VIX state;
- level, change, rate of change, direction;
- level and rate-of-change percentiles;
- short- and medium-term trends;
- volatility regime;
- risk appetite;
- cross-market and silver impact;
- source identity and historical range;
- optional supporting inputs;
- per-input freshness;
- `HEL-035.vix.1.0.0`.

## Rendering and preview

Long, short, dashboard, notification-preview, and JSON renderers consume the
same frozen object.

- Long output ends with Action Bias, Primary Risk, Required Confirmation, and
  Confidence.
- Short output retains VIX state, risk appetite, silver impact, and confidence.
- Dashboard primary display contains heading, state, risk appetite, silver
  impact, and confidence.
- Dashboard expansion contains raw VIX metrics, empirical percentiles,
  supporting inputs, provenance, limitations, freshness, reason codes, and
  contradictions.
- The notification renderer creates preview text only. No notification
  function consumes it.

Apps Script preview fails closed while the HEL-035 flag is false. Python
`vix_volatility_environment_preview` additionally requires
`HARMONEXUS_HEL035_INTERNAL_PREVIEW=true`. `app.py` does not import it.

## Test coverage

Tests cover:

1. expansion;
2. compression;
3. elevated stable VIX;
4. volatility shock;
5. rising VIX with falling equities;
6. rising VIX with rising equities;
7. resilient silver;
8. liquidating silver;
9. VIX/VVIX disagreement;
10. stale VIX;
11. unavailable VIX;
12. prior-close market-hours behavior;
13. renderer consistency;
14. nullable numeric confidence;
15. absence of automatic bullish/bearish or buy/sell language;
16. preview inactivity and mutation/delivery isolation.
