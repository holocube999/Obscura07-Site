/* RNR/ARTICULATORY v1: source-filter speech with stress, coarticulation,
 * nasal/fricative/stop distinctions and bandlimited glottal excitation.
 * Pure JavaScript Float32Array DSP; CPU bounded by phonemes and samples. */
import {analyzeWord} from "./phonology.js";
const TAU=2*Math.PI;
const C=(x,a,b)=>Math.max(a,Math.min(b,x));
const FORM={
 a:[790,1350,2720],e:[515,1850,2590],i:[305,2250,3040],
 o:[530,900,2500],u:[360,835,2300],y:[345,1960,2680],
 m:[290,1000,2070],n:[320,1530,2440],ny:[315,1940,2750],ng:[330,1300,2350],
 l:[420,1400,2610],ly:[350,2010,2800],r:[480,1460,2500],
 w:[360,920,2360],j:[380,1950,2850],
 s:[350,1950,2900],sh:[380,1680,2550],z:[410,1550,2680],
 b:[445,1150,2500],d:[450,1590,2670],g:[450,1330,2540],
 p:[470,1250,2650],t:[445,1630,2750],k:[490,1580,2720],
 ch:[425,1750,2750],ts:[410,1800,2760],th:[400,1660,2760],
 f:[430,1300,2610],v:[450,1380,2590],h:[510,1520,2580]
};
function coeff(hz,q,sr){
 const w=TAU*C(hz,85,sr*.465)/sr,alpha=Math.sin(w)/(2*q),inv=1/(1+alpha);
 return [alpha*inv,-2*Math.cos(w)*inv,(1-alpha)*inv];
}
function bandpass(input,filter,co){
 const y=co[0]*(input-filter.x2)-co[1]*filter.y1-co[2]*filter.y2;
 filter.x2=filter.x1;filter.x1=input;
 filter.y2=filter.y1;filter.y1=y;
 return y;
}
const filter=()=>({x1:0,x2:0,y1:0,y2:0});
function blep(phase,step){
 if(phase<step){const t=phase/step;return t+t-t*t-1;}
 if(phase>1-step){const t=(phase-1)/step;return t*t+t+t+1;}
 return 0;
}
function formants(phone,previous,next,u){
 const base=FORM[phone.sym]||FORM.a;
 // Follow neighbor's tract during the first and last 15% of a segment.
 const left=FORM[previous?.sym]||base,right=FORM[next?.sym]||base;
 if(u<.16){const a=(.16-u)/.16*.35;return base.map((f,j)=>f*(1-a)+left[j]*a);}
 if(u>.84){const a=(u-.84)/.16*.35;return base.map((f,j)=>f*(1-a)+right[j]*a);}
 return base;
}
export function synthesizeWord(text,opts,rng){
 const sr=C(Math.floor(opts.sampleRate||22050),8000,48000);
 const linguistic=analyzeWord(text,opts.language||"it"),phones=linguistic.phones;
 if(!phones.length)return new Float32Array(0);
 const target=C(Math.round(opts.targetSamples||sr*.38),phones.length*6,sr*3);
 const total=phones.reduce((sum,p)=>sum+p.weight,0);
 const sizes=phones.map(p=>Math.max(6,Math.floor(target*p.weight/total)));
 let leftover=target-sizes.reduce((a,b)=>a+b,0);
 // Excess tiny slices are rare, but render length must never exceed its bar.
 if(leftover>0){for(let i=0;i<leftover;i++)sizes[i%sizes.length]++;}
 else if(leftover<0)for(let i=sizes.length-1;i>=0&&leftover<0;i--){
  const take=Math.min(-leftover,sizes[i]-6);sizes[i]-=take;leftover+=take;
 }
 const length=sizes.reduce((a,b)=>a+b,0);
 const out=new Float32Array(length);
 const base=C(opts.pitch||132,65,280),guide=C(opts.guideHz||base,65,390);
 const tune=C(opts.tuneStrength||0,0,1),fundamental=base*Math.pow(guide/base,tune);
 const formantShift=C(opts.formantShift||1,.83,1.18);
 const contour=Array.isArray(opts.melody)?opts.melody.filter(f=>Number.isFinite(f)&&f>50):[];
 const melodyTarget=p=>contour[p.syllable]||guide;
 let smoothHz=fundamental;
 const spectral=opts.mode==="radio"?.94:opts.mode==="air"?1.03:1;
 const phrasing=C(Number.isFinite(opts.energy)?opts.energy:1,.45,1.4);
 const inflect=C(Number.isFinite(opts.inflection)?opts.inflection:0,-.15,.15);
 const breathiness=C(Number.isFinite(opts.breathiness)?opts.breathiness:.075,.01,.20);
 const grain=C(Number.isFinite(opts.grain)?opts.grain:0,0,.3);
 const phaseVoice=rng()*TAU;
 const wordAttack=opts.accent?1.14:1;
 const state=[filter(),filter(),filter()];
 let phase=rng(),prevNoise=0,prevSaw=0,low=0,dcPrevX=0,dcPrevY=0,at=0;
 for(let k=0;k<phones.length;k++){
  const p=phones[k],previous=phones[k-1],next=phones[k+1],count=sizes[k];
  const isVoice=p.kind==="vowel"||p.kind==="nasal"||p.kind==="liquid"||
   ["b","d","g","j","v","z","zh"].includes(p.sym);
  const fric=p.kind==="fricative"||["ch","ts","j"].includes(p.sym);
  const stop=p.kind==="stop";
  let co=[coeff(500,5,sr),coeff(1550,6,sr),coeff(2550,7,sr)];
  for(let i=0;i<count;i++){
   const u=i/Math.max(1,count-1),sample=at+i;
   if(i%24===0){
    const hz=formants(p,previous,next,u).map(f=>f*formantShift);
    co=[coeff(hz[0],4.6,sr),coeff(hz[1],5.6,sr),coeff(hz[2],7.2,sr)];
   }
   const accent=(p.stressed?.020:0)+inflect*(.5-u);
    const phrasePitch=1+accent+(opts.rap?.006:.012)*Math.sin(TAU*1.4*sample/sr+phaseVoice);
    const goal=base*Math.pow(C(melodyTarget(p),65,390)/base,tune)*phrasePitch;
   // A 15-ms portamento between syllables, but no formant transposition.
   smoothHz+=(goal-smoothHz)*C(1/(sr*.015),.00001,.30);
   const rate=C(smoothHz*(1+(p.stressed?.019:0) + (u-.5)*.013+
    (opts.vibrato||0)*Math.sin(TAU*4.6*sample/sr)),55,420)/sr;
   phase+=rate;if(phase>=1)phase-=Math.floor(phase);
   const saw=2*phase-1-blep(phase,rate);
   // Rounded glottal wave and a little periodic irregularity prevent rigid buzz.
   const glottal=Math.sin(Math.PI*phase)**2*(phase<.66?1:.33);
   const excitation=(.49*(saw-prevSaw*.65)+.64*(glottal-.31))*.83;
   prevSaw=saw;
   const rawNoise=rng()*2-1;
   prevNoise=prevNoise*.72+rawNoise*.28;
   const hiss=(rawNoise-prevNoise);
   const y1=bandpass(excitation,state[0],co[0]),
    y2=bandpass(excitation,state[1],co[1]),
    y3=bandpass(excitation,state[2],co[2]);
   let vocal=(1.4*y1+.96*y2+.54*y3+excitation*.055)*spectral+
    hiss*breathiness*(p.kind==="vowel"?1:.45);
   if(p.kind==="nasal")vocal=(1.1*y1+.32*y2+.08*y3)*.78;
   if(p.sym==="r")vocal*=.67+.33*Math.sin(TAU*24*sample/sr)**2;
   if(p.sym==="l"||p.sym==="ly")vocal*=.87;
   let signal=isVoice?vocal:0;
   if(fric)signal+=hiss*(p.sym==="s"||p.sym==="ts"?.38:p.sym==="sh"||p.sym==="ch"?.31:.22);
   if(stop){
    // Closed oral cavity then crisp burst. Voiced stops resume rapidly.
    if(u<.20)signal=0;
    else if(u<.35)signal+=hiss*Math.exp(-18*(u-.20))*.43;
    if(!isVoice)signal*=u<.2?0:.86;
   }
   if(p.sym==="h")signal+=hiss*.13;
   const edge=C(i/(sr*.0025),0,1)*C((count-i-1)/(sr*.003),0,1);
   const stressedGain=(p.stressed?1.15:.96)*phrasing*wordAttack;
   const contourEnv=(.88+.12*Math.sin(Math.PI*u))*(1-.10*u);
   signal+=grain*(rng()*2-1)*.025;
   low=low*.16+signal*.84;
   // DC-block and soft headroom: preserve transients and consonant contrast.
   const high=low-dcPrevX+.995*dcPrevY;dcPrevX=low;dcPrevY=high;
   out[sample]=Math.tanh(high*1.13)*edge*stressedGain*contourEnv*.81;
  }
  at+=count;
 }
 // Short word-wide fades avoid isolated phoneme boundary clicks.
 const edge=Math.min(Math.floor(sr*.003),Math.floor(length/5));
 for(let i=0;i<edge;i++){out[i]*=i/Math.max(1,edge);out[length-i-1]*=i/Math.max(1,edge);}
 return out;
}
