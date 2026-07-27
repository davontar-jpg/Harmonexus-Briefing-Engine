/**
 * HEL-035 Silver Intelligence interpretation layer.
 *
 * This inactive, deterministic module translates explicit read-only HEL-034
 * snapshots into concept-first silver intelligence. It never reads HEL-033,
 * recalculates validation, changes dispositions, increments OOS observations,
 * or creates a production action.
 */
const HX_SILVER_EXTERNAL_VERSION = 'HEL-035.silver-intelligence.1.0.0';

const HX_SILVER_EXTERNAL_LABELS = Object.freeze([
  'Shadow Observation', 'Validation', 'Production Approved', 'Research', 'Blocked'
]);

const HX_SILVER_EXTERNAL_STATES = Object.freeze([
  'strongly supportive', 'supportive', 'neutral', 'mixed',
  'challenging', 'strongly challenging', 'unavailable'
]);

const HX_SILVER_EXTERNAL_CONCEPTS = Object.freeze([
  Object.freeze({
    id:'industrial_producer_participation',
    name:'Industrial Producer Participation',
    symbols:Object.freeze(['COPX']),
    expected:'positive',
    strengthening:'Industrial producer participation strengthening',
    weakening:'Industrial producer participation weakening',
    mixed:'Industrial participation mixed',
    unavailable:'Industrial participation unavailable',
    meaning:'Copper-producer participation provides a read on industrial demand breadth relevant to silver.'
  }),
  Object.freeze({
    id:'strategic_materials',
    name:'Strategic Materials',
    symbols:Object.freeze(['REMX']),
    expected:'positive',
    strengthening:'Strategic materials confirming',
    weakening:'Strategic materials weakening',
    mixed:'Strategic materials diverging',
    unavailable:'Strategic materials unavailable',
    meaning:'Strategic-material participation provides electrification and industrial-demand context for silver.'
  }),
  Object.freeze({
    id:'industrial_commodity_breadth',
    name:'Industrial Commodity Breadth',
    symbols:Object.freeze(['DBB']),
    expected:'positive',
    strengthening:'Commodity participation broadening',
    weakening:'Commodity participation narrowing',
    mixed:'Industrial participation mixed',
    unavailable:'Industrial commodity breadth unavailable',
    meaning:'Base-metals breadth tests whether silver is moving with a broader industrial commodity complex.'
  }),
  Object.freeze({
    id:'solar_participation',
    name:'Solar Participation',
    symbols:Object.freeze(['TAN']),
    expected:'positive',
    strengthening:'Solar participation expanding',
    weakening:'Solar participation contracting',
    mixed:'Solar participation neutral',
    unavailable:'Solar participation unavailable',
    meaning:'Solar participation supplies a regime-sensitive demand context rather than a direct silver signal.'
  }),
  Object.freeze({
    id:'physical_economy',
    name:'Physical Economy',
    symbols:Object.freeze(['SEA']),
    expected:'positive',
    strengthening:'Physical economy strengthening',
    weakening:'Physical economy weakening',
    mixed:'Physical economy mixed',
    unavailable:'Physical economy unavailable',
    meaning:'Shipping participation provides slow physical-economy context for silver industrial demand.'
  }),
  Object.freeze({
    id:'china_liquidity',
    name:'China Liquidity',
    symbols:Object.freeze(['USDCNH']),
    expected:'inverse',
    strengthening:'China liquidity conditions supportive',
    weakening:'China liquidity pressure increasing',
    mixed:'China liquidity mixed',
    unavailable:'China liquidity unavailable',
    meaning:'Offshore yuan behavior can challenge or support China-sensitive industrial demand context.'
  }),
  Object.freeze({
    id:'energy_regime',
    name:'Energy Regime',
    symbols:Object.freeze(['WTI_FUTURES', 'WTI']),
    expected:'regime',
    strengthening:'Energy confirming industrial regime',
    weakening:'Energy challenging industrial regime',
    mixed:'Energy regime mixed or session dependent',
    unavailable:'Energy regime unavailable',
    meaning:'Energy is a regime-classified inflation and industrial input; it is never treated as universally inverse to silver.'
  }),
  Object.freeze({
    id:'grid_infrastructure',
    name:'Grid Infrastructure',
    symbols:Object.freeze(['GRID']),
    expected:'positive',
    strengthening:'Grid infrastructure participation strengthening',
    weakening:'Grid infrastructure participation weakening',
    mixed:'Grid infrastructure participation mixed',
    unavailable:'Grid infrastructure participation unavailable',
    meaning:'Grid investment participation supplies electrification-demand context for silver.'
  }),
  Object.freeze({
    id:'defensive_dollar_pressure',
    name:'Defensive Dollar Pressure',
    symbols:Object.freeze(['USDCHF']),
    expected:'inverse',
    strengthening:'Defensive dollar pressure increasing',
    weakening:'Defensive dollar pressure weakening',
    mixed:'Defensive dollar pressure mixed',
    unavailable:'Defensive dollar pressure unavailable',
    meaning:'The defensive dollar cross supplies incremental pressure context and does not replace production DXY intelligence.'
  }),
  Object.freeze({
    id:'industrial_metals_participation',
    name:'Industrial Metals Participation',
    symbols:Object.freeze(['PALLADIUM']),
    expected:'positive',
    strengthening:'Industrial metals participation strengthening',
    weakening:'Industrial metals participation weakening',
    mixed:'Industrial metals participation mixed',
    unavailable:'Industrial metals participation unavailable',
    meaning:'Palladium supplies broader industrial-metals participation context for silver.'
  })
]);

