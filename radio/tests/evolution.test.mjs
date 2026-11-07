import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {makePlan,renderPCM} from "../radio.js";
import {renderVocalBus} from "../voice-render.js";
import {lyricSheet} from "../lyrics.js";
test("seeded musical forms and harmonic guide for each genre",()=>{
 for(const style of ["hiphop","techno","metal","xenodrone","meditation","chiptune","glitch"]){
  const p=makePlan({seed:"FORM-"+style,style,duration:24});
  assert.deepEqual(makePlan({seed:p.seed}),p);
  assert.ok(["song","loop","loopable","drone","abstract"].includes(p.form));
  assert.ok(p.vocalGuide.length>6,style);
  assert.ok(p.vocalGuide.every(x=>x.time>=0&&x.end<=p.duration&&x.hz>=65&&x.hz<=265));
 }
});
test("every song archetype ends at zero rather than an abrupt PCM truncation",()=>{
 for(const style of ["hiphop","punk","meditation","glitch","dreamwave"]){
  const p=makePlan({seed:"TAIL-"+style,style,duration:16,withVox:false});
  const pcm=renderPCM(p,16000);
  for(const ch of pcm.channels){
   assert.equal(ch.length,256000);
   assert.ok(Math.abs(ch[0])<1e-7);
   assert.ok(Math.abs(ch[ch.length-1])<1e-7);
   assert.ok(ch.every(Number.isFinite));
  }
 }
});
test("rap uses a stable clean identity and a harmonic guide",()=>{
 const p=makePlan({seed:"CLEAR-RAP",style:"hiphop",duration:16,language:"it"});
 const a=renderVocalBus(p,{sampleRate:8000});
 assert.ok(["clean","warm","radio"].includes(a.profile));
 assert.equal(a.guideUsed,true);
 assert.ok(a.identity.base>=100&&a.identity.base<=155);
 assert.deepEqual(a.channels[0],renderVocalBus(p,{sampleRate:8000}).channels[0]);
 assert.ok(Math.abs(a.channels[0].at(-1))<1e-7);
});
test("lyric draft and custom lyrics keep their score timing",()=>{
 const p=makePlan({seed:"WORDS-CAN-FLOW",style:"hiphop",duration:25,language:"it"});
 assert.equal(lyricSheet(p).trim().split(/\n+/).filter(Boolean).length,p.voices.length);
 const custom=makePlan({seed:"WORDS-CAN-FLOW",style:"hiphop",duration:25,language:"it",
  lyricsText:"I segnali entrano nel buio\nLa memoria ascolta il rumore"});
 assert.equal(custom.voices[0].text,"I segnali entrano nel buio");
 assert.equal(custom.voices[1].text,"La memoria ascolta il rumore");
 assert.equal(custom.voices[0].time,p.voices[0].time);
 const widget=fs.readFileSync(new URL("../widget.js",import.meta.url),"utf8");
 assert.match(widget,/rnr-generate-lyrics/);
 assert.match(widget,/lyricSheet/);
});

test("one-shot songs do not loop in the AudioBufferSource graph",()=>{
 const code=fs.readFileSync(new URL("../widget.js",import.meta.url),"utf8");
 const transition=fs.readFileSync(new URL("../transition.js",import.meta.url),"utf8");
 assert.match(code,/continuous=state\.repeat/);
 assert.match(code,/if\(state\.repeat\)/);
 assert.match(transition,/source\.loop=Boolean\(loop\)/);
});
