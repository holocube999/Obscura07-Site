/* Public Death Mask portal; private original media are fetched DIRECTLY from
 * the owner's private GitHub repository after per-user authentication.
 * This public JS contains NO ROM, ADF or credentials. The external PUAE
 * emulator runs in an opaque-origin sandbox, isolated from the credential.
 */
"use strict";
(() => {
const REPO="holocube999/DeathMask-Gloom-Amiga";
const API="https://api.github.com/repos/"+REPO;
const BLOB={
  disk1:{sha:"0f762b2428fb9c4174ba94345433014100945c4d",size:901120},
  disk2:{sha:"d687da07348e43bffc2d06fe8713c02ab374c100",size:901120},
  kick:{sha:"333529a90a9b6cc017eb9a0f8d7276fb063f669d",size:524288}
};
const DB="sellone-deathmask-private-media-v1",STORE="auth";
const $=id=>document.getElementById(id);
const elements={
  form:$("auth-form"),token:$("gh-token"),remember:$("remember"),
  connect:$("connect"),forget:$("forget"),status:$("status"),
  boot1:$("boot1"),boot2:$("boot2"),stop:$("stop"),frame:$("emu-frame")
};
let githubToken=null,media=null,busy=false,frameBusy=false;
const encoder=new TextEncoder();
function show(message,error=false){
  elements.status.textContent=String(message);
  elements.status.dataset.error=error?"true":"false";
}
function setReady(ok){
  elements.boot1.disabled=!ok;
  elements.boot2.disabled=!ok;
  elements.connect.disabled=busy;
  elements.stop.disabled=!frameBusy;
}
function vault(){
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(DB,1);
    request.onupgradeneeded=()=>{request.result.createObjectStore(STORE)};
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
}
async function dbGet(name){
  const db=await vault();
  try{return await new Promise((ok,bad)=>{
    const tx=db.transaction(STORE,"readonly"),req=tx.objectStore(STORE).get(name);
    req.onsuccess=()=>ok(req.result||null);req.onerror=()=>bad(req.error);
  });}finally{db.close()}
}
async function dbPut(name,value){
  const db=await vault();
  try{await new Promise((ok,bad)=>{
    const tx=db.transaction(STORE,"readwrite");
    tx.objectStore(STORE).put(value,name);
    tx.oncomplete=ok;tx.onerror=()=>bad(tx.error);
  });}finally{db.close()}
}
async function dbClear(){
  const db=await vault();
  try{await new Promise((ok,bad)=>{
    const tx=db.transaction(STORE,"readwrite");
    tx.objectStore(STORE).clear();
    tx.oncomplete=ok;tx.onerror=()=>bad(tx.error);
  });}finally{db.close()}
}
async function saveToken(token){
  const key=await crypto.subtle.generateKey(
    {name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const cipher=await crypto.subtle.encrypt({
    name:"AES-GCM",iv,additionalData:encoder.encode("Sellone-owned-media-v1")
  },key,encoder.encode(token));
  await dbPut("device-key",key);
  await dbPut("device-sealed-token",{version:1,iv:Array.from(iv),cipher:Array.from(new Uint8Array(cipher))});
}
async function restoreToken(){
  const key=await dbGet("device-key"),record=await dbGet("device-sealed-token");
  if(!key||!record||record.version!==1)return null;
  try{
    const clear=await crypto.subtle.decrypt({
      name:"AES-GCM",iv:new Uint8Array(record.iv),
      additionalData:encoder.encode("Sellone-owned-media-v1")
    },key,new Uint8Array(record.cipher));
    return new TextDecoder().decode(clear);
  }catch(e){await dbClear();return null}
}
async function getGithub(route){
  if(!githubToken)throw Error("Token GitHub non presente.");
  const uri=API+route;
  const response=await fetch(uri,{
    headers:{Authorization:"Bearer "+githubToken,Accept:"application/vnd.github+json",
             "X-GitHub-Api-Version":"2022-11-28"},
    credentials:"omit",cache:"no-store",redirect:"error",referrerPolicy:"no-referrer"
  });
  if(!response.ok){
    const hint=response.status===401?"token scaduto o non valido":
      response.status===403?"permessi o limiti API":
      response.status===404?"repository/ramo/file non accessibile al token":"risposta HTTP";
    throw Error("GitHub "+response.status+" ("+hint+").");
  }
  return response.json();
}
async function checkPrivateRepository(){
  const info=await getGithub("");
  if(info.private!==true){
    throw Error("BLOCCATO: repository non privato. Il viewer non scaricherà ROM/ADF.");
  }
  const branch=await getGithub("/branches/dev%2Fprivate-media");
  if(!branch||!branch.commit||!branch.commit.sha)
    throw Error("Ramo privato dev/private-media assente.");
}
function decodeBase64(s){
  const text=s.replace(/\s/g,"");
  const binary=atob(text);
  const result=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++)result[i]=binary.charCodeAt(i);
  return result;
}
async function checkGitObject(data,expected){
  const header=encoder.encode("blob "+data.length+"\u0000");
  const full=new Uint8Array(header.length+data.length);
  full.set(header);full.set(data,header.length);
  const digest=await crypto.subtle.digest("SHA-1",full);
  const hex=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join("");
  if(hex!==expected)throw Error("Hash Git blob diverso: media non autentico.");
}
async function fetchMedia(key){
  const item=BLOB[key];
  const info=await getGithub("/git/blobs/"+item.sha);
  if(info.encoding!=="base64"||info.size!==item.size||info.sha!==item.sha)
    throw Error("Metadati originali non corrispondenti per "+key);
  const data=decodeBase64(info.content);
  if(data.length!==item.size)throw Error("Dimensioni non valide per "+key);
  await checkGitObject(data,item.sha);
  return data;
}
function cleanupFrame(){
  elements.frame.src="about:blank";
  elements.frame.classList.remove("active");
  frameBusy=false;setReady(!!media);
}
async function bootDisk(which){
  if(!media||busy)return;
  if(!["disk1","disk2"].includes(which))return;
  cleanupFrame();
  frameBusy=true;setReady(true);
  show("Avvio Amiga PUAE: "+which+". La ROM e l'ADF sono già nella sessione privata.");
  elements.frame.classList.add("active");
  const frame=elements.frame;
  const src="./emu.html?session="+encodeURIComponent(which)+"-"+Date.now();
  await new Promise((resolve)=>{
    frame.addEventListener("load",resolve,{once:true});
    frame.src=src;
  });
  if(!frameBusy)return;
  const disk=media[which].slice().buffer;
  const kick=media.kick.slice().buffer;
  frame.contentWindow.postMessage({
    type:"DM_EMU_BOOT",origin:location.origin,diskName:which,disk,kick
  },"*",[disk,kick]);
}
async function connectAndPlay(token,remember){
  if(busy)return;
  busy=true;setReady(false);
  try{
    githubToken=token;
    if(!githubToken)throw Error("Inserisci un token GitHub con Contents: read.");
    show("Controllo accesso privato a GitHub…");
    await checkPrivateRepository();
    show("Recupero ADF originale disco 1 (SHA verificato)…");
    const disk1=await fetchMedia("disk1");
    show("Recupero ADF originale disco 2 (SHA verificato)…");
    const disk2=await fetchMedia("disk2");
    show("Recupero Kickstart privata (SHA verificato)…");
    const kick=await fetchMedia("kick");
    media={disk1,disk2,kick};
    if(remember)await saveToken(githubToken);
    elements.token.value="";
    show("Due ADF e Kickstart autentici verificati. Avvio disco 1…");
  }catch(err){
    media=null;show("Caricamento privato non riuscito: "+String(err.message||err),true);
    return;
  }finally{busy=false;setReady(!!media)}
  await bootDisk("disk1");
}
elements.form.addEventListener("submit",async event=>{
  event.preventDefault();
  await connectAndPlay(elements.token.value.trim(),elements.remember.checked);
});
elements.boot1.addEventListener("click",()=>bootDisk("disk1"));
elements.boot2.addEventListener("click",()=>bootDisk("disk2"));
elements.stop.addEventListener("click",()=>{
  cleanupFrame();
  show("Emulatore fermato. ADF e Kickstart restano pronti in memoria.");
});
elements.forget.addEventListener("click",async()=>{
  cleanupFrame();
  media=null;githubToken=null;elements.token.value="";
  try{await dbClear();show("Credenziali dimenticate su questo dispositivo. Media rimossi dalla sessione.");}
  catch(e){show("Errore nella pulizia delle credenziali: "+String(e.message||e),true)}
  setReady(false);
});
window.addEventListener("message",event=>{
  if(event.source!==elements.frame.contentWindow||event.origin!=="null"||
     !event.data||event.data.type!=="DM_EMU_STATUS")return;
  if(event.data.stage==="error")show(String(event.data.message||"Errore PUAE"),true);
  else show(String(event.data.message||"Amiga: caricamento…"));
});
window.addEventListener("pagehide",()=>{
  media=null;
  githubToken=null;
  cleanupFrame();
});
(async()=>{
  try{
    const remembered=await restoreToken();
    if(remembered){
      show("Accesso privato salvato nel browser. Caricamento automatico dei dischi originali…");
      await connectAndPlay(remembered,false);
    }
  }catch(err){show("Archivio locale non disponibile: "+String(err.message||err),true)}
})();
})();
