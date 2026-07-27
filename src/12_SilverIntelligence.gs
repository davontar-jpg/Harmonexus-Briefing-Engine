/**
 * HEL-035 Silver Intelligence Operator Layer.
 *
 * Inactive interpretation foundation. No current production function calls
 * this module and the internal preview boundary defaults to disabled.
 */
const HX_SILVER_INTELLIGENCE_PREVIEW_ENABLED = false;

const HX_SILVER_VERSIONS = Object.freeze({
  schema: 'HEL-035.schema.1.0.0',
  evidence: 'HEL-035.evidence.1.0.0',
  authority: 'HEL-035.authority.1.0.0',
  freshness: 'HEL-035.freshness.1.0.0',
  confidence: 'HEL-035.confidence.1.0.0',
  contradiction: 'HEL-035.contradiction.1.0.0',
  vocabulary: 'HEL-035.vocabulary.1.0.0',
  renderer: 'HEL-035.renderer.1.0.0',
  rule: 'HEL-035.rules.1.0.0'
});

const HX_SILVER_ENUMS = Object.freeze({
  sourceStatus: Object.freeze(['available', 'partial', 'unavailable', 'blocked', 'failed']),
  freshnessStatus: Object.freeze(['current', 'delayed', 'stale', 'unknown']),
  evidenceState: Object.freeze(['production_authoritative', 'validated', 'shadow', 'research_only', 'placeholder']),
  actionBias: Object.freeze([
    'continuation_favored', 'supportive_confirmation_required', 'neutral',
    'caution', 'reversal_risk_elevated', 'monetary_headwind',
    'volatility_headwind', 'no_operational_conclusion', 'unavailable',
    'orderly_continuation_favored', 'continuation_normal_confirmation',
    'stronger_confirmation_required', 'range_expansion_risk',
    'liquidation_risk_elevated', 'volatility_signal_unconfirmed'
  ]),
  confidenceLabel: Object.freeze(['unavailable', 'very low', 'low', 'moderate', 'high', 'very high']),
  contradictionState: Object.freeze([
    'agreement', 'partial_agreement', 'material_disagreement',
    'unresolved_conflict', 'missing_evidence'
  ]),
  stateVocabulary: Object.freeze([
    'strengthening', 'weakening', 'expanding', 'compressing', 'stable',
    'mixed', 'diverging', 'blocked', 'stale', 'unavailable'
  ]),
  silverRelationship: Object.freeze([
    'strongly supportive', 'supportive', 'mildly supportive', 'neutral',
    'mixed', 'mildly challenging', 'challenging', 'strongly challenging',
    'observation only'
  ])
});

const HX_SILVER_EVIDENCE_KINDS = Object.freeze([
  'market_return', 'trend_state', 'rate_of_change', 'volatility_level',
  'volatility_change', 'percentile', 'rolling_correlation',
  'directional_agreement', 'divergence', 'candidate_disposition',
  'source_authority', 'source_freshness', 'provider_quality',
  'market_structure', 'session_state', 'cot_positioning', 'open_interest',
  'yields', 'dollar_state', 'hel034_shadow_state', 'unavailable_or_blocked'
]);

const HX_SILVER_FRESHNESS_POLICIES = Object.freeze({
  live_market: Object.freeze({
    currentSeconds: 15 * 60, delayedSeconds: 60 * 60,
    cadenceSeconds: 60, reasonPrefix: 'LIVE_MARKET'
  }),
  delayed_etf: Object.freeze({
    currentSeconds: 60 * 60, delayedSeconds: 24 * 60 * 60,
    cadenceSeconds: 15 * 60, reasonPrefix: 'DELAYED_ETF'
  }),
  fred_daily: Object.freeze({
    currentSeconds: 36 * 60 * 60, delayedSeconds: 72 * 60 * 60,
    cadenceSeconds: 24 * 60 * 60, reasonPrefix: 'FRED_DAILY'
  }),
  cot_weekly: Object.freeze({
    currentSeconds: 9 * 24 * 60 * 60, delayedSeconds: 12 * 24 * 60 * 60,
    cadenceSeconds: 7 * 24 * 60 * 60, reasonPrefix: 'COT_WEEKLY'
  }),
  hel034_daily_shadow: Object.freeze({
    currentSeconds: 36 * 60 * 60, delayedSeconds: 72 * 60 * 60,
    cadenceSeconds: 24 * 60 * 60, reasonPrefix: 'HEL034_DAILY_SHADOW'
  }),
  hel034_intraday_shadow: Object.freeze({
    currentSeconds: 2 * 60 * 60, delayedSeconds: 8 * 60 * 60,
    cadenceSeconds: 60 * 60, reasonPrefix: 'HEL034_INTRADAY_SHADOW'
  }),
  order_book: Object.freeze({
    currentSeconds: 10, delayedSeconds: 60,
    cadenceSeconds: 1, reasonPrefix: 'ORDER_BOOK'
  }),
  manual_structure: Object.freeze({
    currentSeconds: 24 * 60 * 60, delayedSeconds: 7 * 24 * 60 * 60,
    cadenceSeconds: 24 * 60 * 60, reasonPrefix: 'MANUAL_STRUCTURE'
  })
});

