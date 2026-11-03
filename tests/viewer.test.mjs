import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFileSync(resolve(ROOT,path),'utf8');
const catalog=JSON.parse(read('catalog.json'));
test('project catalog remains complete and typed',()=>{
 assert.equal(catalog.schema,2);
 assert.ok(catalog.projects.length>=36);
 const names=new Set();
 for(const item of catalog.projects){
  assert.match(item.repo,/^[A-Za-z0-9_.-]{1,100}$/);
  assert.equal(item.id,item.repo);
  assert.ok(!names.has(item.repo.toLowerCase()));
  names.add(item.repo.toLowerCase());
  assert.ok(['web_js','amiga_media','native','site','archive'].includes(item.viewer_type));
 }
 for(const repo of ['DeathMask-Gloom-Amiga','JSDoctor-MadDoctor','RoboCop3-JS','ARMigaOs','JSGloom'])
  assert.ok(names.has(repo.toLowerCase()));
});
test('only actual deployed pages are marked public; no private media announced',()=>{
 const published=catalog.projects.filter(x=>x.published);
 assert.ok(published.length>=1);
 for(const p of published){
  assert.ok(p.url?.startsWith('viewer/'));
  assert.match(p.url,/\.html?$/);
  assert.ok(existsSync(resolve(ROOT,p.url)));
 }
 for(const p of catalog.projects.filter(x=>!x.published))assert.equal(p.url,null);
});
test('one Sellone WebPlayer preserves catalog UI and safe iframe',()=>{
 const html=read('viewer/index.html'),js=read('viewer/catalog.js');
 assert.ok(html.includes('id="listing"'));
 assert.ok(html.includes('id="grid"'));
 assert.ok(html.includes('id="search"'));
 assert.ok(html.includes('id="playframe"'));
 assert.ok(html.includes('sandbox="allow-scripts'));
 assert.ok(!html.includes('allow-same-origin'));
 for(const script of ['./github-runtime.js','./retro-runtime.js','./catalog.js'])
  assert.ok(html.includes('src="'+script+'"'));
 assert.ok(js.includes("q.get('repo')"));
 assert.ok(js.includes('showDetail(initial)'));
 assert.ok(js.includes('GH.load('));
 assert.ok(js.includes('GH.loadMedia('));
 assert.ok(js.includes('Retro.start('));
 assert.ok(js.includes('Retro.stop()'));
 assert.ok(js.includes('approvedBuild('));
 assert.ok(js.includes("credentials:'omit'"));
});
test('GitHub engine verifies full revision and blob SHA, vault does not enter game iframe',()=>{
 const gh=read('viewer/github-runtime.js');
 for(const fragment of ['commits/main','git/trees/','contents/','crypto.subtle.digest','SHA-1','checkBlob(bytes','PBKDF2','AES-GCM','discoverMedia','loadMedia','setToken','unlock'])
  assert.ok(gh.includes(fragment),fragment);
 assert.ok(gh.includes("headers.Authorization='Bearer '+token"));
 assert.ok(gh.includes("credentials:'omit'"));
 assert.ok(!gh.includes('searchParams.set("token"'));
 assert.ok(!read('viewer/catalog.js').includes('Bearer '));
});
test('generic PUAE and VICE engines load ADF/D64/T64/PRG only from session cache',()=>{
 for(const p of ['viewer/retro/sw.js','viewer/retro/emu.js','viewer/retro/emu.html','viewer/retro-runtime.js'])
  assert.ok(existsSync(resolve(ROOT,p)),p);
 const bridge=read('viewer/retro-runtime.js'),emu=read('viewer/retro/emu.js'),sw=read('viewer/retro/sw.js');
 for(const ext of ['adf','d64','t64','prg'])assert.ok(bridge.includes(ext));
 for(const core of ['amiga','c64'])assert.ok(emu.includes(core));
 assert.ok(emu.includes('EJS_gameUrl'));
 assert.ok(emu.includes('EJS_biosUrl'));
 assert.ok(emu.includes('EJS_pathtodata'));
 assert.ok(sw.includes('caches.open(CACHE)'));
 assert.ok(sw.includes("scope.pathname+'virtual/'"));
 assert.ok(bridge.includes('cache.delete(url)'));
 assert.ok(bridge.includes('serviceWorker.register'));
});
test('legacy WebPlayer redirects to the unified catalog, no second UI',()=>{
 const legacy=read('webplayer/index.html'),home=read('index.html');
 assert.ok(legacy.includes("location.replace(url.href)"));
 assert.ok(legacy.includes("query.get('game')"));
 assert.ok(home.includes('href="viewer/"'));
 assert.ok(!home.includes('href="webplayer/index.html"'));
 for(const p of ['viewer/deathmask/lab.html','viewer/deathmask/lab.js','viewer/deathmask/preview-core.js'])
  assert.ok(existsSync(resolve(ROOT,p)));
});
test('no proprietary Amiga / C64 media or secrets tracked by public site',()=>{
 const tracked=execFileSync('git',['ls-files','-z'],{cwd:ROOT}).toString('utf8').split('\0').filter(Boolean);
 const bad=tracked.filter(p=>/\.(?:adf|adz|ipf|hdf|rom|kick|d64|t64|prg|key|pem)$/i.test(p)||
  /(?:^|\/)(?:\.private|private-media|tokens\.local\.ini)(?:\/|$)/i.test(p));
 assert.deepEqual(bad,[]);
 assert.ok(!read('catalog.json').includes('github_pat_'));
 assert.ok(!read('catalog.json').includes('AMIROMTYPE1'));
});
