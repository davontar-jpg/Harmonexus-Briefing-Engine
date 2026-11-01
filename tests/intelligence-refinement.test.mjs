import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({console});
for (const f of fs.readdirSync('src').filter(f=>f.endsWith('.gs')).sort()) vm.runInContext(fs.readFileSync('src/'+f,'utf8'),context);
const fn = name => vm.runInContext(name,context);

test('signed display preserves calibrated magnitude, neutral and missingness',()=>{
  assert.equal(fn('hxSignedDisplay_')('Bearish',4.8),'−4.8/10');
  assert.equal(fn('hxSignedDisplay_')('Bullish',6.5),'+6.5/10');
  assert.equal(fn('hxSignedDisplay_')('Neutral',1),'0.0/10');
  assert.equal(fn('hxSignedDisplay_')('Bullish',null),'UNKNOWN');
});
test('signed reversal reports net bias movement instead of magnitude change',()=>{
  assert.match(fn('hxSignedTransition_')({'Prior Direction':'Bullish','Prior Strength':3.5,Direction:'Bearish',Strength:4.5}),/net bias change: −8.0 points; direction reversal/);
});
test('unchanged current observations remain usable; future and stale do not',()=>{
  const input={value:19,previous_value:19,observed_at:'2026-10-30T20:00:00Z',freshness_seconds:86400};
  assert.equal(fn('hxSourceHealth_')(input,'2026-10-30T21:00:00Z').status,'UNCHANGED');
  assert.equal(fn('hxSourceHealth_')(input,'2026-10-29T21:00:00Z').usable,false);
  assert.equal(fn('hxSourceHealth_')(input,'2026-11-02T21:00:00Z').status,'STALE');
});
test('auction evidence does not invent phases or liquidity from scores',()=>{
  const score={instrument:'XAGUSD',direction:'Bearish',strength:4.8};
  const e=fn('hxAuctionEvidence_')(score,[], '2026-11-01T12:00:00Z');
  assert.equal(e.phase,'UNKNOWN'); assert.equal(e.eligible,false);
  const r={Instrument:'XAGUSD','As Of':'2026-11-01T11:00:00Z',Source:'Structure',Quality:'validated','Auction Phase':'balance','Structural Condition':'intact','Inferred Auction Destination':'prior range low','Continuation Condition':'acceptance below range','Invalidation Condition':'acceptance above range'};
  const current=fn('hxAuctionEvidence_')(score,[r],'2026-11-01T12:00:00Z');
  assert.equal(current.phase,'balance');assert.equal(current.eligible,true);
  const lines=fn('hxAuctionLines_')(current,false).join('\n');
  assert.ok(lines.indexOf('Structure:')<lines.indexOf('Liquidity hypothesis:'));
  assert.ok(lines.indexOf('Confirmation:')<lines.indexOf('Directional bias:'));
  assert.match(lines,/not verified orders/);
  assert.equal(fn('hxAuctionEvidence_')(score,[r],'2026-11-04T12:00:00Z').eligible,false);
});
test('VIX selects chronological latest Date row, rejects blanks and does not claim weekday closure',()=>{
  const rows=[{Date:new Date('2026-10-01T00:00:00Z'),VIXCLS:17},{Date:new Date('2026-09-30T00:00:00Z'),VIXCLS:20},{Date:new Date('2026-10-02T00:00:00Z'),VIXCLS:''}];
  const r=fn('hxSilverRuntimeFredVix_')(rows,'2026-10-02T12:00:00Z');
  assert.equal(r.vix.level,17);assert.equal(r.vix.previous_close,20);assert.equal(r.vix.market_session.status,'unknown');
});
test('perfect score alignment does not imply very high evidence confidence',()=>{
  const r=fn('hxMacroConsensusEngine_')([{instrument:'DXY',score:6,confidence:35},{instrument:'XAGUSD',score:-4,confidence:35},{instrument:'GOLD',score:-5,confidence:35}]);
  assert.equal(r.score,100);assert.notEqual(r.confidence,'Very High');assert.equal(r.evidenceConfidence,35);
  assert.match(r.scope,/not independent/);
});
test('HTML email escapes evidence and retains accessible plain-text path',()=>{
  const r=fn('hxEmailHtml_')('HARMONEXUS\nXAGUSD −4.8/10\n<script>alert(1)</script>');
  assert.ok(!r.includes('<script>'));assert.match(r,/&lt;script&gt;/);assert.match(r,/viewport/);assert.match(r,/−4.8\/10/);
});
test('all 19 instruments render signed calibrated strengths without changing their rows',()=>{
  const registry=fn('INSTRUMENTS'); assert.equal(Object.keys(registry).length,19);
  for(const instrument of Object.keys(registry)) {
    const row={Instrument:instrument,Family:registry[instrument].family,Direction:'Bearish',Strength:4.8,Confidence:52,'Directional Score':-8,'Strongest Drivers':'[]',Contradictions:'[]'};
    const before=JSON.stringify(row);
    const short=fn('formatTelegramMorningBriefing')([row]);
    const long=fn('formatEmailMorningBriefing')([row]);
    assert.match(short,/−4.8\/10/); assert.match(long,/−4.8\/10/);
    assert.match(short,/CIO SUMMARY/); assert.ok(short.length<=3900);
    assert.equal(JSON.stringify(row),before);
  }
});
test('FRED Date-valued observations are ordered by time and date-formatted yields are rejected',()=>{
  assert.equal(fn('hxFredNumber_')(new Date('1900-01-03')),null);
  const original=context.hxRowsAsObjects_;
  context.hxRowsAsObjects_=()=>[{Date:new Date('2026-09-30T00:00:00Z'),REAL10Y:2},{Date:new Date('2026-10-01T00:00:00Z'),REAL10Y:2.1}];
  const calls=[];
  fn('hxFredSignalCandidates_')({getSheetByName:()=>({})},(...args)=>calls.push(args));
  context.hxRowsAsObjects_=original;
  assert.ok(calls.length>0);assert.ok(Math.abs(calls[0][2]-.1)<.000001);
  assert.equal(calls[0][5].toISOString(),'2026-10-01T00:00:00.000Z');
});
test('daily per-recipient idempotency blocks duplicate and ambiguous sends',()=>{
  const state={};let sends=0;
  context.PropertiesService={}; context.hxProps_=()=>({getProperty:k=>state[k],setProperty:(k,v)=>{state[k]=v},getProperties:()=>state,deleteProperty:k=>{delete state[k]}});
  context.Utilities={computeDigest:(_,s)=>s,base64EncodeWebSafe:s=>s,DigestAlgorithm:{SHA_256:'sha'}};
  const send=()=>{sends++;return {ok:true,status:'sent'}};
  const guard=fn('hxDailyDeliveryGuard_'); const options={dailyKey:'2026-11-01'};
  guard('Telegram','synthetic-recipient','Daily Briefing',options,send);
  const second=guard('Telegram','synthetic-recipient','Daily Briefing',options,send);
  assert.equal(sends,1);assert.match(second.status,/already delivered/);
  guard('Email','synthetic-recipient','Daily Briefing',options,()=>({ok:false,status:'failed'}));
  const pending=guard('Email','synthetic-recipient','Daily Briefing',options,send);
  assert.equal(sends,1);assert.equal(pending.ok,false);
});
