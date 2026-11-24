import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {gzipSync,gunzipSync} from 'node:zlib';

function harness() {
  const props=new Map(), calls=[];
  const blob=value=>{const bytes=Buffer.from(value);return {getBytes:()=>bytes,getDataAsString:()=>bytes.toString()};};
  const c=vm.createContext({Date,console:{log(){}},Utilities:{newBlob:blob,base64Encode:b=>Buffer.from(b).toString('base64'),
    base64Decode:b=>Buffer.from(b,'base64'),gzip:b=>blob(gzipSync(b.getBytes())),ungzip:b=>blob(gunzipSync(b.getBytes())),formatDate:(d,zone,pattern)=>{
    const v=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',
      hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZoneName:'longOffset',weekday:'short'}).formatToParts(d).map(p=>[p.type,p.value]));
    return {'yyyy-MM-dd':v.year+'-'+v.month+'-'+v.day,'HH:mm':v.hour+':'+v.minute,'EEE':v.weekday,'EEE HH:mm':v.weekday+' '+v.hour+':'+v.minute,
      'Z':v.timeZoneName==='GMT'?'+0000':v.timeZoneName.slice(3).replace(':','')}[pattern];
  }},PropertiesService:{getScriptProperties:()=>({getProperty:k=>props.get(k) || null})},UrlFetchApp:{fetch:(...a)=>{calls.push(a[0]); throw Error('provider unavailable');}}});
  for (const f of ['01_Utils','04_AI','05_Notifications','11_MarketCalendarWatch','24_IntelligenceRefinement','26_ExecutiveBriefing',
    '28_OfficialCalendarCatalog','29_OperationalHealth','30_AuctionCandles']) vm.runInContext(readFileSync('src/'+f+'.gs','utf8'),c,{filename:f});
  return {c,props,calls};
}

const now=new Date('2026-11-24T14:00:00Z');
function bars(from, through, price=30) {
  const candles=[];
  for(let t=Date.parse(from);t<Date.parse(through);t+=300000)
    candles.push({time:new Date(t).toISOString(),complete:true,mid:{o:price,h:price+.3,l:price-.2,c:price+.1}});
  return candles;
}
const payload=candles=>({instrument:'XAG_USD',granularity:'M5',candles});

test('auction source avoids numeric separators rejected by the Apps Script source compiler',()=>{
  assert.doesNotMatch(readFileSync('src/30_AuctionCandles.gs','utf8'),/\b\d+(?:_\d+)+\b/);
});

function biquote(from, through, price=30) {
  return {symbol:'XAGUSD',interval:'5m',bars:bars(from,through,price).map(r=>({
    openTime:r.time,isOpen:false,open:r.mid.o,high:r.mid.h,low:r.mid.l,close:r.mid.c
  }))};
}

function archiveProperties() {
  const entries={unrelated:'unchanged'};
  return {entries,getProperties:()=>({...entries}),setProperties:rows=>Object.assign(entries,rows),deleteProperty:key=>delete entries[key]};
}

test('biquote source accepts only closed, aligned silver bars and archives them without exposure or duplicate writes',()=>{
  const {c}=harness(), props=archiveProperties();
  const body=biquote('2026-11-24T00:00:00Z','2026-11-24T14:00:00Z');
  body.bars.push({...body.bars[0]},{openTime:now.toISOString(),isOpen:true});
  const parsed=c.hxAuctionBiquoteBars_(body,now);
  assert.equal(parsed.size,168);
  assert.throws(()=>c.hxAuctionBiquoteBars_({...body,symbol:'SI'},now),/identity/);
  assert.throws(()=>c.hxAuctionBiquoteBars_({...body,bars:[{...body.bars[0],isOpen:undefined}]},now),/completion/);
  assert.equal(c.hxAuctionBiquoteArchive_(parsed,props,now,true).inserted,168);
  assert.equal(c.hxAuctionBiquoteArchive_(parsed,props,now,true).inserted,0);
  const next=new Date('2026-11-24T14:05:00Z');
  const appended=c.hxAuctionBiquoteBars_(biquote('2026-11-24T14:00:00Z',next.toISOString()),next);
  const dry=c.hxAuctionBiquoteArchive_(appended,props,next,false);
  assert.equal(dry.grid.size,169);
  assert.equal(c.hxAuctionBiquoteArchive_(new Map(),props,next,false).grid.size,168);
  assert.equal(c.hxAuctionBiquoteArchive_(appended,props,next,true).inserted,1);
  const revision=c.hxAuctionBiquoteBars_(biquote('2026-11-24T14:00:00Z',next.toISOString(),31),next);
  assert.throws(()=>c.hxAuctionBiquoteArchive_(revision,props,next,true),/revised/);
  assert.equal(props.entries.unrelated,'unchanged');
  assert.equal(c.hxAuctionBiquoteArchive_(new Map(),props,next,false).grid.size,169);
});