/**
 * @typedef {Object} SilverEvidence
 * @property {string} evidence_id
 * @property {string} evidence_kind
 * @property {string} target_instrument
 * @property {string} canonical_metric
 * @property {*} value
 * @property {string} unit
 * @property {string} direction
 * @property {string} silver_relationship
 * @property {string} reference_interval
 * @property {string} timestamp
 * @property {string} source
 * @property {string} provider
 * @property {string} authority
 * @property {string} evidence_state
 * @property {string} source_status
 * @property {string} freshness_status
 * @property {string} quality
 * @property {Object} eligibility
 * @property {Array<string>} reason_codes
 * @property {string} provenance_pointer
 */

/**
 * @typedef {Object} SilverInterpretation
 * @property {string} section_id
 * @property {string} section_name
 * @property {string} target_instrument
 * @property {string} as_of
 * @property {string} market_session
 * @property {string} source_status
 * @property {string} freshness_status
 * @property {string} evidence_state
 * @property {string} current_state
 * @property {string} interpretation
 * @property {string} market_impact
 * @property {string} silver_impact
 * @property {string} action_bias
 * @property {?number} confidence_score
 * @property {string} confidence_label
 */

function hxSilverIntelligencePreviewEnabled_() {
  return HX_SILVER_INTELLIGENCE_PREVIEW_ENABLED === true;
}

function hxSilverUnique_(values) {
  return Array.from(new Set((values || []).filter(value => value !== null && value !== undefined && String(value).length).map(String))).sort();
}

function hxSilverAssertEnum_(value, values, field) {
  if (values.indexOf(value) < 0) throw new Error('Invalid ' + field + ': ' + value);
  return value;
}

function hxSilverIso_(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return null;
  return date.toISOString();
}

function hxSilverDeepFreeze_(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.keys(value).forEach(key => hxSilverDeepFreeze_(value[key]));
  return Object.freeze(value);
}

function hxSilverQualityWeight_(quality) {
  return ({high:1, medium:.7, low:.4, unknown:.25})[String(quality || 'unknown')] || .25;
}

/**
 * Creates one discriminated, runtime-validated SilverEvidence object.
 * `evidence_kind` supplies the formal subtype.
 */
function hxSilverEvidence_(input) {
  input = input || {};
  const kind = hxSilverAssertEnum_(String(input.evidence_kind || ''), HX_SILVER_EVIDENCE_KINDS, 'evidence_kind');
  const timestamp = hxSilverIso_(input.timestamp);
  const state = hxSilverAssertEnum_(String(input.evidence_state || 'placeholder'), HX_SILVER_ENUMS.evidenceState, 'evidence_state');
  const sourceStatus = hxSilverAssertEnum_(String(input.source_status || 'unavailable'), HX_SILVER_ENUMS.sourceStatus, 'source_status');
  const freshnessStatus = hxSilverAssertEnum_(String(input.freshness_status || 'unknown'), HX_SILVER_ENUMS.freshnessStatus, 'freshness_status');
  const relationship = hxSilverAssertEnum_(String(input.silver_relationship || 'observation only'), HX_SILVER_ENUMS.silverRelationship, 'silver_relationship');
  if (!input.canonical_metric) throw new Error('SilverEvidence canonical_metric is required.');
  if (!input.source) throw new Error('SilverEvidence source is required.');
  if (!input.provider) throw new Error('SilverEvidence provider is required.');
  const authority = hxSilverResolveAuthority_({
    evidence_state: state,
    source_status: sourceStatus,
    freshness_status: freshnessStatus,
    approved_uses: input.approved_uses || [],
    internal_preview: input.internal_preview === true
  });
  const metric = String(input.canonical_metric);
  const provider = String(input.provider);
  const evidence = {
    evidence_id: String(input.evidence_id || [kind, metric, provider, timestamp || 'no-time'].join('|')),
    evidence_kind: kind,
    target_instrument: 'XAGUSD',
    canonical_metric: metric,
    value: input.value === undefined ? null : input.value,
    unit: String(input.unit || 'state'),
    direction: String(input.direction || 'unknown'),
    silver_relationship: relationship,
    reference_interval: String(input.reference_interval || 'unknown'),
    timestamp: timestamp,
    source: String(input.source),
    provider: provider,
    authority: state,
    evidence_state: state,
    source_status: sourceStatus,
    freshness_status: freshnessStatus,
    quality: String(input.quality || 'unknown'),
    provider_quality: String(input.provider_quality || input.quality || 'unknown'),
    expected_publication_cadence: String(input.expected_publication_cadence || 'unknown'),
    market_session: String(input.market_session || 'unknown'),
    eligibility: authority.permissions,
    authority_resolution: authority,
    interpretive_weight: Math.max(0, Math.min(1, Number(input.interpretive_weight === undefined ? hxSilverQualityWeight_(input.quality) : input.interpretive_weight))),
    reason_codes: hxSilverUnique_((input.reason_codes || []).concat(authority.reason_codes || [])),
    provenance_pointer: String(input.provenance_pointer || ''),
    transformations: hxSilverUnique_(input.transformations || []),
    limitations: hxSilverUnique_(input.limitations || []),
    metadata: input.metadata && typeof input.metadata === 'object' ? input.metadata : {}
  };
  return hxSilverDeepFreeze_(evidence);
}