function hxSilverExternalClone_(value) {
  if (Array.isArray(value)) return value.map(hxSilverExternalClone_);
  if (value && typeof value === 'object') {
    const out = {};
    Object.keys(value).forEach(key => out[key] = hxSilverExternalClone_(value[key]));
    return out;
  }
  return value;
}

function hxSilverExternalArray_(value) {
  return Array.isArray(value) ? value : [];
}

function hxSilverExternalIndex_(values) {
  const index = {};
  hxSilverExternalArray_(values).forEach(item => {
    const symbol = String(item && item.canonical_symbol || '').toUpperCase();
    if (symbol) index[symbol] = hxSilverExternalClone_(item);
  });
  return index;
}

function hxSilverExternalOosIndex_(value) {
  const candidates = value && value.candidates;
  if (!candidates || typeof candidates !== 'object' || Array.isArray(candidates)) return {};
  return hxSilverExternalClone_(candidates);
}

function hxSilverExternalDisposition_(decision) {
  const value = String(decision || '').trim().toUpperCase();
  if (value === 'PROMOTE TO SHADOW') return {label:'Shadow Observation', state:'shadow'};
  if (value === 'CONTINUE VALIDATION') return {label:'Validation', state:'research_only'};
  if (value === 'PRODUCTION APPROVED' || value === 'PRODUCTION-APPROVED')
    return {label:'Production Approved', state:'production_authoritative'};
  if (value === 'DATA BLOCKED') return {label:'Blocked', state:'placeholder'};
  return {label:'Research', state:'research_only'};
}

function hxSilverExternalFreshness_(candidate) {
  const value = String(candidate && candidate.data_freshness || '').toLowerCase();
  if (value === 'fresh' || value === 'current') return 'current';
  if (value.indexOf('delay') >= 0) return 'delayed';
  if (value.indexOf('stale') >= 0 || value.indexOf('missing') >= 0) return 'stale';
  return 'unknown';
}

function hxSilverExternalConfidenceLabel_(score, sourceLabel, freshness) {
  if (sourceLabel === 'Blocked' || freshness === 'stale' || score === null) return 'unavailable';
  let label = score >= 85 ? 'high' : score >= 65 ? 'moderate' : score >= 40 ? 'low' : 'very low';
  if (sourceLabel !== 'Production Approved' && label === 'high') label = 'moderate';
  if (sourceLabel === 'Research' && label === 'moderate') label = 'low';
  return label;
}

