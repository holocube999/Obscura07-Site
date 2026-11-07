/* Optional OS/browser speech: clearer on devices with installed voices.
 * Never required. Offline articulatory PCM remains the guaranteed fallback.
 * Voice selection respects language and each synthetic persona's stable id. */
const LOCALES={it:"it-IT",en:"en-US",fr:"fr-FR",de:"de-DE",es:"es-ES"};
function hash(s){let h=2166136261;for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
function selectVoice(voices,language,persona){
 const same=voices.filter(v=>String(v.lang||"").toLowerCase().startsWith(language.toLowerCase()));
 return same.length?same[hash(persona?.id||"host")%same.length]:null;
}
export function createNativeAnnouncer({
 synth=globalThis.speechSynthesis,Utterance=globalThis.SpeechSynthesisUtterance,
 startupTimeout=2300,phraseTimeout=25000
}={}){
 let active=null;
 const available=Boolean(synth&&typeof synth.speak==="function"&&typeof Utterance==="function");
 function cancel(){active?.cancel();}
 function speak(cue,{language="it"}={}){
  if(!available||!cue?.text)return Promise.resolve(false);
  cancel();
  return new Promise(resolve=>{
   let ended=false,index=0,watchdog=null;
   const parts=Array.isArray(cue.segments)&&cue.segments.length?cue.segments:[{text:cue.text,persona:cue.persona}];
   const voices=typeof synth.getVoices==="function"?synth.getVoices()||[]:[];
   const finish=played=>{
    if(ended)return;ended=true;clearTimeout(watchdog);
    if(active===handle)active=null;
    resolve(played);
   };
   const handle={cancel:()=>{
    if(ended)return;
    try{synth.cancel();}catch(_e){}
    finish(false);
   }};
   active=handle;
   function advance(){
    if(ended)return;
    if(index>=parts.length){finish(true);return;}
    const part=parts[index++],persona=part.persona||cue.persona||{};
    const u=new Utterance(String(part.text||"").slice(0,500));
    u.lang=LOCALES[language]||language||"en-US";
    u.rate=Math.max(.72,Math.min(1.35,Number(persona.pace)||1));
    u.pitch=Math.max(.65,Math.min(1.6,(Number(persona.pitch)||140)/140));
    u.volume=1;
    const voice=selectVoice(voices,language,persona);
    if(voice)u.voice=voice;
    let started=false;
    clearTimeout(watchdog);
    watchdog=setTimeout(()=>{
     if(ended)return;
     try{synth.cancel();}catch(_e){}
     finish(started); // no audio? PCM fallback; a started speech may have been cut.
    },startupTimeout);
    u.onstart=()=>{
     if(ended)return;started=true;clearTimeout(watchdog);
     watchdog=setTimeout(()=>{
      if(ended)return;try{synth.cancel();}catch(_e){}
      finish(true); // avoid hanging a station forever on a broken TTS engine
     },phraseTimeout);
    };
    u.onend=()=>{if(ended)return;clearTimeout(watchdog);advance();};
    u.onerror=()=>{if(ended)return;finish(started);};
    try{synth.speak(u);}catch(_e){finish(false);}
   }
   advance();
  });
 }
 return {available,speak,cancel};
}
