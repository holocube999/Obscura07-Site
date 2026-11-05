/* First-party integration of the independent Random[null]Radio component.
   Never assumes that browsers permit audible autoplay. */
import {mount} from './widget.js';

function setupSiteDock(){
 const host=document.getElementById('siteRadioDock');
 const widget=document.getElementById('siteRadioWidget');
 const toggle=document.getElementById('siteRadioToggle');
 const panel=document.getElementById('siteRadioPanel');
 if(!host||!widget||!toggle||!panel)return;
 const radio=mount(widget,{style:'darkambient',duration:120,withVox:false,
                           volume:0.045,autonext:true,readQuery:false});
 radio.setVolume(0.045); // low ambient gain, below main site content
 let busy=false,interacted=false;
 function expand(open){
  panel.hidden=!open;
  toggle.setAttribute('aria-expanded',String(open));
  toggle.title=open?'Nascondi la radio':'Apri la radio';
 }
 function label(text){toggle.querySelector('.site-radio-label').textContent=text}
 function attempt(){
  if(busy||radio.playing)return;
  busy=true;
  Promise.resolve(radio.start()).then(()=>{
   if(radio.playing){label('♫ RADIO · LIVE');host.dataset.playing='true'}
   else label('♫ RADIO · PLAY');
  }).catch(()=>{
   label('♫ RADIO · PLAY');
  }).finally(()=>{busy=false});
 }
 toggle.addEventListener('click',()=>{
  expand(panel.hidden);
  interacted=true;
  attempt();
 });
 // Autostart is best effort; Web Audio in modern browsers generally needs
 // a user activation. We queue a quiet start at page entry, and retry at
 // the first user gesture without hijacking any of the site's click targets.
 attempt();
 const activate=()=>{
  if(interacted||radio.playing)return;
  interacted=true;
  attempt();
 };
 window.addEventListener('pointerdown',activate,{once:true,capture:true});
 window.addEventListener('keydown',activate,{once:true,capture:true});
 document.addEventListener('visibilitychange',()=>{
  if(!document.hidden&&radio.playing)label('♫ RADIO · LIVE');
 });
 expand(false);
}
if(document.readyState==='loading')
 document.addEventListener('DOMContentLoaded',setupSiteDock,{once:true});
else setupSiteDock();
