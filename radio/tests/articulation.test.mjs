import test from "node:test";
import assert from "node:assert/strict";
import {analyzeWord,estimateSyllables,phonemesFromText} from "../phonology.js";
import {synthesizeWord} from "../articulatory-dsp.js";
const r=()=>.5;
test("Italian graphemes, affricates, vowel stress and geminates are explicit",()=>{
 const words=[["ciao",["ch","a","o"]],["gatto",["g","a","t","t","o"]],
  ["schema",["s","k","e","m","a"]],["scena",["sh","e","n","a"]],
  ["gnomo",["ny","o","m","o"]],["chiaro",["k","i","a","r","o"]]];
 for(const [word,expect] of words)
  assert.deepEqual(analyzeWord(word,"it").phones.map(p=>p.sym),expect,word);
 const a=analyzeWord("città","it");
 assert.equal(a.phones[a.stressedIndex].sym,"a");
 assert.ok(analyzeWord("gatto").phones.some(x=>x.geminate));
 assert.ok(estimateSyllables("Il motore parla chiaro","it")>=8);
 assert.ok(phonemesFromText("La notte canta!", "it").length>8);
});
test("source-filter speech obeys slot length and remains finite for multiple languages",()=>{
 for(const [word,lang] of [["trasmissione","it"],["night","en"],["segnale","it"],["sciame","it"]]){
  const a=synthesizeWord(word,{sampleRate:8000,targetSamples:4200,pitch:135,
    guideHz:175,tuneStrength:.5,language:lang,formantShift:1},r);
  assert.equal(a.length,4200);
  assert.ok(a.every(Number.isFinite));
  assert.ok(a.some(x=>Math.abs(x)>.00002),word+" silent");
  assert.ok(Math.max(...a.map(Math.abs))<1);
  assert.ok(Math.abs(a[0])<1e-8&&Math.abs(a.at(-1))<1e-8);
 }
});
test("stress changes phonological durations but not note pitch/formants",()=>{
 const phones=analyzeWord("antenna","it").phones;
 assert.equal(phones.filter(p=>p.stressed).length,1);
 assert.ok(phones.find(p=>p.stressed).weight>phones.find(p=>p.kind==="stop").weight);
 const base=synthesizeWord("antenna",{sampleRate:8000,targetSamples:3200,pitch:130,language:"it"},r);
 const tuned=synthesizeWord("antenna",{sampleRate:8000,targetSamples:3200,pitch:130,guideHz:180,
  tuneStrength:1,language:"it"},r);
 assert.notDeepEqual(base,tuned);
});
