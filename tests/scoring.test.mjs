import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const context = vm.createContext({console});
vm.runInContext(fs.readFileSync("src/00_Config.gs", "utf8"), context);
vm.runInContext("function hxClamp_(v,min,max){return Math.max(min,Math.min(max,Number(v)||0));} function hxNowIso_(){return '2026-01-01T00:00:00.000Z';} function hxParseDate_(v){const d=v instanceof Date?v:new Date(v);return isNaN(d.getTime())?null:d;}", context);
vm.runInContext(fs.readFileSync("src/03_Scoring.gs", "utf8"), context);
const calculate = vm.runInContext("calculateInstrumentScore", context);

test("strong aligned silver evidence is bullish and high strength", () => {
  const score = calculate("XAGUSD", {DXY:-1, REAL10Y:-1, POSITIONING:1, COMMERCIAL:1, OI:1});
  assert.equal(score.label, "Bullish");
  assert.ok(score.strength >= 9.5);
  assert.equal(score.confidence, 100);
});

test("missing evidence reduces confidence instead of becoming neutral", () => {
  const score = calculate("XAGUSD", {DXY:-1});
  assert.equal(score.label, "Bullish");
  assert.equal(score.confidence, 20);
});

test("opposing contributions are surfaced as contradictions", () => {
  const score = calculate("XAGUSD", {DXY:1, REAL10Y:1, POSITIONING:1, COMMERCIAL:1, OI:1});
  assert.ok(score.contradictions.length > 0);
});

test("direction flip is material", () => {
  const score = calculate("SPX500", {DXY:1, REAL10Y:1, POSITIONING:-1, COMMERCIAL:-1, OI:-1, RISK:-1}, {label:"Bullish",strength:7,confidence:100});
  assert.equal(score.label, "Bearish");
  assert.equal(score.materialChange, true);
});

test("extreme score is capped when factor confidence is insufficient", () => {
  const low = {signal:1, confidence:10};
  const score = calculate("GBPJPY", {US2Y:low, POSITIONING:low, COMMERCIAL:low, RISK:low, TREND:low});
  assert.equal(score.rawStrength, 10);
  assert.ok(score.strength <= 3.9);
  assert.equal(score.reliability, "Insufficient evidence");
  assert.equal(score.evidenceStatus, "INSUFFICIENT EVIDENCE");
});

test("fully observed high-quality evidence receives reliable status", () => {
  const high = {signal:1, confidence:90};
  const score = calculate("GBPJPY", {US2Y:high, POSITIONING:high, COMMERCIAL:high, RISK:high, TREND:high});
  assert.equal(score.reliability, "Reliable");
  assert.equal(score.evidenceStatus, "STRONG");
  assert.equal(score.strength, 10);
});

test("regime age counts distinct trading-date rows and excludes weekends", () => {
  const age = vm.runInContext("hxRegimeAgeTradingDays_", context)("GOLD", "Bearish", [
    {Instrument:"GOLD",Direction:"Bearish","As Of":"2026-06-21T12:00:00Z"},
    {Instrument:"GOLD",Direction:"Bearish","As Of":"2026-06-19T20:00:00Z"},
    {Instrument:"GOLD",Direction:"Bearish","As Of":"2026-06-18T20:00:00Z"},
    {Instrument:"GOLD",Direction:"Bullish","As Of":"2026-06-17T20:00:00Z"}
  ], "2026-06-22T20:00:00Z");
  assert.equal(age, 3);
});

test("primary drivers are measured contribution changes, not guesses", () => {
  const drivers = vm.runInContext("hxPrimaryDriverChanges_", context)([
    {factor:"TREND",contribution:-.30,confidence:80},
    {factor:"RISK",contribution:-.20,confidence:70},
    {factor:"DXY",contribution:.05,confidence:80}
  ], [
    {factor:"TREND",contribution:.15},
    {factor:"RISK",contribution:.10},
    {factor:"DXY",contribution:.04}
  ]);
  assert.deepEqual(Array.from(drivers, d=>d.factor), ["TREND","RISK"]);
  assert.equal(drivers[0].delta, -.45);
});

test("seasonal watch appears only for a supported active timing event", () => {
  const evaluate = vm.runInContext("hxEvaluateSeasonalWatch_", context);
  const score = {instrument:"XAGUSD",label:"Bearish",regime:"Bearish",directionScore:-4,regimeAgeTradingDays:12,materialChange:false,explanationTrace:{factorContributions:[]}};
  const timing = [{Asset:"XAGUSD","Machine State":"Bearish","Weekly High Window":"Monday (62.9%) | Sun–Tue high 65.9%","Weekly Low Window":"Friday (39.0%)","Sample Size":"82 weeks"}];
  const active = evaluate(score, [], timing, new Date("2026-06-22T12:00:00Z"));
  const inactive = evaluate(score, [], timing, new Date("2026-06-23T12:00:00Z"));
  assert.equal(active.status, "WATCH");
  assert.equal(active.sampleSize, 82);
  assert.equal(inactive, null);
});