test('biquote qualifies only a covered UTC window and withholds missing weekly, session and prior extremes',()=>{
  const {c}=harness(), props=archiveProperties();
  const body=biquote('2026-11-24T00:00:00Z','2026-11-24T14:00:00Z');
  c.UrlFetchApp.fetch=(url,options)=>{
    assert.match(url,/^https:\/\/biquote\.io\/api\/XAGUSD\/ohlc\?/);
    assert.equal(options.followRedirects,false);
    return {getResponseCode:()=>200,getContentText:()=>JSON.stringify(body)};
  };
  const current=c.hxAuctionBiquoteCapture_(now,props,true);
  assert.equal(current.state,'current_verified_observation');
  assert.equal(current.provider,'biquote');
  assert.equal(current.daily.range,.5);
  assert.equal(current.weekly,null);
  assert.equal(current.boundary,null);
  assert.equal(current.dailyBaseline,null);
  assert.match(c.hxAuctionBriefingLines_(current).range.join(' '),/biquote indicative OTC.*UTC day/);
  const gap=new Map(c.hxAuctionBiquoteBars_(body,now)); gap.delete(Date.parse('2026-11-24T13:00:00Z'));
  assert.equal(c.hxAuctionBiquoteObservation_(gap,now).state,'incomplete_session');
  assert.equal(c.hxAuctionBiquoteObservation_(gap,new Date('2026-11-24T14:35:00Z')).state,'stale');
  c.UrlFetchApp.fetch=()=>({getResponseCode:()=>429});
  assert.equal(c.hxAuctionBiquoteCapture_(now,props,true).state,'rate_limited');
});

test('current candles require exact continuity, keep price side provenance, and do not invent probabilities',()=>{
  const {c}=harness();
  const monday=bars('2026-11-22T23:05:00Z','2026-11-23T22:00:00Z',30);
  const tuesday=bars('2026-11-23T23:05:00Z','2026-11-24T14:00:00Z',31);
  const source=payload([...tuesday,...monday,tuesday[0],{complete:false,time:'2026-11-24T14:00:00Z'}]);
  const result=c.hxAuctionAnalyze_(c.hxAuctionOandaBars_(source,now),now,{});
  assert.equal(result.state,'current_verified_observation'); assert.equal(result.observedAt,now.toISOString());
  assert.equal(result.price,31.1);assert.equal(result.daily.range,.5);assert.equal(result.weekly.range,1.5);
  assert.equal(result.boundary.high,30.3); assert.equal(result.acceptance,'above');
  assert.equal(result.dailyBaseline,null);assert.equal(result.weeklyBaseline,null);assert.equal(result.extremeForecast,null);assert.equal(result.remainingExpansion,null);
  assert.match(c.hxAuctionBriefingLines_(result).structure.join(' '),/Two closed five-minute bars above/);
  assert.equal(c.hxAuctionUsableNow_({...result,environment:'practice'},now),null);
  assert.equal(c.hxAuctionUsableNow_({...result,environment:'live'},new Date('2026-11-24T14:25:01Z')),null);
  const missing=payload(tuesday.filter((_,i)=>i!==11));
  assert.equal(c.hxAuctionAnalyze_(c.hxAuctionOandaBars_(missing,now),now,{}).state,'incomplete_session');
  assert.throws(()=>c.hxAuctionOandaBars_(payload([...tuesday,{...tuesday[0],mid:{o:30,h:31,l:29,c:30}}]),now),/Conflicting/);
  assert.throws(()=>c.hxAuctionOandaBars_({...source,instrument:'SI_FUTURES'},now),/identity/);
});

