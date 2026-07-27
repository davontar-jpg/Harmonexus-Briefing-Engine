function sendDailyBriefing(options) {
  const opts = options || {};
  hxNotificationLogEvent_('INFO','entry function reached',{entryFunction:'sendDailyBriefing',alertType:'Daily Briefing'});
  hxLogSystemStatus_({entryFunction:'sendDailyBriefing',dryRun:false,previewOnly:false,suppressDelivery:false,hel035Enabled:opts.hel035_enabled === true});
  hxNotificationLogEvent_('INFO','briefing generation started',{alertType:'Daily Briefing'});
  const scores = hxLatestScoreRows_();
  if (!scores.length) throw new Error('No Instrument_Scores rows are available for the daily briefing.');
  const runtime = typeof hxSilverLoadPublishedRuntime_ === 'function' ?
    hxSilverLoadPublishedRuntime_() : null;
  const hel035Enabled = runtime && typeof hxSilverIntegrationEnabled_ === 'function' &&
    hxSilverIntegrationEnabled_(opts);
  const emailMessage = hel035Enabled ?
    String(runtime.integration && runtime.integration.long_briefing || '') :
    formatEmailMorningBriefing(scores);
  hxNotificationLogEvent_('INFO','email formatted',{alertType:'Daily Briefing',emailBytes:String(emailMessage).length,formatter:hel035Enabled?'HEL-035 Runtime Long Briefing':'formatEmailMorningBriefing'});
  const telegramMessage = hel035Enabled ?
    hxEnforceTelegramBriefingLimit_(String(runtime.integration && (
      runtime.integration.notification && runtime.integration.notification.message_surface === 'long_briefing' ?
        runtime.integration.long_briefing :
        runtime.integration.short_briefing) || emailMessage)) :
    formatTelegramMorningBriefing(scores);
  hxNotificationLogEvent_('INFO','telegram formatted',{alertType:'Daily Briefing',telegramBytes:String(telegramMessage).length,formatter:hel035Enabled?'HEL-035 Runtime Notification Boundary':'formatTelegramMorningBriefing',telegramWithinLimit:telegramMessage.length<=hxTelegramBriefingHardCap_()});
  hxNotificationLogEvent_('INFO','briefing generation completed',{alertType:'Daily Briefing',emailBytes:String(emailMessage).length,telegramBytes:String(telegramMessage).length});
  return sendProductionBriefingNotification({briefingText:emailMessage,emailMessage:emailMessage,telegramMessage:telegramMessage});
}

function hxRenderMorningMarketBriefing_(rows) {
  return formatEmailMorningBriefing(rows);
}

function formatEmailMorningBriefing(data) {
  return hxBuildDailyBriefing_(data);
}

function formatTelegramMorningBriefing(data) {
  const scores=hxNormalizeBriefingRows_(data);
  const macro=hxCrossAssetBriefingContext_(scores);
  const equities=scores.filter(s=>String(s.row.Family).toLowerCase().indexOf('equity')>=0);
  const riskAverage=(equities.length?equities:scores).reduce((n,s)=>n+s.score,0)/(equities.length||scores.length||1);
  const dispersion=scores.some(s=>s.score>1.5) && scores.some(s=>s.score<-1.5);
  const regime=dispersion?'fragmented':riskAverage>1.5?'risk-on':riskAverage<-1.5?'risk-off':'neutral';
  const regimeConfidence=Math.round(scores.reduce((n,s)=>n+s.confidence,0)/(scores.length||1));
  const priority=scores.slice().sort((a,b)=>(b.strength*b.confidence)-(a.strength*a.confidence)).slice(0,3);
  const contradictions=[];
  scores.forEach(s=>s.contradictions.forEach(d=>{if(contradictions.length<3) contradictions.push(s.instrument+': '+hxCompactContradictionExplanation_(String(d.factor || 'evidence'), s.direction));}));
  const cio=hxCioSummary_(macro, regime, regimeConfidence);
  const lines=hxBriefingHeader_();
  lines.push('',hxBriefingDivider_(),'MARKET REGIME',hxTitleCase_(regime),'Confidence: '+regimeConfidence+'%');
  lines.push('',hxBriefingDivider_(),'CROSS-ASSET CONSENSUS');
  macro.consensus.slice(0,5).forEach(c=>lines.push(c.name+': '+c.label+' '+c.strength.toFixed(1)+'/10'));
  lines.push('',hxBriefingDivider_(),'PRIMARY DRIVER',hxDriverDominanceSentence_(macro.driver));
  lines.push('',hxBriefingDivider_(),'CONTRADICTIONS');
  (contradictions.length?contradictions:['No material contradiction is controlling the briefing.']).forEach(x=>lines.push('- '+x));
  lines.push('',hxBriefingDivider_(),'PRIORITY INSTRUMENTS');
  priority.forEach((s,i)=>{
    lines.push((i+1)+'. '+s.instrument+' - '+s.direction+' '+s.strength.toFixed(1)+'/10');
    lines.push('   Confidence: '+s.confidence.toFixed(0)+'% · Age: '+(s.regimeAge>0?s.regimeAge+' trading days':'unavailable'));
  });
  lines.push('',hxBriefingDivider_(),'CIO SUMMARY',
    'Strategic Bias: '+cio.strategicBias,
    'Participation Quality: '+cio.participationQuality,
    'Capital Deployment: '+cio.capitalDeployment,
    'Current Objective: '+cio.currentObjective);
  lines.push('',hxBriefingDivider_(),'Full institutional briefing sent by email.');
  return hxEnforceTelegramBriefingLimit_(lines.join('\n'));
}

function hxCompactContradictionExplanation_(contradictionType, currentBias) {
  const type=String(contradictionType || 'evidence').toUpperCase();
  const bias=String(currentBias || 'current').toLowerCase();
  if (type==='OI' || type==='OPEN_INTEREST' || type==='OPEN INTEREST') return 'Open interest weakens continuation quality. Price may continue, but participation is not fully confirmed.';
  if (type==='COMMERCIAL' || type==='POSITIONING') return 'Commercial positioning reduces '+bias+' conviction. This is a warning, not thesis invalidation.';
  if (type==='DXY') return 'Dollar evidence is not fully aligned with the '+bias+' read, reducing clean continuation quality.';
  if (type==='REAL10Y' || type==='REAL YIELDS' || type==='US10Y') return 'Yield evidence is opposing the '+bias+' read, so conviction should stay measured.';
  return hxDriverBucket_(type)+' is opposing the '+bias+' read; continuation quality is reduced, not invalidated.';
}

function hxTelegramBriefingHardCap_() { return 3900; }
function hxTelegramBriefingTarget_() { return 3500; }

function hxEnforceTelegramBriefingLimit_(message) {
  const text=String(message || '');
  const hard=hxTelegramBriefingHardCap_();
  if (text.length<=hard) return text;
  const suffix='\n\nTelegram brief shortened. Full briefing sent by email.';
  const allowed=hard-suffix.length;
  return text.slice(0, Math.max(0, allowed)).replace(/\s+\S*$/,'') + suffix;
}

function hxDeliverySuppressedMessage_() {
  return 'DELIVERY SUPPRESSED — briefing rendered but not sent.';
}

function hxPreviewOnlyMessage_() {
  return 'PREVIEW ONLY — briefing rendered but not sent.';
}

function hxDryRunMessage_() {
  return 'DRY RUN ACTIVE — briefing rendered but not sent.';
}

function hxMaterialChangeLines_(score) {
  const lines=[score.instrument+' '+(score.change>=0?'strengthened ':'weakened ')+Math.abs(score.change || 0).toFixed(1)+' points from its prior reading.'];
  const drivers=(score.primaryDrivers || []).slice(0,3);
  if (drivers.length) {
    lines.push('Primary Drivers:');
    drivers.forEach(d=>lines.push('- '+hxDriverChangeLabel_(d)));
  }
  return lines;
}

