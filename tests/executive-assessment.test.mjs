import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const context = vm.createContext({console});
for (const file of [
  "src/12_SilverIntelligence.gs",
  "src/13_SilverIntelligenceBriefing.gs",
  "src/19_SilverExecutiveAssessment.gs",
]) {
  vm.runInContext(fs.readFileSync(file, "utf8"), context);
}

const get = name => vm.runInContext(name, context);
const fixture = JSON.parse(
  fs.readFileSync("tests/fixtures/hel_035_executive_assessment.json", "utf8"),
);
const clone = value => JSON.parse(JSON.stringify(value));

function snapshot() {
  return clone(fixture.sections);
}

function build(value = snapshot()) {
  return get("hxSilverBuildExecutiveAssessment_")(value, fixture.evaluated_at);
}

test("aligned authoritative sections favor continuation", () => {
  const result = build();
  assert.equal(result.section_name, "Executive Market Assessment");
  assert.equal(result.current_state, "Continuation environment");
  assert.equal(result.action_bias, "continuation_favored");
  assert.equal(result.executive_market_assessment.current_operational_bias, "Continuation Favored");
  assert.equal(result.confidence_label, "high");
  assert.equal(result.confidence_score, null);
  assert.equal(result.intended_long_briefing_order, 1);
  assert.equal(result.production_effect, "none");
});

test("one authoritative challenge requires confirmation", () => {
  const value = snapshot();
  value.monetary_environment.action_bias = "monetary_headwind";
  value.monetary_environment.current_state = "restrictive monetary environment";
  value.monetary_environment.silver_impact = "Monetary pressure challenges silver.";
  const result = build(value);
  assert.equal(result.action_bias, "supportive_confirmation_required");
  assert.equal(result.current_state, "Confirmation-dependent continuation");
  assert.ok(result.contradicting_evidence.some(
    item => item.section_id === "monetary_environment",
  ));
});

test("multiple authoritative challenges create caution", () => {
  const value = snapshot();
  value.monetary_environment.action_bias = "monetary_headwind";
  value.monetary_environment.silver_impact = "challenging";
  value.vix_environment.action_bias = "volatility_headwind";
  value.vix_environment.silver_impact = "challenging";
  const result = build(value);
  assert.equal(result.action_bias, "caution");
  assert.equal(result.current_state, "Caution environment");
});

test("existing reversal evidence elevates the executive reversal state", () => {
  const value = snapshot();
  value.vix_environment.action_bias = "liquidation_risk_elevated";
  value.vix_environment.silver_impact = "Liquidation risk is elevated.";
  const result = build(value);
  assert.equal(result.action_bias, "reversal_risk_elevated");
  assert.equal(result.current_state, "Reversal risk elevated");
  assert.match(result.primary_risk, /reversal risk/);
});

test("neutral and unavailable Market Structure remain authoritative boundaries", () => {
  const neutral = snapshot();
  neutral.market_structure.action_bias = "neutral";
  neutral.market_structure.current_state = "neutral";
  neutral.market_structure.silver_impact = "balanced";
  assert.equal(build(neutral).action_bias, "neutral");

  const unavailable = snapshot();
  unavailable.market_structure.source_status = "unavailable";
  unavailable.market_structure.freshness_status = "unknown";
  unavailable.market_structure.action_bias = "no_operational_conclusion";
  unavailable.market_structure.current_state = "unavailable";
  assert.equal(build(unavailable).action_bias, "no_operational_conclusion");
  assert.equal(build(unavailable).current_state, "Insufficient evidence");
});

test("shadow Silver Intelligence can challenge context but cannot set reversal", () => {
  const value = snapshot();
  value.silver_intelligence.current_state = "Challenging";
  value.silver_intelligence.silver_impact = "External confirmation is challenging.";
  const result = build(value);
  assert.equal(result.action_bias, "supportive_confirmation_required");
  const external = result.executive_market_assessment.section_evidence.find(
    item => item.section_id === "silver_intelligence",
  );
  assert.equal(external.side, "challenging");
  assert.equal(external.eligible_for_operational_bias, false);
  assert.equal(external.shadow_context, true);
  assert.notEqual(result.action_bias, "reversal_risk_elevated");
});

test("unavailable Liquidity remains unavailable rather than neutral", () => {
  const result = build();
  const liquidity = result.executive_market_assessment.section_evidence.find(
    item => item.section_id === "liquidity_environment",
  );
  assert.equal(liquidity.side, "unavailable");
  assert.ok(result.limitations.includes("Liquidity Environment unavailable"));
  assert.match(result.operator_summary, /Liquidity Environment remains unavailable/);
  assert.notEqual(liquidity.side, "neutral");
  assert.equal(result.action_bias, "continuation_favored");
});

