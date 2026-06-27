function sendDailyBriefing() {
  const scores = hxLatestScoreRows_();
  if (!scores.length) throw new Error('No Instrument_Scores rows are available for the daily briefing.');
  return hxDeliver_(hxBuildDailyBriefing_(scores), 'Daily Briefing', 'ALL');
  /* Legacy formatter retained below for rollback reference.
  const top = scores.sort((a,b) => Number(b.Strength) - Number(a.Strength)).slice(0, 8);
  const useAI = hxProps_().getProperty('AI_DAILY_ENABLED') === 'true';
  const lines = ['HARMONEXUS DAILY BRIEFING', Utilities.formatDate(new Date(), 'America/New_York', 'EEE, MMM d · h:mm a z'), ''];
  top.forEach(r => {
    lines.push(r.Instrument + ': ' + r.Direction + ' ' + Number(r.Strength).toFixed(1) + '/10 · confidence ' + r.Confidence + '%');
    if (useAI) {
      const interpretation = interpretScoreWithAI({
        instrument:String(r.Instrument), name:String(r.Name || r.Instrument), family:String(r.Family || ''),
        label:String(r.Direction), strength:Number(r.Strength), directionScore:Number(r['Directional Score'] || 0), confidence:Number(r.Confidence || 0),
        strongestDrivers:safeJsonCell_(r['Strongest Drivers'], []), contradictions:safeJsonCell_(r.Contradictions, []),
        priorLabel:String(r['Prior Direction'] || ''), priorStrength:r['Prior Strength'] === '' ? '' : Number(r['Prior Strength']),
        scoreChange:r['Score Change'] === '' ? null : Number(r['Score Change'])
      });
      lines.push('  ' + interpretation.summary);
    }
  });
  lines.push('', 'Decision support only. No trade execution.');
  return hxDeliver_(lines.join('\n'), 'Daily Briefing', 'ALL'); */
}

function hxBuildDailyBriefing_(rows) {
  const scores=(rows || []).map(r=>({row:r,instrument:String(r.Instrument),direction:String(r.Direction || 'Neutral'),
    strength:Number(r.Strength || 1),confidence:Number(r.Confidence || 0),score:Number(r['Directional Score'] || 0),
    reliability:String(r.Reliability || ''),drivers:safeJsonCell_(r['Strongest Drivers'],[]),contradictions:safeJsonCell_(r.Contradictions,[]),
    change:r['Score Change']===''||r['Score Change']===null?null:Number(r['Score Change']),material:String(r['Material Change']).toLowerCase()==='true',
    regime:String(r.Regime || r.Direction || 'Neutral'),regimeAge:Number(r['Regime Age (Trading Days)'] || 0),
    primaryDrivers:safeJsonCell_(r['Primary Drivers'],[]),seasonalWatch:safeJsonCell_(r['Seasonal Watch'],null)}));
  const equities=scores.filter(s=>String(s.row.Family).toLowerCase().indexOf('equity')>=0);
  const riskAverage=(equities.length?equities:scores).reduce((n,s)=>n+s.score,0)/(equities.length||scores.length);
  const dispersion=scores.some(s=>s.score>1.5) && scores.some(s=>s.score<-1.5);
  const regime=dispersion?'fragmented':riskAverage>1.5?'risk-on':riskAverage<-1.5?'risk-off':'neutral';
  const regimeConfidence=Math.round(scores.reduce((n,s)=>n+s.confidence,0)/scores.length);
  const factorMap={};
  scores.forEach(s=>s.drivers.forEach(d=>{const key=String(d.factor || 'Evidence'); factorMap[key]=(factorMap[key]||0)+Number(d.contribution||0);}));
  const factors=Object.keys(factorMap).sort((a,b)=>Math.abs(factorMap[b])-Math.abs(factorMap[a])).slice(0,3);
  const contradictions=[];
  scores.forEach(s=>s.contradictions.forEach(d=>{if(contradictions.length<2) contradictions.push(s.instrument+' faces opposing '+String(d.factor||'evidence').toLowerCase()+' ('+Number(d.contribution||0).toFixed(2)+').');}));
  const changed=scores.filter(s=>s.material).sort((a,b)=>Math.abs(b.change||0)-Math.abs(a.change||0));
  const priority=scores.slice().sort((a,b)=>(b.strength*b.confidence)-(a.strength*a.confidence)).slice(0,3);
  const lines=['MARKET REGIME:',regime+' — confidence '+regimeConfidence+'%','','KEY DRIVERS:'];
  (factors.length?factors:['No dominant factor']).forEach(f=>lines.push('- '+(factorMap[f]===undefined?f:f+' is contributing '+(factorMap[f]>=0?'positive':'negative')+' cross-asset pressure.')));
  lines.push('','CONTRADICTIONS:');
  (contradictions.length?contradictions:['No material cross-asset contradiction in the available evidence.']).forEach(x=>lines.push('- '+x));
  lines.push('','MATERIAL CHANGE:');
  if (changed.length) changed.slice(0,3).forEach(s=>lines.push.apply(lines,hxMaterialChangeLines_(s)));
  else lines.push('No instrument crossed a material-change threshold since the prior reading.');
  lines.push('','PRIORITY INSTRUMENTS:');
  priority.forEach((s,i)=>{
    lines.push((i+1)+'. '+s.instrument+' — '+s.direction+' '+s.strength.toFixed(1)+'/10 — '+hxPriorityReason_(s));
    lines.push('   Age: '+(s.regimeAge>0?s.regimeAge+' trading days':'unavailable'));
  });
  const seasonal=scores.filter(s=>s.seasonalWatch && s.seasonalWatch.title).sort((a,b)=>
    (String(b.seasonalWatch.status)==='WATCH'?1:0)-(String(a.seasonalWatch.status)==='WATCH'?1:0)).slice(0,2);
  if (seasonal.length) {
    lines.push('','SEASONAL WATCH','');
    seasonal.forEach((s,i)=>{
      const watch=s.seasonalWatch;
      lines.push(String(watch.title));
      if (watch.detail) lines.push(String(watch.detail));
      lines.push('Status: '+String(watch.status || 'DEVELOPING')+(watch.limitedSample?' · limited sample':''));
      if (i<seasonal.length-1) lines.push('');
    });
  }
  lines.push('','WATCH CONDITIONS:','- A direction flip or a 1.5-point score change would alter the current regime read.','- Broader factor agreement with confidence above 75% would confirm the current read.','','Decision support only. No trade execution.');
  return lines.join('\n');
}

