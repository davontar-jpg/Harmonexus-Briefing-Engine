/** Read-only presentation over published scores, recorded structure and approved research. */
function hxExecutiveText_(value, limit) {
  const s=String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim();
  if (!s || /^(unknown|unavailable|undefined|none)$/i.test(s) || s.length>(limit || 270)) return '';
  return s;
}

function hxExecutiveOptional_(label, run, fallback) {
  try { return run(); } catch (error) {
    if (typeof hxNotificationLogEvent_ === 'function') hxNotificationLogEvent_('WARN','Executive briefing optional evidence omitted',{section:label});
    return fallback;
  }
}

function hxExecutiveEt_(date, pattern) {
  return Utilities.formatDate(date,'America/New_York',pattern);
}

function hxExecutiveDay_(value) {
  // Spreadsheet daily dates are calendar observations, not wall-clock pull times.
  if (value instanceof Date && !isNaN(value)) return Utilities.formatDate(value,'America/Los_Angeles','yyyy-MM-dd');
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) ? String(value) : '';
}

function hxExecutiveSessionsSince_(from, to) {
  const last=Date.parse(to+'T00:00:00Z'), first=Date.parse(from+'T00:00:00Z');
  if (!isFinite(last) || !isFinite(first) || first>last || last-first>31*86400000) return Infinity;
  let n=0;
  for(let t=first+86400000;t<=last;t+=86400000) {
    const day=new Date(t).getUTCDay();
    if (day!==0 && day!==6) n++;
  }
  return n;
}

function hxExecutiveFredRows_() {
  const sh=SpreadsheetApp.getActive().getSheetByName(HX.sheets.rawFRED);
  if (!sh || sh.getLastRow()<2) return [];
  const width=sh.getLastColumn(), end=sh.getLastRow();
  const head=sh.getRange(1,1,1,width).getValues()[0], start=Math.max(2,end-34);
  return sh.getRange(start,1,end-start+1,width).getValues().map(row=>Object.fromEntries(head.map((col,i)=>[col,row[i]])));
}

function hxExecutiveMarketData_(rows, day) {
  const allowed=['US2Y','US10Y','REAL10Y','VIXCLS'];
  const data=(rows || []).filter(r=>String(r.Source || '')==='FRED').map(r=>({...r,observationDay:hxExecutiveDay_(r.Date)}))
    .filter(r=>r.observationDay && r.observationDay<=day).sort((a,b)=>b.observationDay.localeCompare(a.observationDay));
  const map={};
  allowed.forEach(id=>{
    const recent=data.filter(r=>hxObservedNumber_(r[id])!==null && (id!=='VIXCLS' || Number(r[id])>0));
    if (!recent.length) return;
    const a=recent[0], p=recent.find(r=>r.observationDay<a.observationDay);
    map[id]={value:Number(a[id]),date:a.observationDay,delta:p ? Number(a[id])-Number(p[id]) : null,
      priorDate:p ? p.observationDay : null,state:hxExecutiveSessionsSince_(a.observationDay,day)>1?'stale':'current_verified_observation'};
  });
  const matched=data.filter(r=>hxObservedNumber_(r.US2Y)!==null && hxObservedNumber_(r.US10Y)!==null);
  if (matched.length) {
    const a=matched[0], p=matched.find(r=>r.observationDay<a.observationDay);
    const curve=r=>Math.round((Number(r.US10Y)-Number(r.US2Y))*100);
    map.curve={value:curve(a),date:a.observationDay,delta:p ? curve(a)-curve(p) : null,
      state:hxExecutiveSessionsSince_(a.observationDay,day)>1?'stale':'current_verified_observation'};
  }
  return map;
}