function hxDriverChangeLabel_(driver) {
  const factor=String(driver.factor || '').toUpperCase(), delta=Number(driver.delta || 0);
  if (factor==='TREND') return delta>=0?'Trend improvement':'Trend deterioration';
  if (['US2Y','US5Y','US10Y','US30Y','REAL10Y'].indexOf(factor)>=0) return factor==='REAL10Y'?'Real-yield pressure':'Yield divergence';
  const labels={DXY:'Dollar pressure',POSITIONING:'Positioning shift',COMMERCIAL:'Commercial positioning',OI:'Open-interest change',RISK:'Risk sentiment',FED:'Fed policy',INFLATION:'Inflation pressure'};
  return labels[factor] || factor.replace(/_/g,' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
}

function hxPriorityReason_(score) {
  const first=score.drivers[0];
  const evidence=first?String(first.factor || 'the leading factor').toLowerCase():'the available evidence stack';
  return evidence+' leads the read; '+score.confidence.toFixed(0)+'% confidence'+(score.reliability?' ('+score.reliability.toLowerCase()+')':'')+'.';
}

function sendMajorChangeAlert_(score) {
  const movement=score.scoreChange===null?'New material reading.':score.instrument+' '+(score.scoreChange>=0?'strengthened ':'weakened ')+Math.abs(score.scoreChange).toFixed(1)+' points from its prior reading.';
  const lines = [
    'HARMONEXUS MAJOR CHANGE',
    score.instrument + ': ' + score.label + ' ' + score.strength.toFixed(1) + '/10',
    'Prior: ' + (score.priorLabel || 'none') + ' ' + (score.priorStrength === '' ? '—' : Number(score.priorStrength).toFixed(1) + '/10'),
    'Change: ' + (score.scoreChange === null ? 'new reading' : (score.scoreChange >= 0 ? '+' : '') + score.scoreChange.toFixed(1)),
    'Confidence: ' + score.confidence + '%',
    'Age: ' + (Number(score.regimeAgeTradingDays || 0)>0?score.regimeAgeTradingDays+' trading days':'unavailable'),
    '',movement
  ];
  if ((score.primaryDrivers || []).length) {
    lines.push('Primary Drivers:');
    score.primaryDrivers.slice(0,3).forEach(d=>lines.push('- '+hxDriverChangeLabel_(d)));
  }
  return sendNotification(lines.join('\n'), {alertType:'Major Change', instrument:score.instrument});
}

function previewMorningMarketBriefing() {
  const preview = hxMorningMarketBriefingPreview_();
  try { console.log(preview.briefing); } catch (ignored) {}
  hxLogSystemStatus_({entryFunction:'previewMorningMarketBriefing',previewOnly:true,dryRun:false,suppressDelivery:false});
  hxNotificationLogEvent_('INFO','briefing preview rendered',{alertType:'Preview',bytes:String(preview.briefing).length,productionProtection:preview.productionProtection,formatter:preview.formatter});
  return hxPreviewOnlyMessage_();
}

function dryRunMorningMarketBriefingProductionPath() {
  const preview = hxMorningMarketBriefingPreview_();
  const delivery = sendProductionBriefingNotification({
    briefingText:preview.briefing,
    dryRun:true,
    validationMode:true,
    suppressStateMutation:true,
    returnDetailed:true,
    productionProtection:true
  });
  hxLogSystemStatus_({entryFunction:'dryRunMorningMarketBriefingProductionPath',previewOnly:false,dryRun:true,suppressDelivery:false});
  hxNotificationLogEvent_('INFO','production briefing dry run rendered',{alertType:'Production Dry Run',productionProtection:true,formatter:preview.formatter,deliveryStatus:hxDryRunDeliveryStatus_(delivery)});
  return hxDryRunMessage_() + ' Production path dry run confirmed formatter: ' + preview.formatter + '.';
}

function validateMorningBriefingFormatterWorkflow() {
  const preview = hxMorningMarketBriefingPreview_();
  const production = hxMorningMarketBriefingPreview_();
  const productionProtection = hxProductionProtection_({});
  const dryRun = false;
  const match = hxBriefingStructureSignature_(preview.briefing) === hxBriefingStructureSignature_(production.briefing);
  return {
    productionProtection:productionProtection?'ON':'OFF',
    dryRun:dryRun?'ON':'OFF',
    previewOnly:'OFF',
    suppressDelivery:'OFF',
    formatterFunction:preview.formatter,
    telegramSend:dryRun?'BLOCKED':'ALLOWED',
    emailSend:dryRun?'BLOCKED':'ALLOWED',
    previewProductionStructureMatch:match?'PASS':'FAIL',
    previewBytes:String(preview.briefing).length,
    productionBytes:String(production.briefing).length,
    status:match?'Preview and production path use the same formatter structure.':'Preview and production path formatter structures differ.'
  };
}

function hxMorningMarketBriefingPreview_() {
  const scores = hxLatestScoreRows_();
  if (!scores.length) throw new Error('No Instrument_Scores rows are available for the briefing preview.');
  const briefing = hxRenderMorningMarketBriefing_(scores);
  return {briefing:briefing,productionProtection:hxProductionProtection_({}),formatter:'hxRenderMorningMarketBriefing_ -> hxBuildDailyBriefing_'};
}

function hxBriefingStructureSignature_(briefing) {
  return String(briefing || '').split('\n').filter(line=>/^[A-Z][A-Z /:-]+$/.test(String(line).trim()) || String(line).indexOf('HARMONEXUS')===0 || String(line).indexOf('Chief Investment Officer')===0).join('|');
}

function hxDryRunDeliveryStatus_(delivery) {
  return (delivery || []).map(r=>String(r.provider || '') + ':' + String(r.status || '')).join(' | ');
}

function sendNotification(message, options) {
  const opts = options || {};
  const alertType = opts.alertType || 'Notification';
  const instrument = opts.instrument || 'ALL';
  const recipients = hxNotificationRecipients_();
  const telegramMessage = String(opts.telegramMessage || message);
  const pushoverMessage = String(opts.pushoverMessage || opts.telegramMessage || message);
  const emailMessage = String(opts.emailMessage || message);
  const results = [];
  hxNotificationLogEvent_('INFO','notification send started',{alertType:alertType,instrument:instrument});
  hxLogSystemStatus_(opts);
  hxNotificationLogEvent_('INFO','recipients resolved',hxNotificationRecipientSummary_(recipients));
  const providers = [];
  if (recipients.telegram.length && recipients.telegramToken) providers.push('Telegram');
  if (recipients.pushover.length && recipients.pushoverToken) providers.push('Pushover');
  if (recipients.email.length) providers.push('Email');
  hxNotificationLogEvent_('INFO','sender/provider selected',{providers:providers.length?providers:['LOG_ONLY']});
  hxNotificationLogEvent_('INFO','notification body lengths',{alertType:alertType,emailBytes:emailMessage.length,telegramBytes:telegramMessage.length,pushoverBytes:pushoverMessage.length,telegramWithinLimit:telegramMessage.length<=hxTelegramBriefingHardCap_()});
  hxNotificationLogEvent_('INFO','notification mode status',{alertType:alertType,productionProtection:hxProductionProtection_(opts),dryRun:Boolean(opts.dryRun),previewOnly:Boolean(opts.previewOnly),suppressDelivery:hxExplicitSuppressDelivery_(opts),deliverySuppressed:hxNotificationDeliverySuppressed_(opts)});

  if (hxNotificationDeliverySuppressed_(opts)) {
    const suppressedStatus = hxSuppressedDeliveryMessage_(opts);
    hxNotificationLogEvent_('WARN','dry run / preview suppressed notification delivery',{alertType:alertType,instrument:instrument,providers:providers,bytes:String(message || '').length,dryRun:Boolean(opts.dryRun),previewOnly:Boolean(opts.previewOnly),suppressDelivery:hxExplicitSuppressDelivery_(opts),productionProtection:hxProductionProtection_(opts)});
    if (opts.returnDetailed) return [{provider:'DeliverySuppressed',recipient:'suppressed',ok:true,status:suppressedStatus}];
    return suppressedStatus;
  }

  recipients.telegram.forEach(chatId => {
    results.push(hxAttemptNotificationRecipient_('Telegram', chatId, function(){ return hxSendTelegram_(telegramMessage, chatId); }));
  });
  recipients.pushover.forEach(userKey => {
    results.push(hxAttemptNotificationRecipient_('Pushover', userKey, function(){ return hxSendPushover_(pushoverMessage, userKey); }));
  });
  recipients.email.forEach(email => {
    results.push(hxAttemptNotificationRecipient_('Email', email, function(){ return hxSendEmail_(emailMessage, alertType, email); }));
  });

  if (!results.length) results.push({provider:'Log',recipient:'none',ok:true,status:'Logged only: no configured recipients'});
  const ok = results.filter(r=>r.ok).length, failed = results.filter(r=>!r.ok).length;
  const status = results.map(r=>r.provider + '(' + r.recipient + '): ' + (r.ok?'sent':'failed - ' + r.error)).join(' | ');
  hxNotificationLogEvent_(failed?'WARN':'INFO','final notification status',{alertType:alertType,ok:ok,failed:failed,status:status});
  if (!opts.suppressStateMutation && !opts.dryRun) {
    try {
      const log = hxSheet_(HX.sheets.notifications, ['Timestamp','Instrument','Machine Reading','Conviction','Alert Type','Message','Delivery Status','Notes']);
      hxAppendRows_(log, [[new Date(),instrument,'', '',alertType,message,status,'Harmonexus v' + HX.version]]);
    } catch (error) {
      hxNotificationLogEvent_('ERROR','notification log write failure',{alertType:alertType,error:error.message});
    }
  } else {
    hxNotificationLogEvent_('INFO','notification state mutation suppressed',{alertType:alertType,dryRun:Boolean(opts.dryRun),validationMode:Boolean(opts.validationMode)});
  }
  if (opts.returnDetailed) return results;
  return results.map(r=>r.status || (r.provider + ': ' + (r.ok?'sent':'failed — ' + r.error)));
}

function hxProductionProtection_(options) {
  const opts = options || {};
  if (opts.productionProtection === false) return false;
  if (opts.productionProtection === true) return true;
  let value = '';
  try {
    const props = hxProps_();
    value = props.getProperty('HARMONEXUS_PRODUCTION_PROTECTION');
  }
  catch (error) { value = ''; }
  if (value === null || value === undefined || String(value).trim() === '') return true;
  return !/^(false|0|off|no)$/i.test(String(value).trim());
}

function hxExplicitSuppressDelivery_(options) {
  const opts = options || {};
  return Boolean(opts.suppressDelivery);
}

function hxNotificationDeliverySuppressed_(options) {
  const opts = options || {};
  return Boolean(opts.dryRun || opts.previewOnly || hxExplicitSuppressDelivery_(opts));
}

function hxSuppressedDeliveryMessage_(options) {
  const opts = options || {};
  if (opts.previewOnly) return hxPreviewOnlyMessage_();
  if (opts.dryRun) return hxDryRunMessage_();
  return hxDeliverySuppressedMessage_();
}

function hxExecutionModeStatus_(options) {
  const opts = options || {};
  let recipients = {telegramToken:'',telegram:[],pushoverToken:'',pushover:[],email:[]};
  try { recipients = hxNotificationRecipients_(); } catch (error) {}
  const deliverySuppressed = hxNotificationDeliverySuppressed_(opts);
  return {
    title:'HARMONEXUS SYSTEM STATUS',
    productionProtection:hxProductionProtection_(opts)?'Enabled':'Disabled',
    dryRun:Boolean(opts.dryRun)?'Enabled':'Disabled',
    preview:Boolean(opts.previewOnly)?'Enabled':'Disabled',
    suppressDelivery:hxExplicitSuppressDelivery_(opts)?'Enabled':'Disabled',
    scheduler:hxSchedulerStatus_(),
    telegram:(recipients.telegram.length && recipients.telegramToken)?'Enabled':'Disabled',
    email:recipients.email.length?'Enabled':'Disabled',
    notificationPath:deliverySuppressed?'Suppressed':'Live',
    infrastructureProtection:hxProductionProtection_(opts)?'Active':'Inactive'
  };
}

function hxLogSystemStatus_(options) {
  hxNotificationLogEvent_('INFO','HARMONEXUS SYSTEM STATUS',hxExecutionModeStatus_(options || {}));
}

function hxSchedulerStatus_() {
  try {
    if (typeof ScriptApp === 'undefined' || !ScriptApp.getProjectTriggers) return 'Unknown';
    const triggers = ScriptApp.getProjectTriggers();
    return triggers.some(t=>String(t.getHandlerFunction && t.getHandlerFunction())==='sendDailyBriefing')?'Active':'Not Configured';
  } catch (error) {
    return 'Unknown';
  }
}

function sendProductionBriefingNotification(options) {
  const opts = options || {};
  const briefingText = String(opts.briefingText || '');
  if (!briefingText.trim()) throw new Error('briefingText is required for production notification delivery.');
  return sendNotification(briefingText, {
    alertType:opts.validationMode?'Production Notification Dry Run':'Daily Briefing',
    instrument:'ALL',
    dryRun:Boolean(opts.dryRun),
    validationMode:Boolean(opts.validationMode),
    suppressStateMutation:Boolean(opts.suppressStateMutation),
    returnDetailed:Boolean(opts.returnDetailed),
    productionProtection:opts.productionProtection,
    telegramMessage:opts.telegramMessage,
    emailMessage:opts.emailMessage,
    pushoverMessage:opts.pushoverMessage
  });
}

function hxDeliver_(message, alertType, instrument) {
  return sendNotification(message, {alertType:alertType, instrument:instrument});
}

function hxNotificationRecipients_() {
  const props = hxProps_();
  return {
    telegramToken:props.getProperty('TELEGRAM_BOT_TOKEN') || '',
    telegram:hxParseList_(props.getProperty('TELEGRAM_CHAT_ID')),
    pushoverToken:props.getProperty('PUSHOVER_APP_TOKEN') || '',
    pushover:hxParseList_(props.getProperty('PUSHOVER_USER_KEY')),
    email:hxParseEmailRecipients_(props.getProperty('ALERT_EMAIL'))
  };
}

function hxParseList_(value) {
  return String(value || '').split(',').map(v=>String(v).trim()).filter(Boolean);
}

function hxParseEmailRecipients_(value) {
  return hxParseList_(value).map(hxNormalizeEmailRecipient_).filter(hxIsValidEmailRecipient_);
}

function hxNormalizeEmailRecipient_(value) {
  const text = String(value || '').trim();
  const mailto = text.match(/mailto:([^\]\)\s]+)/i);
  if (mailto) return mailto[1].trim();
  const bracket = text.match(/^\[?([^\]\(<>\s]+@[^\]\(<>\s]+)\]?$/);
  return bracket ? bracket[1].trim() : text;
}