function hxMaterialChangeLines_(score) {
  const lines=[score.instrument+' '+(score.change>=0?'strengthened ':'weakened ')+Math.abs(score.change || 0).toFixed(1)+' points from its prior reading.'];
  const drivers=(score.primaryDrivers || []).slice(0,3);
  if (drivers.length) {
    lines.push('Primary Drivers:');
    drivers.forEach(d=>lines.push('- '+hxDriverChangeLabel_(d)));
  }
  return lines;
}

function hxDriverChangeLabel_(driver) {
  const factor=String(driver.factor || '').toUpperCase(), delta=Number(driver.delta || 0);
  if (factor==='TREND') return delta>=0?'Trend improvement':'Trend deterioration';
  if (['US2Y','US5Y','US10Y','US30Y','REAL10Y'].indexOf(factor)>=0) return factor==='REAL10Y'?'Real-yield pressure':'Yield divergence';
  const labels={DXY:'Dollar pressure',POSITIONING:'Positioning shift',COMMERCIAL:'Commercial positioning',OI:'Open-interest change',RISK:'Risk sentiment',FED:'Fed policy',INFLATION:'Inflation pressure'};
  return labels[factor] || factor.replace(/_/g,' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
}

function hxPriorityReason_(score) {
  const first=score.drivers[0];
  const evidence=first?String(first.factor || 'the leading factor').toLowerCase():'the available evidence stack';
  return evidence+' leads the read; '+score.confidence.toFixed(0)+'% confidence'+(score.reliability?' ('+score.reliability.toLowerCase()+')':'')+'.';
}

function sendMajorChangeAlert_(score) {
  const movement=score.scoreChange===null?'New material reading.':score.instrument+' '+(score.scoreChange>=0?'strengthened ':'weakened ')+Math.abs(score.scoreChange).toFixed(1)+' points from its prior reading.';
  const lines = [
    'HARMONEXUS MAJOR CHANGE',
    score.instrument + ': ' + score.label + ' ' + score.strength.toFixed(1) + '/10',
    'Prior: ' + (score.priorLabel || 'none') + ' ' + (score.priorStrength === '' ? '—' : Number(score.priorStrength).toFixed(1) + '/10'),
    'Change: ' + (score.scoreChange === null ? 'new reading' : (score.scoreChange >= 0 ? '+' : '') + score.scoreChange.toFixed(1)),
    'Confidence: ' + score.confidence + '%',
    'Age: ' + (Number(score.regimeAgeTradingDays || 0)>0?score.regimeAgeTradingDays+' trading days':'unavailable'),
    '',movement
  ];
  if ((score.primaryDrivers || []).length) {
    lines.push('Primary Drivers:');
    score.primaryDrivers.slice(0,3).forEach(d=>lines.push('- '+hxDriverChangeLabel_(d)));
  }
  return hxDeliver_(lines.join('\n'), 'Major Change', score.instrument);
}

function hxDeliver_(message, alertType, instrument) {
  const props = hxProps_();
  const results = [];
  const telegramToken = props.getProperty('TELEGRAM_BOT_TOKEN');
  const telegramChat = props.getProperty('TELEGRAM_CHAT_ID');
  if (telegramToken && telegramChat) {
    try { hxSendTelegram_(message); results.push('Telegram: sent'); }
    catch (e) { results.push('Telegram: failed — ' + e.message); }
  }
  const pushoverToken = props.getProperty('PUSHOVER_APP_TOKEN');
  const pushoverUser = props.getProperty('PUSHOVER_USER_KEY');
  if (pushoverToken && pushoverUser) {
    try { hxSendPushover_(message); results.push('Pushover: sent'); }
    catch (e) { results.push('Pushover: failed — ' + e.message); }
  }
  const email = props.getProperty('ALERT_EMAIL');
  if (!results.length && email) {
    try { hxSendEmail_(message,alertType); results.push('Email: sent'); }
    catch (e) { results.push('Email: failed — ' + e.message); }
  }
  if (!results.length) results.push('Logged only: no push channel configured');
  const log = hxSheet_(HX.sheets.notifications, ['Timestamp','Instrument','Machine Reading','Conviction','Alert Type','Message','Delivery Status','Notes']);
  hxAppendRows_(log, [[new Date(),instrument,'', '',alertType,message,results.join(' | '),'Harmonexus v' + HX.version]]);
  return results;
}

function hxSendTelegram_(message) {
  const props=hxProps_(), token=props.getProperty('TELEGRAM_BOT_TOKEN'), chatId=props.getProperty('TELEGRAM_CHAT_ID');
  if (!token || !chatId) throw new Error('TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are required.');
  return hxFetch_('https://api.telegram.org/bot' + token + '/sendMessage', {method:'post',contentType:'application/json',payload:JSON.stringify(hxTelegramPayload_(chatId,message))},2);
}

function hxTelegramPayload_(chatId,message) { return {chat_id:String(chatId),text:String(message),disable_web_page_preview:true}; }

function hxSendPushover_(message) {
  const props=hxProps_(), token=props.getProperty('PUSHOVER_APP_TOKEN'), user=props.getProperty('PUSHOVER_USER_KEY');
  if (!token || !user) throw new Error('PUSHOVER_APP_TOKEN and PUSHOVER_USER_KEY are required.');
  return hxFetch_('https://api.pushover.net/1/messages.json', {method:'post',payload:hxPushoverPayload_(token,user,message)},2);
}

function hxPushoverPayload_(token,user,message) { return {token:String(token),user:String(user),title:'Harmonexus',message:String(message)}; }

function hxSendEmail_(message,alertType) {
  const email=hxProps_().getProperty('ALERT_EMAIL');
  if (!email) throw new Error('ALERT_EMAIL is required.');
  MailApp.sendEmail(email,'Harmonexus · ' + (alertType || 'Test'),String(message));
}

function testTelegramNotification() {
  const scores = hxLatestScoreRows_();
  if (!scores.length) throw new Error('No Instrument_Scores rows are available for the Telegram briefing test.');
  hxSendTelegram_('HARMONEXUS PRODUCTION FORMAT TEST\n\n' + hxBuildDailyBriefing_(scores));
  return 'Telegram daily-format test sent.';
}
function testPushoverNotification() { hxSendPushover_('Harmonexus Pushover test · ' + hxNowIso_()); return 'Pushover test sent.'; }
function testEmailNotification() { hxSendEmail_('Harmonexus email test · ' + hxNowIso_(),'Email Test'); return 'Email test sent.'; }

function testNotificationConfiguration() {
  const p=hxProps_();
  return {
    telegram:Boolean(p.getProperty('TELEGRAM_BOT_TOKEN') && p.getProperty('TELEGRAM_CHAT_ID')),
    pushover:Boolean(p.getProperty('PUSHOVER_APP_TOKEN') && p.getProperty('PUSHOVER_USER_KEY')),
    email:Boolean(p.getProperty('ALERT_EMAIL')),
    ai:Boolean(p.getProperty('OPENAI_API_KEY')),
    webhook:Boolean(p.getProperty('WEBHOOK_SECRET'))
  };
}

function hxLatestScoreRows_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(HX.sheets.scores);
  return sh ? hxRowsAsObjects_(sh) : [];
}

