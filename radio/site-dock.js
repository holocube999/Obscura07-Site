/* The host page ONLY embeds Random[null]Radio. Audio/synthesis live inside
   an isolated iframe; this adapter positions the chip clear of the site menu. */
function installRadioDock(){
 const dock=document.getElementById('siteRadioDock');
 const toggle=document.getElementById('siteRadioToggle');
 const panel=document.getElementById('siteRadioPanel');
 const iframe=document.getElementById('siteRadioFrame');
 const nav=document.getElementById('navigation');
 const menu=document.getElementById('menu-toggle');
 const header=document.getElementById('top');
 if(!dock||!toggle||!panel||!iframe)return;
 const label=toggle.querySelector('.site-radio-label');
 let expanded=false;
 function align(){
  const menuOpen=!!(nav?.classList.contains('open')||
                     menu?.getAttribute('aria-expanded')==='true');
  // The navigation takes absolute priority over the radio, on all viewports.
  dock.hidden=menuOpen;
  if(menuOpen){
   expanded=false;panel.hidden=true;
   toggle.setAttribute('aria-expanded','false');
   return;
  }
  // The header is not fixed but still occupies the top-right of the page.
  const headBottom=header?.getBoundingClientRect().bottom||0;
  const offset=Math.max(92,Math.min(146,headBottom+12));
  dock.style.top=offset+'px';
  panel.style.maxHeight=Math.max(100,window.innerHeight-offset-16)+'px';
 }
 function setExpanded(open){
  expanded=!!open;
  panel.hidden=!expanded;
  toggle.setAttribute('aria-expanded',String(expanded));
  align();
 }
 function wakeRadio(){
  iframe.contentWindow?.postMessage({type:'randomnullradio:start'},location.origin);
 }
 toggle.addEventListener('click',()=>{
  setExpanded(!expanded);
  if(expanded)wakeRadio();
 });
 window.addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==iframe.contentWindow)return;
  if(!event.data||event.data.type!=='randomnullradio:status')return;
  const playing=event.data.state==='playing';
  dock.dataset.playing=String(playing);
  label.textContent=playing?'♫ RADIO · LIVE':'♫ RADIO · PLAY';
 });
 // Navigation may be toggled after loading, not just on initial layout.
 menu?.addEventListener('click',()=>queueMicrotask(align));
 nav?.addEventListener('click',()=>queueMicrotask(align));
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape'){if(expanded)setExpanded(false);queueMicrotask(align)}
 });
 window.addEventListener('resize',align,{passive:true});
 window.addEventListener('scroll',align,{passive:true});
 setExpanded(false);
}
if(document.readyState==='loading'){
 document.addEventListener('DOMContentLoaded',installRadioDock,{once:true});
}else installRadioDock();
