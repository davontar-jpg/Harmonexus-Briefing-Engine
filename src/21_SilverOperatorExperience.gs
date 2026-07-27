/**
 * HEL-035 Silver Operator Desk.
 *
 * Converts completed renderer objects into a low-cognitive-load dashboard
 * contract. Interpretation is primary; evidence and raw statistics remain
 * expandable. No market conclusion is calculated here.
 */
const HX_SILVER_OPERATOR_EXPERIENCE_VERSION =
  'HEL-035.operator-experience.1.0.0';

const HX_SILVER_OPERATOR_ACTION_LANGUAGE = Object.freeze({
  continuation_favored:'Continuation Favored',
  supportive_confirmation_required:'Continuation Requires Confirmation',
  neutral:'Neutral',
  caution:'Caution',
  reversal_risk_elevated:'Reversal Risk Elevated',
  monetary_headwind:'Monetary Headwind',
  volatility_headwind:'Volatility Headwind',
  orderly_continuation_favored:'Orderly Continuation Favored',
  continuation_normal_confirmation:'Continuation Requires Confirmation',
  stronger_confirmation_required:'Stronger Confirmation Required',
  range_expansion_risk:'Range Expansion Risk',
  liquidation_risk_elevated:'Liquidation Risk Elevated',
  volatility_signal_unconfirmed:'Volatility Signal Unconfirmed',
  no_operational_conclusion:'No Operational Conclusion',
  unavailable:'Unavailable'
});

const HX_SILVER_OPERATOR_SUMMARY_KEYS = Object.freeze([
  'target_instrument', 'section_id', 'section_name', 'heading', 'headline',
  'status', 'freshness', 'current_state', 'current_market_state',
  'primary_state', 'current_structure', 'silver_impact', 'action_bias',
  'action_language', 'current_operational_bias', 'confidence_score',
  'confidence_label', 'primary_risk', 'required_confirmation',
  'schema_version', 'renderer_version', 'integration_version',
  'executive_version', 'monetary_version', 'vix_version',
  'liquidity_version', 'silver_intelligence_version',
  'market_structure_version'
]);

function hxSilverOperatorNormalizeText_(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/\s+/g, ' ').trim().toLowerCase();
}

function hxSilverOperatorIsEmpty_(value) {
  if (value === null || value === undefined || value === '') return true;
  if (Array.isArray(value)) return value.length === 0;
  return typeof value === 'object' && Object.keys(value).length === 0;
}

function hxSilverOperatorPrune_(value, repeated, key) {
  if (HX_SILVER_OPERATOR_SUMMARY_KEYS.indexOf(String(key || '')) >= 0)
    return undefined;
  if (Array.isArray(value)) {
    const items = value.map(item =>
      hxSilverOperatorPrune_(item, repeated, '')).filter(item =>
      item !== undefined && !hxSilverOperatorIsEmpty_(item));
    return items;
  }
  if (value && typeof value === 'object') {
    const out = {};
    Object.keys(value).forEach(childKey => {
      const child = hxSilverOperatorPrune_(value[childKey], repeated, childKey);
      if (child !== undefined && !hxSilverOperatorIsEmpty_(child))
        out[childKey] = child;
    });
    return out;
  }
  const normalized = hxSilverOperatorNormalizeText_(value);
  if (normalized && repeated.has(normalized)) return undefined;
  return value;
}

function hxSilverOperatorActionLanguage_(section) {
  const dashboard = section.dashboard_summary || {};
  return String(
    dashboard.action_language ||
    dashboard.current_operational_bias ||
    HX_SILVER_OPERATOR_ACTION_LANGUAGE[section.action_bias] ||
    'No Operational Conclusion'
  );
}

function hxSilverOperatorInterpretation_(section, isExecutive) {
  if (isExecutive && section.operator_summary)
    return String(section.operator_summary);
  return String(
    section.interpretation ||
    section.market_impact ||
    section.operator_summary ||
    section.short_summary
  );
}

