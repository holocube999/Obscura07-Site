import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {makePlan,STYLES,renderPCM} from "../radio.js";
import {renderVocalBus,mixVocalBus,textPhonemes,quantizePitchHz} from "../voice-render.js";
import {OFFLINE_DICTIONARY,originalSentence,rhymeStanza,fragmentWords,corpusCounts} from "../linguistic-corpus.js";
import {quantizeVoiceTime} from "../lyrics.js";

const rng=(seed=22)=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
test("the original offline grammar yields many distinct, grammatical combinations",()=>{
 const counts=corpusCounts();
 assert.ok(counts.subjects>=45);
 assert.ok(counts.verbs>=40);
 assert.ok(counts.objects>=40);
 assert.ok(counts.questions>=15);
 const random=rng(123);
 const sentences=new Set(Array.from({length:250},()=>originalSentence(random,"it","statement")));
 assert.ok(sentences.size>220,"repetition too frequent");
 assert.ok([...sentences].every(s=>s.endsWith(".")&&s.split(" ").length>=6));
 for(const kind of ["question","marzullo"]){
  assert.ok(Array.from({length:18},()=>originalSentence(random,"it",kind)).
    every(s=>s.endsWith("?")),"question form "+kind);
 }
 assert.ok(fragmentWords("123 <script>alert(1)</script> TRENI? satelliti!").length<=5);
 assert.equal(fragmentWords("  ").length,0);
 assert.ok(!JSON.stringify(OFFLINE_DICTIONARY).includes("ansa.it"));
});

test("hip-hop is the nineteenth musical genre and keeps legacy style IDs stable",()=>{
 assert.equal(STYLES.length,19);
 assert.equal(STYLES[0],"xenodrone");
 assert.equal(STYLES[17],"glitch");
 assert.equal(STYLES[18],"hiphop");
 const plan=makePlan({seed:"HIPHOP-RAP-ONE",style:"hiphop",duration:25,language:"it"});
 assert.equal(plan.withVox,true);
 assert.equal(plan.style,"hiphop");
 assert.deepEqual(makePlan({seed:plan.seed}),plan);
 assert.ok(plan.events.filter(x=>x.kind==="kick").length>8);
 assert.ok(plan.events.filter(x=>x.kind==="snare").length>5);
 assert.ok(plan.events.some(x=>x.kind==="chipbass"));
 assert.ok(plan.events.some(x=>x.kind==="hat"));
 assert.ok(plan.sections.every(x=>x.meter===4&&x.bpm===plan.bpm));
 const bar=4*60/plan.bpm;
 for(const entry of plan.voices){
  assert.equal(entry.delivery,"hiphop");
  assert.ok(Math.abs(entry.time/bar-Math.round(entry.time/bar))<.002);
  assert.ok(Math.abs(entry.rhymeTime-entry.time-3*60/plan.bpm)<.002);
  assert.ok(entry.barEnd<=plan.duration);
  assert.ok(entry.text.toLowerCase().replace(/[.!?]+$/,"").endsWith(entry.rhymeWord.toLowerCase()));
 }
 assert.equal(new Set(plan.voices.map(x=>x.text)).size,plan.voices.length);
});

test("four-bar AABB/ABAB stanzas close distinct rhymes on measure boundaries",()=>{
 const a=rhymeStanza(rng(3),"it",0);
 const b=rhymeStanza(rng(3),"it",1);
 assert.equal(a.length,4);
 assert.equal(a.map(x=>x.scheme).join(""),"AABB");
 assert.equal(b.map(x=>x.scheme).join(""),"ABAB");
 assert.equal(a[0].family,a[1].family);
 assert.equal(a[2].family,a[3].family);
 assert.notEqual(a[0].family,a[2].family);
 assert.equal(new Set(a.map(x=>x.rhymeWord)).size,4);
 for(const stanza of [a,b])for(const line of stanza)
  assert.ok(line.text.endsWith(line.end+"."));
});

test("all spoken onsets quantize to actual per-section BPM and skip breaks",()=>{
 const sections=[{start:0,end:4,bpm:120,meter:4},{start:4,end:10,bpm:90,meter:4}];
 const breaks=[{start:2,end:2.3}];
 const a=quantizeVoiceTime(1.23,sections,breaks,10,"slogan",120);
 assert.ok(Math.abs(a/0.5-Math.round(a/0.5))<.002);
 const b=quantizeVoiceTime(5.3,sections,breaks,10,"word",120);
 assert.ok(Math.abs((b-4)/(60/90/2)-Math.round((b-4)/(60/90/2)))<.004);
 assert.ok(a<2||a>=2.3);
});

test("text becomes preregistered finite stereo audio with no native browser TTS",()=>{
 const plan=makePlan({seed:"LIVE-OFFLINE-VOCAL",style:"hiphop",duration:16,language:"it"});
 assert.ok(textPhonemes("La notte interroga l'universo!").length>10);
 assert.ok(quantizePitchHz(160,"19-EDO")>0);
 const vocal=renderVocalBus(plan,{sampleRate:8000});
 assert.equal(vocal.engine,"offline-formant-dsp");
 assert.equal(vocal.preRendered,true);
 assert.equal(vocal.channels.length,2);
 assert.equal(vocal.channels[0].length,128000);
 let energy=0;
 for(let i=0;i<vocal.channels[0].length;i+=13){
  const v=vocal.channels[0][i];
  assert.ok(Number.isFinite(v));
  energy+=Math.abs(v);
 }
 assert.ok(energy>10,"voice must contain actual samples");
 const again=renderVocalBus(plan,{sampleRate:8000});
 assert.deepEqual(vocal.channels[0],again.channels[0],"seed reproducibility");
 const instrumental=renderPCM(plan,8000);
 const merged=mixVocalBus(instrumental,vocal,.20);
 assert.notDeepEqual(merged.channels[0],instrumental.channels[0]);
 assert.deepEqual(mixVocalBus(instrumental,vocal,0).channels[0],
  instrumental.channels[0]);
 const legacy=fs.readFileSync(new URL("../widget.js",import.meta.url),"utf8");
 assert.doesNotMatch(legacy,/speechSynthesis|SpeechSynthesisUtterance|createLiveVoice/);
 assert.ok(legacy.includes("setVoiceMix"));
 assert.ok(legacy.includes("voiceGain"));
 assert.ok(legacy.includes("rnr-cover-dialog"));
});

test("voice can be disabled without breaking offline playback",()=>{
 const plan=makePlan({seed:"NO-VOICE-HIP",style:"hiphop",duration:16,withVox:false});
 assert.equal(plan.voices.length,0);
 assert.equal(renderVocalBus(plan,{sampleRate:8000}),null);
});

test("page-level embedded cover is not clipped by the radio iframe",()=>{
 const page=fs.readFileSync(new URL("../../index.html",import.meta.url),"utf8");
 const embed=fs.readFileSync(new URL("../embed.js",import.meta.url),"utf8");
 const host=fs.readFileSync(new URL("../site-dock.js",import.meta.url),"utf8");
 assert.match(page,/siteRadioFrame/);
 assert.match(embed,/onCoverOpen/);
 assert.match(host,/randomnullradio:cover/);
 assert.match(host,/radioCoverModal/);
});
