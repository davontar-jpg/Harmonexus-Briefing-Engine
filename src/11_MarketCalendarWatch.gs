/** Briefing-only market calendar intelligence. Does not alter scores or direction. */
function hxMarketCalendarWatch_(currentDate) {
  const today = hxCalendarDate_(currentDate || new Date());
  const weekStart = hxAddDays_(today, -hxWeekdayMon0_(today));
  const weekdays = [0,1,2,3,4].map(i=>hxAddDays_(weekStart,i));
  const holidays = {};
  [today.getFullYear()-1,today.getFullYear(),today.getFullYear()+1].forEach(y=>{
    const h = hxMarketHolidayMap_(y);
    Object.keys(h).forEach(k=>holidays[k]=h[k]);
  });
  const closures = weekdays.map(d=>holidays[hxDateKey_(d)]).filter(Boolean);
  const earlyCloses = hxMarketEarlyCloses_(weekdays, holidays);
  const catalysts = hxMarketCatalysts_(weekdays, holidays);
  const sessions = Math.max(0, 5 - closures.length);
  const weekStructure = hxCalendarWeekStructure_(sessions, closures, earlyCloses);
  const risk = hxCalendarRiskScore_(sessions, closures.length>0, earlyCloses.length>0, catalysts.length>0);
  const liquidity = hxCalendarLiquidityScore_(sessions, closures.length>0, earlyCloses.length>0, today, closures);
  const operational = hxCalendarOperationalAssessment_(sessions, closures, earlyCloses, catalysts);
  const adjustment = hxCalendarAuctionAdjustment_(sessions, closures, earlyCloses, catalysts);
  const confidence = (closures.length || earlyCloses.length || catalysts.length) ? 'HIGH' : 'MODERATE';
  const calendarConditions = closures.concat(earlyCloses).map(c=>c.label + ': ' + hxDayName_(c.date) + ' — ' + c.detail);
  const majorCatalysts = catalysts.map(c=>c.label + ': ' + hxDayName_(c.date) + ' — ' + c.detail);
  const majorCatalystEvents = catalysts.map(c=>({label:c.label,date:c.date,detail:c.detail,type:c.type,severity:'high'}));
  const operatorGuidance = [
    weekStructure === 'NORMAL_WEEK' ? 'Treat this as a standard auction week unless live participation changes.' : 'Treat this as an abnormal auction environment.',
    weekStructure === 'NORMAL_WEEK' ? 'Standard weekly timing assumptions remain usable but subordinate to live evidence.' : 'Avoid assuming standard weekly timing.',
    weekStructure === 'NORMAL_WEEK' ? 'Do not infer direction from the calendar alone.' : 'Give less weight to late-week moves after liquidity deterioration.',
    'Use catalysts as participation/liquidity events, not directional predictions.'
  ];
  const watch = {week_structure:weekStructure,market_rhythm_risk:risk,liquidity_score:liquidity,calendar_conditions:calendarConditions,
    major_catalysts:majorCatalysts,major_catalyst_events:majorCatalystEvents,operational_assessment:operational,historical_auction_adjustment:adjustment,
    operator_guidance:operatorGuidance,confidence:confidence};
  watch.briefing_text = hxMarketCalendarBriefingText_(watch);
  return watch;
}

function hxMarketCalendarBriefingLines_(currentDate) {
  return hxMarketCalendarWatch_(currentDate).briefing_text.split('\n');
}

