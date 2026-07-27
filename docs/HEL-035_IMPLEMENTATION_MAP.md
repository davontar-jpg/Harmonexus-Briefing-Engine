# HEL-035 Implementation Map

## Current-to-intended sequence

The current long formatter starts with cross-asset regime and macro material,
then moves to drivers, contradictions, changes, priority instruments, research
context, relationships, calendar, and watch conditions. It has no dedicated
monetary, VIX, liquidity, silver-intelligence, or market-structure view models.

The future sequence is:

1. Executive Market Assessment
2. Monetary Environment
3. VIX — Volatility Environment
4. Liquidity Environment
5. Silver Intelligence
6. Market Structure
7. Existing macro sections
8. Existing instrument sections
9. Existing positioning, opportunity, and execution sections

No ordering change is applied in ATL-035-01.

## Reuse and overlap

- Reuse FRED, CFTC, webhook, normalized signal, score, logging, redaction,
  notification, dashboard data-loading, card, and source-quality primitives.
- Reference existing cross-asset consensus, driver, rotation, conviction,
  relationship, seasonal, and calendar sections instead of restating them.
- Monetary Environment should adapt FRED yields and DXY evidence; it must not
  duplicate the existing macro interpretation.
- Silver Intelligence should summarize silver-specific evidence and reference
  detailed positioning/structure sections.
- VIX may use the delayed daily `FRED_Raw.VIXCLS` contract when present.
  Liquidity must remain unavailable until an authoritative order-book contract
  exists; legacy research language is not live evidence.
- Existing cards, priority instruments, copper, platinum, briefing text, and
  notification behavior remain unchanged until explicitly approved.

## Proposed native namespace

The Apps Script toolchain reads flat, sorted `src/*.gs`; a nested Apps Script
package would be skipped. The proposed production namespace is:

| File | Responsibility |
|---|---|
| `src/12_SilverIntelligence.gs` | evidence schema, adapters, source authority, freshness, conflict resolution, confidence, provenance, read-only HEL-034 adapter |
| `src/13_SilverIntelligenceBriefing.gs` | nine-question section contract and pure long/short renderers |
| `silver_intelligence.py` | Streamlit read-only view model and expandable silver operator surface |
| `tests/silver-intelligence.test.mjs` | Apps Script schema, authority, degradation, renderer, no-mutation tests |
| `tests/test_silver_intelligence.py` | Python adapter/view-model/render tests |

All Apps Script symbols should use the `hxSilverIntelligence...` prefix. HEL-034
file access must be behind an optional adapter returning
`production_effect: none`. No production interpretation code belongs under
`research/`.

## Future file-impact plan

| Existing path | Future change | Risk control |
|---|---|---|
| `src/05_Notifications.gs` | call approved long/short pure renderers | reconcile dirty production version first; snapshot and parity tests |
| `src/06_Webhooks_Triggers.gs` | preserve compatibility entry point or delegate to short renderer | no webhook schema/authorization change |
| `src/07_Setup.gs` | add contract sheet only if persistence is approved | idempotent setup and migration test |
| `app.py` | add silver-specific expandable operator surface | preserve every current page/card and fallback mode |
| `tools/build-apps-script.mjs` | likely no change | new flat modules are auto-discovered |
| `tests/production.test.mjs` | add ordering and output regression tests | reconcile dirty production version first |
| `docs/*` | implementation/runbook/rollback updates | documentation-only |

Deployment, scheduler, `.clasp`, manifest scopes, workbook formulas, canonical
outputs, and HEL-033/034 files are not expected to change.

## Structured view model

Each section should expose:

`section_id`, `target`, `as_of`, `status`, `reason_codes`, `what_happened`,
`why_it_matters`, `silver_meaning`, `operational_bias`, `supports`,
`challenges`, `confidence`, `what_changes_conclusion`, `sources`,
`freshness`, `authority`, `provenance`, and `production_effect`.

Renderers consume this object but may not recompute authority, freshness, or
confidence. Long output retains all fields; short output uses an explicit
priority and length policy; dashboard expansion reveals details without losing
the underlying contract.

## Integration stages

1. Add schemas and pure resolvers with no consumer.
2. Add production-authoritative adapters and independent degradation tests.
3. Add optional read-only HEL-034 adapter; prove zero writes and zero OOS
   mutation.
4. Generate snapshot-only long/short preview artifacts.
5. Add internal dashboard preview behind an inactive feature flag.
6. Obtain operator approval for order and language.
7. Integrate one consumer at a time with rollback and parity evidence.

## Regression and validation gates

- full Python and JavaScript suites;
- Apps Script syntax and package build;
- workbook schema and fallback compatibility;
- long/short snapshot approval;
- Telegram/email parity and length tests;
- dashboard visual test at desktop and narrow widths;
- per-source freshness and reason-code tests;
- missing/blocked/stale/conflict matrices;
- HEL-033/034 hash and no-write assertions;
- OOS ledger unchanged;
- production and research checkouts unchanged;
- `git diff --check`;
- explicit owner approval before activation.

## ATL-035-01 actual impact

This character adds only the six requested documents and isolated
`artifacts/hel_035/` evidence. It adds no runtime import, module, sheet,
renderer, section, trigger, notification, or deployment behavior.