/**
 * Resolves whether an evidence class may influence each operator surface.
 */
function hxSilverResolveAuthority_(input) {
  input = input || {};
  const state = hxSilverAssertEnum_(String(input.evidence_state || 'placeholder'), HX_SILVER_ENUMS.evidenceState, 'evidence_state');
  const sourceStatus = hxSilverAssertEnum_(String(input.source_status || 'unavailable'), HX_SILVER_ENUMS.sourceStatus, 'source_status');
  const freshness = hxSilverAssertEnum_(String(input.freshness_status || 'unknown'), HX_SILVER_ENUMS.freshnessStatus, 'freshness_status');
  const approved = new Set((input.approved_uses || []).map(String));
  const usableSource = sourceStatus === 'available' || sourceStatus === 'partial';
  const currentContext = freshness === 'current' || freshness === 'delayed';
  const currentDecision = freshness === 'current';
  const completeSource = sourceStatus === 'available';
  const permissions = {
    display: true,
    contextual_interpretation: false,
    confidence: false,
    action_bias: false,
    executive_synthesis: false,
    notification: false,
    production_decision: false
  };
  const reasons = [];

  if (!usableSource) {
    reasons.push(sourceStatus === 'blocked' ? 'SOURCE_BLOCKED' : sourceStatus === 'failed' ? 'SOURCE_FAILED' : 'SOURCE_UNAVAILABLE');
  } else if (freshness === 'stale' || freshness === 'unknown') {
    reasons.push(freshness === 'stale' ? 'STALE_CONTEXT_ONLY' : 'FRESHNESS_UNKNOWN');
  } else if (state === 'production_authoritative') {
    permissions.contextual_interpretation = true;
    permissions.confidence = true;
    permissions.action_bias = completeSource && currentContext;
    permissions.executive_synthesis = completeSource && currentContext;
    permissions.notification = completeSource && currentDecision;
    permissions.production_decision = completeSource && currentDecision;
  } else if (state === 'validated') {
    permissions.contextual_interpretation = currentContext;
    permissions.confidence = currentContext;
    permissions.action_bias = currentContext && approved.has('action_bias');
    permissions.executive_synthesis = currentContext && approved.has('executive_synthesis');
    permissions.notification = currentDecision && approved.has('notification');
    permissions.production_decision = currentDecision && approved.has('production_decision');
    reasons.push('VALIDATED_USE_REQUIRES_APPROVAL');
  } else if (state === 'shadow') {
    permissions.contextual_interpretation = currentContext;
    reasons.push('SHADOW_OBSERVATION_ONLY');
  } else if (state === 'research_only') {
    permissions.display = input.internal_preview === true;
    permissions.contextual_interpretation = input.internal_preview === true && currentContext;
    reasons.push('RESEARCH_CONTEXT_ONLY');
  } else {
    reasons.push('PLACEHOLDER_NO_INFLUENCE');
  }

  if (sourceStatus === 'partial') {
    permissions.action_bias = false;
    permissions.executive_synthesis = false;
    permissions.notification = false;
    permissions.production_decision = false;
    reasons.push('PARTIAL_SOURCE_LIMIT');
  }
  if (freshness === 'delayed') {
    permissions.notification = false;
    permissions.production_decision = false;
    reasons.push('DELAYED_SOURCE_LIMIT');
  }
  return hxSilverDeepFreeze_({
    evidence_state: state,
    source_status: sourceStatus,
    freshness_status: freshness,
    permissions: permissions,
    reason_codes: hxSilverUnique_(reasons),
    rule_version: HX_SILVER_VERSIONS.authority
  });
}

/**
 * Session-aware freshness resolution. `evaluated_at` is mandatory so the same
 * inputs and rules always produce the same result.
 */
