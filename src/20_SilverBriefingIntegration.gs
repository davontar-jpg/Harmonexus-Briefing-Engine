/**
 * HEL-035 briefing and dashboard integration boundary.
 *
 * This module consumes the completed interpretation objects. It never
 * recalculates evidence, confidence, authority, or action bias. Existing
 * production sections remain intact and follow the HEL-035 section block.
 */
const HX_SILVER_INTEGRATION_VERSION = 'HEL-035.integration.1.1.0';

const HX_SILVER_INTEGRATION_SECTIONS = Object.freeze([
  Object.freeze({
    key:'executive_market_assessment',
    id:'executive_market_assessment',
    name:'Executive Market Assessment'
  }),
  Object.freeze({
    key:'evidence_integrity',
    id:'evidence_integrity',
    name:'Evidence Integrity'
  }),
  Object.freeze({
    key:'monetary_environment',
    id:'monetary_environment',
    name:'Monetary Environment'
  }),
  Object.freeze({
    key:'vix_environment',
    alias:'vix_volatility_environment',
    id:'vix_volatility_environment',
    name:'VIX — Volatility Environment'
  }),
  Object.freeze({
    key:'liquidity_environment',
    id:'liquidity_environment',
    name:'Liquidity Environment'
  }),
  Object.freeze({
    key:'silver_intelligence',
    id:'silver_intelligence',
    name:'Silver Intelligence'
  }),
  Object.freeze({
    key:'market_structure',
    id:'market_structure',
    name:'Market Structure'
  })
]);

function hxSilverIntegrationClone_(value) {
  if (Array.isArray(value)) return value.map(hxSilverIntegrationClone_);
  if (value && typeof value === 'object') {
    const out = {};
    Object.keys(value).forEach(key => {
      out[key] = hxSilverIntegrationClone_(value[key]);
    });
    return out;
  }
  return value;
}

function hxSilverIntegrationFreeze_(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.keys(value).forEach(key => hxSilverIntegrationFreeze_(value[key]));
  return Object.freeze(value);
}

function hxSilverIntegrationSection_(bundle, definition) {
  const container = bundle && bundle.sections ? bundle.sections : bundle;
  const value = container && (
    container[definition.key] ||
    (definition.alias ? container[definition.alias] : null)
  );
  if (!value || typeof value !== 'object')
    throw new Error('HEL035_INTEGRATION_SECTION_MISSING:' + definition.id);
  const required = [
    'section_id', 'section_name', 'target_instrument', 'source_status',
    'freshness_status', 'evidence_state', 'current_state', 'silver_impact',
    'action_bias', 'confidence_label', 'long_summary', 'short_summary',
    'dashboard_summary', 'production_effect'
  ];
  required.forEach(field => {
    if (!Object.prototype.hasOwnProperty.call(value, field))
      throw new Error('HEL035_INTEGRATION_FIELD_MISSING:' + definition.id + ':' + field);
  });
  if (String(value.section_id) !== definition.id)
    throw new Error('HEL035_INTEGRATION_SECTION_ID_INVALID:' + definition.id);
  if (String(value.section_name) !== definition.name)
    throw new Error('HEL035_INTEGRATION_SECTION_NAME_INVALID:' + definition.id);
  if (String(value.target_instrument).toUpperCase() !== 'XAGUSD')
    throw new Error('HEL035_INTEGRATION_TARGET_INVALID:' + definition.id);
  if (value.production_effect !== 'none')
    throw new Error('HEL035_INTEGRATION_PRODUCTION_EFFECT_PROHIBITED:' + definition.id);
  if (!String(value.long_summary || '').trim() ||
      !String(value.short_summary || '').trim() ||
      !value.dashboard_summary || typeof value.dashboard_summary !== 'object')
    throw new Error('HEL035_INTEGRATION_RENDERER_MISSING:' + definition.id);
  if (definition.id === 'executive_market_assessment') {
    if (value.intended_long_briefing_order !== 1)
      throw new Error('HEL035_EXECUTIVE_ORDER_INVALID');
    const paragraph = String(value.operator_summary || value.short_summary || '');
    if (/\n\n/.test(paragraph))
      throw new Error('HEL035_EXECUTIVE_PARAGRAPH_INVALID');
    if (/[%]|\bcorrelation\b|\bpercentile\b|\bscore\b|\bsample\b|\b\d+\b/i.test(paragraph))
      throw new Error('HEL035_EXECUTIVE_STATISTICAL_SUMMARY_PROHIBITED');
  }
  return hxSilverIntegrationClone_(value);
}

function hxSilverIntegrationAuthorityLabel_(section) {
  if (String(section.source_status).toLowerCase() === 'blocked') return 'Blocked';
  const labels = {
    production_authoritative:'Production Approved',
    validated:'Validation',
    shadow:'Shadow Observation',
    research_only:'Research',
    placeholder:'Unavailable'
  };
  return labels[String(section.evidence_state || '').toLowerCase()] || 'Unavailable';
}

function hxSilverIntegrationSections_(bundle) {
  const sections = HX_SILVER_INTEGRATION_SECTIONS.map(definition => ({
    definition:definition,
    section:hxSilverIntegrationSection_(bundle, definition)
  }));
  const ids = sections.map(item => item.section.section_id);
  if (new Set(ids).size !== ids.length)
    throw new Error('HEL035_INTEGRATION_DUPLICATE_SECTION');
  return sections;
}

function hxSilverIntegrationLongSection_(item) {
  const rendered = String(item.section.long_summary).trim();
  if (item.definition.id !== 'silver_intelligence') return rendered;
  const lines = rendered.split('\n');
  lines.splice(1, 0, 'Authority: ' + hxSilverIntegrationAuthorityLabel_(item.section));
  return lines.join('\n');
}

