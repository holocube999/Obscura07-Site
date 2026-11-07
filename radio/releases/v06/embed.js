/* Random[null]Radio embedded runtime.
   Standalone radio module; host site only supplies the iframe and its controls. */
import {mount} from './widget.js';
const root=document.getElementById('rnrEmbedded');
const api=mount(root,{style:'darkambient',duration:120,withVox:false,
                      volume:0.045,voiceMix:0.20,autonext:true,readQuery:false,
                      onCoverOpen({src,title,artist}){
                       if(window.parent!==window)window.parent.postMessage({
                        type:'randomnullradio:cover',src,title,artist},location.origin);
                      }});
api.setVolume(0.045);
const notify=(state)=>{if(window.parent!==window)window.parent.postMessage(
  {type:'randomnullradio:status',state},location.origin);};
let starting=false;
async function start(){
 if(starting||api.playing)return;
 starting=true;notify('starting');
 try{await api.start();notify(api.playing?'playing':'needs-gesture')}
 catch{notify('needs-gesture')}
 finally{starting=false}
}
window.addEventListener('message',(event)=>{
 if(event.source!==window.parent||event.origin!==location.origin)return;
 if(!event.data||event.data.type!=='randomnullradio:start')return;
 void start();
});
window.addEventListener('pointerdown',()=>{if(!api.playing)void start()},{once:true,capture:true});
window.addEventListener('keydown',()=>{if(!api.playing)void start()},{once:true,capture:true});
notify('ready');
// Best effort only: Web Audio autoplay may be blocked until a user gesture.
// The embedded player always remains accessible for manual activation.
void start();
if(typeof navigator!=="undefined"&&"serviceWorker" in navigator&&window.isSecureContext)
 navigator.serviceWorker.register("./sw.js",{scope:"./"}).catch(()=>{});
