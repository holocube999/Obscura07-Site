import test from "node:test";
import assert from "node:assert/strict";
import {createVoicePersona,personaSignature} from "../voice-genome.js";
import {synthesizeWord} from "../articulatory-dsp.js";
import {makePlan} from "../radio.js";
import {renderVocalBus} from "../voice-render.js";
import {planSpeaker,renderSpeakerPCM} from "../speaker.js";
test("seeded voice casting creates broad distinct identities without remote models",()=>{
 const signatures=new Set(),archetypes=new Set();
 for(let i=0;i<320;i++){
  const p=createVoicePersona("SINGER-"+i,{role:"singer",style:"hiphop"});
  signatures.add(personaSignature(p));archetypes.add(p.id);
  assert.deepEqual(p,createVoicePersona("SINGER-"+i,{role:"singer",style:"hiphop"}));
  for(const key of ["base","formant","nasality","rasp","jitter","shimmer","spectralTilt","attack"])
   assert.ok(Number.isFinite(p[key]),"invalid "+key);
 }
 assert.ok(signatures.size>=310,"too few timbre combinations");
 assert.ok(archetypes.size>=19,"too few archetypes");
});
test("one stable host and a different voice for each guest",()=>{
 const previous={seed:"OLD"},next={seed:"NEW",title:"Dark Stars",artist:"Null Hex",style:"hiphop"};
 let example=null;
 for(let i=0;i<300;i++){
  const cue=planSpeaker(previous,next,{language:"it",seed:"DJ-"+i});
  if(cue?.type==="caller"){example=cue;break;}
 }
 assert.ok(example);
 assert.ok(example.persona.formant>.8);
 const pcm=renderSpeakerPCM(example,{sampleRate:8000});
 assert.ok(pcm.duration>0);
 assert.ok(pcm.channels[0].every(Number.isFinite));
});
test("DSP voice genomes change timbre without changing syllable timing",()=>{
 const a=createVoicePersona("A"),b=createVoicePersona("B");
 const opts={sampleRate:8000,targetSamples:3400,language:"it",pitch:140};
 const r=()=>.5;
 const one=synthesizeWord("frequenza",{...opts,formantShift:a.formant,
  spectralTilt:a.spectralTilt,nasality:a.nasality,rasp:a.rasp,jitter:a.jitter,
  shimmer:a.shimmer,attack:a.attack},r);
 const two=synthesizeWord("frequenza",{...opts,formantShift:b.formant,
  spectralTilt:b.spectralTilt,nasality:b.nasality,rasp:b.rasp,jitter:b.jitter,
  shimmer:b.shimmer,attack:b.attack},r);
 assert.equal(one.length,3400);
 assert.equal(two.length,3400);
 assert.ok(one.every(Number.isFinite)&&two.every(Number.isFinite));
 assert.notDeepEqual(one,two);
});
test("singer persona is deterministic across repeated rendering",()=>{
 const plan=makePlan({seed:"VOICECAST-V1",style:"hiphop",duration:16,withVox:true});
 const a=renderVocalBus(plan,{sampleRate:8000}),b=renderVocalBus(plan,{sampleRate:8000});
 assert.equal(a.personaId,b.personaId);
 assert.deepEqual(a.identity,b.identity);
 assert.deepEqual(a.channels[0],b.channels[0]);
});