function hxExecutiveMarketLines_(data, dollar) {
  const labels={US2Y:'US 2Y',US10Y:'US 10Y',REAL10Y:'US 10Y real',VIXCLS:'VIX',curve:'2s10s'};
  const signed=(v,dp)=> (v>0?'+':'')+v.toFixed(dp);
  const lines=[];
  const fresh=r=>r && ['current_verified_observation','published_daily'].includes(r.state);
  if (dollar) lines.push('DXY model: '+hxExecutiveBias_(dollar)+' · '+dollar.confidence.toFixed(0)+'% confidence. Not a spot quote.');
  Object.keys(labels).forEach(id=>{
    const r=data[id]; if (!r) return;
    const yieldLike=id!=='VIXCLS' && id!=='curve', dp=id==='curve'?0:2;
    const change=r.delta===null?'':' ('+signed(yieldLike?Math.round(100*r.delta):r.delta,id==='VIXCLS'?2:0)+(id==='VIXCLS'?' pts':' bp')+')';
    const status=r.state==='stale'?'stale daily observation':r.state==='publication_delay'?'one daily update behind':'published daily observation';
    lines.push(labels[id]+': '+r.value.toFixed(dp)+(yieldLike?'%':id==='curve'?' bp':'')+change+' · '+r.date+' · '+status+'.');
  });
  const nominal=data.US10Y, real=data.REAL10Y;
  if (fresh(nominal) && fresh(real) && nominal.date===real.date && nominal.priorDate===real.priorDate && real.delta!==null && Math.abs(real.delta)>=.009) {
    const relation=nominal.delta*real.delta<0?'Nominal and real yields diverged. ':'';
    lines.push(relation+(real.delta>0?'Higher real yields raise the opportunity cost of holding precious metals.':'Lower real yields ease the opportunity-cost headwind for precious metals.'));
  } else if (real && !fresh(real)) lines.push('Fresh real-yield confirmation is not established.');
  return lines;
}

function hxExecutiveBias_(score) {
  const sign=hxSignedDisplay_(score.direction,score.strength);
  return score.direction + (sign==='UNKNOWN'?'':' '+sign);
}

function hxExecutiveRecord_(score, structure, asOf) {
  return hxExecutiveOptional_('verified structure',()=>score ? hxAuctionEvidence_(score,structure,asOf) : null,null);
}

function hxExecutiveStructureLines_(record, full) {
  if (!record || !record.eligible) return [];
  const fields=full ? [['Auction phase','phase'],['Structure','condition'],['Observed acceptance/rejection','observed_behavior'],
    ['Participation','participation'],['Positioning','positioning'],['Structure change','changed'],['Liquidity hypothesis (unverified orders)','liquidity']] : [];
  return fields.concat([['Confirmation','confirmation'],['Challenge','invalidation']]).map(([k,v])=>{
    const label=hxExecutiveText_(record[v],240); return label?k+': '+label:'';
  }).filter(Boolean);
}

function hxExecutiveContradictions_(scores, priority) {
  const keep=new Map();
  const name={OI:'Open-interest participation',OPEN_INTEREST:'Open-interest participation',COMMERCIAL:'Commercial positioning',POSITIONING:'Positioning',DXY:'Dollar',REAL10Y:'Real-yield',US10Y:'10Y-yield'};
  scores.forEach(s=>s.contradictions.forEach(d=>{
    const factor=String(d.factor || '').toUpperCase(), magnitude=Math.abs(Number(d.contribution));
    if (!factor || !Number.isFinite(magnitude) || magnitude<.05) return;
    const effect=name[factor] || hxDriverBucket_(factor), key=s.instrument+'|'+effect;
    if (!/^(bullish|bearish)$/i.test(s.direction)) return;
    const row={line:s.instrument+' · '+effect+' opposes the '+s.direction.toLowerCase()+' reading.',rank:magnitude+(priority.includes(s)?0.02:0),effect:effect};
    if (!keep.has(key) || keep.get(key).rank<row.rank) keep.set(key,row);
  }));
  return Array.from(keep.values()).sort((a,b)=>b.rank-a.rank).slice(0,4);
}

