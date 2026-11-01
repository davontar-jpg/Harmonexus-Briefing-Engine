/** Presentation and evidence adapters. Never supplies inputs to directional scoring. */
function hxSignedDisplay_(direction, magnitude) {
  if (magnitude === null || magnitude === undefined || magnitude === '' || !isFinite(Number(magnitude))) return 'UNKNOWN';
  const label = String(direction || '').toLowerCase();
  if (!/^(bullish|bearish|neutral)$/.test(label)) return 'UNKNOWN';
  const value = label === 'neutral' ? 0 : Math.min(10, Math.abs(Number(magnitude))) * (label === 'bearish' ? -1 : 1);
  return (value > 0 ? '+' : value < 0 ? '−' : '') + Math.abs(value).toFixed(1) + '/10';
}

function hxSignedTransition_(row) {
  const prior = hxSignedDisplay_(row['Prior Direction'], row['Prior Strength']);
  const current = hxSignedDisplay_(row.Direction, row.Strength);
  if (prior === 'UNKNOWN' || current === 'UNKNOWN') return 'Prior signed reading unavailable.';
  const num = text => Number(text.replace('−', '-').replace('/10', ''));
  const delta = num(current) - num(prior);
  const flipped = num(current) * num(prior) < 0;
  return 'Previous: ' + prior + ' → Current: ' + current + '; net bias change: ' +
    (delta >= 0 ? '+' : '−') + Math.abs(delta).toFixed(1) + ' points' + (flipped ? '; direction reversal.' : '.');
}

function hxObservedNumber_(value) {
  return value === '' || value === null || value === undefined || !isFinite(Number(value)) ? null : Number(value);
}

/** Observation time governs freshness; an unchanged value alone is not a stale signal. */
function hxSourceHealth_(input, evaluatedAt) {
  const observed = Date.parse(input.observed_at), evaluated = Date.parse(evaluatedAt);
  if (input.failed === true) return {status:'SOURCE FAILED', usable:false};
  if (hxObservedNumber_(input.value) === null || !isFinite(observed) || !isFinite(evaluated)) return {status:'UNAVAILABLE', usable:false};
  const age = (evaluated - observed) / 1000;
  if (age < 0) return {status:'UNAVAILABLE', usable:false, reason:'FUTURE_OBSERVATION'};
  const limit = Number(input.freshness_seconds);
  if (!(limit > 0)) return {status:'UNAVAILABLE', usable:false, reason:'FRESHNESS_POLICY_MISSING'};
  if (age > limit) return {status:'STALE', usable:false, age_seconds:age};
  const status = input.market_closed === true ? 'MARKET CLOSED' : input.delayed === true ? 'DELAYED' :
    input.previous_value !== undefined && hxObservedNumber_(input.previous_value) === Number(input.value) ? 'UNCHANGED' : 'CURRENT';
  return {status:status, usable:true, age_seconds:age};
}

/** Only explicitly recorded, current, source-attributed structure is eligible. */
function hxAuctionEvidence_(score, records, evaluatedAt) {
  const candidates = (records || []).filter(r => String(r.Instrument || r.Asset || '').toUpperCase() === score.instrument)
    .sort((a,b) => Date.parse(b['As Of'] || b['Last Updated'] || b.Timestamp) - Date.parse(a['As Of'] || a['Last Updated'] || a.Timestamp));
  const r = candidates[0] || {};
  const timestamp = r['As Of'] || r['Last Updated'] || r.Timestamp;
  const age = Date.parse(evaluatedAt) - Date.parse(timestamp);
  const current = isFinite(age) && age >= 0 && age <= 24 * 3600000 && Boolean(r.Source) &&
    /^(valid|validated|verified)$/i.test(String(r.Quality || ''));
  const field = name => current && r[name] ? String(r[name]).slice(0,240) : 'UNKNOWN';
  const phase = field('Auction Phase'), condition = field('Structural Condition');
  const allowed = /^(balance|expansion|distribution|accumulation|continuation|exhaustion|transition)$/i;
  // Liquidity destinations are always hypotheses; verified book liquidity needs a separate licensed adapter.
  return {instrument:score.instrument, observed_at:timestamp || null, source:r.Source || null,
    eligible:current, phase:allowed.test(phase) ? phase : 'UNKNOWN',
    condition:/^(intact|challenged|broken|unresolved)$/i.test(condition) ? condition : 'UNKNOWN',
    liquidity:field('Inferred Auction Destination'), liquidity_kind:'inferred destination, not verified resting orders',
    participation:field('Participation Quality'), positioning:field('Positioning Alignment'),
    confirmation:field('Continuation Condition'), invalidation:field('Invalidation Condition'),
    observed_behavior:field('Observed Acceptance/Rejection'), changed:field('Structure Change'),
    bias:hxSignedDisplay_(score.direction, score.strength)};
}

