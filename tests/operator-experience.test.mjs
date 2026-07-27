import assert from "node:assert/strict";
import fs from "node:fs";
import {performance} from "node:perf_hooks";
import test from "node:test";
import vm from "node:vm";

const fixture = JSON.parse(
  fs.readFileSync("tests/fixtures/hel_035_briefing_integration.json", "utf8")
);
const context = vm.createContext({console});
for (const file of [
  "src/20_SilverBriefingIntegration.gs",
  "src/21_SilverOperatorExperience.gs",
]) {
  vm.runInContext(fs.readFileSync(file, "utf8"), context);
}
const get = name => vm.runInContext(name, context);
const clone = value => JSON.parse(JSON.stringify(value));
const build = () => JSON.parse(JSON.stringify(
  get("hxSilverBuildBriefingIntegration_")(
    fixture.existing_briefing,
    clone(fixture.bundle)
  )
));

function scalarStrings(value, output = new Set()) {
  if (Array.isArray(value)) value.forEach(item => scalarStrings(item, output));
  else if (value && typeof value === "object")
    Object.values(value).forEach(item => scalarStrings(item, output));
  else if (value !== null && value !== undefined && String(value).trim())
    output.add(String(value).replace(/\s+/g, " ").trim().toLowerCase());
  return output;
}

test("operator desk preserves the permanent visual priority", () => {
  const dashboard = build().dashboard;
  assert.equal(dashboard.heading, "Silver Market Desk");
  assert.deepEqual(dashboard.section_order, [
    "Executive Market Assessment",
    "Evidence Integrity",
    "Monetary Environment",
    "VIX — Volatility Environment",
    "Liquidity Environment",
    "Silver Intelligence",
    "Market Structure",
  ]);
  assert.deepEqual(dashboard.sections.map(card => card.priority), [1, 2, 3, 4, 5, 6, 7]);
  assert.equal(dashboard.sections[0].is_executive, true);
});

test("every card follows headline, interpretation, conclusion, then evidence", () => {
  const cards = build().dashboard.sections;
  for (const card of cards) {
    for (const field of [
      "section_name",
      "headline",
      "interpretation",
      "silver_impact",
      "operational_conclusion",
      "required_confirmation",
      "confidence",
      "expandable_details",
    ]) {
      assert.ok(Object.hasOwn(card, field), `${card.section_id} lacks ${field}`);
    }
    const serialized = JSON.stringify(card);
    assert.ok(serialized.indexOf('"headline"') < serialized.indexOf('"interpretation"'));
    assert.ok(serialized.indexOf('"interpretation"') <
      serialized.indexOf('"operational_conclusion"'));
    assert.ok(serialized.indexOf('"operational_conclusion"') <
      serialized.indexOf('"expandable_details"'));
  }
});

test("executive card answers the complete operator decision flow", () => {
  const dashboard = build().dashboard;
  assert.deepEqual(dashboard.operator_flow, [
    "What is happening?",
    "Why?",
    "What does it mean for silver?",
    "What should I watch?",
    "How confident is the system?",
  ]);
  const executive = dashboard.sections[0];
  assert.ok(executive.headline);
  assert.ok(executive.interpretation);
  assert.ok(executive.silver_impact);
  assert.ok(executive.required_confirmation);
  assert.ok(executive.confidence.label);
});

test("expanded details expose the audit contract consistently", () => {
  for (const card of build().dashboard.sections) {
    assert.deepEqual(Object.keys(card.expandable_details), [
      "evidence",
      "metrics",
      "sources",
      "freshness",
      "reason_codes",
      "research_notes",
      "limitations",
    ]);
    assert.ok(Object.hasOwn(card.expandable_details.freshness, "status"));
    assert.ok(Object.hasOwn(card.expandable_details.freshness, "as_of"));
  }
});

test("expanded details do not repeat collapsed interpretation", () => {
  for (const card of build().dashboard.sections) {
    const collapsed = new Set([
      card.headline,
      card.interpretation,
      card.silver_impact,
      card.operational_conclusion,
      card.primary_risk,
      card.required_confirmation,
    ].map(value => String(value).replace(/\s+/g, " ").trim().toLowerCase()));
    const expanded = scalarStrings(card.expandable_details);
    const duplicates = [...collapsed].filter(value => value && expanded.has(value));
    assert.deepEqual(duplicates, [], `${card.section_id} repeats ${duplicates}`);
  }
});

test("raw VIX statistics remain expandable and never lead the card", () => {
  const vix = build().dashboard.sections.find(
    card => card.section_id === "vix_volatility_environment"
  );
  assert.equal(Object.hasOwn(vix, "vix_level"), false);
  assert.equal(vix.expandable_details.metrics.vix_level, 24.5);
  assert.equal(vix.headline, "Current Regime · volatility expanding");
});

test("shadow evidence stays labeled and production-ineligible", () => {
  const result = build();
  const silver = result.dashboard.sections.find(
    card => card.section_id === "silver_intelligence"
  );
  assert.equal(silver.authority_label, "Shadow Observation");
  assert.equal(result.sections[5].action_bias, "no_operational_conclusion");
  assert.equal(result.sections[5].production_effect, "none");
});

test("performance contract adds no network calls or background jobs", () => {
  const performanceContract = build().dashboard.performance;
  assert.equal(performanceContract.cached_interpretation_preferred, true);
  assert.equal(performanceContract.source_objects_reused, true);
  assert.equal(performanceContract.network_calls_added, 0);
  assert.equal(performanceContract.background_jobs_added, 0);
});

test("operator-desk transformation remains lightweight", () => {
  const iterations = 200;
  const started = performance.now();
  let result;
  for (let index = 0; index < iterations; index += 1) result = build();
  const elapsed = performance.now() - started;
  assert.ok(elapsed < 1500, `operator transform took ${elapsed.toFixed(1)}ms`);
  assert.ok(JSON.stringify(result.dashboard).length < 100000);
});

test("one shared UI renderer preserves consistent cards and expansion", () => {
  const source = fs.readFileSync("app.py", "utf8");
  assert.ok(source.includes("def hel035_operator_card_html"));
  assert.ok(source.includes("def render_hel035_expandable"));
  assert.ok(source.includes('for card in dashboard["sections"]'));
  assert.ok(source.includes("Evidence, sources, and freshness"));
  assert.ok(source.includes("Silver Market Desk"));
  assert.equal((source.match(/def hel035_operator_card_html/g) || []).length, 1);
});

test("production card remains separate from operator-desk rendering", () => {
  const source = fs.readFileSync("app.py", "utf8");
  const productionCard = source.slice(
    source.indexOf("def card(row: pd.Series):"),
    source.indexOf("def driver_rows")
  );
  assert.equal(productionCard.includes("hel035"), false);
  assert.equal(productionCard.includes("Silver Market Desk"), false);
});
