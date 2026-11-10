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
