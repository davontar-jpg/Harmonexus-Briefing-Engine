/** Supplemental relationship intelligence. These functions adjust briefing confidence/context only. */
function hxRelationshipIntelligence_(scores) {
  const macro = hxMacroConsensusEngine_(scores || []);
  const leadLag = hxLeadLagWatch_(scores || []);
  hxCacheRelationshipIntelligence_(macro, leadLag);
  return {macroConsensus:macro, leadLag:leadLag};
}

function hxMacroConsensusEngine_(scores) {
  const map = hxScoreMap_(scores || []);
  const relationships = [
    hxConsensusRelationship_('DXY ↔ Precious Metals', map.DXY, hxAggregateScores_(map, ['XAGUSD','GOLD','PLATINUM']), 'inverse',
      'DXY confirms precious metals.', 'DXY contradicts precious metals.'),
    hxConsensusRelationship_('Real Yields/Rates ↔ Precious Metals', hxAggregateScores_(map, ['US10Y','US5Y','US30Y']), hxAggregateScores_(map, ['XAGUSD','GOLD','PLATINUM']), 'inverse',
      'Declining rate pressure confirms precious metals.', 'Rate pressure contradicts precious metals.'),
    hxConsensusRelationship_('Treasury Yields ↔ Equities', hxAggregateScores_(map, ['US2Y','US5Y','US10Y','US30Y']), hxAggregateScores_(map, ['US30','SPX500','NAS100','RUSSELL2000']), 'inverse',
      'Treasury yield pressure confirms equity tone.', 'Treasury yield pressure contradicts equity tone.'),
    hxConsensusRelationship_('DXY ↔ Risk Assets', map.DXY, hxAggregateScores_(map, ['US30','SPX500','NAS100','RUSSELL2000','COPPER']), 'inverse',
      'DXY confirms risk assets.', 'DXY contradicts risk assets.'),
    hxConsensusRelationship_('Copper ↔ Global Growth Assets', map.COPPER, hxAggregateScores_(map, ['US30','SPX500','NAS100','RUSSELL2000']), 'direct',
      'Copper confirms global-growth assets.', 'Copper contradicts global-growth assets.'),
    hxConsensusRelationship_('DXY ↔ European FX', map.DXY, hxAggregateScores_(map, ['EURUSD','GBPUSD']), 'inverse',
      'DXY confirms European FX tone.', 'DXY contradicts European FX tone.'),
    hxConsensusRelationship_('DXY ↔ USD/JPY Complex', map.DXY, hxAggregateScores_(map, ['USDJPY','USDDKK']), 'direct',
      'DXY confirms USD complex tone.', 'DXY contradicts USD complex tone.')
  ];
  const evaluated = relationships.filter(r => r.status !== 'UNKNOWN');
  const confirmed = evaluated.filter(r => r.status === 'CONFIRMED');
  const contradicted = evaluated.filter(r => r.status === 'CONTRADICTED');
  const totalWeight = evaluated.reduce((n,r)=>n+r.weight,0);
  const confirmedWeight = confirmed.reduce((n,r)=>n+r.weight,0);
  const score = totalWeight ? hxClamp_(Math.round(100 * confirmedWeight / totalWeight), 0, 100) : null;
  const coverage = Math.round(100 * evaluated.length / relationships.length);
  const confidence = score === null ? 'Very Low' : hxConsensusConfidenceClass_(score, coverage, contradicted.length);
  return {
    score:score,
    confidence:confidence,
    coverage:coverage,
    evaluated:evaluated.length,
    unknown:relationships.length - evaluated.length,
    confirmations:confirmed.map(r=>r.confirmation).slice(0,4),
    contradictions:contradicted.map(r=>r.contradiction).slice(0,4),
    relationships:relationships
  };
}

