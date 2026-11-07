/* Client-side MP3 encoding in a background Worker; works on static hosting. */
import {pcmToMP3} from "./radio.js";
let library;
async function fallbackLibrary(){
 if(globalThis.lamejs?.Mp3Encoder)return;
 if(library)return library;
 if(typeof document==="undefined")throw new Error("MP3 encoder requires the bundled browser library.");
 library=new Promise((resolve,reject)=>{
  const script=document.createElement("script");script.src=new URL("./vendor/lame.min.js",import.meta.url);
  script.onload=()=>globalThis.lamejs?.Mp3Encoder?resolve():reject(new Error("Invalid MP3 library"));
  script.onerror=()=>reject(new Error("Offline MP3 encoder missing"));
  document.head.append(script);
 });
 return library;
}
export async function encodeMP3Async(audio){
 if(typeof Worker==="undefined"){await fallbackLibrary();return pcmToMP3(audio);}
 return new Promise((resolve,reject)=>{
  let worker;
  const fallback=async()=>{
   if(worker)worker.terminate();
   try{await fallbackLibrary();resolve(pcmToMP3(audio));}catch(e){reject(e);}
  };
  try{
   worker=new Worker(new URL("./encode-worker.js",import.meta.url));
   worker.onmessage=e=>{
    worker.terminate();
    if(e.data?.ok)resolve(e.data.blob);
    else fallback();
   };
   worker.onerror=fallback;
   // Clone, do not transfer: playback continues while encoding.
   worker.postMessage({audio});
  }catch(e){fallback();}
 });
}
