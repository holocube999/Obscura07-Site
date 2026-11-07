import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {makePlan,randomSeed,VERSION} from "../radio.js";
import {reinforceMotifs} from "../composition-coherence.js";
import {createStationDirector} from "../station-director.js";
import {planSpeaker,renderSpeakerPCM} from "../speaker.js";
import {verifiedHeadline,fetchVerifiedNews} from "../news-source.js";
import {makeQueue} from "../playlist-core.js";

test("repeated microtonal motifs use only notes already present in each section",()=>{
 const sections=[
  {name:"hook",start:0,end:4},{name:"verse",start:4,end:8},
  {name:"hook",start:8,end:12}];
 const b=(time,hz)=>({time,length:.5,kind:"bass",freq:hz,amp:.2});
 const n=(time,hz)=>({time,length:.2,kind:"lead",freq:hz,amp:.1});
 const events=[b(0,100),n(.2,100),n(1.2,125),n(2.2,150),
  b(4,110),n(4.2,120),n(5.2,143),n(6.2,167),
  b(8,120),n(8.2,120),n(9.2,144),n(10.2,180)];
 const before=events.slice(8).map(e=>e.freq);
 const result=reinforceMotifs({events,sections,breaks:[]});
 assert.equal(result.events.length,events.length);
 assert.deepEqual(result.events.map(e=>e.time),events.map(e=>e.time));
 const inHook=result.events.filter(e=>e.kind==="lead"&&e.time>=8);
 assert.ok(inHook.every(e=>[120,144,180].includes(e.freq)));
 assert.ok(inHook.length===3);
 assert.deepEqual(reinforceMotifs(result),result);
 assert.ok(before.every(Number.isFinite));
});

test("128-bit fresh seeds and replayable structured scores",()=>{
 assert.equal(VERSION,"0.7.0");
 const keys=new Set(Array.from({length:200},()=>randomSeed()));
 assert.equal(keys.size,200);
 for(const key of keys)assert.equal(key.split("-").length,4);
 for(const style of ["techno","hiphop","metal","darkambient","chiptune"]){
  const p=makePlan({seed:"STATION-CONTINUITY-"+style,style,duration:28});
  assert.deepEqual(makePlan({seed:p.seed}),p);
  assert.ok(p.events.every(e=>e.time>=0&&e.time<p.duration&&e.length>0&&e.freq>0));
 }
});

test("DJ remains intermittent, respects cooling-off and is silent when disabled",()=>{
 const director=createStationDirector({seed:"DJ-QA"});
 const entry={seed:"NEXT",artist:"Null Circuit",title:"Ghost Frequency",style:"techno"};
 for(let i=0;i<100;i++)assert.equal(director.next(null,entry,{enabled:false}),null);
 const output=[];
 for(let i=0;i<500;i++){
  const next={...entry,seed:"NEXT-"+i};
  const cue=director.next(null,next,{enabled:true,language:"it"});
  if(cue)output.push({at:i,type:cue.type});
 }
 assert.ok(output.length>12&&output.length<210);
 assert.ok(output.every((c,i)=>i===0||c.at-output[i-1].at>=2));
 assert.ok(new Set(output.map(c=>c.type)).size>=3);
 for(const type of ["advertisement","caller"]){
  const matches=output.filter(c=>c.type===type);
  assert.ok(matches.every((x,i)=>i===0||x.at-matches[i-1].at>=(type==="advertisement"?8:5)));
 }
 assert.equal(director.next(null,entry,{enabled:false,verifiedNews:[]}),null);
});

test("band biographies are seeded and simulated callers switch vocal personas",()=>{
 const next={seed:"VOICE-1",artist:"Nocturnal Archive",title:"Ocean Glass",style:"dreamwave"};
 const one=planSpeaker(null,next,{forcedType:"bio",seed:"air-1",language:"it"});
 const two=planSpeaker(null,next,{forcedType:"bio",seed:"air-1",language:"it"});
 assert.deepEqual(one,two);
 assert.equal(one.type,"bio");assert.equal(one.fictional,true);
 const phone=planSpeaker(null,next,{forcedType:"caller",seed:"air-2",language:"it"});
 assert.equal(phone.segments.length,3);
 assert.notEqual(phone.segments[0].persona.id,phone.segments[1].persona.id);
 assert.equal(phone.fictional,true);
 const pcm=renderSpeakerPCM(phone,{sampleRate:8000});
 assert.ok(pcm.duration>1&&pcm.duration<60);
 assert.ok(pcm.channels.every(ch=>ch.every(Number.isFinite)));
});

test("Italian real-outlet headlines are attributed but not falsely fact checked",async()=>{
 const now=Date.UTC(2026,10,7,10,0);
 const fixtures=[
  {title:"Nuovo esperimento scientifico presentato oggi in Italia",url:"https://www.ansa.it/scienza/test",seendate:"20261107T093000Z"},
  {title:"Un altro esperimento tecnologico presentato oggi",url:"https://www.rainews.it/news/tech",seendate:"20261107T093000Z"},
  {title:"Un nuovo evento culturale nella capitale",url:"https://www.agi.it/cronaca/test",seendate:"20261107T090000Z"}
 ];
 assert.equal(verifiedHeadline(fixtures[0],"it",now).factChecked,false);
 const items=await fetchVerifiedNews("it",{now,fetchImpl:async()=>({ok:true,json:async()=>({articles:fixtures})})});
 assert.equal(items.length,3);
 assert.equal(new Set(items.map(x=>x.source)).size,3);
 const cue=planSpeaker(null,{seed:"A",artist:"Null Signal",title:"The Archive"},
  {forcedType:"news",seed:"N",language:"it",verifiedNews:items});
 assert.ok(items.some(x=>cue.text.includes(x.source)));
 assert.ok(cue.article.url.startsWith("https://"));
 assert.equal(planSpeaker(null,{seed:"A"},{forcedType:"news",verifiedNews:[]}),null);
});

test("bounded 600-track radio history remains playable without audio buffers",()=>{
 const q=makeQueue();
 for(let i=0;i<1000;i++)q.insert({seed:"song-"+i,title:"song "+i});
 assert.equal(q.items.length,600);
 assert.ok(q.items.every(x=>typeof x.seed==="string"&&!Object.hasOwn(x,"audio")));
 assert.equal(q.hasSeed("song-999"),true);
 q.select(10);q.setMode("radio");
 assert.equal(q.next().seed,"song-411");
 const widget=fs.readFileSync(new URL("../widget.js",import.meta.url),"utf8");
 assert.match(widget,/createStationDirector/);
 assert.match(widget,/pendingEntry/);
 assert.match(widget,/rnr-playlist-toggle/);
});
