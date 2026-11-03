import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFileSync(resolve(ROOT,path),'utf8');
const catalog=JSON.parse(read('catalog.json'));
test('all known projects get stable external deep link aliases',()=>{
 assert.equal(catalog.schema,2);
 assert.ok(catalog.projects.length>=36);
 const names=new Set();
 for(const item of catalog.projects){
  assert.match(item.repo,/^[A-Za-z0-9_.-]{1,100}$/);
  assert.ok(!names.has(item.repo.toLowerCase()),'duplicated repo '+item.repo);
  names.add(item.repo.toLowerCase());
  assert.equal(item.id,item.repo);
 }
 for(const project of ['DeathMask-Gloom-Amiga','reverse-eng','JSGloom','ARMigaOs','JSDoctor-MadDoctor'])
  assert.ok(names.has(project.toLowerCase()),'missing '+project);
});
test('only real authorized browser assets are announced as published',()=>{
 const published=catalog.projects.filter(x=>x.published);
 assert.ok(published.length>=1);
 for(const p of published){
  assert.ok(p.url?.startsWith('viewer/'));
  assert.match(p.url,/\.html?$/);
  assert.ok(existsSync(resolve(ROOT,p.url)),p.url+' must exist in public site');
 }
 for(const p of catalog.projects.filter(x=>!x.published)){
  assert.equal(p.url,null,'a private project may not have a public URL');
 }
});
test('Viewer safe mobile routing and no arbitrary origin/embed',()=>{
 const index=read('viewer/index.html');
 const js=read('viewer/catalog.js');
 assert.ok(index.includes('src="./catalog.js"'));
 assert.ok(index.includes('id="search"'));
 assert.ok(index.includes('id="playframe"'));
 assert.ok(index.includes('sandbox="allow-scripts'));
 assert.ok(!index.includes('allow-same-origin'));
 assert.ok(js.includes("qs.get('repo')"));
 assert.ok(js.includes('showDetail(requested)'));
 assert.ok(js.includes("credentials:'omit'"));
 assert.ok(js.includes('approvedBuild'));
 assert.ok(js.includes('new URL('));
 assert.ok(js.includes("published:value.published===true"));
});
test('existing published deathmask lab and public homepage remain connected',()=>{
 const homepage=read('index.html');
 assert.ok(homepage.includes('<a href="viewer/">Sellone Viewer</a>'));
 for(const name of ['viewer/deathmask/lab.html','viewer/deathmask/lab.js','viewer/deathmask/preview-core.js'])
  assert.ok(existsSync(resolve(ROOT,name)));
});
test('no proprietary Amiga media, secrets, or private metadata in deployment',()=>{
 const paths=execFileSync('git',['ls-files','-z'],{cwd:ROOT}).toString('utf8').split('\0').filter(Boolean);
 const suspicious=paths.filter(p=>/\.(?:adf|adz|ipf|hdf|rom|kick|key|pem)$/i.test(p)||
  /(?:^|\/)(?:\.private|private-media|tokens\.local\.ini)(?:\/|$)/i.test(p));
 assert.deepEqual(suspicious,[]);
 assert.ok(!read('catalog.json').includes('github_pat_'));
 assert.ok(!read('catalog.json').includes('AMIROMTYPE1'));
});
