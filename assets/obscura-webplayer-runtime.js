/* OBSCURA/07 WebPlayer production bundle; generated from viewer modules; no private content or tokens. */
/* github-runtime.js */
/* Sellone WebPlayer GitHub engine: no game HTML receives a token. */
(()=>{'use strict';
const OWNER='holocube999';
const repoPattern=/^[A-Za-z0-9_.-]{1,100}$/;
const pathPattern=/^(?:[A-Za-z0-9_.-]+\/){0,5}[A-Za-z0-9_.-]+\.html?$/i;
const shaPattern=/^[a-f0-9]{40}$/i;
const STORAGE='sellone-webplayer-token-v1';
let token='';
const requestCache=new Map(),verifiedHtmlCache=new Map();let requestEpoch=0,blockedUntil=0;
function normalizeRepo(repo){
 const short=String(repo||'').replace(/^holocube999\//i,'');
 if(!repoPattern.test(short))throw Error('Nome repository non valido');
 return OWNER+'/'+short;
}
async function apiNetwork(url){
 const headers={'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
 if(token)headers.Authorization='Bearer '+token;
 const usedToken=!!token;
 const response=await fetch(url,{headers,credentials:'omit',cache:'no-cache',referrerPolicy:'no-referrer'});
 const rateLimit=Number(response.headers.get('x-ratelimit-limit')||0);
 const rateRemaining=response.headers.get('x-ratelimit-remaining');
 const rateResource=response.headers.get('x-ratelimit-resource')||'';
 if(!response.ok){
  let detail={};try{detail=await response.json()}catch{}
  const message=String(detail.message||'');
  const remaining=rateRemaining;
  const retry=Number(response.headers.get('retry-after')||0);
  const reset=Number(response.headers.get('x-ratelimit-reset')||0);
  let reason='http',hint='GitHub HTTP '+response.status;
  if(response.status===401){reason='invalid_token';hint='Token scaduto o revocato.'}
  else if(response.status===429||remaining==='0'||/rate limit|abuse detection/i.test(message)){
   reason='rate_limit';
   const when=retry>0?Date.now()+retry*1000:reset>0?reset*1000:0;
   hint='Limite richieste GitHub raggiunto.'+(when?' Riprova dopo le '+new Date(when).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})+'.':' Attendi qualche minuto.');
  }else if(response.status===403&&/resource not accessible|permission|not permitted/i.test(message)){
   reason='permissions';hint='Il token non autorizza questa lettura. Repository NULLGOD-MUSIC: Contents → Read-only.';
  }else if(response.status===403&&/saml|sso|organization/i.test(message)){
   reason='organization';hint='Il token deve essere autorizzato dall’organizzazione GitHub.';
  }else if(response.status===403){reason='forbidden';hint='GitHub rifiuta l’accesso (403). Verifica repository selezionato e autorizzazione del token.'}
  else if(response.status===404){reason='not_found';hint='Repository o file non accessibile con questo token.'}
  const err=Error(hint);
  err.status=response.status;err.reason=reason;
  err.retryAt=retry>0?Date.now()+retry*1000:reset>0?reset*1000:0;
  err.requestId=response.headers.get('x-github-request-id')||'';
  err.authenticated=usedToken;err.rateLimit=rateLimit;err.rateRemaining=rateRemaining;err.rateResource=rateResource;
  if(reason==='rate_limit'&&rateLimit===60)err.message+=' Quota da 60/ora (richiesta non autenticata o budget IP).';
  throw err;
 }
 return response.json();
}
async function api(url){
 if(blockedUntil>Date.now()){
  const err=Error('Limite richieste GitHub raggiunto. Riprova dopo le '+new Date(blockedUntil).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})+'.');
  err.status=429;err.reason='rate_limit';err.retryAt=blockedUntil;throw err;
 }
 const old=requestCache.get(url);
 if(old&&old.epoch===requestEpoch&&old.expires>Date.now())return old.promise;
 const epoch=requestEpoch;
 const promise=apiNetwork(url).catch(error=>{
  requestCache.delete(url);
  if(error.reason==='rate_limit')blockedUntil=error.retryAt>Date.now()?error.retryAt:Date.now()+60000;
  throw error;
 });
 const immutable=/[?&]ref=[a-f0-9]{40}(?:&|$)|\/git\/blobs\/[a-f0-9]{40}(?:\?|$)/i.test(url);
 requestCache.set(url,{epoch,expires:Date.now()+(immutable?900000:30000),promise});
 if(requestCache.size>120)requestCache.delete(requestCache.keys().next().value);
 return promise;
}
function safePath(path){
 if(!pathPattern.test(path||'')||String(path).split('/').some(x=>x==='..'||x==='.'))throw Error('Percorso HTML non valido');
 return path;
}
function rank(path,repo){
 const file=path.split('/').pop();
 const v=/v(\d+(?:\.\d+)+)\.html?$/i.exec(file);
 const nums=v?v[1].split('.').map(Number):[];
 const oneFile=/onefile|standalone/i.test(file)?80:0;
 const main=/^(index\.html|dist\/index\.html|app\/index\.html|src\/index\.html)$/i.test(path)?100:0;
 const mad=repo.endsWith('/JSDoctor-MadDoctor')&&/^src\/MadDoctor_JS_Native_v/i.test(path)?150:0;
 const dir=/^(src|app|dist|build|web)\//i.test(path)?20:0;
 return {path,weight:main+mad+oneFile+dir,nums};
}
function compare(a,b){
 if(a.weight!==b.weight)return b.weight-a.weight;
 for(let i=0;i<Math.max(a.nums.length,b.nums.length);i++){const n=(b.nums[i]||0)-(a.nums[i]||0);if(n)return n}
 return a.path.localeCompare(b.path);
}
const POCKETJS_REPO=OWNER+'/PocketJS-NativeServer';
const POCKETJS_BOOTSTRAP='bootstrap/pocketjs-native-core.zip';
const POCKETJS_ENTRY='app/src/main/assets/app/index.html';

async function unzipPocketJS(bytes){
 // Read ZIP central directory, not local sizes (which may use data descriptors).
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 let eocd=-1;
 for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--){
  if(view.getUint32(i,true)===0x06054b50){eocd=i;break}
 }
 if(eocd<0)throw Error('Archivio PocketJS: directory ZIP mancante');
 const count=view.getUint16(eocd+10,true);
 const start=view.getUint32(eocd+16,true);
 if(count>10000||start>=bytes.length)throw Error('Archivio PocketJS non valido');
 let cursor=start,found=null;
 const decoder=new TextDecoder('utf-8',{fatal:true});
 for(let i=0;i<count;i++){
  if(cursor+46>bytes.length||view.getUint32(cursor,true)!==0x02014b50)throw Error('Directory ZIP corrotta');
  const flags=view.getUint16(cursor+8,true),method=view.getUint16(cursor+10,true);
  const compressed=view.getUint32(cursor+20,true),uncompressed=view.getUint32(cursor+24,true);
  const nameLength=view.getUint16(cursor+28,true),extra=view.getUint16(cursor+30,true),comment=view.getUint16(cursor+32,true);
  const local=view.getUint32(cursor+42,true);
  if(cursor+46+nameLength+extra+comment>bytes.length)throw Error('Directory ZIP fuori archivio');
  const name=decoder.decode(bytes.subarray(cursor+46,cursor+46+nameLength));
  if(name===POCKETJS_ENTRY){found={flags,method,compressed,uncompressed,local};break}
  cursor+=46+nameLength+extra+comment;
 }
 if(!found)throw Error('PocketJS: index.html originale assente nell’archivio');
 if(found.flags&1||![0,8].includes(found.method))throw Error('ZIP PocketJS cifrato o compressione non supportata');
 if(found.uncompressed<2*1024*1024||found.uncompressed>12*1024*1024||found.compressed>16*1024*1024)throw Error('Dimensione HTML PocketJS inattesa');
 const offset=found.local;
 if(offset+30>bytes.length||view.getUint32(offset,true)!==0x04034b50)throw Error('Header ZIP non valido');
 const startData=offset+30+view.getUint16(offset+26,true)+view.getUint16(offset+28,true);
 if(startData+found.compressed>bytes.length)throw Error('HTML ZIP troncato');
 const payload=bytes.subarray(startData,startData+found.compressed);
 let extracted;
 if(found.method===0)extracted=payload;
 else{
  if(typeof DecompressionStream==='undefined')throw Error('Browser senza decompressione ZIP deflate-raw');
  try{
   const stream=new Blob([payload]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
   extracted=new Uint8Array(await new Response(stream).arrayBuffer());
  }catch(_){throw Error('Impossibile decomprimere l’HTML originale PocketJS')}
 }
 if(extracted.length!==found.uncompressed)throw Error('Dimensione HTML estratto non corrispondente');
 const html=decoder.decode(extracted);
 if(!/^\\s*(?:<!doctype\\s+html|<html\\b)/i.test(html))throw Error('PocketJS: documento HTML originale non valido');
 return html;
}
async function pocketJSArchive(repo,ref,files){
 const base='https://api.github.com/repos/'+repo;
 const entry=await api(base+'/contents/'+POCKETJS_BOOTSTRAP+'?ref='+ref);
 if(entry.type!=='file'||!shaPattern.test(entry.sha||'')||!Number.isSafeInteger(entry.size)||entry.size<1024||entry.size>32*1024*1024)throw Error('Archivio PocketJS mancante o troppo grande');
 let bytes;
 if(entry.encoding==='base64'&&entry.content)bytes=bytesFromBase64(entry.content);
 else{
  const blob=await api(base+'/git/blobs/'+entry.sha);
  if(blob.encoding!=='base64'||!blob.content)throw Error('Archivio PocketJS non leggibile via GitHub');
  bytes=bytesFromBase64(blob.content);
 }
 if(bytes.length!==entry.size)throw Error('Dimensione archivio PocketJS incoerente');
 await checkBlob(bytes,entry.sha);
 return {repo,ref,path:POCKETJS_BOOTSTRAP,files:files||[POCKETJS_BOOTSTRAP],
  html:await unzipPocketJS(bytes),bytes:bytes.length,blob:entry.sha};
}

async function discover(input){
 const repo=normalizeRepo(input),base='https://api.github.com/repos/'+repo;
 // Dedicated NULLGOD entry is a single known bundled build. Avoid full repository
 // discovery (metadata + commit + recursive tree) for each mobile app launch.
 if(repo===OWNER+'/NULLGOD-MUSIC'){
  const head=await api(base+'/commits/main');
  if(!shaPattern.test(head.sha||''))throw Error('Revisione GitHub non valida');
  return {repo,ref:head.sha,files:['dist/index.html'],path:'dist/index.html'};
 }
 const meta=await api(base);
 const commit=await api(base+'/commits/'+encodeURIComponent(meta.default_branch||'main'));
 if(!shaPattern.test(commit.sha||''))throw Error('Revisione GitHub non valida');
 const result=await api(base+'/git/trees/'+commit.sha+'?recursive=1');
 if(result.truncated)throw Error('Albero GitHub troppo grande: selezione automatica sospesa');
 if(repo===POCKETJS_REPO){
  const front=(result.tree||[]).find(x=>x.type==='blob'&&x.path==='web/index.html'&&x.size>1024*1024&&x.size<=12*1024*1024);
  if(!front)throw Error('PocketJS: frontend web/index.html completo non disponibile');
  return {repo,ref:commit.sha,files:['web/index.html'],path:'web/index.html'};
 }
 const files=(result.tree||[]).filter(x=>x.type==='blob'&&pathPattern.test(x.path)&&
  !/^(docs|tests|history|node_modules|vendor|tools|reports|fixtures|examples)\//i.test(x.path)&&x.size<=12*1024*1024)
  .map(x=>rank(x.path,repo)).sort(compare).map(x=>x.path);
 if(!files.length)throw Error('Nessuna build HTML candidata nel repository');
 return {repo,ref:commit.sha,files,path:files[0]};
}
function bytesFromBase64(data){
 const clean=String(data||'').replace(/\s+/g,'');
 const chunks=[];
 for(let i=0;i<clean.length;i+=8192){
  const raw=atob(clean.slice(i,i+8192));
  chunks.push(Uint8Array.from(raw,c=>c.charCodeAt(0)));
 }
 const n=chunks.reduce((sum,v)=>sum+v.length,0),out=new Uint8Array(n);
 let i=0;for(const chunk of chunks){out.set(chunk,i);i+=chunk.length}return out;
}
function sha1Fallback(bytes){
 // Git blob object identity verification on HTTP origins without SubtleCrypto.
 const len=bytes.length,padded=Math.ceil((len+9)/64)*64,data=new Uint8Array(padded);
 data.set(bytes);data[len]=128;
 const view=new DataView(data.buffer),bits=len*8;
 view.setUint32(padded-8,Math.floor(bits/4294967296),false);view.setUint32(padded-4,bits>>>0,false);
 let h0=0x67452301,h1=0xefcdab89,h2=0x98badcfe,h3=0x10325476,h4=0xc3d2e1f0;
 const rot=(v,n)=>(v<<n)|(v>>>(32-n)),words=new Int32Array(80);
 for(let block=0;block<padded;block+=64){
  for(let i=0;i<16;i++)words[i]=view.getInt32(block+i*4,false);
  for(let i=16;i<80;i++)words[i]=rot(words[i-3]^words[i-8]^words[i-14]^words[i-16],1);
  let a=h0,b=h1,c=h2,d=h3,e=h4;
  for(let i=0;i<80;i++){
   let f,k;
   if(i<20){f=(b&c)|(~b&d);k=0x5a827999}
   else if(i<40){f=b^c^d;k=0x6ed9eba1}
   else if(i<60){f=(b&c)|(b&d)|(c&d);k=0x8f1bbcdc}
   else{f=b^c^d;k=0xca62c1d6}
   const t=(rot(a,5)+f+e+k+words[i])|0;
   e=d;d=c;c=rot(b,30);b=a;a=t;
  }
  h0=(h0+a)|0;h1=(h1+b)|0;h2=(h2+c)|0;h3=(h3+d)|0;h4=(h4+e)|0;
 }
 return [h0,h1,h2,h3,h4].map(x=>(x>>>0).toString(16).padStart(8,'0')).join('');
}
async function checkBlob(bytes,expectedSha){
 const header=new TextEncoder().encode('blob '+bytes.length+'\0');
 const input=new Uint8Array(header.length+bytes.length);input.set(header);input.set(bytes,header.length);
 const subtle=typeof crypto!=='undefined'&&crypto.subtle;
 const hex=subtle?Array.from(new Uint8Array(await subtle.digest('SHA-1',input)),c=>c.toString(16).padStart(2,'0')).join(''):sha1Fallback(input);
 if(hex!==expectedSha.toLowerCase())throw Error('Blob SHA-1 GitHub non corrispondente');
}
async function load(input){
 const repo=normalizeRepo(input.repo);
 let ref=input.ref,path=input.path;
 let files;
 if(!ref){const newest=await discover(repo);ref=newest.ref;files=newest.files;path=path||newest.path}
 if(!shaPattern.test(ref||''))throw Error('SHA GitHub completo richiesto');
 if(repo===POCKETJS_REPO&&path===POCKETJS_BOOTSTRAP){
  // Legacy viewer links pointed to a ZIP without HTML: use the actual frontend.
  path='web/index.html';
 }
 if(repo===POCKETJS_REPO&&path!=='web/index.html')throw Error('Percorso PocketJS non autorizzato');
 safePath(path);
 const cacheKey=requestEpoch+'|'+repo+'|'+ref+'|'+path;
 const cached=verifiedHtmlCache.get(cacheKey);
 if(cached)return cached;
 const url='https://api.github.com/repos/'+repo+'/contents/'+path.split('/').map(encodeURIComponent).join('/')+'?ref='+ref;
 const entry=await api(url);
 if(entry.type!=='file'||!shaPattern.test(entry.sha||'')||!Number.isSafeInteger(entry.size)||entry.size>12*1024*1024)throw Error('HTML non disponibile o oltre 12 MiB');
 let bytes;
 if(entry.encoding==='base64'&&entry.content)bytes=bytesFromBase64(entry.content);
 else {
  const blob=await api('https://api.github.com/repos/'+repo+'/git/blobs/'+entry.sha);
  if(blob.encoding!=='base64'||!blob.content)throw Error('Blob GitHub non leggibile');
  bytes=bytesFromBase64(blob.content);
 }
 if(bytes.length!==entry.size)throw Error('Dimensione GitHub non corrispondente');
 await checkBlob(bytes,entry.sha);
 const html=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
 if(!/^\s*(?:<!doctype\s+html|<html\b)/i.test(html))throw Error('File non riconosciuto come documento HTML');
 const verified={repo,ref,path,files,html,bytes:bytes.length,blob:entry.sha};
 verifiedHtmlCache.set(cacheKey,verified);
 if(verifiedHtmlCache.size>8)verifiedHtmlCache.delete(verifiedHtmlCache.keys().next().value);
 return verified;
}

const mediaPattern=/^(?:[A-Za-z0-9_.-]+\/){0,5}[A-Za-z0-9_.-]+\.(?:adf|d64|t64|prg)$/i;
const biosPattern=/^(?:[A-Za-z0-9_.-]+\/){0,5}[A-Za-z0-9_.-]+\.(?:rom|bin|kick|a500|a1200)$/i;
async function discoverMedia(input,requestedRef=''){
 const repo=normalizeRepo(input),base='https://api.github.com/repos/'+repo;
 if(requestedRef&&!shaPattern.test(requestedRef))throw Error('Revisione non valida');
 const meta=await api(base);
 const resolved=requestedRef?{sha:requestedRef}:await api(base+'/commits/'+encodeURIComponent(meta.default_branch||'main'));
 if(!shaPattern.test(resolved.sha||''))throw Error('Revisione GitHub non valida');
 const tree=await api(base+'/git/trees/'+resolved.sha+'?recursive=1');
 if(tree.truncated)throw Error('Albero GitHub troppo grande');
 const files=(tree.tree||[]).filter(x=>x.type==='blob'&&mediaPattern.test(x.path)&&
  x.size>0&&x.size<=3*1024*1024&&!/^(history|tests|docs|vendor|fixtures|node_modules)\//i.test(x.path))
  .map(x=>x.path).sort();
 if(!files.length)throw Error('Nessun ADF/D64/T64/PRG disponibile nel repository autorizzato');
 const biosFiles=meta.private===true&&!!token?(tree.tree||[]).filter(x=>x.type==='blob'&&biosPattern.test(x.path)&&x.size>=8192&&x.size<=2*1024*1024).map(x=>x.path).sort():[];
 return {repo,ref:resolved.sha,files,path:files[0],biosFiles};
}
async function loadMedia(input){
 const repo=normalizeRepo(input.repo);
 let ref=input.ref,path=input.path,files;
 if(!ref){const newest=await discoverMedia(repo);ref=newest.ref;files=newest.files;path=path||newest.path}
 if(!shaPattern.test(ref||'')||!mediaPattern.test(path||''))throw Error('Revisione o supporto non valido');
 const entry=await api('https://api.github.com/repos/'+repo+'/contents/'+path.split('/').map(encodeURIComponent).join('/')+'?ref='+ref);
 if(entry.type!=='file'||!shaPattern.test(entry.sha||'')||!Number.isSafeInteger(entry.size)||entry.size<1||entry.size>3*1024*1024)throw Error('Supporto non disponibile o troppo grande');
 let bytes;
 if(entry.encoding==='base64'&&entry.content)bytes=bytesFromBase64(entry.content);
 else {
  const blob=await api('https://api.github.com/repos/'+repo+'/git/blobs/'+entry.sha);
  if(blob.encoding!=='base64'||!blob.content)throw Error('Blob binario non leggibile');
  bytes=bytesFromBase64(blob.content);
 }
 if(bytes.length!==entry.size)throw Error('Dimensione del supporto non corrispondente');
 await checkBlob(bytes,entry.sha);
 return {repo,ref,path,files,media:new Blob([bytes],{type:'application/octet-stream'}),bytes:bytes.length,blob:entry.sha};
}


async function loadBios(input){
 const repo=normalizeRepo(input.repo),ref=input.ref,path=input.path;
 if(!token)throw Error('Kickstart remota consentita solo con accesso privato autorizzato');
 if(!shaPattern.test(ref||'')||!biosPattern.test(path||''))throw Error('Percorso Kickstart o SHA non valido');
 const base='https://api.github.com/repos/'+repo;
 const meta=await api(base);
 if(meta.private!==true)throw Error('Le ROM non devono essere pubblicate in repository pubblici');
 const item=await api(base+'/contents/'+path.split('/').map(encodeURIComponent).join('/')+'?ref='+ref);
 if(item.type!=='file'||!shaPattern.test(item.sha||'')||!Number.isSafeInteger(item.size)||item.size<8192||item.size>2*1024*1024)throw Error('Kickstart privata non valida');
 let bytes;
 if(item.encoding==='base64'&&item.content)bytes=bytesFromBase64(item.content);
 else {
  const blob=await api(base+'/git/blobs/'+item.sha);
  if(blob.encoding!=='base64'||!blob.content)throw Error('ROM privata non leggibile');
  bytes=bytesFromBase64(blob.content);
 }
 if(bytes.length!==item.size)throw Error('Dimensione Kickstart non corrispondente');
 await checkBlob(bytes,item.sha);
 return {ref,path,bios:new Blob([bytes],{type:'application/octet-stream'}),bytes:bytes.length};
}


const textPattern=/^(?:[A-Za-z0-9_.-]+\/){0,6}[A-Za-z0-9_.-]+\.(?:md|txt|json|js|mjs|cjs|ts|css|html?|py|c|cpp|h|hpp|asm|s|yml|yaml|toml|ini|sh|ps1|bat|cmd|xml|csv|java|kt|rs|go|lua|scad)$/i;
async function discoverFiles(input,requestedRef=''){
 const repo=normalizeRepo(input),base='https://api.github.com/repos/'+repo;
 const commit=requestedRef?{sha:requestedRef}:await (async()=>{
  const meta=await api(base);
  return api(base+'/commits/'+encodeURIComponent(meta.default_branch||'main'));
 })();
 if(!shaPattern.test(commit.sha||''))throw Error('Revisione GitHub non valida');
 const tree=await api(base+'/git/trees/'+commit.sha+'?recursive=1');
 if(tree.truncated)throw Error('Repository troppo grande per il visualizzatore sorgenti');
 const files=(tree.tree||[]).filter(x=>x.type==='blob'&&textPattern.test(x.path)&&x.size>=0&&x.size<=1024*1024&&!/(?:^|\/)(?:node_modules|vendor|\.git|\.private|private-media)\//i.test(x.path))
  .map(x=>x.path).sort((a,b)=>{
   const rank=p=>/^readme\.md$/i.test(p)?0:/^(?:docs\/)?(?:status|overview|readme)\.md$/i.test(p)?1:/^src\//i.test(p)?2:3;
   return rank(a)-rank(b)||a.localeCompare(b);
  }).slice(0,800);
 if(!files.length)throw Error('Nessun file di testo visualizzabile nel repository');
 return {repo,ref:commit.sha,files,path:files[0]};
}
async function loadText(input){
 const repo=normalizeRepo(input.repo),ref=input.ref,path=input.path;
 if(!shaPattern.test(ref||'')||!textPattern.test(path||''))throw Error('Percorso sorgente o SHA GitHub non valido');
 const base='https://api.github.com/repos/'+repo;
 const entry=await api(base+'/contents/'+path.split('/').map(encodeURIComponent).join('/')+'?ref='+ref);
 if(entry.type!=='file'||!shaPattern.test(entry.sha||'')||!Number.isSafeInteger(entry.size)||entry.size>1024*1024)throw Error('Sorgente oltre 1 MiB o non leggibile');
 let bytes;
 if(entry.encoding==='base64'&&entry.content)bytes=bytesFromBase64(entry.content);
 else {
  const blob=await api(base+'/git/blobs/'+entry.sha);
  if(blob.encoding!=='base64'||!blob.content)throw Error('Blob sorgente non leggibile');
  bytes=bytesFromBase64(blob.content);
 }
 if(bytes.length!==entry.size)throw Error('Dimensione sorgente non corrispondente');
 await checkBlob(bytes,entry.sha);
 const output=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
 return {repo,ref,path,content:output,bytes:bytes.length};
}

function b64(bytes){let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.slice(i,i+8192));return btoa(s)}
async function keyFor(password,salt){
 const imported=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:260000,hash:'SHA-256'},imported,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
async function setToken(value,password,remember){
 value=String(value||'').trim();if(value.length<16)throw Error('Token GitHub mancante');
 if(remember){
  if(String(password).length<12)throw Error('Password locale: almeno 12 caratteri');
  const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
  const k=await keyFor(password,salt);
  const payload=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},k,new TextEncoder().encode(value)));
  localStorage.setItem(STORAGE,JSON.stringify({v:1,salt:b64(salt),iv:b64(iv),payload:b64(payload)}));
 }
 if(token!==value){requestEpoch++;requestCache.clear();verifiedHtmlCache.clear();blockedUntil=0}
 token=value;
}
async function unlock(password){
 const raw=localStorage.getItem(STORAGE);if(!raw)throw Error('Nessun token cifrato presente');
 const obj=JSON.parse(raw);if(obj.v!==1)throw Error('Archivio token incompatibile');
 const k=await keyFor(password,bytesFromBase64(obj.salt));
 token=new TextDecoder('utf-8',{fatal:true}).decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:bytesFromBase64(obj.iv)},k,bytesFromBase64(obj.payload)));
}
function forget(){token='';requestEpoch++;requestCache.clear();verifiedHtmlCache.clear();blockedUntil=0;localStorage.removeItem(STORAGE)}

function selloneVersionNumber(value){
 const m=String(value||'').match(/(?:^|[^\da-z])v?(\d+(?:[._-]\d+){1,5})(?=[^\da-z]|$)/i);
 return m?m[1].replace(/[_-]/g,'.'):'';
}
function selloneVersionCompare(a,b){
 const x=String(a||'').split('.').map(Number),y=String(b||'').split('.').map(Number);
 for(let i=0;i<Math.max(x.length,y.length);i++){
  if((x[i]||0)!==(y[i]||0))return (y[i]||0)-(x[i]||0);
 }
 return 0;
}