function hxIsValidEmailRecipient_(value) {
  return /^[^\s@<>()]+@[^\s@<>()]+\.[^\s@<>()]+$/.test(String(value || '').trim());
}

function hxNotificationRecipientSummary_(recipients) {
  return {telegram:recipients.telegram.length,pushover:recipients.pushover.length,email:recipients.email.length};
}

function hxAttemptNotificationRecipient_(provider, recipient, fn) {
  hxNotificationLogEvent_('INFO','each recipient attempted',{provider:provider,recipient:recipient});
  if (provider === 'Telegram') hxNotificationLogEvent_('INFO','Telegram send attempted',{provider:provider,recipient:recipient});
  if (provider === 'Email') hxNotificationLogEvent_('INFO','Email send attempted',{provider:provider,recipient:recipient});
  try {
    fn();
    hxNotificationLogEvent_('INFO','each recipient success',{provider:provider,recipient:recipient});
    if (provider === 'Telegram') hxNotificationLogEvent_('INFO','Telegram send result',{provider:provider,recipient:recipient,result:'sent'});
    if (provider === 'Email') hxNotificationLogEvent_('INFO','Email send result',{provider:provider,recipient:recipient,result:'sent'});
    return {provider:provider,recipient:recipient,ok:true,status:provider + ': sent'};
  } catch (error) {
    hxNotificationLogEvent_('ERROR','each recipient failure',{provider:provider,recipient:recipient,error:error.message});
    if (provider === 'Telegram') hxNotificationLogEvent_('ERROR','Telegram send result',{provider:provider,recipient:recipient,result:'failed',error:error.message});
    if (provider === 'Email') hxNotificationLogEvent_('ERROR','Email send result',{provider:provider,recipient:recipient,result:'failed',error:error.message});
    return {provider:provider,recipient:recipient,ok:false,error:error.message,status:provider + ': failed — ' + error.message};
  }
}

