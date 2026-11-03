/* Shared invisible retro media adapter for Sellone WebPlayer. */
(()=>{'use strict';
const CACHE='sellone-retro-session-v1';
const allow={adf:'amiga',d64:'c64',t64:'c64',prg:'c64'};
const maxBytes=3*1024*1024;
let session=null;
const secure=location.protocol==='https:'||['localhost','127.0.0.1'].includes(location.hostname);
function format(name){const m=/\.([a-z0-9]+)$/i.exec(String(name||''));return m?m[1].toLowerCase():''}
function supported(file){const type=format(file?.name||'');return !!allow[type]&&file.size>0&&file.size<=maxBytes}
function needsKick(file){return format(file?.name)==='adf'}
function validKick(file){return file&&/\.(?:rom|bin|kick|a500|a1200)$/i.test(file.name)&&file.size>=8192&&file.size<=2*1024*1024}
async function worker(){
 if(!secure||!('serviceWorker' in navigator)||!('caches' in window))
  throw Error('Per il core retro servono HTTPS/localhost, Service Worker e CacheStorage');
 const reg=await navigator.serviceWorker.register('./retro/sw.js',{scope:'./retro/'});
 if(!reg.active){
  const w=reg.installing||reg.waiting;
  if(!w)throw Error('Service Worker non pronto: ricarica la pagina');
  await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(Error('Service Worker non attivo')),9000);
   const onState=()=>{if(w.state==='activated'){clearTimeout(timer);resolve()}else if(w.state==='redundant'){clearTimeout(timer);reject(Error('Service Worker non attivo'))}};
   w.addEventListener('statechange',onState);onState();
  });
 }
}
async function stop(){
 const s=session;session=null;
 if(!s)return;
 s.frame.src='about:blank';s.frame.remove();
 try{const cache=await caches.open(CACHE);await Promise.all(s.urls.map(url=>cache.delete(url)))}catch{}
}
async function start({media,bios,title,host,onStatus}){
 if(!media||!supported(media))throw Error('Supporto non valido: ADF, D64, T64 o PRG fino a 3 MiB');
 if(needsKick(media)&&bios&&!validKick(bios))throw Error('Kickstart selezionata non valida');
 if(!host)throw Error('Schermo WebPlayer non disponibile');
 await stop();await worker();
 const ext=format(media.name),core=allow[ext];
 const id=typeof crypto.randomUUID==='function'?crypto.randomUUID():Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');
 const prefix=new URL('./retro/virtual/'+id+'/',location.href);
 const diskUrl=new URL('disk.'+ext,prefix).href;
 const biosUrl=bios?new URL('kick.rom',prefix).href:null;
 const urls=[diskUrl,...(biosUrl?[biosUrl]:[])];
 const cache=await caches.open(CACHE);
 try{
  await cache.put(diskUrl,new Response(media,{headers:{'Content-Type':'application/octet-stream','Cache-Control':'no-store'}}));
  if(biosUrl)await cache.put(biosUrl,new Response(bios,{headers:{'Content-Type':'application/octet-stream','Cache-Control':'no-store'}}));
  const frame=document.createElement('iframe');
  frame.title=title+' · '+(core==='amiga'?'PUAE':'VICE');
  frame.allow='fullscreen; gamepad';frame.allowFullscreen=true;frame.className='retro-frame';
  // The emulator page is trusted site code; the proprietary bytes remain local to the browser.
  frame.src='./retro/emu.html';
  host.replaceChildren(frame);
  session={frame,urls,onStatus};
  frame.addEventListener('load',()=>{
   if(!session||session.frame!==frame)return;
   frame.contentWindow.postMessage({type:'SELLONE_RETRO_BOOT_V1',mediaUrl:diskUrl,biosUrl,core,title},location.origin);
   onStatus?.('Core '+(core==='amiga'?'PUAE / Amiga':'VICE / Commodore 64')+' inizializzato; verifica il boot sullo schermo.');
  },{once:true});
 }catch(e){
  await Promise.all(urls.map(url=>cache.delete(url).catch(()=>{})));
  throw e;
 }
}
window.addEventListener('message',event=>{
 if(event.origin!==location.origin||event.data?.type!=='SELLONE_RETRO_ERROR_V1'||event.source!==session?.frame?.contentWindow)return;
 session.onStatus?.(String(event.data.message||'Errore nel core retro'),true);
});
if('caches' in window)caches.delete(CACHE).catch(()=>{});
window.SelloneRetro=Object.freeze({start,stop,supported,needsKick,validKick});
window.addEventListener('pagehide',()=>{stop().catch(()=>{})});
})();
