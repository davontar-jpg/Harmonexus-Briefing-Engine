/**
 * HEL-035 Liquidity Environment.
 *
 * Provider-neutral contracts plus a fail-closed unavailable interpretation.
 * No provider, network listener, credential, event collection, persistence,
 * score, alert, scheduler, or public consumer is created here.
 */
const HX_SILVER_LIQUIDITY_VERSION = 'HEL-035.liquidity.1.0.0';
const HX_SILVER_ORDER_BOOK_CONTRACT_VERSION = 'HEL-035.order-book-provider.1.0.0';
const HX_SILVER_LIQUIDITY_EVIDENCE_VERSION = 'HEL-035.liquidity-evidence.1.0.0';
const HX_SILVER_LIQUIDITY_CLAIM_VERSION = 'HEL-035.liquidity-claims.1.0.0';

const HX_LIQUIDITY_PROVIDER_METHODS = Object.freeze([
  'health',
  'capabilities',
  'instruments',
  'contracts',
  'marketDepth',
  'orderEvents',
  'tradeEvents',
  'icebergEvents',
  'absorptionEvents',
  'snapshots',
  'replay',
  'provenance'
]);

const HX_LIQUIDITY_DATA_TYPES = Object.freeze([
  'level_1',
  'level_2',
  'market_by_price',
  'market_by_order',
  'historical_depth',
  'live_depth',
  'delayed_depth',
  'synthetic_depth',
  'executed_trades',
  'inferred_events',
  'provider_native_events'
]);

const HX_LIQUIDITY_CONNECTION_STATUS = Object.freeze([
  'not_connected',
  'connecting',
  'connected',
  'degraded',
  'failed'
]);

const HX_LIQUIDITY_QUALITY_STATUS = Object.freeze([
  'unavailable',
  'low',
  'medium',
  'high',
  'failed'
]);

const HX_LIQUIDITY_EVENT_KINDS = Object.freeze([
  'resting_bid_liquidity',
  'resting_ask_liquidity',
  'depth_imbalance',
  'liquidity_addition',
  'liquidity_cancellation',
  'liquidity_migration',
  'aggressive_buy_volume',
  'aggressive_sell_volume',
  'absorption',
  'replenishment',
  'iceberg_detection',
  'execution_imbalance',
  'auction_acceptance',
  'auction_rejection',
  'liquidity_void',
  'large_resting_order',
  'spoofing_risk_condition'
]);

const HX_LIQUIDITY_STATES = Object.freeze([
  'bid-side liquidity dominant',
  'offer-side liquidity dominant',
  'balanced liquidity',
  'liquidity building above',
  'liquidity building below',
  'liquidity being withdrawn',
  'auction migrating higher',
  'auction migrating lower',
  'absorption detected',
  'execution pressure increasing',
  'liquidity void nearby',
  'mixed',
  'insufficient evidence',
  'provider unavailable'
]);

const HX_LIQUIDITY_INGESTION_BOUNDARY = Object.freeze({
  modes: Object.freeze([
    'file_import',
    'local_socket',
    'rest',
    'websocket',
    'database',
    'shared_directory',
    'provider_api',
    'exported_snapshot',
    'event_stream'
  ]),
  enabled: false,
  listeners_created: false,
  credentials_defined: false,
  network_access: false,
  rule_version: HX_SILVER_ORDER_BOOK_CONTRACT_VERSION
});

const HX_LIQUIDITY_RETENTION_MODEL = Object.freeze({
  ephemeral_live_state: 'provider-owned memory; not implemented',
  short_term_cache: 'normalized snapshots with bounded expiry; not implemented',
  historical_research: 'immutable raw and normalized replay partitions; not implemented',
  production_interpretation: 'versioned interpretation and provenance only; not implemented',
  raw_order_events: 'separate from normalized events',
  normalized_events: 'separate from derived features',
  empty_files_created: false
});

function hxLiquidityBool_(value) {
  return value === true;
}

function hxLiquidityNum_(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return isFinite(number) ? number : null;
}

function hxLiquidityEnum_(value, allowed, field) {
  value = String(value || '');
  if (allowed.indexOf(value) < 0) throw new Error('Invalid liquidity ' + field + ': ' + value);
  return value;
}

/**
 * Structural provider interface validation. Methods are checked but never
 * called by this architectural character.
 */
function hxLiquidityProviderInterface_(adapter) {
  adapter = adapter || {};
  const missing = HX_LIQUIDITY_PROVIDER_METHODS.filter(method => typeof adapter[method] !== 'function');
  const extras = Object.keys(adapter).filter(key =>
    typeof adapter[key] === 'function' && HX_LIQUIDITY_PROVIDER_METHODS.indexOf(key) < 0);
  return hxSilverDeepFreeze_({
    valid: missing.length === 0,
    required_methods: HX_LIQUIDITY_PROVIDER_METHODS.slice(),
    missing_methods: missing,
    extra_methods: extras.sort(),
    invoked: false,
    provider_contract_version: HX_SILVER_ORDER_BOOK_CONTRACT_VERSION
  });
}

