import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const context = vm.createContext({console});
for (const file of [
  "src/12_SilverIntelligence.gs",
  "src/13_SilverIntelligenceBriefing.gs",
  "src/14_SilverMonetaryEnvironment.gs",
]) {
  vm.runInContext(fs.readFileSync(file, "utf8"), context);
}

const get = name => vm.runInContext(name, context);
const fixture = JSON.parse(
  fs.readFileSync("tests/fixtures/hel_035_monetary_environment.json", "utf8"),
);

function fredRows(config) {
  const prior = {
    Date: "2026-07-23T00:00:00.000Z",
    US2Y: 4.0,
    US5Y: 4.1,
    US10Y: 4.2,
    US30Y: 4.4,
    REAL10Y: 1.8,
    Source: "FRED public CSV",
  };
  const change = config.nominal_change ?? 0;
  const latest = {
    Date: "2026-07-24T00:00:00.000Z",
    US2Y: prior.US2Y + change,
    US5Y: prior.US5Y + change,
    US10Y: prior.US10Y + change,
    US30Y: prior.US30Y + change,
    REAL10Y: config.omit_real_yield ? "" : prior.REAL10Y + (config.real_change ?? 0),
    Source: "FRED public CSV",
  };
  return [prior, latest];
}

function cftcRows(config) {
  const reportDate = config.cot_report_date || "2026-07-18T00:00:00.000Z";
  const priorDate = new Date(new Date(reportDate).getTime() - 7 * 86400000).toISOString();
  const priorOi = 100000;
  const currentOi = Math.round(priorOi * (1 + (config.oi_change_pct ?? 0.01)));
  const managedChange = config.managed_change ?? 1000;
  const priorManaged = 19000;
  const currentManaged = priorManaged + managedChange;
  const make = (date, oi, managed, offset = 0) => ({
    "Report Date": date,
    Instrument: "XAGUSD",
    "Open Interest": oi,
    "Commercial Long": 30000 + offset,
    "Commercial Short": 50000,
    "Managed Money Long": 60000 + managed + offset,
    "Managed Money Short": 60000,
    "Pulled At": "2026-07-24T12:00:00.000Z",
    "Report Type": "legacy",
    Market: "SILVER - COMMODITY EXCHANGE INC.",
    Source: "CFTC public report",
  });
  const rows = [
    make(priorDate, priorOi, priorManaged),
    make(reportDate, currentOi, currentManaged),
  ];
  for (let index = 2; index < 7; index += 1) {
    rows.push(make(
      new Date(new Date(priorDate).getTime() - (index - 1) * 7 * 86400000).toISOString(),
      98000 - index * 500,
      15000 - index * 500,
      -index * 100,
    ));
  }
  return rows;
}

function snapshot(config) {
  if (config.all_unavailable) {
    return {
      Calculated_Signals: [],
      FRED_Raw: [],
      CFTC_Raw: [],
      market: {},
      market_session: "new_york",
    };
  }
  const signals = config.omit_dollar_signal ? [] : [{
    "As Of": "2026-07-24T13:55:00.000Z",
    Instrument: "XAGUSD",
    Factor: "DXY",
    "Normalized Signal": config.dollar_signal ?? 0,
    Source: "TradingView webhook",
    Quality: "fresh",
    Confidence: 90,
  }];
  const value = {
    Calculated_Signals: signals,
    FRED_Raw: fredRows(config),
    CFTC_Raw: config.omit_cftc ? [] : cftcRows(config),
    market: {
      silver_return: config.silver_return ?? 0,
      timestamp: "2026-07-24T13:58:00.000Z",
      interval: "1d",
      source: "current production silver market",
      provider: "authenticated production snapshot",
      provenance_pointer: "production://silver/current",
    },
    market_session: "new_york",
  };
  if (config.dollar_proxy_signal !== undefined) {
    value.dollar_proxy = {
      "As Of": "2026-07-24T12:00:00.000Z",
      signal: config.dollar_proxy_signal,
      Source: "Legacy v4.7 Signal_Engine",
    };
  }
  return value;
}

