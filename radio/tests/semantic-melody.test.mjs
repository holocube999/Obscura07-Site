import test from "node:test";
import assert from "node:assert/strict";
import {rhymeStanza} from "../linguistic-corpus.js";
import {makePlan} from "../radio.js";
import {rngFor} from "../radio.js";
test("concept-anchored rap has related semantic topics and preserves rhymes",()=>{
 for(const [concept,start] of [["machines","Tra le macchine"],["memory","Nella memoria"],["ocean","Sotto le onde"]]){
  const stanza=rhymeStanza(rngFor("TOPIC-"+concept),"it",0,concept);
  assert.equal(stanza.length,4);
  assert.ok(stanza.some(x=>x.text.startsWith(start)));
  assert.ok(stanza.every(x=>x.text.endsWith(x.end+".")));
  assert.equal(new Set(stanza.map(x=>x.rhymeWord)).size,4);
 }
});
test("vocal melody minimizes leaps and uses only pitched accompaniment",()=>{
 const p=makePlan({seed:"SMOOTH-GUIDE",style:"hiphop",duration:40,language:"it"});
 const g=p.vocalGuide;
 assert.ok(g.length>15);
 const steps=g.slice(1).map((s,i)=>12*Math.abs(Math.log2(s.hz/g[i].hz)));
 assert.ok(steps.filter(x=>x<=7).length>steps.length*.55);
 assert.ok(g.every(x=>x.harmonyHz>0&&x.harmonyHz<=265));
 assert.deepEqual(makePlan({seed:p.seed}),p);
});
