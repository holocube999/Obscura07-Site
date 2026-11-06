/* RNR generative arranger v2: seeded sections, polymeter, break/drop, melodic motifs.
 * Uses the existing microtonal pitch mapping and emits ordinary renderPCM events.
 * This file deliberately has no external dependencies or samples. */
export const EXTRA_STYLES=["chiptune","harpsichord","medieval","meditation","hangdrum","metal","techno","punk","glitch","hiphop"];
const profiles={
 xenodrone:{lead:"choir",harmony:"drone",bass:"bass",drums:0,density:.25,triplets:.20},
 vaporwave:{lead:"bell",harmony:"pad",bass:"bass",drums:.4,density:.38,triplets:.28},
 dreamwave:{lead:"flute",harmony:"pad",bass:"bass",drums:.12,density:.38,triplets:.33},
 synthwave:{lead:"lead",harmony:"pad",bass:"bass",drums:1,density:.6,triplets:.25},
 guitar:{lead:"guitar",harmony:"guitar",bass:"bass",drums:.42,density:.62,triplets:.27},
 ritual:{lead:"flute",harmony:"drone",bass:"bass",drums:.86,density:.47,triplets:.50},
 biosphere:{lead:"handpan",harmony:"pad",bass:"bass",drums:.08,density:.31,triplets:.46},
 darkambient:{lead:"choir",harmony:"drone",bass:"bass",drums:.07,density:.22,triplets:.18},
 pulse:{lead:"acid",harmony:"pad",bass:"bass",drums:.98,density:.69,triplets:.35},
 chiptune:{lead:"chip",harmony:"chip",bass:"chipbass",drums:.92,density:.87,triplets:.39},
 harpsichord:{lead:"harpsichord",harmony:"harpsichord",bass:"lute",drums:.12,density:.78,triplets:.61},
 medieval:{lead:"flute",harmony:"lute",bass:"drone",drums:.36,density:.59,triplets:.52},
 meditation:{lead:"handpan",harmony:"drone",bass:"bass",drums:.0,density:.29,triplets:.36},
 hangdrum:{lead:"handpan",harmony:"handpan",bass:"drone",drums:.09,density:.51,triplets:.64},
 metal:{lead:"metal",harmony:"metal",bass:"bass",drums:1,density:.76,triplets:.35},
 techno:{lead:"acid",harmony:"pad",bass:"chipbass",drums:1,density:.74,triplets:.41},
 punk:{lead:"metal",harmony:"guitar",bass:"bass",drums:1,density:.74,triplets:.31},
 glitch:{lead:"glitch",harmony:"chip",bass:"chipbass",drums:.91,density:.8,triplets:.66},
 hiphop:{lead:"bell",harmony:"pad",bass:"bass",drums:1,density:.55,triplets:.42}
};
const choose=(r,a)=>a[Math.floor(r()*a.length)];
const clip=(x,a,b)=>Math.min(b,Math.max(a,x));
export function arrangeMusic(plan,tuning,root,rngFor,pitch){
 const r=rngFor(plan.seed+"|form-v2");
 const profile=profiles[plan.style]||profiles.xenodrone;
 const events=[],sections=[],breaks=[];
 const oct=tuning.steps||tuning.ratios.length;
 const scale=tuning.mel;
 const pan=()=>+(r()*1.12-.56).toFixed(3);
 const mk=(kind,start,length,degree,volume=.1,panValue=pan())=>{
  if(!Number.isFinite(start)||start<0||start>=plan.duration||length<=0)return;
  const index=((degree%scale.length)+scale.length)%scale.length;
  const n=scale[index]+Math.floor(degree/scale.length)*oct;
  const freq=pitch(tuning,n,root);
  events.push({kind,time:+start.toFixed(4),length:+Math.min(length,plan.duration-start).toFixed(4),freq:+freq.toFixed(5),
   amp:+clip(volume,.001,.8).toFixed(4),pan:panValue,phase:r()*Math.PI*2,noiseSeed:Math.floor(r()*2147483647)});
 };
 const barsize=(meter,tempo)=>meter*60/tempo;
 const progression=[0,3,4,1,5,2,3,0],shape=["intro","verse","build","drop","bridge","breakdown","return","outro"];
 if(plan.style==="hiphop"){
  // A fixed structural score with real instrumental interludes, verse gaps,
  // groove cuts, pre-drop stops and accented returns. No generic density dice.
  const beat=60/plan.bpm,bar=4*beat,n=Math.ceil(plan.duration/bar);
  const chord=[0,3,5,4,2,3,0,4];
  const middleShort=n<11;
  for(let index=0;index<n;index++){
   const start=index*bar,end=Math.min(plan.duration,start+bar);
   let label;
   if(middleShort){
    label=index===0?"intro":index===n-1?"outro":
     index===Math.max(2,n-4)?"instrumental":
     index>=Math.max(3,n-3)?"hook":"verse";
   }else{
    const phase=index%16;
    label=index===0?"intro":index>=n-2?"outro":
     phase===5||phase===6?"instrumental":
     phase===13?"breakdown":
     phase===7||phase===8||phase===14||phase===15?"hook":"verse";
   }
   const vocal=label==="verse"||label==="hook";
   const pickup=label==="hook"&&(index===0||!["hook","verse"].includes(sections.at(-1)?.name));
   sections.push({name:label,start:+start.toFixed(4),end:+end.toFixed(4),
    bpm:plan.bpm,meter:4,triplets:index%4===3,voice:vocal,bar:index,accent:pickup});
   // Stop the entire instrumental 3/4 beat before a hook or when the
   // breakdown hits. RenderPCM applies a short safety fade around each cut.
   const nextShort=middleShort?index+1>=Math.max(3,n-3):
    [7,14,15].includes((index+1)%16);
   if(label==="instrumental"&&nextShort&&index+1<n-1){
    const cutStart=Math.max(start,end-beat*(.65+.12*r()));
    breaks.push({start:+cutStart.toFixed(4),end:+(end-.028).toFixed(4),kind:"pre-drop"});
   }
   if(label==="breakdown"){
    breaks.push({start:+start.toFixed(4),end:+Math.min(end,start+beat*1.1).toFixed(4),kind:"stop"});
   }
   const bass=chord[Math.floor(index/2)%chord.length];
   const level=label==="intro"?.55:label==="outro"?.59:
    label==="breakdown"?.46:label==="instrumental"?.77:
    label==="hook"?1.16:1;
   const attack=pickup?1.42:1;
   mk("bass",start,Math.min(bar*.91,end-start),bass-scale.length,
      (.14+.08*plan.intensity)*level*attack,0);
   mk("pad",start,Math.min(bar*.94,end-start),bass,
      (.049+.02*plan.intensity)*level,-.18);
   mk("pad",start,Math.min(bar*.89,end-start),bass+2,
      (.039+.02*plan.intensity)*level,.28);
   // Insert musical silence at selected internal beats. An instrumental
   // interlude still has rhythmic motion, unlike a full-track dropout.
   for(let k=0;k<4;k++){
    const t=start+k*beat;if(t>=end)break;
    const hold=label==="breakdown"&&k===0;
    const stopBeat=label==="verse"&&index%4===3&&k===3;
    if(hold||stopBeat)continue;
    if(k===0||k===2||pickup||((index+k)%7===0)){
     mk("kick",t,.25,0,(.24+.15*plan.intensity)*level*(k===0?attack:1),0);
    }
    if(k===1||k===3)mk("snare",t,.16,0,
      (.16+.07*plan.intensity)*level*(pickup?1.16:1),0);
    if(k===0||k===2)mk("chipbass",t,beat*.73,bass-scale.length,
      (.075+.04*plan.intensity)*level,-.1);
    // Nonrepetitive swung hi-hats with deliberate gaps and rolls.
    for(let j=0;j<4;j++){
     const shifted=j%2?beat*.055:0,hit=t+j*beat/4+shifted;
     if(hit>=end||r()>(label==="instrumental"?.72:.77))continue;
     mk("hat",hit,.041,0,(.013+.013*plan.intensity)*level,pan());
    }
   }
   const melodic=label==="instrumental"||label==="hook"||index%2===1;
   if(melodic){
    const notes=label==="instrumental"?5:4;
    for(let k=0;k<notes;k++){
     const t=start+k*bar/notes;
     if(t<end)mk("bell",t,beat*.55,bass+((k+index)%3),
       (.026+plan.intensity*.017)*level,pan());
    }
   }
  }
  events.sort((a,b)=>a.time-b.time);
  return {events,sections,breaks};
 }

 let time=0,s=0;
 let motif=Array.from({length:12},(_,i)=>choose(r,[0,1,2,3,4,5,6,7])+((i%6===5)?1:0));
 while(time<plan.duration-.05&&s<48){
  const label=shape[s%shape.length];
  if(s>0&&(s%3===2||(s>3&&r()<.19))){
   const length=Math.min(plan.duration-time,.16+r()*.56);
   if(length>.09){breaks.push({start:+time.toFixed(4),end:+(time+length).toFixed(4)});time+=length;}
  }
  if(time>=plan.duration-.05)break;
  const loose=["glitch","ritual","xenodrone","darkambient"].includes(plan.style);
  const meter=loose?choose(r,[3,4,4,4,5,7]):["medieval","harpsichord"].includes(plan.style)?choose(r,[3,4,4,4]):4;
  const tempo=loose?Math.round(clip(plan.bpm*(.91+r()*.18),35,230)):plan.bpm;
  const beat=60/tempo,bar=barsize(meter,tempo);
  const bars=s===0?1:1+Math.floor(r()*3);
  const end=Math.min(plan.duration,time+bar*bars);
  const density=clip(profile.density*(label==="intro"?.56:label==="breakdown"?.42:label==="drop"?1.25:1)*(0.8+r()*.5),.13,1);
  const triples=r()<profile.triplets || label==="build";
  const section={name:label,start:+time.toFixed(4),end:+end.toFixed(4),bpm:tempo,meter,triplets:triples};
  sections.push(section);
  const harmony=progression[s%progression.length];
  const strong=label!=="breakdown"&&label!=="intro";
  if(s%2===0){
   motif=motif.map((v,i)=>clip(v+(i%3===0?choose(r,[-1,0,0,1]):0),0,7));
  }
  for(let measureStart=time;measureStart<end-.04;measureStart+=bar){
   const measureLength=Math.min(bar,end-measureStart);
   if(label!=="breakdown"||r()<.58){
    const chordCount=["xenodrone","meditation","darkambient"].includes(plan.style)?3:2;
    for(let k=0;k<chordCount;k++){
     const degree=harmony+k*2-(k===0?scale.length:0);
     mk(k===0?profile.bass:profile.harmony,measureStart,Math.min(measureLength*1.03,end-measureStart),
       degree,(k===0?.12:.065)*(1+plan.intensity)*(label==="intro"?.72:1),k===0?0:pan());
    }
   }
   for(let beatIndex=0;beatIndex<meter;beatIndex++){
    const bt=measureStart+beatIndex*beat;
    if(bt>=end)break;
    const empty=label==="breakdown" && beatIndex%3===1;
    const cut=(beatIndex===meter-1 && strong && r()<.17); // stop-and-go groove
    if(empty||cut)continue;
    if(r()<profile.drums*(strong?1:.43)){
     if(beatIndex===0||beatIndex===Math.floor(meter/2)||plan.style==="techno"||plan.style==="metal")mk("kick",bt,.3,0,.24+plan.intensity*.18,0);
     if(beatIndex%2===1||plan.style==="punk")mk(plan.style==="techno"?"clap":"snare",bt,.19,0,.09+plan.intensity*.11,pan());
     const hats=(label==="drop"||plan.style==="metal"||plan.style==="techno")?4:2;
     for(let h=0;h<hats;h++)if(r()<.46+density*.38){
      mk("hat",bt+h*beat/hats,.055,0,.021+plan.intensity*.06,pan());
     }
    }
    const subdivisions=triples&&(beatIndex%2===0||r()<.28)?3:(label==="drop"||r()<density*.55?4:2);
    for(let j=0;j<subdivisions;j++){
     if(r()>density*(label==="breakdown"?.68:1))continue;
     const t=bt+j*beat/subdivisions;
     if(t>=end)continue;
     const idx=(Math.floor((bt-time)/beat)*subdivisions+j)%motif.length;
     const move=label==="build"?j:label==="outro"?-j:0;
     const degree=motif[idx]+harmony+move+(r()<.1?scale.length:0);
     const dur=beat/subdivisions*(profile.lead==="harpsichord"?.84:profile.lead==="handpan"?1.65:.93);
     const vol=(.054+r()*.08)*(1+plan.intensity)*(j===0?1.25:.78);
     mk(profile.lead,t,Math.min(dur,end-t),degree,vol,pan());
    }
    if(beatIndex===meter-1&&label==="build"&&r()<.6){
      // Accelerando-style three-note scale pickup before the next section.
      for(let k=0;k<3;k++)mk(profile.lead,bt+k*beat/3,beat/4,
        harmony+k+3,.085+plan.intensity*.05,pan());
    }
   }
  }
  time=end;
  s++;
 }
 events.sort((a,b)=>a.time-b.time);
 return {events,sections,breaks};
}
