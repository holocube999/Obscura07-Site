import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../viewer/index.html',import.meta.url),'utf8');
const catalog=JSON.parse(readFileSync(new URL('../catalog.json',import.meta.url),'utf8'));

test('isolated private web and public app frames delegate only gamepad',()=>{
 for(const id of ['playframe','localAppFrame']){
  const tag=html.match(new RegExp('<iframe\\s+id="'+id+'"[^>]*>'))?.[0];
  assert.ok(tag,id+' iframe exists');
  assert.match(tag,/\ballow="gamepad"/);
  assert.match(tag,/\bsandbox="[^"]+"/);
  assert.doesNotMatch(tag,/allow-top-navigation|allow-popups/);
 }
 const sandbox=html.match(/<iframe\s+id="playframe"[^>]*sandbox="([^"]+)"/)?.[1];
 assert.ok(sandbox);
 assert.ok(!sandbox.split(' ').includes('allow-same-origin'),'keep opaque origin for token isolation');
});

test('Warm Up preview still loads private development-playable branch',()=>{
 const record=catalog.projects.find(p=>p.repo==='JSWarmUp');
 assert.ok(record);
 assert.equal(record.visibility,'private');
 assert.equal(record.preview_branch,'development-playable');
 assert.equal(record.entry_path,'index.html');
 assert.equal(record.published,false);
});
