/* RNR/MusicDNA 0.6: deterministic coherent harmonic architecture.
   A tonal route, groove signature and variation schedule per song. */
export function createMusicDNA(rng,{style="dreamwave",mood="liminal",intensity=.5}={}){
 const count=8,route=[0];
 const moves=[-3,-2,-1,1,2,3,4];
 const dark=["ominous","melancholic","nocturnal","alien"].includes(mood);
 const active=["hiphop","techno","metal","punk","pulse","chiptune"].includes(style);
 const state=()=>Math.floor(rng()*5);
 const motif=Array.from({length:16},(_,i)=>{
  const position=(i%4===0?0:i%4===2?2:state());
  return Math.max(0,Math.min(7,position+(dark?-1:0)));
 });
 for(let i=1;i<count-1;i++){
  const old=route.at(-1),m=moves[Math.floor(rng()*moves.length)];
  let degree=(old+m+7)%7;
  if(i===count-2)degree=[3,4,5][Math.floor(rng()*3)];
  route.push(degree);
 }
 route.push(0);
 return {
  route,motif,
  groove:active?Math.floor(rng()*6):Math.floor(rng()*3),
  swing:active?.025+rng()*.09:0,
  hiHatSpace:.15+rng()*.31,
  bassMove:Math.floor(rng()*3),
  counterRhythm:Math.floor(rng()*5),
  densityCurve:[.65+rng()*.22,.75+rng()*.25,.8+rng()*.2,1+.12*rng()],
  beatEmphasis:.95+.15*intensity+.10*rng()
 };
}
export function tensionAtBar(bar,phaseCount=16){
 const phase=bar%phaseCount;
 if(phase<2)return .62;
 if(phase>=phaseCount-3)return 1.09;
 if(phase===5||phase===6)return .70;
 if(phase===7||phase===8)return 1.12;
 return .92+.07*Math.sin(phase*Math.PI/4);
}
