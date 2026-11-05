/* Static JavaScript API — no server, no npm, no external CDN. */
import {makePlan,renderPCM,pcmToWav,pcmToMP3,filename,randomSeed} from "./radio.js";
import {renderAsync} from "./async.js";
import {encodeMP3Async} from "./encode.js";
import {renderVocalBus,mixVocalBus} from "./voice-render.js";
let mp3Library=null;
export async function ensureMP3(){
 if(globalThis.lamejs?.Mp3Encoder)return;
 if(mp3Library)return mp3Library;
 if(typeof document==="undefined")throw new Error("The browser MP3 encoder requires a document and static vendor/lame.min.js");
 mp3Library=new Promise((resolve,reject)=>{
  const script=document.createElement("script");
  script.src=new URL("./vendor/lame.min.js",import.meta.url);
  script.onload=()=>globalThis.lamejs?.Mp3Encoder?resolve():reject(new Error("MP3 encoder failed to load"));
  script.onerror=()=>reject(new Error("Local MP3 library missing"));
  document.head.appendChild(script);
 });
 return mp3Library;
}
export function compose(params={}){return makePlan(params);}
export function synthesize(params={}){
 const plan=makePlan(params),pcm=renderPCM(plan);
 const vocal=renderVocalBus(plan,{sampleRate:pcm.sampleRate});
 return {plan,pcm:mixVocalBus(pcm,vocal,params.voiceMix??.22)};
}
export async function exportTrack(params={},format="mp3"){
 const plan=makePlan(params),rendered=await renderAsync(plan),type=String(format).toLowerCase();
 const vocals=rendered.voiceChannels?{channels:rendered.voiceChannels}:null;
 const pcm=mixVocalBus(rendered,vocals,params.voiceMix??.22);
 if(type==="mp3")await ensureMP3();
 if(type!=="mp3"&&type!=="wav")throw new RangeError("Unsupported format; use mp3 or wav");
 const blob=type==="mp3"?await encodeMP3Async(pcm):pcmToWav(pcm);
 return {plan,blob,filename:filename(plan,type),mime:blob.type,stream:()=>blob.stream()};
}
export function playPCM(pcm,context,output=context.destination){
 const buffer=context.createBuffer(2,pcm.channels[0].length,pcm.sampleRate);
 for(let i=0;i<2;i++)buffer.copyToChannel(pcm.channels[i],i);
 const node=context.createBufferSource();node.buffer=buffer;node.connect(output);node.start();
 return node;
}
export {makePlan,renderPCM,pcmToWav,pcmToMP3,filename,randomSeed};
