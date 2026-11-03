import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const code=readFileSync(resolve(ROOT,'viewer/catalog.js'),'utf8');
const SH='1234567890abcdef1234567890abcdef12345678';
const validHtml='<!doctype html><html><body><div>Mad Doctor game</div></body></html>';
class Node {
 constructor(id='',tag='div'){
  this.id=id;this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.attrs={};this.style={};
  this.value='';this.href='';this.textContent='';this.srcdoc='';this.files=[];this.disabled=false;
  this.classList={
   contains:key=>!!this.classes?.has(key),
   add:key=>(this.classes??=new Set()).add(key),
   remove:key=>(this.classes??=new Set()).delete(key),
   toggle:(key,on)=>{const list=(this.classes??=new Set());if(on===undefined? !list.has(key):on)list.add(key);else list.delete(key)}
  };
  if(tag==='iframe')this.contentWindow={postMessage(){}};
 }
 append(...nodes){this.children.push(...nodes)}
 replaceChildren(...nodes){this.children=[...nodes]}
 setAttribute(name,value){this.attrs[name]=String(value)}
 removeAttribute(name){delete this.attrs[name]}
 remove(){this.removed=true}
 querySelectorAll(){return []}
 closest(){return null}
}
async function flush(){for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve))}
function setup(){
 const ids='listing detail detailName detailKind detailDescription detailActions viewModes webControls retroControls sourceControls compareTools jsPane originalPane sourcePane playarea unavailable detailStatus playerStatus syncFeedback linkedInput playframe originalStage search stats message grid loadLatest reloadSelected htmlCandidates loadGitMedia mediaCandidates mediaInput kickInput bootRetro stopRetro useGitToken gitToken gitPassword saveToken authBox unlockGitToken forgetGitToken openSource reloadSource sourceFiles restartPair'.split(' ');
 const elements=Object.fromEntries(ids.map(id=>[id,new Node(id,id==='playframe'?'iframe':'div')]));
 const modes=['js','original','both','source'].map(view=>{const b=new Node();b.dataset.view=view;return b});
 elements.viewModes.querySelectorAll=selector=>selector==='[data-view]'?modes:[];
 const document={getElementById:id=>elements[id]||null,createElement:tag=>new Node('',tag)};
 let emulator=null,stops=0;
 const calls=[];
 const GH={
  normalizeRepo:name=>'holocube999/'+name.replace(/^holocube999\//,''),
  load:async opts=>{
   calls.push({type:'github',opts});
   return {repo:'holocube999/JSDoctor-MadDoctor',ref:SH,path:'src/MadDoctor_JS_Native_v0.22.99.html',
    html:validHtml,bytes:validHtml.length,files:['src/MadDoctor_JS_Native_v0.22.99.html']};
  },
  discoverFiles:async()=>({repo:'holocube999/JSDoctor-MadDoctor',ref:SH,files:['README.md'],path:'README.md'}),
  loadText:async()=>({content:'# Mad Doctor',path:'README.md',ref:SH,bytes:12}),
  setToken:async()=>{},unlock:async()=>{},forget:()=>{}
 };
 const Retro={
  stop:async()=>{stops++;if(emulator)emulator.removed=true;emulator=null},
  start:async args=>{
   calls.push({type:'retro',opts:args});
   emulator=new Node('retroFrame','iframe');args.host.replaceChildren(emulator);
   args.onStatus('Core initialized');
  },
  frame:()=>emulator,
  supported:file=>!!file&&file.name.endsWith('.adf'),
  needsKick:file=>file.name.endsWith('.adf'),
  validKick:file=>!!file&&file.name.endsWith('.rom')
 };
 const listeners=new Map();
 const window={SelloneGitHub:GH,SelloneRetro:Retro,addEventListener:(name,cb)=>{
  if(!listeners.has(name))listeners.set(name,[]);listeners.get(name).push(cb);
 }};
 const location={href:'https://example.test/Obscura07-Site/viewer/?repo=JSDoctor-MadDoctor',
  origin:'https://example.test',search:'?repo=JSDoctor-MadDoctor'};
 const project={id:'JSDoctor-MadDoctor',repo:'JSDoctor-MadDoctor',title:'Mad Doctor',
  kind:'Gioco',viewer_type:'web_js',description:'Porting JS',published:false,url:null};
 const fetch=async()=>({ok:true,json:async()=>({schema:2,projects:[project]})});
 const history={replaceState:()=>{}};
 const crypto={getRandomValues:arr=>arr.fill(7)};
 const env={document,window,location,fetch,history,crypto,URL,URLSearchParams};
 vm.runInNewContext(code,env,{filename:'viewer/catalog.js',timeout:1500});
 return {elements,modes,GH,Retro,calls,listeners,getStops:()=>stops};
}
test('optional split view retains JS preview and starts emulator in adjacent pane',async()=>{
 const {elements:e,modes,calls,getStops}=setup();
 await flush();
 assert.match(e.playframe.srcdoc,/Mad Doctor game/);
 assert.match(e.playframe.srcdoc,/SELLONE_SYNC_INPUT_V1/);
 assert.ok(e.originalPane.classList.contains('hidden'));
 assert.equal(e.webControls.classList.contains('hidden'),false);
 await modes.find(b=>b.dataset.view==='both').onclick();
 assert.ok(e.playarea.classList.contains('compare'));
 assert.ok(!e.originalPane.classList.contains('hidden'));
 assert.ok(!e.jsPane.classList.contains('hidden'));
 assert.equal(e.webControls.classList.contains('hidden'),false);
 assert.equal(e.retroControls.classList.contains('hidden'),false);
 e.mediaInput.files=[{name:'original.adf',size:901120}];
 e.kickInput.files=[{name:'kick.rom',size:524288}];
 await e.bootRetro.onclick();
 const active=calls.findLast(x=>x.type==='retro');
 assert.ok(active,'retro runner should launch');
 assert.strictEqual(active.opts.host,e.originalStage,'emulator must use original pane');
 assert.match(e.playframe.srcdoc,/Mad Doctor game/,'JS must remain alive');
 assert.equal(e.originalStage.children.length,1);
 assert.match(active.opts.channel,/^s-[0-9a-f]{32}$/);
 await modes.find(b=>b.dataset.view==='js').onclick();
 assert.ok(!e.jsPane.classList.contains('hidden'));
 assert.ok(e.originalPane.classList.contains('hidden'));
 assert.ok(getStops()>=1,'leaving original view stops emulator');
 assert.match(e.playframe.srcdoc,/Mad Doctor game/);
});
test('source view is read-only and is accessible without a playable binary',async()=>{
 const {elements:e,modes}=setup();
 await flush();
 await modes.find(b=>b.dataset.view==='source').onclick();
 await flush();
 assert.equal(e.sourceControls.classList.contains('hidden'),false);
 assert.equal(e.jsPane.classList.contains('hidden'),true);
 assert.equal(e.retroControls.classList.contains('hidden'),true);
 assert.match(e.sourcePane.children[0].textContent,/Mad Doctor/);
});
