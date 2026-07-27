# HEL-035 — Silver Operator Experience

Status: implemented behind the HEL-035 internal-preview boundary

Permanent target: XAGUSD / SILVER

Operator-experience version: `HEL-035.operator-experience.1.0.0`

## Design objective

The Silver Market Desk presents a decision flow, not a software inventory.

The operator receives:

1. what is happening;
2. why;
3. what it means for silver;
4. what must confirm next;
5. how confident the system is.

The operator is not expected to mentally combine Monetary Environment, VIX,
Liquidity, external silver intelligence, and Market Structure. Executive
Market Assessment performs that synthesis once.

## Information hierarchy

Every card follows one contract:

1. Section Name;
2. Current State headline;
3. Interpretation;
4. Silver Impact;
5. Operational Conclusion;
6. Required Confirmation;
7. Primary Risk;
8. Confidence;
9. Freshness and timestamp;
10. expandable evidence.

Raw statistics never precede interpretation.

## Visual priority

The permanent order is:

1. Executive Market Assessment;
2. Monetary Environment;
3. VIX — Volatility Environment;
4. Liquidity Environment;
5. Silver Intelligence;
6. Market Structure.

The executive card receives the strongest visual treatment. The remaining
cards use one shared renderer, spacing system, typography, confidence
presentation, timestamp location, and expansion behavior.

## Expandable evidence contract

Expansion is normalized into:

- Evidence;
- Metrics and raw statistics;
- Sources and underlying HEL artifacts;
- Freshness, provider, and timestamp;
- Reason codes;
- Research notes;
- Limitations.

Empty groups are not rendered. Exact summary values are pruned from expandable
payloads. A detail may explain or substantiate the summary, but it may not
repeat the same statement.

## Redundancy audit

| Section | Unique decision value | Duplication removed | Retained detail |
|---|---|---|---|
| Executive Market Assessment | Assembles the complete silver operating state | Removed the separate summary panel plus repeated executive card | Supporting and contradicting source sections |
| Monetary Environment | Explains dollar, yield, curve, positioning, and participation pressure | Removed state, impact, confidence, and conclusion from raw renderer detail | Underlying monetary indicators and provenance |
| VIX — Volatility Environment | Explains risk appetite, range, liquidation, and confirmation conditions | Removed VIX statistics from the primary card | VIX level, change, percentile, and supporting volatility evidence |
| Liquidity Environment | States whether institutional depth interpretation is authorized | Removed false-neutral placeholders and repeated unavailable text | Provider capability, connection state, and limitations |
| Silver Intelligence | Provides concept-first HEL-034 external context | Removed ticker-first and repeated shadow conclusion language | Shadow evidence, HEL-034 provenance, freshness, and research notes |
| Market Structure | Supplies operational structure authority | Removed repeated state and confidence fields from detail | Auction, sweep, timeframe, session, and structure provenance |

No two sections are merged because each retains a distinct decision function.
Executive Market Assessment references their conclusions instead of restating
their metrics.

## Cognitive-load audit

### Executive Market Assessment

- Reduces thinking: yes; it performs the cross-section synthesis.
- Duplicates another section: no; it references section conclusions.
- Raw data replaces interpretation: no.
- Operator value: establishes the market state, risk, confirmation, and
  confidence before detail.

### Monetary Environment

- Reduces thinking: yes; it translates the monetary complex into silver
  pressure.
- Merge candidate: no; monetary pressure is distinct from structure and
  volatility.
- Operator value: identifies whether the monetary environment supports,
  challenges, or fails to explain silver.

### VIX — Volatility Environment

- Reduces thinking: yes; it distinguishes volatility expansion, liquidation,
  and silver resilience.
- Merge candidate: no; risk conditions can contradict monetary conditions.
- Operator value: changes confirmation and range expectations.

### Liquidity Environment

- Reduces thinking: yes, even while unavailable; it prevents false liquidity
  inference.
- Merge candidate: no; future COMEX depth has a distinct authority and
  capability contract.
- Operator value: identifies whether execution-flow conclusions are permitted.

### Silver Intelligence

- Reduces thinking: yes; it converts ticker relationships into economic
  concepts.
- Merge candidate: no; shadow external context must remain visibly subordinate.
- Operator value: supplies independent confirmation and challenge context.

### Market Structure

- Reduces thinking: yes; it translates existing Harmonexus structure into the
  operational authority.
- Merge candidate: no; it is the final confirmation boundary.
- Operator value: determines whether macro and external context are actionable
  as operator intelligence.

## UI consistency

All HEL-035 cards use:

- the existing Manrope and DM Mono typography;
- the existing Harmonexus color tokens;
- one `hel035_operator_card_html` renderer;
- one `render_hel035_expandable` renderer;
- identical field order;
- identical confidence formatting;
- identical freshness footer;
- identical evidence expansion.

The existing production asset card remains separate and unchanged.

## Performance contract

The operator desk:

- consumes completed interpretation objects once;
- adds no data provider;
- adds no network request;
- adds no background job;
- adds no scheduler task;
- uses Streamlit caching for the serialized integration payload;
- prunes redundant detail before rendering;
- retains a fail-open legacy briefing path.

Performance regression tests execute repeated operator-desk transformations and
enforce a bounded dashboard payload.

## Failure behavior

- Missing integration payload: the desk shows an unavailable notice.
- Missing section: integration rejects the bundle.
- Stale evidence: remains labeled stale.
- Unavailable liquidity: remains unavailable.
- HEL-034 shadow evidence: remains `Shadow Observation`.
- Invalid detail: the operator contract fails closed instead of silently
  changing the conclusion.

No failure modifies production cards, scores, notifications, HEL-033, HEL-034,
or OOS state.