function hxSilverIntegrateLongBriefing_(existingBriefing, sections) {
  const existing = String(existingBriefing || '').trim();
  const existingLines = existing ? existing.split('\n') : [];
  const firstExistingSection = existingLines.indexOf('MARKET REGIME:');
  const header = firstExistingSection > 0 ?
    existingLines.slice(0, firstExistingSection) : [];
  const existingBody = firstExistingSection > 0 ?
    existingLines.slice(firstExistingSection) : existingLines;
  const hel035 = sections.map(hxSilverIntegrationLongSection_);
  return header.concat(
    header.length ? [''] : [],
    hel035.reduce((lines, section, index) => {
      if (index) lines.push('');
      lines.push(section);
      return lines;
    }, []),
    existingBody.length ? [''] : [],
    existingBody
  ).join('\n').trim();
}

function hxSilverIntegrateShortBriefing_(sections) {
  return sections.map(item => {
    const section = item.section;
    const authority = item.definition.id === 'silver_intelligence' ?
      ' Authority: ' + hxSilverIntegrationAuthorityLabel_(section) + '.' : '';
    return item.definition.name +
      ' — Current State: ' + section.current_state +
      '; Silver Impact: ' + section.silver_impact +
      '; Confidence: ' + section.confidence_label + '.' + authority;
  }).join('\n');
}

function hxSilverIntegrationDashboardSection_(item) {
  const section = item.section;
  const dashboard = hxSilverIntegrationClone_(section.dashboard_summary);
  const expandable = dashboard.expandable || {};
  delete dashboard.expandable;
  return hxSilverIntegrationFreeze_({
    section_id:item.definition.id,
    heading:item.definition.name,
    target_instrument:'XAGUSD',
    authority_label:hxSilverIntegrationAuthorityLabel_(section),
    interpretation:{
      current_state:section.current_state,
      silver_impact:section.silver_impact,
      action_bias:section.action_bias,
      confidence_score:section.confidence_score === undefined ?
        null : section.confidence_score,
      confidence_label:section.confidence_label,
      source_status:section.source_status,
      freshness_status:section.freshness_status
    },
    statistics_and_evidence:{
      renderer_details:dashboard,
      expandable:expandable,
      provenance:section.source_provenance || null,
      reason_codes:section.reason_codes || [],
      limitations:section.limitations || []
    }
  });
}

function hxSilverIntegrateDashboard_(sections) {
  if (typeof hxSilverBuildOperatorDesk_ === 'function')
    return hxSilverBuildOperatorDesk_(sections);
  return hxSilverIntegrationFreeze_({
    target_instrument:'XAGUSD',
    layout_policy:'interpretation_first_statistics_second',
    section_order:sections.map(item => item.definition.name),
    sections:sections.map(hxSilverIntegrationDashboardSection_),
    production_effect:'none',
    integration_version:HX_SILVER_INTEGRATION_VERSION
  });
}

function hxSilverSilverCardIntegrationPreview_(sections) {
  const executive = sections.find(item =>
    item.definition.id === 'executive_market_assessment').section;
  const external = sections.find(item =>
    item.definition.id === 'silver_intelligence').section;
  return hxSilverIntegrationFreeze_({
    target_instrument:'XAGUSD',
    status:'preview_only',
    current_production_card_preserved:true,
    card_redesigned:false,
    headline:executive.current_state,
    silver_impact:external.silver_impact,
    confidence_label:executive.confidence_label,
    authority_label:hxSilverIntegrationAuthorityLabel_(external),
    expandable:{
      executive:executive.dashboard_summary,
      silver_intelligence:external.dashboard_summary
    },
    production_effect:'none'
  });
}

function hxSilverBuildBriefingIntegration_(existingBriefing, bundle) {
  const sections = hxSilverIntegrationSections_(bundle);
  const longBriefing = hxSilverIntegrateLongBriefing_(existingBriefing, sections);
  const result = {
    target_instrument:'XAGUSD',
    section_order:sections.map(item => item.definition.name),
    sections:sections.map(item => item.section),
    long_briefing:longBriefing,
    short_briefing:hxSilverIntegrateShortBriefing_(sections),
    dashboard:hxSilverIntegrateDashboard_(sections),
    silver_card_preview:hxSilverSilverCardIntegrationPreview_(sections),
    notification:{
      existing_daily_delivery_path:true,
      new_alerts:false,
      independent_section_notifications:false,
      message_surface:'long_briefing'
    },
    production_effect:'none',
    integration_version:HX_SILVER_INTEGRATION_VERSION
  };
  return hxSilverIntegrationFreeze_(result);
}

function hxSilverIntegrationEnabled_(options) {
  const opts = options || {};
  if (opts.hel035_enabled === true) return true;
  if (opts.hel035_enabled === false) return false;
  try {
    return String(
      hxProps_().getProperty('HEL_035_BRIEFING_INTEGRATION_ENABLED') || ''
    ).toLowerCase() === 'true';
  } catch (error) {
    return false;
  }
}

function hxSilverMaybeIntegrateLongBriefing_(existingBriefing, bundle, options) {
  const existing = String(existingBriefing || '');
  if (!hxSilverIntegrationEnabled_(options)) return existing;
  if (!bundle) {
    if (typeof hxNotificationLogEvent_ === 'function')
      hxNotificationLogEvent_(
        'WARN',
        'HEL-035 integration enabled without an interpretation bundle',
        {productionEffect:'none'}
      );
    return existing;
  }
  return hxSilverBuildBriefingIntegration_(existing, bundle).long_briefing;
}
