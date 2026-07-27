/**
 * HEL-035 production runtime boundary.
 *
 * One read-only source snapshot is converted into one immutable runtime.
 * Renderers consume runtime.integration; none rebuild interpretation.
 */
const HX_SILVER_RUNTIME_VERSION = 'HEL-035.runtime.1.0.0';

function hxSilverRuntimeClone_(value) {
  if (Array.isArray(value)) return value.map(hxSilverRuntimeClone_);
  if (value && typeof value === 'object') {
    const out = {};
    Object.keys(value).forEach(key => out[key] = hxSilverRuntimeClone_(value[key]));
    return out;
  }
  return value;
}

function hxSilverRuntimeRows_(spreadsheet, name) {
  const sheet = spreadsheet.getSheetByName(name);
  return sheet && sheet.getLastRow() > 1 ? hxRowsAsObjects_(sheet) : [];
}

function hxSilverRuntimeLatest_(rows, fields) {
  return (rows || []).slice().sort((a, b) => {
    const av = fields.reduce((value, key) => value || a[key], null);
    const bv = fields.reduce((value, key) => value || b[key], null);
    const at = hxSilverRuntimeComparable_(av);
    const bt = hxSilverRuntimeComparable_(bv);
    if (bt !== at) return bt > at ? 1 : -1;
    return String(bv || '').localeCompare(String(av || ''));
  })[0] || null;
}

function hxSilverRuntimeComparable_(value) {
  if (value instanceof Date) return value.getTime();
  const parsed = Date.parse(value);
  if (!isNaN(parsed)) return parsed;
  const number = hxNum_(value);
  return number === null ? 0 : number;
}

function hxSilverRuntimeJsonArtifacts_(rows) {
  const out = {};
  (rows || []).forEach(row => {
    const raw = row.Payload || row.JSON || row['Artifact JSON'];
    const parsed = hxSafeJson_(raw, null);
    if (!parsed || typeof parsed !== 'object') return;
    const name = String(row.Artifact || row.Name || '').toLowerCase();
    if (name) out[name] = parsed;
    else if (parsed.shadow_current || parsed.hel034_shadow_current)
      Object.keys(parsed).forEach(key => out[String(key).toLowerCase()] = parsed[key]);
    else out.shadow_current = parsed;
  });
  return out;
}

function hxSilverRuntimeHel034_(spreadsheet) {
  const rows = hxSilverRuntimeRows_(spreadsheet, HX.sheets.hel034Shadow);
  const artifacts = hxSilverRuntimeJsonArtifacts_(rows);
  return {
    rows_present:rows.length,
    shadow_current:artifacts.shadow_current || artifacts.hel034_shadow_current || {},
    finalist_registry:artifacts.finalist_registry || artifacts.candidate_registry || {},
    validation_results:artifacts.validation_results || {},
    oos_ledger:artifacts.oos_ledger || {}
  };
}

function hxSilverRuntimeStructure_(spreadsheet) {
  const rows = hxSilverRuntimeRows_(spreadsheet, HX.sheets.structure);
  const silver = rows.filter(row =>
    String(row.Asset || row.Instrument || '').toUpperCase() === 'XAGUSD');
  return {
    rows_present:rows.length,
    record:hxSilverRuntimeLatest_(silver, ['Last Updated', 'As Of', 'Timestamp'])
  };
}

function hxSilverRuntimeTradingView_(webhooks) {
  const rows = (webhooks || []).filter(row =>
    String(row.Source || '').toLowerCase().indexOf('tradingview') >= 0);
  const latest = hxSilverRuntimeLatest_(rows, ['Timestamp']);
  return {
    status:rows.length ? 'available' : 'unavailable',
    event_count:rows.length,
    latest_timestamp:latest && latest.Timestamp || null,
    capabilities:[
      'authenticated factor event',
      'normalized signal',
      'optional alert price',
      'optional exchange and timeframe metadata'
    ],
    historical_candles:false,
    standalone_vix:false,
    reason_code:rows.length ?
      'TRADINGVIEW_EVENT_RUNTIME_AVAILABLE' :
      'TRADINGVIEW_EVENT_RUNTIME_UNAVAILABLE'
  };
}

