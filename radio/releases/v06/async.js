/* Render offline in one static worker; fallback remains local and deterministic. */
import {renderPCM} from "./radio.js";
import {renderVocalBus} from "./voice-render.js";
function direct(plan,sampleRate){
 const audio=renderPCM(plan,sampleRate);
 return {...audio,voiceChannels:
  renderVocalBus(plan,{sampleRate:audio.sampleRate})?.channels||null};
}
export function renderAsync(plan,sampleRate){
 if(typeof Worker==="undefined")return Promise.resolve(direct(plan,sampleRate));
 return new Promise((resolve,reject)=>{
  let done=false,worker;
  try{
   worker=new Worker(new URL("./render-worker.js",import.meta.url),{type:"module"});
   worker.onmessage=event=>{
    if(done)return;done=true;worker.terminate();
    const d=event.data;if(!d?.ok){reject(new Error(d?.error||"Audio renderer failed"));return;}
    resolve({plan,sampleRate:d.sampleRate,channels:d.channels,
             voiceChannels:d.voiceChannels||null});
   };
   worker.onerror=()=>{
    if(done)return;done=true;worker.terminate();
    try{resolve(direct(plan,sampleRate));}catch(e){reject(e);}
   };
   worker.postMessage({id:1,plan,sampleRate});
  }catch(_e){
   if(worker)worker.terminate();
   try{resolve(direct(plan,sampleRate));}catch(e){reject(e);}
  }
 });
}