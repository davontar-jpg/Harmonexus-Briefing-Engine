/** Read-only OANDA spot-referenced XAG/USD midpoint candles; no order endpoints. */
const HX_AUCTION_BAR_MS=300000;
const HX_AUCTION_PRICE_BASIS='OANDA XAG_USD midpoint (spot-referenced)';
const HX_BIQUOTE_URL='https://biquote.io/api/XAGUSD/ohlc?interval=5m&limit=288';
const HX_BIQUOTE_ARCHIVE='HBE_AUCTION_BIQUOTE_M5_';
const HX_BIQUOTE_BASIS='biquote XAGUSD indicative OTC midpoint · UTC calendar windows';
const HX_BIQUOTE_RETENTION_DAYS=31;

function hxAuctionOffsetTime_(day, hour, zone) {
  const noon=new Date(day+'T12:00:00Z');
  const offset=Utilities.formatDate(noon,zone,'Z');
  return Date.parse(day+'T'+hour+':00'+offset.slice(0,3)+':'+offset.slice(3));
}

function hxAuctionOandaBars_(source, now) {
  if (source.instrument!=='XAG_USD' || source.granularity!=='M5' || !Array.isArray(source.candles) || source.candles.length>5000)
    throw Error('Unverified candle source identity.');
  const grid=new Map();
  source.candles.forEach(row=>{
    if(row.complete!==true) return;
    const t=Date.parse(row.time), m=row.mid || {};
    const values=['o','h','l','c'].map(key=>hxObservedNumber_(m[key]));
    const [o,h,l,c]=values;
    if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00(?:\.0+)?Z$/.test(String(row.time)) || !Number.isFinite(t) || t%HX_AUCTION_BAR_MS || t+HX_AUCTION_BAR_MS>now.getTime() || values.some(v=>!(v>0)) || h<Math.max(o,c,l) || l>Math.min(o,c))
      throw Error('Invalid closed XAG/USD bar.');
    const item={t,o,h,l,c};
    if(grid.has(t) && JSON.stringify(item)!==JSON.stringify(grid.get(t))) throw Error('Conflicting XAG/USD candle versions.');
    grid.set(t,item);
  });
  return grid;
}

function hxAuctionSessionProfile_(day, overrides) {
  const dow=new Date(day+'T12:00:00Z').getUTCDay();
  if(dow===0 || dow===6) return {day,closed:true};
  const adjust=(overrides || {})[day];
  if(adjust==='closed') return {day,closed:true};
  const isSpecial=Boolean(hxMarketHolidayMap_(Number(day.slice(0,4)))[day] || HX_OFFICIAL_CALENDAR.nyseEarlyCloses.includes(day));
  if(isSpecial&&!adjust) return {day,calendarUnknown:true};
  const close=adjust || '17:00';
  if(!/^(?:0[0-9]|1[0-7]):[0-5][05]$/.test(close)) throw Error('Invalid reviewed broker trading-hours override.');
  const start=hxAuctionOffsetTime_(hxOperationalDayShift_(day,-1),'18:05','America/New_York');
  const end=hxAuctionOffsetTime_(day,close,'America/New_York');
  if(!(end>start)) throw Error('Invalid broker session boundaries.');
  return {day,start,end,shortened:Boolean(adjust && close!=='17:00')};
}

function hxAuctionGridRange_(grid, start, end) {
  let high=null, low=null, missing=0, count=0;
  for(let t=start;t<end;t+=HX_AUCTION_BAR_MS){
    const b=grid.get(t);
    if(!b) { missing++; continue; }
    count++;
    if(!high || b.h>high.value) high={value:b.h,barAt:new Date(t).toISOString()};
    if(!low || b.l<low.value) low={value:b.l,barAt:new Date(t).toISOString()};
  }
  return {high,low,count,missing,range:count?Number((high.value-low.value).toFixed(6)):null};
}

function hxAuctionCombine_(ranges) {
  if(!ranges.length || ranges.some(r=>r.missing || !r.count)) return null;
  const high=ranges.reduce((best,r)=>r.high.value>best.value?r.high:best,ranges[0].high);
  const low=ranges.reduce((best,r)=>r.low.value<best.value?r.low:best,ranges[0].low);
  return {high,low,range:Number((high.value-low.value).toFixed(6)),count:ranges.reduce((n,r)=>n+r.count,0)};
}