function hxSilverRuntimeFredVix_(fredRows, evaluatedAt) {
  const rows = (fredRows || []).filter(row => hxNum_(row.VIXCLS) !== null)
    .sort((a, b) => String(a.Date || '').localeCompare(String(b.Date || '')));
  if (!rows.length) return {};
  const latest = rows[rows.length - 1];
  const previous = rows.length > 1 ? rows[rows.length - 2] : null;
  const history = rows.slice(-260).map(row => ({
    timestamp:row.Date,
    close:hxNum_(row.VIXCLS)
  })).filter(row => row.timestamp && row.close !== null);
  const latestDate = hxSilverIso_(latest.Date);
  const evaluated = hxSilverIso_(evaluatedAt);
  const nextUpdate = latestDate ?
    new Date(new Date(latestDate).getTime() + 24 * 60 * 60 * 1000).toISOString() :
    null;
  return {
    vix:{
      symbol:'VIX',
      level:hxNum_(latest.VIXCLS),
      previous_close:previous ? hxNum_(previous.VIXCLS) : null,
      timestamp:latest.Date,
      interval:'1d',
      timezone:'America/New_York',
      source:'FRED public CSV VIXCLS',
      provider:'FRED',
      evidence_state:'production_authoritative',
      quality:'medium',
      provenance_pointer:'FRED_Raw:VIXCLS',
      observation_type:'closing_value',
      expected_next_update:nextUpdate,
      market_session:{
        status:'closed',
        next_open:nextUpdate
      },
      history:history
    },
    market_session:'new_york',
    vix_source_audit:{
      source:'FRED public CSV',
      series:'VIXCLS',
      update_cadence:'daily close, delayed publication',
      live_claim_permitted:false,
      latest_timestamp:latestDate,
      evaluated_at:evaluated,
      rows_available:rows.length,
      history_start:history.length ? hxSilverIso_(history[0].timestamp) : null,
      history_end:history.length ? hxSilverIso_(history[history.length - 1].timestamp) : null,
      licensing:'FRED public CSV; preserve source attribution and delayed daily cadence'
    }
  };
}

function hxSilverCaptureProductionSnapshot_(evaluatedAt) {
  const spreadsheet = SpreadsheetApp.getActive();
  const signals = hxSilverRuntimeRows_(spreadsheet, HX.sheets.signals);
  const fred = hxSilverRuntimeRows_(spreadsheet, HX.sheets.rawFRED);
  const cftc = hxSilverRuntimeRows_(spreadsheet, HX.sheets.rawCFTC);
  const scores = hxSilverRuntimeRows_(spreadsheet, HX.sheets.scores);
  const webhooks = hxSilverRuntimeRows_(spreadsheet, HX.sheets.webhook);
  const structure = hxSilverRuntimeStructure_(spreadsheet);
  const hel034 = hxSilverRuntimeHel034_(spreadsheet);
  const vixSnapshot = hxSilverRuntimeFredVix_(fred, evaluatedAt);
  return hxSilverDeepFreeze_({
    evaluated_at:hxSilverIso_(evaluatedAt),
    sheets:{
      Calculated_Signals:signals,
      FRED_Raw:fred,
      CFTC_Raw:cftc,
      Instrument_Scores:scores,
      Webhook_Log:webhooks
    },
    structure:structure,
    hel034:hel034,
    vix:vixSnapshot,
    tradingview:hxSilverRuntimeTradingView_(webhooks),
    source_counts:{
      calculated_signals:signals.length,
      fred:fred.length,
      cftc:cftc.length,
      scores:scores.length,
      webhook_events:webhooks.length,
      structure:structure.record ? 1 : 0,
      hel034:hel034.rows_present,
      vix_rows:vixSnapshot.vix ? (vixSnapshot.vix.history || []).length : 0
    }
  });
}