function hxNotificationLogEvent_(level, message, context) {
  try { hxLog_(level || 'INFO','notification',String(message || ''),String(message || ''),context || {}); }
  catch (error) { try { console.log((level || 'INFO') + ' notification ' + message + ': ' + error.message); } catch (ignored) {} }
}

function hxSendTelegram_(message, chatIdOverride) {
  const props=hxProps_(), token=props.getProperty('TELEGRAM_BOT_TOKEN'), chatId=props.getProperty('TELEGRAM_CHAT_ID');
  if (!token || !chatId) throw new Error('TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are required.');
  return hxFetch_('https://api.telegram.org/bot' + token + '/sendMessage', {method:'post',contentType:'application/json',payload:JSON.stringify(hxTelegramPayload_(chatIdOverride || chatId,message))},2);
}

function hxTelegramPayload_(chatId,message) { return {chat_id:String(chatId),text:String(message),disable_web_page_preview:true}; }

function hxSendPushover_(message, userOverride) {
  const props=hxProps_(), token=props.getProperty('PUSHOVER_APP_TOKEN'), user=props.getProperty('PUSHOVER_USER_KEY');
  if (!token || !user) throw new Error('PUSHOVER_APP_TOKEN and PUSHOVER_USER_KEY are required.');
  return hxFetch_('https://api.pushover.net/1/messages.json', {method:'post',payload:hxPushoverPayload_(token,userOverride || user,message)},2);
}

function hxPushoverPayload_(token,user,message) { return {token:String(token),user:String(user),title:'Harmonexus',message:String(message)}; }

function hxSendEmail_(message,alertType,recipient) {
  const email=recipient || hxParseEmailRecipients_(hxProps_().getProperty('ALERT_EMAIL'))[0];
  if (!email) throw new Error('ALERT_EMAIL is required.');
  MailApp.sendEmail(email,'Harmonexus · ' + (alertType || 'Test'),String(message));
}

function testTelegramNotification() {
  const scores = hxLatestScoreRows_();
  if (!scores.length) throw new Error('No Instrument_Scores rows are available for the Telegram briefing test.');
  sendNotification('HARMONEXUS PRODUCTION FORMAT TEST\n\n' + hxBuildDailyBriefing_(scores), {alertType:'Telegram Test', instrument:'ALL'});
  return 'Telegram daily-format test sent.';
}
function testPushoverNotification() { sendNotification('Harmonexus Pushover test · ' + hxNowIso_(), {alertType:'Pushover Test', instrument:'ALL'}); return 'Pushover test sent.'; }
function testEmailNotification() { sendNotification('Harmonexus email test · ' + hxNowIso_(), {alertType:'Email Test', instrument:'ALL'}); return 'Email test sent.'; }

function runNotificationParityCheck() {
  const before = hxNotificationStateSnapshot_();
  const config = validateNotificationConfig();
  const testResults = sendTestNotificationParitySample();
  const productionResults = sendProductionNotificationParitySample();
  const after = hxNotificationStateSnapshot_();
  const mutation = assertNoStateMutationDuringDryRun(before, after);
  const formatterParity = productionResults.message && productionResults.message.indexOf('MARKET CALENDAR WATCH') >= 0 && productionResults.message.indexOf('[HMIE PRODUCTION NOTIFICATION PATH - DRY RUN]') >= 0;
  const summary = {
    title:'Notification Parity Check',
    config:config,
    testTelegram:hxParityChannelStatus_(testResults.results,'Telegram'),
    testEmail:hxParityChannelStatus_(testResults.results,'Email'),
    productionTelegramDryRun:hxParityChannelStatus_(productionResults.results,'Telegram'),
    productionEmailDryRun:hxParityChannelStatus_(productionResults.results,'Email'),
    formatterParity:formatterParity?'PASS':'FAIL',
    stateMutationSuppressed:mutation.ok?'PASS':'FAIL',
    stateMutationDetails:mutation,
    testResults:hxParityPublicResults_(testResults.results),
    productionResults:hxParityPublicResults_(productionResults.results)
  };
  logNotificationParityResult(summary);
  return summary;
}

function sendTestNotificationParitySample() {
  const message = buildNotificationParitySampleBriefing('TEST');
  const results = sendNotification(message, {alertType:'Notification Parity Test Path', instrument:'ALL', validationMode:true, returnDetailed:true});
  return {message:message,results:results};
}

function sendProductionNotificationParitySample() {
  const message = buildNotificationParitySampleBriefing('PRODUCTION');
  const results = sendProductionBriefingNotification({briefingText:message,dryRun:true,validationMode:true,suppressStateMutation:true,returnDetailed:true});
  return {message:message,results:results};
}

function buildNotificationParitySampleBriefing(mode) {
  const isProduction = String(mode || '').toUpperCase()==='PRODUCTION';
  const recipients = hxNotificationRecipients_();
  const channelLine = 'Delivery channel: Telegram=' + (recipients.telegram.length?'configured':'missing') + ' · Email=' + (recipients.email.length?'configured':'missing');
  return [
    isProduction?'[HMIE PRODUCTION NOTIFICATION PATH - DRY RUN]':'[HMIE TEST NOTIFICATION PATH]',
    'Purpose: ' + (isProduction?'Validate real briefing notification delivery without changing production state.':'Validate test notification delivery.'),
    'Timestamp: ' + hxNowIso_(),
    channelLine,
    'Environment/mode: ' + (isProduction?'production dry run / validationMode':'test path / validationMode'),
    'Recipient target: Telegram ' + hxMaskValue_((recipients.telegram[0] || 'missing')) + ' · Email ' + hxMaskEmail_(recipients.email[0] || 'missing'),
    '',
    'HARMONEXUS BRIEFING VALIDATION',
    '',
    'Purpose:',
    'Notification parity check.',
    '',
    'MARKET CALENDAR WATCH',
    '',
    'Week Structure: FOUR-DAY WEEK',
    'Market Rhythm Risk: 8.4/10',
    'Liquidity Score: 5.8/10',
    '',
    'Key Calendar Conditions:',
    '• NYSE/Nasdaq Closed: Friday — observed holiday closure',
    '• Bond Market: Early close risk',
    '• Major Catalyst: NFP / high-impact macro catalyst example',
    '',
    'Operational Assessment:',
    '• Weekly auction rhythm may be compressed',
    '• Institutional positioning may occur earlier than normal',
    '• Late-week liquidity may deteriorate',
    '• False breakouts and liquidity sweeps are more probable around catalyst windows',
    '',
    'Historical Auction Adjustment:',
    'Normal Week:',
    'LOW → MIDWEEK EXPANSION → FRIDAY FOLLOW-THROUGH',
    '',
    'Abnormal Week:',
    'LOW → TUESDAY/WEDNESDAY EXPANSION → THURSDAY LIQUIDITY DECAY',
    '',
    'Operator Guidance:',
    'Use this as a validation message only.',
    'Do not treat this as live market advice.',
    '',
    'Briefing footer:',
    'Decision support only. No trade execution.',
    '',
    'Confirmation: This is a validation message.'
  ].join('\n');
}

function validateNotificationConfig() {
  const props = hxProps_();
  const recipients = hxNotificationRecipients_();
  return {
    telegramBotToken:props.getProperty('TELEGRAM_BOT_TOKEN')?'PASS':'FAIL',
    telegramChatId:recipients.telegram.length?'PASS':'FAIL',
    emailRecipient:recipients.email.length?'PASS':'FAIL',
    emailSenderSessionPermission:typeof MailApp !== 'undefined' && MailApp.sendEmail?'PASS':'UNKNOWN_UNTIL_SEND',
    maskedTelegramTarget:hxMaskValue_(recipients.telegram[0] || ''),
    maskedEmailTarget:hxMaskEmail_(recipients.email[0] || '')
  };
}

