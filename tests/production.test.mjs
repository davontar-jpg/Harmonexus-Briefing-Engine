import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const context = vm.createContext({console});
vm.runInContext(fs.readFileSync("src/00_Config.gs", "utf8"), context);
vm.runInContext("function hxClamp_(v,min,max){return Math.max(min,Math.min(max,Number(v)||0));} function hxNum_(v){const n=Number(v);return v===null||v===''||!isFinite(n)?null:n;} function hxNowIso_(){return '2026-01-01T00:00:00.000Z';} function safeJsonCell_(v,f){try{return typeof v==='string'?JSON.parse(v):(v||f);}catch(e){return f;}}", context);
vm.runInContext(fs.readFileSync("src/01_Utils.gs", "utf8"), context);
vm.runInContext(fs.readFileSync("src/02_DataFeeds.gs", "utf8"), context);
vm.runInContext(fs.readFileSync("src/05_Notifications.gs", "utf8"), context);
vm.runInContext(fs.readFileSync("src/06_Webhooks_Triggers.gs", "utf8"), context);
vm.runInContext(fs.readFileSync("src/07_Setup.gs", "utf8"), context);

const get = name => vm.runInContext(name, context);

test("signal labels normalize deterministically", () => {
  assert.equal(get("hxLabelSignal_")("Strong Bullish"), 1);
  assert.equal(get("hxLabelSignal_")("Moderate Bearish"), -.65);
  assert.equal(get("hxLabelSignal_")("Neutral"), 0);
});

test("numeric changes clamp to the normalized range", () => {
  assert.equal(get("hxNormalizeChange_")(25, 10), 1);
  assert.equal(get("hxNormalizeChange_")(-5, 10), -.5);
  assert.equal(get("hxNormalizeChange_")(3, 0), 0);
});

test("signal source precedence is deterministic and exposes contradictions", () => {
  const select = get("hxSelectSignalCandidates_");
  const result = select([
    {priority:100,asOf:new Date("2026-01-02"),signal:1,source:"legacy"},
    {priority:400,asOf:new Date("2026-01-01"),signal:-.5,source:"webhook"}
  ]);
  assert.equal(result.chosen.source, "webhook");
  assert.equal(result.contradiction, true);
});

test("webhook validation rejects bad instruments and out-of-range signals", () => {
  assert.equal(get("hxValidateWebhookPayload_")({instrument:"XAGUSD",factor:"TREND",normalizedSignal:.4}).ok, true);
  assert.equal(get("hxValidateWebhookPayload_")({instrument:"NOPE",factor:"TREND",normalizedSignal:.4}).ok, false);
  assert.equal(get("hxValidateWebhookPayload_")({instrument:"XAGUSD",factor:"TREND",normalizedSignal:4}).ok, false);
});

test("webhook duplicate detection is exact and string-safe", () => {
  assert.equal(get("hxIsDuplicateEvent_")(["event-1", 22], "event-1"), true);
  assert.equal(get("hxIsDuplicateEvent_")(["event-1", 22], "22"), true);
  assert.equal(get("hxIsDuplicateEvent_")(["event-1"], "event-2"), false);
});

test("webhook authorization fails closed", () => {
  const authorize = get("hxAuthorizeWebhook_");
  assert.equal(authorize("", "anything").ok, false);
  assert.equal(authorize("secret", "wrong").error, "unauthorized");
  assert.equal(authorize("secret", "secret").ok, true);
});

test("notification payloads contain only the required delivery fields", () => {
  assert.deepEqual(JSON.parse(JSON.stringify(get("hxTelegramPayload_")("42", "hello"))), {chat_id:"42",text:"hello",disable_web_page_preview:true});
  assert.deepEqual(JSON.parse(JSON.stringify(get("hxPushoverPayload_")("token", "user", "hello"))), {token:"token",user:"user",title:"Harmonexus",message:"hello"});
});

test("errors redact configured secrets and credential-bearing URLs", () => {
  const redact = get("hxRedactSecrets_");
  const message = redact("HTTP 400 from https://api.telegram.org/botprivate-token/sendMessage?secret=webhook-secret", ["private-token", "webhook-secret"]);
  assert.equal(message.includes("private-token"), false);
  assert.equal(message.includes("webhook-secret"), false);
  assert.equal(message.includes("[REDACTED]"), true);
});

