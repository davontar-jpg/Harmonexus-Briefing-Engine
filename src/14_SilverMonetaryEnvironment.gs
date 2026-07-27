/**
 * HEL-035 Monetary Environment interpretation engine.
 *
 * Pure, read-only adapter and deterministic classifier. It accepts snapshots
 * from the existing FRED_Raw, CFTC_Raw, and Calculated_Signals contracts.
 * No sheet, score, briefing, trigger, notification, or research state is
 * mutated by this module.
 */
const HX_SILVER_MONETARY_VERSION = 'HEL-035.monetary.1.0.0';

const HX_SILVER_MONETARY_REGIMES = Object.freeze([
  'supportive monetary environment',
  'restrictive monetary environment',
  'easing monetary pressure',
  'tightening monetary pressure',
  'dollar-led pressure',
  'real-yield-led pressure',
  'positioning-led fragility',
  'liquidation regime',
  'mixed monetary environment',
  'monetary decoupling',
  'insufficient evidence'
]);

const HX_SILVER_MONETARY_REQUIRED_METRICS = Object.freeze([
  'dollar_pressure',
  'nominal_yield_pressure',
  'real_yield_pressure',
  'yield_curve_state',
  'positioning',
  'cot_context',
  'open_interest',
  'silver_response'
]);

function hxMonetaryNum_(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return isFinite(number) ? number : null;
}

function hxMonetaryField_(row, names) {
  row = row || {};
  for (let i = 0; i < names.length; i++) {
    if (Object.prototype.hasOwnProperty.call(row, names[i])) return row[names[i]];
  }
  return null;
}

function hxMonetaryRows_(snapshot, names) {
  snapshot = snapshot || {};
  for (let i = 0; i < names.length; i++) {
    if (Array.isArray(snapshot[names[i]])) return snapshot[names[i]].slice();
  }
  return [];
}

function hxMonetaryDirection_(value, threshold) {
  value = hxMonetaryNum_(value);
  threshold = threshold === undefined ? .02 : Number(threshold);
  if (value === null) return 'unavailable';
  if (value > threshold) return 'rising';
  if (value < -threshold) return 'falling';
  return 'stable';
}

function hxMonetaryRelationship_(direction, risingIsChallenge) {
  if (direction === 'unavailable') return 'observation only';
  if (direction === 'stable') return 'neutral';
  const challenging = risingIsChallenge ? direction === 'rising' : direction === 'falling';
  return challenging ? 'challenging' : 'supportive';
}

function hxMonetarySourceStatus_(value) {
  return value === null || value === undefined ? 'unavailable' : 'available';
}

function hxMonetaryFreshness_(policyId, timestamp, evaluatedAt, publicationDelayed) {
  return hxSilverResolveFreshness_({
    policy_id: policyId,
    observation_timestamp: timestamp,
    evaluated_at: evaluatedAt,
    publication_delayed: publicationDelayed === true
  });
}

function hxMonetaryEvidence_(input) {
  const missing = input.value === null || input.value === undefined;
  return hxSilverEvidence_({
    evidence_id: input.metric + '|' + (input.timestamp || 'unavailable'),
    evidence_kind: input.kind,
    canonical_metric: input.metric,
    value: missing ? null : input.value,
    unit: input.unit || 'state',
    direction: missing ? 'unavailable' : input.direction,
    silver_relationship: missing ? 'observation only' : input.relationship,
    reference_interval: input.interval || '1d',
    timestamp: input.timestamp || null,
    source: input.source || 'Harmonexus production path unavailable',
    provider: input.provider || 'Harmonexus production',
    evidence_state: missing ? 'placeholder' : 'production_authoritative',
    source_status: missing ? 'unavailable' : (input.source_status || 'available'),
    freshness_status: missing ? 'unknown' : input.freshness.status,
    quality: missing ? 'unknown' : (input.quality || 'high'),
    provider_quality: missing ? 'unknown' : (input.provider_quality || input.quality || 'high'),
    interpretive_weight: missing ? 0 : input.weight,
    reason_codes: (input.reason_codes || []).concat(missing ? ['MONETARY_INPUT_UNAVAILABLE'] : [input.freshness.reason_code]),
    limitations: input.limitations || [],
    provenance_pointer: input.provenance_pointer || '',
    transformations: input.transformations || [],
    metadata: input.metadata || {}
  });
}

function hxMonetaryLatestRows_(rows, dateFields) {
  return rows.filter(row => hxSilverIso_(hxMonetaryField_(row, dateFields))).sort((a, b) =>
    String(hxMonetaryField_(b, dateFields)).localeCompare(String(hxMonetaryField_(a, dateFields))));
}

function hxMonetaryFindSignal_(rows, instrument, factor) {
  const matches = rows.filter(row =>
    String(hxMonetaryField_(row, ['Instrument', 'instrument']) || '').toUpperCase() === instrument &&
    String(hxMonetaryField_(row, ['Factor', 'factor']) || '').toUpperCase() === factor);
  return hxMonetaryLatestRows_(matches, ['As Of', 'as_of', 'Timestamp', 'timestamp'])[0] || null;
}