/** Compact view of the existing Market Calendar Watch catalyst classification. */
function hxShortHighImpactCalendarLines_(currentDate, watchOverride) {
  const today = hxCalendarDate_(currentDate || new Date());
  const watch = watchOverride || hxMarketCalendarWatch_(today);
  const events = Array.isArray(watch.major_catalyst_events) ? watch.major_catalyst_events : [];
  const eligible = events.filter(event=>{
    const severity = String(event.severity || '').toLowerCase();
    if (['high','major','critical'].indexOf(severity) < 0) return false;
    const eventDate = hxCalendarDate_(event.date);
    return !isNaN(eventDate.getTime()) && eventDate.getTime() >= today.getTime();
  }).sort((a,b)=>hxCalendarDate_(a.date)-hxCalendarDate_(b.date)).slice(0,2);
  if (!eligible.length) return [];

  const lines = ['HIGH-IMPACT CALENDAR'];
  eligible.forEach(event=>lines.push(hxDayName_(hxCalendarDate_(event.date))+' \u00b7 '+hxShortCalendarEventName_(event.detail)));
  if (eligible.length > 1) {
    lines.push('Week carries elevated scheduled catalyst risk.');
  } else {
    lines.push(hxShortCalendarImpact_(eligible[0].detail));
  }
  return lines;
}

function hxShortCalendarEventName_(detail) {
  const text = String(detail || 'Major Scheduled Catalyst').trim();
  if (/\bNFP\b|non[- ]?farm payrolls?/i.test(text)) return 'Non-Farm Payrolls';
  if (/\bFOMC\b/i.test(text)) return 'FOMC Rate Decision';
  if (/\bcore CPI\b/i.test(text)) return 'Core CPI';
  if (/\bCPI\b/i.test(text)) return 'CPI';
  if (/\bPCE\b/i.test(text)) return 'PCE Inflation';
  if (/\bGDP\b/i.test(text)) return 'GDP';
  return text;
}

function hxShortCalendarImpact_(detail) {
  const text = String(detail || '');
  if (/\bFOMC\b|Federal Reserve|Powell/i.test(text))
    return 'Auction/volatility risk may remain compressed ahead of the release and expand around the catalyst.';
  if (/\bNFP\b|non[- ]?farm payrolls?|\bCPI\b|\bPCE\b|\bGDP\b/i.test(text))
    return 'Major USD/rates catalyst; expect elevated volatility and potential liquidity expansion around release.';
  return 'Major scheduled catalyst; volatility, liquidity, and participation may shift around the release.';
}

function hxMarketCalendarBriefingText_(watch) {
  const lines = ['MARKET CALENDAR WATCH','',
    'Week Structure: ' + watch.week_structure,
    'Market Rhythm Risk: ' + Number(watch.market_rhythm_risk).toFixed(1) + '/10',
    'Liquidity Score: ' + Number(watch.liquidity_score).toFixed(1) + '/10',
    '', 'Key Calendar Conditions:'];
  (watch.calendar_conditions.length ? watch.calendar_conditions : ['No abnormal holiday or early-close condition detected.']).forEach(x=>lines.push('• ' + x));
  watch.major_catalysts.forEach(x=>lines.push('• ' + x));
  lines.push('', 'Operational Assessment:');
  watch.operational_assessment.forEach(x=>lines.push('• ' + x));
  lines.push('', 'Historical Auction Adjustment:', 'Normal Week:', watch.historical_auction_adjustment.normal_week, '', 'This Week:', watch.historical_auction_adjustment.current_week, '', 'Operator Guidance:');
  watch.operator_guidance.forEach(x=>lines.push('• ' + x));
  lines.push('', 'Confidence: ' + watch.confidence);
  return lines.join('\n');
}

function hxMarketHolidayMap_(year) {
  const holidays = {};
  function add(actual,label,detail) {
    const observed = hxObservedHoliday_(actual);
    holidays[hxDateKey_(observed)] = {label:label,date:observed,detail:hxDateKey_(actual)===hxDateKey_(observed)?detail:'observed ' + detail,type:'closure'};
  }
  add(new Date(year,0,1),'NYSE/Nasdaq Closed',"New Year's Day");
  add(hxNthWeekday_(year,0,1,3),'NYSE/Nasdaq Closed','Martin Luther King Jr. Day');
  add(hxNthWeekday_(year,0,2,3),'NYSE/Nasdaq Closed','Presidents Day');
  add(hxAddDays_(hxEaster_(year),-2),'NYSE/Nasdaq Closed','Good Friday');
  add(hxLastWeekday_(year,0,5),'NYSE/Nasdaq Closed','Memorial Day');
  add(new Date(year,5,19),'NYSE/Nasdaq Closed','Juneteenth');
  add(new Date(year,6,4),'NYSE/Nasdaq Closed','Independence Day');
  add(hxNthWeekday_(year,0,9,1),'NYSE/Nasdaq Closed','Labor Day');
  add(hxNthWeekday_(year,3,11,4),'NYSE/Nasdaq Closed','Thanksgiving Day');
  add(new Date(year,11,25),'NYSE/Nasdaq Closed','Christmas Day');
  return holidays;
}

