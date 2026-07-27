import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const context = vm.createContext({console});
for (const file of [
  "src/12_SilverIntelligence.gs",
  "src/13_SilverIntelligenceBriefing.gs",
  "src/16_SilverLiquidityEnvironment.gs",
]) {
  vm.runInContext(fs.readFileSync(file, "utf8"), context);
}

const get = name => vm.runInContext(name, context);
const fixture = JSON.parse(
  fs.readFileSync("tests/fixtures/hel_035_liquidity_environment.json", "utf8"),
);

function capability(profile) {
  if (profile === "none") return undefined;
  const common = {
    provider_name: "approved_fixture_provider",
    provider_version: "1.0",
    connection_status: "connected",
    exchange: "COMEX",
    instrument: "SI",
    contract: "SIU26",
    licensing_state: "fixture_only",
    quality_status: "high",
    last_update: "2026-07-24T13:59:55.000Z",
    latency_ms: 5,
    delay_seconds: 0,
  };
  if (profile === "failed") {
    return {
      ...common,
      connection_status: "failed",
      data_type: [],
      depth_levels: null,
      quality_status: "failed",
    };
  }
  if (profile === "level1") {
    return {
      ...common,
      data_type: ["level_1", "live_depth"],
      depth_levels: 1,
    };
  }
  if (profile === "mbp" || profile === "stale") {
    return {
      ...common,
      data_type: ["level_1", "level_2", "market_by_price", "live_depth", "executed_trades"],
      depth_levels: 10,
      market_by_price: true,
      trade_tape: true,
      last_update: profile === "stale" ? "2026-07-24T13:55:00.000Z" : common.last_update,
    };
  }
  if (profile === "delayed") {
    return {
      ...common,
      data_type: ["level_1", "level_2", "market_by_price", "delayed_depth", "executed_trades"],
      depth_levels: 10,
      market_by_price: true,
      delayed_depth: true,
      trade_tape: true,
      delay_seconds: 900,
    };
  }
  const native = profile === "native";
  return {
    ...common,
    data_type: [
      "level_1",
      "level_2",
      "market_by_price",
      "market_by_order",
      "live_depth",
      "executed_trades",
      ...(native ? ["provider_native_events"] : []),
    ],
    depth_levels: 20,
    market_by_price: true,
    market_by_order: true,
    trade_tape: true,
    iceberg_native: native,
  };
}

function evidence(kind) {
  if (!kind) return [];
  return [{
    event_id: `${kind}-1`,
    event_kind: "iceberg_detection",
    timestamp: "2026-07-24T13:59:56.000Z",
    price: 31.25,
    size: 125,
    side: "bid",
    source: "approved_fixture_provider",
    contract: "SIU26",
    confidence: 82,
    detection_status: kind === "native_iceberg" ? "native" : "inferred",
    detection_method: kind === "native_iceberg" ? "provider_native" : "fixture_inference",
    freshness: "current",
    reason_codes: [],
    provenance_pointer: `fixture://${kind}`,
  }];
}

function input(item) {
  const cap = capability(item.profile);
  const contractValue = item.missing_contract ? null : (item.contract || "SIU26");
  return {
    capability: cap,
    contract: {
      instrument: "SI",
      exchange: "COMEX",
      contract: contractValue,
      execution_contract: contractValue,
      front_month: "SIU26",
      expiration: "2026-08-27T00:00:00.000Z",
      rollover_status: item.rollover_status || "stable",
      volume_migration_status: "not_evaluated",
      open_interest_migration_status: "not_evaluated",
    },
    evidence: evidence(item.event),
    market_session: "new_york",
  };
}

function build(item) {
  return get("hxSilverBuildLiquidityEnvironment_")(input(item), fixture.evaluated_at);
}

test("all required provider, capability, contract, and freshness fixtures pass", () => {
  assert.equal(fixture.cases.length, 13);
  for (const item of fixture.cases) {
    const result = build(item);
    const event = result.underlying_metrics[0];
    const claim = event
      ? get("hxLiquidityClaim_")(event, result.liquidity_environment.capability)
      : null;
    for (const [field, expected] of Object.entries(item.expected)) {
      if (field === "provider_status") {
        assert.equal(result.liquidity_environment.provider_status, expected, item.id);
      } else if (field === "level_1" || field === "level_2" ||
          field === "market_by_price" || field === "market_by_order") {
        assert.equal(result.liquidity_environment.capability[field], expected, item.id);
      } else if (field === "resting_liquidity_permission") {
        assert.equal(result.liquidity_environment.capability_permissions.resting_liquidity, expected, item.id);
      } else if (field === "order_events_permission") {
        assert.equal(result.liquidity_environment.capability_permissions.order_events, expected, item.id);
      } else if (field === "reason_code") {
        assert.ok(result.reason_codes.includes(expected), `${item.id}: ${expected}`);
      } else if (field === "event_permitted") {
        assert.equal(event.capability_permitted, expected, item.id);
      } else if (field === "claim_permitted") {
        assert.equal(claim.permitted, expected, item.id);
      } else if (field === "claim_text") {
        assert.equal(claim.text, expected, item.id);
      } else {
        assert.equal(result[field], expected, `${item.id}.${field}`);
      }
    }
  }
});

