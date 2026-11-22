import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8'),code=read('viewer/github-runtime.js'),preview='b'.repeat(40),main='a'.repeat(40);
async function fixture({privateRepo=true,auth=true,branch='development-playable'}={}){
 const calls=[],window={},localStorage={getItem:()=>null,removeItem:()=>{}};
 const fetch=async(url,opts)=>{calls.push({url,auth:!!opts.headers.Authorization});let value;if(url.endsWith('/repos/holocube999/JSWarmUp'))value={private:privateRepo,default_branch:'main'};else if(url.endsWith('/commits/development-playable'))value={sha:preview};else if(url.endsWith('/commits/main'))value={sha:main};else if(url.includes('/git/trees/'))value={tree:[{type:'blob',path:'index.html',size:2500}]};else throw Error('Unexpected URL');return {ok:true,headers:{get:()=>null},json:async()=>value};};
 vm.runInNewContext(code,{window,localStorage,fetch,Date,Map,Set,URL,TextEncoder,TextDecoder});
 if(auth)await window.SelloneGitHub.setToken('fixture-not-a-real-token-123','',false);
 return {calls,run:()=>window.SelloneGitHub.discover('JSWarmUp','',branch)};
}
test('private preview branch resolves immutable SHA using existing authenticated host',async()=>{const f=await fixture();const r=await f.run();assert.equal(r.ref,preview);assert.equal(r.path,'index.html');assert(f.calls.every(c=>c.auth));});
test('refuse public repo, missing token and unsafe preview branch',async()=>{for(const options of [{privateRepo:false},{auth:false},{branch:'../main'}]){const f=await fixture(options);await assert.rejects(f.run());assert(!f.calls.some(c=>c.url.includes('/commits/')));}});
test('normal repos still discover default branch',async()=>{const f=await fixture({privateRepo:false,auth:false,branch:''});assert.equal((await f.run()).ref,main);});
test('catalog is private, no public media; production bundle has same generic wiring',()=>{const p=JSON.parse(read('catalog.json')).projects.find(x=>x.repo==='JSWarmUp');assert.equal(p.visibility,'private');assert.equal(p.preview_branch,'development-playable');assert.equal(p.published,false);assert.equal(p.url,null);const runtime=read('assets/obscura-webplayer-runtime.js');assert(runtime.includes(code.trim()));assert(runtime.includes(read('viewer/catalog.js').trim()));assert(read('viewer/index.html').includes('obscura-webplayer-runtime.js?v=5'));});