function hxMarketEarlyCloses_(weekdays, holidays) {
  const out = [];
  weekdays.forEach(day=>{
    const key = hxDateKey_(day);
    if (holidays[key]) return;
    const prior = holidays[hxDateKey_(hxAddDays_(day,-1))];
    const next = holidays[hxDateKey_(hxAddDays_(day,1))];
    if (day.getMonth()===10 && day.getDay()===5 && prior && String(prior.detail).indexOf('Thanksgiving')>=0) out.push({label:'NYSE/Nasdaq Early Close',date:day,detail:'day after Thanksgiving',type:'early_close'});
    if (day.getMonth()===11 && day.getDate()===24 && day.getDay()>=1 && day.getDay()<=5) out.push({label:'NYSE/Nasdaq Early Close',date:day,detail:'Christmas Eve liquidity decay',type:'early_close'});
    if (next && String(next.detail).indexOf('Independence Day')>=0) out.push({label:'Bond Market',date:day,detail:'early close before observed Independence Day',type:'early_close'});
  });
  return out;
}

function hxMarketCatalysts_(weekdays, holidays) {
  const out = [];
  const months = {};
  weekdays.forEach(d=>months[d.getFullYear() + '-' + d.getMonth()] = d);
  Object.keys(months).forEach(k=>{
    const sample = months[k];
    const monthStart = new Date(sample.getFullYear(), sample.getMonth(), 1);
    let firstFriday = hxAddDays_(monthStart, (5 - monthStart.getDay() + 7) % 7);
    if (holidays[hxDateKey_(firstFriday)]) firstFriday = hxAddDays_(firstFriday, -1);
    if (weekdays.some(d=>hxDateKey_(d)===hxDateKey_(firstFriday)) && !out.some(c=>hxDateKey_(c.date)===hxDateKey_(firstFriday) && String(c.detail).indexOf('NFP')>=0)) {
      out.push({label:'Major Catalyst',date:firstFriday,detail:'NFP / Nonfarm Payrolls',type:'catalyst'});
    }
  });
  const fomc = {'2026-01-28':true,'2026-03-18':true,'2026-04-29':true,'2026-06-17':true,'2026-07-29':true,'2026-09-16':true,'2026-10-28':true,'2026-12-09':true};
  weekdays.forEach(d=>{ if (fomc[hxDateKey_(d)]) out.push({label:'Major Catalyst',date:d,detail:'FOMC rate decision',type:'catalyst'}); });
  return out;
}

function hxCalendarWeekStructure_(sessions, closures, earlyCloses) {
  if (sessions <= 3) return 'THREE_DAY_WEEK';
  if (sessions === 4) return 'FOUR_DAY_WEEK';
  if (earlyCloses.length) return 'EARLY_CLOSE_WEEK';
  if (closures.length) return 'HOLIDAY_DISTORTED_WEEK';
  return 'NORMAL_WEEK';
}

function hxCalendarRiskScore_(sessions, hasClosure, hasEarlyClose, hasCatalyst) {
  let score = 2.2;
  if (hasCatalyst) score = 5.2;
  if (sessions === 4) score = 7.2;
  if (sessions === 4 && hasCatalyst) score = 8.7;
  if (sessions <= 3) score = 9.2;
  if (hasEarlyClose) score += .4;
  if (hasClosure && hasEarlyClose && hasCatalyst) score += .3;
  return Math.round(Math.min(score,10)*10)/10;
}

