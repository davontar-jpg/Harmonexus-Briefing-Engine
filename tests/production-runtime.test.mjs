import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const context = vm.createContext({console});
for (const file of [
  "src/00_Config.gs",
  "src/01_Utils.gs",
  "src/12_SilverIntelligence.gs",
  "src/13_SilverIntelligenceBriefing.gs",
  "src/14_SilverMonetaryEnvironment.gs",
  "src/15_SilverVixVolatilityEnvironment.gs",
  "src/16_SilverLiquidityEnvironment.gs",
  "src/17_SilverIntelligenceInterpretation.gs",
  "src/18_SilverMarketStructure.gs",
  "src/19_SilverExecutiveAssessment.gs",
  "src/20_SilverBriefingIntegration.gs",
  "src/21_SilverOperatorExperience.gs",
  "src/22_SilverProductionRuntime.gs",
  "src/23_SilverHel034ShadowHandoff.gs",
]) {
  vm.runInContext(fs.readFileSync(file, "utf8"), context);
}
const get = name => vm.runInContext(name, context);
const clone = value => JSON.parse(JSON.stringify(value));
const evaluatedAt = "2026-07-27T14:00:00.000Z";

function sourceSnapshot(overrides = {}) {
  return {
    evaluated_at:evaluatedAt,
    sheets:{
      Calculated_Signals:[],
      FRED_Raw:[],
      CFTC_Raw:[],
      Instrument_Scores:[],
      Webhook_Log:[],
    },
    structure:{rows_present:0, record:null},
    hel034:{
      rows_present:0,
      shadow_current:{},
      finalist_registry:{},
      validation_results:{},
      oos_ledger:{},
    },
    tradingview:{
      status:"unavailable",
      event_count:0,
      latest_timestamp:null,
      capabilities:["authenticated factor event"],
      historical_candles:false,
      standalone_vix:false,
      reason_code:"TRADINGVIEW_EVENT_RUNTIME_UNAVAILABLE",
    },
    source_counts:{
      calculated_signals:0, fred:0, cftc:0, scores:0,
      webhook_events:0, structure:0, hel034:0, vix_rows:0,
    },
    ...overrides,
  };
}

test("one immutable runtime feeds every renderer", () => {
  const runtime = clone(
    get("hxSilverBuildProductionRuntime_")(sourceSnapshot(), evaluatedAt)
  );
  assert.equal(runtime.runtime_version, "HEL-035.runtime.1.0.0");
  assert.equal(runtime.renderer_contract, "all surfaces consume integration");
  assert.equal(runtime.integration.dashboard.sections.length, 7);
  assert.equal(runtime.integration.sections.length, 7);
  assert.equal(
    runtime.integration.long_briefing,
    runtime.integration.notification.message_surface === "long_briefing"
      ? runtime.integration.long_briefing
      : null
  );
  assert.equal(runtime.integration.sections[0].section_id,
    "executive_market_assessment");
  assert.equal(runtime.integration.sections[1].section_id,
    "evidence_integrity");
});

test("Executive Market Assessment consumes exactly five section interpretations", () => {
  const runtime = clone(
    get("hxSilverBuildProductionRuntime_")(sourceSnapshot(), evaluatedAt)
  );
  const evidence = runtime.sections.executive_market_assessment
    .executive_market_assessment.section_evidence;
  assert.equal(evidence.length, 5);
  assert.deepEqual(
    evidence.map(item => item.section_id).sort(),
    [
      "liquidity_environment",
      "market_structure",
      "monetary_environment",
      "silver_intelligence",
      "vix_volatility_environment",
    ]
  );
  assert.equal(evidence.some(item => item.section_id === "evidence_integrity"), false);
});

test("TradingView audit never invents candles or standalone VIX", () => {
  const result = clone(get("hxSilverRuntimeTradingView_")([
    {
      Timestamp:evaluatedAt,
      Instrument:"XAGUSD",
      Factor:"DXY",
      "Normalized Signal":-0.4,
      Source:"TradingView",
    },
  ]));
  assert.equal(result.status, "available");
  assert.equal(result.historical_candles, false);
  assert.equal(result.standalone_vix, false);
  assert.ok(result.capabilities.includes("authenticated factor event"));
});