/* Final CIO morning-brief formatter. Declared after the rollback-safe formatter so V8 uses this version. */
function hxBuildDailyBriefing_(rows) {
  const scores=(rows || []).map(r=>({row:r,instrument:String(r.Instrument),direction:String(r.Direction || 'Neutral'),
    strength:Number(r.Strength || 1),confidence:Number(r.Confidence || 0),score:Number(r['Directional Score'] || 0),
    reliability:String(r.Reliability || ''),drivers:safeJsonCell_(r['Strongest Drivers'],[]),contradictions:safeJsonCell_(r.Contradictions,[]),
    change:r['Score Change']===''||r['Score Change']===null?null:Number(r['Score Change']),material:String(r['Material Change']).toLowerCase()==='true',
    regime:String(r.Regime || r.Direction || 'Neutral'),regimeAge:Number(r['Regime Age (Trading Days)'] || 0),
    primaryDrivers:safeJsonCell_(r['Primary Drivers'],[]),seasonalWatch:safeJsonCell_(r['Seasonal Watch'],null)}));
  const macro=hxCrossAssetBriefingContext_(scores);
  const relationshipIntel=typeof hxRelationshipIntelligence_==='function'?hxRelationshipIntelligence_(scores):null;
  const equities=scores.filter(s=>String(s.row.Family).toLowerCase().indexOf('equity')>=0);
  const riskAverage=(equities.length?equities:scores).reduce((n,s)=>n+s.score,0)/(equities.length||scores.length||1);
  const dispersion=scores.some(s=>s.score>1.5) && scores.some(s=>s.score<-1.5);
  const regime=dispersion?'fragmented':riskAverage>1.5?'risk-on':riskAverage<-1.5?'risk-off':'neutral';
  const regimeConfidence=Math.round(scores.reduce((n,s)=>n+s.confidence,0)/(scores.length||1));
  const factorMap={};
  scores.forEach(s=>s.drivers.forEach(d=>{const key=String(d.factor || 'Evidence'); factorMap[key]=(factorMap[key]||0)+Number(d.contribution||0);}));
  const factors=Object.keys(factorMap).sort((a,b)=>Math.abs(factorMap[b])-Math.abs(factorMap[a])).slice(0,3);
  const contradictions=[];
  scores.forEach(s=>s.contradictions.forEach(d=>{if(contradictions.length<2) contradictions.push(s.instrument+' faces opposing '+String(d.factor||'evidence').toLowerCase()+' ('+Number(d.contribution||0).toFixed(2)+').');}));
  const changed=scores.filter(s=>s.material).sort((a,b)=>Math.abs(b.change||0)-Math.abs(a.change||0));
  const priority=scores.slice().sort((a,b)=>(b.strength*b.confidence)-(a.strength*a.confidence)).slice(0,3);
  const lines=hxBriefingHeader_();
  lines.push('','MARKET REGIME:',regime+' - confidence '+regimeConfidence+'%');
  lines.push('','CROSS-ASSET CONSENSUS');
  macro.consensus.forEach(c=>lines.push(c.name+': '+c.label+' '+c.strength.toFixed(1)+'/10'));
  lines.push('','CONSENSUS STRENGTH',
    'Overall Agreement: '+macro.market.agreement+'%',
    'Institutional Alignment: '+macro.market.alignment,
    'Market Regime: '+macro.market.state,
    'Participation: '+macro.market.participation,
    'Contradiction Level: '+macro.market.contradictionLevel,
    'Confidence: '+macro.market.confidence+'%');
  lines.push('','PRIMARY MARKET DRIVER',
    'Dominant Driver: '+macro.driver.primary.name,
    'Contribution: '+macro.driver.primary.contribution+'%',
    'Secondary Driver: '+macro.driver.secondary.name,
    'Contribution: '+macro.driver.secondary.contribution+'%');
  if (macro.driver.supporting.length) {
    lines.push('Supporting Drivers:');
    macro.driver.supporting.forEach(d=>lines.push(d));
  }
  lines.push('Interpretation:',macro.driver.interpretation);
  lines.push('','CAPITAL ROTATION WATCH','Current Rotation:',macro.rotation.category,macro.rotation.momentum,macro.rotation.confidence+'%','Primary Destination:');
  macro.rotation.destination.forEach(x=>lines.push(x));
  lines.push('Primary Source:');
  macro.rotation.source.forEach(x=>lines.push(x));
  lines.push('Rotation Momentum:',macro.rotation.momentum,'Confidence:',macro.rotation.confidence+'%','Interpretation:',macro.rotation.interpretation);
  lines.push('','CONVICTION METER','Conviction: '+macro.conviction.label,'Score: '+macro.conviction.score+'%','Reason:',macro.conviction.reason);
  lines.push('','MACRO INTERPRETATION',macro.interpretation);
  lines.push('','KEY DRIVERS:');
  (factors.length?factors:['No dominant factor']).forEach(f=>lines.push('- '+(factorMap[f]===undefined?f:f+' is contributing '+(factorMap[f]>=0?'positive':'negative')+' cross-asset pressure.')));
  lines.push('','CONTRADICTIONS:');
  (contradictions.length?contradictions:['No material cross-asset contradiction in the available evidence.']).forEach(x=>lines.push('- '+x));
  lines.push('','MATERIAL CHANGE:');
  if (changed.length) changed.slice(0,3).forEach(s=>lines.push.apply(lines,hxMaterialChangeLines_(s)));
  else lines.push('No instrument crossed a material-change threshold since the prior reading.');
  lines.push('','PRIORITY INSTRUMENTS:');
  priority.forEach((s,i)=>{
    lines.push((i+1)+'. '+s.instrument+' - '+s.direction+' '+s.strength.toFixed(1)+'/10 - '+hxPriorityReason_(s));
    lines.push('   Age: '+(s.regimeAge>0?s.regimeAge+' trading days':'unavailable'));
  });
  const seasonal=scores.filter(s=>s.seasonalWatch && s.seasonalWatch.title).sort((a,b)=>
    (String(b.seasonalWatch.status)==='WATCH'?1:0)-(String(a.seasonalWatch.status)==='WATCH'?1:0)).slice(0,2);
  if (seasonal.length) {
    lines.push('','SEASONAL WATCH','');
    seasonal.forEach((s,i)=>{
      const watch=s.seasonalWatch;
      lines.push(String(watch.title));
      if (watch.detail) lines.push(String(watch.detail));
      lines.push('Status: '+String(watch.status || 'DEVELOPING')+(watch.limitedSample?' - limited sample':''));
      if (i<seasonal.length-1) lines.push('');
    });
  }
  if (relationshipIntel && typeof hxRelationshipBriefingLines_ === 'function') {
    hxRelationshipBriefingLines_(relationshipIntel).forEach(line=>lines.push(line));
  }
  lines.push('','WATCH CONDITIONS:','- A direction flip or a 1.5-point score change would alter the current regime read.','- Broader factor agreement with confidence above 75% would confirm the current read.','','Decision support only. No trade execution.');
  return lines.join('\n');
}

