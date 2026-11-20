'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const src=fs.readFileSync('viewer/github-runtime.js','utf8');
const requests=[];
const sha='74cfb579e614dad6319544032c1c131d02dce441';
const fakeFetch=async (url,opts)=>{
 requests.push({url,opts});
 let data;
 if(url.endsWith('/commits/main'))data={sha};
 else if(url.endsWith('/repos/holocube999/Example'))data={default_branch:'main'};
 else if(url.endsWith('/commits/'+sha))data={sha};
 else if(url.includes('/git/trees/'))data={tree:[{type:'blob',size:12000,path:'index.html'}]};
 else throw Error('Unexpected URL: '+url);
 return {ok:true,status:200,headers:{get:key=>({'x-ratelimit-limit':'5000','x-ratelimit-remaining':'4930'}[key]||null)},json:async()=>data};
};
const window={},localStorage={getItem(){return null},setItem(){},removeItem(){}};
const ctx={window,localStorage,fetch:fakeFetch,Date,Map,Set,Promise,Error,RegExp,encodeURIComponent,URL,TextEncoder,TextDecoder};
vm.runInNewContext(src,ctx,{filename:'github-runtime.js'});
(async()=>{
 const GH=window.SelloneGitHub;
 await GH.setToken('github_pat_fake_token_for_tests_123','',false);
 const a=await GH.discover('NULLGOD-MUSIC');
 assert.equal(a.path,'dist/index.html');
 assert.equal(a.files.length,1);
 assert.equal(requests.length,1,'NULLGOD must use just one GitHub API call for discovery');
 assert.equal(requests[0].opts.headers.Authorization,'Bearer github_pat_fake_token_for_tests_123');
 await GH.discover('NULLGOD-MUSIC');
 assert.equal(requests.length,1,'Repeated discovery must share the same cached request');
 const b=await GH.discover('Example');
 assert.equal(b.path,'index.html');
 assert.equal(requests.length,4,'Generic viewer discovery still handles arbitrary repositories');
 assert.ok(!src.includes("cache:'no-store'"),'Allow HTTP conditional requests');
 assert.match(src,/verifiedHtmlCache\.set\(cacheKey,verified\)/);
 console.log('PASS private NULLGOD API request budget and auth');
})().catch(e=>{console.error(e);process.exitCode=1});


(async()=>{
 const vm2=require('node:vm'),webcrypto=require('node:crypto').webcrypto;
 const state=new Map(),calls=[];
 const sha2='74cfb579e614dad6319544032c1c131d02dce441';
 const local={getItem:k=>state.get(k)||null,setItem:(k,v)=>state.set(k,v),removeItem:k=>state.delete(k)};
 const fake=async(url,opts)=>{
  calls.push(opts.headers.Authorization);
  let body;
  if(url.endsWith('/repos/holocube999/Example'))body={default_branch:'main'};
  else if(url.endsWith('/commits/main'))body={sha:sha2};
  else if(url.includes('/git/trees/'))body={tree:[{type:'blob',size:12345,path:'index.html'}]};
  else throw Error('Unexpected url '+url);
  const denied=opts.headers.Authorization==='Bearer rejected-token-1234567890';
  return {ok:!denied,status:denied?401:200,
   headers:{get:()=>null},json:async()=>denied?{message:'Bad credentials'}:body};
 };
 const w={},ctx={window:w,localStorage:local,fetch:fake,crypto:webcrypto,Date,Map,Set,Promise,Error,RegExp,
   encodeURIComponent,URL,TextEncoder,TextDecoder,Uint8Array,atob,btoa};
 vm2.runInNewContext(src,ctx,{filename:'github-runtime.js'});
 const GH=w.SelloneGitHub;
 const old='github_pat_previous_abcdefghijk';
 const fresh='github_pat_fresh_abcdefghijklm';
 await GH.setToken(old,'local-passphrase-123',true);
 assert.equal(GH.hasSavedToken(),true);
 await GH.discover('Example');
 const oldCalls=calls.length;
 await GH.setToken(fresh,'',false,true);
 assert.equal(GH.hasSavedToken(),false,'Replacing token without remember must remove obsolete saved credential');
 await GH.discover('Example');
 assert.equal(calls.length,oldCalls+3,'Token change must invalidate GitHub request cache');
 assert.equal(calls.at(-1),'Bearer '+fresh);
 await GH.setToken(fresh,'local-passphrase-123',true);
 await GH.setToken(old,'',false,false);
 await GH.discover('Example');
 const before=calls.length;
 await GH.unlock('local-passphrase-123');
 await GH.discover('Example');
 assert.equal(calls.length,before+3,'Unloading saved token must invalidate requests created with previous token');
 assert.equal(calls.at(-1),'Bearer '+fresh);
 await GH.setToken('rejected-token-1234567890','',false,true);
 await assert.rejects(GH.discover('Example'),error=>error.status===401&&
   error.reason==='invalid_token'&&/non significa necessariamente/.test(error.message));
 console.log('PASS token replacement, saved credential, unlock cache, HTTP 401 diagnosis');
})().catch(e=>{console.error(e);process.exitCode=1});
