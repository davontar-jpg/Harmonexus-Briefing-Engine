# Configuration and credentials

All Apps Script secrets belong in **Apps Script → Project Settings → Script Properties**. Do not place secrets in cells, source files, GitHub, or TradingView screenshots.

## Required production properties

| Property | Required | Where to obtain it |
|---|---:|---|
| `WEBHOOK_SECRET` | For TradingView | Generate a long random value yourself; use the same value in TradingView JSON. |
| `TELEGRAM_BOT_TOKEN` | If using Telegram | Create a bot with Telegram’s `@BotFather`. |
| `TELEGRAM_CHAT_ID` | If using Telegram | Send the bot a message, then inspect the bot updates or use a trusted chat-ID method. |
| `PUSHOVER_APP_TOKEN` | If using Pushover | Create an application in the Pushover dashboard. |
| `PUSHOVER_USER_KEY` | If using Pushover | Copy the user/group key from Pushover. |
| `ALERT_EMAIL` | Optional email/text-to-email recipients | One or more comma-separated destination addresses. Apps Script uses Google authorization; no email password is stored. |
| `OPENAI_API_KEY` | Optional AI | Create a project API key in the OpenAI platform. |
| `OPENAI_MODEL` | Optional | Defaults to `gpt-5.5`; keep configurable. |
| `AI_DAILY_ENABLED` | Optional | String `true` or `false`. |

At least one complete Telegram or Pushover pair is required for phone push notifications.

## Telegram test

1. Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`.
2. Run `testNotificationConfiguration()`.
3. Run `testTelegramNotification()`.
4. Confirm the phone message and the Apps Script execution result.

## Pushover test

1. Set `PUSHOVER_APP_TOKEN` and `PUSHOVER_USER_KEY`.
2. Run `testNotificationConfiguration()`.
3. Run `testPushoverNotification()`.
4. Confirm the phone message.

## Email / text-to-email test

1. Set `ALERT_EMAIL` to one or more comma-separated recipients.
2. Run `testEmailNotification()`.
3. Grant the Google mail-send permission when prompted.

## OpenAI test

1. Set `OPENAI_API_KEY`.
2. Optionally set `OPENAI_MODEL`; default is `gpt-5.5`.
3. Leave `AI_DAILY_ENABLED=false` for the first pipeline test.
4. Run `generateAIInterpretations()`.
5. Inspect `AI_Interpretations` for `Mode=AI`. `Mode=Fallback` means the deterministic interpretation was used and its error note should be reviewed.
6. Set `AI_DAILY_ENABLED=true` only after output and cost behavior are accepted.

## Streamlit private Google Sheets secrets

1. Create a Google Cloud service account with read-only intended use.
2. Enable the Google Sheets API and Google Drive API for its project.
3. Create a JSON key.
4. Copy its fields into the Streamlit secrets template; do not commit the real file.
5. Share only the backup Sheet with the service account email as Viewer.
6. Set `GOOGLE_SHEET_ID` to the ID between `/d/` and `/edit` in the Sheet URL.

Local `.streamlit/secrets.toml` is ignored by Git. Streamlit Community Cloud secrets are entered in its web settings.

## Public feeds

The configured FRED CSV and CFTC Socrata endpoints do not require API keys. Production access still depends on endpoint availability, Apps Script URL-fetch quotas, and the configured CFTC market names. Failures are logged and cached source sheets are preserved.
