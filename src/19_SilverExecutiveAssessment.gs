/**
 * HEL-035 Executive Market Assessment.
 *
 * Inactive deterministic synthesis of the five HEL-035 section objects.
 * The renderer produces one concise institutional paragraph and never
 * calculates market evidence or changes an underlying conclusion.
 */
const HX_SILVER_EXECUTIVE_VERSION = 'HEL-035.executive.1.0.0';

const HX_EXECUTIVE_SECTIONS = Object.freeze([
  Object.freeze({key:'monetary_environment', id:'monetary_environment', name:'Monetary Environment'}),
  Object.freeze({key:'vix_environment', id:'vix_volatility_environment', name:'VIX — Volatility Environment'}),
  Object.freeze({key:'liquidity_environment', id:'liquidity_environment', name:'Liquidity Environment'}),
  Object.freeze({key:'silver_intelligence', id:'silver_intelligence', name:'Silver Intelligence'}),
  Object.freeze({key:'market_structure', id:'market_structure', name:'Market Structure'})
]);

const HX_EXECUTIVE_ACTION_LANGUAGE = Object.freeze({
  continuation_favored:'Continuation Favored',
  supportive_confirmation_required:'Continuation Requires Confirmation',
  neutral:'Neutral',
  caution:'Caution',
  reversal_risk_elevated:'Reversal Risk Elevated',
  no_operational_conclusion:'No Operational Conclusion'
});

function hxExecutiveClone_(value) {
  if (Array.isArray(value)) return value.map(hxExecutiveClone_);
  if (value && typeof value === 'object') {
    const out = {};
    Object.keys(value).forEach(key => out[key] = hxExecutiveClone_(value[key]));
    return out;
  }
  return value;
}

function hxExecutiveInput_(snapshot, definition) {
  const value = snapshot && (
    snapshot[definition.key] ||
    (definition.key === 'vix_environment' ? snapshot.vix_volatility_environment : null)
  );
  if (!value || typeof value !== 'object') {
    return hxSilverDeepFreeze_({
      section_id:definition.id,
      section_name:definition.name,
      target_instrument:'XAGUSD',
      source_status:'unavailable',
      freshness_status:'unknown',
      evidence_state:'placeholder',
      current_state:'unavailable',
      silver_impact:'unavailable',
      action_bias:'no_operational_conclusion',
      confidence_score:null,
      confidence_label:'unavailable',
      primary_risk:definition.name + ' is unavailable.',
      required_confirmation:definition.name + ' requires current evidence.',
      source_provenance:{unavailable:true},
      production_effect:'none',
      as_of:null
    });
  }
  if (value.target_instrument && value.target_instrument !== 'XAGUSD')
    throw new Error('EXECUTIVE_INPUT_TARGET_MUST_BE_XAGUSD:' + definition.id);
  if (value.production_effect && value.production_effect !== 'none')
    throw new Error('EXECUTIVE_INPUT_PRODUCTION_EFFECT_MUST_BE_NONE:' + definition.id);
  const copy = hxExecutiveClone_(value);
  copy.section_id = String(copy.section_id || definition.id);
  copy.section_name = String(copy.section_name || definition.name);
  copy.target_instrument = 'XAGUSD';
  copy.source_status = String(copy.source_status || 'unavailable');
  copy.freshness_status = String(copy.freshness_status || 'unknown');
  copy.evidence_state = String(copy.evidence_state || 'placeholder');
  copy.current_state = String(copy.current_state || 'unavailable');
  copy.silver_impact = String(copy.silver_impact || 'unavailable');
  copy.action_bias = String(copy.action_bias || 'no_operational_conclusion');
  copy.confidence_score = copy.confidence_score === undefined ? null : copy.confidence_score;
  copy.confidence_label = String(copy.confidence_label || 'unavailable');
  copy.production_effect = 'none';
  return hxSilverDeepFreeze_(copy);
}

