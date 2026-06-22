function hxSheet_(name, headers) {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (headers && sh.getLastRow() === 0) sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  return sh;
}

function hxWithLock_(fn) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error('Another Harmonexus run is active.');
  try { return fn(); } finally { lock.releaseLock(); }
}

function hxFetch_(url, options, attempts) {
  const total = attempts || 3;
  const secrets = Object.values(hxProps_().getProperties()).filter(value => String(value || '').length >= 6);
  let last;
  for (let i = 0; i < total; i++) {
    try {
      const response = UrlFetchApp.fetch(url, Object.assign({muteHttpExceptions:true, followRedirects:true}, options || {}));
      const code = response.getResponseCode();
      if (code >= 200 && code < 300) return response;
      last = new Error(hxRedactSecrets_('HTTP ' + code + ' from ' + url + ': ' + response.getContentText().slice(0, 300), secrets));
    } catch (error) { last = new Error(hxRedactSecrets_(error.message, secrets)); }
    Utilities.sleep(Math.pow(2, i) * 500);
  }
  throw last;
}

function hxRedactSecrets_(value, secrets) {
  let text=String(value || '');
  (secrets || []).forEach(secret => { text=text.split(String(secret)).join('[REDACTED]'); });
  return text
    .replace(/\/bot[^/\s]+/gi, '/bot[REDACTED]')
    .replace(/([?&](?:api[_-]?key|key|token|secret)=)[^&\s]+/gi, '$1[REDACTED]');
}

function hxAtomicReplace_(sheet, headers, rows) {
  if (!rows || !rows.length) throw new Error('Refusing to replace ' + sheet.getName() + ' with an empty payload.');
  const width = headers.length;
  rows.forEach((row, i) => { if (row.length !== width) throw new Error('Row ' + i + ' width mismatch.'); });
  sheet.clearContents();
  sheet.getRange(1, 1, 1, width).setValues([headers]);
  sheet.getRange(2, 1, rows.length, width).setValues(rows);
  sheet.setFrozenRows(1);
}

function hxAppendRows_(sheet, rows) {
  if (rows && rows.length) sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
}

function hxProps_() { return PropertiesService.getScriptProperties(); }
function hxNowIso_() { return new Date().toISOString(); }
function hxClamp_(v, min, max) { return Math.max(min, Math.min(max, Number(v) || 0)); }
function hxNum_(v) { const n = Number(v); return isFinite(n) ? n : null; }
function hxJson_(value) { return JSON.stringify(value === undefined ? null : value); }

function hxRowsAsObjects_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map(String);
  return values.slice(1).filter(r => r.some(v => v !== '')).map(r => headers.reduce((o, h, i) => (o[h] = r[i], o), {}));
}

function hxAuditRun_(operation, fn) {
  const started = new Date();
  try {
    const result = fn();
    hxLog_('INFO', operation, 'SUCCESS', 'Completed', {durationMs:new Date() - started, result:result});
    return result;
  } catch (error) {
    hxLog_('ERROR', operation, 'FAILED', error.message, {durationMs:new Date() - started, stack:error.stack || ''});
    throw error;
  }
}

function hxLog_(level, operation, status, message, context) {
  try {
    const sh = hxSheet_(HX.sheets.systemLog, ['Timestamp','Level','Operation','Status','Message','Context JSON','Version']);
    hxAppendRows_(sh, [[new Date(),level,operation,status,message,hxJson_(context || {}),HX.version]]);
  } catch (ignored) {
    console.log(level + ' ' + operation + ' ' + status + ': ' + message);
  }
}

function hxParseDate_(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

function hxAgeHours_(value) {
  const date = hxParseDate_(value);
  return date ? Math.max(0, (Date.now() - date.getTime()) / 3600000) : Infinity;
}

function hxTrimSheet_(sheet, maxDataRows) {
  const extra = sheet.getLastRow() - 1 - maxDataRows;
  if (extra > 0) sheet.deleteRows(2, extra);
}