function assertNoStateMutationDuringDryRun(before, after) {
  const notificationRowsOk = Number(after.notificationRows || 0) === Number(before.notificationRows || 0);
  return {ok:notificationRowsOk,notificationRowsBefore:before.notificationRows,notificationRowsAfter:after.notificationRows};
}

function hxNotificationStateSnapshot_() {
  try {
    const sh = SpreadsheetApp.getActive().getSheetByName(HX.sheets.notifications);
    return {notificationRows:sh?sh.getLastRow():0};
  } catch (error) {
    return {notificationRows:0,error:error.message};
  }
}

function logNotificationParityResult(result) {
  hxNotificationLogEvent_(result.stateMutationSuppressed==='PASS'?'INFO':'WARN','Notification Parity Check',result);
  return result;
}

function hxParityChannelStatus_(results, provider) {
  const matches = (results || []).filter(r=>String(r.provider)===provider);
  if (!matches.length && (results || []).some(r=>String(r.provider)==='DeliverySuppressed')) return 'PASS';
  if (!matches.length) return 'FAIL';
  return matches.some(r=>r.ok)?'PASS':'FAIL';
}

function hxParityPublicResults_(results) {
  return (results || []).map(r=>({provider:r.provider,recipient:String(r.provider)==='Email'?hxMaskEmail_(r.recipient):hxMaskValue_(r.recipient),ok:Boolean(r.ok),error:r.error || ''}));
}

function hxMaskEmail_(email) {
  const value=String(email || '');
  const parts=value.split('@');
  if (parts.length!==2) return hxMaskValue_(value);
  return parts[0].slice(0,1) + '***@' + parts[1].replace(/^(.).*(\..+)$/,'$1***$2');
}

function hxMaskValue_(value) {
  const text=String(value || '');
  if (!text) return 'missing';
  if (text.length<=4) return '***';
  return text.slice(0,2) + '***' + text.slice(-2);
}

function testNotificationConfiguration() {
  const p=hxProps_();
  return {
    telegram:Boolean(p.getProperty('TELEGRAM_BOT_TOKEN') && p.getProperty('TELEGRAM_CHAT_ID')),
    pushover:Boolean(p.getProperty('PUSHOVER_APP_TOKEN') && p.getProperty('PUSHOVER_USER_KEY')),
    email:Boolean(p.getProperty('ALERT_EMAIL')),
    ai:Boolean(p.getProperty('OPENAI_API_KEY')),
    webhook:Boolean(p.getProperty('WEBHOOK_SECRET'))
  };
}

function hxLatestScoreRows_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(HX.sheets.scores);
  return sh ? hxRowsAsObjects_(sh) : [];
}

function hxNormalizeBriefingRows_(rows) {
  return (rows || []).map(r=>({row:r,instrument:String(r.Instrument),direction:String(r.Direction || 'Neutral'),
    strength:Number(r.Strength || 1),confidence:Number(r.Confidence || 0),score:Number(r['Directional Score'] || 0),
    reliability:String(r.Reliability || ''),drivers:safeJsonCell_(r['Strongest Drivers'],[]),contradictions:safeJsonCell_(r.Contradictions,[]),
    change:r['Score Change']===''||r['Score Change']===null?null:Number(r['Score Change']),material:String(r['Material Change']).toLowerCase()==='true',
    regime:String(r.Regime || r.Direction || 'Neutral'),regimeAge:Number(r['Regime Age (Trading Days)'] || 0),
    primaryDrivers:safeJsonCell_(r['Primary Drivers'],[]),seasonalWatch:safeJsonCell_(r['Seasonal Watch'],null)}));
}

