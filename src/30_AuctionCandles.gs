/** Read-only OANDA spot-referenced XAG/USD midpoint candles; no order endpoints. */
const HX_AUCTION_BAR_MS=300000;
const HX_AUCTION_PRICE_BASIS='OANDA XAG_USD midpoint (spot-referenced)';

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
  const unavailable=(state)=>({state,observedAt:null,provider:'OANDA',granularity:'5 minutes'});
  const p=hxProps_();
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

function hxAuctionUsableNow_(auction, now) {
  if(!auction || auction.state!=='current_verified_observation' || auction.environment!=='live') return null;
  const age=now-Date.parse(auction.observedAt);
  return age>=0 && age<=20*60000 ? auction : null;
}

function hxAuctionBriefingLines_(auction) {
  const result={range:[],extremes:[],sessions:[],structure:[]};
  if(!auction) return result;
  const price=v=>'$'+Number(v).toFixed(3);
  const date=v=>hxExecutiveEt_(new Date(v),'EEE HH:mm')+' ET';
  result.range.push('Latest completed 5-minute midpoint: '+price(auction.price)+' · '+date(auction.observedAt)+'.');
  const daily=auction.daily, weekly=auction.weekly;
  const describe=(label,r)=>label+' range '+price(r.range)+' per oz. High '+price(r.high.value)+' ('+date(r.high.barAt)+') · low '+price(r.low.value)+' ('+date(r.low.barAt)+').';
  if(daily) result.range.push(describe('Daily',daily));
  if(weekly) result.extremes.push(describe('Weekly',weekly));
  else result.extremes.push('Weekly range and extremes not verified across all scheduled bars.');
  if(auction.dailyBaseline) result.range.push('Daily range is '+auction.dailyBaseline.consumedPct+'% of the median of '+auction.dailyBaseline.sample+' recent comparable sessions; not an expansion target.');
  auction.sessions.filter(s=>s.status==='developing' && s.range).forEach(s=>result.sessions.push(s.name+' developing range: '+price(s.range.range)+' per oz.'+(s.addedRange===null?'':' Added to day range: '+price(s.addedRange)+'.')));
  const next=auction.sessions.filter(s=>s.status==='upcoming').sort((a,b)=>a.opensAt.localeCompare(b.opensAt))[0];
  if(next) result.sessions.push('Next session window: '+next.name+' · '+date(next.opensAt)+'. Timing, not an expansion forecast.');
  if(auction.boundary) {
    const b=auction.boundary;
    result.structure.push('Prior session ('+b.day+'): '+price(b.high)+' high · '+price(b.low)+' low.');
    if(auction.acceptance==='above'||auction.acceptance==='below') {
      const above=auction.acceptance==='above', level=price(above?b.high:b.low);
      result.structure.push('Two closed five-minute bars '+auction.acceptance+' '+level+'. A close back '+(above?'below':'above')+' challenges acceptance.');
    } else result.structure.push('Confirmation requires two closed five-minute bars beyond the relevant prior-session boundary.');
  }
  if(auction.priorWeek) result.structure.push('Prior verified week: '+price(auction.priorWeek.high.value)+' high · '+price(auction.priorWeek.low.value)+' low.');
  return result;
}
