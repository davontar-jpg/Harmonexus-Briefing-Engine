/**
 * Converts normalized factor signals (-1 bearish to +1 bullish) into an auditable reading.
 * `directionScore` is signed (-10..10); `strength` is 1..10; label owns direction.
 */
function calculateInstrumentScore(instrument, factorSignals, previous) {
  const cfg = INSTRUMENTS[instrument];
  if (!cfg) throw new Error('Unknown instrument: ' + instrument);
  const drivers = [], contradictions = [];
  let weighted = 0, observedWeight = 0, totalWeight = 0, confidenceWeight = 0;
  Object.keys(cfg.weights).forEach(factor => {
    const signedWeight = cfg.weights[factor];
    const absWeight = Math.abs(signedWeight);
    totalWeight += absWeight;
    const raw = factorSignals[factor];
    if (raw === undefined || raw === null || raw === '') return;
    const input = typeof raw === 'object' ? raw : {signal:raw, confidence:100};
    const normalized = hxClamp_(input.signal, -HX.score.maxAbsSignal, HX.score.maxAbsSignal);
    const factorConfidence = hxClamp_(input.confidence === undefined ? 100 : input.confidence, 0, 100);
    const contribution = normalized * signedWeight;
    observedWeight += absWeight;
    confidenceWeight += absWeight * factorConfidence / 100;
    weighted += contribution;
    drivers.push({factor:factor, signal:normalized, weight:signedWeight, contribution:contribution, confidence:factorConfidence,
      source:input.source || '', quality:input.quality || '', asOf:input.asOf || '', rawValue:input.rawValue === undefined ? '' : input.rawValue});
  });
  const coverage = totalWeight ? observedWeight / totalWeight : 0;
  const normalizedScore = observedWeight ? hxClamp_(weighted / observedWeight, -1, 1) : 0;
  const label = normalizedScore > HX.score.neutralBand ? 'Bullish' : normalizedScore < -HX.score.neutralBand ? 'Bearish' : 'Neutral';
  const strength = label === 'Neutral' ? 1 + (Math.abs(normalizedScore) / HX.score.neutralBand) * 3 : 4 + ((Math.abs(normalizedScore) - HX.score.neutralBand) / (1 - HX.score.neutralBand)) * 6;
  drivers.sort((a,b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  drivers.forEach(d => {
    if (d.contribution !== 0 && normalizedScore !== 0 && Math.sign(d.contribution) !== Math.sign(normalizedScore)) contradictions.push(d);
  });
  const confidence = Math.round(totalWeight ? confidenceWeight / totalWeight * 100 : 0);
  const reliability = hxReliability_(confidence, drivers.length, totalWeight ? observedWeight / totalWeight : 0);
  const uncappedStrength = hxClamp_(strength, 1, 10);
  const calibratedStrength = Math.min(uncappedStrength, HX.score.strengthCaps[reliability.key]);
  const prior = previous || {};
  const result = {
    instrument:instrument, name:cfg.name, family:cfg.family, label:label,
    strength:Number(calibratedStrength.toFixed(1)), rawStrength:Number(uncappedStrength.toFixed(1)), directionScore:Number((normalizedScore * 10).toFixed(1)),
    confidence:confidence, coverage:Number(coverage.toFixed(3)), reliability:reliability.label, evidenceStatus:reliability.status,
    strongestDrivers:drivers.slice(0, 3), contradictions:contradictions.slice(0, 3),
    priorLabel:prior.label || '', priorStrength:prior.strength === undefined ? '' : prior.strength,
    scoreChange:prior.strength === undefined ? null : Number((calibratedStrength - prior.strength).toFixed(1)), asOf:hxNowIso_()
  };
  result.explanationTrace = {weightedSum:Number(weighted.toFixed(4)),observedWeight:Number(observedWeight.toFixed(4)),totalWeight:Number(totalWeight.toFixed(4)),
    normalizedScore:Number(normalizedScore.toFixed(4)),rawStrength:result.rawStrength,calibratedStrength:result.strength,cap:HX.score.strengthCaps[reliability.key],confidence:confidence,
    factorContributions:drivers.map(d=>({factor:d.factor,contribution:Number(d.contribution.toFixed(4)),confidence:d.confidence}))};
  result.materialChange = hxIsMaterialChange_(result, prior);
  return result;
}

function calculateAllScores() {
  return hxWithLock_(() => hxAuditRun_('calculateAllScores', () => {
  buildCalculatedSignals();
  const prior = hxLatestScores_();
  const signals = hxSignalsByInstrument_();
  const results = Object.keys(INSTRUMENTS).map(id => calculateInstrumentScore(id, signals[id] || {}, prior[id]));
  const history = hxSheet_(HX.sheets.snapshots);
  const historyRows = history.getLastRow() > 1 ? hxRowsAsObjects_(history) : [];
  results.forEach(r => {
    r.regime = r.label;
    r.regimeAgeTradingDays = hxRegimeAgeTradingDays_(r.instrument, r.regime, historyRows, r.asOf);
    r.primaryDrivers = hxPrimaryDriverChanges_(r.explanationTrace.factorContributions, (prior[r.instrument] || {}).factorContributions || []);
    r.seasonalWatch = hxSeasonalWatchForScore_(r, new Date(r.asOf));
  });
  const headers = ['As Of','Instrument','Name','Family','Direction','Strength','Raw Strength','Directional Score','Confidence','Reliability','Evidence Status','Strongest Drivers','Contradictions','Prior Direction','Prior Strength','Score Change','Material Change','Explanation Trace','Regime','Regime Age (Trading Days)','Primary Drivers','Seasonal Watch'];
  const rows = results.map(r => [new Date(r.asOf),r.instrument,r.name,r.family,r.label,r.strength,r.rawStrength,r.directionScore,r.confidence,r.reliability,r.evidenceStatus,hxJson_(r.strongestDrivers),hxJson_(r.contradictions),r.priorLabel,r.priorStrength,r.scoreChange,r.materialChange,hxJson_(r.explanationTrace),r.regime,r.regimeAgeTradingDays,hxJson_(r.primaryDrivers),r.seasonalWatch ? hxJson_(r.seasonalWatch) : '']);
  hxAtomicReplace_(hxSheet_(HX.sheets.scores), headers, rows);
  history.getRange(1, 1, 1, headers.length).setValues([headers]);
  hxAppendRows_(history, rows);
  const calibration = hxSheet_(HX.sheets.calibration, ['As Of','Instrument','Direction','Raw Strength','Calibrated Strength','Confidence','Reliability','Evidence Status','Coverage','Score Change','Material Change']);
  hxAppendRows_(calibration, results.map(r => [new Date(r.asOf),r.instrument,r.label,r.rawStrength,r.strength,r.confidence,r.reliability,r.evidenceStatus,r.coverage,r.scoreChange,r.materialChange]));
  results.filter(r => r.materialChange).forEach(r => sendMajorChangeAlert_(r));
  hxTrimSheet_(history, HX.score.historyLimit);
  return results;
  }));
}

function hxSignalsByInstrument_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(HX.sheets.signals);
  if (!sh || sh.getLastRow() < 2) return {};
  return hxRowsAsObjects_(sh).reduce((all, row) => {
    const id = String(row.Instrument || '').toUpperCase();
    if (!id) return all;
    all[id] = all[id] || {};
    all[id][String(row.Factor || '').toUpperCase()] = {signal:hxNum_(row['Normalized Signal']),confidence:hxNum_(row.Confidence) || 0,
      source:row.Source,quality:row.Quality,asOf:row['As Of'],rawValue:row['Raw Value']};
    return all;
  }, {});
}

function hxReliability_(confidence, factorCount, coverage) {
  const t=HX.score.confidence;
  if (!factorCount || confidence < t.insufficient || coverage < .25) return {key:'insufficient',label:'Insufficient evidence',status:'INSUFFICIENT EVIDENCE'};
  if (confidence < t.provisional || coverage < .5) return {key:'provisional',label:'Provisional',status:'PROVISIONAL'};
  if (confidence < t.reliable || coverage < .75) return {key:'weak',label:'Developing',status:'WEAK'};
  return {key:'strong',label:'Reliable',status:'STRONG'};
}

function hxLatestScores_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(HX.sheets.scores);
  if (!sh || sh.getLastRow() < 2) return {};
  return hxRowsAsObjects_(sh).reduce((o,r) => {
    const trace=hxSafeJson_(r['Explanation Trace'],{});
    const fallback=hxSafeJson_(r['Strongest Drivers'],[]);
    o[String(r.Instrument)] = {label:r.Direction, strength:Number(r.Strength), confidence:Number(r.Confidence),
      factorContributions:Array.isArray(trace.factorContributions)?trace.factorContributions:(Array.isArray(fallback)?fallback:[])};
    return o;
  }, {});
}

