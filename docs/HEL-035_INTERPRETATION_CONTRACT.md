# HEL-035 Interpretation Contract

## Scope

`SilverInterpretation` is the single authoritative object for every later
HEL-035 surface. Its target is always `XAGUSD`. The core is deterministic,
inactive, and has `production_effect: none`.

The implementation is in `src/12_SilverIntelligence.gs`. Runtime validation is
performed by `hxSilverValidateInterpretation_`; deterministic serialization is
performed by `hxSilverSerializeInterpretation_`.

## Required fields

| Field group | Fields |
|---|---|
| Identity | `section_id`, `section_name`, `target_instrument`, `as_of`, `market_session` |
| Source state | `source_status`, `freshness_status`, `evidence_state` |
| Interpretation | `current_state`, `interpretation`, `market_impact`, `silver_impact`, `action_bias` |
| Decision support | `primary_support`, `primary_challenge`, `primary_risk`, `required_confirmation` |
| Confidence | nullable `confidence_score`, `confidence_label`, structured `confidence_basis` |
| Audit | `limitations`, `reason_codes`, `source_provenance`, `underlying_metrics` |
| Surfaces | `operator_summary`, `long_summary`, `short_summary`, `dashboard_summary`, nullable `telegram_summary` |
| Versioning | `rule_version`, `schema_version` |

`target_instrument` must equal `XAGUSD`. Missing fields fail validation rather
than receiving defaults that could turn missing evidence into a conclusion.

## Enumerations

`source_status`: `available`, `partial`, `unavailable`, `blocked`, `failed`.

`freshness_status`: `current`, `delayed`, `stale`, `unknown`.

`evidence_state`: `production_authoritative`, `validated`, `shadow`,
`research_only`, `placeholder`.

`action_bias`: `continuation_favored`,
`supportive_confirmation_required`, `neutral`, `caution`,
`reversal_risk_elevated`, `monetary_headwind`, `volatility_headwind`,
`orderly_continuation_favored`, `continuation_normal_confirmation`,
`stronger_confirmation_required`, `range_expansion_risk`,
`liquidation_risk_elevated`, `volatility_signal_unconfirmed`,
`no_operational_conclusion`, `unavailable`.

Confidence is `unavailable`, `very low`, `low`, `moderate`, `high`, or
`very high`. The numeric score is nullable.

## Build sequence

1. Validate and freeze typed evidence.
2. Resolve authority and permitted uses.
3. aggregate source and freshness state.
4. Resolve contextual contradictions.
5. Resolve action-eligible contradictions separately.
6. Resolve qualitative-first confidence.
7. Derive silver relationship and action bias.
8. Build provenance and underlying metrics.
9. Render every surface from the same object.
10. Validate, deep-freeze, and serialize.

Shadow evidence can affect the contextual relationship shown to an internal
operator, but it is excluded from action-eligible contradiction and confidence
sets. This prevents a shadow confirmation or challenge from setting the
production action bias.

## Determinism

`as_of` and evaluation times are explicit inputs. The core does not call the
wall clock, random generators, Sheets, notification functions, or external
services. Stable serialization sorts object keys recursively. Identical inputs
and version constants produce identical JSON.

Versions currently emitted:

- schema `HEL-035.schema.1.0.0`;
- evidence `HEL-035.evidence.1.0.0`;
- rules `HEL-035.rules.1.0.0`;
- authority, freshness, confidence, contradiction, vocabulary, and renderer
  version `1.0.0`.

## Section ending

The long renderer always ends with:

- Action Bias
- Primary Risk
- Required Confirmation
- Confidence

The object remains decision support. It does not create entries, exits, orders,
or production opportunity scores.