test("FRED_Raw VIXCLS becomes a delayed daily production VIX source", () => {
  const fred = [];
  const start = Date.parse("2026-05-01T00:00:00.000Z");
  for (let index = 0; index < 65; index += 1) {
    fred.push({
      Date:new Date(start + index * 86400000).toISOString().slice(0, 10),
      VIXCLS:14 + (index % 18),
      Source:"FRED",
      "Pulled At":evaluatedAt,
    });
  }
  const vixSnapshot = get("hxSilverRuntimeFredVix_")(fred, evaluatedAt);
  const runtime = clone(
    get("hxSilverBuildProductionRuntime_")(sourceSnapshot({
      sheets:{
        Calculated_Signals:[],
        FRED_Raw:fred,
        CFTC_Raw:[],
        Instrument_Scores:[],
        Webhook_Log:[],
      },
      vix:vixSnapshot,
      source_counts:{
        calculated_signals:0, fred:fred.length, cftc:0, scores:0,
        webhook_events:0, structure:0, hel034:0, vix_rows:65,
      },
    }), evaluatedAt)
  );
  const vix = runtime.sections.vix_environment;
  assert.equal(vix.source_status, "available");
  assert.equal(vix.vix_volatility_environment.provider, "FRED");
  assert.equal(vix.source_provenance.current_production_vix_source, true);
  assert.ok(vix.source_provenance.source_contracts.includes("FRED_Raw:VIXCLS"));
  assert.notEqual(vix.current_state, "unavailable");
  assert.equal(
    vix.vix_volatility_environment.data_freshness.vix_level.live_claim_permitted,
    false
  );
});

test("production snapshot reads each canonical sheet once", () => {
  const calls = {};
  const values = {
    Calculated_Signals:[
      ["As Of", "Instrument", "Factor", "Normalized Signal", "Source"],
      [evaluatedAt, "XAGUSD", "DXY", -0.4, "TradingView webhook"],
    ],
    FRED_Raw:[
      ["Date", "US2Y", "US5Y", "US10Y", "US30Y", "REAL10Y", "VIXCLS", "Source"],
      ["2026-07-25", 4.2, 4.1, 4.0, 4.3, 1.8, 18.4, "FRED public CSV"],
    ],
    CFTC_Raw:[
      ["Report Date", "Instrument", "Open Interest", "Source"],
      ["2026-07-21", "XAGUSD", 150000, "CFTC public report"],
    ],
    Instrument_Scores:[
      ["As Of", "Instrument", "Direction", "Confidence"],
      [evaluatedAt, "XAGUSD", "Neutral", 70],
    ],
    Webhook_Log:[
      ["Timestamp", "Instrument", "Factor", "Normalized Signal", "Source"],
      [evaluatedAt, "XAGUSD", "DXY", -0.4, "TradingView"],
    ],
    Structure:[
      ["Asset", "Auction State", "Last Updated"],
      ["XAGUSD", "Accepted", evaluatedAt],
    ],
    HEL_034_Shadow_Current:[["Artifact", "Payload"]],
  };
  const sheet = (name, rows) => ({
    getLastRow() {
      calls[name] = (calls[name] || 0) + 1;
      return rows.length;
    },
    getDataRange() {
      return {getValues:() => rows};
    },
  });
  const sheets = Object.fromEntries(
    Object.entries(values).map(([name, rows]) => [name, sheet(name, rows)])
  );
  context.SpreadsheetApp = {
    getActive:() => ({getSheetByName:name => sheets[name] || null}),
  };
  const snapshot = clone(
    get("hxSilverCaptureProductionSnapshot_")(evaluatedAt)
  );
  assert.equal(snapshot.source_counts.calculated_signals, 1);
  assert.equal(snapshot.source_counts.webhook_events, 1);
  assert.equal(snapshot.source_counts.structure, 1);
  assert.equal(snapshot.tradingview.status, "available");
  assert.equal(snapshot.source_counts.vix_rows, 1);
  assert.equal(snapshot.vix.vix.provider, "FRED");
  for (const count of Object.values(calls)) assert.equal(count, 1);
});