function hxBriefingHeader_() {
  const now=new Date();
  const format=(typeof Utilities !== 'undefined' && Utilities.formatDate) ? function(pattern){return Utilities.formatDate(now,'America/New_York',pattern);} : function(pattern){return pattern==='EEEE'?'Thursday':'07:00';};
  return ['HARMONEXUS',"Chief Investment Officer Robinson's",'Morning Market Brief',
    format('EEEE'),format('HH:mm')+' ET'];
}

function hxCrossAssetBriefingContext_(scores) {
  const components=[hxConsensusComponent_('Dollar',scores,hxDollarEvidence_),hxConsensusComponent_('Rates',scores,hxRatesEvidence_),hxConsensusComponent_('Metals',scores,hxMetalsEvidence_),hxConsensusComponent_('Equities',scores,hxEquitiesEvidence_)];
  const risk=hxRiskAppetiteComponent_(scores,components);
  components.push(risk);
  const directional=components.filter(c=>c.evidence);
  const bull=directional.filter(c=>c.value>0).length, bear=directional.filter(c=>c.value<0).length, neutral=directional.filter(c=>Math.abs(c.value)<=.08).length;
  const agreement=Math.round(100*Math.max(bull,bear,neutral)/(directional.length||1));
  const avgConfidence=Math.round(directional.reduce((n,c)=>n+c.confidence,0)/(directional.length||1));
  const contradictionCount=scores.reduce((n,s)=>n+(s.contradictions||[]).length,0);
  const participation=directional.length>=4&&agreement>=70?'Broad':directional.length>=3?'Moderate':'Narrow';
  const contradictionLevel=contradictionCount>=5||agreement<45?'High':contradictionCount>=2||agreement<65?'Moderate':'Low';
  const state=agreement<45||contradictionLevel==='High'?'Fragmented':agreement<60?'Rotational':avgConfidence<55?'Transitional':Math.abs(risk.value)<.12?'Range-Bound':'Trending';
  const alignment=agreement>=75&&avgConfidence>=65?'High':agreement>=55&&avgConfidence>=45?'Moderate':'Low';
  const driver=hxPrimaryMarketDriver_(scores);
  const rotation=hxCapitalRotation_(components,risk,avgConfidence,contradictionLevel);
  const convictionScore=hxClamp_(Math.round((agreement*.55)+(avgConfidence*.35)+(participation==='Broad'?10:participation==='Moderate'?4:0)-(contradictionLevel==='High'?22:contradictionLevel==='Moderate'?10:0)),0,100);
  const convictionLabel=convictionScore>=75?'Very High':convictionScore>=60?'High':convictionScore>=45?'Moderate':convictionScore>=25?'Low':'Very Low';
  return {consensus:components.map(c=>({name:c.name,label:c.name==='Risk Appetite'?hxRiskLabel_(c.strength):hxDirectionalLabel_(c.value,c.evidence),strength:c.strength})),
    market:{agreement:agreement,alignment:alignment,state:state,participation:participation,contradictionLevel:contradictionLevel,confidence:avgConfidence},
    driver:driver,rotation:rotation,conviction:{label:convictionLabel,score:convictionScore,reason:hxConvictionReason_(participation,contradictionLevel,avgConfidence)},
    interpretation:hxMacroInterpretation_(components,agreement,state,avgConfidence,contradictionLevel)};
}

