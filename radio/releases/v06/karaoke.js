/* Karaoke word timestamps use the same deterministic voice score as synthesis. */
import {planDelivery} from "./vocal-director.js";
export function makeKaraokeCues(plan){
 if(!plan?.voices?.length)return [];
 const cues=[];
 for(const entry of plan.voices){
  if(!entry||typeof entry.text!=="string"||!Number.isFinite(entry.time))continue;
  const slots=planDelivery(entry.text,plan,entry,22050);
  let end=entry.time;
  const words=slots.map(slot=>{
   const s=entry.time+slot.start/22050,e=s+slot.length/22050;
   end=Math.max(e,end);return {text:slot.word,start:s,end:e};
  });
  cues.push({text:entry.text,start:entry.time,end,words,kind:entry.section||entry.form||"speech"});
 }
 return cues.sort((a,b)=>a.start-b.start);
}
export function karaokeAt(cues,time){
 if(!Array.isArray(cues)||!cues.length)return {line:-1,word:-1};
 let lo=0,hi=cues.length;
 while(lo<hi){const mid=(lo+hi)>>>1;if(cues[mid].start<=time)lo=mid+1;else hi=mid;}
 const i=lo-1;
 if(i<0||time>cues[i].end+.16)return {line:-1,word:-1,next:i+1};
 let word=-1;
 for(let j=0;j<cues[i].words.length;j++){
  const w=cues[i].words[j];if(time>=w.start-.03&&time<=w.end+.04){word=j;break;}
 }
 return {line:i,word,next:i+1};
}
