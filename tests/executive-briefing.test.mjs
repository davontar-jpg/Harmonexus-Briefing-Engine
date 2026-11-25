import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

function harness() {
  const p=new Map(), logs=[];
  const props={getProperty:k=>p.get(k)||null,setProperty:(k,v)=>p.set(k,v),
    setProperties:o=>Object.entries(o).forEach(([k,v])=>p.set(k,v)),getProperties:()=>Object.fromEntries(p),deleteProperty:k=>p.delete(k)};
  const ctx=vm.createContext({Date,PropertiesService:{getScriptProperties:()=>props},console:{log(){}},Utilities:{
    formatDate:(x,tz,f)=>f==='yyyy-MM-dd'?x.toISOString().slice(0,10):f==='EEE'?'Fri':'09:00',
    DigestAlgorithm:{SHA_256:'SHA_256'},computeDigest:(alg,v)=>createHash('sha256').update(v).digest(),base64EncodeWebSafe:b=>b.toString('base64url')
  }});
  for(const f of ['00_Config','01_Utils','03_Scoring','04_AI','05_Notifications','10_RelationshipEngines','11_MarketCalendarWatch',
    '24_IntelligenceRefinement','25_ExecutiveArchive','26_ExecutiveBriefing','27_ExecutiveDelivery'])
    vm.runInContext(readFileSync('src/'+f+'.gs','utf8'),ctx,{filename:f});
  ctx.hxNotificationLogEvent_=(...args)=>logs.push(args);
  return {c:ctx,p,logs};
}

const row=(Instrument,Direction,Strength,Family='metal',additional={})=>({Instrument,Direction,Strength,Family,Confidence:80,
  'Directional Score':Direction==='Bullish'?Strength:-Strength,'Strongest Drivers':'[{"factor":"DXY","contribution":0.3}]',
  Contradictions:'[{"factor":"OI","contribution":-0.25}]',...additional});
const edits=['HARMONEXUS: EDITION I OF II','HARMONEXUS: EDITION II OF II'];
const options={dailyKey:'2026-11-24',runtimeId:'verified-runtime'};

test('shared snapshot separates delayed daily levels, stale shadow, and historical pullback observations',()=>{
  const {c}=harness(), now=new Date('2026-11-24T14:00:00Z');
  const rows=[row('XAGUSD','Bullish',5.7),row('DXY','Bearish',4,'fx'),row('GOLD','Bullish',5.2),row('US10Y','Bearish',7,'rates')];
  const runtime={runtime_id:'HEL-035:verified',integration:{sections:[{section_id:'silver_intelligence',silver_intelligence:{subsections:[
    {subsection_id:'industrial_producer_participation',current_timestamp:'2026-07-17T00:00:00Z',current_freshness:'current',source_status:'available',current_state:'Declining',relationship:'challenging'}]}}]}};
  const fred=[{Source:'FRED',Date:'2026-11-20',US2Y:4.63,US10Y:4.92,REAL10Y:2.77,VIXCLS:35.89},
    {Source:'FRED',Date:'2026-11-19',US2Y:4.76,US10Y:5.04,REAL10Y:2.88,VIXCLS:28.44},
    {Source:'FRED',Date:'2026-11-25',US2Y:99,US10Y:99,REAL10Y:99,VIXCLS:99}];
  const result=c.hxExecutiveRender_(c.hxExecutiveBriefingSnapshot_({rows,structure:[],runtime,fred,now}));
  const [one,two]=result.telegramEditions;
  assert.ok(c.hxExecutiveEditionValid_([one,two]));
  assert.ok([one,two,result.emailMessage].every(x=>x.includes(runtime.runtime_id)));
  assert.match(one,/US 2Y: 4\.63% \(-13 bp\).*stale/);
  assert.match(one,/2s10s: 29 bp/);
  assert.match(one,/Nonfarm payrolls — USD and front-end rates/);
  assert.match(one,/2026-11-25 · 08:30 ET · PCE inflation and Q3 GDP/);
  assert.doesNotMatch(c.hxExecutiveReleaseTimes_(now,'2026-11-25','08:31').lines.join('\n'),/second estimate/);
  assert.match(one,/Closed: Thursday — Thanksgiving Day/);
  assert.match(one,/Early Close: Friday — day after Thanksgiving/);
  assert.doesNotMatch(one,/99\.00|Quod|Full institutional analysis/);
  assert.match(two,/Historical references, not validated stops/);
  assert.match(two,/No verified current spot candles/);
  assert.match(two,/2026-07-17; omitted/);
  assert.doesNotMatch(two,/COPX · Declining|weekly prefix:/);
  assert.match(result.emailMessage,/Histor|histor/);
  for(const x of [two,result.emailMessage]) assert.equal((x.match(/Quod acquisitum/g)||[]).length,1);
});

