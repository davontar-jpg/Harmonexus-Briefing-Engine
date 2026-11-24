/** Read the existing workbook; render exact repository formatters in a VM with no send capability. */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';

const [sheetId, out, previous] = process.argv.slice(2);
if (!/^[A-Za-z0-9_-]{30,100}$/.test(sheetId || '') || !out || !/^[a-f\d]{40}$/.test(previous || ''))
  throw new Error('Pass the verified workbook ID, a private output directory, and the exact previous source commit.');
const dest=path.resolve(out), relative=path.relative(process.cwd(),dest);
if (!relative.startsWith('..'+path.sep) && relative!=='..') throw new Error('Preview output must stay outside this Git checkout.');

async function liveSnapshot() {
  const cache=JSON.parse(await fs.readFile(path.join(os.homedir(),'.clasprc.json'),'utf8'));
  const a=cache.tokens?.default || cache;
  const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',
    body:new URLSearchParams({client_id:a.client_id || '',client_secret:a.client_secret || '',refresh_token:a.refresh_token || '',grant_type:'refresh_token'})});
  const token=await response.json();
  if (!response.ok || !token.access_token) throw new Error('Existing Google authorization failed (HTTP '+response.status+').');
  const ranges=['Instrument_Scores!A1:V20','HEL_035_Runtime!A1:G30','Structure!A1:Z30','FRED_Raw!A1:I1','FRED_Raw!A716:I754','Score_History!A1:I5001'];
  const q=new URLSearchParams({valueRenderOption:'UNFORMATTED_VALUE'});
  ranges.forEach(x=>q.append('ranges',x));
  const fetched=await fetch('https://sheets.googleapis.com/v4/spreadsheets/'+sheetId+'/values:batchGet?'+q,
    {headers:{authorization:'Bearer '+token.access_token}});
  if (!fetched.ok) throw new Error('Existing Sheets authorization/read failed (HTTP '+fetched.status+').');
  const {valueRanges}=await fetched.json();
  if (valueRanges?.length!==ranges.length || !valueRanges[0].values || valueRanges[0].values.length!==20)
    throw new Error('Expected 19 actual published score rows and complete batch inventory.');
  const v=valueRanges.map(x=>x.values || []);
  return {Instrument_Scores:v[0],HEL_035_Runtime:v[1],Structure:v[2],FRED_Raw:[...v[3],...v[4]],Score_History:v[5]};
}

const now=new Date();
class PreviewDate extends Date {constructor(...args) { super(...(args.length?args:[now.getTime()])); } static now(){return now.getTime();} }
function fields(value, tz) {
  return Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',weekday:'long',
    hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(value).map(x=>[x.type,x.value]));
}
function formatDate(value, tz, template) {
  const d=fields(value,tz), mon=new Intl.DateTimeFormat('en-US',{timeZone:tz,month:'long'}).format(value);
  const replacements={yyyy:d.year,MMMM:mon,MMM:mon.slice(0,3),MM:d.month,dd:d.day,d:String(Number(d.day)),HH:d.hour,
    hh:String((Number(d.hour)%12 || 12)).padStart(2,'0'),h:String(Number(d.hour)%12 || 12),mm:d.minute,
    a:Number(d.hour)<12?'AM':'PM',EEEE:d.weekday,EEE:d.weekday.slice(0,3)};
  return template.replace(/yyyy|MMMM|MMM|MM|dd|EEEE|EEE|HH|hh|mm|[dha]/g,x=>replacements[x]);
}
function serialTime(serial) {
  const wall=Math.round((serial-25569)*86400000);
  let epoch=wall;
  for(let i=0;i<3;i++) {
    const x=fields(new Date(epoch),'America/Los_Angeles');
    const local=Date.UTC(+x.year,+x.month-1,+x.day,+x.hour,+x.minute,+x.second);
    epoch=wall-(local-Math.floor(epoch/1000)*1000);
  }
  return new PreviewDate(epoch);
}

