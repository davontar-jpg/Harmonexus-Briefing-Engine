# HEL-035 — Executive Briefing Integration

Status: implemented with an explicit integration bundle and activation gate

Permanent target: XAGUSD / SILVER

Integration version: `HEL-035.integration.1.1.0`

Production checkout effect: none

## Mission

ATL-035-09 connects the six completed HEL-035 interpretation objects to the
long briefing, short briefing, internal dashboard preview, silver-card preview,
and existing daily delivery path.

The integration layer consumes renderer output. It does not recalculate:

- evidence;
- authority;
- freshness;
- confidence;
- contradictions;
- action bias;
- market structure;
- HEL-034 validation or disposition.

## Input contract

One caller-supplied bundle must contain:

1. Executive Market Assessment;
2. Monetary Environment;
3. VIX — Volatility Environment;
4. Liquidity Environment;
5. Silver Intelligence;
6. Market Structure.

Each section must:

- identify `XAGUSD`;
- match its permanent section ID and name;
- contain its existing long, short, and dashboard renderings;
- preserve current state, silver impact, and confidence;
- declare `production_effect: none`.

Missing, renamed, non-silver, incomplete, or production-mutating sections are
rejected. Executive Market Assessment must retain intended briefing order one
and its statistics-free single-paragraph contract.

## Long briefing

When the activation gate and a valid bundle are both present, the existing
briefing header is retained and the HEL-035 block is inserted before
`MARKET REGIME:`.

The resulting order is:

1. Executive Market Assessment;
2. Monetary Environment;
3. VIX — Volatility Environment;
4. Liquidity Environment;
5. Silver Intelligence;
6. Market Structure;
7. every existing macro section;
8. every existing instrument section;
9. every existing positioning, opportunity, calendar, and watch section.

The existing body and final decision-support disclaimer are not regenerated,
renamed, condensed, or removed by HEL-035.

## Short briefing

The short renderer creates exactly one line per section. Every line retains:

- section name;
- Current State;
- Silver Impact;
- Confidence.

It reads those fields from the authoritative interpretation. It does not create
an independent conclusion.

Silver Intelligence also retains its authority label in the short output.

## Dashboard

The combined dashboard view model preserves the approved section order.

Each section follows one operator hierarchy:

1. headline;
2. interpretation;
3. silver impact;
4. operational conclusion;
5. required confirmation and primary risk;
6. confidence and freshness;
7. `expandable_details`.

`expandable_details` normalizes evidence, metrics, sources, freshness,
reason codes, research notes, and limitations. Exact summary values are pruned
from the expanded payload.

The Streamlit application exposes `Silver Market Desk` only when
`HARMONEXUS_HEL035_INTERNAL_PREVIEW=true`. It reads an optional
`HEL_035_Preview` worksheet containing a `Payload`, `Integration JSON`, or
`JSON` column. Absence or invalidity degrades to a visible unavailable notice
without affecting the existing dashboard.

## Silver card

The production `card()` implementation is unchanged.

When internal preview is enabled and XAGUSD is selected, a separate expandable
Silver Intelligence integration preview may appear below the existing card.
The preview declares:

- `preview_only`;
- `current_production_card_preserved: true`;
- `card_redesigned: false`;
- `production_effect: none`.

It is not a replacement card and does not alter card statistics, scoring,
interaction, or layout.

## HEL-034 boundary

The integrated Silver Intelligence section retains:

- `Shadow Observation` for shadow evidence;
- `Validation` for validated evidence;
- `Research` for research-only evidence;
- `Blocked` for blocked evidence;
- `Unavailable` for placeholder evidence.

Shadow context cannot set a production bias, change a score, create an alert,
or become production-authoritative through integration.

## Notification boundary

ATL-035-09 adds no alert type and no independent section notification.

When explicitly enabled, the already integrated long briefing is passed once
to the existing daily notification function. Telegram and email continue to
receive the same unified briefing message through the existing delivery path.
When disabled or when the bundle is absent, notification behavior and content
remain the legacy behavior.

## Activation and rollback

Integration requires:

- caller option `hel035_enabled: true`; or
- Script Property `HEL_035_BRIEFING_INTEGRATION_ENABLED=true`;
- and a complete caller-supplied `hel035_bundle`.

The existing scheduler supplies neither in this character. Removing the option
or setting the property false returns the exact legacy briefing. Enabling the
gate without a bundle logs a warning and returns the legacy briefing safely.

No sheet, cache, score, OOS ledger, disposition, or research artifact is
mutated.

## Validation

Tests cover:

- exact long-briefing order;
- preservation of legacy sections and disclaimer;
- six-line short briefing completeness;
- interpretation-first dashboard layering;
- HEL-034 shadow labeling;
- unavailable liquidity;
- preview-only silver card support;
- no new notification behavior;
- disabled and missing-bundle fallback;
- target, production-effect, renderer, and executive fail-closed rules;
- forwarding through the existing daily notification path;
- internal Streamlit preview gating.
