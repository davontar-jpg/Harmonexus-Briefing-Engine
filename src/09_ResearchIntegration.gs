const RESEARCH_SHEET_NAMES = Object.freeze({
  metadata:'Research_Metadata',
  map:'Research_Instrument_Map',
  seasonal:'Research_Seasonal',
  session:'Research_Session',
  hourly:'Research_Hourly',
  personality:'Research_Personality',
  probabilities:'Research_Probabilities',
  discoveries:'Research_Top_Discoveries',
  watchRules:'Research_Watch_Rules',
  timing:'Research_Timing_Windows'
});

function installResearchLibrary() {
  if (typeof RESEARCH_LIBRARY === 'undefined') throw new Error('RESEARCH_LIBRARY is not bundled. Run tools/build-research-library.mjs.');
  const schemas = hxResearchSchemas_();
  hxAtomicReplace_(hxSheet_(RESEARCH_SHEET_NAMES.metadata), schemas.metadata, hxResearchMetadataRows_());
  hxAtomicReplace_(hxSheet_(RESEARCH_SHEET_NAMES.map), schemas.map, RESEARCH_LIBRARY.instrument_map.map(r=>[
    r.research_symbol,r.engine_instrument,r.supported,r.unsupported_reason,r.source_batch,r.rows,r.daily_bars,r.start,r.end,r.years,r.has_volume,r.daily_only,r.research_confidence
  ]));
  hxAtomicReplace_(hxSheet_(RESEARCH_SHEET_NAMES.seasonal), schemas.seasonal, RESEARCH_LIBRARY.seasonal_database.map(r=>[
    r.engine_instrument,r.research_symbol,r.supported,r.best_month,r.best_month_name,r.best_month_avg_pct,r.best_month_probability,r.best_month_sample_size,
    r.worst_month,r.worst_month_name,r.worst_month_avg_pct,r.worst_month_probability,r.worst_month_sample_size,r.best_dow,r.best_dow_avg_pct,
    r.reversal_after_3_probability,r.weekly_first_day_continuation_probability,r.source_batch,r.research_confidence
  ]));
  hxAtomicReplace_(hxSheet_(RESEARCH_SHEET_NAMES.session), schemas.session, RESEARCH_LIBRARY.session_database.map(r=>[
    r.engine_instrument,r.research_symbol,r.supported,r.session_preference,r.ny_reverses_london_probability,r.source_batch,r.research_confidence
  ]));
  hxAtomicReplace_(hxSheet_(RESEARCH_SHEET_NAMES.hourly), schemas.hourly, RESEARCH_LIBRARY.hourly_database.map(r=>[
    r.engine_instrument,r.research_symbol,r.supported,r.most_volatile_hour_et,r.most_volatile_hour_avg_range_pct,r.daily_only,r.source_batch,r.research_confidence
  ]));
  hxAtomicReplace_(hxSheet_(RESEARCH_SHEET_NAMES.personality), schemas.personality, RESEARCH_LIBRARY.market_personality_flags.map(r=>[
    r.engine_instrument,r.research_symbol,r.supported,r.TrendPersistence,r.MeanReversion,r.FalseBreakoutRisk,r.SessionPreference,
    r.DollarSensitivity,r.RateSensitivity,r.CommoditySensitivity,r.RiskAppetiteSensitivity
  ]));
  hxAtomicReplace_(hxSheet_(RESEARCH_SHEET_NAMES.probabilities), schemas.probabilities, RESEARCH_LIBRARY.probability_tables.map(r=>[
    r.engine_instrument || 'UNSUPPORTED',r.instrument,r.supported,r.category,r.finding,r.probability,r.confidence,r.confidence_score,r.sample_size,
    r.engine_use,r.override_live_market_data,r.source_batch,r.rank
  ]));
  hxAtomicReplace_(hxSheet_(RESEARCH_SHEET_NAMES.discoveries), schemas.discoveries, RESEARCH_LIBRARY.top_discoveries.map(r=>[
    r.engine_instrument,r.research_symbol,r.supported,r.category,r.finding,r.why_it_matters,r.confidence_score,r.sample_size,r.source_batch,r.confidence,r.rank
  ]));
  const watchRows = [];
  (RESEARCH_LIBRARY.seasonal_watch_rules || []).forEach(r=>watchRows.push(['seasonal',r.rule_id,r.trigger,r.action,r.confidence || '',r.observed_probability || '',r.sample_size || '',r.never_override_live_data === undefined ? true : r.never_override_live_data]));
  (RESEARCH_LIBRARY.session_watch_rules || []).forEach(r=>watchRows.push(['session',r.rule_id,r.trigger,r.action,r.confidence || '',r.observed_probability || '',r.sample_size || '',r.never_override_live_data === undefined ? true : r.never_override_live_data]));
  hxAtomicReplace_(hxSheet_(RESEARCH_SHEET_NAMES.watchRules), schemas.watchRules, watchRows);
  hxAtomicReplace_(hxSheet_(RESEARCH_SHEET_NAMES.timing), schemas.timing, RESEARCH_LIBRARY.timing_windows.map(r=>[
    r.engine_instrument,r.research_symbol,r.machine_state,r.timing_type,r.day,r.probability,r.sample_size,r.confidence,r.finding,r.source_batch
  ]));
  hxInstallResearchCompatibility_();
  hxLog_('INFO','installResearchLibrary','COMPLETE','Research library installed.',RESEARCH_LIBRARY.validation);
  return RESEARCH_LIBRARY.validation;
}