function hxSilverExternalRelationship_(concept, candidate) {
  if (!candidate) return 'unavailable';
  const decision = String(candidate.decision || '').toUpperCase();
  if (decision === 'DATA BLOCKED') return 'unavailable';
  if (hxSilverExternalFreshness_(candidate) === 'stale') return 'unavailable';
  const confirmation = String(candidate.confirmation_status || '').toLowerCase();
  const challenge = String(candidate.challenge_status || '').toLowerCase();
  const candidateDirection = String(candidate.candidate_direction || '').toLowerCase();
  const silverDirection = String(candidate.silver_direction || '').toLowerCase();

  if (concept.expected === 'regime') {
    if (confirmation === 'confirming' || (candidateDirection === silverDirection &&
        ['up', 'down'].indexOf(candidateDirection) >= 0)) return 'supportive';
    if (challenge === 'challenging') return 'challenging';
    return 'mixed';
  }
  if (confirmation === 'confirming') {
    if (concept.expected === 'inverse') {
      return candidateDirection === 'up' && silverDirection === 'down' ? 'challenging' :
        candidateDirection === 'down' && silverDirection === 'up' ? 'supportive' : 'supportive';
    }
    return 'supportive';
  }
  if (challenge === 'challenging' || confirmation === 'not_confirming') return 'challenging';
  if (candidateDirection === 'flat' || silverDirection === 'flat') return 'neutral';
  return 'mixed';
}

function hxSilverExternalState_(concept, relationship, candidate, label) {
  if (label === 'Blocked') return 'Data Blocked';
  if (relationship === 'unavailable') return concept.unavailable;
  if (relationship === 'supportive') return concept.strengthening;
  if (relationship === 'challenging') return concept.weakening;
  if (relationship === 'neutral') return concept.mixed;
  if (concept.id === 'solar_participation' && label === 'Shadow Observation')
    return 'Solar participation — shadow observation';
  return concept.mixed;
}

function hxSilverExternalImpact_(concept, relationship, label) {
  if (label === 'Blocked') return 'No production interpretation authorized.';
  if (relationship === 'unavailable') return 'No current silver interpretation is authorized.';
  if (relationship === 'supportive')
    return concept.meaning + ' Current evidence supports silver context, subject to market-structure confirmation.';
  if (relationship === 'challenging')
    return concept.meaning + ' Current evidence challenges silver confirmation and requires reconciliation with market structure.';
  if (relationship === 'neutral') return concept.meaning + ' Current evidence is neutral for silver.';
  return concept.meaning + ' Current evidence is mixed and does not independently resolve the silver thesis.';
}

function hxSilverExternalContextSide_(value) {
  if (!value || typeof value !== 'object') return 'unavailable';
  const text = [
    value.silver_impact, value.current_state, value.action_bias,
    value.interpretation
  ].filter(Boolean).join(' ').toLowerCase();
  if (/unavailable|blocked|missing|no operational conclusion/.test(text)) return 'unavailable';
  if (/challeng|headwind|caution|reversal|weak/.test(text)) return 'challenging';
  if (/support|continuation favored|strength/.test(text)) return 'supportive';
  return 'mixed';
}

function hxSilverExternalContext_(snapshot) {
  const values = [
    {name:'Current Market Structure', value:snapshot.current_market_structure},
    {name:'Current Monetary Environment', value:snapshot.monetary_environment},
    {name:'Current VIX Environment', value:snapshot.vix_environment}
  ];
  return values.map(item => ({
    name:item.name,
    relationship:hxSilverExternalContextSide_(item.value),
    as_of:item.value && item.value.as_of || null,
    source_status:item.value && item.value.source_status || 'unavailable',
    provenance_pointer:item.value && item.value.source_provenance || null
  }));
}