function hxSilverOperatorDetails_(section, dashboard, repeated) {
  const expandable = dashboard.expandable || {};
  const rendererDetails = hxSilverIntegrationClone_(dashboard);
  delete rendererDetails.expandable;
  const evidence = expandable.evidence ||
    expandable.section_evidence ||
    section.underlying_metrics || [];
  const metrics = hxSilverOperatorPrune_(rendererDetails, repeated, '');
  const sources = hxSilverOperatorPrune_(
    expandable.provenance || section.source_provenance || {},
    repeated,
    ''
  );
  const freshnessDetails = hxSilverOperatorPrune_(
    expandable.freshness || {},
    repeated,
    ''
  );
  return hxSilverIntegrationFreeze_({
    evidence:hxSilverOperatorPrune_(evidence, repeated, ''),
    metrics:metrics,
    sources:sources,
    freshness:{
      status:section.freshness_status,
      source_status:section.source_status,
      as_of:section.as_of || null,
      details:freshnessDetails
    },
    reason_codes:hxSilverIntegrationClone_(section.reason_codes || []),
    research_notes:hxSilverOperatorPrune_(
      expandable.research_notes || section.research_notes || [],
      repeated,
      ''
    ),
    limitations:hxSilverIntegrationClone_(section.limitations || [])
  });
}

function hxSilverOperatorHeadline_(section, sectionId) {
  if (sectionId === 'monetary_environment') {
    const detail = section.monetary_environment || {};
    return 'Primary Driver · ' +
      (detail.real_yield_pressure || detail.dollar_pressure || section.current_state);
  }
  if (sectionId === 'vix_volatility_environment')
    return 'Current Regime · ' + section.current_state;
  if (sectionId === 'silver_intelligence') {
    const synthesis = section.silver_intelligence &&
      section.silver_intelligence.overall_external_confirmation || {};
    const themes = (synthesis.supportive_concepts || [])
      .concat(synthesis.challenging_concepts || []);
    return 'Dominant Theme · ' + (themes[0] || section.current_state);
  }
  if (sectionId === 'market_structure') {
    const detail = section.market_structure || {};
    return 'Current Auction · ' +
      (detail.auction_state || detail.current_structure || section.current_state);
  }
  if (sectionId === 'evidence_integrity') {
    const detail = section.evidence_integrity || {};
    return 'Evidence Quality · ' +
      (detail.overall_evidence_quality || section.current_state);
  }
  return section.current_state;
}

function hxSilverBuildOperatorCard_(item, priority) {
  const section = item.section;
  const isExecutive = item.definition.id === 'executive_market_assessment';
  const interpretation = hxSilverOperatorInterpretation_(section, isExecutive);
  const operationalConclusion = hxSilverOperatorActionLanguage_(section);
  const requiredConfirmation = String(
    section.required_confirmation || 'No additional confirmation specified.'
  );
  const primaryRisk = String(
    section.primary_risk || 'No additional primary risk specified.'
  );
  const repeated = new Set([
    section.current_state,
    interpretation,
    section.silver_impact,
    operationalConclusion,
    requiredConfirmation,
    primaryRisk,
    section.confidence_label,
    section.freshness_status,
    section.as_of
  ].map(hxSilverOperatorNormalizeText_).filter(Boolean));
  const dashboard = hxSilverIntegrationClone_(section.dashboard_summary);
  return hxSilverIntegrationFreeze_({
    section_id:item.definition.id,
    section_name:item.definition.name,
    target_instrument:'XAGUSD',
    priority:priority,
    is_executive:isExecutive,
    authority_label:hxSilverIntegrationAuthorityLabel_(section),
    headline:hxSilverOperatorHeadline_(section, item.definition.id),
    interpretation:interpretation,
    silver_impact:section.silver_impact,
    operational_conclusion:operationalConclusion,
    primary_risk:primaryRisk,
    required_confirmation:requiredConfirmation,
    confidence:{
      label:section.confidence_label,
      score:section.confidence_score === undefined ?
        null : section.confidence_score
    },
    freshness:{
      status:section.freshness_status,
      as_of:section.as_of || null
    },
    expandable_details:hxSilverOperatorDetails_(
      section,
      dashboard,
      repeated
    )
  });
}

function hxSilverBuildOperatorDesk_(sections) {
  const cards = sections.map((item, index) =>
    hxSilverBuildOperatorCard_(item, index + 1));
  return hxSilverIntegrationFreeze_({
    target_instrument:'XAGUSD',
    heading:'Silver Market Desk',
    operator_flow:[
      'What is happening?',
      'Why?',
      'What does it mean for silver?',
      'What should I watch?',
      'How confident is the system?'
    ],
    layout_policy:'headline_interpretation_conclusion_expandable_evidence',
    section_order:cards.map(card => card.section_name),
    sections:cards,
    performance:{
      cached_interpretation_preferred:true,
      source_objects_reused:true,
      network_calls_added:0,
      background_jobs_added:0
    },
    production_effect:'none',
    operator_experience_version:HX_SILVER_OPERATOR_EXPERIENCE_VERSION,
    integration_version:HX_SILVER_INTEGRATION_VERSION
  });
}