function hxResearchSchemas_() {
  return {
    metadata:['Key','Value'],
    map:['Research Symbol','Instrument','Supported','Unsupported Reason','Source Batch','Rows','Daily Bars','Start','End','Years','Has Volume','Daily Only','Research Confidence'],
    seasonal:['Instrument','Research Symbol','Supported','Best Month','Best Month Name','Best Month Avg %','Best Month Probability','Best Month Sample Size','Worst Month','Worst Month Name','Worst Month Avg %','Worst Month Probability','Worst Month Sample Size','Best DOW','Best DOW Avg %','Reversal After 3 Probability','Weekly First Day Continuation Probability','Source Batch','Research Confidence'],
    session:['Instrument','Research Symbol','Supported','Session Preference','NY Reverses London Probability','Source Batch','Research Confidence'],
    hourly:['Instrument','Research Symbol','Supported','Most Volatile Hour ET','Most Volatile Hour Avg Range %','Daily Only','Source Batch','Research Confidence'],
    personality:['Instrument','Research Symbol','Supported','Trend Persistence','Mean Reversion','False Breakout Risk','Session Preference','Dollar Sensitivity','Rate Sensitivity','Commodity Sensitivity','Risk Appetite Sensitivity'],
    probabilities:['Instrument','Research Symbol','Supported','Category','Finding','Probability','Confidence','Confidence Score','Sample Size','Engine Use','Override Live Market Data','Source Batch','Rank'],
    discoveries:['Instrument','Research Symbol','Supported','Category','Finding','Why It Matters','Confidence Score','Sample Size','Source Batch','Confidence','Rank'],
    watchRules:['Rule Type','Rule ID','Trigger','Action','Confidence','Observed Probability','Sample Size','Never Override Live Data'],
    timing:['Instrument','Research Symbol','Machine State','Timing Type','Day','Probability','Sample Size','Confidence','Finding','Source Batch']
  };
}

