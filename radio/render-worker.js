/* Dedicated browser Worker for CPU-heavy seeded rendering. Pure static JS. */
import {renderPCM} from "./radio.js";
self.addEventListener("message",event=>{
 const {id,plan,sampleRate}=event.data||{};
 try{
  const out=renderPCM(plan,sampleRate);
  self.postMessage({id,ok:true,sampleRate:out.sampleRate,channels:out.channels},out.channels.map(x=>x.buffer));
 }catch(e){self.postMessage({id,ok:false,error:String(e?.message||e)});}
});