async function selloneVersions(name,page=1){
 if(!Number.isSafeInteger(page)||page<1||page>10000)throw Error('Pagina cronologia non valida');
 const repo=normalizeRepo(name),base='https://api.github.com/repos/'+repo,perPage=20;
 const commits=await api(base+'/commits?per_page='+perPage+'&page='+page);
 const revisions=(Array.isArray(commits)?commits:[]).filter(x=>shaPattern.test(x.sha||'')).map(x=>{
  const description=String(x.commit?.message||'').split('\n')[0].slice(0,100),version=selloneVersionNumber(description);
  return {kind:'commit',name:version?'v'+version:'Revisione '+x.sha.slice(0,8),version,
   ref:x.sha,sha:x.sha,path:null,defaultPath:'',description,
   date:x.commit?.committer?.date||x.commit?.author?.date||''};
 });
 let files=[];
 if(page===1)try{
  const head=await discover(name);
  files=head.files.map(path=>{const version=selloneVersionNumber(path.split('/').pop());
   return version?{kind:'file',name:'v'+version,version,ref:head.ref,sha:head.ref,path,
    description:'Build HTML versionata presente nel repository',date:''}:null;
  }).filter(Boolean).sort((x,y)=>selloneVersionCompare(x.version,y.version)).slice(0,60);
 }catch(error){if(error.reason==='rate_limit')throw error}
 return {files,revisions,head:revisions[0]?.ref||'',page,hasMore:revisions.length===perPage};
}
const selloneRevisionCache=new Map();
async function selloneRevisionDetails(name,sha,preferred=''){
 if(!shaPattern.test(sha||''))throw Error('SHA revisione non valido');
 const repo=normalizeRepo(name),key=repo+':'+sha;
 let blobs=selloneRevisionCache.get(key);
 if(!blobs){
  const tree=await api('https://api.github.com/repos/'+repo+'/git/trees/'+sha+'?recursive=1');
  if(tree.truncated)throw Error('Albero GitHub incompleto');
  blobs=(tree.tree||[]).filter(x=>x.type==='blob'&&Number.isSafeInteger(x.size)&&x.size>=0);
  selloneRevisionCache.set(key,blobs);
  if(selloneRevisionCache.size>60)selloneRevisionCache.delete(selloneRevisionCache.keys().next().value);
 }
 const totalBytes=blobs.reduce((sum,x)=>sum+x.size,0);
 const html=blobs.filter(x=>pathPattern.test(x.path)&&x.size<=12*1024*1024&&
  !/^(docs|tests|history|node_modules|vendor|tools|reports|fixtures|examples)\//i.test(x.path));
 const ranked=html.map(x=>rank(x.path,repo)).sort(compare);
 const path=html.some(x=>x.path===preferred)?preferred:ranked[0]?.path||'';
 const bytes=html.find(x=>x.path===path)?.size??null;
 const media=blobs.filter(x=>/\.(adf|d64|t64|prg)$/i.test(x.path)&&x.size>0&&x.size<=3*1024*1024);
 const mediaPath=media.some(x=>x.path===preferred)?preferred:media[0]?.path||'';
 return {repo,sha,path,bytes,totalBytes,mediaPath};
}
async function selloneHistoricalPath(name,sha,preferred){
 const info=await selloneRevisionDetails(name,sha,preferred);
 if(!info.path)throw Error('Questa revisione non contiene HTML; consulta i sorgenti');
 return info.path;
}
const ZIP_MAX_BYTES=256*1024*1024,ZIP_MAX_FILES=12000;
const zipTable=(()=>{const t=new Uint32Array(256);for(let i=0;i<256;i++){let x=i;
 for(let j=0;j<8;j++)x=x&1?0xedb88320^(x>>>1):x>>>1;t[i]=x>>>0}return t})();
function zipCRC(bytes){let c=0xffffffff;for(const n of bytes)c=zipTable[(c^n)&255]^(c>>>8);return (c^0xffffffff)>>>0}
function zipFile(entries){
 const en=new TextEncoder(),chunks=[],central=[];let offset=0;
 for(const {path,bytes} of entries){
  if(!path||path.startsWith('/')||path.split('/').some(p=>!p||p==='.'||p==='..')||/[\x00-\x1f\\]/.test(path))throw Error('Percorso archivio non sicuro');
  const name=en.encode(path),len=bytes.length;
  if(name.length>=65536||len>=0xffffffff)throw Error('Archivio ZIP non rappresentabile');
  const crc=zipCRC(bytes),h=new Uint8Array(30+name.length),hd=new DataView(h.buffer);
  hd.setUint32(0,0x04034b50,true);hd.setUint16(4,20,true);hd.setUint16(6,0x0800,true);
  hd.setUint32(14,crc,true);hd.setUint32(18,len,true);hd.setUint32(22,len,true);
  hd.setUint16(26,name.length,true);h.set(name,30);chunks.push(h,bytes);
  const c=new Uint8Array(46+name.length),cd=new DataView(c.buffer);
  cd.setUint32(0,0x02014b50,true);cd.setUint16(4,20,true);cd.setUint16(6,20,true);
  cd.setUint16(8,0x0800,true);cd.setUint32(16,crc,true);
  cd.setUint32(20,len,true);cd.setUint32(24,len,true);cd.setUint16(28,name.length,true);
  cd.setUint32(42,offset,true);c.set(name,46);central.push(c);offset+=h.length+len;
 }
 const size=central.reduce((sum,x)=>sum+x.length,0);
 if(offset+size>=0xffffffff||entries.length>=65535)throw Error('ZIP oltre limite standard');
 const end=new Uint8Array(22),view=new DataView(end.buffer);
 view.setUint32(0,0x06054b50,true);view.setUint16(8,entries.length,true);
 view.setUint16(10,entries.length,true);view.setUint32(12,size,true);view.setUint32(16,offset,true);
 return new Blob([...chunks,...central,end],{type:'application/zip'});
}
async function selloneDownloadArchive(name,requestedRef='',progress=()=>{}){
 const repo=normalizeRepo(name);
 if(requestedRef&&!shaPattern.test(requestedRef))throw Error('SHA ZIP non valido');
 const base='https://api.github.com/repos/'+repo,meta=await api(base);
 if(meta.private===false){
  const ref=requestedRef||meta.default_branch||'main';
  return {url:'https://github.com/'+repo+'/archive/'+encodeURIComponent(ref)+'.zip',
   filename:repo.split('/')[1]+'-'+ref.slice(0,12)+'.zip',ref};
 }
 if(!token)throw Error('Repository privato: inserisci il token di sola lettura nelle opzioni del WebPlayer');
 const commit=requestedRef?{sha:requestedRef}:await api(base+'/commits/'+encodeURIComponent(meta.default_branch||'main'));
 if(!shaPattern.test(commit.sha||''))throw Error('Commit GitHub non valido');
 const tree=await api(base+'/git/trees/'+commit.sha+'?recursive=1');
 if(tree.truncated)throw Error('Albero GitHub troncato: ZIP completo non garantibile');
 const blobs=(tree.tree||[]).filter(e=>e.type==='blob');
 const bytesTotal=blobs.reduce((n,x)=>n+(x.size||0),0);
 if(blobs.some(x=>!shaPattern.test(x.sha||'')||!Number.isSafeInteger(x.size)||x.size<0))
  throw Error('Snapshot GitHub non valido');
 if(blobs.length>ZIP_MAX_FILES||bytesTotal>ZIP_MAX_BYTES)
  throw Error('Archivio privato troppo grande per il browser: '+blobs.length+' file, '+Math.round(bytesTotal/1048576)+' MiB; nessun file escluso silenziosamente');
 const results=new Array(blobs.length);let cursor=0,done=0,loaded=0;
 const worker=async()=>{while(cursor<blobs.length){
  const n=cursor++,file=blobs[n];let bytes;
  if(!file.path||file.path.startsWith('/')||file.path.split('/').some(p=>!p||p==='.'||p==='..')||/[\x00-\x1f\\]/.test(file.path))
   throw Error('Percorso GitHub non sicuro');
  if(file.size===0)bytes=new Uint8Array(0);
  else{const raw=await api(base+'/git/blobs/'+file.sha);
   if(raw.encoding!=='base64'||!raw.content)throw Error('Blob GitHub non leggibile: '+file.path);
   bytes=bytesFromBase64(raw.content)}
  if(bytes.length!==file.size)throw Error('Dimensione file errata: '+file.path);
  await checkBlob(bytes,file.sha);
  results[n]={path:file.path,bytes};done++;loaded+=bytes.length;
  progress({done,total:blobs.length,bytes:loaded,bytesTotal});
 }};
 await Promise.all(Array.from({length:Math.min(4,blobs.length)},()=>worker()));
 return {blob:zipFile(results),filename:repo.split('/')[1]+'-'+commit.sha.slice(0,12)+'.zip',
  ref:commit.sha,files:blobs.length,bytes:bytesTotal};
}
window.SelloneGitHub=Object.freeze({selloneVersions,selloneRevisionDetails,selloneHistoricalPath,selloneDownloadArchive,normalizeRepo,discover,load,discoverMedia,loadMedia,loadBios,discoverFiles,loadText,setToken,unlock,forget,hasToken:()=>!!token,hasSavedToken:()=>!!localStorage.getItem(STORAGE)});
})();
;
/* Sellone WebPlayer GitHub engine: no game HTML receives a token. */
(()=>{'use strict';
const OWNER='holocube999';
const repoPattern=/^[A-Za-z0-9_.-]{1,100}$/;
const pathPattern=/^(?:[A-Za-z0-9_.-]+\/){0,5}[A-Za-z0-9_.-]+\.html?$/i;
const shaPattern=/^[a-f0-9]{40}$/i;
const STORAGE='sellone-webplayer-token-v1';
let token='';
const requestCache=new Map(),verifiedHtmlCache=new Map();let requestEpoch=0,blockedUntil=0;
function normalizeRepo(repo){
 const short=String(repo||'').replace(/^holocube999\//i,'');
 if(!repoPattern.test(short))throw Error('Nome repository non valido');
 return OWNER+'/'+short;
}
async function apiNetwork(url){
 const headers={'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
 if(token)headers.Authorization='Bearer '+token;
 const usedToken=!!token;
 const response=await fetch(url,{headers,credentials:'omit',cache:'no-cache',referrerPolicy:'no-referrer'});
 const rateLimit=Number(response.headers.get('x-ratelimit-limit')||0);
 const rateRemaining=response.headers.get('x-ratelimit-remaining');
 const rateResource=response.headers.get('x-ratelimit-resource')||'';
 if(!response.ok){
  let detail={};try{detail=await response.json()}catch{}
  const message=String(detail.message||'');
  const remaining=rateRemaining;
  const retry=Number(response.headers.get('retry-after')||0);
  const reset=Number(response.headers.get('x-ratelimit-reset')||0);
  let reason='http',hint='GitHub HTTP '+response.status;
  if(response.status===401){reason='invalid_token';hint='Token scaduto o revocato.'}
  else if(response.status===429||remaining==='0'||/rate limit|abuse detection/i.test(message)){
   reason='rate_limit';
   const when=retry>0?Date.now()+retry*1000:reset>0?reset*1000:0;
   hint='Limite richieste GitHub raggiunto.'+(when?' Riprova dopo le '+new Date(when).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})+'.':' Attendi qualche minuto.');
  }else if(response.status===403&&/resource not accessible|permission|not permitted/i.test(message)){
   reason='permissions';hint='Il token non autorizza questa lettura. Repository NULLGOD-MUSIC: Contents → Read-only.';
  }else if(response.status===403&&/saml|sso|organization/i.test(message)){
   reason='organization';hint='Il token deve essere autorizzato dall’organizzazione GitHub.';
  }else if(response.status===403){reason='forbidden';hint='GitHub rifiuta l’accesso (403). Verifica repository selezionato e autorizzazione del token.'}
  else if(response.status===404){reason='not_found';hint='Repository o file non accessibile con questo token.'}
  const err=Error(hint);
  err.status=response.status;err.reason=reason;
  err.retryAt=retry>0?Date.now()+retry*1000:reset>0?reset*1000:0;
  err.requestId=response.headers.get('x-github-request-id')||'';
  err.authenticated=usedToken;err.rateLimit=rateLimit;err.rateRemaining=rateRemaining;err.rateResource=rateResource;
  if(reason==='rate_limit'&&rateLimit===60)err.message+=' Quota da 60/ora (richiesta non autenticata o budget IP).';
  throw err;
 }
 return response.json();
}
async function api(url){
 if(blockedUntil>Date.now()){
  const err=Error('Limite richieste GitHub raggiunto. Riprova dopo le '+new Date(blockedUntil).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})+'.');
  err.status=429;err.reason='rate_limit';err.retryAt=blockedUntil;throw err;
 }
 const old=requestCache.get(url);
 if(old&&old.epoch===requestEpoch&&old.expires>Date.now())return old.promise;
 const epoch=requestEpoch;
 const promise=apiNetwork(url).catch(error=>{
  requestCache.delete(url);
  if(error.reason==='rate_limit')blockedUntil=error.retryAt>Date.now()?error.retryAt:Date.now()+60000;
  throw error;
 });
 const immutable=/[?&]ref=[a-f0-9]{40}(?:&|$)|\/git\/blobs\/[a-f0-9]{40}(?:\?|$)/i.test(url);
 requestCache.set(url,{epoch,expires:Date.now()+(immutable?900000:30000),promise});
 if(requestCache.size>120)requestCache.delete(requestCache.keys().next().value);
 return promise;
}
function safePath(path){
 if(!pathPattern.test(path||'')||String(path).split('/').some(x=>x==='..'||x==='.'))throw Error('Percorso HTML non valido');
 return path;
}
function rank(path,repo){
 const file=path.split('/').pop();
 const v=/v(\d+(?:\.\d+)+)\.html?$/i.exec(file);
 const nums=v?v[1].split('.').map(Number):[];
 const oneFile=/onefile|standalone/i.test(file)?80:0;
 const main=/^(index\.html|dist\/index\.html|app\/index\.html|src\/index\.html)$/i.test(path)?100:0;
 const mad=repo.endsWith('/JSDoctor-MadDoctor')&&/^src\/MadDoctor_JS_Native_v/i.test(path)?150:0;
 const dir=/^(src|app|dist|build|web)\//i.test(path)?20:0;
 return {path,weight:main+mad+oneFile+dir,nums};
}
function compare(a,b){
 if(a.weight!==b.weight)return b.weight-a.weight;
 for(let i=0;i<Math.max(a.nums.length,b.nums.length);i++){const n=(b.nums[i]||0)-(a.nums[i]||0);if(n)return n}
 return a.path.localeCompare(b.path);
}
const POCKETJS_REPO=OWNER+'/PocketJS-NativeServer';
const POCKETJS_BOOTSTRAP='bootstrap/pocketjs-native-core.zip';
const POCKETJS_ENTRY='app/src/main/assets/app/index.html';
async function unzipPocketJS(bytes){
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 let eocd=-1;
 for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--){
  if(view.getUint32(i,true)===0x06054b50){eocd=i;break}
 }
 if(eocd<0)throw Error('Archivio PocketJS: directory ZIP mancante');
 const count=view.getUint16(eocd+10,true);
 const start=view.getUint32(eocd+16,true);
 if(count>10000||start>=bytes.length)throw Error('Archivio PocketJS non valido');
 let cursor=start,found=null;
 const decoder=new TextDecoder('utf-8',{fatal:true});
 for(let i=0;i<count;i++){
  if(cursor+46>bytes.length||view.getUint32(cursor,true)!==0x02014b50)throw Error('Directory ZIP corrotta');
  const flags=view.getUint16(cursor+8,true),method=view.getUint16(cursor+10,true);
  const compressed=view.getUint32(cursor+20,true),uncompressed=view.getUint32(cursor+24,true);
  const nameLength=view.getUint16(cursor+28,true),extra=view.getUint16(cursor+30,true),comment=view.getUint16(cursor+32,true);
  const local=view.getUint32(cursor+42,true);
  if(cursor+46+nameLength+extra+comment>bytes.length)throw Error('Directory ZIP fuori archivio');
  const name=decoder.decode(bytes.subarray(cursor+46,cursor+46+nameLength));
  if(name===POCKETJS_ENTRY){found={flags,method,compressed,uncompressed,local};break}
  cursor+=46+nameLength+extra+comment;
 }
 if(!found)throw Error('PocketJS: index.html originale assente nell’archivio');
 if(found.flags&1||![0,8].includes(found.method))throw Error('ZIP PocketJS cifrato o compressione non supportata');
 if(found.uncompressed<2*1024*1024||found.uncompressed>12*1024*1024||found.compressed>16*1024*1024)throw Error('Dimensione HTML PocketJS inattesa');
 const offset=found.local;
 if(offset+30>bytes.length||view.getUint32(offset,true)!==0x04034b50)throw Error('Header ZIP non valido');
 const startData=offset+30+view.getUint16(offset+26,true)+view.getUint16(offset+28,true);
 if(startData+found.compressed>bytes.length)throw Error('HTML ZIP troncato');
 const payload=bytes.subarray(startData,startData+found.compressed);
 let extracted;
 if(found.method===0)extracted=payload;
 else{
  if(typeof DecompressionStream==='undefined')throw Error('Browser senza decompressione ZIP deflate-raw');
  try{
   const stream=new Blob([payload]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
   extracted=new Uint8Array(await new Response(stream).arrayBuffer());
  }catch(_){throw Error('Impossibile decomprimere l’HTML originale PocketJS')}
 }
 if(extracted.length!==found.uncompressed)throw Error('Dimensione HTML estratto non corrispondente');
 const html=decoder.decode(extracted);
 if(!/^\\s*(?:<!doctype\\s+html|<html\\b)/i.test(html))throw Error('PocketJS: documento HTML originale non valido');
 return html;
}
async function pocketJSArchive(repo,ref,files){
 const base='https://api.github.com/repos/'+repo;
 const entry=await api(base+'/contents/'+POCKETJS_BOOTSTRAP+'?ref='+ref);
 if(entry.type!=='file'||!shaPattern.test(entry.sha||'')||!Number.isSafeInteger(entry.size)||entry.size<1024||entry.size>32*1024*1024)throw Error('Archivio PocketJS mancante o troppo grande');
 let bytes;
 if(entry.encoding==='base64'&&entry.content)bytes=bytesFromBase64(entry.content);
 else{
  const blob=await api(base+'/git/blobs/'+entry.sha);
  if(blob.encoding!=='base64'||!blob.content)throw Error('Archivio PocketJS non leggibile via GitHub');
  bytes=bytesFromBase64(blob.content);
 }
 if(bytes.length!==entry.size)throw Error('Dimensione archivio PocketJS incoerente');
 await checkBlob(bytes,entry.sha);
 return {repo,ref,path:POCKETJS_BOOTSTRAP,files:files||[POCKETJS_BOOTSTRAP],
  html:await unzipPocketJS(bytes),bytes:bytes.length,blob:entry.sha};
}
async function discover(input){
 const repo=normalizeRepo(input),base='https://api.github.com/repos/'+repo;
 if(repo===OWNER+'/NULLGOD-MUSIC'){
  const head=await api(base+'/commits/main');
  if(!shaPattern.test(head.sha||''))throw Error('Revisione GitHub non valida');
  return {repo,ref:head.sha,files:['dist/index.html'],path:'dist/index.html'};
 }
 const meta=await api(base);
 const commit=await api(base+'/commits/'+encodeURIComponent(meta.default_branch||'main'));
 if(!shaPattern.test(commit.sha||''))throw Error('Revisione GitHub non valida');
 const result=await api(base+'/git/trees/'+commit.sha+'?recursive=1');
 if(result.truncated)throw Error('Albero GitHub troppo grande: selezione automatica sospesa');
 if(repo===POCKETJS_REPO){
  const front=(result.tree||[]).find(x=>x.type==='blob'&&x.path==='web/index.html'&&x.size>1024*1024&&x.size<=12*1024*1024);
  if(!front)throw Error('PocketJS: frontend web/index.html completo non disponibile');
  return {repo,ref:commit.sha,files:['web/index.html'],path:'web/index.html'};
 }
 const files=(result.tree||[]).filter(x=>x.type==='blob'&&pathPattern.test(x.path)&&
  !/^(docs|tests|history|node_modules|vendor|tools|reports|fixtures|examples)\//i.test(x.path)&&x.size<=12*1024*1024)
  .map(x=>rank(x.path,repo)).sort(compare).map(x=>x.path);
 if(!files.length)throw Error('Nessuna build HTML candidata nel repository');
 return {repo,ref:commit.sha,files,path:files[0]};
}
function bytesFromBase64(data){
 const clean=String(data||'').replace(/\s+/g,'');
 const chunks=[];
 for(let i=0;i<clean.length;i+=8192){
  const raw=atob(clean.slice(i,i+8192));
  chunks.push(Uint8Array.from(raw,c=>c.charCodeAt(0)));
 }
 const n=chunks.reduce((sum,v)=>sum+v.length,0),out=new Uint8Array(n);
 let i=0;for(const chunk of chunks){out.set(chunk,i);i+=chunk.length}return out;
}
function sha1Fallback(bytes){
 const len=bytes.length,padded=Math.ceil((len+9)/64)*64,data=new Uint8Array(padded);
 data.set(bytes);data[len]=128;
 const view=new DataView(data.buffer),bits=len*8;
 view.setUint32(padded-8,Math.floor(bits/4294967296),false);view.setUint32(padded-4,bits>>>0,false);
 let h0=0x67452301,h1=0xefcdab89,h2=0x98badcfe,h3=0x10325476,h4=0xc3d2e1f0;
 const rot=(v,n)=>(v<<n)|(v>>>(32-n)),words=new Int32Array(80);
 for(let block=0;block<padded;block+=64){
  for(let i=0;i<16;i++)words[i]=view.getInt32(block+i*4,false);
  for(let i=16;i<80;i++)words[i]=rot(words[i-3]^words[i-8]^words[i-14]^words[i-16],1);
  let a=h0,b=h1,c=h2,d=h3,e=h4;
  for(let i=0;i<80;i++){
   let f,k;
   if(i<20){f=(b&c)|(~b&d);k=0x5a827999}
   else if(i<40){f=b^c^d;k=0x6ed9eba1}
   else if(i<60){f=(b&c)|(b&d)|(c&d);k=0x8f1bbcdc}
   else{f=b^c^d;k=0xca62c1d6}
   const t=(rot(a,5)+f+e+k+words[i])|0;
   e=d;d=c;c=rot(b,30);b=a;a=t;
  }
  h0=(h0+a)|0;h1=(h1+b)|0;h2=(h2+c)|0;h3=(h3+d)|0;h4=(h4+e)|0;
 }
 return [h0,h1,h2,h3,h4].map(x=>(x>>>0).toString(16).padStart(8,'0')).join('');
}
async function checkBlob(bytes,expectedSha){
 const header=new TextEncoder().encode('blob '+bytes.length+'\0');
 const input=new Uint8Array(header.length+bytes.length);input.set(header);input.set(bytes,header.length);
 const subtle=typeof crypto!=='undefined'&&crypto.subtle;
 const hex=subtle?Array.from(new Uint8Array(await subtle.digest('SHA-1',input)),c=>c.toString(16).padStart(2,'0')).join(''):sha1Fallback(input);
 if(hex!==expectedSha.toLowerCase())throw Error('Blob SHA-1 GitHub non corrispondente');
}
async function load(input){
 const repo=normalizeRepo(input.repo);
 let ref=input.ref,path=input.path;
 let files;
 if(!ref){const newest=await discover(repo);ref=newest.ref;files=newest.files;path=path||newest.path}
 if(!shaPattern.test(ref||''))throw Error('SHA GitHub completo richiesto');
 if(repo===POCKETJS_REPO&&path===POCKETJS_BOOTSTRAP){
  path='web/index.html';
 }
 if(repo===POCKETJS_REPO&&path!=='web/index.html')throw Error('Percorso PocketJS non autorizzato');
 safePath(path);
 const cacheKey=requestEpoch+'|'+repo+'|'+ref+'|'+path;
 const cached=verifiedHtmlCache.get(cacheKey);
 if(cached)return cached;
 const url='https://api.github.com/repos/'+repo+'/contents/'+path.split('/').map(encodeURIComponent).join('/')+'?ref='+ref;
 const entry=await api(url);
 if(entry.type!=='file'||!shaPattern.test(entry.sha||'')||!Number.isSafeInteger(entry.size)||entry.size>12*1024*1024)throw Error('HTML non disponibile o oltre 12 MiB');
 let bytes;
 if(entry.encoding==='base64'&&entry.content)bytes=bytesFromBase64(entry.content);
 else {
  const blob=await api('https://api.github.com/repos/'+repo+'/git/blobs/'+entry.sha);
  if(blob.encoding!=='base64'||!blob.content)throw Error('Blob GitHub non leggibile');
  bytes=bytesFromBase64(blob.content);
 }
 if(bytes.length!==entry.size)throw Error('Dimensione GitHub non corrispondente');
 await checkBlob(bytes,entry.sha);
 const html=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
 if(!/^\s*(?:<!doctype\s+html|<html\b)/i.test(html))throw Error('File non riconosciuto come documento HTML');
 const verified={repo,ref,path,files,html,bytes:bytes.length,blob:entry.sha};
 verifiedHtmlCache.set(cacheKey,verified);
 if(verifiedHtmlCache.size>8)verifiedHtmlCache.delete(verifiedHtmlCache.keys().next().value);
 return verified;
}
const mediaPattern=/^(?:[A-Za-z0-9_.-]+\/){0,5}[A-Za-z0-9_.-]+\.(?:adf|d64|t64|prg)$/i;
const biosPattern=/^(?:[A-Za-z0-9_.-]+\/){0,5}[A-Za-z0-9_.-]+\.(?:rom|bin|kick|a500|a1200)$/i;
async function discoverMedia(input){
 const repo=normalizeRepo(input),base='https://api.github.com/repos/'+repo;
 const commit=requestedRef?{sha:requestedRef}:(async()=>{
  const meta=await api(base);return api(base+'/commits/'+encodeURIComponent(meta.default_branch||'main'));
 })();
 const resolved=await commit;
 if(!shaPattern.test(resolved.sha||''))throw Error('Revisione GitHub non valida');
 const tree=await api(base+'/git/trees/'+resolved.sha+'?recursive=1');
 if(tree.truncated)throw Error('Albero GitHub troppo grande');
 const files=(tree.tree||[]).filter(x=>x.type==='blob'&&mediaPattern.test(x.path)&&
  x.size>0&&x.size<=3*1024*1024&&!/^(history|tests|docs|vendor|fixtures|node_modules)\//i.test(x.path))
  .map(x=>x.path).sort();
 if(!files.length)throw Error('Nessun ADF/D64/T64/PRG disponibile nel repository autorizzato');
 const biosFiles=meta.private===true&&!!token?(tree.tree||[]).filter(x=>x.type==='blob'&&biosPattern.test(x.path)&&x.size>=8192&&x.size<=2*1024*1024).map(x=>x.path).sort():[];
 return {repo,ref:commit.sha,files,path:files[0],biosFiles};
}
async function loadMedia(input){
 const repo=normalizeRepo(input.repo);
 let ref=input.ref,path=input.path,files;
 if(!ref){const newest=await discoverMedia(repo);ref=newest.ref;files=newest.files;path=path||newest.path}
 if(!shaPattern.test(ref||'')||!mediaPattern.test(path||''))throw Error('Revisione o supporto non valido');
 const entry=await api('https://api.github.com/repos/'+repo+'/contents/'+path.split('/').map(encodeURIComponent).join('/')+'?ref='+ref);
 if(entry.type!=='file'||!shaPattern.test(entry.sha||'')||!Number.isSafeInteger(entry.size)||entry.size<1||entry.size>3*1024*1024)throw Error('Supporto non disponibile o troppo grande');
 let bytes;
 if(entry.encoding==='base64'&&entry.content)bytes=bytesFromBase64(entry.content);
 else {
  const blob=await api('https://api.github.com/repos/'+repo+'/git/blobs/'+entry.sha);
  if(blob.encoding!=='base64'||!blob.content)throw Error('Blob binario non leggibile');
  bytes=bytesFromBase64(blob.content);
 }
 if(bytes.length!==entry.size)throw Error('Dimensione del supporto non corrispondente');
 await checkBlob(bytes,entry.sha);
 return {repo,ref,path,files,media:new Blob([bytes],{type:'application/octet-stream'}),bytes:bytes.length,blob:entry.sha};
}
async function loadBios(input){
 const repo=normalizeRepo(input.repo),ref=input.ref,path=input.path;
 if(!token)throw Error('Kickstart remota consentita solo con accesso privato autorizzato');
 if(!shaPattern.test(ref||'')||!biosPattern.test(path||''))throw Error('Percorso Kickstart o SHA non valido');
 const base='https://api.github.com/repos/'+repo;
 const meta=await api(base);
 if(meta.private!==true)throw Error('Le ROM non devono essere pubblicate in repository pubblici');
 const item=await api(base+'/contents/'+path.split('/').map(encodeURIComponent).join('/')+'?ref='+ref);
 if(item.type!=='file'||!shaPattern.test(item.sha||'')||!Number.isSafeInteger(item.size)||item.size<8192||item.size>2*1024*1024)throw Error('Kickstart privata non valida');
 let bytes;
 if(item.encoding==='base64'&&item.content)bytes=bytesFromBase64(item.content);
 else {
  const blob=await api(base+'/git/blobs/'+item.sha);
  if(blob.encoding!=='base64'||!blob.content)throw Error('ROM privata non leggibile');
  bytes=bytesFromBase64(blob.content);
 }
 if(bytes.length!==item.size)throw Error('Dimensione Kickstart non corrispondente');
 await checkBlob(bytes,item.sha);
 return {ref,path,bios:new Blob([bytes],{type:'application/octet-stream'}),bytes:bytes.length};
}
const textPattern=/^(?:[A-Za-z0-9_.-]+\/){0,6}[A-Za-z0-9_.-]+\.(?:md|txt|json|js|mjs|cjs|ts|css|html?|py|c|cpp|h|hpp|asm|s|yml|yaml|toml|ini|sh|ps1|bat|cmd|xml|csv|java|kt|rs|go|lua|scad)$/i;
async function discoverFiles(input,requestedRef=''){
 const repo=normalizeRepo(input),base='https://api.github.com/repos/'+repo;
 const commit=requestedRef?{sha:requestedRef}:await (async()=>{
  const meta=await api(base);
  return api(base+'/commits/'+encodeURIComponent(meta.default_branch||'main'));
 })();
 if(!shaPattern.test(commit.sha||''))throw Error('Revisione GitHub non valida');
 const tree=await api(base+'/git/trees/'+commit.sha+'?recursive=1');
 if(tree.truncated)throw Error('Repository troppo grande per il visualizzatore sorgenti');
 const files=(tree.tree||[]).filter(x=>x.type==='blob'&&textPattern.test(x.path)&&x.size>=0&&x.size<=1024*1024&&!/(?:^|\/)(?:node_modules|vendor|\.git|\.private|private-media)\//i.test(x.path))
  .map(x=>x.path).sort((a,b)=>{
   const rank=p=>/^readme\.md$/i.test(p)?0:/^(?:docs\/)?(?:status|overview|readme)\.md$/i.test(p)?1:/^src\//i.test(p)?2:3;
   return rank(a)-rank(b)||a.localeCompare(b);
  }).slice(0,800);
 if(!files.length)throw Error('Nessun file di testo visualizzabile nel repository');
 return {repo,ref:commit.sha,files,path:files[0]};
}
async function loadText(input){
 const repo=normalizeRepo(input.repo),ref=input.ref,path=input.path;
 if(!shaPattern.test(ref||'')||!textPattern.test(path||''))throw Error('Percorso sorgente o SHA GitHub non valido');
 const base='https://api.github.com/repos/'+repo;
 const entry=await api(base+'/contents/'+path.split('/').map(encodeURIComponent).join('/')+'?ref='+ref);
 if(entry.type!=='file'||!shaPattern.test(entry.sha||'')||!Number.isSafeInteger(entry.size)||entry.size>1024*1024)throw Error('Sorgente oltre 1 MiB o non leggibile');
 let bytes;
 if(entry.encoding==='base64'&&entry.content)bytes=bytesFromBase64(entry.content);
 else {
  const blob=await api(base+'/git/blobs/'+entry.sha);
  if(blob.encoding!=='base64'||!blob.content)throw Error('Blob sorgente non leggibile');
  bytes=bytesFromBase64(blob.content);
 }
 if(bytes.length!==entry.size)throw Error('Dimensione sorgente non corrispondente');
 await checkBlob(bytes,entry.sha);
 const output=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
 return {repo,ref,path,content:output,bytes:bytes.length};
}
function b64(bytes){let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.slice(i,i+8192));return btoa(s)}
async function keyFor(password,salt){
 const imported=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:260000,hash:'SHA-256'},imported,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
async function setToken(value,password,remember){
 value=String(value||'').trim();if(value.length<16)throw Error('Token GitHub mancante');
 if(remember){
  if(String(password).length<12)throw Error('Password locale: almeno 12 caratteri');
  const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
  const k=await keyFor(password,salt);
  const payload=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},k,new TextEncoder().encode(value)));
  localStorage.setItem(STORAGE,JSON.stringify({v:1,salt:b64(salt),iv:b64(iv),payload:b64(payload)}));
 }
 if(token!==value){requestEpoch++;requestCache.clear();verifiedHtmlCache.clear();blockedUntil=0}
 token=value;
}
async function unlock(password){
 const raw=localStorage.getItem(STORAGE);if(!raw)throw Error('Nessun token cifrato presente');
 const obj=JSON.parse(raw);if(obj.v!==1)throw Error('Archivio token incompatibile');
 const k=await keyFor(password,bytesFromBase64(obj.salt));
 token=new TextDecoder('utf-8',{fatal:true}).decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:bytesFromBase64(obj.iv)},k,bytesFromBase64(obj.payload)));
}
function forget(){token='';requestEpoch++;requestCache.clear();verifiedHtmlCache.clear();blockedUntil=0;localStorage.removeItem(STORAGE)}
function selloneVersionNumber(value){
 const m=String(value||'').match(/(?:^|[^\da-z])v?(\d+(?:[._-]\d+){1,5})(?=[^\da-z]|$)/i);
 return m?m[1].replace(/[_-]/g,'.'):'';
}
function selloneVersionCompare(a,b){
 const x=String(a||'').split('.').map(Number),y=String(b||'').split('.').map(Number);
 for(let i=0;i<Math.max(x.length,y.length);i++){
  if((x[i]||0)!==(y[i]||0))return (y[i]||0)-(x[i]||0);
 }
 return 0;
}
async function selloneVersions(name,page=1){
 if(!Number.isSafeInteger(page)||page<1||page>10000)throw Error('Pagina revisioni non valida');
 const repo=normalizeRepo(name),base='https://api.github.com/repos/'+repo;
 const perPage=20;
 const [head,commits]=await Promise.all([
  page===1?discover(name):Promise.resolve(null),
  api(base+'/commits?per_page='+perPage+'&page='+page)
 ]);
 const files=head?head.files.map(path=>{
  const version=selloneVersionNumber(path.split('/').pop());
  return version?{kind:'file',name:'v'+version,version,ref:head.ref,path,sha:head.ref,
   description:'Build HTML presente nel repository',date:''}:null
 }).filter(Boolean).sort((a,b)=>selloneVersionCompare(a.version,b.version)).slice(0,60):[];
 const revisions=(Array.isArray(commits)?commits:[]).filter(c=>shaPattern.test(c.sha||'')).map(c=>{
  const message=String(c.commit?.message||'').split('\n')[0].slice(0,100),version=selloneVersionNumber(message);
  return {kind:'commit',name:version?'v'+version:'Revisione '+c.sha.slice(0,8),
   version,ref:c.sha,sha:c.sha,path:null,defaultPath:head?.path||'',
   date:c.commit?.committer?.date||c.commit?.author?.date||'',description:message};
 });
 return {files,revisions,head:head?.ref||'',page,hasMore:revisions.length===perPage};
}
const selloneRevisionCache=new Map();
async function selloneRevisionDetails(name,sha,preferred=''){
 if(!shaPattern.test(sha||''))throw Error('SHA revisione non valido');
 const repo=normalizeRepo(name),key=repo+':'+sha;
 if(selloneRevisionCache.has(key))return selloneRevisionCache.get(key);
 const tree=await api('https://api.github.com/repos/'+repo+'/git/trees/'+sha+'?recursive=1');
 if(tree.truncated)throw Error('Albero GitHub incompleto: dimensione non calcolabile');
 const blobs=(tree.tree||[]).filter(x=>x.type==='blob'&&Number.isSafeInteger(x.size)&&x.size>=0);
 const totalBytes=blobs.reduce((sum,x)=>sum+x.size,0);
 const html=blobs.filter(x=>pathPattern.test(x.path)&&x.size<=12*1024*1024&&
  !/^(docs|tests|history|node_modules|vendor|tools|reports|fixtures|examples)\//i.test(x.path));
 const choices=html.map(x=>rank(x.path,repo)).sort(compare);
 const path=html.some(x=>x.path===preferred)?preferred:choices[0]?.path||'';
 const bytes=html.find(x=>x.path===path)?.size??null;
 const result={repo,sha,path,bytes,totalBytes};
 selloneRevisionCache.set(key,result);
 if(selloneRevisionCache.size>120)selloneRevisionCache.delete(selloneRevisionCache.keys().next().value);
 return result;
}
async function selloneHistoricalPath(name,sha,preferred){
 const info=await selloneRevisionDetails(name,sha,preferred);
 if(!info.path)throw Error('Revisione senza build HTML: apri i sorgenti');
 return info.path;
}
window.SelloneGitHub=Object.freeze({selloneVersions,selloneRevisionDetails,selloneHistoricalPath,normalizeRepo,discover,load,discoverMedia,loadMedia,loadBios,discoverFiles,loadText,setToken,unlock,forget,hasToken:()=>!!token,hasSavedToken:()=>!!localStorage.getItem(STORAGE)});
})();
;
/* web-bundler.js */
/* Sellone isolated module packager.
 * Fetches same-commit, SHA-checked CSS/ES modules via the parent GitHub loader.
 * No credentials are inserted in HTML, iframe URLs, or module contents.
 */