function hxAuctionRangeBaseline_(samples, observed, minimum) {
  if(!Number.isFinite(observed) || samples.length<minimum) return null;
  const sorted=samples.slice().sort((a,b)=>a-b), n=sorted.length;
  const med=(sorted[(n-1)>>1]+sorted[n>>1])/2;
  if(med<=0) return null;
  return {sample:n,median:Number(med.toFixed(6)),consumedPct:Math.round(observed/med*100),
    percentile:Math.round(100*sorted.filter(v=>v<=observed).length/n),basis:'same-provider completed ranges; not a remaining-expansion forecast'};
}

function hxAuctionSessionWindows_(grid, trading, limit) {
  const defs=[['Asia','Asia/Tokyo','09:00','17:00'],['London','Europe/London','08:00','17:00'],['New York','America/New_York','08:00','17:00']];
  return defs.map(([name,tz,open,close])=>{
    const from=Math.max(trading.start,hxAuctionOffsetTime_(trading.day,open,tz)), to=Math.min(trading.end,hxAuctionOffsetTime_(trading.day,close,tz));
    const status=limit<=from?'upcoming':limit>=to?'completed':'developing';
    if(from>=to) return null;
    const part=limit>from?hxAuctionGridRange_(grid,from,Math.min(to,limit)):null;
    const pre=limit>from&&from>trading.start?hxAuctionGridRange_(grid,trading.start,from):null;
    const through=limit>from?hxAuctionGridRange_(grid,trading.start,Math.min(to,limit)):null;
    return {name,status,opensAt:new Date(from).toISOString(),endsAt:new Date(to).toISOString(),
      range:part&&!part.missing?part:null,addedRange:through&&!through.missing&&(!pre||!pre.missing)?Number((through.range-(pre?pre.range:0)).toFixed(6)):null};
  }).filter(Boolean);
}

function hxAuctionAnalyze_(grid, now, overrides) {
  const date=hxExecutiveEt_(now,'yyyy-MM-dd'), hour=hxExecutiveEt_(now,'HH:mm');
  const tradeDay=hour>='18:05'?hxOperationalDayShift_(date,1):date;
  const profile=hxAuctionSessionProfile_(tradeDay,overrides);
  const ordered=Array.from(grid.keys()).sort((a,b)=>a-b), last=ordered[ordered.length-1], first=ordered[0];
  const observedAt=last===undefined?null:new Date(last+HX_AUCTION_BAR_MS).toISOString();
  const result={state:'missing',instrument:'XAGUSD',provider:'OANDA',priceBasis:HX_AUCTION_PRICE_BASIS,granularity:'5 minutes',
    observedAt,coverageFrom:first===undefined?null:new Date(first).toISOString(),barCount:grid.size,maxAgeMinutes:20};
  if(profile.calendarUnknown) return {...result,state:'session_calendar_unverified'};
  if(profile.closed || now.getTime()>=profile.end || now.getTime()<profile.start) return {...result,state:'scheduled_closure'};
  if(last===undefined || last<profile.start) return {...result,state:'missing'};
  const limit=last+HX_AUCTION_BAR_MS;
  if(limit>profile.end) return {...result,state:'session_calendar_unverified'};
  if (now.getTime()-limit>result.maxAgeMinutes*60000) return {...result,state:'stale'};
  const today=hxAuctionGridRange_(grid,profile.start,limit);
  if(today.missing) return {...result,state:'incomplete_session',missingBars:today.missing};

  const monday=hxOperationalDayShift_(tradeDay,-((new Date(tradeDay+'T12:00:00Z').getUTCDay()+6)%7));
  const periods=[];
  for(let i=1;i<=27;i++) {
    const s=hxAuctionSessionProfile_(hxOperationalDayShift_(tradeDay,-i),overrides);
    if(!s.closed) periods.push({...s,range:!s.calendarUnknown && !s.shortened && s.start>=first?hxAuctionGridRange_(grid,s.start,s.end):null});
  }
  const usable=r=>r.range && !r.range.missing && r.range.count;
  const prior=periods[0] && usable(periods[0])?periods[0]:null;
  const prevWeekStart=hxOperationalDayShift_(monday,-7);
  const prevWeek=periods.filter(s=>s.day>=prevWeekStart && s.day<monday);
  const thisWeek=periods.filter(s=>s.day>=monday).reverse();
  const week=thisWeek.every(usable)?hxAuctionCombine_(thisWeek.map(s=>s.range).concat(today)):null;
  const priorWeek=prevWeek.length && prevWeek.every(usable)?hxAuctionCombine_(prevWeek.map(s=>s.range)):null;
  const mid=grid.get(last).c;
  const boundary=prior?{day:prior.day,high:prior.range.high.value,low:prior.range.low.value}:null;
  let acceptance=null;
  if(boundary && grid.has(last-HX_AUCTION_BAR_MS) && last-HX_AUCTION_BAR_MS>=profile.start) {
    const closes=[grid.get(last-HX_AUCTION_BAR_MS).c,mid];
    acceptance=closes.every(c=>c>boundary.high)?'above':closes.every(c=>c<boundary.low)?'below':'not_confirmed';
  }
  return {...result,state:'current_verified_observation',price:mid,daily:{...today,sessionDay:tradeDay},weekly:week,
    weeklyState:week?'observed_through_close':'incomplete_session',missingBars:0,
    dailyBaseline:profile.shortened?null:hxAuctionRangeBaseline_(periods.filter(usable).map(s=>s.range.range),today.range,15),
    // The bounded response cannot support a defensible weekly distribution or remaining-capacity model.
    weeklyBaseline:null,remainingExpansion:null,extremeForecast:null,
    sessions:hxAuctionSessionWindows_(grid,profile,limit),boundary,priorWeek,acceptance};
}

