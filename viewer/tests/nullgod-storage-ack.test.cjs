'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('viewer/nullgod-storage.js','utf8');
const start=source.indexOf('function guestRuntime(seed,channel){');
const end=source.indexOf("\nwindow.addEventListener('message'",start);
assert.ok(start>=0&&end>start,'Persistent guest storage runtime is missing');
const definition=source.slice(start,end);
const sent=[],listeners=[];
const parent={postMessage(message){sent.push(message)}};
const window={addEventListener(type,fn){if(type==='message')listeners.push(fn)}};
const globals={window,parent,Map,Set,Promise,Object,JSON,Number,String,setTimeout,clearTimeout};
const run=vm.runInNewContext('('+definition+')',globals);
run({'ng-insights-v1':'{"plays":4}'},'channel123');
const storage=window.NullGodHost.storage;
assert.equal(storage.getItem('ng-insights-v1'),'{"plays":4}');
assert.equal(storage.getItem('ng-yt'),null,'The host must not expose API secrets');
assert.throws(()=>storage.setItem('ng-yt','secret'),/autorizzata/);
storage.setItem('ng-insights-v1','{"plays":6}');
storage.removeItem('ng-source');
assert.equal(sent.length,2);
assert.equal(sent[0].op,'set');
assert.equal(sent[1].op,'delete');
let settled=false;
const flush=storage.flush().then(x=>{settled=true;return x});
Promise.resolve().then(()=>{
 assert.equal(settled,false,'flush must wait for the storage host ACK');
 for(const message of sent){
  for(const listener of listeners)listener({source:parent,data:{
   type:'SELLONE_NG_STORAGE_ACK_V1',channel:'channel123',id:message.id,ok:true}});
 }
 return flush;
}).then(ok=>{
 assert.equal(ok,true,'flush should resolve true after every acknowledged write');
 assert.equal(settled,true);
 assert.equal(storage.getItem('ng-insights-v1'),'{"plays":6}');
 console.log('Sellone NULLGOD storage: source-scoped ACK flush, statistics persist, token keys blocked PASS');
}).catch(e=>{console.error(e);process.exitCode=1});
