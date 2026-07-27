import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const context = vm.createContext({console});
for (const file of [
  "src/12_SilverIntelligence.gs",
  "src/13_SilverIntelligenceBriefing.gs",
  "src/18_SilverMarketStructure.gs",
]) {
  vm.runInContext(fs.readFileSync(file, "utf8"), context);
}

const get = name => vm.runInContext(name, context);
const fixture = JSON.parse(
  fs.readFileSync("tests/fixtures/hel_035_market_structure.json", "utf8"),
);
const clone = value => JSON.parse(JSON.stringify(value));

function snapshot(overrides = {}, contexts = {}) {
  return {
    source_sheet: "Structure",
    record: {...clone(fixture.complete_record), ...overrides},
    monetary_environment: contexts.monetary || {
      current_state: "supportive monetary environment",
      silver_impact: "supportive",
    },
    silver_intelligence: contexts.intelligence || {
      current_state: "Supportive",
      silver_impact: "supportive",
    },
    market_session: {status: "open"},
  };
}

function build(value = snapshot()) {
  return get("hxSilverBuildMarketStructure_")(value, fixture.evaluated_at);
}

test("the actual baseline Structure record degrades honestly", () => {
  const result = build(clone(fixture.baseline));
  assert.equal(result.current_state, "bearish");
  assert.equal(result.source_status, "partial");
  assert.equal(result.freshness_status, "unknown");
  assert.equal(result.market_structure.auction_state, "unavailable");
  assert.equal(result.market_structure.liquidity_sweep_status, "unavailable");
  assert.equal(result.market_structure.higher_timeframe_bias, "unavailable");
  assert.equal(result.market_structure.current_session.name, "unavailable");
  assert.equal(result.action_bias, "no_operational_conclusion");
  assert.equal(result.confidence_score, null);
  assert.equal(result.confidence_label, "very low");
});

test("accepted aligned structure favors continuation without becoming a trade signal", () => {
  const result = build();
  assert.equal(result.current_state, "bullish");
  assert.equal(result.market_structure.auction_state, "auction accepted");
  assert.equal(result.market_structure.higher_timeframe_bias, "bullish");
  assert.equal(result.market_structure.continuation_state, "continuation confirmed");
  assert.equal(result.action_bias, "continuation_favored");
  assert.equal(result.notification_permitted, false);
  assert.equal(result.telegram_summary, null);
  assert.equal(result.production_effect, "none");
});

test("all existing auction states receive distinct interpretations", () => {
  const cases = [
    ["Accepted", "auction accepted", /confirms acceptance/],
    ["Rejected", "auction rejected", /shows rejection/],
    ["Rotating", "auction rotating", /shows rotation/],
    ["Expanding", "auction expanding", /shows range expansion/],
    ["Balancing", "auction balancing", /shows balance/],
  ];
  for (const [raw, expected, language] of cases) {
    const result = build(snapshot({"Auction State": raw}));
    assert.equal(result.market_structure.auction_state, expected, raw);
    assert.match(result.interpretation, language, raw);
  }
});

test("liquidity sweep states use only explicit existing structure fields", () => {
  const cases = [
    ["Sweep detected", "liquidity sweep detected"],
    ["Liquidity acceptance", "liquidity acceptance"],
    ["Liquidity rejection", "liquidity rejection"],
    ["Liquidity exhaustion", "liquidity exhaustion"],
    ["No sweep detected", "no liquidity sweep observed"],
  ];
  for (const [raw, expected] of cases) {
    const result = build(snapshot({"Liquidity Sweep Status": raw}));
    assert.equal(result.market_structure.liquidity_sweep_status, expected, raw);
    const evidence = result.underlying_metrics.find(
      item => item.canonical_metric === "liquidity_sweep_status",
    );
    assert.equal(evidence.raw_value, raw);
    assert.equal(result.source_provenance.sweep_detected_by_hel035, false);
  }
});

test("higher-timeframe taxonomy preserves direction and regime condition", () => {
  const cases = [
    ["Bullish", "bullish"],
    ["Bearish", "bearish"],
    ["Neutral", "neutral"],
    ["Transition", "transition"],
    ["Compression", "compression"],
    ["Expansion", "expansion"],
  ];
  for (const [raw, expected] of cases) {
    const result = build(snapshot({"Higher Timeframe Bias": raw}));
    assert.equal(result.market_structure.higher_timeframe_bias, expected, raw);
  }
});

test("session names are translated only from explicit Harmonexus values", () => {
  const cases = [
    ["Asian", "Asian"],
    ["London", "London"],
    ["New York", "New York"],
    ["London / New York Overlap", "Overlap"],
  ];
  for (const [raw, expected] of cases) {
    const result = build(snapshot({"Current Session": raw}));
    assert.equal(result.market_structure.current_session.name, expected, raw);
    assert.equal(result.source_provenance.session_inferred_by_hel035, false);
  }
  const absent = build(snapshot({"Current Session": ""}));
  assert.equal(absent.market_structure.current_session.name, "unavailable");
});

