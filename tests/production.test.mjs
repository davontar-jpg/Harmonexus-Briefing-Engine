import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const context = vm.createContext({console});
vm.runInContext(fs.readFileSync("src/00_Config.gs", "utf8"), context);
vm.runInContext("function hxClamp_(v,min,max){return Math.max(min,Math.min(max,Number(v)||0));} function hxNum_(v){const n=Number(v);return v===null||v===''||!isFinite(n)?null:n;} function hxNowIso_(){return '2026-01-01T00:00:00.000Z';} function safeJsonCell_(v,f){try{return typeof v==='string'?JSON.parse(v):(v||f);}catch(e){return f;}}", context);
vm.runInContext(fs.readFileSync("src/01_Utils.gs", "utf8"), context);
vm.runInContext(fs.readFileSync("src/02_DataFeeds.gs", "utf8"), context);
vm.runInContext(fs.readFileSync("src/10_RelationshipEngines.gs", "utf8"), context);
vm.runInContext(fs.readFileSync("src/11_MarketCalendarWatch.gs", "utf8"), context);
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

test("recipient parser handles comma-separated emails and ignores blanks", () => {
  const recipients = JSON.parse(JSON.stringify(get("hxParseEmailRecipients_")(" alpha@example.com, , [beta@example.com](mailto:beta@example.com), invalid, sms.gateway@example.net ")));
  assert.deepEqual(recipients, ["alpha@example.com","beta@example.com","sms.gateway@example.net"]);
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
    {Instrument:"DXY",Family:"fx-index",Direction:"Bullish",Strength:6.0,Confidence:80,"Directional Score":4.8,Reliability:"Reliable","Strongest Drivers":JSON.stringify([{factor:"US2Y",contribution:.25}]),Contradictions:"[]","Score Change":.2,"Material Change":false},
    {Instrument:"US10Y",Family:"rate",Direction:"Bullish",Strength:6.4,Confidence:79,"Directional Score":4.1,Reliability:"Reliable","Strongest Drivers":JSON.stringify([{factor:"REAL10Y",contribution:.22,confidence:79}]),Contradictions:"[]","Score Change":.1,"Material Change":false}
  ]);
  for (const heading of ["HARMONEXUS","Chief Investment Officer Robinson's","Morning Market Brief","MARKET REGIME","CROSS-ASSET CONSENSUS","CONSENSUS STRENGTH","PRIMARY MARKET DRIVER","CAPITAL ROTATION WATCH","CONVICTION METER","MACRO INTERPRETATION","KEY DRIVERS:","CONTRADICTIONS:","MATERIAL CHANGE:","PRIORITY INSTRUMENTS","Macro Consensus","Consensus Score:","Lead-Lag Watch","MARKET CALENDAR WATCH","WATCH CONDITIONS:"]) assert.ok(briefing.includes(heading));
  assert.match(briefing, /Risk Appetite: (Extreme Risk-Off|Risk-Off|Neutral|Risk-On|Strong Risk-On) \d+\.\d\/10/);
  assert.ok(briefing.includes("Overall Agreement:"));
  assert.ok(briefing.includes("PRIMARY MARKET DRIVER"));
  assert.ok(briefing.includes("Current Rotation:"));
  assert.ok(briefing.includes("Age: 14 trading days"));
  assert.ok(briefing.includes("Primary Drivers:"));
  assert.ok(briefing.includes("Trend deterioration"));
  assert.ok(briefing.includes("SEASONAL WATCH"));
  assert.ok(briefing.includes("DXY contradicts precious metals.") || briefing.includes("DXY confirms precious metals."));
  assert.ok(briefing.includes("Lead-Lag Watch: unavailable") || briefing.includes("Current Leaders:"));
  assert.ok(briefing.includes("Market Rhythm Risk:"));
  assert.ok(briefing.includes("Operator Guidance:"));
  assert.equal(/\b(buy|sell|entry|exit)\b/i.test(briefing), false);
  assert.ok(briefing.endsWith("Decision support only. No trade execution."));
});