function hxMonetaryDollar_(snapshot, evaluatedAt) {
  const signals = hxMonetaryRows_(snapshot, ['Calculated_Signals', 'calculated_signals']);
  let row = hxMonetaryFindSignal_(signals, 'XAGUSD', 'DXY');
  let proxy = false;
  if (!row && snapshot.dollar_proxy) {
    row = snapshot.dollar_proxy;
    proxy = true;
  }
  const signal = row ? hxMonetaryNum_(hxMonetaryField_(row, ['Normalized Signal', 'normalized_signal', 'signal', 'value'])) : null;
  const timestamp = row ? hxSilverIso_(hxMonetaryField_(row, ['As Of', 'as_of', 'Timestamp', 'timestamp'])) : null;
  const source = row ? String(hxMonetaryField_(row, ['Source', 'source']) || 'Calculated_Signals') : null;
  const directWebhook = source && source.toLowerCase().indexOf('webhook') >= 0;
  const freshness = hxMonetaryFreshness_(directWebhook ? 'live_market' : 'manual_structure', timestamp, evaluatedAt);
  const direction = hxMonetaryDirection_(signal, .15);
  const state = signal === null ? 'dollar evidence unavailable' :
    direction === 'rising' ? 'dollar pressure increasing' :
    direction === 'falling' ? 'dollar pressure easing' : 'dollar pressure stable';
  const limitations = [];
  const reasons = [];
  if (proxy || (source && source.toLowerCase().indexOf('legacy') >= 0)) {
    limitations.push('dollar proxy input');
    reasons.push('DOLLAR_PROXY_ONLY');
    proxy = true;
  }
  return {
    state: state,
    direction: direction,
    signal: signal,
    timestamp: timestamp,
    proxy: proxy,
    freshness: freshness,
    evidence: hxMonetaryEvidence_({
      metric: 'dollar_pressure',
      kind: 'dollar_state',
      value: signal,
      unit: 'normalized_signal',
      direction: direction,
      relationship: hxMonetaryRelationship_(direction, true),
      interval: directWebhook ? 'event' : 'production_snapshot',
      timestamp: timestamp,
      source: source,
      provider: source || null,
      freshness: freshness,
      quality: proxy ? 'low' : 'high',
      weight: 1.1,
      reason_codes: reasons,
      limitations: limitations,
      provenance_pointer: row ? 'Calculated_Signals:XAGUSD|DXY' : '',
      transformations: ['selected latest XAGUSD DXY factor', 'classified normalized dollar pressure'],
      metadata: {proxy:proxy}
    })
  };
}

function hxMonetaryFred_(snapshot, evaluatedAt) {
  const rows = hxMonetaryLatestRows_(
    hxMonetaryRows_(snapshot, ['FRED_Raw', 'fred_raw']),
    ['Date', 'date']
  );
  const latest = rows[0] || null;
  const prior = rows[1] || null;
  const timestamp = latest ? hxSilverIso_(hxMonetaryField_(latest, ['Date', 'date'])) : null;
  const freshness = hxMonetaryFreshness_('fred_daily', timestamp, evaluatedAt);
  const series = {};
  ['US2Y', 'US5Y', 'US10Y', 'US30Y', 'REAL10Y'].forEach(metric => {
    const current = latest ? hxMonetaryNum_(hxMonetaryField_(latest, [metric])) : null;
    const previous = prior ? hxMonetaryNum_(hxMonetaryField_(prior, [metric])) : null;
    series[metric] = {
      current: current,
      previous: previous,
      change: current === null || previous === null ? null : Number((current - previous).toFixed(4))
    };
  });
  const nominalChanges = ['US2Y', 'US5Y', 'US10Y', 'US30Y']
    .map(metric => series[metric].change).filter(value => value !== null);
  const averageChange = nominalChanges.length ?
    nominalChanges.reduce((sum, value) => sum + value, 0) / nominalChanges.length : null;
  const direction = hxMonetaryDirection_(averageChange, .015);
  const front = hxMonetaryDirection_(series.US2Y.change, .015);
  const intermediateChange = series.US5Y.change === null || series.US10Y.change === null ?
    null : (series.US5Y.change + series.US10Y.change) / 2;
  const intermediate = hxMonetaryDirection_(intermediateChange, .015);
  const long = hxMonetaryDirection_(series.US30Y.change, .015);
  const shift = [front, intermediate, long].every(value => value === 'rising') ? 'parallel rise' :
    [front, intermediate, long].every(value => value === 'falling') ? 'parallel decline' :
    [front, intermediate, long].every(value => value === 'stable') ? 'stable curve levels' : 'non-parallel shift';
  const nominalState = averageChange === null ? 'nominal-yield evidence unavailable' :
    direction === 'rising' ? 'nominal-yield pressure increasing' :
    direction === 'falling' ? 'nominal-yield pressure easing' : 'nominal-yield pressure stable';

  const realDirection = hxMonetaryDirection_(series.REAL10Y.change, .015);
  const realState = series.REAL10Y.change === null ? 'real-yield data unavailable' :
    realDirection === 'rising' ? 'monetary headwind increasing' :
    realDirection === 'falling' ? 'monetary headwind easing' : 'real-yield pressure stable';

  const currentSpread = series.US10Y.current === null || series.US2Y.current === null ?
    null : Number((series.US10Y.current - series.US2Y.current).toFixed(4));
  const priorSpread = series.US10Y.previous === null || series.US2Y.previous === null ?
    null : Number((series.US10Y.previous - series.US2Y.previous).toFixed(4));
  const spreadChange = currentSpread === null || priorSpread === null ?
    null : Number((currentSpread - priorSpread).toFixed(4));
  const curveDirection = hxMonetaryDirection_(spreadChange, .015);
  let curveState = 'yield-curve evidence unavailable';
  if (currentSpread !== null) {
    const shape = currentSpread < 0 ? 'inverted' : Math.abs(currentSpread) <= .1 ? 'near flat' : 'positive';
    if (curveDirection === 'rising') {
      curveState = averageChange !== null && averageChange < -.015 ? 'bull steepening' :
        averageChange !== null && averageChange > .015 ? 'bear steepening' : 'curve steepening';
    } else if (curveDirection === 'falling') {
      curveState = 'curve flattening';
    } else {
      curveState = shape + ' curve stable';
    }
    if (shape === 'inverted' && curveDirection === 'rising') curveState += ' from inversion';
  }
  const curveRelationship = curveState.indexOf('bear steepening') >= 0 || curveState.indexOf('flattening') >= 0 ?
    'mildly challenging' : curveState.indexOf('bull steepening') >= 0 ? 'mildly supportive' : 'neutral';

  const provider = latest ? String(hxMonetaryField_(latest, ['Source', 'source']) || 'FRED public CSV') : null;
  const nominalEvidence = hxMonetaryEvidence_({
    metric: 'nominal_yield_pressure',
    kind: 'yields',
    value: averageChange,
    unit: 'percentage_points',
    direction: direction,
    relationship: hxMonetaryRelationship_(direction, true),
    timestamp: timestamp,
    source: provider,
    provider: provider,
    freshness: freshness,
    quality: 'high',
    weight: 1,
    provenance_pointer: 'FRED_Raw:US2Y,US5Y,US10Y,US30Y',
    transformations: ['latest-minus-prior daily change', 'front/intermediate/long segmentation'],
    metadata: {front_end:front, intermediate:intermediate, long_end:long, shift:shift, series:series}
  });
  const realEvidence = hxMonetaryEvidence_({
    metric: 'real_yield_pressure',
    kind: 'yields',
    value: series.REAL10Y.change,
    unit: 'percentage_points',
    direction: realDirection,
    relationship: hxMonetaryRelationship_(realDirection, true),
    timestamp: timestamp,
    source: provider,
    provider: provider,
    freshness: freshness,
    quality: 'high',
    weight: 1.3,
    provenance_pointer: 'FRED_Raw:REAL10Y/DFII10',
    transformations: ['latest-minus-prior daily change', 'classified 10Y real-yield pressure'],
    limitations: series.REAL10Y.change === null ? ['real-yield data unavailable'] : []
  });
  const curveEvidence = hxMonetaryEvidence_({
    metric: 'yield_curve_state',
    kind: 'yields',
    value: currentSpread,
    unit: 'percentage_points_10y_minus_2y',
    direction: curveDirection,
    relationship: curveRelationship,
    timestamp: timestamp,
    source: provider,
    provider: provider,
    freshness: freshness,
    quality: 'high',
    weight: .65,
    provenance_pointer: 'FRED_Raw:US2Y,US10Y',
    transformations: ['computed 10Y minus 2Y spread', 'classified curve change with average nominal-yield direction'],
    metadata: {spread_10y_2y:currentSpread, prior_spread_10y_2y:priorSpread, spread_change:spreadChange}
  });
  return {
    timestamp: timestamp,
    freshness: freshness,
    series: series,
    nominal: {state:nominalState, direction:direction, average_change:averageChange, front_end:front, intermediate:intermediate, long_end:long, shift:shift},
    real: {state:realState, direction:realDirection, change:series.REAL10Y.change, level:series.REAL10Y.current},
    curve: {state:curveState, direction:curveDirection, spread_10y_2y:currentSpread, spread_change:spreadChange},
    evidence: [nominalEvidence, realEvidence, curveEvidence]
  };
}