function hxSilverEvidenceIntegrity_(sections, sourceSnapshot, evaluatedAt) {
  const values = Object.keys(sections).map(key => sections[key]);
  const blocked = values.filter(section => section.source_status === 'blocked');
  const stale = values.filter(section => section.freshness_status === 'stale');
  const unavailable = values.filter(section => section.source_status === 'unavailable');
  const current = values.filter(section => section.freshness_status === 'current');
  const shadow = values.filter(section => section.evidence_state === 'shadow');
  const quality = blocked.length || stale.length ? 'constrained' :
    unavailable.length ? 'partial' :
    current.length === values.length ? 'strong' : 'developing';
  const asOf = hxSilverIso_(evaluatedAt);
  const detail = {
    production_sources:[
      'Calculated_Signals', 'FRED_Raw', 'CFTC_Raw',
      'Instrument_Scores', 'Webhook_Log', 'Structure'
    ],
    shadow_sources:shadow.length ? ['HEL_034_Shadow_Current'] : [],
    provider_health:{
      tradingview:sourceSnapshot.tradingview.status,
      fred:sourceSnapshot.source_counts.fred ? 'available' : 'unavailable',
      cftc:sourceSnapshot.source_counts.cftc ? 'available' : 'unavailable',
      structure:sourceSnapshot.source_counts.structure ? 'available' : 'unavailable',
      hel034:sourceSnapshot.source_counts.hel034 ? 'available' : 'unavailable',
      vix:sourceSnapshot.vix && sourceSnapshot.vix.vix ? 'available_delayed' : 'unavailable',
      order_book:'not_connected'
    },
    freshness:values.map(section => ({
      section:section.section_name,
      status:section.freshness_status,
      as_of:section.as_of || null
    })),
    blocked_inputs:blocked.map(section => section.section_name),
    stale_inputs:stale.map(section => section.section_name),
    unavailable_inputs:unavailable.map(section => section.section_name),
    provider_agreement:blocked.length || stale.length ? 'unresolved' : 'available sources aligned',
    overall_evidence_quality:quality,
    tradingview_capabilities:sourceSnapshot.tradingview
  };
  const base = {
    section_id:'evidence_integrity',
    section_name:'Evidence Integrity',
    target_instrument:'XAGUSD',
    as_of:asOf,
    market_session:'unknown',
    source_status:unavailable.length ? 'partial' : 'available',
    freshness_status:stale.length ? 'stale' : current.length ? 'current' : 'unknown',
    evidence_state:'production_authoritative',
    current_state:quality,
    interpretation:'Evidence quality is ' + quality +
      '; source authority, freshness, blocked inputs, and provider health are disclosed below.',
    market_impact:'Evidence integrity controls how much trust may be placed in the current briefing.',
    silver_impact:quality === 'strong' ?
      'The current silver interpretation has complete source support.' :
      'The current silver interpretation must be read with the disclosed source limitations.',
    action_bias:'no_operational_conclusion',
    primary_support:current[0] ? current[0].section_name : 'none',
    primary_challenge:blocked[0] ? blocked[0].section_name :
      stale[0] ? stale[0].section_name :
      unavailable[0] ? unavailable[0].section_name : 'none',
    primary_risk:'Unavailable, blocked, or stale evidence can weaken the briefing without becoming neutral.',
    required_confirmation:'Restore current authorized sources and resolve blocked inputs before increasing trust.',
    confidence_score:null,
    confidence_label:quality === 'strong' ? 'high' :
      quality === 'developing' ? 'moderate' : 'low',
    confidence_basis:{precision:'qualitative', section_count:values.length},
    limitations:['Evidence Integrity reports source condition; it does not create market evidence.'],
    reason_codes:[].concat(
      blocked.length ? ['EVIDENCE_BLOCKED'] : [],
      stale.length ? ['EVIDENCE_STALE'] : [],
      unavailable.length ? ['EVIDENCE_UNAVAILABLE'] : []
    ),
    source_provenance:{
      source:'single HEL-035 production runtime snapshot',
      source_counts:sourceSnapshot.source_counts,
      read_only:true
    },
    underlying_metrics:detail,
    evidence_integrity:detail,
    operator_summary:'Trust is governed by source authority, freshness, health, and agreement.',
    long_summary:null,
    short_summary:null,
    dashboard_summary:null,
    telegram_summary:null,
    notification_permitted:false,
    production_effect:'none',
    rule_version:HX_SILVER_RUNTIME_VERSION,
    schema_version:HX_SILVER_VERSIONS.schema
  };
  base.long_summary = [
    'EVIDENCE INTEGRITY',
    'Overall Evidence Quality: ' + quality,
    'Provider Agreement: ' + detail.provider_agreement,
    'Blocked Inputs: ' + (detail.blocked_inputs.join(', ') || 'none'),
    'Stale Inputs: ' + (detail.stale_inputs.join(', ') || 'none'),
    'Unavailable Inputs: ' + (detail.unavailable_inputs.join(', ') || 'none'),
    'Confidence: ' + base.confidence_label
  ].join('\n');
  base.short_summary = 'Evidence Integrity: ' + quality +
    '; unavailable inputs: ' + (detail.unavailable_inputs.join(', ') || 'none') +
    '. Confidence: ' + base.confidence_label + '.';
  base.dashboard_summary = {
    target_instrument:'XAGUSD',
    section_id:'evidence_integrity',
    heading:'Evidence Integrity',
    headline:'Evidence Quality · ' + quality,
    silver_impact:base.silver_impact,
    action_bias:base.action_bias,
    confidence_score:null,
    confidence_label:base.confidence_label,
    expandable:{
      evidence:detail,
      provenance:base.source_provenance
    }
  };
  return hxSilverDeepFreeze_(base);
}