test("HEL-034 handoff remains read-only and production-ineligible", () => {
  const fixture = JSON.parse(fs.readFileSync(
    "tests/fixtures/hel_035_silver_intelligence.json", "utf8"
  ));
  const snapshot = sourceSnapshot({
    hel034:{
      rows_present:4,
      shadow_current:fixture.shadow_current,
      finalist_registry:fixture.registry,
      validation_results:fixture.validation_results,
      oos_ledger:fixture.oos_ledger,
    },
    source_counts:{
      calculated_signals:0, fred:0, cftc:0, scores:0,
      webhook_events:0, structure:0, hel034:4,
    },
  });
  const before = JSON.stringify(snapshot.hel034);
  const runtime = clone(
    get("hxSilverBuildProductionRuntime_")(snapshot, evaluatedAt)
  );
  const section = runtime.sections.silver_intelligence;
  assert.equal(section.production_effect, "none");
  assert.equal(section.source_provenance.read_only, true);
  assert.equal(JSON.stringify(snapshot.hel034), before);
  for (const subsection of section.silver_intelligence.subsections) {
    assert.ok(Object.hasOwn(subsection, "shadow_confidence"));
    assert.equal(subsection.production_contribution, "none");
    assert.ok(Object.hasOwn(subsection, "current_freshness"));
    assert.ok(Object.hasOwn(subsection, "current_timestamp"));
    assert.equal(subsection.source, "HEL-034");
    assert.ok(Object.hasOwn(subsection, "current_disposition"));
    assert.ok(subsection.current_provenance);
  }
});

test("Evidence Integrity reports unavailable as unavailable, never neutral", () => {
  const runtime = clone(
    get("hxSilverBuildProductionRuntime_")(sourceSnapshot(), evaluatedAt)
  );
  const integrity = runtime.sections.evidence_integrity;
  assert.ok(integrity.evidence_integrity.unavailable_inputs.includes(
    "Liquidity Environment"
  ));
  assert.equal(
    integrity.evidence_integrity.provider_health.order_book,
    "not_connected"
  );
  assert.notEqual(integrity.current_state, "neutral");
});

test("collapsed headlines expose dominant state", () => {
  const runtime = clone(
    get("hxSilverBuildProductionRuntime_")(sourceSnapshot(), evaluatedAt)
  );
  const cards = Object.fromEntries(
    runtime.integration.dashboard.sections.map(card => [card.section_id, card])
  );
  assert.match(cards.monetary_environment.headline, /^Primary Driver · /);
  assert.match(cards.vix_volatility_environment.headline, /^Current Regime · /);
  assert.match(cards.silver_intelligence.headline, /^Dominant Theme · /);
  assert.match(cards.market_structure.headline, /^Current Auction · /);
  assert.match(cards.evidence_integrity.headline, /^Evidence Quality · /);
});

test("operator surfaces expose formatted labels rather than raw enums", () => {
  const runtime = clone(
    get("hxSilverBuildProductionRuntime_")(sourceSnapshot(), evaluatedAt)
  );
  const deskText = JSON.stringify(runtime.integration.dashboard);
  assert.equal(deskText.includes("supportive_confirmation_required"), false);
  assert.equal(deskText.includes("no_operational_conclusion"), false);
  assert.ok(deskText.includes("No Operational Conclusion"));
});

test("runtime publication failure cannot fail the production scoring run", () => {
  const source = fs.readFileSync("src/03_Scoring.gs", "utf8");
  const boundary = source.slice(
    source.indexOf("if (typeof hxSilverMaybeRefreshRuntime_"),
    source.indexOf("return results;", source.indexOf(
      "if (typeof hxSilverMaybeRefreshRuntime_"
    ))
  );
  assert.ok(boundary.includes("try {"));
  assert.ok(boundary.includes("catch (error)"));
  assert.ok(boundary.includes("failed safely"));
});

test("public staging publisher delegates to private runtime snapshot path", () => {
  const source = fs.readFileSync("src/22_SilverProductionRuntime.gs", "utf8");
  const snapshot = source.slice(
    source.indexOf("function hxSilverPublishRuntimeSnapshot_"),
    source.indexOf("function hxSilverMaybeRefreshRuntime_")
  );
  const wrapper = source.slice(
    source.indexOf("function hxSilverPublishRuntimeForStaging"),
    source.length
  );
  assert.ok(snapshot.includes("hxSilverCaptureProductionSnapshot_"));
  assert.ok(snapshot.includes("hxSilverBuildProductionRuntime_"));
  assert.ok(snapshot.includes("hxSilverPublishRuntime_"));
  assert.ok(wrapper.includes("hxSilverPublishRuntimeSnapshot_(startedAt)"));
  assert.equal(wrapper.includes("hxSilverBuildProductionRuntime_("), false);
});