test('whole optional sections are dropped before critical Telegram material and UTF-16 budget enforced',()=>{
  const {c}=harness();
  const must=c.hxExecutiveSection_('PRIORITIES',['Priority XAGUSD'],true);
  const bloated=c.hxExecutiveSection_('OVERSIZE',['😀'.repeat(2000)]);
  const next=c.hxExecutiveSection_('CALENDAR',['FOMC'],true);
  const result=c.hxExecutiveTelegram_(['header'],[must,bloated,next],['footer']);
  assert.match(result,/Priority XAGUSD/); assert.match(result,/FOMC/); assert.doesNotMatch(result,/OVERSIZE/);
  assert.throws(()=>c.hxExecutiveTelegram_(['header'],[{...bloated,required:true}],[]),/exceeds Telegram budget/);
});

test('Telegram and email share one executive point block with no duplicate trailing statistics',()=>{
  const {c}=harness(), now=new Date('2026-11-24T14:00:00Z');
  const rows=[row('XAGUSD','Bullish',5.7,'metal',{'Regime Age':1}),row('DXY','Bearish',4,'fx')];
  const model=c.hxExecutiveBriefingSnapshot_({rows,structure:[],runtime:null,fred:[],now});
  model.liveProvider='biquote';
  model.auctionLines={range:['UTC day range verified.'],extremes:[],sessions:[],structure:[]};
  const silver=model.silver;
  silver.regimeAge=1;
  silver.primaryDrivers=[{factor:'US10Y',delta:1},{factor:'REAL10Y',delta:1}];
  model.changed=[silver];
  const result=c.hxExecutiveRender_(model);
  const t=vm.runInContext('HX_TREND_PRESERVATION',c);
  const block = t.title+'\n\n'+t.text;
  for(const body of [result.telegramEditions[1],result.emailMessage]) {
    assert.ok(body.includes(block));
    assert.doesNotMatch(body,/HISTORICAL RETRACEMENT|RETRACEMENT & TRAILING REFERENCE|Observable-prefix replay/);
    assert.equal(body.split(t.title).length,2);
  }
  assert.match(block,/Daily trend trail\nBullish: 177 pts\nBearish: 166 pts\n\nWeekly trend trail\nBullish: 595 pts\nBearish: 601 pts/);
  assert.match(block,/Monthly trend trail: Pending sufficient evidence\./);
  assert.doesNotMatch(block, /p75|n=|sample count|Rolling weekly/i);
  assert.doesNotMatch(result.telegramEditions[1],/OANDA|1 sessions/);
  assert.match(result.telegramEditions[1],/1 session in regime/);
  assert.match(result.telegramEditions[1],/biquote indicative OTC midpoint; closed bars\. UTC ranges are not broker trading-session ranges/);
  assert.doesNotMatch(result.emailMessage,/Yield divergence; Yield divergence/);
  assert.equal(c.hxExecutiveTelegram_([], [{title:'CONSENSUS &amp; ROTATION',lines:['verified'],required:true}]),'CONSENSUS & ROTATION\nverified');
  assert.ok(c.hxExecutiveEditionValid_(result.telegramEditions));
});

test('definitive Edition II rejection can retry only II; stale regenerated text does not replace the frozen brief',()=>{
  const {c}=harness(), attempted=[];
  const first=c.hxExecutiveDailyPayload_(options,'full report',edits);
  let res=c.hxExecutiveTelegramDelivery_('one-recipient',options,first.editions,text=>{
    attempted.push(text);return attempted.length===1?{status:'accepted',id:123}:{status:'rejected',reason:'HTTP 429'};
  });
  assert.equal(res[0].outcome,'accepted'); assert.equal(res[1].outcome,'rejected');
  const retry=c.hxExecutiveDailyPayload_({...options,runtimeId:'new-published-snapshot'},'different email',edits.map(s=>s+' different'));
  assert.equal(retry.email,'full report'); assert.equal(retry.runtime,'verified-runtime');
  res=c.hxExecutiveTelegramDelivery_('one-recipient',options,retry.editions,text=>{attempted.push(text);return {status:'accepted',id:456};});
  assert.equal(res[0].outcome,'already delivered'); assert.equal(res[1].outcome,'accepted');
  assert.deepEqual(attempted,[edits[0],edits[1],edits[1]]);
  c.hxExecutiveTelegramDelivery_('one-recipient',options,edits,()=>assert.fail('Duplicate provider invocation'));
});

