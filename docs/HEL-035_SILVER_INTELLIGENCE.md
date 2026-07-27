# HEL-035 — Silver Intelligence

Status: implemented behind the inactive HEL-035 internal-preview boundary

Permanent target: XAGUSD / SILVER

Authority: HEL-034 validates; HEL-035 interprets

Production effect: none

## Purpose

Silver Intelligence translates approved HEL-034 evidence into an operator
view of the external markets currently confirming, challenging, or failing to
inform silver. It does not repeat the HEL-033 discovery study or the HEL-034
validation process. It does not calculate correlations, rank candidates,
change dispositions, increment OOS observations, or promote evidence.

The permanent section name is **Silver Intelligence**. The implementation does
not expose a generic cross-asset or correlation dashboard.

## Source contract

The adapter receives explicit snapshots supplied by a future approved
orchestrator:

- current production context, including copper where available;
- current market structure;
- current Monetary Environment;
- current VIX — Volatility Environment;
- HEL-034 finalist registry;
- HEL-034 validation results;
- HEL-034 shadow-current artifact;
- HEL-034 OOS ledger.

The implementation deliberately does not contain a research-worktree path.
This prevents production from depending on a mutable checkout. A future
integration must copy or publish a validated artifact through an approved
read-only boundary.

HEL-033 is not a decision input. Passing a direct `hel033` or `hel_033` field
fails with `HEL033_DIRECT_INPUT_PROHIBITED`. Historical explanation may be
added later only through an explicitly labeled, non-decision field.

The shadow-current artifact must retain `production_effect: none`. Any other
value fails with `HEL034_PRODUCTION_EFFECT_MUST_BE_NONE`.

## Current authoritative artifact shapes

The implementation was mapped against the actual research branch artifacts:

- `research/silver_gauges/validation/finalist_registry.json`;
- `research/silver_gauges/validation/reports/generated/validation_results.json`;
- `research/silver_gauges/validation/reports/generated/shadow_current.json`;
- `research/silver_gauges/validation/shadow/oos_ledger.json`.

The adapter uses `canonical_symbol`, `decision`, `data_freshness`,
`candidate_direction`, `silver_direction`, `confirmation_status`,
`challenge_status`, `divergence_status`, `confidence`,
`latest_synchronized_timestamp`, `source_interval`, and
`no_trade_or_insufficient_confidence`. It does not render
`current_correlation`.

The OOS ledger is copied into expandable evidence only. The adapter has no
write function and records `oos_mutation: false`.

## Concept translation

| Operator concept | Expandable evidence symbol | Interpretation role |
|---|---|---|
| Industrial Producer Participation | COPX | Industrial producer and copper-miner participation |
| Strategic Materials | REMX | Electrification and strategic-material participation |
| Industrial Commodity Breadth | DBB | Broader base-metals participation |
| Solar Participation | TAN | Regime-sensitive solar demand context |
| Physical Economy | SEA | Slow shipping and physical-economy context |
| China Liquidity | USDCNH | Offshore-yuan and China-sensitive pressure |
| Energy Regime | WTI_FUTURES / WTI | Regime-classified energy and inflation context |
| Grid Infrastructure | GRID | Grid and electrification participation |
| Defensive Dollar Pressure | USDCHF | Incremental defensive-dollar context |
| Industrial Metals Participation | PALLADIUM | Broader industrial-metals participation |

Operator headings always lead with the concept. Tickers appear only in
expandable evidence and provenance.

## Authority labels

HEL-034 dispositions map without promotion:

| HEL-034 disposition | HEL-035 label | Evidence state |
|---|---|---|
| `PROMOTE TO SHADOW` | Shadow Observation | `shadow` |
| `CONTINUE VALIDATION` | Validation | `research_only` |
| explicit future `PRODUCTION APPROVED` | Production Approved | `production_authoritative` |
| `RESERVE` or another research state | Research | `research_only` |
| `DATA BLOCKED` | Blocked | `placeholder` |

The current HEL-034 research artifacts contain no production-approved
candidate. HEL-035 does not infer that state.

If shadow-current and validation-results dispositions disagree, the candidate
fails closed with `HEL034_DISPOSITION_CONFLICT`. Neither artifact is modified.

