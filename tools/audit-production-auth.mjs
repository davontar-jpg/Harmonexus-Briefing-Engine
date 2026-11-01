/** Read-only OAuth/source inventory. Never logs credentials, properties or code bodies. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

const scriptId = process.env.HARMONEXUS_SCRIPT_ID;
if (!scriptId) throw new Error('Set HARMONEXUS_SCRIPT_ID to the verified bound project ID.');
try {
  const store = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.clasprc.json'),'utf8'));
  const a = store.tokens?.default || store;
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method:'POST', headers:{'content-type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({client_id:a.client_id || '',client_secret:a.client_secret || '',refresh_token:a.refresh_token || '',grant_type:'refresh_token'})
  });
  const token = await r.json();
  if (!r.ok) {
    console.log(JSON.stringify({authorized:false,httpStatus:r.status,error:token.error || 'TOKEN_REFRESH_FAILED'}));
    process.exitCode=1;
  } else {
    const response = await fetch(`https://script.googleapis.com/v1/projects/${encodeURIComponent(scriptId)}/content`, {headers:{authorization:`Bearer ${token.access_token}`}});
    const source = await response.json();
    console.log(JSON.stringify({authorized:true,sourceRead:response.status,files:(source.files || []).map(f=>({name:f.name,type:f.type,sha256:crypto.createHash('sha256').update(f.source || '').digest('hex')}))},null,2));
    if (!response.ok) process.exitCode=1;
  }
} catch (_) {
  console.error('Production authorization audit could not complete; no credential values logged.');
  process.exitCode=1;
}