function hxSilverExternalCandidate_(concept, indexes, snapshot, asOf) {
  let symbol = null;
  for (let i = 0; i < concept.symbols.length; i++) {
    if (indexes.shadow[concept.symbols[i]]) {
      symbol = concept.symbols[i];
      break;
    }
  }
  const candidate = symbol ? indexes.shadow[symbol] : null;
  const validation = symbol ? indexes.validation[symbol] : null;
  const registry = symbol ? indexes.registry[symbol] : null;
  const oos = symbol ? indexes.oos[symbol] || null : null;
  const candidateDecision = candidate && candidate.decision;
  const validationDecision = validation && validation.decision;
  const conflict = candidateDecision && validationDecision &&
    String(candidateDecision) !== String(validationDecision);
  const decision = conflict ? 'DISPOSITION CONFLICT' :
    String(validationDecision || candidateDecision || 'UNAVAILABLE');
  const disposition = conflict ?
    {label:'Research', state:'research_only'} : hxSilverExternalDisposition_(decision);
  const freshness = candidate ? hxSilverExternalFreshness_(candidate) : 'unknown';
  const relationship = conflict ? 'unavailable' :
    hxSilverExternalRelationship_(concept, candidate);
  const sourceScore = candidate && Number.isFinite(Number(candidate.confidence)) ?
    Number(candidate.confidence) : null;
  const sourceLabel = disposition.label;
  const currentState = hxSilverExternalState_(concept, relationship, candidate, sourceLabel);
  const blocked = sourceLabel === 'Blocked';
  const unavailable = !candidate || relationship === 'unavailable';
  const sourceStatus = blocked ? 'blocked' : !candidate ? 'unavailable' :
    conflict ? 'partial' : 'available';
  const reasonCodes = hxSilverUnique_([
    'HEL034_READ_ONLY',
    'PRODUCTION_EFFECT_NONE',
    'HEL034_' + String(decision).toUpperCase().replace(/[^A-Z0-9]+/g, '_'),
    conflict ? 'HEL034_DISPOSITION_CONFLICT' : '',
    freshness === 'stale' ? 'HEL034_SHADOW_STALE' : '',
    unavailable && !blocked ? 'HEL034_CANDIDATE_UNAVAILABLE' : '',
    blocked ? 'HEL034_DATA_BLOCKED' : '',
    sourceLabel !== 'Production Approved' ? 'NO_PRODUCTION_PROMOTION' : ''
  ]);
  const confidenceLabel = hxSilverExternalConfidenceLabel_(sourceScore, sourceLabel, freshness);
  const interpretation = blocked && concept.id === 'china_liquidity' ?
    'Daily offshore CNH validation incomplete.' :
    unavailable ? 'No eligible current HEL-034 observation is available.' :
    currentState + '. ' + concept.meaning;
  const requiredConfirmation = blocked && concept.id === 'china_liquidity' ?
    'Complete reliable daily offshore CNH validation in HEL-034.' :
    'Require fresh HEL-034 evidence and confirmation from current silver market structure.';
  const primaryRisk = conflict ?
    'HEL-034 disposition artifacts disagree; interpretation is withheld.' :
    blocked ? 'Blocked data must not be treated as neutral.' :
    sourceLabel === 'Shadow Observation' ? 'Shadow evidence is not production approval.' :
    sourceLabel === 'Validation' ? 'Validation evidence remains incomplete.' :
    sourceLabel === 'Research' ? 'Research context is not eligible for production conclusions.' :
    'The relationship can change with regime and source freshness.';
  const productionCopper = concept.id === 'industrial_producer_participation' ?
    hxSilverExternalClone_(snapshot.current_production && snapshot.current_production.copper || null) : null;

  return hxSilverDeepFreeze_({
    subsection_id:concept.id,
    subsection_name:concept.name,
    target_instrument:'XAGUSD',
    source_label:sourceLabel,
    source_status:sourceStatus,
    evidence_state:disposition.state,
    current_state:currentState,
    interpretation:interpretation,
    silver_impact:hxSilverExternalImpact_(concept, relationship, sourceLabel),
    relationship:relationship,
    action_bias:'no_operational_conclusion',
    primary_risk:primaryRisk,
    required_confirmation:requiredConfirmation,
    confidence:{
      score:null,
      label:confidenceLabel,
      basis:{
        conclusion_precision:'qualitative',
        hel034_source_confidence:sourceScore,
        authority_label:sourceLabel,
        freshness:freshness,
        limitation:'HEL-034 context does not constitute production approval.'
      }
    },
    shadow_confidence:sourceScore,
    production_contribution:'none',
    current_freshness:freshness,
    current_timestamp:candidate && candidate.latest_synchronized_timestamp || null,
    source:'HEL-034',
    current_disposition:decision,
    current_provenance:'HEL-034 shadow current / validation / finalist registry / OOS ledger',
    evidence:{
      concept:concept.name,
      expandable:{
        ticker:symbol,
        expected_relationship:registry && registry.expected_relationship ||
          validation && validation.expected_relationship || candidate && candidate.expected_relationship || null,
        candidate_direction:candidate && candidate.candidate_direction || null,
        silver_direction:candidate && candidate.silver_direction || null,
        confirmation_status:candidate && candidate.confirmation_status || null,
        challenge_status:candidate && candidate.challenge_status || null,
        divergence_status:candidate && candidate.divergence_status || null,
        source_interval:candidate && candidate.source_interval || null,
        current_regime:candidate && candidate.current_regime || null,
        hel034_source_confidence:sourceScore,
        no_trade_or_insufficient_confidence:candidate ?
          candidate.no_trade_or_insufficient_confidence === true : true,
        oos_observation_counts:oos ? {
          daily:Number(oos.daily_observations || oos.daily || 0),
          intraday:Number(oos.intraday_observations || oos.intraday || 0),
          copied_read_only:true
        } : null,
        current_production_copper:productionCopper
      }
    },
    freshness:{
      status:freshness,
      source_status:candidate && candidate.data_freshness || 'unavailable',
      latest_synchronized_timestamp:candidate && candidate.latest_synchronized_timestamp || null,
      source_interval:candidate && candidate.source_interval || null,
      evaluated_at:asOf
    },
    provenance:{
      authority:'HEL-034',
      source_artifacts:[
        'HEL-034 finalist registry',
        'HEL-034 validation results',
        'HEL-034 shadow current',
        'HEL-034 OOS ledger'
      ],
      canonical_symbol:symbol,
      disposition:decision,
      production_effect:'none',
      read_only:true,
      transformations:['concept-first translation', 'authority-label preservation'],
      reason_codes:reasonCodes,
      rule_version:HX_SILVER_EXTERNAL_VERSION
    }
  });
}