/**
 * Strict capability schema. Level 1, Level 2, market-by-price,
 * market-by-order, historical/live/delayed/synthetic depth, trades, inferred
 * events, and provider-native events remain distinct booleans/types.
 */
function hxLiquidityCapability_(input) {
  input = input || {};
  const connection = hxLiquidityEnum_(
    input.connection_status || 'not_connected',
    HX_LIQUIDITY_CONNECTION_STATUS,
    'connection_status'
  );
  const quality = hxLiquidityEnum_(
    input.quality_status || (connection === 'not_connected' ? 'unavailable' : 'low'),
    HX_LIQUIDITY_QUALITY_STATUS,
    'quality_status'
  );
  const types = hxSilverUnique_(input.data_type || []);
  types.forEach(value => hxLiquidityEnum_(value, HX_LIQUIDITY_DATA_TYPES, 'data_type'));
  const lastUpdate = hxSilverIso_(input.last_update);
  const depthLevels = hxLiquidityNum_(input.depth_levels);
  if (depthLevels !== null && (depthLevels < 0 || Math.floor(depthLevels) !== depthLevels))
    throw new Error('Liquidity depth_levels must be a non-negative integer or null.');
  const capability = {
    provider_name: String(input.provider_name || 'none'),
    provider_version: String(input.provider_version || 'unavailable'),
    connection_status: connection,
    exchange: String(input.exchange || 'COMEX'),
    instrument: String(input.instrument || 'SI'),
    contract: input.contract ? String(input.contract) : null,
    data_type: types,
    depth_levels: depthLevels,
    level_1: types.indexOf('level_1') >= 0,
    level_2: types.indexOf('level_2') >= 0,
    market_by_price: hxLiquidityBool_(input.market_by_price) || types.indexOf('market_by_price') >= 0,
    market_by_order: hxLiquidityBool_(input.market_by_order) || types.indexOf('market_by_order') >= 0,
    historical_depth: hxLiquidityBool_(input.historical_depth) || types.indexOf('historical_depth') >= 0,
    live_depth: hxLiquidityBool_(input.live_depth) || types.indexOf('live_depth') >= 0,
    delayed_depth: hxLiquidityBool_(input.delayed_depth) || types.indexOf('delayed_depth') >= 0,
    synthetic_depth: hxLiquidityBool_(input.synthetic_depth) || types.indexOf('synthetic_depth') >= 0,
    iceberg_native: hxLiquidityBool_(input.iceberg_native),
    iceberg_inferred: hxLiquidityBool_(input.iceberg_inferred),
    absorption_native: hxLiquidityBool_(input.absorption_native),
    absorption_inferred: hxLiquidityBool_(input.absorption_inferred),
    trade_tape: hxLiquidityBool_(input.trade_tape) || types.indexOf('executed_trades') >= 0,
    latency_ms: hxLiquidityNum_(input.latency_ms),
    delay_seconds: hxLiquidityNum_(input.delay_seconds),
    licensing_state: String(input.licensing_state || 'unconfigured'),
    last_update: lastUpdate,
    quality_status: quality,
    source_status: connection === 'connected' || connection === 'degraded' ? 'available' :
      connection === 'failed' ? 'failed' : 'unavailable',
    schema_version: HX_SILVER_ORDER_BOOK_CONTRACT_VERSION
  };
  if (capability.live_depth && capability.delayed_depth)
    throw new Error('Liquidity depth cannot be both live and delayed.');
  if (capability.market_by_order && !capability.level_2)
    throw new Error('Market-by-order requires Level 2 capability.');
  if (capability.market_by_price && !capability.level_2)
    throw new Error('Market-by-price requires Level 2 capability.');
  if ((capability.iceberg_native || capability.absorption_native) &&
      types.indexOf('provider_native_events') < 0)
    throw new Error('Native detections require provider_native_events capability.');
  if ((capability.iceberg_inferred || capability.absorption_inferred) &&
      types.indexOf('inferred_events') < 0)
    throw new Error('Inferred detections require inferred_events capability.');
  return hxSilverDeepFreeze_(capability);
}

function hxLiquidityUnavailableCapability_() {
  return hxLiquidityCapability_({
    provider_name:'none',
    provider_version:'unavailable',
    connection_status:'not_connected',
    exchange:'COMEX',
    instrument:'SI',
    contract:null,
    data_type:[],
    depth_levels:null,
    licensing_state:'unconfigured',
    quality_status:'unavailable'
  });
}

