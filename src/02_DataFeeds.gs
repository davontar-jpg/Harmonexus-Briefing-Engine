function refreshFRED() {
  return hxWithLock_(() => {
    return hxAuditRun_('refreshFRED', () => {
    const keys = Object.keys(HX.fredSeries);
    const series = {};
    keys.forEach(key => {
      const text = hxFetch_(HX.fredCsvBase + HX.fredSeries[key]).getContentText();
      const rows = Utilities.parseCsv(text);
      const map = {};
      rows.slice(1).forEach(r => { if (r[0] && r[1] && r[1] !== '.') map[r[0]] = Number(r[1]); });
      series[key] = map;
    });
    const dates = Object.keys(series.REAL10Y).sort().slice(-750);
    const pulled = new Date();
    const headers = ['Date'].concat(keys).concat(['Source', 'Pulled At']);
    const out = dates.map(date => [date].concat(keys.map(k => series[k][date] === undefined ? '' : series[k][date])).concat(['FRED', pulled]));
    hxAtomicReplace_(hxSheet_(HX.sheets.rawFRED), headers, out);
    rebuildNormalizedData_();
    return {rows:out.length, latest:dates[dates.length - 1], fallback:false};
    });
  });
}

function rebuildNormalizedData_() {
  const out = [];
  const fredSheet=SpreadsheetApp.getActive().getSheetByName(HX.sheets.rawFRED);
  const fred=fredSheet ? hxRowsAsObjects_(fredSheet) : [];
  fred.slice(-260).forEach(row => Object.keys(HX.fredSeries).forEach(key => {
    const value = hxNum_(row[key]);
    const unit = key === 'VIXCLS' ? 'index_points' : 'percent';
    if (value !== null) out.push([row.Date,'GLOBAL',key,value,unit,'FRED public CSV',row['Pulled At'],'valid']);
  }));
  const cftcSheet=SpreadsheetApp.getActive().getSheetByName(HX.sheets.rawCFTC);
  const cftc=cftcSheet ? hxRowsAsObjects_(cftcSheet) : [];
  cftc.filter(row=>row['Report Date'] && row['Report Date']!=='ERROR').forEach(row=>{
    const commercial=(hxNum_(row['Commercial Long'])||0)-(hxNum_(row['Commercial Short'])||0);
    const positioning=(hxNum_(row['Managed Money Long'])||0)-(hxNum_(row['Managed Money Short'])||0);
    out.push([row['Report Date'],row.Instrument,'OPEN_INTEREST',hxNum_(row['Open Interest'])||0,'contracts','CFTC public report',row['Pulled At'],'valid']);
    out.push([row['Report Date'],row.Instrument,'COMMERCIAL_NET',commercial,'contracts','CFTC public report',row['Pulled At'],'valid']);
    out.push([row['Report Date'],row.Instrument,'POSITIONING_NET',positioning,'contracts','CFTC public report',row['Pulled At'],'valid']);
  });
  if (out.length) hxAtomicReplace_(hxSheet_(HX.sheets.normalized), ['As Of','Instrument','Metric','Value','Unit','Source','Pulled At','Quality'], out);
  return out.length;
}

