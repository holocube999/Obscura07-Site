const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync('viewer/github-runtime.js','utf8');
const a=source.indexOf('async function api(url){'),b=source.indexOf('\nfunction safePath(',a);
let calls=0,fail=false;const cache=new Map();
const context={requestCache:cache,requestEpoch:0,blockedUntil:0,Date,
 apiNetwork:async()=>{calls++;if(fail){const e=Error('limit');e.reason='rate_limit';e.retryAt=Date.now()+60000;throw e}return {ok:true}}};
const api=vm.runInNewContext('('+source.slice(a,b)+')',context);
(async()=>{
 await Promise.all([api('/same'),api('/same'),api('/same')]);assert.equal(calls,1);
 await api('/same');assert.equal(calls,1);
 context.requestEpoch++;await api('/same');assert.equal(calls,2);
 fail=true;await assert.rejects(()=>api('/limited'));assert.equal(calls,3);
 await assert.rejects(()=>api('/new'),e=>e.reason==='rate_limit');assert.equal(calls,3);
 console.log('PASS repeated reads coalesce, credential changes invalidate cache, cooldown performs zero requests');
})().catch(e=>{console.error(e);process.exitCode=1});