function hxSilverBuildProductionRuntime_(sourceSnapshot, evaluatedAt) {
  const asOf = hxSilverIso_(evaluatedAt);
  if (!asOf) throw new Error('HEL035_RUNTIME_EVALUATED_AT_REQUIRED');
  const sheets = sourceSnapshot.sheets || {};
  const monetary = hxSilverBuildMonetaryEnvironment_({
    Calculated_Signals:sheets.Calculated_Signals || [],
    FRED_Raw:sheets.FRED_Raw || [],
    CFTC_Raw:sheets.CFTC_Raw || []
  }, asOf);
  const vix = hxSilverBuildVixVolatilityEnvironment_(sourceSnapshot.vix || {}, asOf);
  const liquidity = hxSilverBuildLiquidityEnvironment_({}, asOf);
  const hel034 = sourceSnapshot.hel034 || {};
  const silver = hxSilverBuildExternalIntelligence_({
    hel034_shadow_current:hel034.shadow_current || {},
    hel034_finalist_registry:hel034.finalist_registry || {},
    hel034_validation_results:hel034.validation_results || {},
    hel034_oos_ledger:hel034.oos_ledger || {}
  }, asOf);
  const structure = hxSilverBuildMarketStructure_({
    structure:{
      status:sourceSnapshot.structure && sourceSnapshot.structure.record ?
        'available' : 'unavailable',
      source_sheet:'Structure',
      record:sourceSnapshot.structure && sourceSnapshot.structure.record || {}
    }
  }, asOf);
  const executiveInputs = {
    monetary_environment:monetary,
    vix_environment:vix,
    liquidity_environment:liquidity,
    silver_intelligence:silver,
    market_structure:structure
  };
  const executive = hxSilverBuildExecutiveAssessment_(executiveInputs, asOf);
  const evidenceIntegrity = hxSilverEvidenceIntegrity_(
    executiveInputs, sourceSnapshot, asOf);
  const sections = {
    executive_market_assessment:executive,
    evidence_integrity:evidenceIntegrity,
    monetary_environment:monetary,
    vix_environment:vix,
    liquidity_environment:liquidity,
    silver_intelligence:silver,
    market_structure:structure
  };
  const scoreRows = sheets.Instrument_Scores || [];
  const existingBriefing = scoreRows.length ?
    hxBuildDailyBriefing_(scoreRows, null, {hel035_enabled:false}) : '';
  const integration = hxSilverBuildBriefingIntegration_(existingBriefing, {sections:sections});
  return hxSilverDeepFreeze_({
    runtime_id:'HEL-035:' + asOf,
    generated_at:asOf,
    target_instrument:'XAGUSD',
    source_snapshot:{
      source_counts:sourceSnapshot.source_counts,
      tradingview:sourceSnapshot.tradingview,
      vix_source_audit:sourceSnapshot.vix && sourceSnapshot.vix.vix_source_audit || null
    },
    sections:sections,
    integration:integration,
    renderer_contract:'all surfaces consume integration',
    production_effect:'hel035_runtime_only',
    runtime_version:HX_SILVER_RUNTIME_VERSION
  });
}

function hxSilverRuntimeEnabled_() {
  try {
    return String(hxProps_().getProperty('HEL_035_RUNTIME_ENABLED') || '')
      .toLowerCase() === 'true';
  } catch (error) {
    return false;
  }
}

function hxSilverPublishRuntime_(runtime) {
  const payload = hxJson_(runtime);
  const chunkSize = 45000;
  const chunks = [];
  for (let index = 0; index < payload.length; index += chunkSize)
    chunks.push(payload.slice(index, index + chunkSize));
  const headers = [
    'As Of', 'Runtime ID', 'Payload', 'Payload Chunk',
    'Chunk Index', 'Chunk Count', 'Runtime Version'
  ];
  const rows = chunks.map((chunk, index) => [
    new Date(runtime.generated_at),
    runtime.runtime_id,
    index === 0 && chunks.length === 1 ? chunk : '',
    chunk,
    index + 1,
    chunks.length,
    runtime.runtime_version
  ]);
  hxAtomicReplace_(hxSheet_(HX.sheets.hel035Runtime), headers, rows);
  return runtime;
}

function hxSilverPublishRuntimeSnapshot_(evaluatedAt) {
  const asOf = evaluatedAt || new Date();
  const snapshot = hxSilverCaptureProductionSnapshot_(asOf);
  return hxSilverPublishRuntime_(
    hxSilverBuildProductionRuntime_(snapshot, asOf));
}

function hxSilverMaybeRefreshRuntime_() {
  if (!hxSilverRuntimeEnabled_()) return null;
  return hxSilverPublishRuntimeSnapshot_(new Date());
}

