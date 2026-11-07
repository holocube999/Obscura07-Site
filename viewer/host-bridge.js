/* Browser capabilities delegated to selected GitHub clients in opaque iframes.
 * No GitHub credentials or raw media tracks are ever sent into guest code.
 */
(()=>{'use strict';
let frame=null,channel='',camera=null,video=null,panel=null,tick=null,busy=false;
function current(){return frame?.contentWindow||null}
function send(data,transfer){const w=current();if(!w)return;try{w.postMessage({...data,channel},'*',transfer||[])}catch{}}
function stopCamera(){
 activeCameraRequest++;
 if(tick){clearInterval(tick);tick=null}
 if(camera){for(const track of camera.getTracks())track.stop();camera=null}
 if(panel){panel.remove();panel=null;video=null}
 busy=false;
}
function disable(){stopCamera();frame=null;channel=''}
function enable(nextFrame,nextChannel){
 disable();
 if(!nextFrame||typeof nextChannel!=='string'||!/^s-[a-f0-9]{32}$/.test(nextChannel))throw Error('Canale bridge non valido');
 frame=nextFrame;channel=nextChannel;
}
async function digest(request){
 const id=request.id;
 if(!Number.isSafeInteger(id)||id<1||!(request.bytes instanceof ArrayBuffer)||request.bytes.byteLength>64*1024*1024){
  send({type:'SELLONE_BRIDGE_SHA_REPLY',id,error:'Buffer SHA-256 non valido'});return;
 }
 try{
  const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',request.bytes));
  const hash=Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('');
  send({type:'SELLONE_BRIDGE_SHA_REPLY',id,hash});
 }catch(error){send({type:'SELLONE_BRIDGE_SHA_REPLY',id,error:String(error.message||error)})}
}
let activeCameraRequest=0;
function ensureScannerOverlay(){
 if(panel)return;
 panel=document.createElement('div');
 panel.id='selloneQrScannerOverlay';
 panel.setAttribute('role','dialog');
 panel.setAttribute('aria-label','Lettore QR OBSCURA/TUNNEL');
 panel.style.cssText='position:fixed;inset:0;z-index:2147483000;background:#080b14f5;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:18px;color:#fff;font:15px system-ui';
 const heading=document.createElement('div');heading.textContent='OBSCURA/TUNNEL · Scansione QR';
 heading.style.cssText='font-weight:600;text-align:center';
 const detail=document.createElement('div');detail.id='selloneCameraStatus';detail.textContent='Preparazione della fotocamera…';
 detail.style.cssText='color:#b5d7d6;max-width:420px;text-align:center;font-size:13px';
 video=document.createElement('video');video.playsInline=true;video.autoplay=true;video.muted=true;
 video.style.cssText='width:min(90vw,680px);max-height:62svh;object-fit:contain;border:2px solid #57d7c2;border-radius:12px;background:#000';
 const start=document.createElement('button');start.type='button';start.id='selloneCameraActivate';
 start.textContent='Attiva fotocamera';start.style.cssText='border-radius:10px;padding:14px 20px;background:#167f77;color:white;border:1px solid #54d9c1;cursor:pointer';
 start.onclick=()=>{void acquireCamera(true)};
 const close=document.createElement('button');close.type='button';close.textContent='Chiudi scanner';close.style.cssText='border-radius:10px;padding:12px 18px;background:#30415e;color:white;border:1px solid #6e8da9;cursor:pointer';
 close.onclick=()=>{stopCamera();send({type:'SELLONE_BRIDGE_CAMERA_CLOSED'})};
 panel.append(heading,detail,video,start,close);
 document.body.append(panel);
}
function scanStatus(message){const detail=panel?.querySelector('#selloneCameraStatus');if(detail)detail.textContent=message}
async function acquireCamera(userGesture){
 if(camera||!panel)return;
 const generation=activeCameraRequest;
 const button=panel.querySelector('#selloneCameraActivate');
 if(button){button.disabled=true;button.textContent='Apertura fotocamera…'}
 scanStatus('Richiesta accesso alla fotocamera…');
 if(!navigator.mediaDevices?.getUserMedia){
  scanStatus('Fotocamera non disponibile nel browser o permesso negato.');
  send({type:'SELLONE_BRIDGE_CAMERA_ERROR',error:'getUserMedia non disponibile'});
  if(button){button.disabled=false;button.textContent='Riprova fotocamera'}
  return;
 }
 try{
  const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'}}});
  if(generation!==activeCameraRequest||!panel||!current()){stream.getTracks().forEach(t=>t.stop());return}
  camera=stream;video.srcObject=camera;
  await video.play();
  if(generation!==activeCameraRequest)return;
  scanStatus('Inquadra il codice QR sull’altro dispositivo.');
  if(button)button.hidden=true;
  send({type:'SELLONE_BRIDGE_CAMERA_OPENED'});
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});
  tick=setInterval(()=>{
   if(!video||busy||video.readyState<2||!ctx)return;
   busy=true;
   try{
    const w=video.videoWidth,h=video.videoHeight,scale=Math.min(1,720/Math.max(w,h));
    canvas.width=Math.max(1,Math.floor(w*scale));canvas.height=Math.max(1,Math.floor(h*scale));
    ctx.drawImage(video,0,0,canvas.width,canvas.height);
    const image=ctx.getImageData(0,0,canvas.width,canvas.height);
    send({type:'SELLONE_BRIDGE_CAMERA_FRAME',width:canvas.width,height:canvas.height,pixels:image.data},[image.data.buffer]);
   }catch{}finally{busy=false}
  },450);
 }catch(error){
  if(generation!==activeCameraRequest)return;
  const message=String(error?.message||error);
  scanStatus('Fotocamera non avviata: '+message+'. Tocca «Attiva fotocamera» per riprovare.');
  if(button){button.disabled=false;button.hidden=false;button.textContent='Attiva fotocamera'}
  // Keep the scanner visible: on Android a parent-frame user gesture may be required.
  // Report the error only if a direct user gesture also failed.
  if(userGesture)send({type:'SELLONE_BRIDGE_CAMERA_ERROR',error:message});
 }
}
async function startCamera(){
 ensureScannerOverlay();
 if(camera){send({type:'SELLONE_BRIDGE_CAMERA_OPENED'});return}
 if(!panel)return;
 await acquireCamera(false);
}
window.addEventListener('message',e=>{
 if(!frame||e.source!==current()||!e.data||e.data.channel!==channel)return;
 const msg=e.data;
 if(msg.type==='SELLONE_BRIDGE_SHA_REQUEST'){void digest(msg);return}
 if(msg.type==='SELLONE_BRIDGE_CAMERA_START'){void startCamera();return}
 if(msg.type==='SELLONE_BRIDGE_CAMERA_STOP'){stopCamera();return}
});
window.addEventListener('pagehide',stopCamera);
window.SelloneBridgeHost=Object.freeze({enable,disable});
})();