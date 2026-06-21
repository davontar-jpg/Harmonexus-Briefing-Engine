# Live deployment runbook

This runbook deliberately targets a **backup copy** of the production Google Sheet. Do not install v5 directly into the live workbook on the first pass.

## 1. Prepare the backup Sheet

1. Open the production Google Sheet.
2. Select **File → Make a copy**.
3. Name it `Harmonexus v5 Parallel Test`.
4. Keep the original workbook open only for comparison. Do not delete or rename its tabs.

## 2. Install Apps Script

### Browser copy/paste route

1. In the backup Sheet, select **Extensions → Apps Script**.
2. Open **Project Settings** and copy the Script ID for your records.
3. Replace the manifest with the repository `appsscript.json` contents.
4. Create eight script files with the same names as `src/00_Config.gs` through `src/07_Setup.gs`.
5. Paste each file’s complete contents and save.
6. Select `setupHarmonexus` and click **Run**.
7. Review and grant the Google permissions. The script needs spreadsheet, external-request, trigger, and optional mail permissions.

### Clasp route

```powershell
npm install
npm run build:gas
Copy-Item .clasp.json.example .clasp.json
```

Edit `.clasp.json`, paste the backup Sheet’s Apps Script Script ID, then run:

```powershell
npx clasp login
npx clasp push
```

`npx clasp push` changes the backup Apps Script project. It does not alter the original production workbook.

## 3. Configure and validate

1. Add Script Properties from `config/script-properties.example.json`; see `CONFIGURATION.md`.
2. Run `setupHarmonexus()`.
3. Run `validateHarmonexusInstallation()` and require PASS for the v5 contract sheets.
4. Run `refreshFRED()`.
5. Run `refreshCFTC()`.
6. Run `calculateAllScores()`; this also rebuilds `Calculated_Signals`.
7. Review `System_Log`, `Calculated_Signals`, `Instrument_Scores`, and `Deployment_Status`.
8. Run `runParallelComparison()` and inspect `V4_V5_Comparison`.

## 4. Parallel-test gate

For XAGUSD, US30, SPX500, and NAS100:

1. Record at least five score cycles.
2. Include at least one post-CFTC-release refresh.
3. Investigate every direction mismatch.
4. Confirm that missing factors lower confidence rather than manufacturing neutral evidence.
5. Confirm webhook-derived factors take priority over legacy fallback values.
6. Confirm stale sources show `stale-cache` in `Calculated_Signals`.

Do not cut over if a mismatch cannot be explained by an intentional methodology change.

## 5. Deploy the webhook

1. Set `WEBHOOK_SECRET` in Script Properties.
2. Select **Deploy → New deployment → Web app**.
3. Execute as: **Me**.
4. Access: choose the minimum setting compatible with TradingView. TradingView cannot sign into Google, so the endpoint must accept unauthenticated HTTP requests; the payload secret provides application-level authentication.
5. Copy the `/exec` Web App URL.
6. Follow `TRADINGVIEW.md` to configure and test alerts.

## 6. Activate notifications

1. Configure Telegram or Pushover.
2. Run `testNotificationConfiguration()`.
3. Run exactly one appropriate test: `testTelegramNotification()` or `testPushoverNotification()`.
4. Optionally configure `ALERT_EMAIL` and run `testEmailNotification()`.
5. Run `sendDailyBriefing()` and confirm receipt and `Notification_Log` output.

## 7. Enable automation

Run `installTriggers()` once. It replaces only Harmonexus-owned triggers and prevents duplicates.

Verify the Apps Script Triggers page contains:

- daily `refreshFRED`
- Friday `refreshCFTC`
- hourly `calculateAllScores`
- daily `sendDailyBriefing`

## 8. Streamlit deployment

1. Push this branch only after reviewing the final diff.
2. In Streamlit Community Cloud, create an app from `app.py`.
3. For demo/upload mode, no secret is required.
4. For private live Google Sheets mode, paste `.streamlit/secrets.toml.example` into **App settings → Secrets**, replace every placeholder, and share the backup Sheet with the service account `client_email` as Viewer.
5. Start the app and select **Live Google Sheets** in the sidebar.
6. Confirm the UI shows `LIVE SHEETS`, `V5`, and acceptable freshness.

## Production cutover gate

Cut over only after all of these are true:

- v4.7 versus v5 comparison is understood and accepted
- FRED and CFTC refreshes succeed in the Google account
- webhook valid/invalid/duplicate tests pass
- daily phone notification is received
- `System_Log` has no unresolved failures
- Streamlit live mode reads the backup Sheet
- rollback has been rehearsed with `disableHarmonexusTriggers()`