function hxSilverExternalSynthesis_(subsections, context) {
  const eligible = subsections.filter(item =>
    item.relationship !== 'unavailable' &&
    item.source_label !== 'Research' &&
    item.source_label !== 'Blocked'
  );
  const supportive = eligible.filter(item => item.relationship === 'supportive');
  const challenging = eligible.filter(item => item.relationship === 'challenging');
  const neutral = eligible.filter(item =>
    item.relationship === 'neutral' || item.relationship === 'mixed');
  let label = 'Unavailable';
  if (eligible.length) {
    const balance = (supportive.length - challenging.length) / eligible.length;
    if (supportive.length && challenging.length && Math.abs(balance) < .5) label = 'Mixed';
    else if (balance >= .67) label = 'Strongly Supportive';
    else if (balance > .15) label = 'Supportive';
    else if (balance <= -.67) label = 'Strongly Challenging';
    else if (balance < -.15) label = 'Challenging';
    else label = neutral.length === eligible.length ? 'Neutral' : 'Mixed';
  }
  const supportiveNames = supportive.map(item => item.subsection_name);
  const challengingNames = challenging.map(item => item.subsection_name);
  const blockedNames = subsections.filter(item => item.source_label === 'Blocked')
    .map(item => item.subsection_name);
  const parts = [];
  if (supportiveNames.length) parts.push(supportiveNames.join(', ') + ' support the current silver context');
  if (challengingNames.length) parts.push(challengingNames.join(', ') + ' challenge it');
  if (blockedNames.length) parts.push(blockedNames.join(', ') + ' remain data blocked and are excluded');
  if (!parts.length) parts.push('No eligible HEL-034 external observation is available');
  const contextAvailable = context.filter(item => item.relationship !== 'unavailable');
  if (contextAvailable.length) {
    parts.push('current market structure, monetary, and volatility context remain separate confirmation authorities');
  }
  return hxSilverDeepFreeze_({
    state:label,
    explanation:parts.join('; ') + '.',
    supportive_concepts:supportiveNames,
    challenging_concepts:challengingNames,
    blocked_concepts:blockedNames,
    eligible_count:eligible.length,
    context_alignment:context,
    action_bias:'no_operational_conclusion',
    production_effect:'none',
    rule_version:HX_SILVER_EXTERNAL_VERSION
  });
}