function hxMonetaryPercentile_(values, current) {
  const valid = values.filter(value => value !== null).sort((a, b) => a - b);
  if (current === null || valid.length < 5) return null;
  const belowOrEqual = valid.filter(value => value <= current).length;
  return Number((100 * belowOrEqual / valid.length).toFixed(1));
}

function hxMonetaryCftc_(snapshot, evaluatedAt) {
  const rows = hxMonetaryLatestRows_(
    hxMonetaryRows_(snapshot, ['CFTC_Raw', 'cftc_raw']).filter(row =>
      String(hxMonetaryField_(row, ['Instrument', 'instrument']) || '').toUpperCase() === 'XAGUSD' &&
      String(hxMonetaryField_(row, ['Report Date', 'report_date']) || '').toUpperCase() !== 'ERROR'),
    ['Report Date', 'report_date']
  );
  const latest = rows[0] || null;
  const prior = rows[1] || null;
  const reportDate = latest ? hxSilverIso_(hxMonetaryField_(latest, ['Report Date', 'report_date'])) : null;
  const freshness = hxMonetaryFreshness_('cot_weekly', reportDate, evaluatedAt, false);
  const net = row => {
    if (!row) return null;
    const long = hxMonetaryNum_(hxMonetaryField_(row, ['Managed Money Long', 'managed_money_long']));
    const short = hxMonetaryNum_(hxMonetaryField_(row, ['Managed Money Short', 'managed_money_short']));
    return long === null || short === null ? null : long - short;
  };
  const commercialNet = row => {
    if (!row) return null;
    const long = hxMonetaryNum_(hxMonetaryField_(row, ['Commercial Long', 'commercial_long']));
    const short = hxMonetaryNum_(hxMonetaryField_(row, ['Commercial Short', 'commercial_short']));
    return long === null || short === null ? null : long - short;
  };
  const managed = net(latest), priorManaged = net(prior);
  const managedChange = managed === null || priorManaged === null ? null : managed - priorManaged;
  const commercial = commercialNet(latest), priorCommercial = commercialNet(prior);
  const commercialChange = commercial === null || priorCommercial === null ? null : commercial - priorCommercial;
  const oi = latest ? hxMonetaryNum_(hxMonetaryField_(latest, ['Open Interest', 'open_interest'])) : null;
  const priorOi = prior ? hxMonetaryNum_(hxMonetaryField_(prior, ['Open Interest', 'open_interest'])) : null;
  const oiChange = oi === null || priorOi === null ? null : oi - priorOi;
  const oiPct = oiChange === null || !priorOi ? null : oiChange / Math.abs(priorOi);
  const percentile = hxMonetaryPercentile_(rows.map(net), managed);
  const positioningDirection = hxMonetaryDirection_(managedChange, Math.max(Math.abs(priorOi || 0) * .005, 500));
  const positioningState = managedChange === null ? 'positioning unavailable' :
    positioningDirection === 'rising' ? 'managed-money net positioning expanding' :
    positioningDirection === 'falling' ? 'managed-money net positioning contracting' :
    'managed-money net positioning stable';
  const provider = latest ? String(hxMonetaryField_(latest, ['Source', 'source']) || 'CFTC public report') : null;
  const commonLimitations = latest ? ['publication lag applies', 'weekly futures positioning is not live'] : ['COT unavailable'];
  const positioningEvidence = hxMonetaryEvidence_({
    metric: 'positioning',
    kind: 'cot_positioning',
    value: managedChange,
    unit: 'contracts',
    direction: positioningDirection,
    relationship: hxMonetaryRelationship_(positioningDirection, false),
    interval: 'weekly',
    timestamp: reportDate,
    source: provider,
    provider: provider,
    freshness: freshness,
    quality: 'high',
    weight: .8,
    reason_codes: latest ? ['COT_PUBLICATION_LAG'] : [],
    limitations: commonLimitations,
    provenance_pointer: 'CFTC_Raw:XAGUSD:managed_money',
    transformations: ['managed money long minus short', 'latest report minus prior report', 'historical percentile when sample permits'],
    metadata: {net:managed, change:managedChange, percentile:percentile, commercial_net:commercial, commercial_change:commercialChange}
  });
  return {
    report_date: reportDate,
    freshness: freshness,
    positioning: {
      state: positioningState,
      managed_money_net: managed,
      managed_money_change: managedChange,
      managed_money_percentile: percentile,
      commercial_net: commercial,
      commercial_change: commercialChange
    },
    cot_context: reportDate ?
      'CFTC silver report dated ' + reportDate.slice(0, 10) + '; weekly publication lag applies.' :
      'COT evidence unavailable; no current positioning conclusion.',
    oi: {current:oi, prior:priorOi, change:oiChange, pct_change:oiPct},
    evidence: positioningEvidence,
    source: provider
  };
}