function hxExecutiveReleaseTimes_(now, day, time) {
  if (typeof hxOperationalCalendar_==='function') return hxOperationalCalendar_(day,time);
  // Verified official release calendars; no first-Friday proxy or untimed fabrication.
  const dated=[['2026-11-06','08:30','Nonfarm payrolls','USD and front-end rates'],
    ['2026-11-10','08:30','CPI','real yields and USD'],
    ['2026-11-25','08:30','PCE inflation and Q3 GDP (second estimate)','Fed expectations, Treasury yields and USD'],
    ['2026-12-04','08:30','Nonfarm payrolls','USD and front-end rates'],
    ['2026-12-09','14:00','FOMC decision and projections','policy path, rates and USD'],
    ['2026-12-10','08:30','CPI','real yields and USD'],
    ['2026-12-23','08:30','PCE inflation and Q3 GDP (third estimate)','Fed expectations, Treasury yields and USD']];
  const through=new Date(Date.parse(day+'T00:00:00Z')+14*86400000).toISOString().slice(0,10);
  const watch=hxExecutiveOptional_('calendar market schedule',()=>hxMarketCalendarWatch_(now),null);
  const events=dated.filter(r=>r[0]>=day && r[0]<=through && (r[0]!==day || r[1]>=time));
  const closures=watch ? watch.calendar_conditions || [] : [];
  return {lines:closures.concat(events.map(r=>r[0]+' · '+r[1]+' ET · '+r[2]+' — '+r[3]+'.')).concat(day>'2026-12-31'?['Verified macro-release schedule not loaded for this period.']:[]),
    abnormal:Boolean(watch && watch.week_structure!=='NORMAL_WEEK'),risk:watch ? watch.market_rhythm_risk : null};
}

function hxExecutiveShadow_(runtime, day) {
  const section=hxHel035PresentationRuntimeSection_(runtime,'silver_intelligence');
  const input=section && section.silver_intelligence && section.silver_intelligence.subsections || [];
  const symbols={industrial_producer_participation:'COPX',strategic_materials:'REMX',grid_infrastructure:'GRID',
    defensive_dollar_pressure:'USDCHF',industrial_commodity_breadth:'DBB',solar_participation:'TAN'};
  const gauges=[]; let latest='';
  input.forEach(r=>{
    const symbol=symbols[r.subsection_id], when=String(r.current_timestamp || '').slice(0,10);
    if (!symbol || !/^\d{4}-\d{2}-\d{2}$/.test(when) || when>day) return;
    latest=when>latest?when:latest;
    if (r.source_status!=='available' || r.current_freshness!=='current' || hxExecutiveSessionsSince_(when,day)>1) return;
    const state=hxExecutiveText_(r.current_state,110);
    if (state && /^(supportive|challenging|neutral)$/.test(r.relationship))
      gauges.push(symbol+' · '+state+' · '+r.relationship+' in shadow context ('+when+').');
  });
  return {gauges:gauges.slice(0,4),latest:latest};
}