function hxConsensusRelationship_(name, a, b, mode, confirmation, contradiction) {
  if (!a || !b) return {name:name,status:'UNKNOWN',weight:0,reason:'Missing relationship input.'};
  const av = hxRelationshipScoreValue_(a), bv = hxRelationshipScoreValue_(b);
  if (Math.abs(av) < .15 || Math.abs(bv) < .15) return {name:name,status:'UNKNOWN',weight:0,reason:'One side is neutral or insufficient.'};
  const aligned = mode === 'inverse' ? av * bv < 0 : av * bv > 0;
  const weight = Math.max(.05, Math.min(Math.abs(av), Math.abs(bv))) * Math.sqrt(Math.max(0, Number(a.confidence || 0)) * Math.max(0, Number(b.confidence || 0))) / 100;
  return {name:name,status:aligned?'CONFIRMED':'CONTRADICTED',weight:weight,mode:mode,
    confirmation:confirmation,contradiction:contradiction,
    left:a.instrument || a.name,right:b.instrument || b.name,leftValue:av,rightValue:bv,
    confidence:Math.round((Number(a.confidence || 0) + Number(b.confidence || 0)) / 2)};
}

function hxAggregateScores_(map, instruments) {
  const parts = (instruments || []).map(id => map[id]).filter(Boolean);
  if (!parts.length) return null;
  let weighted = 0, weight = 0, confidence = 0;
  parts.forEach(s => {
    const w = Math.max(.1, Math.abs(hxRelationshipScoreValue_(s))) + Math.max(20, Number(s.confidence || 0)) / 100;
    weighted += hxRelationshipScoreValue_(s) * w;
    confidence += Number(s.confidence || 0) * w;
    weight += w;
  });
  return {instrument:instruments.join('/'), name:instruments.join('/'), score:(weighted / (weight || 1)) * 10, confidence:Math.round(confidence / (weight || 1))};
}

function hxScoreMap_(scores) {
  return (scores || []).reduce((map, s) => {
    const id = String(s.instrument || s.Instrument || '').toUpperCase();
    if (id) map[id] = s;
    return map;
  }, {});
}

function hxRelationshipScoreValue_(score) {
  return hxClamp_(Number(score.score || score['Directional Score'] || 0) / 10, -1, 1);
}

function hxConsensusConfidenceClass_(score, coverage, contradictionCount) {
  const adjusted = hxClamp_(Number(score || 0) - (coverage < 70 ? 12 : 0) - contradictionCount * 5, 0, 100);
  if (adjusted >= 85) return 'Very High';
  if (adjusted >= 70) return 'High';
  if (adjusted >= 50) return 'Moderate';
  if (adjusted >= 30) return 'Low';
  return 'Very Low';
}

function hxLeadLagWatch_(scores, historyRows) {
  const history = historyRows || hxLoadScoreHistoryRows_();
  const supported = hxLeadLagRelationships_(history);
  const scoreMap = hxScoreMap_(scores || []);
  const active = supported.filter(r => {
    const leader = scoreMap[r.leader];
    return leader && Math.abs(Number(leader.score || leader['Directional Score'] || 0)) >= 1.5;
  }).sort((a,b)=>b.confidenceScore-a.confidenceScore);
  const usable = (active.length ? active : supported).slice(0,5);
  const leaders = hxUnique_(usable.map(r=>r.leader)).slice(0,4);
  const followers = hxUnique_(usable.map(r=>r.follower)).slice(0,4);
  const avg = usable.length ? Math.round(usable.reduce((n,r)=>n+r.confidenceScore,0)/usable.length) : 0;
  return {
    confidence:hxLeadLagConfidenceClass_(avg, usable.length),
    confidenceScore:avg,
    currentLeaders:leaders,
    currentFollowers:followers,
    relationships:usable,
    supportedCount:supported.length,
    note:supported.length ? 'Statistically supported relationships are used as confirmation context only.' : 'Insufficient synchronized history for statistically supported lead-lag relationships.'
  };
}

