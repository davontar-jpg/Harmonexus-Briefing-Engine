import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";


const appendedRows = [];
const context = vm.createContext({
  console,
  ContentService: {
    MimeType: {JSON: "application/json"},
    createTextOutput(content) {
      return {content, getContent() { return this.content; }, setMimeType() { return this; }};
    }
  },
  Utilities: {
    DigestAlgorithm: {SHA_256: "SHA_256"},
    base64EncodeWebSafe() { return "synthetic-digest"; },
    computeDigest() { return [1, 2, 3]; },
    getUuid() { return "synthetic-uuid"; }
  }
});

for (const source of ["src/00_Config.gs", "src/01_Utils.gs", "src/02_DataFeeds.gs", "src/06_Webhooks_Triggers.gs"]) {
  vm.runInContext(fs.readFileSync(source, "utf8"), context);
}

vm.runInContext(`
  var securityTestExpectedSecret = "configured-webhook-secret-value";
  var securityTestSecondarySecret = "configured-api-token-value";
  hxProps_ = function() {
    return {
      getProperty:function(key) { return key === "WEBHOOK_SECRET" ? securityTestExpectedSecret : ""; },
      getProperties:function() { return {WEBHOOK_SECRET:securityTestExpectedSecret, API_TOKEN:securityTestSecondarySecret}; }
    };
  };
  hxSheet_ = function() {
    return {
      getLastRow:function() { return 1; },
      getRange:function() { return {getDisplayValues:function() { return []; }}; }
    };
  };
`, context);
context.appendedRows = appendedRows;
vm.runInContext("hxAppendRows_ = function(sheet, rows) { appendedRows.push.apply(appendedRows, rows); };", context);

const get = name => vm.runInContext(name, context);


test("authenticated webhook persists only an allowlisted sanitized payload", () => {
  appendedRows.length = 0;
  const secret = get("securityTestExpectedSecret");
  const secondary = get("securityTestSecondarySecret");
  const payload = {
    secret,
    token: "unconfigured-token",
    password: "unconfigured-password",
    api_key: "unconfigured-api-key",
    authorization: "Bearer unconfigured-bearer",
    eventId: `XAGUSD-${secret}`,
    instrument: "XAGUSD",
    factor: "TREND",
    normalizedSignal: -0.65,
    rawValue: `weekly acceptance failed; token=${secondary}`,
    price: "29.75",
    source: "TradingView authorization: Bearer unconfigured-source-token",
    nested: {secret: "nested-secret"}
  };
  const response = JSON.parse(get("doPost")({postData:{contents:JSON.stringify(payload)}, parameter:{}}).getContent());

  assert.equal(response.ok, true);
  assert.equal(appendedRows.length, 1);
  const storedText = appendedRows[0][7];
  const stored = JSON.parse(storedText);
  for (const forbidden of [secret, secondary, "unconfigured-token", "unconfigured-password", "unconfigured-api-key", "unconfigured-bearer", "unconfigured-source-token", "nested-secret"]) {
    assert.equal(storedText.includes(forbidden), false, `persisted forbidden value: ${forbidden}`);
  }
  for (const key of ["secret", "token", "password", "api_key", "authorization", "nested"]) {
    assert.equal(Object.hasOwn(stored, key), false);
  }
  assert.equal(stored.instrument, "XAGUSD");
  assert.equal(stored.factor, "TREND");
  assert.equal(stored.normalizedSignal, -0.65);
  assert.equal(stored.price, "29.75");
  assert.match(stored.rawValue, /\[REDACTED\]/);
});


test("webhook errors redact expected and supplied credential material", () => {
  const expected = get("securityTestExpectedSecret");
  vm.runInContext(`
    var securityTestOriginalValidation = hxValidateWebhookPayload_;
    hxValidateWebhookPayload_ = function() {
      throw new Error("validation failed for configured-webhook-secret-value");
    };
  `, context);
  const response = JSON.parse(get("doPost")({
    postData:{contents:JSON.stringify({secret:expected,instrument:"XAGUSD",factor:"TREND",normalizedSignal:-0.4})},
    parameter:{}
  }).getContent());
  vm.runInContext("hxValidateWebhookPayload_ = securityTestOriginalValidation;", context);

  assert.equal(response.ok, false);
  assert.equal(response.error.includes(expected), false);
  assert.match(response.error, /\[REDACTED\]/);

  const supplied = "supplied-webhook-secret-value";
  const unauthorized = JSON.parse(get("doPost")({
    postData:{contents:JSON.stringify({secret:supplied,instrument:"XAGUSD",factor:"TREND",normalizedSignal:-0.4})},
    parameter:{}
  }).getContent());
  assert.equal(unauthorized.error, "unauthorized");
  assert.equal(unauthorized.error.includes(supplied), false);
});


test("raw webhook JSON cannot become a calculated signal raw value", () => {
  const captured = [];
  context.securitySignalRows = [{
    Instrument:"XAGUSD", Factor:"TREND", "Normalized Signal":-0.4, Price:"29.75",
    Source:"TradingView", Timestamp:new Date().toISOString(), "Raw Payload":"{\"secret\":\"must-not-propagate\"}", "Event ID":"event-1"
  }];
  context.securitySignalAdd = (...args) => captured.push(args);
  vm.runInContext(`
    var securityOriginalRowsAsObjects = hxRowsAsObjects_;
    hxRowsAsObjects_ = function() { return securitySignalRows; };
    hxWebhookSignalCandidates_({getSheetByName:function(){ return {}; }}, securitySignalAdd);
    hxRowsAsObjects_ = securityOriginalRowsAsObjects;
  `, context);

  assert.equal(captured.length, 1);
  assert.equal(captured[0][2], 29.75);
  assert.equal(String(captured[0][2]).includes("must-not-propagate"), false);
});


test("webhook validation and synthetic self-test behavior remain operational", () => {
  assert.equal(get("hxValidateWebhookPayload_")({instrument:"XAGUSD", factor:"TREND", normalizedSignal:0.3}).ok, true);
  assert.equal(get("hxValidateWebhookPayload_")({instrument:"NOPE", factor:"TREND", normalizedSignal:0.3}).ok, false);
  const result = JSON.parse(JSON.stringify(get("runWebhookSelfTest")()));
  assert.equal(result.valid, true);
  assert.equal(result.authorization, true);
  assert.equal(result.secretExcluded, true);
});


test("research builder requires explicit configuration and has no personal absolute fallback", () => {
  const source = fs.readFileSync("tools/build-research-library.mjs", "utf8");
  assert.match(source, /process\.env\.HARMONEXUS_RESEARCH_SOURCE_DIR/);
  assert.match(source, /HARMONEXUS_RESEARCH_SOURCE_DIR is required/);
  assert.equal(/[A-Za-z]:[\\/](?:Users|Documents|OneDrive)[\\/]/i.test(source), false);
});
