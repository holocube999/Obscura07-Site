import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
const source=readFileSync(resolve(fileURLToPath(new URL('../assets/embed-bridge.js',import.meta.url))),'utf8');
function fixture(path='/Obscura07-Site/viewer/',embedded=true){
  const calls=[],events={};
  const location={pathname:path,search:'?repo=JSQuest',hash:'#play'};
  const parent={postMessage:(data,origin)=>calls.push({data,origin})};
  const window={parent:embedded?parent:null,addEventListener:(name,fn)=>events[name]=fn};
  if(!embedded)window.parent=window;
  const history={pushState(_state,_title,url){if(url)location.pathname=url},replaceState(_state,_title,url){if(url)location.pathname=url}};
  vm.runInNewContext(source,{window,location,history,Reflect},{timeout:1000});
  return {calls,events,history,location};
}
test('embedded initial route and hash navigation use the fixed trusted origin',()=>{
  const f=fixture();
  assert.equal(f.calls.length,1);
  assert.equal(f.calls[0].origin,'https://nullgod.tech');
  assert.equal(f.calls[0].data.route,'viewer/?repo=JSQuest#play');
  f.location.hash='#settings';f.events.hashchange();
  assert.equal(f.calls.at(-1).data.route,'viewer/?repo=JSQuest#settings');
});
test('SPA pushState and replaceState synchronize only after successful navigation',()=>{
  const f=fixture();
  f.history.pushState(null,'','/Obscura07-Site/radio/');
  assert.equal(f.calls.at(-1).data.route,'radio/?repo=JSQuest#play');
  f.history.replaceState(null,'','/Obscura07-Site/viewer/');
  assert.equal(f.calls.at(-1).data.route,'viewer/?repo=JSQuest#play');
  assert.equal(f.calls.length,3);
});
test('unrelated paths and top-level pages never post routes',()=>{
  const outside=fixture('/other/viewer/');
  outside.history.pushState(null,'','/other/new/');
  assert.equal(outside.calls.length,0);
  assert.equal(fixture('/Obscura07-Site/viewer/',false).calls.length,0);
});
