import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const context = vm.createContext({console});
for (const file of [
  "src/12_SilverIntelligence.gs",
  "src/13_SilverIntelligenceBriefing.gs",
  "src/15_SilverVixVolatilityEnvironment.gs",
]) {
  vm.runInContext(fs.readFileSync(file, "utf8"), context);
}

const get = name => vm.runInContext(name, context);
const fixture = JSON.parse(
  fs.readFileSync("tests/fixtures/hel_035_vix_volatility_environment.json", "utf8"),
);

function history() {
  const rows = [];
  const start = Date.parse("2026-05-25T20:00:00.000Z");
  for (let index = 0; index < 60; index += 1) {
    rows.push({
      timestamp: new Date(start + index * 86400000).toISOString(),
      close: 12 + (index % 15),
    });
  }
  return rows;
}

function marketSnapshot(config, key, value) {
  if (value === undefined) return undefined;
  return {
    return: value,
    timestamp: config.evaluated_at || fixture.evaluated_at,
    interval: "1d",
    source: `${key} authorized fixture`,
    provider: "fixture_provider",
    evidence_state: "production_authoritative",
    quality: "high",
    provenance_pointer: `fixture://${key}`,
    market_session: {status: config.market_status || "open"},
  };
}

function snapshot(config) {
  if (config.unavailable) return {market_session:"new_york"};
  const value = {
    vix: {
      symbol: "VIX",
      level: config.level,
      previous_close: config.previous_close,
      timestamp: config.timestamp || "2026-07-24T13:55:00.000Z",
      interval: "5m",
      timezone: "America/New_York",
      source: "authorized VIX fixture",
      provider: "fixture_provider",
      evidence_state: "production_authoritative",
      quality: "high",
      provenance_pointer: "fixture://VIX",
      observation_type: config.observation_type || "intraday",
      expected_next_update: config.next_open,
      market_session: {
        status: config.market_status || "open",
        next_open: config.next_open,
      },
      history: history(),
    },
    equities: marketSnapshot(config, "equities", config.equity_return),
    silver: marketSnapshot(config, "silver", config.silver_return),
    market_session: "new_york",
  };
  if (config.vvix_level !== undefined) {
    value.vvix = {
      level: config.vvix_level,
      change: config.vvix_change,
      timestamp: config.timestamp || "2026-07-24T13:55:00.000Z",
      source: "authorized VVIX fixture",
      provider: "fixture_provider",
      evidence_state: "production_authoritative",
      quality: "high",
      market_session: {status: config.market_status || "open"},
      provenance_pointer: "fixture://VVIX",
    };
  }
  return value;
}

function build(config) {
  return get("hxSilverBuildVixVolatilityEnvironment_")(
    snapshot(config),
    config.evaluated_at || fixture.evaluated_at,
  );
}

test("all required VIX state, contradiction, and market-hours fixtures pass", () => {
  assert.equal(fixture.cases.length, 12);
  for (const item of fixture.cases) {
    const result = build(item);
    for (const [field, expected] of Object.entries(item.expected)) {
      if (field === "risk_appetite") {
        assert.equal(result.vix_volatility_environment.risk_appetite, expected, item.id);
      } else if (field === "cross_market_contains") {
        assert.match(result.vix_volatility_environment.cross_market_impact, new RegExp(expected), item.id);
      } else if (field === "silver_impact_contains") {
        assert.match(result.silver_impact, new RegExp(expected), item.id);
      } else if (field === "contradiction_contains") {
        assert.ok(result.vix_contradictions.contradictions.includes(expected), item.id);
      } else if (field === "supporting_vvix") {
        assert.equal(result.vix_volatility_environment.supporting_inputs.vvix !== null, expected, item.id);
      } else if (field === "observation_type") {
        assert.equal(result.vix_volatility_environment.data_freshness.vix_level.observation_type, expected, item.id);
      } else if (field === "live_claim_permitted") {
        assert.equal(result.vix_volatility_environment.data_freshness.vix_level.live_claim_permitted, expected, item.id);
      } else if (field === "freshness_reason") {
        assert.ok(result.reason_codes.includes(expected), item.id);
      } else {
        assert.equal(result[field], expected, `${item.id}.${field}`);
      }
    }
  }
});