function hxExecutiveSide_(section) {
  if (!section || ['unavailable', 'blocked', 'failed'].indexOf(section.source_status) >= 0)
    return 'unavailable';
  if (section.freshness_status === 'stale') return 'unavailable';
  const bias = String(section.action_bias || '');
  if (['continuation_favored', 'orderly_continuation_favored',
    'continuation_normal_confirmation'].indexOf(bias) >= 0) return 'supportive';
  if (['supportive_confirmation_required'].indexOf(bias) >= 0) return 'supportive';
  if (['reversal_risk_elevated', 'liquidation_risk_elevated',
    'caution', 'monetary_headwind', 'volatility_headwind',
    'range_expansion_risk'].indexOf(bias) >= 0) return 'challenging';
  if (bias === 'neutral') return 'neutral';
  const text = [section.current_state, section.silver_impact].join(' ').toLowerCase();
  if (/strongly supportive|supportive|confirming|strengthening/.test(text)) return 'supportive';
  if (/strongly challenging|challenging|headwind|weakening|reversal|liquidation/.test(text))
    return 'challenging';
  if (/neutral|balanced/.test(text)) return 'neutral';
  return 'unavailable';
}

function hxExecutiveEvidenceLanguage_(definition, side, section) {
  if (side === 'supportive') {
    return ({
      monetary_environment:'Monetary conditions support the silver context.',
      vix_environment:'Volatility conditions support orderly silver continuation.',
      liquidity_environment:'Liquidity conditions support the current silver structure.',
      silver_intelligence:'External silver intelligence supports the current thesis.',
      market_structure:'Market structure confirms the current silver direction.'
    })[definition.key];
  }
  if (side === 'challenging') {
    return ({
      monetary_environment:'Monetary conditions challenge the silver thesis.',
      vix_environment:'Volatility conditions challenge orderly continuation.',
      liquidity_environment:'Liquidity conditions challenge the current silver structure.',
      silver_intelligence:'External silver intelligence challenges the current thesis.',
      market_structure:'Market structure challenges the current silver direction.'
    })[definition.key];
  }
  if (side === 'neutral') return definition.name + ' is neutral for the executive conclusion.';
  return definition.name + ' is unavailable for the executive conclusion.';
}

function hxExecutiveEvidence_(sections) {
  return sections.map(item => {
    const side = hxExecutiveSide_(item.section);
    return hxSilverDeepFreeze_({
      section_id:item.definition.id,
      section_name:item.definition.name,
      side:side,
      interpretation:hxExecutiveEvidenceLanguage_(item.definition, side, item.section),
      source_status:item.section.source_status,
      freshness_status:item.section.freshness_status,
      evidence_state:item.section.evidence_state,
      confidence_label:item.section.confidence_label,
      as_of:item.section.as_of || null,
      eligible_for_operational_bias:item.definition.key !== 'silver_intelligence' &&
        item.definition.key !== 'liquidity_environment' &&
        side !== 'unavailable',
      shadow_context:item.definition.key === 'silver_intelligence' &&
        item.section.evidence_state === 'shadow',
      provenance_pointer:item.section.source_provenance || null
    });
  });
}

function hxExecutiveActionBias_(sections, evidence) {
  const structure = sections.find(item => item.definition.key === 'market_structure').section;
  const structureSide = hxExecutiveSide_(structure);
  if (structureSide === 'unavailable' ||
      structure.action_bias === 'no_operational_conclusion' ||
      structure.action_bias === 'unavailable')
    return 'no_operational_conclusion';
  if (structure.action_bias === 'reversal_risk_elevated') return 'reversal_risk_elevated';

  const operationalChallenges = evidence.filter(item =>
    item.eligible_for_operational_bias && item.section_id !== 'market_structure' &&
    item.side === 'challenging'
  );
  const reversalChallenge = sections.some(item =>
    ['monetary_environment', 'vix_environment'].indexOf(item.definition.key) >= 0 &&
    ['reversal_risk_elevated', 'liquidation_risk_elevated'].indexOf(
      item.section.action_bias) >= 0
  );
  const shadowChallenge = evidence.some(item =>
    item.section_id === 'silver_intelligence' && item.side === 'challenging');

  if (reversalChallenge) return 'reversal_risk_elevated';
  if (structure.action_bias === 'caution') return 'caution';
  if (structure.action_bias === 'neutral') return 'neutral';
  if (structure.action_bias === 'supportive_confirmation_required') {
    return operationalChallenges.length ? 'caution' : 'supportive_confirmation_required';
  }
  if (structure.action_bias === 'continuation_favored') {
    if (operationalChallenges.length > 1) return 'caution';
    if (operationalChallenges.length || shadowChallenge)
      return 'supportive_confirmation_required';
    return 'continuation_favored';
  }
  return 'no_operational_conclusion';
}

