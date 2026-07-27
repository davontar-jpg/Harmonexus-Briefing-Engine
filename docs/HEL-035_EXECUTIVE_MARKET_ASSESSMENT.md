# HEL-035 — Executive Market Assessment

Status: implemented behind the inactive HEL-035 internal-preview boundary

Permanent target: XAGUSD / SILVER

Intended long-briefing position: first

Production effect: none

## Purpose

Executive Market Assessment rolls the five completed HEL-035 interpretation
sections into one concise institutional assessment:

- Monetary Environment;
- VIX — Volatility Environment;
- Liquidity Environment;
- Silver Intelligence;
- Market Structure.

It does not calculate evidence, restate statistics, repeat section prose, or
introduce a new market fact.

## Output contract

The structured object preserves:

- Current Market State;
- Supporting Evidence;
- Contradicting Evidence;
- Primary Risk;
- Required Confirmation;
- Current Operational Bias;
- Confidence.

It also preserves the five source-section statuses, timestamps, authorities,
confidence labels, provenance, and production effects.

## Operational authority

Market Structure remains the operational authority.

- Without current usable Market Structure, the assessment produces
  `No Operational Conclusion`.
- Monetary Environment and VIX may support, challenge, or elevate risk.
- Silver Intelligence may support or challenge context, but shadow evidence
  cannot independently set reversal risk or a production bias.
- Unavailable Liquidity remains unavailable. It is not neutral and does not
  block an otherwise justified structural conclusion.

The synthesis does not modify any source section.

## Current market states

Action bias maps to a concise market state:

| Action bias | Current market state |
|---|---|
| Continuation Favored | Continuation environment |
| Continuation Requires Confirmation | Confirmation-dependent continuation |
| Neutral | Balanced market environment |
| Caution | Caution environment |
| Reversal Risk Elevated | Reversal risk elevated |
| No Operational Conclusion | Insufficient evidence |

## Action rules

The assessment supports:

- Continuation Favored;
- Continuation Requires Confirmation;
- Neutral;
- Caution;
- Reversal Risk Elevated;
- No Operational Conclusion.

Deterministic precedence:

1. Unavailable Market Structure produces no operational conclusion.
2. Explicit Market Structure reversal risk produces elevated reversal risk.
3. Existing monetary or volatility liquidation/reversal risk may elevate the
   executive reversal state.
4. Market Structure caution remains caution.
5. Confirmed continuation with multiple authoritative challenges becomes
   caution.
6. Confirmed continuation with one authoritative challenge or a shadow
   Silver Intelligence challenge requires confirmation.
7. Aligned confirmed structure without a challenge favors continuation.
8. Neutral Market Structure produces a neutral assessment.

No action is a direct entry or exit instruction.

## Evidence language

Each source section is translated into one controlled executive concept:

- supportive;
- challenging;
- neutral;
- unavailable.

Supporting and contradicting evidence reference section concepts only. They do
not reproduce underlying metrics or raw section paragraphs.

Examples of the controlled style include:

- Monetary conditions support the silver context.
- Volatility conditions challenge orderly continuation.
- External silver intelligence challenges the current thesis.
- Market structure confirms the current silver direction.
- Liquidity Environment is unavailable for the executive conclusion.

## One-paragraph rule

The authoritative summary is one paragraph. It contains:

1. current market state;
2. supporting section concepts;
3. challenging section concepts;
4. unavailable confirmation where relevant;
5. primary risk;
6. required confirmation;
7. operational bias and confidence.

The paragraph may not contain:

- percentages;
- correlation;
- percentiles;
- scores;
- sample counts;
- raw metrics;
- copied section prose.

The renderer throws `EXECUTIVE_STATISTICAL_SUMMARY_PROHIBITED` if statistical
language enters the paragraph.

## Confidence

Confidence is not recalculated.

The assessment copies the existing Market Structure confidence label because
Market Structure is the operational authority. If Market Structure confidence
is unavailable, it may fall back to an existing Monetary Environment or VIX
confidence label.

The executive confidence score remains null. Numeric source scores, if
present, are retained only in provenance. The synthesis records:

- `numeric_confidence_synthesized: false`;
- `contradiction_adjustment_synthesized: false`.

## Rendering

The long rendering is:

1. `Executive Market Assessment` heading;
2. one institutional paragraph.

The short rendering uses the same paragraph. The dashboard exposes the same
state, support, contradiction, risk, confirmation, bias, and confidence.
Notification output remains null.

Every surface derives from one deterministic interpretation object.

## Briefing-order boundary

The object records `intended_long_briefing_order: 1`.

ATL-035-08 does not reorder or modify the live production briefing. Future
integration must place this section first only after an explicit activation
character and production snapshot regression gate.

## Failure behavior

- Missing section: explicit unavailable evidence.
- Stale section: ineligible for current support or challenge.
- Missing Market Structure: no operational conclusion.
- Unavailable Liquidity: visible limitation, never neutral.
- Shadow Silver Intelligence: contextual only.
- Non-XAGUSD source: rejected.
- Source with a non-none production effect: rejected.
- All sections unavailable: insufficient evidence and unavailable confidence.

## Validation

Fixtures cover:

- aligned continuation;
- one authoritative challenge;
- multiple authoritative challenges;
- explicit reversal risk;
- neutral Market Structure;
- unavailable Market Structure;
- shadow challenge boundaries;
- unavailable Liquidity;
- supporting and contradicting evidence provenance;
- existing-confidence reuse;
- prohibition of statistical prose;
- prohibition of copied section prose;
- renderer consistency;
- target and production-effect rejection;
- inactive preview and absence of live consumers.

Implementation version: `HEL-035.executive.1.0.0`.