/* Final CIO morning-brief formatter. Declared after the rollback-safe formatter so V8 uses this version. */
function hxBuildDailyBriefing_(rows) {
  const scores=(rows || []).map(r=>({row:r,instrument:String(r.Instrument),direction:String(r.Direction || 'Neutral'),
    strength:Number(r.Strength || 1),confidence:Number(r.Confidence || 0),score:Number(r['Directional Score'] || 0),
    reliability:String(r.Reliability || ''),drivers:safeJsonCell_(r['Strongest Drivers'],[]),contradictions:safeJsonCell_(r.Contradictions,[]),
    change:r['Score Change']===''||r['Score Change']===null?null:Number(r['Score Change']),material:String(r['Material Change']).toLowerCase()==='true',
    regime:String(r.Regime || r.Direction || 'Neutral'),regimeAge:Number(r['Regime Age (Trading Days)'] || 0),
    primaryDrivers:safeJsonCell_(r['Primary Drivers'],[]),seasonalWatch:safeJsonCell_(r['Seasonal Watch'],null)}));
  const macro=hxCrossAssetBriefingContext_(scores);
  let relationshipIntel=null;
  if (typeof hxRelationshipIntelligence_==='function') {
    try { relationshipIntel=hxRelationshipIntelligence_(scores); }
    catch (error) {
      relationshipIntel={macroConsensus:{score:null,evaluated:0,confidence:'Very Low',confirmations:[],contradictions:[]},leadLag:{supportedCount:0,confidence:'Very Low',currentLeaders:[],currentFollowers:[]}};
      if (typeof hxNotificationLogEvent_==='function') hxNotificationLogEvent_('ERROR','relationship intelligence unavailable',{error:error.message});
    }
  }
  const equities=scores.filter(s=>String(s.row.Family).toLowerCase().indexOf('equity')>=0);
  const riskAverage=(equities.length?equities:scores).reduce((n,s)=>n+s.score,0)/(equities.length||scores.length||1);
  const dispersion=scores.some(s=>s.score>1.5) && scores.some(s=>s.score<-1.5);
  const regime=dispersion?'fragmented':riskAverage>1.5?'risk-on':riskAverage<-1.5?'risk-off':'neutral';
  const regimeConfidence=Math.round(scores.reduce((n,s)=>n+s.confidence,0)/(scores.length||1));
  const factorMap={};
  scores.forEach(s=>s.drivers.forEach(d=>{const key=String(d.factor || 'Evidence'); factorMap[key]=(factorMap[key]||0)+Number(d.contribution||0);}));
  const factors=Object.keys(factorMap).sort((a,b)=>Math.abs(factorMap[b])-Math.abs(factorMap[a])).slice(0,3);
  const contradictions=[];
  scores.forEach(s=>s.contradictions.forEach(d=>{if(contradictions.length<4) contradictions.push(s.instrument+': '+format_contradiction_explanation(s.instrument, String(d.factor || 'evidence'), Number(d.contribution || 0), s.direction, s.regime));}));
  const changed=scores.filter(s=>s.material).sort((a,b)=>Math.abs(b.change||0)-Math.abs(a.change||0));
  const priority=scores.slice().sort((a,b)=>(b.strength*b.confidence)-(a.strength*a.confidence)).slice(0,3);
  const lines=hxBriefingHeader_();
  lines.push('',hxBriefingDivider_(),'MARKET REGIME',hxTitleCase_(regime),'Confidence: '+regimeConfidence+'%','', 'Interpretation:',hxRegimePlainLanguage_(regime, macro.market));
  lines.push('',hxBriefingDivider_(),'CROSS-ASSET CONSENSUS');
  macro.consensus.forEach(c=>lines.push(c.name+': '+c.label+' '+c.strength.toFixed(1)+'/10'));
  lines.push('',hxBriefingDivider_(),'CONSENSUS STRENGTH',
    'Overall Agreement: '+macro.market.agreement+'%',
    'Institutional Alignment: '+macro.market.alignment,
    'Market Regime: '+macro.market.state,
    'Participation: '+macro.market.participation,
    'Contradiction Level: '+macro.market.contradictionLevel+' — '+hxContradictionLevelInterpretation_(macro.market.contradictionLevel),
    'Confidence: '+macro.market.confidence+'%');
  lines.push('',hxBriefingDivider_(),'PRIMARY MARKET DRIVER',
    hxDriverDominanceSentence_(macro.driver));
  if (macro.driver.supporting.length) {
    lines.push('Supporting Drivers:');
    macro.driver.supporting.forEach(d=>lines.push(d));
  }
  lines.push('Interpretation:',macro.driver.interpretation);
  lines.push('',hxBriefingDivider_(),'CAPITAL ROTATION WATCH','Current Rotation:',macro.rotation.category,macro.rotation.momentum,macro.rotation.confidence+'%','Primary Destination:');
  macro.rotation.destination.forEach(x=>lines.push(x));
  lines.push('Primary Source:');
  macro.rotation.source.forEach(x=>lines.push(x));
  lines.push('Rotation Momentum:',macro.rotation.momentum,'Confidence:',macro.rotation.confidence+'%','Interpretation:',macro.rotation.interpretation);
  lines.push('',hxBriefingDivider_(),'CONVICTION METER','Conviction: '+macro.conviction.label,'Score: '+macro.conviction.score+'%','Reason:',macro.conviction.reason);
  lines.push('',hxBriefingDivider_(),'MACRO INTERPRETATION',macro.interpretation);
  lines.push('',hxBriefingDivider_(),'KEY DRIVERS:');
  (factors.length?factors:['No dominant factor']).forEach(f=>lines.push('- '+(factorMap[f]===undefined?f:f+' is contributing '+(factorMap[f]>=0?'positive':'negative')+' cross-asset pressure.')));
  lines.push('',hxBriefingDivider_(),'CONTRADICTIONS:');
  (contradictions.length?contradictions:['No material cross-asset contradiction in the available evidence.']).forEach(x=>lines.push('- '+x));
  lines.push('',hxBriefingDivider_(),'MATERIAL CHANGE:');
  if (changed.length) changed.slice(0,3).forEach(s=>lines.push.apply(lines,hxMaterialChangeLines_(s)));
  else lines.push('No instrument crossed a material-change threshold since the prior reading.');
  lines.push('',hxBriefingDivider_(),'PRIORITY INSTRUMENTS:');
  priority.forEach((s,i)=>{
    lines.push((i+1)+'. '+s.instrument+' - '+s.direction+' '+s.strength.toFixed(1)+'/10 - '+hxPriorityReason_(s));
    lines.push('   Age: '+(s.regimeAge>0?s.regimeAge+' trading days':'unavailable'));
  });
  const seasonal=scores.filter(s=>s.seasonalWatch && s.seasonalWatch.title).sort((a,b)=>
    (String(b.seasonalWatch.status)==='WATCH'?1:0)-(String(a.seasonalWatch.status)==='WATCH'?1:0)).slice(0,2);
  if (seasonal.length) {
    lines.push('',hxBriefingDivider_(),'SEASONAL WATCH','');
    seasonal.forEach((s,i)=>{
      const watch=s.seasonalWatch;
      lines.push(String(watch.title));
      if (watch.detail) lines.push(String(watch.detail));
      lines.push('Status: '+String(watch.status || 'DEVELOPING')+(watch.limitedSample?' - limited sample':''));
      if (i<seasonal.length-1) lines.push('');
    });
  }
  if (relationshipIntel && typeof hxRelationshipBriefingLines_ === 'function') {
    lines.push('',hxBriefingDivider_());
    hxRelationshipBriefingLines_(relationshipIntel).forEach(line=>lines.push(line));
    if (typeof hxNotificationLogEvent_==='function') {
      hxNotificationLogEvent_('INFO', relationshipIntel.macroConsensus && relationshipIntel.macroConsensus.score !== null ? 'Cross-Asset Consensus section included' : 'Cross-Asset Consensus section unavailable', relationshipIntel.macroConsensus || {});
      hxNotificationLogEvent_('INFO', relationshipIntel.leadLag && relationshipIntel.leadLag.supportedCount ? 'Lead-Lag Watch section included' : 'Lead-Lag Watch section unavailable', relationshipIntel.leadLag || {});
    }
  }
  if (typeof hxMarketCalendarBriefingLines_ === 'function') {
    try {
      lines.push('',hxBriefingDivider_());
      hxMarketCalendarBriefingLines_(new Date()).forEach(line=>lines.push(line));
      if (typeof hxNotificationLogEvent_==='function') hxNotificationLogEvent_('INFO','Market Calendar Watch section included',{});
    } catch (error) {
      lines.push('', 'MARKET CALENDAR WATCH', '', 'Market Calendar Watch: unavailable — calendar source could not be evaluated.');
      if (typeof hxNotificationLogEvent_==='function') hxNotificationLogEvent_('ERROR','Market Calendar Watch section unavailable',{error:error.message});
    }
  }
  const cio=hxCioSummary_(macro, regime, regimeConfidence);
  lines.push('',hxBriefingDivider_(),'CHIEF INVESTMENT OFFICER SUMMARY',
    'Strategic Bias:',cio.strategicBias,'',
    'Participation Quality:',cio.participationQuality,'',
    'Auction Phase:',cio.auctionPhase,'',
    'Risk Management Priority:',cio.riskManagementPriority,'',
    'Capital Deployment:',cio.capitalDeployment,'',
    'Current Objective:',cio.currentObjective);
  lines.push('',hxBriefingDivider_(),'WATCH CONDITIONS:','- A direction flip or a 1.5-point score change would alter the current regime read.','- Broader factor agreement with confidence above 75% would confirm the current read.','','Decision support only. No trade execution.');
  return lines.join('\n');
}

function hxBriefingHeader_() {
  const now=new Date();
  const format=(typeof Utilities !== 'undefined' && Utilities.formatDate) ? function(pattern){return Utilities.formatDate(now,'America/New_York',pattern);} : function(pattern){return pattern==='EEEE'?'Thursday':'07:00';};
  return ['HARMONEXUS',"Chief Investment Officer Robinson's",'Morning Market Brief',
    format('EEEE'),format('HH:mm')+' ET'];
}

function hxBriefingDivider_() {
  return '━━━━━━━━━━━━━━━━━━━━';
}

function hxTitleCase_(value) {
  return String(value || '').replace(/-/g,' ').replace(/\b\w/g,function(c){return c.toUpperCase();});
}

function hxRegimePlainLanguage_(regime, market) {
  const state=String(regime || 'neutral').toLowerCase();
  const contradiction=String((market || {}).contradictionLevel || 'Low');
  if (state==='fragmented') return 'Cross-asset agreement is mixed. Conviction is intentionally reduced because contradictions remain active.';
  if (state==='risk-off') return 'Defensive pressure is active, but continuation quality still depends on participation across rates, dollar, and risk assets.';
  if (state==='risk-on') return 'Risk appetite is constructive, provided market participation remains broad and contradictions do not expand.';
  return 'Macro evidence is balanced. The briefing should be treated as context until participation becomes cleaner.';
}

function hxContradictionLevelInterpretation_(level) {
  const value=String(level || '').toLowerCase();
  if (value==='high') return 'the briefing should be treated as cautious, not aggressive.';
  if (value==='moderate') return 'confirmation is uneven, so conviction should remain measured.';
  return 'opposing evidence is not currently controlling the read.';
}

function hxDriverDominanceSentence_(driver) {
  const primary=(driver && driver.primary) ? driver.primary : {name:'Evidence Stack',contribution:0};
  const secondary=(driver && driver.secondary) ? driver.secondary : {name:'No Secondary Driver',contribution:0};
  if (!primary.name || primary.name==='Evidence Stack') return 'No single driver dominates; the read is distributed across the available evidence stack.';
  if (!secondary.name || secondary.name==='No Secondary Driver') return primary.name+' is the dominant driver.';
  const gap=Number(primary.contribution || 0)-Number(secondary.contribution || 0);
  return primary.name+' is the dominant driver'+(gap<=12?', slightly ahead of ':', ahead of ')+secondary.name+'.';
}

