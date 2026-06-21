# Rollback

The v5 rollout is additive. Legacy calculation and dashboard sheets are not deleted.

## Immediate rollback

1. Run `disableHarmonexusTriggers()` in the backup Apps Script project.
2. Disable or replace the TradingView alerts that target the v5 Web App URL.
3. Stop using the v5 Streamlit live connection or switch it to bundled/upload mode.
4. Continue using the original production Google Sheet and its existing Apps Script deployment.

## Data preservation

Do not delete `System_Log`, `Webhook_Log`, `Signal_History`, `Score_History`, or `Notification_Log` until the incident is understood. They are the audit trail.

## Code rollback

If this branch has been merged, revert the v5 commit through Git rather than manually editing individual files. The original production Sheet remains independent until you explicitly cut it over.
