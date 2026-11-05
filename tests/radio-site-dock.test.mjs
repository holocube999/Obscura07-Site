import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');

function simulate(){
 const listeners={};
 const elem=(id)=>({id,hidden:false,style:{},dataset:{},
  attrs:{},setAttribute(k,v){this.attrs[k]=v},
  getAttribute(k){return this.attrs[k]},
  listeners:{},addEventListener(k,fn){this.listeners[k]=fn},
  querySelector(){return {textContent:''}}});
 const ids=new Map(['siteRadioDock','siteRadioToggle','siteRadioPanel',
   'siteRadioFrame','navigation','menu-toggle','top'].map(id=>[id,elem(id)]));
 const nav=ids.get('navigation');
 const classes=new Set();
 nav.classList={contains:s=>classes.has(s),add:s=>classes.add(s),remove:s=>classes.delete(s)};
 const header=ids.get('top');
 header.getBoundingClientRect=()=>({bottom:82});
 const toggle=ids.get('siteRadioToggle');
 const label={textContent:''};
 toggle.querySelector=()=>label;
 const iframe=ids.get('siteRadioFrame');
 const messages=[];
 iframe.contentWindow={postMessage:(data,origin)=>messages.push({data,origin})};
 const doc={readyState:'complete',getElementById:id=>ids.get(id),
  addEventListener(){}};
 const win={innerHeight:720,addEventListener(name,fn){listeners[name]=fn}};
 runInNewContext(read('radio/site-dock.js'),{document:doc,window:win,
   location:{origin:'https://holocube999.github.io'},
   queueMicrotask:fn=>fn()});
 return {ids,classes,listeners,messages,label};
}

test('site player is an iframe; no audio engine is included in the host page',()=>{
 const html=read('index.html');
 assert.match(html,/id="siteRadioFrame"[^>]*src="radio\/embed\.html"/);
 assert.match(html,/radio\/site-dock\.css/);
 assert.doesNotMatch(html,/src="radio\/widget\.js"/);
 assert.match(read('radio/embed.html'),/src="\.\/embed\.js"/);
 assert.match(read('radio/embed.js'),/import \{mount\} from '\.\/widget\.js'/);
 assert.match(html,/sandbox="allow-scripts allow-same-origin allow-downloads"/);
});

test('radio is below the header with sufficient space, not over the menu button',()=>{
 const {ids}=simulate();
 const dock=ids.get('siteRadioDock');
 assert.equal(dock.hidden,false);
 assert.equal(Number.parseInt(dock.style.top),94);
 assert.equal(ids.get('siteRadioPanel').hidden,true);
});

test('opening site navigation hides radio completely, and closing restores it',()=>{
 const {ids,classes}=simulate();
 const toggle=ids.get('siteRadioToggle');
 toggle.listeners.click();
 assert.equal(ids.get('siteRadioPanel').hidden,false);
 assert.equal(toggle.getAttribute('aria-expanded'),'true');
 classes.add('open');
 ids.get('menu-toggle').listeners.click();
 assert.equal(ids.get('siteRadioDock').hidden,true);
 assert.equal(ids.get('siteRadioPanel').hidden,true);
 assert.equal(toggle.getAttribute('aria-expanded'),'false');
 classes.delete('open');
 ids.get('menu-toggle').listeners.click();
 assert.equal(ids.get('siteRadioDock').hidden,false);
 assert.equal(ids.get('siteRadioPanel').hidden,true);
});

test('radio controls communicate only with its embedded player',()=>{
 const {ids,messages}=simulate();
 ids.get('siteRadioToggle').listeners.click();
 assert.deepEqual(JSON.parse(JSON.stringify(messages)),
  [{data:{type:'randomnullradio:start'},origin:'https://holocube999.github.io'}]);
});

test('dock CSS never places it back on the navigation row',()=>{
 const css=read('radio/site-dock.css');
 assert.match(css,/\.rnr-site-dock\[hidden\]\s*\{\s*display:\s*none\s*!important/);
 assert.match(css,/top:\s*clamp\(80px/);
 assert.doesNotMatch(css,/top:\s*clamp\(10px/);
});
