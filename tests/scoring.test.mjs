import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const context = vm.createContext({console});
vm.runInContext(fs.readFileSync("src/00_Config.gs", "utf8"), context);
vm.runInContext("function hxClamp_(v,min,max){return Math.max(min,Math.min(max,Number(v)||0));} function hxNowIso_(){return '2026-01-01T00:00:00.000Z';}", context);
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
