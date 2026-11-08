/* Dedicated private app access. Credentials remain exclusively in the trusted
 parent and are never sent to srcdoc, URLs, application logs or exports. */
(()=>{'use strict';
const q=new URLSearchParams(location.search);
if((q.get('repo')||'').toLowerCase()==='nullgod-music'){
 window.addEventListener('message',event=>{
  const guest=document.getElementById('playframe');
  if(event.source!==guest?.contentWindow||event.data?.type!=='NULLGOD_FORGET_ACCESS_V1')return;
  localStorage.removeItem('obscura-nullgod-access-v1');
  window.SelloneGitHub.forget();
  guest.contentWindow?.postMessage({type:'NULLGOD_FORGET_ACCESS_ACK_V1'},'*');
  const notice=document.createElement('div');
  notice.setAttribute('role','status');
  notice.textContent='✓ Token cancellato';
  notice.style.cssText='position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;background:#09080df5;color:#b5d5bd;font:500 16px system-ui';
  document.body.append(notice);
  // Replacing the current URL with itself may be a no-op: require a fresh
  // document, clearing in-memory authorization and pending GitHub loaders.
  const next=new URL(location.href);next.searchParams.set('app','1');
  next.searchParams.set('accessReset',String(Date.now()));
  setTimeout(()=>{guest.removeAttribute('srcdoc');guest.src='about:blank';location.replace(next.href)},900);
 });
}
if(q.get('app')!=='1'||(q.get('repo')||'').toLowerCase()!=='nullgod-music')return;
const KEY='obscura-nullgod-access-v1',GH=window.SelloneGitHub;
let saved='';
try{saved=localStorage.getItem(KEY)||''}catch{}
if(saved)GH.setToken(saved,'',false).catch(()=>{});
const gate=document.createElement('section');
gate.id='appAccess';
gate.innerHTML='<form><div class="accessBrand"><span class="accessStudio">[NULL]GOD</span><span class="accessProduct"><span class="accessSlash">/</span> Spotifree</span><small class="accessMusic">m u s i c</small></div><label for="appAccessToken">Token d’accesso</label><input id="appAccessToken" type="password" autocomplete="off" spellcheck="false" required><button type="submit">Entra</button><p role="status" id="appAccessError"></p></form>';
document.body.append(gate);
gate.hidden=!!saved;
if(q.has('accessReset')&&!saved){
 const notice=document.getElementById('appAccessError');
 notice.textContent='Token cancellato.';
 notice.style.color='#9fd7b0';
}


function accessMessage(error){
 if(error?.reason)return error.message;
 if(error?.status===401)return 'Token scaduto o revocato.';
 if(error?.status===404)return 'Questo token non ha accesso a NULLGOD-MUSIC.';
 if(error?.status===403)return 'GitHub rifiuta l’accesso: verifica Contents → Read-only per NULLGOD-MUSIC.';
 return 'Connessione non disponibile. Riprova.';
}

let submitting=false,cooldownUntil=0,cooldownTimer=0;
function setCooldown(error){
 if(error?.reason!=='rate_limit')return;
 cooldownUntil=Number(error.retryAt)>Date.now()?Number(error.retryAt):Date.now()+60000;
 clearTimeout(cooldownTimer);gate.querySelector('button').disabled=true;
 cooldownTimer=setTimeout(()=>{cooldownUntil=0;gate.querySelector('button').disabled=cooldownUntil>Date.now()},Math.min(2147483647,cooldownUntil-Date.now()+500));
}
function show(message=''){
 gate.hidden=false;
 document.getElementById('appAccessError').textContent=message;
 document.getElementById('appAccessToken').value='';
 document.getElementById('playframe').srcdoc='';
 document.getElementById('appAccessToken').focus();
}
window.addEventListener('sellone:access-error',e=>{
 const status=e.detail?.status;
 // 403 may be rate limiting, never discard a remembered token for this.
 if(status===401||status===404){
  try{localStorage.removeItem(KEY)}catch{}
  GH.forget();show('Accesso non disponibile. Inserisci un token valido.');
 }else if(status===403||status===429){show(accessMessage(e.detail));setCooldown(e.detail)}
});
gate.querySelector('form').addEventListener('submit',async event=>{
 event.preventDefault();if(submitting||cooldownUntil>Date.now())return;
 const input=document.getElementById('appAccessToken'),value=input.value.trim();
 if(value.length<16){document.getElementById('appAccessError').textContent='Token non valido.';return}
 submitting=true;gate.querySelector('button').disabled=true;
 try{
  await GH.setToken(value,'',false);
  await GH.discover('NULLGOD-MUSIC');
  // Persistence is requested explicitly by the user. This is local storage,
  // not unextractable encryption; never embed shared credentials into an APK.
  localStorage.setItem(KEY,value);
  input.value='';gate.hidden=true;document.getElementById('loadLatest').click();
 }catch(e){
  const status=e.status;
  document.getElementById('appAccessError').textContent=accessMessage(e);setCooldown(e);
 }finally{submitting=false;gate.querySelector('button').disabled=false}
});
})();