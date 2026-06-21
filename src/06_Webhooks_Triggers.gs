function doPost(e) {
  try {
    const raw = e && e.postData ? e.postData.contents : '{}';
    const payload = JSON.parse(raw || '{}');
    const expected = hxProps_().getProperty('WEBHOOK_SECRET');
    const supplied = String(payload.secret || (e.parameter && e.parameter.secret) || '');
    const authorization=hxAuthorizeWebhook_(expected,supplied);
    if (!authorization.ok) return hxJsonResponse_({ok:false,error:authorization.error}, 401);
    const validation = hxValidateWebhookPayload_(payload);
    if (!validation.ok) return hxJsonResponse_({ok:false,error:validation.error}, 400);
    const instrument = validation.instrument, factor = validation.factor, value = validation.value;
    const eventId = hxWebhookEventId_(payload, raw);
    const log = hxSheet_(HX.sheets.webhook, ['Timestamp','Event ID','Instrument','Factor','Normalized Signal','Price','Source','Raw Payload','Processed']);
    const lastRow=log.getLastRow(), startRow=Math.max(2,lastRow-4999);
    const existing = lastRow > 1 ? log.getRange(startRow,2,lastRow-startRow+1,1).getDisplayValues().flat() : [];
    if (hxIsDuplicateEvent_(existing,eventId)) return hxJsonResponse_({ok:true,duplicate:true,eventId:eventId});
    hxAppendRows_(log, [[new Date(),eventId,instrument,factor,value,payload.price || '',payload.source || 'TradingView',raw,true]]);
    return hxJsonResponse_({ok:true,eventId:eventId});
  } catch (error) { return hxJsonResponse_({ok:false,error:error.message}, 400); }
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

function hxWebhookEventId_(payload, raw) {
  return String(payload.eventId || payload.id || Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw))).slice(0,128);
}

function hxIsDuplicateEvent_(existing,eventId) { return existing.map(String).indexOf(String(eventId)) >= 0; }

function runWebhookSelfTest() {
  const valid=hxValidateWebhookPayload_({instrument:'XAGUSD',factor:'TREND',normalizedSignal:-.65});
  const invalidInstrument=hxValidateWebhookPayload_({instrument:'NOPE',factor:'TREND',normalizedSignal:.2});
  const invalidSignal=hxValidateWebhookPayload_({instrument:'XAGUSD',factor:'TREND',normalizedSignal:2});
  return {valid:valid.ok,invalidInstrumentRejected:!invalidInstrument.ok,invalidSignalRejected:!invalidSignal.ok};
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