function hxSilverResolveFreshness_(input) {
  input = input || {};
  const policyId = String(input.policy_id || '');
  const policy = HX_SILVER_FRESHNESS_POLICIES[policyId];
  const observed = hxSilverIso_(input.observation_timestamp);
  const evaluated = hxSilverIso_(input.evaluated_at);
  if (!policy || !observed || !evaluated) {
    return hxSilverDeepFreeze_({
      status: 'unknown',
      expected_next_update: input.expected_next_update ? hxSilverIso_(input.expected_next_update) : null,
      age_seconds: null,
      reason_code: !policy ? 'FRESHNESS_POLICY_UNKNOWN' : !observed ? 'OBSERVATION_TIMESTAMP_MISSING' : 'EVALUATION_TIMESTAMP_MISSING',
      policy_id: policyId || 'unknown',
      rule_version: HX_SILVER_VERSIONS.freshness
    });
  }
  const observedMs = new Date(observed).getTime();
  const evaluatedMs = new Date(evaluated).getTime();
  const ageSeconds = Math.max(0, Math.floor((evaluatedMs - observedMs) / 1000));
  const session = input.market_session || {};
  const nextOpen = hxSilverIso_(session.next_open);
  const expectedOverride = hxSilverIso_(input.expected_next_update);
  const expectedNext = expectedOverride || nextOpen || new Date(observedMs + policy.cadenceSeconds * 1000).toISOString();
  const marketClosed = session.status === 'closed' || session.is_holiday === true || [0, 6].indexOf(new Date(evaluated).getUTCDay()) >= 0;
  if (marketClosed && nextOpen) {
    const carryLimit = new Date(nextOpen).getTime() + policy.currentSeconds * 1000;
    if (evaluatedMs <= carryLimit) {
      return hxSilverDeepFreeze_({
        status: 'current',
        expected_next_update: expectedNext,
        age_seconds: ageSeconds,
        reason_code: session.is_holiday === true ? 'HOLIDAY_CLOSED_CARRY' : 'MARKET_CLOSED_CARRY',
        policy_id: policyId,
        rule_version: HX_SILVER_VERSIONS.freshness
      });
    }
  }
  let status = 'stale';
  if (ageSeconds <= policy.currentSeconds) status = 'current';
  else if (ageSeconds <= policy.delayedSeconds) status = 'delayed';
  let reason = policy.reasonPrefix + '_' + status.toUpperCase();
  if (input.publication_delayed === true && status !== 'stale') {
    status = 'delayed';
    reason = policy.reasonPrefix + '_PUBLICATION_DELAY';
  }
  return hxSilverDeepFreeze_({
    status: status,
    expected_next_update: expectedNext,
    age_seconds: ageSeconds,
    reason_code: reason,
    policy_id: policyId,
    rule_version: HX_SILVER_VERSIONS.freshness
  });
}

function hxSilverConfidenceRank_(label) {
  return ({'very low':0, low:1, moderate:2, high:3, 'very high':4})[label];
}

function hxSilverConfidenceLabel_(rank) {
  return ['very low', 'low', 'moderate', 'high', 'very high'][Math.max(0, Math.min(4, rank))];
}

/**
 * Transparent qualitative-first confidence resolution.
 * Numeric confidence survives only when a supported existing score or
 * documented calculation is supplied and no degradation invalidates its
 * precision.
 */