function hxResearchMetadataRows_() {
  return [
    ['Package Name', RESEARCH_LIBRARY.package_name],
    ['Package Version', RESEARCH_LIBRARY.package_version],
    ['Generated At', RESEARCH_LIBRARY.generated_at],
    ['Scope', RESEARCH_LIBRARY.scope],
    ['Hard Rules', hxJson_(RESEARCH_LIBRARY.hard_rules)],
    ['Confidence Weights', hxJson_(RESEARCH_LIBRARY.confidence_weights)],
    ['Validation', hxJson_(RESEARCH_LIBRARY.validation)],
    ['Unsupported Symbols', (RESEARCH_LIBRARY.unsupported_symbols || []).join(', ')],
    ['Source Files', hxJson_(RESEARCH_LIBRARY.source_files)]
  ];
}

function hxEnsureResearchLibrary_() {
  if (typeof RESEARCH_LIBRARY === 'undefined' || typeof SpreadsheetApp === 'undefined') return false;
  const sh = SpreadsheetApp.getActive().getSheetByName(RESEARCH_SHEET_NAMES.metadata);
  if (!sh || sh.getLastRow() < 2) { installResearchLibrary(); return true; }
  const rows = hxRowsAsObjects_(sh);
  const version = rows.find(r=>String(r.Key)==='Package Version');
  if (!version || String(version.Value) !== String(RESEARCH_LIBRARY.package_version)) installResearchLibrary();
  return true;
}

function hxInstallResearchCompatibility_() {
  const seasonalRows = [];
  (RESEARCH_LIBRARY.seasonal_database || []).filter(r=>r.supported).forEach(r=>{
    if (r.best_month_name !== 'UNKNOWN') seasonalRows.push([r.engine_instrument,r.best_month_name,'Bullish',r.research_confidence,hxResearchUsable_(r.best_month_sample_size,r.research_confidence),'Samples '+(r.best_month_sample_size || 'UNKNOWN')+' Win '+hxPct_(r.best_month_probability)+' Avg range '+hxPct_(r.best_month_avg_pct),r.research_symbol]);
    if (r.worst_month_name !== 'UNKNOWN') seasonalRows.push([r.engine_instrument,r.worst_month_name,'Bearish',r.research_confidence,hxResearchUsable_(r.worst_month_sample_size,r.research_confidence),'Samples '+(r.worst_month_sample_size || 'UNKNOWN')+' Win '+hxPct_(r.worst_month_probability)+' Avg range '+hxPct_(r.worst_month_avg_pct),r.research_symbol]);
  });
  hxAtomicReplace_(hxSheet_('Seasonality'), ['Asset','Month','Seasonal Bias','Strength','Use in Final Read','Notes','Source'], seasonalRows);
  const byInstrument = {};
  (RESEARCH_LIBRARY.timing_windows || []).filter(r=>r.engine_instrument !== 'UNSUPPORTED').forEach(r=>{
    const key = r.engine_instrument;
    byInstrument[key] = byInstrument[key] || {high:null,low:null,sample:0};
    const current = byInstrument[key][r.timing_type];
    if (!current || Number(r.probability || 0) > Number(current.probability || 0)) byInstrument[key][r.timing_type] = r;
    byInstrument[key].sample = Math.max(byInstrument[key].sample, Number(r.sample_size || 0));
  });
  const timingRows = [];
  Object.keys(byInstrument).forEach(id=>{
    const item = byInstrument[id], high=item.high, low=item.low;
    const highText = high ? high.day+' ('+(Number(high.probability || 0)*100).toFixed(1)+'%)' : '';
    const lowText = low ? low.day+' ('+(Number(low.probability || 0)*100).toFixed(1)+'%)' : '';
    ['Bullish','Bearish','Neutral'].forEach(state=>timingRows.push([id,state,highText,lowText,item.sample+' weeks','Harmonexus Research Library']));
  });
  hxAtomicReplace_(hxSheet_('Timing'), ['Asset','Machine State','Weekly High Window','Weekly Low Window','Sample Size','Source'], timingRows);
}

function hxResearchUsable_(sampleSize, confidence) {
  const sample = Number(sampleSize || 0);
  if (sample >= 10 || confidence === 'High') return 'Yes';
  return 'No';
}