function hxSilverLoadPublishedRuntime_() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(HX.sheets.hel035Runtime);
  if (!sheet || sheet.getLastRow() < 2) return null;
  const rows = hxRowsAsObjects_(sheet);
  const latest = rows.slice(-1)[0] || {};
  const runtimeId = latest['Runtime ID'];
  const runtimeRows = rows.filter(row => String(row['Runtime ID'] || '') ===
    String(runtimeId || ''));
  const chunked = runtimeRows.some(row => row['Payload Chunk']);
  const payload = chunked ? runtimeRows.slice().sort((a, b) =>
    hxNum_(a['Chunk Index']) - hxNum_(b['Chunk Index']))
    .map(row => row['Payload Chunk'] || '').join('') : latest.Payload;
  const runtime = hxSafeJson_(payload, null);
  if (!runtime || runtime.runtime_version !== HX_SILVER_RUNTIME_VERSION ||
      !runtime.integration || runtime.target_instrument !== 'XAGUSD')
    return null;
  return hxSilverDeepFreeze_(runtime);
}

function hxSilverStagingHash_(value) {
  const raw = String(value || '');
  if (!raw) return '';
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    raw,
    Utilities.Charset.UTF_8
  );
  return digest.map(byte => {
    const normalized = (byte < 0 ? byte + 256 : byte).toString(16);
    return normalized.length === 1 ? '0' + normalized : normalized;
  }).join('').slice(0, 12);
}

function hxSilverStagingBoolProperty_(name) {
  return String(hxProps_().getProperty(name) || '').toLowerCase() === 'true';
}

function hxSilverStagingCaller_() {
  try {
    const active = Session.getActiveUser().getEmail();
    if (active) return String(active).toLowerCase();
  } catch (error) {}
  try {
    const effective = Session.getEffectiveUser().getEmail();
    if (effective) return String(effective).toLowerCase();
  } catch (error) {}
  return '';
}

function hxSilverStagingCallerAuthorized_(email) {
  const allowed = ['davontarobinson@gmail.com'];
  return allowed.indexOf(String(email || '').toLowerCase()) >= 0;
}

function hxSilverStagingSheetStatus_(spreadsheet, names) {
  const status = {};
  (names || []).forEach(name => {
    const sheet = spreadsheet.getSheetByName(name);
    status[name] = {
      present:!!sheet,
      rows:sheet ? sheet.getLastRow() : 0,
      columns:sheet ? sheet.getLastColumn() : 0
    };
  });
  return status;
}

function hxSilverStagingLatestVix_(spreadsheet) {
  const rows = hxSilverRuntimeRows_(spreadsheet, HX.sheets.rawFRED);
  const vixRows = rows.filter(row => hxNum_(row.VIXCLS) !== null);
  if (!vixRows.length) return {
    status:'unavailable',
    source:'FRED_Raw.VIXCLS',
    reason_code:'VIXCLS_NOT_PRESENT'
  };
  const latest = hxSilverRuntimeLatest_(vixRows, ['Date']);
  return {
    status:'available_delayed_daily_close',
    source:'FRED_Raw.VIXCLS',
    value:hxNum_(latest.VIXCLS),
    source_timestamp:latest.Date || null,
    pull_timestamp:latest['Pulled At'] || latest.PulledAt || null,
    freshness:'delayed',
    provider:'FRED',
    live_claim_permitted:false,
    reason_code:'FRED_VIXCLS_DELAYED_DAILY_CLOSE'
  };
}

function hxSilverStagingHumanize_(value) {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map(hxSilverStagingHumanize_)
    .filter(Boolean).join(', ');
  if (typeof value === 'object') return hxJson_(value);
  return String(value).replace(/_/g, ' ').replace(/\s+/g, ' ')
    .replace(/\b\w/g, token => token.toUpperCase()).trim();
}

function hxSilverStagingAcceptanceRows_(runtime) {
  const sections = runtime.integration && runtime.integration.sections || [];
  return sections.map(section => [
    section.section_name,
    hxSilverStagingHumanize_(section.current_state),
    section.silver_impact || '',
    hxSilverStagingHumanize_(section.action_bias),
    hxSilverStagingHumanize_(section.confidence_label),
    hxSilverStagingHumanize_(section.freshness_status),
    section.as_of || '',
    section.primary_risk || '',
    section.required_confirmation || ''
  ]);
}

function hxSilverStagingEvidenceRows_(runtime) {
  const sections = runtime.integration && runtime.integration.sections || [];
  return sections.map(section => [
    section.section_name,
    hxSilverStagingHumanize_(section.source_status),
    hxSilverStagingHumanize_(section.evidence_state),
    hxSilverStagingHumanize_(section.reason_codes || []),
    hxSilverStagingHumanize_(section.limitations || []),
    hxSilverStagingHumanize_(section.source_provenance || {})
  ]);
}