function hxMonetarySilverResponse_(snapshot, evaluatedAt) {
  const market = snapshot.market || snapshot.silver_market || {};
  const value = hxMonetaryNum_(hxMonetaryField_(market, ['silver_return', 'return', 'price_return']));
  const timestamp = hxSilverIso_(hxMonetaryField_(market, ['timestamp', 'as_of']));
  const freshness = hxMonetaryFreshness_('live_market', timestamp, evaluatedAt);
  const direction = hxMonetaryDirection_(value, .001);
  const source = value === null ? null : String(hxMonetaryField_(market, ['source']) || 'current production silver market');
  return {
    value: value,
    direction: direction,
    timestamp: timestamp,
    volume_change: hxMonetaryNum_(hxMonetaryField_(market, ['volume_change'])),
    futures_roll: hxMonetaryField_(market, ['futures_roll']) === true,
    freshness: freshness,
    evidence: hxMonetaryEvidence_({
      metric: 'silver_response',
      kind: 'market_return',
      value: value,
      unit: 'decimal_return',
      direction: direction,
      relationship: hxMonetaryRelationship_(direction, false),
      interval: String(hxMonetaryField_(market, ['interval']) || '1d'),
      timestamp: timestamp,
      source: source,
      provider: value === null ? null : String(hxMonetaryField_(market, ['provider']) || source),
      freshness: freshness,
      quality: String(hxMonetaryField_(market, ['quality']) || 'high'),
      weight: 1,
      provenance_pointer: String(hxMonetaryField_(market, ['provenance_pointer']) || 'production:silver_response'),
      transformations: ['classified current silver return response']
    })
  };
}

function hxMonetaryOpenInterest_(cftc, silver) {
  const priceDirection = silver.direction;
  const oiDirection = hxMonetaryDirection_(cftc.oi.pct_change, .005);
  let state = 'open-interest evidence unavailable';
  let participation = 'participation quality unavailable';
  let relationship = 'observation only';
  if (priceDirection !== 'unavailable' && oiDirection !== 'unavailable') {
    if (priceDirection === 'rising' && oiDirection === 'rising') {
      state = 'price rising with open interest rising';
      participation = 'possible new participation or trend commitment';
      relationship = 'supportive';
    } else if (priceDirection === 'rising' && oiDirection === 'falling') {
      state = 'price rising with open interest falling';
      participation = 'possible short covering or participation contraction';
      relationship = 'mildly challenging';
    } else if (priceDirection === 'falling' && oiDirection === 'rising') {
      state = 'price falling with open interest rising';
      participation = 'possible new short participation or hedging pressure';
      relationship = 'challenging';
    } else if (priceDirection === 'falling' && oiDirection === 'falling') {
      state = 'price falling with open interest falling';
      participation = 'possible liquidation or position reduction';
      relationship = 'challenging';
    } else {
      state = 'price or open interest stable';
      participation = 'participation change is not directional';
      relationship = 'neutral';
    }
  } else if (cftc.oi.current !== null && priceDirection === 'unavailable') {
    state = 'open interest available; silver response unavailable';
    participation = 'joint participation interpretation requires a current silver response';
  }
  const limitations = ['weekly CFTC open interest is not a live exchange feed'];
  const reasons = ['OPEN_INTEREST_WEEKLY_TIMING'];
  if (silver.volume_change === null) {
    limitations.push('volume unavailable');
    reasons.push('VOLUME_UNAVAILABLE');
  }
  if (silver.futures_roll) {
    limitations.push('futures roll may affect open-interest change');
    reasons.push('FUTURES_ROLL_CONTEXT');
  }
  const value = cftc.oi.pct_change === null ? null : {
    price_return: silver.value,
    open_interest_change: cftc.oi.change,
    open_interest_pct_change: cftc.oi.pct_change,
    volume_change: silver.volume_change
  };
  return {
    state: state,
    participation_quality: participation,
    direction: oiDirection,
    evidence: hxMonetaryEvidence_({
      metric: 'open_interest',
      kind: 'open_interest',
      value: value,
      unit: 'joint_price_open_interest_state',
      direction: oiDirection,
      relationship: relationship,
      interval: 'weekly_cot_with_current_price_response',
      timestamp: cftc.report_date,
      source: cftc.source,
      provider: cftc.source,
      freshness: cftc.freshness,
      quality: 'medium',
      weight: .75,
      reason_codes: reasons,
      limitations: limitations,
      provenance_pointer: 'CFTC_Raw:XAGUSD:open_interest',
      transformations: ['latest open interest minus prior report', 'joined with separately timestamped silver return'],
      metadata: {source_timing_differs:true, futures_roll:silver.futures_roll}
    })
  };
}

