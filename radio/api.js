/* Static JavaScript API — no server, no npm, no external CDN. */
import {makePlan,renderPCM,pcmToWav,pcmToMP3,filename,randomSeed} from "./radio.js";
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
export function synthesize(params={}){const plan=makePlan(params);return {plan,pcm:renderPCM(plan)};}
export async function exportTrack(params={},format="mp3"){
 const {plan,pcm}=synthesize(params),type=String(format).toLowerCase();
 if(type==="mp3")await ensureMP3();
 if(type!=="mp3"&&type!=="wav")throw new RangeError("Unsupported format; use mp3 or wav");
 const blob=type==="mp3"?pcmToMP3(pcm):pcmToWav(pcm);
 return {plan,blob,filename:filename(plan,type),mime:blob.type,stream:()=>blob.stream()};
}
export function playPCM(pcm,context,output=context.destination){
 const buffer=context.createBuffer(2,pcm.channels[0].length,pcm.sampleRate);
 for(let i=0;i<2;i++)buffer.copyToChannel(pcm.channels[i],i);
 const node=context.createBufferSource();node.buffer=buffer;node.connect(output);node.start();
 return node;
}
export {makePlan,renderPCM,pcmToWav,pcmToMP3,filename,randomSeed};
