# TradingView webhook setup

## Web App URL

After deploying the backup Sheet’s Apps Script as a Web App, copy the URL ending in `/exec`. Paste that URL into TradingView’s **Webhook URL** field. Do not paste it into the JSON message body.

## Alert message

Copy `examples/tradingview-generic.json` into TradingView’s Message field and replace:

- `PASTE_WEBHOOK_SECRET` with the Script Property value
- `INSTRUMENT_ID` with a Harmonexus registry ID, for example `XAGUSD`
- `FACTOR_NAME` with a factor used by that instrument, for example `TREND`, `DXY`, or `RISK`
- `normalizedSignal` with a deterministic value from `-1` to `+1`

Example:

```json
{
  "secret": "YOUR_LONG_RANDOM_SECRET",
  "eventId": "XAGUSD-{{time}}-trend",
  "instrument": "XAGUSD",
  "factor": "TREND",
  "normalizedSignal": -0.65,
  "rawValue": "weekly acceptance failed",
  "price": "{{close}}",
  "source": "TradingView"
}
```

## Production tests

1. **Valid:** Send the exact configured secret and a signal between -1 and +1. Expect `{ "ok": true }` and a new `Webhook_Log` row.
2. **Duplicate:** Resend the same `eventId`. Expect `{ "ok": true, "duplicate": true }` and no second event row.
3. **Invalid secret:** Change one character in `secret`. Expect `{ "ok": false, "error": "unauthorized" }` and no signal ingestion.
4. **Invalid payload:** Send an unknown instrument or a signal outside -1..+1. Expect an error response and no ingestion.

Apps Script ContentService responses generally return HTTP 200 even when the JSON body reports an application error; TradingView and monitoring should inspect the JSON body and `System_Log`, not only the HTTP status.

Never expose the secret in screenshots or a public Pine script.
