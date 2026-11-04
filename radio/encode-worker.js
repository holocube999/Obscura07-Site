/* Classic Worker: offline MP3 encoding, never uploads the audio. */
importScripts("./vendor/lame.min.js");
self.onmessage=async event=>{
 try{
  const {pcmToMP3}=await import("./radio.js");
  const audio=event.data?.audio;
  if(!audio?.channels?.length)throw new Error("Missing PCM");
  const blob=pcmToMP3(audio);
  self.postMessage({ok:true,blob});
 }catch(e){self.postMessage({ok:false,error:String(e?.message||e)});}
};
