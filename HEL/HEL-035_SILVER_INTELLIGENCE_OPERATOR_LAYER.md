# HEL-035 — Silver Intelligence Operator Layer

Status: implementation complete in guarded preview; production-ready with activation conditions

Permanent target: XAGUSD / silver

Implementation state: interpretation core, six section engines, and guarded multi-surface integration implemented

Production effect: none

## Mission

HEL-035 is a permanent, silver-specific operator layer. It will translate
authoritative monetary, volatility, liquidity, silver-gauge, market-structure,
positioning, and future order-book evidence into an institutional operator
experience. It is not an asset-agnostic framework and must not rotate to gold,
crude oil, equity indexes, cryptocurrency, or arbitrary instruments.

## Boundary

ATL-035-01 established preservation, source authority, contracts, failure
behavior, and an implementation map. ATL-035-02 implements the deterministic
interpretation foundation, typed evidence, resolvers, provenance, controlled
language, serialization, and renderers behind an inactive internal-preview
boundary. ATL-035-03 adds the permanent, read-only Monetary Environment
adapter, monetary regime classifier, contradiction handling, and section
renderers. ATL-035-04 adds an authorized-snapshot VIX adapter, empirical
volatility regimes, risk-appetite and silver-impact classification, and pure
VIX section renderers. It does not change a score, reorder a briefing, render a public
dashboard section, send a notification, alter a trigger, merge, deploy, or
promote research.

ATL-035-05 adds the provider-neutral order-book interface, capability and
COMEX contract schemas, typed liquidity events, claim-safety policy, disabled
ingestion/retention boundaries, and honest unavailable Liquidity Environment.
It does not connect a provider.

ATL-035-06 adds the permanent Silver Intelligence translation layer. It
accepts explicit, read-only HEL-034 finalist, validation, shadow-current, and
OOS-ledger snapshots and translates them into concept-first silver context.
It does not perform discovery, statistical validation, ranking, promotion, or
OOS observation. Direct HEL-033 input is rejected. Every subsection preserves
the HEL-034 authority label, and aggregate external confirmation retains
`production_effect: none`.

ATL-035-07 adds a read-only Market Structure interpreter over the existing
Harmonexus `Structure` record. It translates explicit native trend, auction,
sweep, timeframe, session, continuation, and exhaustion fields, while absent
fields remain unavailable. It does not calculate structure, infer sessions,
detect sweeps, or consume the future order-book boundary.

ATL-035-08 adds the Executive Market Assessment. It deterministically rolls
Monetary, VIX, Liquidity, Silver Intelligence, and Market Structure upward into
one concise institutional paragraph. It adds no evidence or statistics, reuses
existing confidence, preserves Market Structure as the operational authority,
and records an intended future long-briefing position of first without
changing the live briefing.

ATL-035-09 adds the controlled consumer boundary. A complete caller-supplied
bundle is rendered in the approved order ahead of every existing long-briefing
section, condensed into one short line per section, and projected to an
interpretation-first internal dashboard view model. The existing silver card
is unchanged; a separate XAGUSD preview may appear only behind the internal
preview flag. HEL-034 remains labeled shadow context, and the existing daily
delivery path gains no new alert or independent notification.

ATL-035-10 adds the Silver Market Desk operator experience. Executive Market
Assessment is the dominant decision surface, followed by five consistently
rendered section cards. Every card presents interpretation and operational
meaning before expandable evidence. Exact summary duplication is pruned,
raw statistics remain subordinate, freshness and timestamps use a fixed
location, and the serialized interpretation payload is cached. No provider,
network request, background job, scheduler task, or production-card redesign
is added.

HEL-033 discovery and HEL-034 validation remain immutable research authorities.
HEL-034 `PROMOTE TO SHADOW` means read-only observation only. `CONTINUE
VALIDATION` and `DATA BLOCKED` are not production approvals. HEL-035 may never
change a disposition, provider provenance, shadow confidence, or OOS count.

## Inputs and authority

Evidence is resolved in this order:

1. current production-authoritative observations;
2. existing validated production intelligence;
3. HEL-034 read-only shadow observations;
4. HEL-034 validation baselines;
5. HEL-033 research baselines;
6. explicit unavailable state.

Lower-authority evidence may explain, support, challenge, or expose divergence.
It may not silently replace a higher-authority source. Research and shadow data
may not determine silver direction, change production confidence, trigger an
alert, override market structure, or create an entry or exit instruction.

