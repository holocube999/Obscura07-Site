// OBSCURA/TUNNEL: static WebRTC file-transfer client.
// No external application server, upload endpoint, persistent storage or dependency.
// Signaling is manually exchanged; STUN is optional and is not a file relay.
const $=id=>document.getElementById(id);
// Cryptographically random identifiers also work where randomUUID is omitted by browsers.
function secureUUID(){
 if(typeof crypto.randomUUID==='function')return crypto.randomUUID();
 if(typeof crypto.getRandomValues!=='function')throw Error('Generazione casuale sicura non disponibile: usa HTTPS/localhost.');
 const v=crypto.getRandomValues(new Uint8Array(16));
 v[6]=(v[6]&15)|64;v[8]=(v[8]&63)|128;
 const h=Array.from(v,x=>x.toString(16).padStart(2,'0')).join('');
 return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);
}

const MAX=64*1024*1024, CHUNK=16*1024, HIGH=512*1024;
let peer=null, channel=null, role='', sending=false, receive=null;
const downloadUrls=[];
const pendingAcks=new Map();
let sendQueue=Promise.resolve();
function queueFile(file){
 const task=sendQueue.catch(()=>{}).then(()=>sendFile(file));
 sendQueue=task;
 return task;
}
function rejectPending(reason){
 for(const [id,p] of pendingAcks){clearTimeout(p.timer);p.reject(Error(reason));pendingAcks.delete(id)}
}
function status(message,error=false){
 $('state').textContent=message;
 $('state').style.borderLeftColor=error?'#e97c79':'#6ebeb2';
}
function connected(){
 return channel&&channel.readyState==='open'&&peer&&peer.connectionState==='connected';
}
function buttons(){
 $('send').disabled=!connected()||sending||!selectedEntries().some(e=>selectedIds.has(e.id));
 $('share').disabled=!connected()||!selectedEntries().some(e=>selectedIds.has(e.id));
}
function destroy(){
 rejectPending('Connessione chiusa durante il trasferimento.');
 stopHeartbeat();remotePresent=false;presenceStatus();
 if(typeof remoteCatalog!=='undefined'){remoteCatalog=[];shareMap.clear();$('theirLabel').textContent='In attesa';renderFiles()};
 if(channel){channel.close();channel=null}
 if(peer){peer.close();peer=null}
 receive=null;role='';sending=false;
 $('sent').value=0;$('received').value=0;
 buttons();
}
function createPeer(initiator){
 if(!window.isSecureContext||!crypto.subtle)throw Error('Web Crypto non disponibile nel WebPlayer isolato: scarica e apri la versione autonoma su HTTPS/localhost.');
 destroy();
 if(typeof RTCPeerConnection!=='function')throw Error('WebRTC non supportato da questo browser.');
 const iceServers=$('stun').checked?[{urls:['stun:stun.l.google.com:19302','stun:stun.cloudflare.com:3478']}]:[];
 const turn=$('turnUrl').value.trim();if(turn){if(!/^turns?:[^\s]+$/i.test(turn))throw Error('URL TURN non valido');iceServers.push({urls:turn,username:$('turnUser').value,credential:$('turnPassword').value})}
 peer=new RTCPeerConnection({iceServers});
 role=initiator?'offerer':'answerer';
 peer.onconnectionstatechange=()=>{
  const s=peer?.connectionState||'closed';
  if(s==='connected')status('Canale WebRTC collegato: pronto per il trasferimento.');
  else if(s==='failed'||s==='disconnected')status('Connessione interrotta o NAT incompatibile ('+s+').',true);
  wizard();buttons();
 };
 peer.onicecandidateerror=()=>{if(peer?.connectionState==='failed')status('ICE non disponibile: verifica STUN/TURN e firewall.',true)};
 peer.ondatachannel=e=>attachChannel(e.channel);
 if(initiator)attachChannel(peer.createDataChannel('obscura-transfer',{ordered:true}));
 return peer;
}
function attachChannel(value){
 channel=value;
 channel.binaryType='arraybuffer';
 channel.bufferedAmountLowThreshold=HIGH/2;
 channel.onopen=()=>{
  status('Canale WebRTC aperto; connessione cifrata DTLS.');
  announcePresence();startHeartbeat();presenceStatus();wizard();
  buttons();
 };
 channel.onclose=()=>{rejectPending('Canale chiuso.');stopHeartbeat();presenceStatus();wizard();status('Canale trasferimento chiuso.');buttons()};
 channel.onerror=()=>status('Errore nel DataChannel.',true);
 channel.onmessage=onMessage;
 buttons();
}
function signalFromRemote(expected){
 const text=$('remote').value.trim();
 if(!text||text.length>512000)throw Error('Segnale assente o troppo grande.');
 let packet;
 try{packet=JSON.parse(text)}catch{throw Error('Il segnale non è JSON valido.')}
 if(!packet||packet.type!==expected||typeof packet.sdp!=='string'||
    packet.sdp.length<40||packet.sdp.length>500000||
    !packet.sdp.startsWith('v=0'))throw Error('Segnale '+expected+' non valido.');
 return {type:packet.type,sdp:packet.sdp};
}
function completeIce(p,timeout=20000){
 if(p.iceGatheringState==='complete')return Promise.resolve();
 return new Promise((resolve,reject)=>{
  const t=setTimeout(()=>{cleanup();reject(Error('Raccolta ICE incompleta: riprova o configura un TURN.'))},timeout);
  function changed(){if(p.iceGatheringState==='complete'){cleanup();resolve()}}
  function cleanup(){clearTimeout(t);p.removeEventListener('icegatheringstatechange',changed)}
  p.addEventListener('icegatheringstatechange',changed);
  changed();
 });
}
async function localOffer(){
 const p=createPeer(true);
 status('Creo offerta e raccolgo i candidati ICE…');
 await p.setLocalDescription(await p.createOffer());
 await completeIce(p);
 $('local').value=JSON.stringify(p.localDescription);
 status('Offerta pronta. Copiala e inviala all’altro dispositivo (B).');
}
async function remoteOffer(){
 const offer=signalFromRemote('offer');
 const p=createPeer(false);
 status('Accetto offerta e preparo la risposta ICE…');
 await p.setRemoteDescription(offer);
 await p.setLocalDescription(await p.createAnswer());
 await completeIce(p);
 $('local').value=JSON.stringify(p.localDescription);
 status('Risposta pronta. Copiala sul dispositivo A e premi Applica risposta.');
}
async function remoteAnswer(){
 if(!peer||role!=='offerer'||peer.signalingState!=='have-local-offer')
  throw Error('Prima crea un’offerta sul dispositivo A.');
 await peer.setRemoteDescription(signalFromRemote('answer'));
 status('Risposta applicata. Attendo collegamento WebRTC…');
}
function hex(bytes){return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('')}
async function sha256(bytes){
 const digest=await crypto.subtle.digest('SHA-256',bytes);
 return hex(new Uint8Array(digest));
}
function safeName(name){
 return String(name||'file').replace(/[\\/\x00-\x1f\x7f]/g,'_').slice(0,180)||'file';
}
function lowWater(){
 if(!channel||channel.readyState!=='open')return Promise.reject(Error('Canale non disponibile.'));
 if(channel.bufferedAmount<=HIGH)return Promise.resolve();
 return new Promise((resolve,reject)=>{
  const t=setTimeout(()=>{cleanup();reject(Error('Invio bloccato: nessuna finestra di trasporto.'))},20000);
  function cleanup(){clearTimeout(t);channel?.removeEventListener('bufferedamountlow',ready)}
  function ready(){cleanup();resolve()}
  channel.addEventListener('bufferedamountlow',ready,{once:true});
 });
}
async function sendFile(fileOverride){
 const file=fileOverride&&typeof fileOverride.slice==='function'?fileOverride:$('files').files[0];
 if(!connected()||!file)throw Error('Canale non pronto o file assente.');
 if(sending)throw Error('Trasferimento già in corso.');
 if(file.size>MAX)throw Error('Il limite attuale è 64 MiB per file.');
 sending=true;buttons();
 try{
  status('Calcolo SHA-256 locale prima dell’invio…');
  const hash=await sha256(await file.arrayBuffer());
  const id=secureUUID();
  if(!connected())throw Error('Connessione chiusa.');
  const ack=new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>{pendingAcks.delete(id);reject(Error('Conferma del destinatario non ricevuta.'))},120000);
   pendingAcks.set(id,{resolve,reject,timer});
  });
  channel.send(JSON.stringify({t:'file',id,name:safeName(file.name),size:file.size,sha256:hash}));
  let cursor=0;
  while(cursor<file.size){
   await lowWater();
   if(!connected())throw Error('Connessione interrotta durante l’invio.');
   const bytes=await file.slice(cursor,Math.min(cursor+CHUNK,file.size)).arrayBuffer();
   channel.send(bytes);cursor+=bytes.byteLength;
   $('sent').value=Math.floor(cursor*100/file.size);
  }
  await lowWater();
  channel.send(JSON.stringify({t:'done',id}));
  $('sent').value=100;
  status('File inviato: in attesa della verifica SHA-256 del destinatario.');
  try{await ack}finally{const waiting=pendingAcks.get(id);if(waiting){clearTimeout(waiting.timer);pendingAcks.delete(id)}}
  status('Destinatario: SHA-256 verificato.');
 }finally{sending=false;buttons()}
}
async function receiveFinished(packet){
 if(!receive||packet.id!==receive.id)throw Error('Chiusura trasferimento non valida.');
 const task=receive;
 receive=null;
 if(task.bytes!==task.size)throw Error('Trasferimento incompleto: dimensione errata.');
 const blob=new Blob(task.chunks,{type:'application/octet-stream'});
 const hash=await sha256(await blob.arrayBuffer());
 if(hash!==task.sha256)throw Error('SHA-256 non corrispondente: download rifiutato.');
 const a=document.createElement('a');
 const url=URL.createObjectURL(blob);
 downloadUrls.push(url);
 a.href=url;a.download=task.name;a.textContent='⬇ Scarica '+task.name+' · SHA-256 verificato';
 a.rel='noopener';
 $('downloads').prepend(a);
 $('received').value=100;
 status('Ricezione completata: '+task.name+' · SHA-256 verificato.');
 channel?.readyState==='open'&&channel.send(JSON.stringify({t:'ack',id:task.id}));
}
function onMessage(event){
 try{
  if(handleExtraMessage(event))return;
  if(typeof event.data==='string'){
   const msg=JSON.parse(event.data);
   if(!msg||typeof msg!=='object')throw Error('Messaggio P2P non valido.');
   if(msg.t==='file'){
    if(receive||typeof msg.id!=='string'||!(/^[a-f0-9-]{36}$/i).test(msg.id)||
       typeof msg.name!=='string'||msg.name.length>180||
       !Number.isInteger(msg.size)||msg.size<0||msg.size>MAX||
       typeof msg.sha256!=='string'||!(/^[a-f0-9]{64}$/i).test(msg.sha256))
     throw Error('Header file P2P respinto.');
    receive={id:msg.id,name:safeName(msg.name),size:msg.size,
             sha256:msg.sha256.toLowerCase(),bytes:0,chunks:[]};
    $('received').value=0;
    status('Ricezione '+receive.name+' in corso…');
   }else if(msg.t==='done'){
    receiveFinished(msg).catch(e=>{status('Integrità fallita: '+e.message,true);if(channel?.readyState==='open')channel.send(JSON.stringify({t:'nack',id:msg.id,reason:'integrity'}))});
   }else if(msg.t==='ack'||msg.t==='nack'){
    const waiting=pendingAcks.get(msg.id);
    if(waiting){clearTimeout(waiting.timer);pendingAcks.delete(msg.id);if(msg.t==='ack')waiting.resolve();else waiting.reject(Error('Il destinatario ha rifiutato il file.'))}
   }else throw Error('Operazione P2P non riconosciuta.');
  }else if(event.data instanceof ArrayBuffer){
   if(!receive)throw Error('Dati senza header.');
   if(event.data.byteLength>CHUNK||receive.bytes+event.data.byteLength>receive.size)
    throw Error('Chunk o dimensione non valida.');
   receive.chunks.push(new Uint8Array(event.data));
   receive.bytes+=event.data.byteLength;
   $('received').value=receive.size?
    Math.floor(receive.bytes*100/receive.size):100;
  }else throw Error('Formato P2P non supportato.');
 }catch(error){
  const id=receive?.id;receive=null;
  if(id&&channel?.readyState==='open')channel.send(JSON.stringify({t:'nack',id,reason:'invalid-transfer'}));
  status('Trasferimento rifiutato: '+error.message,true);
 }
}
function guard(fn){return ()=>Promise.resolve().then(fn).catch(e=>status(e.message,true))}
$('offer').onclick=guard(localOffer);
$('answer').onclick=guard(remoteOffer);
$('apply').onclick=guard(remoteAnswer);
$('disconnect').onclick=()=>{destroy();status('Disconnesso.')};
$('files').onchange=buttons;
$('send').onclick=guard(sendFile);
$('copy').onclick=guard(async()=>{
 const value=$('local').value;if(!value)throw Error('Nessun segnale generato.');
 await navigator.clipboard.writeText(value);
 status('Segnale copiato negli appunti.');
});
window.addEventListener('pagehide',()=>{
 destroy();
 for(const url of downloadUrls)URL.revokeObjectURL(url);
});
if(!window.isSecureContext||!crypto.subtle){
 status('Il WebPlayer in iframe isolato non fornisce Web Crypto: scarica la versione autonoma dal Viewer e aprila in una scheda locale sicura o su HTTPS/localhost.',true);
 for(const id of ['offer','answer','apply','next'])$(id).disabled=true;
}