function hxExecutiveArchive_(silver, day, weekday, hour, abnormal) {
  const a=HX_EXECUTIVE_ARCHIVE, long=a.sources.longM5, latest=a.sources.histCoreM5;
  if (a.state!=='historical_observation' || long.last.slice(0,10)>=day || latest.last.slice(0,10)>=day) return null;
  const cohort={Bullish:'bullish trend',Bearish:'bearish trend',Neutral:'consolidation'}[silver.direction];
  const measure=(data,label)=>{
    const q=data && data.recovered;
    if (!q || q.n<20 || ![q.p50,q.p75,q.p90].every(Number.isFinite)) return '';
    const duration=data.recoveryMinutes && data.recoveryMinutes.n>=20 ? ' · median recovery '+data.recoveryMinutes.p50+' min' : '';
    return label.charAt(0).toUpperCase()+label.slice(1)+': median $'+q.p50.toFixed(3)+', p75 $'+q.p75.toFixed(3)+', p90 $'+q.p90.toFixed(3)+' per oz · '+q.n+' recovered paths'+duration+'.';
  };
  const base=Object.keys(long.week).map(side=>{
    const [d,r]=Object.entries(long.week[side]).sort((a,b)=>b[1].hits-a[1].hits)[0];
    return d+' '+side+'s '+r.hits+'/'+r.n+' ('+(r.frequency*100).toFixed(1)+'%)';
  }).join('; ');
  const reference=measure(long.daily[cohort],cohort+' daily prefix');
  const held=long.daily[cohort];
  const weekly=(cohort!=='consolidation')&&measure(long.weekly[cohort],cohort+' weekly prefix');
  const ranges=Object.values({long:long,recent:latest}).map(r=>r.scope+' · '+r.first.slice(0,10)+' to '+r.last.slice(0,10)+
    ': median day $'+r.range.daily.p50.toFixed(3)+' ('+r.range.daily.n+' sessions), week $'+r.range.weekly.p50.toFixed(3)+' ('+r.range.weekly.n+' weeks).');
  const session=long.overlap && long.overlap.n ? 'London–New York overlap contained '+long.overlap.hits+'/'+long.overlap.n+' historical daily highs; no forward expansion window is validated.' : '';
  return {state:a.state,sha256:a.sha256,archiveThrough:latest.last,week:(weekday==='Mon'||weekday==='Fri')&&!abnormal ? base+'. Current week unresolved.' : '',
    fullWeek:base+'. Recent Wednesday concentration unconfirmed.',range:ranges,
    retracement:[reference,weekly,reference?'EV Trading Labs / Dukascopy '+long.first.slice(0,4)+'–'+long.last.slice(0,4)+' · historical recovered pullbacks, not stops.':''].filter(Boolean),
    fullRetracement:Object.keys(long.daily).flatMap(k=>{
      const d=long.daily[k], h=d.healthy;
      return [measure(d,k+' daily prefix'),measure(long.weekly[k],k+' weekly prefix'),
        h && h.n>=20?'↳ Healthy continuations in '+k+' daily prefix: median $'+h.p50.toFixed(3)+'/oz ('+h.n+' recovered paths).':''];
    }).filter(Boolean),session:hour>=7 && hour<11 && !abnormal?session:'',fullSession:session,
    events:Object.entries(latest.events).map(([k,r])=>k+': '+r.eventsWithCompleteSession+' complete sessions; matched pre/post release windows are descriptive only.')};
}