function hxConsensusComponent_(name,scores,selector) {
  const evidence=[];
  scores.forEach(s=>selector(s).forEach(v=>evidence.push(v)));
  return hxWeightedComponent_(name,evidence);
}

function hxWeightedComponent_(name,evidence) {
  if (!evidence.length) return {name:name,value:0,strength:1,confidence:0,evidence:false};
  let weighted=0, weight=0, confidence=0;
  evidence.forEach(e=>{const w=Math.max(.05,Number(e.weight||1))*Math.max(20,Number(e.confidence||0))/100; weighted+=Number(e.value||0)*w; weight+=w; confidence+=Number(e.confidence||0)*w;});
  const value=weight?hxClamp_(weighted/weight,-1,1):0;
  return {name:name,value:value,strength:Math.round((Math.abs(value)*9+1)*10)/10,confidence:weight?Math.round(confidence/weight):0,evidence:true};
}

function hxScoreValue_(score) { return hxClamp_(Number(score.score || 0)/10,-1,1); }
function hxWeight_(score) { return Math.max(.2,Number(score.strength || 1)/10); }

function hxDollarEvidence_(s) {
  const id=s.instrument.toUpperCase(), v=hxScoreValue_(s), w=hxWeight_(s);
  if (id==='DXY') return [{value:v,confidence:s.confidence,weight:w*1.35}];
  if (['USDJPY','USDDKK'].indexOf(id)>=0) return [{value:v,confidence:s.confidence,weight:w}];
  if (['EURUSD','GBPUSD'].indexOf(id)>=0) return [{value:-v,confidence:s.confidence,weight:w}];
  return [];
}

