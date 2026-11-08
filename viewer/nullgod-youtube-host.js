/* NULLGOD MUSIC v0.3 — same-location YouTube frame host.
 * The iframe is visually aligned to the dedicated music dock inside the private WebPlayer.
 * No token, source code, or download URLs are forwarded from the GitHub sandbox.
 */
(()=>{'use strict';
const TYPE='NULLGOD_AUDIO_V1',READY='NULLGOD_AUDIO_READY_V1',STATE='NULLGOD_AUDIO_STATE_V1';
const validId=/^[a-zA-Z0-9_-]{11}$/;
let frame=null,box=null,videoId='',slot=null,lastPosition=0;
function appFrame(){return document.getElementById('playframe')}
function trusted(){
 const q=new URLSearchParams(location.search);
 return String(q.get('repo')||q.get('project')||'').toLowerCase()==='nullgod-music'&&
  document.getElementById('detailName')?.textContent==='NULLGOD / MUSIC';
}
function reply(payload){const iframe=appFrame();if(iframe?.contentWindow)iframe.contentWindow.postMessage({type:STATE,...payload},'*')}
function align(){
 if(!box||!slot)return;
 const f=appFrame();if(!f)return;
 const rect=f.getBoundingClientRect();
 const x=rect.left+slot.left,y=rect.top+slot.top;
 const w=slot.width,h=slot.height;
 const visible=w>=200&&h>=200&&x<innerWidth&&x+w>0&&y<innerHeight&&y+h>0&&
    slot.left>=0&&slot.top>=0&&slot.left+w<=rect.width+1&&slot.top+h<=rect.height+1;
 Object.assign(box.style,{left:Math.round(x)+'px',top:Math.round(y)+'px',width:Math.round(w)+'px',height:Math.round(h)+'px',
  visibility:visible?'visible':'hidden'});
 // The YouTube iframe is not intentionally covered or reduced below 200x200.
}
function stop(){videoId='';lastPosition=0;frame=null;slot=null;if(box){box.remove();box=null}reply({state:2})}
function command(name,args=[]){
 if(!frame?.contentWindow||!['playVideo','pauseVideo','stopVideo','seekTo','setVolume'].includes(name))return;
 const values=Array.isArray(args)?args.slice(0,2).filter(x=>typeof x==='number'||typeof x==='boolean'):[];
 frame.contentWindow.postMessage(JSON.stringify({event:'command',func:name,args:values}),'https://www.youtube.com');
}
function mount(){
 if(box)return;
 box=document.createElement('div');box.id='nullgod-youtube-host';
 Object.assign(box.style,{position:'fixed',zIndex:'100',background:'#050508',border:'1px solid #393046',
   borderRadius:'6px',overflow:'hidden',pointerEvents:'auto',visibility:'hidden'});
 document.body.append(box);
}
function play(id,title){
 if(!trusted()||!validId.test(id))return;
 mount();
 if(videoId===id&&frame){align();command('playVideo');return}
 videoId=id;
 const el=document.createElement('iframe');
 el.title='YouTube nel lettore NULLGOD: '+String(title||'brano').slice(0,70);
 el.src='https://www.youtube.com/embed/'+id+'?autoplay=1&enablejsapi=1&playsinline=1&rel=0&origin='+encodeURIComponent(location.origin);
 el.referrerPolicy='strict-origin-when-cross-origin';
 el.allow='autoplay; encrypted-media; fullscreen; picture-in-picture';
 el.allowFullscreen=true;
 el.style.cssText='display:block;width:100%;height:100%;border:0;min-width:200px;min-height:200px';
 el.onload=()=>{try{el.contentWindow?.postMessage(JSON.stringify({event:'listening',id:'nullgod'}),'https://www.youtube.com')}catch(_){}};
 frame=el;box.replaceChildren(el);align();reply({state:3});
}
window.addEventListener('message',event=>{
 if(event.source===frame?.contentWindow&&/^https:\/\/(?:www\.)?youtube\.com$/.test(event.origin)){
  let data=event.data;
  if(typeof data==='string'){try{data=JSON.parse(data)}catch{return}}
  if(!data||typeof data!=='object')return;
  if(data.event==='onStateChange'&&Number.isInteger(data.info))reply({state:data.info});
  if(data.event==='onError')reply({error:String(data.info??'Riproduzione non disponibile')});
  if(data.event==='infoDelivery'&&data.info&&typeof data.info==='object'){
   const t=Number(data.info.currentTime),duration=Number(data.info.duration),now=Date.now();
   if(Number.isFinite(t)&&now-lastPosition>400){lastPosition=now;reply({time:t,duration:Number.isFinite(duration)?duration:0})}
   if(Number.isInteger(data.info.playerState))reply({state:data.info.playerState});
  }
  return;
 }
 const f=appFrame();if(!f||event.source!==f.contentWindow||!trusted())return;
 const d=event.data;if(!d||d.type!==TYPE||typeof d.action!=='string')return;
 if(d.action==='hello'){f.contentWindow.postMessage({type:READY},'*');return}
 if(d.action==='slot'){
  if(d.rect&&['left','top','width','height'].every(k=>Number.isFinite(d.rect[k]))){
   slot=Object.fromEntries(['left','top','width','height'].map(k=>[k,Number(d.rect[k])]));align();
  }return;
 }
 if(d.action==='play'){if(validId.test(d.videoId||''))play(d.videoId,d.title);return}
 if(d.action==='stop'){stop();return}
 if(d.action==='command'){command(d.command,d.args);return}
});
window.addEventListener('resize',align,{passive:true});
window.addEventListener('scroll',align,{passive:true,capture:true});
window.addEventListener('pagehide',stop);
})();