function hxExecutiveBriefingSnapshot_(input) {
  const now=input.now, asOf=now.toISOString(), day=hxExecutiveEt_(now,'yyyy-MM-dd'), time=hxExecutiveEt_(now,'HH:mm');
  const scores=hxNormalizeBriefingRows_(input.rows), macro=hxCrossAssetBriefingContext_(scores);
  const priority=scores.slice().sort((a,b)=>b.strength*b.confidence-a.strength*a.confidence).slice(0,3);
  const changed=scores.filter(s=>s.material).sort((a,b)=>Math.abs(b.change||0)-Math.abs(a.change||0)).slice(0,3);
  const silver=scores.find(s=>s.instrument==='XAGUSD'), dollar=scores.find(s=>s.instrument==='DXY');
  const structure=new Map();
  priority.concat(silver?[silver]:[]).forEach(s=>{if(!structure.has(s.instrument)) structure.set(s.instrument,hxExecutiveRecord_(s,input.structure,asOf));});
  const calendar=hxExecutiveOptional_('conditions calendar',()=>hxExecutiveReleaseTimes_(now,day,time),{lines:[],abnormal:true});
  const archive=hxExecutiveOptional_('silver archive',()=>silver ? hxExecutiveArchive_(silver,day,hxExecutiveEt_(now,'EEE'),Number(time.split(':')[0]),calendar.abnormal) : null,null);
  const operational=input.runtime && input.runtime.operational_intelligence;
  const monetary=hxExecutiveOptional_('monetary evidence',()=>{
    const data=operational && operational.monetary || hxExecutiveMarketData_(input.fred,day);
    if(typeof hxOperationalDailyState_!=='function') return data;
    return Object.fromEntries(Object.entries(data).map(([key,r])=>[key,{...r,state:hxOperationalDailyState_(r,day,time)}]));
  },{});
  const shadow=hxExecutiveOptional_('silver gauge evidence',()=>hxExecutiveShadow_(input.runtime,day),{gauges:[],latest:''});
  const currentAuction=hxExecutiveOptional_('current spot auction',()=>typeof hxAuctionForBriefing_==='function'?hxAuctionForBriefing_(operational && operational.auction,now):null,null);
  const auctionLines=hxExecutiveOptional_('current auction presentation',()=>currentAuction ? hxAuctionBriefingLines_(currentAuction):null,null);
  const relationships=hxExecutiveOptional_('relationship evidence',()=>typeof hxMacroConsensusEngine_==='function'?
    {macroConsensus:hxMacroConsensusEngine_(scores),leadLag:hxLeadLagWatch_(scores)}:null,null);
  // The wrapper time and every source observation have independent timestamps.
  return {day,time,asOf,reference:input.runtime && input.runtime.runtime_id || 'Scores:'+asOf,
    sourceStamp:input.rows.reduce((v,r)=>{const t=r['As Of']; return t instanceof Date && !isNaN(t) && t.toISOString()>v ? t.toISOString() : v;},''),
    scores,macro,priority,changed,silver,dollar,structure,calendar,archive,monetary,shadow,relationships,auctionLines};
}

function hxExecutiveSection_(title, lines, required) { return {title,lines:(lines || []).filter(Boolean),required:required===true}; }
function hxExecutiveJoin_(header, sections, footer) {
  const lines=sections.filter(s=>s.lines.length).map(s=>[s.title].concat([...new Set(s.lines)]).join('\n'));
  return header.concat(lines,footer || []).join('\n\n'+hxBriefingDivider_()+'\n\n');
}

function hxExecutiveTelegram_(header, sections, footer) {
  const budget=3800;
  const required=sections.filter(s=>s.required);
  if (hxExecutiveJoin_(header,required,footer).length>budget) throw new Error('Critical executive edition exceeds Telegram budget; no partial rendering.');
  const kept=new Set(required);
  sections.filter(s=>!s.required && s.lines.length).forEach(s=>{
    kept.add(s);
    if (hxExecutiveJoin_(header,sections.filter(b=>kept.has(b)),footer).length>budget) kept.delete(s);
  });
  return hxExecutiveJoin_(header,sections.filter(s=>kept.has(s)),footer);
}

