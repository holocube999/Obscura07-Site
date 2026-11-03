/* Generic WebPlayer adapter: PUAE for ADF; VICE x64sc for D64/T64. */
'use strict';
let started=false;
window.addEventListener('message',event=>{
 if(started||event.origin!==location.origin||event.source!==parent||event.data?.type!=='SELLONE_RETRO_BOOT_V1')return;
 const {mediaUrl,biosUrl,core,title}=event.data;
 const prefix=new URL('./virtual/',location.href);
 function permitted(input,suffixes){
  try{const u=new URL(input);return u.origin===prefix.origin&&u.pathname.startsWith(prefix.pathname)&&!u.search&&!u.hash&&suffixes.some(s=>u.pathname.toLowerCase().endsWith(s))}catch{return false}
 }
 if(!['amiga','c64'].includes(core)||!permitted(mediaUrl,core==='amiga'?['.adf']:['.d64','.t64','.prg'])||(biosUrl&&!permitted(biosUrl,['.rom','.bin']))){
  parent.postMessage({type:'SELLONE_RETRO_ERROR_V1',message:'Formato o indirizzo del supporto non autorizzato'},location.origin);return;
 }
 started=true;
 document.title=(String(title||'Sellone').slice(0,80))+' · '+core;
 document.getElementById('waiting').remove();
 window.EJS_player='#game';
 window.EJS_core=core;
 window.EJS_gameUrl=mediaUrl;
 if(biosUrl)window.EJS_biosUrl=biosUrl;
 window.EJS_gameName=String(title||'Sellone').slice(0,80);
 window.EJS_pathtodata='https://cdn.emulatorjs.org/stable/data/';
 window.EJS_startOnLoaded=false;
 const script=document.createElement('script');
 script.src='https://cdn.emulatorjs.org/stable/data/loader.js';
 script.onerror=()=>parent.postMessage({type:'SELLONE_RETRO_ERROR_V1',message:'Caricamento del core EmulatorJS fallito (CDN o CSP)'},location.origin);
 document.head.append(script);
});