function hxSilverResolveConfidence_(input) {
  input = input || {};
  const evidence = input.evidence || [];
  const eligible = evidence.filter(item => item.eligibility && item.eligibility.confidence);
  const blocked = evidence.filter(item => item.source_status === 'blocked');
  const stale = evidence.filter(item => item.freshness_status === 'stale');
  const partial = evidence.filter(item => item.source_status === 'partial');
  const shadow = evidence.filter(item => item.evidence_state === 'shadow');
  const basis = [];
  if (!eligible.length) {
    basis.push({code:'NO_ELIGIBLE_CONFIDENCE_EVIDENCE', effect:'confidence unavailable', count:0});
    if (blocked.length) basis.push({code:'BLOCKED_EVIDENCE_EXCLUDED', effect:'not neutral', count:blocked.length});
    if (shadow.length) basis.push({code:'SHADOW_EVIDENCE_EXCLUDED', effect:'observation only', count:shadow.length});
    return hxSilverDeepFreeze_({
      score: null,
      label: 'unavailable',
      basis: basis,
      limitations: hxSilverUnique_([blocked.length ? 'blocked inputs excluded' : '', shadow.length ? 'shadow observation only' : '']),
      rule_version: HX_SILVER_VERSIONS.confidence
    });
  }

  let rank = eligible.length >= 5 ? 3 : eligible.length >= 3 ? 2 : 1;
  basis.push({code:'ELIGIBLE_EVIDENCE_COUNT', effect:'base ' + hxSilverConfidenceLabel_(rank), count:eligible.length});
  const completeness = input.completeness === undefined ? 1 : Math.max(0, Math.min(1, Number(input.completeness)));
  if (completeness < .5) {
    rank = Math.min(rank, 1);
    basis.push({code:'LOW_COMPLETENESS', effect:'cap low', value:completeness});
  } else if (completeness < .8) {
    rank = Math.min(rank, 2);
    basis.push({code:'PARTIAL_COMPLETENESS', effect:'cap moderate', value:completeness});
  }
  if (partial.length) {
    rank = Math.min(rank, 2);
    basis.push({code:'PARTIAL_SOURCE', effect:'cap moderate', count:partial.length});
  }
  if (stale.length) {
    rank = Math.max(0, rank - 1);
    basis.push({code:'STALE_EVIDENCE', effect:'reduce one level', count:stale.length});
  }
  if (input.provider_agreement === 'disagreement' || input.provider_agreement === 'unresolved') {
    rank = Math.max(0, rank - 1);
    basis.push({code:'PROVIDER_AGREEMENT_UNRESOLVED', effect:'reduce one level'});
  }
  const contradiction = input.contradiction || {};
  if (contradiction.status === 'material_disagreement') {
    rank = Math.max(0, rank - 1);
    basis.push({code:'MATERIAL_DISAGREEMENT', effect:'reduce one level'});
  } else if (contradiction.status === 'unresolved_conflict') {
    rank = Math.max(0, rank - 2);
    basis.push({code:'UNRESOLVED_CONFLICT', effect:'reduce two levels'});
  }
  if (input.historical_validation === 'strong' && rank < 4) {
    rank += 1;
    basis.push({code:'STRONG_HISTORICAL_VALIDATION', effect:'increase one level'});
  }

  let score = null;
  const numeric = input.numeric_confidence || null;
  const numericAuthoritySupported = numeric &&
    (numeric.source_evidence_state === 'production_authoritative' ||
      (numeric.source_evidence_state === 'validated' && numeric.approved === true));
  const numericSupported = numeric && isFinite(Number(numeric.score)) &&
    numericAuthoritySupported &&
    (numeric.basis === 'authoritative_existing_score' ||
      (numeric.basis === 'documented_calculation' && numeric.method_version && Array.isArray(numeric.components) && numeric.components.length));
  const precisionDegraded = stale.length || partial.length || completeness < .8 ||
    input.provider_agreement === 'disagreement' || input.provider_agreement === 'unresolved' ||
    contradiction.status === 'material_disagreement' || contradiction.status === 'unresolved_conflict';
  if (numericSupported && !precisionDegraded) {
    score = Math.max(0, Math.min(100, Number(numeric.score)));
    basis.push({code:'NUMERIC_CONFIDENCE_ACCEPTED', effect:'preserve supported score', source:numeric.basis, authority:numeric.source_evidence_state, method_version:numeric.method_version || null});
    rank = score >= 90 ? 4 : score >= 75 ? 3 : score >= 50 ? 2 : score >= 25 ? 1 : 0;
  } else if (numeric) {
    basis.push({code:'NUMERIC_CONFIDENCE_WITHHELD', effect:'avoid false precision'});
  }
  return hxSilverDeepFreeze_({
    score: score,
    label: hxSilverConfidenceLabel_(rank),
    basis: basis,
    limitations: hxSilverUnique_([
      stale.length ? 'stale evidence reduces confidence' : '',
      partial.length ? 'partial evidence limits confidence' : '',
      shadow.length ? 'shadow observation only' : '',
      precisionDegraded && numeric ? 'numeric confidence withheld' : ''
    ]),
    rule_version: HX_SILVER_VERSIONS.confidence
  });
}

function hxSilverRelationshipSide_(relationship) {
  if (['strongly supportive', 'supportive', 'mildly supportive'].indexOf(relationship) >= 0) return 'support';
  if (['strongly challenging', 'challenging', 'mildly challenging'].indexOf(relationship) >= 0) return 'challenge';
  return 'other';
}

/**
 * Distinguishes real conflict states and preserves the evidence that dominates
 * or challenges the conclusion.
 */