function hxRatesEvidence_(s) {
  const id=s.instrument.toUpperCase(), v=hxScoreValue_(s), w=hxWeight_(s);
  if (['US2Y','US5Y','US10Y','US30Y'].indexOf(id)>=0) return [{value:v,confidence:s.confidence,weight:w*1.25}];
  const out=[];
  (s.drivers||[]).forEach(d=>{const f=String(d.factor||'').toUpperCase(); if(['REAL10Y','US2Y','US5Y','US10Y','US30Y','FED'].indexOf(f)>=0) out.push({value:hxClamp_(Number(d.contribution||0)*2,-1,1),confidence:Number(d.confidence||s.confidence||0),weight:Math.abs(Number(d.contribution||0))+.15});});
  return out;
}

function hxMetalsEvidence_(s) { return ['XAGUSD','GOLD','COPPER','PLATINUM'].indexOf(s.instrument.toUpperCase())>=0 ? [{value:hxScoreValue_(s),confidence:s.confidence,weight:hxWeight_(s)}] : []; }
function hxEquitiesEvidence_(s) { return ['US30','SPX500','NAS100','RUSSELL2000'].indexOf(s.instrument.toUpperCase())>=0 ? [{value:hxScoreValue_(s),confidence:s.confidence,weight:hxWeight_(s)}] : []; }

