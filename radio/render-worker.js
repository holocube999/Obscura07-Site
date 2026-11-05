/* Worker renders music and processed, preregistered vocal buses offline. */
import {renderPCM} from "./radio.js";
import {renderVocalBus} from "./voice-render.js";
self.addEventListener("message",event=>{
 const {id,plan,sampleRate}=event.data||{};
 try{
  const music=renderPCM(plan,sampleRate);
  const voices=renderVocalBus(plan,{sampleRate:music.sampleRate});
  const buffers=music.channels.map(ch=>ch.buffer);
  if(voices)buffers.push(...voices.channels.map(ch=>ch.buffer));
  self.postMessage({id,ok:true,sampleRate:music.sampleRate,
    channels:music.channels,voiceChannels:voices?.channels||null},
    buffers);
 }catch(e){self.postMessage({id,ok:false,error:String(e?.message||e)});}
});