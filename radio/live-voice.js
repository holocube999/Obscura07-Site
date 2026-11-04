/* Native, offline device TTS. Spoken words are real; native output cannot be routed into WebAudio. */
import {rngFor} from "./radio.js";
const C=(x,a,b)=>Math.max(a,Math.min(b,x));
const LANG={en:"en-US",it:"it-IT",fr:"fr-FR",es:"es-ES",de:"de-DE",pt:"pt-PT",nl:"nl-NL",sv:"sv-SE",fi:"fi-FI",pl:"pl-PL",tr:"tr-TR",ja:"ja-JP",ko:"ko-KR",zh:"zh-CN",ar:"ar-SA",hi:"hi-IN",el:"el-GR",ru:"ru-RU"};
export function tunePitch(pitch,tuning="31-EDO",strength=1){
  const steps=parseInt(String(tuning),10)||12;
  const divisions=String(tuning).includes("EDO")?steps:12;
  const semis=12*Math.log2(Math.max(.01,pitch));
  const snapped=Math.round(semis*divisions/12)*12/divisions;
  return C(Math.pow(2,(semis*(1-strength)+snapped*strength)/12),.5,2);
}
export function voiceCharacter(plan,entry,index=0){
  const v=entry.voice||{},r=rngFor(plan.seed+"|spoken|"+index);
  const modes=["natural","soft","hard","xeno","whisper","chorus"];
  const mode=modes[Math.floor(r()*modes.length)];
  const pitch=C((v.base||150)/145*(.75+r()*.48),.54,1.88);
  return {mode,rate:C((v.rate||1)*(.75+r()*.35),.65,1.7),
    pitch,volume:C(.66+r()*.32,.1,1),variant:Math.floor(r()*1000),language:LANG[entry.language]||"en-US"};
}
export function createLiveVoice(onStatus=()=>{}){
  let timers=[],generation=0;
  const supported=()=>typeof globalThis.speechSynthesis!=="undefined"&&typeof globalThis.SpeechSynthesisUtterance==="function";
  function cancel(){
    generation++;
    for(const t of timers)clearTimeout(t);
    timers=[];
    if(supported())try{speechSynthesis.cancel();}catch(_){}
  }
  function speak(entry,plan,index,version){
    if(version!==generation||!supported())return;
    const synth=globalThis.speechSynthesis,profile=voiceCharacter(plan,entry,index);
    const list=synth.getVoices(),code=profile.language.toLowerCase();
    const choices=list.filter(v=>v.lang.toLowerCase()===code||v.lang.toLowerCase().startsWith(code.slice(0,2)));
    const r=rngFor(plan.seed+"|utterance|"+index);
    const deviceVoice=choices.length?choices[Math.floor(r()*choices.length)]:null;
    const words=entry.text.trim().split(/\s+/).filter(Boolean);
    const segmented=(profile.mode==="hard"||profile.mode==="xeno")&&words.length<24;
    const slices=segmented?words:[entry.text];
    for(let j=0;j<slices.length;j++){
      const u=new SpeechSynthesisUtterance(slices[j]);
      u.lang=deviceVoice?.lang||profile.language;
      if(deviceVoice)u.voice=deviceVoice;
      const drift=segmented?(r()-.5)*(profile.mode==="xeno"?1.1:.7):0;
      const base=C(profile.pitch*Math.pow(2,drift),.5,2);
      u.pitch=segmented?tunePitch(base,plan.tuning,1):profile.mode==="soft"?tunePitch(base,plan.tuning,.28):base;
      u.rate=C(profile.rate*(segmented?.87:1),.5,1.85);
      u.volume=profile.volume;
      synth.speak(u);
    }
  }
  function start(plan){
    cancel();
    if(!plan.withVox)return false;
    if(!supported()){onStatus("TTS del dispositivo non disponibile");return false;}
    const version=generation;
    plan.voices.forEach((entry,i)=>{
      const delay=Math.max(0,entry.time*1000);
      timers.push(setTimeout(()=>speak(entry,plan,i,version),delay));
    });
    return true;
  }
  return {start,cancel,supported};
}