test("staging publisher requires staging flag and production flag off", () => {
  const source = fs.readFileSync("src/22_SilverProductionRuntime.gs", "utf8");
  const wrapper = source.slice(
    source.indexOf("function hxSilverPublishRuntimeForStaging"),
    source.length
  );
  assert.ok(wrapper.includes("HEL_035_STAGING_PUBLISH_ENABLED"));
  assert.ok(wrapper.includes("HEL035_STAGING_PUBLISH_DISABLED"));
  assert.ok(wrapper.includes("HEL035_RUNTIME_FLAG_MUST_REMAIN_OFF"));
  assert.ok(wrapper.includes("HEL_035_STAGING_PUBLISH_ENABLED_FINAL"));
  assert.ok(wrapper.includes("props.setProperty('HEL_035_STAGING_PUBLISH_ENABLED', 'false')"));
});

test("staging publisher preserves notification, scoring, scheduler, and webhook behavior", () => {
  const source = fs.readFileSync("src/22_SilverProductionRuntime.gs", "utf8");
  const wrapper = source.slice(
    source.indexOf("function hxSilverPublishRuntimeForStaging"),
    source.length
  );
  assert.ok(wrapper.includes("notifications:{status:'not_sent'}"));
  assert.ok(wrapper.includes("scoring:{status:'unchanged'}"));
  assert.ok(wrapper.includes("scheduler:{status:'unchanged'}"));
  assert.ok(wrapper.includes("webhooks:{status:'unchanged'}"));
  assert.equal(/MailApp|GmailApp|sendTelegram|sendNotification|newTrigger/.test(wrapper), false);
});

test("staging acceptance output uses human labels and runtime renderers", () => {
  const source = fs.readFileSync("src/22_SilverProductionRuntime.gs", "utf8");
  assert.ok(source.includes("function hxSilverStagingHumanize_"));
  assert.ok(source.includes("HEL_035_Acceptance"));
  assert.ok(source.includes("HEL_035_Renderer_Parity"));
  assert.ok(source.includes("generation_method:'hxSilverBuildOperatorDesk_ via runtime.integration.dashboard'"));
});

test("staging wrapper reports published runtime status without reopening the guard", () => {
  const source = fs.readFileSync("src/22_SilverProductionRuntime.gs", "utf8");
  assert.ok(source.includes("function hxSilverStagingPublishedRuntimeStatus_"));
  assert.ok(source.includes("HEL035_STAGING_PUBLISH_DISABLED"));
  assert.ok(source.includes("result.renderer_parity = published.renderer_parity"));
  assert.ok(source.includes("notification_delivery:'not_sent'"));
});

test("published runtime payload is chunked for Google Sheets cell limits", () => {
  const source = fs.readFileSync("src/22_SilverProductionRuntime.gs", "utf8");
  const publisher = source.slice(
    source.indexOf("function hxSilverPublishRuntime_"),
    source.indexOf("function hxSilverPublishRuntimeSnapshot_")
  );
  const loader = source.slice(
    source.indexOf("function hxSilverLoadPublishedRuntime_"),
    source.indexOf("function hxSilverStagingHash_")
  );
  assert.ok(publisher.includes("const chunkSize = 45000"));
  assert.ok(publisher.includes("'Payload Chunk'"));
  assert.ok(publisher.includes("'Chunk Index'"));
  assert.ok(loader.includes("Payload Chunk"));
  assert.ok(loader.includes("join('')"));
});

test("latest-row helper compares Sheets dates before strings", () => {
  const latest = get("hxSilverRuntimeLatest_")([
    {Date:new Date("2026-07-23T00:00:00.000Z"), VIXCLS:18.7},
    {Date:new Date("2026-07-24T00:00:00.000Z"), VIXCLS:18.2},
  ], ["Date"]);
  assert.equal(latest.VIXCLS, 18.2);
});