function build(config) {
  return get("hxSilverBuildMonetaryEnvironment_")(
    snapshot(config),
    fixture.evaluated_at,
  );
}

test("all required monetary scenarios produce their declared deterministic state", () => {
  assert.equal(fixture.cases.length, 14);
  for (const item of fixture.cases) {
    const result = build(item);
    const expected = item.expected;
    for (const [field, value] of Object.entries(expected)) {
      if (field === "dollar_pressure") {
        assert.equal(result.monetary_environment.dollar_pressure, value, item.id);
      } else if (field === "real_yield_pressure") {
        assert.equal(result.monetary_environment.real_yield_pressure, value, item.id);
      } else if (field === "open_interest") {
        assert.equal(result.monetary_environment.open_interest, value, item.id);
      } else if (field === "participation_contains") {
        assert.match(result.monetary_environment.participation_quality, new RegExp(value), item.id);
      } else if (field === "impact_contains") {
        assert.match(result.silver_impact, new RegExp(value), item.id);
      } else if (field === "cot_freshness") {
        assert.equal(result.monetary_environment.data_freshness.positioning.freshness_status, value, item.id);
      } else if (field === "limitation_contains") {
        assert.ok(result.limitations.includes(value), item.id);
      } else if (field === "dollar_proxy") {
        assert.equal(result.monetary_environment.data_freshness.dollar_pressure.proxy, value, item.id);
      } else if (field === "reason_code") {
        assert.ok(result.reason_codes.includes(value), `${item.id}: ${value}`);
      } else if (field === "contradiction_contains") {
        assert.ok(result.monetary_contradictions.secondary_conflicts.includes(value), item.id);
      } else if (field === "contradiction_status") {
        assert.equal(result.monetary_contradictions.status, value, item.id);
      } else {
        assert.equal(result[field], value, `${item.id}.${field}`);
      }
    }
  }
});

test("nominal yields preserve front, intermediate, long-end, and curve distinctions", () => {
  const result = build({
    dollar_signal: 0,
    nominal_change: 0.04,
    real_change: 0,
    silver_return: 0,
    oi_change_pct: 0,
  });
  assert.deepEqual(
    JSON.parse(JSON.stringify(result.monetary_environment.nominal_yield_segments)),
    {front_end:"rising", intermediate:"rising", long_end:"rising"},
  );
  assert.match(result.monetary_environment.nominal_yield_pressure, /parallel rise/);
  assert.ok(result.monetary_environment.yield_curve_state);
});

test("COT is always dated, explicitly lagged, and never represented as live", () => {
  const result = build(fixture.cases[0]);
  assert.match(result.monetary_environment.cot_context, /dated 2026-07-18/);
  assert.match(result.monetary_environment.cot_context, /weekly publication lag applies/);
  assert.ok(result.limitations.includes("weekly futures positioning is not live"));
  assert.ok(result.reason_codes.includes("COT_PUBLICATION_LAG"));
});

test("the four price/open-interest states use cautious participation language", () => {
  for (const id of [
    "price_rising_oi_rising",
    "price_rising_oi_falling",
    "price_falling_oi_rising",
    "price_falling_oi_falling",
  ]) {
    const result = build(fixture.cases.find(item => item.id === id));
    const rendered = JSON.stringify(result).toLowerCase();
    assert.equal(rendered.includes("accumulation"), false, id);
    assert.equal(rendered.includes("institutional participation"), false, id);
  }
});

test("monetary contradictions name the dominant evidence and secondary conflict", () => {
  const result = build(fixture.cases.find(item => item.id === "contradictory_yields"));
  assert.notEqual(result.monetary_contradictions.dominant_driver, "none");
  assert.ok(result.monetary_contradictions.secondary_conflicts.length);
  assert.equal(result.monetary_contradictions.confidence_impact, "reduce one level");
  assert.match(result.required_confirmation, /persists while the identified conflict resolves/);
});

