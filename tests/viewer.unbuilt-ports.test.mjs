import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const catalog=JSON.parse(read('catalog.json'));
const game=read('viewer/catalog.js');
const bundle=read('assets/obscura-webplayer-runtime.js');
const expected={
  JSSkool:'c64',JSWho2:'c64',JSWorld:'amiga',JSFears:'amiga',
  JSHunter:'amiga',JSDesert:'amiga',JSNexus:'c64',
  JSLeader:'amiga',JSWonder:'amiga',JSTerror2:'amiga',JSTopCat:'amiga'
};

test('no HTML game is never advertised as an executable JS port',()=>{
  for(const [repo,system] of Object.entries(expected)){
    const item=catalog.projects.find(p=>p.repo===repo);
    assert.ok(item,'Missing catalog entry '+repo);
    assert.equal(item.runtime_status,'no_browser_build',repo);
    assert.equal(item.origin_system,system,repo);
    assert.equal(item.published,false,repo);
    assert.equal(item.url,null,repo);
  }
  for(const repo of ['JSGloom','JSDoctor-MadDoctor'])
    assert.notEqual(catalog.projects.find(x=>x.repo===repo)?.runtime_status,'no_browser_build',
      'Known HTML game must retain JS launch');
});

test('catalog fallback selects original media, preserves explicit JS/source choices',()=>{
  assert.match(game,/item\.runtime_status==='no_browser_build'&&\['amiga','c64'\]\.includes\(item\.origin_system\)\?'original'/);
  assert.match(game,/explicit\?\.mode==='js'\?'js'/);
  assert.match(game,/explicit\?\.mode==='source'\?'source'/);
  assert.match(game,/Porting JS non ancora eseguibile/);
  assert.match(game,/Apri supporto originale/);
  assert.match(game,/runtime_status:item\.runtime_status==='no_browser_build'/);
});

test('deployed combined runtime exactly embeds the corrected launch controller',()=>{
  assert.ok(bundle.includes('/* catalog.js */'),'Compiled controller missing');
  assert.ok(bundle.includes(game),'Compiled controller diverges from source');
});

test('original media path remains a generic executable emulator, not fake game content',()=>{
  const retro=read('viewer/retro-runtime.js');
  const boot=read('viewer/retro/emu.js');
  for(const ext of ['adf','d64','t64','prg'])assert.ok(retro.includes(ext));
  assert.match(retro,/await cache\.put\(diskUrl/);
  assert.match(boot,/EJS_gameUrl=mediaUrl/);
  assert.match(boot,/EJS_startOnLoaded=true/);
  assert.match(boot,/EJS_core=core/);
});
