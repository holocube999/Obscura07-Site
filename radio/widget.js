/* RΛNDØM[NULL] RADIO • reusable static UI and JS API */
import {makePlan,renderPCM,pcmToWav,pcmToMP3,randomSeed,filename,STYLES,MOODS,CONCEPTS,LANGUAGE_PACKS} from "./radio.js";
const names={xenodrone:"Xeno Drone",vaporwave:"Vaporwave",dreamwave:"Dreamwave",synthwave:"Synthwave",guitar:"Electric Haze",ritual:"Ritual Rhythm",biosphere:"Biosphere",darkambient:"Dark Ambient",pulse:"Pulse"};
const qs=(root,sel)=>root.querySelector(sel);
function optionMarkup(items,any){return (any?[['',"Random"]]:[]).concat(items.map(x=>Array.isArray(x)?x:[x,names[x]||x])).map(x=>'<option value="'+x[0]+'">'+x[1]+'</option>').join("");}
export function mount(root,settings={}){
 if(root.__rnr)return root.__rnr;
 const state={root,ctx:null,source:null,analyser:null,gain:null,audio:null,plan:null,playing:false,muted:false,busy:false,raf:0,settings:{seed:settings.seed||"",style:settings.style||"",mood:settings.mood||"",concept:settings.concept||"",language:settings.language||"",duration:settings.duration||"",withVox:Boolean(settings.withVox)}};
 root.classList.add("rnr-root");
 root.innerHTML='<section class="rnr-shell" aria-label="RΛNDØM[NULL] RADIO">'+
 '<div class="rnr-main"><button type="button" class="rnr-play" title="Riproduci" aria-label="Riproduci">▶</button>'+
 '<div class="rnr-ident"><div class="rnr-brand">RΛNDØM<span>[NULL]</span> <small>RADIO</small></div><div class="rnr-title" title="Titolo">Idle transmission</div><div class="rnr-artist">tap ▶ to generate</div></div>'+
 '<canvas class="rnr-spectrum" width="72" height="32" aria-label="Spettro audio"></canvas>'+
 '<div class="rnr-actions"><button class="rnr-next" type="button" aria-label="Nuovo brano" title="Nuovo brano">⟳</button><button class="rnr-mute" type="button" aria-label="Mute" title="Mute">♪</button><button class="rnr-more" type="button" aria-label="Impostazioni" title="Impostazioni">⚙</button></div></div>'+
 '<div class="rnr-panel" hidden><div class="rnr-field"><label>STYLE<select data-param="style">'+optionMarkup(STYLES,true)+'</select></label><label>MOOD<select data-param="mood">'+optionMarkup(MOODS,true)+'</select></label></div>'+
 '<div class="rnr-field"><label>CONCEPT<select data-param="concept">'+optionMarkup(CONCEPTS,true)+'</select></label><label>LANGUAGE<select data-param="language">'+optionMarkup(Object.keys(LANGUAGE_PACKS).map(s=>[s,s.toUpperCase()]),true)+'</select></label></div>'+
 '<div class="rnr-field rnr-small"><label>DURATION<select data-param="duration"><option value="">Random</option><option value="30">30s</option><option value="60">60s</option><option value="90">90s</option><option value="120">120s</option></select></label>'+
 '<label class="rnr-vox"><input type="checkbox" data-param="withVox"> withVøx <span>processed synthetic voice</span></label></div>'+
 '<div class="rnr-seed-row"><label>SEED <input class="rnr-seed" spellcheck="false" maxlength="128" placeholder="random seed"></label><button class="rnr-restore" type="button">↻ SEED</button></div>'+
 '<div class="rnr-download"><button class="rnr-mp3" type="button">↓ MP3</button><button class="rnr-wav" type="button">↓ WAV</button><button class="rnr-share" type="button">COPY LINK</button><span class="rnr-progress" aria-live="polite">Offline • 22.05 kHz</span></div>'+
 '<div class="rnr-meta" aria-live="polite"></div></div></section>';
 const play=qs(root,".rnr-play"),title=qs(root,".rnr-title"),artist=qs(root,".rnr-artist"),panel=qs(root,".rnr-panel"),canvas=qs(root,".rnr-spectrum");
 const ctx2d=canvas.getContext("2d",{alpha:true});
 function message(t){qs(root,".rnr-progress").textContent=t;}
 let encoderPromise=null;
 function ensureEncoder(){
  if(globalThis.lamejs?.Mp3Encoder)return Promise.resolve();
  if(encoderPromise)return encoderPromise;
  encoderPromise=new Promise((resolve,reject)=>{
   const script=document.createElement("script");
   script.src=new URL("./vendor/lame.min.js",import.meta.url).href;
   script.onload=()=>globalThis.lamejs?.Mp3Encoder?resolve():reject(new Error("MP3 encoder failed to initialize"));
   script.onerror=()=>reject(new Error("Offline MP3 encoder not found"));
   document.head.appendChild(script);
  });
  return encoderPromise;
 }
 function config(){return {seed:state.settings.seed||undefined,style:state.settings.style||undefined,mood:state.settings.mood||undefined,concept:state.settings.concept||undefined,language:state.settings.language||undefined,duration:state.settings.duration?Number(state.settings.duration):undefined,withVox:state.settings.seed.startsWith('R1.')?undefined:state.settings.withVox};}
 function update(plan){
  title.textContent=plan.title;artist.textContent=plan.artist+" · "+plan.style;
  qs(root,".rnr-seed").value=plan.seed;
  qs(root,'[data-param="withVox"]').checked=plan.withVox;
  qs(root,".rnr-meta").textContent=plan.tuning+" · "+plan.bpm+" BPM · "+plan.duration+"s · "+plan.language.toUpperCase()+(plan.withVox?" · VOX":"")+" · "+plan.mood;
 }
 function ensurePlan(){if(!state.plan){state.plan=makePlan(config());state.settings.seed=state.plan.seed;update(state.plan);}return state.plan;}
 function reset(seed){stop();state.plan=null;state.audio=null;state.settings.seed=seed===undefined?randomSeed():seed;const p=ensurePlan();message("Seed ready");return p;}
 function paint(){
  if(!ctx2d)return;const w=canvas.width,h=canvas.height;
  ctx2d.clearRect(0,0,w,h);
  if(state.playing&&state.analyser){
   const freq=new Uint8Array(state.analyser.frequencyBinCount);state.analyser.getByteFrequencyData(freq);
   const bins=24;for(let i=0;i<bins;i++){
    const index=2+Math.floor(Math.pow(i/(bins-1),1.75)*(freq.length-3)),v=freq[index]/255;
    const bar=Math.max(2,v*(h-3));ctx2d.fillStyle="rgba(191,174,230,"+(.28+.7*v)+")";
    ctx2d.fillRect(i*3,h-bar,2,bar);
   }
  }else{
   for(let i=0;i<24;i++){const v=2+(i*7%9)/3;ctx2d.fillStyle="rgba(171,153,215,.24)";ctx2d.fillRect(i*3,h-v,2,v);}
  }
  if(state.playing)state.raf=requestAnimationFrame(paint);
 }
 function stop(){
  if(state.source){try{state.source.onended=null;state.source.stop();state.source.disconnect();}catch(_){}state.source=null;}
  state.playing=false;play.textContent="▶";play.setAttribute("aria-label","Riproduci");if(state.raf)cancelAnimationFrame(state.raf);state.raf=0;paint();
 }
 async function initContext(){
  if(!state.ctx){const C=window.AudioContext||window.webkitAudioContext;if(!C)throw new Error("Web Audio non supportato");state.ctx=new C();state.gain=state.ctx.createGain();state.analyser=state.ctx.createAnalyser();state.analyser.fftSize=256;state.analyser.smoothingTimeConstant=.72;state.gain.connect(state.analyser);state.analyser.connect(state.ctx.destination);state.gain.gain.value=state.muted?0:1;}
  if(state.ctx.state==="suspended")await state.ctx.resume();
 }
 async function start(){
  if(state.busy)return;
  state.busy=true;root.classList.add("rnr-busy");message("Synthesizing…");
  try{
   await initContext();const plan=ensurePlan();
   if(!state.audio){await new Promise(r=>setTimeout(r,0));state.audio=renderPCM(plan);}
   const buf=state.ctx.createBuffer(2,state.audio.channels[0].length,state.audio.sampleRate);
   for(let c=0;c<2;c++)buf.copyToChannel(state.audio.channels[c],c);
   stop();const s=state.ctx.createBufferSource();s.buffer=buf;s.connect(state.gain);state.source=s;
   s.onended=()=>{if(state.source!==s)return;state.source=null;state.playing=false;play.textContent="▶";if(settings.autonext!==false&&!document.hidden){reset();start();}else message("Complete");};
   s.start();state.playing=true;play.textContent="Ⅱ";play.setAttribute("aria-label","Pausa");message("Playing");paint();
  }catch(e){message("Error: "+e.message);console.error("[RNR]",e);}finally{state.busy=false;root.classList.remove("rnr-busy");}
 }
 async function download(format){
  if(state.busy)return;state.busy=true;root.classList.add("rnr-busy");message("Encoding "+format.toUpperCase()+"…");
  try{
   if(!state.audio){const p=ensurePlan();await new Promise(r=>setTimeout(r,0));state.audio=renderPCM(p);}
   let blob;
   if(format==="mp3"){
    await ensureEncoder();await new Promise(r=>setTimeout(r,0));blob=pcmToMP3(state.audio);
   }else blob=pcmToWav(state.audio);
   const u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=filename(state.plan,format);document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),5000);message("Export "+format.toUpperCase()+" complete");
  }catch(e){message("Export error: "+e.message);console.error("[RNR]",e);}finally{state.busy=false;root.classList.remove("rnr-busy");}
 }
 play.addEventListener("click",()=>state.playing?stop():start());
 qs(root,".rnr-next").addEventListener("click",()=>{reset();start();});
 qs(root,".rnr-mute").addEventListener("click",e=>{state.muted=!state.muted;if(state.gain)state.gain.gain.value=state.muted?0:1;e.currentTarget.textContent=state.muted?"×":"♪";e.currentTarget.setAttribute("aria-label",state.muted?"Attiva audio":"Mute");});
 qs(root,".rnr-more").addEventListener("click",()=>{panel.hidden=!panel.hidden;});
 qs(root,".rnr-mp3").addEventListener("click",()=>download("mp3"));
 qs(root,".rnr-wav").addEventListener("click",()=>download("wav"));
 qs(root,".rnr-restore").addEventListener("click",()=>{reset(qs(root,".rnr-seed").value.trim()||randomSeed());start();});
 qs(root,".rnr-share").addEventListener("click",async()=>{
  const p=ensurePlan(),url=new URL(location.href);url.searchParams.set("seed",p.seed);url.searchParams.set("vox",p.withVox?"1":"0");url.searchParams.set("style",p.style);url.searchParams.set("mood",p.mood);url.searchParams.set("concept",p.concept);url.searchParams.set("lang",p.language);url.searchParams.set("duration",p.duration);
  try{await navigator.clipboard.writeText(url.toString());message("Link copied");}catch{message(url.toString());}
 });
 root.querySelectorAll("[data-param]").forEach(input=>{
  const key=input.dataset.param;if(state.settings[key]!==undefined)input.type==="checkbox"?input.checked=state.settings[key]:input.value=state.settings[key];
  input.addEventListener("change",()=>{if(state.settings.seed.startsWith("R1."))state.settings.seed=state.settings.seed.split(".")[1];state.settings[key]=input.type==="checkbox"?input.checked:input.value;reset(state.settings.seed||randomSeed());});
 });
 const query=new URLSearchParams(location.search);
 if(settings.readQuery!==false&&query.has("seed")){state.settings.seed=query.get("seed").slice(0,128);for(const [a,b] of [["style","style"],["mood","mood"],["concept","concept"],["lang","language"],["duration","duration"]])if(query.has(a)){state.settings[b]=query.get(a);const el=root.querySelector('[data-param="'+b+'"]');if(el)el.value=state.settings[b];}state.settings.withVox=query.get("vox")==="1";qs(root,'[data-param="withVox"]').checked=state.settings.withVox;}
 ensurePlan();paint();
 root.__rnr={start,stop,next:()=>reset(),download,get plan(){return state.plan;},get audio(){return state.audio;},regenerate:(options={})=>{Object.assign(state.settings,options);return reset(options.seed??state.settings.seed??randomSeed());},setMuted:(v)=>{state.muted=Boolean(v);if(state.gain)state.gain.gain.value=state.muted?0:1;}};
 return root.__rnr;
}
if(typeof document!=="undefined"){
 const auto=()=>document.querySelectorAll("[data-null-radio]").forEach(el=>mount(el,{base:el.dataset.base,readQuery:el.dataset.query!=="off"}));
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",auto,{once:true});else auto();
 window.RandomNullRadio={mount,makePlan,renderPCM,pcmToWav,pcmToMP3,randomSeed};
}
