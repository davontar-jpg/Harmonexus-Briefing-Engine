import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const context = vm.createContext({console});
vm.runInContext(fs.readFileSync("src/00_Config.gs", "utf8"), context);
vm.runInContext("function hxClamp_(v,min,max){return Math.max(min,Math.min(max,Number(v)||0));} function hxNum_(v){const n=Number(v);return v===null||v===''||!isFinite(n)?null:n;} function hxNowIso_(){return '2026-01-01T00:00:00.000Z';}", context);
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