function hxSilverRenderExternalLong_(interpretation) {
  const lines = [
    'SILVER INTELLIGENCE',
    'Target: XAGUSD / SILVER',
    'Overall External Confirmation: ' + interpretation.current_state,
    interpretation.interpretation,
    ''
  ];
  interpretation.silver_intelligence.subsections.forEach(item => {
    lines.push(item.subsection_name);
    lines.push('Status: ' + item.source_label);
    lines.push('Current State: ' + item.current_state);
    lines.push('Interpretation: ' + item.interpretation);
    lines.push('Silver Impact: ' + item.silver_impact);
    lines.push('Action Bias: No operational conclusion');
    lines.push('Primary Risk: ' + item.primary_risk);
    lines.push('Required Confirmation: ' + item.required_confirmation);
    lines.push('Confidence: ' + item.confidence.label);
    lines.push('Shadow Confidence: ' +
      (item.shadow_confidence === null ? 'unavailable' : item.shadow_confidence));
    lines.push('Production Contribution: ' + item.production_contribution);
    lines.push('Freshness: ' + item.freshness.status);
    lines.push('Timestamp: ' + (item.current_timestamp || 'unavailable'));
    lines.push('Source: ' + item.source);
    lines.push('Disposition: ' + item.current_disposition);
    lines.push('Provenance: ' + item.current_provenance);
    lines.push('');
  });
  lines.push('Action Bias: No operational conclusion');
  lines.push('Primary Risk: ' + interpretation.primary_risk);
  lines.push('Required Confirmation: ' + interpretation.required_confirmation);
  lines.push('Confidence: ' + interpretation.confidence_label);
  return hxSilverAssertLanguageSafe_(lines.join('\n'));
}

function hxSilverRenderExternalShort_(interpretation) {
  return hxSilverAssertLanguageSafe_(
    'Silver Intelligence: ' + interpretation.current_state + '. ' +
    interpretation.silver_intelligence.overall_external_confirmation.explanation +
    ' Confidence: ' + interpretation.confidence_label +
    '; shadow and validation evidence cannot create a production conclusion.'
  );
}

function hxSilverRenderExternalDashboard_(interpretation) {
  return hxSilverDeepFreeze_({
    target_instrument:'XAGUSD',
    section_id:'silver_intelligence',
    heading:'Silver Intelligence',
    headline:'Silver Intelligence — ' + interpretation.current_state,
    overall_external_confirmation:interpretation.current_state,
    explanation:interpretation.silver_intelligence.overall_external_confirmation.explanation,
    silver_impact:interpretation.silver_impact,
    action_bias:interpretation.action_bias,
    confidence_score:interpretation.confidence_score,
    confidence_label:interpretation.confidence_label,
    subsections:interpretation.silver_intelligence.subsections.map(item => ({
      heading:item.subsection_name,
      status:item.source_label,
      current_state:item.current_state,
      silver_impact:item.silver_impact,
      confidence:item.confidence.label,
      shadow_confidence:item.shadow_confidence,
      production_contribution:item.production_contribution,
      freshness:item.freshness.status,
      timestamp:item.current_timestamp,
      source:item.source,
      disposition:item.current_disposition,
      provenance:item.current_provenance,
      expandable:{
        evidence:item.evidence.expandable,
        provenance:item.provenance,
        primary_risk:item.primary_risk,
        required_confirmation:item.required_confirmation
      }
    })),
    expandable:{
      context_alignment:interpretation.silver_intelligence.overall_external_confirmation.context_alignment,
      provenance:interpretation.source_provenance,
      limitations:interpretation.limitations,
      reason_codes:interpretation.reason_codes
    },
    schema_version:interpretation.schema_version,
    renderer_version:HX_SILVER_VERSIONS.renderer,
    silver_intelligence_version:HX_SILVER_EXTERNAL_VERSION
  });
}