## Subsection contract

Every concept subsection preserves:

- Current State;
- Interpretation;
- Silver Impact;
- Action Bias;
- Primary Risk;
- Required Confirmation;
- Confidence;
- Evidence;
- Freshness;
- Provenance.

It also preserves `source_label`, `source_status`, `evidence_state`, a
relationship classification, and explicit reason codes.

Action bias is currently always `no_operational_conclusion`. This is
intentional: HEL-034 context may explain support or challenge, but it may not
create a production trade bias.

HEL-034 numeric confidence remains visible as `hel034_source_confidence` in
expandable evidence. HEL-035 does not restate it as precise operator
confidence. Section and subsection conclusion scores remain null; qualitative
confidence is limited by authority and freshness.

## Interpretation rules

Positive relationship families use HEL-034 confirmation and challenge states:

- confirming evidence becomes supportive context;
- not-confirming or challenging evidence becomes challenging context;
- flat or unresolved evidence becomes neutral or mixed;
- stale, missing, conflicted, or blocked evidence becomes unavailable.

Defensive Dollar Pressure applies the expected inverse relationship. A rising
USDCHF observation accompanying weaker silver is defensive-dollar pressure,
not supportive silver confirmation. A weaker USDCHF observation accompanying
stronger silver is supportive context.

Energy Regime is always regime-classified. Matching direction may provide
supportive industrial context; conflict may challenge it; unresolved behavior
is mixed or session dependent. The implementation never calls WTI universally
inverse.

Current production copper is retained as optional expandable context for
Industrial Producer Participation. Market Structure, Monetary Environment, and
VIX Environment are preserved as separate context-alignment records. They do
not silently change a HEL-034 disposition.

## China Liquidity blocked state

When USDCNH is `DATA BLOCKED`, the contract produces:

- heading: `China Liquidity`;
- status: `Blocked`;
- current state: `Data Blocked`;
- interpretation: `Daily offshore CNH validation incomplete.`;
- silver impact: `No production interpretation authorized.`;
- action bias: `no_operational_conclusion`;
- confidence: unavailable.

Blocked evidence is excluded from the overall synthesis. It is not neutral.

## Overall external confirmation

The deterministic synthesis supports:

- Strongly Supportive;
- Supportive;
- Neutral;
- Mixed;
- Challenging;
- Strongly Challenging;
- Unavailable.

The output names the supporting concepts, challenging concepts, and blocked
concepts. Research-only and blocked candidates cannot influence the aggregate.
The explanation records that market structure, monetary, and volatility
contexts remain separate authorities.

Overall action bias remains `no_operational_conclusion`; production effect
remains `none`.

## Rendering

All outputs derive from one authoritative interpretation object:

- long briefing: full concept-first subsection contract;
- short briefing: aggregate state, explanation, confidence limitation;
- dashboard: concept cards with status, state, silver impact, freshness, and
  expandable ticker/evidence/provenance;
- notification: null;
- JSON: complete structured object.

The live briefing, dashboard, and notification functions do not call this
module. The Apps Script preview constant remains false, and the Python preview
requires `HARMONEXUS_HEL035_INTERNAL_PREVIEW=true`.

## Failure behavior

- Missing candidate: unavailable, never neutral.
- Stale candidate: unavailable for current interpretation.
- Blocked candidate: blocked and excluded.
- Disposition disagreement: fail closed.
- Missing HEL-034 artifacts: individual independent degradation.
- Non-none production effect: reject the snapshot.
- Direct HEL-033 input: reject the snapshot.
- Missing production context: HEL-034 translation can render, while context
  alignment remains unavailable.

No previous conclusion is silently reused.

## Validation

JavaScript fixtures cover supportive, mixed, materially challenging, blocked,
unavailable, shadow, validation, research, disposition-conflict, renderer
consistency, concept-first ticker placement, source-confidence preservation,
OOS immutability, prohibited HEL-033 input, prohibited production effects, and
the disabled preview.

Python tests cover preview gating, authoritative surface projection, authority
label validation, and rejection of a non-none production effect.

The implementation version is `HEL-035.silver-intelligence.1.0.0`.