function hxExecutiveMarketState_(actionBias) {
  return ({
    continuation_favored:'Continuation environment',
    supportive_confirmation_required:'Confirmation-dependent continuation',
    neutral:'Balanced market environment',
    caution:'Caution environment',
    reversal_risk_elevated:'Reversal risk elevated',
    no_operational_conclusion:'Insufficient evidence'
  })[actionBias];
}

function hxExecutiveConfidence_(sections) {
  const structure = sections.find(item => item.definition.key === 'market_structure').section;
  if (structure.confidence_label && structure.confidence_label !== 'unavailable') {
    return {
      score:null,
      label:structure.confidence_label,
      source:'Market Structure',
      input_labels:sections.map(item => ({
        section_name:item.definition.name,
        confidence_label:item.section.confidence_label,
        confidence_score:item.section.confidence_score
      }))
    };
  }
  const fallback = sections.find(item =>
    ['monetary_environment', 'vix_environment'].indexOf(item.definition.key) >= 0 &&
    item.section.confidence_label && item.section.confidence_label !== 'unavailable'
  );
  return {
    score:null,
    label:fallback ? fallback.section.confidence_label : 'unavailable',
    source:fallback ? fallback.definition.name : 'none',
    input_labels:sections.map(item => ({
      section_name:item.definition.name,
      confidence_label:item.section.confidence_label,
      confidence_score:item.section.confidence_score
    }))
  };
}

function hxExecutivePrimaryRisk_(actionBias, evidence, sections) {
  if (actionBias === 'reversal_risk_elevated')
    return 'Existing section intelligence indicates elevated reversal risk.';
  const structure = sections.find(item => item.definition.key === 'market_structure').section;
  if (hxExecutiveSide_(structure) === 'unavailable')
    return 'Market Structure is unavailable and cannot authorize an operational conclusion.';
  const challenges = evidence.filter(item => item.side === 'challenging');
  if (challenges.length)
    return 'Cross-section evidence is not fully aligned with Market Structure.';
  const liquidity = evidence.find(item => item.section_id === 'liquidity_environment');
  if (liquidity && liquidity.side === 'unavailable')
    return 'Liquidity confirmation is unavailable.';
  return 'The current conclusion depends on continued structural confirmation.';
}

function hxExecutiveRequiredConfirmation_(actionBias) {
  return ({
    continuation_favored:'Market Structure must remain aligned as the next authoritative observations update.',
    supportive_confirmation_required:'Market Structure must confirm continuation and resolve the outstanding challenge.',
    neutral:'A directional Market Structure break and confirmation are required.',
    caution:'Market Structure must resolve the cross-section conflict before conviction increases.',
    reversal_risk_elevated:'Renewed structural acceptance is required before reversal risk can be reduced.',
    no_operational_conclusion:'Current, complete Market Structure confirmation is required.'
  })[actionBias];
}

function hxExecutiveListLanguage_(items) {
  const names = items.map(item =>
    item.section_id === 'silver_intelligence' ?
      'Shadow Silver Intelligence' : item.section_name);
  if (!names.length) return 'no section';
  if (names.length === 1) return names[0];
  if (names.length === 2) return names[0] + ' and ' + names[1];
  return names.slice(0, -1).join(', ') + ', and ' + names[names.length - 1];
}

function hxExecutiveParagraph_(base) {
  const support = base.supporting_evidence;
  const challenge = base.contradicting_evidence;
  const unavailable = base.executive_market_assessment.section_evidence.filter(
    item => item.side === 'unavailable'
  );
  const currentState = String(base.current_state || 'insufficient evidence').toLowerCase();
  const sentences = [
    currentState === 'insufficient evidence' ?
      'Silver currently has insufficient evidence for an operational conclusion.' :
      'Silver is in a ' + currentState + '.'
  ];
  if (support.length)
    sentences.push(hxExecutiveListLanguage_(support) +
      (support.length === 1 ? ' supports' : ' support') + ' the assessment.');
  if (challenge.length)
    sentences.push(hxExecutiveListLanguage_(challenge) +
      (challenge.length === 1 ? ' challenges' : ' challenge') + ' continuation.');
  if (unavailable.length)
    sentences.push(hxExecutiveListLanguage_(unavailable) +
      (unavailable.length === 1 ? ' remains' : ' remain') +
      ' unavailable for current confirmation.');
  sentences.push('The primary risk is ' + base.primary_risk);
  sentences.push(base.required_confirmation);
  sentences.push('Current operational bias is ' +
    HX_EXECUTIVE_ACTION_LANGUAGE[base.action_bias] +
    ' with ' + base.confidence_label + ' confidence.');
  const paragraph = sentences.join(' ');
  if (/[%]|\bcorrelation\b|\bpercentile\b|\bscore\b|\bsample\b|\b\d+\b/i.test(paragraph))
    throw new Error('EXECUTIVE_STATISTICAL_SUMMARY_PROHIBITED');
  return hxSilverAssertLanguageSafe_(paragraph);
}

