/* NULLGOD WebPlayer persistent local insights.
 * The private GitHub token stays in the parent; the guest gets only allowlisted preferences.
 */
(()=>{'use strict';
const DB='SelloneNullGodLocal',STORE='kv',LIMIT=1100000;
const KEYS=new Set(['ng-insights-v1','ng-pref','ng-autoSkip','ng-embedLyrics','ng-source']);
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
 const allowed=new Set(['ng-insights-v1','ng-pref','ng-autoSkip','ng-embedLyrics','ng-source']);
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
