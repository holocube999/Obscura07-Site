/* Sellone WebViewer: grouped project catalog, verified freshness metadata.
 * Public GitHub metadata is optional: no token, private project enumeration,
 * invented dates, client dependencies, or alternate viewer runtimes.
 */
(function(global){
 "use strict";
 const Organizer=global.SelloneCatalogSort;
 const $=id=>document.getElementById(id);
 const get=key=>{try{return localStorage.getItem(key)||""}catch{return""}};
 const set=(key,value)=>{try{localStorage.setItem(key,value)}catch{}};
 const CACHE="sellone-viewer-revisions-v1",TTL=15*60000;
 const validRepo=/^[A-Za-z0-9_.-]{1,100}$/;
 let projects=[],makeCard=()=>document.createElement("article");
 let sortMode=get("sellone-viewer-sort")==="az"?"az":"recent";
 let categoryMode=Organizer?.CATEGORIES.some(c=>c.id===get("sellone-viewer-category"))?
   get("sellone-viewer-category"):"all";
 let currentSearch="",timerStarted=false,active=true;
 function element(tag,className,text){
  const node=document.createElement(tag);
  if(className)node.className=className;
  if(text!==undefined)node.textContent=text;
  return node;
 }
 function freshness(row,date){
  const status=Organizer.badgeState(date);
  let marker=row.querySelector(".new-badge");
  if(!status){marker?.remove();return;}
  if(!marker){marker=element("span","new-badge","NEW");row.append(marker);}
  marker.className="new-badge "+(status==="blink"?"is-blink":status==="dark"?"is-dark":"is-fresh");
  marker.title=status==="blink"?"Aggiornato nelle ultime 6 ore":
    status==="fresh"?"Aggiornato nelle ultime 24 ore":"Aggiornato nelle ultime 48 ore";
 }
 function decorate(card,item){
  const date=Organizer.updatedAt(item);
  if(!Organizer.dateMillis(date))return card;
  const row=element("div","project-release");
  row.dataset.date=date;
  row.append(element("span","",item.released_at?"Rilascio":"Aggiornato"));
  const time=element("time","",new Intl.DateTimeFormat("it-IT",{
   day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"
  }).format(new Date(date)));
  time.dateTime=date;
  time.title=item.released_at?"Data rilascio ufficiale":"Ultimo push verificato, non necessariamente una release";
  row.append(time);freshness(row,date);
  const actions=card.querySelector(".actions");
  if(actions)card.insertBefore(row,actions);else card.append(row);
  return card;
 }
 function refreshBadges(){
  if(!active)return;
  for(const row of ($("grid")?.querySelectorAll(".project-release[data-date]")||[]))
   freshness(row,row.dataset.date);
 }
 function list(items=projects,search=currentSearch,card=makeCard){
  if(!Organizer)throw Error("Organizzatore del catalogo assente");
  currentSearch=String(search||"");
  const groups=Organizer.groupedProjects(items,{
   filter:currentSearch,category:categoryMode,sort:sortMode,now:Date.now()
  });
  const grid=$("grid");grid.replaceChildren();
  let count=0;
  for(const group of groups){
   const section=element("section","catalog-group");section.dataset.category=group.id;
   const head=element("header","catalog-group-header");
   head.append(element("h2","",group.label));
   head.append(element("span","catalog-count",String(group.items.length)));
   const cards=element("div","grid");
   for(const item of group.items){cards.append(decorate(card(item),item));count++;}
   section.append(head,cards);grid.append(section);
  }
  $("stats").textContent=count+" / "+items.length+" progetti · "+
    items.filter(item=>item.published).length+" anteprime pubbliche";
  $("message").textContent=count?"":"Nessun progetto corrispondente";
 }
 function init(items,card,{visible=true}={}){
  projects=items;makeCard=card;active=Boolean(visible);
  const category=$("categoryFilter"),sort=$("sortOrder");
  if(category&&sort&&Organizer){
   const known=new Set(items.map(item=>Organizer.categoryOf(item)));
   for(const entry of Organizer.CATEGORIES){
    if(!known.has(entry.id))continue;
    const option=element("option","",entry.label);option.value=entry.id;category.append(option);
   }
   if(categoryMode!=="all"&&!known.has(categoryMode))categoryMode="all";
   category.value=categoryMode;sort.value=sortMode;
   category.onchange=()=>{categoryMode=category.value;set("sellone-viewer-category",categoryMode);list()};
   sort.onchange=()=>{sortMode=sort.value==="az"?"az":"recent";set("sellone-viewer-sort",sortMode);list()};
  }
  if(!timerStarted&&typeof setInterval==="function"){timerStarted=true;setInterval(refreshBadges,60000);}
  if(active)void updateDates();
 }
 function apply(meta){
  for(const item of projects){
   if(item.released_at)continue;
   const date=item.release_path?meta?.paths?.[item.release_path]:
     meta?.repos?.[item.repo.toLowerCase()];
   if(Organizer.dateMillis(date))item.updated_at=date;
  }
  if(active)list();
 }
 async function updateDates(){
  if(!active)return;
  let cached=null;
  try{cached=JSON.parse(get(CACHE)||"null")}catch{}
  if(cached?.at&&Date.now()-cached.at<TTL){apply(cached);return;}
  const controller=typeof AbortController==="function"?new AbortController():null;
  const timer=setTimeout(()=>controller?.abort(),9500);
  const request=async url=>{
   const r=await fetch(url,{
    credentials:"omit",mode:"cors",cache:"no-store",referrerPolicy:"no-referrer",
    signal:controller?.signal
   });
   if(!r.ok)throw Error("GitHub HTTP "+r.status);
   return r.json();
  };
  try{
   const meta={at:Date.now(),repos:{},paths:{}};
   for(let page=1;page<=2;page++){
    const all=await request("https://api.github.com/users/holocube999/repos?type=owner&per_page=100&sort=pushed&page="+page);
    if(!Array.isArray(all))throw Error("Risposta GitHub invalida");
    for(const item of all)if(validRepo.test(item.name||"")&&Organizer.dateMillis(item.pushed_at))
     meta.repos[item.name.toLowerCase()]=item.pushed_at;
    if(all.length<100)break;
   }
   // First-party deployed applications use their OWN subfolder's last change,
   // not a recent unrelated push to Obscura07-Site.
   const paths=[...new Set(projects.filter(p=>p.published&&p.release_path).map(p=>p.release_path))];
   await Promise.all(paths.map(async path=>{
    try{
     const uri="https://api.github.com/repos/holocube999/Obscura07-Site/commits?per_page=1&path="+encodeURIComponent(path);
     const rows=await request(uri);
     const date=rows?.[0]?.commit?.committer?.date||rows?.[0]?.commit?.author?.date;
     if(Organizer.dateMillis(date))meta.paths[path]=date;
    }catch{}
   }));
   set(CACHE,JSON.stringify(meta));
   apply(meta);
  }catch{if(cached?.at)apply(cached)}
  finally{clearTimeout(timer)}
 }
 global.SelloneCatalogUI=Object.freeze({init,list,refreshBadges,updateDates});
})(typeof globalThis!=="undefined"?globalThis:this);
