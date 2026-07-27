# HEL-035 Developer Notes

## Non-negotiable invariants

- Target identity is always XAGUSD / SILVER.
- HEL-033 is not a runtime source.
- HEL-034 is consumed through explicit read-only snapshots.
- Shadow, blocked, unavailable, delayed, and stale states remain distinct.
- Numeric confidence is preserved only when an authoritative source and method
  already support it.
- Renderers consume completed interpretation objects and cannot recompute
  business logic.
- `production_effect` remains `none` until a separately approved cutover.
- Provider-specific order-book code belongs in an adapter, not the core.

## Determinism

The same input object and version set must produce the same interpretation and
serialized output. Wall-clock time is metadata only. Random prose is
prohibited.

## Adding evidence

1. Add or reuse a typed evidence kind.
2. Preserve value, unit, direction, interval, timestamp, source, provider,
   authority, freshness, quality, eligibility, reason codes, and provenance.
3. Add an authority-use test.
4. Add current, partial, stale, blocked, and unavailable fixtures where
   applicable.
5. Prove renderer consistency and no production mutation.

## Changing language

Update controlled vocabulary and all surface snapshots together. Do not add
unsupported certainty, institutional-flow claims, or ticker-first public
language.

## Validation commands

- JavaScript: run every test listed in `package.json`.
- Python: `python -m pytest -q`.
- Apps Script: run `tools/check-gas-syntax.mjs`, then
  `tools/build-apps-script.mjs`.
- Start Streamlit and verify HTTP 200.
- Verify the internal preview visually.
- Run `git diff --check`.
- Recheck the production preservation manifest and HEL-033/034 hashes.

## Integration changes

Any change to `src/05_Notifications.gs` must retain exact legacy behavior when
HEL-035 is disabled or lacks a bundle. Do not modify scheduler, scoring,
webhook authorization, card calculations, or notification recipients as part
of an interpretation change.
