# HEL-035 Degraded States

## Implemented behavior

| State | Interpretation behavior |
|---|---|
| Unavailable source | source unavailable, null confidence, unavailable action |
| Blocked source | source blocked, explicit reason, never neutral |
| Failed artifact | source failed, no conclusion, no confidence |
| Stale evidence | stale context only, no current authority or action |
| Delayed evidence | context/confidence allowed by class; no notification or production decision |
| Partial evidence | confidence capped; no executive/action/notification permission from partial input |
| Shadow evidence | labeled observation only; no confidence/action/notification |
| Provider disagreement | qualitative confidence reduced; numeric precision withheld |
| Unresolved conflict | no operational conclusion; confidence reduced two levels |
| Missing structure/liquidity | unavailable, not neutral; independent section degradation |

## Fixture coverage

`tests/fixtures/hel_035_silver_core.json` contains:

1. complete current evidence;
2. partial evidence;
3. stale VIX;
4. blocked USDCNH;
5. shadow COPX confirmation;
6. shadow REMX challenge;
7. absent liquidity provider;
8. contradictory monetary inputs;
9. missing market structure;
10. full agreement;
11. strong disagreement;
12. qualitative confidence only;
13. numeric confidence available;
14. missing source artifact;
15. delayed COT;
16. stale shadow artifact;
17. source-provider disagreement.

Tests prove unavailable and blocked do not become neutral, stale does not become
current, shadow is labeled and excluded from production influence, unsupported
numeric precision is withheld, order-flow claims are rejected, renderer state
is consistent, and the preview boundary remains inactive.

## Independent degradation

Each section is built from its own evidence list. Missing liquidity does not
erase current monetary evidence; missing shadow artifacts do not affect
production evidence; stale VIX does not silently reuse a prior volatility
conclusion. Every degraded result preserves reasons, provenance, timestamps,
limitations, and the required next confirmation.
