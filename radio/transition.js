/* RNR live crossfade: two independent WebAudio sources through the existing master gain. */
export function spliceTrack(context,buffer,output,previous=null,fadeSeconds=1.8){
  const time=context.currentTime;
  const duration=previous?Math.max(.05,fadeSeconds):.04;
  const source=context.createBufferSource();
  source.buffer=buffer;
  source.loop=true;
  const gain=context.createGain();
  source.connect(gain);
  gain.connect(output);
  gain.gain.setValueAtTime(0,time);
  gain.gain.linearRampToValueAtTime(1,time+duration);
  source.start(time);
  const active={source,gain};
  if(previous){
    const oldGain=previous.gain.gain;
    oldGain.cancelScheduledValues(time);
    oldGain.setValueAtTime(oldGain.value,time);
    oldGain.linearRampToValueAtTime(0,time+duration);
    try{previous.source.stop(time+duration+.04);}catch(_){}
    setTimeout(()=>{try{previous.source.disconnect();previous.gain.disconnect();}catch(_){}},Math.ceil((duration+.1)*1000));
  }
  return active;
}
export function haltTrack(track){
  if(!track)return;
  try{track.source.stop();}catch(_){}
  try{track.source.disconnect();track.gain.disconnect();}catch(_){}
}
