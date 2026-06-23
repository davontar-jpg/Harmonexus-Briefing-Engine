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
    normalizedScore:Number(normalizedScore.toFixed(4)),rawStrength:result.rawStrength,calibratedStrength:result.strength,cap:HX.score.strengthCaps[reliability.key],confidence:confidence};
  result.materialChange = hxIsMaterialChange_(result, prior);
  return result;
}

function calculateAllScores() {
  return hxWithLock_(() => hxAuditRun_('calculateAllScores', () => {
  buildCalculatedSignals();
  const prior = hxLatestScores_();
  const signals = hxSignalsByInstrument_();
  const results = Object.keys(INSTRUMENTS).map(id => calculateInstrumentScore(id, signals[id] || {}, prior[id]));
  const headers = ['As Of','Instrument','Name','Family','Direction','Strength','Raw Strength','Directional Score','Confidence','Reliability','Evidence Status','Strongest Drivers','Contradictions','Prior Direction','Prior Strength','Score Change','Material Change','Explanation Trace'];
  const rows = results.map(r => [new Date(r.asOf),r.instrument,r.name,r.family,r.label,r.strength,r.rawStrength,r.directionScore,r.confidence,r.reliability,r.evidenceStatus,hxJson_(r.strongestDrivers),hxJson_(r.contradictions),r.priorLabel,r.priorStrength,r.scoreChange,r.materialChange,hxJson_(r.explanationTrace)]);
  hxAtomicReplace_(hxSheet_(HX.sheets.scores), headers, rows);
  const history = hxSheet_(HX.sheets.snapshots, headers);
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
  return hxRowsAsObjects_(sh).reduce((o,r) => (o[String(r.Instrument)] = {label:r.Direction, strength:Number(r.Strength), confidence:Number(r.Confidence)}, o), {});
}

function hxIsMaterialChange_(current, prior) {
  if (!prior || !prior.label) return false;
  if (HX.materialChange.directionFlip && current.label !== prior.label && current.label !== 'Neutral' && prior.label !== 'Neutral') return true;
  if (Math.abs(current.strength - Number(prior.strength || 0)) >= HX.materialChange.scoreDelta) return true;
  return Math.abs(current.confidence - Number(prior.confidence || 0)) >= HX.materialChange.confidenceDelta;
}
