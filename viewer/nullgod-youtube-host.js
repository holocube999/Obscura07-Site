/* NULLGOD MUSIC YouTube host: no GitHub credential or private content crosses the sandbox. */
(()=>{'use strict';
const TYPE='NULLGOD_AUDIO_V1',READY='NULLGOD_AUDIO_READY_V1',STATE='NULLGOD_AUDIO_STATE_V1';
let shell=null,player=null,videoId='';
const validId=/^[a-zA-Z0-9_-]{11}$/;
function appFrame(){return document.getElementById('playframe')}
function trusted(){
 const q=new URLSearchParams(location.search);
 return String(q.get('repo')||q.get('project')||'').toLowerCase()==='nullgod-music' &&
  document.getElementById('detailName')?.textContent==='NULLGOD / MUSIC';
}
function notify(data){const target=appFrame()?.contentWindow;if(target)target.postMessage({type:STATE,...data},'*')}
function cleanup(){
 videoId='';player=null;if(shell){shell.remove();shell=null}
 notify({state:2});
}
function command(name,args=[]){
 if(!player?.contentWindow||!['playVideo','pauseVideo','stopVideo','seekTo','setVolume'].includes(name))return;
 const safeArgs=Array.isArray(args)?args.slice(0,2).filter(x=>typeof x==='number'||typeof x==='boolean'):[];
 player.contentWindow.postMessage(JSON.stringify({event:'command',func:name,args:safeArgs}),'https://www.youtube.com');
}
function build(){
 if(shell)return;
 shell=document.createElement('section');
 shell.id='nullgod-youtube-host';
 shell.setAttribute('aria-label','NULLGOD MUSIC · Riproduzione YouTube');
 Object.assign(shell.style,{position:'fixed',zIndex:'2147482000',right:'12px',bottom:'12px',
  width:'min(420px,calc(100vw - 24px))',background:'#0d0c12',color:'#f4f2f7',
  border:'1px solid #72638c',borderRadius:'12px',boxShadow:'0 10px 44px #000c',overflow:'hidden'});
 const head=document.createElement('div');
 Object.assign(head.style,{display:'flex',alignItems:'center',gap:'9px',padding:'9px 12px',
  font:'12px system-ui,sans-serif',background:'#19151f'});
 const title=document.createElement('strong');title.id='nullgod-youtube-title';title.style.cssText='flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';title.textContent='NULLGOD · YouTube';
 const close=document.createElement('button');close.type='button';close.textContent='✕';close.setAttribute('aria-label','Interrompi YouTube');
 close.style.cssText='background:#302638;color:white;border:0;border-radius:5px;padding:4px 9px;cursor:pointer';
 close.onclick=cleanup;head.append(title,close);
 const stage=document.createElement('div');stage.id='nullgod-youtube-stage';stage.style.cssText='width:100%;min-height:220px;background:#000';
 shell.append(head,stage);
 document.body.append(shell);
}
function play(id,label){
 if(!validId.test(id))return;
 build();
 document.getElementById('nullgod-youtube-title').textContent=(String(label||'').slice(0,160)||'YouTube')+' · NULLGOD';
 if(videoId===id&&player){command('playVideo');return}
 videoId=id;
 const frame=document.createElement('iframe');frame.title='YouTube · '+String(label||'video').slice(0,80);
 frame.src='https://www.youtube.com/embed/'+id+'?autoplay=1&enablejsapi=1&playsinline=1&rel=0&origin='+encodeURIComponent(location.origin);
 frame.referrerPolicy='strict-origin-when-cross-origin';
 frame.allow='autoplay; encrypted-media; fullscreen; picture-in-picture';
 frame.allowFullscreen=true;
 frame.style.cssText='display:block;width:100%;height:240px;border:0;min-height:220px';
 frame.onload=()=>{try{frame.contentWindow?.postMessage(JSON.stringify({event:'listening',id:'nullgod'}),'https://www.youtube.com')}catch(_){}};
 player=frame;
 document.getElementById('nullgod-youtube-stage').replaceChildren(frame);
 notify({state:1});
}
window.addEventListener('message',e=>{
 const f=appFrame();
 if(e.source===player?.contentWindow&&/^https:\/\/(?:www\.)?youtube\.com$/.test(e.origin)){
  let data=e.data;
  if(typeof data==='string'){try{data=JSON.parse(data)}catch{return}}
  if(!data||typeof data!=='object')return;
  if(data.event==='onStateChange'&&Number.isInteger(data.info))notify({state:data.info});
  if(data.event==='onError')notify({error:String(data.info??'Embed non disponibile')});
  return;
 }
 if(!f||e.source!==f.contentWindow||!trusted())return;
 const d=e.data;if(!d||d.type!==TYPE||typeof d.action!=='string')return;
 if(d.action==='hello'){f.contentWindow.postMessage({type:READY},'*');return}
 if(d.action==='play'){if(validId.test(d.videoId||''))play(d.videoId,d.title);return}
 if(d.action==='stop'){cleanup();return}
 if(d.action==='command')command(d.command,d.args);
});
window.addEventListener('pagehide',cleanup);
})();