function hxSilverRenderExecutiveLong_(interpretation) {
  return 'EXECUTIVE MARKET ASSESSMENT\n\n' + interpretation.operator_summary;
}

function hxSilverRenderExecutiveShort_(interpretation) {
  return interpretation.operator_summary;
}

function hxSilverRenderExecutiveDashboard_(interpretation) {
  return hxSilverDeepFreeze_({
    target_instrument:'XAGUSD',
    section_id:'executive_market_assessment',
    heading:'Executive Market Assessment',
    current_market_state:interpretation.current_state,
    supporting_evidence:interpretation.supporting_evidence,
    contradicting_evidence:interpretation.contradicting_evidence,
    primary_risk:interpretation.primary_risk,
    required_confirmation:interpretation.required_confirmation,
    current_operational_bias:HX_EXECUTIVE_ACTION_LANGUAGE[interpretation.action_bias],
    action_bias:interpretation.action_bias,
    confidence_score:null,
    confidence_label:interpretation.confidence_label,
    paragraph:interpretation.operator_summary,
    expandable:{
      section_evidence:interpretation.executive_market_assessment.section_evidence,
      provenance:interpretation.source_provenance,
      confidence_basis:interpretation.confidence_basis,
      limitations:interpretation.limitations,
      reason_codes:interpretation.reason_codes
    },
    intended_long_briefing_order:1,
    schema_version:interpretation.schema_version,
    renderer_version:HX_SILVER_VERSIONS.renderer,
    executive_version:HX_SILVER_EXECUTIVE_VERSION
  });
}