function hxAuctionCapture_(now) {
  const p=hxProps_();
  if(p.getProperty('HBE_BIQUOTE_XAGUSD_ENABLED')==='true' && p.getProperty('HBE_OANDA_XAGUSD_ENABLED')!=='true')
    return hxAuctionBiquoteCapture_(now, p, true);
  const unavailable=(state)=>({state,observedAt:null,provider:'OANDA',granularity:'5 minutes'});
  if(p.getProperty('HBE_OANDA_XAGUSD_ENABLED')!=='true') return unavailable('not_configured');
  const token=p.getProperty('HBE_OANDA_API_TOKEN'), mode=p.getProperty('HBE_OANDA_ENVIRONMENT');
  const account=p.getProperty('HBE_OANDA_ACCOUNT_ID');
  if(!token || !/^[\d-]{8,40}$/.test(account || '') || !['live','practice'].includes(mode)) return unavailable('authorization_missing');
  if(p.getProperty('HBE_OANDA_SESSION_PROFILE')!=='NY_1805_1659') return unavailable('session_calendar_unverified');
  const base=mode==='live'?'https://api-fxtrade.oanda.com':'https://api-fxpractice.oanda.com';
  const req={method:'get',headers:{Authorization:'Bearer '+token},muteHttpExceptions:true,followRedirects:false};
  const allow=UrlFetchApp.fetch(base+'/v3/accounts/'+account+'/instruments?instruments=XAG_USD',req);
  if(allow.getResponseCode()===401||allow.getResponseCode()===403) return unavailable('authorization_failed');
  if(allow.getResponseCode()!==200) return unavailable('provider_unavailable');
  if(!JSON.parse(allow.getContentText()).instruments?.some(i=>i.name==='XAG_USD')) return unavailable('instrument_not_entitled');
  const resp=UrlFetchApp.fetch(base+'/v3/instruments/XAG_USD/candles?price=M&granularity=M5&count=5000&smooth=false',req);
  if(resp.getResponseCode()===401||resp.getResponseCode()===403) return unavailable('authorization_failed');
  if(resp.getResponseCode()!==200) return unavailable('provider_unavailable');
  const body=resp.getContentText(); if(body.length>2000000) return unavailable('provider_unavailable');
  const overrides=JSON.parse(p.getProperty('HBE_OANDA_SESSION_OVERRIDES') || '{}');
  const result=hxAuctionAnalyze_(hxAuctionOandaBars_(JSON.parse(body),now),now,overrides);
  result.environment=mode;
  // Practice is an onboarding/canary feed, not production current-market evidence.
  if(mode!=='live') return {...unavailable('practice_observation'),observedAt:result.observedAt,barCount:result.barCount};
  return result;
}

function hxAuctionBiquoteBars_(source, now) {
  if(source.symbol!=='XAGUSD'||source.interval!=='5m'||!Array.isArray(source.bars)||source.bars.length>289)
    throw Error('Unexpected biquote candle identity or page size.');
  if(source.bars.some(row=>!row || typeof row.isOpen!=='boolean'))
    throw Error('Missing explicit biquote candle completion state.');
  return hxAuctionOandaBars_({instrument:'XAG_USD',granularity:'M5',candles:source.bars.map(row=>({
    time:row.openTime,complete:row.isOpen===false,mid:{o:row.open,h:row.high,l:row.low,c:row.close}
  }))},now);
}

