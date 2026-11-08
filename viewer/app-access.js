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
  guest.removeAttribute('srcdoc');guest.src='about:blank';
  // Replacing the current URL with itself may be a no-op: require a fresh
  // document, clearing in-memory authorization and pending GitHub loaders.
  const next=new URL(location.href);next.searchParams.set('app','1');
  next.searchParams.set('accessReset',String(Date.now()));
  location.replace(next.href);
 });
}
if(q.get('app')!=='1'||(q.get('repo')||'').toLowerCase()!=='nullgod-music')return;
const KEY='obscura-nullgod-access-v1',GH=window.SelloneGitHub;
let saved='';
try{saved=localStorage.getItem(KEY)||''}catch{}
if(saved)GH.setToken(saved,'',false).catch(()=>{});
const gate=document.createElement('section');
gate.id='appAccess';
gate.innerHTML='<form><div class="accessBrand">[NULL]GOD <small>/ m u s i c</small></div><label for="appAccessToken">Token d’accesso</label><input id="appAccessToken" type="password" autocomplete="off" spellcheck="false" required><button type="submit">Entra</button><p role="status" id="appAccessError"></p></form>';
document.body.append(gate);
gate.hidden=!!saved;
if(q.has('accessReset')&&!saved){
 const notice=document.getElementById('appAccessError');
 notice.textContent='Token cancellato.';
 notice.style.color='#9fd7b0';
}

let submitting=false;
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
 }else if(status===403){show('Accesso temporaneamente non disponibile. Riprova.')}
});
gate.querySelector('form').addEventListener('submit',async event=>{
 event.preventDefault();if(submitting)return;
 const input=document.getElementById('appAccessToken'),value=input.value.trim();
 if(value.length<16){document.getElementById('appAccessError').textContent='Token non valido.';return}
 submitting=true;gate.querySelector('button').disabled=true;
 try{
  await GH.setToken(value,'',false);
  await GH.discover('NULLGOD-MUSIC');
  // Persistence is requested explicitly by the user. This is local storage,
  // not unextractable encryption; never embed shared credentials into an APK.
  localStorage.setItem(KEY,value);
  input.value='';gate.hidden=true;location.reload();
 }catch(e){
  const status=e.status;
  document.getElementById('appAccessError').textContent=status===401||status===404?
   'Token non valido o senza accesso.':status===403?'Accesso temporaneamente non disponibile.':'Connessione non disponibile. Riprova.';
 }finally{submitting=false;gate.querySelector('button').disabled=false}
});
})();