function hxPct_(value) {
  if (value === null || value === '' || value === undefined) return 'UNKNOWN';
  const n = Number(value);
  if (!isFinite(n)) return 'UNKNOWN';
  return (Math.abs(n) <= 1 ? n * 100 : n).toFixed(1) + '%';
}

function hxApplyResearchContext_(score, now) {
  if (typeof SpreadsheetApp === 'undefined') return score;
  hxEnsureResearchLibrary_();
  const context = hxResearchContextForScore_(score, now || new Date());
  if (!context || context.status === 'UNKNOWN') return score;
  const original = Number(score.confidence || 0);
  const adjusted = hxClamp_(Math.round(original + (100-original)*context.positiveWeight - original*context.negativeWeight), 0, 100);
  score.confidence = adjusted;
  score.researchContext = context;
  const reliability = hxReliability_(score.confidence, (score.strongestDrivers || []).length, score.coverage || 0);
  score.reliability = reliability.label;
  score.evidenceStatus = reliability.status;
  if (score.explanationTrace) {
    score.explanationTrace.researchContext = context;
    score.explanationTrace.liveConfidence = original;
    score.explanationTrace.researchAdjustedConfidence = adjusted;
  }
  (context.contradictions || []).forEach(note=>{
    (score.contradictions = score.contradictions || []).push({factor:note.factor, contribution:0, confidence:note.confidence, source:'Harmonexus Research Library', quality:'historical-context', driver:note.message});
  });
  score.contradictions = (score.contradictions || []).slice(0,3);
  return score;
}

function hxResearchContextForScore_(score, now) {
  const instrument = String(score.instrument || score.Instrument || '').toUpperCase();
  if (!instrument) return {status:'UNKNOWN'};
  const seasonal = hxResearchRows_(RESEARCH_SHEET_NAMES.seasonal).filter(r=>String(r.Instrument).toUpperCase()===instrument && String(r.Supported).toLowerCase()==='true');
  const sessionRows = hxResearchRows_(RESEARCH_SHEET_NAMES.session).filter(r=>String(r.Instrument).toUpperCase()===instrument && String(r.Supported).toLowerCase()==='true');
  const hourlyRows = hxResearchRows_(RESEARCH_SHEET_NAMES.hourly).filter(r=>String(r.Instrument).toUpperCase()===instrument && String(r.Supported).toLowerCase()==='true');
  if (!seasonal.length && !sessionRows.length && !hourlyRows.length) return {status:'UNKNOWN', instrument:instrument};
  const month = Number(hxFormatET_(now, 'M'));
  const hour = Number(hxFormatET_(now, 'H'));
  const session = hxSessionFromHourET_(hour);
  const context = {status:'AVAILABLE', instrument:instrument, positiveWeight:0, negativeWeight:0, contradictions:[], drivers:[], activeMonth:month, activeHourET:hour, activeSession:session};
  seasonal.forEach(r=>{
    const weight = hxResearchWeight_(r['Research Confidence'], 'confidence');
    if (Number(r['Best Month']) === month) hxResearchApplyDirectional_(context, score, 'Bullish', weight, 'Seasonality', r['Best Month Name']+' is the researched favorable month.');
    if (Number(r['Worst Month']) === month) hxResearchApplyDirectional_(context, score, 'Bearish', weight, 'Seasonality', r['Worst Month Name']+' is the researched adverse month.');
    if (Number(r['Reversal After 3 Probability'] || 0) >= .55) context.drivers.push('Reversal-after-three tendency '+hxPct_(r['Reversal After 3 Probability']));
    if (Number(r['Weekly First Day Continuation Probability'] || 0) >= .6) context.drivers.push('Weekly first-day continuation '+hxPct_(r['Weekly First Day Continuation Probability']));
  });
  sessionRows.forEach(r=>{
    if (String(r['Session Preference']) === session) {
      context.positiveWeight += hxResearchWeight_(r['Research Confidence'], 'confidence') * .35;
      context.drivers.push(session+' session aligns with researched range preference.');
    }
    if (Number(r['NY Reverses London Probability'] || 0) >= .515) context.drivers.push('London-to-New-York reversal watch '+hxPct_(r['NY Reverses London Probability']));
  });
  hourlyRows.forEach(r=>{
    if (Number(r['Most Volatile Hour ET']) === hour) {
      context.positiveWeight += hxResearchWeight_(r['Research Confidence'], 'confidence') * .2;
      context.drivers.push('Current hour matches researched volatility window.');
    }
  });
  context.positiveWeight = Math.min(.20, context.positiveWeight);
  context.negativeWeight = Math.min(.12, context.negativeWeight);
  context.drivers = context.drivers.slice(0,5);
  return context;
}