function hxMonetarySide_(direction) {
  if (direction === 'falling') return 1;
  if (direction === 'rising') return -1;
  return 0;
}

function hxMonetaryClassifyRegime_(dollar, fred, cftc, oi, silver) {
  const dollarSide = hxMonetarySide_(dollar.direction);
  const nominalSide = hxMonetarySide_(fred.nominal.direction);
  const realSide = hxMonetarySide_(fred.real.direction);
  const available = [dollar.direction, fred.nominal.direction, fred.real.direction]
    .filter(value => value !== 'unavailable').length;
  if (!available) return 'insufficient evidence';
  const restrictive = [dollarSide, nominalSide, realSide].filter(value => value < 0).length;
  const supportive = [dollarSide, nominalSide, realSide].filter(value => value > 0).length;
  if (restrictive >= 2 && silver.direction === 'rising') return 'monetary decoupling';
  if (supportive >= 2 && silver.direction === 'falling') return 'monetary decoupling';
  if (dollarSide < 0 && realSide < 0) return nominalSide < 0 ? 'restrictive monetary environment' : 'tightening monetary pressure';
  if (dollarSide > 0 && realSide > 0) return nominalSide > 0 ? 'supportive monetary environment' : 'easing monetary pressure';
  if (oi.state === 'price falling with open interest falling') return 'liquidation regime';
  if (cftc.positioning.managed_money_percentile !== null &&
      cftc.positioning.managed_money_percentile >= 90 &&
      (silver.direction === 'falling' || oi.direction === 'falling')) return 'positioning-led fragility';
  if (restrictive >= 2) return 'tightening monetary pressure';
  if (supportive >= 2) return 'easing monetary pressure';
  if (dollarSide < 0 && realSide >= 0) return 'dollar-led pressure';
  if (realSide < 0 && dollarSide >= 0) return 'real-yield-led pressure';
  return 'mixed monetary environment';
}

function hxMonetaryContradictions_(dollar, fred, cftc, oi, silver, evidence, missing) {
  const conflicts = [];
  if (dollar.direction === 'rising' && fred.real.direction === 'falling')
    conflicts.push('Dollar pressure is increasing while real-yield pressure is easing.');
  if (dollar.direction === 'falling' && fred.nominal.direction === 'rising')
    conflicts.push('Dollar pressure is easing while nominal yields are rising.');
  const restrictive = [dollar.direction, fred.nominal.direction, fred.real.direction].filter(value => value === 'rising').length;
  const supportive = [dollar.direction, fred.nominal.direction, fred.real.direction].filter(value => value === 'falling').length;
  if (restrictive >= 2 && silver.direction === 'rising')
    conflicts.push('Silver is rising despite restrictive monetary pressure.');
  if (supportive >= 2 && silver.direction === 'falling')
    conflicts.push('Silver is falling despite easing monetary pressure.');
  if (cftc.positioning.managed_money_change !== null && cftc.positioning.managed_money_change > 0 && oi.direction === 'falling')
    conflicts.push('Managed-money positioning is expanding while open interest contracts.');
  if (fred.nominal.direction !== 'unavailable' && fred.real.direction !== 'unavailable' &&
      fred.nominal.direction !== 'stable' && fred.real.direction !== 'stable' &&
      fred.nominal.direction !== fred.real.direction)
    conflicts.push('Nominal-yield and real-yield pressure disagree.');
  if (cftc.freshness.status === 'stale' && silver.freshness.status === 'current')
    conflicts.push('Current silver evidence is paired with stale COT evidence.');

  const eligible = evidence.filter(item => item.eligibility.contextual_interpretation);
  const ranked = eligible.slice().sort((a, b) =>
    Number(b.interpretive_weight || 0) - Number(a.interpretive_weight || 0) ||
    String(a.canonical_metric).localeCompare(String(b.canonical_metric)));
  const dominant = ranked[0] || null;
  let status = conflicts.length ? 'material_disagreement' : 'agreement';
  if (!eligible.length) status = 'missing_evidence';
  else if (conflicts.length >= 2 && (!dominant || Number(dominant.interpretive_weight || 0) < 1)) status = 'unresolved_conflict';
  else if (missing.length && !conflicts.length) status = 'partial_agreement';
  return {
    status: status,
    dominant_driver: dominant ? dominant.canonical_metric : 'none',
    secondary_conflicts: conflicts,
    confidence_impact: status === 'unresolved_conflict' ? 'reduce two levels' :
      status === 'material_disagreement' ? 'reduce one level' :
      status === 'missing_evidence' ? 'confidence unavailable' : 'none',
    required_confirmation: status === 'missing_evidence' ? 'Acquire current dollar, yield, and silver-response evidence.' :
      conflicts.length ? 'Confirm whether ' + (dominant ? dominant.canonical_metric : 'the monetary complex') +
        ' persists while the identified conflict resolves.' :
      'Confirm persistence in current dollar, real-yield, and silver-response evidence.',
    missing_metrics: missing
  };
}

