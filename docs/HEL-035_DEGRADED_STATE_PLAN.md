# HEL-035 Degraded-State Plan

## Common contract

Statuses are `CURRENT`, `STALE`, `PARTIAL`, `BLOCKED`, `UNAVAILABLE`,
`CONFLICTED`, and `MARKET_CLOSED`. Neutral is a market interpretation, never a
substitute for missing evidence.

Every degraded section retains `as_of`, `evaluated_at`, source, freshness
threshold, status, reason codes, confidence effect, and the condition required
to recover. Sections fail independently and the briefing continues rendering.

## Scenario matrix

| Scenario | Reason code | Required behavior |
|---|---|---|
| VIX stale | `VIX_STALE` | show last timestamp and age; withhold current volatility conclusion; do not reuse prior VIX bias |
| Yields stale | `YIELDS_STALE` | mark affected tenors; degrade Monetary independently; withhold rate-driven confidence increase |
| COT delayed | `COT_DELAYED` | show report date/cadence; label positioning delayed, not neutral |
| Open interest missing | `OPEN_INTEREST_MISSING` | omit OI conclusion and reduce evidence coverage; preserve COT if available |
| `shadow_current.json` missing | `HEL034_SHADOW_MISSING` | hide shadow observations, keep production sections active, no crash |
| One shadow candidate stale | `HEL034_CANDIDATE_STALE` | degrade only that candidate; exclude it from current support/challenge counts |
| All shadow candidates unavailable | `HEL034_ALL_UNAVAILABLE` | show labeled shadow-unavailable state in internal preview only |
| USDCNH remains blocked | `HEL034_USDCNH_DATA_BLOCKED` | preserve `DATA BLOCKED`; never convert to neutral or confidence |
| No order-book provider | `ORDER_BOOK_PROVIDER_UNAVAILABLE` | render order-book evidence unavailable; do not infer from price |
| Market structure missing | `MARKET_STRUCTURE_MISSING` | withhold structure conclusion and prevent structure-based operational bias |
| Sources conflict | `AUTHORITATIVE_SOURCE_CONFLICT` | expose both sources, lower/withhold confidence, require resolution rule |
| Market closed | `MARKET_CLOSED` | identify last valid session and do not age closed hours as missing bars |
| Conclusion unjustified | `INSUFFICIENT_JUSTIFICATION` | return unavailable with supports/challenges; no bias or instruction |
| VVIX absent | `VVIX_UNAVAILABLE` | leave VVIX unavailable; VIX cannot stand in silently |
| Liquidity proxy absent | `LIQUIDITY_UNAVAILABLE` | section unavailable; do not manufacture a liquidity regime |

## Freshness policy

Freshness is source-specific. Current production thresholds include 120 hours
for daily FRED-derived signals, 240 hours for weekly CFTC-derived signals, and
72 hours for webhook events. HEL-035 should replace coarse section assumptions
with explicit per-source thresholds while preserving current production
behavior until approved.

Market closures, weekends, and scheduled report cadence must be evaluated
before assigning stale status. A delayed weekly report and a missing report are
different states.

## Carry-forward policy

Prior values may be displayed as historical context only when their timestamp
and stale status are visible. Prior conclusions, confidence, support counts,
and operational bias may not be carried forward as current. Recovery requires
a current authoritative observation or an explicit operator-approved override
record.

## Rendering policy

- Long briefing: full reason, timestamp, confidence effect, and recovery
  condition.
- Short briefing: concise status and reason; never omit a degradation that
  changes the conclusion.
- Dashboard: persistent status badge with expandable provenance.
- Notifications: no shadow- or missing-data trigger; notify only under a later
  approved degradation-alert policy.
- Public surfaces: shadow evidence absent until separately authorized.

## Test matrix

Each scenario requires unit tests for status, reason code, timestamp,
independent degradation, no stale carry-forward, safe rendering, no alert, and
no production-score mutation. Missing HEL-034 files must be tested with the
OOS ledger hash unchanged.
