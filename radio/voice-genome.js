/* RNR Voice Genome: deterministic voice casting without training or remote data.
 * Timbre identities are stable inside a piece; performances have independent
 * seeded variations. These are acoustic presets, not recordings of people. */
const C=(x,a,b)=>Math.max(a,Math.min(b,x));
const blueprints=[
 ["warm-low",95,.91,.12,.78,.04,.04,.08,.025,.020, .90],
 ["deep-broadcast",81,.84,-.04,.60,.015,.12,.06,.012,.015,.86],
 ["dry-narrator",124,.98,.01,.80,.025,.03,.02,.007,.010,1.01],
 ["soft-low",112,.96,.08,.72,.11,.10,.035,.005,.012,.80],
 ["open-mid",148,1.04,.13,.83,.045,.02,.01,.010,.018,1.07],
 ["bright-mid",177,1.12,.21,.89,.035,.05,.015,.012,.017,1.10],
 ["velvet-high",215,1.18,.01,.73,.095,.04,.02,.011,.013,.93],
 ["breathy-high",202,1.15,.13,.67,.17,.03,.015,.005,.020,.86],
 ["nasal-talk",163,1.06,.03,.89,.065,.32,.03,.012,.010,1.00],
 ["husky-rough",135,.94,-.12,.85,.085,.08,.16,.045,.038,.91],
 ["raspy-low",104,.90,-.22,.82,.06,.08,.20,.047,.045,.91],
 ["clear-agile",186,1.08,.24,1.13,.045,.045,.015,.015,.019,1.19],
 ["whispered-mid",146,1.02,-.10,.70,.20,.12,.025,.006,.014,.79],
 ["pressed-mid",138,.98,.04,.96,.018,.04,.10,.033,.023,1.10],
 ["thin-electric",181,1.12,.28,1.03,.045,.03,.05,.018,.017,1.13],
 ["rounded-dark",116,.91,-.18,.78,.055,.13,.06,.017,.014,.86],
 ["smooth-tenor",156,1.07,.10,.92,.06,.04,.02,.015,.019,1.07],
 ["velvet-alto",189,1.13,-.06,.80,.11,.10,.03,.012,.016,.91],
 ["fast-rap",151,1.03,.21,1.22,.042,.02,.09,.023,.024,1.18],
 ["laidback-rap",118,.93,-.14,.84,.10,.12,.07,.025,.019,.90],
 ["radio-compressed",141,1.00,.03,1.02,.045,.05,.10,.028,.022,1.12],
 ["delicate-light",208,1.17,.25,.90,.12,.06,.01,.009,.015,.90],
 ["dense-choir",159,1.08,-.01,.77,.085,.20,.04,.017,.013,.88],
 ["grainy-character",128,.95,-.08,1.02,.045,.24,.16,.045,.031,.99]
];
function hash(value){let h=2166136261;for(const c of String(value))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
export function voiceRandom(seed){
 let a=hash(seed);
 return ()=>{a+=0x6d2b79f5;let t=Math.imul(a^(a>>>15),1|a);t^=t+Math.imul(t^(t>>>7),61|t);return ((t^(t>>>14))>>>0)/4294967296;};
}
const emotions=["calm","confident","curious","excited","sarcastic","intimate","grumpy","gentle"];
export function createVoicePersona(seed,{role="singer",style="hiphop",excludeId=""}={}){
 const r=voiceRandom("RNR/VoiceGenome/1/"+seed+"|"+role);
 const pool=blueprints.filter(v=>v[0]!==excludeId);
 const archetype=pool[Math.floor(r()*pool.length)];
 const [id,pitch,formant,tilt,pace,breath,nasal,rasp,jitter,shimmer,energy]=archetype;
 const isRap=style==="hiphop"||style==="rap";
 const scale=role==="caller"?.88:role==="host"?.94:1;
 const mood=emotions[Math.floor(r()*emotions.length)];
 const jitterAmt=r()-.5;
 return {
  id,role,base:C(pitch*(.96+r()*.08),72,260),
  pitch:C(pitch*(.96+r()*.08),72,260),
  formant:C(formant*(.974+r()*.052),.81,1.24),
  spectralTilt:C(tilt+(r()-.5)*.09,-.35,.36),
  rate:C(pace*(.96+r()*.08)*(isRap?1.03:1)*scale,.62,1.35),
  pace:C(pace*(.96+r()*.08)*scale,.60,1.37),
  breath:C(breath+(r()-.5)*.03,.009,.19),
  nasality:C(nasal+(r()-.5)*.055,0,.40),
  rasp:C(rasp+(r()-.5)*.04,0,.23),
  jitter:C(jitter+jitterAmt*.015,0,.075),
  shimmer:C(shimmer+(r()-.5)*.009,0,.065),
  attack:C(energy+(r()-.5)*.10,.67,1.30),
  vibrato:C((isRap?.002:.005)+r()*.004,0,.012),
  inflection:C(.022+r()*.062,.01,.10),
  emotion:mood,mode:id==="radio-compressed"?"radio":"warm",
  stumble:role==="caller"?.015+r()*.10:0
 };
}
export function personaSignature(p){
 return [p.id,p.base,p.formant,p.nasality,p.spectralTilt,p.rasp,p.attack].map((v,i)=>typeof v==="number"?v.toFixed(3):v).join("|");
}
