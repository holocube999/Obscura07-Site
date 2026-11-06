import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {makePlan,renderPCM} from "../radio.js";
import {createSongLink,shareTargets} from "../share.js";
import {renderVocalBus} from "../voice-render.js";
import {mount} from "../widget.js";
const RECIPE="R1.xuoa5r-u6wejo.i.7.a.1.1.30.1b.ef.1";
test("47-second uploaded hip-hop recipe has multiple consecutive silent-vocal bars and stops",()=>{
 const p=makePlan({seed:RECIPE});
 assert.equal(p.style,"hiphop");assert.equal(p.duration,47);
 const instrumental=p.sections.filter(s=>s.name==="instrumental");
 assert.ok(instrumental.length>=2);
 assert.ok(instrumental.some((s,i)=>i>0&&s.bar===instrumental[i-1].bar+1));
 const spoken=new Set(p.voices.map(v=>v.bar));
 assert.ok(instrumental.every(s=>!spoken.has(s.bar)));
 assert.ok(p.breaks.some(b=>b.kind==="pre-drop"));
 assert.ok(p.sections.some(s=>s.accent));
});
test("pre-drop break is physically silent, and mid interlude has no vocal samples",()=>{
 const p=makePlan({seed:RECIPE});
 const audio=renderPCM(p,16000),br=p.breaks.find(b=>b.kind==="pre-drop");
 const from=Math.ceil((br.start+.035)*audio.sampleRate),to=Math.floor((br.end-.035)*audio.sampleRate);
 for(const channel of audio.channels){
  let max=0;for(let i=from;i<to;i++)max=Math.max(max,Math.abs(channel[i]));
  assert.ok(max<.001,"stop "+max);
 }
 const first=p.sections.find(s=>s.name==="instrumental"&&p.sections.some(v=>v.name==="instrumental"&&v.bar===s.bar+1));
 const voice=renderVocalBus(p,{sampleRate:8000});
 const start=Math.ceil((first.start+1.1)*8000),end=Math.floor((first.end-.2)*8000);
 let energy=0;for(let i=start;i<end;i++)energy+=Math.abs(voice.channels[0][i]);
 assert.ok(energy<.5,"interlude not vocal-free "+energy);
});
test("lyric variants are reproducible and do not change the instrumental",()=>{
 const a=makePlan({seed:RECIPE,lyricsVariant:1}),b=makePlan({seed:RECIPE,lyricsVariant:2});
 assert.deepEqual(a.events,b.events);assert.deepEqual(a.sections,b.sections);
 assert.notDeepEqual(a.voices.map(x=>x.text),b.voices.map(x=>x.text));
});
test("replay link preserves Unicode verses and social targets",()=>{
 const p=makePlan({seed:RECIPE}),lyric="La notte va a tempo\nLa città respira";
 const link=createSongLink("https://example.com/radio/index.html#old",p,{lyricsVariant:3,lyrics:lyric}),url=new URL(link);
 assert.equal(url.searchParams.get("seed"),p.seed);
 assert.equal(url.searchParams.get("lv"),"3");
 assert.equal(url.searchParams.get("lyrics"),lyric);
 assert.equal(url.hash,"");
 const targets=shareTargets(link,p.title);
 assert.ok(targets.whatsapp.includes("whatsapp.com"));
 assert.ok(targets.telegram.includes("t.me"));
 assert.ok(targets.email.startsWith("mailto:"));
 const ui=fs.readFileSync(new URL("../widget.js",import.meta.url),"utf8");
 assert.match(ui,/rnr-share-whatsapp/);
 assert.match(ui,/navigator\.share/);
 assert.match(ui,/rnr-generate-lyrics/);
 const sw=fs.readFileSync(new URL("../sw.js",import.meta.url),"utf8");
 assert.match(sw,/isCode/);
});

test("widget module parses and exposes the mounted browser API",()=>{
 assert.equal(typeof mount,"function");
});