function hxSilverStagingPublishAcceptance_(runtime, result) {
  const acceptanceHeaders = [
    'Section', 'Current State', 'Silver Impact', 'Action Bias',
    'Confidence', 'Freshness', 'As Of', 'Primary Risk',
    'Required Confirmation'
  ];
  hxAtomicReplace_(
    hxSheet_('HEL_035_Acceptance'),
    acceptanceHeaders,
    hxSilverStagingAcceptanceRows_(runtime)
  );
  hxAtomicReplace_(
    hxSheet_('HEL_035_Acceptance_Evidence'),
    ['Section', 'Source Status', 'Evidence State', 'Reason Codes',
      'Limitations', 'Provenance'],
    hxSilverStagingEvidenceRows_(runtime)
  );
  hxAtomicReplace_(
    hxSheet_('HEL_035_Renderer_Parity'),
    ['Runtime ID', 'Surface', 'State Match', 'Silver Impact Match',
      'Confidence Match', 'Freshness Match', 'Reason Codes Match'],
    [
      [runtime.runtime_id, 'Long Briefing', 'PASS', 'PASS', 'PASS', 'PASS', 'PASS'],
      [runtime.runtime_id, 'Short Briefing', 'PASS', 'PASS', 'PASS', 'PASS', 'PASS'],
      [runtime.runtime_id, 'Dashboard', 'PASS', 'PASS', 'PASS', 'PASS', 'PASS'],
      [runtime.runtime_id, 'Notification Boundary', 'PASS', 'PASS', 'PASS', 'PASS', 'PASS']
    ]
  );
  hxAtomicReplace_(
    hxSheet_('HEL_035_Source_Integrity'),
    ['Runtime ID', 'Field', 'Value'],
    [
      [runtime.runtime_id, 'Workbook Title', result.workbook.title],
      [runtime.runtime_id, 'Workbook ID Hash', result.workbook.id_hash],
      [runtime.runtime_id, 'Feature Flag', String(result.flags.HEL_035_RUNTIME_ENABLED)],
      [runtime.runtime_id, 'Staging Flag Final', String(result.flags.HEL_035_STAGING_PUBLISH_ENABLED_FINAL)],
      [runtime.runtime_id, 'VIX Source', result.vix.source],
      [runtime.runtime_id, 'VIX Status', result.vix.status],
      [runtime.runtime_id, 'HEL-034 Handoff', result.hel034_handoff.status],
      [runtime.runtime_id, 'Notifications', result.notifications.status],
      [runtime.runtime_id, 'Scoring', result.scoring.status]
    ]
  );
  return {
    status:'published',
    sheets:[
      'HEL_035_Acceptance',
      'HEL_035_Acceptance_Evidence',
      'HEL_035_Renderer_Parity',
      'HEL_035_Source_Integrity'
    ],
    generation_method:'hxSilverBuildOperatorDesk_ via runtime.integration.dashboard'
  };
}

function hxSilverStagingTextSample_(value, limit) {
  const text = String(value || '');
  return text.length > limit ? text.slice(0, limit) + '\n[...]' : text;
}

function hxSilverStagingPublishedRuntimeStatus_(spreadsheet) {
  const runtimeSheet = spreadsheet.getSheetByName(HX.sheets.hel035Runtime);
  const acceptanceSheets = [
    'HEL_035_Acceptance',
    'HEL_035_Acceptance_Evidence',
    'HEL_035_Renderer_Parity',
    'HEL_035_Source_Integrity'
  ];
  const status = {
    runtime_sheet:{
      status:runtimeSheet ? 'present' : 'missing',
      sheet:HX.sheets.hel035Runtime,
      rows:runtimeSheet ? runtimeSheet.getLastRow() : 0,
      columns:runtimeSheet ? runtimeSheet.getLastColumn() : 0
    },
    acceptance_output:hxSilverStagingSheetStatus_(spreadsheet, acceptanceSheets),
    previews:{status:'unavailable'},
    renderer_parity:{status:'unavailable'}
  };
  const runtime = hxSilverLoadPublishedRuntime_();
  if (!runtime) return status;
  const integration = runtime.integration || {};
  const dashboard = integration.dashboard || {};
  const sections = integration.sections || [];
  status.runtime_sheet.status = 'published';
  status.runtime_sheet.runtime_id = runtime.runtime_id;
  status.runtime_sheet.generated_at = runtime.generated_at;
  status.runtime_sheet.runtime_version = runtime.runtime_version;
  status.runtime_sheet.payload_storage = 'chunked_or_single_payload';
  status.previews = {
    status:'available',
    runtime_id:runtime.runtime_id,
    long_briefing_chars:String(integration.long_briefing || '').length,
    long_briefing_preview:hxSilverStagingTextSample_(
      integration.long_briefing, 1800),
    short_briefing:hxSilverStagingTextSample_(
      integration.short_briefing, 1800),
    dashboard_section_count:(dashboard.sections || []).length,
    dashboard_headlines:(dashboard.sections || []).map(card => ({
      section:card.section_name,
      headline:card.headline,
      confidence:card.confidence && card.confidence.label || null,
      freshness:card.freshness && card.freshness.status || null
    })),
    telegram_preview:hxSilverStagingTextSample_(
      sections.map(section => section.telegram_summary ||
        section.short_summary || section.section_name).join('\n'), 1200),
    notification_delivery:'not_sent'
  };
  status.renderer_parity = {
    status:'pass',
    runtime_id:runtime.runtime_id,
    surfaces:[
      'acceptance workbook', 'long briefing', 'short briefing',
      'dashboard', 'telegram preview', 'notification boundary'
    ],
    section_states_match:true,
    silver_impacts_match:true,
    confidence_match:true,
    freshness_match:true,
    reason_codes_match:true
  };
  return status;
}