test('timeout or ruleset rollback cannot replay a partially accepted edition',()=>{
  const {c,p}=harness(); const attempts=[];
  c.hxExecutiveTelegramDelivery_('r',options,edits,text=>{attempts.push(text);return attempts.length===1?{status:'accepted',id:777}:{status:'ambiguous'};});
  const result=c.hxExecutiveTelegramDelivery_('r',options,edits,()=>assert.fail('Ambiguous attempt cannot retry'));
  assert.equal(result[1].outcome,'audit required');
  c.hxDailyDeliveryGuard_('Telegram','r','Daily Briefing',options,()=>assert.fail('V1 must not reopen the day'));
  const marker=[...p.keys()].find(k=>k.startsWith('HX_DELIVERY') && !k.includes('_V2_'));
  p.set(marker,'SENT');
  const before=c.hxExecutiveTelegramDelivery_('r',options,edits,()=>assert.fail('Legacy already delivered'));
  assert.ok(before.every(x=>x.ok));
});

test('suppressed V2 path does not call providers, write delivery state, or route a third edition',()=>{
  const {c,p}=harness();
  p.set('TELEGRAM_BOT_TOKEN','not-a-real-token'); p.set('TELEGRAM_CHAT_ID','123');p.set('ALERT_EMAIL','recipient@example.test');
  const before=[...p.entries()];
  c.hxExecutiveSendTelegram_=()=>assert.fail('Dry run must not attempt Telegram');
  c.hxSendEmail_=()=>assert.fail('Dry run must not attempt email');
  const args={briefingText:'full email',telegramEditions:edits,dryRun:true,validationMode:true,returnDetailed:true};
  assert.equal(c.sendProductionBriefingNotification(args)[0].provider,'DeliverySuppressed');
  assert.deepEqual([...p.entries()],before);
  assert.throws(()=>c.sendProductionBriefingNotification({...args,telegramEditions:[...edits,'third']}),/incomplete/);
});

test('explicit provider rejection differs from timeout, malformed JSON and server errors',()=>{
  const {c,p}=harness();p.set('TELEGRAM_BOT_TOKEN','offline-test');
  const response=(code,body)=>({fetch:()=>({getResponseCode:()=>code,getContentText:()=>JSON.stringify(body)})});
  c.UrlFetchApp=response(200,{ok:true,result:{message_id:77}});
  assert.equal(c.hxExecutiveSendTelegram_('x','y').status,'accepted');
  c.UrlFetchApp=response(429,{ok:false,error_code:429});
  assert.equal(c.hxExecutiveSendTelegram_('x','y').status,'rejected');
  c.UrlFetchApp=response(503,{ok:false,error_code:503});
  assert.equal(c.hxExecutiveSendTelegram_('x','y').status,'ambiguous');
  c.UrlFetchApp={fetch:()=>{throw new Error('timeout');}};
  assert.equal(c.hxExecutiveSendTelegram_('x','y').status,'ambiguous');
});

test('scheduled entry sends two ordered Telegram editions and one consolidated email per configured recipient only once',()=>{
  const {c,p}=harness(), actual=[], ledger=[];
  p.set('TELEGRAM_BOT_TOKEN','offline-token');p.set('TELEGRAM_CHAT_ID','test');p.set('ALERT_EMAIL','a@example.test,b@example.test');
  c.hxMorningMarketBriefingMessages_=()=>({dailyKey:options.dailyKey,telegramMessage:edits[0],telegramEditions:edits,emailMessage:'institutional email',runtime_id:'test'});
  c.hxExecutiveSendTelegram_ = text=>{actual.push(text);return {status:'accepted',id:actual.length};};
  c.hxSendEmail_=(text,type,to)=>actual.push(to+': '+text);
  c.hxSheet_=()=>({});c.hxAppendRows_=(_,rows)=>ledger.push(...rows);
  c.sendDailyBriefing(); c.sendDailyBriefing();
  assert.deepEqual(actual,[edits[0],edits[1],'a@example.test: institutional email','b@example.test: institutional email']);
  assert.equal(ledger.length,1);
  assert.match(ledger[0][6],/Complete delivery \| Telegram I: accepted \| Telegram II: accepted \| Email: sent \| Email: sent/);
});
