# HEL-035 Confidence Policy

## Qualitative-first resolver

`hxSilverResolveConfidence_` uses only evidence with explicit confidence
eligibility. Shadow, research-only, blocked, unavailable, failed, stale, and
unknown-freshness evidence cannot increase confidence.

Base qualitative levels:

- one or two eligible inputs: low;
- three or four: moderate;
- five or more: high;
- no eligible input: unavailable.

Adjustments are emitted in `confidence_basis`:

| Condition | Effect |
|---|---|
| Completeness below 50% | cap at low |
| Completeness below 80% | cap at moderate |
| Partial source | cap at moderate |
| Stale evidence present | reduce one level |
| Provider disagreement/unresolved | reduce one level |
| Material disagreement | reduce one level |
| Unresolved conflict | reduce two levels |
| Strong historical validation | increase one level, maximum very high |

The basis records code, effect, count/value, and numeric-method provenance when
applicable.

## Numeric confidence

Numeric confidence is accepted only when supplied as:

- an authoritative existing score; or
- a documented calculation with method version and component list.

The numeric record must also identify production-authoritative evidence, or an
explicitly approved validated source.

Numeric precision is withheld when freshness, completeness, partial sources,
provider disagreement, or contradiction make that precision indefensible. The
qualitative result remains visible and the basis includes
`NUMERIC_CONFIDENCE_WITHHELD`.

The resolver never creates a percentage from an evidence count. Unavailable
liquidity, shadow-only evidence, and blocked evidence have a null score and an
`unavailable` label.

## Shadow boundary

Shadow evidence contributes no confidence. A strong shadow correlation or
current shadow confirmation remains observation only until a separate
validation and production-authority decision changes its evidence class.
