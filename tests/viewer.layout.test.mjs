import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const page=readFileSync(resolve(root,'viewer/index.html'),'utf8');
const css=readFileSync(resolve(root,'viewer/sellone-ui.css'),'utf8');
const ui=readFileSync(resolve(root,'viewer/sellone-ui.js'),'utf8');

test('the game-first control bar keeps advanced tools behind an accessible disclosure',()=>{
 assert.match(page,/id="playerOptionsToggle"[^>]*aria-expanded="false"[^>]*aria-controls="playerOptions"/);
 assert.match(page,/id="playerOptions" class="hidden"/);
 const optionsStart=page.indexOf('id="playerOptions"');
 const controlsStart=page.indexOf('id="webControls"');
 const statusStart=page.indexOf('id="playerStatus"');
 assert.ok(optionsStart<controlsStart&&controlsStart<statusStart);
 assert.match(ui,/optionsToggle\.addEventListener\('click'/);
 assert.match(ui,/new MutationObserver\(syncModeOptions\)/);
 assert.match(ui,/active!=='js'\)expandOptions\(true\)/);
});

test('action buttons use vector icons, never both an SVG and a literal symbol',()=>{
 for(const id of ['loadLatest','reloadSelected','bootRetro','stopRetro','reloadSource','restartPair']){
  const match=page.match(new RegExp('<button[^>]*id="'+id+'"[^>]*>(.*?)<\\/button>'));
  assert.ok(match,'Missing control '+id);
  assert.doesNotMatch(match[1],/^\s*(?:▶|↻|■|⟳|⏵|▸)/u,'Duplicate icon for '+id);
 }
 for(const view of ['js','original','both','source']){
  assert.match(page,new RegExp('data-view="'+view+'"[^>]*aria-label="[^"]+"[^>]*aria-pressed="(?:true|false)"'));
 }
 assert.match(ui,/function putIcon\(el,icon\)/);
 assert.match(ui,/el\.querySelector\('\.sellone-icon'\)/);
});

test('compact responsive layout gives the game priority on mobile',()=>{
 assert.match(css,/#viewModes\s*\{display:grid;grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
 assert.match(css,/#playerOptions\{border-top:/);
 assert.match(css,/#playframe,#localAppFrame\{height:78svh;min-height:320px\}/);
 assert.match(css,/#webControls #htmlCandidates\{grid-column:1\/-1/);
});
