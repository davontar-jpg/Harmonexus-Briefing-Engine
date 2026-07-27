# HEL-035 Production Preservation Manifest

Generated: 2026-07-24

Scope: ATL-035-01 reconnaissance only

## Repository identity

| Role | Absolute path | Branch | HEAD | State |
|---|---|---|---|---|
| Production checkout | `C:\Users\robin\Documents\Codex\2026-06-20\you-are-working-on-my-market\Harmonexus-Briefing-Engine` | `codex/production-readiness` | `1b75f0903e31afefbf35b35961a9e3bc0e2e0a15` | dirty, preserved |
| HEL-033/034 research | `C:\Users\robin\Documents\Codex\2026-07-18\you-are-working-on-my-harmonexus` | `research/silver-gauge-discovery` | `d69fbe1e6c57e45df0f1936f55f7433dfac053ac` | clean |
| HEL-035 worktree | `C:\Users\robin\Documents\Codex\2026-07-24\hel-035-silver-intelligence-operator-layer\Harmonexus-Briefing-Engine` | `feature/hel-035-silver-intelligence-operator-layer` | `1b75f0903e31afefbf35b35961a9e3bc0e2e0a15` | clean before ATL artifacts |

The HEL-035 branch was created from the committed production tip, not from the
research branch and not from the dirty production working tree.

## Remote and worktrees

`origin` fetch and push URL:
`https://github.com/davontar-jpg/Harmonexus-Briefing-Engine.git`.

Existing worktrees at reconnaissance time:

- production checkout, `codex/production-readiness`, `1b75f09`;
- `C:\Users\robin\Documents\Codex\2026-07-15\hel-028-operator-layer\Harmonexus-Briefing-Engine`,
  `codex/hel-028-operator-layer`, `6a14edee`;
- HEL-033/034 research checkout, `research/silver-gauge-discovery`, `d69fbe1`;
- HEL-035 isolated checkout, `feature/hel-035-silver-intelligence-operator-layer`,
  `1b75f09`.

## Pre-existing production state

The machine-readable authority is
`artifacts/hel_035/preservation_manifest.json`. It records 142 paths with Git
state, size, UTC modification time, SHA-256, scope, access, and preservation
reason.

Tracked modifications:

| Path | State | Bytes | Last modified UTC | SHA-256 |
|---|---:|---:|---|---|
| `src/05_Notifications.gs` | modified | 58,131 | 2026-07-09T20:27:06.9076088Z | `67a40ebd909b8ec0fa61bfa4b18c10553c2a8948d9a4e2a17a8b59a14a2a8a3f` |
| `tests/production.test.mjs` | modified | 26,359 | 2026-07-09T20:26:52.1632983Z | `114c6af3bbf2c1c9420ed8b9a03d0707be9796c5503896f22c541fb9da2a158c` |

Untracked production paths comprise 140 files: 20 files in each of
`HEL-025_auction-hall`, `HEL-026_observatory-of-probability`,
`HEL-027_hall-of-macro-forces`, `HEL-028_institutional-dealing-room`,
`HEL-029_compass-chamber`, `HEL-030_regime-observatory`, and
`HEL-031_treasury-vault`. Each exact path and hash is in the JSON manifest.

Manifest SHA-256:
`d82d194b8e55f89c89725bb913d87648f1a168ef9fab032a952fbbd9aa4dbb37`.

## Preservation policy

All 142 entries are out of HEL-035 scope. Read access is permitted for
reconnaissance; modification is prohibited. No file was reset, stashed,
cleaned, staged, committed, moved, normalized, reformatted, renamed, deleted,
or copied into the feature base.

The two tracked production modifications are a later integration risk because
the HEL-035 branch contains the committed versions of the same paths. A future
character must reconcile them deliberately before changing notifications or
their tests.

## Generated-artifact isolation

ATL artifacts are contained under `artifacts/hel_035/` and documentation under
the six requested HEL-035 paths. They are not read by `app.py`, Apps Script,
the workbook, schedulers, webhooks, notifications, or deployment tooling.

No push, merge, deployment, trigger installation, Sheet write, or production
notification occurred.