test("supporting and contradicting evidence contain only consumed section interpretations", () => {
  const result = build();
  const allowed = new Set([
    "monetary_environment",
    "vix_volatility_environment",
    "liquidity_environment",
    "silver_intelligence",
    "market_structure",
  ]);
  for (const item of [
    ...result.supporting_evidence,
    ...result.contradicting_evidence,
  ]) {
    assert.ok(allowed.has(item.section_id));
    assert.ok(item.interpretation);
  }
  assert.equal(result.source_provenance.new_evidence_created, false);
});

test("confidence is copied from existing Market Structure and never manufactured", () => {
  const value = snapshot();
  value.market_structure.confidence_label = "moderate";
  value.market_structure.confidence_score = 73;
  const result = build(value);
  assert.equal(result.confidence_label, "moderate");
  assert.equal(result.confidence_score, null);
  assert.equal(result.confidence_basis.selected_existing_confidence, "Market Structure");
  assert.equal(result.confidence_basis.numeric_confidence_synthesized, false);
  assert.ok(result.confidence_basis.input_confidence.some(
    item => item.section_name === "Market Structure" && item.confidence_score === 73,
  ));
  assert.ok(!result.operator_summary.includes("73"));
});

test("executive summary is one concise non-statistical paragraph", () => {
  const result = build();
  assert.equal(result.operator_summary.split(/\n\s*\n/).length, 1);
  assert.ok(result.operator_summary.length < 900);
  assert.doesNotMatch(
    result.operator_summary,
    /[%]|\bcorrelation\b|\bpercentile\b|\bscore\b|\bsample\b|\b\d+\b/i,
  );
  assert.equal(result.long_summary, `EXECUTIVE MARKET ASSESSMENT\n\n${result.operator_summary}`);
  assert.equal(result.long_summary.split(/\n\s*\n/).length, 2);
});

test("section prose is not copied into the executive paragraph", () => {
  const value = snapshot();
  value.monetary_environment.interpretation =
    "UNIQUE RAW SECTION PROSE THAT MUST NEVER APPEAR";
  value.market_structure.required_confirmation =
    "UNIQUE STRUCTURE CONFIRMATION THAT MUST NEVER APPEAR";
  const result = build(value);
  assert.ok(!result.operator_summary.includes("UNIQUE RAW SECTION PROSE"));
  assert.ok(!result.operator_summary.includes("UNIQUE STRUCTURE CONFIRMATION"));
});

test("long, short, dashboard, and JSON preserve one assessment", () => {
  const result = build();
  assert.equal(result.short_summary, result.operator_summary);
  assert.equal(result.dashboard_summary.paragraph, result.operator_summary);
  assert.equal(result.dashboard_summary.current_market_state, result.current_state);
  assert.equal(result.dashboard_summary.action_bias, result.action_bias);
  assert.equal(result.dashboard_summary.confidence_label, result.confidence_label);
  assert.equal(result.dashboard_summary.intended_long_briefing_order, 1);
  assert.equal(result.telegram_summary, null);
  assert.equal(result.notification_permitted, false);
  assert.equal(
    get("hxSilverSerializeInterpretation_")(result),
    get("hxSilverSerializeInterpretation_")(result),
  );
});

test("invalid target or activated input fails closed", () => {
  const wrongTarget = snapshot();
  wrongTarget.market_structure.target_instrument = "GOLD";
  assert.throws(() => build(wrongTarget), /EXECUTIVE_INPUT_TARGET_MUST_BE_XAGUSD/);

  const activated = snapshot();
  activated.silver_intelligence.production_effect = "score_changed";
  assert.throws(
    () => build(activated),
    /EXECUTIVE_INPUT_PRODUCTION_EFFECT_MUST_BE_NONE/,
  );
});

test("preview remains inactive and no live consumer references the builder", () => {
  assert.equal(get("hxSilverIntelligencePreviewEnabled_")(), false);
  assert.throws(
    () => get("hxSilverExecutiveAssessmentPreview_")(snapshot(), fixture.evaluated_at),
    /HEL035_INTERNAL_PREVIEW_DISABLED/,
  );
  const files = ["app.py", "src/05_Notifications.gs", "src/06_Webhooks_Triggers.gs"];
  for (const file of files) {
    assert.ok(!fs.readFileSync(file, "utf8").includes("hxSilverBuildExecutiveAssessment_"));
  }
});
