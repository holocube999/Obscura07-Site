/* RΛNDØM[NULL] RADIO • reusable static UI and JS API */
import {makePlan,pcmToWav,pcmToMP3,randomSeed,filename,STYLES,MOODS,CONCEPTS,LANGUAGE_PACKS} from "./radio.js";
import {renderAsync} from "./async.js";
import {encodeMP3Async} from "./encode.js";
import {spliceTrack,haltTrack} from "./transition.js";
import {mixVocalBus} from "./voice-render.js";
import {drawCover} from "./cover-art.js";
import {lyricSheet} from "./lyrics.js";
import {makeQueue} from "./playlist-core.js";
import {makeKaraokeCues,karaokeAt} from "./karaoke.js";
import {planSpeaker,renderSpeakerPCM} from "./speaker.js";
import {fetchVerifiedNews} from "./news-source.js";
import {createSongLink,shareTargets} from "./share.js";
import {renderPCM} from "./radio.js";
const names={xenodrone:"Xeno Drone",vaporwave:"Vaporwave",dreamwave:"Dreamwave",synthwave:"Synthwave",guitar:"Electric Haze",ritual:"Ritual Rhythm",biosphere:"Biosphere",darkambient:"Dark Ambient",pulse:"Pulse",chiptune:"Chiptune",harpsichord:"Clavicembalo",medieval:"Medievale",meditation:"Meditativa",hangdrum:"Hangdrum",metal:"Metal",techno:"Techno",punk:"Punk",glitch:"Glitch",hiphop:"Hip-Hop / Rap"};
const qs=(root,sel)=>root.querySelector(sel);
function optionMarkup(items,any){return (any?[['',"Random"]]:[]).concat(items.map(x=>Array.isArray(x)?x:[x,names[x]||x])).map(x=>'<option value="'+x[0]+'">'+x[1]+'</option>').join("");}
export function mount(root,settings={}){
 if(root.__rnr)return root.__rnr;
 const state={root,ctx:null,source:null,analyser:null,gain:null,audio:null,plan:null,playing:false,muted:false,busy:false,raf:0,repeat:false,karaoke:false,startedAt:0,lyricKey:"",karaokeCues:[],prefetched:null,prefetchTicket:0,speakerActive:false,loadingExisting:false,newsCache:[],lastNewsFetch:0,loadingNews:false,queue:makeQueue(),active:null,voiceActive:null,voiceGain:null,token:0,nextTimer:null,volume:Number.isFinite(settings.volume)?Math.max(0,Math.min(1,settings.volume)):.75,voiceMix:Number.isFinite(settings.voiceMix)?Math.max(0,Math.min(1,settings.voiceMix)):.22,settings:{seed:settings.seed||"",style:settings.style||"",mood:settings.mood||"",concept:settings.concept||"",language:settings.language||"",duration:settings.duration||"",withVox:Boolean(settings.withVox),extraText:"",generatedLyrics:false,lyricsVariant:0,speaker:false}};
 root.classList.add("rnr-root");
 root.innerHTML='<section class="rnr-shell" aria-label="RΛNDØM[NULL] RADIO">'+
 '<div class="rnr-main"><button type="button" class="rnr-play" title="Riproduci" aria-label="Riproduci">▶</button>'+
 '<button type="button" class="rnr-cover-open" aria-label="Ingrandisci copertina" title="Ingrandisci copertina"><canvas class="rnr-cover" width="320" height="320" aria-label="Copertina album generata"></canvas></button><div class="rnr-ident"><div class="rnr-brand">RΛNDØM<span>[NULL]</span> <small>RADIO</small></div><div class="rnr-title" title="Titolo">Idle transmission</div><div class="rnr-artist">tap ▶ to generate</div></div>'+
 '<canvas class="rnr-spectrum" width="72" height="32" aria-label="Spettro audio"></canvas>'+
 '<div class="rnr-actions"><button class="rnr-next" type="button" aria-label="Nuovo brano" title="Nuovo brano">⟳</button><button class="rnr-mute" type="button" aria-label="Mute" title="Mute">♪</button><button class="rnr-more" type="button" aria-label="Impostazioni" title="Impostazioni">⚙</button></div></div>'+
 '<label class="rnr-volume-row">VOL <input class="rnr-volume" type="range" min="0" max="100" step="1" aria-label="Volume generale della radio"><output class="rnr-volume-value"></output></label>'+
 '<div class="rnr-mini-toolbar"><button class="rnr-repeat" type="button" aria-pressed="false" title="Ripeti brano">↺</button><button class="rnr-karaoke-toggle" type="button" aria-pressed="false" title="Mostra testo">♫</button><button class="rnr-playlist-toggle" type="button" aria-expanded="false" title="Playlist">☷</button></div>'+
 '<div class="rnr-karaoke" hidden aria-label="Testo sincronizzato"><div class="rnr-karaoke-previous"></div><div class="rnr-karaoke-current"></div><div class="rnr-karaoke-next"></div></div>'+
 '<div class="rnr-playlist" hidden><div class="rnr-play-modes"><button type="button" data-mode="all">All</button><button type="button" data-mode="single">Single</button><button type="button" data-mode="random">Random</button><button type="button" data-mode="radio" aria-pressed="true">Radio ∞</button></div><ol class="rnr-play-items"></ol></div>'+
 '<div class="rnr-panel" hidden><label class="rnr-voice-row">VOX LEVEL <input class="rnr-voice-mix" type="range" min="0" max="100" step="1" aria-label="Volume relativo della voce"><output class="rnr-voice-value"></output></label><div class="rnr-field"><label>STYLE<select data-param="style">'+optionMarkup(STYLES,true)+'</select></label><label>MOOD<select data-param="mood">'+optionMarkup(MOODS,true)+'</select></label></div>'+
 '<div class="rnr-field"><label>CONCEPT<select data-param="concept">'+optionMarkup(CONCEPTS,true)+'</select></label><label>LANGUAGE<select data-param="language">'+optionMarkup(Object.keys(LANGUAGE_PACKS).map(s=>[s,s.toUpperCase()]),true)+'</select></label></div>'+
 '<div class="rnr-field rnr-small"><label>DURATION<select data-param="duration"><option value="">Random</option><option value="30">30s</option><option value="60">60s</option><option value="90">90s</option><option value="120">120s</option></select></label>'+
 '<label class="rnr-vox"><input type="checkbox" data-param="withVox"> withVøx <span>voce PCM preregistrata · coro / mostro / autotune</span></label></div>'+
 '<label class="rnr-speaker-row"><input type="checkbox" data-param="speaker"> SPEAKER <span>DJ, spot e chiamate fittizie · solo Radio</span></label>'+
 '<label class="rnr-context-label">TEXT INPUT (opzionale: parole proprie o da fonti autorizzate)<button class="rnr-generate-lyrics" type="button" title="Rigenera versi diversi mantenendo la stessa musica" aria-label="Rigenera testo del brano">⟳</button><textarea class="rnr-context" rows="2" maxlength="3200" aria-label="Lessico aggiuntivo offline" placeholder="Incolla brevi parole o appunti propri, non articoli protetti da copyright"></textarea></label>'+
 '<div class="rnr-seed-row"><label>SEED <input class="rnr-seed" spellcheck="false" maxlength="128" placeholder="random seed"></label><button class="rnr-restore" type="button">↻ SEED</button></div>'+
 '<div class="rnr-download"><button class="rnr-mp3" type="button">↓ MP3</button><button class="rnr-wav" type="button">↓ WAV</button><button class="rnr-share" type="button" title="Condividi il brano">↗ SHARE</button><span class="rnr-progress" aria-live="polite">Offline • 22.05 kHz</span></div>'+
 '<div class="rnr-meta" aria-live="polite"></div></div></section>'+
 '<dialog class="rnr-share-dialog" aria-label="Condividi questo brano"><p>Condividi brano</p><div class="rnr-share-actions"><a class="rnr-share-whatsapp" target="_blank" rel="noopener noreferrer">WhatsApp</a><a class="rnr-share-telegram" target="_blank" rel="noopener noreferrer">Telegram</a><a class="rnr-share-email">Email</a></div><button type="button" class="rnr-share-copy">Copia link</button><button type="button" class="rnr-share-close" aria-label="Chiudi">×</button></dialog><dialog class="rnr-cover-dialog" aria-label="Copertina album ingrandita"><button type="button" class="rnr-cover-close" aria-label="Chiudi copertina">×</button><img class="rnr-cover-large" alt="Copertina album"><p class="rnr-cover-caption"></p></dialog>';
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
  state.settings.generatedLyrics=Boolean(state.settings.extraText.trim());
  reset(state.settings.seed||randomSeed());
 });
 updateLevels();

 function message(t){qs(root,".rnr-progress").textContent=t;}
 function config(){return {seed:state.settings.seed||undefined,style:state.settings.seed.startsWith("R1.")?undefined:state.settings.style||undefined,mood:state.settings.seed.startsWith("R1.")?undefined:state.settings.mood||undefined,concept:state.settings.seed.startsWith("R1.")?undefined:state.settings.concept||undefined,language:state.settings.seed.startsWith("R1.")?undefined:state.settings.language||undefined,duration:state.settings.seed.startsWith("R1.")?undefined:state.settings.duration?Number(state.settings.duration):undefined,withVox:state.settings.seed.startsWith('R1.')?undefined:state.settings.withVox,extraText:state.settings.extraText,lyricsText:state.settings.generatedLyrics?state.settings.extraText:undefined,lyricsVariant:state.settings.lyricsVariant};}
 qs(root,".rnr-generate-lyrics").addEventListener("click",()=>{
  const old=ensurePlan(),previous=old.voices.map(v=>v.text).join("|");
  const recipe=old.withVox?old.seed:makePlan({seed:old.seed,withVox:true}).seed;
  if(!old.withVox)state.settings.withVox=true;
  let v=state.settings.lyricsVariant,plan;
  for(let attempt=0;attempt<8;attempt++){
   v=v>=Number.MAX_SAFE_INTEGER-2?1:v+1;
   plan=makePlan({seed:recipe,lyricsVariant:v});
   if(plan.voices.map(x=>x.text).join("|")!==previous)break;
  }
  state.settings.lyricsVariant=v;state.settings.extraText="";
  state.settings.generatedLyrics=false;state.settings.seed=recipe;
  qs(root,".rnr-context").value=lyricSheet(plan);
  state.queue.insert({seed:recipe,lyricsVariant:v,voiceMix:state.voiceMix,speaker:state.settings.speaker,
   title:plan.title,artist:plan.artist,style:plan.style,lyricsText:""});
  reset(recipe,true);message("Nuovo testo #"+v+" · musica conservata");
 });
 function updatePlaylist(){
  const list=qs(root,".rnr-play-items");if(!list)return;
  list.replaceChildren();
  for(const [i,track] of state.queue.items.entries()){
   const li=document.createElement("li"),button=document.createElement("button");
   button.type="button";button.textContent=(i+1)+". "+track.artist+" — "+track.title;
   button.className=i===state.queue.index?"current":"";
   button.addEventListener("click",()=>{
    const entry=state.queue.select(i);if(!entry)return;
    state.settings.lyricsVariant=entry.lyricsVariant;state.voiceMix=entry.voiceMix??state.voiceMix;
    state.settings.speaker=entry.speaker;updateLevels();
    qs(root,'[data-param="speaker"]').checked=state.settings.speaker;
    state.settings.extraText=entry.lyricsText;state.settings.generatedLyrics=Boolean(entry.lyricsText);
    qs(root,".rnr-context").value=entry.lyricsText;
    reset(entry.seed,true);if(!state.playing)void start();
   });
   li.append(button);list.append(li);
  }
  for(const b of root.querySelectorAll("[data-mode]"))
   b.setAttribute("aria-pressed",String(b.dataset.mode===state.queue.mode));
 }
 function paintKaraoke(){
  if(!state.karaoke)return;
  const t=state.speakerActive?-1:(state.ctx?.currentTime??0)-state.startedAt;
  const key=String(state.plan?.seed)+"|"+state.settings.lyricsVariant+"|"+state.settings.extraText;
  if(key!==state.lyricKey){state.lyricKey=key;state.karaokeCues=makeKaraokeCues(state.plan);}
  const at=karaokeAt(state.karaokeCues,t),active=at.line>=0?state.karaokeCues[at.line]:null;
  const prev=qs(root,".rnr-karaoke-previous"),now=qs(root,".rnr-karaoke-current"),next=qs(root,".rnr-karaoke-next");
  const p=at.line>0?state.karaokeCues[at.line-1].text:"";
  if(prev.textContent!==p)prev.textContent=p;
  if(!active){now.dataset.line="";now.dataset.word="";now.textContent=state.speakerActive?"♫ · Speaker":"♪";}
  else if(now.dataset.line!==String(at.line)||now.dataset.word!==String(at.word)){
   now.dataset.line=String(at.line);now.dataset.word=String(at.word);
   now.replaceChildren();active.words.forEach((w,i)=>{
    const span=document.createElement("span");span.textContent=w.text+" ";
    if(i===at.word)span.className="active";now.append(span);
   });
  }
  const n=state.karaokeCues[at.line>=0?at.line+1:at.next]?.text||"";
  if(next.textContent!==n)next.textContent=n;
 }
 function update(plan){
  title.textContent=plan.title;artist.textContent=plan.artist+" · "+plan.style;
  qs(root,".rnr-seed").value=plan.seed;
  drawCover(qs(root,".rnr-cover"),plan);
  qs(root,'[data-param="withVox"]').checked=plan.withVox;
  qs(root,".rnr-meta").textContent=plan.tuning+" · "+plan.bpm+" BPM · "+plan.duration+"s · "+plan.language.toUpperCase()+(plan.withVox?" · VOX":"")+" · "+plan.mood+" · "+(plan.sections?.length||0)+" movements";
 }
 function ensurePlan(){if(!state.plan){
  state.plan=makePlan(config());state.settings.seed=state.plan.seed;
  if(!state.loadingExisting){
   const entry={seed:state.plan.seed,lyricsVariant:state.settings.lyricsVariant,voiceMix:state.voiceMix,
    speaker:state.settings.speaker,lyricsText:state.settings.generatedLyrics?state.settings.extraText:"",
    title:state.plan.title,artist:state.plan.artist,style:state.plan.style};
   const last=state.queue.selected;
   if(!last||last.seed!==entry.seed||last.lyricsVariant!==entry.lyricsVariant||last.lyricsText!==entry.lyricsText)
    state.queue.insert(entry);
   else state.queue.replaceSelected(entry);
  }
  state.loadingExisting=false;update(state.plan);updatePlaylist();
 }return state.plan;}
 function reset(seed,keepQueue=false){
 state.token++;state.prefetchTicket++;state.prefetched=null;state.cachedPrepared=null;
 clearTimeout(state.nextTimer);state.nextTimer=null;state.plan=null;state.audio=null;
 state.settings.seed=seed===undefined?randomSeed():seed;state.loadingExisting=Boolean(keepQueue);
 const p=ensurePlan();if(state.playing)void start();else message("Seed ready");return p;
}
 function paint(){
  paintKaraoke();if(!ctx2d)return;const w=canvas.width,h=canvas.height;
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
  state.token++;state.prefetchTicket++;state.prefetched=null;
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
   const audio=state.cachedPrepared||await renderAsync(plan);state.cachedPrepared=null;
   if(ticket!==state.token)return;
   const buf=state.ctx.createBuffer(2,audio.channels[0].length,audio.sampleRate);
   for(let c=0;c<2;c++)buf.copyToChannel(audio.channels[c],c);
   const continuous=state.repeat;
    const crossfade=continuous?1.85:1.35;
    const next=spliceTrack(state.ctx,buf,state.gain,state.active,crossfade,continuous);
   if(audio.voiceChannels){
    const vocals=state.ctx.createBuffer(2,audio.voiceChannels[0].length,audio.sampleRate);
    for(let c=0;c<2;c++)vocals.copyToChannel(audio.voiceChannels[c],c);
    state.voiceActive=spliceTrack(state.ctx,vocals,state.voiceGain,state.voiceActive,crossfade,continuous);
   }else if(state.voiceActive){
    haltTrack(state.voiceActive);state.voiceActive=null;
   }
   state.active=next;state.source=next.source;state.audio=audio;
    state.startedAt=state.ctx.currentTime;state.speakerActive=false;state.lyricKey="";
   state.playing=true;play.textContent="Ⅱ";play.setAttribute("aria-label","Pausa");
   clearTimeout(state.nextTimer);
   state.nextTimer=setTimeout(()=>{
     if(ticket!==state.token||!state.playing)return;
     if(settings.autonext===false&&!state.repeat){stop();return;}
     if(state.repeat){reset(plan.seed,true);return;}
     void playNext();
    },Math.max(500,(plan.duration-(state.repeat?0:1))*1000));
    void prefetchNext(ticket);
    message("Playing · "+(audio.voiceChannels?"VOX PCM · FX / CHOIR":"instrumental"));
   if(!state.raf)paint();
  }catch(e){message("Error: "+e.message);console.error("[RNR]",e);}
  finally{if(ticket===state.token)root.classList.remove("rnr-busy");}
 }
 function stationLanguage(){
  const preferred=String(globalThis.navigator?.languages?.[0]||globalThis.navigator?.language||state.plan?.language||"it").slice(0,2).toLowerCase();
  return ["it","en","fr","es","de"].includes(preferred)?preferred:(state.plan?.language||"it");
 }
 function candidateNext(){
  if(state.repeat||state.queue.mode==="single")return null;
  const list=state.queue.items,index=state.queue.index;
  if(state.queue.mode==="all")return list[index+1]?{...list[index+1],existingIndex:index+1}:null;
  if(state.queue.mode==="random"&&list.length>1){
   let n=Math.floor(Math.random()*(list.length-1));if(n>=index)n++;
   return {...list[n],existingIndex:n};
  }
  const seed=state.queue.uniqueSeed(randomSeed);
  const plan=makePlan({seed,style:state.settings.style||undefined,
    mood:state.settings.mood||undefined,concept:state.settings.concept||undefined,
    language:state.settings.language||undefined,
    duration:state.settings.duration?Number(state.settings.duration):undefined,
    withVox:state.settings.withVox});
  return {seed:plan.seed,lyricsVariant:0,lyricsText:"",voiceMix:state.voiceMix,
   speaker:state.settings.speaker,title:plan.title,artist:plan.artist,style:plan.style};
 }
 async function prefetchNext(ticket){
  if(state.repeat)return;
  const entry=candidateNext();if(!entry)return;
  const version=++state.prefetchTicket;
  try{
   const plan=makePlan({seed:entry.seed,lyricsVariant:entry.lyricsVariant,
    lyricsText:entry.lyricsText});
   const audio=await renderAsync(plan);
   if(state.settings.speaker&&!state.loadingNews&&Date.now()-state.lastNewsFetch>12*60*1000){
    state.loadingNews=true;state.lastNewsFetch=Date.now();
    fetchVerifiedNews(stationLanguage()).then(x=>{state.newsCache=x;})
      .finally(()=>{state.loadingNews=false;});
   }
   if(version===state.prefetchTicket&&ticket===state.token)
    state.prefetched={entry,plan,audio};
  }catch(e){console.warn("[RNR] Prefetch:",e);}
 }
 async function playNext(){
  if(!state.playing)return;
  const ready=state.prefetched,entry=ready?.entry||candidateNext();
  if(!entry){stop();return;}
  state.prefetched=null;
  const cue=state.settings.speaker&&state.queue.mode==="radio"?
   planSpeaker(state.plan,entry,{language:stationLanguage(),seed:"RNR-Station-v06",verifiedNews:state.newsCache}):null;
  if(cue){
   try{
    const spoken=renderSpeakerPCM(cue,{sampleRate:22050});
    if(spoken&&state.playing){
     const buf=state.ctx.createBuffer(2,spoken.channels[0].length,spoken.sampleRate);
     for(let ch=0;ch<2;ch++)buf.copyToChannel(spoken.channels[ch],ch);
     state.active=spliceTrack(state.ctx,buf,state.gain,state.active,.6,false);
     if(state.voiceActive){
      state.voiceActive.gain.gain.setTargetAtTime(0,state.ctx.currentTime,.10);
      try{state.voiceActive.source.stop(state.ctx.currentTime+.35);}catch(_e){}
      state.voiceActive=null;
     }
     state.speakerActive=true;message(cue.type==="advertisement"?"Spot immaginario":cue.type==="caller"?"Telefonata fittizia":"Speaker");
     const ticket=++state.token;
     clearTimeout(state.nextTimer);
     state.nextTimer=setTimeout(()=>{
      if(ticket===state.token&&state.playing)void goToEntry(entry,ready);
     },Math.max(150,Math.round((spoken.duration-.30)*1000)));
     return;
    }
   }catch(e){console.warn("[RNR] Speaker:",e);}
  }
  await goToEntry(entry,ready);
 }
 async function goToEntry(entry,prepared=null){
  if(entry.existingIndex!==undefined)state.queue.select(entry.existingIndex);
  state.settings.seed=entry.seed;
  state.settings.lyricsVariant=entry.lyricsVariant||0;
  state.voiceMix=entry.voiceMix??state.voiceMix;
  state.settings.speaker=Boolean(entry.speaker);
  updateLevels();qs(root,'[data-param="speaker"]').checked=state.settings.speaker;
  state.settings.extraText=entry.lyricsText||"";
  state.settings.generatedLyrics=Boolean(entry.lyricsText);
  qs(root,".rnr-context").value=entry.lyricsText||"";
  state.loadingExisting=entry.existingIndex!==undefined;
  state.plan=null;state.audio=null;state.lyricKey="";state.prefetchTicket++;
  const plan=ensurePlan();
  if(prepared?.audio&&prepared.plan.seed===plan.seed&&
    prepared.plan.lyricsVariant===plan.lyricsVariant)
   state.cachedPrepared=prepared.audio;
  await start();
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
 qs(root,".rnr-next").addEventListener("click",()=>{
  const wasPlaying=state.playing;reset();if(!wasPlaying)void start();
 });
 qs(root,".rnr-repeat").addEventListener("click",()=>{
  state.repeat=!state.repeat;
  qs(root,".rnr-repeat").setAttribute("aria-pressed",String(state.repeat));
  qs(root,".rnr-repeat").title=state.repeat?"Repeat Song attivo":"Repeat Song disattivato";
  state.prefetchTicket++;state.prefetched=null;
  if(state.playing&&!state.repeat)void prefetchNext(state.token);
 });
 qs(root,".rnr-karaoke-toggle").addEventListener("click",()=>{
  state.karaoke=!state.karaoke;
  qs(root,".rnr-karaoke").hidden=!state.karaoke;
  qs(root,".rnr-karaoke-toggle").setAttribute("aria-pressed",String(state.karaoke));
  paintKaraoke();
 });
 qs(root,".rnr-playlist-toggle").addEventListener("click",()=>{
  const panel=qs(root,".rnr-playlist");panel.hidden=!panel.hidden;
  qs(root,".rnr-playlist-toggle").setAttribute("aria-expanded",String(!panel.hidden));
  if(!panel.hidden)updatePlaylist();
 });
 for(const b of root.querySelectorAll("[data-mode]"))b.addEventListener("click",()=>{
  state.queue.setMode(b.dataset.mode);updatePlaylist();
  state.prefetchTicket++;state.prefetched=null;
  if(state.playing&&!state.repeat)void prefetchNext(state.token);
 });
 qs(root,".rnr-mute").addEventListener("click",()=>setMuted(!state.muted));
 qs(root,".rnr-more").addEventListener("click",()=>{panel.hidden=!panel.hidden;});
 qs(root,".rnr-mp3").addEventListener("click",()=>download("mp3"));
 qs(root,".rnr-wav").addEventListener("click",()=>download("wav"));
 qs(root,".rnr-restore").addEventListener("click",()=>{const wasPlaying=state.playing;reset(qs(root,".rnr-seed").value.trim()||randomSeed());if(!wasPlaying)void start();});
 const shareDialog=qs(root,".rnr-share-dialog");
 let preparedLink="";
 function currentShareLink(){
  const linkBase=new URL("./index.html",import.meta.url);
  if(!linkBase.pathname.includes("/releases/v06/"))
   linkBase.pathname=linkBase.pathname.replace(/\/radio\/index\.html$/,"/radio/releases/v06/index.html");
  return createSongLink(linkBase,ensurePlan(),{
   lyricsVariant:state.settings.lyricsVariant,
   lyrics:state.settings.generatedLyrics?state.settings.extraText:"",
   voiceMix:state.voiceMix,speaker:state.settings.speaker});
 }
 function showShare(){
  const p=ensurePlan(),link=currentShareLink(),targets=shareTargets(link,p.title);
  preparedLink=link;
  for(const name of ["whatsapp","telegram","email"])
   qs(root,".rnr-share-"+name).href=targets[name];
  if(typeof shareDialog.showModal==="function")shareDialog.showModal();
  else shareDialog.setAttribute("open","");
 }
 qs(root,".rnr-share").addEventListener("click",async()=>{
  const p=ensurePlan(),link=currentShareLink();
  if(typeof navigator.share==="function"){
   try{await navigator.share({title:p.title,text:p.artist+" · "+p.title,url:link});
    message("Condivisione avviata");return;
   }catch(e){if(e?.name==="AbortError")return;}
  }
  showShare();
 });
 qs(root,".rnr-share-close").addEventListener("click",()=>{
  if(typeof shareDialog.close==="function")shareDialog.close();
  else shareDialog.removeAttribute("open");
 });
 qs(root,".rnr-share-copy").addEventListener("click",async()=>{
  try{await navigator.clipboard.writeText(preparedLink||currentShareLink());
   message("Link copiato");if(typeof shareDialog.close==="function")shareDialog.close();
  }catch{message(preparedLink||currentShareLink());}
 });
 root.querySelectorAll("[data-param]").forEach(input=>{
  const key=input.dataset.param;if(state.settings[key]!==undefined)input.type==="checkbox"?input.checked=state.settings[key]:input.value=state.settings[key];
  input.addEventListener("change",()=>{if(key==="speaker"){state.settings.speaker=input.checked;state.queue.replaceSelected({speaker:input.checked});return;}if(state.settings.seed.startsWith("R1."))state.settings.seed=state.settings.seed.split(".")[1];state.settings[key]=input.type==="checkbox"?input.checked:input.value;
   if(key==="style"&&state.settings.style==="hiphop")state.settings.withVox=true;
   reset(state.settings.seed||randomSeed());});
 });
 const query=new URLSearchParams(location.search);
 if(settings.readQuery!==false&&query.has("seed")){state.settings.seed=query.get("seed").slice(0,128);for(const [a,b] of [["style","style"],["mood","mood"],["concept","concept"],["lang","language"],["duration","duration"]])if(query.has(a)){state.settings[b]=query.get(a);const el=root.querySelector('[data-param="'+b+'"]');if(el)el.value=state.settings[b];}state.settings.withVox=query.get("vox")==="1";
 state.settings.lyricsVariant=Math.max(0,Math.min(Number.MAX_SAFE_INTEGER-1,Number.parseInt(query.get("lv")||"0",10)||0));
 if(query.has("vm")){
  const vm=Number(query.get("vm"));
  if(Number.isFinite(vm))state.voiceMix=Math.max(0,Math.min(1,vm/100));
 }
 state.settings.speaker=query.get("sp")==="1";
 if(query.has("engine")&&query.get("engine")!=="0.6.0")
  message("Versione non corrispondente: riproduzione diversa");
 if(query.has("lyrics")){
  state.settings.extraText=String(query.get("lyrics")||"").slice(0,3200);
  state.settings.generatedLyrics=Boolean(state.settings.extraText.trim());
  qs(root,".rnr-context").value=state.settings.extraText;
 }else if(state.settings.lyricsVariant)
  qs(root,".rnr-context").value=lyricSheet(makePlan({
   seed:state.settings.seed,lyricsVariant:state.settings.lyricsVariant}));
 qs(root,'[data-param="withVox"]').checked=state.settings.withVox;
  qs(root,'[data-param="speaker"]').checked=state.settings.speaker;}
 ensurePlan();updateLevels();updatePlaylist();paint();
 root.__rnr={start,stop,next:()=>reset(),download,get plan(){return state.plan;},get audio(){return state.audio;},regenerate:(options={})=>{Object.assign(state.settings,options);return reset(options.seed??state.settings.seed??randomSeed());},setMuted,setVolume,setVoiceMix,showCover,
 get volume(){return state.volume;},get voiceMix(){return state.voiceMix;},
 get playing(){return state.playing;},get playlist(){return state.queue.items;},
  get mode(){return state.queue.mode;},setMode(mode){state.queue.setMode(mode);updatePlaylist();},
  get repeat(){return state.repeat;}};
 return root.__rnr;
}
if(typeof document!=="undefined"){
 const auto=()=>document.querySelectorAll("[data-null-radio]").forEach(el=>mount(el,{base:el.dataset.base,readQuery:el.dataset.query!=="off"}));
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",auto,{once:true});else auto();
 window.RandomNullRadio={mount,makePlan,renderPCM,pcmToWav,pcmToMP3,randomSeed};
}
