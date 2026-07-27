import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const context = vm.createContext({console});
for (const file of [
  "src/12_SilverIntelligence.gs",
  "src/13_SilverIntelligenceBriefing.gs",
  "src/17_SilverIntelligenceInterpretation.gs",
]) {
  vm.runInContext(fs.readFileSync(file, "utf8"), context);
}

const get = name => vm.runInContext(name, context);
const fixture = JSON.parse(
  fs.readFileSync("tests/fixtures/hel_035_silver_intelligence.json", "utf8"),
);
const clone = value => JSON.parse(JSON.stringify(value));

function snapshot() {
  return {
    hel034_shadow_current: clone(fixture.shadow_current),
    hel034_finalist_registry: clone(fixture.registry),
    hel034_validation_results: clone(fixture.validation_results),
    hel034_oos_ledger: clone(fixture.oos_ledger),
    current_production: {
      copper: {
        current_state: "strengthening",
        source_status: "available",
        as_of: fixture.evaluated_at,
      },
    },
    current_market_structure: {
      current_state: "strengthening",
      silver_impact: "supportive",
      source_status: "available",
      as_of: fixture.evaluated_at,
    },
    monetary_environment: {
      current_state: "easing monetary pressure",
      silver_impact: "supportive",
      source_status: "available",
      as_of: fixture.evaluated_at,
    },
    vix_environment: {
      current_state: "volatility compressing",
      silver_impact: "supportive",
      source_status: "available",
      as_of: fixture.evaluated_at,
    },
    market_session: "new_york",
  };
}

function build(value = snapshot()) {
  return get("hxSilverBuildExternalIntelligence_")(value, fixture.evaluated_at);
}

function subsection(result, id) {
  return result.silver_intelligence.subsections.find(item => item.subsection_id === id);
}

test("supportive HEL-034 context becomes concept-first Silver Intelligence", () => {
  const result = build();
  assert.equal(result.section_name, "Silver Intelligence");
  assert.equal(result.current_state, "Strongly Supportive");
  assert.equal(result.action_bias, "no_operational_conclusion");
  assert.equal(result.production_effect, "none");
  assert.equal(result.freshness_status, "current");
  assert.equal(result.source_provenance.authority, "HEL-034");
  assert.equal(result.source_provenance.direct_hel033_consumption, false);
  assert.equal(result.confidence_score, null);
});

test("blocked China Liquidity is never neutral or authorized", () => {
  const result = build();
  const china = subsection(result, "china_liquidity");
  assert.equal(china.subsection_name, "China Liquidity");
  assert.equal(china.source_label, "Blocked");
  assert.equal(china.source_status, "blocked");
  assert.equal(china.current_state, "Data Blocked");
  assert.equal(china.interpretation, "Daily offshore CNH validation incomplete.");
  assert.equal(china.silver_impact, "No production interpretation authorized.");
  assert.equal(china.action_bias, "no_operational_conclusion");
  assert.equal(china.confidence.score, null);
  assert.equal(china.confidence.label, "unavailable");
  assert.notEqual(china.relationship, "neutral");
});

test("unavailable candidates remain unavailable", () => {
  const value = snapshot();
  value.hel034_shadow_current.candidates =
    value.hel034_shadow_current.candidates.filter(item => item.canonical_symbol !== "REMX");
  const result = build(value);
  const strategic = subsection(result, "strategic_materials");
  assert.equal(strategic.source_status, "unavailable");
  assert.equal(strategic.relationship, "unavailable");
  assert.equal(strategic.current_state, "Strategic materials unavailable");
  assert.equal(strategic.action_bias, "no_operational_conclusion");
});

test("authority labels preserve shadow, validation, research, and blocked states", () => {
  const result = build();
  assert.equal(subsection(result, "industrial_producer_participation").source_label, "Shadow Observation");
  assert.equal(subsection(result, "industrial_commodity_breadth").source_label, "Validation");
  assert.equal(subsection(result, "physical_economy").source_label, "Research");
  assert.equal(subsection(result, "china_liquidity").source_label, "Blocked");
  assert.ok(result.long_summary.includes("Status: Shadow Observation"));
  assert.ok(result.long_summary.includes("Status: Validation"));
  assert.ok(result.long_summary.includes("Status: Research"));
  assert.ok(result.long_summary.includes("Status: Blocked"));
});

test("mixed and contradictory observations are explained rather than hidden", () => {
  const value = snapshot();
  for (const symbol of ["COPX", "REMX", "DBB", "TAN"]) {
    const item = value.hel034_shadow_current.candidates.find(row => row.canonical_symbol === symbol);
    item.candidate_direction = "down";
    item.silver_direction = "up";
    item.confirmation_status = "not_confirming";
    item.challenge_status = "challenging";
  }
  const result = build(value);
  assert.equal(result.current_state, "Mixed");
  const synthesis = result.silver_intelligence.overall_external_confirmation;
  assert.ok(synthesis.supportive_concepts.length > 0);
  assert.ok(synthesis.challenging_concepts.length > 0);
  assert.match(synthesis.explanation, /support the current silver context/);
  assert.match(synthesis.explanation, /challenge it/);
  assert.equal(result.confidence_label, "low");
});