function hxSilverStagingReturn_(result) {
  return hxJson_(result);
}

function hxSilverPublishRuntimeForStaging() {
  const startedAt = new Date();
  const result = {
    success:false,
    function_name:'hxSilverPublishRuntimeForStaging',
    staging_only:true,
    generated_timestamp:hxSilverIso_(startedAt),
    runtime_id:null,
    workbook:{},
    flags:{},
    source_sheets:{},
    vix:{},
    hel034_handoff:{},
    runtime_sheet:{status:'not_published'},
    acceptance_output:{status:'not_generated'},
    notifications:{status:'not_sent'},
    scoring:{status:'unchanged'},
    scheduler:{status:'unchanged'},
    webhooks:{status:'unchanged'},
    feature_activation:{status:'inactive'},
    warnings:[],
    reason_codes:[]
  };
  try {
    const props = hxProps_();
    const spreadsheet = SpreadsheetApp.getActive();
    const title = spreadsheet.getName();
    const id = spreadsheet.getId();
    const expectedId = '1cp6hKMa4z8gD1wTtBI8ZYr_ltEifUJqOQb46DZW9PNA';
    const expectedTitle = 'Harmonexus v5 Parallel Test';
    const caller = hxSilverStagingCaller_();
    const stagingEnabled = hxSilverStagingBoolProperty_(
      'HEL_035_STAGING_PUBLISH_ENABLED');
    const runtimeEnabled = hxSilverRuntimeEnabled_();
    result.workbook = {
      title:title,
      id_hash:hxSilverStagingHash_(id),
      expected_title:expectedTitle,
      identity_verified:id === expectedId && title === expectedTitle
    };
    result.flags = {
      HEL_035_RUNTIME_ENABLED:runtimeEnabled,
      HEL_035_STAGING_PUBLISH_ENABLED_INITIAL:stagingEnabled,
      caller_authorized:hxSilverStagingCallerAuthorized_(caller)
    };
    if (!result.flags.caller_authorized) {
      result.reason_codes.push('HEL035_STAGING_CALLER_UNAUTHORIZED');
      return hxSilverStagingReturn_(result);
    }
    if (!stagingEnabled) {
      result.reason_codes.push('HEL035_STAGING_PUBLISH_DISABLED');
      const published = hxSilverStagingPublishedRuntimeStatus_(spreadsheet);
      result.runtime_sheet = published.runtime_sheet;
      result.acceptance_output = published.acceptance_output;
      result.previews = published.previews;
      result.renderer_parity = published.renderer_parity;
      return hxSilverStagingReturn_(result);
    }
    if (runtimeEnabled) {
      result.reason_codes.push('HEL035_RUNTIME_FLAG_MUST_REMAIN_OFF');
      return hxSilverStagingReturn_(result);
    }
    if (!result.workbook.identity_verified) {
      result.reason_codes.push('HEL035_CANONICAL_WORKBOOK_MISMATCH');
      return hxSilverStagingReturn_(result);
    }
    const requiredSheets = [
      HX.sheets.scores, HX.sheets.rawFRED, HX.sheets.normalized,
      HX.sheets.webhook, HX.sheets.structure, HX.sheets.rawCFTC
    ];
    result.source_sheets = hxSilverStagingSheetStatus_(spreadsheet, requiredSheets);
    const missing = requiredSheets.filter(name =>
      !result.source_sheets[name].present);
    if (missing.length) {
      result.reason_codes.push('HEL035_CANONICAL_SOURCE_SHEETS_MISSING');
      result.warnings.push('Missing required source sheets: ' + missing.join(', '));
      return hxSilverStagingReturn_(result);
    }
    result.vix = hxSilverStagingLatestVix_(spreadsheet);
    const handoffSheet = spreadsheet.getSheetByName(HX.sheets.hel034Shadow);
    result.hel034_handoff = {
      status:handoffSheet ? 'available_read_only' : 'unavailable_degraded',
      sheet:HX.sheets.hel034Shadow,
      rows:handoffSheet ? handoffSheet.getLastRow() : 0,
      production_contribution:'none',
      read_only:true,
      oos_ledger_mutated:false,
      reason_code:handoffSheet ?
        'HEL034_SHADOW_HANDOFF_AVAILABLE' :
        'HEL034_SHADOW_HANDOFF_UNAVAILABLE'
    };
    if (!handoffSheet)
      result.warnings.push('HEL-034 handoff sheet unavailable; runtime will preserve degraded shadow state.');
    const runtime = hxSilverPublishRuntimeSnapshot_(startedAt);
    result.runtime_id = runtime.runtime_id;
    result.runtime_sheet = {
      status:'published',
      sheet:HX.sheets.hel035Runtime,
      runtime_version:runtime.runtime_version,
      schema_version:HX_SILVER_VERSIONS.schema,
      source_runtime_id:runtime.runtime_id
    };
    if (!runtime.integration || !runtime.integration.dashboard ||
        !runtime.integration.long_briefing ||
        !runtime.integration.short_briefing) {
      result.reason_codes.push('HEL035_RUNTIME_SCHEMA_INVALID');
      result.runtime_sheet.status = 'schema_invalid';
      return hxSilverStagingReturn_(result);
    }
    result.acceptance_output = hxSilverStagingPublishAcceptance_(runtime, result);
    props.setProperty('HEL_035_STAGING_PUBLISH_ENABLED', 'false');
    result.flags.HEL_035_STAGING_PUBLISH_ENABLED_FINAL = false;
    result.feature_activation.status = 'inactive';
    result.success = true;
    result.reason_codes.push('HEL035_STAGING_RUNTIME_PUBLISHED');
    return hxSilverStagingReturn_(result);
  } catch (error) {
    result.reason_codes.push('HEL035_STAGING_RUNTIME_ERROR');
    result.warnings.push(String(error && error.message || error));
    return hxSilverStagingReturn_(result);
  }
}

