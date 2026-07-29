import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const fixture = JSON.parse(
  fs.readFileSync("tests/fixtures/hel_035_briefing_integration.json", "utf8")
);
const context = vm.createContext({console});
for (const file of [
  "src/00_Config.gs",
  "src/01_Utils.gs",
  "src/02_DataFeeds.gs",
  "src/10_RelationshipEngines.gs",
  "src/11_MarketCalendarWatch.gs",
  "src/05_Notifications.gs",
  "src/20_SilverBriefingIntegration.gs",
  "src/21_SilverOperatorExperience.gs",
]) {
  vm.runInContext(fs.readFileSync(file, "utf8"), context);
}
vm.runInContext(
  "if(typeof safeJsonCell_==='undefined') var safeJsonCell_=function(v,f){try{return typeof v==='string'?JSON.parse(v):(v||f);}catch(e){return f;}};",
  context
);
const get = name => vm.runInContext(name, context);
const clone = value => JSON.parse(JSON.stringify(value));
const build = () => JSON.parse(JSON.stringify(
  get("hxSilverBuildBriefingIntegration_")(
    fixture.existing_briefing,
    clone(fixture.bundle)
  )
));

test("integration consumes every runtime section in the approved order", () => {
  const result = build();
  assert.deepEqual(result.section_order, [
    "Executive Market Assessment",
    "Evidence Integrity",
    "Monetary Environment",
    "VIX — Volatility Environment",
    "Liquidity Environment",
    "Silver Intelligence",
    "Market Structure",
  ]);
  assert.equal(result.sections.length, 7);
  assert.equal(result.target_instrument, "XAGUSD");
  assert.equal(result.production_effect, "none");
});

test("long briefing inserts HEL-035 before every existing section", () => {
  const long = build().long_briefing;
  const headings = [
    "EXECUTIVE MARKET ASSESSMENT\n",
    "\nEVIDENCE INTEGRITY\n",
    "\nMONETARY ENVIRONMENT\n",
    "\nVIX — VOLATILITY ENVIRONMENT\n",
    "\nLIQUIDITY ENVIRONMENT\n",
    "\nSILVER INTELLIGENCE\n",
    "\nMARKET STRUCTURE\n",
    "\nMARKET REGIME:\n",
  ];
  const positions = headings.map(heading => long.indexOf(heading));
  assert.ok(positions.every(position => position >= 0));
  assert.deepEqual(positions, positions.slice().sort((a, b) => a - b));
  assert.ok(long.startsWith(
    "HARMONEXUS\nChief Investment Officer Robinson's\nMorning Market Brief"
  ));
});

test("existing macro, instrument, opportunity, and disclaimer text is preserved", () => {
  const long = build().long_briefing;
  for (const text of [
    "MARKET REGIME:",
    "MACRO INTERPRETATION",
    "Existing macro interpretation remains intact.",
    "PRIORITY INSTRUMENTS:",
    "1. XAGUSD - Neutral",
    "Decision support only. No trade execution.",
  ]) {
    assert.ok(long.includes(text));
  }
});

test("short briefing retains current state, silver impact, and confidence", () => {
  const result = build();
  for (const section of result.sections) {
    assert.ok(result.short_briefing.includes(section.section_name));
    assert.ok(result.short_briefing.includes(section.current_state));
    assert.ok(result.short_briefing.includes(section.silver_impact));
    assert.ok(result.short_briefing.includes(section.confidence_label));
  }
  assert.equal(result.short_briefing.split("\n").length, 7);
});

test("dashboard puts interpretation before statistics and expandable evidence", () => {
  const dashboard = build().dashboard;
  assert.equal(
    dashboard.layout_policy,
    "headline_interpretation_conclusion_expandable_evidence"
  );
  assert.equal(dashboard.sections.length, 7);
  for (const section of dashboard.sections) {
    assert.equal(typeof section.interpretation, "string");
    assert.ok(section.operational_conclusion);
    assert.ok(section.expandable_details);
    const serialized = JSON.stringify(section);
    assert.ok(serialized.indexOf('"interpretation"') <
      serialized.indexOf('"expandable_details"'));
  }
});

test("HEL-034 remains visibly shadow and cannot produce a production effect", () => {
  const result = build();
  const shadow = result.dashboard.sections.find(
    section => section.section_id === "silver_intelligence"
  );
  assert.equal(shadow.authority_label, "Shadow Observation");
  assert.ok(result.long_briefing.includes("Authority: Shadow Observation"));
  assert.ok(result.short_briefing.includes("Authority: Shadow Observation"));
  assert.equal(result.sections[5].action_bias, "no_operational_conclusion");
  assert.equal(result.sections[5].production_effect, "none");
});