test("a materially challenging set produces a challenging synthesis, not a trade signal", () => {
  const value = snapshot();
  for (const item of value.hel034_shadow_current.candidates) {
    if (item.decision === "DATA BLOCKED") continue;
    item.candidate_direction = "down";
    item.silver_direction = "up";
    item.confirmation_status = "not_confirming";
    item.challenge_status = "challenging";
  }
  const usdchf = value.hel034_shadow_current.candidates.find(item => item.canonical_symbol === "USDCHF");
  usdchf.candidate_direction = "up";
  usdchf.silver_direction = "down";
  usdchf.confirmation_status = "confirming";
  const result = build(value);
  assert.ok(["Challenging", "Strongly Challenging"].includes(result.current_state));
  assert.equal(result.action_bias, "no_operational_conclusion");
  assert.equal(result.telegram_summary, null);
  assert.equal(result.notification_permitted, false);
});

test("concept names lead and tickers remain expandable evidence", () => {
  const result = build();
  const card = result.dashboard_summary.subsections[0];
  assert.equal(card.heading, "Industrial Producer Participation");
  assert.equal(card.expandable.evidence.ticker, "COPX");
  assert.ok(!result.long_summary.includes("COPX"));
  assert.ok(!result.short_summary.includes("COPX"));
  assert.ok(!result.long_summary.includes("current_correlation"));
  assert.ok(!JSON.stringify(result.dashboard_summary).includes("current_correlation"));
});

test("long, short, dashboard, and JSON derive from one state", () => {
  const result = build();
  assert.ok(result.long_summary.includes(result.current_state));
  assert.ok(result.short_summary.includes(result.current_state));
  assert.equal(result.dashboard_summary.overall_external_confirmation, result.current_state);
  assert.equal(result.dashboard_summary.silver_impact, result.silver_impact);
  assert.equal(result.dashboard_summary.action_bias, result.action_bias);
  assert.equal(result.dashboard_summary.confidence_label, result.confidence_label);
  assert.equal(result.dashboard_summary.heading, "Silver Intelligence");
  assert.equal(
    get("hxSilverSerializeInterpretation_")(result),
    get("hxSilverSerializeInterpretation_")(result),
  );
});

test("source confidence is preserved as evidence but never promoted to operator precision", () => {
  const result = build();
  const industrial = subsection(result, "industrial_producer_participation");
  assert.equal(industrial.confidence.score, null);
  assert.equal(industrial.confidence.basis.hel034_source_confidence, 92);
  assert.equal(industrial.confidence.label, "moderate");
  assert.equal(result.confidence_score, null);
});

test("disposition conflicts fail closed without changing either source artifact", () => {
  const value = snapshot();
  const before = JSON.stringify(value);
  value.hel034_validation_results.results.find(item => item.canonical_symbol === "COPX").decision =
    "CONTINUE VALIDATION";
  const conflictBefore = JSON.stringify(value);
  const result = build(value);
  const industrial = subsection(result, "industrial_producer_participation");
  assert.equal(industrial.relationship, "unavailable");
  assert.ok(industrial.provenance.reason_codes.includes("HEL034_DISPOSITION_CONFLICT"));
  assert.equal(JSON.stringify(value), conflictBefore);
  assert.notEqual(before, conflictBefore);
});

test("the adapter does not mutate OOS counts or source snapshots", () => {
  const value = snapshot();
  const before = JSON.stringify(value);
  const result = build(value);
  assert.equal(JSON.stringify(value), before);
  const industrial = subsection(result, "industrial_producer_participation");
  assert.equal(industrial.evidence.expandable.oos_observation_counts.daily, 12);
  assert.equal(industrial.evidence.expandable.oos_observation_counts.copied_read_only, true);
  assert.equal(result.source_provenance.oos_mutation, false);
  assert.ok(result.reason_codes.includes("NO_OOS_MUTATION"));
});

test("HEL-033 direct input and non-none HEL-034 production effects are rejected", () => {
  const direct = snapshot();
  direct.hel033 = {};
  assert.throws(() => build(direct), /HEL033_DIRECT_INPUT_PROHIBITED/);

  const promoted = snapshot();
  promoted.hel034_shadow_current.production_effect = "score_changed";
  assert.throws(() => build(promoted), /HEL034_PRODUCTION_EFFECT_MUST_BE_NONE/);
});

test("internal preview remains disabled by default", () => {
  assert.equal(get("hxSilverIntelligencePreviewEnabled_")(), false);
  assert.throws(
    () => get("hxSilverExternalIntelligencePreview_")(snapshot(), fixture.evaluated_at),
    /HEL035_INTERNAL_PREVIEW_DISABLED/,
  );
});