function hxLiquidityContract_(input) {
  input = input || {};
  const instrument = String(input.instrument || 'SI').toUpperCase();
  if (['SI', 'SIL'].indexOf(instrument) < 0)
    throw new Error('Liquidity contract instrument must be SI or SIL.');
  const exchange = String(input.exchange || 'COMEX').toUpperCase();
  if (exchange !== 'COMEX') throw new Error('Liquidity contract exchange must be COMEX.');
  const rollover = String(input.rollover_status || 'unknown');
  if (['stable', 'monitoring', 'active_roll', 'expired', 'unknown'].indexOf(rollover) < 0)
    throw new Error('Invalid liquidity rollover_status: ' + rollover);
  const contract = {
    target_instrument:'XAGUSD',
    institutional_reference:'COMEX Silver',
    instrument:instrument,
    product_type:instrument === 'SIL' ? 'micro_silver_future' : 'silver_future',
    exchange:exchange,
    contract:input.contract ? String(input.contract).toUpperCase() : null,
    execution_contract:input.execution_contract ? String(input.execution_contract).toUpperCase() : null,
    front_month:input.front_month ? String(input.front_month).toUpperCase() : null,
    continuous_analytical_reference:input.continuous_analytical_reference ?
      String(input.continuous_analytical_reference) : 'SI continuous analytical reference only',
    expiration:hxSilverIso_(input.expiration),
    rollover_status:rollover,
    volume_migration_status:String(input.volume_migration_status || 'unavailable'),
    open_interest_migration_status:String(input.open_interest_migration_status || 'unavailable'),
    order_books_combined:false,
    combination_methodology:null,
    relationship_limitations:Object.freeze([
      'COMEX liquidity is an institutional futures reference for XAGUSD analysis.',
      'Spot silver prices may differ by provider and spread.',
      'Futures contract structure, rollover, and session behavior apply.',
      'COMEX depth is not the complete global silver market.'
    ]),
    schema_version:HX_SILVER_ORDER_BOOK_CONTRACT_VERSION
  };
  if (input.order_books_combined === true)
    throw new Error('Order books across contracts cannot be combined without an approved methodology.');
  return hxSilverDeepFreeze_(contract);
}

function hxLiquidityCapabilityPermissions_(capability) {
  const connected = capability.connection_status === 'connected' ||
    capability.connection_status === 'degraded';
  const currentDepth = connected && capability.level_2 &&
    capability.depth_levels !== null && capability.depth_levels > 0 &&
    (capability.live_depth || capability.delayed_depth);
  return hxSilverDeepFreeze_({
    provider_connected:connected,
    level_1_quote:connected && capability.level_1,
    resting_liquidity:currentDepth && (capability.market_by_price || capability.market_by_order),
    depth_imbalance:currentDepth && (capability.market_by_price || capability.market_by_order),
    order_events:currentDepth && capability.market_by_order,
    aggressive_flow:connected && capability.trade_tape,
    absorption_native:connected && capability.trade_tape && capability.absorption_native,
    absorption_inferred:connected && capability.trade_tape && capability.absorption_inferred,
    iceberg_native:connected && capability.market_by_order && capability.iceberg_native,
    iceberg_inferred:connected && capability.market_by_order && capability.iceberg_inferred,
    spoofing_risk:connected && capability.market_by_order,
    historical_replay:connected && capability.historical_depth,
    institutional_participation_claim:false,
    rule_version:HX_SILVER_LIQUIDITY_CLAIM_VERSION
  });
}

function hxLiquidityEventPermission_(kind, status, permissions) {
  const mapping = {
    resting_bid_liquidity:'resting_liquidity',
    resting_ask_liquidity:'resting_liquidity',
    depth_imbalance:'depth_imbalance',
    liquidity_addition:'order_events',
    liquidity_cancellation:'order_events',
    liquidity_migration:'order_events',
    aggressive_buy_volume:'aggressive_flow',
    aggressive_sell_volume:'aggressive_flow',
    absorption:status === 'native' ? 'absorption_native' : 'absorption_inferred',
    replenishment:'order_events',
    iceberg_detection:status === 'native' ? 'iceberg_native' : 'iceberg_inferred',
    execution_imbalance:'aggressive_flow',
    auction_acceptance:'aggressive_flow',
    auction_rejection:'aggressive_flow',
    liquidity_void:'resting_liquidity',
    large_resting_order:'resting_liquidity',
    spoofing_risk_condition:'spoofing_risk'
  };
  const permission = mapping[kind];
  return permission ? permissions[permission] === true : false;
}

/**
 * @typedef {Object} LiquidityEvidence
 * @property {string} event_id
 * @property {string} event_kind
 * @property {string} timestamp
 * @property {?number} price
 * @property {?number} size
 * @property {string} side
 * @property {string} source
 * @property {string} contract
 * @property {number} confidence
 * @property {string} detection_status
 * @property {string} detection_method
 * @property {string} freshness
 * @property {Array<string>} reason_codes
 */