test("continuation requiring confirmation, caution, neutral, and reversal are distinct", () => {
  const pending = build(snapshot({
    "Auction State": "Rotating",
    "Continuation State": "Pending confirmation",
  }));
  assert.equal(pending.action_bias, "supportive_confirmation_required");

  const caution = build(snapshot({"Auction State": "Rejected"}));
  assert.equal(caution.action_bias, "caution");

  const neutral = build(snapshot({
    "Current Trend": "Neutral",
    "Higher Timeframe Bias": "Neutral",
    "Auction State": "Balancing",
    "Continuation State": "Neutral",
  }));
  assert.equal(neutral.action_bias, "neutral");

  const reversal = build(snapshot({"Exhaustion State": "Detected"}));
  assert.equal(reversal.action_bias, "reversal_risk_elevated");
  assert.match(reversal.silver_impact, /reversal risk/);
});

test("structural confirmation identifies support and contradiction", () => {
  const result = build(snapshot({}, {
    monetary: {
      current_state: "supportive monetary environment",
      silver_impact: "supportive",
    },
    intelligence: {
      current_state: "Challenging",
      silver_impact: "challenging",
    },
  }));
  const confirmation = result.market_structure.structural_confirmation;
  assert.equal(confirmation.monetary_environment.state, "supporting");
  assert.equal(
    confirmation.monetary_environment.interpretation,
    "Structure supporting Monetary Environment.",
  );
  assert.equal(confirmation.silver_intelligence.state, "contradicting");
  assert.equal(
    confirmation.silver_intelligence.interpretation,
    "Structure contradicting Silver Intelligence.",
  );
  assert.match(confirmation.overall, /supports one context and contradicts another/);
});

test("missing existing structure is unavailable rather than neutral", () => {
  const result = build({});
  assert.equal(result.source_status, "unavailable");
  assert.equal(result.current_state, "unavailable");
  assert.equal(result.market_structure.auction_state, "unavailable");
  assert.equal(result.market_structure.liquidity_sweep_status, "unavailable");
  assert.equal(result.action_bias, "no_operational_conclusion");
  assert.equal(result.confidence_label, "unavailable");
  assert.notEqual(result.current_state, "neutral");
});

test("stale structure cannot authorize a current conclusion", () => {
  const result = build(snapshot({"Last Updated": "2026-07-01T13:55:00.000Z"}));
  assert.equal(result.freshness_status, "stale");
  assert.equal(result.action_bias, "no_operational_conclusion");
  assert.equal(result.confidence_label, "very low");
});

test("long, short, dashboard, and JSON preserve one conclusion", () => {
  const result = build();
  assert.ok(result.long_summary.includes(result.current_state));
  assert.ok(result.long_summary.includes(result.silver_impact));
  assert.ok(result.short_summary.includes(result.current_state));
  assert.ok(result.short_summary.includes(result.silver_impact));
  assert.equal(result.dashboard_summary.current_structure, result.current_state);
  assert.equal(result.dashboard_summary.silver_impact, result.silver_impact);
  assert.equal(result.dashboard_summary.action_bias, result.action_bias);
  assert.equal(result.dashboard_summary.confidence_label, result.confidence_label);
  assert.deepEqual(
    result.long_summary.split("\n").slice(-4).map(line => line.split(":")[0]),
    ["Action Bias", "Primary Risk", "Required Confirmation", "Confidence"],
  );
  assert.equal(
    get("hxSilverSerializeInterpretation_")(result),
    get("hxSilverSerializeInterpretation_")(result),
  );
});

test("unsupported order-flow claims are rejected", () => {
  for (const phrase of [
    "Resting liquidity is defending price.",
    "Iceberg buying is present.",
    "Absorption confirmed.",
    "Institutional participation detected.",
  ]) {
    assert.throws(() => get("hxStructureAssertClaimSafe_")(phrase));
  }
});

test("target identity and preview boundary fail closed", () => {
  assert.throws(
    () => build(snapshot({Asset: "GOLD"})),
    /MARKET_STRUCTURE_TARGET_MUST_BE_XAGUSD/,
  );
  assert.equal(get("hxSilverIntelligencePreviewEnabled_")(), false);
  assert.throws(
    () => get("hxSilverMarketStructurePreview_")(snapshot(), fixture.evaluated_at),
    /HEL035_INTERNAL_PREVIEW_DISABLED/,
  );
});

test("source contains no data acquisition, persistence, or provider integration", () => {
  const source = fs.readFileSync("src/18_SilverMarketStructure.gs", "utf8");
  for (const forbidden of [
    "UrlFetchApp",
    "SpreadsheetApp",
    "setValue(",
    "appendRow(",
    "hxLiquidityProvider",
    "hxSilverBuildLiquidityEnvironment_",
  ]) {
    assert.ok(!source.includes(forbidden), forbidden);
  }
  assert.match(source, /structure_recalculated:false/);
  assert.match(source, /order_book_consumed:false/);
});
