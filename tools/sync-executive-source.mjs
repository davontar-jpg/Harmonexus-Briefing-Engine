/** Guarded source-only release via the existing Apps Script project and OAuth profile. */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const [mode, before, after]=process.argv.slice(2);
const id=process.env.HARMONEXUS_SCRIPT_ID, workbook=process.env.HARMONEXUS_WORKBOOK_ID;
if (!['preflight','sync','verify','dry-run','publish-runtime'].includes(mode) || !id || !workbook ||
    ![before,after].every(x=>/^[a-f\d]{40}$/.test(x || '')))
  throw new Error('Pass a valid mode, expected/candidate commit SHAs, and the verified project and workbook identifiers.');

const cli=JSON.parse(await fs.readFile(path.join(os.homedir(),'.clasprc.json'),'utf8'));
const creds=cli.tokens?.default || cli;
const grant=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({
  client_id:creds.client_id || '',client_secret:creds.client_secret || '',refresh_token:creds.refresh_token || '',grant_type:'refresh_token'})});
const token=await grant.json();
if (!grant.ok || !token.access_token) throw new Error('Existing Google authorization rejected (HTTP '+grant.status+').');
const api='https://script.googleapis.com/v1/', headers={authorization:'Bearer '+token.access_token};
async function request(endpoint, method='GET', body) {
  const r=await fetch(api+endpoint,{method,headers:body?{...headers,'content-type':'application/json'}:headers,
    body:body?JSON.stringify(body):undefined});
  if(!r.ok) {
    let hint='';
    if(method==='PUT' && r.status===400) {
      const failure=await r.json().catch(()=>({}));
      const msg=String(failure.error?.message || '');
      // Emit only expected compiler grammar; suppress arbitrary response/source content.
      hint=msg.match(/(?:SyntaxError|Syntax error|Invalid file)[^\r\n]{0,180}(?=\r?\n|$)/)?.[0] ||
        msg.match(/(?:Unexpected token|Unexpected identifier|Invalid or unexpected token)[^\r\n]{0,120}(?=\r?\n|$)/)?.[0] || '';
      hint=hint.replace(/[A-Za-z0-9_-]{35,}/g,'[redacted]');
    }
    throw new Error('Apps Script '+method+' failed (HTTP '+r.status+').'+(hint?' '+hint:''));
  }
  return r.json();
}
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:12*1024*1024});
const normalize=s=>String(s || '').replace(/\r\n/g,'\n').trimEnd();
function from(commit) {
  const all=git('ls-tree','-r','--name-only',commit,'appsscript.json','src').split(/\r?\n/)
    .filter(x=>x==='appsscript.json'|| /^src\/[^/]+\.gs$/.test(x));
  return all.map(filename=>({name:path.basename(filename,path.extname(filename)),type:filename==='appsscript.json'?'JSON':'SERVER_JS',
    source:git('show',commit+':'+filename)}));
}
function difference(actual, desired) {
  const map=new Map(actual.map(f=>[f.name,f]));
  const drift=desired.filter(f=>!map.has(f.name)||f.type!==map.get(f.name).type||normalize(f.source)!==normalize(map.get(f.name).source)).map(f=>f.name);
  const allowed=new Set(desired.map(f=>f.name));
  return drift.concat(actual.filter(f=>!allowed.has(f.name)).map(f=>f.name)).sort();
}
const legacy=from(before), next=from(after), changes=difference(legacy,next);
const permitted=new Set(['05_Notifications','11_MarketCalendarWatch','22_SilverProductionRuntime','24_IntelligenceRefinement',
  '25_ExecutiveArchive','26_ExecutiveBriefing','27_ExecutiveDelivery','28_OfficialCalendarCatalog','29_OperationalHealth','30_AuctionCandles']);
if (!changes.length || changes.some(name=>!permitted.has(name))) throw new Error('Rejected non-executive Apps Script source change.');
const p='projects/'+encodeURIComponent(id), project=await request(p);
if (project.parentId!==workbook) throw new Error('Bound workbook mismatch; no source write permitted.');
const remote=(await request(p+'/content')).files || [];
const expected=['verify','dry-run','publish-runtime'].includes(mode)?next:legacy, drift=difference(remote,expected);
if (drift.length) throw new Error('Remote source mismatch: '+drift.join(', '));
if (mode==='sync') {
  await request(p+'/content','PUT',{files:next});
  const confirmed=(await request(p+'/content')).files || [];
  const diff=difference(confirmed,next);
  if (diff.length) throw new Error('Unexpected post-write source mismatch: '+diff.join(', '));
}
if(mode==='dry-run' || mode==='publish-runtime') {
  const deployments=(await request(p+'/deployments')).deployments || [];
  const executables=deployments.filter(x=>x.entryPoints?.some(e=>e.entryPointType==='EXECUTION_API'));
  if(executables.length!==1) throw new Error('No unique existing Apps Script API executable; no substitute functions run.');
  const execute=async(name)=>request('scripts/'+encodeURIComponent(executables[0].deploymentId)+':run','POST',{function:name,devMode:true});
  if(mode==='publish-runtime') {
    const response=await execute('refreshOperationalAuctionRuntime');
    const result=response.response?.result;
    if(response.error || typeof result?.runtime!=='string' || result.notificationDelivery!=='not invoked')
      throw Error('Operational runtime publication failed or was not authorized.');
    console.log(JSON.stringify(result));
  } else {
  const result=await execute('dryRunMorningMarketBriefingProductionPath');
  const message=result.response?.result;
  if(result.error || typeof message!=='string'|| !/^DRY RUN ACTIVE/.test(message) || !message.includes('Executive Briefing V2'))
    throw new Error('Production dry-run failed or did not exercise Executive Briefing V2.');
  const config=await execute('testNotificationConfiguration');
  console.log(JSON.stringify({dryRun:message,telegramConfigured:config.response?.result?.telegram===true,emailConfigured:config.response?.result?.email===true}));
  }
}
console.log(JSON.stringify({mode,boundWorkbook:true,sourceParity:true,files:mode==='preflight'?legacy.length:next.length,changes}));