(()=>{'use strict';
const MAX_MODULES=96,MAX_BYTES=10*1024*1024;
const moduleExt=/\.(?:js|mjs)$/i,cssExt=/\.css$/i;
const textEncoder=new TextEncoder();
const importStatic=/(^\s*(?:import|export)\s+(?:[^\n;'"]*\bfrom\s*)?)(['"])(\.\.?\/[^'"]+)\2/gm;
const importDynamic=/(\bimport\s*\(\s*)(['"])(\.\.?\/[^'"]+)\2(\s*\))/g;
function encode(bytes){
 let result='';for(let i=0;i<bytes.length;i+=8192)result+=String.fromCharCode(...bytes.subarray(i,i+8192));
 return btoa(result);
}
function localReference(reference){
 return typeof reference==='string' && !/^(?:[a-z][a-z0-9+.-]*:|\/)/i.test(reference) && !/[?#\\]/.test(reference);
}
function normalize(reference,base,ext){
 if(!localReference(reference))throw Error('Risorsa non locale: '+reference);
 const segments=base.split('/');segments.pop();
 for(const part of reference.split('/')){
  if(part==='.'||part==='')continue;
  if(part==='..'){if(!segments.length)throw Error('Import fuori repository: '+reference);segments.pop()}
  else if(!/^[A-Za-z0-9_.-]+$/.test(part))throw Error('Percorso risorsa non valido: '+reference);
  else segments.push(part);
 }
 const path=segments.join('/');
 if(!path||path.length>250||!ext.test(path))throw Error('Estensione risorsa non supportata: '+reference);
 return path;
}
function attribute(raw,key){
 const re=new RegExp('(?:^|\\s)'+key+'\\s*=\\s*(?:"([^"]*)"|\\x27([^\\x27]*)\\x27)','i');
 const m=re.exec(raw);return m?m[1]??m[2]:null;
}
function extractScriptUrls(html){
 const result=[];
 const pattern=/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
 for(const match of html.matchAll(pattern)){
  const type=attribute(match[1],'type');
  const src=attribute(match[1],'src');
  if(src&&(!type||['module','text/javascript','application/javascript'].includes(type.toLowerCase())))result.push({src,kind:type?.toLowerCase()==='module'?'module':'classic'});
 }
 return result;
}
function dependencies(source,origin){
 const targets=new Set();
 for(const re of [importStatic,importDynamic]){
  re.lastIndex=0;
  for(const match of source.matchAll(re)){
   targets.add(normalize(match[3],origin,moduleExt));
  }
 }
 return [...targets];
}
function transform(source,path){
 const rewrite=(spec)=>'@sellone/'+normalize(spec,path,moduleExt);
 return source.replace(importStatic,(match,pre,quote,spec)=>pre+quote+rewrite(spec)+quote)
  .replace(importDynamic,(match,pre,quote,spec,tail)=>pre+quote+rewrite(spec)+quote+tail);
}
function looseCSP(html){
 const safePolicy=[
  "default-src 'none'","base-uri 'none'","connect-src 'none'",
  "form-action 'none'","object-src 'none'","frame-src 'none'",
  "style-src 'unsafe-inline' data:","img-src data: blob:",
  "font-src data:","media-src data: blob:",
  "script-src 'unsafe-inline' data: blob:"
 ].join('; ');
 const existing=/<meta\b(?=[^>]*\bhttp-equiv\s*=\s*["']content-security-policy["'])[^>]*>/gi;
 html=html.replace(existing,'');
 const tag='<meta http-equiv="Content-Security-Policy" content="'+safePolicy+'">';
 if(/<head\b[^>]*>/i.test(html))return html.replace(/<head\b[^>]*>/i,m=>m+tag);
 return '<head>'+tag+'</head>'+html;
}
async function prepare(result,loader=window.SelloneGitHub){
 if(!result||typeof result.html!=='string'||!result.repo||!result.ref||!result.path)throw Error('Build GitHub non verificata');
 const html=result.html;
 const links=[];
 const styles=/<link\b[^>]*>/gi;
 for(const m of html.matchAll(styles)){
  const rel=attribute(m[0],'rel'),href=attribute(m[0],'href');
  if(rel&&rel.toLowerCase().split(/\s+/).includes('stylesheet')&&href){
   links.push({markup:m[0],url:href});
  }
 }
 const scripts=extractScriptUrls(html);
 if(!links.length&&!scripts.length)return {...result,assetCount:0,moduleCount:0,packaged:false};
 const fetched=new Map();
 let total=0;
 async function get(path){
  if(fetched.has(path))return fetched.get(path);
  if(fetched.size>=MAX_MODULES)throw Error('Troppe dipendenze JS: massimo '+MAX_MODULES);
  const promise=loader.loadText({repo:result.repo,ref:result.ref,path}).then(item=>{
   if(item.path!==path||item.ref!==result.ref||typeof item.content!=='string')throw Error('Dipendenza GitHub non verificabile: '+path);
   total+=item.bytes;
   if(total>MAX_BYTES)throw Error('Dipendenze troppo grandi');
   return item.content;
  });
  fetched.set(path,promise);
  return promise;
 }
 const modules=new Map();
 async function visit(path){
  if(modules.has(path))return;
  modules.set(path,null);
  const source=await get(path);
  const deps=dependencies(source,path);
  await Promise.all(deps.map(visit));
  modules.set(path,transform(source,path));
 }
 const roots=[],classicRoots=[];
 for(const script of scripts){
  if(!localReference(script.src))throw Error('Script remoto non incorporabile: '+script.src);
  const path=normalize(script.src,result.path,moduleExt);
  if(script.kind==='module')roots.push(path);else classicRoots.push(path);
 }
 await Promise.all(roots.map(visit));
 const classics=new Map();
 await Promise.all(classicRoots.map(async path=>{classics.set(path,await get(path))}));
 let output=html;
 for(const link of links){
  if(!localReference(link.url))throw Error('CSS remoto non incorporabile: '+link.url);
  const path=normalize(link.url,result.path,cssExt);
  const css=await get(path);
  if(/url\s*\(\s*(?!['"]?(?:data:|#))\S/i.test(css))
   throw Error('CSS con file esterni non supportati: '+path);
  output=output.replace(link.markup,'<style data-sellone-asset="'+path+'">'+css.replace(/<\/style/gi,'<\\/style')+'</style>');
 }
 const imports={};
 for(const [path,source] of modules){
  imports['@sellone/'+path]='data:text/javascript;base64,'+encode(textEncoder.encode(source));
 }
 const map='<script type="importmap">'+JSON.stringify({imports}).replace(/</g,'\\u003c')+'</script>';
 output=output.replace(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi,(full,attrs,body)=>{
  const src=attribute(attrs,'src'),type=attribute(attrs,'type');
  if(!src)return full;
  if(type&& !['module','text/javascript','application/javascript'].includes(type.toLowerCase()))return full;
  const path=normalize(src,result.path,moduleExt);
  if(type?.toLowerCase()==='module')return '<script type="module" data-sellone-entry="'+path+'">import "@sellone/'+path+'";</script>';
  const source=classics.get(path);
  if(source===undefined)throw Error('Script classico mancante: '+path);
  return '<script data-sellone-entry="'+path+'">'+source.replace(/<\/script/gi,'<\\/script')+'</script>';
 });
 output=looseCSP(output);
 const i=output.search(/<script\b/i);
 if(i>=0)output=output.slice(0,i)+map+output.slice(i);
 else output+=map;
 return {...result,html:output,assetCount:fetched.size,moduleCount:modules.size,packaged:true};
}
window.SelloneBundle=Object.freeze({prepare});
})();
;
/* retro-runtime.js */
/* Shared invisible retro media adapter for Sellone WebPlayer. */
(()=>{'use strict';
const CACHE='sellone-retro-session-v1';
const allow={adf:'amiga',d64:'c64',t64:'c64',prg:'c64'};
const maxBytes=3*1024*1024;
let session=null;
const secure=location.protocol==='https:'||['localhost','127.0.0.1'].includes(location.hostname);
function format(name){const m=/\.([a-z0-9]+)$/i.exec(String(name||''));return m?m[1].toLowerCase():''}
function supported(file){const type=format(file?.name||'');return !!allow[type]&&file.size>0&&file.size<=maxBytes}
function needsKick(file){return format(file?.name)==='adf'}
function validKick(file){return file&&/\.(?:rom|bin|kick|a500|a1200)$/i.test(file.name)&&file.size>=8192&&file.size<=2*1024*1024}
async function worker(){
 if(!secure||!('serviceWorker' in navigator)||!('caches' in window))
  throw Error('Per il core retro servono HTTPS/localhost, Service Worker e CacheStorage');
 const reg=await navigator.serviceWorker.register('./retro/sw.js',{scope:'./retro/'});
 if(!reg.active){
  const w=reg.installing||reg.waiting;
  if(!w)throw Error('Service Worker non pronto: ricarica la pagina');
  await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(Error('Service Worker non attivo')),9000);
   const onState=()=>{if(w.state==='activated'){clearTimeout(timer);resolve()}else if(w.state==='redundant'){clearTimeout(timer);reject(Error('Service Worker non attivo'))}};
   w.addEventListener('statechange',onState);onState();
  });
 }
}
async function stop(){
 const s=session;session=null;
 if(!s)return;
 s.frame.src='about:blank';s.frame.remove();
 try{const cache=await caches.open(CACHE);await Promise.all(s.urls.map(url=>cache.delete(url)))}catch{}
}
async function start({media,bios,title,host,onStatus,channel=null}){
 if(!media||!supported(media))throw Error('Supporto non valido: ADF, D64, T64 o PRG fino a 3 MiB');
 if(needsKick(media)&&bios&&!validKick(bios))throw Error('Kickstart selezionata non valida');
 if(!host)throw Error('Schermo WebPlayer non disponibile');
 await stop();await worker();
 const ext=format(media.name),core=allow[ext];
 const id=typeof crypto.randomUUID==='function'?crypto.randomUUID():Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');
 const prefix=new URL('./retro/virtual/'+id+'/',location.href);
 const diskUrl=new URL('disk.'+ext,prefix).href;
 const biosUrl=bios?new URL('kick.rom',prefix).href:null;
 const urls=[diskUrl,...(biosUrl?[biosUrl]:[])];
 const cache=await caches.open(CACHE);
 try{
  await cache.put(diskUrl,new Response(media,{headers:{'Content-Type':'application/octet-stream','Cache-Control':'no-store'}}));
  if(biosUrl)await cache.put(biosUrl,new Response(bios,{headers:{'Content-Type':'application/octet-stream','Cache-Control':'no-store'}}));
  const frame=document.createElement('iframe');
  frame.title=title+' · '+(core==='amiga'?'PUAE':'VICE');
  frame.allow='fullscreen; gamepad';frame.allowFullscreen=true;frame.className='retro-frame';
  frame.src='./retro/emu.html';
  host.replaceChildren(frame);
  session={frame,urls,onStatus};
  frame.addEventListener('load',()=>{
   if(!session||session.frame!==frame)return;
   frame.contentWindow.postMessage({type:'SELLONE_RETRO_BOOT_V1',mediaUrl:diskUrl,biosUrl,core,title,channel},location.origin);
   onStatus?.('Core '+(core==='amiga'?'PUAE / Amiga':'VICE / Commodore 64')+' inizializzato; verifica il boot sullo schermo.');
  },{once:true});
 }catch(e){
  await Promise.all(urls.map(url=>cache.delete(url).catch(()=>{})));
  throw e;
 }
}
window.addEventListener('message',event=>{
 if(event.origin!==location.origin||event.data?.type!=='SELLONE_RETRO_ERROR_V1'||event.source!==session?.frame?.contentWindow)return;
 session.onStatus?.(String(event.data.message||'Errore nel core retro'),true);
});
if('caches' in window)caches.delete(CACHE).catch(()=>{});
window.SelloneRetro=Object.freeze({start,stop,supported,needsKick,validKick,frame:()=>session?.frame||null});
window.addEventListener('pagehide',()=>{stop().catch(()=>{})});
})();
;
/* host-bridge.js */
/* Browser capabilities delegated to selected GitHub clients in opaque iframes.
 * No GitHub credentials or raw media tracks are ever sent into guest code.
 */
(()=>{'use strict';
let frame=null,channel='',camera=null,video=null,panel=null,tick=null,busy=false;
function current(){return frame?.contentWindow||null}
function send(data,transfer){const w=current();if(!w)return;try{w.postMessage({...data,channel},'*',transfer||[])}catch{}}
function stopCamera(){
 activeCameraRequest++;
 if(tick){clearInterval(tick);tick=null}
 if(camera){for(const track of camera.getTracks())track.stop();camera=null}
 if(panel){panel.remove();panel=null;video=null}
 busy=false;
}
function disable(){stopCamera();frame=null;channel=''}
function enable(nextFrame,nextChannel){
 disable();
 if(!nextFrame||typeof nextChannel!=='string'||!/^s-[a-f0-9]{32}$/.test(nextChannel))throw Error('Canale bridge non valido');
 frame=nextFrame;channel=nextChannel;
}
async function digest(request){
 const id=request.id;
 if(!Number.isSafeInteger(id)||id<1||!(request.bytes instanceof ArrayBuffer)||request.bytes.byteLength>64*1024*1024){
  send({type:'SELLONE_BRIDGE_SHA_REPLY',id,error:'Buffer SHA-256 non valido'});return;
 }
 try{
  const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',request.bytes));
  const hash=Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('');
  send({type:'SELLONE_BRIDGE_SHA_REPLY',id,hash});
 }catch(error){send({type:'SELLONE_BRIDGE_SHA_REPLY',id,error:String(error.message||error)})}
}
let activeCameraRequest=0;
function ensureScannerOverlay(){
 if(panel)return;
 panel=document.createElement('div');
 panel.id='selloneQrScannerOverlay';
 panel.setAttribute('role','dialog');
 panel.setAttribute('aria-label','Lettore QR OBSCURA/TUNNEL');
 panel.style.cssText='position:fixed;inset:0;z-index:2147483000;background:#080b14f5;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:18px;color:#fff;font:15px system-ui';
 const heading=document.createElement('div');heading.textContent='OBSCURA/TUNNEL · Scansione QR';
 heading.style.cssText='font-weight:600;text-align:center';
 const detail=document.createElement('div');detail.id='selloneCameraStatus';detail.textContent='Preparazione della fotocamera…';
 detail.style.cssText='color:#b5d7d6;max-width:420px;text-align:center;font-size:13px';
 video=document.createElement('video');video.playsInline=true;video.autoplay=true;video.muted=true;
 video.style.cssText='width:min(90vw,680px);max-height:62svh;object-fit:contain;border:2px solid #57d7c2;border-radius:12px;background:#000';
 const start=document.createElement('button');start.type='button';start.id='selloneCameraActivate';
 start.textContent='Attiva fotocamera';start.style.cssText='border-radius:10px;padding:14px 20px;background:#167f77;color:white;border:1px solid #54d9c1;cursor:pointer';
 start.onclick=()=>{void acquireCamera(true)};
 const close=document.createElement('button');close.type='button';close.textContent='Chiudi scanner';close.style.cssText='border-radius:10px;padding:12px 18px;background:#30415e;color:white;border:1px solid #6e8da9;cursor:pointer';
 close.onclick=()=>{stopCamera();send({type:'SELLONE_BRIDGE_CAMERA_CLOSED'})};
 panel.append(heading,detail,video,start,close);
 document.body.append(panel);
}
function scanStatus(message){const detail=panel?.querySelector('#selloneCameraStatus');if(detail)detail.textContent=message}
async function acquireCamera(userGesture){
 if(camera||!panel)return;
 const generation=activeCameraRequest;
 const button=panel.querySelector('#selloneCameraActivate');
 if(button){button.disabled=true;button.textContent='Apertura fotocamera…'}
 scanStatus('Richiesta accesso alla fotocamera…');
 if(!navigator.mediaDevices?.getUserMedia){
  scanStatus('Fotocamera non disponibile nel browser o permesso negato.');
  send({type:'SELLONE_BRIDGE_CAMERA_ERROR',error:'getUserMedia non disponibile'});
  if(button){button.disabled=false;button.textContent='Riprova fotocamera'}
  return;
 }
 try{
  const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'}}});
  if(generation!==activeCameraRequest||!panel||!current()){stream.getTracks().forEach(t=>t.stop());return}
  camera=stream;video.srcObject=camera;
  await video.play();
  if(generation!==activeCameraRequest)return;
  scanStatus('Inquadra il codice QR sull’altro dispositivo.');
  if(button)button.hidden=true;
  send({type:'SELLONE_BRIDGE_CAMERA_OPENED'});
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});
  tick=setInterval(()=>{
   if(!video||busy||video.readyState<2||!ctx)return;
   busy=true;
   try{
    const w=video.videoWidth,h=video.videoHeight,scale=Math.min(1,720/Math.max(w,h));
    canvas.width=Math.max(1,Math.floor(w*scale));canvas.height=Math.max(1,Math.floor(h*scale));
    ctx.drawImage(video,0,0,canvas.width,canvas.height);
    const image=ctx.getImageData(0,0,canvas.width,canvas.height);
    send({type:'SELLONE_BRIDGE_CAMERA_FRAME',width:canvas.width,height:canvas.height,pixels:image.data},[image.data.buffer]);
   }catch{}finally{busy=false}
  },450);
 }catch(error){
  if(generation!==activeCameraRequest)return;
  const message=String(error?.message||error);
  scanStatus('Fotocamera non avviata: '+message+'. Tocca «Attiva fotocamera» per riprovare.');
  if(button){button.disabled=false;button.hidden=false;button.textContent='Attiva fotocamera'}
  if(userGesture)send({type:'SELLONE_BRIDGE_CAMERA_ERROR',error:message});
 }
}
async function startCamera(){
 ensureScannerOverlay();
 if(camera){send({type:'SELLONE_BRIDGE_CAMERA_OPENED'});return}
 if(!panel)return;
 await acquireCamera(false);
}
window.addEventListener('message',e=>{
 if(!frame||e.source!==current()||!e.data||e.data.channel!==channel)return;
 const msg=e.data;
 if(msg.type==='SELLONE_BRIDGE_SHA_REQUEST'){void digest(msg);return}
 if(msg.type==='SELLONE_BRIDGE_CAMERA_START'){void startCamera();return}
 if(msg.type==='SELLONE_BRIDGE_CAMERA_STOP'){stopCamera();return}
});
window.addEventListener('pagehide',stopCamera);
window.SelloneBridgeHost=Object.freeze({enable,disable});
})();
;
/* catalog-organizer.js */
/* Sellone WebViewer: catalog organization and release freshness.
 * Category is a product property, not an emulator/viewer runtime.
 * ES5-compatible browser global plus CommonJS for isolated tests.
 */
(function(global){
 "use strict";
 const HOURS=3600000;
 const CATEGORIES=Object.freeze([
  {id:"games",label:"Giochi & porting"},
  {id:"retro",label:"Emulatori & retro"},
  {id:"audio",label:"Audio & voce"},
  {id:"communication",label:"Rete & comunicazione"},
  {id:"systems",label:"Sistemi & piattaforme"},
  {id:"tools",label:"Tool & sviluppo"},
  {id:"research",label:"Archivi & ricerca"},
  {id:"web",label:"Web & servizi"},
  {id:"other",label:"Altri"}
 ]);
 const known=new Set(CATEGORIES.map(c=>c.id));
 const collator=new Intl.Collator("it",{sensitivity:"base",numeric:true});
 function categoryOf(item){
  if(known.has(item?.category))return item.category;
  const kind=String(item?.kind||"").toLocaleLowerCase("it");
  if(kind==="gioco")return "games";
  if(kind==="musica")return "audio";
  if(kind==="emulatore"||item?.viewer_type==="amiga_media")return "retro";
  if(kind==="archivio"||item?.viewer_type==="archive")return "research";
  if(kind==="utility")return "tools";
  if(kind==="sistema")return "systems";
  return "other";
 }
 function dateMillis(value,now=Date.now()){
  if(typeof value!=="string"||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(value))return 0;
  const ms=Date.parse(value);
  return Number.isFinite(ms)&&ms>0&&ms<=now+5*60000?ms:0;
 }
 function updatedAt(item){return item?.released_at||item?.updated_at||"";}
 function badgeState(date,now=Date.now()){
  const timestamp=dateMillis(date,now);
  if(!timestamp||timestamp>now)return null;
  const age=now-timestamp;
  if(age>=48*HOURS)return null;
  if(age<6*HOURS)return "blink";
  if(age<24*HOURS)return "fresh";
  return "dark";
 }
 function sortProjects(items,mode="recent",now=Date.now()){
  return [...items].sort((a,b)=>{
   if(mode!=="az"){
    const ta=dateMillis(updatedAt(a),now),tb=dateMillis(updatedAt(b),now);
    if(ta!==tb)return tb-ta;
   }
   return collator.compare(a.title||a.repo||"",b.title||b.repo||"");
  });
 }
 function norm(value){
  return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("it").trim();
 }
 function filterProjects(items,{filter="",category="all"}={}){
  const needle=norm(filter);
  return items.filter(item=>{
   const key=categoryOf(item);
   if(category!=="all"&&key!==category)return false;
   if(!needle)return true;
   const name=CATEGORIES.find(c=>c.id===key)?.label||"";
   return norm([item.title,item.repo,item.kind,item.description,name].join(" ")).includes(needle);
  });
 }
 function groupedProjects(items,{filter="",category="all",sort="recent",now=Date.now()}={}){
  const matching=filterProjects(items,{filter,category});
  return CATEGORIES.map(({id,label})=>({
   id,label,items:sortProjects(matching.filter(item=>categoryOf(item)===id),sort,now)
  })).filter(group=>group.items.length);
 }
 const API=Object.freeze({CATEGORIES,categoryOf,dateMillis,updatedAt,badgeState,
  sortProjects,filterProjects,groupedProjects});
 global.SelloneCatalogSort=API;
 if(typeof module!=="undefined"&&module.exports)module.exports=API;
})(typeof globalThis!=="undefined"?globalThis:this);
;
/* catalog-ui.js */
/* Sellone WebViewer: grouped project catalog, verified freshness metadata.
 * Public GitHub metadata is optional: no token, private project enumeration,
 * invented dates, client dependencies, or alternate viewer runtimes.
 */
(function(global){
 "use strict";
 const Organizer=global.SelloneCatalogSort;
 const $=id=>document.getElementById(id);
 const get=key=>{try{return localStorage.getItem(key)||""}catch{return""}};
 const set=(key,value)=>{try{localStorage.setItem(key,value)}catch{}};
 const CACHE="sellone-viewer-revisions-v1",TTL=15*60000;
 const validRepo=/^[A-Za-z0-9_.-]{1,100}$/;
 let projects=[],makeCard=()=>document.createElement("article");
 let sortMode=get("sellone-viewer-sort")==="az"?"az":"recent";
 let categoryMode=Organizer?.CATEGORIES.some(c=>c.id===get("sellone-viewer-category"))?
   get("sellone-viewer-category"):"all";
 let currentSearch="",timerStarted=false,active=true;
 function element(tag,className,text){
  const node=document.createElement(tag);
  if(className)node.className=className;
  if(text!==undefined)node.textContent=text;
  return node;
 }
 function freshness(row,date){
  const status=Organizer.badgeState(date);
  let marker=row.querySelector(".new-badge");
  if(!status){marker?.remove();return;}
  if(!marker){marker=element("span","new-badge","NEW");row.append(marker);}
  marker.className="new-badge "+(status==="blink"?"is-blink":status==="dark"?"is-dark":"is-fresh");
  marker.title=status==="blink"?"Aggiornato nelle ultime 6 ore":
    status==="fresh"?"Aggiornato nelle ultime 24 ore":"Aggiornato nelle ultime 48 ore";
 }
 function decorate(card,item){
  const date=Organizer.updatedAt(item);
  if(!Organizer.dateMillis(date))return card;
  const row=element("div","project-release");
  row.dataset.date=date;
  row.append(element("span","",item.released_at?"Rilascio":"Aggiornato"));
  const time=element("time","",new Intl.DateTimeFormat("it-IT",{
   day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"
  }).format(new Date(date)));
  time.dateTime=date;
  time.title=item.released_at?"Data rilascio ufficiale":"Ultimo push verificato, non necessariamente una release";
  row.append(time);freshness(row,date);
  const actions=card.querySelector(".actions");
  if(actions)card.insertBefore(row,actions);else card.append(row);
  return card;
 }
 function refreshBadges(){
  if(!active)return;
  for(const row of ($("grid")?.querySelectorAll(".project-release[data-date]")||[]))
   freshness(row,row.dataset.date);
 }
 function list(items=projects,search=currentSearch,card=makeCard){
  if(!Organizer)throw Error("Organizzatore del catalogo assente");
  currentSearch=String(search||"");
  const groups=Organizer.groupedProjects(items,{
   filter:currentSearch,category:categoryMode,sort:sortMode,now:Date.now()
  });
  const grid=$("grid");grid.replaceChildren();
  let count=0;
  for(const group of groups){
   const section=element("section","catalog-group");section.dataset.category=group.id;
   const head=element("header","catalog-group-header");
   head.append(element("h2","",group.label));
   head.append(element("span","catalog-count",String(group.items.length)));
   const cards=element("div","grid");
   for(const item of group.items){cards.append(decorate(card(item),item));count++;}
   section.append(head,cards);grid.append(section);
  }
  $("stats").textContent=count+" / "+items.length+" progetti · "+
    items.filter(item=>item.published).length+" anteprime pubbliche";
  $("message").textContent=count?"":"Nessun progetto corrispondente";
 }
 function init(items,card,{visible=true}={}){
  projects=items;makeCard=card;active=Boolean(visible);
  const category=$("categoryFilter"),sort=$("sortOrder");
  if(category&&sort&&Organizer){
   const known=new Set(items.map(item=>Organizer.categoryOf(item)));
   for(const entry of Organizer.CATEGORIES){
    if(!known.has(entry.id))continue;
    const option=element("option","",entry.label);option.value=entry.id;category.append(option);
   }
   if(categoryMode!=="all"&&!known.has(categoryMode))categoryMode="all";
   category.value=categoryMode;sort.value=sortMode;
   category.onchange=()=>{categoryMode=category.value;set("sellone-viewer-category",categoryMode);list()};
   sort.onchange=()=>{sortMode=sort.value==="az"?"az":"recent";set("sellone-viewer-sort",sortMode);list()};
  }
  if(!timerStarted&&typeof setInterval==="function"){timerStarted=true;setInterval(refreshBadges,60000);}
  if(active)void updateDates();
 }
 function apply(meta){
  for(const item of projects){
   if(item.released_at)continue;
   const date=item.release_path?meta?.paths?.[item.release_path]:
     meta?.repos?.[item.repo.toLowerCase()];
   if(Organizer.dateMillis(date))item.updated_at=date;
  }
  if(active)list();
 }
 async function updateDates(){
  if(!active)return;
  let cached=null;
  try{cached=JSON.parse(get(CACHE)||"null")}catch{}
  if(cached?.at&&Date.now()-cached.at<TTL){apply(cached);return;}
  const controller=typeof AbortController==="function"?new AbortController():null;
  const timer=setTimeout(()=>controller?.abort(),9500);
  const request=async url=>{
   const r=await fetch(url,{
    credentials:"omit",mode:"cors",cache:"no-store",referrerPolicy:"no-referrer",
    signal:controller?.signal
   });
   if(!r.ok)throw Error("GitHub HTTP "+r.status);
   return r.json();
  };
  try{
   const meta={at:Date.now(),repos:{},paths:{}};
   for(let page=1;page<=2;page++){
    const all=await request("https://api.github.com/users/holocube999/repos?type=owner&per_page=100&sort=pushed&page="+page);
    if(!Array.isArray(all))throw Error("Risposta GitHub invalida");
    for(const item of all)if(validRepo.test(item.name||"")&&Organizer.dateMillis(item.pushed_at))
     meta.repos[item.name.toLowerCase()]=item.pushed_at;
    if(all.length<100)break;
   }
   const paths=[...new Set(projects.filter(p=>p.published&&p.release_path).map(p=>p.release_path))];
   await Promise.all(paths.map(async path=>{
    try{
     const uri="https://api.github.com/repos/holocube999/Obscura07-Site/commits?per_page=1&path="+encodeURIComponent(path);
     const rows=await request(uri);
     const date=rows?.[0]?.commit?.committer?.date||rows?.[0]?.commit?.author?.date;
     if(Organizer.dateMillis(date))meta.paths[path]=date;
    }catch{}
   }));
   set(CACHE,JSON.stringify(meta));
   apply(meta);
  }catch{if(cached?.at)apply(cached)}
  finally{clearTimeout(timer)}
 }
 global.SelloneCatalogUI=Object.freeze({init,list,refreshBadges,updateDates});
})(typeof globalThis!=="undefined"?globalThis:this);
;
/* pocketjs-storage.js */
/* PocketJS storage adapter: persistent parent IndexedDB, sandboxed guest stays opaque-origin. */
(()=>{'use strict';
const DATABASE='SellonePocketJSProjects',STORE='kv',PREFIX='pjs.',MAX_VALUE=24*1024*1024;
let database=null,active=null;
function openDatabase(){
 if(database)return Promise.resolve(database);
 return new Promise((resolve,reject)=>{
  if(!('indexedDB' in window))return reject(Error('IndexedDB WebPlayer non disponibile'));
  const req=indexedDB.open(DATABASE,1);
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE)};
  req.onerror=()=>reject(req.error||Error('Errore apertura IndexedDB WebPlayer'));
  req.onsuccess=()=>{database=req.result;resolve(database)};
 });
}
async function snapshot(db){
 return new Promise((resolve,reject)=>{
  const entries={};const tx=db.transaction(STORE,'readonly');
  const req=tx.objectStore(STORE).openCursor();
  req.onsuccess=()=>{const cursor=req.result;if(cursor){
   if(typeof cursor.key==='string'&&cursor.key.startsWith(PREFIX))entries[cursor.key]=String(cursor.value);
   cursor.continue();
  }else resolve(entries)};
  req.onerror=()=>reject(req.error||Error('Lettura dati PocketJS fallita'));
  tx.onerror=()=>reject(tx.error||Error('Errore archivio PocketJS'));
 });
}
function mutate(db,op,key,value){
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,'readwrite');
  if(op==='set')tx.objectStore(STORE).put(value,key);
  else tx.objectStore(STORE).delete(key);
  tx.oncomplete=()=>resolve();
  tx.onerror=()=>reject(tx.error||Error('Scrittura IndexedDB non riuscita'));
  tx.onabort=()=>reject(tx.error||Error('Scrittura annullata'));
 });
}
function safeJSON(value){return JSON.stringify(value).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029')}
function guestSource(seed,channel){
 const js=`
const __pjsCache=new Map(Object.entries(SEED));
const __pjsPending=new Map();let __pjsSeq=0;
function __pjsPost(op,key,value){
 const id=++__pjsSeq;
 const promise=new Promise((resolve,reject)=>__pjsPending.set(id,{resolve,reject}));
 parent.postMessage({type:'SELLONE_PJS_STORAGE_WRITE_V1',channel:CHANNEL,id,op,key,value},'*');
 return promise;
}
window.addEventListener('message',event=>{
 const m=event.data;
 if(event.source!==parent||!m||m.type!=='SELLONE_PJS_STORAGE_ACK_V1'||m.channel!==CHANNEL)return;
 const request=__pjsPending.get(m.id);if(!request)return;
 __pjsPending.delete(m.id);
 if(m.ok)request.resolve();
 else{request.reject(Error(m.error||'Memoria WebPlayer non disponibile'));console.error('PocketJS storage:',m.error)}
});
window.__PJS_VIRTUAL_STORAGE__=true;
window.__PJS_STORAGE_FLUSH__=async function(){
 while(__pjsPending.size){await Promise.all([...__pjsPending.values()].map(x=>new Promise((resolve,reject)=>{
  const oldResolve=x.resolve,oldReject=x.reject;
  x.resolve=()=>{oldResolve();resolve()};
  x.reject=e=>{oldReject(e);reject(e)};
 })))}
};
const __pjsStore={
 get length(){return __pjsCache.size},
 key(i){return [...__pjsCache.keys()][i]??null},
 getItem(k){k=String(k);return __pjsCache.has(k)?__pjsCache.get(k):null},
 setItem(k,v){k=String(k);v=String(v);if(!k.startsWith('pjs.'))throw Error('Chiave PocketJS non valida');
  if(v.length>24*1024*1024)throw Error('Dati troppo grandi');
  __pjsCache.set(k,v);__pjsPost('set',k,v).catch(e=>{window.__PJS_STORAGE_WRITE_ERROR__=e.message})},
 removeItem(k){k=String(k);if(!k.startsWith('pjs.'))return;__pjsCache.delete(k);
  __pjsPost('delete',k,'').catch(e=>{window.__PJS_STORAGE_WRITE_ERROR__=e.message})},
 clear(){for(const k of [...__pjsCache.keys()])this.removeItem(k)},
 flush(){return window.__PJS_STORAGE_FLUSH__()}
};
window.PocketJSHost=Object.freeze({
 version:1,kind:'isolated-viewer',
 storage:Object.freeze(__pjsStore)
});
`;
 return js.replace('SEED',safeJSON(seed)).replaceAll('CHANNEL',safeJSON(channel));
}
function onMessage(event){
 const request=event.data,ctx=active;
 if(!ctx||event.source!==ctx.frame.contentWindow||!request||request.type!=='SELLONE_PJS_STORAGE_WRITE_V1'||request.channel!==ctx.channel)return;
 const {id,op,key,value}=request;
 if(!Number.isSafeInteger(id)||id<1||!['set','delete'].includes(op)||typeof key!=='string'||!key.startsWith(PREFIX)||key.length>300||
   (op==='set'&&(typeof value!=='string'||value.length>MAX_VALUE)))return;
 ctx.pending=ctx.pending.then(()=>mutate(ctx.db,op,key,value));
 ctx.pending.then(
  ()=>event.source.postMessage({type:'SELLONE_PJS_STORAGE_ACK_V1',channel:ctx.channel,id,ok:true},'*'),
  e=>event.source.postMessage({type:'SELLONE_PJS_STORAGE_ACK_V1',channel:ctx.channel,id,ok:false,error:String(e?.message||e)},'*')
 );
 ctx.pending=ctx.pending.catch(()=>{});
}
window.addEventListener('message',onMessage);
async function prepare(html,frame,channel){
 if(typeof html!=='string'||!html.includes('<meta name="pocketjs-studio"')||!frame||!channel)
  throw Error('Frontend PocketJS non riconosciuto');
 const db=await openDatabase(),seed=await snapshot(db);
 const source=guestSource(seed,channel);
 const injected=html.replace(/<script\b[^>]*>/i,tag=>tag+'\n'+source+'\n');
 if(injected===html)throw Error('PocketJS: script principale assente');
 active={db,frame,channel,pending:Promise.resolve()};
 return injected;
}
window.SellonePocketStorage=Object.freeze({prepare});
})();
;
/* nullgod-storage.js */
/* NULLGOD WebPlayer persistent local insights.
 * The private GitHub token stays in the parent; the guest gets only allowlisted preferences.
 */
(()=>{'use strict';
const DB='SelloneNullGodLocal',STORE='kv',LIMIT=1100000;
const KEYS=new Set(['ng-insights-v1','ng-pref','ng-autoSkip','ng-embedLyrics','ng-source','ng-search-recent','ng-ui-session-v1']);
let active=null,dbPromise=null;
function openDB(){
 if(dbPromise)return dbPromise;
 dbPromise=new Promise((resolve,reject)=>{
  if(!('indexedDB'in window))return reject(Error('IndexedDB non disponibile'));
  const req=indexedDB.open(DB,1);
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE)};
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error||Error('IndexedDB NULLGOD non disponibile'));
 });
 return dbPromise;
}
async function readSeed(db){
 return new Promise((resolve,reject)=>{
  const out={};const tx=db.transaction(STORE,'readonly');
  const req=tx.objectStore(STORE).openCursor();
  req.onsuccess=()=>{const cur=req.result;if(!cur){resolve(out);return}
   if(KEYS.has(cur.key)&&typeof cur.value==='string'&&cur.value.length<=LIMIT)out[cur.key]=cur.value;
   cur.continue()};
  req.onerror=()=>reject(req.error||Error('Lettura NULLGOD non riuscita'));
 });
}
function mutate(db,key,value,remove){
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,'readwrite');
  if(remove)tx.objectStore(STORE).delete(key);else tx.objectStore(STORE).put(value,key);
  tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||Error('Scrittura NULLGOD non riuscita'));
 });
}
function guestRuntime(seed,channel){
 const cache=new Map(Object.entries(seed));
 const allowed=new Set(['ng-insights-v1','ng-pref','ng-autoSkip','ng-embedLyrics','ng-source','ng-search-recent','ng-ui-session-v1']);
 const waiting=new Map();
 let serial=0;
 function issue(key,op,value){
  const id=++serial;
  let resolve;
  const promise=new Promise(done=>{resolve=done});
  const timeout=setTimeout(()=>{waiting.delete(id);resolve(false)},5000);
  waiting.set(id,{promise,resolve,timeout});
  const message={type:'SELLONE_NG_STORAGE_V1',channel,id,key,op};
  if(op==='set')message.value=value;
  parent.postMessage(message,'*');
 }
 window.addEventListener('message',event=>{
  const data=event.data;
  if(event.source!==parent||!data||data.type!=='SELLONE_NG_STORAGE_ACK_V1'||
   data.channel!==channel||!Number.isSafeInteger(data.id))return;
  const entry=waiting.get(data.id);if(!entry)return;
  waiting.delete(data.id);clearTimeout(entry.timeout);
  entry.resolve(data.ok===true);
 });
 const storage={
  getItem(key){return cache.get(String(key))??null},
  setItem(key,value){
   key=String(key);value=String(value);
   if(!allowed.has(key)||value.length>1100000)throw Error('Chiave NULLGOD non autorizzata');
   cache.set(key,value);
   issue(key,'set',value);
  },
  removeItem(key){
   key=String(key);if(!allowed.has(key))return;
   cache.delete(key);issue(key,'delete');
  },
  async flush(){
   const pending=[...waiting.values()].map(x=>x.promise);
   if(!pending.length)return true;
   const done=await Promise.all(pending);
   return done.every(Boolean);
  }
 };
 window.NullGodHost=Object.freeze({version:2,kind:'sellone-viewer',storage:Object.freeze(storage)});
}
window.addEventListener('message',event=>{
 const ctx=active,data=event.data;
 if(!ctx||event.source!==ctx.frame.contentWindow||!data||data.type!=='SELLONE_NG_STORAGE_V1'||
  data.channel!==ctx.channel||!KEYS.has(data.key)||!Number.isSafeInteger(data.id)||data.id<1||
  !['set','delete'].includes(data.op)||(data.op==='set'&&
    (typeof data.value!=='string'||data.value.length>LIMIT)))return;
 ctx.pending=ctx.pending.then(()=>mutate(ctx.db,data.key,data.value,data.op==='delete'));
 ctx.pending.then(()=>event.source.postMessage({type:'SELLONE_NG_STORAGE_ACK_V1',
  channel:ctx.channel,id:data.id,ok:true},'*'),()=>{});
 ctx.pending=ctx.pending.catch(()=>{});
});
async function prepare(html,frame,channel){
 if(typeof html!=='string'||!html.includes('NullGodInsights')||
  !html.includes('ng-insights-v1')||!frame||typeof channel!=='string')
  throw Error('Build NULLGOD non riconosciuta');
 const db=await openDB(),seed=await readSeed(db);
 const safe=s=>JSON.stringify(s).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028');
 const source='('+guestRuntime.toString()+')('+safe(seed)+','+safe(channel)+');';
 const result=html.replace(/<script\b[^>]*>/i,match=>match+'\n'+source+'\n');
 if(result===html)throw Error('Script NULLGOD non trovato');
 active={db,frame,channel,pending:Promise.resolve()};
 return result;
}
window.SelloneNullGodStorage=Object.freeze({prepare});
})();
;
/* nullgod-youtube-host.js */
/* NULLGOD MUSIC v0.3 — same-location YouTube frame host.
 * The iframe is visually aligned to the dedicated music dock inside the private WebPlayer.
 * No token, source code, or download URLs are forwarded from the GitHub sandbox.
 */
