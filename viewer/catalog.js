/* Sellone WebPlayer: original project catalog + GitHub HTML + invisible retro cores. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const q=new URLSearchParams(location.search);
const initial=(q.get('repo')||q.get('project')||'').trim().replace(/^holocube999\//i,'');
const initialRef=q.get('ref'),initialPath=q.get('path'),initialView=q.get('view');
const validRepo=/^[A-Za-z0-9_.-]{1,100}$/;
const root=new URL('../',location.href), approvedPrefix=new URL('viewer/',root);
// The audited, published Tunnel build has a dedicated same-origin iframe.
// Other repository code continues to use the opaque sandbox.
const tunnelUrl=new URL('transfer/index.html',root).href;
function isTunnel(item){return String(item?.repo||'').toLowerCase()==='obscura-tunnel'}
function hideTunnel(){
 const frame=$('tunnelFrame');
 if(!frame)return;
 frame.classList.add('hidden');
 frame.removeAttribute('src');
}
const GH=window.SelloneGitHub,Retro=window.SelloneRetro,Bundle=window.SelloneBundle;
const all=[];
const types={web_js:'WEB',amiga_media:'AMIGA',native:'NATIVO',site:'SITO',archive:'ARCHIVIO',utility:'UTILITY',audio:'AUDIO'};
let selected=null,loaded=null,remoteMedia=null,remoteKick=null,mediaRevision=null,sourceRevision=null,selectedRevision='',view='js',busy=false;
let syncChannel='',syncReady={js:false,original:false};
function text(node,tag,value){const e=document.createElement(tag);e.textContent=value;node.append(e);return e}
function link(node,label,url,secondary){
 const a=text(node,'a',label);a.className='action'+(secondary?' secondary':'');a.href=url;return a;
}
function showStatus(msg,error=false){
 $('playerStatus').textContent=msg;
 $('playerStatus').style.color=error?'#ffc5d3':'#b7c9d6';
}
function approvedBuild(path){
 // Only audited first-party pages. Never allow arbitrary GitHub paths here.
 if(typeof path!=='string')return '';
 const allowed=/^viewer\/[A-Za-z0-9_.\/-]+\.html?$/i.test(path)||
  ['radio/index.html','apps/obscura-emu/index.html','transfer/index.html'].includes(path);
 if(!allowed||path.split('/').includes('..'))return '';
 const url=new URL(path,root);
 return url.origin===location.origin&&url.pathname.startsWith(root.pathname)&&!url.search&&!url.hash?url.href:'';
}
function viewLink(item){return './?repo='+encodeURIComponent(item.id||item.repo)}
function byRepo(key){return all.find(x=>x.id.toLowerCase()===key.toLowerCase())||
 all.find(x=>x.repo.toLowerCase()===key.toLowerCase())}

function card(item){
 const el=document.createElement('article');el.className='panel project';
 const head=text(el,'div','');head.className='head';
 text(head,'span',types[item.viewer_type]||'PROGETTO').className='eyebrow';
 text(head,'span',item.published?'Pubblicato':'GitHub').className='tag'+(item.published?' playable':'');
 text(el,'h3',item.title);
 text(el,'p',item.description);
 const acts=text(el,'div','');acts.className='actions';
 link(acts,item.published?'▶ Apri applicazione':'▶ Apri nel WebPlayer',viewLink(item),false);
 return el;
}
function listing(value=''){
 const filter=value.toLocaleLowerCase('it');const grid=$('grid');grid.replaceChildren();
 let count=0;
 for(const item of all){
  if(filter&&!String(item.title+' '+item.repo+' '+item.kind).toLocaleLowerCase('it').includes(filter))continue;
  grid.append(card(item));count++;
 }
 $('stats').textContent=count+' / '+all.length+' progetti · '+all.filter(x=>x.published).length+' anteprime pubbliche';
 $('message').textContent=count?'':'Nessun progetto corrispondente';
}
function emptyFrame(){
 hideTunnel();
 const trusted=$('localAppFrame');trusted.removeAttribute('src');trusted.classList.add('hidden');
 const frame=$('playframe');frame.classList.remove('hidden');frame.removeAttribute('src');
 frame.srcdoc='<!doctype html><title>Sellone WebPlayer</title><body style="background:#090b14;color:#b9c3d2;font:15px system-ui;padding:24px">Seleziona una build o un supporto da avviare.</body>';
}
function showFrame(){ $('unavailable').classList.add('hidden');$('playarea').classList.remove('hidden');}
function newChannel(){
 const bytes=crypto.getRandomValues(new Uint8Array(16));
 return 's-'+Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
}
function presentMode(next){
 if(!['js','original','both','source'].includes(next))return;
 view=next;
 const hasJS=next==='js'||next==='both',hasRetro=next==='original'||next==='both';
 for(const b of $('viewModes').querySelectorAll('[data-view]'))b.setAttribute('aria-pressed',String(b.dataset.view===next));
 $('webControls').classList.toggle('hidden',!hasJS);
 $('retroControls').classList.toggle('hidden',!hasRetro);
 $('sourceControls').classList.toggle('hidden',next!=='source');
 $('compareTools').classList.toggle('hidden',next!=='both');
 $('jsPane').classList.toggle('hidden',!hasJS);
 $('originalPane').classList.toggle('hidden',!hasRetro);
 $('sourcePane').classList.toggle('hidden',next!=='source');
 $('playarea').classList.toggle('compare',next==='both');
 $('detailStatus').textContent=next==='both'?'Confronto · JS a sinistra / originale a destra':
  next==='js'?'Versione JavaScript':next==='original'?
   ('Originale · '+(selected?.origin_system==='amiga'?'Amiga / ADF':
   ['c64','c128','vic20','c16'].includes(selected?.origin_system)?selected.origin_system.toUpperCase():'seleziona supporto')):'Sorgenti GitHub';
}
function bridgeHtml(html){
 // The sandboxed JS game has an opaque origin; this short bridge contains
 // only a per-session channel, never GitHub credentials or private media.
 const bridge=String.raw`(function(){
 'use strict';
 var channel=CHANNEL, delivering=false;
 var valid=/^(?:Arrow(?:Up|Down|Left|Right)|Key[A-Z]|Digit[0-9]|Space|Enter|Escape|Shift(?:Left|Right)|Control(?:Left|Right))$/;
 for(var action of ['keydown','keyup'])window.addEventListener(action,function(e){
  if(delivering||!e.isTrusted||!valid.test(e.code))return;
  parent.postMessage({type:'SELLONE_SYNC_INPUT_V1',channel:channel,action:e.type,key:e.key,code:e.code,repeat:e.repeat},'*');
 },true);
 window.addEventListener('message',function(e){
  var d=e.data;
  if(e.source!==parent||!d||d.type!=='SELLONE_SYNC_INPUT_V1'||d.channel!==channel||
   !valid.test(String(d.code||''))||!['keydown','keyup'].includes(d.action))return;
  delivering=true;
  try{document.dispatchEvent(new KeyboardEvent(d.action,{key:d.key,code:d.code,repeat:!!d.repeat,bubbles:true,cancelable:true}))}
  finally{delivering=false}
 });
 parent.postMessage({type:'SELLONE_SYNC_READY_V1',channel:channel,side:'js'},'*');
})()`.replace('CHANNEL',JSON.stringify(syncChannel));
 const tag='<script>'+bridge+'</script>';
 const idx=html.toLowerCase().lastIndexOf('</body>');
 return idx>=0?html.slice(0,idx)+tag+html.slice(idx):html+tag;
}
function showJS(result){
 hideTunnel();
 $('localAppFrame').removeAttribute('src');$('localAppFrame').classList.add('hidden');
 $('playframe').classList.remove('hidden');$('playframe').removeAttribute('src');
 $('playframe').srcdoc=bridgeHtml(result.html);
 syncReady.js=false;updateSync();
}
function updateSync(){
 const mode=$('linkedInput').checked?'collegati':'disattivati';
 $('syncFeedback').textContent='Input '+mode+' · bridge JS '+(syncReady.js?'pronto':'in attesa')+
  ' · core '+(syncReady.original?'pronto':'in attesa')+' · sincronizzazione dei frame non garantita';
}
function relay(data,target){
 const frame=target==='js'?$('playframe'):Retro.frame();
 if(!frame?.contentWindow)return;
 frame.contentWindow.postMessage(data,target==='js'?'*':location.origin);
}
function inputFrom(event){
 if(!event.data||event.data.channel!==syncChannel)return;
 const source=event.source=== $('playframe').contentWindow?'js':event.source===Retro.frame()?.contentWindow?'original':null;
 if(!source)return;
 if(event.data.type==='SELLONE_SYNC_READY_V1'){
  syncReady[source]=true;updateSync();return;
 }
 if(view!=='both'||!$('linkedInput').checked)return;
 if(event.data.type!=='SELLONE_SYNC_INPUT_V1'||!['keydown','keyup'].includes(event.data.action)||
    !/^(?:Arrow(?:Up|Down|Left|Right)|Key[A-Z]|Digit[0-9]|Space|Enter|Escape|Shift(?:Left|Right)|Control(?:Left|Right))$/.test(event.data.code||''))return;
 relay(event.data,source==='js'?'original':'js');
}
window.addEventListener('message',inputFrom);
window.addEventListener('keydown',parentKey,true);
window.addEventListener('keyup',parentKey,true);
function parentKey(event){
 if(!event.isTrusted||view!=='both'||!$('linkedInput').checked)return;
 const target=event.target;
 if(target?.closest?.('input,select,textarea,button,a'))return;
 if(!/^(?:Arrow(?:Up|Down|Left|Right)|Key[A-Z]|Digit[0-9]|Space|Enter|Escape|Shift(?:Left|Right)|Control(?:Left|Right))$/.test(event.code))return;
 if(event.code.startsWith('Arrow')||event.code==='Space')event.preventDefault();
 const data={type:'SELLONE_SYNC_INPUT_V1',channel:syncChannel,action:event.type,key:event.key,code:event.code,repeat:event.repeat};
 relay(data,'js');relay(data,'original');
}
function handleError(error){
 const msg=String(error.message||error);
 showStatus(msg,true);
 if([401,403,404].includes(error.status))$('authBox').classList.remove('hidden');
}
function currentRepo(){if(!selected)throw Error('Nessun progetto selezionato');return GH.normalizeRepo(selected.repo)}
function fillPaths(select,files,current){
 select.replaceChildren();
 const blank=document.createElement('option');blank.value='';blank.textContent='Seleziona build';select.append(blank);
 for(const path of files||[]){const opt=document.createElement('option');opt.value=path;opt.textContent=path;select.append(opt)}
 select.value=current||'';
}
function enableUI(active){busy=active;
 for(const id of ['loadLatest','reloadSelected','bootRetro','loadGitMedia','openSource','reloadSource','restartPair'])$(id).disabled=active;
}
async function githubHTML(opts={}){
 if(!selected)return;
 if(isTunnel(selected)&&view!=='source'){localBuild(selected);return}
 enableUI(true);showFrame();showStatus('Lettura da GitHub e verifica SHA…');
 try{
  // In split mode the emulator must remain running while the JS build reloads.
  const ref=opts.explicit?.ref||(opts.pin?loaded?.ref:undefined);
  const path=opts.explicit?.path||(opts.pin?$('htmlCandidates').value||loaded?.path:undefined);
  const verified=await GH.load({repo:currentRepo(),ref,path});
  if(!Bundle?.prepare)throw Error('Motore dei moduli WebPlayer non disponibile');
  showStatus('Verifica CSS e moduli JavaScript del repository…');
  const result=await Bundle.prepare(verified,GH);
  const oldFiles=loaded?.files;
  loaded={...result,files:result.files||oldFiles||[]};
  fillPaths($('htmlCandidates'),loaded.files,result.path);
  showJS(result);
  $('detailStatus').textContent='HTML GitHub · '+result.path+' · commit '+result.ref.slice(0,12);
  showStatus('HTML verificato: '+result.path+' · '+result.moduleCount+' moduli JS · '+result.assetCount+' dipendenze.');
  // Private apps needing secure-context browser APIs cannot run inside an
  // opaque-origin sandbox. Export the already SHA-verified, self-contained HTML.
  const oldStandalone=$('standaloneAction');
  if(oldStandalone)oldStandalone.remove();
  if(/(?:^|\/)OBSCURA-TUNNEL$/i.test(result.repo)){
   const standalone=document.createElement('button');
   standalone.id='standaloneAction';
   standalone.className='action secondary';
   standalone.type='button';
   standalone.textContent='↓ Scarica app autonoma';
   standalone.title='Un HTML completo, senza token GitHub; aprilo in un browser come file locale o su localhost';
   standalone.addEventListener('click',()=>{
    const file=new Blob([result.html],{type:'text/html;charset=utf-8'});
    const url=URL.createObjectURL(file);
    const link=document.createElement('a');
    link.href=url;link.download='OBSCURA-TUNNEL-standalone.html';link.rel='noopener';
    document.body.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),60000);
   });
   $('detailActions').append(standalone);
   showStatus('WebPlayer isolato: Web Crypto non disponibile nell’iframe. Usa “Scarica app autonoma” e apri l’HTML nel browser (oppure via localhost).');
  }
  const existing=$('commitAction');
  if(existing)existing.remove();
  const a=link($('detailActions'),'↗ Commit GitHub','https://github.com/'+result.repo+'/commit/'+result.ref,true);
  a.id='commitAction';a.target='_blank';a.rel='noopener noreferrer';
  const url=new URL(location.href);url.searchParams.set('repo',selected.id||selected.repo);
  if(opts.explicit||opts.pin){selectedRevision=result.ref;url.searchParams.set('ref',result.ref);url.searchParams.set('path',result.path)}else{selectedRevision='';url.searchParams.delete('ref');url.searchParams.delete('path')}
  history.replaceState(null,'',url.pathname+url.search);
 }catch(error){emptyFrame();handleError(error)}
 finally{enableUI(false)}
}
async function githubMedia(){
 if(!selected)return;
 enableUI(true);showStatus('Ricerca supporti nel repository GitHub…');
 try{
  mediaRevision=await GH.discoverMedia(currentRepo());
  fillPaths($('mediaCandidates'),mediaRevision.files,mediaRevision.path);
  $('mediaCandidates').classList.remove('hidden');
  await selectedMedia(mediaRevision.path);
 }catch(error){handleError(error)}
 finally{enableUI(false)}
}
async function selectedMedia(path){
 if(!selected||!mediaRevision||!path)return;
 const result=await GH.loadMedia({repo:currentRepo(),ref:mediaRevision.ref,path});
 remoteMedia=new File([result.media],result.path.split('/').pop(),{type:'application/octet-stream'});
 remoteKick=null;
 $('mediaInput').value='';
 if(Retro.needsKick(remoteMedia)&&!$('kickInput').files[0]&&mediaRevision.biosFiles?.length){
  const biosPath=mediaRevision.biosFiles.find(p=>/kick|amiga|a500|a1200/i.test(p))||mediaRevision.biosFiles[0];
  try{
   const source=await GH.loadBios({repo:currentRepo(),ref:mediaRevision.ref,path:biosPath});
   remoteKick=new File([source.bios],'kick.rom',{type:'application/octet-stream'});
  }catch(e){showStatus('Supporto verificato, ma Kickstart privata non disponibile: '+e.message,true)}
 }
 showStatus('GitHub verificato · '+result.path+' · '+result.ref.slice(0,12)+
  (remoteKick?' · Kickstart privata caricata senza pubblicazione':' · pronto per avvio.'));
}
async function boot(){
 const disk=$('mediaInput').files[0]||remoteMedia;
 const kick=$('kickInput').files[0]||remoteKick||null;
 if(!disk||!Retro.supported(disk)){showStatus('Seleziona un ADF, D64, T64 o PRG valido (massimo 3 MiB).',true);return}
 const originalSystem=String(selected?.origin_system||'').toLowerCase();
 if(originalSystem==='amiga'&&!/\.adf$/i.test(disk.name)){
  showStatus('Questo progetto nasce su Amiga: seleziona un ADF.',true);return;
 }
 if(['c64','c128','vic20','c16'].includes(originalSystem)&&/\.adf$/i.test(disk.name)){
  showStatus('Questo progetto Commodore non usa immagini ADF Amiga.',true);return;
 }
 if(['c128','vic20','c16'].includes(originalSystem)){
  showStatus('Il core dedicato a '+originalSystem.toUpperCase()+' non è ancora disponibile in questo WebPlayer.',true);return;
 }
 if(Retro.needsKick(disk)&&!Retro.validKick(kick)){
  showStatus('Per l’avvio Amiga seleziona una Kickstart valida e di tua disponibilità.',true);return;
 }
 enableUI(true);
 try{
  showFrame();const host=$('originalStage');
  syncReady.original=false;updateSync();
  await Retro.start({media:disk,bios:kick,title:selected.title,host,onStatus:showStatus,channel:syncChannel});
  $('detailStatus').textContent='Core retro · '+disk.name+' · '+(Retro.needsKick(disk)?'PUAE':'VICE');
 }catch(error){handleError(error)}
 finally{enableUI(false)}
}
function localBuild(item){
 if(isTunnel(item)){
  showFrame();
  $('playframe').classList.add('hidden');
  $('playframe').removeAttribute('src');
  $('localAppFrame').classList.add('hidden');
  $('localAppFrame').removeAttribute('src');
  const frame=$('tunnelFrame');
  frame.classList.remove('hidden');
  if(frame.src!==tunnelUrl)frame.src=tunnelUrl;
  $('detailStatus').textContent='OBSCURA/TUNNEL · HTTPS · WebRTC e fotocamera';
  showStatus('App P2P verificata incorporata: fotocamera autorizzabile in HTTPS, senza download.');
  return true;
 }
 hideTunnel();
 const url=item.published?approvedBuild(item.url):'';
 if(!url)return false;
 showFrame();
 // Untrusted GitHub code remains confined to the opaque-origin playframe.
 // Only vetted local apps are loaded in this separate first-party frame.
 $('playframe').classList.add('hidden');
 const frame=$('localAppFrame');frame.classList.remove('hidden');frame.src=url;
 $('detailStatus').textContent='Applicazione statica pubblicata';
 showStatus('Applicazione aperta dal catalogo; nessun token GitHub richiesto.');
 return true;
}

async function githubSource(refresh=true){
 if(!selected)return;
 enableUI(true);showStatus('Lettura sorgenti GitHub e verifica SHA…');
 try{
  if(refresh||!sourceRevision)sourceRevision=await GH.discoverFiles(currentRepo(),selectedRevision);
  const file=$('sourceFiles').value&&sourceRevision.files.includes($('sourceFiles').value)?$('sourceFiles').value:sourceRevision.path;
  fillPaths($('sourceFiles'),sourceRevision.files,file);
  const result=await GH.loadText({repo:currentRepo(),ref:sourceRevision.ref,path:file});
  const pre=document.createElement('pre');pre.id='sourcePreview';pre.textContent=result.content;
  $('sourcePane').replaceChildren(pre);
  $('detailStatus').textContent='GitHub · '+result.path+' · '+result.ref.slice(0,12);
  showStatus('Sorgente verificato · '+(result.bytes/1024).toFixed(1)+' KiB · sola lettura');
 }catch(e){handleError(e)}
 finally{enableUI(false)}
}
async function selectView(next){
 if(!selected||busy||!['js','original','both','source'].includes(next))return;
 const previous=view;
 if(previous===next)return;
 if(!['original','both'].includes(next)){
  await Retro.stop();$('originalStage').replaceChildren();syncReady.original=false;
 }
 if(!['js','both'].includes(next))emptyFrame();
 presentMode(next);showFrame();updateSync();
 if(next==='source'){await githubSource();return}
 if(['js','both'].includes(next)&&(previous==='original'||previous==='source')){
  if(!localBuild(selected)){if(loaded)showJS(loaded);else await githubHTML()}
 }
 if(next==='both'&&!loaded)await githubHTML();
 if(next==='original'||next==='both'){
  const disk=$('mediaInput').files[0]||remoteMedia;
  if(!disk)showStatus('Confronto pronto: seleziona ADF/D64/T64/PRG oppure cerca i media su GitHub.');
 }
}
function showDetail(repo,explicit=null){
 $('listing').classList.add('hidden');$('detail').classList.remove('hidden');
 selected=byRepo(repo)||{id:repo,repo,title:repo,description:'Repository GitHub',viewer_type:'web_js',published:false};
 const item=selected;
 $('detail').dataset.originalSystem=item.origin_system||'';
 loaded=null;remoteMedia=null;remoteKick=null;mediaRevision=null;sourceRevision=null;selectedRevision=explicit?.ref||'';
 syncChannel=newChannel();syncReady={js:false,original:false};
 $('detailName').textContent=item.title;
 $('detailKind').textContent=types[item.viewer_type]||'PROGETTO';
 $('detailDescription').textContent=item.description||'';
 document.title=item.title+' · Sellone WebPlayer';
 const acts=$('detailActions');acts.replaceChildren();
 const repoPage=link(acts,'↗ Repository','https://github.com/holocube999/'+encodeURIComponent(item.repo),true);
 repoPage.target='_blank';repoPage.rel='noopener noreferrer';
 const published=item.published?approvedBuild(item.url):'';
 if(published){
  const publicLink=link(acts,'↗ Anteprima pubblica',published,true);
  publicLink.target='_blank';publicLink.rel='noopener noreferrer';
 }
 for(const b of $('viewModes').querySelectorAll('[data-view]')){
  const available=item.viewer_type==='web_js'||item.viewer_type==='amiga_media'||b.dataset.view==='source';
  b.disabled=!available;
 }
 presentMode(explicit?.mode==='source'?'source':item.viewer_type==='amiga_media'?'original':
  ['archive','native'].includes(item.viewer_type)?'source':'js');
 emptyFrame();showFrame();updateSync();
 if(view==='source')githubSource();
 else if(view==='js'){
  if(explicit?.ref&&explicit?.path)githubHTML({explicit});
  else if(initialRef&&initialPath&&(item.id||item.repo).toLowerCase()===initial.toLowerCase())
   githubHTML({explicit:{ref:initialRef,path:initialPath}});
  else if(!localBuild(item))githubHTML();
 }else showStatus('Originale: seleziona un supporto locale o GitHub e avvia il core.');
}
async function loadCatalog(){
 try{
  const response=await fetch('../catalog.json',{cache:'no-store',credentials:'omit'});
  if(!response.ok)throw Error('HTTP '+response.status);
  const data=await response.json();
  if(data.schema!==2||!Array.isArray(data.projects))throw Error('Catalogo incompatibile');
  const seen=new Set();
  for(const item of data.projects){
   const id=String(item?.id||item?.repo||'');
   if(!item||!validRepo.test(item.repo||'')||!validRepo.test(id)||seen.has(id.toLowerCase()))continue;
   seen.add(id.toLowerCase());
   all.push({id,repo:item.repo,title:String(item.title||item.repo).slice(0,90),
    description:String(item.description||'').slice(0,250),kind:String(item.kind||''),
    viewer_type:types[item.viewer_type]?item.viewer_type:'archive',origin_system:String(item.origin_system||''),
    published:item.published===true&&!!approvedBuild(item.url),url:item.url});
  }
  if(initial&&validRepo.test(initial))showDetail(initial,initialRef&&initialView==='source'?{ref:initialRef,mode:'source'}:null);
  else {listing();if(initial)$('message').textContent='Identificativo repository non valido'}
 }catch(error){$('message').textContent='Errore catalogo: '+String(error.message||error)}
}
$('search').oninput=()=>listing($('search').value);
$('loadLatest').onclick=()=>githubHTML();
$('reloadSelected').onclick=()=>githubHTML({pin:true});
$('htmlCandidates').onchange=()=>{if(loaded)githubHTML({pin:true})};
$('loadGitMedia').onclick=()=>githubMedia();
$('mediaCandidates').onchange=async()=>{try{await selectedMedia($('mediaCandidates').value)}catch(e){handleError(e)}};
$('mediaInput').onchange=()=>{remoteMedia=null;remoteKick=null;showStatus('Supporto locale selezionato; premi Avvia supporto.')};
$('bootRetro').onclick=()=>boot();
$('stopRetro').onclick=async()=>{await Retro.stop();$('originalStage').replaceChildren();syncReady.original=false;updateSync();showStatus('Emulatore fermato; supporti temporanei eliminati.')};
$('useGitToken').onclick=async()=>{
 try{
  await GH.setToken($('gitToken').value,$('gitPassword').value,$('saveToken').checked);
  $('gitToken').value='';$('gitPassword').value='';$('authBox').classList.add('hidden');
  if(view==='source')await githubSource();else if(view==='original')await githubMedia();else await githubHTML();
 }catch(e){handleError(e)}
};
$('unlockGitToken').onclick=async()=>{
 try{await GH.unlock($('gitPassword').value);$('gitPassword').value='';$('authBox').classList.add('hidden');if(view==='source')await githubSource();else if(view==='original')await githubMedia();else await githubHTML()}
 catch(e){handleError(e)}
};
for(const b of $('viewModes').querySelectorAll('[data-view]'))b.onclick=()=>selectView(b.dataset.view);
$('openSource').onclick=()=>githubSource(false);
$('reloadSource').onclick=()=>{selectedRevision='';sourceRevision=null;githubSource(true)};
$('sourceFiles').onchange=()=>githubSource(false);
$('linkedInput').onchange=()=>updateSync();
$('restartPair').onclick=async()=>{
 if(view!=='both')return;
 if(!loaded){await githubHTML()}
 else showJS(loaded);
 const disk=$('mediaInput').files[0]||remoteMedia;
 if(!disk){showStatus('JS riavviato. Seleziona il supporto originale e premi Avvia supporto.',true);return}
 await boot();
 showStatus('Riavvio delle due istanze richiesto · stessa sessione input, senza sincronizzazione deterministica dei frame.');
};
$('forgetGitToken').onclick=()=>{GH.forget();$('authBox').classList.add('hidden');showStatus('Token cifrato eliminato.')};
window.addEventListener('sellone:history-open',event=>{
 const d=event.detail||{};
 if(!validRepo.test(d.repo||'')||!/^[a-f0-9]{40}$/i.test(d.ref||'')||
  (d.mode!=='source'&&!/^(?:[A-Za-z0-9_.-]+\/){0,5}[A-Za-z0-9_.-]+\.html?$/i.test(d.path||'')))return;
 const url=new URL(location.href);url.searchParams.set('repo',d.repo);
 url.searchParams.set('ref',d.ref);if(d.path)url.searchParams.set('path',d.path);else url.searchParams.delete('path');
 if(d.mode==='source')url.searchParams.set('view','source');else url.searchParams.delete('view');
 history.pushState(null,'',url.pathname+url.search);
 showDetail(d.repo,{ref:d.ref,path:d.path,mode:d.mode});
});
loadCatalog();
})();
