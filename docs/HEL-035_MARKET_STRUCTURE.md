# HEL-035 — Market Structure

Status: implemented behind the inactive HEL-035 internal-preview boundary

Permanent target: XAGUSD / SILVER

Production effect: none

## Purpose

Market Structure translates the existing Harmonexus structure record into
silver-specific operator language. It does not calculate a new trend, auction,
liquidity sweep, higher-timeframe bias, continuation state, exhaustion state,
or session.

The section consumes only explicit fields supplied by existing Harmonexus
structure intelligence. Missing inputs remain unavailable.

## Existing production source

Repository reconnaissance established that the current structure authority is
the bundled workbook's manual `Structure` sheet. The captured XAGUSD record
contains:

- `Asset`;
- `Current Price`;
- `Key Level`;
- `Structure Status`;
- `Acceptance`;
- `Structure Score`;
- `Note`;
- `Last Updated`;
- `Manual Update Sheet`.

The current baseline is `manual_partial`. `Structure Status` says
`Below key level`, `Acceptance` says `Pending confirmation`, and `Last Updated`
is `Manual`.

The source currently has no explicit:

- auction classifier;
- liquidity-sweep detector;
- higher-timeframe bias;
- current session state;
- continuation state;
- exhaustion state;
- dedicated v5 Apps Script consumer;
- dedicated Streamlit market-structure section.

HEL-035 does not infer these missing dimensions.

## Input boundary

The adapter accepts a caller-supplied, read-only record. Supported aliases
allow future native Harmonexus records to expose:

| Contract field | Existing aliases |
|---|---|
| Current trend | `Current Trend`, `Trend`, `Structure Status` |
| Current auction | `Auction State`, `Current Auction`, `Auction`, `Acceptance` |
| Liquidity sweep | `Liquidity Sweep Status`, `Liquidity Sweep`, `Sweep Status` |
| Higher timeframe | `Higher Timeframe Bias`, `Higher Timeframe`, `HTF Bias` |
| Session | `Current Session`, `Session` |
| Continuation | `Continuation`, `Continuation State`, `Continuation Status` |
| Exhaustion | `Exhaustion`, `Exhaustion State`, `Exhaustion Status` |
| Internal context | `Internal Harmonexus Structure`, `Note`, `Structure Note` |
| Timestamp | `Last Updated`, `As Of`, `Timestamp` |

Aliases normalize field names only. They do not manufacture values.

The target must be XAGUSD or SILVER. Another instrument fails closed.

## Output contract

The structured section preserves:

- Current Structure;
- Auction State;
- Liquidity Sweep Status;
- Higher Timeframe Bias;
- Current Session;
- Structural Confirmation;
- Structural Weakness;
- Action Bias;
- Required Confirmation;
- Confidence.

Continuation, exhaustion, internal Harmonexus structure, freshness, evidence,
and provenance remain available through structured and expandable detail.

## Current structure and higher timeframe

Explicit values translate to:

- bullish;
- bearish;
- neutral;
- transition;
- compression;
- expansion;
- unavailable.

`Below key level` translates to bearish structure. This is a deterministic
translation of the existing field, not a new price calculation.

## Auction

Explicit existing values translate to:

- auction accepted;
- auction rejected;
- auction rotating;
- auction expanding;
- auction balancing;
- unavailable.

`Pending confirmation` remains unavailable. It does not become rotating or
neutral.

Auction acceptance confirms the current directional structure only when the
source explicitly reports acceptance. Rejection challenges continuation.
Rotation represents an incomplete directional auction. Expansion requires
directional context. Balance represents two-sided structure.

## Liquidity sweep

Only explicit existing Harmonexus sweep fields may produce:

- liquidity sweep detected;
- liquidity acceptance;
- liquidity rejection;
- liquidity exhaustion;
- no liquidity sweep observed;
- unavailable.

HEL-035 records `sweep_detected_by_hel035: false`. It does not consume the
future provider-neutral order-book contract and does not use Bookmap,
Sierra Chart, Quantower, DOM, depth, iceberg, absorption, or inferred order
events.

## Session

Explicit session values translate to:

- Asian;
- London;
- New York;
- Overlap;
- unavailable.

The evaluated clock is not used to infer a session. Provenance records
`session_inferred_by_hel035: false`.

## Structural confirmation

The current directional structure is compared with the already-built Monetary
Environment and Silver Intelligence conclusions:

- Structure supporting Monetary Environment.
- Structure contradicting Monetary Environment.
- Structure supporting Silver Intelligence.
- Structure contradicting Silver Intelligence.
- unavailable or unresolved.

This comparison does not change the Monetary Environment or Silver
Intelligence object. It provides an alignment statement only.

## Structural weakness

Weakness records missing required fields and explicit conflicts, including:

- unavailable auction, sweep, timeframe, session, continuation, or exhaustion;
- auction rejection;
- liquidity rejection;
- explicit exhaustion;
- failed continuation;
- current and higher-timeframe disagreement.

Unavailable is not treated as neutral.

## Action bias

The section supports:

- Continuation Favored;
- Continuation Requires Confirmation;
- Neutral;
- Caution;
- Reversal Risk Elevated;
- No Operational Conclusion.

Continuation is favored only when:

- current trend is directional;
- higher-timeframe bias matches;
- auction is accepted or expanding;
- continuation is explicitly confirmed;
- exhaustion is explicitly not detected;
- source freshness is current.

Explicit exhaustion elevates reversal risk. Rejection, failed continuation, or
timeframe conflict produces caution. Direction with incomplete confirmation
requires confirmation. Stale, unknown-timestamp, or missing trend evidence
produces no operational conclusion.

This is an interpretation of supplied states, not a direct trade signal.

## Freshness and confidence

Timestamped structure uses the existing `manual_structure` freshness policy.
The current baseline `Manual` timestamp becomes `unknown` with
`OBSERVATION_TIMESTAMP_MISSING`.

Confidence remains qualitative. `Structure Score` is preserved as source
evidence but is not repurposed as a confidence percentage. The conclusion
score is null.

## Baseline behavior

The captured production baseline renders:

- Current Structure: bearish;
- Auction State: unavailable;
- Liquidity Sweep Status: unavailable;
- Higher Timeframe Bias: unavailable;
- Current Session: unavailable;
- Action Bias: No Operational Conclusion;
- Confidence: very low.

This preserves the useful existing `Below key level` observation without
claiming structure fields the repository does not contain.

## Rendering and activation

Long, short, dashboard, and JSON outputs derive from one interpretation
object. The notification output is null.

The live briefing, dashboard, scheduler, notifications, and scores do not call
this module. Apps Script preview remains false, and Python preview requires
`HARMONEXUS_HEL035_INTERNAL_PREVIEW=true`.

## Validation

Fixtures cover:

- the actual manual baseline;
- accepted, rejected, rotating, expanding, and balancing auctions;
- sweep detection, acceptance, rejection, exhaustion, and no-sweep states;
- all higher-timeframe states;
- Asian, London, New York, and overlap sessions;
- continuation favored and requiring confirmation;
- neutral, caution, and reversal-risk action states;
- monetary and Silver Intelligence support/contradiction;
- missing and stale structure;
- renderer consistency;
- unsupported order-flow language;
- target identity;
- inactive preview;
- absence of acquisition, persistence, or provider calls.

Implementation version: `HEL-035.market-structure.1.0.0`.
