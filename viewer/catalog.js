(()=>{'use strict';
const $=id=>document.getElementById(id);
const qs=new URLSearchParams(location.search);
const requested=(qs.get('repo')||qs.get('project')||'').trim();
const validRepo=/^[A-Za-z0-9_.-]{1,100}$/;
const catalogBase=new URL('../',location.href);
const approvedPrefix=new URL('viewer/',catalogBase);
const status=$('message');
const grid=$('grid');
const all=[];
const VIEWER_TYPES={web_js:{label:'WEB',playable:true},amiga_media:{label:'AMIGA',playable:true},native:{label:'NATIVO',playable:false},site:{label:'SITO',playable:true},archive:{label:'ARCHIVIO',playable:false}};
function write(node,tag,value){const el=document.createElement(tag);el.textContent=value;node.append(el);return el}
function link(node,value,href,secondary){
 const a=write(node,'a',value);a.href=href;a.className='action'+(secondary?' secondary':'');return a;
}
function viewLink(repo){return './?repo='+encodeURIComponent(repo)}
function approvedBuild(url){
 if(typeof url!=='string'||!url.startsWith('viewer/'))return '';
 try{
  const u=new URL(url,catalogBase);
  if(u.origin!==location.origin||!u.pathname.startsWith(approvedPrefix.pathname)||u.search||u.hash||u.username||u.password)return '';
  if(!/\.html?$/i.test(u.pathname))return '';
  return u.href;
 }catch{return ''}
}
function byRepo(repo){return all.find(x=>x.repo.toLowerCase()===repo.toLowerCase())||null}
function buildCard(item){
 const card=document.createElement('article');card.className='panel project';
 const head=write(card,'div');head.className='head';
 write(head,'span',(VIEWER_TYPES[item.viewer_type]||VIEWER_TYPES.archive).label).className='eyebrow';
 const badge=write(head,'span',item.published?'Online':'Sviluppo');
 badge.className='tag'+(item.published?' playable':'');
 write(card,'h3',item.title);
 write(card,'p',item.description);
 const actions=write(card,'div');actions.className='actions';
 link(actions,item.published?'▶ Apri e prova':'Apri scheda',viewLink(item.repo),!item.published);
 return card;
}
function drawListing(filter){
 grid.replaceChildren();
 const query=(filter||'').toLocaleLowerCase('it');
 let count=0;
 for(const item of all){
  if(query&&!String(item.title+' '+item.repo+' '+item.kind).toLocaleLowerCase('it').includes(query))continue;
  grid.append(buildCard(item));count++;
 }
 $('stats').textContent=count+' / '+all.length+' progetti · '+all.filter(i=>i.published).length+' build web pubblicate';
 status.textContent=count?'':'Nessun progetto corrispondente.';
}
function showDetail(repo){
 $('listing').classList.add('hidden');$('detail').classList.remove('hidden');
 const item=byRepo(repo)||{repo,title:repo,kind:'Progetto',description:'In sviluppo.',published:false,url:null};
 // Notification/deep-link to a published playable HTML must launch directly.
 // An embedded iframe can be refused by browser CSP / nested sandbox policy.
 const type=VIEWER_TYPES[item.viewer_type]||VIEWER_TYPES.archive;
 const direct=(type.playable&&item.published===true)?approvedBuild(item.url):'';
 if(direct){window.location.replace(direct);return;}
 $('detailName').textContent=item.title;
 $('detailKind').textContent=(VIEWER_TYPES[item.viewer_type]||VIEWER_TYPES.archive).label;
 $('detailDescription').textContent=item.description||'';
 document.title=item.title+' · Sellone Viewer';
 const actions=$('detailActions');actions.replaceChildren();
 const playable=item.published===true?approvedBuild(item.url):'';
 if(playable){
  $('detailStatus').textContent='Anteprima web';
  $('unavailable').classList.add('hidden');$('playarea').classList.remove('hidden');
  const frame=$('playframe');
  frame.src=playable;
  const btn=link(actions,'↗ Apri a schermo intero',playable,false);
  btn.target='_blank';btn.rel='noopener noreferrer';
  link(actions,'↻ Ricarica',viewLink(repo),true);
 }else{
  $('playframe').removeAttribute('src');
  $('playarea').classList.add('hidden');$('unavailable').classList.remove('hidden');
  $('detailStatus').textContent='Nessuna build web';
 }
}
async function refresh(){
 try{
  const response=await fetch('../catalog.json',{cache:'no-store',credentials:'omit'});
  if(!response.ok)throw Error('HTTP '+response.status);
  const c=await response.json();
  if(!c||c.schema!==2||!Array.isArray(c.projects))throw Error('Formato catalogo non compatibile');
  const next=[];
  const unique=new Set();
  for(const value of c.projects){
   if(!value||!validRepo.test(value.repo||''))continue;
   if(unique.has(value.repo.toLowerCase()))continue;
   unique.add(value.repo.toLowerCase());
   next.push({repo:value.repo,title:String(value.title||value.repo).slice(0,90),
    kind:String(value.kind||'Progetto').slice(0,40),description:String(value.description||'').slice(0,250),
    url:value.url,viewer_type:VIEWER_TYPES[value.viewer_type]?value.viewer_type:'archive',
    published:value.published===true&&!!approvedBuild(value.url)});
  }
  all.splice(0,all.length,...next);
  if(requested&&validRepo.test(requested)){showDetail(requested)}
  else{drawListing($('search').value);if(requested)status.textContent='Identificativo progetto non valido.'}
 }catch(error){status.textContent='Catalogo non raggiungibile: '+String(error.message||error);}
}
$('search').addEventListener('input',()=>drawListing($('search').value));
refresh();
})();