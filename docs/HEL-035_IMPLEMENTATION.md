# HEL-035 Implementation

Status: complete behind explicit activation and internal-preview boundaries

Permanent target: XAGUSD / SILVER

## Runtime architecture

HEL-035 is a deterministic consumer and interpretation layer:

1. one read-only production snapshot enters typed silver-specific adapters;
2. authority and freshness determine eligibility;
3. contradiction and confidence resolvers preserve uncertainty;
4. section engines produce one authoritative object per section;
5. Executive Market Assessment synthesizes the five supporting sections;
6. Evidence Integrity discloses source health, freshness, blocked inputs, and
   agreement without creating evidence;
7. one immutable runtime is published to `HEL_035_Runtime`;
8. briefing and dashboard renderers consume `runtime.integration`;
7. the existing notification path may deliver the integrated long briefing
   only after explicit activation.

No renderer recalculates evidence, confidence, authority, or action bias.

## Module map

| Module | Responsibility |
|---|---|
| `src/12_SilverIntelligence.gs` | typed evidence, interpretation, authority, freshness, contradiction, confidence, provenance |
| `src/13_SilverIntelligenceBriefing.gs` | controlled language and pure multi-surface renderers |
| `src/14_SilverMonetaryEnvironment.gs` | monetary evidence and silver-specific monetary interpretation |
| `src/15_SilverVixVolatilityEnvironment.gs` | authorized VIX snapshot interpretation, including delayed daily FRED VIXCLS freshness |
| `src/16_SilverLiquidityEnvironment.gs` | provider-neutral order-book contract and safe unavailable state |
| `src/17_SilverIntelligenceInterpretation.gs` | read-only HEL-034 concept translation |
| `src/18_SilverMarketStructure.gs` | interpretation of existing Harmonexus structure |
| `src/19_SilverExecutiveAssessment.gs` | concise five-section synthesis |
| `src/20_SilverBriefingIntegration.gs` | long, short, dashboard, silver-card preview, and activation boundary |
| `src/21_SilverOperatorExperience.gs` | shared Silver Market Desk card and expandable-evidence contract |
| `src/22_SilverProductionRuntime.gs` | single production snapshot, FRED_Raw VIXCLS adapter, Evidence Integrity, runtime publication and consumption |
| `silver_intelligence.py` | typed, read-only preview validation |
| `app.py` | internal Streamlit preview rendering |

## Production boundary

Runtime publication and briefing integration are independently disabled unless:

- `HEL_035_RUNTIME_ENABLED=true` permits the scoring schedule to publish
  `HEL_035_Runtime`;
- `hel035_enabled: true` or
  `HEL_035_BRIEFING_INTEGRATION_ENABLED=true` permits the existing briefing
  path to consume the published runtime.

Disabled integration, a missing runtime, or an invalid runtime returns the
existing briefing.

The Streamlit desk separately requires
`HARMONEXUS_HEL035_INTERNAL_PREVIEW=true` and a valid optional
`HEL_035_Runtime` worksheet.

## Source boundaries

- Production-authoritative evidence may influence conclusions.
- Validated evidence may influence only approved uses.
- HEL-034 shadow evidence is context and remains labeled.
- HEL-033 is not a runtime input.
- Missing, blocked, stale, and unavailable evidence retain those states.
- No HEL-035 module writes a disposition, OOS observation, research artifact,
  score, trigger, or provider provenance record.

## Current limitations

- Runtime publication is implemented but remains disabled pending operator
  approval.
- VIX is supplied from `FRED_Raw.VIXCLS` when the canonical FRED sheet contains
  delayed daily CBOE VIX close data. It is never labeled live.
- Liquidity has no connected order-book provider and correctly renders
  unavailable.
- HEL-034 remains shadow and cannot determine production bias.
- Production contains pre-existing uncommitted work that must be reconciled
  before branch integration.

## Readiness

The code is production-safe and release-candidate quality. Active production
cutover is **Ready with Conditions** because operator runtime preview approval,
authorized VIX supply, and dirty-production reconciliation remain deployment
gates.