function hxAuctionBiquoteArchive_(incoming, props, now, persist) {
  const today=now.toISOString().slice(0,10);
  const cutoff=hxOperationalDayShift_(today,1-HX_BIQUOTE_RETENTION_DAYS);
  const data=props.getProperties(), days=new Map(), changed=new Set();
  Object.entries(data).forEach(([key,value])=>{
    if(!key.startsWith(HX_BIQUOTE_ARCHIVE)) return;
    const day=key.slice(HX_BIQUOTE_ARCHIVE.length);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(day) || day>today) throw Error('Invalid biquote archive partition.');
    if(day<cutoff) return;
    if(!value.startsWith('v1:') || value.length>8500) throw Error('Invalid biquote archive encoding.');
    const contents=JSON.parse(Utilities.ungzip(Utilities.newBlob(Utilities.base64Decode(value.slice(3)),'application/gzip')).getDataAsString());
    if(!Array.isArray(contents) || contents.length>288) throw Error('Invalid biquote archive encoding.');
    const grid=hxAuctionBiquoteBars_({symbol:'XAGUSD',interval:'5m',bars:contents.map(([t,open,high,low,close])=>({
      openTime:new Date(t).toISOString(),open,high,low,close,isOpen:false}))},now);
    if(grid.size!==contents.length || [...grid.keys()].some(t=>new Date(t).toISOString().slice(0,10)!==day))
      throw Error('Corrupted biquote archive partition.');
    days.set(day,grid);
  });
  let inserted=0, overlap=0;
  for(const [t,bar] of incoming) {
    const day=new Date(t).toISOString().slice(0,10);
    if(day<cutoff) continue;
    if(!days.has(day)) days.set(day,new Map());
    const grid=days.get(day);
    if(grid.has(t)) {
      if(JSON.stringify(bar)!==JSON.stringify(grid.get(t))) throw Error('Biquote revised an archived closed candle; not merged.');
      overlap++;
      continue;
    }
    grid.set(t,bar);
    changed.add(day);
    inserted++;
  }
  if(persist && incoming.size) {
    const updates={};
    for(const day of changed) {
      const rows=[...days.get(day).values()].sort((a,b)=>a.t-b.t).map(b=>[b.t,b.o,b.h,b.l,b.c]);
      const encoded='v1:'+Utilities.base64Encode(Utilities.gzip(Utilities.newBlob(JSON.stringify(rows))).getBytes());
      if(encoded.length>8500) throw Error('Biquote archive partition exceeds property limit.');
      updates[HX_BIQUOTE_ARCHIVE+day]=encoded;
    }
    if(Object.keys(updates).length) props.setProperties(updates,false);
    for(const key of Object.keys(data)) {
      if(key.startsWith(HX_BIQUOTE_ARCHIVE) && key.slice(HX_BIQUOTE_ARCHIVE.length)<cutoff) props.deleteProperty(key);
    }
  }
  return {grid:new Map([...days.values()].flatMap(rows=>[...rows])),inserted,overlap};
}