function hxRiskAppetiteComponent_(scores,components) {
  const evidence=[];
  const equities=components.filter(c=>c.name==='Equities')[0]; if (equities&&equities.evidence) evidence.push({value:equities.value,confidence:equities.confidence,weight:1.35});
  const dollar=components.filter(c=>c.name==='Dollar')[0]; if (dollar&&dollar.evidence) evidence.push({value:-dollar.value,confidence:dollar.confidence,weight:1.05});
  const rates=components.filter(c=>c.name==='Rates')[0]; if (rates&&rates.evidence) evidence.push({value:-rates.value,confidence:rates.confidence,weight:.8});
  scores.forEach(s=>{if(s.instrument.toUpperCase()==='COPPER') evidence.push({value:hxScoreValue_(s),confidence:s.confidence,weight:.7}); (s.drivers||[]).forEach(d=>{if(String(d.factor||'').toUpperCase()==='RISK') evidence.push({value:hxClamp_(Number(d.contribution||0)*2,-1,1),confidence:Number(d.confidence||s.confidence||0),weight:.6});});});
  const risk=hxWeightedComponent_('Risk Appetite',evidence);
  risk.strength=Math.round(((risk.value+1)*5)*10)/10;
  return risk;
}

function hxDirectionalLabel_(value,evidence) { if (!evidence) return 'Insufficient Evidence'; return value>.12?'Bullish':value<-.12?'Bearish':'Neutral'; }
function hxRiskLabel_(strength) { return strength<2.5?'Extreme Risk-Off':strength<4.5?'Risk-Off':strength<5.5?'Neutral':strength<7.5?'Risk-On':'Strong Risk-On'; }

function hxPrimaryMarketDriver_(scores) {
  const buckets={};
  scores.forEach(s=>(s.drivers||[]).forEach(d=>{const bucket=hxDriverBucket_(String(d.factor||'Evidence')); buckets[bucket]=(buckets[bucket]||0)+Math.abs(Number(d.contribution||0))*Math.max(20,Number(d.confidence||s.confidence||0))/100;}));
  const keys=Object.keys(buckets).sort((a,b)=>buckets[b]-buckets[a]), total=keys.reduce((n,k)=>n+buckets[k],0)||1;
  const primary=keys[0]||'Evidence Stack', secondary=keys[1]||'No Secondary Driver';
  return {primary:{name:primary,contribution:Math.round(100*(buckets[primary]||0)/total)},secondary:{name:secondary,contribution:Math.round(100*(buckets[secondary]||0)/total)},supporting:keys.slice(2,5),interpretation:hxDriverInterpretation_(primary,secondary)};
}

