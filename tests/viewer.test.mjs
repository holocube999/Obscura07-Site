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
  assert.match(item.id,/^[A-Za-z0-9_.-]{1,100}$/);
  assert.ok(!names.has(item.id.toLowerCase()));
  names.add(item.id.toLowerCase());
  assert.ok(['web_js','amiga_media','native','site','archive'].includes(item.viewer_type));
 }
 for(const repo of ['DeathMask-Gloom-Amiga','JSDoctor-MadDoctor','RoboCop3-JS','ARMigaOs','JSGloom'])
  assert.ok(names.has(repo.toLowerCase()));
});
test('only actual deployed pages are marked public; no private media announced',()=>{
 const published=catalog.projects.filter(x=>x.published);
 assert.ok(published.length>=1);
 for(const p of published){
  assert.ok(p.url?.startsWith('viewer/')||p.url==='radio/index.html');
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
 assert.ok(html.includes('id="localAppFrame"'));
 assert.ok(html.includes('id="playframe" title="Conversione JavaScript" loading="eager" allowfullscreen sandbox="allow-scripts allow-pointer-lock allow-forms allow-downloads"'));
 assert.ok(html.includes('id="localAppFrame" class="hidden" title="Applicazione pubblica verificata"'));
 assert.ok(html.includes('src="../assets/obscura-webplayer-runtime.js?'), 'missing integrated production WebPlayer runtime');
 const runtime=read('assets/obscura-webplayer-runtime.js');
 for(const api of ['SelloneGitHub','SelloneRetro','SelloneBundle','SelloneNullGodStorage'])
  assert.ok(runtime.includes(api),'missing runtime module '+api);
 assert.ok(js.includes("q.get('repo')"));
 assert.ok(js.includes('showDetail(initial,'));
 assert.ok(js.includes('GH.load('));
 assert.ok(js.includes('GH.loadMedia('));
 assert.ok(js.includes('Retro.start('));
 assert.ok(js.includes('Retro.stop()'));
 assert.ok(js.includes('approvedBuild('));
 assert.ok(js.includes("credentials:'omit'"));
});
test('independent app identities work even when static release assets are mirrored into site',()=>{
 const ids=catalog.projects.map(x=>x.id.toLowerCase());
 for(const id of ['randomnullradio','obscura-emu','obscura-tunnel'])
  assert.ok(ids.includes(id),'expected app '+id);
 const radio=catalog.projects.find(x=>x.id==='RandomNullRadio');
 assert.equal(radio.url,'radio/index.html');
 assert.equal(radio.published,true);
 assert.equal(radio.source_repo_pending,'RandomNullRadio');
 assert.ok(existsSync(resolve(ROOT,'radio/index.html')));
 for(const id of ['OBSCURA-EMU','OBSCURA-TUNNEL']){
  const app=catalog.projects.find(x=>x.id===id);
  assert.equal(app.visibility,'private');
  assert.equal(app.published,false);
  assert.equal(app.url,null);
 }
 const viewer=read('viewer/catalog.js');
 assert.ok(viewer.includes('seen.has(id.toLowerCase())'));
 assert.ok(viewer.includes('localBuild(item)'));
 assert.ok(viewer.includes('localAppFrame'));
 assert.ok(!viewer.includes('Bearer '));
 assert.ok(viewer.includes('GH.load('));
 assert.ok(!read('catalog.json').includes('app.js'));
});
test('GitHub engine verifies full revision and blob SHA, vault does not enter game iframe',()=>{
 const gh=read('viewer/github-runtime.js');
 for(const fragment of ['commits/','default_branch','git/trees/','contents/','subtle.digest(\'SHA-1\'', 'sha1Fallback', 'SHA-1','checkBlob(bytes','PBKDF2','AES-GCM','discoverMedia','loadMedia','setToken','unlock'])
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
 assert.ok(emu.includes('window.EJS_startOnLoaded=true;'),'pressing Avvia supporto must actually boot the emulator');
 assert.ok(sw.includes('caches.open(CACHE)'));
 assert.ok(sw.includes("scope.pathname+'virtual/'"));
 assert.ok(bridge.includes('cache.delete(url)'));
 assert.ok(bridge.includes('serviceWorker.register'));
});
test('JS conversions get isolated JS, original, and optional linked split-screen',()=>{
 const html=read('viewer/index.html'),controller=read('viewer/catalog.js');
 for(const mode of ['js','original','both','source'])assert.ok(html.includes('data-view="'+mode+'"'),mode);
 for(const id of ['jsPane','originalPane','originalStage','linkedInput','restartPair','syncFeedback','sourcePane'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.ok(html.includes('sandbox="allow-scripts allow-pointer-lock allow-forms allow-downloads"'));
 assert.ok(html.includes('id="localAppFrame"'));
 assert.ok(html.includes('sandbox="allow-scripts allow-pointer-lock allow-forms allow-downloads"'));
 assert.ok(controller.includes("next==='both'"));
 assert.ok(controller.includes("view!=='both'"));
 assert.ok(controller.includes("syncChannel=newChannel()"));
 assert.ok(controller.includes('SELLONE_SYNC_INPUT_V1'));
 assert.ok(controller.includes('source===Retro.frame()?.contentWindow'));
 assert.ok(controller.includes("relay(event.data,source==='js'?'original':'js')"));
 assert.ok(controller.includes('GH.discoverFiles('));
 assert.ok(controller.includes('GH.loadText('));
 assert.ok(controller.includes('sourcePreview'));
 assert.ok(controller.includes('syncReady'));
 assert.ok(controller.includes('Retro.start({media:disk,bios:kick,title:selected.title,host,onStatus:showStatus,channel:syncChannel})'));
 assert.ok(controller.includes('showJS(result)'));
 assert.ok(!controller.includes("$('playarea').replaceChildren($('playframe'))"));
 const retro=read('viewer/retro/emu.js'),runner=read('viewer/retro-runtime.js');
 assert.ok(retro.includes('SELLONE_SYNC_READY_V1'));
 assert.ok(retro.includes('SELLONE_SYNC_INPUT_V1'));
 assert.ok(retro.includes('KeyboardEvent('));
 assert.ok(retro.includes("event.origin!==location.origin"));
 assert.ok(runner.includes('channel:syncChannel')===false); // channel is passed in by caller
 assert.ok(runner.includes("channel=null"));
 assert.ok(runner.includes("frame:()=>session?.frame||null"));
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

test('historical revisions, permanent links and complete repository ZIP integration',()=>{
 const gh=read('viewer/github-runtime.js'),ui=read('viewer/sellone-ui.js'),catalog=read('viewer/catalog.js');
 assert.match(gh,/selloneDownloadArchive/);
 assert.match(gh,/checkBlob\(bytes,file.sha\)/);
 assert.match(gh,/async function discoverMedia\(input,requestedRef=''\)/);
 assert.match(ui,/sellone-download-link/);
 assert.match(ui,/history-zip/);
 assert.match(ui,/url.searchParams.set\('ref',item.ref\)/);
 assert.doesNotMatch(ui,/const checks=data.revisions.map\(render\)/);
 assert.match(catalog,/selectedRevision\)/);
 assert.match(read('assets/obscura-webplayer-runtime.js'),/selloneDownloadArchive/);
});
