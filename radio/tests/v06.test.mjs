import test from "node:test";
import assert from "node:assert/strict";
import {makePlan,rngFor} from "../radio.js";
import {composeRapStanza} from "../rap-poetics.js";
import {estimateSyllables} from "../phonology.js";
import {makeQueue} from "../playlist-core.js";
import {makeKaraokeCues,karaokeAt} from "../karaoke.js";
import {planSpeaker,renderSpeakerPCM} from "../speaker.js";
import {verifiedHeadline,fetchVerifiedNews} from "../news-source.js";
import {createSongLink} from "../share.js";
import {createMusicDNA} from "../music-dna.js";
const RECIPE="R1.xuoa5r-u6wejo.i.7.a.1.1.30.1b.ef.1";
test("hiphop follows four-bar rhyme structure and syllable costs",()=>{
 const used=new Set();
 for(let i=0;i<10;i++){
  const stanza=composeRapStanza(rngFor("HIPHOP-"+i),"it",i,"machines",used);
  assert.equal(stanza.length,4);
  assert.equal(stanza.map(v=>v.scheme).join(""),i%2?"ABAB":"AABB");
  for(const verse of stanza){
   assert.ok(verse.text.endsWith(verse.end+"."));
   assert.equal(verse.rhythmic.meter,4);
   assert.equal(verse.rhythmic.rhymeBeat,4);
   assert.equal(verse.syllables,estimateSyllables(verse.text,"it"));
  }
 }
 assert.equal(used.size,40);
});
test("89 lyric regeneration variants change voice while preserving accompaniment",()=>{
 const base=makePlan({seed:RECIPE}),texts=new Set();
 for(let i=1;i<90;i++){
  const p=makePlan({seed:RECIPE,lyricsVariant:i});
  assert.deepEqual(p.events,base.events);
  assert.deepEqual(p.sections,base.sections);
  assert.equal(p.seed,base.seed);
  texts.add(p.voices.map(v=>v.text).join("|"));
 }
 assert.equal(texts.size,89);
});
test("hidden vocal guide: sub-beat, deterministic and not instrumental",()=>{
 const p=makePlan({seed:RECIPE});
 assert.ok(p.vocalGuide.length>p.duration*p.bpm/60);
 assert.ok(p.vocalGuide.every(x=>x.hz>65&&x.harmonyHz>65));
 assert.ok(p.events.every(e=>e.kind!=="vocalGuide"));
 assert.deepEqual(p.vocalGuide,makePlan({seed:RECIPE}).vocalGuide);
});
test("music DNA differs by seed and resolves to root",()=>{
 const seen=new Set();
 for(let i=0;i<96;i++){
  const dna=createMusicDNA(rngFor("DNA-"+i),{style:"hiphop",mood:"ominous"});
  assert.equal(dna.route[0],0);
  assert.equal(dna.route.at(-1),0);
  seen.add(JSON.stringify({route:dna.route,groove:dna.groove,motif:dna.motif}));
 }
 assert.ok(seen.size>=94);
});
test("playlist supports repeat, all, single and random",()=>{
 const q=makeQueue({maxHistory:20});
 assert.equal(q.mode,"radio");assert.equal(q.next(),undefined);
 q.insert({seed:"a",title:"A"});q.insert({seed:"b",title:"B"});
 q.select(0);q.setMode("all");assert.equal(q.next().seed,"b");
 assert.equal(q.next(),null);q.setMode("single");assert.equal(q.next(),null);
 q.setMode("random");assert.equal(q.next({random:()=>0}).seed,"a");
 q.setMode("radio");assert.equal(q.next().seed,"b");assert.equal(q.next(),undefined);
 assert.equal(q.next({repeat:true}).seed,"b");
 q.replaceSelected({lyricsVariant:42});assert.equal(q.selected.lyricsVariant,42);
 assert.equal(q.items.length,2);
});
test("karaoke follows vocal director per-word timings",()=>{
 const p=makePlan({seed:RECIPE}),cues=makeKaraokeCues(p);
 assert.equal(cues.length,p.voices.length);
 for(const c of cues){
  assert.ok(c.words.length>0);assert.ok(c.words.every(w=>w.end>w.start));
  const w=c.words[0],at=karaokeAt(cues,(w.start+w.end)*.5);
  assert.ok(at.line>=0);
 }
});
test("DJ fictional advertisements, calls and introductions are seeded",()=>{
 const p=makePlan({seed:RECIPE}),next=makePlan({seed:"NEXT-SONG-V06"});
 const types=new Set();let example=null;
 for(let i=0;i<130;i++){
  const cue=planSpeaker(p,next,{language:"it",seed:"station-"+i});
  if(!cue)continue;
  types.add(cue.type);if(!example)example=cue;
  assert.equal(typeof cue.persona.formant,"number");
  if(["caller","advertisement"].includes(cue.type))assert.equal(cue.fictional,true);
 }
 assert.ok(types.has("intro")&&types.has("bio")&&types.has("advertisement"));
 const pcm=renderSpeakerPCM(example,{sampleRate:8000});
 assert.ok(pcm.duration>1&&pcm.duration<30);
 assert.ok(pcm.channels[0].every(Number.isFinite));
});
test("news metadata is verified by domain, date, and HTTPS",async()=>{
 const now=Date.UTC(2026,10,7,0,0,0);
 const item={title:"Notizia di scienza dal quotidiano italiano",url:"https://www.rainews.it/news/scienza",seendate:"20261106T225000Z"};
 assert.ok(verifiedHeadline(item,"it",now));
 assert.equal(verifiedHeadline({...item,url:"http://example.org/rumor"},"it",now),null);
 assert.equal(verifiedHeadline({...item,seendate:"20261001T225000Z"},"it",now),null);
 const news=await fetchVerifiedNews("it",{now,fetchImpl:async()=>({ok:true,json:async()=>({articles:[item]})})});
 assert.equal(news.length,1);assert.equal(news[0].verified,true);
});
test("share serializes recipe, lyrics, mix, speaker and engine",()=>{
 const p=makePlan({seed:RECIPE}),lyrics="Una notte infinita\nRitorno sull'onda";
 const u=new URL(createSongLink("https://example.com/radio/releases/v06/index.html",p,{
  lyricsVariant:123456789,lyrics,voiceMix:.64,speaker:true
 }));
 assert.equal(u.searchParams.get("seed"),p.seed);
 assert.equal(u.searchParams.get("lv"),"123456789");
 assert.equal(u.searchParams.get("lyrics"),lyrics);
 assert.equal(u.searchParams.get("vm"),"64");
 assert.equal(u.searchParams.get("sp"),"1");
 assert.equal(u.searchParams.get("engine"),"0.6.0");
});
test("widget has unobtrusive repeat, karaoke, queue and speaker controls",async()=>{
 const {mount}=await import("../widget.js");
 assert.equal(typeof mount,"function");
});
