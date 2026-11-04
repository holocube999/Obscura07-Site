/* Sellone UI: offline vector icons, historical revisions, touch-safe fullscreen. */
(()=>{'use strict';
const $=id=>document.getElementById(id),GH=window.SelloneGitHub,area=$('playarea');
if(!GH||!area)return;
const svg=(path,view='0 0 24 24')=>'<svg viewBox="'+view+'" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+path+'</svg>';
const glyphs={
 js:'<svg class="js-logo" viewBox="0 0 24 24" aria-hidden="true"><path fill="#F7DF1E" d="M0 0h24v24H0z"/><path fill="#151515" d="M11 7h2v9c0 3-2 4-5 3-1-.4-2-1.4-2.5-2.5l1.8-1c.3 1 1 1.7 2 1.7S11 16.5 11 15V7zm6 7c-3-1-3-4-1-5 2-1 5-.4 6 1.7l-1.7 1c-1-1.7-3-1.4-3.2-.5-.4 1.5 3.7 1.2 4.7 3.2 1.8 3.2-1 5.8-4 5.3-1.8-.3-3.2-1.5-3.5-2.8l1.8-1c.7 2.2 4.3 2.4 4.3.2 0-1-1.6-1.3-2.6-1.8z"/></svg>',
 original:svg('<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M9 21h6m-3-4v4"/>'),
 both:svg('<rect x="2" y="4" width="9" height="16" rx="1"/><rect x="13" y="4" width="9" height="16" rx="1"/>'),
 source:svg('<path d="m8 8-4 4 4 4m8-8 4 4-4 4m-3-11-2 14"/>'),
 reload:svg('<path d="M21 12a9 9 0 1 1-3-6.7M21 3v6h-6"/>'),
 play:svg('<path d="m7 4 14 8-14 8z"/>'),
 stop:svg('<rect x="5" y="5" width="14" height="14" rx="2"/>'),
 disk:svg('<rect x="3" y="2" width="18" height="20" rx="2"/><rect x="7" y="3" width="10" height="7"/><rect x="7" y="14" width="10" height="7"/><path d="M14 3v5"/>'),
 cassette:svg('<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="12" r="2"/><circle cx="16" cy="12" r="2"/><path d="M10 12h4m-9 6 3-4h8l3 4"/>'),
 chip:svg('<rect x="6" y="6" width="12" height="12" rx="1"/><path d="M9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4"/>'),
 expand:svg('<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>'),
 shrink:svg('<path d="M3 9h6V3m6 0v6h6M3 15h6v6m6 0v-6h6"/>'),
 history:svg('<path d="M3 12a9 9 0 1 0 3-6.7M3 3v6h6m3-2v5l3 2"/>')
};
function putIcon(el,icon){if(!el||el.querySelector('.sellone-icon'))return;const span=document.createElement('span');span.className='sellone-icon';span.innerHTML=glyphs[icon]||glyphs.disk;el.prepend(span)}
const modes={js:'js',original:'original',both:'both',source:'source'};
for(const b of document.querySelectorAll('#viewModes [data-view]'))putIcon(b,modes[b.dataset.view]);
for(const [id,key] of Object.entries({loadLatest:'play',reloadSelected:'reload',bootRetro:'play',stopRetro:'stop',loadGitMedia:'disk',openSource:'source',reloadSource:'reload',restartPair:'reload'}))putIcon($(id),key);
const mediaLabel=document.querySelector('label[for=mediaInput]'),kickLabel=document.querySelector('label[for=kickInput]');
if(mediaLabel)putIcon(mediaLabel,'disk');if(kickLabel)putIcon(kickLabel,'chip');
const indicator=document.createElement('span');indicator.className='sellone-platform';indicator.setAttribute('aria-label','Sistema originale');$('gameHeader')?.append(indicator);
function systemBadge(name){
 const names={c64:'C64',c128:'C128',vic20:'VIC-20',c16:'C16',amiga:'AMIGA'};
 return names[name]||'AUTO';
}
function platform(){
 const declared=String($('detail').dataset.originalSystem||'').toLowerCase();
 if(['c64','c128','vic20','c16','amiga'].includes(declared))return declared;
 const file=$('mediaInput')?.files?.[0]?.name||'';
 if(/\.adf$/i.test(file))return 'amiga';
 if(/\.(t64|d64|prg)$/i.test(file))return 'c64';
 return '';
}
function formatIcon(){const filename=$('mediaInput')?.files?.[0]?.name||'',sys=platform();
 const fmt=/\.([a-z0-9]+)$/i.exec(filename)?.[1]?.toLowerCase()||'';
 const isAmiga=sys==='amiga',isCommodore=['c64','c128','vic20','c16'].includes(sys);
 indicator.textContent=(isAmiga?'◉ ':isCommodore?'C= ':'')+systemBadge(sys);
 indicator.dataset.platform=sys||'unknown';
 if(mediaLabel){mediaLabel.querySelector('.sellone-icon')?.remove();putIcon(mediaLabel,fmt==='t64'?'cassette':'disk');mediaLabel.lastChild.textContent=isAmiga?' ADF':isCommodore?(fmt==='t64'?' T64 · Musicassetta':' D64 / T64 / PRG'):' ADF / D64 / T64 / PRG'}
 if(kickLabel){const hide= !isAmiga;kickLabel.classList.toggle('hidden',hide);$('kickInput')?.classList.toggle('hidden',hide)}
 if($('mediaInput'))$('mediaInput').accept=isAmiga?'.adf':isCommodore?'.d64,.t64,.prg':'.adf,.d64,.t64,.prg';
}
$('mediaInput')?.addEventListener('change',formatIcon);
new MutationObserver(formatIcon).observe($('detailName'),{childList:true,characterData:true,subtree:true});
const state=$('playerStatus');
function statusStyle(){const t=state.textContent.toLowerCase();state.classList.remove('sellone-ok','sellone-error','sellone-warning');
 if(/\b(errore|fallit|impossibile|non valido)\b/.test(t))state.classList.add('sellone-error');
 else if(/\b(verificat|pronto|riuscit|completat)\w*/.test(t)&&!/\b(non |in attesa)\b/.test(t))state.classList.add('sellone-ok');
 else if(/\b(attenzione|seleziona|mancante|non disponibile)\b/.test(t))state.classList.add('sellone-warning');
}
new MutationObserver(statusStyle).observe(state,{childList:true,characterData:true,subtree:true});statusStyle();formatIcon();
const dlg=document.createElement('dialog');dlg.id='sellone-history';
dlg.innerHTML='<div class="sellone-history-box"><header><h2>Altre versioni</h2><button type="button" class="history-close" aria-label="Chiudi">✕</button></header><p class="history-info"></p><div class="history-rows"></div></div>';
document.body.append(dlg);
dlg.querySelector('.history-close').onclick=()=>dlg.close();
dlg.addEventListener('click',e=>{if(e.target===dlg)dlg.close()});
function textNode(parent,tag,value,cls){const el=document.createElement(tag);if(cls)el.className=cls;el.textContent=value;parent.append(el);return el}
function displayDate(value){if(!value)return '';const d=new Date(value);return isNaN(d.getTime())?'':d.toLocaleDateString('it-IT',{day:'2-digit',month:'short',year:'numeric'})}
async function openHistory(repo,title){
 dlg.querySelector('h2').textContent='Versioni · '+title;
 const info=dlg.querySelector('.history-info'),rows=dlg.querySelector('.history-rows');
 info.textContent='Caricamento revisioni GitHub…';rows.replaceChildren();if(!dlg.open)dlg.showModal();
 try{
 const list=await GH.selloneVersions(repo);
 const render=items=>{
  for(const item of items){
   const btn=textNode(rows,'button','','history-entry');btn.type='button';
   textNode(btn,'strong',item.name,'entry-title');
   textNode(btn,'span',[displayDate(item.date),item.sha.slice(0,8)].filter(Boolean).join(' · '),'entry-meta');
   if(item.description)textNode(btn,'small',item.description,'entry-description');
   btn.onclick=async()=>{
    btn.disabled=true;info.textContent='Verifica revisione…';
    try{
     const path=item.path||await GH.selloneHistoricalPath(repo,item.ref,item.defaultPath);
     dlg.close();
     window.dispatchEvent(new CustomEvent('sellone:history-open',{detail:{repo,ref:item.ref,path}}));
    }catch(err){info.textContent=String(err.message||err);btn.disabled=false}
   };
  }
 };
 if(list.files.length){textNode(rows,'h3','Build HTML versionate');render(list.files)}
 if(list.revisions.length){textNode(rows,'h3','Revisioni GitHub · più recente prima');render(list.revisions)}
 info.textContent='Cronologia reale GitHub · fino a 50 commit, build versionate ordinate.';
 if(!list.files.length&&!list.revisions.length)info.textContent='Nessuna versione disponibile.';
 }catch(err){info.textContent='Storico non disponibile: '+String(err.message||err)}
}
function enhanceCards(){for(const card of document.querySelectorAll('#grid .project:not([data-history])')){
 const href=card.querySelector('a[href*="repo="]')?.href;if(!href)continue;
 const repo=new URL(href,location.href).searchParams.get('repo');if(!/^[A-Za-z0-9_.-]{1,100}$/.test(repo||''))continue;
 card.dataset.history='1';const btn=textNode(card,'button','Visualizza altre versioni','sellone-history-link');
 putIcon(btn,'history');btn.onclick=()=>openHistory(repo,card.querySelector('h3')?.textContent||repo);
}}
const grid=$('grid');if(grid){new MutationObserver(enhanceCards).observe(grid,{childList:true});enhanceCards()}
const btn=document.createElement('button');btn.id='sellone-fullscreen';btn.type='button';btn.setAttribute('aria-label','Schermo intero');btn.innerHTML='<span class="sellone-icon">'+glyphs.expand+'</span><span class="fs-label">Schermo intero</span>';area.append(btn);
let fallback=false,armed=false,timer=0,pointer='mouse';
const active=()=>document.fullscreenElement===area||fallback;
function clearArm(){armed=false;btn.classList.remove('fs-armed');clearTimeout(timer)}
function syncFs(){clearArm();const on=active();btn.querySelector('.sellone-icon').innerHTML=on?glyphs.shrink:glyphs.expand;btn.querySelector('.fs-label').textContent=on?'Riduci':'Schermo intero';btn.setAttribute('aria-label',on?'Riduci player':'Schermo intero');btn.setAttribute('aria-pressed',String(on))}
function setFallback(on){fallback=on;area.classList.toggle('sellone-fs-fallback',on);document.body.classList.toggle('sellone-fs-body',on);syncFs()}
async function exitFs(){if(document.fullscreenElement===area)try{await document.exitFullscreen()}catch{};if(fallback)setFallback(false);syncFs()}
btn.addEventListener('pointerdown',e=>{pointer=e.pointerType||'mouse'});
btn.onclick=async()=>{
 if(!active()){try{if(area.requestFullscreen){await area.requestFullscreen();syncFs();return}}catch{}setFallback(true);return}
 const touch=pointer==='touch'||pointer==='pen'||(matchMedia('(hover:none) and (pointer:coarse)').matches);
 if(touch&&!armed){armed=true;btn.classList.add('fs-armed');btn.querySelector('.fs-label').textContent='Tocca per ridurre';timer=setTimeout(syncFs,2500);return}
 await exitFs();
};
document.addEventListener('fullscreenchange',syncFs);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&fallback)exitFs()});
})();