import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const context = vm.createContext({console});
vm.runInContext(fs.readFileSync("src/12_SilverIntelligence.gs", "utf8"), context);
vm.runInContext(fs.readFileSync("src/13_SilverIntelligenceBriefing.gs", "utf8"), context);

const get = name => vm.runInContext(name, context);
const fixtures = JSON.parse(fs.readFileSync("tests/fixtures/hel_035_silver_core.json", "utf8"));

function evidenceFromFixture(raw, index = 0) {
  return get("hxSilverEvidence_")({
    evidence_id: raw.metric + "-" + index,
    evidence_kind: raw.kind,
    canonical_metric: raw.metric,
    value: raw.value ?? 1,
    unit: raw.unit || "state",
    direction: raw.direction || "up",
    silver_relationship: raw.relationship,
    reference_interval: raw.interval || "1d",
    timestamp: raw.timestamp || "2026-07-24T13:45:00.000Z",
    source: raw.source || "HEL-035 fixture",
    provider: raw.provider || "fixture_provider",
    evidence_state: raw.evidence_state || "production_authoritative",
    source_status: raw.source_status || "available",
    freshness_status: raw.freshness_status || "current",
    quality: raw.quality || "high",
    provider_quality: raw.provider_quality || "high",
    interpretive_weight: raw.weight ?? 1,
    reason_codes: raw.reason_codes || [],
    limitations: raw.limitations || [],
    provenance_pointer: `fixture://${raw.metric}`,
    transformations: ["fixture normalization"],
    approved_uses: raw.approved_uses || []
  });
}

function buildFixture(fixture) {
  const evidence = fixture.evidence.map(evidenceFromFixture);
  return get("hxSilverBuildInterpretation_")({
    section_id: fixture.section_id,
    section_name: fixture.section_name,
    as_of: fixtures.evaluated_at,
    market_session: "new_york",
    current_state: fixture.current_state,
    evidence,
    completeness: fixture.completeness,
    provider_agreement: fixture.provider_agreement,
    numeric_confidence: fixture.numeric_confidence,
    limitations: fixture.limitations,
    reason_codes: fixture.reason_codes,
    missing_metrics: fixture.missing_metrics
  });
}

test("all required degraded-state fixtures build and meet their declared contract", () => {
  assert.equal(fixtures.cases.length, 17);
  for (const fixture of fixtures.cases) {
    if (fixture.freshness_case) {
      const freshness = get("hxSilverResolveFreshness_")(fixture.freshness_case);
      assert.equal(freshness.status, fixture.expected.freshness_resolver, fixture.id);
    }
    const result = buildFixture(fixture);
    const validation = get("hxSilverValidateInterpretation_")(result);
    assert.equal(validation.ok, true, `${fixture.id}: ${validation.errors}`);
    for (const [field, expected] of Object.entries(fixture.expected)) {
      if (field === "freshness_resolver") continue;
      if (field === "contradiction_status") assert.equal(result.contradiction.status, expected, fixture.id);
      else assert.equal(result[field], expected, `${fixture.id}.${field}`);
    }
  }
});

test("the discriminated evidence contract covers every required evidence kind", () => {
  const kinds = get("HX_SILVER_EVIDENCE_KINDS");
  assert.equal(kinds.length, 21);
  for (const [index, kind] of Array.from(kinds).entries()) {
    const item = evidenceFromFixture({metric:`metric_${kind}`, kind, relationship:"observation only"}, index);
    assert.equal(item.evidence_kind, kind);
    assert.equal(item.target_instrument, "XAGUSD");
    assert.ok(Object.isFrozen(item));
  }
});

test("authority resolver enforces every authority class and use boundary", () => {
  const resolve = get("hxSilverResolveAuthority_");
  const production = resolve({evidence_state:"production_authoritative",source_status:"available",freshness_status:"current"});
  assert.ok(Object.values(production.permissions).every(Boolean));

  const validated = resolve({evidence_state:"validated",source_status:"available",freshness_status:"current"});
  assert.equal(validated.permissions.contextual_interpretation, true);
  assert.equal(validated.permissions.confidence, true);
  assert.equal(validated.permissions.action_bias, false);
  const approvedValidated = resolve({evidence_state:"validated",source_status:"available",freshness_status:"current",approved_uses:["action_bias"]});
  assert.equal(approvedValidated.permissions.action_bias, true);

  const shadow = resolve({evidence_state:"shadow",source_status:"available",freshness_status:"current"});
  assert.equal(shadow.permissions.contextual_interpretation, true);
  assert.equal(shadow.permissions.confidence, false);
  assert.equal(shadow.permissions.action_bias, false);
  assert.equal(shadow.permissions.notification, false);
  assert.equal(shadow.permissions.production_decision, false);

  const researchHidden = resolve({evidence_state:"research_only",source_status:"available",freshness_status:"current"});
  assert.equal(researchHidden.permissions.display, false);
  const researchInternal = resolve({evidence_state:"research_only",source_status:"available",freshness_status:"current",internal_preview:true});
  assert.equal(researchInternal.permissions.contextual_interpretation, true);

  const placeholder = resolve({evidence_state:"placeholder",source_status:"unavailable",freshness_status:"unknown"});
  assert.equal(placeholder.permissions.contextual_interpretation, false);
  assert.equal(placeholder.permissions.production_decision, false);

  const blocked = resolve({evidence_state:"shadow",source_status:"blocked",freshness_status:"unknown"});
  assert.equal(blocked.permissions.contextual_interpretation, false);
  assert.ok(blocked.reason_codes.includes("SOURCE_BLOCKED"));

  const stale = resolve({evidence_state:"production_authoritative",source_status:"available",freshness_status:"stale"});
  assert.equal(stale.permissions.confidence, false);
  assert.equal(stale.permissions.action_bias, false);
});