(()=>{'use strict';
const TYPE='NULLGOD_AUDIO_V1',READY='NULLGOD_AUDIO_READY_V1',STATE='NULLGOD_AUDIO_STATE_V1';
const validId=/^[a-zA-Z0-9_-]{11}$/;
let frame=null,box=null,videoId='',slot=null,lastPosition=0;
function appFrame(){return document.getElementById('playframe')}
function trusted(){
 const q=new URLSearchParams(location.search);
 return String(q.get('repo')||q.get('project')||'').toLowerCase()==='nullgod-music'&&
  document.getElementById('detailName')?.textContent==='NULLGOD / MUSIC';
}
function reply(payload){const iframe=appFrame();if(iframe?.contentWindow)iframe.contentWindow.postMessage({type:STATE,...payload},'*')}
function align(){
 if(!box||!slot)return;
 const f=appFrame();if(!f)return;
 const rect=f.getBoundingClientRect();
 const x=rect.left+slot.left,y=rect.top+slot.top;
 const w=slot.width,h=slot.height;
 const visible=w>=200&&h>=200&&x<innerWidth&&x+w>0&&y<innerHeight&&y+h>0&&
    slot.left>=0&&slot.top>=0&&slot.left+w<=rect.width+1&&slot.top+h<=rect.height+1;
 Object.assign(box.style,{left:Math.round(x)+'px',top:Math.round(y)+'px',width:Math.round(w)+'px',height:Math.round(h)+'px',
  visibility:visible?'visible':'hidden'});
}
function stop(){videoId='';lastPosition=0;frame=null;slot=null;if(box){box.remove();box=null}reply({state:2})}
function command(name,args=[]){
 if(!frame?.contentWindow||!['playVideo','pauseVideo','stopVideo','seekTo','setVolume'].includes(name))return;
 const values=Array.isArray(args)?args.slice(0,2).filter(x=>typeof x==='number'||typeof x==='boolean'):[];
 frame.contentWindow.postMessage(JSON.stringify({event:'command',func:name,args:values}),'https://www.youtube.com');
}
function mount(){
 if(box)return;
 box=document.createElement('div');box.id='nullgod-youtube-host';
 Object.assign(box.style,{position:'fixed',zIndex:'100',background:'#050508',border:'1px solid #393046',
   borderRadius:'6px',overflow:'hidden',pointerEvents:'auto',visibility:'hidden'});
 document.body.append(box);
}
function play(id,title){
 if(!trusted()||!validId.test(id)||!slot||slot.width<200||slot.height<200)return;
 mount();
 if(videoId===id&&frame){align();command('playVideo');return}
 videoId=id;
 const el=document.createElement('iframe');
 el.title='YouTube nel lettore NULLGOD: '+String(title||'brano').slice(0,70);
 el.src='https://www.youtube.com/embed/'+id+'?autoplay=1&enablejsapi=1&playsinline=1&rel=0&origin='+encodeURIComponent(location.origin);
 el.referrerPolicy='strict-origin-when-cross-origin';
 el.allow='autoplay; encrypted-media; fullscreen; picture-in-picture';
 el.allowFullscreen=true;
 el.style.cssText='display:block;width:100%;height:100%;border:0;min-width:200px;min-height:200px';
 el.onload=()=>{try{el.contentWindow?.postMessage(JSON.stringify({event:'listening',id:'nullgod'}),'https://www.youtube.com')}catch(_){}};
 frame=el;box.replaceChildren(el);align();reply({state:3});
}
window.addEventListener('message',event=>{
 if(event.source===frame?.contentWindow&&/^https:\/\/(?:www\.)?youtube\.com$/.test(event.origin)){
  let data=event.data;
  if(typeof data==='string'){try{data=JSON.parse(data)}catch{return}}
  if(!data||typeof data!=='object')return;
  if(data.event==='onStateChange'&&Number.isInteger(data.info))reply({state:data.info});
  if(data.event==='onError')reply({error:String(data.info??'Riproduzione non disponibile')});
  if(data.event==='infoDelivery'&&data.info&&typeof data.info==='object'){
   const t=Number(data.info.currentTime),duration=Number(data.info.duration),now=Date.now();
   if(Number.isFinite(t)&&now-lastPosition>400){lastPosition=now;reply({time:t,duration:Number.isFinite(duration)?duration:0})}
   if(Number.isInteger(data.info.playerState))reply({state:data.info.playerState});
  }
  return;
 }
 const f=appFrame();if(!f||event.source!==f.contentWindow||!trusted())return;
 const d=event.data;if(!d||d.type!==TYPE||typeof d.action!=='string')return;
 if(d.action==='hello'){f.contentWindow.postMessage({type:READY},'*');return}
 if(d.action==='slot'){
  if(d.rect&&['left','top','width','height'].every(k=>Number.isFinite(d.rect[k]))){
   slot=Object.fromEntries(['left','top','width','height'].map(k=>[k,Number(d.rect[k])]));align();
  }return;
 }
 if(d.action==='play'){if(validId.test(d.videoId||''))play(d.videoId,d.title);return}
 if(d.action==='stop'){stop();return}
 if(d.action==='command'){command(d.command,d.args);return}
});
window.addEventListener('resize',align,{passive:true});
window.addEventListener('scroll',align,{passive:true,capture:true});
window.addEventListener('pagehide',stop);
})();
;
/* app-access.js */
/* Dedicated private app access. Credentials remain exclusively in the trusted
 parent and are never sent to srcdoc, URLs, application logs or exports. */
