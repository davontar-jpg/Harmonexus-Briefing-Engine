import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const library = JSON.parse(fs.readFileSync("data/research/harmonexus_research_library.normalized.json", "utf8"));
const expectedInstruments = [
  "XAGUSD","GOLD","COPPER","PLATINUM","US30","SPX500","NAS100","RUSSELL2000",
  "DXY","EURUSD","GBPUSD","GBPJPY","EURJPY","USDJPY","USDDKK","US2Y","US5Y","US10Y","US30Y"
];

test("research library imports every active Harmonexus instrument", () => {
  const imported = new Set(library.instrument_map.filter(row => row.supported).map(row => row.engine_instrument));
  assert.deepEqual(expectedInstruments.filter(id => !imported.has(id)), []);
  assert.equal(imported.size, expectedInstruments.length);
});

test("research library preserves unsupported symbols instead of blending them", () => {
  assert.ok(library.unsupported_symbols.includes("INDEX_BTCUSD, 60(1)"));
  assert.ok(library.unsupported_symbols.includes("MCX_CRUDEOIL1!, 60(2)"));
  assert.ok(library.unsupported_symbols.includes("TVC_VIX"));
  assert.equal(library.instrument_map.some(row => row.research_symbol === "INDEX_BTCUSD, 60(1)" && row.supported), false);
});

test("research lookup tables have no duplicate records", () => {
  for (const key of ["instrument_map","seasonal_database","session_database","hourly_database","probability_tables","top_discoveries","timing_windows"]) {
    const rows = library[key];
    const seen = new Set(rows.map(row => JSON.stringify(row)));
    assert.equal(seen.size, rows.length, `${key} contains duplicate records`);
  }
});

test("research hard rules keep historical context subordinate to live data", () => {
  assert.equal(library.hard_rules.never_override_live_market_data, true);
  assert.equal(library.hard_rules.historical_tendencies_adjust_confidence_not_direction, true);
  assert.equal(library.hard_rules.missing_data_behavior, "UNKNOWN_NOT_ZERO");
  assert.ok(library.probability_tables.every(row => row.override_live_market_data === false));
});

test("research context adjusts confidence without changing live direction or strength", () => {
  const context = vm.createContext({console});
  vm.runInContext(fs.readFileSync("src/00_Config.gs", "utf8"), context);
  vm.runInContext(fs.readFileSync("src/08_ResearchLibrary.gs", "utf8"), context);
  vm.runInContext(`function hxClamp_(v,min,max){return Math.max(min,Math.min(max,Number(v)||0));}
    function hxJson_(v){return JSON.stringify(v);}
    const mockRows = {
      Research_Metadata:[{"Key":"Package Version","Value":RESEARCH_LIBRARY.package_version}],
      Research_Seasonal:[{"Instrument":"GOLD","Supported":true,"Best Month":1,"Best Month Name":"January","Worst Month":6,"Worst Month Name":"June","Research Confidence":"Moderate","Reversal After 3 Probability":"","Weekly First Day Continuation Probability":""}],
      Research_Session:[],
      Research_Hourly:[]
    };
    function hxRowsAsObjects_(sh){return mockRows[sh.name] || [];}
    const SpreadsheetApp = {getActive(){return {getSheetByName(name){return {name:name,getLastRow(){return (mockRows[name]||[]).length+1;}};}};}};
    function hxReliability_(confidence){return {label:confidence>=50?'Developing':'Provisional',status:confidence>=50?'WEAK':'PROVISIONAL'};}
  `, context);
  vm.runInContext(fs.readFileSync("src/09_ResearchIntegration.gs", "utf8"), context);
  const apply = vm.runInContext("hxApplyResearchContext_", context);
  const score = {instrument:"GOLD", label:"Bearish", strength:6.8, confidence:60, coverage:.8, strongestDrivers:[{factor:"DXY"}], contradictions:[], explanationTrace:{}};
  apply(score, new Date("2026-01-15T12:00:00Z"));
  assert.equal(score.label, "Bearish");
  assert.equal(score.strength, 6.8);
  assert.ok(score.confidence < 60, "opposing researched seasonality should reduce confidence only");
  assert.ok(score.contradictions.some(row => row.factor === "Seasonality"));
});
