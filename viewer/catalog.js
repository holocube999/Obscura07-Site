/* Sellone WebPlayer: original project catalog + GitHub HTML + invisible retro cores. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const q=new URLSearchParams(location.search);
const initial=(q.get('repo')||q.get('project')||'').trim().replace(/^holocube999\//i,'');
const validRepo=/^[A-Za-z0-9_.-]{1,100}$/;
const root=new URL('../',location.href), approvedPrefix=new URL('viewer/',root);
const GH=window.SelloneGitHub,Retro=window.SelloneRetro;
const all=[];
const types={web_js:'WEB',amiga_media:'AMIGA',native:'NATIVO',site:'SITO',archive:'ARCHIVIO'};
let selected=null,loaded=null,remoteMedia=null,mediaRevision=null,mode='web',busy=false;
function text(node,tag,value){const e=document.createElement(tag);e.textContent=value;node.append(e);return e}
function link(node,label,url,secondary){
 const a=text(node,'a',label);a.className='action'+(secondary?' secondary':'');a.href=url;return a;
}
function showStatus(msg,error=false){
 $('playerStatus').textContent=msg;
 $('playerStatus').style.color=error?'#ffc5d3':'#b7c9d6';
}
function approvedBuild(path){
 if(typeof path!=='string'||!/^viewer\/[A-Za-z0-9_.\/-]+\.html?$/i.test(path)||path.split('/').includes('..'))return '';
 const url=new URL(path,root);
 return url.origin===location.origin&&url.pathname.startsWith(approvedPrefix.pathname)&&!url.search&&!url.hash?url.href:'';
}
function viewLink(repo){return './?repo='+encodeURIComponent(repo)}
function byRepo(repo){return all.find(x=>x.repo.toLowerCase()===repo.toLowerCase())}
function card(item){
 const el=document.createElement('article');el.className='panel project';
 const head=text(el,'div','');head.className='head';
 text(head,'span',types[item.viewer_type]||'PROGETTO').className='eyebrow';
 text(head,'span',item.published?'Pubblicato':'GitHub').className='tag'+(item.published?' playable':'');
 text(el,'h3',item.title);
 text(el,'p',item.description);
 const acts=text(el,'div','');acts.className='actions';
 link(acts,'▶ Apri nel WebPlayer',viewLink(item.repo),false);
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
function emptyFrame(){const frame=$('playframe');frame.removeAttribute('src');frame.srcdoc='<!doctype html><title>Sellone WebPlayer</title><body style="background:#090b14;color:#b9c3d2;font:15px system-ui;padding:24px">Seleziona una build o un supporto da avviare.</body>';}
function showFrame(){ $('unavailable').classList.add('hidden');$('playarea').classList.remove('hidden');}
function presentMode(next){
 mode=next;const retro=next==='retro';
 $('webControls').classList.toggle('hidden',retro);
 $('retroControls').classList.toggle('hidden',!retro);
 $('switchMode').textContent=retro?'Apri HTML/JS':'Apri ADF/D64/T64';
 $('detailStatus').textContent=retro?'Emulazione retro con core dedicato':'Build web da GitHub · revisione verificata';
 showStatus(retro?'Carica un supporto locale oppure selezionalo dal repository GitHub.':'Caricamento della versione GitHub…');
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
 for(const id of ['loadLatest','reloadSelected','bootRetro','loadGitMedia'])$(id).disabled=active;
}
async function githubHTML(opts={}){
 if(!selected)return;
 enableUI(true);showFrame();showStatus('Lettura da GitHub e verifica SHA…');
 try{
  await Retro.stop();$('playarea').replaceChildren($('playframe')); // Restore the single sandboxed web frame.
  const ref=opts.pin?loaded?.ref:undefined;
  const path=opts.pin?$('htmlCandidates').value||loaded?.path:undefined;
  const result=await GH.load({repo:currentRepo(),ref,path});
  loaded=result;fillPaths($('htmlCandidates'),result.files||loaded.files||[],result.path);
  $('playframe').removeAttribute('src');
  $('playframe').srcdoc=result.html;
  $('detailStatus').textContent='HTML GitHub · '+result.path+' · commit '+result.ref.slice(0,12);
  showStatus('Caricata build verificata: '+result.path+' ('+(result.bytes/1024).toFixed(1)+' KiB).');
  const actions=$('detailActions');actions.replaceChildren();
  const a=link(actions,'↗ Commit GitHub','https://github.com/'+result.repo+'/commit/'+result.ref,true);
  a.target='_blank';a.rel='noopener noreferrer';
  const url=new URL(location.href);url.searchParams.set('repo',selected.repo);
  url.searchParams.delete('ref');url.searchParams.delete('path');
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
 showStatus('GitHub verificato · '+result.path+' · '+result.ref.slice(0,12)+' · avvio disponibile.');
}
async function boot(){
 const disk=$('mediaInput').files[0]||remoteMedia;
 const kick=$('kickInput').files[0]||null;
 if(!disk||!Retro.supported(disk)){showStatus('Seleziona un ADF, D64, T64 o PRG valido (massimo 3 MiB).',true);return}
 if(Retro.needsKick(disk)&&!Retro.validKick(kick)){
  showStatus('Per l’avvio Amiga seleziona una Kickstart valida e di tua disponibilità.',true);return;
 }
 enableUI(true);
 try{
  showFrame();const stage=$('playarea');stage.replaceChildren();
  const host=document.createElement('div');host.id='retroStage';stage.append(host);
  await Retro.start({media:disk,bios:kick,title:selected.title,host,onStatus:showStatus});
  $('detailStatus').textContent='Core retro · '+disk.name+' · '+(Retro.needsKick(disk)?'PUAE':'VICE');
 }catch(error){handleError(error)}
 finally{enableUI(false)}
}
function localBuild(item){
 const url=item.published?approvedBuild(item.url):'';
 if(!url)return false;
 showFrame();const stage=$('playarea');stage.replaceChildren($('playframe'));
 $('playframe').srcdoc='';$('playframe').src=url;
 $('detailStatus').textContent='Anteprima web pubblicata';
 const acts=$('detailActions');acts.replaceChildren();
 const a=link(acts,'↗ Apri a schermo intero',url);a.target='_blank';a.rel='noopener noreferrer';
 showStatus('Build web pubblica caricata.');return true;
}
function showDetail(repo){
 $('listing').classList.add('hidden');$('detail').classList.remove('hidden');
 selected=byRepo(repo)||{repo,title:repo,description:'Repository GitHub',viewer_type:'web_js',published:false};
 const item=selected;
 $('detailName').textContent=item.title;
 $('detailKind').textContent=types[item.viewer_type]||'PROGETTO';
 $('detailDescription').textContent=item.description||'';
 document.title=item.title+' · Sellone WebPlayer';
 const acts=$('detailActions');acts.replaceChildren();
 const page=link(acts,'↗ Repository','https://github.com/holocube999/'+encodeURIComponent(item.repo),true);
 page.target='_blank';page.rel='noopener noreferrer';
 const sw=$('switchMode');if(!sw){
  const button=document.createElement('button');button.id='switchMode';button.className='action secondary';button.type='button';
  acts.append(button);
  button.onclick=async()=>{await Retro.stop();presentMode(mode==='web'?'retro':'web');emptyFrame();if(mode==='web')githubHTML()};
 }
 presentMode(item.viewer_type==='amiga_media'?'retro':'web');
 emptyFrame();showFrame();
 if(item.published&&localBuild(item))return;
 if(mode==='web'&&item.viewer_type!=='archive'&&item.viewer_type!=='native')githubHTML();
 else showStatus('Seleziona una build o un supporto da GitHub.');
}
async function loadCatalog(){
 try{
  const response=await fetch('../catalog.json',{cache:'no-store',credentials:'omit'});
  if(!response.ok)throw Error('HTTP '+response.status);
  const data=await response.json();
  if(data.schema!==2||!Array.isArray(data.projects))throw Error('Catalogo incompatibile');
  const seen=new Set();
  for(const item of data.projects){
   if(!item||!validRepo.test(item.repo||'')||seen.has(item.repo.toLowerCase()))continue;
   seen.add(item.repo.toLowerCase());
   all.push({repo:item.repo,title:String(item.title||item.repo).slice(0,90),
    description:String(item.description||'').slice(0,250),kind:String(item.kind||''),
    viewer_type:types[item.viewer_type]?item.viewer_type:'archive',
    published:item.published===true&&!!approvedBuild(item.url),url:item.url});
  }
  if(initial&&validRepo.test(initial))showDetail(initial);
  else {listing();if(initial)$('message').textContent='Identificativo repository non valido'}
 }catch(error){$('message').textContent='Errore catalogo: '+String(error.message||error)}
}
$('search').oninput=()=>listing($('search').value);
$('loadLatest').onclick=()=>githubHTML();
$('reloadSelected').onclick=()=>githubHTML({pin:true});
$('htmlCandidates').onchange=()=>{if(loaded)githubHTML({pin:true})};
$('loadGitMedia').onclick=()=>githubMedia();
$('mediaCandidates').onchange=async()=>{try{await selectedMedia($('mediaCandidates').value)}catch(e){handleError(e)}};
$('mediaInput').onchange=()=>{remoteMedia=null;showStatus('Supporto locale selezionato; premi Avvia supporto.')};
$('bootRetro').onclick=()=>boot();
$('stopRetro').onclick=async()=>{await Retro.stop();$('playarea').replaceChildren($('playframe'));emptyFrame();showStatus('Emulatore fermato; supporti temporanei eliminati.')};
$('useGitToken').onclick=async()=>{
 try{
  await GH.setToken($('gitToken').value,$('gitPassword').value,$('saveToken').checked);
  $('gitToken').value='';$('gitPassword').value='';$('authBox').classList.add('hidden');
  if(mode==='retro')await githubMedia();else await githubHTML();
 }catch(e){handleError(e)}
};
$('unlockGitToken').onclick=async()=>{
 try{await GH.unlock($('gitPassword').value);$('gitPassword').value='';$('authBox').classList.add('hidden');if(mode==='retro')await githubMedia();else await githubHTML()}
 catch(e){handleError(e)}
};
$('forgetGitToken').onclick=()=>{GH.forget();$('authBox').classList.add('hidden');showStatus('Token cifrato eliminato.')};
loadCatalog();
})();