function hxSilverResolveContradiction_(input) {
  input = input || {};
  const evidence = (input.evidence || []).filter(item => item.eligibility && item.eligibility.contextual_interpretation);
  const missing = hxSilverUnique_(input.missing_metrics || []);
  const support = evidence.filter(item => hxSilverRelationshipSide_(item.silver_relationship) === 'support');
  const challenge = evidence.filter(item => hxSilverRelationshipSide_(item.silver_relationship) === 'challenge');
  const sortEvidence = items => items.slice().sort((a, b) =>
    Number(b.interpretive_weight || 0) - Number(a.interpretive_weight || 0) ||
    String(a.canonical_metric).localeCompare(String(b.canonical_metric)));
  const supportWeight = support.reduce((sum, item) => sum + Number(item.interpretive_weight || 0), 0);
  const challengeWeight = challenge.reduce((sum, item) => sum + Number(item.interpretive_weight || 0), 0);
  const total = supportWeight + challengeWeight;
  let status = 'missing_evidence';
  if (total > 0 && (!support.length || !challenge.length)) status = missing.length ? 'partial_agreement' : 'agreement';
  else if (total > 0) {
    const dominance = Math.abs(supportWeight - challengeWeight) / total;
    status = dominance >= .5 ? 'partial_agreement' : dominance < .15 ? 'unresolved_conflict' : 'material_disagreement';
  }
  const dominantSide = supportWeight > challengeWeight ? 'support' : challengeWeight > supportWeight ? 'challenge' : 'none';
  const primarySupport = sortEvidence(support)[0] || null;
  const primaryChallenge = sortEvidence(challenge)[0] || null;
  const dominantEvidence = dominantSide === 'support' ? primarySupport : dominantSide === 'challenge' ? primaryChallenge : null;
  let confirmation = 'Acquire eligible current evidence.';
  if (status === 'agreement') confirmation = 'Confirm persistence in the next valid observation.';
  else if (status === 'partial_agreement') confirmation = 'Confirm the dominant evidence while monitoring the secondary challenge.';
  else if (status === 'material_disagreement') confirmation = 'Resolve the material disagreement before increasing conviction.';
  else if (status === 'unresolved_conflict') confirmation = 'Obtain independent confirmation before forming an operational conclusion.';
  return hxSilverDeepFreeze_({
    status: status,
    dominant_side: dominantSide,
    dominant_evidence: dominantEvidence,
    primary_support: primarySupport,
    primary_challenge: primaryChallenge,
    secondary_challenge: dominantSide === 'support' ? primaryChallenge : dominantSide === 'challenge' ? primarySupport : null,
    support_weight: Number(supportWeight.toFixed(4)),
    challenge_weight: Number(challengeWeight.toFixed(4)),
    confidence_impact: status === 'unresolved_conflict' ? 'reduce_two_levels' : status === 'material_disagreement' ? 'reduce_one_level' : status === 'missing_evidence' ? 'unavailable' : 'none',
    required_confirmation: confirmation,
    no_operational_conclusion: status === 'unresolved_conflict' || status === 'missing_evidence',
    missing_metrics: missing,
    rule_version: HX_SILVER_VERSIONS.contradiction
  });
}

function hxSilverAggregateSourceStatus_(evidence) {
  if (!evidence.length) return 'unavailable';
  const statuses = evidence.map(item => item.source_status);
  const usable = statuses.filter(status => status === 'available').length;
  if (!usable) {
    if (statuses.indexOf('blocked') >= 0) return 'blocked';
    if (statuses.indexOf('failed') >= 0) return 'failed';
    return statuses.indexOf('partial') >= 0 ? 'partial' : 'unavailable';
  }
  return usable === statuses.length ? 'available' : 'partial';
}

function hxSilverAggregateFreshness_(evidence) {
  if (!evidence.length) return 'unknown';
  const statuses = evidence.map(item => item.freshness_status);
  if (statuses.indexOf('stale') >= 0) return 'stale';
  if (statuses.indexOf('unknown') >= 0) return 'unknown';
  if (statuses.indexOf('delayed') >= 0) return 'delayed';
  return 'current';
}

function hxSilverAggregateEvidenceState_(evidence) {
  const order = ['production_authoritative', 'validated', 'shadow', 'research_only', 'placeholder'];
  for (let i = 0; i < order.length; i++) {
    if (evidence.some(item => item.evidence_state === order[i])) return order[i];
  }
  return 'placeholder';
}

function hxSilverRelationshipFromWeights_(contradiction, evidence) {
  const contextual = evidence.filter(item => item.eligibility && item.eligibility.contextual_interpretation);
  if (!contextual.length) return evidence.some(item => item.evidence_state === 'shadow') ? 'observation only' : 'observation only';
  const support = Number(contradiction.support_weight || 0);
  const challenge = Number(contradiction.challenge_weight || 0);
  const total = support + challenge;
  if (!total) return 'neutral';
  const ratio = (support - challenge) / total;
  if (ratio >= .75) return 'strongly supportive';
  if (ratio >= .3) return 'supportive';
  if (ratio > .05) return 'mildly supportive';
  if (ratio <= -.75) return 'strongly challenging';
  if (ratio <= -.3) return 'challenging';
  if (ratio < -.05) return 'mildly challenging';
  return 'mixed';
}

function hxSilverActionBias_(sectionId, sourceStatus, freshnessStatus, relationship, contradiction, confidence, reversalRisk) {
  if (sourceStatus === 'blocked' || sourceStatus === 'unavailable' || sourceStatus === 'failed') return 'unavailable';
  if (freshnessStatus === 'stale' || freshnessStatus === 'unknown') return 'no_operational_conclusion';
  if (contradiction.no_operational_conclusion) return 'no_operational_conclusion';
  if (reversalRisk === true) return 'reversal_risk_elevated';
  if (['strongly challenging', 'challenging', 'mildly challenging'].indexOf(relationship) >= 0) {
    if (String(sectionId).indexOf('monetary') >= 0) return 'monetary_headwind';
    if (String(sectionId).indexOf('volatility') >= 0 || String(sectionId).indexOf('vix') >= 0) return 'volatility_headwind';
    return 'caution';
  }
  if (['strongly supportive', 'supportive', 'mildly supportive'].indexOf(relationship) >= 0) {
    return ['high', 'very high'].indexOf(confidence.label) >= 0 ? 'continuation_favored' : 'supportive_confirmation_required';
  }
  return 'neutral';
}

