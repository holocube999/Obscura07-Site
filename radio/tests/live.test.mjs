import test from "node:test";
import assert from "node:assert/strict";
import {tunePitch,voiceCharacter} from "../live-voice.js";
import {coverRecipe} from "../cover-art.js";
import {spliceTrack,haltTrack} from "../transition.js";
const plan={seed:"R1.seed",title:"Night Station",artist:"Null Bureau",tuning:"19-EDO"};
test("voice identities and art are reproducible",()=>{
 const v={voice:{base:160,rate:1},language:"it"};
 assert.deepEqual(voiceCharacter(plan,v,0),voiceCharacter(plan,v,0));
 assert.deepEqual(coverRecipe(plan),coverRecipe(plan));
 assert.notDeepEqual(coverRecipe({...plan,seed:"other"}),coverRecipe(plan));
});
test("pitch snaps toward the specified EDO grid",()=>{
 const p=tunePitch(1.18,"19-EDO",1);
 const scaled=19*Math.log2(p);
 assert.ok(Math.abs(scaled-Math.round(scaled))<1e-8);
});
test("crossfade starts replacement before old source is stopped",()=>{
 const calls=[];
 const context={currentTime:10,createBufferSource:()=>({
   connect(){},start(t){calls.push(["start",t]);},stop(t){calls.push(["stop",t]);},disconnect(){}
 }),createGain:()=>({gain:{value:1,setValueAtTime(v,t){calls.push(["set",v,t]);},linearRampToValueAtTime(v,t){calls.push(["ramp",v,t]);},cancelScheduledValues(){}},connect(){},disconnect(){}})};
 const a=spliceTrack(context,{}, {},null);
 const b=spliceTrack(context,{}, {},a,1.5);
 assert.equal(b.source.loop,true);
 assert.deepEqual(calls.filter(x=>x[0]==="start").map(x=>x[1]),[10,10]);
 assert.ok(calls.find(x=>x[0]==="stop"&&x[1]>11.4));
 haltTrack(b);
});
