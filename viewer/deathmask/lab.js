/* Sellone Playtest diagnostics: preview-core world, NOT native Amiga rendering. */
"use strict";
(function(){
const Core=window.DMPreviewCore;
const $=id=>document.getElementById(id);
const game=$("view"),ctx=game.getContext("2d",{alpha:false});
const map=$("map"),mctx=map.getContext("2d");
const held=new Set();
let inputWorld=null,state=null,exportData=null,requestUse=false;
let lastTime=0,lastFps=0,fpsFrames=0,fpsStart=0,spawnOverride=null;
const keys={
  KeyW:"forward",ArrowUp:"forward",
  KeyS:"backward",ArrowDown:"backward",
  KeyA:"strafeLeft",KeyD:"strafeRight",
  KeyQ:"turnLeft",ArrowLeft:"turnLeft",
  KeyE:"use",KeyF:"use",Space:"use",
  KeyL:"turnRight",ArrowRight:"turnRight"
};
const special=new Set(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"]);
function message(t){$("log").textContent=t}
function reset(){
  held.clear();requestUse=false;
  if(!inputWorld)return;
  try{
    state=Core.start(inputWorld,spawnOverride);
    if(inputWorld.provenance==="fixture")
      message("Fixture sintetica: apri le porte con E/USA e raggiungi l'uscita gialla. Non è Death Mask originale.");
    else message("originalGrid caricata: anteprima topologica. Collisioni/movimento e grafica NON ancora confrontati con Amiga.");
  }catch(e){
    state=null;message(String(e.message||e)+" — clicca una zona libera sulla minimappa per scegliere uno spawn provvisorio.");
  }
}
function demo(){
  inputWorld=Core.worldFromRows(Core.DEMO_ROWS);
  exportData=null;spawnOverride=null;
  $("choose-map").disabled=true;$("choose-map").replaceChildren(new Option("Fixture sintetica","demo"));
  $("source").value="";
  reset();drawMap();
}
function setWorldByName(name){
  inputWorld=Core.worldFromForensic(exportData,name);
  spawnOverride=null;reset();drawMap();
  message(inputWorld.name+" · "+inputWorld.w+"×"+inputWorld.h+
    " sottocelle originali · "+inputWorld.unknown+
    " celle con ID non risolto. "+(state?"Navigazione diagnostica disponibile.":"Seleziona un pavimento sulla minimappa per avviare."));
}
$("source").addEventListener("change",async event=>{
  const file=event.target.files&&event.target.files[0];
  if(!file)return;
  if(file.size>100*1024*1024){message("File troppo grande (massimo 100 MB).");return;}
  try{
    const data=JSON.parse(await file.text());
    if(!data||!Array.isArray(data.maps)||!data.maps.length)throw new Error("Formato non valido: manca maps");
    exportData=data;
    const names=data.maps.map(x=>x&&x.mapName).filter(Boolean);
    if(!names.length)throw new Error("Nessuna originalGrid utilizzabile");
    const selection=$("choose-map");
    selection.replaceChildren(...names.map(n=>new Option(n,n)));
    selection.disabled=false;
    setWorldByName(names.includes("war1.bod")?"war1.bod":names[0]);
    selection.value=inputWorld.name.split(" · ")[0];
  }catch(e){message("Import impossibile: "+String(e.message||e));}
});
$("choose-map").addEventListener("change",e=>{
  try{if(exportData)setWorldByName(e.target.value)}catch(err){message(String(err.message||err));}
});
$("demo").addEventListener("click",demo);
$("restart").addEventListener("click",reset);
$("use").addEventListener("click",()=>{requestUse=true;});
$("fullscreen").addEventListener("click",()=>{
  const v=$("view");
  if(v.requestFullscreen)v.requestFullscreen().catch(()=>{});
});
document.addEventListener("keydown",e=>{
  if(e.target.matches("input,select,textarea"))return;
  if(e.code==="KeyR"){reset();return;}
  if(keys[e.code]){
    if(special.has(e.code))e.preventDefault();
    if(keys[e.code]==="use"){if(!e.repeat)requestUse=true;}
    else held.add(keys[e.code]);
  }
});
document.addEventListener("keyup",e=>{if(keys[e.code])held.delete(keys[e.code]);});
window.addEventListener("blur",()=>held.clear());
document.addEventListener("visibilitychange",()=>{if(document.hidden)held.clear();});
for(const button of document.querySelectorAll("[data-control]")){
  const control=button.dataset.control;
  const press=e=>{e.preventDefault();held.add(control);button.classList.add("active");if(button.setPointerCapture)button.setPointerCapture(e.pointerId);};
  const release=e=>{e.preventDefault();held.delete(control);button.classList.remove("active");};
  button.addEventListener("pointerdown",press);
  button.addEventListener("pointerup",release);
  button.addEventListener("pointercancel",release);
  button.addEventListener("lostpointercapture",()=>{held.delete(control);button.classList.remove("active");});
}
map.addEventListener("click",e=>{
  if(!inputWorld)return;
  const rect=map.getBoundingClientRect();
  const pad=5;
  const size=Math.min(map.width-2*pad,map.height-2*pad);
  const k=Math.min(size/inputWorld.w,size/inputWorld.h);
  const baseX=(map.width-inputWorld.w*k)/2,baseY=(map.height-inputWorld.h*k)/2;
  const x=Math.floor((e.clientX-rect.left)*map.width/rect.width-baseX)/k;
  const y=Math.floor((e.clientY-rect.top)*map.height/rect.height-baseY)/k;
  const ix=Math.floor(x),iy=Math.floor(y);
  if(ix<0||iy<0||ix>=inputWorld.w||iy>=inputWorld.h)return;
  const idx=iy*inputWorld.w+ix;
  if([Core.T.WALL,Core.T.DOOR].includes(inputWorld.tiles[idx])){
    message("Punto bloccato. Seleziona una zona percorribile.");return;
  }
  spawnOverride={x:ix+.5,y:iy+.5,angle:-Math.PI/2};
  reset();drawMap();
  if(state&&inputWorld.provenance!=="fixture")
    message("Spawn provvisorio scelto manualmente: ("+ix+","+iy+"). Non è la posizione originale verificata.");
});
function drawMap(){
  if(!inputWorld)return;
  const w=inputWorld.w,h=inputWorld.h,pad=5;
  const scale=Math.min((map.width-pad*2)/w,(map.height-pad*2)/h);
  const ox=(map.width-w*scale)/2,oy=(map.height-h*scale)/2;
  mctx.fillStyle="#090d14";mctx.fillRect(0,0,map.width,map.height);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const id=y*w+x,t=inputWorld.tiles[id];
    const open=state&&state.doors.has(id);
    mctx.fillStyle=t===Core.T.WALL?"#77869b":
      t===Core.T.DOOR?(open?"#366a64":"#b48046"):
      t===Core.T.EXIT?"#f7d678":
      t===Core.T.START?"#5aab9b":
      t===Core.T.UNKNOWN?"#8b427a":
      t===Core.T.OBJECT?"#3d6281":"#202a37";
    mctx.fillRect(ox+x*scale,oy+y*scale,Math.max(1,scale-.4),Math.max(1,scale-.4));
  }
  if(state){
    const p=state.player,cx=ox+p.x*scale,cy=oy+p.y*scale;
    mctx.strokeStyle="#f4e6c9";mctx.lineWidth=2;
    mctx.beginPath();mctx.moveTo(cx,cy);
    mctx.lineTo(cx+Math.cos(p.angle)*scale*1.1,cy+Math.sin(p.angle)*scale*1.1);mctx.stroke();
    mctx.fillStyle="#fff";mctx.beginPath();mctx.arc(cx,cy,Math.max(2,scale*.2),0,Math.PI*2);mctx.fill();
  }
}
function render(){
  const W=game.width,H=game.height;
  ctx.fillStyle="#171f31";ctx.fillRect(0,0,W,H/2);
  ctx.fillStyle="#2d2926";ctx.fillRect(0,H/2,W,H/2);
  if(!state){
    ctx.fillStyle="#d2b9ec";ctx.font="12px monospace";
    ctx.textAlign="center";ctx.fillText("SELEZIONA UN PUNTO DI PARTENZA",W/2,H/2);
    return;
  }
  const p=state.player,FOV=Math.PI/3;
  for(let x=0;x<W;x+=2){
    const ra=p.angle+Math.atan((2*(x+.5)/W-1)*Math.tan(FOV/2));
    const hit=Core.cast(state,ra,28);
    if(!hit.hit)continue;
    const correct=Math.max(.04,hit.distance*Math.cos(ra-p.angle));
    const height=Math.min(H*3,H/Math.max(.07,correct));
    const top=Math.max(0,Math.round((H-height)/2));
    const bottom=Math.min(H,Math.round((H+height)/2));
    const brightness=Math.max(15,Math.min(65,66-correct*2.5-(hit.side?12:0)));
    const sat=hit.kind===Core.T.DOOR?38:12;
    const hue=hit.kind===Core.T.DOOR?32:210+(hit.id%5)*3;
    ctx.fillStyle="hsl("+hue+" "+sat+"% "+brightness+"%)";
    ctx.fillRect(x,top,2,bottom-top);
    if(hit.texture!==undefined&&hit.texture<.06){
      ctx.fillStyle="rgba(0,0,0,.13)";ctx.fillRect(x,top,1,bottom-top);
    }
  }
  ctx.fillStyle="rgba(224,225,212,.75)";
  ctx.fillRect(W/2-4,H/2,3,1);ctx.fillRect(W/2+2,H/2,3,1);
  ctx.fillRect(W/2,H/2-4,1,3);ctx.fillRect(W/2,H/2+2,1,3);
  if(state.finished){
    ctx.fillStyle="rgba(0,0,0,.78)";ctx.fillRect(0,65,W,70);
    ctx.fillStyle="#f5d88b";ctx.textAlign="center";ctx.font="16px monospace";
    ctx.fillText("USCITA RAGGIUNTA",W/2,97);ctx.font="10px monospace";
    ctx.fillText("R PER RICOMINCIARE",W/2,119);
  }
}
function loop(now){
  const dt=lastTime?Math.min(.05,(now-lastTime)/1000):0;lastTime=now;
  if(state){
    const wasFinished=state.finished;
    Core.step(state,{
      forward:held.has("forward"),backward:held.has("backward"),
      strafeLeft:held.has("strafeLeft"),strafeRight:held.has("strafeRight"),
      turnLeft:held.has("turnLeft"),turnRight:held.has("turnRight"),
      use:requestUse
    },dt);
    if(!wasFinished&&state.finished)message("Uscita raggiunta. Questo verifica il loop della demo, NON il completamento della missione originale.");
    $("coordinates").textContent="x "+state.player.x.toFixed(2)+" · y "+state.player.y.toFixed(2);
    $("counter").textContent="Porte "+state.doors.size+" · Uscita "+(state.finished?"SÌ":"no");
  }
  requestUse=false;
  render();drawMap();
  fpsFrames++;
  if(!fpsStart)fpsStart=now;
  if(now-fpsStart>500){
    lastFps=Math.round(fpsFrames*1000/(now-fpsStart));fpsStart=now;fpsFrames=0;
    $("fps").textContent="FPS browser "+lastFps;
  }
  requestAnimationFrame(loop);
}
demo();
requestAnimationFrame(loop);
})();