test("VIX state uses empirical level and rate distributions", () => {
  const expansion = build(fixture.cases.find(item => item.id === "vix_expansion"));
  assert.ok(expansion.vix_volatility_environment.vix_percentile > 50);
  assert.ok(expansion.vix_volatility_environment.rate_of_change_percentile >= 60);
  assert.equal(expansion.current_state, "volatility expanding");

  const shock = build(fixture.cases.find(item => item.id === "volatility_shock"));
  assert.ok(shock.vix_volatility_environment.vix_percentile >= 90);
  assert.ok(shock.vix_volatility_environment.rate_of_change_percentile >= 90);
  assert.equal(shock.current_state, "volatility shock");
});

test("risk appetite requires cross-market confirmation when equities conflict", () => {
  const confirmed = build(fixture.cases.find(item => item.id === "vix_rising_equities_falling"));
  const conflict = build(fixture.cases.find(item => item.id === "vix_rising_equities_rising"));
  assert.equal(confirmed.vix_volatility_environment.risk_appetite, "defensive positioning increasing");
  assert.equal(conflict.vix_volatility_environment.risk_appetite, "risk conditions mixed");
  assert.ok(conflict.vix_contradictions.contradictions.includes("VIX is rising while equities are rising."));
  assert.notEqual(confirmed.vix_volatility_environment.cross_market_impact, conflict.vix_volatility_environment.cross_market_impact);
});

test("silver impact distinguishes resilience, liquidation risk, and decoupling", () => {
  const resilient = build(fixture.cases.find(item => item.id === "silver_resilient_vix_expansion"));
  const liquidating = build(fixture.cases.find(item => item.id === "silver_liquidating_vix_expansion"));
  assert.match(resilient.silver_impact, /resisting broader risk deterioration/);
  assert.match(liquidating.silver_impact, /Liquidation risk is elevated/);
  assert.equal(liquidating.action_bias, "liquidation_risk_elevated");
  assert.notEqual(resilient.silver_impact, liquidating.silver_impact);
});

test("VVIX and term-structure evidence remain optional and cannot be invented", () => {
  const without = build(fixture.cases.find(item => item.id === "vix_expansion"));
  assert.equal(without.vix_volatility_environment.supporting_inputs.vvix, null);
  assert.equal(without.vix_volatility_environment.supporting_inputs.vix_term_structure, null);
  assert.ok(without.limitations.includes("VVIX unavailable"));
  assert.ok(without.limitations.includes("VIX term structure unavailable"));

  const disagreement = build(fixture.cases.find(item => item.id === "vix_vvix_disagreement"));
  assert.notEqual(disagreement.vix_volatility_environment.supporting_inputs.vvix, null);
  assert.ok(disagreement.vix_contradictions.contradictions.includes("VIX and VVIX direction disagree."));
});

test("prior close is current only for a closed session and is never labeled live", () => {
  const result = build(fixture.cases.find(item => item.id === "prior_close_outside_market_hours"));
  const freshness = result.vix_volatility_environment.data_freshness.vix_level;
  assert.equal(freshness.observation_type, "prior_close");
  assert.equal(freshness.freshness_status, "current");
  assert.equal(freshness.live_claim_permitted, false);
  assert.ok(result.reason_codes.includes("VIX_PRIOR_CLOSE_MARKET_CLOSED"));
  assert.ok(result.reason_codes.includes("VIX_NOT_LABELED_LIVE"));
});