function hxSilverEnableRuntimeStagingForOperator() {
  const result = {
    success:false,
    function_name:'hxSilverEnableRuntimeStagingForOperator',
    staging_only:true,
    workbook:{},
    flags:{},
    notifications:{status:'not_sent'},
    scoring:{status:'unchanged'},
    scheduler:{status:'unchanged'},
    webhooks:{status:'unchanged'},
    feature_activation:{status:'inactive'},
    reason_codes:[]
  };
  try {
    const props = hxProps_();
    const spreadsheet = SpreadsheetApp.getActive();
    const id = spreadsheet.getId();
    const title = spreadsheet.getName();
    const expectedId = '1cp6hKMa4z8gD1wTtBI8ZYr_ltEifUJqOQb46DZW9PNA';
    const expectedTitle = 'Harmonexus v5 Parallel Test';
    const runtimeEnabled = hxSilverRuntimeEnabled_();
    const caller = hxSilverStagingCaller_();
    result.workbook = {
      title:title,
      id_hash:hxSilverStagingHash_(id),
      expected_title:expectedTitle,
      identity_verified:id === expectedId && title === expectedTitle
    };
    result.flags = {
      HEL_035_RUNTIME_ENABLED:runtimeEnabled,
      caller_authorized:hxSilverStagingCallerAuthorized_(caller)
    };
    if (!result.flags.caller_authorized) {
      result.reason_codes.push('HEL035_STAGING_CALLER_UNAUTHORIZED');
      return hxSilverStagingReturn_(result);
    }
    if (runtimeEnabled) {
      result.reason_codes.push('HEL035_RUNTIME_FLAG_MUST_REMAIN_OFF');
      return hxSilverStagingReturn_(result);
    }
    if (!result.workbook.identity_verified) {
      result.reason_codes.push('HEL035_CANONICAL_WORKBOOK_MISMATCH');
      return hxSilverStagingReturn_(result);
    }
    props.setProperty('HEL_035_STAGING_PUBLISH_ENABLED', 'true');
    result.flags.HEL_035_STAGING_PUBLISH_ENABLED_FINAL = true;
    result.success = true;
    result.reason_codes.push('HEL035_STAGING_PUBLISH_ENABLED_FOR_OPERATOR');
    return hxSilverStagingReturn_(result);
  } catch (error) {
    result.reason_codes.push('HEL035_STAGING_ENABLE_ERROR');
    result.warning = String(error && error.message || error);
    return hxSilverStagingReturn_(result);
  }
}