function hxLiquidityEvidence_(input, capability) {
  input = input || {};
  capability = capability || hxLiquidityUnavailableCapability_();
  const kind = hxLiquidityEnum_(input.event_kind, HX_LIQUIDITY_EVENT_KINDS, 'event_kind');
  const timestamp = hxSilverIso_(input.timestamp);
  if (!timestamp) throw new Error('LiquidityEvidence timestamp is required.');
  const price = hxLiquidityNum_(input.price);
  const size = hxLiquidityNum_(input.size);
  if (price !== null && price <= 0) throw new Error('LiquidityEvidence price must be positive.');
  if (size !== null && size < 0) throw new Error('LiquidityEvidence size cannot be negative.');
  const side = String(input.side || 'unknown');
  if (['bid', 'ask', 'buy', 'sell', 'both', 'unknown'].indexOf(side) < 0)
    throw new Error('Invalid LiquidityEvidence side: ' + side);
  const status = String(input.detection_status || 'observed');
  if (['native', 'inferred', 'observed'].indexOf(status) < 0)
    throw new Error('Invalid LiquidityEvidence detection_status: ' + status);
  if (['absorption', 'iceberg_detection'].indexOf(kind) >= 0 && status === 'observed')
    throw new Error(kind + ' must be explicitly native or inferred.');
  const confidence = hxLiquidityNum_(input.confidence);
  if (confidence === null || confidence < 0 || confidence > 100)
    throw new Error('LiquidityEvidence confidence must be 0–100.');
  if (!input.source || !input.contract || !input.detection_method)
    throw new Error('LiquidityEvidence source, contract, and detection_method are required.');
  const freshness = String(input.freshness || 'unknown');
  if (HX_SILVER_ENUMS.freshnessStatus.indexOf(freshness) < 0)
    throw new Error('Invalid LiquidityEvidence freshness: ' + freshness);
  const permissions = hxLiquidityCapabilityPermissions_(capability);
  const capabilityPermitted = hxLiquidityEventPermission_(kind, status, permissions);
  const reasonCodes = hxSilverUnique_(
    (input.reason_codes || []).concat(capabilityPermitted ? [] : ['LIQUIDITY_CAPABILITY_UNSUPPORTED'])
  );
  return hxSilverDeepFreeze_({
    event_id:String(input.event_id || [kind, timestamp, side].join('|')),
    event_kind:kind,
    timestamp:timestamp,
    price:price,
    size:size,
    side:side,
    source:String(input.source),
    contract:String(input.contract).toUpperCase(),
    confidence:confidence,
    detection_status:status,
    native_or_inferred:status,
    detection_method:String(input.detection_method),
    freshness:freshness,
    reason_codes:reasonCodes,
    provenance_pointer:String(input.provenance_pointer || ''),
    capability_permitted:capabilityPermitted,
    interpretation_eligible:capabilityPermitted && freshness === 'current',
    evidence_version:HX_SILVER_LIQUIDITY_EVIDENCE_VERSION
  });
}

const HX_LIQUIDITY_FORBIDDEN_CLAIMS = Object.freeze([
  /\binstitutional buyers are accumulating\b/i,
  /\binstitutional sellers are distributing\b/i,
  /\biceberg buying is present\b/i,
  /\biceberg selling is present\b/i,
  /\blarge liquidity is defending price\b/i,
  /\bspoofing is occurring\b/i,
  /\babsorption is confirmed\b/i
]);

function hxLiquidityAssertClaimSafe_(text) {
  text = String(text === null || text === undefined ? '' : text);
  HX_LIQUIDITY_FORBIDDEN_CLAIMS.forEach(pattern => {
    if (pattern.test(text)) throw new Error('Unsupported liquidity claim: ' + pattern);
  });
  return text;
}

function hxLiquidityClaim_(evidence, capability) {
  const permissions = hxLiquidityCapabilityPermissions_(capability);
  if (!evidence || !evidence.interpretation_eligible)
    return hxSilverDeepFreeze_({
      permitted:false,
      text:'No liquidity claim is authorized.',
      reason_codes:hxSilverUnique_((evidence ? evidence.reason_codes : []).concat(['LIQUIDITY_CLAIM_INELIGIBLE'])),
      rule_version:HX_SILVER_LIQUIDITY_CLAIM_VERSION
    });
  let text = 'Liquidity evidence observed.';
  if (evidence.event_kind === 'absorption') {
    text = evidence.detection_status === 'native' && permissions.absorption_native ?
      'Provider-native absorption detected.' : 'Inferred absorption observed.';
  } else if (evidence.event_kind === 'iceberg_detection') {
    text = evidence.detection_status === 'native' && permissions.iceberg_native ?
      'Provider-native iceberg event detected.' : 'Suspected iceberg behavior.';
  } else if (evidence.event_kind === 'replenishment') {
    text = 'Possible replenishment observed.';
  } else if (evidence.event_kind === 'spoofing_risk_condition') {
    text = 'Spoofing risk detected.';
  } else if (['resting_bid_liquidity', 'resting_ask_liquidity', 'large_resting_order']
      .indexOf(evidence.event_kind) >= 0) {
    text = 'Liquidity concentration observed.';
  } else if (evidence.event_kind === 'aggressive_buy_volume') {
    text = 'Aggressive buy volume observed.';
  } else if (evidence.event_kind === 'aggressive_sell_volume') {
    text = 'Aggressive sell volume observed.';
  }
  return hxSilverDeepFreeze_({
    permitted:true,
    text:hxLiquidityAssertClaimSafe_(text),
    native_or_inferred:evidence.detection_status,
    confidence:evidence.confidence,
    reason_codes:evidence.reason_codes,
    rule_version:HX_SILVER_LIQUIDITY_CLAIM_VERSION
  });
}