function hxSilverMarketImpact_(state) {
  return ({
    strengthening:'Market pressure is strengthening.',
    weakening:'Market pressure is weakening.',
    expanding:'Market range and pressure are expanding.',
    compressing:'Market range and pressure are compressing.',
    stable:'Market conditions are stable.',
    mixed:'Market evidence is mixed.',
    diverging:'Market evidence is diverging.',
    blocked:'Market evidence is blocked.',
    stale:'Market evidence is stale.',
    unavailable:'Market evidence is unavailable.'
  })[state];
}

function hxSilverBuildProvenance_(evidence) {
  return hxSilverDeepFreeze_({
    target_instrument: 'XAGUSD',
    source_systems: hxSilverUnique_(evidence.map(item => item.source)),
    providers: hxSilverUnique_(evidence.map(item => item.provider)),
    source_timestamps: hxSilverUnique_(evidence.map(item => item.timestamp)),
    provenance_pointers: hxSilverUnique_(evidence.map(item => item.provenance_pointer)),
    transformations: hxSilverUnique_(evidence.reduce((all, item) => all.concat(item.transformations || []), [])),
    evidence: evidence.map(item => ({
      evidence_id:item.evidence_id,
      canonical_metric:item.canonical_metric,
      source:item.source,
      provider:item.provider,
      timestamp:item.timestamp,
      evidence_state:item.evidence_state,
      source_status:item.source_status,
      freshness_status:item.freshness_status,
      reason_codes:item.reason_codes,
      provenance_pointer:item.provenance_pointer
    })),
    evidence_contract_version: HX_SILVER_VERSIONS.evidence,
    authority_rule_version: HX_SILVER_VERSIONS.authority,
    freshness_rule_version: HX_SILVER_VERSIONS.freshness
  });
}

/**
 * Builds the one authoritative SilverInterpretation consumed by every
 * renderer. No production state is read or written.
 */
function hxSilverBuildInterpretation_(input) {
  input = input || {};
  const evidence = (input.evidence || []).map(item => Object.isFrozen(item) ? item : hxSilverEvidence_(item));
  const state = hxSilverAssertEnum_(String(input.current_state || 'unavailable'), HX_SILVER_ENUMS.stateVocabulary, 'current_state');
  if (!input.section_id || !input.section_name) throw new Error('Silver interpretation section_id and section_name are required.');
  const asOf = hxSilverIso_(input.as_of);
  if (!asOf) throw new Error('Silver interpretation as_of is required.');
  const sourceStatus = hxSilverAggregateSourceStatus_(evidence);
  const freshness = hxSilverAggregateFreshness_(evidence);
  const contradiction = hxSilverResolveContradiction_({evidence:evidence, missing_metrics:input.missing_metrics || []});
  const actionEvidence = evidence.filter(item => item.eligibility && item.eligibility.action_bias);
  const actionContradiction = hxSilverResolveContradiction_({evidence:actionEvidence, missing_metrics:input.missing_metrics || []});
  const confidence = hxSilverResolveConfidence_({
    evidence:evidence,
    completeness:input.completeness,
    provider_agreement:input.provider_agreement,
    contradiction:contradiction,
    historical_validation:input.historical_validation,
    numeric_confidence:input.numeric_confidence
  });
  const relationship = hxSilverRelationshipFromWeights_(contradiction, evidence);
  const actionRelationship = hxSilverRelationshipFromWeights_(actionContradiction, actionEvidence);
  const actionBias = hxSilverActionBias_(input.section_id, sourceStatus, freshness, actionRelationship, actionContradiction, confidence, input.reversal_risk);
  const primarySupport = contradiction.primary_support ? contradiction.primary_support.canonical_metric : 'none';
  const primaryChallenge = contradiction.primary_challenge ? contradiction.primary_challenge.canonical_metric : 'none';
  const limitations = hxSilverUnique_(
    (input.limitations || [])
      .concat(evidence.reduce((all, item) => all.concat(item.limitations || []), []))
      .concat(confidence.limitations || [])
      .concat(evidence.some(item => item.evidence_state === 'shadow') ? ['shadow observation only'] : [])
  );
  const reasonCodes = hxSilverUnique_(
    (input.reason_codes || [])
      .concat(evidence.reduce((all, item) => all.concat(item.reason_codes || []), []))
      .concat(contradiction.status === 'missing_evidence' ? ['MISSING_EVIDENCE'] : [])
      .concat(sourceStatus === 'blocked' ? ['SOURCE_BLOCKED'] : [])
  );
  const primaryRisk = primaryChallenge !== 'none' ? primaryChallenge + ' challenges the dominant evidence.' :
    limitations.length ? limitations[0] + '.' : 'The evidence state may change with the next authoritative observation.';
  const marketImpact = hxSilverMarketImpact_(state);
  const interpretation = String(input.section_name) + ' is ' + state + '. ' + marketImpact +
    ' Its relationship to silver is ' + relationship + '.';
  const base = {
    section_id: String(input.section_id),
    section_name: String(input.section_name),
    target_instrument: 'XAGUSD',
    as_of: asOf,
    market_session: String(input.market_session || 'unknown'),
    source_status: sourceStatus,
    freshness_status: freshness,
    evidence_state: hxSilverAggregateEvidenceState_(evidence),
    current_state: state,
    interpretation: interpretation,
    market_impact: marketImpact,
    silver_impact: relationship,
    action_bias: actionBias,
    primary_support: primarySupport,
    primary_challenge: primaryChallenge,
    primary_risk: primaryRisk,
    required_confirmation: contradiction.required_confirmation,
    confidence_score: confidence.score,
    confidence_label: confidence.label,
    confidence_basis: confidence.basis,
    limitations: limitations,
    reason_codes: reasonCodes,
    source_provenance: hxSilverBuildProvenance_(evidence),
    underlying_metrics: evidence.map(item => ({
      evidence_id:item.evidence_id,
      evidence_kind:item.evidence_kind,
      canonical_metric:item.canonical_metric,
      value:item.value,
      unit:item.unit,
      direction:item.direction,
      silver_relationship:item.silver_relationship,
      reference_interval:item.reference_interval,
      timestamp:item.timestamp,
      authority:item.evidence_state,
      freshness:item.freshness_status,
      quality:item.quality,
      eligibility:item.eligibility,
      provenance_pointer:item.provenance_pointer
    })),
    operator_summary: 'Monitor ' + (contradiction.required_confirmation || 'the next authoritative observation'),
    long_summary: null,
    short_summary: null,
    dashboard_summary: null,
    telegram_summary: null,
    contradiction: contradiction,
    notification_permitted: evidence.some(item => item.eligibility && item.eligibility.notification),
    production_effect: 'none',
    rule_version: HX_SILVER_VERSIONS.rule,
    schema_version: HX_SILVER_VERSIONS.schema
  };
  return hxSilverAttachRenderings_(base);
}

