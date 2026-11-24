/** Published source observations and official schedule, independent of scoring. */
function hxOperationalDayShift_(day, count) {
  return new Date(Date.parse(day+'T12:00:00Z')+count*86400000).toISOString().slice(0,10);
}

function hxOperationalCalendar_(day, time) {
  const catalog=HX_OFFICIAL_CALENDAR, remaining=(Date.parse(catalog.through)-Date.parse(day))/86400000;
  const review=hxOperationalDayShift_(catalog.verifiedOn,catalog.reviewEveryDays);
  const monday=hxOperationalDayShift_(day,-((new Date(day+'T12:00:00Z').getUTCDay()+6)%7));
  const weekdays=[0,1,2,3,4].map(i=>hxOperationalDayShift_(monday,i));
  const years=[...new Set(weekdays.map(d=>Number(d.slice(0,4))))];
  const holidays=Object.assign({},...years.map(year=>hxMarketHolidayMap_(year)));
  const closures=weekdays.filter(d=>Boolean(holidays[d])).map(d=>({day:d,kind:'closure',label:holidays[d].detail}));
  const early=weekdays.filter(d=>catalog.nyseEarlyCloses.includes(d)).map(d=>({day:d,kind:'early close',label:'NYSE equities close at 13:00 ET'}));
  const through=hxOperationalDayShift_(day,14);
  const events=catalog.events.filter(e=>e.day>=day && e.day<=through && (e.day!==day || e.time>=time));
  const status=remaining<0?'expired':remaining<=45?'coverage_ending':day>=review?'verification_due':'covered';
  const notices={expired:'Official calendar coverage expired; unpublished dates are withheld.',
    coverage_ending:'Official calendar coverage ends '+catalog.through+'; review the next-year release tables.',
    verification_due:'Official calendar recheck due. Listed times were last checked '+catalog.verifiedOn+'.'};
  const warning=notices[status] || '';
  const lines=closures.concat(early).filter(e=>e.day>=day).map(e=>({day:e.day,text:e.day+' · '+(e.kind==='closure'?'NYSE closed — ':'')+e.label}))
    .concat(events.map(e=>({day:e.day,text:e.day+' · '+e.time+' ET · '+e.label+(e.status==='tentative'?' (tentative)':'')+' — '+e.channel+'.'})))
    .sort((a,b)=>a.day.localeCompare(b.day)).map(e=>e.text);
  // The weekly briefing supplies a maintenance alert without installing a new trigger.
  if (warning && (remaining<=14 || day===review || day===monday)) lines.push(warning);
  return {lines,events,closures:closures.concat(early),status,warning,verifiedOn:catalog.verifiedOn,through:catalog.through,
    nextReview:review,abnormal:Boolean(closures.length || early.length)};
}

function hxOperationalExpectedDailyDay_(day, time) {
  // Daily FRED inputs are not intraday quotes. Allow the current publication day to finish.
  // Federal holidays are not inferred from missing prints or from an equity exchange schedule.
  let expected=time<'18:00'?hxOperationalDayShift_(day,-1):day;
  while ([0,6].includes(new Date(expected+'T12:00:00Z').getUTCDay())) expected=hxOperationalDayShift_(expected,-1);
  return expected;
}

function hxOperationalDailyState_(item, day, time) {
  if(!item) return 'missing';
  const expected=hxOperationalExpectedDailyDay_(day,time);
  const lag=hxExecutiveSessionsSince_(item.date,expected);
  return item.date>=expected?'published_daily':lag===1?'publication_delay':'stale';
}

function hxOperationalHealth_(input) {
  const day=input.day,time=input.time, data=input.monetary || {};
  const labels={US2Y:'U.S. Treasury 2Y',US10Y:'U.S. Treasury 10Y',REAL10Y:'U.S. real 10Y',VIXCLS:'VIX'};
  const rows=Object.entries(labels).map(([key,label])=>{
    const item=data[key];
    const status=hxOperationalDailyState_(item,day,time);
    return {key,label,provider:'FRED',observation:item?item.date:null,state:status};
  });
  const shadow=input.shadow || {};
  rows.push({key:'shadow',label:'Silver gauges',provider:'HEL-034 shadow',observation:shadow.latest || null,
    state:shadow.gauges && shadow.gauges.length?'shadow_current':shadow.latest?'stale':'missing'});
  let newest='';
  (input.factors || []).forEach(r=>{
    if (String(r.Instrument).toUpperCase()!=='XAGUSD') return;
    const t=r['As Of'];
    if (!t || !(t instanceof Date || /(?:Z|[+-]\d{2}:\d{2})$/.test(String(t)))) return;
    const when=new Date(t);
    if (!isNaN(when) && when<=input.now && when.toISOString()>newest) newest=when.toISOString();
  });
  rows.push({key:'factors',label:'Silver factor observations',provider:'Calculated Signals',observation:newest || null,
    state:newest?(input.now-Date.parse(newest)<=24*3600000?'factor_observation':'stale'):'missing'});
  if (input.calendar) rows.push({key:'calendar',label:'Official release calendar',provider:'BLS · Fed · BEA · NYSE',
    observation:input.calendar.verifiedOn,state:input.calendar.status});
  return rows;
}

function hxOperationalSnapshot_(source, sections, asOf) {
  const now=new Date(asOf), day=hxExecutiveEt_(now,'yyyy-MM-dd'), time=hxExecutiveEt_(now,'HH:mm');
  const sheets=source.sheets || {}, scoped={integration:{sections:Object.values(sections)}};
  const calendar=hxExecutiveOptional_('official calendar',()=>hxOperationalCalendar_(day,time),null);
  const monetary=hxExecutiveMarketData_(sheets.FRED_Raw || [],day);
  const shadow=hxExecutiveShadow_(scoped,day);
  const auction=hxExecutiveOptional_('spot candle acquisition',()=>hxAuctionCapture_(now),{state:'provider_unavailable',observedAt:null});
  return {schema:'harmonexus.operational-auction.v1',asOf,auction,calendar,monetary,shadow,
    health:hxOperationalHealth_({day,time,now,monetary,shadow,calendar,factors:sheets.Calculated_Signals || []})};
}

/** Owner-authorized source-only publication; never sends or calls score calculation. */
function refreshOperationalAuctionRuntime() {
  const spreadsheet=SpreadsheetApp.getActive();
  if(!hxSilverStagingCallerAuthorized_(hxSilverStagingCaller_()) || !spreadsheet || spreadsheet.getName()!=='Harmonexus v5 Parallel Test' || !hxSilverRuntimeEnabled_())
    throw Error('Operational runtime publication is not authorized for this bound project.');
  return hxWithLock_(()=>{
    const timestamp=new Date();
    const runtime=hxSilverBuildProductionRuntime_(hxSilverCaptureProductionSnapshot_(timestamp),timestamp);
    const op=runtime.operational_intelligence;
    if(!op || !op.calendar) throw Error('Operational intelligence missing from the published runtime.');
    hxSilverPublishRuntime_(runtime);
    return {runtime:runtime.runtime_id,auctionState:op.auction.state,calendarThrough:op.calendar.through,
      sourceDates:op.health.map(r=>[r.key,r.observation,r.state]),notificationDelivery:'not invoked',scoring:'unchanged'};
  });
}