function hxLiquidityCapabilityFreshness_(capability, evaluatedAt) {
  if (!capability.last_update) return {
    status:'unknown',
    expected_next_update:null,
    reason_code:capability.connection_status === 'not_connected' ?
      'ORDER_BOOK_PROVIDER_NOT_CONNECTED' : 'ORDER_BOOK_TIMESTAMP_MISSING'
  };
  const resolved = hxSilverResolveFreshness_({
    policy_id:'order_book',
    observation_timestamp:capability.last_update,
    evaluated_at:evaluatedAt
  });
  if (capability.delayed_depth && resolved.status === 'current') {
    return {
      status:'delayed',
      expected_next_update:resolved.expected_next_update,
      reason_code:'ORDER_BOOK_DELAYED_DEPTH',
      age_seconds:resolved.age_seconds
    };
  }
  return resolved;
}

function hxLiquidityContractIssues_(capability, contract) {
  const issues = [];
  if (!contract.contract) issues.push('LIQUIDITY_CONTRACT_MISSING');
  if (capability.contract && contract.contract &&
      capability.contract.toUpperCase() !== contract.contract.toUpperCase())
    issues.push('LIQUIDITY_CONTRACT_MISMATCH');
  if (contract.rollover_status === 'active_roll') issues.push('LIQUIDITY_ACTIVE_ROLLOVER');
  if (contract.rollover_status === 'expired') issues.push('LIQUIDITY_CONTRACT_EXPIRED');
  if (capability.exchange.toUpperCase() !== contract.exchange) issues.push('LIQUIDITY_EXCHANGE_MISMATCH');
  return issues;
}

function hxLiquidityUnavailableFields_() {
  return {
    resting_liquidity:null,
    aggressive_buyers:null,
    aggressive_sellers:null,
    absorption:null,
    iceberg_activity:null,
    liquidity_migration:null,
    liquidity_bias:null,
    institutional_participation:null
  };
}

function hxLiquidityProviderStatusText_(status) {
  return ({
    not_connected:'Not connected.',
    connecting:'Connecting; interpretation unavailable.',
    connected:'Connected.',
    degraded:'Connected with degraded capability.',
    failed:'Provider health failure.'
  })[status];
}

function hxLiquidityCurrentState_(capability, freshness, issues, evidence) {
  if (capability.connection_status === 'not_connected' ||
      capability.connection_status === 'failed') return 'provider unavailable';
  if (freshness.status === 'stale' || freshness.status === 'unknown') return 'insufficient evidence';
  if (issues.length) return 'insufficient evidence';
  const permissions = hxLiquidityCapabilityPermissions_(capability);
  if (!permissions.resting_liquidity || !permissions.aggressive_flow) return 'insufficient evidence';
  const eligible = evidence.filter(item => item.interpretation_eligible);
  if (!eligible.length) return 'insufficient evidence';
  const imbalance = eligible.find(item => item.event_kind === 'depth_imbalance');
  if (imbalance) {
    const value = hxLiquidityNum_(imbalance.size);
    if (imbalance.side === 'bid' && value !== null) return 'bid-side liquidity dominant';
    if (imbalance.side === 'ask' && value !== null) return 'offer-side liquidity dominant';
  }
  if (eligible.some(item => item.event_kind === 'absorption')) return 'absorption detected';
  if (eligible.some(item => item.event_kind === 'liquidity_void')) return 'liquidity void nearby';
  if (eligible.some(item => item.event_kind === 'execution_imbalance')) return 'execution pressure increasing';
  return 'mixed';
}

function hxLiquidityInterpretFields_(state, evidence, capability) {
  const fields = hxLiquidityUnavailableFields_();
  if (['provider unavailable', 'insufficient evidence'].indexOf(state) >= 0) return fields;
  const claims = evidence.filter(item => item.interpretation_eligible)
    .map(item => ({evidence:item, claim:hxLiquidityClaim_(item, capability)}));
  const find = kinds => claims.find(row => kinds.indexOf(row.evidence.event_kind) >= 0);
  const resting = find(['resting_bid_liquidity', 'resting_ask_liquidity', 'large_resting_order', 'depth_imbalance']);
  const buyers = find(['aggressive_buy_volume']);
  const sellers = find(['aggressive_sell_volume']);
  const absorption = find(['absorption']);
  const iceberg = find(['iceberg_detection']);
  const migration = find(['liquidity_migration']);
  fields.resting_liquidity = resting ? resting.claim.text : null;
  fields.aggressive_buyers = buyers ? buyers.claim.text : null;
  fields.aggressive_sellers = sellers ? sellers.claim.text : null;
  fields.absorption = absorption ? absorption.claim.text : null;
  fields.iceberg_activity = iceberg ? iceberg.claim.text : null;
  fields.liquidity_migration = migration ? migration.claim.text : null;
  fields.liquidity_bias = state;
  fields.institutional_participation = null;
  return fields;
}

