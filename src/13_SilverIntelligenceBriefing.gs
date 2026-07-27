/**
 * HEL-035 deterministic language and multi-surface renderers.
 *
 * These renderers consume one SilverInterpretation. They do not resolve
 * authority, freshness, confidence, or contradictions independently.
 */
const HX_SILVER_CONTROLLED_LANGUAGE = Object.freeze({
  state: HX_SILVER_ENUMS.stateVocabulary,
  relationship: HX_SILVER_ENUMS.silverRelationship,
  operational: Object.freeze({
    continuation_favored: 'Continuation favored',
    supportive_confirmation_required: 'Continuation possible but unconfirmed',
    neutral: 'Confirmation required',
    caution: 'Caution',
    reversal_risk_elevated: 'Reversal risk elevated',
    monetary_headwind: 'Monetary headwind',
    volatility_headwind: 'Volatility headwind',
    orderly_continuation_favored: 'Orderly continuation favored',
    continuation_normal_confirmation: 'Continuation possible with normal confirmation',
    stronger_confirmation_required: 'Stronger confirmation required',
    range_expansion_risk: 'Range expansion risk',
    liquidation_risk_elevated: 'Liquidation risk elevated',
    volatility_signal_unconfirmed: 'Volatility signal unconfirmed',
    no_operational_conclusion: 'No operational conclusion',
    unavailable: 'Data unavailable'
  }),
  limitations: Object.freeze([
    'shadow observation only', 'provider agreement unresolved',
    'daily history unavailable', 'source timing differs',
    'data coverage limited', 'order-book provider not connected',
    'publication lag applies'
  ]),
  forbiddenPatterns: Object.freeze([
    /\bguaranteed\b/i, /\bcan'?t miss\b/i, /\bmoon\b/i, /\bretail signal\b/i,
    /\biceberg\b/i, /\bsmart money\b/i, /\binstitutional (buying|selling|activity)\b/i,
    /\baccumulation\b/i, /\bdistribution by institutions\b/i
  ])
});

function hxSilverOperationalLanguage_(actionBias) {
  const value = HX_SILVER_CONTROLLED_LANGUAGE.operational[actionBias];
  if (!value) throw new Error('No controlled operational language for ' + actionBias);
  return value;
}

function hxSilverAssertLanguageSafe_(value) {
  const text = String(value === null || value === undefined ? '' : value);
  HX_SILVER_CONTROLLED_LANGUAGE.forbiddenPatterns.forEach(pattern => {
    if (pattern.test(text)) throw new Error('Unsupported controlled-language claim: ' + pattern);
  });
  return text;
}

function hxSilverConfidenceText_(interpretation) {
  return interpretation.confidence_score === null ?
    interpretation.confidence_label :
    interpretation.confidence_label + ' (' + Number(interpretation.confidence_score).toFixed(0) + '/100)';
}

function hxSilverRenderLong_(interpretation) {
  const lines = [
    interpretation.section_name.toUpperCase(),
    'Target: XAGUSD / SILVER',
    'As Of: ' + interpretation.as_of,
    'Status: ' + interpretation.source_status + ' / ' + interpretation.freshness_status,
    '',
    'What Changed',
    interpretation.interpretation,
    '',
    'Why It Matters',
    interpretation.market_impact,
    '',
    'What It Means for Silver',
    'Silver relationship: ' + interpretation.silver_impact + '.',
    '',
    'What to Monitor Next',
    interpretation.operator_summary,
    '',
    'Action Bias: ' + hxSilverOperationalLanguage_(interpretation.action_bias),
    'Primary Risk: ' + interpretation.primary_risk,
    'Required Confirmation: ' + interpretation.required_confirmation,
    'Confidence: ' + hxSilverConfidenceText_(interpretation)
  ];
  if (interpretation.limitations.length) lines.splice(lines.length - 4, 0, 'Limitations: ' + interpretation.limitations.join('; '));
  return hxSilverAssertLanguageSafe_(lines.join('\n'));
}

function hxSilverRenderShort_(interpretation) {
  return hxSilverAssertLanguageSafe_(
    interpretation.section_name + ': ' + interpretation.current_state +
    '; silver ' + interpretation.silver_impact + '. ' +
    hxSilverOperationalLanguage_(interpretation.action_bias) +
    '. Confidence: ' + hxSilverConfidenceText_(interpretation) + '.'
  );
}

function hxSilverRenderDashboard_(interpretation) {
  return hxSilverDeepFreeze_({
    target_instrument: 'XAGUSD',
    section_id: interpretation.section_id,
    headline: interpretation.section_name + ' — ' + interpretation.current_state,
    status: interpretation.source_status,
    freshness: interpretation.freshness_status,
    silver_impact: interpretation.silver_impact,
    action_bias: interpretation.action_bias,
    action_language: hxSilverOperationalLanguage_(interpretation.action_bias),
    confidence_score: interpretation.confidence_score,
    confidence_label: interpretation.confidence_label,
    primary_risk: interpretation.primary_risk,
    required_confirmation: interpretation.required_confirmation,
    expandable: {
      evidence: interpretation.underlying_metrics,
      provenance: interpretation.source_provenance,
      confidence_basis: interpretation.confidence_basis,
      limitations: interpretation.limitations,
      reason_codes: interpretation.reason_codes
    },
    schema_version: interpretation.schema_version,
    renderer_version: HX_SILVER_VERSIONS.renderer
  });
}

function hxSilverRenderNotification_(interpretation) {
  if (!interpretation.notification_permitted) return null;
  return hxSilverAssertLanguageSafe_(
    'Silver ' + interpretation.section_name.toLowerCase() + ' is ' +
    interpretation.current_state + ', ' + interpretation.silver_impact +
    '; ' + hxSilverOperationalLanguage_(interpretation.action_bias).toLowerCase() +
    ', confidence ' + hxSilverConfidenceText_(interpretation) + '.'
  );
}

function hxSilverAttachRenderings_(base) {
  const draft = Object.assign({}, base);
  draft.long_summary = hxSilverRenderLong_(draft);
  draft.short_summary = hxSilverRenderShort_(draft);
  draft.dashboard_summary = hxSilverRenderDashboard_(draft);
  draft.telegram_summary = hxSilverRenderNotification_(draft);
  [
    draft.interpretation, draft.market_impact, draft.primary_risk,
    draft.required_confirmation, draft.operator_summary, draft.long_summary,
    draft.short_summary, draft.telegram_summary || ''
  ].forEach(hxSilverAssertLanguageSafe_);
  const frozen = hxSilverDeepFreeze_(draft);
  const validation = hxSilverValidateInterpretation_(frozen);
  if (!validation.ok) throw new Error('Invalid rendered SilverInterpretation: ' + validation.errors.join(','));
  return frozen;
}
