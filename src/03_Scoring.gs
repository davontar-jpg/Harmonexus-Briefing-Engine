/**
 * Converts normalized factor signals (-1 bearish to +1 bullish) into an auditable reading.
 * `directionScore` is signed (-10..10); `strength` is 1..10; label owns direction.
 */
function calculateInstrumentScore(instrument, factorSignals, previous) {
  const cfg = INSTRUMENTS[instrument];
  if (!cfg) throw new Error('Unknown instrument: ' + instrument);
  const drivers = [], contradictions = [];
  let weighted = 0, observedWeight = 0, totalWeight = 0;
  Object.keys(cfg.weights).forEach(factor => {
    const signedWeight = cfg.weights[factor];
    const absWeight = Math.abs(signedWeight);
    totalWeight += absWeight;
    const raw = factorSignals[factor];
    if (raw === undefined || raw === null || raw === '') return;
    const normalized = hxClamp_(raw, -HX.score.maxAbsSignal, HX.score.maxAbsSignal);
    const contribution = normalized * signedWeight;
    observedWeight += absWeight;
    weighted += contribution;
    drivers.push({factor:factor, signal:normalized, weight:signedWeight, contribution:contribution});
  });
  const coverage = totalWeight ? observedWeight / totalWeight : 0;
  const normalizedScore = observedWeight ? hxClamp_(weighted / observedWeight, -1, 1) : 0;
  const label = normalizedScore > HX.score.neutralBand ? 'Bullish' : normalizedScore < -HX.score.neutralBand ? 'Bearish' : 'Neutral';
  const strength = label === 'Neutral' ? 1 + (Math.abs(normalizedScore) / HX.score.neutralBand) * 3 : 4 + ((Math.abs(normalizedScore) - HX.score.neutralBand) / (1 - HX.score.neutralBand)) * 6;
  drivers.sort((a,b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  drivers.forEach(d => {
    if (d.contribution !== 0 && normalizedScore !== 0 && Math.sign(d.contribution) !== Math.sign(normalizedScore)) contradictions.push(d);
  });
  const prior = previous || {};
  const result = {
    instrument:instrument, name:cfg.name, family:cfg.family, label:label,
    strength:Number(hxClamp_(strength, 1, 10).toFixed(1)), directionScore:Number((normalizedScore * 10).toFixed(1)),
    confidence:Math.round(coverage * 100), coverage:Number(coverage.toFixed(3)),
    strongestDrivers:drivers.slice(0, 3), contradictions:contradictions.slice(0, 3),
    priorLabel:prior.label || '', priorStrength:prior.strength === undefined ? '' : prior.strength,
    scoreChange:prior.strength === undefined ? null : Number((strength - prior.strength).toFixed(1)), asOf:hxNowIso_()
  };
  result.materialChange = hxIsMaterialChange_(result, prior);
  return result;
}

function calculateAllScores() {
  return hxWithLock_(() => hxAuditRun_('calculateAllScores', () => {
  buildCalculatedSignals();
  const prior = hxLatestScores_();
  const signals = hxSignalsByInstrument_();
  const results = Object.keys(INSTRUMENTS).map(id => calculateInstrumentScore(id, signals[id] || {}, prior[id]));
  const headers = ['As Of','Instrument','Name','Family','Direction','Strength','Directional Score','Confidence','Strongest Drivers','Contradictions','Prior Direction','Prior Strength','Score Change','Material Change'];
  const rows = results.map(r => [new Date(r.asOf),r.instrument,r.name,r.family,r.label,r.strength,r.directionScore,r.confidence,hxJson_(r.strongestDrivers),hxJson_(r.contradictions),r.priorLabel,r.priorStrength,r.scoreChange,r.materialChange]);
  hxAtomicReplace_(hxSheet_(HX.sheets.scores), headers, rows);
  const history = hxSheet_(HX.sheets.snapshots, headers);
  hxAppendRows_(history, rows);
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
    all[id][String(row.Factor || '').toUpperCase()] = hxNum_(row['Normalized Signal']);
    return all;
  }, {});
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