test("long, short, dashboard, and JSON preserve one authoritative conclusion", () => {
  const result = build(fixture.cases.find(item => item.id === "silver_resilience_restrictive"));
  assert.ok(result.long_summary.includes(result.current_state));
  assert.ok(result.long_summary.includes(result.silver_impact));
  assert.ok(result.short_summary.includes(result.current_state));
  assert.ok(result.short_summary.includes(result.silver_impact));
  assert.equal(result.dashboard_summary.headline, `Monetary Environment — ${result.current_state}`);
  assert.equal(result.dashboard_summary.silver_impact, result.silver_impact);
  assert.equal(result.dashboard_summary.action_bias, result.action_bias);
  assert.equal(result.dashboard_summary.confidence_label, result.confidence_label);
  assert.equal(result.dashboard_summary.confidence_score, result.confidence_score);
  assert.equal(result.telegram_summary, null);
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

test("confidence remains qualitative unless a supported authoritative score is supplied", () => {
  const result = build(fixture.cases.find(item => item.id === "easing_dollar_and_real_yields"));
  assert.equal(result.confidence_score, null);
  assert.ok(["low", "moderate", "high", "very high"].includes(result.confidence_label));

  const unsupported = snapshot(fixture.cases[1]);
  unsupported.numeric_confidence = {
    score: 93,
    basis: "model opinion",
    source_evidence_state: "production_authoritative",
  };
  const withheld = get("hxSilverBuildMonetaryEnvironment_")(unsupported, fixture.evaluated_at);
  assert.equal(withheld.confidence_score, null);
  assert.ok(withheld.confidence_basis.some(row => row.code === "NUMERIC_CONFIDENCE_WITHHELD"));
});

test("freshness disclosure retains every timestamp, proxy, stale, and unavailable state", () => {
  const stale = build(fixture.cases.find(item => item.id === "stale_cot"));
  const disclosure = stale.monetary_environment.data_freshness;
  for (const metric of [
    "dollar_pressure",
    "nominal_yield_pressure",
    "real_yield_pressure",
    "yield_curve_state",
    "positioning",
    "open_interest",
    "silver_response",
  ]) {
    assert.ok(Object.hasOwn(disclosure, metric), metric);
  }
  assert.equal(disclosure.positioning.freshness_status, "stale");
  assert.equal(stale.freshness_status, "current");

  const missing = build(fixture.cases.find(item => item.id === "real_yields_missing"));
  assert.equal(
    missing.monetary_environment.data_freshness.real_yield_pressure.source_status,
    "unavailable",
  );
});

test("source provenance uses only mapped repository-native production contracts", () => {
  const result = build(fixture.cases[0]);
  assert.deepEqual(
    JSON.parse(JSON.stringify(result.source_provenance.source_contracts)),
    ["Calculated_Signals", "FRED_Raw", "CFTC_Raw", "current silver market snapshot"],
  );
  assert.ok(result.source_provenance.provenance_pointers.includes("Calculated_Signals:XAGUSD|DXY"));
  assert.ok(result.source_provenance.provenance_pointers.includes("FRED_Raw:REAL10Y/DFII10"));
  assert.ok(result.source_provenance.provenance_pointers.includes("CFTC_Raw:XAGUSD:open_interest"));
});

test("Monetary Environment remains inactive and has no mutation or delivery API", () => {
  assert.throws(
    () => get("hxSilverMonetaryEnvironmentPreview_")(snapshot(fixture.cases[0]), fixture.evaluated_at),
    /HEL035_INTERNAL_PREVIEW_DISABLED/,
  );
  const source = fs.readFileSync("src/14_SilverMonetaryEnvironment.gs", "utf8");
  for (const forbidden of [
    /\bSpreadsheetApp\b/,
    /\bhxAtomicReplace_\b/,
    /\bsendNotification\s*\(/,
    /\binstallTriggers\s*\(/,
    /\bScriptApp\b/,
  ]) {
    assert.equal(forbidden.test(source), false);
  }
});