const HX_SILVER_INTERPRETATION_REQUIRED_FIELDS = Object.freeze([
  'section_id', 'section_name', 'target_instrument', 'as_of', 'market_session',
  'source_status', 'freshness_status', 'evidence_state', 'current_state',
  'interpretation', 'market_impact', 'silver_impact', 'action_bias',
  'primary_support', 'primary_challenge', 'primary_risk',
  'required_confirmation', 'confidence_score', 'confidence_label',
  'confidence_basis', 'limitations', 'reason_codes', 'source_provenance',
  'underlying_metrics', 'operator_summary', 'long_summary', 'short_summary',
  'dashboard_summary', 'telegram_summary', 'rule_version', 'schema_version'
]);

function hxSilverValidateInterpretation_(value) {
  if (!value || typeof value !== 'object') return {ok:false, errors:['INTERPRETATION_OBJECT_REQUIRED']};
  const errors = [];
  HX_SILVER_INTERPRETATION_REQUIRED_FIELDS.forEach(field => {
    if (!Object.prototype.hasOwnProperty.call(value, field)) errors.push('MISSING_' + field.toUpperCase());
  });
  if (value.target_instrument !== 'XAGUSD') errors.push('TARGET_MUST_BE_XAGUSD');
  if (HX_SILVER_ENUMS.sourceStatus.indexOf(value.source_status) < 0) errors.push('INVALID_SOURCE_STATUS');
  if (HX_SILVER_ENUMS.freshnessStatus.indexOf(value.freshness_status) < 0) errors.push('INVALID_FRESHNESS_STATUS');
  if (HX_SILVER_ENUMS.evidenceState.indexOf(value.evidence_state) < 0) errors.push('INVALID_EVIDENCE_STATE');
  if (HX_SILVER_ENUMS.actionBias.indexOf(value.action_bias) < 0) errors.push('INVALID_ACTION_BIAS');
  if (value.confidence_score !== null && (!isFinite(Number(value.confidence_score)) || Number(value.confidence_score) < 0 || Number(value.confidence_score) > 100)) errors.push('INVALID_CONFIDENCE_SCORE');
  return {ok:errors.length === 0, errors:errors};
}

function hxSilverStableValue_(value) {
  if (Array.isArray(value)) return value.map(hxSilverStableValue_);
  if (value && typeof value === 'object') {
    const out = {};
    Object.keys(value).sort().forEach(key => out[key] = hxSilverStableValue_(value[key]));
    return out;
  }
  return value;
}

function hxSilverSerializeInterpretation_(value) {
  const validation = hxSilverValidateInterpretation_(value);
  if (!validation.ok) throw new Error('Invalid SilverInterpretation: ' + validation.errors.join(','));
  return JSON.stringify(hxSilverStableValue_(value));
}
