/* RΛNDØM[NULL] RADIO - original OFFLINE text-to-audio voice synthesizer.
 * Text -> phonemes -> formant PCM -> tunable monster/robot/chorus DSP -> stereo
 * bus. The entire bus is rendered BEFORE music playback. No native Web Speech,
 * microphone, external TTS API, CDN, downloaded model or live voice queue.
 *
 * This is a stylized, robotic phoneme synthesizer, not a natural-language TTS
 * replacement. Pronunciation is approximate, especially for non-Latin scripts.
 */
import {applyMusicalEnding} from "./musical-form.js";
import {phonemesFromText,analyzeWord} from "./phonology.js";
import {synthesizeWord} from "./articulatory-dsp.js";
const TAU=2*Math.PI;
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const VOWELS={
 a:[820,1220,2680],e:[500,1840,2570],i:[310,2300,3080],
 o:[540,940,2480],u:[350,780,2260],y:[340,2010,2710]
};
const CONSONANTS=new Set(["b","c","d","f","g","h","j","k","l","m","n","p","q","r","s","t","v","w","x","z","sh","ch","th","zh","ts","ny"]);
const TRANSLIT={
 "α":"a","β":"v","γ":"g","δ":"d","ε":"e","ζ":"z","η":"i","θ":"th",
 "ι":"i","κ":"k","λ":"l","μ":"m","ν":"n","ξ":"ks","ο":"o","π":"p",
 "ρ":"r","σ":"s","ς":"s","τ":"t","υ":"i","φ":"f","χ":"h","ψ":"ps","ω":"o",
 "а":"a","б":"b","в":"v","г":"g","д":"d","е":"e","ё":"yo","ж":"zh",
 "з":"z","и":"i","й":"y","к":"k","л":"l","м":"m","н":"n","о":"o",
 "п":"p","р":"r","с":"s","т":"t","у":"u","ф":"f","х":"h","ц":"ts",
 "ч":"ch","ш":"sh","щ":"sh","ъ":"","ы":"y","ь":"","э":"e","ю":"yu","я":"ya"
};
function hash(seed){
 let h=2166136261;
 for(const ch of String(seed)){h=Math.imul(h^ch.charCodeAt(0),16777619)}
 return h>>>0||1;
}
function random(seed){
 let n=hash(seed);
 return ()=>{n^=n<<13;n^=n>>>17;n^=n<<5;return(n>>>0)/4294967296};
}
function plain(text){
 const transliterated=[...String(text||"").toLowerCase()].map(ch=>TRANSLIT[ch]??ch).join("");
 return transliterated.normalize("NFD").replace(/[\u0300-\u036f]/g,"")
  .replace(/[^\p{L}\p{N}\s.,!?;:'’\-]/gu," ").slice(0,200);
}
export function textPhonemes(text,language="it"){return phonemesFromText(text,language);}
export function quantizePitchHz(freq,tuning="12-EDO",reference=55){
 const steps=Math.max(5,Math.min(72,parseInt(String(tuning),10)||12));
 const edo=String(tuning).includes("EDO")?steps:12;
 const f=clamp(Number(freq)||140,45,700);
 const n=Math.round(edo*Math.log2(f/reference));
 return reference*Math.pow(2,n/edo);
}
function timbre(phoneme,pitch,sampleRate,shift=1){
 const vowels=VOWELS[phoneme]||VOWELS.a;
 const formants=vowels.map(x=>x*shift);
 const weights=new Float32Array(18);
 for(let i=0;i<weights.length;i++){
  const freq=(i+1)*pitch,order=i+1;
  weights[i]=(1.15*Math.exp(-Math.pow((freq-formants[0])/190,2))+
   .64*Math.exp(-Math.pow((freq-formants[1])/240,2))+
   .32*Math.exp(-Math.pow((freq-formants[2])/370,2))+
   .12)/Math.pow(order,.7);
 }
 let sum=0;for(let i=0;i<weights.length;i++)sum+=weights[i];
 return {weights,scale:1/Math.max(.0001,sum)};
}
/* Rap diction is synthesized at its allocated timing, never speed-changed by
 * resampling. Stable source formants identify one voice across a whole song. */
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
 const words=String(text).trim().split(/\s+/).filter(Boolean).slice(0,35);
 const rap=Number.isFinite(entry.rhymeTime)&&Number.isFinite(entry.barEnd)&&
  entry.rhymeTime>entry.time&&entry.barEnd>entry.rhymeTime;
 const rhymeAt=rap?Math.round((entry.rhymeTime-entry.time)*sr):0;
 const cap=rap?Math.round((entry.barEnd-entry.time)*sr):
  Math.min(Math.round(sr*8),Math.round((plan.duration-entry.time)*sr));
 if(cap<=0||!words.length)return new Float32Array(0);
 const scheduled=[];
 let end=0;
 const slot=Math.max(1,Math.floor(rhymeAt/Math.max(1,words.length-1)));
 for(let i=0;i<words.length;i++){
  const last=rap&&i===words.length-1;
  const start=rap?(last?rhymeAt:Math.floor(i*rhymeAt/Math.max(1,words.length-1))):
   Math.round(i*beat*.55*sr);
  if(start>=cap)break;
  const budget=rap?(last?Math.min(cap-start,Math.round(beat*.90*sr)):slot):
   Math.min(cap-start,Math.round(beat*.49*sr));
  const available=Math.max(1,Math.min(cap-start,Math.round(budget*(rap?.87:.9))));
  const note=findGuide(plan,entry.time+start/sr);
  const section=plan.sections?.find(s=>entry.time>=s.start&&entry.time<s.end);
  const hook=["hook","chorus"].includes(section?.name);
  const tuneStrength=harmonize?.94:rap?(hook?.70:.17):.60;
  const opts={sampleRate:sr,language:entry.language||plan.language,bpm:60/beat,
   pitch:identity.base,rate:identity.rate,formantShift:identity.formant,
   vibrato:rap?.0018:.004,mode,referenceHz:55,tuning:plan.tuning,
   guideHz:note?(harmonize?note.harmonyHz:note.hz):undefined,
   tuneStrength,targetSamples:available};
  const samples=buildWord(words[i],opts,rng);
  scheduled.push({start,samples});end=Math.max(end,start+samples.length);
 }
 const out=new Float32Array(Math.max(1,Math.min(cap,rap?cap:end+Math.round(sr*.04))));
 for(const {start,samples} of scheduled)
  for(let i=0;i<samples.length&&start+i<out.length;i++)out[start+i]+=samples[i];
 // Soft saturation only, with controlled output. No 2x-3x monster drive.
 for(let i=0;i<out.length;i++)out[i]=Math.tanh(out[i]*1.06)*.86;
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
