import test from "node:test";
import assert from "node:assert/strict";
import {planDelivery,guideAt} from "../vocal-director.js";
import {makePlan} from "../radio.js";
import {synthesizeWord} from "../articulatory-dsp.js";

test("conductor places rap end rhyme on fourth beat and avoids collisions",()=>{
 for(const text of ["La notte cambia il valore","Sento una frequenza nascosta nella città",
  "Sotto i neon vedo il motore della rivoluzione"]){
  const p=makePlan({seed:"PERFORMANCE-"+text,style:"hiphop",duration:20,language:"it"});
  const entry={...p.voices[0],text};
  const slots=planDelivery(entry.text,p,entry,8000);
  assert.ok(slots.length>=3);
  const end=slots.at(-1);
  assert.ok(Math.abs(end.start/8000-(entry.rhymeTime-entry.time))<.002);
  assert.ok(slots.every((s,i)=>s.start>=0&&s.length>0&&(i===0||s.start>slots[i-1].start)));
  assert.ok(slots.every((s,i)=>i===slots.length-1||s.start+s.length<=slots[i+1].start));
  assert.ok(slots.every(s=>s.pitches.length===s.syllables));
 }
});
test("non-rap duration follows syllabic complexity, not fixed half-beat slots",()=>{
 const p=makePlan({seed:"CONDUCTOR-SPEECH",style:"dreamwave",duration:30,withVox:true});
 const entry={time:2,text:"La radio attraversa una lunga trasmissione",language:"it"};
 const slots=planDelivery(entry.text,p,entry,8000);
 assert.ok(slots.length>=6);
 assert.ok(slots[2].syllables>slots[0].syllables);
 assert.ok(slots.at(-1).start+slots.at(-1).length<=8*8000);
 assert.ok(guideAt(p.vocalGuide,2)?.hz>0);
});
test("synthesizer tracks explicit syllable melody without changing slot size",()=>{
 const settings={sampleRate:8000,targetSamples:5000,pitch:128,tuneStrength:.95,language:"it"};
 const a=synthesizeWord("memoria",{...settings,melody:[130,160,195]},()=>.6);
 const b=synthesizeWord("memoria",{...settings,melody:[150,140,120]},()=>.6);
 assert.equal(a.length,5000);
 assert.notDeepEqual(a,b);
 assert.ok(a.every(Number.isFinite));
});
