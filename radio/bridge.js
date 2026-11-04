/* Optional postMessage bridge for same or cross-origin static iframe integration.
   Message: {channel:"RNR/API/1",action:"generate",id:"...",params:{...},format:"mp3"|"wav"}
   Returns: {channel:"RNR/API/1",action:"result",id,plan,blob,mime}
   Cannot create an HTTP endpoint on a static host. */
import {exportTrack} from "./api.js";
let busy=false;
window.addEventListener("message",async event=>{
 const d=event.data;
 if(!d||d.channel!=="RNR/API/1"||d.action!=="generate"||!event.source)return;
 const id=String(d.id||"").slice(0,100),to=event.origin==="null"?"*":event.origin;
 if(busy){event.source.postMessage({channel:"RNR/API/1",action:"error",id,error:"busy"},to);return;}
 busy=true;
 try{
  const p=d.params&&typeof d.params==="object"?d.params:{};
  const allowed=["seed","style","mood","concept","language","duration","bpm","intensity","withVox"];
  const options={};for(const k of allowed)if(Object.hasOwn(p,k))options[k]=p[k];
  const format=d.format==="wav"?"wav":"mp3";
  const out=await exportTrack(options,format);
  event.source.postMessage({channel:"RNR/API/1",action:"result",id,plan:out.plan,blob:out.blob,mime:out.mime,filename:out.filename},to);
 }catch(e){event.source.postMessage({channel:"RNR/API/1",action:"error",id,error:String(e.message||e)},to);}finally{busy=false;}
});