test("provider-neutral interface requires every method without invoking adapters", () => {
  const methods = get("HX_LIQUIDITY_PROVIDER_METHODS");
  const adapter = Object.fromEntries(Array.from(methods, method => [method, () => {
    throw new Error("must not be invoked");
  }]));
  const valid = get("hxLiquidityProviderInterface_")(adapter);
  assert.equal(valid.valid, true);
  assert.equal(valid.invoked, false);
  assert.equal(valid.required_methods.length, 12);

  delete adapter.replay;
  const invalid = get("hxLiquidityProviderInterface_")(adapter);
  assert.equal(invalid.valid, false);
  assert.ok(invalid.missing_methods.includes("replay"));
});

test("capability model keeps depth and event classes distinct", () => {
  const level1 = get("hxLiquidityCapability_")(capability("level1"));
  assert.equal(level1.level_1, true);
  assert.equal(level1.level_2, false);
  assert.equal(level1.market_by_price, false);
  assert.equal(level1.market_by_order, false);
  assert.equal(level1.trade_tape, false);

  const mbo = get("hxLiquidityCapability_")(capability("mbo"));
  assert.equal(mbo.level_2, true);
  assert.equal(mbo.market_by_price, true);
  assert.equal(mbo.market_by_order, true);
  assert.equal(mbo.live_depth, true);
  assert.equal(mbo.synthetic_depth, false);
  assert.equal(mbo.trade_tape, true);
});

test("all typed liquidity event kinds preserve required audit fields", () => {
  const kinds = get("HX_LIQUIDITY_EVENT_KINDS");
  const cap = get("hxLiquidityCapability_")(capability("native"));
  assert.equal(kinds.length, 17);
  for (const [index, kind] of Array.from(kinds).entries()) {
    const status = ["absorption", "iceberg_detection"].includes(kind) ? "native" : "observed";
    const item = get("hxLiquidityEvidence_")({
      event_id: `event-${index}`,
      event_kind: kind,
      timestamp: "2026-07-24T13:59:56.000Z",
      price: 31.25,
      size: 100 + index,
      side: "bid",
      source: "approved_fixture_provider",
      contract: "SIU26",
      confidence: 80,
      detection_status: status,
      detection_method: status === "native" ? "provider_native" : "observed_feed_event",
      freshness: "current",
      reason_codes: ["FIXTURE"],
      provenance_pointer: `fixture://${kind}`,
    }, cap);
    assert.equal(item.event_kind, kind);
    assert.equal(item.contract, "SIU26");
    assert.equal(item.confidence, 80);
    assert.ok(item.timestamp);
    assert.ok(item.detection_method);
    assert.ok(Array.isArray(item.reason_codes));
  }
});

test("inferred and native detections receive different safe language", () => {
  const inferredCap = get("hxLiquidityCapability_")({
    ...capability("mbo"),
    data_type: [...capability("mbo").data_type, "inferred_events"],
    iceberg_inferred: true,
  });
  const inferred = get("hxLiquidityEvidence_")({
    ...evidence("inferred_iceberg")[0],
    source: "approved_fixture_provider",
  }, inferredCap);
  const inferredClaim = get("hxLiquidityClaim_")(inferred, inferredCap);
  assert.equal(inferredClaim.permitted, true);
  assert.equal(inferredClaim.text, "Suspected iceberg behavior.");
  assert.equal(inferredClaim.native_or_inferred, "inferred");

  const nativeCap = get("hxLiquidityCapability_")(capability("native"));
  const native = get("hxLiquidityEvidence_")(evidence("native_iceberg")[0], nativeCap);
  const nativeClaim = get("hxLiquidityClaim_")(native, nativeCap);
  assert.equal(nativeClaim.text, "Provider-native iceberg event detected.");
  assert.equal(nativeClaim.native_or_inferred, "native");
});