/**
 * Build the inactive Silver Intelligence section from explicit read-only
 * snapshots. No path, provider, ledger, score, or production state is written.
 */
function hxSilverBuildExternalIntelligence_(snapshot, evaluatedAt) {
  snapshot = snapshot || {};
  if (Object.prototype.hasOwnProperty.call(snapshot, 'hel033') ||
      Object.prototype.hasOwnProperty.call(snapshot, 'hel_033'))
    throw new Error('HEL033_DIRECT_INPUT_PROHIBITED');
  const asOf = hxSilverIso_(evaluatedAt);
  if (!asOf) throw new Error('Silver Intelligence evaluatedAt is required.');
  const shadow = snapshot.hel034_shadow_current || {};
  if (shadow.production_effect && shadow.production_effect !== 'none')
    throw new Error('HEL034_PRODUCTION_EFFECT_MUST_BE_NONE');
  const indexes = {
    shadow:hxSilverExternalIndex_(shadow.candidates),
    validation:hxSilverExternalIndex_(
      snapshot.hel034_validation_results && snapshot.hel034_validation_results.results),
    registry:hxSilverExternalIndex_(
      (snapshot.hel034_candidate_registry || snapshot.hel034_finalist_registry) &&
      (snapshot.hel034_candidate_registry || snapshot.hel034_finalist_registry).finalists),
    oos:hxSilverExternalOosIndex_(snapshot.hel034_oos_ledger)
  };
  const context = hxSilverExternalContext_(snapshot);
  const subsections = HX_SILVER_EXTERNAL_CONCEPTS.map(concept =>
    hxSilverExternalCandidate_(concept, indexes, snapshot, asOf));
  const synthesis = hxSilverExternalSynthesis_(subsections, context);
  const available = subsections.filter(item => item.source_status === 'available');
  const blocked = subsections.filter(item => item.source_status === 'blocked');
  const stale = available.filter(item => item.freshness.status === 'stale');
  const current = available.filter(item =>
    item.freshness.status === 'current' || item.freshness.status === 'delayed');
  const sourceStatus = !available.length ? (blocked.length ? 'blocked' : 'unavailable') :
    available.length === subsections.length ? 'available' : 'partial';
  const freshnessStatus = current.length ? 'current' :
    stale.length ? 'stale' : 'unknown';
  const labels = hxSilverUnique_(subsections.map(item => item.source_label));
  const confidenceLabel = !available.length ? 'unavailable' :
    synthesis.state === 'Mixed' || stale.length ? 'low' : 'moderate';
  const primarySupport = synthesis.supportive_concepts[0] || 'none';
  const primaryChallenge = synthesis.challenging_concepts[0] ||
    synthesis.blocked_concepts[0] || 'none';
  const reasonCodes = hxSilverUnique_(
    ['HEL034_AUTHORITATIVE', 'HEL035_INTERPRETATION_ONLY', 'PRODUCTION_EFFECT_NONE',
      'NO_CANDIDATE_PROMOTION', 'NO_OOS_MUTATION']
      .concat(subsections.reduce((all, item) => all.concat(item.provenance.reason_codes), []))
  );
  const limitations = hxSilverUnique_(
    labels.filter(label => label !== 'Production Approved').map(label =>
      label === 'Blocked' ? 'blocked evidence is excluded from synthesis' :
      label.toLowerCase() + ' evidence is not production approval')
  );
  const base = {
    section_id:'silver_intelligence',
    section_name:'Silver Intelligence',
    target_instrument:'XAGUSD',
    as_of:asOf,
    market_session:String(snapshot.market_session || 'unknown'),
    source_status:sourceStatus,
    freshness_status:freshnessStatus,
    evidence_state:labels.indexOf('Shadow Observation') >= 0 ? 'shadow' :
      labels.indexOf('Validation') >= 0 ? 'validated' : 'research_only',
    current_state:synthesis.state,
    interpretation:synthesis.explanation,
    market_impact:'HEL-034 external observations are translated into silver-specific industrial, strategic, physical-economy, currency, and energy context.',
    silver_impact:'External confirmation is ' + synthesis.state.toLowerCase() +
      '; current market structure remains the production decision authority.',
    action_bias:'no_operational_conclusion',
    primary_support:primarySupport,
    primary_challenge:primaryChallenge,
    primary_risk:blocked.length ?
      blocked[0].subsection_name + ' is blocked and cannot be interpreted as neutral.' :
      'Shadow and validation relationships may change before production approval.',
    required_confirmation:'Require current production market structure plus fresh, disposition-preserving HEL-034 observations.',
    confidence_score:null,
    confidence_label:confidenceLabel,
    confidence_basis:{
      conclusion_precision:'qualitative',
      available_subsections:available.length,
      blocked_subsections:blocked.length,
      stale_subsections:stale.length,
      authority_labels:labels,
      rule:'Shadow, validation, research, and blocked evidence cannot create authoritative production confidence.'
    },
    limitations:limitations,
    reason_codes:reasonCodes,
    source_provenance:{
      authority:'HEL-034',
      source_systems:[
        'HEL-034 finalist registry',
        'HEL-034 validation results',
        'HEL-034 shadow current',
        'HEL-034 OOS ledger',
        'current production context'
      ],
      input_timestamp:shadow.timestamp || null,
      read_only:true,
      oos_mutation:false,
      candidate_promotion:false,
      production_effect:'none',
      direct_hel033_consumption:false,
      rule_version:HX_SILVER_EXTERNAL_VERSION
    },
    underlying_metrics:subsections.map(item => ({
      concept:item.subsection_name,
      authority_label:item.source_label,
      relationship:item.relationship,
      freshness:item.freshness.status,
      provenance:item.provenance
    })),
    silver_intelligence:{
      heading:'Silver Intelligence',
      overall_external_confirmation:synthesis,
      subsections:subsections,
      source_authority:'HEL-034',
      production_effect:'none',
      rule_version:HX_SILVER_EXTERNAL_VERSION
    },
    operator_summary:'Monitor market-structure confirmation and the next read-only HEL-034 shadow observation.',
    long_summary:null,
    short_summary:null,
    dashboard_summary:null,
    telegram_summary:null,
    notification_permitted:false,
    production_effect:'none',
    rule_version:HX_SILVER_VERSIONS.rule,
    schema_version:HX_SILVER_VERSIONS.schema
  };
  base.long_summary = hxSilverRenderExternalLong_(base);
  base.short_summary = hxSilverRenderExternalShort_(base);
  base.dashboard_summary = hxSilverRenderExternalDashboard_(base);
  base.telegram_summary = null;
  const frozen = hxSilverDeepFreeze_(base);
  const validation = hxSilverValidateInterpretation_(frozen);
  if (!validation.ok)
    throw new Error('Invalid Silver Intelligence interpretation: ' + validation.errors.join(','));
  if (HX_SILVER_EXTERNAL_STATES.indexOf(String(frozen.current_state).toLowerCase()) < 0)
    throw new Error('Invalid external confirmation state: ' + frozen.current_state);
  return frozen;
}

function hxSilverExternalIntelligencePreview_(snapshot, evaluatedAt) {
  if (!hxSilverIntelligencePreviewEnabled_())
    throw new Error('HEL035_INTERNAL_PREVIEW_DISABLED');
  return hxSilverBuildExternalIntelligence_(snapshot, evaluatedAt);
}
