import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import {makePlan,renderPCM,pcmToMP3,pcmToWav,LANGUAGE_PACKS,STYLES} from "../radio.js";

test("the seed recipe reproduces style, metadata, voices and events",()=>{
 for(const opts of [
  {seed:"NG-RADIO",duration:16,withVox:true,language:"it",style:"dreamwave",mood:"nostalgic",concept:"ocean"},
  {seed:"SECOND",duration:16,withVox:false,style:"xenodrone"},
  {seed:"NO-OPTIONS"},
 ]){
  const p=makePlan(opts);
  assert.deepEqual(makePlan({seed:p.seed}),p);
  assert.match(p.seed,/^R1\./);
  assert.ok(p.title&&p.artist);
 }
});

test("different seeds yield different arrangements",()=>{
 assert.notDeepEqual(makePlan({seed:"AAA"}),makePlan({seed:"BBB"}));
 assert.equal(Object.keys(LANGUAGE_PACKS).length,18);
 assert.equal(STYLES.length,9);
});

test("PCM signal is finite, nonempty and bitwise deterministic",()=>{
 const p=makePlan({seed:"REPLAY-PCM",duration:16,style:"guitar",withVox:true});
 const a=renderPCM(p),b=renderPCM(makePlan({seed:p.seed}));
 assert.equal(a.sampleRate,22050);
 assert.equal(a.channels[0].length,352800);
 assert.deepEqual(a.channels[0],b.channels[0]);
 assert.deepEqual(a.channels[1],b.channels[1]);
 let energy=0;
 for(let i=0;i<a.channels[0].length;i++){
  const x=a.channels[0][i],y=a.channels[1][i];
  assert.ok(Number.isFinite(x)&&Number.isFinite(y));
  energy+=x*x+y*y;
 }
 assert.ok(energy>1);
 const wav=pcmToWav(a);
 assert.equal(wav.size,44+a.channels[0].length*4);
});

test("bundled MP3 encoder generates an ID3v2.4-tagged MPEG stream",async()=>{
 const script=fs.readFileSync(new URL("../vendor/lame.min.js",import.meta.url),"utf8");
 vm.runInThisContext(script,{filename:"lame.min.js"});
 assert.ok(globalThis.lamejs?.Mp3Encoder);
 const p=makePlan({seed:"ENCODER",duration:16,style:"pulse"});
 const mp3=pcmToMP3(renderPCM(p));
 assert.ok(mp3.size>16000);
 const bytes=new Uint8Array(await mp3.arrayBuffer());
 assert.equal(String.fromCharCode(...bytes.slice(0,3)),"ID3");
 assert.equal(bytes[3],4);
 const tagSize=((bytes[6]&127)<<21)|((bytes[7]&127)<<14)|((bytes[8]&127)<<7)|(bytes[9]&127);
 const mpegPos=10+tagSize;
 assert.equal(bytes[mpegPos],0xff);
 assert.equal(bytes[mpegPos+1]&0xe0,0xe0);
});