function hxSilverBuildExecutiveAssessment_(snapshot, evaluatedAt) {
  snapshot = snapshot || {};
  const asOf = hxSilverIso_(evaluatedAt);
  if (!asOf) throw new Error('Executive Market Assessment evaluatedAt is required.');
  const sections = HX_EXECUTIVE_SECTIONS.map(definition => ({
    definition:definition,
    section:hxExecutiveInput_(snapshot, definition)
  }));
  const sectionEvidence = hxExecutiveEvidence_(sections);
  const actionBias = hxExecutiveActionBias_(sections, sectionEvidence);
  const currentState = hxExecutiveMarketState_(actionBias);
  const confidence = hxExecutiveConfidence_(sections);
  const supporting = sectionEvidence.filter(item => item.side === 'supportive');
  const contradicting = sectionEvidence.filter(item => item.side === 'challenging');
  const primaryRisk = hxExecutivePrimaryRisk_(actionBias, sectionEvidence, sections);
  const requiredConfirmation = hxExecutiveRequiredConfirmation_(actionBias);
  const unavailable = sectionEvidence.filter(item => item.side === 'unavailable');
  const available = sectionEvidence.filter(item => item.side !== 'unavailable');
  const sourceStatus = !available.length ? 'unavailable' :
    unavailable.length ? 'partial' : 'available';
  const decisiveFreshness = sections.filter(item =>
    ['market_structure', 'monetary_environment', 'vix_environment'].indexOf(
      item.definition.key) >= 0 &&
    item.section.source_status !== 'unavailable'
  ).map(item => item.section.freshness_status);
  const freshness = decisiveFreshness.indexOf('stale') >= 0 ? 'stale' :
    decisiveFreshness.indexOf('current') >= 0 ? 'current' :
    decisiveFreshness.indexOf('delayed') >= 0 ? 'delayed' : 'unknown';
  const limitations = hxSilverUnique_(
    unavailable.map(item => item.section_name + ' unavailable')
      .concat(sectionEvidence.some(item => item.shadow_context) ?
        ['Silver Intelligence remains shadow context'] : [])
  );
  const reasonCodes = hxSilverUnique_([
    'EXECUTIVE_SYNTHESIS_ONLY',
    'NO_NEW_EVIDENCE',
    'NO_STATISTICAL_SUMMARY',
    'MARKET_STRUCTURE_OPERATIONAL_AUTHORITY',
    unavailable.length ? 'EXECUTIVE_INPUTS_PARTIAL' : '',
    contradicting.length ? 'EXECUTIVE_CONTRADICTION_PRESENT' : ''
  ]);
  const detail = {
    heading:'Executive Market Assessment',
    current_market_state:currentState,
    supporting_evidence:supporting,
    contradicting_evidence:contradicting,
    primary_risk:primaryRisk,
    required_confirmation:requiredConfirmation,
    current_operational_bias:HX_EXECUTIVE_ACTION_LANGUAGE[actionBias],
    confidence:{
      score:null,
      label:confidence.label,
      source:confidence.source
    },
    section_evidence:sectionEvidence,
    intended_long_briefing_order:1,
    rule_version:HX_SILVER_EXECUTIVE_VERSION
  };
  const base = {
    section_id:'executive_market_assessment',
    section_name:'Executive Market Assessment',
    target_instrument:'XAGUSD',
    as_of:asOf,
    market_session:String(
      sections.find(item => item.definition.key === 'market_structure').section.market_session ||
      'unknown'),
    source_status:sourceStatus,
    freshness_status:freshness,
    evidence_state:available.length ? 'production_authoritative' : 'placeholder',
    current_state:currentState,
    interpretation:'The five HEL-035 sections resolve to ' + currentState.toLowerCase() + '.',
    market_impact:'The executive assessment consolidates monetary, volatility, liquidity, external silver, and structure interpretation without adding evidence.',
    silver_impact:'Current operational bias is ' + HX_EXECUTIVE_ACTION_LANGUAGE[actionBias] + '.',
    action_bias:actionBias,
    primary_support:supporting[0] ? supporting[0].section_name : 'none',
    primary_challenge:contradicting[0] ? contradicting[0].section_name : 'none',
    primary_risk:primaryRisk,
    required_confirmation:requiredConfirmation,
    confidence_score:null,
    confidence_label:confidence.label,
    confidence_basis:{
      selected_existing_confidence:confidence.source,
      input_confidence:confidence.input_labels,
      numeric_confidence_synthesized:false,
      contradiction_adjustment_synthesized:false
    },
    limitations:limitations,
    reason_codes:reasonCodes,
    source_provenance:{
      authority:'HEL-035 section interpretations',
      source_sections:sections.map(item => ({
        section_id:item.definition.id,
        section_name:item.definition.name,
        as_of:item.section.as_of || null,
        source_status:item.section.source_status,
        freshness_status:item.section.freshness_status,
        evidence_state:item.section.evidence_state,
        production_effect:item.section.production_effect,
        provenance:item.section.source_provenance || null
      })),
      new_evidence_created:false,
      statistics_summarized:false,
      production_effect:'none',
      rule_version:HX_SILVER_EXECUTIVE_VERSION
    },
    underlying_metrics:sectionEvidence,
    executive_market_assessment:detail,
    supporting_evidence:supporting,
    contradicting_evidence:contradicting,
    operator_summary:null,
    long_summary:null,
    short_summary:null,
    dashboard_summary:null,
    telegram_summary:null,
    notification_permitted:false,
    production_effect:'none',
    intended_long_briefing_order:1,
    rule_version:HX_SILVER_VERSIONS.rule,
    schema_version:HX_SILVER_VERSIONS.schema
  };
  base.operator_summary = hxExecutiveParagraph_(base);
  base.long_summary = hxSilverRenderExecutiveLong_(base);
  base.short_summary = hxSilverRenderExecutiveShort_(base);
  base.dashboard_summary = hxSilverRenderExecutiveDashboard_(base);
  base.telegram_summary = null;
  const frozen = hxSilverDeepFreeze_(base);
  const validation = hxSilverValidateInterpretation_(frozen);
  if (!validation.ok)
    throw new Error('Invalid Executive Market Assessment: ' + validation.errors.join(','));
  return frozen;
}

function hxSilverExecutiveAssessmentPreview_(snapshot, evaluatedAt) {
  if (!hxSilverIntelligencePreviewEnabled_())
    throw new Error('HEL035_INTERNAL_PREVIEW_DISABLED');
  return hxSilverBuildExecutiveAssessment_(snapshot, evaluatedAt);
}
