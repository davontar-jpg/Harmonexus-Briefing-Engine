/**
 * HEL-035 VIX — Volatility Environment interpretation engine.
 *
 * Production currently has no VIX feed. This pure adapter accepts an explicit,
 * authorized VIX snapshot and optional supporting snapshots. It performs no
 * acquisition, persistence, scoring, delivery, scheduling, or public render.
 */
const HX_SILVER_VIX_VERSION = 'HEL-035.vix.1.0.0';

const HX_SILVER_VIX_STATES = Object.freeze([
  'volatility expanding',
  'volatility compressing',
  'volatility elevated and stable',
  'volatility subdued',
  'volatility shock',
  'volatility normalization',
  'mixed',
  'stale',
  'unavailable'
]);

const HX_SILVER_VIX_RISK_APPETITE = Object.freeze([
  'risk appetite strengthening',
  'risk appetite weakening',
  'defensive positioning increasing',
  'risk appetite stable',
  'risk conditions mixed',
  'volatility signal unconfirmed',
  'unavailable'
]);

function hxVixNum_(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return isFinite(number) ? number : null;
}

function hxVixIso_(value) {
  return hxSilverIso_(value);
}

function hxVixPercentile_(values, current, minimum) {
  const valid = (values || []).map(hxVixNum_).filter(value => value !== null).sort((a, b) => a - b);
  if (current === null || valid.length < (minimum || 20)) return null;
  return Number((100 * valid.filter(value => value <= current).length / valid.length).toFixed(1));
}

function hxVixMean_(values) {
  const valid = values.map(hxVixNum_).filter(value => value !== null);
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null;
}

