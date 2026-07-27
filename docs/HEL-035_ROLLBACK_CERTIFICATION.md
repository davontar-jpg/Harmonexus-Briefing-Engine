# HEL-035 Rollback Certification

Date: 2026-07-27

## Rollback status

Rollback is certified through the feature-flag path.

No rollback was executed because no critical rollback condition was observed after activation. The real production send did not occur.

## Rollback control

Primary rollback action:

1. Set `HEL_035_RUNTIME_ENABLED=false` in Apps Script Script Properties.
2. Confirm `HEL_035_STAGING_PUBLISH_ENABLED=false`.
3. Confirm `HEL_034_SHADOW_HANDOFF_STAGING_ENABLED=false`.
4. Re-run production dry-run validation.
5. Verify legacy briefing, dashboard, scoring, scheduler, notification, and webhook behavior.

## Source rollback

If source rollback is required:

1. Revert only production integration commit `5007b9aa76605de3f31059fbd9e6622bd5c3adc5`.
2. Do not rewrite history.
3. Do not delete the HEL-035 feature branch.
4. Push a normal rollback commit.
5. Re-synchronize Apps Script only if required.

## Invariants verified

- HEL-033 unchanged.
- HEL-034 unchanged.
- OOS ledger unchanged.
- HEL-034 production contribution remains `none`.
- Notification workflow preserved.
- Scheduler behavior preserved.
- Webhook behavior preserved.
- Scoring logic preserved.
- Liquidity does not claim order-book evidence.
- VIX remains delayed daily FRED data.

## Rollback trigger conditions

Immediate rollback is required if any of the following occur:

- runtime publication failure;
- dashboard failure;
- missing long or short briefing;
- raw enum exposure;
- fixture data exposure;
- Silver Intelligence authority violation;
- scoring change caused by HEL-035;
- scheduler change;
- webhook change;
- notification duplication;
- secret exposure;
- VIX falsely labeled live;
- liquidity claims without provider;
- production exception caused by HEL-035.

