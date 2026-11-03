/* Generic WebPlayer adapter: PUAE for ADF; VICE x64sc for D64/T64. */
'use strict';
let started=false,channel=null,delivering=false;
const keyCodes=/^(?:Arrow(?:Up|Down|Left|Right)|Key[A-Z]|Digit[0-9]|Space|Enter|Escape|Shift(?:Left|Right)|Control(?:Left|Right))$/;
function validKey(d){return keyCodes.test(String(d.code||''))&&typeof d.key==='string'&&d.key.length<=18&&['keydown','keyup'].includes(d.action)}
window.addEventListener('message',event=>{
 if(!started||event.origin!==location.origin||event.source!==parent||event.data?.type!=='SELLONE_SYNC_INPUT_V1'||event.data.channel!==channel||!validKey(event.data))return;
 delivering=true;
 try{document.dispatchEvent(new KeyboardEvent(event.data.action,{key:event.data.key,code:event.data.code,repeat:!!event.data.repeat,bubbles:true,cancelable:true}));}
 finally{delivering=false}
});
for(const action of ['keydown','keyup'])window.addEventListener(action,event=>{
 if(delivering||!event.isTrusted||!channel||!keyCodes.test(event.code))return;
 parent.postMessage({type:'SELLONE_SYNC_INPUT_V1',channel,action,key:event.key,code:event.code,repeat:event.repeat},location.origin);
},true);
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
 channel=typeof event.data.channel==='string'&&/^[A-Za-z0-9-]{10,100}$/.test(event.data.channel)?event.data.channel:null;
 if(channel)parent.postMessage({type:'SELLONE_SYNC_READY_V1',channel,side:'original'},location.origin);
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
