/**
 * HEL-035 Market Structure interpretation layer.
 *
 * This inactive module interprets an explicit snapshot of Harmonexus's
 * existing market-structure record. It does not calculate structure, detect
 * sweeps, infer session state, or use order-book evidence.
 */
const HX_SILVER_MARKET_STRUCTURE_VERSION = 'HEL-035.market-structure.1.0.0';

const HX_STRUCTURE_ACTION_LANGUAGE = Object.freeze({
  continuation_favored:'Continuation Favored',
  supportive_confirmation_required:'Continuation Requires Confirmation',
  neutral:'Neutral',
  caution:'Caution',
  reversal_risk_elevated:'Reversal Risk Elevated',
  no_operational_conclusion:'No Operational Conclusion'
});

const HX_STRUCTURE_FORBIDDEN_CLAIMS = Object.freeze([
  /\bresting liquidity\b/i,
  /\border[- ]book\b/i,
  /\bbookmap\b/i,
  /\biceberg\b/i,
  /\babsorption\b/i,
  /\baggressive (buyers?|sellers?|buying|selling)\b/i,
  /\binstitutional participation\b/i,
  /\bspoofing\b/i
]);

function hxStructureAssertClaimSafe_(value) {
  const text = String(value === null || value === undefined ? '' : value);
  HX_STRUCTURE_FORBIDDEN_CLAIMS.forEach(pattern => {
    if (pattern.test(text)) throw new Error('UNSUPPORTED_MARKET_STRUCTURE_CLAIM:' + pattern);
  });
  return hxSilverAssertLanguageSafe_(text);
}