const input=await liveSnapshot();
for (const [name, rows] of Object.entries(input)) {
  const headers=rows[0] || [];
  if (name==='FRED_Raw') rows.slice(1).forEach(r=>{if(typeof r[0]==='number') r[0]=new Date((r[0]-25569)*86400000).toISOString().slice(0,10);});
  else rows.slice(1).forEach(r=>headers.forEach((h,i)=>{if(['As Of','Timestamp','Last Updated'].includes(h) && typeof r[i]==='number') r[i]=serialTime(r[i]);}));
  rows.slice(1).forEach(r=>{ for(let i=0;i<headers.length;i++) if(r[i]===undefined) r[i]=''; });
}
const lookup = name=>{
  const rows=input[name];
  return rows ? {getLastRow:()=>rows.length,getLastColumn:()=>rows[0]?.length || 0,getDataRange:()=>({getValues:()=>rows}),
    getRange:(start,col,n,width)=>({getValues:()=>rows.slice(start-1,start-1+n).map(r=>r.slice(col-1,col-1+width))})} : null;
};
async function context(commit) {
  const c=vm.createContext({Date:PreviewDate,Utilities:{formatDate},console:{log(){}},
    SpreadsheetApp:{getActive:()=>({getSheetByName:lookup})},
    PropertiesService:{getScriptProperties:()=>({getProperty:k=>k==='HEL_035_RUNTIME_ENABLED'?'true':null})}});
  const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:12*1024*1024});
  const paths=commit ? git('ls-tree','-r','--name-only',commit,'src').split(/\r?\n/) : (await fs.readdir('src')).map(f=>'src/'+f);
  for(const filename of paths.filter(f=>/\.gs$/.test(f)).sort())
    vm.runInContext(commit?git('show',commit+':'+filename):await fs.readFile(filename,'utf8'),c,{filename});
  c.hxNotificationLogEvent_=()=>{};
  c.hxCacheRelationshipIntelligence_=()=>{};
  return c;
}
const historical=await context(previous), ctx=await context();
const old=historical.hxMorningMarketBriefingMessages_({});
const fresh=ctx.hxMorningMarketBriefingMessages_({});
if (!ctx.hxExecutiveEditionValid_(fresh.telegramEditions) || fresh.formatter!=='Executive Briefing V2' || !fresh.runtime_id.startsWith('HEL-035:'))
  throw new Error('Current source or rendering rejected. No preview written.');
const suppressed=ctx.sendProductionBriefingNotification({briefingText:fresh.emailMessage,emailMessage:fresh.emailMessage,
  telegramMessage:fresh.telegramMessage,telegramEditions:fresh.telegramEditions,dryRun:true,validationMode:true,suppressStateMutation:true,returnDetailed:true});
if(suppressed[0]?.provider!=='DeliverySuppressed') throw new Error('Preview delivery gate failed.');

const artifacts={'telegram-edition-i.txt':fresh.telegramEditions[0],'telegram-edition-ii.txt':fresh.telegramEditions[1],
  'email.txt':fresh.emailMessage,'email.html':ctx.hxEmailHtml_(fresh.emailMessage),
  'before-telegram.txt':old.telegramMessage,'before-email.txt':old.emailMessage};
const metrics={renderedAt:now.toISOString(),runtime:fresh.runtime_id,telegramI:artifacts['telegram-edition-i.txt'].length,
  telegramII:artifacts['telegram-edition-ii.txt'].length,email:fresh.emailMessage.length,
  previousTelegram:old.telegramMessage.length,previousEmail:old.emailMessage.length,delivery:'blocked; preview only'};
const sections=body=>body.split('\n').filter(x=>/^[A-Z][A-Z ’/:—&-.]{6,}$/.test(x.trim())).map(x=>x.trim()).join(' → ');
artifacts['before-after.md']='# Executive Briefing V2 · actual workbook preview\n\n'+Object.entries(metrics).map(([k,v])=>'- '+k+': '+v).join('\n')+
  '\n\n## Section order\n\n- Before Telegram: '+sections(old.telegramMessage)+'\n- Edition I: '+sections(fresh.telegramEditions[0])+
  '\n- Edition II: '+sections(fresh.telegramEditions[1])+'\n- Before email: '+sections(old.emailMessage)+'\n- Refined email: '+sections(fresh.emailMessage)+'\n';
await fs.mkdir(dest,{recursive:true});
await Promise.all(Object.entries(artifacts).map(([name,body])=>fs.writeFile(path.join(dest,name),body+'\n',{encoding:'utf8'})));
console.log(JSON.stringify(metrics));