function hxExecutiveRender_(model) {
  const h=hxExecutiveSection_, m=model.macro, silver=model.silver;
  const date=model.day+' · '+model.time+' ET\nSnapshot: '+model.reference;
  const title='HARMONEXUS\nChief Investment Officer Robinson’s\nMorning Market Brief\n'+date;
  const regime=h('MARKET REGIME',[m.market.state+' · '+m.market.participation.toLowerCase()+' participation · '+m.market.agreement+'% cross-asset agreement.',
    'Conviction: '+m.conviction.label+' ('+m.conviction.score+'%).'],true);
  const monetary=h('MONETARY CONDITIONS',hxExecutiveMarketLines_(model.monetary,model.dollar),true);
  const driver=m.driver.primary.contribution>0?m.driver.primary.name+' is the leading scored driver ('+m.driver.primary.contribution+'% of attributed weight).':'';
  const secondary=m.driver.secondary.contribution>=15?'Secondary: '+m.driver.secondary.name+' ('+m.driver.secondary.contribution+'%).':'';
  const drivers=h('PRIMARY MARKET DRIVER',[driver,secondary],true);
  const rotation=m.rotation.category==='No Clear Rotation'?'No clear capital-rotation pattern.':m.rotation.category+' · '+m.rotation.destination.join(', ')+' vs. '+m.rotation.source.join(', ')+'. This is modeled alignment, not measured flows.';
  const consensus=h('CROSS-ASSET CONSENSUS & ROTATION',[
    m.consensus.filter(x=>x.name!=='Dollar'&&x.label!=='Insufficient Evidence').map(x=>(x.name==='Rates'?'Yield bias':x.name)+': '+x.label).join(' · '),rotation],true);
  const contradictions=hxExecutiveContradictions_(model.scores,model.priority);
  const challenge=h('MATERIAL CONTRADICTIONS',contradictions.map(c=>c.line),true);
  const priorities=h('PRIORITY INSTRUMENTS',model.priority.flatMap((s,i)=>{
    const lead=s.drivers[0], b=lead ? ' · '+hxDriverBucket_(String(lead.factor || 'Evidence'))+' leads' : '';
    const row=(i+1)+'. '+s.instrument+' · '+hxExecutiveBias_(s)+' · '+s.confidence.toFixed(0)+'% confidence'+b+(s.regimeAge>0?' · '+s.regimeAge+' sessions':'');
    return [row].concat(hxExecutiveStructureLines_(model.structure.get(s.instrument),false));
  }),true);
  const changes=h('MATERIAL CHANGE',model.changed.map(s=>s.instrument+' · '+hxSignedTransition_(s.row)+
    (s.primaryDrivers.length?' '+s.primaryDrivers.slice(0,2).map(hxDriverChangeLabel_).join('; ')+'.':'')),false);
  const calendar=h('HIGH-IMPACT CALENDAR',model.calendar.lines,true);
  const a=model.archive;
  const live=model.auctionLines;
  const tactical=h('XAGUSD — SILVER MARKET DESK',silver?[
    'Published reading: '+hxExecutiveBias_(silver)+' · '+silver.confidence.toFixed(0)+'% confidence'+(silver.regimeAge>0?' · '+silver.regimeAge+' sessions in regime':'')+'.',
    silver.material && !model.changed.includes(silver)?hxSignedTransition_(silver.row):'',
    live?'OANDA spot-referenced midpoint; closed-bar evidence.':'No verified current spot candles for range or extreme timing.'+(a?' Archive through '+a.archiveThrough.slice(0,10)+'.':'')
  ]:[],true);
  const sr=model.structure.get('XAGUSD'), inPriority=model.priority.includes(silver);
  const auction=h('AUCTION REQUIREMENT',silver ? (live && live.structure.length ? live.structure : sr && sr.eligible ? (inPriority?[]:hxExecutiveStructureLines_(sr,false)) : ['No verified current acceptance or invalidation level.']) : [],true);
  const week=h('WEEKLY H/L WATCH',live?live.extremes:a?[a.week]:[],Boolean(live));
  const range=h('RANGE STATE',live?live.range:[],Boolean(live));
  const session=h('SESSION EXPANSION',live?live.sessions:a?[a.session]:[]);
  const retracement=h('HISTORICAL RETRACEMENT',a&&a.retracement.length?a.retracement.concat(['Operational trailing distance not validated.']):[]);
  const gauges=h('SILVER GAUGES',model.shadow.gauges.length ? model.shadow.gauges : (model.shadow.latest?['HEL-034 observations last dated '+model.shadow.latest+'; omitted from the current read.']:[]));
  const firstContradiction=contradictions[0];
  const cio=h('CIO ASSESSMENT',[firstContradiction ? firstContradiction.effect+' divergence is the principal challenge. Reassess if it persists as '+(model.priority[0]?model.priority[0].instrument:'the leading instrument')+' loses directional strength or reverses.' :
    (m.market.state==='Fragmented'?'Require broader agreement before treating isolated direction as a cross-asset regime.':'Reassess if a leading instrument flips direction or loses 1.5 signed-bias points.')],true);
  const reminder='Quod acquisitum est, custodi.\nProtect what has been gained.';
  const global=[regime,monetary,drivers,consensus,challenge,changes,priorities,calendar,cio];
  const tac=[tactical,week,range,retracement,session,auction,gauges];
  const tg1=hxExecutiveTelegram_([title+'\n\nGLOBAL MARKET INTELLIGENCE · EDITION I OF II'],global,['Continued in Edition II — Tactical Market Intelligence.']);
  const tg2=hxExecutiveTelegram_(['HARMONEXUS\nTACTICAL MARKET INTELLIGENCE · EDITION II OF II\n'+date],tac,[reminder,'Full institutional analysis is provided by email.']);

  const relation=model.relationships;
  const details=relation && relation.macroConsensus && relation.macroConsensus.evaluated>0 ?
    ['Derived-score relationship checks: '+relation.macroConsensus.score+'/100 · '+relation.macroConsensus.evaluated+' evaluated; these are not independent market observations.',
    ...(relation.macroConsensus.confirmations || []).filter(x=>typeof x==='string').slice(0,3),
    ...(relation.macroConsensus.contradictions || []).filter(x=>typeof x==='string').slice(0,3)] : [];
  if (relation && relation.leadLag && relation.leadLag.supportedCount>0) {
    const lead=relation.leadLag;
    details.push('Historical lead/lag: '+(lead.currentLeaders || []).join(', ')+' → '+(lead.currentFollowers || []).join(', ')+' · '+lead.confidence+' confidence; not causal.');
  }
  const season=model.scores.filter(s=>s.seasonalWatch && hxExecutiveText_(s.seasonalWatch.title,150)).slice(0,2)
    .map(s=>{const title=hxExecutiveText_(s.seasonalWatch.title,150);return title.startsWith(s.instrument)?title:s.instrument+' · '+title;});
  const long=hxExecutiveJoin_([title+(model.sourceStamp?'\nPublished scores: '+model.sourceStamp:'')],
    [regime,monetary,drivers,h(consensus.title,consensus.lines.concat(details)),challenge,priorities,calendar,tactical,range,live?week:h(week.title,[]),
    h('WEEKLY EXTREMES & RANGE BASELINES',a?[a.fullWeek,...a.range,'Historical baselines; current daily/weekly completion is unverified. Archive reference: '+a.sha256.slice(0,12)+'.']:[]),
    h('RETRACEMENT & TRAILING REFERENCE',a?a.fullRetracement.concat(['EV Trading Labs / Dukascopy full sessions, 2015–2025. Operational trailing distance not validated.']):[]),
    h('SESSION EXPANSION & EVENT PATHS',(live?live.sessions:[]).concat(a?[a.fullSession,...a.events]:[])),
    h('AUCTION REQUIREMENT',live&&live.structure.length?live.structure:sr&&sr.eligible?hxExecutiveStructureLines_(sr,true):auction.lines),gauges,
    changes,h('HISTORICAL SEASONAL CONTEXT',season),cio,h('OPERATOR DISCIPLINE',[reminder])],
    ['Decision support only. No trade execution.','Historical evidence: https://harmonexus-briefing-engine-ve6g9fnnnzsqsubtbwc5yt.streamlit.app/ → Instrument Lab → XAGUSD']);
  return {briefing:long,emailMessage:long,telegramMessage:tg1,telegramEditions:[tg1,tg2],runtime_id:model.reference,dailyKey:model.day,
    hel035_enabled:!model.reference.startsWith('Scores:'),formatter:'Executive Briefing V2',emailFormatter:'Executive Briefing V2',telegramFormatter:'Executive Briefing V2 · two plain-text editions'};
}