function hxIsMaterialChange_(current, prior) {
  if (!prior || !prior.label) return false;
  if (HX.materialChange.directionFlip && current.label !== prior.label && current.label !== 'Neutral' && prior.label !== 'Neutral') return true;
  if (Math.abs(current.strength - Number(prior.strength || 0)) >= HX.materialChange.scoreDelta) return true;
  return Math.abs(current.confidence - Number(prior.confidence || 0)) >= HX.materialChange.confidenceDelta;
}

function hxSafeJson_(value, fallback) {
  if (value && typeof value === 'object') return value;
  try { return value === '' || value === null || value === undefined ? fallback : JSON.parse(value); }
  catch (ignored) { return fallback; }
}

/** Counts distinct weekday observations, not elapsed calendar days. */
function hxRegimeAgeTradingDays_(instrument, regime, historyRows, asOf) {
  const currentKey=hxTradingDateKey_(asOf);
  const seen={};
  let age=0;
  if (currentKey) { seen[currentKey]=true; age=1; }
  const rows=(historyRows || []).filter(r=>String(r.Instrument || '').toUpperCase()===String(instrument || '').toUpperCase())
    .slice().sort((a,b)=>Number(hxParseDate_(b['As Of']))-Number(hxParseDate_(a['As Of'])));
  for (let i=0;i<rows.length;i++) {
    const key=hxTradingDateKey_(rows[i]['As Of']);
    if (!key || seen[key]) continue;
    if (String(rows[i].Regime || rows[i].Direction || 'Neutral') !== String(regime || 'Neutral')) break;
    seen[key]=true;
    age++;
  }
  return age;
}

