import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const source=readFileSync(resolve(ROOT,'viewer/web-bundler.js'),'utf8');
function engine(){
 const window={};
 vm.runInNewContext(source,{window,TextEncoder,btoa}, {filename:'viewer/web-bundler.js',timeout:3000});
 return window.SelloneBundle;
}
const SHA='0123456789abcdef0123456789abcdef01234567';
const original=[
'<!doctype html><html><head>',
'<meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\'; base-uri \'none\'">',
'<link rel="stylesheet" href="./app/beer-preview.css">',
'<script type="module" src="./app/beer-preview.mjs"></script>',
'</head><body><h1>Beer Belly Bert\'s Brew Biz</h1></body></html>'
].join('\n');
const files={
 'app/beer-preview.css':'body{background:#101010;color:#eee}',
 'app/beer-preview.mjs':"import {make} from '../src/core.mjs';document.title=make();",
 'src/core.mjs':"export {answer} from './part.mjs';export function make(){return 'BREW'}",
 'src/part.mjs':'export const answer=42;'
};
function fakeLoader(){
 const loaded=[];
 const loader={
  loaded,
  loadText:async({repo,ref,path})=>{
   assert.equal(repo,'holocube999/JSBrewBiz');
   assert.equal(ref,SHA);
   assert.ok(Object.hasOwn(files,path),'unknown dependency '+path);
   loaded.push(path);
   return {repo,ref,path,content:files[path],bytes:new TextEncoder().encode(files[path]).byteLength};
  }
 };
 return loader;
}
const input={repo:'holocube999/JSBrewBiz',ref:SHA,path:'index.html',html:original,bytes:original.length};
test('builds verified CSS and recursively linked ES modules into sandbox srcdoc',async()=>{
 const loader=fakeLoader();
 const bundled=await engine().prepare(input,loader);
 assert.equal(bundled.packaged,true);
 assert.equal(bundled.assetCount,4);
 assert.equal(bundled.moduleCount,3);
 assert.match(bundled.html,/background:#101010/);
 assert.ok(!bundled.html.includes('href="./app/beer-preview.css"'));
 assert.ok(!bundled.html.includes('src="./app/beer-preview.mjs"'));
 assert.ok(bundled.html.includes('type="module" data-sellone-entry="app/beer-preview.mjs"'));
 assert.ok(bundled.html.includes('script type="importmap"'));
 const json=bundled.html.match(/<script type="importmap">([\s\S]*?)<\/script>/)?.[1];
 assert.ok(json,'JSON importmap');
 const entries=JSON.parse(json).imports;
 for(const path of ['app/beer-preview.mjs','src/core.mjs','src/part.mjs']){
  const uri=entries['@sellone/'+path];assert.match(uri,/^data:text\/javascript;base64,/);
  const js=Buffer.from(uri.split(',')[1],'base64').toString('utf8');
  assert.ok(!/\bfrom\s+['"]\.\.?\//.test(js),'no relative imports in '+path);
  if(path==='app/beer-preview.mjs')assert.ok(js.includes("from '@sellone/src/core.mjs'"));
  if(path==='src/core.mjs')assert.ok(js.includes("from '@sellone/src/part.mjs'"));
 }
 assert.ok(!bundled.html.includes("script-src 'self'"),'original CSP replaced inside opaque sandbox');
 assert.ok(bundled.html.includes("script-src 'unsafe-inline' data: blob:"));
 assert.equal(loader.loaded.length,4);
});
test('standalone HTML stays unchanged; module bundling never substitutes missing files',async()=>{
 const base={...input,html:'<!doctype html><html><body>Standalone OK</body></html>'};
 assert.equal((await engine().prepare(base, fakeLoader())).html,base.html);
 await assert.rejects(engine().prepare(input,{loadText:async()=>{throw Error('GitHub 404')}}),/GitHub 404/);
});
test('does not allow imports to escape repository path',async()=>{
 const outside={...input,html:'<!doctype html><html><head><script type="module" src="../secret.mjs"></script></head></html>'};
 await assert.rejects(engine().prepare(outside,fakeLoader()),/fuori repository|Import fuori repository/);
});


test('bundles classic JavaScript in document order for file-friendly projects',async()=>{
 const page={...input,html:'<!doctype html><html><head><script src="./src/core.js"></script><script src="./src/main.js"></script></head><body></body></html>'};
 const loaded={ 'src/core.js':'window.ClassicReady = true;', 'src/main.js':'if(!window.ClassicReady)throw Error("script order");' };
 const packaged=await engine().prepare(page,{loadText:async({repo,ref,path})=>{
  assert.equal(repo,page.repo);assert.equal(ref,page.ref);assert.ok(Object.hasOwn(loaded,path));
  return {repo,ref,path,content:loaded[path],bytes:loaded[path].length};
 }});
 assert.equal(packaged.packaged,true);
 assert.equal(packaged.moduleCount,0);
 assert.equal(packaged.assetCount,2);
 assert.ok(packaged.html.indexOf('window.ClassicReady = true')<packaged.html.indexOf('if(!window.ClassicReady)'));
 assert.ok(!packaged.html.includes('src="./src/core.js"'));
 assert.ok(!packaged.html.includes('src="./src/main.js"'));
 assert.match(packaged.html,/data-sellone-entry="src\/main\.js"/);
});
test('rejects missing or nonlocal classic scripts instead of silently loading the network',async()=>{
 const page={...input,html:'<script src="./src/core.js"></script><script src="https://cdn.example/core.js"></script>'};
 await assert.rejects(engine().prepare(page,{loadText:async()=>({repo:input.repo,ref:input.ref,path:'src/core.js',content:'console.log("core")',bytes:19})}),/Script remoto/);
 const local={...input,html:'<script src="./src/missing.js"></script>'};
 await assert.rejects(engine().prepare(local,{loadText:async()=>{throw Error('GitHub 404')}}),/GitHub 404/);
});