function hxLeadLagRelationships_(historyRows) {
  const rows = historyRows || [];
  if (rows.length < 60) return [];
  const series = hxLeadLagSeries_(rows);
  const candidates = hxLeadLagCandidatePairs_();
  const supported = [];
  candidates.forEach(pair => {
    const leader = series[pair[0]], follower = series[pair[1]];
    if (!leader || !follower) return;
    const aligned = hxAlignSeries_(leader, follower);
    if (aligned.length < 30) return;
    let best = null;
    for (let lag=1; lag<=5; lag++) {
      const stat = hxLagCorrelation_(aligned, lag);
      if (!stat || stat.n < 30) continue;
      if (!best || Math.abs(stat.correlation) > Math.abs(best.correlation)) best = Object.assign({lagDays:lag}, stat);
    }
    if (!best || Math.abs(best.correlation) < .35) return;
    const confidenceScore = hxClamp_(Math.round(Math.abs(best.correlation) * 70 + Math.min(best.n, 120) / 120 * 30), 0, 100);
    if (confidenceScore < 45) return;
    supported.push({leader:pair[0],follower:pair[1],lagDays:best.lagDays,correlation:Math.round(best.correlation*1000)/1000,
      sampleSize:best.n,confidenceScore:confidenceScore,confidence:hxLeadLagConfidenceClass_(confidenceScore,1)});
  });
  return supported.sort((a,b)=>b.confidenceScore-a.confidenceScore);
}

function hxLeadLagSeries_(rows) {
  const series = {};
  (rows || []).forEach(r => {
    const id = String(r.Instrument || r.instrument || '').toUpperCase();
    const date = hxRelationshipDateKey_(r['As Of'] || r.asOf || r.Timestamp);
    const rawScore = r['Directional Score'] !== undefined ? r['Directional Score'] : (r.score !== undefined ? r.score : r.DirectionScore);
    const score = hxNum_(rawScore);
    if (!id || !date || score === null) return;
    series[id] = series[id] || {};
    series[id][date] = score;
  });
  const out = {};
  Object.keys(series).forEach(id => {
    out[id] = Object.keys(series[id]).sort().map(date => ({date:date,value:Number(series[id][date])}));
  });
  return out;
}

function hxAlignSeries_(leader, follower) {
  const fMap = {};
  follower.forEach(p => fMap[p.date] = p.value);
  return leader.filter(p => fMap[p.date] !== undefined).map(p => ({date:p.date,leader:p.value,follower:fMap[p.date]}));
}

function hxLagCorrelation_(aligned, lag) {
  const xs = [], ys = [];
  for (let i=lag; i<aligned.length; i++) {
    xs.push(aligned[i-lag].leader);
    ys.push(aligned[i].follower);
  }
  const n = xs.length;
  if (n < 2) return null;
  const mx = xs.reduce((a,b)=>a+b,0)/n, my = ys.reduce((a,b)=>a+b,0)/n;
  let cov=0, vx=0, vy=0;
  for (let i=0; i<n; i++) {
    const dx=xs[i]-mx, dy=ys[i]-my;
    cov += dx*dy; vx += dx*dx; vy += dy*dy;
  }
  if (!vx || !vy) return null;
  return {correlation:cov/Math.sqrt(vx*vy), n:n};
}

function hxLeadLagCandidatePairs_() {
  return [
    ['DXY','XAGUSD'],['DXY','GOLD'],['DXY','PLATINUM'],['DXY','COPPER'],
    ['US10Y','GOLD'],['US10Y','XAGUSD'],['US10Y','SPX500'],['US10Y','NAS100'],['US10Y','US30'],['US10Y','RUSSELL2000'],
    ['US2Y','DXY'],['US2Y','USDJPY'],['US2Y','EURUSD'],['US2Y','GBPUSD'],
    ['US5Y','SPX500'],['US5Y','NAS100'],['US30Y','SPX500'],['US30Y','US30'],
    ['COPPER','SPX500'],['COPPER','NAS100'],['COPPER','RUSSELL2000'],['COPPER','US30']
  ];
}

function hxLeadLagConfidenceClass_(score, count) {
  if (!count || !score) return 'Very Low';
  if (score >= 85) return 'Very High';
  if (score >= 70) return 'High';
  if (score >= 55) return 'Moderate';
  if (score >= 40) return 'Low';
  return 'Very Low';
}