test('stale, closed and unknown holiday sessions are classified separately; DST is timezone-aware',()=>{
  const {c}=harness();
  const grid=c.hxAuctionOandaBars_(payload(bars('2026-11-23T23:05:00Z','2026-11-24T13:35:00Z')),now);
  assert.equal(c.hxAuctionAnalyze_(grid,now,{}).state,'stale');
  assert.equal(c.hxAuctionAnalyze_(grid,new Date('2026-11-28T15:00:00Z'),{}).state,'scheduled_closure');
  assert.equal(c.hxAuctionAnalyze_(grid,new Date('2026-11-26T15:00:00Z'),{}).state,'session_calendar_unverified');
  assert.equal(c.hxAuctionAnalyze_(grid,new Date('2026-11-26T15:00:00Z'),{'2026-11-26':'closed'}).state,'scheduled_closure');
  assert.equal(new Date(c.hxAuctionSessionProfile_('2027-03-15',{}).start).toISOString(),'2027-03-14T22:05:00.000Z');
  assert.equal(new Date(c.hxAuctionSessionProfile_('2027-03-08',{}).start).toISOString(),'2027-03-07T23:05:00.000Z');
});

test('off or missing authorization never touches network; provider failure is isolated',()=>{
  const {c,props,calls}=harness();
  assert.equal(c.hxAuctionCapture_(now).state,'not_configured'); assert.equal(calls.length,0);
  props.set('HBE_OANDA_XAGUSD_ENABLED','true');
  assert.equal(c.hxAuctionCapture_(now).state,'authorization_missing'); assert.equal(calls.length,0);
  for(const [k,v] of Object.entries({HBE_OANDA_API_TOKEN:'fake',HBE_OANDA_ACCOUNT_ID:'123-456-789',
    HBE_OANDA_ENVIRONMENT:'live',HBE_OANDA_SESSION_PROFILE:'NY_1805_1659'})) props.set(k,v);
  const result=c.hxOperationalSnapshot_({sheets:{}},{},now.toISOString());
  assert.equal(result.auction.state,'provider_unavailable'); assert.equal(calls.length,1);
  assert.ok(result.calendar.lines.some(x=>x.includes('PCE inflation and GDP')));
});

test('official published dates override first-Friday rules, and revised Fed dates exclude the strategy meeting',()=>{
  const {c}=harness();
  const jan=c.hxOperationalCalendar_('2027-01-01','07:00');
  assert.ok(jan.lines.some(x=>x.includes('2027-01-08')&&x.includes('payrolls')));
  assert.ok(!jan.lines.some(x=>x.includes('2027-01-01')&&x.includes('payrolls')));
  const fed=c.hxOperationalCalendar_('2027-10-26','07:00');
  assert.ok(!fed.lines.some(x=>x.includes('FOMC')));
  assert.ok(c.hxOperationalCalendar_('2027-11-17','09:00').lines.some(x=>x.includes('FOMC policy decision (tentative)')));
  assert.equal(c.hxOperationalCalendar_('2027-11-27','07:00').status,'coverage_ending');
  assert.equal(c.hxOperationalCalendar_('2028-01-04','07:00').status,'expired');
});

test('weekly closure and normal publication lag do not invent a provider outage',()=>{
  const {c}=harness();
  assert.equal(c.hxOperationalDailyState_({date:'2026-11-20'},'2026-11-23','08:00'),'published_daily');
  assert.equal(c.hxOperationalDailyState_({date:'2026-11-20'},'2026-11-24','15:00'),'publication_delay');
  assert.equal(c.hxOperationalDailyState_({date:'2026-11-20'},'2026-11-24','19:00'),'stale');
});