(()=>{'use strict';
const q=new URLSearchParams(location.search);
if((q.get('repo')||'').toLowerCase()==='nullgod-music'){
 window.addEventListener('message',event=>{
  const guest=document.getElementById('playframe');
  if(event.source!==guest?.contentWindow||event.data?.type!=='NULLGOD_FORGET_ACCESS_V1')return;
  localStorage.removeItem('obscura-nullgod-access-v1');
  window.SelloneGitHub.forget();
  guest.contentWindow?.postMessage({type:'NULLGOD_FORGET_ACCESS_ACK_V1'},'*');
  const notice=document.createElement('div');
  notice.setAttribute('role','status');
  notice.textContent='✓ Token cancellato';
  notice.style.cssText='position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;background:#09080df5;color:#b5d5bd;font:500 16px system-ui';
  document.body.append(notice);
  const next=new URL(location.href);next.searchParams.set('app','1');
  next.searchParams.set('accessReset',String(Date.now()));
  setTimeout(()=>{guest.removeAttribute('srcdoc');guest.src='about:blank';location.replace(next.href)},900);
 });
}
if(q.get('app')!=='1'||(q.get('repo')||'').toLowerCase()!=='nullgod-music')return;
const KEY='obscura-nullgod-access-v1',GH=window.SelloneGitHub;
let saved='';
try{saved=localStorage.getItem(KEY)||''}catch{}
if(saved)GH.setToken(saved,'',false).catch(()=>{});
const gate=document.createElement('section');
gate.id='appAccess';
gate.innerHTML='<form><div class="accessBrand"><span class="accessStudio">[NULL]GOD</span><span class="accessProduct"><span class="accessSlash">/</span> Spotifree</span><small class="accessMusic">m u s i c</small></div><label for="appAccessToken">Token d’accesso</label><input id="appAccessToken" type="password" autocomplete="off" spellcheck="false" required><button type="submit">Entra</button><p role="status" id="appAccessError"></p></form>';
document.body.append(gate);
gate.hidden=!!saved;
if(q.has('accessReset')&&!saved){
 const notice=document.getElementById('appAccessError');
 notice.textContent='Token cancellato.';
 notice.style.color='#9fd7b0';
}
function accessMessage(error){
 if(error?.reason)return error.message;
 if(error?.status===401)return 'Token scaduto o revocato.';
 if(error?.status===404)return 'Questo token non ha accesso a NULLGOD-MUSIC.';
 if(error?.status===403)return 'GitHub rifiuta l’accesso: verifica Contents → Read-only per NULLGOD-MUSIC.';
 return 'Connessione non disponibile. Riprova.';
}
let submitting=false,cooldownUntil=0,cooldownTimer=0;
function setCooldown(error){
 if(error?.reason!=='rate_limit')return;
 cooldownUntil=Number(error.retryAt)>Date.now()?Number(error.retryAt):Date.now()+60000;
 clearTimeout(cooldownTimer);gate.querySelector('button').disabled=true;
 cooldownTimer=setTimeout(()=>{cooldownUntil=0;gate.querySelector('button').disabled=cooldownUntil>Date.now()},Math.min(2147483647,cooldownUntil-Date.now()+500));
}
function show(message=''){
 gate.hidden=false;
 document.getElementById('appAccessError').textContent=message;
 document.getElementById('appAccessToken').value='';
 document.getElementById('playframe').srcdoc='';
 document.getElementById('appAccessToken').focus();
}
window.addEventListener('sellone:access-error',e=>{
 const status=e.detail?.status;
 if(status===401||status===404){
  try{localStorage.removeItem(KEY)}catch{}
  GH.forget();show('Accesso non disponibile. Inserisci un token valido.');
 }else if(status===403||status===429){show(accessMessage(e.detail));setCooldown(e.detail)}
});
gate.querySelector('form').addEventListener('submit',async event=>{
 event.preventDefault();if(submitting||cooldownUntil>Date.now())return;
 const input=document.getElementById('appAccessToken'),value=input.value.trim();
 if(value.length<16){document.getElementById('appAccessError').textContent='Token non valido.';return}
 submitting=true;gate.querySelector('button').disabled=true;
 try{
  await GH.setToken(value,'',false);
  await GH.discover('NULLGOD-MUSIC');
  localStorage.setItem(KEY,value);
  input.value='';gate.hidden=true;document.getElementById('loadLatest').click();
 }catch(e){
  const status=e.status;
  document.getElementById('appAccessError').textContent=accessMessage(e);setCooldown(e);
 }finally{submitting=false;gate.querySelector('button').disabled=false}
});
})();
;
/* catalog.js */
/* Sellone WebPlayer: original project catalog + GitHub HTML + invisible retro cores. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const q=new URLSearchParams(location.search);
const initial=(q.get('repo')||q.get('project')||'').trim().replace(/^holocube999\//i,'');
const initialRef=q.get('ref'),initialPath=q.get('path'),initialView=q.get('view');
const dedicatedApp=q.get('app')==='1'&&initial.toLowerCase()==='nullgod-music';
const validRepo=/^[A-Za-z0-9_.-]{1,100}$/;
const root=new URL('../',location.href), approvedPrefix=new URL('viewer/',root);
function isTunnel(item){return String(item?.repo||'').toLowerCase()==='obscura-tunnel'}
function hideTunnel(){window.SelloneBridgeHost?.disable()}
const GH=window.SelloneGitHub,Retro=window.SelloneRetro,Bundle=window.SelloneBundle;
const all=[];
const types={web_js:'WEB',amiga_media:'AMIGA',native:'NATIVO',site:'SITO',archive:'ARCHIVIO',utility:'UTILITY',audio:'AUDIO'};
let selected=null,loaded=null,remoteMedia=null,remoteKick=null,mediaRevision=null,sourceRevision=null,selectedRevision='',view='js',busy=false;
let syncChannel='',syncReady={js:false,original:false};
function text(node,tag,value){const e=document.createElement(tag);e.textContent=value;node.append(e);return e}
function link(node,label,url,secondary){
 const a=text(node,'a',label);a.className='action'+(secondary?' secondary':'');a.href=url;return a;
}
function showStatus(msg,error=false){
 $('playerStatus').textContent=msg;
 $('playerStatus').style.color=error?'#ffc5d3':'#b7c9d6';
}
function approvedBuild(path){
 // Only audited first-party pages. Never allow arbitrary GitHub paths here.
 if(typeof path!=='string')return '';
 const allowed=/^viewer\/[A-Za-z0-9_.\/-]+\.html?$/i.test(path)||
  ['radio/index.html','apps/obscura-emu/index.html','transfer/index.html'].includes(path);
 if(!allowed||path.split('/').includes('..'))return '';
 const url=new URL(path,root);
 return url.origin===location.origin&&url.pathname.startsWith(root.pathname)&&!url.search&&!url.hash?url.href:'';
}
function viewLink(item){return './?repo='+encodeURIComponent(item.id||item.repo)}
function byRepo(key){return all.find(x=>x.id.toLowerCase()===key.toLowerCase())||
 all.find(x=>x.repo.toLowerCase()===key.toLowerCase())}

function card(item){
 const el=document.createElement('article');el.className='panel project';
 const head=text(el,'div','');head.className='head';
 text(head,'span',types[item.viewer_type]||'PROGETTO').className='eyebrow';
 text(head,'span',item.published?'Pubblicato':'GitHub').className='tag'+(item.published?' playable':'');
 text(el,'h3',item.title);
 text(el,'p',item.description);
 const acts=text(el,'div','');acts.className='actions';
 link(acts,item.published?'▶ Apri applicazione':'▶ Apri nel WebPlayer',viewLink(item),false);
 return el;
}
function listing(value=''){
 if(window.SelloneCatalogUI)return window.SelloneCatalogUI.list(all,value,card);
 const filter=value.toLocaleLowerCase('it');const grid=$('grid');grid.replaceChildren();
 let count=0;
 for(const item of all){
  if(filter&&!String(item.title+' '+item.repo+' '+item.kind).toLocaleLowerCase('it').includes(filter))continue;
  grid.append(card(item));count++;
 }
 $('stats').textContent=count+' / '+all.length+' progetti · '+all.filter(x=>x.published).length+' anteprime pubbliche';
 $('message').textContent=count?'':'Nessun progetto corrispondente';
}
function emptyFrame(){
 hideTunnel();
 const trusted=$('localAppFrame');trusted.removeAttribute('src');trusted.classList.add('hidden');
 const frame=$('playframe');frame.classList.remove('hidden');frame.removeAttribute('src');
 frame.srcdoc='<!doctype html><title>Sellone WebPlayer</title><body style="background:#090b14;color:#b9c3d2;font:15px system-ui;padding:24px">Seleziona una build o un supporto da avviare.</body>';
}
function showFrame(){ $('unavailable').classList.add('hidden');$('playarea').classList.remove('hidden');}
function newChannel(){
 const bytes=crypto.getRandomValues(new Uint8Array(16));
 return 's-'+Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
}
function presentMode(next){
 if(!['js','original','both','source'].includes(next))return;
 view=next;
 const hasJS=next==='js'||next==='both',hasRetro=next==='original'||next==='both';
 for(const b of $('viewModes').querySelectorAll('[data-view]'))b.setAttribute('aria-pressed',String(b.dataset.view===next));
 $('webControls').classList.toggle('hidden',!hasJS);
 $('retroControls').classList.toggle('hidden',!hasRetro);
 $('sourceControls').classList.toggle('hidden',next!=='source');
 $('compareTools').classList.toggle('hidden',next!=='both');
 $('jsPane').classList.toggle('hidden',!hasJS);
 $('originalPane').classList.toggle('hidden',!hasRetro);
 $('sourcePane').classList.toggle('hidden',next!=='source');
 $('playarea').classList.toggle('compare',next==='both');
 $('detailStatus').textContent=next==='both'?'Confronto · JS a sinistra / originale a destra':
  next==='js'?'Versione JavaScript':next==='original'?
   ('Originale · '+(selected?.origin_system==='amiga'?'Amiga / ADF':
   ['c64','c128','vic20','c16'].includes(selected?.origin_system)?selected.origin_system.toUpperCase():'seleziona supporto')):'Sorgenti GitHub';
}
function bridgeHtml(html,capabilities=false){
 // The sandboxed JS game has an opaque origin; this short bridge contains
 // only a per-session channel, never GitHub credentials or private media.
 const bridge=String.raw`(function(){
 'use strict';
 var channel=CHANNEL, delivering=false;
 var valid=/^(?:Arrow(?:Up|Down|Left|Right)|Key[A-Z]|Digit[0-9]|Space|Enter|Escape|Shift(?:Left|Right)|Control(?:Left|Right))$/;
 for(var action of ['keydown','keyup'])window.addEventListener(action,function(e){
  if(delivering||!e.isTrusted||!valid.test(e.code))return;
  parent.postMessage({type:'SELLONE_SYNC_INPUT_V1',channel:channel,action:e.type,key:e.key,code:e.code,repeat:e.repeat},'*');
 },true);
 window.addEventListener('message',function(e){
  var d=e.data;
  if(e.source!==parent||!d||d.type!=='SELLONE_SYNC_INPUT_V1'||d.channel!==channel||
   !valid.test(String(d.code||''))||!['keydown','keyup'].includes(d.action))return;
  delivering=true;
  try{document.dispatchEvent(new KeyboardEvent(d.action,{key:d.key,code:d.code,repeat:!!d.repeat,bubbles:true,cancelable:true}))}
  finally{delivering=false}
 });
 parent.postMessage({type:'SELLONE_SYNC_READY_V1',channel:channel,side:'js'},'*');
})()`.replace('CHANNEL',JSON.stringify(syncChannel));
 if(capabilities){
  const capabilitySource="(function(){\n 'use strict';\n var channel=CHANNEL,next=0,pending=new Map(),onQr=null,opened=null;\n function post(type,data){parent.postMessage(Object.assign({type:type,channel:channel},data||{}),'*')}\n window.SelloneHostBridge=Object.freeze({\n  available:true,\n  digest:function(bytes){if(!(bytes instanceof ArrayBuffer))return Promise.reject(Error('Buffer SHA-256 non valido'));\n   return new Promise(function(resolve,reject){var id=++next,t=setTimeout(function(){pending.delete(id);reject(Error('Timeout SHA-256 WebPlayer'))},60000);pending.set(id,{resolve:resolve,reject:reject,timer:t});post('SELLONE_BRIDGE_SHA_REQUEST',{id:id,bytes:bytes})})},\n  scan:function(callback){if(typeof callback!=='function')return Promise.reject(Error('Scanner non disponibile'));onQr=callback;return new Promise(function(resolve,reject){opened={resolve:resolve,reject:reject};post('SELLONE_BRIDGE_CAMERA_START')})},\n  stop:function(){onQr=null;post('SELLONE_BRIDGE_CAMERA_STOP')}\n });\n window.addEventListener('message',function(e){\n  if(e.source!==parent||!e.data||e.data.channel!==channel)return;\n  var d=e.data;\n  if(d.type==='SELLONE_BRIDGE_SHA_REPLY'){var p=pending.get(d.id);if(!p)return;pending.delete(d.id);clearTimeout(p.timer);if(d.error)p.reject(Error(String(d.error)));else p.resolve(d.hash)}\n  else if(d.type==='SELLONE_BRIDGE_CAMERA_OPENED'){if(opened){opened.resolve();opened=null}}\n  else if(d.type==='SELLONE_BRIDGE_CAMERA_ERROR'){if(opened){opened.reject(Error(String(d.error)));opened=null}}\n  else if(d.type==='SELLONE_BRIDGE_CAMERA_CLOSED'){onQr=null}\n  else if(d.type==='SELLONE_BRIDGE_CAMERA_FRAME'&&onQr&&typeof jsQR==='function'){\n   try{var code=jsQR(d.pixels,d.width,d.height,{inversionAttempts:'attemptBoth'});if(code&&typeof code.data==='string')onQr(code.data)}catch(_){}\n  }\n });\n window.addEventListener('pagehide',function(){post('SELLONE_BRIDGE_CAMERA_STOP')});\n})()".replace('CHANNEL',JSON.stringify(syncChannel));
  const capabilityTag='<script>'+capabilitySource+'</script>';
  const first=html.search(/<script\b/i);
  if(first>=0)html=html.slice(0,first)+capabilityTag+html.slice(first);else html+=capabilityTag;
 }
 const tag='<script>'+bridge+'</script>';
 const idx=html.toLowerCase().lastIndexOf('</body>');
 return idx>=0?html.slice(0,idx)+tag+html.slice(idx):html+tag;
}
function showJS(result){
 hideTunnel();
 $('localAppFrame').removeAttribute('src');$('localAppFrame').classList.add('hidden');
 $('playframe').classList.remove('hidden');$('playframe').removeAttribute('src');
 const trustedApp=isTunnel(selected);
 if(trustedApp){if(!window.SelloneBridgeHost)throw Error('Bridge WebPlayer assente');window.SelloneBridgeHost.enable($('playframe'),syncChannel)}
 $('playframe').srcdoc=bridgeHtml(result.html,trustedApp);
 syncReady.js=false;updateSync();
}
function updateSync(){
 const mode=$('linkedInput').checked?'collegati':'disattivati';
 $('syncFeedback').textContent='Input '+mode+' · bridge JS '+(syncReady.js?'pronto':'in attesa')+
  ' · core '+(syncReady.original?'pronto':'in attesa')+' · sincronizzazione dei frame non garantita';
}
function relay(data,target){
 const frame=target==='js'?$('playframe'):Retro.frame();
 if(!frame?.contentWindow)return;
 frame.contentWindow.postMessage(data,target==='js'?'*':location.origin);
}
function inputFrom(event){
 if(!event.data||event.data.channel!==syncChannel)return;
 const source=event.source=== $('playframe').contentWindow?'js':event.source===Retro.frame()?.contentWindow?'original':null;
 if(!source)return;
 if(event.data.type==='SELLONE_SYNC_READY_V1'){
  syncReady[source]=true;updateSync();return;
 }
 if(view!=='both'||!$('linkedInput').checked)return;
 if(event.data.type!=='SELLONE_SYNC_INPUT_V1'||!['keydown','keyup'].includes(event.data.action)||
    !/^(?:Arrow(?:Up|Down|Left|Right)|Key[A-Z]|Digit[0-9]|Space|Enter|Escape|Shift(?:Left|Right)|Control(?:Left|Right))$/.test(event.data.code||''))return;
 relay(event.data,source==='js'?'original':'js');
}
window.addEventListener('message',inputFrom);
window.addEventListener('keydown',parentKey,true);
window.addEventListener('keyup',parentKey,true);
function parentKey(event){
 if(!event.isTrusted||view!=='both'||!$('linkedInput').checked)return;
 const target=event.target;
 if(target?.closest?.('input,select,textarea,button,a'))return;
 if(!/^(?:Arrow(?:Up|Down|Left|Right)|Key[A-Z]|Digit[0-9]|Space|Enter|Escape|Shift(?:Left|Right)|Control(?:Left|Right))$/.test(event.code))return;
 if(event.code.startsWith('Arrow')||event.code==='Space')event.preventDefault();
 const data={type:'SELLONE_SYNC_INPUT_V1',channel:syncChannel,action:event.type,key:event.key,code:event.code,repeat:event.repeat};
 relay(data,'js');relay(data,'original');
}
function handleError(error){
 const msg=String(error.message||error);
 showStatus(msg,true);
 if(dedicatedApp)window.dispatchEvent(new CustomEvent('sellone:access-error',{detail:{status:error.status,reason:error.reason,message:error.message,retryAt:error.retryAt}}));
 if([401,403,404].includes(error.status))$('authBox').classList.remove('hidden');
}
function currentRepo(){if(!selected)throw Error('Nessun progetto selezionato');return GH.normalizeRepo(selected.repo)}
function fillPaths(select,files,current){
 select.replaceChildren();
 const blank=document.createElement('option');blank.value='';blank.textContent='Seleziona build';select.append(blank);
 for(const path of files||[]){const opt=document.createElement('option');opt.value=path;opt.textContent=path;select.append(opt)}
 select.value=current||'';
}
function enableUI(active){busy=active;
 for(const id of ['loadLatest','reloadSelected','bootRetro','loadGitMedia','openSource','reloadSource','restartPair'])$(id).disabled=active;
}
async function githubHTML(opts={}){
 if(!selected)return;
 enableUI(true);showFrame();showStatus('Lettura da GitHub e verifica SHA…');
 try{
  // In split mode the emulator must remain running while the JS build reloads.
  const ref=opts.explicit?.ref||(opts.pin?loaded?.ref:undefined);
  const path=opts.explicit?.path||(opts.pin?$('htmlCandidates').value||loaded?.path:undefined);
  const verified=await GH.load({repo:currentRepo(),ref,path});
  if(!Bundle?.prepare)throw Error('Motore dei moduli WebPlayer non disponibile');
  showStatus('Verifica CSS e moduli JavaScript del repository…');
  const result=await Bundle.prepare(verified,GH);
  if(selected?.repo==='NULLGOD-MUSIC'){
   if(!window.SelloneNullGodStorage)throw Error('Storage NULLGOD non disponibile nel WebPlayer');
   showStatus('Ripristino statistiche di ascolto locali…');
   result.html=await window.SelloneNullGodStorage.prepare(result.html,$('playframe'),syncChannel);
  }
  if(selected?.repo==='PocketJS-NativeServer'){
   if(!window.SellonePocketStorage)throw Error('Storage PocketJS non disponibile nel WebPlayer');
   showStatus('Preparazione memoria persistente PocketJS…');
   result.html=await window.SellonePocketStorage.prepare(result.html,$('playframe'),syncChannel);
  }
  const oldFiles=loaded?.files;
  loaded={...result,files:result.files||oldFiles||[]};
  fillPaths($('htmlCandidates'),loaded.files,result.path);
  showJS(result);
  $('detailStatus').textContent='HTML GitHub · '+result.path+' · commit '+result.ref.slice(0,12);
  showStatus('HTML verificato: '+result.path+' · '+result.moduleCount+' moduli JS · '+result.assetCount+' dipendenze.');
  const existing=$('commitAction');
  if(existing)existing.remove();
  const a=link($('detailActions'),'↗ Commit GitHub','https://github.com/'+result.repo+'/commit/'+result.ref,true);
  a.id='commitAction';a.target='_blank';a.rel='noopener noreferrer';
  const url=new URL(location.href);url.searchParams.set('repo',selected.id||selected.repo);
  if(opts.explicit||opts.pin){selectedRevision=result.ref;url.searchParams.set('ref',result.ref);url.searchParams.set('path',result.path)}else{selectedRevision='';url.searchParams.delete('ref');url.searchParams.delete('path')}
  history.replaceState(null,'',url.pathname+url.search);
 }catch(error){emptyFrame();handleError(error)}
 finally{enableUI(false)}
}
async function githubMedia(){
 if(!selected)return;
 enableUI(true);showStatus('Ricerca supporti nel repository GitHub…');
 try{
  mediaRevision=await GH.discoverMedia(currentRepo(),selectedRevision);
  fillPaths($('mediaCandidates'),mediaRevision.files,mediaRevision.path);
  $('mediaCandidates').classList.remove('hidden');
  await selectedMedia(mediaRevision.path);
 }catch(error){handleError(error)}
 finally{enableUI(false)}
}
async function selectedMedia(path){
 if(!selected||!mediaRevision||!path)return;
 const result=await GH.loadMedia({repo:currentRepo(),ref:mediaRevision.ref,path});
 remoteMedia=new File([result.media],result.path.split('/').pop(),{type:'application/octet-stream'});
 remoteKick=null;
 $('mediaInput').value='';
 if(Retro.needsKick(remoteMedia)&&!$('kickInput').files[0]&&mediaRevision.biosFiles?.length){
  const biosPath=mediaRevision.biosFiles.find(p=>/kick|amiga|a500|a1200/i.test(p))||mediaRevision.biosFiles[0];
  try{
   const source=await GH.loadBios({repo:currentRepo(),ref:mediaRevision.ref,path:biosPath});
   remoteKick=new File([source.bios],'kick.rom',{type:'application/octet-stream'});
  }catch(e){showStatus('Supporto verificato, ma Kickstart privata non disponibile: '+e.message,true)}
 }
 showStatus('GitHub verificato · '+result.path+' · '+result.ref.slice(0,12)+
  (remoteKick?' · Kickstart privata caricata senza pubblicazione':' · pronto per avvio.'));
}
async function boot(){
 const disk=$('mediaInput').files[0]||remoteMedia;
 const kick=$('kickInput').files[0]||remoteKick||null;
 if(!disk||!Retro.supported(disk)){showStatus('Seleziona un ADF, D64, T64 o PRG valido (massimo 3 MiB).',true);return}
 const originalSystem=String(selected?.origin_system||'').toLowerCase();
 if(originalSystem==='amiga'&&!/\.adf$/i.test(disk.name)){
  showStatus('Questo progetto nasce su Amiga: seleziona un ADF.',true);return;
 }
 if(['c64','c128','vic20','c16'].includes(originalSystem)&&/\.adf$/i.test(disk.name)){
  showStatus('Questo progetto Commodore non usa immagini ADF Amiga.',true);return;
 }
 if(['c128','vic20','c16'].includes(originalSystem)){
  showStatus('Il core dedicato a '+originalSystem.toUpperCase()+' non è ancora disponibile in questo WebPlayer.',true);return;
 }
 if(Retro.needsKick(disk)&&!Retro.validKick(kick)){
  showStatus('Per l’avvio Amiga seleziona una Kickstart valida e di tua disponibilità.',true);return;
 }
 enableUI(true);
 try{
  showFrame();const host=$('originalStage');
  syncReady.original=false;updateSync();
  await Retro.start({media:disk,bios:kick,title:selected.title,host,onStatus:showStatus,channel:syncChannel});
  $('detailStatus').textContent='Core retro · '+disk.name+' · '+(Retro.needsKick(disk)?'PUAE':'VICE');
 }catch(error){handleError(error)}
 finally{enableUI(false)}
}
function localBuild(item){
 hideTunnel();
 const url=item.published?approvedBuild(item.url):'';
 if(!url)return false;
 showFrame();
 // Untrusted GitHub code remains confined to the opaque-origin playframe.
 // Only vetted local apps are loaded in this separate first-party frame.
 $('playframe').classList.add('hidden');
 const frame=$('localAppFrame');frame.classList.remove('hidden');frame.src=url;
 $('detailStatus').textContent='Applicazione statica pubblicata';
 showStatus('Applicazione aperta dal catalogo; nessun token GitHub richiesto.');
 return true;
}

async function githubSource(refresh=true){
 if(!selected)return;
 enableUI(true);showStatus('Lettura sorgenti GitHub e verifica SHA…');
 try{
  if(refresh||!sourceRevision)sourceRevision=await GH.discoverFiles(currentRepo(),selectedRevision);
  const file=$('sourceFiles').value&&sourceRevision.files.includes($('sourceFiles').value)?$('sourceFiles').value:sourceRevision.path;
  fillPaths($('sourceFiles'),sourceRevision.files,file);
  const result=await GH.loadText({repo:currentRepo(),ref:sourceRevision.ref,path:file});
  const pre=document.createElement('pre');pre.id='sourcePreview';pre.textContent=result.content;
  $('sourcePane').replaceChildren(pre);
  $('detailStatus').textContent='GitHub · '+result.path+' · '+result.ref.slice(0,12);
  showStatus('Sorgente verificato · '+(result.bytes/1024).toFixed(1)+' KiB · sola lettura');
 }catch(e){handleError(e)}
 finally{enableUI(false)}
}
async function selectView(next){
 if(!selected||busy||!['js','original','both','source'].includes(next))return;
 const previous=view;
 if(previous===next)return;
 if(!['original','both'].includes(next)){
  await Retro.stop();$('originalStage').replaceChildren();syncReady.original=false;
 }
 // Keep the guest iframe alive while hidden: it owns local media and live state.
 // Only switching projects or explicit reload replaces it.
 if(!['js','both'].includes(next))hideTunnel();
 presentMode(next);showFrame();updateSync();
 if(next==='source'){await githubSource();return}
 if(['js','both'].includes(next)&&(previous==='original'||previous==='source')){
  if(isTunnel(selected)){
   // Explicitly restore privileged tunnel capabilities when returning.
   if(!localBuild(selected)){if(loaded)showJS(loaded);else await githubHTML()}
  }else if(!loaded&&!localBuild(selected))await githubHTML();
 }
 if(next==='both'&&!loaded)await githubHTML();
 if(next==='original'||next==='both'){
  const disk=$('mediaInput').files[0]||remoteMedia;
  if(!disk)showStatus('Confronto pronto: seleziona ADF/D64/T64/PRG oppure cerca i media su GitHub.');
 }
}
function showDetail(repo,explicit=null){
 $('listing').classList.add('hidden');$('detail').classList.remove('hidden');
 selected=byRepo(repo)||{id:repo,repo,title:repo,description:'Repository GitHub',viewer_type:'web_js',published:false};
 const item=selected;
 $('detail').dataset.originalSystem=item.origin_system||'';
 loaded=null;remoteMedia=null;remoteKick=null;mediaRevision=null;sourceRevision=null;selectedRevision=explicit?.ref||'';
 syncChannel=newChannel();syncReady={js:false,original:false};
 $('detailName').textContent=item.title;
 $('detailKind').textContent=types[item.viewer_type]||'PROGETTO';
 $('detailDescription').textContent=item.description||'';
 document.title=item.title+' · Sellone WebPlayer';
 const acts=$('detailActions');acts.replaceChildren();
 const repoPage=link(acts,'↗ Repository','https://github.com/holocube999/'+encodeURIComponent(item.repo),true);
 const versions=text(acts,'button','Versioni');versions.type='button';versions.className='action secondary';
 versions.onclick=()=>window.dispatchEvent(new CustomEvent('sellone:open-history',{detail:{repo:item.repo,title:item.title}}));
 const zip=text(acts,'button','↓ ZIP progetto');zip.type='button';zip.className='action secondary';
 zip.onclick=()=>window.dispatchEvent(new CustomEvent('sellone:download-zip',{detail:{repo:item.repo,ref:selectedRevision||'',button:zip}}));
 repoPage.target='_blank';repoPage.rel='noopener noreferrer';
 const published=item.published?approvedBuild(item.url):'';
 if(published){
  const publicLink=link(acts,'↗ Anteprima pubblica',published,true);
  publicLink.target='_blank';publicLink.rel='noopener noreferrer';
 }
 for(const b of $('viewModes').querySelectorAll('[data-view]')){
  const available=item.viewer_type==='web_js'||item.viewer_type==='amiga_media'||item.repo==='PocketJS-NativeServer'||b.dataset.view==='source';
  b.disabled=!available;
 }
 presentMode(explicit?.mode==='source'?'source':explicit?.mode==='js'?'js':explicit?.mode==='original'?'original':item.viewer_type==='amiga_media'?'original':
  (item.viewer_type==='archive'||(item.viewer_type==='native'&&item.repo!=='PocketJS-NativeServer'))?'source':'js');
 emptyFrame();showFrame();updateSync();
 if(dedicatedApp&&!GH.hasToken()){
  $('authBox').classList.remove('hidden');
  $('playerStatus').textContent=GH.hasSavedToken()?
   'Accesso riservato. Inserisci la password locale e premi Sblocca per aprire NULLGOD MUSIC.':
   'Accesso riservato. Serve un token GitHub di sola lettura per il repository NULLGOD-MUSIC.';
  return;
 }
 if(view==='source')githubSource();
 else if(view==='js'){
  if(explicit?.ref&&explicit?.path)githubHTML({explicit});
  else if(initialRef&&initialPath&&(item.id||item.repo).toLowerCase()===initial.toLowerCase())
   githubHTML({explicit:{ref:initialRef,path:initialPath}});
  else if(!localBuild(item))githubHTML();
 }else if(view==='original'&&explicit?.ref)githubMedia();
 else showStatus('Originale: seleziona un supporto locale o GitHub e avvia il core.');
}
async function loadCatalog(){
 try{
  const response=await fetch('../catalog.json',{cache:'no-store',credentials:'omit'});
  if(!response.ok)throw Error('HTTP '+response.status);
  const data=await response.json();
  if(data.schema!==2||!Array.isArray(data.projects))throw Error('Catalogo incompatibile');
  const seen=new Set();
  for(const item of data.projects){
   const id=String(item?.id||item?.repo||'');
   if(!item||!validRepo.test(item.repo||'')||!validRepo.test(id)||seen.has(id.toLowerCase()))continue;
   seen.add(id.toLowerCase());
   all.push({id,repo:item.repo,title:String(item.title||item.repo).slice(0,90),
    description:String(item.description||'').slice(0,250),kind:String(item.kind||''),
    category:String(item.category||''),viewer_type:types[item.viewer_type]?item.viewer_type:'archive',
    origin_system:String(item.origin_system||''),published:item.published===true&&!!approvedBuild(item.url),url:item.url,
    release_path:typeof item.release_path==='string'&&/^(?:radio\/|viewer\/[A-Za-z0-9_-]+\/)$/i.test(item.release_path)?item.release_path:'',
    released_at:typeof item.released_at==='string'?item.released_at:''});
  }
  if(window.SelloneCatalogUI)window.SelloneCatalogUI.init(all,card,{visible:!(initial&&validRepo.test(initial))});
  if(initial&&validRepo.test(initial))showDetail(initial,initialRef&&['source','original'].includes(initialView)?{ref:initialRef,path:initialPath,mode:initialView}:null);
  else {listing();if(initial)$('message').textContent='Identificativo repository non valido'}
 }catch(error){$('message').textContent='Errore catalogo: '+String(error.message||error)}
}
$('search').oninput=()=>listing($('search').value);
$('loadLatest').onclick=()=>githubHTML();
$('reloadSelected').onclick=()=>githubHTML({pin:true});
$('htmlCandidates').onchange=()=>{if(loaded)githubHTML({pin:true})};
$('loadGitMedia').onclick=()=>githubMedia();
$('mediaCandidates').onchange=async()=>{try{await selectedMedia($('mediaCandidates').value)}catch(e){handleError(e)}};
$('mediaInput').onchange=()=>{remoteMedia=null;remoteKick=null;showStatus('Supporto locale selezionato; premi Avvia supporto.')};
$('bootRetro').onclick=()=>boot();
$('stopRetro').onclick=async()=>{await Retro.stop();$('originalStage').replaceChildren();syncReady.original=false;updateSync();showStatus('Emulatore fermato; supporti temporanei eliminati.')};
$('useGitToken').onclick=async()=>{
 try{
  await GH.setToken($('gitToken').value,$('gitPassword').value,$('saveToken').checked);
  $('gitToken').value='';$('gitPassword').value='';$('authBox').classList.add('hidden');
  if(view==='source')await githubSource();else if(view==='original')await githubMedia();else await githubHTML();
 }catch(e){handleError(e)}
};
$('unlockGitToken').onclick=async()=>{
 try{await GH.unlock($('gitPassword').value);$('gitPassword').value='';$('authBox').classList.add('hidden');if(view==='source')await githubSource();else if(view==='original')await githubMedia();else await githubHTML()}
 catch(e){handleError(e)}
};
for(const b of $('viewModes').querySelectorAll('[data-view]'))b.onclick=()=>selectView(b.dataset.view);
$('openSource').onclick=()=>githubSource(false);
$('reloadSource').onclick=()=>{selectedRevision='';sourceRevision=null;githubSource(true)};
$('sourceFiles').onchange=()=>githubSource(false);
$('linkedInput').onchange=()=>updateSync();
$('restartPair').onclick=async()=>{
 if(view!=='both')return;
 if(!loaded){await githubHTML()}
 else showJS(loaded);
 const disk=$('mediaInput').files[0]||remoteMedia;
 if(!disk){showStatus('JS riavviato. Seleziona il supporto originale e premi Avvia supporto.',true);return}
 await boot();
 showStatus('Riavvio delle due istanze richiesto · stessa sessione input, senza sincronizzazione deterministica dei frame.');
};
$('forgetGitToken').onclick=()=>{GH.forget();$('authBox').classList.add('hidden');showStatus('Token cifrato eliminato.')};
window.addEventListener('sellone:history-open',event=>{
 const d=event.detail||{};
 if(!validRepo.test(d.repo||'')||!/^[a-f0-9]{40}$/i.test(d.ref||'')||
  (!['js','source','original'].includes(d.mode)||
  (d.mode==='js'&&!/^(?:[A-Za-z0-9_.-]+\/){0,5}[A-Za-z0-9_.-]+\.html?$/i.test(d.path||''))||
  (d.mode==='original'&&!/^(?:[A-Za-z0-9_.-]+\/){0,5}[A-Za-z0-9_.-]+\.(?:adf|d64|t64|prg)$/i.test(d.path||''))))return;
 const url=new URL(location.href);url.searchParams.set('repo',d.repo);
 url.searchParams.set('ref',d.ref);if(d.path)url.searchParams.set('path',d.path);else url.searchParams.delete('path');
 if(d.mode==='source'||d.mode==='original')url.searchParams.set('view',d.mode);else url.searchParams.delete('view');
 history.pushState(null,'',url.pathname+url.search);
 showDetail(d.repo,{ref:d.ref,path:d.path,mode:d.mode});
});
loadCatalog();
})();
;
/* Sellone WebPlayer: original project catalog + GitHub HTML + invisible retro cores. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const q=new URLSearchParams(location.search);
const initial=(q.get('repo')||q.get('project')||'').trim().replace(/^holocube999\//i,'');
const initialRef=q.get('ref'),initialPath=q.get('path'),initialView=q.get('view');
const dedicatedApp=q.get('app')==='1'&&initial.toLowerCase()==='nullgod-music';
const validRepo=/^[A-Za-z0-9_.-]{1,100}$/;
const root=new URL('../',location.href), approvedPrefix=new URL('viewer/',root);
function isTunnel(item){return String(item?.repo||'').toLowerCase()==='obscura-tunnel'}
function hideTunnel(){window.SelloneBridgeHost?.disable()}
const GH=window.SelloneGitHub,Retro=window.SelloneRetro,Bundle=window.SelloneBundle;
const all=[];
const types={web_js:'WEB',amiga_media:'AMIGA',native:'NATIVO',site:'SITO',archive:'ARCHIVIO',utility:'UTILITY',audio:'AUDIO'};
let selected=null,loaded=null,remoteMedia=null,remoteKick=null,mediaRevision=null,sourceRevision=null,selectedRevision='',view='js',busy=false;
let syncChannel='',syncReady={js:false,original:false};
function text(node,tag,value){const e=document.createElement(tag);e.textContent=value;node.append(e);return e}
function link(node,label,url,secondary){
 const a=text(node,'a',label);a.className='action'+(secondary?' secondary':'');a.href=url;return a;
}
function showStatus(msg,error=false){
 $('playerStatus').textContent=msg;
 $('playerStatus').style.color=error?'#ffc5d3':'#b7c9d6';
}
function approvedBuild(path){
 if(typeof path!=='string')return '';
 const allowed=/^viewer\/[A-Za-z0-9_.\/-]+\.html?$/i.test(path)||
  ['radio/index.html','apps/obscura-emu/index.html','transfer/index.html'].includes(path);
 if(!allowed||path.split('/').includes('..'))return '';
 const url=new URL(path,root);
 return url.origin===location.origin&&url.pathname.startsWith(root.pathname)&&!url.search&&!url.hash?url.href:'';
}
function viewLink(item){return './?repo='+encodeURIComponent(item.id||item.repo)}
function byRepo(key){return all.find(x=>x.id.toLowerCase()===key.toLowerCase())||
 all.find(x=>x.repo.toLowerCase()===key.toLowerCase())}
function card(item){
 const el=document.createElement('article');el.className='panel project';
 const head=text(el,'div','');head.className='head';
 text(head,'span',types[item.viewer_type]||'PROGETTO').className='eyebrow';
 text(head,'span',item.published?'Pubblicato':'GitHub').className='tag'+(item.published?' playable':'');
 text(el,'h3',item.title);
 text(el,'p',item.description);
 const acts=text(el,'div','');acts.className='actions';
 link(acts,item.published?'▶ Apri applicazione':'▶ Apri nel WebPlayer',viewLink(item),false);
 return el;
}
function listing(value=''){
 if(window.SelloneCatalogUI)return window.SelloneCatalogUI.list(all,value,card);
 const filter=value.toLocaleLowerCase('it');const grid=$('grid');grid.replaceChildren();
 let count=0;
 for(const item of all){
  if(filter&&!String(item.title+' '+item.repo+' '+item.kind).toLocaleLowerCase('it').includes(filter))continue;
  grid.append(card(item));count++;
 }
 $('stats').textContent=count+' / '+all.length+' progetti · '+all.filter(x=>x.published).length+' anteprime pubbliche';
 $('message').textContent=count?'':'Nessun progetto corrispondente';
}
function emptyFrame(){
 hideTunnel();
 const trusted=$('localAppFrame');trusted.removeAttribute('src');trusted.classList.add('hidden');
 const frame=$('playframe');frame.classList.remove('hidden');frame.removeAttribute('src');
 frame.srcdoc='<!doctype html><title>Sellone WebPlayer</title><body style="background:#090b14;color:#b9c3d2;font:15px system-ui;padding:24px">Seleziona una build o un supporto da avviare.</body>';
}
function showFrame(){ $('unavailable').classList.add('hidden');$('playarea').classList.remove('hidden');}
function newChannel(){
 const bytes=crypto.getRandomValues(new Uint8Array(16));
 return 's-'+Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
}
function presentMode(next){
 if(!['js','original','both','source'].includes(next))return;
 view=next;
 const hasJS=next==='js'||next==='both',hasRetro=next==='original'||next==='both';
 for(const b of $('viewModes').querySelectorAll('[data-view]'))b.setAttribute('aria-pressed',String(b.dataset.view===next));
 $('webControls').classList.toggle('hidden',!hasJS);
 $('retroControls').classList.toggle('hidden',!hasRetro);
 $('sourceControls').classList.toggle('hidden',next!=='source');
 $('compareTools').classList.toggle('hidden',next!=='both');
 $('jsPane').classList.toggle('hidden',!hasJS);
 $('originalPane').classList.toggle('hidden',!hasRetro);
 $('sourcePane').classList.toggle('hidden',next!=='source');
 $('playarea').classList.toggle('compare',next==='both');
 $('detailStatus').textContent=next==='both'?'Confronto · JS a sinistra / originale a destra':
  next==='js'?'Versione JavaScript':next==='original'?
   ('Originale · '+(selected?.origin_system==='amiga'?'Amiga / ADF':
   ['c64','c128','vic20','c16'].includes(selected?.origin_system)?selected.origin_system.toUpperCase():'seleziona supporto')):'Sorgenti GitHub';
}
function bridgeHtml(html,capabilities=false){
 const bridge=String.raw`(function(){
 'use strict';
 var channel=CHANNEL, delivering=false;
 var valid=/^(?:Arrow(?:Up|Down|Left|Right)|Key[A-Z]|Digit[0-9]|Space|Enter|Escape|Shift(?:Left|Right)|Control(?:Left|Right))$/;
 for(var action of ['keydown','keyup'])window.addEventListener(action,function(e){
  if(delivering||!e.isTrusted||!valid.test(e.code))return;
  parent.postMessage({type:'SELLONE_SYNC_INPUT_V1',channel:channel,action:e.type,key:e.key,code:e.code,repeat:e.repeat},'*');
 },true);
 window.addEventListener('message',function(e){
  var d=e.data;
  if(e.source!==parent||!d||d.type!=='SELLONE_SYNC_INPUT_V1'||d.channel!==channel||
   !valid.test(String(d.code||''))||!['keydown','keyup'].includes(d.action))return;
  delivering=true;
  try{document.dispatchEvent(new KeyboardEvent(d.action,{key:d.key,code:d.code,repeat:!!d.repeat,bubbles:true,cancelable:true}))}
  finally{delivering=false}
 });
 parent.postMessage({type:'SELLONE_SYNC_READY_V1',channel:channel,side:'js'},'*');
})()`.replace('CHANNEL',JSON.stringify(syncChannel));
 if(capabilities){
  const capabilitySource="(function(){\n 'use strict';\n var channel=CHANNEL,next=0,pending=new Map(),onQr=null,opened=null;\n function post(type,data){parent.postMessage(Object.assign({type:type,channel:channel},data||{}),'*')}\n window.SelloneHostBridge=Object.freeze({\n  available:true,\n  digest:function(bytes){if(!(bytes instanceof ArrayBuffer))return Promise.reject(Error('Buffer SHA-256 non valido'));\n   return new Promise(function(resolve,reject){var id=++next,t=setTimeout(function(){pending.delete(id);reject(Error('Timeout SHA-256 WebPlayer'))},60000);pending.set(id,{resolve:resolve,reject:reject,timer:t});post('SELLONE_BRIDGE_SHA_REQUEST',{id:id,bytes:bytes})})},\n  scan:function(callback){if(typeof callback!=='function')return Promise.reject(Error('Scanner non disponibile'));onQr=callback;return new Promise(function(resolve,reject){opened={resolve:resolve,reject:reject};post('SELLONE_BRIDGE_CAMERA_START')})},\n  stop:function(){onQr=null;post('SELLONE_BRIDGE_CAMERA_STOP')}\n });\n window.addEventListener('message',function(e){\n  if(e.source!==parent||!e.data||e.data.channel!==channel)return;\n  var d=e.data;\n  if(d.type==='SELLONE_BRIDGE_SHA_REPLY'){var p=pending.get(d.id);if(!p)return;pending.delete(d.id);clearTimeout(p.timer);if(d.error)p.reject(Error(String(d.error)));else p.resolve(d.hash)}\n  else if(d.type==='SELLONE_BRIDGE_CAMERA_OPENED'){if(opened){opened.resolve();opened=null}}\n  else if(d.type==='SELLONE_BRIDGE_CAMERA_ERROR'){if(opened){opened.reject(Error(String(d.error)));opened=null}}\n  else if(d.type==='SELLONE_BRIDGE_CAMERA_CLOSED'){onQr=null}\n  else if(d.type==='SELLONE_BRIDGE_CAMERA_FRAME'&&onQr&&typeof jsQR==='function'){\n   try{var code=jsQR(d.pixels,d.width,d.height,{inversionAttempts:'attemptBoth'});if(code&&typeof code.data==='string')onQr(code.data)}catch(_){}\n  }\n });\n window.addEventListener('pagehide',function(){post('SELLONE_BRIDGE_CAMERA_STOP')});\n})()".replace('CHANNEL',JSON.stringify(syncChannel));
  const capabilityTag='<script>'+capabilitySource+'</script>';
  const first=html.search(/<script\b/i);
  if(first>=0)html=html.slice(0,first)+capabilityTag+html.slice(first);else html+=capabilityTag;
 }
 const tag='<script>'+bridge+'</script>';
 const idx=html.toLowerCase().lastIndexOf('</body>');
 return idx>=0?html.slice(0,idx)+tag+html.slice(idx):html+tag;
}
function showJS(result){
 hideTunnel();
 $('localAppFrame').removeAttribute('src');$('localAppFrame').classList.add('hidden');
 $('playframe').classList.remove('hidden');$('playframe').removeAttribute('src');
 const trustedApp=isTunnel(selected);
 if(trustedApp){if(!window.SelloneBridgeHost)throw Error('Bridge WebPlayer assente');window.SelloneBridgeHost.enable($('playframe'),syncChannel)}
 $('playframe').srcdoc=bridgeHtml(result.html,trustedApp);
 syncReady.js=false;updateSync();
}
function updateSync(){
 const mode=$('linkedInput').checked?'collegati':'disattivati';
 $('syncFeedback').textContent='Input '+mode+' · bridge JS '+(syncReady.js?'pronto':'in attesa')+
  ' · core '+(syncReady.original?'pronto':'in attesa')+' · sincronizzazione dei frame non garantita';
}
function relay(data,target){
 const frame=target==='js'?$('playframe'):Retro.frame();
 if(!frame?.contentWindow)return;
 frame.contentWindow.postMessage(data,target==='js'?'*':location.origin);
}
function inputFrom(event){
 if(!event.data||event.data.channel!==syncChannel)return;
 const source=event.source=== $('playframe').contentWindow?'js':event.source===Retro.frame()?.contentWindow?'original':null;
 if(!source)return;
 if(event.data.type==='SELLONE_SYNC_READY_V1'){
  syncReady[source]=true;updateSync();return;
 }
 if(view!=='both'||!$('linkedInput').checked)return;
 if(event.data.type!=='SELLONE_SYNC_INPUT_V1'||!['keydown','keyup'].includes(event.data.action)||
    !/^(?:Arrow(?:Up|Down|Left|Right)|Key[A-Z]|Digit[0-9]|Space|Enter|Escape|Shift(?:Left|Right)|Control(?:Left|Right))$/.test(event.data.code||''))return;
 relay(event.data,source==='js'?'original':'js');
}
window.addEventListener('message',inputFrom);
window.addEventListener('keydown',parentKey,true);
window.addEventListener('keyup',parentKey,true);
function parentKey(event){
 if(!event.isTrusted||view!=='both'||!$('linkedInput').checked)return;
 const target=event.target;
 if(target?.closest?.('input,select,textarea,button,a'))return;
 if(!/^(?:Arrow(?:Up|Down|Left|Right)|Key[A-Z]|Digit[0-9]|Space|Enter|Escape|Shift(?:Left|Right)|Control(?:Left|Right))$/.test(event.code))return;
 if(event.code.startsWith('Arrow')||event.code==='Space')event.preventDefault();
 const data={type:'SELLONE_SYNC_INPUT_V1',channel:syncChannel,action:event.type,key:event.key,code:event.code,repeat:event.repeat};
 relay(data,'js');relay(data,'original');
}
function handleError(error){
 const msg=String(error.message||error);
 showStatus(msg,true);
 if(dedicatedApp)window.dispatchEvent(new CustomEvent('sellone:access-error',{detail:{status:error.status,reason:error.reason,message:error.message,retryAt:error.retryAt}}));
 if([401,403,404].includes(error.status))$('authBox').classList.remove('hidden');
}
function currentRepo(){if(!selected)throw Error('Nessun progetto selezionato');return GH.normalizeRepo(selected.repo)}
function fillPaths(select,files,current){
 select.replaceChildren();
 const blank=document.createElement('option');blank.value='';blank.textContent='Seleziona build';select.append(blank);
 for(const path of files||[]){const opt=document.createElement('option');opt.value=path;opt.textContent=path;select.append(opt)}
 select.value=current||'';
}
function enableUI(active){busy=active;
 for(const id of ['loadLatest','reloadSelected','bootRetro','loadGitMedia','openSource','reloadSource','restartPair'])$(id).disabled=active;
}
async function githubHTML(opts={}){
 if(!selected)return;
 enableUI(true);showFrame();showStatus('Lettura da GitHub e verifica SHA…');
 try{
  const ref=opts.explicit?.ref||(opts.pin?loaded?.ref:undefined);
  const path=opts.explicit?.path||(opts.pin?$('htmlCandidates').value||loaded?.path:undefined);
  const verified=await GH.load({repo:currentRepo(),ref,path});
  if(!Bundle?.prepare)throw Error('Motore dei moduli WebPlayer non disponibile');
  showStatus('Verifica CSS e moduli JavaScript del repository…');
  const result=await Bundle.prepare(verified,GH);
  if(selected?.repo==='NULLGOD-MUSIC'){
   if(!window.SelloneNullGodStorage)throw Error('Storage NULLGOD non disponibile nel WebPlayer');
   showStatus('Ripristino statistiche di ascolto locali…');
   result.html=await window.SelloneNullGodStorage.prepare(result.html,$('playframe'),syncChannel);
  }
  if(selected?.repo==='PocketJS-NativeServer'){
   if(!window.SellonePocketStorage)throw Error('Storage PocketJS non disponibile nel WebPlayer');
   showStatus('Preparazione memoria persistente PocketJS…');
   result.html=await window.SellonePocketStorage.prepare(result.html,$('playframe'),syncChannel);
  }
  const oldFiles=loaded?.files;
  loaded={...result,files:result.files||oldFiles||[]};
  fillPaths($('htmlCandidates'),loaded.files,result.path);
  showJS(result);
  $('detailStatus').textContent='HTML GitHub · '+result.path+' · commit '+result.ref.slice(0,12);
  showStatus('HTML verificato: '+result.path+' · '+result.moduleCount+' moduli JS · '+result.assetCount+' dipendenze.');
  const existing=$('commitAction');
  if(existing)existing.remove();
  const a=link($('detailActions'),'↗ Commit GitHub','https://github.com/'+result.repo+'/commit/'+result.ref,true);
  a.id='commitAction';a.target='_blank';a.rel='noopener noreferrer';
  const url=new URL(location.href);url.searchParams.set('repo',selected.id||selected.repo);
  if(opts.explicit||opts.pin){selectedRevision=result.ref;url.searchParams.set('ref',result.ref);url.searchParams.set('path',result.path)}else{selectedRevision='';url.searchParams.delete('ref');url.searchParams.delete('path')}
  history.replaceState(null,'',url.pathname+url.search);
 }catch(error){emptyFrame();handleError(error)}
 finally{enableUI(false)}
}
async function githubMedia(){
 if(!selected)return;
 enableUI(true);showStatus('Ricerca supporti nel repository GitHub…');
 try{
  mediaRevision=await GH.discoverMedia(currentRepo());
  fillPaths($('mediaCandidates'),mediaRevision.files,mediaRevision.path);
  $('mediaCandidates').classList.remove('hidden');
  await selectedMedia(mediaRevision.path);
 }catch(error){handleError(error)}
 finally{enableUI(false)}
}
async function selectedMedia(path){
 if(!selected||!mediaRevision||!path)return;
 const result=await GH.loadMedia({repo:currentRepo(),ref:mediaRevision.ref,path});
 remoteMedia=new File([result.media],result.path.split('/').pop(),{type:'application/octet-stream'});
 remoteKick=null;
 $('mediaInput').value='';
 if(Retro.needsKick(remoteMedia)&&!$('kickInput').files[0]&&mediaRevision.biosFiles?.length){
  const biosPath=mediaRevision.biosFiles.find(p=>/kick|amiga|a500|a1200/i.test(p))||mediaRevision.biosFiles[0];
  try{
   const source=await GH.loadBios({repo:currentRepo(),ref:mediaRevision.ref,path:biosPath});
   remoteKick=new File([source.bios],'kick.rom',{type:'application/octet-stream'});
  }catch(e){showStatus('Supporto verificato, ma Kickstart privata non disponibile: '+e.message,true)}
 }
 showStatus('GitHub verificato · '+result.path+' · '+result.ref.slice(0,12)+
  (remoteKick?' · Kickstart privata caricata senza pubblicazione':' · pronto per avvio.'));
}
async function boot(){
 const disk=$('mediaInput').files[0]||remoteMedia;
 const kick=$('kickInput').files[0]||remoteKick||null;
 if(!disk||!Retro.supported(disk)){showStatus('Seleziona un ADF, D64, T64 o PRG valido (massimo 3 MiB).',true);return}
 const originalSystem=String(selected?.origin_system||'').toLowerCase();
 if(originalSystem==='amiga'&&!/\.adf$/i.test(disk.name)){
  showStatus('Questo progetto nasce su Amiga: seleziona un ADF.',true);return;
 }
 if(['c64','c128','vic20','c16'].includes(originalSystem)&&/\.adf$/i.test(disk.name)){
  showStatus('Questo progetto Commodore non usa immagini ADF Amiga.',true);return;
 }
 if(['c128','vic20','c16'].includes(originalSystem)){
  showStatus('Il core dedicato a '+originalSystem.toUpperCase()+' non è ancora disponibile in questo WebPlayer.',true);return;
 }
 if(Retro.needsKick(disk)&&!Retro.validKick(kick)){
  showStatus('Per l’avvio Amiga seleziona una Kickstart valida e di tua disponibilità.',true);return;
 }
 enableUI(true);
 try{
  showFrame();const host=$('originalStage');
  syncReady.original=false;updateSync();
  await Retro.start({media:disk,bios:kick,title:selected.title,host,onStatus:showStatus,channel:syncChannel});
  $('detailStatus').textContent='Core retro · '+disk.name+' · '+(Retro.needsKick(disk)?'PUAE':'VICE');
 }catch(error){handleError(error)}
 finally{enableUI(false)}
}
function localBuild(item){
 hideTunnel();
 const url=item.published?approvedBuild(item.url):'';
 if(!url)return false;
 showFrame();
 $('playframe').classList.add('hidden');
 const frame=$('localAppFrame');frame.classList.remove('hidden');frame.src=url;
 $('detailStatus').textContent='Applicazione statica pubblicata';
 showStatus('Applicazione aperta dal catalogo; nessun token GitHub richiesto.');
 return true;
}
async function githubSource(refresh=true){
 if(!selected)return;
 enableUI(true);showStatus('Lettura sorgenti GitHub e verifica SHA…');
 try{
  if(refresh||!sourceRevision)sourceRevision=await GH.discoverFiles(currentRepo(),selectedRevision);
  const file=$('sourceFiles').value&&sourceRevision.files.includes($('sourceFiles').value)?$('sourceFiles').value:sourceRevision.path;
  fillPaths($('sourceFiles'),sourceRevision.files,file);
  const result=await GH.loadText({repo:currentRepo(),ref:sourceRevision.ref,path:file});
  const pre=document.createElement('pre');pre.id='sourcePreview';pre.textContent=result.content;
  $('sourcePane').replaceChildren(pre);
  $('detailStatus').textContent='GitHub · '+result.path+' · '+result.ref.slice(0,12);
  showStatus('Sorgente verificato · '+(result.bytes/1024).toFixed(1)+' KiB · sola lettura');
 }catch(e){handleError(e)}
 finally{enableUI(false)}
}
async function selectView(next){
 if(!selected||busy||!['js','original','both','source'].includes(next))return;
 const previous=view;
 if(previous===next)return;
 if(!['original','both'].includes(next)){
  await Retro.stop();$('originalStage').replaceChildren();syncReady.original=false;
 }
 // Keep the guest iframe alive while hidden: it owns local media and live state.
 // Only switching projects or explicit reload replaces it.
 if(!['js','both'].includes(next))hideTunnel();
 presentMode(next);showFrame();updateSync();
 if(next==='source'){await githubSource();return}
 if(['js','both'].includes(next)&&(previous==='original'||previous==='source')){
  if(isTunnel(selected)){
   // Explicitly restore privileged tunnel capabilities when returning.
   if(!localBuild(selected)){if(loaded)showJS(loaded);else await githubHTML()}
  }else if(!loaded&&!localBuild(selected))await githubHTML();
 }
 if(next==='both'&&!loaded)await githubHTML();
 if(next==='original'||next==='both'){
  const disk=$('mediaInput').files[0]||remoteMedia;
  if(!disk)showStatus('Confronto pronto: seleziona ADF/D64/T64/PRG oppure cerca i media su GitHub.');
 }
}
function showDetail(repo,explicit=null){
 $('listing').classList.add('hidden');$('detail').classList.remove('hidden');
 selected=byRepo(repo)||{id:repo,repo,title:repo,description:'Repository GitHub',viewer_type:'web_js',published:false};
 const item=selected;
 $('detail').dataset.originalSystem=item.origin_system||'';
 loaded=null;remoteMedia=null;remoteKick=null;mediaRevision=null;sourceRevision=null;selectedRevision=explicit?.ref||'';
 syncChannel=newChannel();syncReady={js:false,original:false};
 $('detailName').textContent=item.title;
 $('detailKind').textContent=types[item.viewer_type]||'PROGETTO';
 $('detailDescription').textContent=item.description||'';
 document.title=item.title+' · Sellone WebPlayer';
 const acts=$('detailActions');acts.replaceChildren();
 const repoPage=link(acts,'↗ Repository','https://github.com/holocube999/'+encodeURIComponent(item.repo),true);
 repoPage.target='_blank';repoPage.rel='noopener noreferrer';
 const published=item.published?approvedBuild(item.url):'';
 if(published){
  const publicLink=link(acts,'↗ Anteprima pubblica',published,true);
  publicLink.target='_blank';publicLink.rel='noopener noreferrer';
 }
 for(const b of $('viewModes').querySelectorAll('[data-view]')){
  const available=item.viewer_type==='web_js'||item.viewer_type==='amiga_media'||item.repo==='PocketJS-NativeServer'||b.dataset.view==='source';
  b.disabled=!available;
 }
 presentMode(explicit?.mode==='source'?'source':item.viewer_type==='amiga_media'?'original':
  (item.viewer_type==='archive'||(item.viewer_type==='native'&&item.repo!=='PocketJS-NativeServer'))?'source':'js');
 emptyFrame();showFrame();updateSync();
 if(dedicatedApp&&!GH.hasToken()){
  $('authBox').classList.remove('hidden');
  $('playerStatus').textContent=GH.hasSavedToken()?
   'Accesso riservato. Inserisci la password locale e premi Sblocca per aprire NULLGOD MUSIC.':
   'Accesso riservato. Serve un token GitHub di sola lettura per il repository NULLGOD-MUSIC.';
  return;
 }
 if(view==='source')githubSource();
 else if(view==='js'){
  if(explicit?.ref&&explicit?.path)githubHTML({explicit});
  else if(initialRef&&initialPath&&(item.id||item.repo).toLowerCase()===initial.toLowerCase())
   githubHTML({explicit:{ref:initialRef,path:initialPath}});
  else if(!localBuild(item))githubHTML();
 }else showStatus('Originale: seleziona un supporto locale o GitHub e avvia il core.');
}
async function loadCatalog(){
 try{
  const response=await fetch('../catalog.json',{cache:'no-store',credentials:'omit'});
  if(!response.ok)throw Error('HTTP '+response.status);
  const data=await response.json();
  if(data.schema!==2||!Array.isArray(data.projects))throw Error('Catalogo incompatibile');
  const seen=new Set();
  for(const item of data.projects){
   const id=String(item?.id||item?.repo||'');
   if(!item||!validRepo.test(item.repo||'')||!validRepo.test(id)||seen.has(id.toLowerCase()))continue;
   seen.add(id.toLowerCase());
   all.push({id,repo:item.repo,title:String(item.title||item.repo).slice(0,90),
    description:String(item.description||'').slice(0,250),kind:String(item.kind||''),
    category:String(item.category||''),viewer_type:types[item.viewer_type]?item.viewer_type:'archive',
    origin_system:String(item.origin_system||''),published:item.published===true&&!!approvedBuild(item.url),url:item.url,
    release_path:typeof item.release_path==='string'&&/^(?:radio\/|viewer\/[A-Za-z0-9_-]+\/)$/i.test(item.release_path)?item.release_path:'',
    released_at:typeof item.released_at==='string'?item.released_at:''});
  }
  if(window.SelloneCatalogUI)window.SelloneCatalogUI.init(all,card,{visible:!(initial&&validRepo.test(initial))});
  if(initial&&validRepo.test(initial))showDetail(initial,initialRef&&initialView==='source'?{ref:initialRef,mode:'source'}:null);
  else {listing();if(initial)$('message').textContent='Identificativo repository non valido'}
 }catch(error){$('message').textContent='Errore catalogo: '+String(error.message||error)}
}
$('search').oninput=()=>listing($('search').value);
$('loadLatest').onclick=()=>githubHTML();
$('reloadSelected').onclick=()=>githubHTML({pin:true});
$('htmlCandidates').onchange=()=>{if(loaded)githubHTML({pin:true})};
$('loadGitMedia').onclick=()=>githubMedia();
$('mediaCandidates').onchange=async()=>{try{await selectedMedia($('mediaCandidates').value)}catch(e){handleError(e)}};
$('mediaInput').onchange=()=>{remoteMedia=null;remoteKick=null;showStatus('Supporto locale selezionato; premi Avvia supporto.')};
$('bootRetro').onclick=()=>boot();
$('stopRetro').onclick=async()=>{await Retro.stop();$('originalStage').replaceChildren();syncReady.original=false;updateSync();showStatus('Emulatore fermato; supporti temporanei eliminati.')};
$('useGitToken').onclick=async()=>{
 try{
  await GH.setToken($('gitToken').value,$('gitPassword').value,$('saveToken').checked);
  $('gitToken').value='';$('gitPassword').value='';$('authBox').classList.add('hidden');
  if(view==='source')await githubSource();else if(view==='original')await githubMedia();else await githubHTML();
 }catch(e){handleError(e)}
};
$('unlockGitToken').onclick=async()=>{
 try{await GH.unlock($('gitPassword').value);$('gitPassword').value='';$('authBox').classList.add('hidden');if(view==='source')await githubSource();else if(view==='original')await githubMedia();else await githubHTML()}
 catch(e){handleError(e)}
};
for(const b of $('viewModes').querySelectorAll('[data-view]'))b.onclick=()=>selectView(b.dataset.view);
$('openSource').onclick=()=>githubSource(false);
$('reloadSource').onclick=()=>{selectedRevision='';sourceRevision=null;githubSource(true)};
$('sourceFiles').onchange=()=>githubSource(false);
$('linkedInput').onchange=()=>updateSync();
$('restartPair').onclick=async()=>{
 if(view!=='both')return;
 if(!loaded){await githubHTML()}
 else showJS(loaded);
 const disk=$('mediaInput').files[0]||remoteMedia;
 if(!disk){showStatus('JS riavviato. Seleziona il supporto originale e premi Avvia supporto.',true);return}
 await boot();
 showStatus('Riavvio delle due istanze richiesto · stessa sessione input, senza sincronizzazione deterministica dei frame.');
};
$('forgetGitToken').onclick=()=>{GH.forget();$('authBox').classList.add('hidden');showStatus('Token cifrato eliminato.')};
window.addEventListener('sellone:history-open',event=>{
 const d=event.detail||{};
 if(!validRepo.test(d.repo||'')||!/^[a-f0-9]{40}$/i.test(d.ref||'')||
  (d.mode!=='source'&&!/^(?:[A-Za-z0-9_.-]+\/){0,5}[A-Za-z0-9_.-]+\.html?$/i.test(d.path||'')))return;
 const url=new URL(location.href);url.searchParams.set('repo',d.repo);
 url.searchParams.set('ref',d.ref);if(d.path)url.searchParams.set('path',d.path);else url.searchParams.delete('path');
 if(d.mode==='source')url.searchParams.set('view','source');else url.searchParams.delete('view');
 history.pushState(null,'',url.pathname+url.search);
 showDetail(d.repo,{ref:d.ref,path:d.path,mode:d.mode});
});
loadCatalog();
})();
;
/* sellone-ui.js */
/* Sellone UI: offline vector icons, historical revisions, touch-safe fullscreen. */
(()=>{'use strict';
const $=id=>document.getElementById(id),GH=window.SelloneGitHub,area=$('playarea');
if(!GH||!area)return;
const svg=(path,view='0 0 24 24')=>'<svg viewBox="'+view+'" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+path+'</svg>';
const glyphs={
 js:'<svg class="js-logo" viewBox="0 0 24 24" aria-hidden="true"><path fill="#F7DF1E" d="M0 0h24v24H0z"/><path fill="#151515" d="M0 0h24v24H0V0zm22.034 18.276c-.175-1.095-.888-2.015-3.003-2.873-.736-.345-1.554-.585-1.797-1.14-.091-.33-.105-.51-.046-.705.15-.646.915-.84 1.515-.66.39.12.75.42.976.9 1.034-.676 1.034-.676 1.755-1.125-.27-.42-.404-.601-.586-.78-.63-.705-1.469-1.065-2.834-1.034l-.705.089c-.676.165-1.32.525-1.71 1.005-1.14 1.291-.811 3.541.569 4.471 1.365 1.02 3.361 1.244 3.616 2.205.24 1.17-.87 1.545-1.966 1.41-.811-.18-1.26-.586-1.755-1.336l-1.83 1.051c.21.48.45.689.81 1.109 1.74 1.756 6.09 1.666 6.871-1.004.029-.09.24-.705.074-1.65l.046.067zm-8.983-7.245h-2.248c0 1.938-.009 3.864-.009 5.805 0 1.232.063 2.363-.138 2.711-.33.689-1.18.601-1.566.48-.396-.196-.597-.466-.83-.855-.063-.105-.11-.196-.127-.196l-1.825 1.125c.305.63.75 1.172 1.324 1.517.855.51 2.004.675 3.207.405.783-.226 1.458-.691 1.811-1.411.51-.93.402-2.07.397-3.346.012-2.054 0-4.109 0-6.179l.004-.056z"/></svg>',
 original:svg('<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M9 21h6m-3-4v4"/>'),
 both:svg('<rect x="2" y="4" width="9" height="16" rx="1"/><rect x="13" y="4" width="9" height="16" rx="1"/>'),
 source:svg('<path d="m8 8-4 4 4 4m8-8 4 4-4 4m-3-11-2 14"/>'),
 reload:svg('<path d="M21 12a9 9 0 1 1-3-6.7M21 3v6h-6"/>'),
 play:svg('<path d="m7 4 14 8-14 8z"/>'),
 stop:svg('<rect x="5" y="5" width="14" height="14" rx="2"/>'),
 disk:svg('<rect x="3" y="2" width="18" height="20" rx="2"/><rect x="7" y="3" width="10" height="7"/><rect x="7" y="14" width="10" height="7"/><path d="M14 3v5"/>'),
 cassette:svg('<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="12" r="2"/><circle cx="16" cy="12" r="2"/><path d="M10 12h4m-9 6 3-4h8l3 4"/>'),
 chip:svg('<rect x="6" y="6" width="12" height="12" rx="1"/><path d="M9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4"/>'),
 expand:svg('<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>'),
 shrink:svg('<path d="M3 9h6V3m6 0v6h6M3 15h6v6m6 0v-6h6"/>'),
 history:svg('<path d="M3 12a9 9 0 1 0 3-6.7M3 3v6h6m3-2v5l3 2"/>')
};
function putIcon(el,icon){if(!el||el.querySelector('.sellone-icon'))return;const first=el.firstChild;if(first?.nodeType===3)first.textContent=first.textContent.replace(/^\s*[▶↻■⟳⏵▸]\s*/u,'');const span=document.createElement('span');span.className='sellone-icon';span.innerHTML=glyphs[icon]||glyphs.disk;el.prepend(span)}
const modes={js:'js',original:'original',both:'both',source:'source'};
for(const b of document.querySelectorAll('#viewModes [data-view]'))putIcon(b,modes[b.dataset.view]);
for(const [id,key] of Object.entries({loadLatest:'play',reloadSelected:'reload',bootRetro:'play',stopRetro:'stop',loadGitMedia:'disk',openSource:'source',reloadSource:'reload',restartPair:'reload'}))putIcon($(id),key);
/* Keep the game visible by default. Original media and source views expose their required controls. */
const optionsPanel=$('playerOptions'),optionsToggle=$('playerOptionsToggle'),modeBar=$('viewModes');
if(optionsPanel&&optionsToggle&&modeBar){
 const expandOptions=open=>{optionsPanel.classList.toggle('hidden',!open);optionsToggle.setAttribute('aria-expanded',String(open))};
 optionsToggle.addEventListener('click',()=>expandOptions(optionsPanel.classList.contains('hidden')));
 const syncModeOptions=()=>{
  const active=modeBar.querySelector('[data-view][aria-pressed="true"]')?.dataset.view;
  if(active&&active!=='js')expandOptions(true);
 };
 new MutationObserver(syncModeOptions).observe(modeBar,{subtree:true,attributes:true,attributeFilter:['aria-pressed']});
 syncModeOptions();
}
const mediaLabel=document.querySelector('label[for=mediaInput]'),kickLabel=document.querySelector('label[for=kickInput]');
if(mediaLabel)putIcon(mediaLabel,'disk');if(kickLabel)putIcon(kickLabel,'chip');
const indicator=document.createElement('span');indicator.className='sellone-platform';indicator.setAttribute('aria-label','Sistema originale');$('gameHeader')?.append(indicator);
function systemBadge(name){
 const names={c64:'C64',c128:'C128',vic20:'VIC-20',c16:'C16',amiga:'AMIGA'};
 return names[name]||'AUTO';
}
function platform(){
 const declared=String($('detail').dataset.originalSystem||'').toLowerCase();
 if(['c64','c128','vic20','c16','amiga'].includes(declared))return declared;
 const file=$('mediaInput')?.files?.[0]?.name||'';
 if(/\.adf$/i.test(file))return 'amiga';
 if(/\.(t64|d64|prg)$/i.test(file))return 'c64';
 return '';
}
function formatIcon(){const filename=$('mediaInput')?.files?.[0]?.name||$('mediaCandidates')?.value||'',sys=platform();
 const fmt=/\.([a-z0-9]+)$/i.exec(filename)?.[1]?.toLowerCase()||'';
 const isAmiga=sys==='amiga',isCommodore=['c64','c128','vic20','c16'].includes(sys);
 indicator.replaceChildren();
 if(isAmiga){
  const boing=document.createElement('span');boing.className='sellone-boing';
  boing.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><defs><clipPath id="sellone-boing-clip"><circle cx="12" cy="12" r="10"/></clipPath></defs><g clip-path="url(#sellone-boing-clip)"><rect width="24" height="24" fill="#fff"/><path fill="#d74444" d="M-1 0h8v8h-8zm16 0h9v8h-9zM7 8h8v8H7zm-8 8h8v8h-8zm16 0h9v8h-9z"/></g><circle cx="12" cy="12" r="10" fill="none" stroke="#e9e9f3" stroke-width="1"/></svg>';
  indicator.append(boing);
 }else if(isCommodore){
  const commodore=document.createElement('span');commodore.className='sellone-commodore-mark';
  commodore.textContent='C=';indicator.append(commodore);
 }
 indicator.append(document.createTextNode(systemBadge(sys)));
 indicator.dataset.platform=sys||'unknown';
 if(mediaLabel){mediaLabel.querySelector('.sellone-icon')?.remove();putIcon(mediaLabel,fmt==='t64'?'cassette':'disk');mediaLabel.lastChild.textContent=isAmiga?' ADF':isCommodore?(fmt==='t64'?' T64 · Musicassetta':' D64 / T64 / PRG'):' ADF / D64 / T64 / PRG'}
 if(kickLabel){const hide= !isAmiga;kickLabel.classList.toggle('hidden',hide);$('kickInput')?.classList.toggle('hidden',hide)}
 if($('mediaInput'))$('mediaInput').accept=isAmiga?'.adf':isCommodore?'.d64,.t64,.prg':'.adf,.d64,.t64,.prg';
}
$('mediaInput')?.addEventListener('change',formatIcon);
$('mediaCandidates')?.addEventListener('change',formatIcon);
new MutationObserver(formatIcon).observe($('detailName'),{childList:true,characterData:true,subtree:true});
const state=$('playerStatus');
function statusStyle(){const t=state.textContent.toLowerCase();state.classList.remove('sellone-ok','sellone-error','sellone-warning');
 if(/\b(errore|fallit|impossibile|non valido)\b/.test(t))state.classList.add('sellone-error');
 else if(/\b(verificat|pronto|riuscit|completat)\w*/.test(t)&&!/\b(non |in attesa)\b/.test(t))state.classList.add('sellone-ok');
 else if(/\b(attenzione|seleziona|mancante|non disponibile)\b/.test(t))state.classList.add('sellone-warning');
}
new MutationObserver(statusStyle).observe(state,{childList:true,characterData:true,subtree:true});statusStyle();formatIcon();
const dlg=document.createElement('dialog');dlg.id='sellone-history';
dlg.innerHTML='<div class="sellone-history-box"><header><h2>Altre versioni</h2><button type="button" class="history-close" aria-label="Chiudi">✕</button></header><p class="history-info"></p><div class="history-rows"></div></div>';
document.body.append(dlg);
dlg.querySelector('.history-close').onclick=()=>dlg.close();
dlg.addEventListener('click',e=>{if(e.target===dlg)dlg.close()});
function textNode(parent,tag,value,cls){const el=document.createElement(tag);if(cls)el.className=cls;el.textContent=value;parent.append(el);return el}
function displayDate(value){if(!value)return '';const d=new Date(value);return isNaN(d.getTime())?'':d.toLocaleDateString('it-IT',{day:'2-digit',month:'short',year:'numeric'})}
let historySession=0;
async function downloadRepository(repo,ref='',button=null,status=null){
 if(button?.disabled)return;
 status=status||$('message')||$('playerStatus');
 const label=button?.textContent||'↓ ZIP';
 if(button){button.disabled=true;button.textContent='ZIP…'}
 try{
  const result=await GH.selloneDownloadArchive(repo,ref,p=>{
   if(button)button.textContent='ZIP '+p.done+'/'+p.total;
   if(status)status.textContent='GitHub: '+p.done+'/'+p.total+' file verificati';
  });
  const a=document.createElement('a');a.href=result.url||URL.createObjectURL(result.blob);
  if(result.url){a.target='_blank';a.rel='noopener noreferrer'}
  else a.download=result.filename;
  document.body.append(a);a.click();a.remove();
  if(result.blob)setTimeout(()=>URL.revokeObjectURL(a.href),120000);
  if(status)status.textContent='Download richiesto: '+result.filename;
 }catch(e){if(status)status.textContent='ZIP: '+String(e.message||e)}
 finally{if(button){button.disabled=false;button.textContent=label}}
}
window.addEventListener('sellone:download-zip',e=>{
 const d=e.detail||{};if(/^[A-Za-z0-9_.-]{1,100}$/.test(d.repo||''))
  downloadRepository(d.repo,d.ref||'',d.button,$('playerStatus'));
});
window.addEventListener('sellone:open-history',e=>{
 const d=e.detail||{};if(/^[A-Za-z0-9_.-]{1,100}$/.test(d.repo||''))
  openHistory(d.repo,d.title||d.repo);
});

async function openHistory(repo,title){
 const session=++historySession;
 dlg.querySelector('h2').textContent='Versioni · '+title;
 const info=dlg.querySelector('.history-info'),rows=dlg.querySelector('.history-rows');
 info.textContent='Caricamento revisioni GitHub…';rows.replaceChildren();if(!dlg.open)dlg.showModal();
 let currentPage=0,more=true,loading=false;
 const next=textNode(dlg.querySelector('.sellone-history-box'),'button','Carica altre revisioni','history-more');
 next.type='button';
 function exitHistory(){next.remove();historySession++}
 dlg.addEventListener('close',exitHistory,{once:true});
 const sizeLabel=n=>{
  if(n==null||!Number.isFinite(n))return 'N/D';
  return n>=1024**3?(n/1024**3).toFixed(2)+' GiB':
   n>=1024**2?(n/1024**2).toFixed(2)+' MiB':
   (n/1024).toFixed(1)+' KiB';
 };
 function openAt(ref,path,mode){
  dlg.close();window.dispatchEvent(new CustomEvent('sellone:history-open',{detail:{repo,ref,path,mode}}));
 }
 function render(item){
  const row=textNode(rows,'div','','history-entry'),heading=textNode(row,'strong',item.name,'entry-title');
  textNode(row,'span',[displayDate(item.date),item.sha.slice(0,12)].filter(Boolean).join(' · '),'entry-meta');
  const sizes=textNode(row,'span','Dimensione: calcolo alla selezione','entry-meta');
  if(item.description)textNode(row,'small',item.description,'entry-description');
  const actions=textNode(row,'div','','history-actions');
  const run=textNode(actions,'button','▶ Avvia','history-run'),
   code=textNode(actions,'button','⌘ Codice','history-code'),
   archive=textNode(actions,'button','↓ ZIP','history-zip'),
   permalink=textNode(actions,'button','🔗 Link','history-link');
  run.type=code.type=archive.type=permalink.type='button';
  let details=null,detailsError='';
  const loadDetails=async()=>{
   if(details)return details;
   if(detailsError)throw Error(detailsError);
   try{
    details=await GH.selloneRevisionDetails(repo,item.ref,item.path||item.defaultPath||'');
    sizes.textContent='Snapshot sorgenti: '+sizeLabel(details.totalBytes)+
       (details.path?' · HTML: '+sizeLabel(details.bytes):' · nessun HTML eseguibile');
    if(!details.path&&!details.mediaPath){run.disabled=true;run.title='Nessun HTML o media retro eseguibile nel commit'}
    return details;
   }catch(error){detailsError=String(error.message||error);sizes.textContent='Dimensione non disponibile';throw error}
  };
  run.onclick=async()=>{
   run.disabled=true;info.textContent='Verifica del commit e della build storica…';
   try{const d=await loadDetails();if(d.path)openAt(item.ref,d.path,'js');
    else if(d.mediaPath)openAt(item.ref,d.mediaPath,'original');
    else throw Error('Nessuna build eseguibile: apri Codice');}
   catch(error){info.textContent=String(error.message||error);run.disabled=!!details&&!details.path&&!details.mediaPath}
  };
  code.onclick=()=>openAt(item.ref,'','source');
  archive.onclick=()=>downloadRepository(repo,item.ref,archive,info);
  permalink.onclick=async()=>{
   permalink.disabled=true;
   try{
    const d=await loadDetails(),url=new URL(location.href);
    url.searchParams.set('repo',repo);url.searchParams.set('ref',item.ref);
    if(d.path){url.searchParams.set('path',d.path);url.searchParams.delete('view')}
    else if(d.mediaPath){url.searchParams.set('path',d.mediaPath);url.searchParams.set('view','original')}
    else{url.searchParams.delete('path');url.searchParams.set('view','source')}
    if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url.href);info.textContent='Link permanente copiato'}
    else info.textContent=url.href;
   }catch(e){info.textContent=String(e.message||e)}
   finally{permalink.disabled=false}
  };
  // Fetch only visible-page sizes, at a limited concurrency. Never invent
  // download/archive size: the displayed total is the committed snapshot.
  return loadDetails;
 }
 async function loadMore(){
  if(loading||!more||session!==historySession)return;
  loading=true;next.disabled=true;next.textContent='Caricamento…';
  try{
   const page=++currentPage,data=await GH.selloneVersions(repo,page);
   if(session!==historySession)return;
   if(page===1&&data.files.length){textNode(rows,'h3','Build HTML versionate');data.files.forEach(render)}
   if(data.revisions.length){
    if(page===1)textNode(rows,'h3','Commit GitHub · più recente prima');
    data.revisions.forEach(render); // Avoid one GitHub tree request per listed commit.
   }
   more=data.hasMore;
   next.classList.toggle('hidden',!more);
   info.textContent='Pagina '+page+' · revisioni in ordine cronologico decrescente. Le dimensioni indicano lo snapshot GitHub, non un archivio ZIP.';
   if(!data.revisions.length&&page===1)info.textContent='Nessun commit disponibile.';
  }catch(err){currentPage--;info.textContent='Errore cronologia: '+String(err.message||err)}
  finally{loading=false;next.disabled=false;next.textContent='Carica altre revisioni'}
 }
 next.onclick=loadMore;
 await loadMore();
}
function enhanceCards(){for(const card of document.querySelectorAll('#grid .project:not([data-history])')){
 const href=card.querySelector('a[href*="repo="]')?.href;if(!href)continue;
 const repo=new URL(href,location.href).searchParams.get('repo');if(!/^[A-Za-z0-9_.-]{1,100}$/.test(repo||''))continue;
 card.dataset.history='1';const tools=textNode(card,'div','','sellone-card-extras');
 const btn=textNode(tools,'button','Versioni','sellone-history-link');
 putIcon(btn,'history');btn.onclick=()=>openHistory(repo,card.querySelector('h3')?.textContent||repo);
 const zip=textNode(tools,'button','↓ ZIP','sellone-download-link');
 zip.type='button';zip.title='Scarica progetto completo alla revisione corrente';
 zip.onclick=()=>downloadRepository(repo,'',zip,$('message'));
}}
const grid=$('grid');if(grid){new MutationObserver(enhanceCards).observe(grid,{childList:true});enhanceCards()}

