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
 // Keep future writes flowing after a rejected transaction.
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
 // The embedded PocketJS runtime selects this optional host port itself.
 // Do not rewrite storage functions or override browser globals in guest HTML.
 active={db,frame,channel,pending:Promise.resolve()};
 return injected;
}
window.SellonePocketStorage=Object.freeze({prepare});
})();