test("unavailable liquidity remains unavailable rather than neutral", () => {
  const result = build();
  const liquidity = result.dashboard.sections.find(
    section => section.section_id === "liquidity_environment"
  );
  assert.equal(liquidity.authority_label, "Unavailable");
  assert.equal(liquidity.freshness.status, "unknown");
  assert.match(liquidity.silver_impact, /No liquidity interpretation/);
});

test("silver card support is preview-only and does not redesign the card", () => {
  const preview = build().silver_card_preview;
  assert.equal(preview.status, "preview_only");
  assert.equal(preview.current_production_card_preserved, true);
  assert.equal(preview.card_redesigned, false);
  assert.equal(preview.production_effect, "none");
});

test("integration creates no new alert or independent notification", () => {
  const notification = build().notification;
  assert.equal(notification.existing_daily_delivery_path, true);
  assert.equal(notification.new_alerts, false);
  assert.equal(notification.independent_section_notifications, false);
  assert.equal(notification.message_surface, "long_briefing");
});

test("disabled or missing integration fails open to the existing briefing", () => {
  const maybe = get("hxSilverMaybeIntegrateLongBriefing_");
  assert.equal(
    maybe(fixture.existing_briefing, clone(fixture.bundle), {hel035_enabled:false}),
    fixture.existing_briefing
  );
  assert.equal(
    maybe(fixture.existing_briefing, null, {hel035_enabled:true}),
    fixture.existing_briefing
  );
});

test("target, production effect, renderer, and executive constraints fail closed", () => {
  const builder = get("hxSilverBuildBriefingIntegration_");

  const wrongTarget = clone(fixture.bundle);
  wrongTarget.sections.monetary_environment.target_instrument = "GOLD";
  assert.throws(
    () => builder(fixture.existing_briefing, wrongTarget),
    /TARGET_INVALID/
  );

  const productionMutation = clone(fixture.bundle);
  productionMutation.sections.silver_intelligence.production_effect = "score_changed";
  assert.throws(
    () => builder(fixture.existing_briefing, productionMutation),
    /PRODUCTION_EFFECT_PROHIBITED/
  );

  const missingRenderer = clone(fixture.bundle);
  missingRenderer.sections.market_structure.long_summary = "";
  assert.throws(
    () => builder(fixture.existing_briefing, missingRenderer),
    /RENDERER_MISSING/
  );

  const statisticalExecutive = clone(fixture.bundle);
  statisticalExecutive.sections.executive_market_assessment.operator_summary +=
    " Correlation is elevated.";
  assert.throws(
    () => builder(fixture.existing_briefing, statisticalExecutive),
    /STATISTICAL_SUMMARY_PROHIBITED/
  );
});

test("daily notification path forwards the integrated long briefing once enabled", () => {
  vm.runInContext(`
    var hel035CapturedBriefing = '';
    hxLatestScoreRows_ = function() { return [{
      Instrument:'XAGUSD', Family:'metal', Direction:'Neutral', Strength:5,
      Confidence:70, 'Directional Score':0, Reliability:'Reliable',
      'Strongest Drivers':'[]', Contradictions:'[]', 'Score Change':0,
      'Material Change':false, Regime:'Neutral', 'Regime Age (Trading Days)':5,
      'Primary Drivers':'[]', 'Seasonal Watch':''
    }]; };
    sendProductionBriefingNotification = function(options) {
      hel035CapturedBriefing = options.briefingText;
      return ['unified'];
    };
  `, context);
  const runtime = build();
  vm.runInContext(
    "hxSilverLoadPublishedRuntime_=function(){return {integration:" +
      JSON.stringify(runtime) + "};};",
    context
  );
  const result = get("sendDailyBriefing")({hel035_enabled:true});
  assert.deepEqual(JSON.parse(JSON.stringify(result)), ["unified"]);
  const sent = get("hel035CapturedBriefing");
  assert.ok(sent.includes("EXECUTIVE MARKET ASSESSMENT"));
  assert.ok(sent.indexOf("EXECUTIVE MARKET ASSESSMENT") <
    sent.indexOf("MARKET REGIME:"));
  assert.equal(sent.match(/Decision support only\. No trade execution\./g).length, 1);
});