function hxTradingDateKey_(value) {
  const d=hxParseDate_(value);
  if (!d || d.getUTCDay()===0 || d.getUTCDay()===6) return '';
  return [d.getUTCFullYear(),String(d.getUTCMonth()+1).padStart(2,'0'),String(d.getUTCDate()).padStart(2,'0')].join('-');
}

/** Returns only measured contribution deltas present in both readings. */
function hxPrimaryDriverChanges_(currentDrivers, priorDrivers) {
  const before={};
  (priorDrivers || []).forEach(d=>{if(d && d.factor) before[String(d.factor).toUpperCase()]=Number(d.contribution || 0);});
  return (currentDrivers || []).filter(d=>d && d.factor && before[String(d.factor).toUpperCase()]!==undefined && Number(d.confidence || 0)>=25)
    .map(d=>({factor:String(d.factor).toUpperCase(),delta:Number((Number(d.contribution || 0)-before[String(d.factor).toUpperCase()]).toFixed(4)),
      priorContribution:Number(before[String(d.factor).toUpperCase()].toFixed(4)),currentContribution:Number(Number(d.contribution || 0).toFixed(4))}))
    .filter(d=>Math.abs(d.delta)>=.03).sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta)).slice(0,3);
}

function hxSeasonalWatchForScore_(score, now) {
  const ss=SpreadsheetApp.getActive();
  const seasonal=ss.getSheetByName('Seasonality');
  const timing=ss.getSheetByName('Timing');
  return hxEvaluateSeasonalWatch_(score, seasonal ? hxRowsAsObjects_(seasonal) : [], timing ? hxRowsAsObjects_(timing) : [], now);
}

