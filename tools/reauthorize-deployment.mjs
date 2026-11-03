// Existing desktop client only; no credential values or callback codes are logged.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
const tokenPath=path.join(os.homedir(),'.clasprc.json');
const store=JSON.parse(fs.readFileSync(tokenPath,'utf8'));
const prior=store.tokens?.default;
const client=JSON.parse(fs.readFileSync(path.join(os.homedir(),'.config','harmonexus','clasp-oauth-client.json'),'utf8')).installed;
if (!prior?.scope || prior.client_id!==client.client_id) throw Error('Existing client and granted scopes must match.');
const state=crypto.randomBytes(24).toString('hex');
const verifier=crypto.randomBytes(48).toString('base64url');
const challenge=crypto.createHash('sha256').update(verifier).digest('base64url');
const server=http.createServer(async(req,res)=>{
  const u=new URL(req.url,redirect);
  if(u.searchParams.get('state')!==state){res.writeHead(400);res.end('Invalid authorization state.');return;}
  if(!u.searchParams.get('code')){res.writeHead(400);res.end('Authorization not completed.');return;}
  try {
    const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:client.client_id,client_secret:client.client_secret,code:u.searchParams.get('code'),redirect_uri:redirect,grant_type:'authorization_code',code_verifier:verifier})});
    const t=await r.json();
    if(!r.ok || !t.refresh_token) throw Error('Token exchange failed.');
    const expected=new Set(prior.scope.split(' '));
    const granted=(t.scope||'').split(' ');
    if(granted.some(s=>!expected.has(s)) || [...expected].some(s=>!granted.includes(s))) throw Error('Granted scope set changed; token not installed.');
    store.tokens.default={...prior,...t,expiry_date:Date.now()+t.expires_in*1000};
    fs.writeFileSync(tokenPath,JSON.stringify(store,null,2),{mode:0o600});
    res.writeHead(200,{'content-type':'text/plain'});res.end('Harmonexus authorization restored. You may close this tab.');
    console.log(JSON.stringify({authorized:true,scopeCount:granted.length,existingClientPreserved:true}));
    server.close();
  }catch(e){res.writeHead(500);res.end('Authorization exchange failed.');console.error(e.message);server.close();process.exitCode=1;}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const redirect='http://localhost:'+server.address().port;
const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');
url.search=new URLSearchParams({client_id:client.client_id,redirect_uri:redirect,response_type:'code',scope:prior.scope,access_type:'offline',prompt:'consent',state,code_challenge:challenge,code_challenge_method:'S256'});
console.log('AUTHORIZATION_URL='+url.href);
setTimeout(()=>{console.error('Authorization timed out; no credential change.');server.close();},15*60*1000).unref();