## Structured operator contract

Every eventual HEL-035 section must preserve:

- what happened;
- why it matters;
- what it means for silver;
- operational bias;
- supporting evidence;
- challenging evidence;
- confidence;
- current, stale, blocked, partial, or unavailable status;
- the condition that would change the conclusion.

Every evidence item must also carry source authority, observed timestamp,
acquired timestamp, freshness threshold, status, reason code, provenance,
confidence contribution, and whether production influence is permitted.

## Intended operator sequence

The planned sequence is:

1. Executive Market Assessment
2. Monetary Environment
3. VIX — Volatility Environment
4. Liquidity Environment
5. Silver Intelligence
6. Market Structure
7. Existing macro sections
8. Existing instrument sections
9. Existing positioning, opportunity, and execution sections

ATL-035-01 does not apply this order. Existing production sections stay in
their current order until a later approved implementation and regression gate.

## Candidate lifecycle

`SHADOW` evidence is labeled context and has no production effect. A future
`VALIDATED` state requires explicit methodology gates, sufficient fresh OOS
observations, provider agreement, stable role, and operator approval.
`PRODUCTION-AUTHORITATIVE` requires a separate implementation decision,
contract tests, rollback, observability, and explicit cutover. No transition is
automatic.

## Failure behavior

Unavailable and blocked are not neutral. Stale is not current. Missing research
must not crash production, and prior conclusions must not be silently reused.
Sections degrade independently and always retain timestamps and reason codes.
When evidence cannot justify a conclusion, the conclusion is `UNAVAILABLE`,
not a manufactured bias.

## Native implementation boundary

The repository's Apps Script build discovers flat, sorted `src/*.gs` modules.
The implemented native namespace uses `hxSilver*` symbols in new numbered
modules rather than placing production interpretation code under `research/`:

- `src/12_SilverIntelligence.gs` — typed evidence/interpretation schemas,
  authority, freshness, confidence, contradiction, provenance, deterministic
  build, validation, and serialization;
- `src/13_SilverIntelligenceBriefing.gs` — controlled vocabulary and pure
  long, short, dashboard, and notification renderers;
- `src/14_SilverMonetaryEnvironment.gs` — read-only production-contract
  adapters, dollar/yield/curve/COT/open-interest interpretation, monetary
  regimes, named contradictions, freshness disclosure, and pure Monetary
  Environment renderers;
- `src/15_SilverVixVolatilityEnvironment.gs` — read-only authorized VIX
  snapshot contract, empirical level/change percentiles, volatility regimes,
  risk appetite, cross-market and silver impact, contradiction handling,
  market-hours freshness, and pure VIX renderers;
- `src/16_SilverLiquidityEnvironment.gs` — provider-neutral interface,
  capability and COMEX contract identity, typed order-book evidence,
  native/inferred claim safety, disabled ingestion/retention plans, and the
  fail-closed Liquidity Environment renderer;
- `silver_intelligence.py` — typed, read-only Streamlit view-model consumer;
- `src/17_SilverIntelligenceInterpretation.gs` — HEL-034 read-only snapshot
  adapter, concept translation, authority labeling, external-confirmation
  synthesis, concept-first renderers, and fail-closed degraded states;
- `src/18_SilverMarketStructure.gs` — read-only existing-structure adapter,
## Final runtime conversion

`src/22_SilverProductionRuntime.gs` replaces fixture preview consumption with
one read-only production snapshot and one immutable runtime. It consumes the
existing canonical Sheets, optional Structure record, and explicit read-only
HEL-034 handoff. It adds no market-data provider, research, model, score, or
independent renderer. The Executive assessment still consumes exactly the five
approved interpretation sections. Evidence Integrity is a separate trust
disclosure and is not an Executive input.

The runtime publisher and briefing consumer are inactive by default. Streamlit
reads `HEL_035_Runtime`; it no longer reads `HEL_035_Preview`.

  deterministic auction/sweep/timeframe/session translation, monetary and
  Silver Intelligence alignment, claim safety, and fail-closed renderers;
- `src/19_SilverExecutiveAssessment.gs` — five-section authority-aware
  synthesis, controlled action precedence, existing-confidence reuse,
  one-paragraph institutional renderer, and statistical-summary prohibition;
- `src/20_SilverBriefingIntegration.gs` — exact six-section ordering, legacy
  briefing preservation, short condensation, interpretation-first dashboard
  projection, preview-only silver-card support, and notification-safe
  integration gating;