test("production configuration requires a webhook secret and one push channel", () => {
  const missing = get("validatePropertyMap_")({});
  assert.equal(missing.ready, false);
  assert.equal(get("validatePropertyMap_")({WEBHOOK_SECRET:"x",TELEGRAM_BOT_TOKEN:"t",TELEGRAM_CHAT_ID:"c"}).ready, true);
});

test("daily briefing follows the institutional operator format", () => {
  const briefing = get("hxBuildDailyBriefing_")([
    {Instrument:"XAGUSD",Family:"metal",Direction:"Bearish",Strength:6.2,Confidence:82,"Directional Score":-5.1,Reliability:"Reliable","Strongest Drivers":JSON.stringify([{factor:"DXY",contribution:-.4}]),Contradictions:"[]","Score Change":-1.7,"Material Change":true,Regime:"Bearish","Regime Age (Trading Days)":14,"Primary Drivers":JSON.stringify([{factor:"TREND",delta:-.4},{factor:"RISK",delta:-.2}]),"Seasonal Watch":JSON.stringify({title:"XAGUSD is in a historical weekly high timing window.",detail:"63% of comparable bearish weeks formed the weekly high on Monday.",status:"WATCH",limitedSample:false})},
    {Instrument:"SPX500",Family:"equity",Direction:"Bearish",Strength:5.4,Confidence:78,"Directional Score":-3.2,Reliability:"Reliable","Strongest Drivers":JSON.stringify([{factor:"RISK",contribution:-.3}]),Contradictions:"[]","Score Change":-.4,"Material Change":false},
    {Instrument:"DXY",Family:"fx-index",Direction:"Bullish",Strength:6.0,Confidence:80,"Directional Score":4.8,Reliability:"Reliable","Strongest Drivers":JSON.stringify([{factor:"US2Y",contribution:.25}]),Contradictions:"[]","Score Change":.2,"Material Change":false}
  ]);
  for (const heading of ["MARKET REGIME:","KEY DRIVERS:","CONTRADICTIONS:","MATERIAL CHANGE:","PRIORITY INSTRUMENTS:","WATCH CONDITIONS:"]) assert.ok(briefing.includes(heading));
  assert.ok(briefing.includes("Age: 14 trading days"));
  assert.ok(briefing.includes("Primary Drivers:"));
  assert.ok(briefing.includes("Trend deterioration"));
  assert.ok(briefing.includes("SEASONAL WATCH"));
  assert.ok(briefing.endsWith("Decision support only. No trade execution."));
});

test("Telegram test sends the production daily briefing format", () => {
  vm.runInContext(`
    var capturedTelegramMessage = '';
    hxSendTelegram_ = function(message) { capturedTelegramMessage = message; };
    hxLatestScoreRows_ = function() { return [{
      Instrument:'GOLD', Family:'metal', Direction:'Bearish', Strength:6.8,
      Confidence:41, 'Directional Score':-4.5, Reliability:'Provisional',
      'Strongest Drivers':'[]', Contradictions:'[]', 'Score Change':0,
      'Material Change':false, Regime:'Bearish', 'Regime Age (Trading Days)':41,
      'Primary Drivers':'[]', 'Seasonal Watch':''
    }]; };
  `, context);
  assert.equal(get("testTelegramNotification")(), "Telegram daily-format test sent.");
  const message = get("capturedTelegramMessage");
  assert.ok(message.startsWith("HARMONEXUS PRODUCTION FORMAT TEST"));
  assert.ok(message.includes("Age: 41 trading days"));
  assert.ok(message.includes("Decision support only. No trade execution."));
  assert.equal(message.includes("SEASONAL WATCH"), false);
});

test("dashboard cards use a true same-size flip interaction", () => {
  const app = fs.readFileSync("app.py", "utf8");
  assert.ok(app.includes("flip-toggle:checked+.flip-card-inner{transform:rotateY(180deg)"));
  assert.ok(app.includes("backface-visibility:hidden"));
  assert.ok(app.includes("transform-style:preserve-3d"));
  assert.ok(app.includes(".card-back{transform:rotateY(180deg) translateZ(.1px)"));
  assert.ok(app.includes(".card-back{padding:11px 14px 9px}"));
  assert.ok(app.includes("CONTEXT ALIGNMENT"));
  assert.ok(app.includes("Age: {regime_age} trading days"));
});
