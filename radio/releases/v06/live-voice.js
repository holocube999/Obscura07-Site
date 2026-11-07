/* Compatibility-only deterministic voice utilities. Native speech has been disabled; actual voice is rendered offline in voice-render.js. */
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
/* Preserved for API compatibility. SpeechSynthesis is deliberately not used.
 * Use renderVocalBus() for preregistered audio, effects and chorus. */
export function createLiveVoice(){
 return {start(){return false;},cancel(){},supported(){return false;}};
}
