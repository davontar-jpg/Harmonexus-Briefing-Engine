# HEL-035 Source Authority

## Code authority

`hxSilverResolveAuthority_` implements the ATL-035-01 hierarchy. Each evidence
object receives immutable permissions for display, contextual interpretation,
confidence, action bias, executive synthesis, notification, and production
decision.

| Evidence class | Display | Context | Confidence | Action / executive | Notification / production |
|---|---:|---:|---:|---:|---:|
| Production-authoritative, available, current | yes | yes | yes | yes | yes |
| Production-authoritative, partial | yes | yes | yes | no | no |
| Production-authoritative, delayed | yes | yes | yes | yes | no |
| Validated | yes | yes | yes | explicit approved use only | explicit approved use and current only |
| Shadow | yes | yes when current/delayed | no | no | no |
| Research-only | internal preview only | internal preview only | no | no | no |
| Placeholder | status only | no | no | no | no |
| Blocked, failed, unavailable, stale, unknown freshness | status/context label only | no current use | no | no | no |

Validated evidence does not receive action or notification permission merely
because it is labeled validated. The caller must supply an explicit approved
use from a separately governed production decision.

## Hard rules

- `DATA BLOCKED` remains `blocked`; it is never converted to zero or neutral.
- Stale evidence is displayable only as stale context.
- Shadow evidence is always accompanied by
  `SHADOW_OBSERVATION_ONLY` and cannot create confidence or action.
- Research evidence is hidden unless the internal-preview caller explicitly
  opts in.
- Partial evidence cannot drive action, executive synthesis, notification, or
  production decision.
- Delayed evidence cannot create notification or production-decision
  permission.

## Production boundary

The core reads and writes no Sheet, score, briefing, ledger, scheduler, or
notification state. It has no `SpreadsheetApp`, atomic replace, trigger, or
delivery call. `HX_SILVER_INTELLIGENCE_PREVIEW_ENABLED` is `false`, and
`app.py` does not import the Python preview consumer.

HEL-033 and HEL-034 remain outside the production worktree. A later adapter may
construct typed shadow evidence from a read-only artifact, but must retain
disposition, freshness, reason codes, provenance pointer, and
`production_effect: none`.
