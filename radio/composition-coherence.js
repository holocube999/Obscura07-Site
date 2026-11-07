/* RNR harmonic continuity v1. Reinforce A/B/A identity without introducing
 * pitches outside the current section's existing microtonal vocabulary.
 * Pure and deterministic: no extra voices, samples or external dependencies. */
const LEADS=new Set(["lead","acid","chip","harpsichord","flute","handpan","bell","guitar","metal","choir","glitch"]);
const TONAL=new Set(["bass","chipbass","drone","pad","lute"]);
function inSection(e,s){return e.time>=s.start&&e.time<s.end;}
function bassAt(events,s){
 const notes=events.filter(e=>inSection(e,s)&&TONAL.has(e.kind)&&e.freq>0);
 return notes.find(e=>e.kind==="bass"||e.kind==="chipbass")?.freq||notes[0]?.freq||null;
}
function closest(freq,pool){
 return pool.reduce((best,n)=>Math.abs(Math.log(n/freq))<Math.abs(Math.log(best/freq))?n:best,pool[0]);
}
export function reinforceMotifs(arranged){
 const {events,sections}=arranged;
 if(!Array.isArray(events)||!Array.isArray(sections)||sections.length<2)return arranged;
 const motifs=new Map();
 const sorted=[...sections].sort((a,b)=>a.start-b.start);
 for(const section of sorted){
  const label=section.name;
  if(!["verse","hook","chorus","drop","riff","theme","return","variation"].includes(label))continue;
  const notes=events.filter(e=>inSection(e,section)&&LEADS.has(e.kind)&&e.freq>0)
   .sort((a,b)=>a.time-b.time||a.freq-b.freq);
  const localBass=bassAt(events,section);
  if(notes.length<3||!localBass)continue;
  const pool=[...new Set(notes.map(n=>n.freq))];
  let reference=motifs.get(label);
  if(!reference&&label==="return")reference=motifs.get("theme")||motifs.get("riff")||motifs.get("hook");
  if(!reference){
   motifs.set(label,{bass:localBass,notes:notes.map(e=>({pos:(e.time-section.start)/Math.max(.001,section.end-section.start),ratio:e.freq/localBass}))});
   continue;
  }
  // Map the phrase to the new harmony by contour, keeping the local scale.
  // Repeated section types retain recognisable melodic movement.
  for(const note of notes){
   const pos=(note.time-section.start)/Math.max(.001,section.end-section.start);
   const motif=reference.notes.reduce((best,m)=>Math.abs(m.pos-pos)<Math.abs(best.pos-pos)?m:best,reference.notes[0]);
   const desired=localBass*motif.ratio;
   note.freq=+closest(desired,pool).toFixed(5);
  }
 }
 return arranged;
}