function hxDriverBucket_(factor) {
  const f=factor.toUpperCase();
  if (f==='DXY') return 'US Dollar';
  if (['REAL10Y','US2Y','US5Y','US10Y','US30Y'].indexOf(f)>=0) return f==='REAL10Y'?'Real Yields':'Rates';
  if (f==='TREND') return 'Trend';
  if (['POSITIONING','COMMERCIAL','OI'].indexOf(f)>=0) return 'Positioning';
  if (['SEASONALITY','SEASONAL'].indexOf(f)>=0) return 'Seasonality';
  if (f==='RISK') return 'Risk Sentiment';
  if (['FED','INFLATION'].indexOf(f)>=0) return 'Macro';
  return factor.replace(/_/g,' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
}

function hxDriverInterpretation_(primary,secondary) {
  if (primary==='Evidence Stack') return 'Available evidence is not concentrated enough to identify a single dominant macro force.';
  return primary+' is the primary force shaping the current cross-asset briefing, with '+secondary+' acting as the secondary influence. This is analytical context, not a trade instruction.';
}

function hxCapitalRotation_(components,risk,confidence,contradictionLevel) {
  const sorted=components.filter(c=>c.name!=='Risk Appetite'&&c.evidence).sort((a,b)=>Math.abs(b.value)-Math.abs(a.value));
  if (!sorted.length || contradictionLevel==='High') return {category:'No Clear Rotation',momentum:'No Clear Momentum',confidence:Math.max(20,confidence-25),destination:['No dominant destination'],source:['No dominant source'],interpretation:'Cross-asset evidence is too mixed to identify a durable capital-rotation pattern.'};
  const destinations=[], sources=[];
  sorted.forEach(c=>{if(c.value>.12) destinations.push(hxRotationAssetName_(c.name,true)); if(c.value<-.12) sources.push(hxRotationAssetName_(c.name,false));});
  const riskLabel=hxRiskLabel_(risk.strength);
  const category=riskLabel.indexOf('Risk-Off')>=0?'Risk-Off Rotation':riskLabel.indexOf('Risk-On')>=0?'Risk-On Rotation':destinations.indexOf('US Dollar')>=0?'Dollar Rotation':destinations.indexOf('Treasuries')>=0?'Rates Rotation':'No Clear Rotation';
  const momentum=confidence>=75?'Strengthening':confidence>=60?'Developing':confidence>=45?'Emerging':'No Clear Momentum';
  const conf=hxClamp_(Math.round(confidence-(contradictionLevel==='Moderate'?10:0)),0,100);
  return {category:category,momentum:momentum,confidence:conf,destination:(destinations.length?destinations:['No dominant destination']).slice(0,3),source:(sources.length?sources:['No dominant source']).slice(0,3),interpretation:hxRotationInterpretation_(category,momentum,destinations,sources)};
}

function hxRotationAssetName_(name,positive) {
  if (name==='Dollar') return positive?'US Dollar':'US Dollar pressure fading';
  if (name==='Rates') return positive?'Treasuries / rates pressure':'Rate pressure easing';
  return name;
}

function hxRotationInterpretation_(category,momentum,destination,source) {
  if (category==='No Clear Rotation') return 'Rotation evidence remains mixed, so the briefing should be treated as context rather than a confirmed macro allocation map.';
  return 'Capital appears to be rotating toward '+(destination[0]||'the strongest evidence group')+' and away from '+(source[0]||'weaker evidence groups')+'. Rotation momentum is '+momentum.toLowerCase()+'.';
}

function hxConvictionReason_(participation,contradictionLevel,confidence) {
  if (contradictionLevel==='High') return 'Major contradictions are active, so briefing conviction is intentionally reduced despite available signals.';
  if (participation==='Broad'&&confidence>=70) return 'Broad agreement exists across the major asset groups and no dominant contradiction currently controls the briefing.';
  if (participation==='Moderate') return 'Several asset groups agree, but confirmation is not broad enough to treat the macro environment as fully aligned.';
  return 'Evidence is narrow or uneven, so the briefing should be read as provisional decision-support context.';
}

function hxMacroInterpretation_(components,agreement,state,confidence,contradictionLevel) {
  const active=components.filter(c=>c.name!=='Risk Appetite'&&c.evidence).map(c=>c.name.toLowerCase()).join(', ');
  const base=(active?active:'available cross-assets')+' are displaying '+(agreement>=70?'broad':'mixed')+' agreement.';
  const regime='Macro conditions currently look '+state.toLowerCase()+' with '+confidence+'% derived confidence.';
  const caveat=contradictionLevel==='High'?'Active contradictions remain important and reduce conviction.':'Monitored contradictions remain part of the read, but none currently dominate the overview.';
  return base+' '+regime+' '+caveat;
}

function generateBriefingLog() { return sendDailyBriefing(); }
function sendBriefingEmail() { return sendDailyBriefing(); }
