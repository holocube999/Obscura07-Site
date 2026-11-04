/* Render audio in a local static Worker, falling back if workers are blocked. */
import {renderPCM} from "./radio.js";
export function renderAsync(plan,sampleRate){
 if(typeof Worker==="undefined")return Promise.resolve(renderPCM(plan,sampleRate));
 return new Promise((resolve,reject)=>{
  let done=false,worker;
  try{
   worker=new Worker(new URL("./render-worker.js",import.meta.url),{type:"module"});
   worker.onmessage=event=>{
    if(done)return;done=true;worker.terminate();
    const d=event.data;if(!d?.ok){reject(new Error(d?.error||"Audio renderer failed"));return;}
    resolve({plan,sampleRate:d.sampleRate,channels:d.channels});
   };
   worker.onerror=()=>{
    if(done)return;done=true;worker.terminate();
    // A blocked worker can occur on file:// or restrictive embed policies.
    try{resolve(renderPCM(plan,sampleRate));}catch(e){reject(e);}
   };
   worker.postMessage({id:1,plan,sampleRate});
  }catch(_e){
   if(worker)worker.terminate();
   try{resolve(renderPCM(plan,sampleRate));}catch(e){reject(e);}
  }
 });
}
