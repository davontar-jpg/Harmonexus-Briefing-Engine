# HEL-035 Freshness Policy

## Resolver

`hxSilverResolveFreshness_` requires an observation timestamp, an explicit
evaluation timestamp, and a named source policy. It returns status, age,
expected next update, reason code, policy ID, and rule version.

There is no universal stale threshold.

| Policy | Current through | Delayed through | Expected cadence |
|---|---:|---:|---:|
| `live_market` | 15 minutes | 1 hour | 1 minute |
| `delayed_etf` | 1 hour | 24 hours | 15 minutes |
| `fred_daily` | 36 hours | 72 hours | daily |
| `cot_weekly` | 9 days | 12 days | weekly |
| `hel034_daily_shadow` | 36 hours | 72 hours | daily |
| `hel034_intraday_shadow` | 2 hours | 8 hours | hourly |
| `order_book` | 10 seconds | 60 seconds | 1 second |
| `manual_structure` | 24 hours | 7 days | operator update |

These are rule-versioned interpretation thresholds, not claims about provider
SLAs.

## Sessions, weekends, and holidays

Callers may provide `market_session.status`, `is_holiday`, and `next_open`.
When a market is closed, an observation may remain current until the next open
plus the source policy's current grace. The resolver emits
`MARKET_CLOSED_CARRY` or `HOLIDAY_CLOSED_CARRY`.

The caller remains responsible for the authoritative exchange calendar and
timezone. HEL-035 does not infer a holiday from price silence.

## Publication timing

`fred_daily` and `cot_weekly` use publication-aware windows. An explicit
`publication_delayed` input produces a delayed status and reason even when raw
age would otherwise be current. `expected_next_update` can be supplied by the
provider adapter; otherwise it is derived from the policy cadence.

## Unknown behavior

Missing observation time, missing evaluation time, or an unknown policy returns
`unknown` with a reason code. It never returns current or neutral.