/** Seasonal context is emitted only for an active timing event, new regime, or material change. */
function hxEvaluateSeasonalWatch_(score, seasonalRows, timingRows, now) {
  const instrument=String(score.instrument || score.Instrument || '').toUpperCase();
  const direction=String(score.regime || score.label || score.Direction || 'Neutral');
  const aliases={SPX500:['SPX500','SPX'],NAS100:['NAS100','NDX'],RUSSELL2000:['RUSSELL2000','RUT'],XAGUSD:['XAGUSD','SILVER']};
  const ids=aliases[instrument] || [instrument];
  const assetMatches=value=>ids.indexOf(String(value || '').toUpperCase().replace(/_CFD$|_SPOT$/,''))>=0;
  const dayNames=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const day=dayNames[now.getUTCDay()];
  const timing=(timingRows || []).filter(r=>assetMatches(r.Asset) && String(r['Machine State'] || r.State || '').toLowerCase()===direction.toLowerCase());
  const windows=[];
  timing.forEach(r=>{
    [['high',r['Weekly High Window']],['low',r['Weekly Low Window']]].forEach(pair=>{
      const match=String(pair[1] || '').match(/^\s*([A-Za-z]+)\s*\(([\d.]+)%\)/);
      if (match && match[1]===day && Number(match[2])>=35) windows.push({kind:pair[0],day:match[1],pct:Number(match[2]),sample:hxFirstNumber_(r['Sample Size'])});
    });
  });
  if (windows.length) {
    windows.sort((a,b)=>b.pct-a.pct);
    const w=windows[0];
    return {instrument:instrument,title:instrument+' is in a historical weekly '+w.kind+' timing window.',
      detail:w.pct.toFixed(0)+'% of comparable '+direction.toLowerCase()+' weeks formed the weekly '+w.kind+' on '+w.day+'.',
      status:w.pct>=50?'WATCH':'DEVELOPING',sampleSize:w.sample,limitedSample:w.sample>0&&w.sample<20,bias:direction,kind:'timing'};
  }
  const monthNames=['January','February','March','April','May','June','July','August','September','October','November','December'];
  const month=monthNames[now.getUTCMonth()];
  const rows=(seasonalRows || []).filter(r=>assetMatches(r.Asset));
  const current=rows.find(r=>String(r.Month || '')===month);
  if (!current || String(current['Use in Final Read'] || '').toLowerCase()!=='yes' || String(current.Strength || '').toLowerCase()==='weak') return null;
  const notes=hxParseSeasonalNotes_(current.Notes);
  const entryWindow=hxWeekdayOrdinalInMonth_(now)<=5;
  const bias=String(current['Seasonal Bias'] || 'Neutral');
  const aligned=bias===direction && (direction==='Bullish' || direction==='Bearish');
  const contributionSign=Number(score.directionScore || 0)===0?0:Math.sign(Number(score.directionScore));
  const positioning=(score.explanationTrace && score.explanationTrace.factorContributions || []).some(d=>
    ['POSITIONING','COMMERCIAL'].indexOf(String(d.factor || '').toUpperCase())>=0 && Math.sign(Number(d.contribution || 0))===contributionSign && Math.abs(Number(d.contribution || 0))>=.05);
  if (!entryWindow && !(score.materialChange && aligned && positioning) && !(Number(score.regimeAgeTradingDays || 0)<=5 && bias!==direction)) return null;
  const ranges=rows.map(r=>hxParseSeasonalNotes_(r.Notes).avgRange).filter(v=>v!==null).sort((a,b)=>a-b);
  const expansionThreshold=ranges.length?ranges[Math.floor((ranges.length-1)*.75)]:null;
  let title, kind, status='DEVELOPING';
  if (notes.avgRange!==null && expansionThreshold!==null && notes.avgRange>=expansionThreshold && entryWindow) {
    title=instrument+' is entering a historical seasonal volatility-expansion window.'; kind='volatility'; status='WATCH';
  } else if (!aligned && bias!=='Neutral') {
    title=instrument+' is entering a historical seasonal reversal window.'; kind='reversal'; status='WATCH';
  } else if (positioning) {
    title='Positioning is aligning with a historically favorable seasonal period for '+instrument+'.'; kind='alignment';
  } else {
    title=instrument+' is entering a historically favorable seasonal period.'; kind='seasonal';
  }
  const detail=[];
  if (notes.winRate!==null) detail.push(notes.winRate.toFixed(0)+'% historical win rate');
  if (notes.sample!==null) detail.push(notes.sample+' annual observations');
  if (notes.avgRange!==null) detail.push(notes.avgRange.toFixed(1)+'% average monthly range');
  return {instrument:instrument,title:title,detail:detail.length?detail.join(' · ')+'.':'',status:status,sampleSize:notes.sample || 0,
    limitedSample:notes.sample!==null&&notes.sample<8,bias:bias,kind:kind};
}

function hxParseSeasonalNotes_(value) {
  const text=String(value || '');
  const sample=text.match(/Samples?\s+(\d+)/i), win=text.match(/Win\s+([\d.]+)%/i), range=text.match(/Avg range\s+([\d.]+)%/i);
  return {sample:sample?Number(sample[1]):null,winRate:win?Number(win[1]):null,avgRange:range?Number(range[1]):null};
}

function hxFirstNumber_(value) { const match=String(value || '').match(/[\d.]+/); return match?Number(match[0]):0; }

function hxWeekdayOrdinalInMonth_(date) {
  let count=0;
  for (let day=1;day<=date.getUTCDate();day++) {
    const d=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),day)).getUTCDay();
    if (d!==0 && d!==6) count++;
  }
  return count;
}