function hxVixHistory_(input) {
  return (Array.isArray(input) ? input : []).map(row => ({
    timestamp: hxVixIso_(row.timestamp || row.as_of || row.date),
    close: hxVixNum_(row.close === undefined ? row.value : row.close)
  })).filter(row => row.timestamp && row.close !== null && row.close > 0)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

function hxVixHistoricalReturns_(history) {
  const returns = [];
  for (let index = 1; index < history.length; index++) {
    if (history[index - 1].close > 0)
      returns.push((history[index].close - history[index - 1].close) / history[index - 1].close);
  }
  return returns;
}

function hxVixDirection_(rate, ratePercentile) {
  if (rate === null) return 'unavailable';
  if (rate === 0 || (ratePercentile !== null && ratePercentile <= 20)) return 'stable';
  return rate > 0 ? 'rising' : 'falling';
}

function hxVixTrend_(history, level, window) {
  if (level === null || history.length < window) return 'unavailable';
  const mean = hxVixMean_(history.slice(-window).map(row => row.close));
  if (mean === null || mean === 0) return 'unavailable';
  const distance = (level - mean) / mean;
  if (Math.abs(distance) < .02) return 'stable';
  return distance > 0 ? 'rising' : 'falling';
}

function hxVixFreshness_(vix, evaluatedAt) {
  const timestamp = hxVixIso_(vix.timestamp || vix.as_of);
  const session = vix.market_session || {};
  const observationType = String(vix.observation_type || 'intraday').toLowerCase();
  const policyId = observationType === 'daily_close' ||
    observationType === 'closing_value' || observationType === 'prior_close' ?
    'fred_daily' : 'live_market';
  const base = hxSilverResolveFreshness_({
    policy_id: policyId,
    observation_timestamp: timestamp,
    evaluated_at: evaluatedAt,
    market_session: session,
    expected_next_update: vix.expected_next_update
  });
  let status = base.status;
  let reason = base.reason_code;
  if (observationType === 'prior_close' || observationType === 'closing_value') {
    if (session.status === 'open') {
      status = base.status === 'stale' ? 'stale' : 'delayed';
      reason = 'VIX_PRIOR_CLOSE_DURING_OPEN_SESSION';
    } else if (session.status === 'closed' && base.status !== 'stale') {
      status = 'current';
      reason = session.is_holiday === true ?
        'VIX_PRIOR_CLOSE_HOLIDAY_CLOSED' : 'VIX_PRIOR_CLOSE_MARKET_CLOSED';
    } else if (base.status !== 'stale') {
      status = 'delayed';
      reason = 'VIX_PRIOR_CLOSE_SESSION_UNKNOWN';
    }
  }
  return hxSilverDeepFreeze_({
    status: status,
    expected_next_update: base.expected_next_update,
    age_seconds: base.age_seconds,
    reason_code: reason,
    observation_type: observationType,
    live_claim_permitted: observationType === 'intraday' && session.status === 'open' && status === 'current',
    policy_id: policyId === 'fred_daily' ? 'vix_delayed_daily' : 'vix_market_hours',
    rule_version: HX_SILVER_VIX_VERSION
  });
}

function hxVixUnavailableEvidence_(metric, kind) {
  return hxSilverEvidence_({
    evidence_id: metric + '|unavailable',
    evidence_kind: kind,
    canonical_metric: metric,
    value: null,
    unit: 'state',
    direction: 'unavailable',
    silver_relationship: 'observation only',
    reference_interval: 'unknown',
    timestamp: null,
    source: 'VIX production source unavailable',
    provider: 'Harmonexus production',
    evidence_state: 'placeholder',
    source_status: 'unavailable',
    freshness_status: 'unknown',
    quality: 'unknown',
    interpretive_weight: 0,
    reason_codes: ['VIX_PRODUCTION_SOURCE_UNAVAILABLE'],
    limitations: ['VIX production source unavailable'],
    provenance_pointer: ''
  });
}

function hxVixEvidence_(input) {
  return hxSilverEvidence_({
    evidence_id: input.metric + '|' + (input.timestamp || 'unavailable'),
    evidence_kind: input.kind,
    canonical_metric: input.metric,
    value: input.value,
    unit: input.unit,
    direction: input.direction,
    silver_relationship: input.relationship || 'observation only',
    reference_interval: input.interval || 'snapshot',
    timestamp: input.timestamp,
    source: input.source,
    provider: input.provider,
    evidence_state: input.evidence_state || 'validated',
    source_status: input.source_status || 'available',
    freshness_status: input.freshness_status || 'current',
    quality: input.quality || 'medium',
    provider_quality: input.provider_quality || input.quality || 'medium',
    interpretive_weight: input.weight,
    reason_codes: input.reason_codes || [],
    limitations: input.limitations || [],
    provenance_pointer: input.provenance_pointer || '',
    transformations: input.transformations || [],
    approved_uses: input.approved_uses || [],
    metadata: input.metadata || {}
  });
}

function hxVixRelationshipFromDirection_(direction) {
  if (direction === 'rising') return 'challenging';
  if (direction === 'falling') return 'supportive';
  if (direction === 'stable') return 'neutral';
  return 'observation only';
}

function hxVixState_(input) {
  if (!input.available) return 'unavailable';
  if (input.freshness === 'stale') return 'stale';
  const percentile = input.level_percentile;
  const ratePercentile = input.rate_percentile;
  const rate = input.rate_of_change;
  if (percentile !== null && ratePercentile !== null &&
      percentile >= 90 && rate > 0 && ratePercentile >= 90) return 'volatility shock';
  if (percentile !== null && percentile >= 60 && rate < 0 &&
      ratePercentile !== null && ratePercentile >= 60) return 'volatility normalization';
  if (percentile !== null && percentile >= 75 &&
      (input.direction === 'stable' || (ratePercentile !== null && ratePercentile < 40)))
    return 'volatility elevated and stable';
  if (percentile !== null && percentile <= 25 &&
      (input.direction === 'stable' || (ratePercentile !== null && ratePercentile < 60)))
    return 'volatility subdued';
  if (rate > 0 && ((ratePercentile !== null && ratePercentile >= 60) ||
      input.short_term_trend === 'rising')) return 'volatility expanding';
  if (rate < 0 && ((ratePercentile !== null && ratePercentile >= 50) ||
      input.short_term_trend === 'falling')) return 'volatility compressing';
  return 'mixed';
}

function hxVixSnapshot_(snapshot, evaluatedAt) {
  const raw = snapshot.vix || snapshot.VIX || {};
  const symbol = String(raw.symbol || '').toUpperCase();
  const level = hxVixNum_(raw.level === undefined ? raw.close : raw.level);
  const timestamp = hxVixIso_(raw.timestamp || raw.as_of);
  const source = String(raw.source || '');
  const provider = String(raw.provider || source);
  const authorizedSymbol = ['VIX', '^VIX', 'CBOE:VIX'].indexOf(symbol) >= 0;
  const available = level !== null && level > 0 && timestamp && source && provider && authorizedSymbol;
  if (!available) {
    return {
      available: false,
      level: null,
      previous_close: null,
      change: null,
      rate_of_change: null,
      direction: 'unavailable',
      short_term_trend: 'unavailable',
      medium_term_trend: 'unavailable',
      percentile: null,
      rate_percentile: null,
      state: 'unavailable',
      timestamp: timestamp,
      source: source || null,
      provider: provider || null,
      symbol: symbol || null,
      timezone: String(raw.timezone || 'America/New_York'),
      interval: String(raw.interval || 'unknown'),
      freshness: {
        status:'unknown',
        expected_next_update:null,
        reason_code: !authorizedSymbol && symbol ? 'VIX_SYMBOL_NOT_AUTHORIZED' :
          !source || !provider ? 'VIX_SOURCE_METADATA_MISSING' : 'VIX_OBSERVATION_UNAVAILABLE',
        observation_type:String(raw.observation_type || 'unknown'),
        live_claim_permitted:false
      },
      history_count: 0,
      history_start: null,
      history_end: null,
      evidence: [hxVixUnavailableEvidence_('vix_level', 'volatility_level')]
    };
  }
  const history = hxVixHistory_(raw.history);
  const prior = hxVixNum_(raw.previous_close) ||
    (history.length ? history[history.length - 1].close : null);
  const change = hxVixNum_(raw.change);
  const resolvedChange = change === null && prior !== null ? level - prior : change;
  const rate = hxVixNum_(raw.rate_of_change);
  const resolvedRate = rate === null && prior ? resolvedChange / prior : rate;
  const historicalReturns = hxVixHistoricalReturns_(history);
  const percentile = hxVixPercentile_(history.map(row => row.close), level, 20);
  const ratePercentile = resolvedRate === null ? null :
    hxVixPercentile_(historicalReturns.map(Math.abs), Math.abs(resolvedRate), 20);
  const direction = hxVixDirection_(resolvedRate, ratePercentile);
  const shortTrend = hxVixTrend_(history, level, 5);
  const mediumTrend = hxVixTrend_(history, level, 20);
  const freshness = hxVixFreshness_(raw, evaluatedAt);
  const state = hxVixState_({
    available:true,
    freshness:freshness.status,
    level_percentile:percentile,
    rate_percentile:ratePercentile,
    rate_of_change:resolvedRate,
    direction:direction,
    short_term_trend:shortTrend
  });
  const authority = raw.evidence_state || 'validated';
  const common = {
    source:source,
    provider:provider,
    timestamp:timestamp,
    evidence_state:authority,
    source_status:'available',
    freshness_status:freshness.status,
    quality:String(raw.quality || 'medium'),
    reason_codes:[freshness.reason_code],
    limitations: percentile === null ? ['VIX historical distribution insufficient for percentile'] : [],
    approved_uses:raw.approved_uses || [],
    metadata:{
      symbol:symbol,
      timezone:String(raw.timezone || 'America/New_York'),
      interval:String(raw.interval || 'unknown'),
      observation_type:freshness.observation_type,
      expected_next_update:freshness.expected_next_update,
      live_claim_permitted:freshness.live_claim_permitted
    }
  };
  const evidence = [
    hxVixEvidence_(Object.assign({}, common, {
      metric:'vix_level',
      kind:'volatility_level',
      value:level,
      unit:'index_points',
      direction:direction,
      relationship:hxVixRelationshipFromDirection_(direction),
      interval:String(raw.interval || 'snapshot'),
      weight:1.3,
      provenance_pointer:String(raw.provenance_pointer || 'authorized_snapshot:VIX'),
      transformations:['validated explicit VIX symbol/source/timestamp', 'classified against empirical level distribution']
    })),
    hxVixEvidence_(Object.assign({}, common, {
      metric:'vix_rate_of_change',
      kind:'volatility_change',
      value:resolvedRate,
      unit:'decimal_change',
      direction:direction,
      relationship:hxVixRelationshipFromDirection_(direction),
      interval:'previous_close_to_observation',
      weight:1.1,
      provenance_pointer:String(raw.provenance_pointer || 'authorized_snapshot:VIX'),
      transformations:['current level versus supplied or historical previous close', 'classified against empirical absolute-change distribution']
    }))
  ];
  if (percentile !== null) {
    evidence.push(hxVixEvidence_(Object.assign({}, common, {
      metric:'vix_percentile',
      kind:'percentile',
      value:percentile,
      unit:'percentile',
      direction:percentile >= 75 ? 'elevated' : percentile <= 25 ? 'subdued' : 'middle',
      relationship:'observation only',
      interval:'available_history',
      weight:.7,
      provenance_pointer:String(raw.provenance_pointer || 'authorized_snapshot:VIX'),
      transformations:['empirical rank within supplied VIX history']
    })));
  }
  return {
    available:true,
    level:level,
    previous_close:prior,
    change:resolvedChange,
    rate_of_change:resolvedRate,
    direction:direction,
    short_term_trend:shortTrend,
    medium_term_trend:mediumTrend,
    percentile:percentile,
    rate_percentile:ratePercentile,
    state:state,
    timestamp:timestamp,
    source:source,
    provider:provider,
    symbol:symbol,
    timezone:String(raw.timezone || 'America/New_York'),
    interval:String(raw.interval || 'unknown'),
    freshness:freshness,
    history_count:history.length,
    history_start:history.length ? history[0].timestamp : null,
    history_end:history.length ? history[history.length - 1].timestamp : null,
    evidence:evidence
  };
}

function hxVixMarketEvidence_(snapshot, key, metric, kind, evaluatedAt) {
  const raw = snapshot[key] || {};
  const value = hxVixNum_(raw.return === undefined ? raw.change : raw.return);
  const timestamp = hxVixIso_(raw.timestamp || raw.as_of);
  const source = String(raw.source || '');
  const provider = String(raw.provider || source);
  if (value === null || !timestamp || !source || !provider) return null;
  const freshness = hxSilverResolveFreshness_({
    policy_id:'live_market',
    observation_timestamp:timestamp,
    evaluated_at:evaluatedAt,
    market_session:raw.market_session || {}
  });
  const direction = value > 0 ? 'rising' : value < 0 ? 'falling' : 'stable';
  let relationship = 'observation only';
  if (metric === 'silver_response') relationship = direction === 'rising' ? 'supportive' :
    direction === 'falling' ? 'challenging' : 'neutral';
  return hxVixEvidence_({
    metric:metric,
    kind:kind,
    value:value,
    unit:'decimal_return',
    direction:direction,
    relationship:relationship,
    interval:String(raw.interval || 'snapshot'),
    timestamp:timestamp,
    source:source,
    provider:provider,
    evidence_state:raw.evidence_state || 'validated',
    freshness_status:freshness.status,
    quality:String(raw.quality || 'medium'),
    weight:metric === 'silver_response' ? 1 : .85,
    reason_codes:[freshness.reason_code],
    provenance_pointer:String(raw.provenance_pointer || 'authorized_snapshot:' + key),
    transformations:['classified signed market return'],
    approved_uses:raw.approved_uses || []
  });
}

function hxVixOptionalLevelEvidence_(raw, metric, kind, evaluatedAt) {
  raw = raw || {};
  const level = hxVixNum_(raw.level);
  const change = hxVixNum_(raw.rate_of_change === undefined ? raw.change : raw.rate_of_change);
  const timestamp = hxVixIso_(raw.timestamp || raw.as_of);
  const source = String(raw.source || '');
  const provider = String(raw.provider || source);
  if (level === null || !timestamp || !source || !provider) return null;
  const freshness = hxSilverResolveFreshness_({
    policy_id:'live_market',
    observation_timestamp:timestamp,
    evaluated_at:evaluatedAt,
    market_session:raw.market_session || {}
  });
  const direction = change === null ? 'stable' : change > 0 ? 'rising' : change < 0 ? 'falling' : 'stable';
  return hxVixEvidence_({
    metric:metric,
    kind:kind,
    value:{level:level, change:change},
    unit:'index_snapshot',
    direction:direction,
    relationship:'observation only',
    timestamp:timestamp,
    source:source,
    provider:provider,
    evidence_state:raw.evidence_state || 'validated',
    freshness_status:freshness.status,
    quality:String(raw.quality || 'medium'),
    weight:.65,
    reason_codes:[freshness.reason_code],
    provenance_pointer:String(raw.provenance_pointer || 'authorized_snapshot:' + metric),
    transformations:['classified optional supporting volatility direction'],
    approved_uses:raw.approved_uses || []
  });
}

function hxVixTermStructure_(raw, evaluatedAt) {
  raw = raw || {};
  const front = hxVixNum_(raw.front_month);
  const second = hxVixNum_(raw.second_month);
  const timestamp = hxVixIso_(raw.timestamp || raw.as_of);
  const source = String(raw.source || '');
  const provider = String(raw.provider || source);
  if (front === null || second === null || !timestamp || !source || !provider) return null;
  const spread = second - front;
  const state = spread > 0 ? 'contango' : spread < 0 ? 'backwardation' : 'flat';
  const freshness = hxSilverResolveFreshness_({
    policy_id:'live_market',
    observation_timestamp:timestamp,
    evaluated_at:evaluatedAt,
    market_session:raw.market_session || {}
  });
  return {
    state:state,
    front_month:front,
    second_month:second,
    spread:spread,
    evidence:hxVixEvidence_({
      metric:'vix_term_structure',
      kind:'volatility_level',
      value:{front_month:front, second_month:second, spread:spread},
      unit:'index_points',
      direction:state,
      relationship:'observation only',
      timestamp:timestamp,
      source:source,
      provider:provider,
      evidence_state:raw.evidence_state || 'validated',
      freshness_status:freshness.status,
      quality:String(raw.quality || 'medium'),
      weight:.7,
      reason_codes:[freshness.reason_code],
      provenance_pointer:String(raw.provenance_pointer || 'authorized_snapshot:vix_term_structure'),
      transformations:['second month minus front month'],
      approved_uses:raw.approved_uses || []
    })
  };
}

function hxVixRiskAppetite_(vix, equities, credit) {
  if (!vix.available || vix.state === 'stale') return vix.state === 'stale' ?
    'volatility signal unconfirmed' : 'unavailable';
  const equityDirection = equities ? equities.direction : 'unavailable';
  const creditDirection = credit ? credit.direction : 'unavailable';
  if (vix.state === 'volatility shock') return 'defensive positioning increasing';
  if (vix.direction === 'rising' && equityDirection === 'falling')
    return 'defensive positioning increasing';
  if (vix.direction === 'falling' && equityDirection === 'rising' &&
      creditDirection !== 'rising') return 'risk appetite strengthening';
  if ((vix.direction === 'rising' && equityDirection === 'rising') ||
      (vix.direction === 'falling' && equityDirection === 'falling'))
    return 'risk conditions mixed';
  if (vix.direction === 'rising') return 'risk appetite weakening';
  if (vix.direction === 'falling') return 'risk appetite strengthening';
  if (vix.direction === 'stable') return 'risk appetite stable';
  return 'volatility signal unconfirmed';
}

function hxVixCrossMarketImpact_(vix, riskAppetite, equities) {
  if (!vix.available) return 'Cross-market volatility impact is unavailable.';
  if (vix.state === 'stale') return 'Current cross-market impact cannot be justified from stale VIX evidence.';
  if (vix.state === 'volatility shock')
    return 'A volatility shock is increasing cross-asset liquidation risk, correlation instability, and intraday range uncertainty.';
  if (vix.state === 'volatility expanding' && equities && equities.direction === 'falling')
    return 'Wider ranges, defensive flows, and lower breakout reliability are affecting the cross-market environment.';
  if (vix.state === 'volatility expanding')
    return 'Volatility is rising without complete broad-market confirmation; range expansion risk is increasing.';
  if (vix.state === 'volatility compressing' && equities && equities.direction === 'rising')
    return 'Volatility compression is supporting a more orderly continuation environment across risk assets.';
  if (vix.direction === 'falling' && equities && equities.direction === 'falling')
    return 'Volatility is falling while risk assets remain weak, leaving the risk signal unconfirmed.';
  if (vix.state === 'volatility elevated and stable')
    return 'Elevated volatility is persisting, so wider ranges and unstable correlations remain relevant.';
  if (vix.state === 'volatility subdued')
    return 'Subdued volatility supports orderly ranges but leaves the market vulnerable to renewed expansion.';
  if (vix.state === 'volatility normalization')
    return 'Volatility is normalizing from elevated conditions, reducing—but not eliminating—defensive pressure.';
  return 'Cross-market volatility conditions are mixed and require confirmation.';
}

function hxVixSilverImpact_(vix, equities, silver) {
  if (!vix.available) return 'No defensible silver conclusion because VIX evidence is unavailable.';
  if (vix.state === 'stale') return 'Current silver impact cannot be justified from stale VIX evidence.';
  const silverDirection = silver ? silver.direction : 'unavailable';
  const equityDirection = equities ? equities.direction : 'unavailable';
  const expanding = vix.direction === 'rising' ||
    ['volatility expanding', 'volatility shock'].indexOf(vix.state) >= 0;
  if (expanding && silverDirection === 'rising' && equityDirection === 'falling')
    return 'Silver is resisting broader risk deterioration; defensive monetary demand may be contributing, but structural confirmation is required.';
  if (expanding && silverDirection === 'rising')
    return 'Silver is strengthening during volatility expansion, indicating VIX and silver decoupling that requires structural confirmation.';
  if (expanding && silverDirection === 'falling')
    return 'Liquidation risk is elevated as silver weakens during volatility expansion; industrial and risk-asset behavior may be dominating.';
  if (expanding)
    return 'Volatility supports wider silver ranges, but directional impact remains unconfirmed.';
  if (vix.direction === 'falling' && silverDirection === 'rising')
    return 'Volatility compression supports more orderly silver continuation, subject to normal structural confirmation.';
  if (vix.direction === 'falling' && silverDirection === 'falling')
    return 'Silver remains weak despite volatility compression; VIX and silver are diverging and stronger confirmation is required.';
  if (vix.state === 'volatility elevated and stable')
    return 'Elevated volatility keeps wider silver ranges and defensive-flow sensitivity active.';
  return 'Volatility is neutral for silver until price structure provides stronger confirmation.';
}

function hxVixContradictions_(vix, equities, silver, vvix, credit) {
  const conflicts = [];
  if (vix.direction === 'rising' && equities && equities.direction === 'rising')
    conflicts.push('VIX is rising while equities are rising.');
  if (vix.direction === 'falling' && equities && equities.direction === 'falling')
    conflicts.push('VIX is falling while equities are weakening.');
  if (vix.direction === 'rising' && silver && silver.direction === 'rising')
    conflicts.push('VIX is rising while silver is strengthening.');
  if (vix.direction === 'falling' && silver && silver.direction === 'falling')
    conflicts.push('VIX is falling while silver is weakening.');
  if (vvix && ((vix.direction === 'rising' && vvix.direction === 'falling') ||
      (vix.direction === 'falling' && vvix.direction === 'rising')))
    conflicts.push('VIX and VVIX direction disagree.');
  if (vix.percentile !== null && vix.percentile >= 75 && vix.direction === 'falling')
    conflicts.push('VIX remains elevated while volatility is compressing.');
  if (vix.percentile !== null && vix.percentile <= 25 && vix.direction === 'rising' &&
      vix.rate_percentile !== null && vix.rate_percentile >= 75)
    conflicts.push('VIX is low but rapidly accelerating.');
  if (credit && ((vix.direction === 'rising' && credit.direction === 'falling') ||
      (vix.direction === 'falling' && credit.direction === 'rising')))
    conflicts.push('Credit stress and VIX direction disagree.');
  if (vix.freshness.status === 'stale' &&
      ((equities && equities.freshness_status === 'current') ||
       (silver && silver.freshness_status === 'current')))
    conflicts.push('Stale VIX is paired with fresh market evidence.');
  const status = !vix.available ? 'missing_evidence' :
    conflicts.length >= 3 ? 'unresolved_conflict' :
    conflicts.length ? 'material_disagreement' : 'agreement';
  return {
    status:status,
    dominant_state:vix.state,
    dominant_driver:vix.available ? 'vix_rate_of_change' : 'none',
    contradictions:conflicts,
    confidence_impact:status === 'unresolved_conflict' ? 'reduce two levels' :
      status === 'material_disagreement' ? 'reduce one level' :
      status === 'missing_evidence' ? 'confidence unavailable' : 'none',
    required_confirmation:status === 'missing_evidence' ?
      'Acquire an authorized, timestamped VIX observation.' :
      conflicts.length ? 'Confirm VIX persistence with equities and available supporting volatility evidence.' :
      'Confirm persistence in VIX direction and the corresponding equity response.'
  };
}

function hxVixActionBias_(vix, silverImpact, contradiction) {
  if (!vix.available) return 'no_operational_conclusion';
  if (vix.freshness.status === 'stale' || vix.freshness.status === 'unknown')
    return 'no_operational_conclusion';
  if (contradiction.status === 'unresolved_conflict') return 'volatility_signal_unconfirmed';
  if (silverImpact.indexOf('Liquidation risk is elevated') >= 0) return 'liquidation_risk_elevated';
  if (vix.state === 'volatility shock') return 'stronger_confirmation_required';
  if (vix.state === 'volatility expanding') return contradiction.contradictions.length ?
    'volatility_signal_unconfirmed' : 'range_expansion_risk';
  if (vix.state === 'volatility compressing' || vix.state === 'volatility normalization') {
    return silverImpact.indexOf('orderly silver continuation') >= 0 ?
      'orderly_continuation_favored' : 'continuation_normal_confirmation';
  }
  if (vix.state === 'volatility elevated and stable') return 'caution';
  if (vix.state === 'mixed') return 'volatility_signal_unconfirmed';
  return 'continuation_normal_confirmation';
}

function hxVixFreshnessDisclosure_(evidence, vix) {
  const out = {};
  evidence.forEach(item => {
    out[item.canonical_metric] = {
      timestamp:item.timestamp,
      source:item.source,
      provider:item.provider,
      source_status:item.source_status,
      freshness_status:item.freshness_status,
      reason_codes:item.reason_codes
    };
  });
  out.vix_level.expected_next_update = vix.freshness.expected_next_update;
  out.vix_level.observation_type = vix.freshness.observation_type;
  out.vix_level.live_claim_permitted = vix.freshness.live_claim_permitted;
  return out;
}

function hxSilverRenderVixLong_(interpretation) {
  const detail = interpretation.vix_volatility_environment;
  const lines = [
    'VIX — VOLATILITY ENVIRONMENT',
    'Target: XAGUSD / SILVER',
    'As Of: ' + interpretation.as_of,
    'Status: ' + interpretation.source_status + ' / ' + interpretation.freshness_status,
    '',
    'Current VIX State: ' + detail.current_vix_state,
    'VIX Direction: ' + detail.vix_direction,
    'VIX Rate of Change: ' + detail.vix_rate_of_change,
    'VIX Percentile: ' + detail.vix_percentile,
    'Volatility Regime: ' + detail.volatility_regime,
    'Risk Appetite: ' + detail.risk_appetite,
    'Cross-Market Impact: ' + detail.cross_market_impact,
    'Silver Impact: ' + interpretation.silver_impact,
    'Primary Support: ' + interpretation.primary_support,
    'Primary Challenge: ' + interpretation.primary_challenge,
    'Data Freshness: ' + detail.data_freshness.vix_level.freshness_status +
      '; observation type ' + detail.data_freshness.vix_level.observation_type +
      '; expected next update ' + (detail.data_freshness.vix_level.expected_next_update || 'unknown') + '.',
    '',
    'Action Bias: ' + hxSilverOperationalLanguage_(interpretation.action_bias),
    'Primary Risk: ' + interpretation.primary_risk,
    'Required Confirmation: ' + interpretation.required_confirmation,
    'Confidence: ' + hxSilverConfidenceText_(interpretation)
  ];
  return hxSilverAssertLanguageSafe_(lines.join('\n'));
}

function hxSilverRenderVixShort_(interpretation) {
  return hxSilverAssertLanguageSafe_(
    'VIX — Volatility Environment: ' + interpretation.current_state + '; ' +
    interpretation.vix_volatility_environment.risk_appetite + '. ' +
    interpretation.silver_impact + ' Confidence: ' +
    hxSilverConfidenceText_(interpretation) + '.'
  );
}

function hxSilverRenderVixDashboard_(interpretation) {
  return hxSilverDeepFreeze_({
    target_instrument:'XAGUSD',
    section_id:'vix_volatility_environment',
    headline:'VIX — Volatility Environment',
    primary_state:interpretation.current_state,
    risk_appetite:interpretation.vix_volatility_environment.risk_appetite,
    status:interpretation.source_status,
    freshness:interpretation.freshness_status,
    silver_impact:interpretation.silver_impact,
    action_bias:interpretation.action_bias,
    action_language:hxSilverOperationalLanguage_(interpretation.action_bias),
    confidence_score:interpretation.confidence_score,
    confidence_label:interpretation.confidence_label,
    primary_risk:interpretation.primary_risk,
    required_confirmation:interpretation.required_confirmation,
    expandable:{
      vix_level:interpretation.vix_volatility_environment.vix_level,
      vix_change:interpretation.vix_volatility_environment.vix_change,
      vix_rate_of_change:interpretation.vix_volatility_environment.vix_rate_of_change,
      vix_percentile:interpretation.vix_volatility_environment.vix_percentile,
      volatility_regime:interpretation.vix_volatility_environment.volatility_regime,
      supporting_inputs:interpretation.vix_volatility_environment.supporting_inputs,
      evidence:interpretation.underlying_metrics,
      provenance:interpretation.source_provenance,
      confidence_basis:interpretation.confidence_basis,
      freshness:interpretation.vix_volatility_environment.data_freshness,
      reason_codes:interpretation.reason_codes,
      limitations:interpretation.limitations,
      contradictions:interpretation.vix_contradictions
    },
    schema_version:interpretation.schema_version,
    renderer_version:HX_SILVER_VERSIONS.renderer,
    vix_rule_version:HX_SILVER_VIX_VERSION
  });
}

function hxSilverRenderVixNotification_(interpretation) {
  return hxSilverAssertLanguageSafe_(
    'VIX volatility is ' + interpretation.current_state + '; silver impact: ' +
    interpretation.silver_impact + ' ' +
    hxSilverOperationalLanguage_(interpretation.action_bias) +
    ', confidence ' + hxSilverConfidenceText_(interpretation) + '.'
  );
}

function hxSilverBuildVixVolatilityEnvironment_(snapshot, evaluatedAt) {
  snapshot = snapshot || {};
  const asOf = hxVixIso_(evaluatedAt);
  if (!asOf) throw new Error('VIX — Volatility Environment evaluatedAt is required.');
  const vix = hxVixSnapshot_(snapshot, asOf);
  const equities = hxVixMarketEvidence_(snapshot, 'equities', 'equity_response', 'market_return', asOf);
  const silver = hxVixMarketEvidence_(snapshot, 'silver', 'silver_response', 'market_return', asOf);
  const vvix = hxVixOptionalLevelEvidence_(snapshot.vvix, 'vvix_state', 'volatility_change', asOf);
  const move = hxVixOptionalLevelEvidence_(snapshot.move, 'move_state', 'volatility_level', asOf);
  const credit = hxVixOptionalLevelEvidence_(snapshot.credit_stress, 'credit_stress', 'divergence', asOf);
  const term = hxVixTermStructure_(snapshot.vix_term_structure, asOf);
  const evidence = vix.evidence.slice();
  [equities, silver, vvix, move, credit, term ? term.evidence : null]
    .filter(Boolean).forEach(item => evidence.push(item));
  const riskAppetite = hxVixRiskAppetite_(vix, equities, credit);
  const crossMarket = hxVixCrossMarketImpact_(vix, riskAppetite, equities);
  const silverImpact = hxVixSilverImpact_(vix, equities, silver);
  const contradictions = hxVixContradictions_(vix, equities, silver, vvix, credit);
  const completeness = vix.available ?
    Math.min(1, .5 + [equities, silver, vvix, move, credit, term].filter(Boolean).length * .1) : 0;
  const confidence = hxSilverResolveConfidence_({
    evidence:evidence,
    completeness:completeness,
    provider_agreement:contradictions.status === 'unresolved_conflict' ? 'unresolved' : 'resolved',
    contradiction:{status:contradictions.status},
    numeric_confidence:snapshot.numeric_confidence || null
  });
  const actionBias = hxVixActionBias_(vix, silverImpact, contradictions);
  const limitations = hxSilverUnique_(
    evidence.reduce((all, item) => all.concat(item.limitations || []), [])
      .concat(vvix ? [] : ['VVIX unavailable'])
      .concat(term ? [] : ['VIX term structure unavailable'])
      .concat(move ? [] : ['MOVE unavailable'])
      .concat(credit ? [] : ['credit stress unavailable'])
      .concat(vix.available ? [] : ['VIX production source unavailable'])
  );
  const reasonCodes = hxSilverUnique_(
    evidence.reduce((all, item) => all.concat(item.reason_codes || []), [])
      .concat(contradictions.contradictions.length ? ['VIX_CONTRADICTION_PRESENT'] : [])
      .concat(!vix.available ? ['VIX_PRODUCTION_SOURCE_UNAVAILABLE'] : [])
      .concat(vix.freshness.live_claim_permitted ? [] : ['VIX_NOT_LABELED_LIVE'])
  );
  const primarySupport = vix.direction === 'falling' ? 'vix_rate_of_change' :
    silver && silver.direction === 'rising' ? 'silver_response' : 'none';
  const primaryChallenge = vix.direction === 'rising' ? 'vix_rate_of_change' :
    silver && silver.direction === 'falling' ? 'silver_response' : 'none';
  const primaryRisk = contradictions.contradictions[0] ||
    (vix.state === 'volatility shock' ? 'Volatility shock conditions can destabilize cross-asset correlations and silver liquidity.' :
      !vix.available ? 'No authorized current VIX observation is available.' :
      'The volatility regime may change with the next authorized observation.');
  const interpretationText = !vix.available ?
    'Production has no authorized current VIX observation, so no volatility conclusion is formed.' :
    'VIX is in a ' + vix.state + ' state with ' + riskAppetite + '.';
  const detail = {
    current_vix_state:vix.state,
    vix_level:vix.level,
    vix_direction:vix.direction,
    vix_change:vix.change,
    vix_rate_of_change:vix.rate_of_change,
    vix_percentile:vix.percentile,
    rate_of_change_percentile:vix.rate_percentile,
    short_term_trend:vix.short_term_trend,
    medium_term_trend:vix.medium_term_trend,
    volatility_regime:vix.state,
    risk_appetite:riskAppetite,
    cross_market_impact:crossMarket,
    silver_impact:silverImpact,
    symbol:vix.symbol,
    source:vix.source,
    provider:vix.provider,
    interval:vix.interval,
    timezone:vix.timezone,
    history_range:{
      observations:vix.history_count,
      start:vix.history_start,
      end:vix.history_end
    },
    supporting_inputs:{
      vvix:vvix ? vvix.value : null,
      vix_term_structure:term ? {
        state:term.state,
        front_month:term.front_month,
        second_month:term.second_month,
        spread:term.spread
      } : null,
      move:move ? move.value : null,
      credit_stress:credit ? credit.value : null
    },
    data_freshness:hxVixFreshnessDisclosure_(evidence, vix),
    as_of:asOf,
    rule_version:HX_SILVER_VIX_VERSION
  };
  const base = {
    section_id:'vix_volatility_environment',
    section_name:'VIX — Volatility Environment',
    target_instrument:'XAGUSD',
    as_of:asOf,
    market_session:String(snapshot.market_session || 'unknown'),
    source_status:vix.available ? 'available' : 'unavailable',
    freshness_status:vix.freshness.status,
    evidence_state:hxSilverAggregateEvidenceState_(evidence),
    current_state:vix.state,
    interpretation:interpretationText,
    market_impact:crossMarket,
    silver_impact:silverImpact,
    action_bias:actionBias,
    primary_support:primarySupport,
    primary_challenge:primaryChallenge,
    primary_risk:primaryRisk,
    required_confirmation:contradictions.required_confirmation,
    confidence_score:confidence.score,
    confidence_label:confidence.label,
    confidence_basis:confidence.basis,
    limitations:limitations,
    reason_codes:reasonCodes,
    source_provenance:Object.assign({}, hxSilverBuildProvenance_(evidence), {
      vix_rule_version:HX_SILVER_VIX_VERSION,
      source_contracts:vix.provider === 'FRED' ?
        ['FRED_Raw:VIXCLS', 'optional authorized supporting snapshots'] :
        ['authorized vix_snapshot', 'optional authorized supporting snapshots'],
      current_production_vix_source:vix.available && vix.provider === 'FRED'
    }),
    underlying_metrics:evidence.map(item => ({
      evidence_id:item.evidence_id,
      evidence_kind:item.evidence_kind,
      canonical_metric:item.canonical_metric,
      value:item.value,
      unit:item.unit,
      direction:item.direction,
      reference_interval:item.reference_interval,
      timestamp:item.timestamp,
      source:item.source,
      provider:item.provider,
      authority:item.evidence_state,
      freshness:item.freshness_status,
      quality:item.quality,
      eligibility:item.eligibility,
      reason_codes:item.reason_codes,
      provenance_pointer:item.provenance_pointer
    })),
    vix_volatility_environment:detail,
    vix_contradictions:contradictions,
    operator_summary:contradictions.required_confirmation,
    long_summary:null,
    short_summary:null,
    dashboard_summary:null,
    telegram_summary:null,
    notification_preview:null,
    contradiction:{status:contradictions.status},
    notification_permitted:false,
    production_effect:'none',
    rule_version:HX_SILVER_VERSIONS.rule,
    schema_version:HX_SILVER_VERSIONS.schema
  };
  base.long_summary = hxSilverRenderVixLong_(base);
  base.short_summary = hxSilverRenderVixShort_(base);
  base.dashboard_summary = hxSilverRenderVixDashboard_(base);
  base.notification_preview = hxSilverRenderVixNotification_(base);
  [
    base.interpretation, base.market_impact, base.silver_impact, base.primary_risk,
    base.required_confirmation, base.operator_summary, base.long_summary,
    base.short_summary, base.notification_preview
  ].forEach(hxSilverAssertLanguageSafe_);
  const frozen = hxSilverDeepFreeze_(base);
  const validation = hxSilverValidateInterpretation_(frozen);
  if (!validation.ok) throw new Error('Invalid VIX interpretation: ' + validation.errors.join(','));
  if (HX_SILVER_VIX_STATES.indexOf(frozen.current_state) < 0)
    throw new Error('Invalid VIX state: ' + frozen.current_state);
  if (HX_SILVER_VIX_RISK_APPETITE.indexOf(detail.risk_appetite) < 0)
    throw new Error('Invalid VIX risk-appetite state: ' + detail.risk_appetite);
  return frozen;
}

function hxSilverVixVolatilityEnvironmentPreview_(snapshot, evaluatedAt) {
  if (!hxSilverIntelligencePreviewEnabled_()) throw new Error('HEL035_INTERNAL_PREVIEW_DISABLED');
  return hxSilverBuildVixVolatilityEnvironment_(snapshot, evaluatedAt);
}
