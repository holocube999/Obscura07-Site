/* RNR live crossfade. Track pool keeps only currently audible/fading AudioBufferSources. */
const pools=new WeakMap();
function dispose(track){
 if(!track)return;
 try{track.source.stop();}catch(_){}
 try{track.source.disconnect();track.gain.disconnect();}catch(_){}
 pools.get(track.context)?.delete(track);
}
export function spliceTrack(context,buffer,output,previous=null,fadeSeconds=1.8){
 const time=context.currentTime,duration=previous?Math.max(.05,fadeSeconds):.04;
 let pool=pools.get(context);if(!pool){pool=new Set();pools.set(context,pool);}
 const source=context.createBufferSource();source.buffer=buffer;source.loop=true;
 const gain=context.createGain();source.connect(gain);gain.connect(output);
 gain.gain.setValueAtTime(0,time);
 gain.gain.linearRampToValueAtTime(1,time+duration);
 source.start(time);
 const active={source,gain,context};pool.add(active);
 if(previous){
  const old=previous.gain.gain;
  old.cancelScheduledValues(time);
  old.setValueAtTime(old.value,time);
  old.linearRampToValueAtTime(0,time+duration);
  try{previous.source.stop(time+duration+.04);}catch(_){}
  setTimeout(()=>dispose(previous),Math.ceil((duration+.1)*1000));
 }
 return active;
}
export function haltTrack(track){
 if(!track)return;
 const pool=pools.get(track.context);
 for(const item of [...(pool||[track])])dispose(item);
}