test("freshness policies are source-specific, session-aware, and deterministic", () => {
  const resolve = get("hxSilverResolveFreshness_");
  const live = resolve({policy_id:"live_market",observation_timestamp:"2026-07-24T13:50:00Z",evaluated_at:"2026-07-24T14:00:00Z"});
  assert.equal(live.status, "current");
  const etf = resolve({policy_id:"delayed_etf",observation_timestamp:"2026-07-24T11:00:00Z",evaluated_at:"2026-07-24T14:00:00Z"});
  assert.equal(etf.status, "delayed");
  const fred = resolve({policy_id:"fred_daily",observation_timestamp:"2026-07-21T14:00:00Z",evaluated_at:"2026-07-24T14:00:00Z"});
  assert.equal(fred.status, "delayed");
  const cot = resolve({policy_id:"cot_weekly",observation_timestamp:"2026-07-14T20:00:00Z",evaluated_at:"2026-07-24T14:00:00Z"});
  assert.equal(cot.status, "delayed");
  const shadowDaily = resolve({policy_id:"hel034_daily_shadow",observation_timestamp:"2026-07-19T14:00:00Z",evaluated_at:"2026-07-24T14:00:00Z"});
  assert.equal(shadowDaily.status, "stale");
  const shadowIntraday = resolve({policy_id:"hel034_intraday_shadow",observation_timestamp:"2026-07-24T05:00:00Z",evaluated_at:"2026-07-24T14:00:00Z"});
  assert.equal(shadowIntraday.status, "stale");
  const orderBook = resolve({policy_id:"order_book",observation_timestamp:"2026-07-24T13:59:00Z",evaluated_at:"2026-07-24T14:00:00Z"});
  assert.equal(orderBook.status, "delayed");
  const weekend = resolve({
    policy_id:"live_market",
    observation_timestamp:"2026-07-24T20:00:00Z",
    evaluated_at:"2026-07-25T14:00:00Z",
    market_session:{status:"closed",next_open:"2026-07-27T13:30:00Z"}
  });
  assert.equal(weekend.status, "current");
  assert.equal(weekend.reason_code, "MARKET_CLOSED_CARRY");
  const unknown = resolve({policy_id:"not_real",observation_timestamp:"2026-07-24T13:00:00Z",evaluated_at:"2026-07-24T14:00:00Z"});
  assert.equal(unknown.status, "unknown");
});

test("confidence is qualitative first and loses unsupported precision", () => {
  const resolve = get("hxSilverResolveConfidence_");
  const fresh = ["a","b","c","d","e"].map((metric, index) =>
    evidenceFromFixture({metric,kind:"trend_state",relationship:"supportive"}, index));
  const stale = evidenceFromFixture({metric:"stale",kind:"volatility_level",relationship:"challenging",freshness_status:"stale"}, 8);
  const freshResult = resolve({evidence:fresh,completeness:1,provider_agreement:"resolved",contradiction:{status:"agreement"}});
  const staleResult = resolve({evidence:fresh.slice(0, 4).concat([stale]),completeness:1,provider_agreement:"resolved",contradiction:{status:"agreement"}});
  assert.equal(freshResult.label, "high");
  assert.equal(staleResult.label, "low");
  assert.ok(staleResult.basis.some(row => row.code === "STALE_EVIDENCE"));

  const disputed = resolve({
    evidence:fresh,
    completeness:1,
    provider_agreement:"disagreement",
    contradiction:{status:"material_disagreement"},
    numeric_confidence:{score:91,basis:"authoritative_existing_score",source_evidence_state:"production_authoritative"}
  });
  assert.equal(disputed.score, null);
  assert.ok(disputed.basis.some(row => row.code === "NUMERIC_CONFIDENCE_WITHHELD"));

  const shadowOnly = resolve({evidence:[evidenceFromFixture({metric:"copx",kind:"hel034_shadow_state",relationship:"supportive",evidence_state:"shadow"})]});
  assert.equal(shadowOnly.score, null);
  assert.equal(shadowOnly.label, "unavailable");

  const liquidity = resolve({evidence:[],section_id:"liquidity_environment"});
  assert.equal(liquidity.score, null);
  assert.equal(liquidity.label, "unavailable");
});