test("claim safety rejects unsupported institutional certainty", () => {
  const safe = get("hxLiquidityAssertClaimSafe_");
  for (const phrase of [
    "institutional buyers are accumulating",
    "institutional sellers are distributing",
    "iceberg buying is present",
    "iceberg selling is present",
    "large liquidity is defending price",
    "spoofing is occurring",
    "absorption is confirmed",
  ]) {
    assert.throws(() => safe(phrase), /Unsupported liquidity claim/);
  }
  for (const phrase of [
    "Inferred absorption observed.",
    "Possible replenishment observed.",
    "Suspected iceberg behavior.",
    "Liquidity concentration observed.",
    "Spoofing risk detected.",
  ]) {
    assert.equal(safe(phrase), phrase);
  }
});

test("COMEX contract model never combines books and preserves XAGUSD limits", () => {
  const contract = get("hxLiquidityContract_")({
    instrument: "SI",
    exchange: "COMEX",
    contract: "SIU26",
    execution_contract: "SIU26",
    front_month: "SIU26",
    rollover_status: "monitoring",
  });
  assert.equal(contract.target_instrument, "XAGUSD");
  assert.equal(contract.institutional_reference, "COMEX Silver");
  assert.equal(contract.order_books_combined, false);
  assert.ok(contract.relationship_limitations.some(value => value.includes("not the complete global silver market")));
  assert.throws(() => get("hxLiquidityContract_")({
    instrument:"SI",
    exchange:"COMEX",
    contract:"SIU26",
    order_books_combined:true,
  }), /cannot be combined/);
});

test("unavailable is neither neutral nor zero", () => {
  const result = build(fixture.cases.find(item => item.id === "no_provider_connected"));
  const detail = result.liquidity_environment;
  for (const field of [
    "resting_liquidity",
    "aggressive_buyers",
    "aggressive_sellers",
    "absorption",
    "iceberg_activity",
    "liquidity_migration",
    "liquidity_bias",
    "institutional_participation",
  ]) {
    assert.equal(detail[field], null, field);
  }
  assert.notEqual(result.current_state, "balanced liquidity");
  assert.equal(result.silver_impact, "No liquidity interpretation is authorized.");
  assert.equal(result.action_bias, "no_operational_conclusion");
  assert.equal(result.confidence_score, null);
  assert.equal(result.confidence_label, "unavailable");
});

test("unavailable long, short, and dashboard outputs are consistent and restrained", () => {
  const result = build(fixture.cases.find(item => item.id === "no_provider_connected"));
  assert.match(result.long_summary, /Institutional order-book data is not yet connected/);
  assert.match(result.long_summary, /No resting-liquidity, absorption, iceberg, or execution-flow interpretation is authorized/);
  assert.match(result.long_summary, /Current State: Unavailable/);
  assert.match(result.long_summary, /Action Bias: No operational conclusion/);
  assert.equal(result.short_summary, "Liquidity: Order-book provider not connected.");
  assert.equal(result.dashboard_summary.headline, "Liquidity Environment");
  assert.equal(result.dashboard_summary.primary_display, "Waiting for institutional order-book provider.");
  assert.equal(result.dashboard_summary.expandable.no_false_neutrality, true);
  assert.equal(result.dashboard_summary.expandable.interpretation_available, false);
  assert.equal(result.telegram_summary, null);
});

test("future ingestion and retention boundaries remain disabled and empty", () => {
  const ingestion = get("HX_LIQUIDITY_INGESTION_BOUNDARY");
  const retention = get("HX_LIQUIDITY_RETENTION_MODEL");
  assert.equal(ingestion.enabled, false);
  assert.equal(ingestion.listeners_created, false);
  assert.equal(ingestion.credentials_defined, false);
  assert.equal(ingestion.network_access, false);
  assert.equal(ingestion.modes.length, 9);
  assert.equal(retention.empty_files_created, false);
});

test("Liquidity Environment preview is disabled and source has no runtime integration", () => {
  assert.throws(
    () => get("hxSilverLiquidityEnvironmentPreview_")({}, fixture.evaluated_at),
    /HEL035_INTERNAL_PREVIEW_DISABLED/,
  );
  const source = fs.readFileSync("src/16_SilverLiquidityEnvironment.gs", "utf8");
  for (const forbidden of [
    /\bSpreadsheetApp\b/,
    /\bUrlFetchApp\b/,
    /\bWebSocket\b/,
    /\bhxAtomicReplace_\b/,
    /\bScriptApp\b/,
    /\bsendNotification\s*\(/,
    /\binstallTriggers\s*\(/,
  ]) {
    assert.equal(forbidden.test(source), false);
  }
});