// Guided connection and share catalog, without server-side accounts.
const identityId=secureUUID();
let avatarNonce=secureUUID(),remotePresent=false,remoteLast=0,heartbeat=null;
let remoteClockOffset=0,remoteClockZone='UTC';
let selectedSource=[],remoteCatalog=[],shareMap=new Map(),mode='',step=0;
const selectedIds=new Set();
function revokeShared(){
 if(!shareMap.size)return;
 shareMap.clear();
 if(channel?.readyState==='open')channel.send(JSON.stringify({t:'catalog',entries:[]}));
 status('Condivisione precedente revocata: premi Condividi per aggiornarla.');
}
const adjectives=['Nebula','Glitch','Moss','Null','Razor','Echo','Vanta','Cosmic','Rust','Feral'];
const beings=['Moth','Wolf','Goblin','Signal','Heron','Specter','Comet','Cactus','Frog','Orbit'];
function randomNickname(){const x=new Uint32Array(2);crypto.getRandomValues(x);return adjectives[x[0]%10]+beings[x[1]%10]+'-'+x[0].toString(36).toUpperCase().slice(-6)}
function avatar(id,nonce,nick=''){
 let h=2166136261;for(const c of id+nonce+nick)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;
 const rnd=()=>{h=(Math.imul(h,1664525)+1013904223)>>>0;return h/4294967296};
 const kind=Math.floor(rnd()*7),hue=Math.floor(rnd()*360),skin=Math.floor(rnd()*360),eyes=kind===1||kind===2?1+Math.floor(rnd()*5):2;
 let art='<circle cx="72" cy="25" r="16" fill="#f0e0fa" opacity=".5"/><path d="M0 78L22 53 36 71 56 43 78 62 96 47V96H0" fill="#132b37"/>';
 if(kind!==5){art+='<path d="M16 96Q14 70 32 66Q20 40 29 24Q49 4 69 24Q78 42 64 66Q84 71 84 96" fill="hsl('+skin+',40%,55%)" stroke="#161629" stroke-width="3"/>';
 for(let i=0;i<eyes;i++){const x=eyes===1?48:32+i*33/(eyes-1);art+='<ellipse cx="'+x+'" cy="'+(40+rnd()*10)+'" rx="'+(3+rnd()*4)+'" ry="5" fill="#101827"/>'}
 art+='<path d="M37 60Q48 '+(kind===2?74:64)+' 59 60" stroke="#322037" stroke-width="3" fill="none"/>';
 if(kind===4||kind===6)art+='<path d="M45 18L72 30 62 62 47 70Z" fill="#1bbaca" opacity=".55"/>';
 if(kind===3)art+='<path d="M30 28L23 9 43 20M62 20L77 9 69 28" stroke="#c8aa78" stroke-width="9" fill="none"/>';
 if(kind===1||kind===2)art+='<path d="M31 24L20 6M65 24L78 6" stroke="#acdaab" stroke-width="6"/>';
 }
 const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="15" fill="hsl('+hue+',48%,24%)"/>'+art+'</svg>';
 return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
$('nick').value=randomNickname();
function me(){return {id:identityId,nick:$('nick').value.trim().slice(0,40)||'Ospite',nonce:avatarNonce}}
function updateIdentity(){const p=me();$('myLabel').textContent=p.nick;$('myAvatar').src=avatar(p.id,p.nonce,p.nick);announcePresence()}
$('nick').oninput=updateIdentity;
$('randomNick').onclick=()=>{$('nick').value=randomNickname();updateIdentity()};
$('randomAvatar').onclick=()=>{avatarNonce=secureUUID();updateIdentity()};
function presenceStatus(){const online=connected()&&remotePresent&&Date.now()-remoteLast<15000;$('myLed').className='led '+(connected()?'online':'');$('theirLed').className='led '+(online?'online':connected()?'wait':'');if(!connected())$('theirTime').textContent='Non collegato'}
function announcePresence(){if(channel?.readyState!=='open')return;const p=me();channel.send(JSON.stringify({t:'presence',id:p.id,nick:p.nick,nonce:p.nonce,time:Date.now(),zone:Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'}))}
function startHeartbeat(){stopHeartbeat();heartbeat=setInterval(announcePresence,5000)}
function stopHeartbeat(){if(heartbeat)clearInterval(heartbeat);heartbeat=null}
setInterval(()=>{$('myTime').textContent=new Date().toLocaleTimeString();if(remotePresent&&Date.now()-remoteLast<15000){try{$('theirTime').textContent=new Date(Date.now()+remoteClockOffset).toLocaleTimeString('it',{timeZone:remoteClockZone})+' · '+remoteClockZone}catch{}}presenceStatus()},1000);updateIdentity();
const excludedFolders=new Set();
function selectedEntries(){return selectedSource.filter(e=>{const bits=e.path.split('/');if(!$('subfolders').checked&&bits.length>2)return false;return ![...excludedFolders].some(folder=>e.path.startsWith(folder+'/'))})}
function renderFolderChoices(){const box=$('folderChoices');box.replaceChildren();excludedFolders.clear();const folders=new Set();for(const e of selectedSource){const bits=e.path.split('/');for(let n=2;n<bits.length;n++)folders.add(bits.slice(0,n).join('/'))} $('folderDetails').hidden=!folders.size;for(const dir of [...folders].sort()){const label=document.createElement('label');const check=document.createElement('input');check.type='checkbox';check.checked=true;check.onchange=()=>{if(check.checked)excludedFolders.delete(dir);else excludedFolders.add(dir);revokeShared();renderFiles()};label.append(check,document.createTextNode(' '+dir));box.append(label)}}
function collect(input){revokeShared();selectedSource=[...input.files].map((file,i)=>({id:secureUUID(),file,path:file.webkitRelativePath||file.name,name:file.name,size:file.size}));selectedIds.clear();for(const e of selectedSource)selectedIds.add(e.id);renderFolderChoices();renderFiles()}
$('files').onchange=()=>collect($('files'));$('folder').onchange=()=>collect($('folder'));
$('subfolders').onchange=()=>{revokeShared();renderFiles()};$('search').oninput=renderFiles;$('previews').onchange=renderFiles;
function match(path,q){if(!q)return true;if(!q.includes('%')&&!q.includes('_'))return path.toLowerCase().includes(q.toLowerCase());let pat='';for(const c of q){if(c==='%')pat+='.*';else if(c==='_')pat+='.';else pat+=/[.*+?^${}()|[\]\\]/.test(c)?'\\'+c:c}try{return new RegExp(pat,'i').test(path)}catch{return path.toLowerCase().includes(q.toLowerCase())}}
function renderFiles(){
 const area=$('fileList');area.replaceChildren();const q=$('search').value.trim();let previewBudget=12;
 const arr=selectedEntries().map(e=>({...e,remote:false})).concat(remoteCatalog.map(e=>({...e,remote:true})));
 for(const e of arr.filter(e=>match(e.path,q)).slice(0,500)){
 const line=document.createElement('div');line.className='item';
 if(e.remote){const b=document.createElement('button');b.textContent='↓';b.title='Richiedi';b.disabled=!connected();b.onclick=()=>channel.send(JSON.stringify({t:'request',id:e.id}));line.append(b)}
 else {const b=document.createElement('input');b.type='checkbox';b.checked=selectedIds.has(e.id);b.className='pickFile';b.dataset.id=e.id;b.onchange=()=>{if(b.checked)selectedIds.add(e.id);else selectedIds.delete(e.id);revokeShared();buttons()};line.append(b)}
 if(!e.remote&&$('previews').checked&&previewBudget-- > 0)previewLocal(e,line);
 const name=document.createElement('span');name.className='filename';name.textContent=(e.remote?'Peer · ':'')+e.path;line.append(name);
 const sz=document.createElement('small');sz.textContent=(e.size/1024).toFixed(0)+' KiB';line.append(sz);area.append(line)}
 buttons();
}
$('share').onclick=guard(()=>{const entries=selectedEntries().filter(e=>selectedIds.has(e.id)&&e.size<=MAX);if(entries.length>10000)throw Error('Massimo 10.000 file');shareMap=new Map(entries.map(e=>[e.id,e]));const p=JSON.stringify({t:'catalog',entries:entries.map(e=>({id:e.id,path:e.path.slice(0,240),name:safeName(e.name),size:e.size}))});if(p.length>1024*1024)throw Error('Catalogo troppo grande');channel.send(p);status('Elenco condiviso, senza inviare il contenuto.')});
$('send').onclick=guard(async()=>{for(const item of selectedEntries().filter(e=>selectedIds.has(e.id))){await queueFile(item.file)}});
function handleExtraMessage(event){
 if(typeof event.data!=='string')return false;
 let p;try{p=JSON.parse(event.data)}catch{return false}
 if(!p||!['presence','catalog','request'].includes(p.t))return false;
 if(p.t==='presence'){
 if(typeof p.id!=='string'||p.id.length>100||typeof p.nick!=='string'||p.nick.length>40||typeof p.nonce!=='string'||p.nonce.length>100)return true;
 remotePresent=true;remoteLast=Date.now();$('theirLabel').textContent=p.nick;$('theirAvatar').src=avatar(p.id,p.nonce,p.nick);
 let zone='UTC';try{if(typeof p.zone==='string'&&p.zone.length<100){new Intl.DateTimeFormat('it',{timeZone:p.zone});zone=p.zone}}catch{}
 const time=new Date(p.time);remoteClockZone=zone;remoteClockOffset=Number.isFinite(time.getTime())?Math.max(-86400000,Math.min(86400000,time.getTime()-Date.now())):0;$('theirTime').textContent=Number.isFinite(time.getTime())?time.toLocaleTimeString('it',{timeZone:zone})+' · '+zone:'Orario non valido';presenceStatus();return true;
 }
 if(p.t==='catalog'){
 if(!Array.isArray(p.entries)||p.entries.length>10000||event.data.length>1024*1024)return true;
 remoteCatalog=p.entries.filter(e=>typeof e.id==='string'&&e.id.length<100&&typeof e.path==='string'&&e.path.length<=240&&Number.isInteger(e.size)&&e.size>=0&&e.size<=MAX).map(e=>({...e,name:safeName(e.name),path:e.path}));renderFiles();return true;
 }
 const file=shareMap.get(p.id);if(file)queueFile(file.file).catch(e=>status(e.message,true));return true;
}
function wizard(){
 const ready=!!connected();
 $('identity').hidden=!ready;
 $('transfer').hidden=!ready;
 $('advanced').hidden=!ready;
 $('connectedInfo').hidden=!ready;
 $('modePick').hidden=!!mode||ready;
 $('connectFlow').hidden=!mode||ready;
 if(ready){
  $('stepTitle').textContent='Collegato. Scegli cosa condividere.';
  $('wizardProgress').textContent='CONNESSIONE RIUSCITA';
  return;
 }
 if(!mode){
  $('stepTitle').textContent='Cosa vuoi fare?';
  $('wizardProgress').textContent='PASSO 1 · MODALITÀ';
  return;
 }
 const sender=mode!=='receive';
 const scanning=sender?step===2:step===0;
 const showing=step===1;
 $('wizardProgress').textContent='PASSO '+(step+2)+' · '+(sender?'INVIO':'RICEZIONE');
 $('signalReceive').hidden=!scanning;
 $('signalSend').hidden=!showing;
 $('qrTools').hidden=!(scanning||showing);
 $('qrScanActions').hidden=!scanning;
 $('qrDisplay').hidden=!showing;
 $('qrHelp').hidden=!showing;
 $('qrScanStatus').textContent=scanning?'Usa la fotocamera di OBSCURA/TUNNEL. Google Lens non può collegare i due peer.':'';
 $('stepTitle').textContent=sender?
  ['Prepara il collegamento','Mostra questi QR all’altro dispositivo','Scansiona la risposta'][step]:
  ['Scansiona il codice del mittente','Mostra la risposta al mittente'][step];
 $('instructions').textContent=sender?
  ['Il programma genera il codice da mostrare all’altro dispositivo.','Sull’altro dispositivo apri OBSCURA/TUNNEL → Ricevi e premi Scansiona.','Usa Scansiona QR oppure incolla il codice di risposta.'][step]:
  ['Apri lo scanner qui e inquadra i QR del mittente.','Mostra questi QR al mittente. Il collegamento partirà automaticamente dopo la lettura.'][step];
 $('next').textContent=sender?['Genera QR','Ho mostrato il QR','Collega'][step]:['Prepara risposta','Attendo collegamento'][step];
 $('next').disabled=!!(scanning&&!$('remote').value.trim());
}
$('quickDisconnect').onclick=()=>{destroy();mode='';step=0;wizard();status('Disconnesso.')};
for(const el of document.querySelectorAll('[data-mode]'))el.onclick=()=>{mode=el.dataset.mode;step=0;wizard()};
$('back').onclick=()=>{qrStop();stopQrSlides();if(step)step--;else mode='';wizard()};
$('remote').addEventListener('input',()=>{
 if(mode&&((mode==='receive'&&step===0)||(mode!=='receive'&&step===2)))$('next').disabled=!$('remote').value.trim();
});
$('next').onclick=guard(async()=>{
 $('next').disabled=true;
 try{
  if(mode==='receive'){
   if(step===0){await remoteOffer();step=1;}
   else {if(connected()){step=0;mode=''}else status('Mostra il codice al mittente e attendi il collegamento.');}
  }else{
   if(step===0){await localOffer();step=1;}
   else if(step===1){step=2;}
   else {await remoteAnswer();step=0;mode='';}
  }
 }finally{wizard();}
});

// Offline QR segmentation for larger WebRTC SDP. No remote QR service.
let qrParts=[],qrIndex=0,qrPayload='',qrSession='',qrReader=null,qrStream=null,qrTimer=null,qrBusy=false,qrSlideTimer=null,qrOptimizing=false;
const qrAssemblies=new Map();
function qrRender(){
 const el=$('qrImage');el.replaceChildren();
 if(qrOptimizing){$('qrDisplay').hidden=true;return}
 if(!qrParts.length||typeof QRCode!=='function'){$('qrDisplay').hidden=true;return}
 $('qrDisplay').hidden=false;
 $('qrPage').textContent=(qrIndex+1)+' / '+qrParts.length; $('qrCaption').textContent=qrParts.length===1?'Mostra il codice nell’app OBSCURA/TUNNEL dell’altro dispositivo':'Codice '+(qrIndex+1)+' di '+qrParts.length+' · usa lo scanner integrato nell’altra app';
 $('qrPrev').disabled=qrIndex===0;$('qrNext').disabled=qrIndex===qrParts.length-1;
 try{new QRCode(el,{text:qrParts[qrIndex],width:320,height:320,colorDark:'#000000',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M})}
 catch(err){$('qrScanStatus').textContent='QR non disponibile: '+err.message;$('qrDisplay').hidden=true}
}
function prepareQR(){
 const payload=$('local').value;
 if(!payload){qrParts=[];qrPayload='';qrRender();return}
 if(payload!==qrPayload){
 qrPayload=payload;qrSession=secureUUID();qrIndex=0;
 const fragments=payload.match(/[\s\S]{1,320}/g)||[];
 if(fragments.length>100){qrParts=[];$('qrScanStatus').textContent='Segnale troppo grande per QR: usa copia/incolla.'}
 else qrParts=fragments.map((chunk,i)=>'OT1|'+qrSession+'|'+i+'|'+fragments.length+'|'+chunk);
 if(typeof CompressionStream==='function'){
  qrOptimizing=true;
  compressQrPayload(payload,qrSession).catch(()=>{}).finally(()=>{qrOptimizing=false;qrRender()});
 }
 }
 qrRender();
}
$('qrPrev').onclick=()=>{qrIndex=Math.max(0,qrIndex-1);qrRender()};
$('qrNext').onclick=()=>{qrIndex=Math.min(qrParts.length-1,qrIndex+1);qrRender()};
function stopQrSlides(){if(qrSlideTimer){clearInterval(qrSlideTimer);qrSlideTimer=null}$('qrPlay').textContent='Riproduci QR'}
$('qrPlay').onclick=()=>{if(qrSlideTimer){stopQrSlides();return}if(qrParts.length<2)return;$('qrPlay').textContent='Ferma QR';qrSlideTimer=setInterval(()=>{qrIndex=(qrIndex+1)%qrParts.length;qrRender()},950)};
const oldWizard=wizard;
wizard=function(){oldWizard();if(mode&&step===1&&!connected())prepareQR();else{stopQrSlides();$('qrDisplay').hidden=true}};
async function compressQrPayload(payload,session){
 // Compress the SDP locally to reduce the number of QR frames.
 if(typeof CompressionStream!=='function'||typeof TextEncoder!=='function')return;
 const bytes=new TextEncoder().encode(payload);
 const stream=new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
 const packed=new Uint8Array(await new Response(stream).arrayBuffer());
 if(qrPayload!==payload||qrSession!==session)return;
 let raw='';for(const v of packed)raw+=String.fromCharCode(v);
 const encoded=btoa(raw).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 const parts=encoded.match(/.{1,320}/g)||[];
 if(!parts.length||parts.length>100||parts.length>=qrParts.length)return;
 qrParts=parts.map((piece,i)=>'OT2|'+session+'|'+i+'|'+parts.length+'|'+piece);
 qrIndex=0;qrRender();
}
function qrReceived(text){
 if(text.length>512000)return false;
 try{
  const obj=JSON.parse(text);
  if(!obj||!['offer','answer'].includes(obj.type)||typeof obj.sdp!=='string'||!obj.sdp.startsWith('v=0'))return false;
 }catch{return false}
 $('remote').value=text;
 $('qrScanStatus').textContent='Codice completo: '+(mode==='receive'?'preparo la risposta…':'collego…');
 $('next').disabled=false;
 if(mode&&((mode==='receive'&&step===0)||(mode!=='receive'&&step===2))){
  qrStop();
  $('next').onclick();
 }
 return true;
}
async function qrInflate(encoded){
 if(typeof DecompressionStream!=='function')throw Error('Il browser non supporta la decodifica QR compressa: usa copia/incolla.');
 const binary=atob(encoded.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-encoded.length%4)%4));
 if(binary.length>65536)throw Error('Codice QR troppo grande.');
 const zipped=Uint8Array.from(binary,c=>c.charCodeAt(0));
 const stream=new Blob([zipped]).stream().pipeThrough(new DecompressionStream('gzip'));
 const text=await new Response(stream).text();
 if(!qrReceived(text))throw Error('Segnale QR non valido.');
}
function qrAccept(raw){
 if(typeof raw!=='string'||raw.length>2000)return false;
 if(raw.trim().startsWith('{'))return qrReceived(raw);
 const m=/^(OT1|OT2)\|([a-f0-9-]{36})\|(\d+)\|(\d+)\|([\s\S]*)$/.exec(raw);
 if(!m)return false;
 const format=m[1],id=m[2],i=Number(m[3]),n=Number(m[4]),part=m[5];
 if(!Number.isInteger(i)||!Number.isInteger(n)||n<1||n>100||i<0||i>=n||part.length>500)return false;
 let pack=qrAssemblies.get(id);
 if(!pack){pack={count:n,parts:Array(n).fill(null),format};qrAssemblies.clear();qrAssemblies.set(id,pack)}
 if(pack.count!==n||pack.format!==format)return false;
 pack.parts[i]=part;
 const got=pack.parts.filter(v=>v!==null).length;
 $('qrScanStatus').textContent='Ricevuti '+got+' / '+n+' QR. '+(got<n?'Continua a inquadrare.':'');
 if(got===n){
  qrAssemblies.delete(id);
  const full=pack.parts.join('');
  if(format==='OT2'){qrInflate(full).catch(e=>$('qrScanStatus').textContent=e.message);return true}
  return qrReceived(full);
 }
 return false;
}
async function ensureQrReader(){
 if(qrReader)return qrReader;
 if(typeof BarcodeDetector==='function'){
  try{qrReader=new BarcodeDetector({formats:['qr_code']});return qrReader}catch{/* Fallback locale */ }
 }
 if(typeof jsQR==='function'){
  qrReader={async detect(source){
   const w=source.videoWidth||source.width,h=source.videoHeight||source.height;
   if(!w||!h)return [];
   const canvas=document.createElement('canvas');
   const factor=Math.min(1,720/w);canvas.width=Math.max(1,Math.floor(w*factor));canvas.height=Math.max(1,Math.floor(h*factor));
   const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw Error('Canvas2D non disponibile.');
   ctx.drawImage(source,0,0,canvas.width,canvas.height);
   const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);
   const result=jsQR(pixels.data,canvas.width,canvas.height,{inversionAttempts:'attemptBoth'});
   return result?[{rawValue:result.data}]:[];
  }};
  return qrReader;
 }
 throw Error('Lettore QR non supportato. Usa copia/incolla.');
}
async function qrDetect(source){
 const reader=await ensureQrReader();const results=await reader.detect(source);
 for(const result of results){if(result.rawValue&&qrAccept(result.rawValue))break}
}
function qrStop(){
 if(qrTimer){clearInterval(qrTimer);qrTimer=null}
 if(qrStream){for(const track of qrStream.getTracks())track.stop();qrStream=null}
 $('qrVideo').hidden=true;$('scanStart').textContent='Scansiona QR';
}
$('scanStart').onclick=guard(async()=>{
 if(qrStream){qrStop();return}
 await ensureQrReader();
 if(!navigator.mediaDevices?.getUserMedia)throw Error('Fotocamera non accessibile. Usa importazione immagine o copia/incolla.');
 qrStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
 const video=$('qrVideo');video.srcObject=qrStream;video.hidden=false;await video.play();$('scanStart').textContent='Ferma scanner';
 qrTimer=setInterval(async()=>{if(qrBusy||video.readyState<2)return;qrBusy=true;try{await qrDetect(video)}catch(e){$('qrScanStatus').textContent=e.message}finally{qrBusy=false}},450);
});
$('qrFile').onchange=guard(async()=>{
 const file=$('qrFile').files[0];if(!file)return;if(file.size>10*1024*1024)throw Error('Immagine QR troppo grande.');
 let bitmap,objectUrl;
 try{
  if(typeof createImageBitmap==='function')bitmap=await createImageBitmap(file);
  else{
   objectUrl=URL.createObjectURL(file);
   bitmap=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Immagine QR non leggibile.'));img.src=objectUrl});
  }
  await qrDetect(bitmap);
 }finally{if(typeof bitmap?.close==='function')bitmap.close();if(objectUrl)URL.revokeObjectURL(objectUrl);$('qrFile').value=''}
});
window.addEventListener('pagehide',()=>{qrStop();stopQrSlides()});

async function previewLocal(entry,line){
 const file=entry.file,ext=entry.name.toLowerCase();
 if(!file||file.size>12*1024*1024)return;
 const add=()=>{const node=document.createElement('div');node.className='thumb textthumb';line.append(node);return node};
 if(/\.(txt|md|log|csv|json|xml|js|css|html)$/i.test(ext)){
  const node=add();try{node.textContent=(await file.slice(0,110).text()).replace(/[\x00-\x08\x0e-\x1f]/g,' ')}catch{node.remove()}return;
 }
 if(/\.(mp3|wav|ogg|flac|m4a|aac)$/i.test(ext)){
  const node=add();node.textContent='♫ AUDIO';return;
 }
 const isImage=/\.(png|jpe?g|gif|webp|bmp)$/i.test(ext),isVideo=/\.(mp4|webm|mov|m4v)$/i.test(ext);
 if(!isImage&&!isVideo)return;
 const url=URL.createObjectURL(file),media=document.createElement(isImage?'img':'video');
 const cleanup=()=>{URL.revokeObjectURL(url);media.removeAttribute('src');if(typeof media.load==='function')media.load()};
 let rejectLoad=()=>{};
 const timeout=setTimeout(()=>{rejectLoad(Error('Tempo anteprima scaduto'));cleanup()},8000);
 try{
  if(isVideo){media.muted=true;media.preload='metadata';media.src=url;await new Promise((resolve,reject)=>{rejectLoad=reject;media.onloadeddata=resolve;media.onerror=()=>reject(Error('Anteprima video assente'))})}
  else {media.src=url;await new Promise((resolve,reject)=>{rejectLoad=reject;media.onload=resolve;media.onerror=()=>reject(Error('Immagine non leggibile'))})}
  if(!$('previews').checked||!line.isConnected)return;
  const canvas=document.createElement('canvas');canvas.width=48;canvas.height=48;
  const ctx=canvas.getContext('2d');if(!ctx)return;
  const w=media.videoWidth||media.naturalWidth||48,h=media.videoHeight||media.naturalHeight||48;
  const scale=Math.max(48/w,48/h);ctx.drawImage(media,(48-w*scale)/2,(48-h*scale)/2,w*scale,h*scale);
  const img=document.createElement('img');img.className='thumb';img.alt='Miniatura locale';img.src=canvas.toDataURL('image/webp',.55);line.prepend(img);
 }catch{/* Bad or unsupported file previews are intentionally silent. */}
 finally{clearTimeout(timeout);cleanup()}
}