test("activated runtime flag cuts over production notification rendering", () => {
  vm.runInContext(`
    var hel035RuntimeFlagCapture = {};
    var realPropsForRuntimeFlag = hxProps_;
    hxProps_ = function() { return {getProperty:function(key){
      return ({HEL_035_RUNTIME_ENABLED:'true'})[key] || '';
    }}; };
    hxLatestScoreRows_ = function() { return [{
      Instrument:'XAGUSD', Family:'metal', Direction:'Neutral', Strength:5,
      Confidence:70, 'Directional Score':0, Reliability:'Reliable',
      'Strongest Drivers':'[]', Contradictions:'[]', 'Score Change':0,
      'Material Change':false, Regime:'Neutral', 'Regime Age (Trading Days)':5,
      'Primary Drivers':'[]', 'Seasonal Watch':''
    }]; };
    sendProductionBriefingNotification = function(options) {
      hel035RuntimeFlagCapture = options;
      return ['dry'];
    };
  `, context);
  const runtime = build();
  vm.runInContext(
    "hxSilverLoadPublishedRuntime_=function(){return {runtime_id:'HEL-035:test-runtime',integration:" +
      JSON.stringify(runtime) + "};};",
    context
  );
  const result = get("sendDailyBriefing")();
  assert.deepEqual(JSON.parse(JSON.stringify(result)), ["dry"]);
  const capture = JSON.parse(JSON.stringify(get("hel035RuntimeFlagCapture")));
  assert.ok(capture.emailMessage.includes("EXECUTIVE MARKET ASSESSMENT"));
  assert.match(capture.telegramMessage, /EXECUTIVE MARKET ASSESSMENT|Executive Market Assessment/);
  if (capture.telegramMessage.includes("MARKET REGIME"))
    assert.ok(capture.telegramMessage.indexOf("EXECUTIVE MARKET ASSESSMENT") <
      capture.telegramMessage.indexOf("MARKET REGIME"));
  vm.runInContext(`hxProps_ = realPropsForRuntimeFlag;`, context);
});

test("preview and production dry run use the activated runtime renderer", () => {
  vm.runInContext(`
    var hel035DryRunCapture = {};
    var realPropsForDryRunRuntime = hxProps_;
    hxProps_ = function() { return {getProperty:function(key){
      return ({HEL_035_RUNTIME_ENABLED:'true'})[key] || '';
    }}; };
    hxLatestScoreRows_ = function() { return [{
      Instrument:'XAGUSD', Family:'metal', Direction:'Neutral', Strength:5,
      Confidence:70, 'Directional Score':0, Reliability:'Reliable',
      'Strongest Drivers':'[]', Contradictions:'[]', 'Score Change':0,
      'Material Change':false, Regime:'Neutral', 'Regime Age (Trading Days)':5,
      'Primary Drivers':'[]', 'Seasonal Watch':''
    }]; };
    sendProductionBriefingNotification = function(options) {
      hel035DryRunCapture = options;
      return [{provider:'DeliverySuppressed',ok:true,status:'DRY RUN ACTIVE — briefing rendered but not sent.'}];
    };
  `, context);
  const runtime = build();
  vm.runInContext(
    "hxSilverLoadPublishedRuntime_=function(){return {runtime_id:'HEL-035:test-runtime',integration:" +
      JSON.stringify(runtime) + "};};",
    context
  );
  const preview = JSON.parse(JSON.stringify(get("hxMorningMarketBriefingPreview_")()));
  assert.equal(preview.hel035_enabled, true);
  assert.equal(preview.runtime_id, "HEL-035:test-runtime");
  assert.equal(preview.formatter, "HEL-035 Runtime");
  assert.ok(preview.briefing.includes("EXECUTIVE MARKET ASSESSMENT"));
  const dryRun = get("dryRunMorningMarketBriefingProductionPath")();
  assert.match(dryRun, /HEL-035 Runtime/);
  const capture = JSON.parse(JSON.stringify(get("hel035DryRunCapture")));
  assert.equal(capture.dryRun, true);
  assert.equal(capture.suppressStateMutation, true);
  assert.ok(capture.emailMessage.includes("EXECUTIVE MARKET ASSESSMENT"));
  assert.match(capture.telegramMessage, /EXECUTIVE MARKET ASSESSMENT|Executive Market Assessment/);
  vm.runInContext(`hxProps_ = realPropsForDryRunRuntime;`, context);
});
