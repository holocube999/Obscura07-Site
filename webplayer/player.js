(() => {
'use strict';
const $=id=>document.getElementById(id);
const input=$('repo'), pat=$('pat'), pane=$('runner'), status=$('status'), build=$('build');
const MAX=3*1024*1024;
let token=null, controller=null, cycle=0, visibilityTimer=null;
const AUTH=$('private-auth'), vaultStatus=$('vault-status');
const DBNAME='obscura-github-credential-v1', STORE='encrypted';
const AUTO_KEY='device-key-v18',AUTO_RECORD='device-token-v18',OPT='obscura-v18-auto';
let launched=false;
const MAX_PAT_LEN=512;
let repoPrivacy='unknown', inspectSerial=0;
function openDB(){return new Promise((ok,fail)=>{const req=indexedDB.open(DBNAME,1);req.onupgradeneeded=()=>req.result.createObjectStore(STORE);req.onsuccess=()=>ok(req.result);req.onerror=()=>fail(req.error);});}
async function dbRead(){const db=await openDB();try{return await new Promise((ok,fail)=>{const t=db.transaction(STORE,'readonly');const r=t.objectStore(STORE).get('github');r.onsuccess=()=>ok(r.result||null);r.onerror=()=>fail(r.error);});}finally{db.close();}}
async function dbWrite(value){const db=await openDB();try{await new Promise((ok,fail)=>{const t=db.transaction(STORE,'readwrite');t.objectStore(STORE).put(value,'github');t.oncomplete=ok;t.onerror=()=>fail(t.error);});}finally{db.close();}}
async function dbDelete(){const db=await openDB();try{await new Promise((ok,fail)=>{const t=db.transaction(STORE,'readwrite');t.objectStore(STORE).delete('github');t.oncomplete=ok;t.onerror=()=>fail(t.error);});}finally{db.close();}}
function bytes(s){return new TextEncoder().encode(s);}
async function derive(pass,salt){const base=await crypto.subtle.importKey('raw',bytes(pass),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:600000,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
function b64(a){return btoa(String.fromCharCode(...new Uint8Array(a)));}
function un64(s){return Uint8Array.from(atob(s),x=>x.charCodeAt(0));}
async function encrypt(value,pass){const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));const key=await derive(pass,salt);const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:bytes('OBSCURA/07-webplayer-v1')},key,bytes(value));return {version:1,algorithm:'AES-256-GCM',kdf:'PBKDF2-SHA256',iterations:600000,salt:b64(salt),iv:b64(iv),ciphertext:b64(encrypted)};}
async function decrypt(record,pass){if(!record||record.version!==1||record.iterations!==600000)throw Error('Formato archivio non supportato');const key=await derive(pass,un64(record.salt));const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:un64(record.iv),additionalData:bytes('OBSCURA/07-webplayer-v1')},key,un64(record.ciphertext));return new TextDecoder().decode(plain);}
async function enableRemember(value){
 const key=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const crypt=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:bytes('OBSCURA/07-device-v18')},key,bytes(value));
 await dbWriteKey(AUTO_KEY,key);
 await dbWriteKey(AUTO_RECORD,{version:1,iv:b64(iv),ciphertext:b64(crypt)});
}
async function dbWriteKey(name,value){const db=await openDB();try{await new Promise((ok,fail)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(value,name);tx.oncomplete=ok;tx.onerror=()=>fail(tx.error);});}finally{db.close();}}
async function dbReadKey(name){const db=await openDB();try{return await new Promise((ok,fail)=>{const tx=db.transaction(STORE,'readonly');const r=tx.objectStore(STORE).get(name);r.onsuccess=()=>ok(r.result||null);r.onerror=()=>fail(r.error);});}finally{db.close();}}
async function dbRemoveDevice(){const db=await openDB();try{await new Promise((ok,fail)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(AUTO_KEY);tx.objectStore(STORE).delete(AUTO_RECORD);tx.oncomplete=ok;tx.onerror=()=>fail(tx.error);});}finally{db.close();}}
async function unlockRemembered(){
 const key=await dbReadKey(AUTO_KEY),record=await dbReadKey(AUTO_RECORD);
 if(!key||!record)return false;
 try{const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:un64(record.iv),additionalData:bytes('OBSCURA/07-device-v18')},key,un64(record.ciphertext));token=new TextDecoder().decode(plain);return true;}
 catch(e){await dbRemoveDevice();return false;}
}
async function refreshVault(){const saved=await dbRead();$('vault-create').hidden=!!saved;$('vault-unlock').hidden=!saved||!!token;$('lock-vault').hidden=!token;$('forget-device').hidden=!(await dbReadKey(AUTO_KEY));AUTH.classList.toggle('credential-ready',Boolean(token&&saved));vaultStatus.textContent=token?'✓ Token GitHub attivo · salvato su questo dispositivo':saved?'Token cifrato salvato: inserisci la password per sbloccarlo':'Nessun token salvato su questo browser';}
function clearToken(){token=null;pat.value='';$('master-new').value='';$('master-repeat').value='';$('master-unlock').value='';cycle++;if(controller)controller.abort();pane.src='runner.html';build.textContent='Anteprima rimossa dalla scheda.';}
async function checkVisibility(){
 const ticket=++inspectSerial;
 let spec;try{spec=input.value.trim()?parseSource(input.value.trim()):alias();}catch(e){AUTH.hidden=true;return;}
 if(!spec){AUTH.hidden=true;return;}
 // Never send an Authorization header during public visibility probes.
 try{
  const check=await fetch('https://api.github.com/repos/'+encodeURIComponent(spec.owner)+'/'+encodeURIComponent(spec.repo),{headers:{Accept:'application/vnd.github+json'},credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer'});
  if(ticket!==inspectSerial)return;
  if(check.status===200){repoPrivacy='public';AUTH.hidden=true;return;}
  if(check.status===404){repoPrivacy='private-or-missing';AUTH.hidden=false;$('private-hint').textContent='Repository privato o inesistente (HTTP 404). Se hai accesso, configura il token una sola volta.';}
  else {repoPrivacy='unknown';AUTH.hidden=true;show('Stato repository non verificabile (GitHub HTTP '+check.status+'). Riprova più tardi.',true);return;}
 }catch(e){if(ticket!==inspectSerial)return;repoPrivacy='unknown';AUTH.hidden=true;show('Impossibile verificare GitHub. Riprova quando la connessione è disponibile.',true);return;}
 await refreshVault();
}

function show(msg,error=false){status.textContent=msg;status.className=error?'error':'hint';}
function validatePart(x){if(!/^[A-Za-z0-9_.-]{1,100}$/.test(x)||x==='.'||x==='..')throw Error('Repository non valido');return x;}
function parseSource(source){
 const u=new URL(source);
 if(u.protocol!=='https:'||u.username||u.password||u.hash||u.search||u.port)throw Error('URL non supportato');
 const parts=u.pathname.split('/').filter(Boolean);
 let owner,repo,ref,path;
 if(u.hostname==='github.com' && parts.length>=5 && parts[2]==='blob'){
   [owner,repo]=parts;ref=parts[3];path=parts.slice(4).join('/');
 }else if(u.hostname==='raw.githubusercontent.com'&&parts.length>=4){
   [owner,repo,ref]=parts;path=parts.slice(3).join('/');
 }else throw Error('Sono ammessi solo URL di file GitHub e raw.githubusercontent.com');
 validatePart(owner);validatePart(repo);
 if(!ref||ref.includes('..')||ref.startsWith('/')||ref.length>150)throw Error('Ref non valido');
 if(!/^[\w.\/-]+$/.test(ref))throw Error('Ref non valido');
 if(!path||path.length>1024||path.split('/').some(part=>!part||part==='.'||part==='..')||!(/\.html?$/i.test(path)))throw Error('Percorso non valido o non HTML');
 return {owner,repo,ref,path};
}
function url(spec,path,ref){
 const base='https://api.github.com/repos/'+encodeURIComponent(spec.owner)+'/'+encodeURIComponent(spec.repo);
 if(path==='@commit')return base+'/commits/'+encodeURIComponent(spec.ref);
 return base+'/contents/'+path.split('/').map(encodeURIComponent).join('/')+'?ref='+encodeURIComponent(ref);
}
async function fetchJSON(uri,signal){
 if(new URL(uri).origin!=='https://api.github.com')throw Error('Host non autorizzato');
 const headers={'Accept':'application/vnd.github+json'};
 if(token && repoPrivacy!=='public')headers.Authorization='Bearer '+token;
 const r=await fetch(uri,{headers,mode:'cors',credentials:'omit',cache:'no-store',redirect:'error',referrerPolicy:'no-referrer',signal});
 if(!r.ok){if(r.status===404){checkVisibility();throw Error('GitHub HTTP 404 — file assente oppure repository privato: sblocca il token.');}throw Error('GitHub HTTP '+r.status+' — verifica repository e permessi del token');}
 return r.json();
}
function decode(b64,limit){
 if(typeof b64!=='string'||b64.length>(limit*4/3)+200)throw Error('File troppo grande');
 const txt=atob(b64.replace(/\s/g,''));if(txt.length>limit)throw Error('File troppo grande');
 return new TextDecoder().decode(Uint8Array.from(txt,c=>c.charCodeAt(0)));
}
async function read(spec,path,commit,signal){
 const r=await fetchJSON(url(spec,path,commit),signal);
 if(r.type!=='file'||!Number.isInteger(r.size)||r.size>MAX||r.encoding!=='base64')throw Error('È supportato soltanto un file HTML autonomo fino a 3 MB');
 return decode(r.content,MAX);
}
const EXTRA_TOTAL=5*1024*1024, MAX_EXTRA=32;
function safeRelative(raw,htmlPath){
 if(!raw || /^(?:[a-z][a-z0-9+.-]*:|\/\/|\/|#|\?)/i.test(raw))return null;
 if(/[?#]/.test(raw))return null;
 const base=htmlPath.split('/').slice(0,-1);
 for(const part of raw.split('/')){
  if(part==='.'||part==='')continue;
  if(part==='..'){if(!base.length)return null;base.pop();continue;}
  if(!/^[\w.-]+$/.test(part))return null;
  base.push(part);
 }
 return base.join('/');
}
async function bundleAssets(sourceHtml,spec,sha,signal){
 let count=0,total=0;
 const cache=new Map();
 async function data(path,mime){
  if(!cache.has(path)){
   if(++count>MAX_EXTRA)throw Error('Troppe risorse: massimo '+MAX_EXTRA);
   const item=await fetchJSON(url(spec,path,sha),signal);
   if(item.type!=='file'||item.encoding!=='base64'||!Number.isInteger(item.size)||item.size>MAX||total+item.size>EXTRA_TOTAL)throw Error('Dimensione delle risorse superiore al limite');
   total+=item.size;
   const raw=item.content.replace(/\s/g,'');
   cache.set(path,'data:'+mime+';base64,'+raw);
  }
  return cache.get(path);
 }
 // Replace local scripts and styles with inlined data. Avoid DOM parsing, which can execute scripts.
 let output=sourceHtml;
 const scripts=[...output.matchAll(/<script\b([^>]*)\bsrc\s*=\s*(["'])([^"']+)\2([^>]*)>\s*<\/script\s*>/gi)];
 for(const match of scripts){
  const path=safeRelative(match[3],spec.path);
  if(!path || !/\.m?js$/i.test(path))throw Error('Script esterno non supportato: '+match[3]);
  const uri=await data(path,'text/javascript');
  const text=new TextDecoder().decode(Uint8Array.from(atob(uri.split(',')[1]),c=>c.charCodeAt(0)));
  if(/<\/script/i.test(text))throw Error('Script con terminatore HTML non supportato');
  output=output.replace(match[0],'<script>'+text+'</script>');
 }
 const css=[...output.matchAll(/<link\b[^>]*\brel\s*=\s*(["'])stylesheet\1[^>]*>/gi)];
 for(const match of css){
  const href=match[0].match(/\bhref\s*=\s*(["'])([^"']+)\1/i)?.[2];
  const path=safeRelative(href,spec.path);
  if(!path || !/\.css$/i.test(path))throw Error('Stile esterno non supportato');
  const uri=await data(path,'text/css');
  const text=new TextDecoder().decode(Uint8Array.from(atob(uri.split(',')[1]),c=>c.charCodeAt(0)));
  output=output.replace(match[0],'<style>'+text.replace(/<\/style/gi,'<\\/style')+'</style>');
 }
 // Local static images resolve at the same exact commit. Cross-origin URLs never enter the private fetch.
 const images=[...output.matchAll(/<img\b[^>]*\bsrc\s*=\s*(["'])([^"']+)\1[^>]*>/gi)];
 for(const match of images){
  const path=safeRelative(match[2],spec.path);
  if(!path)continue;
  const ext=path.split('.').pop().toLowerCase();
  const mime={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',svg:'image/svg+xml'}[ext];
  if(!mime)throw Error('Formato immagine non supportato: '+ext);
  const uri=await data(path,mime);
  output=output.replace(match[0],match[0].replace(match[2],uri));
 }
 return {html:output,count,total};
}
function alias(){
 const q=new URLSearchParams(location.search);
 for(const key of ['token','auth','pat','password','access_token'])if(q.has(key))throw Error('Non inserire mai token o password nell’URL');
if(q.has('game'))throw Error('I cataloghi riservati non sono accessibili dal visualizzatore pubblico. Usa un URL GitHub autorizzato.');
 if(q.has('url'))return parseSource(q.get('url'));
 if(q.has('repo')&&q.has('path')){
  const names=q.get('repo').split('/'); if(names.length!==2)throw Error('Formato owner/repo necessario');
  return parseSource('https://github.com/'+names.map(encodeURIComponent).join('/')+'/blob/'+encodeURIComponent(q.get('ref')||'main')+'/'+q.get('path'));
 }
 return null;
}
$('save-vault').addEventListener('click',async()=>{try{const value=pat.value.trim(),pass=$('master-new').value;if(value.length<20||value.length>MAX_PAT_LEN||/\s/.test(value))throw Error('Token GitHub non valido');if(pass.length<12)throw Error('Password di almeno 12 caratteri');if(pass!==$('master-repeat').value)throw Error('Le password non coincidono');if(!crypto.subtle)throw Error('Richiesto HTTPS');const spec=input.value.trim()?parseSource(input.value.trim()):alias();if(!spec)throw Error('Indica prima il file GitHub privato');const check=await fetch('https://api.github.com/repos/'+encodeURIComponent(spec.owner)+'/'+encodeURIComponent(spec.repo),{headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+value},credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer'});if(!check.ok)throw Error('Token non autorizzato sul repository (HTTP '+check.status+')');const encrypted=await encrypt(value,pass);await dbWrite(encrypted);if($('remember-device').checked)await enableRemember(value);else await dbRemoveDevice();token=value;show('Token salvato cifrato'+($('remember-device').checked?' e dispositivo ricordato.':' e sbloccato.') );}catch(e){show('Salvataggio: '+e.message,true);}finally{pat.value='';$('master-new').value='';$('master-repeat').value='';await refreshVault();}});
$('unlock-vault').addEventListener('click',async()=>{const pass=$('master-unlock').value;try{token=await decrypt(await dbRead(),pass);show('Token sbloccato. Puoi avviare il gioco.');}catch(e){token=null;show('Password errata o archivio danneggiato.',true);}finally{$('master-unlock').value='';await refreshVault();}});
$('forget-device').addEventListener('click',async()=>{await dbRemoveDevice();await refreshVault();show('Accesso automatico disattivato. Il token protetto da password rimane disponibile.');});
$('lock-vault').addEventListener('click',async()=>{clearToken();await refreshVault();show('Token bloccato.');});
$('remove-vault').addEventListener('click',async()=>{if(!confirm('Eliminare definitivamente la credenziale cifrata da questo browser?'))return;clearToken();await dbDelete();await dbRemoveDevice();await refreshVault();show('Credenziale eliminata.');});
input.addEventListener('input',()=>{clearTimeout(visibilityTimer);visibilityTimer=setTimeout(checkVisibility,400);});
$('play').addEventListener('click',async()=>{
 if($('auto-launch').checked && $('agree').checked){try{const s=input.value.trim()?parseSource(input.value.trim()):alias();if(s)localStorage.setItem(OPT+':'+s.owner+'/'+s.repo, '1');}catch(e){}}
 if(!$('agree').checked){show('Per avviare codice di terzi devi leggere e accettare i Termini d’uso.',true);return;}
 if(controller)controller.abort();controller=new AbortController();const n=++cycle;
 const runningController=controller;const timer=setTimeout(()=>runningController.abort(),30000);
 pane.src='runner.html';build.textContent='Caricamento';
 try{
  let spec=input.value.trim()?parseSource(input.value.trim()):alias();
  if(!spec)throw Error('Inserisci il link GitHub di un file HTML');
  show('Verifica commit e carica il file da GitHub…');
  const c=await fetchJSON(url(spec,'@commit'),controller.signal);
  if(!/^[a-f0-9]{40}$/i.test(c.sha||''))throw Error('Commit non valido');
const original=await read(spec,spec.path,c.sha,runningController.signal);
  const assembled=await bundleAssets(original,spec,c.sha,runningController.signal);
  const html=assembled.html;
  if(!/^\s*(<!doctype\s+html|<html|<head|<body)/i.test(html))throw Error('Il file non è HTML valido');
  // The runner is a separate network document. about:srcdoc would inherit
  // the parent CSP script-src 'self', incorrectly blocking game inline scripts.
  // The sandbox omits allow-same-origin: the game cannot reach the vault/DOM.
  const safe=html.replace(/<base\b[^>]*>/gi,'').replace(/<meta\s+http-equiv\s*=\s*['"]?refresh[^>]*>/gi,'');
  if(n!==cycle)return;
  const frame=pane;
  frame.onload=()=>{
   if(n!==cycle)return;
   frame.contentWindow.postMessage({type:'obscura-runner-load-v1',html:safe},'*');
  };
  frame.src='runner.html';
  build.textContent=spec.owner+'/'+spec.repo+' · '+spec.path+' · commit '+c.sha.slice(0,12);
  show('HTML isolato, '+assembled.count+' risorse incorporate dal commit '+c.sha.slice(0,12)+'. Nessun token passato al gioco.');
 }catch(e){if(n===cycle){pane.src='runner.html';show('Impossibile aprire: '+e.message,true);}}
 finally{clearTimeout(timer);}
});
$('fullscreen').addEventListener('click',()=>pane.requestFullscreen?.().catch(()=>show('Schermo intero non disponibile.',true)));
window.addEventListener('pagehide',clearToken);
$('agree').addEventListener('change',()=>{if($('agree').checked)localStorage.setItem(OPT+':terms','yes');else localStorage.removeItem(OPT+':terms');});
(async()=>{
 try{
  const parsed=alias();if(parsed&&!input.value)input.value='https://github.com/'+parsed.owner+'/'+parsed.repo+'/blob/'+parsed.ref+'/'+parsed.path;
  if(localStorage.getItem(OPT+':terms')==='yes')$('agree').checked=true;
  if(parsed && localStorage.getItem(OPT+':'+parsed.owner+'/'+parsed.repo)==='1')$('auto-launch').checked=true;
  await unlockRemembered();
  await checkVisibility();
  if(parsed && $('auto-launch').checked && $('agree').checked && !launched){launched=true;$('play').click();}
 }catch(e){show(e.message,true);}
})();
})();