function hxStructureNormalizedKey_(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function hxStructureClone_(value) {
  if (Array.isArray(value)) return value.map(hxStructureClone_);
  if (value && typeof value === 'object') {
    const out = {};
    Object.keys(value).forEach(key => out[key] = hxStructureClone_(value[key]));
    return out;
  }
  return value;
}

function hxStructureRecord_(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return {};
  if (snapshot.structure && snapshot.structure.record) return snapshot.structure.record;
  if (snapshot.record) return snapshot.record;
  if (snapshot.structure_record) return snapshot.structure_record;
  if (snapshot.current_structure) return snapshot.current_structure;
  if (snapshot.structure && typeof snapshot.structure === 'object') return snapshot.structure;
  return {};
}

function hxStructureField_(record, aliases) {
  const index = {};
  Object.keys(record || {}).forEach(key => index[hxStructureNormalizedKey_(key)] = record[key]);
  for (let i = 0; i < aliases.length; i++) {
    const value = index[hxStructureNormalizedKey_(aliases[i])];
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return null;
}

function hxStructureText_(value) {
  return String(value === null || value === undefined ? '' : value).trim();
}

function hxStructureTrend_(value) {
  const text = hxStructureText_(value).toLowerCase();
  if (!text || /unavailable|unknown|manual$|pending/.test(text)) return 'unavailable';
  if (/transition/.test(text)) return 'transition';
  if (/compress/.test(text)) return 'compression';
  if (/expan/.test(text)) return 'expansion';
  if (/bull|uptrend|higher high|higher low|above key/.test(text)) return 'bullish';
  if (/bear|downtrend|lower high|lower low|below key/.test(text)) return 'bearish';
  if (/neutral|balance|range|sideways/.test(text)) return 'neutral';
  return 'unavailable';
}

function hxStructureAuction_(value) {
  const text = hxStructureText_(value).toLowerCase();
  if (!text || /unavailable|unknown|pending/.test(text)) return 'unavailable';
  if (/reject/.test(text)) return 'auction rejected';
  if (/accept/.test(text)) return 'auction accepted';
  if (/rotat/.test(text)) return 'auction rotating';
  if (/expand/.test(text)) return 'auction expanding';
  if (/balanc/.test(text)) return 'auction balancing';
  return 'unavailable';
}

function hxStructureSweep_(value) {
  const text = hxStructureText_(value).toLowerCase();
  if (!text || /unavailable|unknown|pending/.test(text)) return 'unavailable';
  if (/exhaust/.test(text)) return 'liquidity exhaustion';
  if (/reject/.test(text)) return 'liquidity rejection';
  if (/accept/.test(text)) return 'liquidity acceptance';
  if (/none|no sweep|not detected/.test(text)) return 'no liquidity sweep observed';
  if (/sweep|detected/.test(text)) return 'liquidity sweep detected';
  return 'unavailable';
}

function hxStructureContinuation_(value) {
  const text = hxStructureText_(value).toLowerCase();
  if (!text || /unavailable|unknown/.test(text)) return 'unavailable';
  if (/fail|invalid|rejected/.test(text)) return 'continuation failed';
  if (/confirm|support|favored|active/.test(text)) return 'continuation confirmed';
  if (/pending|requires|unconfirmed|wait/.test(text)) return 'continuation pending';
  if (/neutral|none/.test(text)) return 'continuation neutral';
  return 'unavailable';
}

function hxStructureExhaustion_(value) {
  const text = hxStructureText_(value).toLowerCase();
  if (!text || /unavailable|unknown|pending/.test(text)) return 'unavailable';
  if (/none|absent|not detected|no/.test(text)) return 'exhaustion not detected';
  if (/elevated|detected|present|yes|exhaust/.test(text)) return 'exhaustion detected';
  return 'unavailable';
}

function hxStructureSession_(value, condition) {
  const text = hxStructureText_(value).toLowerCase();
  let name = 'unavailable';
  if (/overlap/.test(text) || (/london/.test(text) && /new york|ny/.test(text))) name = 'Overlap';
  else if (/asian|asia/.test(text)) name = 'Asian';
  else if (/london/.test(text)) name = 'London';
  else if (/new york|ny/.test(text)) name = 'New York';
  return {
    name:name,
    condition:name === 'unavailable' ? 'unavailable' :
      hxStructureText_(condition) || 'condition unavailable'
  };
}

function hxStructureDirectionalSide_(state) {
  if (state === 'bullish') return 'supportive';
  if (state === 'bearish') return 'challenging';
  return state === 'neutral' ? 'neutral' : 'mixed';
}

function hxStructureContextSide_(value) {
  if (!value || typeof value !== 'object') return 'unavailable';
  const text = [
    value.silver_impact, value.current_state, value.action_bias,
    value.interpretation
  ].filter(Boolean).join(' ').toLowerCase();
  if (/unavailable|blocked|missing|no operational conclusion/.test(text)) return 'unavailable';
  if (/challeng|headwind|caution|reversal|restrictive|weak/.test(text)) return 'challenging';
  if (/support|continuation favored|easing|strength/.test(text)) return 'supportive';
  if (/neutral/.test(text)) return 'neutral';
  return 'mixed';
}

function hxStructureAlignment_(structureSide, context, supportText, challengeText) {
  const contextSide = hxStructureContextSide_(context);
  if (structureSide === 'mixed' || structureSide === 'neutral' ||
      contextSide === 'mixed' || contextSide === 'neutral')
    return {state:'unresolved', interpretation:'Structural alignment is unresolved.'};
  if (structureSide === 'unavailable' || contextSide === 'unavailable')
    return {state:'unavailable', interpretation:'Structural alignment is unavailable.'};
  if (structureSide === contextSide)
    return {state:'supporting', interpretation:supportText};
  return {state:'contradicting', interpretation:challengeText};
}

function hxStructureWeakness_(states) {
  const weakness = [];
  if (states.trend === 'unavailable') weakness.push('Current trend unavailable');
  if (states.auction === 'unavailable') weakness.push('Auction state unavailable');
  if (states.sweep === 'unavailable') weakness.push('Liquidity sweep status unavailable');
  if (states.higherTimeframe === 'unavailable') weakness.push('Higher timeframe bias unavailable');
  if (states.session.name === 'unavailable') weakness.push('Current session unavailable');
  if (states.continuation === 'unavailable') weakness.push('Continuation state unavailable');
  if (states.exhaustion === 'unavailable') weakness.push('Exhaustion state unavailable');
  if (states.auction === 'auction rejected') weakness.push('Auction rejection challenges continuation');
  if (states.sweep === 'liquidity rejection') weakness.push('Liquidity rejection challenges continuation');
  if (states.sweep === 'liquidity exhaustion' || states.exhaustion === 'exhaustion detected')
    weakness.push('Explicit exhaustion evidence elevates reversal risk');
  if (states.continuation === 'continuation failed') weakness.push('Continuation has failed');
  if (['bullish', 'bearish'].indexOf(states.trend) >= 0 &&
      ['bullish', 'bearish'].indexOf(states.higherTimeframe) >= 0 &&
      states.trend !== states.higherTimeframe)
    weakness.push('Current and higher-timeframe structure disagree');
  return hxSilverUnique_(weakness);
}

function hxStructureActionBias_(states, freshness, weaknesses) {
  if (states.trend === 'unavailable' || freshness === 'stale' || freshness === 'unknown')
    return 'no_operational_conclusion';
  if (states.exhaustion === 'exhaustion detected' ||
      states.sweep === 'liquidity exhaustion')
    return 'reversal_risk_elevated';
  if (states.continuation === 'continuation failed' ||
      states.auction === 'auction rejected' ||
      states.sweep === 'liquidity rejection' ||
      weaknesses.indexOf('Current and higher-timeframe structure disagree') >= 0)
    return 'caution';
  if (states.trend === 'neutral' && states.auction === 'auction balancing') return 'neutral';
  const directional = ['bullish', 'bearish'].indexOf(states.trend) >= 0;
  const aligned = states.higherTimeframe === states.trend;
  const auctionConfirms = states.auction === 'auction accepted' ||
    states.auction === 'auction expanding';
  if (directional && aligned && auctionConfirms &&
      states.continuation === 'continuation confirmed' &&
      states.exhaustion === 'exhaustion not detected')
    return 'continuation_favored';
  if (directional) return 'supportive_confirmation_required';
  return 'no_operational_conclusion';
}

function hxStructureConfidence_(states, freshness) {
  const values = [
    states.trend, states.auction, states.sweep, states.higherTimeframe,
    states.session.name, states.continuation, states.exhaustion
  ];
  const complete = values.filter(value => value !== 'unavailable').length;
  let label = 'unavailable';
  if (complete) label = complete >= 6 ? 'high' : complete >= 4 ? 'moderate' :
    complete >= 2 ? 'low' : 'very low';
  if (freshness === 'unknown' && label !== 'unavailable') label = 'very low';
  if (freshness === 'stale' && label !== 'unavailable') label = 'very low';
  return {
    score:null,
    label:label,
    basis:{
      conclusion_precision:'qualitative',
      interpreted_fields:complete,
      required_fields:values.length,
      freshness:freshness,
      numeric_confidence_source:'none'
    }
  };
}

function hxStructureSilverImpact_(states, actionBias) {
  if (actionBias === 'no_operational_conclusion')
    return 'Existing Harmonexus structure is incomplete or not current enough to authorize an operational silver conclusion.';
  if (actionBias === 'continuation_favored')
    return 'Current and higher-timeframe silver structure align, and the existing auction and continuation fields confirm orderly continuation.';
  if (actionBias === 'supportive_confirmation_required')
    return 'Silver has a directional structure, but existing auction, timeframe, continuation, or exhaustion evidence remains incomplete.';
  if (actionBias === 'reversal_risk_elevated')
    return 'Explicit existing exhaustion evidence elevates silver reversal risk.';
  if (actionBias === 'caution')
    return 'Existing structure contains rejection, failed continuation, or timeframe conflict that challenges the silver move.';
  return 'Existing silver structure is balanced and does not favor continuation or reversal.';
}

function hxStructureInterpretation_(states) {
  const auction = states.auction === 'auction accepted' ?
    'The existing auction field confirms acceptance of the current structure.' :
    states.auction === 'auction rejected' ?
      'The existing auction field shows rejection and challenges continuation.' :
      states.auction === 'auction rotating' ?
        'The existing auction field shows rotation without directional completion.' :
        states.auction === 'auction expanding' ?
          'The existing auction field shows range expansion that requires directional context.' :
          states.auction === 'auction balancing' ?
            'The existing auction field shows balance and two-sided trade.' :
            'No explicit current auction classification is available.';
  const sweep = states.sweep === 'unavailable' ?
    'No authorized liquidity-sweep interpretation is available.' :
    'The existing Harmonexus structure record reports ' + states.sweep + '.';
  return 'Current structure is ' + states.trend + '. ' + auction + ' ' + sweep;
}

function hxStructureEvidence_(metric, rawValue, interpreted, source, timestamp, freshness) {
  return {
    evidence_kind:metric === 'current_session' ? 'session_state' : 'market_structure',
    canonical_metric:metric,
    raw_value:rawValue,
    interpreted_state:interpreted,
    source:source,
    provider:'Harmonexus',
    authority:'production_authoritative',
    source_status:interpreted === 'unavailable' ? 'unavailable' : 'available',
    freshness_status:freshness,
    timestamp:timestamp,
    eligibility:{
      display:true,
      contextual_interpretation:interpreted !== 'unavailable' && freshness !== 'stale',
      action_bias:interpreted !== 'unavailable' && freshness === 'current',
      production_decision:false
    },
    reason_codes:interpreted === 'unavailable' ?
      ['MARKET_STRUCTURE_' + metric.toUpperCase() + '_UNAVAILABLE'] :
      ['EXISTING_HARMONEXUS_STRUCTURE_INTERPRETED'],
    provenance_pointer:'Structure.' + metric
  };
}

function hxSilverRenderMarketStructureLong_(interpretation) {
  const detail = interpretation.market_structure;
  const lines = [
    'MARKET STRUCTURE',
    'Target: XAGUSD / SILVER',
    'Current Structure: ' + detail.current_structure,
    'Auction State: ' + detail.auction_state,
    'Liquidity Sweep Status: ' + detail.liquidity_sweep_status,
    'Higher Timeframe Bias: ' + detail.higher_timeframe_bias,
    'Current Session: ' + detail.current_session.name + ' — ' + detail.current_session.condition,
    '',
    'Interpretation',
    interpretation.interpretation,
    '',
    'Silver Impact',
    interpretation.silver_impact,
    '',
    'Structural Confirmation',
    detail.structural_confirmation.overall,
    detail.structural_confirmation.monetary_environment.interpretation,
    detail.structural_confirmation.silver_intelligence.interpretation,
    '',
    'Structural Weakness',
    detail.structural_weakness.length ? detail.structural_weakness.join('; ') : 'No explicit structural weakness reported.',
    '',
    'Action Bias: ' + HX_STRUCTURE_ACTION_LANGUAGE[interpretation.action_bias],
    'Primary Risk: ' + interpretation.primary_risk,
    'Required Confirmation: ' + interpretation.required_confirmation,
    'Confidence: ' + interpretation.confidence_label
  ];
  return hxStructureAssertClaimSafe_(lines.join('\n'));
}

function hxSilverRenderMarketStructureShort_(interpretation) {
  return hxStructureAssertClaimSafe_(
    'Market Structure: ' + interpretation.current_state + '. ' +
    interpretation.silver_impact + ' ' +
    HX_STRUCTURE_ACTION_LANGUAGE[interpretation.action_bias] +
    '; confidence ' + interpretation.confidence_label + '.'
  );
}

function hxSilverRenderMarketStructureDashboard_(interpretation) {
  const detail = interpretation.market_structure;
  return hxSilverDeepFreeze_({
    target_instrument:'XAGUSD',
    section_id:'market_structure',
    heading:'Market Structure',
    headline:'Market Structure — ' + interpretation.current_state,
    current_structure:detail.current_structure,
    auction_state:detail.auction_state,
    liquidity_sweep_status:detail.liquidity_sweep_status,
    higher_timeframe_bias:detail.higher_timeframe_bias,
    current_session:detail.current_session,
    structural_confirmation:detail.structural_confirmation,
    structural_weakness:detail.structural_weakness,
    silver_impact:interpretation.silver_impact,
    action_bias:interpretation.action_bias,
    action_language:HX_STRUCTURE_ACTION_LANGUAGE[interpretation.action_bias],
    confidence_score:interpretation.confidence_score,
    confidence_label:interpretation.confidence_label,
    expandable:{
      continuation_state:detail.continuation_state,
      exhaustion_state:detail.exhaustion_state,
      internal_harmonexus_structure:detail.internal_harmonexus_structure,
      evidence:interpretation.underlying_metrics,
      provenance:interpretation.source_provenance,
      limitations:interpretation.limitations,
      reason_codes:interpretation.reason_codes,
      primary_risk:interpretation.primary_risk,
      required_confirmation:interpretation.required_confirmation
    },
    schema_version:interpretation.schema_version,
    renderer_version:HX_SILVER_VERSIONS.renderer,
    market_structure_version:HX_SILVER_MARKET_STRUCTURE_VERSION
  });
}

function hxSilverBuildMarketStructure_(snapshot, evaluatedAt) {
  snapshot = snapshot || {};
  const asOf = hxSilverIso_(evaluatedAt);
  if (!asOf) throw new Error('Market Structure evaluatedAt is required.');
  const record = hxStructureRecord_(snapshot);
  const asset = hxStructureText_(hxStructureField_(record, ['Asset', 'Instrument', 'Target Instrument']));
  if (asset && asset.toUpperCase() !== 'XAGUSD' && asset.toUpperCase() !== 'SILVER')
    throw new Error('MARKET_STRUCTURE_TARGET_MUST_BE_XAGUSD');

  const raw = {
    trend:hxStructureField_(record, ['Current Trend', 'Trend', 'Structure Status']),
    auction:hxStructureField_(record, ['Auction State', 'Current Auction', 'Auction', 'Acceptance']),
    sweep:hxStructureField_(record, ['Liquidity Sweep Status', 'Liquidity Sweep', 'Sweep Status']),
    higherTimeframe:hxStructureField_(record, ['Higher Timeframe Bias', 'Higher Timeframe', 'HTF Bias']),
    session:hxStructureField_(record, ['Current Session', 'Session']),
    sessionCondition:hxStructureField_(record, ['Session Condition', 'Current Session Condition']),
    continuation:hxStructureField_(record, ['Continuation', 'Continuation State', 'Continuation Status']),
    exhaustion:hxStructureField_(record, ['Exhaustion', 'Exhaustion State', 'Exhaustion Status']),
    internal:hxStructureField_(record, ['Internal Harmonexus Structure', 'Note', 'Structure Note']),
    score:hxStructureField_(record, ['Structure Score']),
    timestamp:hxStructureField_(record, ['Last Updated', 'As Of', 'Timestamp'])
  };
  const timestamp = hxSilverIso_(raw.timestamp);
  const freshness = timestamp ? hxSilverResolveFreshness_({
    policy_id:'manual_structure',
    observation_timestamp:timestamp,
    evaluated_at:asOf,
    expected_next_update:snapshot.expected_next_update,
    market_session:snapshot.market_session || {}
  }) : hxSilverDeepFreeze_({
    status:'unknown',
    expected_next_update:null,
    age_seconds:null,
    reason_code:'OBSERVATION_TIMESTAMP_MISSING',
    policy_id:'manual_structure',
    rule_version:HX_SILVER_VERSIONS.freshness
  });
  const states = {
    trend:hxStructureTrend_(raw.trend),
    auction:hxStructureAuction_(raw.auction),
    sweep:hxStructureSweep_(raw.sweep),
    higherTimeframe:hxStructureTrend_(raw.higherTimeframe),
    session:hxStructureSession_(raw.session, raw.sessionCondition),
    continuation:hxStructureContinuation_(raw.continuation),
    exhaustion:hxStructureExhaustion_(raw.exhaustion)
  };
  const source = String(snapshot.source_sheet ||
    snapshot.structure && snapshot.structure.source_sheet || 'Structure');
  const evidence = [
    hxStructureEvidence_('current_structure', raw.trend, states.trend, source, timestamp, freshness.status),
    hxStructureEvidence_('auction_state', raw.auction, states.auction, source, timestamp, freshness.status),
    hxStructureEvidence_('liquidity_sweep_status', raw.sweep, states.sweep, source, timestamp, freshness.status),
    hxStructureEvidence_('higher_timeframe_bias', raw.higherTimeframe, states.higherTimeframe, source, timestamp, freshness.status),
    hxStructureEvidence_('current_session', raw.session, states.session.name === 'unavailable' ? 'unavailable' : states.session.name, source, timestamp, freshness.status),
    hxStructureEvidence_('continuation_state', raw.continuation, states.continuation, source, timestamp, freshness.status),
    hxStructureEvidence_('exhaustion_state', raw.exhaustion, states.exhaustion, source, timestamp, freshness.status)
  ];
  const available = evidence.filter(item => item.source_status === 'available');
  const sourceStatus = !available.length ? 'unavailable' :
    available.length === evidence.length ? 'available' : 'partial';
  const weaknesses = hxStructureWeakness_(states);
  const structureSide = hxStructureDirectionalSide_(states.trend);
  const monetaryAlignment = hxStructureAlignment_(
    structureSide,
    snapshot.monetary_environment,
    'Structure supporting Monetary Environment.',
    'Structure contradicting Monetary Environment.'
  );
  const intelligenceAlignment = hxStructureAlignment_(
    structureSide,
    snapshot.silver_intelligence,
    'Structure supporting Silver Intelligence.',
    'Structure contradicting Silver Intelligence.'
  );
  const confirmations = [monetaryAlignment, intelligenceAlignment];
  const supporting = confirmations.filter(item => item.state === 'supporting').length;
  const contradicting = confirmations.filter(item => item.state === 'contradicting').length;
  const structuralConfirmation = {
    monetary_environment:monetaryAlignment,
    silver_intelligence:intelligenceAlignment,
    overall:contradicting && supporting ?
      'Structure supports one context and contradicts another.' :
      contradicting ? 'Structure contradicts the available contextual intelligence.' :
      supporting ? 'Structure supports the available contextual intelligence.' :
      'Structural confirmation is unavailable or unresolved.'
  };
  const actionBias = hxStructureActionBias_(states, freshness.status, weaknesses);
  const confidence = hxStructureConfidence_(states, freshness.status);
  const silverImpact = hxStructureSilverImpact_(states, actionBias);
  const requiredConfirmation = actionBias === 'continuation_favored' ?
    'Require the next existing Harmonexus structure observation to preserve auction acceptance and timeframe alignment.' :
    actionBias === 'reversal_risk_elevated' ?
      'Require existing Harmonexus structure to show rejection resolution or renewed continuation before restoring conviction.' :
      'Require current timestamped auction, sweep, higher-timeframe, session, continuation, and exhaustion fields from existing Harmonexus structure.';
  const primaryRisk = weaknesses[0] ||
    'Existing structure can change with the next accepted or rejected auction observation.';
  const limitations = hxSilverUnique_([
    sourceStatus === 'partial' ? 'existing Harmonexus structure is partial' : '',
    freshness.status === 'unknown' ? 'structure timestamp unavailable' : '',
    states.sweep === 'unavailable' ? 'liquidity sweep status unavailable' : '',
    states.session.name === 'unavailable' ? 'session state unavailable' : '',
    'no order-flow or future provider evidence consumed'
  ]);
  const reasonCodes = hxSilverUnique_(
    ['EXISTING_HARMONEXUS_STRUCTURE_READ_ONLY', 'NO_STRUCTURE_RECALCULATION',
      'NO_ORDER_BOOK_EVIDENCE', freshness.reason_code]
      .concat(evidence.reduce((all, item) => all.concat(item.reason_codes), []))
  );
  const detail = {
    current_structure:states.trend,
    auction_state:states.auction,
    liquidity_sweep_status:states.sweep,
    higher_timeframe_bias:states.higherTimeframe,
    current_session:states.session,
    continuation_state:states.continuation,
    exhaustion_state:states.exhaustion,
    structural_confirmation:structuralConfirmation,
    structural_weakness:weaknesses,
    internal_harmonexus_structure:{
      note:hxStructureText_(raw.internal) || null,
      structure_score:raw.score === null || !isFinite(Number(raw.score)) ? null : Number(raw.score),
      source_record:hxStructureClone_(record)
    },
    data_freshness:{
      status:freshness.status,
      source_timestamp:timestamp,
      expected_next_update:freshness.expected_next_update,
      age_seconds:freshness.age_seconds,
      reason_code:freshness.reason_code
    },
    rule_version:HX_SILVER_MARKET_STRUCTURE_VERSION
  };
  const base = {
    section_id:'market_structure',
    section_name:'Market Structure',
    target_instrument:'XAGUSD',
    as_of:asOf,
    market_session:states.session.name,
    source_status:sourceStatus,
    freshness_status:freshness.status,
    evidence_state:sourceStatus === 'unavailable' ? 'placeholder' : 'production_authoritative',
    current_state:states.trend,
    interpretation:hxStructureInterpretation_(states),
    market_impact:'Existing Harmonexus trend, auction, sweep, timeframe, session, continuation, and exhaustion fields define the available silver structure context.',
    silver_impact:silverImpact,
    action_bias:actionBias,
    primary_support:supporting ? 'structural_context_alignment' :
      states.auction === 'auction accepted' ? 'auction_acceptance' : 'none',
    primary_challenge:weaknesses[0] || 'none',
    primary_risk:primaryRisk,
    required_confirmation:requiredConfirmation,
    confidence_score:null,
    confidence_label:confidence.label,
    confidence_basis:confidence.basis,
    limitations:limitations,
    reason_codes:reasonCodes,
    source_provenance:{
      authority:'Existing Harmonexus Market Structure',
      source_sheet:source,
      source_timestamp:timestamp,
      read_only:true,
      structure_recalculated:false,
      sweep_detected_by_hel035:false,
      session_inferred_by_hel035:false,
      order_book_consumed:false,
      source_record_status:snapshot.status || snapshot.structure && snapshot.structure.status || null,
      transformations:['field alias normalization', 'deterministic state translation'],
      rule_version:HX_SILVER_MARKET_STRUCTURE_VERSION
    },
    underlying_metrics:evidence,
    market_structure:detail,
    operator_summary:requiredConfirmation,
    long_summary:null,
    short_summary:null,
    dashboard_summary:null,
    telegram_summary:null,
    notification_permitted:false,
    production_effect:'none',
    rule_version:HX_SILVER_VERSIONS.rule,
    schema_version:HX_SILVER_VERSIONS.schema
  };
  base.long_summary = hxSilverRenderMarketStructureLong_(base);
  base.short_summary = hxSilverRenderMarketStructureShort_(base);
  base.dashboard_summary = hxSilverRenderMarketStructureDashboard_(base);
  base.telegram_summary = null;
  [
    base.interpretation, base.market_impact, base.silver_impact,
    base.primary_risk, base.required_confirmation, base.operator_summary
  ].forEach(hxStructureAssertClaimSafe_);
  const frozen = hxSilverDeepFreeze_(base);
  const validation = hxSilverValidateInterpretation_(frozen);
  if (!validation.ok)
    throw new Error('Invalid Market Structure interpretation: ' + validation.errors.join(','));
  return frozen;
}

function hxSilverMarketStructurePreview_(snapshot, evaluatedAt) {
  if (!hxSilverIntelligencePreviewEnabled_())
    throw new Error('HEL035_INTERNAL_PREVIEW_DISABLED');
  return hxSilverBuildMarketStructure_(snapshot, evaluatedAt);
}
