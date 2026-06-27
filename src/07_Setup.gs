function setupHarmonexus() {
  const schemas = {};
  schemas[HX.sheets.normalized] = ['As Of','Instrument','Metric','Value','Unit','Source','Pulled At','Quality'];
  schemas[HX.sheets.signals] = SIGNAL_HEADERS;
  schemas[HX.sheets.signalHistory] = SIGNAL_HEADERS;
  schemas[HX.sheets.scores] = ['As Of','Instrument','Name','Family','Direction','Strength','Raw Strength','Directional Score','Confidence','Reliability','Evidence Status','Strongest Drivers','Contradictions','Prior Direction','Prior Strength','Score Change','Material Change','Explanation Trace','Regime','Regime Age (Trading Days)','Primary Drivers','Seasonal Watch'];
  schemas[HX.sheets.snapshots] = schemas[HX.sheets.scores];
  schemas[HX.sheets.calibration] = ['As Of','Instrument','Direction','Raw Strength','Calibrated Strength','Confidence','Reliability','Evidence Status','Coverage','Score Change','Material Change'];
  schemas[HX.sheets.ai] = ['Timestamp','Instrument','Model','Mode','Direction','Strength','Input Evidence','Output'];
  schemas[HX.sheets.notifications] = ['Timestamp','Instrument','Machine Reading','Conviction','Alert Type','Message','Delivery Status','Notes'];
  schemas[HX.sheets.systemLog] = ['Timestamp','Level','Operation','Status','Message','Context JSON','Version'];
  schemas.Relationship_Cache = ['Timestamp','Macro Consensus Score','Macro Confidence','Lead-Lag Confidence','Payload JSON'];
  schemas.Deployment_Status = ['Check','Configured','Required For','Next Action','Last Checked'];
  Object.keys(schemas).forEach(name => hxSheet_(name, schemas[name]));
  if (typeof installResearchLibrary === 'function') installResearchLibrary();
  const registry = hxSheet_('Instrument_Registry', ['Instrument','Name','Family','CFTC Proxy','Weights JSON','Active']);
  if (registry.getLastRow() === 1) {
    hxAppendRows_(registry, Object.keys(INSTRUMENTS).map(id => [id,INSTRUMENTS[id].name,INSTRUMENTS[id].family,INSTRUMENTS[id].cftcKey || '',hxJson_(INSTRUMENTS[id].weights),true]));
  }
  refreshDeploymentStatus();
  return {version:HX.version,instruments:Object.keys(INSTRUMENTS).length,sheets:Object.keys(schemas)};
}

function refreshDeploymentStatus() {
  const p=hxProps_(), checks=[
    ['Webhook secret',Boolean(p.getProperty('WEBHOOK_SECRET')),'TradingView webhooks','Set WEBHOOK_SECRET in Script Properties.'],
    ['Telegram',Boolean(p.getProperty('TELEGRAM_BOT_TOKEN')&&p.getProperty('TELEGRAM_CHAT_ID')),'Telegram alerts','Set bot token and chat ID, or use Pushover.'],
    ['Pushover',Boolean(p.getProperty('PUSHOVER_APP_TOKEN')&&p.getProperty('PUSHOVER_USER_KEY')),'Pushover alerts','Set app token and user key, or use Telegram.'],
    ['Email recipients',Boolean(p.getProperty('ALERT_EMAIL')),'Email and text-to-email delivery','Set ALERT_EMAIL as one or more comma-separated recipients if desired.'],
    ['OpenAI',Boolean(p.getProperty('OPENAI_API_KEY')),'AI interpretation','Set OPENAI_API_KEY or retain deterministic fallback.'],
    ['Push channel',Boolean((p.getProperty('TELEGRAM_BOT_TOKEN')&&p.getProperty('TELEGRAM_CHAT_ID'))||(p.getProperty('PUSHOVER_APP_TOKEN')&&p.getProperty('PUSHOVER_USER_KEY'))),'Daily phone briefing','Configure Telegram or Pushover.']
  ];
  const sh=hxSheet_('Deployment_Status');
  hxAtomicReplace_(sh,['Check','Configured','Required For','Next Action','Last Checked'],checks.map(r=>r.concat([new Date()])));
  return checks;
}