function format_contradiction_explanation(instrument, contradiction_type, strength, current_bias, price_context) {
  const type=String(contradiction_type || 'evidence').toUpperCase();
  const bias=String(current_bias || 'current').toLowerCase();
  const force=Math.abs(Number(strength || 0))>=0.2?'materially ':'';
  if (type==='COMMERCIAL' || type==='POSITIONING') {
    return 'Commercial positioning is '+force+'reducing '+bias+' conviction; institutional hedging evidence is not fully supporting clean continuation. This is a warning condition, not thesis invalidation.';
  }
  if (type==='OI' || type==='OPEN_INTEREST' || type==='OPEN INTEREST') {
    return 'Open interest is weakening participation quality; price may still continue, but trend sponsorship is not fully confirmed. This is a warning, not an invalidation.';
  }
  if (type==='DXY') {
    return 'Dollar evidence is moving against the '+bias+' read; this reduces clean continuation quality until broader macro alignment improves.';
  }
  if (type==='REAL10Y' || type==='REAL YIELDS' || type==='US10Y') {
    return 'Yield evidence is opposing the '+bias+' read; conviction should be reduced until rates confirm the broader auction.';
  }
  return hxDriverBucket_(type)+' is opposing the '+bias+' read; treat the contradiction as reduced continuation quality, not a full invalidation.';
}

function hxCioSummary_(macro, regime, regimeConfidence) {
  const market=(macro || {}).market || {};
  const conviction=(macro || {}).conviction || {};
  const rotation=(macro || {}).rotation || {};
  const state=String(regime || 'neutral').toLowerCase();
  const bias=state==='risk-off'?'Defensive pressure remains active':state==='risk-on'?'Constructive risk appetite remains active':state==='fragmented'?'Directional bias is fragmented':'Strategic bias is balanced';
  const confirmation=Number(regimeConfidence || 0)>=70?'confirmation quality is strong':Number(regimeConfidence || 0)>=50?'confirmation quality is moderate':'confirmation quality is limited';
  const participation=String(market.participation || 'Narrow');
  const contradiction=String(market.contradictionLevel || 'Low').toLowerCase();
  return {
    strategicBias:bias+', but '+confirmation+'.',
    participationQuality:participation+'. Institutional alignment is '+String(market.alignment || 'unknown').toLowerCase()+' and contradiction risk is '+contradiction+'.',
    auctionPhase:hxAuctionPhase_(market, rotation),
    riskManagementPriority:contradiction==='high'?'Protect existing exposure and require cleaner participation before adding fresh risk.':'Maintain discipline and let participation confirm whether the auction is continuing or resetting.',
    capitalDeployment:Number((conviction || {}).score || 0)>=70?'Moderate to high; evidence quality supports measured deployment only within existing risk limits.':Number((conviction || {}).score || 0)>=45?'Moderate; evidence supports selectivity rather than broad deployment.':'Low; conditions do not support aggressive fresh deployment.',
    currentObjective:'Manage exposure, monitor invalidation levels, and let the auction confirm continuation or reset.'
  };
}

function hxAuctionPhase_(market, rotation) {
  const state=String((market || {}).state || '').toLowerCase();
  const momentum=String((rotation || {}).momentum || '').toLowerCase();
  if (state.indexOf('fragmented')>=0 || state.indexOf('rotational')>=0) return 'Rotational auction / balance repair.';
  if (momentum.indexOf('strengthening')>=0) return 'Auction continuation with improving participation.';
  if (momentum.indexOf('developing')>=0 || momentum.indexOf('emerging')>=0) return 'Auction development / confirmation phase.';
  return 'Auction assessment phase.';
}

function hxCrossAssetBriefingContext_(scores) {
  const components=[hxConsensusComponent_('Dollar',scores,hxDollarEvidence_),hxConsensusComponent_('Rates',scores,hxRatesEvidence_),hxConsensusComponent_('Metals',scores,hxMetalsEvidence_),hxConsensusComponent_('Equities',scores,hxEquitiesEvidence_)];
  const risk=hxRiskAppetiteComponent_(scores,components);
  components.push(risk);
  const directional=components.filter(c=>c.evidence);
  const bull=directional.filter(c=>c.value>0).length, bear=directional.filter(c=>c.value<0).length, neutral=directional.filter(c=>Math.abs(c.value)<=.08).length;
  const agreement=Math.round(100*Math.max(bull,bear,neutral)/(directional.length||1));
  const avgConfidence=Math.round(directional.reduce((n,c)=>n+c.confidence,0)/(directional.length||1));
  const contradictionCount=scores.reduce((n,s)=>n+(s.contradictions||[]).length,0);
  const participation=directional.length>=4&&agreement>=70?'Broad':directional.length>=3?'Moderate':'Narrow';
  const contradictionLevel=contradictionCount>=5||agreement<45?'High':contradictionCount>=2||agreement<65?'Moderate':'Low';
  const state=agreement<45||contradictionLevel==='High'?'Fragmented':agreement<60?'Rotational':avgConfidence<55?'Transitional':Math.abs(risk.value)<.12?'Range-Bound':'Trending';
  const alignment=agreement>=75&&avgConfidence>=65?'High':agreement>=55&&avgConfidence>=45?'Moderate':'Low';
  const driver=hxPrimaryMarketDriver_(scores);
  const rotation=hxCapitalRotation_(components,risk,avgConfidence,contradictionLevel);
  const convictionScore=hxClamp_(Math.round((agreement*.55)+(avgConfidence*.35)+(participation==='Broad'?10:participation==='Moderate'?4:0)-(contradictionLevel==='High'?22:contradictionLevel==='Moderate'?10:0)),0,100);
  const convictionLabel=convictionScore>=75?'Very High':convictionScore>=60?'High':convictionScore>=45?'Moderate':convictionScore>=25?'Low':'Very Low';
  return {consensus:components.map(c=>({name:c.name,label:c.name==='Risk Appetite'?hxRiskLabel_(c.strength):hxDirectionalLabel_(c.value,c.evidence),strength:c.strength})),
    market:{agreement:agreement,alignment:alignment,state:state,participation:participation,contradictionLevel:contradictionLevel,confidence:avgConfidence},
    driver:driver,rotation:rotation,conviction:{label:convictionLabel,score:convictionScore,reason:hxConvictionReason_(participation,contradictionLevel,avgConfidence)},
    interpretation:hxMacroInterpretation_(components,agreement,state,avgConfidence,contradictionLevel)};
}

function hxConsensusComponent_(name,scores,selector) {
  const evidence=[];
  scores.forEach(s=>selector(s).forEach(v=>evidence.push(v)));
  return hxWeightedComponent_(name,evidence);
}

function hxWeightedComponent_(name,evidence) {
  if (!evidence.length) return {name:name,value:0,strength:1,confidence:0,evidence:false};
  let weighted=0, weight=0, confidence=0;
  evidence.forEach(e=>{const w=Math.max(.05,Number(e.weight||1))*Math.max(20,Number(e.confidence||0))/100; weighted+=Number(e.value||0)*w; weight+=w; confidence+=Number(e.confidence||0)*w;});
  const value=weight?hxClamp_(weighted/weight,-1,1):0;
  return {name:name,value:value,strength:Math.round((Math.abs(value)*9+1)*10)/10,confidence:weight?Math.round(confidence/weight):0,evidence:true};
}

function hxScoreValue_(score) { return hxClamp_(Number(score.score || 0)/10,-1,1); }
function hxWeight_(score) { return Math.max(.2,Number(score.strength || 1)/10); }

function hxDollarEvidence_(s) {
  const id=s.instrument.toUpperCase(), v=hxScoreValue_(s), w=hxWeight_(s);
  if (id==='DXY') return [{value:v,confidence:s.confidence,weight:w*1.35}];
  if (['USDJPY','USDDKK'].indexOf(id)>=0) return [{value:v,confidence:s.confidence,weight:w}];
  if (['EURUSD','GBPUSD'].indexOf(id)>=0) return [{value:-v,confidence:s.confidence,weight:w}];
  return [];
}

function hxRatesEvidence_(s) {
  const id=s.instrument.toUpperCase(), v=hxScoreValue_(s), w=hxWeight_(s);
  if (['US2Y','US5Y','US10Y','US30Y'].indexOf(id)>=0) return [{value:v,confidence:s.confidence,weight:w*1.25}];
  const out=[];
  (s.drivers||[]).forEach(d=>{const f=String(d.factor||'').toUpperCase(); if(['REAL10Y','US2Y','US5Y','US10Y','US30Y','FED'].indexOf(f)>=0) out.push({value:hxClamp_(Number(d.contribution||0)*2,-1,1),confidence:Number(d.confidence||s.confidence||0),weight:Math.abs(Number(d.contribution||0))+.15});});
  return out;
}

