# Harmonexus Briefing Engine

Harmonexus is a cross-asset market-intelligence platform built around Google Sheets, Apps Script, TradingView webhooks, and a premium Streamlit observatory. It produces evidence-backed directional readings; it does **not** execute trades.

## Architecture

```text
FRED / CFTC / TradingView
          ↓
Raw sheets → Normalized_Data → Calculated_Signals
                                      ↓
                              Instrument_Scores
                                  ↙       ↘
                     AI_Interpretations   Score_History
                                  ↓              ↓
                         Daily briefing   Material-change alerts
                                  ↘              ↙
                         Telegram / Pushover / email
```

The contract deliberately separates raw observations, normalized values, factor signals, scores, AI interpretation, and notification output. The legacy workbook remains supported by the Streamlit app.

Production deployment starts with [docs/LIVE_DEPLOYMENT.md](docs/LIVE_DEPLOYMENT.md). Credentials and channel setup are documented in [docs/CONFIGURATION.md](docs/CONFIGURATION.md), while TradingView copy/paste templates live in [docs/TRADINGVIEW.md](docs/TRADINGVIEW.md).

## Instrument universe

- Metals: Silver, Gold, Copper, Platinum
- Equity indices: US30, S&P 500, Nasdaq 100, Russell 2000
- FX: DXY, EURUSD, GBPUSD, GBPJPY, EURJPY, USDJPY, USDDKK
- Rates: US 2Y, 5Y, 10Y, and 30Y yields

Each registry entry defines the instrument family, display name, CFTC proxy where applicable, and factor weights. Add instruments in `src/00_Config.gs`; downstream scoring is registry-driven.

## Directional score

Each reading includes:

- direction: Bullish, Bearish, or Neutral
- strength: 1.0–10.0 (for example, `Silver: Bearish 7.8/10`)
- signed directional score: -10 to +10
- evidence coverage/confidence
- strongest factor contributions
- contradictions
- prior direction, prior strength, change, and material-change flag

The v5 score preserves the existing evidence philosophy while making it auditable. Missing factors reduce confidence instead of silently becoming neutral evidence.

`buildCalculatedSignals()` applies deterministic source precedence: authenticated webhooks, public CFTC/FRED observations, then explicitly labeled v4.7 fallback values. It records source quality, confidence, contradictions, prior signal, delta, and material-change state.

## Apps Script installation

1. Open the Google Sheet and select **Extensions → Apps Script**.
2. Create script files matching the files in `src/` and paste their contents, or deploy with `clasp`.
3. Replace the Apps Script manifest with `appsscript.json`.
4. Run `setupHarmonexus()` once and authorize the requested scopes.
5. Run `refreshFRED()`, `refreshCFTC()`, and `calculateAllScores()`.
6. Run `installTriggers()` once. It safely replaces Harmonexus-owned triggers instead of duplicating them.
7. Deploy as a Web App for TradingView webhook access.

For a packaged `clasp` deployment to the backup project:

```bash
npm install
npm run build:gas
```

Then copy `.clasp.json.example` to `.clasp.json`, insert the backup project Script ID, and run `npx clasp push`.

Existing compatibility entry points remain: `refreshFRED`, `refreshCFTC`, `refreshAll`, `generateBriefingText`, `generateBriefingLog`, `sendBriefingEmail`, `installTriggers`, and `doPost`.

## Script Properties

Set secrets in **Apps Script → Project Settings → Script Properties**. Never store them in cells or commit them.

| Property | Purpose |
|---|---|
| `WEBHOOK_SECRET` | Shared secret required in TradingView JSON payloads |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token |
| `TELEGRAM_CHAT_ID` | Destination chat/user/channel ID |
| `PUSHOVER_APP_TOKEN` | Pushover application token |
| `PUSHOVER_USER_KEY` | Pushover user/group key |
| `ALERT_EMAIL` | Email fallback when no push channel is configured |
| `OPENAI_API_KEY` | Optional evidence-interpretation API key |
| `OPENAI_MODEL` | Optional model override; defaults to `gpt-5.5` |
| `AI_DAILY_ENABLED` | Set to `true` to include AI summaries in the daily push briefing |

The AI layer has a deterministic fallback, uses only the score evidence supplied to it, and logs both its input and output. Run `generateAIInterpretations()` to refresh all instruments. The model ID is configurable so it can be changed without editing code.

## TradingView payload

```json
{
  "secret": "YOUR_SHARED_SECRET",
  "eventId": "{{ticker}}-{{time}}-trend",
  "instrument": "XAGUSD",
  "factor": "TREND",
  "normalizedSignal": -0.65,
  "rawValue": "below weekly acceptance",
  "price": "{{close}}",
  "source": "TradingView"
}
```

`normalizedSignal` must be between -1 and +1. Repeated `eventId` values are treated as duplicates.

## Dashboard

```bash
python -m pip install -r requirements.txt
streamlit run app.py
```

The app supports bundled demo mode, uploaded workbook mode, and optional private live Google Sheets mode. It prefers v5 `Instrument_Scores`, `AI_Interpretations`, and `Score_History`, but automatically adapts the bundled v4.7 workbook.

## Verification

```bash
python -m compileall app.py
node --test tests/scoring.test.mjs
python -m pytest -q
python tools/validate_workbook.py data/Market_Machine_Dashboard_v4_7_BriefingEngine.xlsx
```

See [MIGRATION.md](docs/MIGRATION.md) for the compatibility-first rollout.