function hxLoadScoreHistoryRows_() {
  try {
    if (typeof SpreadsheetApp === 'undefined') return [];
    const sh = SpreadsheetApp.getActive().getSheetByName(HX.sheets.snapshots);
    return sh && sh.getLastRow() > 1 ? hxRowsAsObjects_(sh) : [];
  } catch (ignored) { return []; }
}

function hxRelationshipDateKey_(value) {
  const d = hxParseDate_(value);
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return y+'-'+m+'-'+day;
}

function hxUnique_(values) {
  const seen = {};
  return (values || []).filter(v => {
    const key = String(v || '');
    if (!key || seen[key]) return false;
    seen[key] = true;
    return true;
  });
}

function hxCacheRelationshipIntelligence_(macro, leadLag) {
  try {
    if (typeof SpreadsheetApp === 'undefined') return;
    const sh = hxSheet_('Relationship_Cache', ['Timestamp','Macro Consensus Score','Macro Confidence','Lead-Lag Confidence','Payload JSON']);
    hxAppendRows_(sh, [[new Date(), macro.score === null ? 'UNKNOWN' : macro.score, macro.confidence, leadLag.confidence, hxJson_({macroConsensus:macro, leadLag:leadLag})]]);
    hxTrimSheet_(sh, 500);
  } catch (error) {
    try { hxLog_('WARN','hxCacheRelationshipIntelligence_','SKIPPED',error.message,{}); } catch (ignored) {}
  }
}

function hxRelationshipBriefingLines_(intel) {
  const macro = (intel || {}).macroConsensus || {score:null,confidence:'Very Low',confirmations:[],contradictions:[]};
  const leadLag = (intel || {}).leadLag || {confidence:'Very Low',currentLeaders:[],currentFollowers:[],note:''};
  const lines = [];
  lines.push('', 'Macro Consensus', '');
  if (macro.score === null || Number(macro.evaluated || 0) === 0) {
    lines.push('Cross-Asset Consensus: unavailable — insufficient synchronized market data.');
  } else {
    lines.push('Consensus Score: ' + macro.score + '/100 (' + macro.confidence + ')');
    lines.push('', 'Primary Confirmations:');
    (macro.confirmations && macro.confirmations.length ? macro.confirmations : ['None.']).forEach(x => lines.push('- ' + x));
    lines.push('', 'Primary Contradictions:');
    (macro.contradictions && macro.contradictions.length ? macro.contradictions : ['None.']).forEach(x => lines.push('- ' + x));
  }
  lines.push('', 'Lead-Lag Watch', '');
  if (!leadLag.supportedCount) {
    lines.push('Lead-Lag Watch: unavailable — insufficient historical relationship data.');
  } else {
    lines.push('Current Leaders:');
    (leadLag.currentLeaders && leadLag.currentLeaders.length ? leadLag.currentLeaders : ['UNKNOWN']).forEach(x => lines.push('- ' + x));
    lines.push('', 'Current Followers:');
    (leadLag.currentFollowers && leadLag.currentFollowers.length ? leadLag.currentFollowers : ['UNKNOWN']).forEach(x => lines.push('- ' + x));
    lines.push('', 'Lead-Lag Confidence:', leadLag.confidence);
  }
  return lines;
}

function testRelationshipEngines() {
  const sample = [
    {instrument:'DXY',score:-4.5,confidence:82},
    {instrument:'GOLD',score:5.2,confidence:78},
    {instrument:'XAGUSD',score:4.7,confidence:76},
    {instrument:'US10Y',score:-3.9,confidence:74},
    {instrument:'SPX500',score:3.2,confidence:69},
    {instrument:'NAS100',score:3.6,confidence:71},
    {instrument:'COPPER',score:2.8,confidence:67}
  ];
  const macro = hxMacroConsensusEngine_(sample);
  if (macro.score === null || macro.score < 50) throw new Error('Macro consensus sample failed.');
  const leadLag = hxLeadLagWatch_(sample, []);
  if (leadLag.confidence !== 'Very Low') throw new Error('Lead-lag should remain low without sufficient history.');
  return {macroConsensus:macro, leadLag:leadLag};
}