test("HEL-034 handoff source preserves candidate dispositions and blocked state", () => {
  const source = clone(get("hxSilverHel034HandoffSource_")());
  assert.equal(source.source_branch, "research/silver-gauge-discovery");
  assert.equal(source.production_effect, "none");
  assert.equal(source.candidate_count, 10);
  const decisions = Object.fromEntries(
    source.shadow_current.candidates.map(item => [item.canonical_symbol, item.decision])
  );
  assert.equal(decisions.COPX, "PROMOTE TO SHADOW");
  assert.equal(decisions.REMX, "PROMOTE TO SHADOW");
  assert.equal(decisions.PALLADIUM, "PROMOTE TO SHADOW");
  assert.equal(decisions.GRID, "PROMOTE TO SHADOW");
  assert.equal(decisions.USDCHF, "PROMOTE TO SHADOW");
  assert.equal(decisions.DBB, "CONTINUE VALIDATION");
  assert.equal(decisions.TAN, "CONTINUE VALIDATION");
  assert.equal(decisions.WTI_FUTURES, "CONTINUE VALIDATION");
  assert.equal(decisions.SEA, "RESERVE");
  assert.equal(decisions.USDCNH, "DATA BLOCKED");
});

test("HEL-034 staging handoff publisher is guarded and non-mutating", () => {
  const source = fs.readFileSync("src/23_SilverHel034ShadowHandoff.gs", "utf8");
  const wrapper = source.slice(source.indexOf("function hxSilverPublishHel034ShadowForStaging"));
  assert.ok(wrapper.includes("HEL_034_SHADOW_HANDOFF_STAGING_ENABLED"));
  assert.ok(wrapper.includes("HEL035_RUNTIME_FLAG_MUST_REMAIN_OFF"));
  assert.ok(wrapper.includes("props.setProperty('HEL_034_SHADOW_HANDOFF_STAGING_ENABLED', 'false')"));
  assert.ok(wrapper.includes("notifications:{status:'not_sent'}"));
  assert.ok(wrapper.includes("scoring:{status:'unchanged'}"));
  assert.ok(wrapper.includes("scheduler:{status:'unchanged'}"));
  assert.ok(wrapper.includes("webhooks:{status:'unchanged'}"));
  assert.equal(/MailApp|GmailApp|sendTelegram|sendNotification|newTrigger/.test(wrapper), false);
});

test("HEL-034 handoff rows are concept-first and production-ineligible", () => {
  const source = get("hxSilverHel034HandoffSource_")();
  const handoff = clone(get("hxSilverHel034HandoffRows_")(source, evaluatedAt));
  const rows = handoff.rows.filter(row => row[0] === "candidate");
  assert.equal(rows.length, 10);
  const bySymbol = Object.fromEntries(rows.map(row => [row[1], row]));
  assert.equal(bySymbol.COPX[2], "Industrial Producer Participation");
  assert.equal(bySymbol.REMX[2], "Strategic Materials");
  assert.equal(bySymbol.PALLADIUM[2], "Industrial Metals Participation");
  assert.equal(bySymbol.USDCNH[2], "China Liquidity");
  for (const row of rows) {
    assert.equal(row[11], "none");
    assert.equal(row[19], "none");
    assert.ok(String(row[21]).includes("Production contribution remains none"));
  }
});

test("runtime staging enable helper is owner-guarded and cannot activate production", () => {
  const source = fs.readFileSync("src/22_SilverProductionRuntime.gs", "utf8");
  const helper = source.slice(source.indexOf("function hxSilverEnableRuntimeStagingForOperator"));
  assert.ok(helper.includes("HEL_035_STAGING_PUBLISH_ENABLED"));
  assert.ok(helper.includes("HEL035_RUNTIME_FLAG_MUST_REMAIN_OFF"));
  assert.ok(helper.includes("hxSilverStagingCallerAuthorized_"));
  assert.ok(helper.includes("feature_activation:{status:'inactive'}"));
  assert.ok(helper.includes("notifications:{status:'not_sent'}"));
  assert.equal(/MailApp|GmailApp|sendTelegram|sendNotification|newTrigger/.test(helper), false);
});