function hxAuctionBiquoteObservation_(grid, now) {
  const times=[...grid.keys()].sort((a,b)=>a-b);
  const first=times[0],last=times[times.length-1];
  const result={state:'missing',instrument:'XAGUSD',provider:'biquote',priceBasis:HX_BIQUOTE_BASIS,
    environment:'live',granularity:'5 minutes',maxAgeMinutes:20,barCount:grid.size,
    observedAt:last===undefined?null:new Date(last+HX_AUCTION_BAR_MS).toISOString(),
    coverageFrom:first===undefined?null:new Date(first).toISOString()};
  if(last===undefined) return result;
  const limit=last+HX_AUCTION_BAR_MS;
  if(now.getTime()-limit>20*60000) return {...result,state:'stale'};
  const day=new Date(last).toISOString().slice(0,10), start=Date.parse(day+'T00:00:00Z');
  const today=hxAuctionGridRange_(grid,start,limit);
  // The provider documents UTC timestamps, not exact XAGUSD holiday/maintenance rules.
  // Publish only the contiguous UTC day; never infer sessions or fill maintenance gaps.
  if(today.missing) return {...result,state:'incomplete_session',missingBars:today.missing};
  const monday=start-((new Date(start).getUTCDay()+6)%7)*86400000;
  const week=new Date(start).getUTCDay()===0?null:hxAuctionGridRange_(grid,monday,limit);
  const prior=hxAuctionGridRange_(grid,start-86400000,start);
  const boundary=!prior.missing&&prior.count?{day:hxOperationalDayShift_(day,-1),high:prior.high.value,low:prior.low.value}:null;
  const lastPair=[grid.get(last-HX_AUCTION_BAR_MS),grid.get(last)];
  const acceptance=boundary&&lastPair[0]&&last-HX_AUCTION_BAR_MS>=start?
    lastPair.every(b=>b.c>boundary.high)?'above':lastPair.every(b=>b.c<boundary.low)?'below':'not_confirmed':null;
  return {...result,state:'current_verified_observation',price:grid.get(last).c,windowBasis:'UTC calendar windows',
    daily:{...today,sessionDay:day},weekly:week&&!week.missing?week:null,
    weeklyState:week&&!week.missing?'observed_through_close':'incomplete_session',
    missingBars:0,sessions:hxAuctionSessionWindows_(grid,{day,start,end:start+86400000},limit),priorWeek:null,
    dailyBaseline:null,weeklyBaseline:null,remainingExpansion:null,extremeForecast:null,boundary,acceptance};
}

function hxAuctionBiquoteCapture_(now, props, persist) {
  const unavailable=(state)=>({state,observedAt:null,provider:'biquote',granularity:'5 minutes'});
  let response;
  try { response=UrlFetchApp.fetch(HX_BIQUOTE_URL,{method:'get',muteHttpExceptions:true,followRedirects:false}); }
  catch(error) { return unavailable('provider_unavailable'); }
  const status=response.getResponseCode();
  if(status===429) return unavailable('rate_limited');
  if(status!==200) return unavailable('provider_unavailable');
  const body=response.getContentText();
  if(body.length>250000) return unavailable('provider_unavailable');
  // Compare against response receipt; an hourly job close to a bar boundary can overlap the next close.
  const checkedAt=new Date(Math.max(now.getTime(),Date.now()));
  let source;
  try { source=hxAuctionBiquoteBars_(JSON.parse(body),checkedAt); }
  catch(error) { return unavailable('provider_unavailable'); }
  // The decision timestamp is the capture start. Do not accidentally travel forward when a request crosses a close.
  for(const t of source.keys()) if(t+HX_AUCTION_BAR_MS>now.getTime()) source.delete(t);
  if(!source.size) return unavailable('missing');
  const last=Math.max(...source.keys())+HX_AUCTION_BAR_MS;
  if(now.getTime()-last>20*60000) return {...unavailable('stale'),observedAt:new Date(last).toISOString()};
  let archive;
  try { archive=hxAuctionBiquoteArchive_(source,props,now,persist); }
  catch(error) { return {...unavailable('archive_unverified'),observedAt:new Date(last).toISOString()}; }
  const result=hxAuctionBiquoteObservation_(archive.grid,now);
  return {...result,archiveInserted:persist?archive.inserted:0,archiveOverlap:archive.overlap};
}

/** Backfill and activate only the dedicated public read-only source; never send or alter triggers. */
function activateBiquoteAuctionSource() {
  const ss=SpreadsheetApp.getActive();
  if(!hxSilverStagingCallerAuthorized_(hxSilverStagingCaller_()) || !ss || ss.getName()!=='Harmonexus v5 Parallel Test' || !hxSilverRuntimeEnabled_())
    throw Error('Biquote activation is not authorized for this bound project.');
  return hxWithLock_(()=>{
    const props=hxProps_(), timestamp=new Date();
    if(props.getProperty('HBE_OANDA_XAGUSD_ENABLED')==='true') throw Error('Existing OANDA authority must be preserved.');
    const packet=hxAuctionBiquoteCapture_(timestamp,props,true);
    if(packet.state!=='current_verified_observation') return {activated:false,state:packet.state,observedAt:packet.observedAt};
    const prior=props.getProperty('HBE_BIQUOTE_XAGUSD_ENABLED');
    props.setProperty('HBE_BIQUOTE_XAGUSD_ENABLED','true');
    try {
      const runtime=hxSilverBuildProductionRuntime_(hxSilverCaptureProductionSnapshot_(timestamp),timestamp);
      const auction=runtime.operational_intelligence && runtime.operational_intelligence.auction;
      if(!auction || auction.provider!=='biquote' || auction.state!=='current_verified_observation')
        throw Error('Canonical runtime did not qualify the selected biquote observations.');
      hxSilverPublishRuntime_(runtime);
      return {activated:true,runtime:runtime.runtime_id,state:auction.state,observedAt:auction.observedAt,
        first:auction.coverageFrom,barCount:auction.barCount,inserted:packet.archiveInserted,overlap:auction.archiveOverlap,
        utcDailyRange:auction.daily.range,weeklyQualified:Boolean(auction.weekly),notificationDelivery:'not invoked'};
    } catch(error) {
      if(prior===null) props.deleteProperty('HBE_BIQUOTE_XAGUSD_ENABLED');
      else props.setProperty('HBE_BIQUOTE_XAGUSD_ENABLED',prior);
      throw error;
    }
  });
}

