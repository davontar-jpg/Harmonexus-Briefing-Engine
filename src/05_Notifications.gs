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

function generateBriefingLog() { return sendDailyBriefing(); }
function sendBriefingEmail() { return sendDailyBriefing(); }
