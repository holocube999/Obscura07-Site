import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
const js=fs.readFileSync('viewer/sellone-ui.js','utf8');
const css=fs.readFileSync('viewer/sellone-ui.css','utf8');
const start=js.indexOf("const btn=document.createElement('button');");
const end=js.lastIndexOf("\n})();");
assert.ok(start>=0&&end>start,'Movable fullscreen control code missing');
const source=js.slice(start,end);
const events=new Map(),classes=new Set(),storage=new Map();
const children=new Map([['.sellone-icon',{innerHTML:''}],['.fs-label',{textContent:''}]]);
const btn={
 id:'',style:{},classList:{add:x=>classes.add(x),remove:x=>classes.delete(x)},
 offsetWidth:44,offsetHeight:38,addEventListener:(name,fn)=>events.set(name,fn),
 setAttribute(){},setPointerCapture(){},querySelector:selector=>children.get(selector),
 getBoundingClientRect(){
  return {left:100+(parseFloat(this.style.left)||0),top:200+(parseFloat(this.style.top)||0),
    width:this.offsetWidth,height:this.offsetHeight};
 }};
const area={classList:{add(){},remove(){},toggle(){}},append(x){assert.equal(x,btn)},
 getBoundingClientRect(){return {left:100,top:200,width:800,height:600}},
 requestFullscreen:null};
const document={fullscreenElement:null,createElement:()=>btn,addEventListener(){},body:{classList:{toggle(){}}},
 exitFullscreen:async()=>{document.fullscreenElement=null}};
const window={addEventListener(){}};
const localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
const glyphs={expand:'+',shrink:'-'};
const callbacks=new Function('area','glyphs','document','window','localStorage','matchMedia','setTimeout','clearTimeout',
 source+'\nreturn {btn,setFallback,active,restorePosition,positionButton};');
const {setFallback,active}=callbacks(area,glyphs,document,window,localStorage,()=>({matches:false}),()=>1,()=>{});
test('fullscreen exit control is draggable, constrained, persisted and does not exit on drag',async()=>{
 setFallback(true);assert.equal(active(),true);
 assert.equal(btn.style.right,'auto');
 const pointer={pointerType:'touch',pointerId:1,clientX:835,clientY:218,preventDefault(){}};
 events.get('pointerdown')(pointer);
 events.get('pointermove')({...pointer,clientX:250,clientY:350});
 const left=parseFloat(btn.style.left),top=parseFloat(btn.style.top);
 assert.ok(left>=6&&left<=800-44-6);
 assert.ok(top>=6&&top<=600-38-6);
 events.get('pointerup')({...pointer,clientX:250,clientY:350});
 assert.ok(storage.has('sellone-fs-button-position-v1'),'Drag must persist');
 await btn.onclick();assert.equal(active(),true,'Drag event must not close fullscreen');
 await btn.onclick();assert.equal(active(),true,'First deliberate touch arms exit');
 await btn.onclick();assert.equal(active(),false,'Second touch exits fullscreen');
 assert.equal(btn.style.left,'','Leaving fullscreen should reset absolute position');
 assert.match(css,/touch-action:none/);
});