function hxMonetarySilverImpact_(regime, dollar, fred, oi, silver) {
  if (regime === 'insufficient evidence') return 'No defensible silver conclusion because monetary evidence is unavailable.';
  const restrictive = [dollar.direction, fred.nominal.direction, fred.real.direction].filter(value => value === 'rising').length;
  const supportive = [dollar.direction, fred.nominal.direction, fred.real.direction].filter(value => value === 'falling').length;
  if (restrictive >= 2 && silver.direction === 'rising')
    return 'Silver is demonstrating resilience against restrictive monetary conditions; structural confirmation remains required.';
  if (supportive >= 2 && silver.direction === 'falling')
    return 'Silver is failing to respond to supportive monetary conditions; caution is warranted.';
  if (oi.state === 'price rising with open interest falling')
    return 'Silver is rising, but open interest suggests covering or participation contraction rather than broad confirmation.';
  if (oi.state === 'price rising with open interest rising')
    return 'Monetary conditions and broader futures participation support continuation, subject to market-structure confirmation.';
  if (oi.state === 'price falling with open interest rising')
    return 'Monetary pressure challenges silver while open interest is consistent with new short participation or hedging pressure.';
  if (oi.state === 'price falling with open interest falling')
    return 'Silver weakness is accompanied by liquidation or position reduction; reversal risk requires structural confirmation.';
  if (supportive >= 2) return 'Monetary conditions support silver continuation, but confirmation from silver response and structure is required.';
  if (restrictive >= 2) return 'Monetary pressure challenges the silver thesis and creates a monetary headwind.';
  return 'Monetary evidence is mixed and requires structural confirmation before increasing conviction.';
}

function hxMonetaryActionBias_(regime, silverImpact, confidence, contradiction, sourceStatus, freshnessStatus) {
  if (sourceStatus === 'unavailable' || sourceStatus === 'blocked' || sourceStatus === 'failed') return 'unavailable';
  if (freshnessStatus === 'stale' || freshnessStatus === 'unknown' || contradiction.status === 'missing_evidence')
    return 'no_operational_conclusion';
  if (contradiction.status === 'unresolved_conflict') return 'no_operational_conclusion';
  if (silverImpact.indexOf('failing to respond') >= 0) return 'caution';
  if (regime === 'liquidation regime') return 'reversal_risk_elevated';
  if (regime === 'restrictive monetary environment' || regime === 'tightening monetary pressure' ||
      regime === 'dollar-led pressure' || regime === 'real-yield-led pressure') return 'monetary_headwind';
  if (regime === 'monetary decoupling') return 'supportive_confirmation_required';
  if (regime === 'supportive monetary environment' || regime === 'easing monetary pressure') {
    return ['high', 'very high'].indexOf(confidence.label) >= 0 &&
      silverImpact.indexOf('support continuation') >= 0 ? 'continuation_favored' : 'supportive_confirmation_required';
  }
  return 'neutral';
}

function hxMonetaryPrimaryFreshness_(evidence) {
  const primary = evidence.filter(item =>
    ['dollar_pressure', 'nominal_yield_pressure', 'real_yield_pressure', 'yield_curve_state']
      .indexOf(item.canonical_metric) >= 0 && item.source_status === 'available');
  return primary.length ? hxSilverAggregateFreshness_(primary) : 'unknown';
}

function hxMonetaryFreshnessDisclosure_(items) {
  const out = {};
  items.forEach(item => {
    out[item.canonical_metric] = {
      timestamp: item.timestamp,
      freshness_status: item.freshness_status,
      source_status: item.source_status,
      proxy: item.metadata && item.metadata.proxy === true,
      reason_codes: item.reason_codes
    };
  });
  return out;
}

function hxSilverRenderMonetaryLong_(interpretation) {
  const monetary = interpretation.monetary_environment;
  const freshness = monetary.data_freshness;
  const lines = [
    'MONETARY ENVIRONMENT',
    'Target: XAGUSD / SILVER',
    'As Of: ' + interpretation.as_of,
    'Status: ' + interpretation.source_status + ' / ' + interpretation.freshness_status,
    '',
    'Current State: ' + interpretation.current_state,
    'Dollar Pressure: ' + monetary.dollar_pressure,
    'Nominal-Yield Pressure: ' + monetary.nominal_yield_pressure,
    'Real-Yield Pressure: ' + monetary.real_yield_pressure,
    'Yield-Curve State: ' + monetary.yield_curve_state,
    'Positioning: ' + monetary.positioning,
    'COT Context: ' + monetary.cot_context,
    'Open Interest: ' + monetary.open_interest,
    'Participation Quality: ' + monetary.participation_quality,
    '',
    'Interpretation: ' + interpretation.interpretation,
    'Silver Impact: ' + interpretation.silver_impact,
    'Primary Support: ' + interpretation.primary_support,
    'Primary Challenge: ' + interpretation.primary_challenge,
    'Data Freshness: dollar ' + freshness.dollar_pressure.freshness_status +
      '; nominal yields ' + freshness.nominal_yield_pressure.freshness_status +
      '; real yield ' + freshness.real_yield_pressure.freshness_status +
      '; curve ' + freshness.yield_curve_state.freshness_status +
      '; COT ' + freshness.positioning.freshness_status +
      '; open interest ' + freshness.open_interest.freshness_status + '.',
    '',
    'Action Bias: ' + hxSilverOperationalLanguage_(interpretation.action_bias),
    'Primary Risk: ' + interpretation.primary_risk,
    'Required Confirmation: ' + interpretation.required_confirmation,
    'Confidence: ' + hxSilverConfidenceText_(interpretation)
  ];
  return hxSilverAssertLanguageSafe_(lines.join('\n'));
}

