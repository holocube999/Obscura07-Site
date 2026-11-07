'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const code=fs.readFileSync('viewer/pocketjs-storage.js','utf8');
function harness(existing={}){
 const persisted=new Map(Object.entries(existing));
 let hostListener,guestListener,entry;
 const db={transaction(_store,mode){
  const tx={oncomplete:null,onerror:null,onabort:null,objectStore(){
   return{
    openCursor(){
     const req={};const rows=[...persisted.entries()];let i=0;
     queueMicrotask(function next(){
      req.result=i<rows.length?{key:rows[i][0],value:rows[i++][1],continue(){queueMicrotask(next)}}:null;
      req.onsuccess?.();
     });return req;
    },
    put(value,key){persisted.set(key,value);queueMicrotask(()=>tx.oncomplete?.())},
    delete(key){persisted.delete(key);queueMicrotask(()=>tx.oncomplete?.())}
   };
  }};return tx;
 }};
 const indexedDB={open(){
  const request={result:db};queueMicrotask(()=>request.onsuccess?.());return request;
 }};
 const guestWindow={addEventListener(type,fn){if(type==='message')guestListener=fn}};
 const parent={postMessage(message){hostListener?.({data:message,source:frame.contentWindow})}};
 const frame={contentWindow:{postMessage(message){guestListener?.({data:message,source:parent})}}};
 const hostWindow={indexedDB,addEventListener(type,fn){if(type==='message')hostListener=fn}};
 const api=vm.runInNewContext(code+'\nwindow.SellonePocketStorage',{window:hostWindow,indexedDB,Promise,Map,Error,JSON,Object,String});
 return {api,persisted,frame,guestWindow,parent};
}
function makeGuestCode(html){
 const p=html.indexOf('<script>'),end=html.indexOf('</script>',p);
 assert.ok(p>=0&&end>p);return html.slice(p+8,end);
}
const sample=`<!doctype html><html><head><meta name="pocketjs-studio" content="1"></head>
<body><script>
const PJS_HOST=window.PocketJSHost&&window.PocketJSHost.version===1?window.PocketJSHost:null;
const PJS_STORE=PJS_HOST?.storage||window.localStorage;
async function initPersistentStore(){return PJS_HOST?'host':'local'}
async function storageFlush(){return PJS_HOST?PJS_STORE.flush():true}
function newProject(){PJS_STORE.setItem('pjs.file.project-1','hello');return PJS_STORE.getItem('pjs.file.old')}
</script></body></html>`;

test('opaque guest gets a host port without replacing localStorage or changing core functions',async()=>{
 const h=harness({'pjs.file.old':'existing'});
 const html=await h.api.prepare(sample,h.frame,'nonce-123');
 assert.match(html,/window.PocketJSHost=Object.freeze/);
 assert.doesNotMatch(html,/const localStorage\s*=/);
 assert.match(html,/function newProject\(\)/);
 assert.match(html,/async function storageFlush\(\)/);
 const g=vm.runInNewContext(makeGuestCode(html)+'\n({newProject,storageFlush,initPersistentStore})',{
  window:h.guestWindow,parent:h.parent,Map,Promise,Object,Error,String,console
 });
 assert.equal(await g.initPersistentStore(),'host');
 assert.equal(g.newProject(),'existing');
 await g.storageFlush();
 assert.equal(h.persisted.get('pjs.file.project-1'),'hello');
});

test('wrong source or session cannot overwrite the storage database',async()=>{
 const h=harness();
 await h.api.prepare(sample,h.frame,'correct-session');
 h.parent.postMessage({type:'SELLONE_PJS_STORAGE_WRITE_V1',channel:'wrong-session',id:42,op:'set',key:'pjs.file.forbidden',value:'x'});
 await Promise.resolve();
 assert.equal(h.persisted.has('pjs.file.forbidden'),false);
});

test('stored values persist across separate sessions',async()=>{
 const h=harness({'pjs.file.keep':'retained'});
 const h1=await h.api.prepare(sample,h.frame,'session-a');
 assert.match(h1,/retained/);
 await h.api.prepare(sample,h.frame,'session-b');
 assert.equal(h.persisted.get('pjs.file.keep'),'retained');
});

test('viewer does not weaken iframe sandbox or bundle tokens into guest code',()=>{
 const page=fs.readFileSync('viewer/index.html','utf8');
 const app=fs.readFileSync('viewer/catalog.js','utf8');
 assert.match(page,/id="playframe"[^>]*sandbox="allow-scripts allow-pointer-lock allow-forms allow-downloads"/);
 assert.doesNotMatch(page,/id="playframe"[^>]*sandbox="[^"]*allow-same-origin/);
 assert.match(app,/SellonePocketStorage\.prepare/);
 assert.doesNotMatch(code,/Authorization|Bearer|gitToken/);
});
