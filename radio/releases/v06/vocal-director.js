/* RNR/CONDUCTOR v1. A symbolic performance planner, not AI.
 * Syllable-weighted rhythm with bar-four rhyme landing and melodic contour.
 * Pure deterministic JS: score -> vocal slots and pitch guide. */
import {estimateSyllables,analyzeWord} from "./phonology.js";
const C=(x,a,b)=>Math.max(a,Math.min(b,x));
export function guideAt(guide,time){
 if(!Array.isArray(guide)||!guide.length)return null;
 let lo=0,hi=guide.length-1;
 while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(guide[mid].time<=time)lo=mid;else hi=mid-1;}
 return guide[lo];
}
export function planDelivery(text,plan,entry,sampleRate=22050){
 const sr=C(Math.round(sampleRate),8000,48000),bpm=C(plan.bpm||95,35,230);
 const beat=60/bpm,lang=entry.language||plan.language||"it";
 const words=String(text||"").trim().split(/\s+/).filter(Boolean).slice(0,32);
 if(!words.length)return [];
 const rap=Number.isFinite(entry.rhymeTime)&&Number.isFinite(entry.barEnd)&&
  entry.rhymeTime>entry.time&&entry.barEnd>entry.rhymeTime;
 const cap=C(rap?entry.barEnd-entry.time:Math.min(8,plan.duration-entry.time),.05,12);
 const rhyme=rap?C(entry.rhymeTime-entry.time,0,cap):0;
 const syllables=words.map(word=>estimateSyllables(word,lang));
 const weights=syllables.map((n,i)=>Math.max(.65,n)+(i?0.13:0)+(/[,.!?;:]$/.test(words[i])?.18:0));
 const total=weights.reduce((a,b)=>a+b,0);
 const starts=[];
 if(rap){
  const front=weights.slice(0,-1),sum=Math.max(.01,front.reduce((a,b)=>a+b,0));
  const grid=beat/(front.length>11?16:8);
  let cumulative=0;
  for(let i=0;i<words.length;i++){
   if(i===words.length-1){starts.push(rhyme);break;}
   const ideal=rhyme*cumulative/sum;
   // Downbeat alignment is strict, with small swing on off-subdivisions.
   const snapped=Math.round(ideal/grid)*grid;
   const swing=(i>0&&Math.round(snapped/grid)%2===1)?grid*.12:0;
   starts.push(C(Math.max(i?starts[i-1]+.035:0,snapped+swing),0,rhyme-.02));
   cumulative+=weights[i];
  }
 }else{
  // Sentences can breathe instead of cramming every word into a 1/2-beat.
  const usable=Math.min(cap*.89,Math.max(1.2,total*.17));
  const grid=beat/4;
  let cumulative=0;
  for(let i=0;i<words.length;i++){
   const raw=usable*cumulative/Math.max(.01,total);
   const candidate=Math.round(raw/grid)*grid;
   starts.push(C(Math.max(i?starts[i-1]+.055:0,candidate),0,cap-.07));
   cumulative+=weights[i];
  }
 }
 const slots=[];
 for(let i=0;i<words.length;i++){
  const start=Math.round(C(starts[i],0,cap-.01)*sr);
  const limit=(i+1<words.length?starts[i+1]:cap);
  const gap=rap?beat*.046:Math.min(.055,beat*.09);
  const remain=Math.max(1,Math.round((C(limit,0,cap)-starts[i]-gap)*sr));
  const duration=Math.max(1,Math.min(Math.round(cap*sr)-start,remain));
  const vowel=analyzeWord(words[i],lang);
  const pitches=[];
  for(let s=0;s<vowel.syllables;s++){
   const time=entry.time+(start+duration*(s+.4)/vowel.syllables)/sr;
   const note=guideAt(plan.vocalGuide,time);
   pitches.push(note?{hz:note.hz,harmonyHz:note.harmonyHz}:null);
  }
  slots.push({word:words[i],start,length:duration,syllables:syllables[i],
   pitches,accent:i===words.length-1&&rap,rap});
 }
 return slots;
}