function hxAuctionLines_(evidence, compact) {
  if (!evidence.eligible) return ['Structure: UNKNOWN — validated current structure record unavailable.', 'Directional bias: '+evidence.bias];
  if (compact) {
    const clip = value => String(value).slice(0,40);
    return ['Structure: '+evidence.phase+' · '+evidence.condition,
      'Liquidity hypothesis: '+clip(evidence.liquidity)+' (unverified orders)',
      'Participation: '+clip(evidence.participation)+'; Positioning: '+clip(evidence.positioning),
      'Confirmation: '+clip(evidence.confirmation), 'Directional bias: '+evidence.bias,
      'Invalidation: '+clip(evidence.invalidation)];
  }
  const lines = ['Structure: '+evidence.phase+' · '+evidence.condition,
    'Liquidity hypothesis: '+evidence.liquidity+' (not verified orders)',
    'Participation: '+evidence.participation, 'Positioning: '+evidence.positioning,
    'Confirmation: '+evidence.confirmation, 'Directional bias: '+evidence.bias,
    'Invalidation: '+evidence.invalidation];
  if (!compact) lines.push('Observed acceptance/rejection: '+evidence.observed_behavior, 'Structure change: '+evidence.changed,
    'Source: '+evidence.source+' · observed '+evidence.observed_at);
  return lines;
}

function hxBriefingStructureRecords_() {
  if (typeof SpreadsheetApp === 'undefined') return [];
  try {
    const sh = SpreadsheetApp.getActive().getSheetByName(HX.sheets.structure);
    return sh ? hxRowsAsObjects_(sh) : [];
  } catch (error) {
    hxNotificationLogEvent_('WARN','Structure unavailable for briefing',{});
    return [];
  }
}

/** Escape all evidence. Keep plain text as the accessible email alternative. */
function hxEmailHtml_(text) {
  const escape = value => String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const body = String(text).split('\n').map(line => {
    if (/^━+$/.test(line)) return '<hr style="border:0;border-top:1px solid #455261;margin:24px 0">';
    if (/^[A-Z][A-Z /:—-]{3,}$/.test(line.trim())) return '<h2 style="font-size:15px;letter-spacing:1px;color:#e6c88c">'+escape(line)+'</h2>';
    const safe = escape(line).replace(/([+−-]\d+(?:\.\d+)?\/10)/g, token => '<strong style="color:'+(token[0]==='+'?'#7fe0b0':'#ffacaa')+'">'+token+'</strong>');
    return '<div style="margin:5px 0;overflow-wrap:anywhere">'+(safe || '&nbsp;')+'</div>';
  }).join('');
  return '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#101820;color:#edf1f3;font:15px/1.55 Arial,sans-serif"><main style="max-width:760px;margin:auto;padding:24px">'+body+'</main></body></html>';
}

/** Recipient-level daily idempotency. An ambiguous in-flight attempt requires audit, never automatic replay. */
function hxDailyDeliveryGuard_(provider, recipient, alertType, options, send) {
  if (alertType !== 'Daily Briefing' || !options.dailyKey || typeof PropertiesService === 'undefined') return send();
  const props = hxProps_();
  const digest = Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, provider+'|'+recipient));
  const key = 'HX_DELIVERY_'+options.dailyKey+'_'+digest;
  const state = props.getProperty(key);
  if (state === 'SENT') return {provider:provider,recipient:recipient,ok:true,status:provider+': already delivered'};
  if (state) return {provider:provider,recipient:recipient,ok:false,status:provider+': pending delivery audit',error:'Ambiguous prior attempt; replay blocked.'};
  props.setProperty(key,'IN_FLIGHT');
  const result = send();
  if (result.ok) props.setProperty(key,'SENT');
  // Old sent markers are bounded; ambiguous states are deliberately retained for operator review.
  const cutoff = Date.now()-35*86400000;
  Object.keys(props.getProperties()).filter(k=>/^HX_DELIVERY_\d{4}-\d{2}-\d{2}_/.test(k)).forEach(k=>{
    if (Date.parse(k.slice(12,22)) < cutoff && props.getProperty(k)==='SENT') props.deleteProperty(k);
  });
  return result;
}
