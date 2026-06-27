import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const context = vm.createContext({console});
vm.runInContext(fs.readFileSync("src/00_Config.gs", "utf8"), context);
vm.runInContext(fs.readFileSync("src/01_Utils.gs", "utf8"), context);
vm.runInContext(fs.readFileSync("src/10_RelationshipEngines.gs", "utf8"), context);

const get = name => vm.runInContext(name, context);

test("macro consensus confirms aligned cross-asset relationships without setting direction", () => {
  const macro = get("hxMacroConsensusEngine_")([
    {instrument:"DXY", score:-5.0, confidence:84},
    {instrument:"GOLD", score:5.8, confidence:80},
    {instrument:"XAGUSD", score:5.2, confidence:78},
    {instrument:"US10Y", score:-4.1, confidence:76},
    {instrument:"US5Y", score:-3.8, confidence:72},
    {instrument:"SPX500", score:3.4, confidence:70},
    {instrument:"NAS100", score:3.7, confidence:72},
    {instrument:"COPPER", score:3.1, confidence:68},
    {instrument:"EURUSD", score:2.9, confidence:66}
  ]);
  assert.ok(macro.score >= 70);
  assert.ok(["High","Very High"].includes(macro.confidence));
  assert.ok(macro.confirmations.length >= 3);
  assert.equal(Object.hasOwn(macro, "direction"), false);
});

test("macro consensus treats missing relationship inputs as unknown, not zero", () => {
  const macro = get("hxMacroConsensusEngine_")([
    {instrument:"DXY", score:-5.0, confidence:84},
    {instrument:"GOLD", score:5.8, confidence:80}
  ]);
  assert.ok(macro.unknown > 0);
  assert.ok(macro.evaluated > 0);
  assert.notEqual(macro.score, 0);
});

test("lead-lag engine ignores insufficient history", () => {
  const leadLag = get("hxLeadLagWatch_")([{instrument:"DXY", score:4, confidence:80}], []);
  assert.equal(leadLag.confidence, "Very Low");
  assert.equal(leadLag.currentLeaders.length, 0);
  assert.equal(leadLag.supportedCount, 0);
});

test("lead-lag engine detects statistically supported lagged relationships", () => {
  const rows = [];
  const start = new Date("2026-01-01T00:00:00Z");
  for (let i=0; i<80; i++) {
    const d = new Date(start.getTime() + i * 86400000).toISOString();
    const leader = Math.sin(i / 5) * 5;
    const follower = i >= 2 ? Math.sin((i - 2) / 5) * 5 : 0;
    rows.push({"As Of":d, Instrument:"DXY", "Directional Score":leader});
    rows.push({"As Of":d, Instrument:"XAGUSD", "Directional Score":follower});
  }
  const relationships = get("hxLeadLagRelationships_")(rows);
  assert.ok(relationships.some(r => r.leader === "DXY" && r.follower === "XAGUSD" && r.lagDays === 2));
});
