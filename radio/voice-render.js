/* RΛNDØM[NULL] RADIO - original OFFLINE text-to-audio voice synthesizer.
 * Text -> phonemes -> formant PCM -> tunable monster/robot/chorus DSP -> stereo
 * bus. The entire bus is rendered BEFORE music playback. No native Web Speech,
 * microphone, external TTS API, CDN, downloaded model or live voice queue.
 *
 * This is a stylized, robotic phoneme synthesizer, not a natural-language TTS
 * replacement. Pronunciation is approximate, especially for non-Latin scripts.
 */
import {applyMusicalEnding} from "./musical-form.js";
import {phonemesFromText} from "./phonology.js";
import {synthesizeWord} from "./articulatory-dsp.js";
import {planDelivery} from "./vocal-director.js";
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
function hash(seed){
 let h=2166136261;
 for(const ch of String(seed)){h=Math.imul(h^ch.charCodeAt(0),16777619)}
 return h>>>0||1;
}
function random(seed){
 let n=hash(seed);
 return ()=>{n^=n<<13;n^=n>>>17;n^=n<<5;return(n>>>0)/4294967296};
}
export function textPhonemes(text,language="it"){return phonemesFromText(text,language);}
export function quantizePitchHz(freq,tuning="12-EDO",reference=55){
 const steps=Math.max(5,Math.min(72,parseInt(String(tuning),10)||12));
 const edo=String(tuning).includes("EDO")?steps:12;
 const f=clamp(Number(freq)||140,45,700);
 const n=Math.round(edo*Math.log2(f/reference));
 return reference*Math.pow(2,n/edo);
}
function buildWord(text,opts,rng){
 return synthesizeWord(text,opts,rng);
}
function findGuide(plan,time){
 const guide=plan.vocalGuide||[];
 if(!guide.length)return null;
 let selected=guide[0];
 for(const item of guide){if(item.time>time)break;selected=item;}
 return selected;
}
function processedSegment(text,plan,entry,index,sr,rng,mode,identity,harmonize=false){
 const beat=60/clamp(plan.sections?.find(s=>entry.time>=s.start&&entry.time<s.end)?.bpm||plan.bpm||100,35,230);
 const slots=planDelivery(text,plan,entry,sr);
 const rap=slots.some(s=>s.rap);
 if(!slots.length)return new Float32Array(0);
 const cap=rap?Math.max(1,Math.round((entry.barEnd-entry.time)*sr)):
  Math.max(1,Math.min(Math.round(sr*8),Math.round((plan.duration-entry.time)*sr)));
 const section=plan.sections?.find(s=>entry.time>=s.start&&entry.time<s.end);
 const hook=["hook","chorus"].includes(section?.name);
 const tuneStrength=harmonize?.96:rap?(hook?.70:.16):.61;
 const out=new Float32Array(cap);
 for(let i=0;i<slots.length;i++){
  const slot=slots[i],opts={sampleRate:sr,language:entry.language||plan.language,bpm:60/beat,
   pitch:identity.base,rate:identity.rate,formantShift:identity.formant,
   vibrato:rap?.0015:.004,mode,referenceHz:55,tuning:plan.tuning,
   melody:slot.pitches.map(p=>p?(harmonize?p.harmonyHz:p.hz):null),
   guideHz:slot.pitches.find(Boolean)?.[harmonize?"harmonyHz":"hz"],
   tuneStrength,targetSamples:slot.length,rap,accent:slot.accent};
  const pcm=buildWord(slot.word,opts,rng);
  for(let k=0;k<pcm.length&&slot.start+k<cap;k++)out[slot.start+k]+=pcm[k];
 }
 // Preserve stop attacks and intelligible dry consonants; ceiling only.
 for(let i=0;i<out.length;i++)out[i]=Math.tanh(out[i]*1.045)*.94;
 return out;
}
function writeDelay(bus,start,segment,amplitude,pan,sr,delay){
 const [left,right]=bus;
 const lp=Math.sqrt((1-clamp(pan,-1,1))*.5),rp=Math.sqrt((1+clamp(pan,-1,1))*.5);
 const from=Math.max(0,Math.floor((start+delay)*sr));
 for(let i=0;i<segment.length&&from+i<left.length;i++){
  const s=segment[i]*amplitude;
  left[from+i]+=s*lp;right[from+i]+=s*rp;
 }
}
export function renderVocalBus(plan,{sampleRate=22050}={}){
 const sr=Math.max(8000,Math.min(48000,Math.floor(sampleRate)));
 if(!plan?.withVox||!Array.isArray(plan.voices)||!plan.voices.length)return null;
 const duration=clamp(plan.duration||60,1,130),length=Math.ceil(duration*sr);
 const bus=[new Float32Array(length),new Float32Array(length)];
 const r=random(plan.seed+"|voice-render-v3");
 const isRap=plan.style==="hiphop";
 // A single timbre/persona per song: FX are genre-oriented, not randomly
 // changed for every bar. Rap emphasizes articulation and a centered dry lead.
 const modes=isRap?["clean","warm","radio"]:["warm","air","chorus","robot"];
 const mode=modes[Math.floor(r()*modes.length)];
 const identity={base:isRap?112+r()*34:109+r()*57,
  formant:mode==="air"?1.07:mode==="radio"?.97:mode==="robot"?.94:1,
  rate:.96+r()*.08};
 for(let index=0;index<plan.voices.length;index++){
  const entry=plan.voices[index];
  if(!entry||!Number.isFinite(entry.time)||typeof entry.text!=="string")continue;
  const position=clamp(entry.time,0,duration-.03);
  const phrase=processedSegment(entry.text,plan,entry,index,sr,r,mode,identity);
  if(!phrase.length)continue;
  let energy=0;for(let i=0;i<phrase.length;i++)energy+=phrase[i]*phrase[i];
  const rms=Math.sqrt(energy/phrase.length);
  const gain=Math.min(1.25,.18/Math.max(.008,rms));
  const beat=60/clamp(plan.sections?.find(s=>position>=s.start&&position<s.end)?.bpm||plan.bpm||100,35,230);
  writeDelay(bus,position,phrase,gain*.92,0,sr,0); // intelligible mono center
  if(isRap){
   // Quiet double-track and tasteful 1/8 note/slap echoes; consonants retain
   // their original pitch/speed (unlike old resampling-based chorusing).
   writeDelay(bus,position,phrase,gain*.115,-.42,sr,.014);
   writeDelay(bus,position,phrase,gain*.115,.42,sr,.021);
   writeDelay(bus,position,phrase,gain*.09,-.34,sr,beat*.5);
   writeDelay(bus,position,phrase,gain*.053,.34,sr,beat);
  }else{
   writeDelay(bus,position,phrase,gain*.13,-.5,sr,.017);
   writeDelay(bus,position,phrase,gain*.13,.5,sr,.025);
   writeDelay(bus,position,phrase,gain*.12,.3,sr,beat*.5);
  }
  const section=plan.sections?.find(s=>position>=s.start&&position<s.end);
  // Actual independent harmonic line from the accompaniment, not a pitch-
  // shifted copy. Use only on hooks (rap) or occasional melodic phrases.
  if(plan.vocalGuide?.length&&
    (isRap?["hook","chorus"].includes(section?.name):index%3===1)){
   const harmony=processedSegment(entry.text,plan,entry,index,sr,r,mode,identity,true);
   writeDelay(bus,position,harmony,gain*(isRap?.16:.23),-.28,sr,.026);
  }
 }
 // Light limiter at the bus level and the exact same song-end envelope as
 // the music, so echoes never become orphaned/cut at the buffer endpoint.
 for(const channel of bus)
  for(let i=0;i<channel.length;i++)channel[i]=Math.tanh(channel[i]*1.08)*.94;
 applyMusicalEnding(bus,plan,sr);
 return {sampleRate:sr,channels:bus,preRendered:true,engine:"offline-formant-dsp",
  profile:mode,identity:{...identity},guideUsed:Boolean(plan.vocalGuide?.length)};
}
export function mixVocalBus(music,voice,level=.18){
 if(!voice||!music||!music.channels)return music;
 const amount=clamp(Number.isFinite(level)?level:0,0,1);
 if(amount===0)return music;
 const channels=music.channels.map((source,n)=>{
  const out=new Float32Array(source),v=voice.channels[n]||voice.channels[0];
  for(let i=0;i<out.length&&i<v.length;i++){
   // Limiting final mix prevents corals/echoes clipping with percussion.
   out[i]=Math.tanh((source[i]+v[i]*amount)*1.08)/1.08;
  }
  return out;
 });
 return {...music,channels};
}