test("stale and unavailable VIX cannot create a current operational conclusion", () => {
  const stale = build(fixture.cases.find(item => item.id === "vix_stale"));
  const unavailable = build(fixture.cases.find(item => item.id === "vix_unavailable"));
  assert.equal(stale.current_state, "stale");
  assert.equal(stale.action_bias, "no_operational_conclusion");
  assert.equal(unavailable.current_state, "unavailable");
  assert.equal(unavailable.action_bias, "no_operational_conclusion");
  assert.equal(unavailable.confidence_score, null);
  assert.equal(unavailable.confidence_label, "unavailable");
});

test("long, short, dashboard, notification preview, and JSON cannot contradict", () => {
  const result = build(fixture.cases.find(item => item.id === "silver_resilient_vix_expansion"));
  assert.ok(result.long_summary.includes(result.current_state));
  assert.ok(result.long_summary.includes(result.silver_impact));
  assert.ok(result.short_summary.includes(result.current_state));
  assert.ok(result.short_summary.includes(result.silver_impact));
  assert.equal(result.dashboard_summary.headline, "VIX — Volatility Environment");
  assert.equal(result.dashboard_summary.primary_state, result.current_state);
  assert.equal(result.dashboard_summary.risk_appetite, result.vix_volatility_environment.risk_appetite);
  assert.equal(result.dashboard_summary.silver_impact, result.silver_impact);
  assert.equal(result.dashboard_summary.action_bias, result.action_bias);
  assert.equal(result.dashboard_summary.confidence_score, result.confidence_score);
  assert.equal(result.dashboard_summary.confidence_label, result.confidence_label);
  assert.equal(result.telegram_summary, null);
  assert.ok(result.notification_preview.includes(result.current_state));
  assert.ok(result.notification_preview.includes(result.silver_impact));
  const lines = result.long_summary.split("\n");
  assert.deepEqual(lines.slice(-4).map(line => line.split(":")[0]), [
    "Action Bias",
    "Primary Risk",
    "Required Confirmation",
    "Confidence",
  ]);
  const serialized = get("hxSilverSerializeInterpretation_")(result);
  assert.equal(serialized, get("hxSilverSerializeInterpretation_")(result));
});

test("confidence remains qualitative unless authoritative precision already exists", () => {
  const base = fixture.cases.find(item => item.id === "vix_expansion");
  const result = build(base);
  assert.equal(result.confidence_score, null);

  const unsupported = snapshot(base);
  unsupported.numeric_confidence = {
    score: 91,
    basis: "model opinion",
    source_evidence_state: "production_authoritative",
  };
  const withheld = get("hxSilverBuildVixVolatilityEnvironment_")(unsupported, fixture.evaluated_at);
  assert.equal(withheld.confidence_score, null);
  assert.ok(withheld.confidence_basis.some(row => row.code === "NUMERIC_CONFIDENCE_WITHHELD"));
});

test("VIX never creates automatic bullish or bearish silver language", () => {
  for (const item of fixture.cases) {
    const rendered = JSON.stringify(build(item)).toLowerCase();
    assert.equal(rendered.includes("silver bullish"), false, item.id);
    assert.equal(rendered.includes("silver bearish"), false, item.id);
    assert.equal(/\bbuy silver\b|\bsell silver\b/.test(rendered), false, item.id);
  }
});

test("the VIX adapter is inactive, read-only, and disconnected from delivery", () => {
  assert.throws(
    () => get("hxSilverVixVolatilityEnvironmentPreview_")(snapshot(fixture.cases[0]), fixture.evaluated_at),
    /HEL035_INTERNAL_PREVIEW_DISABLED/,
  );
  const source = fs.readFileSync("src/15_SilverVixVolatilityEnvironment.gs", "utf8");
  for (const forbidden of [
    /\bSpreadsheetApp\b/,
    /\bhxAtomicReplace_\b/,
    /\bScriptApp\b/,
    /\bsendNotification\s*\(/,
    /\binstallTriggers\s*\(/,
  ]) {
    assert.equal(forbidden.test(source), false);
  }
});
