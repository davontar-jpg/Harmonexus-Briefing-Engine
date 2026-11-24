/** Two ordered editions, one persisted daily payload, no replays after ambiguous sends. */
function hxExecutiveEditionValid_(editions) {
  return Array.isArray(editions) && editions.length===2 && editions.every((text,i)=>typeof text==='string' &&
    text.length>0 && text.length<=3800 && text.includes(i===0?'EDITION I OF II':'EDITION II OF II'));
}

function hxExecutiveDailyPayload_(opts, email, editions) {
  const key='HX_EXEC_V2_'+opts.dailyKey+'_';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(opts.dailyKey || '')) throw new Error('Missing Executive Briefing ET daily key.');
  const props=hxProps_(), count=Number(props.getProperty(key+'count') || 0);
  if (count) {
    if (!(count>0 && count<=32)) throw new Error('Invalid frozen Executive Briefing inventory.');
    let raw='';
    for(let i=0;i<count;i++) {
      const part=props.getProperty(key+i);
      if (typeof part!=='string' || !part) throw new Error('Frozen Executive Briefing incomplete; replay blocked.');
      raw+=part;
    }
    const payload=JSON.parse(raw);
    if (!hxExecutiveEditionValid_(payload.editions) || typeof payload.email!=='string') throw new Error('Invalid frozen Executive Briefing; replay blocked.');
    return payload;
  }
  const payload={email:email,editions:editions,runtime:opts.runtimeId || ''};
  const raw=JSON.stringify(payload), propsUpdate={}; let i=0;
  // At most 7,200 UTF-8 bytes per value (below the Apps Script 9 KB limit).
  for(let offset=0;offset<raw.length;) {
    let end=Math.min(offset+1800,raw.length);
    if (end<raw.length && /[\uD800-\uDBFF]/.test(raw[end-1])) end--;
    propsUpdate[key+(i++)]=raw.slice(offset,end); offset=end;
  }
  if (i>32) throw new Error('Frozen Executive Briefing exceeds safe storage budget.');
  // Commit marker last: if a write aborts, no provider attempt can follow.
  props.setProperties(propsUpdate);
  props.setProperty(key+'count',String(i));
  const cutoff=Date.parse(opts.dailyKey)-3*86400000;
  Object.keys(props.getProperties()).filter(k=>/^HX_EXEC_V2_\d{4}-\d{2}-\d{2}_/.test(k)).forEach(k=>{
    if (Date.parse(k.slice(11,21)) < cutoff) props.deleteProperty(k);
  });
  const oldFinal=Date.parse(opts.dailyKey)-35*86400000;
  Object.keys(props.getProperties()).filter(k=>/^HX_DELIVERY_\d{4}-\d{2}-\d{2}_.+_V2_[12]$/.test(k)).forEach(k=>{
    if (Date.parse(k.slice(12,22)) < oldFinal && props.getProperty(k.slice(0,-5))==='SENT') props.deleteProperty(k);
  });
  return payload;
}

function hxExecutiveSendTelegram_(message, recipient) {
  const token=hxProps_().getProperty('TELEGRAM_BOT_TOKEN');
  if (!token) return {status:'rejected',reason:'Telegram is not configured.'};
  try {
    const response=UrlFetchApp.fetch('https://api.telegram.org/bot'+token+'/sendMessage',{
      method:'post',contentType:'application/json',payload:JSON.stringify(hxTelegramPayload_(recipient,message)),
      muteHttpExceptions:true,followRedirects:false});
    const status=response.getResponseCode(), body=JSON.parse(response.getContentText());
    if (status===200 && body.ok===true && Number.isInteger(body.result && body.result.message_id)) return {status:'accepted',id:body.result.message_id};
    if ([400,401,403,429].indexOf(status)>=0 && body.ok===false && body.error_code===status)
      return {status:'rejected',reason:'Telegram explicitly rejected the request (HTTP '+status+').'};
  } catch (error) { /* Do not log transport exceptions containing provider credentials. */ }
  return {status:'ambiguous',reason:'Telegram acceptance unconfirmed; replay blocked.'};
}

function hxExecutiveTelegramDelivery_(chat, opts, editions, transport) {
  const props=hxProps_(), digest=Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,'Telegram|'+chat));
  const root='HX_DELIVERY_'+opts.dailyKey+'_'+digest, old=props.getProperty(root), claim='V2_OWNED';
  const results=[];
  const outcome=(edition,ok,state,error,id)=>({provider:'Telegram',recipient:chat,edition,ok,outcome:state,
    status:'Telegram '+(edition===1?'I':'II')+': '+state,error:error || '',messageId:id || null});
  if (old==='SENT' || (old && old!==claim)) return [1,2].map(i=>{
    const edition=props.getProperty(root+'_V2_'+i);
    const accepted=old==='SENT' && edition && edition.indexOf('ACCEPTED:')===0;
    return outcome(i,old==='SENT',accepted?'already delivered':old==='SENT'?'already delivered (legacy daily briefing)':'audit required',
      old==='SENT'?'':'Prior delivery lacks a safe retry state.',accepted?Number(edition.slice(9)):null);
  });
  // Old code sees the claim as in-flight even after rollback, so it cannot double-send a partial V2 briefing.
  if (!old) props.setProperty(root,claim);
  for(let i=1;i<=2;i++) {
    const key=root+'_V2_'+i, prior=props.getProperty(key);
    if (prior && prior.indexOf('ACCEPTED:')===0) { results.push(outcome(i,true,'already delivered','',Number(prior.slice(9)))); continue; }
    if (prior && prior!=='REJECTED') { results.push(outcome(i,false,'audit required','Ambiguous prior attempt; replay blocked.')); break; }
    props.setProperty(key,'IN_FLIGHT');
    hxNotificationLogEvent_('INFO','Telegram edition attempted',{edition:i,dailyKey:opts.dailyKey});
    const result=transport(editions[i-1],chat);
    if (result.status==='accepted') {
      props.setProperty(key,'ACCEPTED:'+result.id);
      results.push(outcome(i,true,'accepted','',result.id));
    } else {
      if (result.status==='rejected') props.setProperty(key,'REJECTED');
      results.push(outcome(i,false,result.status,result.reason));
    }
    hxNotificationLogEvent_(result.status==='accepted'?'INFO':'WARN','Telegram edition outcome',{edition:i,dailyKey:opts.dailyKey,result:result.status});
    if (result.status!=='accepted') break;
  }
  if (results.length===1) results.push(outcome(2,false,'not attempted','Edition I must be accepted first.'));
  if (results.every(r=>r.ok)) props.setProperty(root,'SENT');
  return results;
}
