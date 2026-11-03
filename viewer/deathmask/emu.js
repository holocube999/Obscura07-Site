/* Isolated EmulatorJS PUAE runner. NEVER receives a GitHub token.
 * Its sandbox frame has an opaque origin and cannot read parent IndexedDB.
 */
"use strict";
(function(){
const overlay=document.getElementById("overlay");
const post=(stage,message)=>window.parent.postMessage(
  {type:"DM_EMU_STATUS",stage,message:String(message||"").slice(0,350)},"*");
let started=false,done=false,timer=null,gameUrl=null,biosUrl=null;
function show(message,error){
  if(!overlay)return;
  overlay.textContent=message;overlay.classList.toggle("error",!!error);
  overlay.hidden=false;
  if(error)post("error",message);
}
function fail(message){
  done=true;clearTimeout(timer);
  show(message,true);
}
window.addEventListener("error",e=>{
  if(started&&!done)fail("Errore JS nel core Amiga: "+String(e.message||"sconosciuto"));
});
window.addEventListener("unhandledrejection",e=>{
  if(started&&!done)fail("Avvio core Amiga fallito: "+String(e.reason?.message||e.reason||"sconosciuto"));
});
window.addEventListener("message",async event=>{
  if(started||event.source!==window.parent||!event.data||
     event.data.type!=="DM_EMU_BOOT")return;
  if(typeof event.data.origin!=="string"||
     event.origin!==event.data.origin)return;
  const d=event.data;
  if(!(d.disk instanceof ArrayBuffer)||!(d.kick instanceof ArrayBuffer)||
      d.disk.byteLength!==901120||![262144,524288,1048576,2097152].includes(d.kick.byteLength)||
      !["disk1","disk2","port"].includes(d.diskName))return fail("Media Amiga non validi.");
  started=true;
  try{
    const diskFile=new File([d.disk],d.diskName+".adf",{type:"application/octet-stream"});
    const romFile=new File([d.kick],"kick.rom",{type:"application/octet-stream"});
    gameUrl=URL.createObjectURL(diskFile);biosUrl=URL.createObjectURL(romFile);
    show("EmulatorJS: caricamento core Amiga PUAE…",false);
    post("loading","Caricamento EmulatorJS PUAE");
    window.EJS_player="#game";
    window.EJS_core="amiga";
    window.EJS_gameUrl=gameUrl;
    window.EJS_biosUrl=biosUrl;
    window.EJS_gameName="Death Mask "+d.diskName+".adf";
    window.EJS_pathtodata="https://cdn.emulatorjs.org/stable/data/";
    window.EJS_backgroundColor="#060810";
    window.EJS_startOnLoaded=true;
    window.EJS_ready=()=>{
      if(done)return;
      done=true;clearTimeout(timer);
      overlay.hidden=true;
      post("ready","Emulatore pronto. Se il browser blocca l'autoplay, premi Play nel pannello.");
    };
    window.EJS_onGameStart=()=>{
      overlay.hidden=true;
      post("started","Core PUAE avviato. Il boot del gioco originale deve essere verificato.");
    };
    timer=setTimeout(()=>{
      if(!done)fail("Timeout PUAE: loader o core non inizializzato. Controlla il CDN, WebAssembly e console.");
    },30000);
    const script=document.createElement("script");
    script.src="https://cdn.emulatorjs.org/stable/data/loader.js";
    script.async=true;
    script.onload=()=>post("loader","Loader EmulatorJS scaricato. Attendo core.");
    script.onerror=()=>fail("Impossibile caricare EmulatorJS dal CDN: verifica rete/CSP/ad-blocker.");
    document.head.append(script);
  }catch(e){fail("Inizializzazione Amiga: "+String(e.message||e));}
});
window.addEventListener("pagehide",()=>{
  if(gameUrl)URL.revokeObjectURL(gameUrl);
  if(biosUrl)URL.revokeObjectURL(biosUrl);
  clearTimeout(timer);
});
})();