const btn=document.createElement('button');
btn.id='sellone-fullscreen';btn.type='button';
btn.setAttribute('aria-label','Schermo intero');
btn.innerHTML='<span class="sellone-icon">'+glyphs.expand+'</span><span class="fs-label">Schermo intero</span>';
area.append(btn);
let fallback=false,armed=false,timer=0,pointer='mouse',drag=null,ignoreNextClick=false;
const POSITION_KEY='sellone-fs-button-position-v1';
const active=()=>document.fullscreenElement===area||fallback;
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
function loadPosition(){
 try{const v=JSON.parse(localStorage.getItem(POSITION_KEY)||'null');
  return v&&Number.isFinite(v.x)&&Number.isFinite(v.y)?{x:clamp(v.x,0,1),y:clamp(v.y,0,1)}:null;
 }catch{return null}
}
function positionButton(x,y){
 const rect=area.getBoundingClientRect(),width=btn.offsetWidth||42,height=btn.offsetHeight||42;
 const left=clamp(x,6,Math.max(6,rect.width-width-6));
 const top=clamp(y,6,Math.max(6,rect.height-height-6));
 btn.style.left=left+'px';btn.style.top=top+'px';btn.style.right='auto';btn.style.bottom='auto';
 return {x:rect.width>width?left/(rect.width-width):0,y:rect.height>height?top/(rect.height-height):0};
}
function restorePosition(){
 if(!active()){btn.style.left='';btn.style.top='';btn.style.right='';btn.style.bottom='';return}
 const pos=loadPosition();
 if(pos){const rect=area.getBoundingClientRect();positionButton(pos.x*(rect.width-btn.offsetWidth),pos.y*(rect.height-btn.offsetHeight))}
 else{const rect=area.getBoundingClientRect();positionButton(rect.width-(btn.offsetWidth||42)-12,12)}
}
function clearArm(){armed=false;btn.classList.remove('fs-armed');clearTimeout(timer)}
function syncFs(){
 clearArm();const on=active();
 btn.querySelector('.sellone-icon').innerHTML=on?glyphs.shrink:glyphs.expand;
 btn.querySelector('.fs-label').textContent=on?'Riduci':'Schermo intero';
 btn.setAttribute('aria-label',on?'Sposta trascinando o clicca per ridurre':'Schermo intero');
 btn.setAttribute('aria-pressed',String(on));
 btn.title=on?'Trascina per spostare il pulsante · clic per uscire':'Espandi a schermo intero';
 restorePosition();
}
function setFallback(on){fallback=on;area.classList.toggle('sellone-fs-fallback',on);document.body.classList.toggle('sellone-fs-body',on);syncFs()}
async function exitFs(){if(document.fullscreenElement===area)try{await document.exitFullscreen()}catch{};if(fallback)setFallback(false);syncFs()}
btn.addEventListener('pointerdown',e=>{
 pointer=e.pointerType||'mouse';
 if(!active())return;
 drag={id:e.pointerId,x:e.clientX,y:e.clientY,box:btn.getBoundingClientRect(),moved:false};
 btn.setPointerCapture?.(e.pointerId);
});
btn.addEventListener('pointermove',e=>{
 if(!drag||e.pointerId!==drag.id||!active())return;
 const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
 if(!drag.moved&&Math.hypot(dx,dy)<7)return;
 drag.moved=true;
 const areaRect=area.getBoundingClientRect();
 positionButton(drag.box.left-areaRect.left+dx,drag.box.top-areaRect.top+dy);
 e.preventDefault();
});
function endDrag(e){
 if(!drag||e.pointerId!==drag.id)return;
 if(drag.moved){
  ignoreNextClick=true;
  const rect=area.getBoundingClientRect(),x=parseFloat(btn.style.left)||0,y=parseFloat(btn.style.top)||0;
  const pos={x:rect.width>btn.offsetWidth?x/(rect.width-btn.offsetWidth):0,
   y:rect.height>btn.offsetHeight?y/(rect.height-btn.offsetHeight):0};
  try{localStorage.setItem(POSITION_KEY,JSON.stringify(pos))}catch{}
  clearArm();
 }
 drag=null;
}
btn.addEventListener('pointerup',endDrag);
btn.addEventListener('pointercancel',endDrag);
btn.onclick=async()=>{
 if(ignoreNextClick){ignoreNextClick=false;return}
 if(!active()){
  try{if(area.requestFullscreen){await area.requestFullscreen();syncFs();return}}catch{}
  setFallback(true);return;
 }
 const touch=pointer==='touch'||pointer==='pen'||matchMedia('(hover:none) and (pointer:coarse)').matches;
 if(touch&&!armed){armed=true;btn.classList.add('fs-armed');
  btn.querySelector('.fs-label').textContent='Tocca per ridurre';timer=setTimeout(syncFs,2500);return}
 await exitFs();
};
window.addEventListener('resize',()=>{if(active()&&!drag)restorePosition()},{passive:true});
document.addEventListener('fullscreenchange',syncFs);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&fallback)exitFs()});

})();
;
/* Sellone UI: offline vector icons, historical revisions, touch-safe fullscreen. */
(()=>{'use strict';
const $=id=>document.getElementById(id),GH=window.SelloneGitHub,area=$('playarea');
if(!GH||!area)return;
const svg=(path,view='0 0 24 24')=>'<svg viewBox="'+view+'" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+path+'</svg>';
const glyphs={
 js:'<svg class="js-logo" viewBox="0 0 24 24" aria-hidden="true"><path fill="#F7DF1E" d="M0 0h24v24H0z"/><path fill="#151515" d="M0 0h24v24H0V0zm22.034 18.276c-.175-1.095-.888-2.015-3.003-2.873-.736-.345-1.554-.585-1.797-1.14-.091-.33-.105-.51-.046-.705.15-.646.915-.84 1.515-.66.39.12.75.42.976.9 1.034-.676 1.034-.676 1.755-1.125-.27-.42-.404-.601-.586-.78-.63-.705-1.469-1.065-2.834-1.034l-.705.089c-.676.165-1.32.525-1.71 1.005-1.14 1.291-.811 3.541.569 4.471 1.365 1.02 3.361 1.244 3.616 2.205.24 1.17-.87 1.545-1.966 1.41-.811-.18-1.26-.586-1.755-1.336l-1.83 1.051c.21.48.45.689.81 1.109 1.74 1.756 6.09 1.666 6.871-1.004.029-.09.24-.705.074-1.65l.046.067zm-8.983-7.245h-2.248c0 1.938-.009 3.864-.009 5.805 0 1.232.063 2.363-.138 2.711-.33.689-1.18.601-1.566.48-.396-.196-.597-.466-.83-.855-.063-.105-.11-.196-.127-.196l-1.825 1.125c.305.63.75 1.172 1.324 1.517.855.51 2.004.675 3.207.405.783-.226 1.458-.691 1.811-1.411.51-.93.402-2.07.397-3.346.012-2.054 0-4.109 0-6.179l.004-.056z"/></svg>',
 original:svg('<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M9 21h6m-3-4v4"/>'),
 both:svg('<rect x="2" y="4" width="9" height="16" rx="1"/><rect x="13" y="4" width="9" height="16" rx="1"/>'),
 source:svg('<path d="m8 8-4 4 4 4m8-8 4 4-4 4m-3-11-2 14"/>'),
 reload:svg('<path d="M21 12a9 9 0 1 1-3-6.7M21 3v6h-6"/>'),
 play:svg('<path d="m7 4 14 8-14 8z"/>'),
 stop:svg('<rect x="5" y="5" width="14" height="14" rx="2"/>'),
 disk:svg('<rect x="3" y="2" width="18" height="20" rx="2"/><rect x="7" y="3" width="10" height="7"/><rect x="7" y="14" width="10" height="7"/><path d="M14 3v5"/>'),
 cassette:svg('<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="12" r="2"/><circle cx="16" cy="12" r="2"/><path d="M10 12h4m-9 6 3-4h8l3 4"/>'),
 chip:svg('<rect x="6" y="6" width="12" height="12" rx="1"/><path d="M9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4"/>'),
 expand:svg('<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>'),
 shrink:svg('<path d="M3 9h6V3m6 0v6h6M3 15h6v6m6 0v-6h6"/>'),
 history:svg('<path d="M3 12a9 9 0 1 0 3-6.7M3 3v6h6m3-2v5l3 2"/>')
};
function putIcon(el,icon){if(!el||el.querySelector('.sellone-icon'))return;const first=el.firstChild;if(first?.nodeType===3)first.textContent=first.textContent.replace(/^\s*[▶↻■⟳⏵▸]\s*/u,'');const span=document.createElement('span');span.className='sellone-icon';span.innerHTML=glyphs[icon]||glyphs.disk;el.prepend(span)}
const modes={js:'js',original:'original',both:'both',source:'source'};
for(const b of document.querySelectorAll('#viewModes [data-view]'))putIcon(b,modes[b.dataset.view]);
for(const [id,key] of Object.entries({loadLatest:'play',reloadSelected:'reload',bootRetro:'play',stopRetro:'stop',loadGitMedia:'disk',openSource:'source',reloadSource:'reload',restartPair:'reload'}))putIcon($(id),key);
/* Keep the game visible by default. Original media and source views expose their required controls. */
const optionsPanel=$('playerOptions'),optionsToggle=$('playerOptionsToggle'),modeBar=$('viewModes');
if(optionsPanel&&optionsToggle&&modeBar){
 const expandOptions=open=>{optionsPanel.classList.toggle('hidden',!open);optionsToggle.setAttribute('aria-expanded',String(open))};
 optionsToggle.addEventListener('click',()=>expandOptions(optionsPanel.classList.contains('hidden')));
 const syncModeOptions=()=>{
  const active=modeBar.querySelector('[data-view][aria-pressed="true"]')?.dataset.view;
  if(active&&active!=='js')expandOptions(true);
 };
 new MutationObserver(syncModeOptions).observe(modeBar,{subtree:true,attributes:true,attributeFilter:['aria-pressed']});
 syncModeOptions();
}
const mediaLabel=document.querySelector('label[for=mediaInput]'),kickLabel=document.querySelector('label[for=kickInput]');
if(mediaLabel)putIcon(mediaLabel,'disk');if(kickLabel)putIcon(kickLabel,'chip');
const indicator=document.createElement('span');indicator.className='sellone-platform';indicator.setAttribute('aria-label','Sistema originale');$('gameHeader')?.append(indicator);
function systemBadge(name){
 const names={c64:'C64',c128:'C128',vic20:'VIC-20',c16:'C16',amiga:'AMIGA'};
 return names[name]||'AUTO';
}
function platform(){
 const declared=String($('detail').dataset.originalSystem||'').toLowerCase();
 if(['c64','c128','vic20','c16','amiga'].includes(declared))return declared;
 const file=$('mediaInput')?.files?.[0]?.name||'';
 if(/\.adf$/i.test(file))return 'amiga';
 if(/\.(t64|d64|prg)$/i.test(file))return 'c64';
 return '';
}
function formatIcon(){const filename=$('mediaInput')?.files?.[0]?.name||$('mediaCandidates')?.value||'',sys=platform();
 const fmt=/\.([a-z0-9]+)$/i.exec(filename)?.[1]?.toLowerCase()||'';
 const isAmiga=sys==='amiga',isCommodore=['c64','c128','vic20','c16'].includes(sys);
 indicator.replaceChildren();
 if(isAmiga){
  const boing=document.createElement('span');boing.className='sellone-boing';
  boing.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><defs><clipPath id="sellone-boing-clip"><circle cx="12" cy="12" r="10"/></clipPath></defs><g clip-path="url(#sellone-boing-clip)"><rect width="24" height="24" fill="#fff"/><path fill="#d74444" d="M-1 0h8v8h-8zm16 0h9v8h-9zM7 8h8v8H7zm-8 8h8v8h-8zm16 0h9v8h-9z"/></g><circle cx="12" cy="12" r="10" fill="none" stroke="#e9e9f3" stroke-width="1"/></svg>';
  indicator.append(boing);
 }else if(isCommodore){
  const commodore=document.createElement('span');commodore.className='sellone-commodore-mark';
  commodore.textContent='C=';indicator.append(commodore);
 }
 indicator.append(document.createTextNode(systemBadge(sys)));
 indicator.dataset.platform=sys||'unknown';
 if(mediaLabel){mediaLabel.querySelector('.sellone-icon')?.remove();putIcon(mediaLabel,fmt==='t64'?'cassette':'disk');mediaLabel.lastChild.textContent=isAmiga?' ADF':isCommodore?(fmt==='t64'?' T64 · Musicassetta':' D64 / T64 / PRG'):' ADF / D64 / T64 / PRG'}
 if(kickLabel){const hide= !isAmiga;kickLabel.classList.toggle('hidden',hide);$('kickInput')?.classList.toggle('hidden',hide)}
 if($('mediaInput'))$('mediaInput').accept=isAmiga?'.adf':isCommodore?'.d64,.t64,.prg':'.adf,.d64,.t64,.prg';
}
$('mediaInput')?.addEventListener('change',formatIcon);
$('mediaCandidates')?.addEventListener('change',formatIcon);
new MutationObserver(formatIcon).observe($('detailName'),{childList:true,characterData:true,subtree:true});
const state=$('playerStatus');
function statusStyle(){const t=state.textContent.toLowerCase();state.classList.remove('sellone-ok','sellone-error','sellone-warning');
 if(/\b(errore|fallit|impossibile|non valido)\b/.test(t))state.classList.add('sellone-error');
 else if(/\b(verificat|pronto|riuscit|completat)\w*/.test(t)&&!/\b(non |in attesa)\b/.test(t))state.classList.add('sellone-ok');
 else if(/\b(attenzione|seleziona|mancante|non disponibile)\b/.test(t))state.classList.add('sellone-warning');
}
new MutationObserver(statusStyle).observe(state,{childList:true,characterData:true,subtree:true});statusStyle();formatIcon();
const dlg=document.createElement('dialog');dlg.id='sellone-history';
dlg.innerHTML='<div class="sellone-history-box"><header><h2>Altre versioni</h2><button type="button" class="history-close" aria-label="Chiudi">✕</button></header><p class="history-info"></p><div class="history-rows"></div></div>';
document.body.append(dlg);
dlg.querySelector('.history-close').onclick=()=>dlg.close();
dlg.addEventListener('click',e=>{if(e.target===dlg)dlg.close()});
function textNode(parent,tag,value,cls){const el=document.createElement(tag);if(cls)el.className=cls;el.textContent=value;parent.append(el);return el}
function displayDate(value){if(!value)return '';const d=new Date(value);return isNaN(d.getTime())?'':d.toLocaleDateString('it-IT',{day:'2-digit',month:'short',year:'numeric'})}
let historySession=0;
async function openHistory(repo,title){
 const session=++historySession;
 dlg.querySelector('h2').textContent='Versioni · '+title;
 const info=dlg.querySelector('.history-info'),rows=dlg.querySelector('.history-rows');
 info.textContent='Caricamento revisioni GitHub…';rows.replaceChildren();if(!dlg.open)dlg.showModal();
 let currentPage=0,more=true,loading=false;
 const next=textNode(dlg.querySelector('.sellone-history-box'),'button','Carica altre revisioni','history-more');
 next.type='button';
 function exitHistory(){next.remove();historySession++}
 dlg.addEventListener('close',exitHistory,{once:true});
 const sizeLabel=n=>{
  if(n==null||!Number.isFinite(n))return 'N/D';
  return n>=1024**3?(n/1024**3).toFixed(2)+' GiB':
   n>=1024**2?(n/1024**2).toFixed(2)+' MiB':
   (n/1024).toFixed(1)+' KiB';
 };
 function openAt(ref,path,mode){
  dlg.close();window.dispatchEvent(new CustomEvent('sellone:history-open',{detail:{repo,ref,path,mode}}));
 }
 function render(item){
  const row=textNode(rows,'div','','history-entry'),heading=textNode(row,'strong',item.name,'entry-title');
  textNode(row,'span',[displayDate(item.date),item.sha.slice(0,12)].filter(Boolean).join(' · '),'entry-meta');
  const sizes=textNode(row,'span','Dimensione: calcolo su richiesta…','entry-meta');
  if(item.description)textNode(row,'small',item.description,'entry-description');
  const actions=textNode(row,'div','','history-actions');
  const run=textNode(actions,'button','▶ Avvia questa revisione','history-run'),code=textNode(actions,'button','⌘ Codice a questa revisione','history-code');
  run.type=code.type='button';
  let details=null,detailsError='';
  const loadDetails=async()=>{
   if(details)return details;
   if(detailsError)throw Error(detailsError);
   try{
    details=await GH.selloneRevisionDetails(repo,item.ref,item.path||item.defaultPath||'');
    sizes.textContent='Snapshot sorgenti: '+sizeLabel(details.totalBytes)+
       (details.path?' · HTML: '+sizeLabel(details.bytes):' · nessun HTML eseguibile');
    if(!details.path){run.disabled=true;run.title='Revisione senza build HTML, sorgenti disponibili'}
    return details;
   }catch(error){detailsError=String(error.message||error);sizes.textContent='Dimensione non disponibile';throw error}
  };
  run.onclick=async()=>{
   run.disabled=true;info.textContent='Verifica del commit e della build storica…';
   try{const d=await loadDetails();if(!d.path)throw Error('Questa revisione non contiene HTML: usa Codice');
    openAt(item.ref,d.path,'js');}
   catch(error){info.textContent=String(error.message||error);run.disabled=!!details&&!details.path}
  };
  code.onclick=()=>openAt(item.ref,'','source');
  return loadDetails;
 }
 async function loadMore(){
  if(loading||!more||session!==historySession)return;
  loading=true;next.disabled=true;next.textContent='Caricamento…';
  try{
   const page=++currentPage,data=await GH.selloneVersions(repo,page);
   if(session!==historySession)return;
   if(page===1&&data.files.length){textNode(rows,'h3','Build HTML versionate');data.files.map(render).forEach(check=>{check().catch(()=>{})})}
   if(data.revisions.length){
    if(page===1)textNode(rows,'h3','Commit GitHub · più recente prima');
    const checks=data.revisions.map(render);
    (async()=>{
     const queue=checks.slice();
     const worker=async()=>{while(queue.length&&session===historySession){
      const check=queue.shift();try{await check()}catch{}}
     };
     await Promise.all([worker(),worker(),worker()]);
    })();
   }
   more=data.hasMore;
   next.classList.toggle('hidden',!more);
   info.textContent='Pagina '+page+' · revisioni in ordine cronologico decrescente. Le dimensioni indicano lo snapshot GitHub, non un archivio ZIP.';
   if(!data.revisions.length&&page===1)info.textContent='Nessun commit disponibile.';
  }catch(err){currentPage--;info.textContent='Errore cronologia: '+String(err.message||err)}
  finally{loading=false;next.disabled=false;next.textContent='Carica altre revisioni'}
 }
 next.onclick=loadMore;
 await loadMore();
}
function enhanceCards(){for(const card of document.querySelectorAll('#grid .project:not([data-history])')){
 const href=card.querySelector('a[href*="repo="]')?.href;if(!href)continue;
 const repo=new URL(href,location.href).searchParams.get('repo');if(!/^[A-Za-z0-9_.-]{1,100}$/.test(repo||''))continue;
 card.dataset.history='1';const btn=textNode(card,'button','Versioni / revisioni','sellone-history-link');
 putIcon(btn,'history');btn.onclick=()=>openHistory(repo,card.querySelector('h3')?.textContent||repo);
}}
const grid=$('grid');if(grid){new MutationObserver(enhanceCards).observe(grid,{childList:true});enhanceCards()}
const btn=document.createElement('button');
btn.id='sellone-fullscreen';btn.type='button';
btn.setAttribute('aria-label','Schermo intero');
btn.innerHTML='<span class="sellone-icon">'+glyphs.expand+'</span><span class="fs-label">Schermo intero</span>';
area.append(btn);
let fallback=false,armed=false,timer=0,pointer='mouse',drag=null,ignoreNextClick=false;
const POSITION_KEY='sellone-fs-button-position-v1';
const active=()=>document.fullscreenElement===area||fallback;
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
function loadPosition(){
 try{const v=JSON.parse(localStorage.getItem(POSITION_KEY)||'null');
  return v&&Number.isFinite(v.x)&&Number.isFinite(v.y)?{x:clamp(v.x,0,1),y:clamp(v.y,0,1)}:null;
 }catch{return null}
}
function positionButton(x,y){
 const rect=area.getBoundingClientRect(),width=btn.offsetWidth||42,height=btn.offsetHeight||42;
 const left=clamp(x,6,Math.max(6,rect.width-width-6));
 const top=clamp(y,6,Math.max(6,rect.height-height-6));
 btn.style.left=left+'px';btn.style.top=top+'px';btn.style.right='auto';btn.style.bottom='auto';
 return {x:rect.width>width?left/(rect.width-width):0,y:rect.height>height?top/(rect.height-height):0};
}
function restorePosition(){
 if(!active()){btn.style.left='';btn.style.top='';btn.style.right='';btn.style.bottom='';return}
 const pos=loadPosition();
 if(pos){const rect=area.getBoundingClientRect();positionButton(pos.x*(rect.width-btn.offsetWidth),pos.y*(rect.height-btn.offsetHeight))}
 else{const rect=area.getBoundingClientRect();positionButton(rect.width-(btn.offsetWidth||42)-12,12)}
}
function clearArm(){armed=false;btn.classList.remove('fs-armed');clearTimeout(timer)}
function syncFs(){
 clearArm();const on=active();
 btn.querySelector('.sellone-icon').innerHTML=on?glyphs.shrink:glyphs.expand;
 btn.querySelector('.fs-label').textContent=on?'Riduci':'Schermo intero';
 btn.setAttribute('aria-label',on?'Sposta trascinando o clicca per ridurre':'Schermo intero');
 btn.setAttribute('aria-pressed',String(on));
 btn.title=on?'Trascina per spostare il pulsante · clic per uscire':'Espandi a schermo intero';
 restorePosition();
}
function setFallback(on){fallback=on;area.classList.toggle('sellone-fs-fallback',on);document.body.classList.toggle('sellone-fs-body',on);syncFs()}
async function exitFs(){if(document.fullscreenElement===area)try{await document.exitFullscreen()}catch{};if(fallback)setFallback(false);syncFs()}
btn.addEventListener('pointerdown',e=>{
 pointer=e.pointerType||'mouse';
 if(!active())return;
 drag={id:e.pointerId,x:e.clientX,y:e.clientY,box:btn.getBoundingClientRect(),moved:false};
 btn.setPointerCapture?.(e.pointerId);
});
btn.addEventListener('pointermove',e=>{
 if(!drag||e.pointerId!==drag.id||!active())return;
 const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
 if(!drag.moved&&Math.hypot(dx,dy)<7)return;
 drag.moved=true;
 const areaRect=area.getBoundingClientRect();
 positionButton(drag.box.left-areaRect.left+dx,drag.box.top-areaRect.top+dy);
 e.preventDefault();
});
function endDrag(e){
 if(!drag||e.pointerId!==drag.id)return;
 if(drag.moved){
  ignoreNextClick=true;
  const rect=area.getBoundingClientRect(),x=parseFloat(btn.style.left)||0,y=parseFloat(btn.style.top)||0;
  const pos={x:rect.width>btn.offsetWidth?x/(rect.width-btn.offsetWidth):0,
   y:rect.height>btn.offsetHeight?y/(rect.height-btn.offsetHeight):0};
  try{localStorage.setItem(POSITION_KEY,JSON.stringify(pos))}catch{}
  clearArm();
 }
 drag=null;
}
btn.addEventListener('pointerup',endDrag);
btn.addEventListener('pointercancel',endDrag);
btn.onclick=async()=>{
 if(ignoreNextClick){ignoreNextClick=false;return}
 if(!active()){
  try{if(area.requestFullscreen){await area.requestFullscreen();syncFs();return}}catch{}
  setFallback(true);return;
 }
 const touch=pointer==='touch'||pointer==='pen'||matchMedia('(hover:none) and (pointer:coarse)').matches;
 if(touch&&!armed){armed=true;btn.classList.add('fs-armed');
  btn.querySelector('.fs-label').textContent='Tocca per ridurre';timer=setTimeout(syncFs,2500);return}
 await exitFs();
};
window.addEventListener('resize',()=>{if(active()&&!drag)restorePosition()},{passive:true});
document.addEventListener('fullscreenchange',syncFs);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&fallback)exitFs()});
})();
;