function hxResearchApplyDirectional_(context, score, tendency, weight, factor, message) {
  const live = String(score.label || score.Direction || 'Neutral');
  if (live === tendency) {
    context.positiveWeight += weight;
    context.drivers.push(message);
  } else if (live !== 'Neutral') {
    context.negativeWeight += weight * .5;
    context.contradictions.push({factor:factor, confidence:Math.round(weight*100), message:message+' Live evidence remains '+live.toLowerCase()+'.'});
  }
}

function hxResearchRows_(sheetName) {
  const sh = SpreadsheetApp.getActive().getSheetByName(sheetName);
  return sh && sh.getLastRow() > 1 ? hxRowsAsObjects_(sh) : [];
}

function hxResearchWeight_(confidence, target) {
  const weights = (typeof RESEARCH_LIBRARY !== 'undefined' && RESEARCH_LIBRARY.confidence_weights && RESEARCH_LIBRARY.confidence_weights.weights_by_confidence) || {};
  const key = String(confidence || 'Low');
  const row = weights[key] || weights.Moderate || {};
  return Number(row[target || 'confidence'] || 0);
}

function hxFormatET_(date, pattern) {
  if (typeof Utilities !== 'undefined' && Utilities.formatDate) return Utilities.formatDate(date, 'America/New_York', pattern);
  return pattern === 'M' ? String(date.getUTCMonth()+1) : String(date.getUTCHours());
}

function hxSessionFromHourET_(hour) {
  if (hour >= 18 || hour < 3) return 'Asian';
  if (hour >= 3 && hour < 8) return 'London';
  if (hour >= 8 && hour < 17) return 'New_York';
  return 'Off_Hours';
}

function validateResearchLibrary() {
  hxEnsureResearchLibrary_();
  const map = hxResearchRows_(RESEARCH_SHEET_NAMES.map);
  const supported = map.filter(r=>String(r.Supported).toLowerCase()==='true');
  const instruments = {};
  supported.forEach(r=>{ instruments[String(r.Instrument)] = true; });
  const duplicates = {};
  [RESEARCH_SHEET_NAMES.map,RESEARCH_SHEET_NAMES.probabilities,RESEARCH_SHEET_NAMES.discoveries].forEach(sheetName=>{
    const seen = {};
    hxResearchRows_(sheetName).forEach(r=>{
      const key = hxJson_(r);
      seen[key] = (seen[key] || 0) + 1;
    });
    duplicates[sheetName] = Object.keys(seen).filter(k=>seen[k]>1).length;
  });
  const missing = Object.keys(INSTRUMENTS).filter(id=>!instruments[id]);
  return {
    packageVersion: RESEARCH_LIBRARY.package_version,
    supportedSymbols: supported.length,
    engineInstruments: Object.keys(instruments).length,
    missingEngineInstruments: missing,
    unsupportedSymbols: map.filter(r=>String(r.Supported).toLowerCase()!=='true').map(r=>r['Research Symbol']),
    duplicateRecords: duplicates,
    status: missing.length || Object.keys(duplicates).some(k=>duplicates[k]>0) ? 'REVIEW' : 'PASS'
  };
}