- `src/21_SilverOperatorExperience.gs` — shared operator-card contract,
  decision-flow hierarchy, redundancy pruning, normalized evidence expansion,
  and zero-background-work performance policy;
- `tests/fixtures/hel_035_silver_core.json` and dedicated JavaScript/Python
  contract tests.

`src/05_Notifications.gs` now accepts an optional HEL-035 bundle and activation
option while retaining exact legacy output when either is absent. `app.py`
imports the read-only consumer but adds a workspace only behind
`HARMONEXUS_HEL035_INTERNAL_PREVIEW=true`. The core has no Sheet, score, OOS,
or trigger mutation; preview defaults off and every interpretation declares
`production_effect: none`.

## Auditability and validation

Each conclusion must be reproducible from versioned source records and must
expose authority, freshness, provenance, conflicts, and confidence. Required
gates include schema tests, authority precedence, independent degraded-state
tests, no-mutation checks for HEL-033/034, briefing snapshots, notification
parity, dashboard rendering, Apps Script syntax/build, complete Python and
JavaScript suites, and `git diff --check`.

## Implemented Monetary Environment boundary

The Monetary Environment accepts explicit snapshots of the repository-native
`Calculated_Signals`, `FRED_Raw`, `CFTC_Raw`, and current silver response
contracts. It adds no provider and does not read HEL-033 or HEL-034. Direct DXY
history, breakeven inflation, live exchange open interest, and current futures
volume are not present in production and therefore remain explicit limitations.

The deterministic section preserves dollar pressure, segmented nominal yields,
10Y real-yield pressure, 10Y-minus-2Y curve state, dated COT positioning,
price/open-interest participation context, named contradictions, silver
impact, action bias, qualitative-first confidence, freshness by source, and
complete provenance. It is versioned as `HEL-035.monetary.1.0.0`.

## Implemented Silver Intelligence boundary

Silver Intelligence consumes HEL-034 only through caller-supplied immutable
snapshots. Production is not coupled to a research-worktree path. The adapter
checks `production_effect`, cross-checks current and validation dispositions,
copies OOS counts without incrementing them, and rejects direct HEL-033 input.

The permanent concept mapping is Industrial Producer Participation, Strategic
Materials, Industrial Commodity Breadth, Solar Participation, Physical
Economy, China Liquidity, Energy Regime, Grid Infrastructure, Defensive Dollar
Pressure, and Industrial Metals Participation. Tickers are retained only
inside expandable evidence and provenance. Raw correlations are not rendered.

`DATA BLOCKED` produces a blocked China Liquidity subsection with no authorized
silver interpretation. Shadow, validation, and research states remain labeled
and cannot produce an action bias, alert, score change, or production
confidence. Overall external confirmation explains support, challenge,
exclusions, and conflicts while current market structure remains the
production decision authority. The implementation is versioned
`HEL-035.silver-intelligence.1.0.0`.

## ATL-035-09 integration gate

The integration path is implemented but requires both an explicit activation
and a complete interpretation bundle. The current scheduler supplies neither,
so existing production output remains the safe fallback. No public silver-card
redesign, new alert, deployment, merge, or research promotion is part of this
character.

## ATL-035-11 production-readiness decision

Final validation classifies HEL-035 as **Ready with Conditions**.

The interpretation core, six section engines, briefing integration, dashboard
operator desk, degraded states, claim safety, source authority, preview
boundary, and rollback path are complete. Full JavaScript, Python, Apps Script,
briefing, notification, dashboard, and preservation gates pass.

The remaining conditions are operational cutover conditions:

1. reconcile the pre-existing dirty production checkout before applying the
   feature branch, especially the independently modified notification path;
2. define and validate the production process that supplies one complete,
   current, read-only HEL-035 interpretation bundle;
3. approve the exact long briefing, short briefing, and Silver Market Desk
   preview with current production-like evidence;
4. keep HEL-034 explicitly shadow and accept the Liquidity Environment as
   unavailable until a separately approved provider adapter is connected;
5. execute the staged activation and rollback checklist with the feature flag
   disabled by default.

These conditions do not identify a defect in the deterministic interpretation
layer. They prevent an unreviewed data-supply or deployment cutover. No merge,
push, deployment, feature activation, research promotion, or provider
connection is performed by ATL-035-11.