function hxSilverRenderMonetaryShort_(interpretation) {
  const limitation = interpretation.confidence_label === 'unavailable' && interpretation.limitations.length ?
    ' Limitation: ' + interpretation.limitations[0] + '.' : '';
  return hxSilverAssertLanguageSafe_(
    'Monetary Environment: ' + interpretation.current_state + '; ' +
    interpretation.silver_impact + ' Confidence: ' +
    hxSilverConfidenceText_(interpretation) + '.' + limitation
  );
}

function hxSilverRenderMonetaryDashboard_(interpretation) {
  return hxSilverDeepFreeze_({
    target_instrument: 'XAGUSD',
    section_id: 'monetary_environment',
    headline: 'Monetary Environment — ' + interpretation.current_state,
    status: interpretation.source_status,
    freshness: interpretation.freshness_status,
    silver_impact: interpretation.silver_impact,
    action_bias: interpretation.action_bias,
    action_language: hxSilverOperationalLanguage_(interpretation.action_bias),
    confidence_score: interpretation.confidence_score,
    confidence_label: interpretation.confidence_label,
    primary_risk: interpretation.primary_risk,
    required_confirmation: interpretation.required_confirmation,
    expandable: {
      monetary_environment: interpretation.monetary_environment,
      evidence: interpretation.underlying_metrics,
      provenance: interpretation.source_provenance,
      confidence_basis: interpretation.confidence_basis,
      limitations: interpretation.limitations,
      reason_codes: interpretation.reason_codes,
      contradictions: interpretation.monetary_contradictions
    },
    schema_version: interpretation.schema_version,
    renderer_version: HX_SILVER_VERSIONS.renderer,
    monetary_version: HX_SILVER_MONETARY_VERSION
  });
}

/**
 * Adapts an explicit read-only production snapshot into the authoritative
 * Monetary Environment interpretation object.
 */