function validateHarmonexusInstallation() {
  const ss=SpreadsheetApp.getActive();
  const expected={};
  expected[HX.sheets.rawFRED]=['Date','REAL10Y','US2Y','US5Y','US10Y','US30Y','Source','Pulled At'];
  expected[HX.sheets.rawCFTC]=['Report Date','Instrument','Open Interest','Commercial Long','Commercial Short','Managed Money Long','Managed Money Short','Pulled At','Report Type','Market'];
  expected[HX.sheets.normalized]=['As Of','Instrument','Metric','Value','Unit','Source','Pulled At','Quality'];
  expected[HX.sheets.signals]=SIGNAL_HEADERS;
  expected[HX.sheets.scores]=['As Of','Instrument','Name','Family','Direction','Strength','Directional Score','Confidence'];
  expected.Research_Metadata=['Key','Value'];
  expected.Research_Instrument_Map=['Research Symbol','Instrument','Supported','Source Batch'];
  expected.Research_Seasonal=['Instrument','Research Symbol','Best Month','Worst Month','Research Confidence'];
  expected.Research_Probabilities=['Instrument','Research Symbol','Category','Finding','Probability','Confidence'];
  expected.Relationship_Cache=['Timestamp','Macro Consensus Score','Macro Confidence','Lead-Lag Confidence','Payload JSON'];
  const results=[];
  Object.keys(expected).forEach(name=>{
    const sh=ss.getSheetByName(name);
    if (!sh) { results.push({sheet:name,status:'MISSING',details:'Run setupHarmonexus().'}); return; }
    const actual=sh.getRange(1,1,1,Math.max(sh.getLastColumn(),1)).getDisplayValues()[0];
    const missing=expected[name].filter(h=>actual.indexOf(h)<0);
    results.push({sheet:name,status:missing.length?'REVIEW':'PASS',details:missing.length?'Missing: '+missing.join(', '):'Required headers present.'});
  });
  ['Dashboard','Signal_Engine','Machine_Input','Briefing'].forEach(name=>results.push({sheet:name,status:ss.getSheetByName(name)?'PASS':'REVIEW',details:'Legacy compatibility sheet.'}));
  if (typeof validateResearchLibrary === 'function') {
    const researchValidation = validateResearchLibrary();
    results.push({sheet:'Research Library',status:researchValidation.status,details:hxJson_(researchValidation)});
  }
  hxLog_('INFO','validateHarmonexusInstallation','COMPLETE','Installation validation completed.',results);
  return results;
}

function runParallelComparison() {
  const ss=SpreadsheetApp.getActive(), legacy=ss.getSheetByName('Signal_Engine'), current=ss.getSheetByName(HX.sheets.scores);
  if (!legacy || !current) throw new Error('Signal_Engine and Instrument_Scores are required.');
  const oldMap={}, newMap={};
  hxRowsAsObjects_(legacy).forEach(r=>oldMap[String(r.Asset).toUpperCase()]=r);
  hxRowsAsObjects_(current).forEach(r=>newMap[String(r.Instrument).toUpperCase()]=r);
  const rows=['XAGUSD','US30','SPX500','NAS100'].map(id=>{
    const old=oldMap[id]||{}, now=newMap[id]||{};
    const oldDirection=String(old['Final Machine Reading']||old['Machine Bias']||'Missing');
    const newDirection=String(now.Direction||'Missing');
    const oldCanonical=oldDirection.toLowerCase().indexOf('bull')>=0?'Bullish':oldDirection.toLowerCase().indexOf('bear')>=0?'Bearish':'Neutral';
    return [new Date(),id,oldDirection,old['Final Bullish %']||old['Weighted Bullish %']||'',old['Final Bearish %']||old['Weighted Bearish %']||'',newDirection,now.Strength||'',now.Confidence||'',oldCanonical===newDirection,'Review disagreements as methodology/calibration questions.'];
  });
  hxAtomicReplace_(hxSheet_('V4_V5_Comparison'),['Timestamp','Instrument','v4.7 Direction','v4.7 Bullish %','v4.7 Bearish %','v5 Direction','v5 Strength','v5 Confidence','Direction Match','Notes'],rows);
  return rows;
}

function disableHarmonexusTriggers() {
  const managed=['refreshFRED','refreshCFTC','calculateAllScores','sendDailyBriefing'];
  let removed=0;
  ScriptApp.getProjectTriggers().forEach(t=>{ if (managed.indexOf(t.getHandlerFunction())>=0) { ScriptApp.deleteTrigger(t); removed++; } });
  hxLog_('WARN','disableHarmonexusTriggers','COMPLETE','Managed triggers disabled.',{removed:removed});
  return removed;
}

function validatePropertyMap_(properties) {
  const missing=[];
  if (!properties.WEBHOOK_SECRET) missing.push('WEBHOOK_SECRET');
  if (!(properties.TELEGRAM_BOT_TOKEN&&properties.TELEGRAM_CHAT_ID) && !(properties.PUSHOVER_APP_TOKEN&&properties.PUSHOVER_USER_KEY)) missing.push('TELEGRAM_* or PUSHOVER_*');
  return {ready:missing.length===0,missing:missing};
}