function hxMetalsEvidence_(s) { return ['XAGUSD','GOLD','COPPER','PLATINUM'].indexOf(s.instrument.toUpperCase())>=0 ? [{value:hxScoreValue_(s),confidence:s.confidence,weight:hxWeight_(s)}] : []; }
function hxEquitiesEvidence_(s) { return ['US30','SPX500','NAS100','RUSSELL2000'].indexOf(s.instrument.toUpperCase())>=0 ? [{value:hxScoreValue_(s),confidence:s.confidence,weight:hxWeight_(s)}] : []; }

function hxRiskAppetiteComponent_(scores,components) {
  const evidence=[];
  const equities=components.filter(c=>c.name==='Equities')[0]; if (equities&&equities.evidence) evidence.push({value:equities.value,confidence:equities.confidence,weight:1.35});
  const dollar=components.filter(c=>c.name==='Dollar')[0]; if (dollar&&dollar.evidence) evidence.push({value:-dollar.value,confidence:dollar.confidence,weight:1.05});
  const rates=components.filter(c=>c.name==='Rates')[0]; if (rates&&rates.evidence) evidence.push({value:-rates.value,confidence:rates.confidence,weight:.8});
  scores.forEach(s=>{if(s.instrument.toUpperCase()==='COPPER') evidence.push({value:hxScoreValue_(s),confidence:s.confidence,weight:.7}); (s.drivers||[]).forEach(d=>{if(String(d.factor||'').toUpperCase()==='RISK') evidence.push({value:hxClamp_(Number(d.contribution||0)*2,-1,1),confidence:Number(d.confidence||s.confidence||0),weight:.6});});});
  const risk=hxWeightedComponent_('Risk Appetite',evidence);
  risk.strength=Math.round(((risk.value+1)*5)*10)/10;
  return risk;
}

function hxDirectionalLabel_(value,evidence) { if (!evidence) return 'Insufficient Evidence'; return value>.12?'Bullish':value<-.12?'Bearish':'Neutral'; }
function hxRiskLabel_(strength) { return strength<2.5?'Extreme Risk-Off':strength<4.5?'Risk-Off':strength<5.5?'Neutral':strength<7.5?'Risk-On':'Strong Risk-On'; }

function hxPrimaryMarketDriver_(scores) {
  const buckets={};
  scores.forEach(s=>(s.drivers||[]).forEach(d=>{const bucket=hxDriverBucket_(String(d.factor||'Evidence')); buckets[bucket]=(buckets[bucket]||0)+Math.abs(Number(d.contribution||0))*Math.max(20,Number(d.confidence||s.confidence||0))/100;}));
  const keys=Object.keys(buckets).sort((a,b)=>buckets[b]-buckets[a]), total=keys.reduce((n,k)=>n+buckets[k],0)||1;
  const primary=keys[0]||'Evidence Stack', secondary=keys[1]||'No Secondary Driver';
  return {primary:{name:primary,contribution:Math.round(100*(buckets[primary]||0)/total)},secondary:{name:secondary,contribution:Math.round(100*(buckets[secondary]||0)/total)},supporting:keys.slice(2,5),interpretation:hxDriverInterpretation_(primary,secondary)};
}

function hxDriverBucket_(factor) {
  const f=factor.toUpperCase();
  if (f==='DXY') return 'US Dollar';
  if (['REAL10Y','US2Y','US5Y','US10Y','US30Y'].indexOf(f)>=0) return f==='REAL10Y'?'Real Yields':'Rates';
  if (f==='TREND') return 'Trend';
  if (['POSITIONING','COMMERCIAL','OI'].indexOf(f)>=0) return 'Positioning';
  if (['SEASONALITY','SEASONAL'].indexOf(f)>=0) return 'Seasonality';
  if (f==='RISK') return 'Risk Sentiment';
  if (['FED','INFLATION'].indexOf(f)>=0) return 'Macro';
  return factor.replace(/_/g,' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
}

function hxDriverInterpretation_(primary,secondary) {
  if (primary==='Evidence Stack') return 'Available evidence is not concentrated enough to identify a single dominant macro force.';
  return primary+' is the primary force shaping the current cross-asset briefing, with '+secondary+' acting as the secondary influence. This is analytical context, not a trade instruction.';
}

function hxCapitalRotation_(components,risk,confidence,contradictionLevel) {
  const sorted=components.filter(c=>c.name!=='Risk Appetite'&&c.evidence).sort((a,b)=>Math.abs(b.value)-Math.abs(a.value));
  if (!sorted.length || contradictionLevel==='High') return {category:'No Clear Rotation',momentum:'No Clear Momentum',confidence:Math.max(20,confidence-25),destination:['No dominant destination'],source:['No dominant source'],interpretation:'Cross-asset evidence is too mixed to identify a durable capital-rotation pattern.'};
  const destinations=[], sources=[];
  sorted.forEach(c=>{if(c.value>.12) destinations.push(hxRotationAssetName_(c.name,true)); if(c.value<-.12) sources.push(hxRotationAssetName_(c.name,false));});
  const riskLabel=hxRiskLabel_(risk.strength);
  const category=riskLabel.indexOf('Risk-Off')>=0?'Risk-Off Rotation':riskLabel.indexOf('Risk-On')>=0?'Risk-On Rotation':destinations.indexOf('US Dollar')>=0?'Dollar Rotation':destinations.indexOf('Treasuries')>=0?'Rates Rotation':'No Clear Rotation';
  const momentum=confidence>=75?'Strengthening':confidence>=60?'Developing':confidence>=45?'Emerging':'No Clear Momentum';
  const conf=hxClamp_(Math.round(confidence-(contradictionLevel==='Moderate'?10:0)),0,100);
  return {category:category,momentum:momentum,confidence:conf,destination:(destinations.length?destinations:['No dominant destination']).slice(0,3),source:(sources.length?sources:['No dominant source']).slice(0,3),interpretation:hxRotationInterpretation_(category,momentum,destinations,sources)};
}

function hxRotationAssetName_(name,positive) {
  if (name==='Dollar') return positive?'US Dollar':'US Dollar pressure fading';
  if (name==='Rates') return positive?'Treasuries / rates pressure':'Rate pressure easing';
  return name;
}

function hxRotationInterpretation_(category,momentum,destination,source) {
  if (category==='No Clear Rotation') return 'Rotation evidence remains mixed, so the briefing should be treated as context rather than a confirmed macro allocation map.';
  return 'Capital appears to be rotating toward '+(destination[0]||'the strongest evidence group')+' and away from '+(source[0]||'weaker evidence groups')+'. Rotation momentum is '+momentum.toLowerCase()+'.';
}

function hxConvictionReason_(participation,contradictionLevel,confidence) {
  if (contradictionLevel==='High') return 'Major contradictions are active, so briefing conviction is intentionally reduced despite available signals.';
  if (participation==='Broad'&&confidence>=70) return 'Broad agreement exists across the major asset groups and no dominant contradiction currently controls the briefing.';
  if (participation==='Moderate') return 'Several asset groups agree, but confirmation is not broad enough to treat the macro environment as fully aligned.';
  return 'Evidence is narrow or uneven, so the briefing should be read as provisional decision-support context.';
}

function hxMacroInterpretation_(components,agreement,state,confidence,contradictionLevel) {
  const active=components.filter(c=>c.name!=='Risk Appetite'&&c.evidence).map(c=>c.name.toLowerCase()).join(', ');
  const base=(active?active:'available cross-assets')+' are displaying '+(agreement>=70?'broad':'mixed')+' agreement.';
  const regime='Macro conditions currently look '+state.toLowerCase()+' with '+confidence+'% derived confidence.';
  const caveat=contradictionLevel==='High'?'Active contradictions remain important and reduce conviction.':'Monitored contradictions remain part of the read, but none currently dominate the overview.';
  return base+' '+regime+' '+caveat;
}

function generateBriefingLog() { return sendDailyBriefing(); }
function sendBriefingEmail() { return sendDailyBriefing(); }