function hxLiquidityConfidence_(capability, freshness, state, evidence) {
  const eligible = evidence.filter(item => item.interpretation_eligible);
  const basis = [];
  if (state === 'provider unavailable') {
    basis.push({code:'LIQUIDITY_PROVIDER_UNAVAILABLE', effect:'confidence unavailable'});
    return {score:null, label:'unavailable', basis:basis};
  }
  if (freshness.status === 'stale' || freshness.status === 'unknown') {
    basis.push({code:'LIQUIDITY_DEPTH_NOT_CURRENT', effect:'confidence unavailable'});
    return {score:null, label:'unavailable', basis:basis};
  }
  if (!eligible.length || state === 'insufficient evidence') {
    basis.push({code:'LIQUIDITY_EVIDENCE_INSUFFICIENT', effect:'confidence unavailable'});
    return {score:null, label:'unavailable', basis:basis};
  }
  let label = eligible.length >= 5 ? 'high' : eligible.length >= 3 ? 'moderate' : 'low';
  basis.push({code:'ELIGIBLE_LIQUIDITY_EVENT_COUNT', effect:'base ' + label, count:eligible.length});
  if (capability.delayed_depth) {
    label = 'low';
    basis.push({code:'LIQUIDITY_DEPTH_DELAYED', effect:'cap low'});
  }
  if (capability.quality_status === 'low') {
    label = 'low';
    basis.push({code:'LIQUIDITY_PROVIDER_QUALITY_LOW', effect:'cap low'});
  }
  if (eligible.some(item => item.detection_status === 'inferred')) {
    if (label === 'high') label = 'moderate';
    basis.push({code:'INFERRED_LIQUIDITY_EVENT', effect:'cap moderate'});
  }
  return {score:null, label:label, basis:basis};
}

function hxSilverRenderLiquidityLong_(interpretation) {
  const detail = interpretation.liquidity_environment;
  if (interpretation.current_state === 'provider unavailable') {
    return [
      'LIQUIDITY ENVIRONMENT',
      '',
      'Institutional order-book data is not yet connected.',
      '',
      'No resting-liquidity, absorption, iceberg, or execution-flow interpretation is authorized.',
      '',
      'Current State: Unavailable.',
      '',
      'Action Bias: No operational conclusion.',
      'Primary Risk: ' + interpretation.primary_risk,
      'Required Confirmation: ' + interpretation.required_confirmation,
      'Confidence: Unavailable.'
    ].join('\n');
  }
  return [
    'LIQUIDITY ENVIRONMENT',
    'Institutional reference: COMEX Silver / ' + (detail.contract || 'contract unavailable'),
    'Provider Status: ' + detail.provider_status,
    'Current State: ' + interpretation.current_state + '.',
    'Silver Impact: ' + interpretation.silver_impact,
    'Action Bias: ' + hxSilverOperationalLanguage_(interpretation.action_bias),
    'Primary Risk: ' + interpretation.primary_risk,
    'Required Confirmation: ' + interpretation.required_confirmation,
    'Confidence: ' + hxSilverConfidenceText_(interpretation)
  ].join('\n');
}

function hxSilverRenderLiquidityShort_(interpretation) {
  if (interpretation.current_state === 'provider unavailable')
    return 'Liquidity: Order-book provider not connected.';
  return 'Liquidity: ' + interpretation.current_state + '; ' +
    hxSilverOperationalLanguage_(interpretation.action_bias) + '.';
}

function hxSilverRenderLiquidityDashboard_(interpretation) {
  const detail = interpretation.liquidity_environment;
  return hxSilverDeepFreeze_({
    target_instrument:'XAGUSD',
    institutional_reference:'COMEX Silver / SI',
    section_id:'liquidity_environment',
    headline:'Liquidity Environment',
    status:interpretation.source_status,
    freshness:interpretation.freshness_status,
    primary_display:interpretation.current_state === 'provider unavailable' ?
      'Waiting for institutional order-book provider.' : interpretation.current_state,
    silver_impact:interpretation.silver_impact,
    action_bias:interpretation.action_bias,
    action_language:hxSilverOperationalLanguage_(interpretation.action_bias),
    confidence_score:interpretation.confidence_score,
    confidence_label:interpretation.confidence_label,
    primary_risk:interpretation.primary_risk,
    required_confirmation:interpretation.required_confirmation,
    expandable:{
      supported_future_sources:[
        'Sierra Chart',
        'Bookmap',
        'Quantower',
        'broker DOM',
        'exchange depth feed',
        'another approved institutional order-book source'
      ],
      comex_silver_target:'SI or approved Micro Silver execution contract',
      provider_status:detail.provider_status,
      capability:detail.capability,
      contract_model:detail.contract_model,
      no_false_neutrality:true,
      interpretation_available:interpretation.current_state !== 'provider unavailable' &&
        interpretation.current_state !== 'insufficient evidence',
      evidence:interpretation.underlying_metrics,
      provenance:interpretation.source_provenance,
      limitations:interpretation.limitations,
      reason_codes:interpretation.reason_codes
    },
    schema_version:interpretation.schema_version,
    renderer_version:HX_SILVER_VERSIONS.renderer,
    liquidity_rule_version:HX_SILVER_LIQUIDITY_VERSION
  });
}