test("market calendar watch detects observed July holiday with adjusted NFP", () => {
  const watch = JSON.parse(JSON.stringify(get("hxMarketCalendarWatch_")(new Date(2026, 6, 2))));
  assert.equal(watch.week_structure, "FOUR_DAY_WEEK");
  assert.ok(watch.calendar_conditions.some(x => x.includes("observed Independence Day")));
  assert.ok(watch.major_catalysts.some(x => x.includes("NFP")));
  assert.ok(watch.market_rhythm_risk >= 8);
});

test("Telegram test sends the production daily briefing format", () => {
  vm.runInContext(`
    var capturedTelegramMessage = '';
    var sendNotificationCalls = 0;
    hxNotificationRecipients_ = function() { return {telegramToken:'token',telegram:['42'],pushoverToken:'',pushover:[],email:[]}; };
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

test("production briefing and tests use the unified notification path", () => {
  vm.runInContext(`
    var unifiedCalls = [];
    var realSendNotification = sendNotification;
    hxLatestScoreRows_ = function() { return [{
      Instrument:'GOLD', Family:'metal', Direction:'Bearish', Strength:6.8,
      Confidence:41, 'Directional Score':-4.5, Reliability:'Provisional',
      'Strongest Drivers':'[]', Contradictions:'[]', 'Score Change':0,
      'Material Change':false, Regime:'Bearish', 'Regime Age (Trading Days)':41,
      'Primary Drivers':'[]', 'Seasonal Watch':''
    }]; };
    sendNotification = function(message, options) { unifiedCalls.push({message:message, options:options}); return ['unified']; };
  `, context);
  assert.deepEqual(JSON.parse(JSON.stringify(get("sendDailyBriefing")())), ["unified"]);
  assert.equal(get("testEmailNotification")(), "Email test sent.");
  const calls = JSON.parse(JSON.stringify(get("unifiedCalls")));
  assert.equal(calls.length, 2);
  assert.equal(calls[0].options.alertType, "Daily Briefing");
  assert.equal(calls[1].options.alertType, "Email Test");
  vm.runInContext(`sendNotification = realSendNotification;`, context);
});

test("notification parity check validates test and production dry-run channels without state mutation", () => {
  vm.runInContext(`
    var paritySent = [];
    var parityLogRows = 12;
    var realPropsForParity = hxProps_;
    var realRecipientsForParity = hxNotificationRecipients_;
    var realTelegramForParity = hxSendTelegram_;
    var realEmailForParity = hxSendEmail_;
    var realSnapshotForParity = hxNotificationStateSnapshot_;
    hxProps_ = function() { return {getProperty:function(key){ return ({TELEGRAM_BOT_TOKEN:'token', TELEGRAM_CHAT_ID:'123456789', ALERT_EMAIL:'ops@example.com'})[key] || ''; }}; };
    hxNotificationRecipients_ = function() { return {telegramToken:'token',telegram:['123456789'],pushoverToken:'',pushover:[],email:['ops@example.com']}; };
    hxSendTelegram_ = function(message, chatId) { paritySent.push({provider:'Telegram',recipient:chatId,message:message}); };
    hxSendEmail_ = function(message, alertType, email) { paritySent.push({provider:'Email',recipient:email,message:message,alertType:alertType}); };
    hxNotificationStateSnapshot_ = function() { return {notificationRows:parityLogRows}; };
  `, context);
  const result = JSON.parse(JSON.stringify(get("runNotificationParityCheck")()));
  assert.equal(result.testTelegram, "PASS");
  assert.equal(result.testEmail, "PASS");
  assert.equal(result.productionTelegramDryRun, "PASS");
  assert.equal(result.productionEmailDryRun, "PASS");
  assert.equal(result.formatterParity, "PASS");
  assert.equal(result.stateMutationSuppressed, "PASS");
  const sent = JSON.parse(JSON.stringify(get("paritySent")));
  assert.equal(sent.length, 2);
  assert.ok(sent.some(x => x.provider === "Telegram" && x.message.includes("[HMIE TEST NOTIFICATION PATH]")));
  assert.equal(result.productionResults.length, 1);
  assert.equal(result.productionResults[0].provider, "DeliverySuppressed");
  assert.ok(sent.every(x => x.message.includes("MARKET CALENDAR WATCH")));
  vm.runInContext(`hxProps_ = realPropsForParity; hxNotificationRecipients_ = realRecipientsForParity; hxSendTelegram_ = realTelegramForParity; hxSendEmail_ = realEmailForParity; hxNotificationStateSnapshot_ = realSnapshotForParity;`, context);
});

test("notification parity config reports missing credentials clearly", () => {
  vm.runInContext(`
    var realPropsForMissingConfig = hxProps_;
    var realRecipientsForMissingConfig = hxNotificationRecipients_;
    hxProps_ = function() { return {getProperty:function(){ return ''; }}; };
    hxNotificationRecipients_ = function() { return {telegramToken:'',telegram:[],pushoverToken:'',pushover:[],email:[]}; };
  `, context);
  const config = JSON.parse(JSON.stringify(get("validateNotificationConfig")()));
  assert.equal(config.telegramBotToken, "FAIL");
  assert.equal(config.telegramChatId, "FAIL");
  assert.equal(config.emailRecipient, "FAIL");
  vm.runInContext(`hxProps_ = realPropsForMissingConfig; hxNotificationRecipients_ = realRecipientsForMissingConfig;`, context);
});

test("production dry-run returns detailed delivery without notification-log mutation", () => {
  vm.runInContext(`
    var dryRunSent = [];
    var realRecipientsForDryRun = hxNotificationRecipients_;
    var realTelegramForDryRun = hxSendTelegram_;
    var realEmailForDryRun = hxSendEmail_;
    hxNotificationRecipients_ = function() { return {telegramToken:'token',telegram:['42'],pushoverToken:'',pushover:[],email:['dry@example.com']}; };
    hxSendTelegram_ = function(message, chatId) { dryRunSent.push({provider:'Telegram',recipient:chatId}); };
    hxSendEmail_ = function(message, alertType, email) { dryRunSent.push({provider:'Email',recipient:email}); };
  `, context);
  const results = JSON.parse(JSON.stringify(get("sendProductionBriefingNotification")({briefingText:"sample dry run", dryRun:true, validationMode:true, suppressStateMutation:true, returnDetailed:true})));
  assert.equal(results.length, 1);
  assert.ok(results.every(r => r.ok));
  assert.equal(results[0].provider, "DeliverySuppressed");
  assert.deepEqual(JSON.parse(JSON.stringify(get("dryRunSent"))), []);
  vm.runInContext(`hxNotificationRecipients_ = realRecipientsForDryRun; hxSendTelegram_ = realTelegramForDryRun; hxSendEmail_ = realEmailForDryRun;`, context);
});

test("one failed email recipient does not prevent sending to the second", () => {
  vm.runInContext(`
    var attemptedEmails = [];
    hxNotificationRecipients_ = function() { return {telegramToken:'',telegram:[],pushoverToken:'',pushover:[],email:['bad@example.com','good@example.com']}; };
    hxSendEmail_ = function(message, alertType, email) { attemptedEmails.push(email); if (email === 'bad@example.com') throw new Error('SMTP failure'); };
  `, context);
  const result = JSON.parse(JSON.stringify(get("sendNotification")("body", {alertType:"Test", instrument:"ALL"})));
  assert.deepEqual(JSON.parse(JSON.stringify(get("attemptedEmails"))), ["bad@example.com","good@example.com"]);
  assert.ok(result.some(x => x.includes("failed")));
  assert.ok(result.some(x => x.includes("sent")));
});

test("missing relationship data adds unavailable lines without breaking briefing", () => {
  vm.runInContext(`
    hxRelationshipIntelligence_ = function() { throw new Error('relationship source offline'); };
  `, context);
  const briefing = get("hxBuildDailyBriefing_")([
    {Instrument:"GOLD",Family:"metal",Direction:"Neutral",Strength:1.0,Confidence:10,"Directional Score":0,Reliability:"Insufficient","Strongest Drivers":"[]",Contradictions:"[]","Score Change":0,"Material Change":false}
  ]);
  assert.ok(briefing.includes("Cross-Asset Consensus: unavailable"));
  assert.ok(briefing.includes("Lead-Lag Watch: unavailable"));
  assert.ok(briefing.includes("Decision support only. No trade execution."));
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