function hxSilverBuildMonetaryEnvironment_(snapshot, evaluatedAt) {
  snapshot = snapshot || {};
  const asOf = hxSilverIso_(evaluatedAt);
  if (!asOf) throw new Error('Monetary Environment evaluatedAt is required.');
  const dollar = hxMonetaryDollar_(snapshot, asOf);
  const fred = hxMonetaryFred_(snapshot, asOf);
  const cftc = hxMonetaryCftc_(snapshot, asOf);
  const silver = hxMonetarySilverResponse_(snapshot, asOf);
  const oi = hxMonetaryOpenInterest_(cftc, silver);
  const evidence = [dollar.evidence].concat(fred.evidence).concat([cftc.evidence, oi.evidence, silver.evidence]);
  const metricAvailability = {
    dollar_pressure: dollar.evidence.source_status === 'available',
    nominal_yield_pressure: fred.evidence[0].source_status === 'available',
    real_yield_pressure: fred.evidence[1].source_status === 'available',
    yield_curve_state: fred.evidence[2].source_status === 'available',
    positioning: cftc.evidence.source_status === 'available',
    cot_context: cftc.evidence.source_status === 'available',
    open_interest: oi.evidence.source_status === 'available',
    silver_response: silver.evidence.source_status === 'available'
  };
  const missing = HX_SILVER_MONETARY_REQUIRED_METRICS.filter(metric => !metricAvailability[metric]);
  const regime = hxMonetaryClassifyRegime_(dollar, fred, cftc, oi, silver);
  const contradictions = hxMonetaryContradictions_(dollar, fred, cftc, oi, silver, evidence, missing);
  const completeness = (HX_SILVER_MONETARY_REQUIRED_METRICS.length - missing.length) / HX_SILVER_MONETARY_REQUIRED_METRICS.length;
  const confidence = hxSilverResolveConfidence_({
    evidence: evidence,
    completeness: completeness,
    provider_agreement: contradictions.status === 'unresolved_conflict' ? 'unresolved' : 'resolved',
    contradiction: {status:contradictions.status},
    numeric_confidence: snapshot.numeric_confidence || null
  });
  const sourceStatus = hxSilverAggregateSourceStatus_(evidence);
  const freshnessStatus = hxMonetaryPrimaryFreshness_(evidence);
  const silverImpact = hxMonetarySilverImpact_(regime, dollar, fred, oi, silver);
  const actionBias = hxMonetaryActionBias_(
    regime, silverImpact, confidence, contradictions, sourceStatus, freshnessStatus);
  const contextual = evidence.filter(item => item.eligibility.contextual_interpretation);
  const support = contextual.filter(item => hxSilverRelationshipSide_(item.silver_relationship) === 'support')
    .sort((a, b) => b.interpretive_weight - a.interpretive_weight)[0];
  const challenge = contextual.filter(item => hxSilverRelationshipSide_(item.silver_relationship) === 'challenge')
    .sort((a, b) => b.interpretive_weight - a.interpretive_weight)[0];
  const limitations = hxSilverUnique_(
    evidence.reduce((all, item) => all.concat(item.limitations || []), [])
      .concat(missing.map(metric => metric + ' unavailable'))
      .concat(['no live exchange open-interest feed'])
  );
  const reasonCodes = hxSilverUnique_(
    evidence.reduce((all, item) => all.concat(item.reason_codes || []), [])
      .concat(contradictions.secondary_conflicts.length ? ['MONETARY_CONTRADICTION_PRESENT'] : [])
      .concat(missing.length ? ['MONETARY_INPUTS_PARTIAL'] : [])
  );
  const primaryRisk = contradictions.secondary_conflicts[0] ||
    (challenge ? challenge.canonical_metric + ' may challenge the current monetary assessment.' :
      'The monetary regime may change with the next authoritative observation.');
  const interpretationText = regime === 'insufficient evidence' ?
    'Current production paths do not contain enough eligible monetary evidence for a defensible conclusion.' :
    'The dominant monetary regime is ' + regime + ', led by ' +
      (contradictions.dominant_driver === 'none' ? 'the available monetary complex' : contradictions.dominant_driver) + '.';
  const dataFreshness = hxMonetaryFreshnessDisclosure_(evidence);
  dataFreshness.cot_context = Object.assign({}, dataFreshness.positioning);
  const monetaryEnvironment = {
    current_state: regime,
    dollar_pressure: dollar.state,
    nominal_yield_pressure: fred.nominal.state + ' (' + fred.nominal.shift + ')',
    nominal_yield_segments: {
      front_end: fred.nominal.front_end,
      intermediate: fred.nominal.intermediate,
      long_end: fred.nominal.long_end
    },
    real_yield_pressure: fred.real.state,
    yield_curve_state: fred.curve.state,
    positioning: cftc.positioning.state,
    cot_context: cftc.cot_context,
    open_interest: oi.state,
    participation_quality: oi.participation_quality,
    data_freshness: dataFreshness,
    as_of: asOf,
    rule_version: HX_SILVER_MONETARY_VERSION
  };
  const base = {
    section_id: 'monetary_environment',
    section_name: 'Monetary Environment',
    target_instrument: 'XAGUSD',
    as_of: asOf,
    market_session: String(snapshot.market_session || 'unknown'),
    source_status: sourceStatus,
    freshness_status: freshnessStatus,
    evidence_state: hxSilverAggregateEvidenceState_(evidence),
    current_state: regime,
    interpretation: interpretationText,
    market_impact: 'Dollar, nominal-yield, real-yield, curve, positioning, and participation evidence define the monetary pressure acting on silver.',
    silver_impact: silverImpact,
    action_bias: actionBias,
    primary_support: support ? support.canonical_metric : 'none',
    primary_challenge: challenge ? challenge.canonical_metric : 'none',
    primary_risk: primaryRisk,
    required_confirmation: contradictions.required_confirmation,
    confidence_score: confidence.score,
    confidence_label: confidence.label,
    confidence_basis: confidence.basis,
    limitations: limitations,
    reason_codes: reasonCodes,
    source_provenance: Object.assign({}, hxSilverBuildProvenance_(evidence), {
      monetary_rule_version: HX_SILVER_MONETARY_VERSION,
      source_contracts: ['Calculated_Signals', 'FRED_Raw', 'CFTC_Raw', 'current silver market snapshot']
    }),
    underlying_metrics: evidence.map(item => ({
      evidence_id:item.evidence_id,
      evidence_kind:item.evidence_kind,
      canonical_metric:item.canonical_metric,
      value:item.value,
      unit:item.unit,
      direction:item.direction,
      silver_relationship:item.silver_relationship,
      reference_interval:item.reference_interval,
      timestamp:item.timestamp,
      authority:item.evidence_state,
      freshness:item.freshness_status,
      quality:item.quality,
      eligibility:item.eligibility,
      reason_codes:item.reason_codes,
      provenance_pointer:item.provenance_pointer
    })),
    monetary_environment: monetaryEnvironment,
    monetary_contradictions: contradictions,
    operator_summary: contradictions.required_confirmation,
    long_summary: null,
    short_summary: null,
    dashboard_summary: null,
    telegram_summary: null,
    contradiction: {status:contradictions.status},
    notification_permitted: false,
    production_effect: 'none',
    rule_version: HX_SILVER_VERSIONS.rule,
    schema_version: HX_SILVER_VERSIONS.schema
  };
  base.long_summary = hxSilverRenderMonetaryLong_(base);
  base.short_summary = hxSilverRenderMonetaryShort_(base);
  base.dashboard_summary = hxSilverRenderMonetaryDashboard_(base);
  base.telegram_summary = null;
  [
    base.interpretation, base.market_impact, base.silver_impact, base.primary_risk,
    base.required_confirmation, base.operator_summary, base.long_summary, base.short_summary
  ].forEach(hxSilverAssertLanguageSafe_);
  const frozen = hxSilverDeepFreeze_(base);
  const validation = hxSilverValidateInterpretation_(frozen);
  if (!validation.ok) throw new Error('Invalid Monetary Environment interpretation: ' + validation.errors.join(','));
  if (HX_SILVER_MONETARY_REGIMES.indexOf(frozen.current_state) < 0)
    throw new Error('Invalid Monetary Environment regime: ' + frozen.current_state);
  return frozen;
}

/**
 * Internal runtime preview boundary. The default feature flag is false.
 */
function hxSilverMonetaryEnvironmentPreview_(snapshot, evaluatedAt) {
  if (!hxSilverIntelligencePreviewEnabled_()) throw new Error('HEL035_INTERNAL_PREVIEW_DISABLED');
  return hxSilverBuildMonetaryEnvironment_(snapshot, evaluatedAt);
}