function refreshCFTC() {
  return hxWithLock_(() => {
    return hxAuditRun_('refreshCFTC', () => {
    const legacyRegistry = {
      XAGUSD:['SILVER - COMMODITY EXCHANGE INC.'], GOLD:['GOLD - COMMODITY EXCHANGE INC.'],
      COPPER:['COPPER-GRADE #1 - COMMODITY EXCHANGE INC.'], PLATINUM:['PLATINUM - NEW YORK MERCANTILE EXCHANGE'],
      DXY:['U.S. DOLLAR INDEX - ICE FUTURES U.S.']
    };
    const tffRegistry = {
      US30:['DOW JONES INDUSTRIAL AVERAGE - CHICAGO BOARD OF TRADE'],
      SPX500:['E-MINI S&P 500 - CHICAGO MERCANTILE EXCHANGE'], NAS100:['NASDAQ-100 STOCK INDEX - CHICAGO MERCANTILE EXCHANGE'],
      RUSSELL2000:['RUSSELL 2000 MINI INDEX FUTURE - CHICAGO MERCANTILE EXCHANGE'],
      EURUSD:['EURO FX - CHICAGO MERCANTILE EXCHANGE'], GBPUSD:['BRITISH POUND STERLING - CHICAGO MERCANTILE EXCHANGE'],
      USDJPY:['JAPANESE YEN - CHICAGO MERCANTILE EXCHANGE']
    };
    const output = [];
    Object.keys(Object.assign({}, legacyRegistry, tffRegistry)).forEach(asset => {
      const mode = legacyRegistry[asset] ? 'legacy' : 'tff';
      const names = legacyRegistry[asset] || tffRegistry[asset];
      let found = false;
      names.forEach(name => {
        if (found) return;
        const where = encodeURIComponent("market_and_exchange_names='" + name.replace(/'/g, "''") + "'");
        const url = HX.cftcEndpoints[mode] + '?$limit=20&$order=report_date_as_yyyy_mm_dd DESC&$where=' + where;
        const rows = JSON.parse(hxFetch_(url).getContentText());
        if (!rows.length) return;
        rows.forEach(d => {
          const m = hxMapCftc_(d);
          output.push([d.report_date_as_yyyy_mm_dd || d.report_date || '', asset, m.oi, m.comLong, m.comShort, m.mmLong, m.mmShort, new Date(), mode, d.market_and_exchange_names || name]);
        });
        found = true;
      });
      if (!found) output.push(['ERROR', asset, '', '', '', '', '', new Date(), mode, 'No configured market matched']);
    });
    hxAtomicReplace_(hxSheet_(HX.sheets.rawCFTC), ['Report Date','Instrument','Open Interest','Commercial Long','Commercial Short','Managed Money Long','Managed Money Short','Pulled At','Report Type','Market'], output);
    rebuildNormalizedData_();
    return {rows:output.length, fallback:false};
    });
  });
}

function hxMapCftc_(d) {
  const pick = keys => { for (let i=0; i<keys.length; i++) if (d[keys[i]] !== undefined) return Number(d[keys[i]]) || 0; return 0; };
  return {
    oi:pick(['open_interest_all','open_interest','open_interest_futonly']),
    comLong:pick(['comm_positions_long_all','dealer_positions_long_all','prod_merc_positions_long']),
    comShort:pick(['comm_positions_short_all','dealer_positions_short_all','prod_merc_positions_short']),
    mmLong:pick(['noncomm_positions_long_all','asset_mgr_positions_long','lev_money_positions_long']),
    mmShort:pick(['noncomm_positions_short_all','asset_mgr_positions_short','lev_money_positions_short'])
  };
}

function refreshAll() {
  const result = {runId:Utilities.getUuid(), startedAt:hxNowIso_()};
  try { result.fred = refreshFRED(); } catch (error) { result.fred = {fallback:true,error:error.message}; }
  try { result.cftc = refreshCFTC(); } catch (error) { result.cftc = {fallback:true,error:error.message}; }
  try { result.scores = calculateAllScores(); } catch (error) { result.scores = {fallback:true,error:error.message}; }
  result.finishedAt = hxNowIso_();
  hxLog_('INFO','refreshAll','COMPLETE','Refresh cycle completed with cached-data fallback where necessary.',result);
  return result;
}

/** Build a complete current signal snapshot from public feeds, webhooks, and v4.7 fallback values. */
function buildCalculatedSignals() {
  return hxAuditRun_('buildCalculatedSignals', () => {
    const ss = SpreadsheetApp.getActive();
    const existing = ss.getSheetByName(HX.sheets.signals);
    const priorRows = existing ? hxRowsAsObjects_(existing) : [];
    const priorMap = {};
    priorRows.forEach(r => { priorMap[String(r.Instrument).toUpperCase() + '|' + String(r.Factor).toUpperCase()] = r; });
    const candidates = {};

    function add(instrument, factor, rawValue, signal, source, asOf, quality, confidence, driver, eventId, priority) {
      instrument = String(instrument || '').toUpperCase();
      factor = String(factor || '').toUpperCase();
      signal = hxNum_(signal);
      if (!INSTRUMENTS[instrument] || !factor || signal === null) return;
      const key = instrument + '|' + factor;
      const item = {instrument:instrument,factor:factor,rawValue:rawValue,signal:hxClamp_(signal,-1,1),source:source,
        asOf:hxParseDate_(asOf) || new Date(),quality:quality,confidence:confidence,driver:driver,eventId:eventId || '',priority:priority};
      candidates[key] = candidates[key] || [];
      candidates[key].push(item);
    }

    hxLegacySignalCandidates_(ss, add);
    hxFredSignalCandidates_(ss, add);
    hxCftcSignalCandidates_(ss, add);
    hxWebhookSignalCandidates_(ss, add);

    const rows = [];
    Object.keys(INSTRUMENTS).forEach(instrument => {
      Object.keys(INSTRUMENTS[instrument].weights).forEach(factor => {
        const key = instrument + '|' + factor;
        const selected = hxSelectSignalCandidates_(candidates[key] || []);
        const options = selected.options;
        if (!options.length) return;
        const chosen = selected.chosen;
        const contradiction = selected.contradiction;
        const prior = priorMap[key];
        const priorSignal = prior ? hxNum_(prior['Normalized Signal']) : null;
        const delta = priorSignal === null ? null : Number((chosen.signal - priorSignal).toFixed(3));
        const material = priorSignal !== null && ((Math.sign(priorSignal) !== Math.sign(chosen.signal) && Math.abs(priorSignal) >= .25 && Math.abs(chosen.signal) >= .25) || Math.abs(delta) >= .5);
        rows.push([chosen.asOf,instrument,factor,chosen.rawValue,Number(chosen.signal.toFixed(3)),chosen.source,chosen.quality,chosen.eventId,
          chosen.confidence,chosen.driver,contradiction,priorSignal === null ? '' : priorSignal,delta === null ? '' : delta,material,
          options.length > 1 ? 'Selected from ' + options.length + ' candidates by source priority and recency.' : 'Single available source.']);
      });
    });
    if (!rows.length) throw new Error('No valid signal candidates were found; cached source sheets remain unchanged.');
    const target = hxSheet_(HX.sheets.signals);
    hxAtomicReplace_(target, SIGNAL_HEADERS, rows);
    const history = hxSheet_(HX.sheets.signalHistory, SIGNAL_HEADERS);
    hxAppendRows_(history, rows);
    hxTrimSheet_(history, HX.score.historyLimit);
    return {rows:rows.length,instruments:new Set(rows.map(r => r[1])).size,usedFallback:rows.some(r => String(r[5]).indexOf('Legacy') >= 0)};
  });
}

function hxLegacySignalCandidates_(ss, add) {
  const sh = ss.getSheetByName('Signal_Engine');
  if (!sh) return;
  hxRowsAsObjects_(sh).forEach(row => {
    const instrument = row.Asset;
    const asOf = row['Last Updated'] || new Date();
    [['DXY','DXY Signal','DXY Score'],['REAL10Y','Real Yield Signal','Real Yield Score'],
      ['POSITIONING','Positioning Signal','Positioning Score'],['COMMERCIAL','Commercial Context','Commercial Score'],
      ['OI','Open Interest Signal','OI Score']].forEach(mapping => {
      const score = hxNum_(row[mapping[2]]);
      const signal = score !== null && score !== 0 ? hxClamp_(score / 40,-1,1) : hxLabelSignal_(row[mapping[1]]);
      add(instrument,mapping[0],row[mapping[1]],signal,'Legacy v4.7 Signal_Engine',asOf,'fallback',40,
        mapping[0] + ' mapped from the existing workbook methodology.','',100);
    });
  });
}

function hxFredSignalCandidates_(ss, add) {
  const sh = ss.getSheetByName(HX.sheets.rawFRED);
  if (!sh) return;
  const rows = hxRowsAsObjects_(sh).filter(r => r.Date).sort((a,b) => String(a.Date).localeCompare(String(b.Date)));
  if (rows.length < 2) return;
  const latest = rows[rows.length - 1], previous = rows[rows.length - 2];
  const asOf = latest.Date, stale = hxAgeHours_(asOf) > 120;
  const quality = stale ? 'stale-cache' : 'fresh', confidence = stale ? 55 : 95;
  const factors = {REAL10Y:.12,US2Y:.15,US5Y:.15,US10Y:.12,US30Y:.12};
  Object.keys(factors).forEach(factor => {
    const current = hxNum_(latest[factor]), prior = hxNum_(previous[factor]);
    if (current === null || prior === null) return;
    const delta = current - prior, signal = hxNormalizeChange_(delta,factors[factor]);
    Object.keys(INSTRUMENTS).forEach(instrument => {
      if (Object.prototype.hasOwnProperty.call(INSTRUMENTS[instrument].weights,factor))
        add(instrument,factor,delta,signal,'FRED public CSV',asOf,quality,confidence,factor + ' daily change ' + delta.toFixed(3) + 'pp.','',300);
    });
    if (INSTRUMENTS[factor]) add(factor,'TREND',delta,signal,'FRED public CSV',asOf,quality,confidence,factor + ' yield trend from daily change.','',300);
  });
  const latestTwo=hxNum_(latest.US2Y), priorTwo=hxNum_(previous.US2Y);
  const twoYearDelta = latestTwo === null || priorTwo === null ? null : latestTwo-priorTwo;
  if (twoYearDelta !== null) ['US2Y','US5Y','US10Y','US30Y'].forEach(instrument =>
    add(instrument,'FED',twoYearDelta,hxClamp_(twoYearDelta/.15,-1,1),'FRED public CSV',asOf,quality,confidence,'Front-end yield change used as the policy-pressure proxy.','',290));
}

function hxCftcSignalCandidates_(ss, add) {
  const sh = ss.getSheetByName(HX.sheets.rawCFTC);
  if (!sh) return;
  const groups = {};
  hxRowsAsObjects_(sh).filter(r => r['Report Date'] && r['Report Date'] !== 'ERROR').forEach(r => {
    const instrument = String(r.Instrument || '').toUpperCase();
    groups[instrument] = groups[instrument] || [];
    groups[instrument].push(r);
  });
  Object.keys(groups).forEach(instrument => {
    const rows = groups[instrument].sort((a,b) => String(b['Report Date']).localeCompare(String(a['Report Date'])));
    if (rows.length < 2) return;
    const latest=rows[0], prior=rows[1], asOf=latest['Report Date'];
    const stale=hxAgeHours_(asOf)>240, quality=stale?'stale-cache':'fresh', confidence=stale?55:90;
    const currentOi=hxNum_(latest['Open Interest']) || 0, priorOi=hxNum_(prior['Open Interest']) || 0;
    const scale=Math.max(Math.abs(priorOi)*.05,1000);
    const commercial=(hxNum_(latest['Commercial Long'])||0)-(hxNum_(latest['Commercial Short'])||0);
    const prevCommercial=(hxNum_(prior['Commercial Long'])||0)-(hxNum_(prior['Commercial Short'])||0);
    const managed=(hxNum_(latest['Managed Money Long'])||0)-(hxNum_(latest['Managed Money Short'])||0);
    const prevManaged=(hxNum_(prior['Managed Money Long'])||0)-(hxNum_(prior['Managed Money Short'])||0);
    add(instrument,'COMMERCIAL',commercial-prevCommercial,hxNormalizeChange_(commercial-prevCommercial,scale),'CFTC public report',asOf,quality,confidence,'Weekly commercial net-position change.','',320);
    add(instrument,'POSITIONING',managed-prevManaged,hxNormalizeChange_(managed-prevManaged,scale),'CFTC public report',asOf,quality,confidence,'Weekly managed-money net-position change.','',320);
    add(instrument,'OI',currentOi-priorOi,hxNormalizeChange_(currentOi-priorOi,scale),'CFTC public report',asOf,quality,confidence,'Weekly open-interest participation change.','',320);
  });
}

function hxWebhookSignalCandidates_(ss, add) {
  const sh = ss.getSheetByName(HX.sheets.webhook);
  if (!sh) return;
  hxRowsAsObjects_(sh).forEach(row => {
    const instrument=row.Instrument || row.Asset, factor=row.Factor || row.Variable;
    const signal=hxNum_(row['Normalized Signal']) === null ? hxLabelSignal_(row.Status) : hxNum_(row['Normalized Signal']);
    const asOf=row.Timestamp || new Date(), stale=hxAgeHours_(asOf)>72;
    const price=hxNum_(row.Price), rawValue=price === null ? signal : price;
    add(instrument,factor,rawValue,signal,row.Source || 'TradingView webhook',asOf,stale?'stale-cache':'fresh',stale?50:100,
      'Authenticated event signal from ' + (row.Source || 'TradingView') + '.',row['Event ID'] || '',400);
  });
}

function hxLabelSignal_(value) {
  const text=String(value || '').toLowerCase();
  if (text.indexOf('strong bullish')>=0) return 1;
  if (text.indexOf('moderate bullish')>=0) return .65;
  if (text.indexOf('bull')>=0) return .5;
  if (text.indexOf('strong bearish')>=0) return -1;
  if (text.indexOf('moderate bearish')>=0) return -.65;
  if (text.indexOf('bear')>=0) return -.5;
  return 0;
}

function hxNormalizeChange_(change,scale) {
  const numeric=hxNum_(change), denominator=Math.abs(Number(scale)||0);
  return numeric === null || denominator === 0 ? 0 : hxClamp_(numeric/denominator,-1,1);
}

function hxSelectSignalCandidates_(items) {
  const options=(items || []).slice().sort((a,b) => b.priority-a.priority || b.asOf-a.asOf);
  if (!options.length) return {options:[],chosen:null,contradiction:false};
  const chosen=options[0];
  return {options:options,chosen:chosen,contradiction:options.slice(1).some(o=>Math.sign(o.signal)&&Math.sign(chosen.signal)&&Math.sign(o.signal)!==Math.sign(chosen.signal))};
}
