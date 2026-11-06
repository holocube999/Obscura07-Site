/* RΛNDØM[NULL] RADIO • reusable static UI and JS API */
import {makePlan,pcmToWav,pcmToMP3,randomSeed,filename,STYLES,MOODS,CONCEPTS,LANGUAGE_PACKS} from "./radio.js";
import {renderAsync} from "./async.js";
import {encodeMP3Async} from "./encode.js";
import {spliceTrack,haltTrack} from "./transition.js";
import {mixVocalBus} from "./voice-render.js";
import {drawCover} from "./cover-art.js";
import {lyricSheet} from "./lyrics.js";
import {renderPCM} from "./radio.js";
const names={xenodrone:"Xeno Drone",vaporwave:"Vaporwave",dreamwave:"Dreamwave",synthwave:"Synthwave",guitar:"Electric Haze",ritual:"Ritual Rhythm",biosphere:"Biosphere",darkambient:"Dark Ambient",pulse:"Pulse",chiptune:"Chiptune",harpsichord:"Clavicembalo",medieval:"Medievale",meditation:"Meditativa",hangdrum:"Hangdrum",metal:"Metal",techno:"Techno",punk:"Punk",glitch:"Glitch",hiphop:"Hip-Hop / Rap"};
const qs=(root,sel)=>root.querySelector(sel);
function optionMarkup(items,any){return (any?[['',"Random"]]:[]).concat(items.map(x=>Array.isArray(x)?x:[x,names[x]||x])).map(x=>'<option value="'+x[0]+'">'+x[1]+'</option>').join("");}
export function mount(root,settings={}){
 if(root.__rnr)return root.__rnr;
 const state={root,ctx:null,source:null,analyser:null,gain:null,audio:null,plan:null,playing:false,muted:false,busy:false,raf:0,active:null,voiceActive:null,voiceGain:null,token:0,nextTimer:null,volume:Number.isFinite(settings.volume)?Math.max(0,Math.min(1,settings.volume)):.75,voiceMix:Number.isFinite(settings.voiceMix)?Math.max(0,Math.min(1,settings.voiceMix)):.22,settings:{seed:settings.seed||"",style:settings.style||"",mood:settings.mood||"",concept:settings.concept||"",language:settings.language||"",duration:settings.duration||"",withVox:Boolean(settings.withVox),extraText:"",generatedLyrics:false}};
 root.classList.add("rnr-root");
 root.innerHTML='<section class="rnr-shell" aria-label="RΛNDØM[NULL] RADIO">'+
 '<div class="rnr-main"><button type="button" class="rnr-play" title="Riproduci" aria-label="Riproduci">▶</button>'+
 '<button type="button" class="rnr-cover-open" aria-label="Ingrandisci copertina" title="Ingrandisci copertina"><canvas class="rnr-cover" width="320" height="320" aria-label="Copertina album generata"></canvas></button><div class="rnr-ident"><div class="rnr-brand">RΛNDØM<span>[NULL]</span> <small>RADIO</small></div><div class="rnr-title" title="Titolo">Idle transmission</div><div class="rnr-artist">tap ▶ to generate</div></div>'+
 '<canvas class="rnr-spectrum" width="72" height="32" aria-label="Spettro audio"></canvas>'+
 '<div class="rnr-actions"><button class="rnr-next" type="button" aria-label="Nuovo brano" title="Nuovo brano">⟳</button><button class="rnr-mute" type="button" aria-label="Mute" title="Mute">♪</button><button class="rnr-more" type="button" aria-label="Impostazioni" title="Impostazioni">⚙</button></div></div>'+
 '<label class="rnr-volume-row">VOL <input class="rnr-volume" type="range" min="0" max="100" step="1" aria-label="Volume generale della radio"><output class="rnr-volume-value"></output></label>'+
 '<div class="rnr-panel" hidden><label class="rnr-voice-row">VOX LEVEL <input class="rnr-voice-mix" type="range" min="0" max="100" step="1" aria-label="Volume relativo della voce"><output class="rnr-voice-value"></output></label><div class="rnr-field"><label>STYLE<select data-param="style">'+optionMarkup(STYLES,true)+'</select></label><label>MOOD<select data-param="mood">'+optionMarkup(MOODS,true)+'</select></label></div>'+
 '<div class="rnr-field"><label>CONCEPT<select data-param="concept">'+optionMarkup(CONCEPTS,true)+'</select></label><label>LANGUAGE<select data-param="language">'+optionMarkup(Object.keys(LANGUAGE_PACKS).map(s=>[s,s.toUpperCase()]),true)+'</select></label></div>'+
 '<div class="rnr-field rnr-small"><label>DURATION<select data-param="duration"><option value="">Random</option><option value="30">30s</option><option value="60">60s</option><option value="90">90s</option><option value="120">120s</option></select></label>'+
 '<label class="rnr-vox"><input type="checkbox" data-param="withVox"> withVøx <span>voce PCM preregistrata · coro / mostro / autotune</span></label></div>'+
 '<label class="rnr-context-label">TEXT INPUT (opzionale: parole proprie o da fonti autorizzate)<button class="rnr-generate-lyrics" type="button" title="Genera testo per il brano corrente" aria-label="Genera testo coerente con il brano">✎</button><textarea class="rnr-context" rows="2" maxlength="3200" aria-label="Lessico aggiuntivo offline" placeholder="Incolla brevi parole o appunti propri, non articoli protetti da copyright"></textarea></label>'+
 '<div class="rnr-seed-row"><label>SEED <input class="rnr-seed" spellcheck="false" maxlength="128" placeholder="random seed"></label><button class="rnr-restore" type="button">↻ SEED</button></div>'+
 '<div class="rnr-download"><button class="rnr-mp3" type="button">↓ MP3</button><button class="rnr-wav" type="button">↓ WAV</button><button class="rnr-share" type="button">COPY LINK</button><span class="rnr-progress" aria-live="polite">Offline • 22.05 kHz</span></div>'+
 '<div class="rnr-meta" aria-live="polite"></div></div></section>'+
 '<dialog class="rnr-cover-dialog" aria-label="Copertina album ingrandita"><button type="button" class="rnr-cover-close" aria-label="Chiudi copertina">×</button><img class="rnr-cover-large" alt="Copertina album"><p class="rnr-cover-caption"></p></dialog>';
 const play=qs(root,".rnr-play"),title=qs(root,".rnr-title"),artist=qs(root,".rnr-artist"),panel=qs(root,".rnr-panel"),canvas=qs(root,".rnr-spectrum");
 const ctx2d=canvas.getContext("2d",{alpha:true});
 const cover=qs(root,".rnr-cover"),lightbox=qs(root,".rnr-cover-dialog");
 const volumeSlider=qs(root,".rnr-volume"),volumeText=qs(root,".rnr-volume-value");
 const voiceSlider=qs(root,".rnr-voice-mix"),voiceText=qs(root,".rnr-voice-value");
 function updateLevels(){
  volumeSlider.value=String(Math.round(state.volume*100));
  volumeText.textContent=Math.round(state.volume*100)+"%";
  voiceSlider.value=String(Math.round(state.voiceMix*100));
  voiceText.textContent=Math.round(state.voiceMix*100)+"%";
  if(state.gain)state.gain.gain.value=state.muted?0:state.volume;
  if(state.voiceGain)state.voiceGain.gain.value=state.voiceMix;
 }
 function setVolume(value){
  if(!Number.isFinite(value)||value<0||value>1)throw RangeError("Volume 0..1");
  state.volume=value;updateLevels();
 }
 function setVoiceMix(value){
  if(!Number.isFinite(value)||value<0||value>1)throw RangeError("VOX LEVEL 0..1");
  state.voiceMix=value;updateLevels();
 }
 function setMuted(value){
  state.muted=Boolean(value);updateLevels();
  qs(root,".rnr-mute").textContent=state.muted?"×":"♪";
  qs(root,".rnr-mute").setAttribute("aria-label",state.muted?"Attiva audio":"Mute");
 }
 function showCover(){
  const plan=ensurePlan();
  const src=cover.toDataURL("image/png");
  if(typeof settings.onCoverOpen==="function"){
   settings.onCoverOpen({src,title:plan.title,artist:plan.artist});return;
  }
  qs(lightbox,".rnr-cover-large").src=src;
  qs(lightbox,".rnr-cover-caption").textContent=plan.artist+" · "+plan.title;
  if(typeof lightbox.showModal==="function")lightbox.showModal();
  else lightbox.setAttribute("open","");
 }
 qs(root,".rnr-cover-open").addEventListener("click",showCover);
 qs(root,".rnr-cover-close").addEventListener("click",()=>lightbox.close());
 lightbox.addEventListener("click",event=>{if(event.target===lightbox)lightbox.close()});
 volumeSlider.addEventListener("input",()=>setVolume(Number(volumeSlider.value)/100));
 voiceSlider.addEventListener("input",()=>setVoiceMix(Number(voiceSlider.value)/100));
 qs(root,".rnr-context").addEventListener("change",event=>{
  state.settings.extraText=event.target.value.slice(0,3200);
   if(state.settings.generatedLyrics)reset(state.settings.seed||undefined);
  if(state.settings.seed.startsWith("R1."))state.settings.seed=state.settings.seed.split(".")[1];
  reset(state.settings.seed||randomSeed());
 });
 updateLevels();

 function message(t){qs(root,".rnr-progress").textContent=t;}
 function config(){return {seed:state.settings.seed||undefined,style:state.settings.style||undefined,mood:state.settings.mood||undefined,concept:state.settings.concept||undefined,language:state.settings.language||undefined,duration:state.settings.duration?Number(state.settings.duration):undefined,withVox:state.settings.seed.startsWith('R1.')?undefined:state.settings.withVox,extraText:state.settings.extraText,lyricsText:state.settings.generatedLyrics?state.settings.extraText:undefined};}
 qs(root,".rnr-generate-lyrics").addEventListener("click",()=>{
   const current=ensurePlan();
   const material=current.withVox?current:makePlan({seed:current.seed.split(".")[1],
    style:current.style,mood:current.mood,concept:current.concept,
    language:current.language,bpm:current.bpm,duration:current.duration,
    intensity:current.intensity,withVox:true,extraText:state.settings.extraText});
   const lines=lyricSheet(material);
   if(!lines){message("Nessun testo disponibile");return;}
   qs(root,".rnr-context").value=lines;
   state.settings.extraText=lines;
   state.settings.generatedLyrics=true;
   state.settings.withVox=true;
   qs(root,'[data-param="withVox"]').checked=true;
   reset(material.seed);
   message("Testo del brano generato e modificabile");
  });
  function update(plan){
  title.textContent=plan.title;artist.textContent=plan.artist+" · "+plan.style;
  qs(root,".rnr-seed").value=plan.seed;
  drawCover(qs(root,".rnr-cover"),plan);
  qs(root,'[data-param="withVox"]').checked=plan.withVox;
  qs(root,".rnr-meta").textContent=plan.tuning+" · "+plan.bpm+" BPM · "+plan.duration+"s · "+plan.language.toUpperCase()+(plan.withVox?" · VOX":"")+" · "+plan.mood+" · "+(plan.sections?.length||0)+" movements";
 }
 function ensurePlan(){if(!state.plan){state.plan=makePlan(config());state.settings.seed=state.plan.seed;update(state.plan);}return state.plan;}
 function reset(seed){state.token++;clearTimeout(state.nextTimer);state.nextTimer=null;state.plan=null;state.audio=null;state.settings.seed=seed===undefined?randomSeed():seed;const p=ensurePlan();if(state.playing)void start();else message("Seed ready");return p;}
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
  state.token++;
  clearTimeout(state.nextTimer);
  state.nextTimer=null;
  haltTrack(state.voiceActive);state.voiceActive=null;
  haltTrack(state.active);
  state.active=null;state.source=null;state.playing=false;
  play.textContent="▶";play.setAttribute("aria-label","Riproduci");
  if(state.raf)cancelAnimationFrame(state.raf);state.raf=0;paint();
 }
 async function initContext(){
  if(!state.ctx){const C=window.AudioContext||window.webkitAudioContext;if(!C)throw new Error("Web Audio non supportato");state.ctx=new C();state.gain=state.ctx.createGain();state.analyser=state.ctx.createAnalyser();state.analyser.fftSize=256;state.analyser.smoothingTimeConstant=.72;state.gain.connect(state.analyser);state.analyser.connect(state.ctx.destination);
   state.voiceGain=state.ctx.createGain();state.voiceGain.connect(state.gain);updateLevels();}
  if(state.ctx.state==="suspended")await state.ctx.resume();
 }
 async function start(){
  const ticket=++state.token;
  root.classList.add("rnr-busy");message(state.playing?"Preparing crossfade…":"Synthesizing…");
  try{
   await initContext();const plan=ensurePlan();
   const audio=await renderAsync(plan);
   if(ticket!==state.token)return;
   const buf=state.ctx.createBuffer(2,audio.channels[0].length,audio.sampleRate);
   for(let c=0;c<2;c++)buf.copyToChannel(audio.channels[c],c);
   const next=spliceTrack(state.ctx,buf,state.gain,state.active,1.85);
   if(audio.voiceChannels){
    const vocals=state.ctx.createBuffer(2,audio.voiceChannels[0].length,audio.sampleRate);
    for(let c=0;c<2;c++)vocals.copyToChannel(audio.voiceChannels[c],c);
    state.voiceActive=spliceTrack(state.ctx,vocals,state.voiceGain,state.voiceActive,1.85);
   }else if(state.voiceActive){
    haltTrack(state.voiceActive);state.voiceActive=null;
   }
   state.active=next;state.source=next.source;state.audio=audio;
   state.playing=true;play.textContent="Ⅱ";play.setAttribute("aria-label","Pausa");
   clearTimeout(state.nextTimer);
   state.nextTimer=setTimeout(()=>{
     if(ticket!==state.token||!state.playing)return;
     if(settings.autonext!==false)reset(randomSeed());else stop();
   },Math.max(2000,(plan.duration-(settings.autonext===false?0:2.8))*1000));
   message("Playing · "+(audio.voiceChannels?"VOX PCM · FX / CHOIR":"instrumental"));
   if(!state.raf)paint();
  }catch(e){message("Error: "+e.message);console.error("[RNR]",e);}
  finally{if(ticket===state.token)root.classList.remove("rnr-busy");}
 }
 async function download(format){
  if(state.busy)return;state.busy=true;root.classList.add("rnr-busy");message("Encoding "+format.toUpperCase()+"…");
  try{
   if(!state.audio){const p=ensurePlan();await new Promise(r=>setTimeout(r,0));state.audio=await renderAsync(p);}
   let blob;
   const voices=state.audio.voiceChannels?
    {channels:state.audio.voiceChannels}:null;
   const exportAudio=mixVocalBus(state.audio,voices,state.voiceMix);
   if(format==="mp3"){
    blob=await encodeMP3Async(exportAudio);
   }else blob=pcmToWav(exportAudio);
   const u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=filename(state.plan,format);document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),5000);message("Export "+format.toUpperCase()+" complete");
  }catch(e){message("Export error: "+e.message);console.error("[RNR]",e);}finally{state.busy=false;root.classList.remove("rnr-busy");}
 }
 play.addEventListener("click",()=>state.playing?stop():start());
 qs(root,".rnr-next").addEventListener("click",()=>{const wasPlaying=state.playing;reset();if(!wasPlaying)void start();});
 qs(root,".rnr-mute").addEventListener("click",()=>setMuted(!state.muted));
 qs(root,".rnr-more").addEventListener("click",()=>{panel.hidden=!panel.hidden;});
 qs(root,".rnr-mp3").addEventListener("click",()=>download("mp3"));
 qs(root,".rnr-wav").addEventListener("click",()=>download("wav"));
 qs(root,".rnr-restore").addEventListener("click",()=>{const wasPlaying=state.playing;reset(qs(root,".rnr-seed").value.trim()||randomSeed());if(!wasPlaying)void start();});
 qs(root,".rnr-share").addEventListener("click",async()=>{
  const p=ensurePlan(),url=new URL(location.href);url.searchParams.set("seed",p.seed);url.searchParams.set("vox",p.withVox?"1":"0");url.searchParams.set("style",p.style);url.searchParams.set("mood",p.mood);url.searchParams.set("concept",p.concept);url.searchParams.set("lang",p.language);url.searchParams.set("duration",p.duration);
  try{await navigator.clipboard.writeText(url.toString());message("Link copied");}catch{message(url.toString());}
 });
 root.querySelectorAll("[data-param]").forEach(input=>{
  const key=input.dataset.param;if(state.settings[key]!==undefined)input.type==="checkbox"?input.checked=state.settings[key]:input.value=state.settings[key];
  input.addEventListener("change",()=>{if(state.settings.seed.startsWith("R1."))state.settings.seed=state.settings.seed.split(".")[1];state.settings[key]=input.type==="checkbox"?input.checked:input.value;
   if(key==="style"&&state.settings.style==="hiphop")state.settings.withVox=true;
   reset(state.settings.seed||randomSeed());});
 });
 const query=new URLSearchParams(location.search);
 if(settings.readQuery!==false&&query.has("seed")){state.settings.seed=query.get("seed").slice(0,128);for(const [a,b] of [["style","style"],["mood","mood"],["concept","concept"],["lang","language"],["duration","duration"]])if(query.has(a)){state.settings[b]=query.get(a);const el=root.querySelector('[data-param="'+b+'"]');if(el)el.value=state.settings[b];}state.settings.withVox=query.get("vox")==="1";qs(root,'[data-param="withVox"]').checked=state.settings.withVox;}
 ensurePlan();paint();
 root.__rnr={start,stop,next:()=>reset(),download,get plan(){return state.plan;},get audio(){return state.audio;},regenerate:(options={})=>{Object.assign(state.settings,options);return reset(options.seed??state.settings.seed??randomSeed());},setMuted,setVolume,setVoiceMix,showCover,
 get volume(){return state.volume;},get voiceMix(){return state.voiceMix;},
 get playing(){return state.playing;}};
 return root.__rnr;
}
if(typeof document!=="undefined"){
 const auto=()=>document.querySelectorAll("[data-null-radio]").forEach(el=>mount(el,{base:el.dataset.base,readQuery:el.dataset.query!=="off"}));
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",auto,{once:true});else auto();
 window.RandomNullRadio={mount,makePlan,renderPCM,pcmToWav,pcmToMP3,randomSeed};
}
