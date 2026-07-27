# HEL-035 Source Authority Plan

## Authority hierarchy

1. Current production-authoritative data
2. Existing validated production intelligence
3. HEL-034 read-only shadow observation
4. HEL-034 validation baseline
5. HEL-033 research baseline
6. Explicit placeholder/unavailable state

Resolution occurs per evidence item, not once for the whole briefing. A lower
class cannot replace, recency-promote, or increase the confidence of a higher
class without an explicit transition decision.

## Surface permissions

| Source class | Visible interpretation | Operational conclusion | Confidence | Short briefing / notifications | Public dashboard | Internal preview |
|---|---|---|---|---|---|---|
| Current production data | yes | yes | yes | yes | yes | yes |
| Validated production intelligence | yes | yes | yes | yes | yes | yes |
| HEL-034 shadow | labeled support/challenge only | no | no production increase | no | no | yes |
| HEL-034 validation baseline | methodology context only | no | no | no | no | yes |
| HEL-033 research baseline | historical context only | no | no | no | no | yes |
| Unavailable placeholder | status/reason only | unavailable | zero/withheld | degraded notice only | degraded notice only | yes |

An initial HEL-034 adapter may feed an internal preview and long-form audit
only when each item is visibly labeled `SHADOW`, carries its disposition and
freshness, and declares `production_effect: none`.

## Decision rules

- Production direction, confidence, alerts, and market structure are computed
  solely from classes 1–2.
- Shadow evidence may support, challenge, diverge, or identify an emerging
  relationship. It cannot decide bias or issue instructions.
- `DATA BLOCKED` remains blocked. It is never mapped to neutral, zero, or
  confirming.
- `PROMOTE TO SHADOW` is not validation or production authorization.
- Conflicting higher-authority sources lower or withhold a conclusion; a
  research source cannot break the tie.
- Source timestamps and freshness thresholds are preserved through rendering.
- Previous conclusions expire; they are not reused without a current evidence
  record and explicit carry-forward policy.

## Required authority record

Every item must carry:

- canonical evidence ID and XAGUSD target;
- authority class and permitted influence;
- source/provider and original identifier;
- observed, acquired, and evaluated timestamps;
- freshness threshold and current status;
- quality and reason codes;
- value, units, transformation, and provenance;
- confidence contribution;
- supporting/challenging role;
- `production_effect`;
- version and hash where file-backed.

## Promotion path

### SHADOW → VALIDATED

Requires sufficient fresh OOS observations, provider agreement, stable
relationship and role, redundancy review, data-quality acceptance, no early
failure flag, reproducible validation, formal operator review, and a recorded
decision. HEL-035 does not perform this transition.

### VALIDATED → PRODUCTION-AUTHORITATIVE

Requires a production-suitable provider, live freshness SLA, schema and
authority tests, observability, rollback, shadow-versus-production comparison,
briefing/dashboard/notification regression evidence, security review, explicit
operator approval, and a separately approved cutover. No transition is
automatic or inferred from disposition text.

## Current authority assignments

- FRED yield observations, CFTC reports, authenticated webhook factors, and
  approved Sheet scores are production classes subject to freshness.
- The TradingView webhook contains discrete factor events; it is not an
  historical-candle authority.
- The bundled workbook is a fallback/demo authority and must be labeled as
  such.
- VIX, VVIX, live liquidity, order book, and current auction state are
  unavailable until production contracts exist.
- HEL-033 and HEL-034 remain file-backed read-only research in their isolated
  worktree.
