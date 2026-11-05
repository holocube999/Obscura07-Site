/* RΛNDØM[NULL] RADIO - original OFFLINE text-to-audio voice synthesizer.
 * Text -> phonemes -> formant PCM -> tunable monster/robot/chorus DSP -> stereo
 * bus. The entire bus is rendered BEFORE music playback. No native Web Speech,
 * microphone, external TTS API, CDN, downloaded model or live voice queue.
 *
 * This is a stylized, robotic phoneme synthesizer, not a natural-language TTS
 * replacement. Pronunciation is approximate, especially for non-Latin scripts.
 */
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
export function textPhonemes(text,language="it"){
 const latin=plain(text);
 const tokens=[];
 const words=latin.match(/[\p{L}\p{N}]+|[.,!?;:]|\s+/gu)||[];
 for(const word of words){
  if(/^\s+$/u.test(word)){tokens.push(" ");continue}
  if(/^[.,!?;:]$/u.test(word)){tokens.push(".");continue}
  for(let i=0;i<word.length;){
   const rest=word.slice(i);
   let code=null,span=1;
   const patterns=[
    ["sch","sh"],["gli","ly"],["gn","ny"],["sh","sh"],["ch","k"],
    ["gh","g"],["ph","f"],["th","th"],["qu","kw"],["sc","sh"],
    ["ci","ch"],["gi","j"],["ck","k"],["ts","ts"],["zh","zh"],["ll","l"]
   ];
   // Italian sc is "sh" only before e/i; elsewhere leave s+c.
   for(const [pattern,phoneme] of patterns){
    if(rest.startsWith(pattern) && !(language==="it"&&pattern==="sc"&&!/[ei]/.test(rest[2]||""))){
     code=phoneme;span=pattern.length;break;
    }
   }
   if(!code)code=word[i];
   if(code==="ly")tokens.push("l","y");
   else if(code==="kw")tokens.push("k","u");
   else if(VOWELS[code]||CONSONANTS.has(code))tokens.push(code);
   else if(/[0-9]/.test(code))tokens.push(["o","u","d","t","k","c","s","s","o","n"][+code]||"o");
   else tokens.push("a");
   i+=span;
  }
 }
 return tokens.slice(0,180);
}
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
function buildWord(text,opts,rng){
 const sr=opts.sampleRate,phonemes=textPhonemes(text,opts.language);
 const beat=60/clamp(opts.bpm||100,35,230);
 const speed=clamp(opts.rate||1,.62,1.9);
 const sizes=phonemes.map(token=>{
  if(token===".")return Math.round(sr*beat*.35);
  if(token===" ")return Math.round(sr*beat*.13);
  return Math.round(sr*(VOWELS[token]?beat*.27:beat*.15)/speed);
 });
 const length=sizes.reduce((a,b)=>a+b,0)+Math.round(sr*.018);
 const pcm=new Float32Array(length);
 let at=0,globalPhase=0,noiseSmooth=0,seedPhase=rng()*TAU;
 const base=clamp(opts.pitch||140,45,650);
 const pitch=quantizePitchHz(base,opts.tuning,opts.referenceHz);
 const shift=opts.formantShift||1;
 for(let k=0;k<phonemes.length;k++){
  const token=phonemes[k],count=sizes[k];
  if(token===" "||token==="."){at+=count;continue}
  const vowel=Boolean(VOWELS[token]);
  const voiced=vowel||["l","m","n","r","v","z","j","ny"].includes(token);
  const h=timbre(VOWELS[token]?token:token==="m"?"u":token==="n"||token==="ny"?"i":"a",
   pitch,sr,shift);
  const f=token==="sh"||token==="s"||token==="f"||token==="th"||token==="h"||
   token==="ts";
  const plosive=["p","b","t","d","k","g","c","ch"].includes(token);
  for(let i=0;i<count;i++){
   const time=i/sr,u=i/count;
   const attack=clamp(i/(sr*(plosive?.002:.012)),0,1);
   const release=clamp((count-i)/(sr*.023),0,1);
   const env=attack*release;
   // Autotuned source pitch, with restrained human/monster vibrato.
   const mod=1+(opts.vibrato||0)*Math.sin(TAU*(4.2+k*.21)*(at+i)/sr);
   globalPhase+=TAU*pitch*mod/sr;
   if(globalPhase>TAU*4096)globalPhase%=TAU;
   let harmonic=0;
   if(voiced){
    for(let n=0;n<h.weights.length;n++)
     harmonic+=Math.sin(globalPhase*(n+1)+seedPhase)*h.weights[n];
    harmonic*=h.scale;
   }
   const noise=rng()*2-1;
   noiseSmooth=noiseSmooth*.76+noise*.24;
   let signal=voiced?harmonic*.93:0;
   if(f)signal+=((noise-noiseSmooth)*.56+noiseSmooth*.18);
   if(plosive)signal+=noise*Math.exp(-u*28)*.83;
   if(token==="r")signal*=.45+.55*Math.sin(TAU*27*i/sr)**2;
   if(token==="m"||token==="n"||token==="ny")signal*=.62;
   if(opts.mode==="robot")signal*=.67+.33*Math.sin(TAU*19*(at+i)/sr);
   if(opts.mode==="monster")signal=Math.tanh(signal*2.4)*.78;
   if(opts.mode==="glitch"&&((i>>8)&7)===0)signal*=.2;
   pcm[at+i]=signal*env*.66;
  }
  at+=count;
 }
 return pcm;
}
function processedSegment(text,plan,entry,index,sr,rng,mode){
 const beat=60/clamp(plan.sections?.find(s=>entry.time>=s.start&&entry.time<s.end)?.bpm||plan.bpm||100,35,230);
 const base=clamp((entry.voice?.base||140)*(mode==="monster"?.57:mode==="angelic"?1.18:1),45,420);
 const formant=mode==="monster"?.73:mode==="angelic"?1.21:mode==="robot"?.94:1;
 const opts={sampleRate:sr,language:entry.language||plan.language,bpm:60/beat,
             pitch:base,rate:entry.voice?.rate||1,formantShift:formant,
             vibrato:mode==="angelic"?.008:mode==="monster"?.019:.004,
             mode,referenceHz:55,tuning:plan.tuning};
 // Word onsets respect half-beat spacing. Text is converted to PCM first,
 // then post-processed; no native speech is ever played in the browser.
 const words=String(text).split(/\s+/).filter(Boolean);
 const rap=Number.isFinite(entry.rhymeTime)&&Number.isFinite(entry.barEnd)&&
   entry.rhymeTime>entry.time&&entry.barEnd>entry.rhymeTime;
 const rhymeAt=rap?Math.round((entry.rhymeTime-entry.time)*sr):0;
 const cap=rap?Math.round((entry.barEnd-entry.time)*sr):Math.round(sr*12);
 const scheduled=[];
 let end=0;
 for(let i=0;i<words.length;i++){
  let samples=buildWord(words[i],opts,rng);
  let start;
  if(rap){
   const last=i===words.length-1;
   const slot=last?Math.max(1,cap-rhymeAt):
     Math.max(1,Math.floor(rhymeAt/Math.max(1,words.length-1)));
   // Rap consonants fall on subdivisions; the rhyme enters on beat four.
   start=last?rhymeAt:Math.floor(i*rhymeAt/Math.max(1,words.length-1));
   const wanted=Math.max(1,Math.min(samples.length,Math.floor(slot*.91)));
   if(samples.length>wanted){
    const sped=new Float32Array(wanted);
    for(let k=0;k<wanted;k++){
     const x=k*(samples.length-1)/Math.max(1,wanted-1),j=Math.floor(x);
     sped[k]=(samples[j]||0)*(1-(x-j))+(samples[j+1]||0)*(x-j);
    }
    samples=sped;
   }
  }else start=Math.max(end,Math.round(i*beat*.5*sr));
  scheduled.push({start,samples});
  end=Math.max(end,start+samples.length);
 }
 const out=new Float32Array(Math.min(Math.round(sr*12),
   rap?Math.min(cap,Math.max(end,1)):end+Math.round(sr*.1)));
 for(const {start,samples} of scheduled){
  for(let i=0;i<samples.length&&start+i<out.length;i++)out[start+i]+=samples[i];
 }
 // Multiband-agnostic waveshaping. The underlying phonemes remain audible,
 // but both formants and pitch are deliberately far from unprocessed TTS.
 const drive=mode==="monster"?2.8:mode==="robot"?1.7:mode==="glitch"?2.3:1.05;
 for(let i=0;i<out.length;i++){
  const v=out[i]*drive;
  out[i]=Math.tanh(v)/Math.tanh(drive)*.75;
 }
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
 const r=random(plan.seed+"|voice-render-v1");
 const modes=["monster","robot","angelic","chorus","autotune","glitch"];
 for(let index=0;index<plan.voices.length;index++){
  const entry=plan.voices[index];
  if(!entry||!Number.isFinite(entry.time)||typeof entry.text!=="string")continue;
  const mode=modes[Math.floor(r()*modes.length)];
  const phrase=processedSegment(entry.text,plan,entry,index,sr,r,mode);
  if(!phrase.length)continue;
  const position=clamp(entry.time,0,duration-.03);
  // Per-phrase soft RMS normalization, not an uncontrolled vocal boost.
  let energy=0;for(let i=0;i<phrase.length;i++)energy+=phrase[i]*phrase[i];
  const rms=Math.sqrt(energy/phrase.length);
  const gain=Math.min(1.2,.17/Math.max(.008,rms));
  const beat=60/clamp(plan.sections?.find(s=>position>=s.start&&position<s.end)?.bpm||plan.bpm||100,35,230);
  const voices=mode==="chorus"||mode==="angelic"?4:mode==="monster"?3:2;
  for(let layer=0;layer<voices;layer++){
   const detune=layer===0?0:mode==="chorus"?[-.035,.035,.07][(layer-1)%3]:
    mode==="monster"?[-.12,.07][(layer-1)%2]:[-.015,.018][(layer-1)%2];
   const offset=layer===0?0:.014*layer;
   const pan=layer===0?0:(layer%2?-.62:.62);
   const ratio=Math.pow(2,detune);
   // Resampling gives harmonizing shifts in pre-rendered audio.
   const temp=new Float32Array(Math.floor(phrase.length/ratio));
   for(let j=0;j<temp.length;j++){
    const x=j*ratio,i=Math.floor(x),t=x-i;
    temp[j]=(phrase[i]||0)*(1-t)+(phrase[i+1]||0)*t;
   }
   writeDelay(bus,position,temp,gain*(layer? .27:.7),pan,sr,offset);
  }
  // Musical echoes and short room reverb are part of the recorded PCM.
  const repeats=mode==="monster"?3:mode==="chorus"?5:3;
  for(let tap=1;tap<=repeats;tap++){
   writeDelay(bus,position,phrase,gain*Math.pow(.43,tap)*.23,
      tap%2?.48:-.48,sr,(beat*.5)*tap);
  }
  for(const [delay,amp,pan] of [[.031,.083,-.75],[.059,.054,.75],[.097,.036,-.35]]){
   writeDelay(bus,position,phrase,gain*amp,pan,sr,delay);
  }
 }
 // Stable bus limiter. The voice is attenuated again by the independent
 // VOX LEVEL control and passes through the same master gain as the music.
 for(const channel of bus){
  for(let i=0;i<channel.length;i++)channel[i]=Math.tanh(channel[i]*1.35)*.77;
 }
 return {sampleRate:sr,channels:bus,preRendered:true,engine:"offline-formant-dsp"};
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