function hxSilverBuildLiquidityEnvironment_(input, evaluatedAt) {
  input = input || {};
  const asOf = hxSilverIso_(evaluatedAt);
  if (!asOf) throw new Error('Liquidity Environment evaluatedAt is required.');
  const capability = input.capability ?
    hxLiquidityCapability_(input.capability) : hxLiquidityUnavailableCapability_();
  const contract = hxLiquidityContract_(input.contract || {});
  const freshness = hxLiquidityCapabilityFreshness_(capability, asOf);
  const rawEvidence = Array.isArray(input.evidence) ? input.evidence : [];
  const evidence = rawEvidence.map(item => hxLiquidityEvidence_(item, capability));
  const issues = hxLiquidityContractIssues_(capability, contract);
  if (capability.connection_status === 'failed') issues.push('LIQUIDITY_PROVIDER_HEALTH_FAILURE');
  if (capability.connection_status === 'not_connected') issues.push('ORDER_BOOK_PROVIDER_NOT_CONNECTED');
  if (capability.level_1 && !capability.level_2) issues.push('LIQUIDITY_LEVEL_1_ONLY');
  if (capability.level_2 && capability.market_by_price && !capability.market_by_order)
    issues.push('LIQUIDITY_MARKET_BY_PRICE_ONLY');
  if (capability.delayed_depth) issues.push('LIQUIDITY_DELAYED_DEPTH');
  if (freshness.status === 'stale') issues.push('LIQUIDITY_DEPTH_STALE');
  const reasonCodes = hxSilverUnique_(issues.concat(
    evidence.reduce((all, item) => all.concat(item.reason_codes || []), [])
  ));
  const state = hxLiquidityCurrentState_(capability, freshness, reasonCodes, evidence);
  const fields = hxLiquidityInterpretFields_(state, evidence, capability);
  const providerUnavailable = state === 'provider unavailable';
  const sourceStatus = capability.connection_status === 'failed' ? 'failed' :
    providerUnavailable ? 'unavailable' :
    capability.connection_status === 'degraded' ? 'partial' : 'available';
  const silverImpact = providerUnavailable || state === 'insufficient evidence' ?
    'No liquidity interpretation is authorized.' :
    'COMEX Silver liquidity context is available as a futures reference; XAGUSD structure must confirm its relevance.';
  const limitations = hxSilverUnique_(
    contract.relationship_limitations.concat([
      providerUnavailable ? 'order-book provider not connected' : '',
      capability.level_1 && !capability.level_2 ? 'Level 1 cannot support resting-depth interpretation' : '',
      capability.delayed_depth ? 'order-book depth is delayed' : '',
      freshness.status === 'stale' ? 'order-book depth is stale' : '',
      !contract.contract ? 'exact COMEX execution contract unavailable' : '',
      state === 'insufficient evidence' ? 'capabilities or evidence are insufficient for liquidity interpretation' : ''
    ])
  );
  const confidence = hxLiquidityConfidence_(capability, freshness, state, evidence);
  const providerStatus = hxLiquidityProviderStatusText_(capability.connection_status);
  const primaryRisk = providerUnavailable ?
    'Treating unavailable order-book fields as neutral would create false liquidity intelligence.' :
    reasonCodes.length ? reasonCodes[0] + ' prevents a complete liquidity conclusion.' :
    'COMEX futures depth is not the complete global silver market.';
  const requiredConfirmation = providerUnavailable ?
    'Connect and approve an institutional COMEX Silver order-book provider with explicit capability and contract metadata.' :
    'Confirm current contract identity, depth freshness, provider capabilities, and eligible order/trade evidence.';
  const detail = Object.assign({
    provider_status:providerStatus,
    order_book_source:capability.provider_name === 'none' ? null : capability.provider_name,
    instrument:'COMEX Silver / SI',
    contract:contract.contract,
    exchange:'COMEX',
    data_depth:capability.depth_levels,
    current_state:providerUnavailable ? 'Institutional order-book data unavailable.' : state,
    capability:capability,
    capability_permissions:hxLiquidityCapabilityPermissions_(capability),
    contract_model:contract,
    data_freshness:{
      status:freshness.status,
      last_update:capability.last_update,
      expected_next_update:freshness.expected_next_update || null,
      delay_seconds:capability.delay_seconds,
      reason_code:freshness.reason_code
    },
    provider_interface:{
      required_methods:HX_LIQUIDITY_PROVIDER_METHODS.slice(),
      invoked:false,
      contract_version:HX_SILVER_ORDER_BOOK_CONTRACT_VERSION
    },
    ingestion_boundary:HX_LIQUIDITY_INGESTION_BOUNDARY,
    retention_model:HX_LIQUIDITY_RETENTION_MODEL,
    rule_version:HX_SILVER_LIQUIDITY_VERSION
  }, fields);
  const sourceProvenance = {
    target_instrument:'XAGUSD',
    institutional_reference:'COMEX Silver / SI',
    provider:capability.provider_name,
    provider_version:capability.provider_version,
    source_timestamp:capability.last_update,
    contract:contract.contract,
    exchange:contract.exchange,
    evidence:eventProvenance_(evidence),
    capability_schema_version:HX_SILVER_ORDER_BOOK_CONTRACT_VERSION,
    evidence_schema_version:HX_SILVER_LIQUIDITY_EVIDENCE_VERSION,
    claim_rule_version:HX_SILVER_LIQUIDITY_CLAIM_VERSION,
    interpretation_rule_version:HX_SILVER_LIQUIDITY_VERSION
  };
  const base = {
    section_id:'liquidity_environment',
    section_name:'Liquidity Environment',
    target_instrument:'XAGUSD',
    as_of:asOf,
    market_session:String(input.market_session || 'unknown'),
    source_status:sourceStatus,
    freshness_status:freshness.status,
    evidence_state:providerUnavailable ? 'placeholder' : 'validated',
    current_state:state,
    interpretation:providerUnavailable ?
      'Institutional order-book data is not yet connected.' :
      'Liquidity capability state is ' + state + '; claims remain limited by provider capability and evidence eligibility.',
    market_impact:providerUnavailable ?
      'No order-book market-impact interpretation is authorized.' :
      'COMEX Silver order-book context is capability-limited and contract-specific.',
    silver_impact:silverImpact,
    action_bias:'no_operational_conclusion',
    primary_support:'none',
    primary_challenge:providerUnavailable ? 'order_book_provider_not_connected' :
      reasonCodes[0] || 'capability_limited',
    primary_risk:primaryRisk,
    required_confirmation:requiredConfirmation,
    confidence_score:null,
    confidence_label:confidence.label,
    confidence_basis:confidence.basis,
    limitations:limitations,
    reason_codes:reasonCodes,
    source_provenance:sourceProvenance,
    underlying_metrics:evidence,
    liquidity_environment:detail,
    operator_summary:requiredConfirmation,
    long_summary:null,
    short_summary:null,
    dashboard_summary:null,
    telegram_summary:null,
    notification_permitted:false,
    production_effect:'none',
    rule_version:HX_SILVER_VERSIONS.rule,
    schema_version:HX_SILVER_VERSIONS.schema
  };
  base.long_summary = hxLiquidityAssertClaimSafe_(hxSilverRenderLiquidityLong_(base));
  base.short_summary = hxLiquidityAssertClaimSafe_(hxSilverRenderLiquidityShort_(base));
  base.dashboard_summary = hxSilverRenderLiquidityDashboard_(base);
  [
    base.interpretation,
    base.market_impact,
    base.silver_impact,
    base.primary_risk,
    base.required_confirmation,
    base.operator_summary
  ].forEach(hxLiquidityAssertClaimSafe_);
  const frozen = hxSilverDeepFreeze_(base);
  const validation = hxSilverValidateInterpretation_(frozen);
  if (!validation.ok) throw new Error('Invalid Liquidity Environment interpretation: ' + validation.errors.join(','));
  if (HX_LIQUIDITY_STATES.indexOf(frozen.current_state) < 0)
    throw new Error('Invalid Liquidity Environment state: ' + frozen.current_state);
  return frozen;
}

function eventProvenance_(evidence) {
  return evidence.map(item => ({
    event_id:item.event_id,
    event_kind:item.event_kind,
    timestamp:item.timestamp,
    source:item.source,
    contract:item.contract,
    detection_status:item.detection_status,
    detection_method:item.detection_method,
    freshness:item.freshness,
    confidence:item.confidence,
    reason_codes:item.reason_codes,
    provenance_pointer:item.provenance_pointer
  }));
}

function hxSilverLiquidityEnvironmentPreview_(input, evaluatedAt) {
  if (!hxSilverIntelligencePreviewEnabled_()) throw new Error('HEL035_INTERNAL_PREVIEW_DISABLED');
  return hxSilverBuildLiquidityEnvironment_(input, evaluatedAt);
}
