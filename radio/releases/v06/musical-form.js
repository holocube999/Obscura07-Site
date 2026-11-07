/* RNR v3: seeded coherent forms, composition-aware vocal guide and final envelopes.
 * Uses notes in the score, never a fixed major/minor tuning approximation. */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const pools={
 xenodrone:["drone","drone","abstract","loopable"],darkambient:["drone","drone","song","abstract"],
 meditation:["drone","song","loopable","drone"],biosphere:["drone","song","loopable","abstract"],
 ritual:["song","drone","abstract","loopable"],hangdrum:["song","loopable","drone","song"],
 hiphop:["song","song","song","loopable","loop"],techno:["song","loopable","loop","song"],
 pulse:["song","loopable","loop","abstract"],glitch:["abstract","loop","song","loopable"],
 chiptune:["song","loop","loopable","song"],punk:["song","song","loopable","song"],
 metal:["song","song","loopable","song"]
};
const templates={
 hiphop:["intro","verse","verse","hook","verse","hook","outro"],
 techno:["intro","groove","build","drop","breakdown","drop","outro"],
 metal:["intro","riff","verse","chorus","solo","chorus","outro"],
 punk:["intro","verse","chorus","verse","bridge","chorus","outro"],
 synthwave:["intro","verse","build","hook","bridge","hook","outro"],
 chiptune:["intro","theme","variation","hook","solo","return","outro"],
 default:["intro","theme","variation","climax","interlude","return","outro"]
};
export function chooseMusicalForm(seed,style,rngFor){
 const r=rngFor(seed+"|form-v3"),pool=pools[style]||["song","song","loopable","abstract","drone"];
 return pool[Math.floor(r()*pool.length)];
}
export function organizeArrangement(plan,arranged){
 const {events,sections,breaks}=arranged,{duration,style,form,bpm}=plan;
 const template=templates[style]||templates.default;
 for(const section of sections){
  const p=clamp(section.start/duration,0,.999);
  if(style==="hiphop")continue; // Keep explicit score sections and vocal rests.
  section.name=form==="drone"?(p<.12?"rise":p>.86?"dissolve":"evolve"):
   form==="loop"?"cycle":form==="loopable"?(p<.2?"groove":p>.8?"return":"variation"):
   form==="abstract"?(p>.9?"decay":"fragment"):
   template[Math.min(template.length-1,Math.floor(p*template.length))];
 }
 for(const e of events){
  const label=sections.find(s=>e.time>=s.start&&e.time<s.end)?.name||"theme";
  const factor=form==="song"?(label==="intro"?.55:label==="outro"?.52:
   ["hook","chorus","drop","climax"].includes(label)?1.12:
   ["interlude","breakdown","bridge"].includes(label)?.72:1):
   form==="drone"?(["kick","snare","hat","clap"].includes(e.kind)?.28:.86):1;
  e.amp=+clamp(e.amp*factor,.001,.8).toFixed(4);
 }
 if(form==="song"){
  // The last phrase resolves toward the starting chord; the ending fades to zero.
  const root=events.find(e=>["bass","chipbass","drone"].includes(e.kind)&&e.time<duration*.22);
  if(root){
   const time=Math.max(0,duration-Math.min(4*60/bpm,duration*.13));
   events.push({...root,time:+time.toFixed(4),
    length:+Math.max(.08,duration-time-.025).toFixed(4),amp:+clamp(root.amp*.68,.02,.18).toFixed(4),pan:0});
   events.sort((a,b)=>a.time-b.time);
  }
 }
 if(form==="loop"||form==="loopable"){
  const first=events.filter(e=>e.time<4*60/bpm),tail=duration-4*60/bpm;
  for(const kind of ["bass","chipbass","pad","drone"]){
   const home=first.find(e=>e.kind===kind);
   if(home)for(const e of events)if(e.kind===kind&&e.time>=tail)e.freq=home.freq;
  }
 }
 return {events,sections,breaks};
}
export function createVocalGuide(plan,rngFor){
 const r=rngFor(plan.seed+"|hidden-vocal-v6"),beat=60/plan.bpm;
 const tonal=plan.events.filter(e=>!["kick","snare","hat","clap","glitch"].includes(e.kind)&&
  Number.isFinite(e.freq)&&e.freq>24&&e.amp>.009);
 if(!tonal.length)return [];
 const cell=beat*(plan.style==="hiphop"?.5:1); // hidden eighth-note vocal pitch guide
 const motifs=[[0,0,1,0,2,1,0,-1],[0,1,2,1,0,-1,0,1],[0,0,-1,1,0,2,1,0]];
 const motif=motifs[Math.floor(r()*motifs.length)];
 const beatShift=r()>.5?0:1;
 let previous=null,previousHarmony=null;
 const guide=[];
 const inRange=(hz,min,max)=>{
  if(!Number.isFinite(hz)||hz<=0)return min;
  while(hz<min)hz*=2;
  while(hz>max)hz/=2;
  return hz;
 };
 const st=(a,b)=>Math.abs(12*Math.log2(a/b));
 for(let t=0,index=0;t<plan.duration-.05;t+=cell,index++){
  const nearby=tonal.filter(e=>e.time<=t+beat*.4&&e.time+e.length>t-beat*.18);
  const notes=nearby.length?nearby:tonal.slice(0,6);
  // Pitch-class candidates are the pitches actually rendered in the song.
  const options=[...new Set(notes.map(e=>+inRange(e.freq,108,260).toFixed(3)))];
  if(!options.length)continue;
  const section=plan.sections?.find(s=>s.start<=t&&s.end>t);
  const hook=["hook","chorus"].includes(section?.name);
  const phrase=motif[(index+beatShift+Math.floor(index/16))%motif.length]*(hook?1.25:.9);
  const preferred=previous?previous*Math.pow(2,phrase/12):options[0];
  const scored=options.map(hz=>{
   const motion=previous?st(previous,hz):0;
   const phraseCost=st(preferred,hz);
   const leapPenalty=motion>7?(motion-7)*1.7:0;
   const tension=notes.some(e=>["pad","choir","bell","handpan"].includes(e.kind)&&
    st(inRange(e.freq,108,260),hz)<.15)?-.6:0;
   return {hz,score:phraseCost*.62+motion*.50+leapPenalty+tension};
  }).sort((a,b)=>a.score-b.score||a.hz-b.hz);
  const lead=scored[0].hz;
  const harmonyChoices=options.filter(hz=>st(hz,lead)>2.5).map(hz=>{
   const interval=st(hz,lead);
   return {hz,score:Math.abs(interval-4)*.5+(previousHarmony?st(previousHarmony,hz)*.22:0)};
  }).sort((a,b)=>a.score-b.score||a.hz-b.hz);
  // If the chord contains a single note, use a supported octave, not an
  // invented chromatic third; the underlying tuning is microtonal.
  const harmony=harmonyChoices.length?harmonyChoices[0].hz:
   inRange(lead/2,110,265);
  guide.push({time:+t.toFixed(4),end:+Math.min(plan.duration,t+cell).toFixed(4),
   hz:+lead.toFixed(4),harmonyHz:+harmony.toFixed(4)});
  previous=lead;previousHarmony=harmony;
 }
 return guide;
}
export function applyMusicalEnding(channels,plan,sr){
 if(!channels?.length)return;
 const n=channels[0].length,form=plan.form||"song";
 const attack=form==="drone"?.85:form==="song"?.1:.012;
 const release=form==="song"?Math.min(3.2,Math.max(.8,plan.duration*.07)):
  form==="drone"?Math.min(4,Math.max(1.6,plan.duration*.09)):
  form==="abstract"?.65:.012;
 const fadeIn=Math.max(1,Math.round(attack*sr)),fadeOut=Math.max(1,Math.round(release*sr));
 for(const ch of channels){
  for(let i=0;i<Math.min(fadeIn,n);i++)ch[i]*=Math.sin(i/fadeIn*Math.PI*.5);
  for(let i=Math.max(0,n-fadeOut);i<n;i++){
   const u=(n-1-i)/Math.max(1,fadeOut-1);
   ch[i]*=Math.sin(Math.max(0,u)*Math.PI*.5);
  }
 }
}
