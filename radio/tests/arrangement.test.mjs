import test from "node:test";
import assert from "node:assert/strict";
import {STYLES,makePlan,renderPCM} from "../radio.js";
const styles=["xenodrone","chiptune","harpsichord","medieval","meditation","hangdrum","metal","techno","punk","glitch"];
test("nine new musical styles are selectable while legacy IDs stay stable",()=>{
 assert.equal(STYLES.length,18);
 assert.equal(STYLES[0],"xenodrone");
 assert.ok(styles.every(x=>STYLES.includes(x)));
});
test("each genre contains evolving arrangement and identical R1 recipe replay",()=>{
 for(const style of STYLES){
  const plan=makePlan({seed:"RNR-ARR-"+style,style,duration:36,language:"it",withVox:true});
  assert.deepEqual(makePlan({seed:plan.seed}),plan,"replay "+style);
  assert.ok(plan.events.length>12,style+" missing notes");
  assert.ok(plan.sections.length>=2,style+" missing sections");
  assert.ok(plan.sections.every(x=>[3,4,5,7].includes(x.meter)),style+" time sig");
  assert.ok(plan.sections.every(x=>x.bpm>=35&&x.bpm<=230),style+" section tempo");
  assert.ok(plan.events.every(x=>x.time>=0&&x.time<plan.duration&&x.length>=0&&x.amp>0&&Number.isFinite(x.freq)),style+" bad event");
  assert.ok(plan.events.every((x,i,a)=>i===0||x.time>=a[i-1].time),style+" time sort");
  assert.ok(plan.voices.length>=2,style+" voice content");
  assert.equal(new Set(plan.voices.map(x=>x.text)).size,plan.voices.length,style+" repeated speech");
 }
});
test("music genre sound events are distinct and include authentic triplet grids",()=>{
 for(const [style,sound] of [
  ["chiptune","chip"],["harpsichord","harpsichord"],["medieval","flute"],
  ["hangdrum","handpan"],["metal","metal"],["techno","acid"],
  ["punk","guitar"],["glitch","glitch"]
 ]){
  const plan=makePlan({seed:"STYLE-"+style,style,duration:42});
  assert.ok(plan.events.some(x=>x.kind===sound),style+" "+sound+" missing");
 }
 const plan=makePlan({seed:"THREE-PARTS",style:"harpsichord",duration:72});
 assert.ok(plan.sections.some(x=>x.triplets));
 // Distinct three-way divisions within a single beat, to ~0.2 ms.
 const times=plan.events.filter(x=>x.kind==="harpsichord").map(x=>x.time);
 const step=plan.sections.filter(x=>x.triplets).map(x=>60/x.bpm/3);
 assert.ok(step.some(d=>times.some(t=>times.some(u=>Math.abs((u-t)-d)<.0004))),
   "not a triple beat subdivision");
});
test("spoken arrangement alternates words, slogans, statements without identical lines",()=>{
 const it=makePlan({seed:"VOX-ITALIAN",style:"medieval",duration:92,withVox:true,language:"it"});
 const forms=new Set(it.voices.map(x=>x.form));
 assert.deepEqual([...forms].sort(),["sentence","slogan","word"]);
 assert.ok(it.voices.find(x=>x.form==="sentence").text.split(/\s+/).length>=4);
 assert.ok(it.voices.find(x=>x.form==="word").text.split(/\s+/).length<=2);
 assert.equal(new Set(it.voices.map(v=>v.text)).size,it.voices.length);
 const off=makePlan({seed:"VOX-SILENCE",style:"medieval",duration:92,withVox:false});
 assert.equal(off.voices.length,0);
});
test("arrangement gaps become physically quiet PCM with finite output",()=>{
 const p=makePlan({seed:"TECHNO-CUT",style:"techno",duration:26,withVox:false});
 assert.ok(p.breaks.length>0,"missing stop/go");
 const audio=renderPCM(p);
 assert.equal(audio.channels.length,2);
 for(const ch of audio.channels){
  assert.ok(ch.every(Number.isFinite),"non-finite sample");
  let signal=0;
  for(let i=0;i<ch.length;i+=73)signal+=Math.abs(ch[i]);
  assert.ok(signal>1,"no rendered music");
  const br=p.breaks[0],start=Math.max(0,Math.floor((br.start+.035)*audio.sampleRate));
  const end=Math.min(ch.length,Math.floor((br.end-.035)*audio.sampleRate));
  if(end>start){
   let max=0;for(let i=start;i<end;i++)max=Math.max(max,Math.abs(ch[i]));
   assert.ok(max<.001,"break not silent: "+max);
  }
 }
});