test("contradiction resolver distinguishes agreement, disagreement, conflict, and missing", () => {
  const resolve = get("hxSilverResolveContradiction_");
  const support = evidenceFromFixture({metric:"trend",kind:"trend_state",relationship:"supportive",weight:1});
  const challenge = evidenceFromFixture({metric:"rates",kind:"yields",relationship:"challenging",weight:1});
  assert.equal(resolve({evidence:[support]}).status, "agreement");
  assert.equal(resolve({evidence:[support],missing_metrics:["market_structure"]}).status, "partial_agreement");
  assert.equal(resolve({evidence:[support,challenge]}).status, "unresolved_conflict");
  const smallerChallenge = evidenceFromFixture({metric:"risk",kind:"volatility_change",relationship:"challenging",weight:.4});
  assert.equal(resolve({evidence:[support,smallerChallenge]}).status, "material_disagreement");
  assert.equal(resolve({evidence:[]}).status, "missing_evidence");
});

test("all surface renderers preserve one state, impact, bias, and confidence", () => {
  const complete = buildFixture(fixtures.cases.find(row => row.id === "complete_current_evidence"));
  assert.ok(complete.long_summary.includes(complete.current_state));
  assert.ok(complete.long_summary.includes(complete.silver_impact));
  assert.ok(complete.short_summary.includes(complete.current_state));
  assert.ok(complete.short_summary.includes(complete.silver_impact));
  assert.equal(complete.dashboard_summary.status, complete.source_status);
  assert.equal(complete.dashboard_summary.freshness, complete.freshness_status);
  assert.equal(complete.dashboard_summary.silver_impact, complete.silver_impact);
  assert.equal(complete.dashboard_summary.action_bias, complete.action_bias);
  assert.equal(complete.dashboard_summary.confidence_score, complete.confidence_score);
  assert.ok(complete.telegram_summary.includes(complete.current_state));
  assert.ok(complete.telegram_summary.includes(complete.silver_impact));
  assert.equal(complete.telegram_summary.includes("\n"), false);
  assert.ok(complete.long_summary.endsWith("Confidence: high (82/100)"));

  const shadow = buildFixture(fixtures.cases.find(row => row.id === "shadow_copx_confirmation"));
  assert.equal(shadow.telegram_summary, null);
  assert.equal(shadow.production_effect, "none");
  assert.ok(shadow.limitations.includes("shadow observation only"));
});

test("serialization is stable and provenance retains source transformations", () => {
  const interpretation = buildFixture(fixtures.cases.find(row => row.id === "complete_current_evidence"));
  const serialize = get("hxSilverSerializeInterpretation_");
  assert.equal(serialize(interpretation), serialize(interpretation));
  const value = JSON.parse(serialize(interpretation));
  assert.equal(value.target_instrument, "XAGUSD");
  assert.equal(value.source_provenance.evidence_contract_version, "HEL-035.evidence.1.0.0");
  assert.ok(value.source_provenance.transformations.includes("fixture normalization"));
  assert.equal(value.rule_version, "HEL-035.rules.1.0.0");
});

test("controlled language rejects unsupported order-flow and certainty claims", () => {
  const safe = get("hxSilverAssertLanguageSafe_");
  assert.equal(safe("Silver evidence is supportive; confirmation required."), "Silver evidence is supportive; confirmation required.");
  for (const phrase of ["iceberg order detected", "institutional buying confirmed", "accumulation underway", "guaranteed continuation"]) {
    assert.throws(() => safe(phrase), /Unsupported controlled-language claim/);
  }
  const fixture = fixtures.cases.find(row => row.id === "complete_current_evidence");
  assert.throws(() => buildFixture({...fixture, limitations:["iceberg order detected"]}), /Unsupported controlled-language claim/);
});

test("blocked and unavailable evidence never become neutral", () => {
  const blocked = buildFixture(fixtures.cases.find(row => row.id === "blocked_usdcnh"));
  const unavailable = buildFixture(fixtures.cases.find(row => row.id === "absent_liquidity_provider"));
  assert.notEqual(blocked.action_bias, "neutral");
  assert.notEqual(blocked.silver_impact, "neutral");
  assert.notEqual(unavailable.action_bias, "neutral");
  assert.equal(blocked.source_status, "blocked");
  assert.equal(unavailable.source_status, "unavailable");
});

test("core is inactive and contains no production mutation or delivery call", () => {
  assert.equal(get("hxSilverIntelligencePreviewEnabled_")(), false);
  const source = fs.readFileSync("src/12_SilverIntelligence.gs", "utf8") +
    fs.readFileSync("src/13_SilverIntelligenceBriefing.gs", "utf8");
  assert.equal(/\bSpreadsheetApp\b/.test(source), false);
  assert.equal(/\bhxAtomicReplace_\b/.test(source), false);
  assert.equal(/\bsendNotification\s*\(/.test(source), false);
  assert.equal(/\binstallTriggers\s*\(/.test(source), false);
});