function hxAuctionUsableNow_(auction, now) {
  if(!auction || auction.state!=='current_verified_observation' || auction.environment!=='live') return null;
  const age=now-Date.parse(auction.observedAt);
  return age>=0 && age<=20*60000 ? auction : null;
}

function hxAuctionForBriefing_(published, now) {
  const usable=hxAuctionUsableNow_(published,now);
  if(usable) return usable;
  const props=hxProps_();
  if(props.getProperty('HBE_BIQUOTE_XAGUSD_ENABLED')!=='true'||props.getProperty('HBE_OANDA_XAGUSD_ENABLED')==='true') return null;
  return hxAuctionUsableNow_(hxAuctionBiquoteCapture_(now,props,false),now);
}

function hxAuctionBriefingLines_(auction) {
  const result={range:[],extremes:[],sessions:[],structure:[]};
  if(!auction) return result;
  const price=v=>'$'+Number(v).toFixed(3);
  const date=v=>hxExecutiveEt_(new Date(v),'EEE HH:mm')+' ET';
  result.range.push('Latest completed 5-minute midpoint: '+price(auction.price)+' · '+date(auction.observedAt)+(auction.provider==='biquote'?' · biquote indicative OTC.':'.'));
  const daily=auction.daily, weekly=auction.weekly;
  const describe=(label,r)=>label+' range '+price(r.range)+' per oz. High '+price(r.high.value)+' ('+date(r.high.barAt)+') · low '+price(r.low.value)+' ('+date(r.low.barAt)+').';
  if(daily) result.range.push(describe(auction.windowBasis?'UTC day':'Daily',daily));
  if(weekly) result.extremes.push(describe(auction.windowBasis?'UTC week':'Weekly',weekly));
  else result.extremes.push('Weekly range and extremes not verified across all scheduled bars.');
  if(auction.dailyBaseline) result.range.push('Daily range is '+auction.dailyBaseline.consumedPct+'% of the median of '+auction.dailyBaseline.sample+' recent comparable sessions; not an expansion target.');
  auction.sessions.filter(s=>s.status==='developing' && s.range).forEach(s=>result.sessions.push(s.name+' developing range: '+price(s.range.range)+' per oz.'+(s.addedRange===null?'':' Added to day range: '+price(s.addedRange)+'.')));
  const next=auction.sessions.filter(s=>s.status==='upcoming').sort((a,b)=>a.opensAt.localeCompare(b.opensAt))[0];
  if(next) result.sessions.push('Next session window: '+next.name+' · '+date(next.opensAt)+'. Timing, not an expansion forecast.');
  if(auction.boundary) {
    const b=auction.boundary;
    result.structure.push((auction.windowBasis?'Prior UTC day':'Prior session')+' ('+b.day+'): '+price(b.high)+' high · '+price(b.low)+' low.');
    if(auction.acceptance==='above'||auction.acceptance==='below') {
      const above=auction.acceptance==='above', level=price(above?b.high:b.low);
      result.structure.push('Two closed five-minute bars '+auction.acceptance+' '+level+'. A close back '+(above?'below':'above')+' challenges acceptance.');
    } else result.structure.push('Confirmation requires two closed five-minute bars beyond the relevant prior-session boundary.');
  }
  if(auction.priorWeek) result.structure.push('Prior verified week: '+price(auction.priorWeek.high.value)+' high · '+price(auction.priorWeek.low.value)+' low.');
  return result;
}
