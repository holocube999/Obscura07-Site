/* Sellone WebPlayer GitHub engine: no game HTML receives a token. */
(()=>{'use strict';
const OWNER='holocube999';
const repoPattern=/^[A-Za-z0-9_.-]{1,100}$/;
const pathPattern=/^(?:[A-Za-z0-9_.-]+\/){0,5}[A-Za-z0-9_.-]+\.html?$/i;
const shaPattern=/^[a-f0-9]{40}$/i;
const STORAGE='sellone-webplayer-token-v1';
let token='';
function normalizeRepo(repo){
 const short=String(repo||'').replace(/^holocube999\//i,'');
 if(!repoPattern.test(short))throw Error('Nome repository non valido');
 return OWNER+'/'+short;
}
async function api(url){
 const headers={'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
 if(token)headers.Authorization='Bearer '+token;
 const response=await fetch(url,{headers,credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer'});
 if(!response.ok){
  const err=Error('GitHub HTTP '+response.status+(response.status===401||response.status===403||response.status===404?': verifica accesso al repository o token Contents:read':''));
  err.status=response.status;throw err;
 }
 return response.json();
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
async function discover(input){
 const repo=normalizeRepo(input),base='https://api.github.com/repos/'+repo;
 const meta=await api(base);
 const commit=await api(base+'/commits/'+encodeURIComponent(meta.default_branch||'main'));
 if(!shaPattern.test(commit.sha||''))throw Error('Revisione GitHub non valida');
 const result=await api(base+'/git/trees/'+commit.sha+'?recursive=1');
 if(result.truncated)throw Error('Albero GitHub troppo grande: selezione automatica sospesa');
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
async function checkBlob(bytes,expectedSha){
 const header=new TextEncoder().encode('blob '+bytes.length+'\0');
 const input=new Uint8Array(header.length+bytes.length);input.set(header);input.set(bytes,header.length);
 const hash=await crypto.subtle.digest('SHA-1',input);
 const hex=Array.from(new Uint8Array(hash),c=>c.toString(16).padStart(2,'0')).join('');
 if(hex!==expectedSha.toLowerCase())throw Error('Blob SHA-1 GitHub non corrispondente');
}
async function load(input){
 const repo=normalizeRepo(input.repo);
 let ref=input.ref,path=input.path;
 let files;
 if(!ref){const newest=await discover(repo);ref=newest.ref;files=newest.files;path=path||newest.path}
 if(!shaPattern.test(ref||''))throw Error('SHA GitHub completo richiesto');
 safePath(path);
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
 return {repo,ref,path,files,html,bytes:bytes.length,blob:entry.sha};
}

const mediaPattern=/^(?:[A-Za-z0-9_.-]+\/){0,5}[A-Za-z0-9_.-]+\.(?:adf|d64|t64|prg)$/i;
const biosPattern=/^(?:[A-Za-z0-9_.-]+\/){0,5}[A-Za-z0-9_.-]+\.(?:rom|bin|kick|a500|a1200)$/i;
async function discoverMedia(input){
 const repo=normalizeRepo(input),base='https://api.github.com/repos/'+repo;
 const meta=await api(base);
 const commit=await api(base+'/commits/'+encodeURIComponent(meta.default_branch||'main'));
 if(!shaPattern.test(commit.sha||''))throw Error('Revisione GitHub non valida');
 const tree=await api(base+'/git/trees/'+commit.sha+'?recursive=1');
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
async function discoverFiles(input){
 const repo=normalizeRepo(input),base='https://api.github.com/repos/'+repo;
 const meta=await api(base);
 const commit=await api(base+'/commits/'+encodeURIComponent(meta.default_branch||'main'));
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
 token=value;
}
async function unlock(password){
 const raw=localStorage.getItem(STORAGE);if(!raw)throw Error('Nessun token cifrato presente');
 const obj=JSON.parse(raw);if(obj.v!==1)throw Error('Archivio token incompatibile');
 const k=await keyFor(password,bytesFromBase64(obj.salt));
 token=new TextDecoder('utf-8',{fatal:true}).decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:bytesFromBase64(obj.iv)},k,bytesFromBase64(obj.payload)));
}
function forget(){token='';localStorage.removeItem(STORAGE)}
window.SelloneGitHub=Object.freeze({normalizeRepo,discover,load,discoverMedia,loadMedia,loadBios,discoverFiles,loadText,setToken,unlock,forget,hasToken:()=>!!token,hasSavedToken:()=>!!localStorage.getItem(STORAGE)});
})();
