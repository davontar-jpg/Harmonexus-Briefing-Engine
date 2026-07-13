function doPost(e) {
  let expected = '', supplied = '';
  try {
    const raw = e && e.postData ? e.postData.contents : '{}';
    const payload = JSON.parse(raw || '{}');
    expected = hxProps_().getProperty('WEBHOOK_SECRET');
    supplied = String(payload.secret || (e.parameter && e.parameter.secret) || '');
    const authorization=hxAuthorizeWebhook_(expected,supplied);
    if (!authorization.ok) return hxJsonResponse_({ok:false,error:authorization.error}, 401);
    const validation = hxValidateWebhookPayload_(payload);
    if (!validation.ok) return hxJsonResponse_({ok:false,error:validation.error}, 400);
    const instrument = validation.instrument, factor = validation.factor, value = validation.value;
    const secretValues=hxWebhookSecretValues_(expected,supplied);
    const sanitizedPayload=hxSanitizeWebhookPayload_(payload,secretValues);
    const eventId = hxWebhookEventId_(sanitizedPayload, hxJson_(sanitizedPayload), secretValues);
    sanitizedPayload.eventId=eventId;
    sanitizedPayload.instrument=instrument;
    sanitizedPayload.factor=factor;
    sanitizedPayload.normalizedSignal=value;
    const log = hxSheet_(HX.sheets.webhook, ['Timestamp','Event ID','Instrument','Factor','Normalized Signal','Price','Source','Raw Payload','Processed']);
    const lastRow=log.getLastRow(), startRow=Math.max(2,lastRow-4999);
    const existing = lastRow > 1 ? log.getRange(startRow,2,lastRow-startRow+1,1).getDisplayValues().flat() : [];
    if (hxIsDuplicateEvent_(existing,eventId)) return hxJsonResponse_({ok:true,duplicate:true,eventId:eventId});
    hxAppendRows_(log, [[new Date(),eventId,instrument,factor,value,sanitizedPayload.price || '',sanitizedPayload.source || 'TradingView',hxJson_(sanitizedPayload),true]]);
    return hxJsonResponse_({ok:true,eventId:eventId});
  } catch (error) {
    return hxJsonResponse_({ok:false,error:hxRedactSecrets_(error && error.message ? error.message : 'invalid request',[expected,supplied])}, 400);
  }
}

const HX_WEBHOOK_PERSISTED_FIELDS = Object.freeze([
  'eventId','id','instrument','asset','factor','variable','normalizedSignal','value',
  'rawValue','price','source','timestamp','time','exchange','timeframe','status','direction'
]);

function hxWebhookSecretValues_(expected,supplied) {
  const configured=Object.values(hxProps_().getProperties()).filter(value => String(value || '').length >= 6);
  return configured.concat([expected,supplied]).filter(value => String(value || '').length > 0);
}

function hxSanitizeWebhookPayload_(payload, secretValues) {
  const sanitized={};
  HX_WEBHOOK_PERSISTED_FIELDS.forEach(key => {
    if (!Object.prototype.hasOwnProperty.call(payload || {},key) || hxIsSensitiveKey_(key)) return;
    const value=payload[key];
    if (value === null || ['string','number','boolean'].indexOf(typeof value) < 0) return;
    sanitized[key]=typeof value === 'string' ? hxRedactSecrets_(value,secretValues).slice(0,1000) : value;
  });
  return sanitized;
}

function hxValidateWebhookPayload_(payload) {
  const instrument=String(payload.instrument || payload.asset || '').toUpperCase();
  const factor=String(payload.factor || payload.variable || '').toUpperCase();
  const value=hxNum_(payload.normalizedSignal !== undefined ? payload.normalizedSignal : payload.value);
  if (!INSTRUMENTS[instrument]) return {ok:false,error:'unknown instrument'};
  if (!factor || value === null || value < -1 || value > 1) return {ok:false,error:'factor and normalizedSignal (-1..1) are required'};
  return {ok:true,instrument:instrument,factor:factor,value:value};
}