function hxCalendarLiquidityScore_(sessions, hasClosure, hasEarlyClose, today, closures) {
  let score = 8.4;
  if (hasClosure) score = 5.6;
  if (hasEarlyClose) score = Math.min(score,4.8);
  if (sessions <= 3) score = 3.2;
  if (closures.some(c=>{const diff=(hxCalendarDate_(c.date)-today)/86400000; return diff>=0 && diff<=1;})) score = Math.min(score,4.2);
  return Math.round(Math.max(score,1)*10)/10;
}

function hxCalendarOperationalAssessment_(sessions, closures, earlyCloses, catalysts) {
  if (!closures.length && !earlyCloses.length && !catalysts.length) return ['Weekly auction rhythm is structurally normal.','Calendar conditions are not reducing auction conviction by themselves.'];
  const out = [];
  if (sessions < 5) { out.push('Weekly auction likely compressed'); out.push('Institutional positioning may occur earlier than normal'); }
  if (earlyCloses.length || closures.length) { out.push('Late-week liquidity may deteriorate'); out.push('Price action may feel displaced from normal weekly rhythm'); }
  if (catalysts.length) { out.push('Liquidity sweeps are more probable around major release windows'); out.push('Auction completion may be delayed into the catalyst'); }
  return out;
}

function hxCalendarAuctionAdjustment_(sessions, closures, earlyCloses, catalysts) {
  const normal = 'LOW → MIDWEEK EXPANSION → FRIDAY FOLLOW-THROUGH';
  let current = normal;
  if (sessions <= 3) current = 'LOW → COMPRESSED MIDWEEK AUCTION → HOLIDAY LIQUIDITY GAP';
  else if (sessions === 4 && catalysts.length) current = 'LOW → TUESDAY/WEDNESDAY EXPANSION → CATALYST LIQUIDITY DECAY';
  else if (sessions === 4) current = 'LOW → EARLY-WEEK POSITIONING → PRE-HOLIDAY LIQUIDITY DECAY';
  else if (earlyCloses.length) current = 'LOW → MIDWEEK EXPANSION → EARLY-CLOSE LIQUIDITY DECAY';
  return {normal_week:normal,current_week:current};
}

function hxCalendarDate_(value) {
  const d = value instanceof Date ? value : new Date(value);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function hxDateKey_(d) { return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }
function hxAddDays_(d, days) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days); }
function hxWeekdayMon0_(d) { return (d.getDay() + 6) % 7; }
function hxObservedHoliday_(d) { if (d.getDay()===6) return hxAddDays_(d,-1); if (d.getDay()===0) return hxAddDays_(d,1); return d; }
function hxNthWeekday_(year, weekday, monthOneBased, nth) {
  let d = new Date(year, monthOneBased-1, 1);
  d = hxAddDays_(d, (weekday - d.getDay() + 7) % 7);
  return hxAddDays_(d, 7*(nth-1));
}
function hxLastWeekday_(year, weekday, monthOneBased) {
  let d = monthOneBased===12 ? new Date(year,11,31) : new Date(year,monthOneBased,0);
  return hxAddDays_(d, -((d.getDay() - weekday + 7) % 7));
}
function hxEaster_(year) {
  const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3);
  const h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451);
  const month=Math.floor((h+l-7*m+114)/31), day=((h+l-7*m+114)%31)+1;
  return new Date(year,month-1,day);
}
function hxDayName_(d) { return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d.getDay()]; }

function testMarketCalendarWatch() {
  const watch = hxMarketCalendarWatch_(new Date(2026,6,2));
  if (watch.week_structure !== 'FOUR_DAY_WEEK') throw new Error('Expected July 2026 observed Independence Day week to be four-day.');
  if (watch.briefing_text.indexOf('MARKET CALENDAR WATCH') < 0) throw new Error('Briefing text missing calendar section.');
  return watch;
}