function hxAuthorizeWebhook_(expected,supplied) {
  if (!expected) return {ok:false,error:'webhook not configured'};
  return String(expected)===String(supplied) ? {ok:true} : {ok:false,error:'unauthorized'};
}

function hxWebhookEventId_(payload, sanitizedRaw, secretValues) {
  const generated=Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, sanitizedRaw));
  return hxRedactSecrets_(String(payload.eventId || payload.id || generated),secretValues || [])
    .replace(/[^A-Za-z0-9._:\-\[\]]/g,'_').slice(0,128);
}

function hxIsDuplicateEvent_(existing,eventId) { return existing.map(String).indexOf(String(eventId)) >= 0; }

function runWebhookSelfTest() {
  const valid=hxValidateWebhookPayload_({instrument:'XAGUSD',factor:'TREND',normalizedSignal:-.65});
  const invalidInstrument=hxValidateWebhookPayload_({instrument:'NOPE',factor:'TREND',normalizedSignal:.2});
  const invalidSignal=hxValidateWebhookPayload_({instrument:'XAGUSD',factor:'TREND',normalizedSignal:2});
  const syntheticSecret='synthetic-self-test-secret';
  const sanitized=hxSanitizeWebhookPayload_({secret:syntheticSecret,instrument:'XAGUSD',factor:'TREND',normalizedSignal:-.65,source:'Apps Script self-test'},[syntheticSecret]);
  return {valid:valid.ok,invalidInstrumentRejected:!invalidInstrument.ok,invalidSignalRejected:!invalidSignal.ok,
    authorization:hxAuthorizeWebhook_(syntheticSecret,syntheticSecret).ok,secretExcluded:!Object.prototype.hasOwnProperty.call(sanitized,'secret')};
}

/** Confirms configuration, authorization, sanitization, and deduplication using synthetic credentials only. */
function runConfiguredWebhookSelfTest() {
  if (!hxProps_().getProperty('WEBHOOK_SECRET')) throw new Error('WEBHOOK_SECRET is not configured.');
  const syntheticSecret='synthetic-self-test-secret';
  const eventId='harmonexus-self-test-' + Utilities.getUuid();
  const payload={secret:syntheticSecret,eventId:eventId,instrument:'XAGUSD',factor:'TREND',normalizedSignal:-.65,source:'Apps Script self-test'};
  const sanitized=hxSanitizeWebhookPayload_(payload,[syntheticSecret]);
  const existing=[eventId];
  const result={configured:true,authorization:hxAuthorizeWebhook_(syntheticSecret,syntheticSecret).ok,
    secretExcluded:!Object.prototype.hasOwnProperty.call(sanitized,'secret'),duplicateRejected:hxIsDuplicateEvent_(existing,eventId),eventId:eventId};
  if (!result.authorization || !result.secretExcluded || !result.duplicateRejected)
    throw new Error('Configured webhook self-test failed without using configured credential material.');
  hxLog_('INFO','runConfiguredWebhookSelfTest','COMPLETE','Configured webhook presence and synthetic security checks passed.',result);
  return result;
}

function doGet() { return hxJsonResponse_({ok:true,service:'Harmonexus Briefing Engine',version:HX.version,time:hxNowIso_()}); }

function hxJsonResponse_(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}

function installTriggers() {
  const managed = ['refreshFRED','refreshCFTC','calculateAllScores','sendDailyBriefing'];
  ScriptApp.getProjectTriggers().forEach(t => { if (managed.indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('refreshFRED').timeBased().everyDays(1).atHour(6).create();
  ScriptApp.newTrigger('refreshCFTC').timeBased().onWeekDay(ScriptApp.WeekDay.FRIDAY).atHour(19).create();
  ScriptApp.newTrigger('calculateAllScores').timeBased().everyHours(1).create();
  ScriptApp.newTrigger('sendDailyBriefing').timeBased().everyDays(1).atHour(7).create();
  return managed;
}

function generateBriefingText() {
  const rows = hxLatestScoreRows_().sort((a,b) => Number(b.Strength) - Number(a.Strength));
  return rows.map(r => r.Instrument + ': ' + r.Direction + ' ' + Number(r.Strength).toFixed(1) + '/10').join('\n');
}
