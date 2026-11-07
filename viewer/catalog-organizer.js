/* Sellone WebViewer: catalog organization and release freshness.
 * Category is a product property, not an emulator/viewer runtime.
 * ES5-compatible browser global plus CommonJS for isolated tests.
 */
(function(global){
 "use strict";
 const HOURS=3600000;
 const CATEGORIES=Object.freeze([
  {id:"games",label:"Giochi & porting"},
  {id:"retro",label:"Emulatori & retro"},
  {id:"audio",label:"Audio & voce"},
  {id:"communication",label:"Rete & comunicazione"},
  {id:"systems",label:"Sistemi & piattaforme"},
  {id:"tools",label:"Tool & sviluppo"},
  {id:"research",label:"Archivi & ricerca"},
  {id:"web",label:"Web & servizi"},
  {id:"other",label:"Altri"}
 ]);
 const known=new Set(CATEGORIES.map(c=>c.id));
 const collator=new Intl.Collator("it",{sensitivity:"base",numeric:true});
 function categoryOf(item){
  if(known.has(item?.category))return item.category;
  const kind=String(item?.kind||"").toLocaleLowerCase("it");
  if(kind==="gioco")return "games";
  if(kind==="musica")return "audio";
  if(kind==="emulatore"||item?.viewer_type==="amiga_media")return "retro";
  if(kind==="archivio"||item?.viewer_type==="archive")return "research";
  if(kind==="utility")return "tools";
  if(kind==="sistema")return "systems";
  return "other";
 }
 function dateMillis(value,now=Date.now()){
  // Require a timezone to avoid browser-dependent parsing and local midnight.
  if(typeof value!=="string"||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(value))return 0;
  const ms=Date.parse(value);
  return Number.isFinite(ms)&&ms>0&&ms<=now+5*60000?ms:0;
 }
 function updatedAt(item){return item?.released_at||item?.updated_at||"";}
 function badgeState(date,now=Date.now()){
  const timestamp=dateMillis(date,now);
  if(!timestamp||timestamp>now)return null;
  const age=now-timestamp;
  if(age>=48*HOURS)return null;
  if(age<6*HOURS)return "blink";
  if(age<24*HOURS)return "fresh";
  return "dark";
 }
 function sortProjects(items,mode="recent",now=Date.now()){
  return [...items].sort((a,b)=>{
   if(mode!=="az"){
    const ta=dateMillis(updatedAt(a),now),tb=dateMillis(updatedAt(b),now);
    if(ta!==tb)return tb-ta;
   }
   return collator.compare(a.title||a.repo||"",b.title||b.repo||"");
  });
 }
 function norm(value){
  return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("it").trim();
 }
 function filterProjects(items,{filter="",category="all"}={}){
  const needle=norm(filter);
  return items.filter(item=>{
   const key=categoryOf(item);
   if(category!=="all"&&key!==category)return false;
   if(!needle)return true;
   const name=CATEGORIES.find(c=>c.id===key)?.label||"";
   return norm([item.title,item.repo,item.kind,item.description,name].join(" ")).includes(needle);
  });
 }
 function groupedProjects(items,{filter="",category="all",sort="recent",now=Date.now()}={}){
  const matching=filterProjects(items,{filter,category});
  return CATEGORIES.map(({id,label})=>({
   id,label,items:sortProjects(matching.filter(item=>categoryOf(item)===id),sort,now)
  })).filter(group=>group.items.length);
 }
 const API=Object.freeze({CATEGORIES,categoryOf,dateMillis,updatedAt,badgeState,
  sortProjects,filterProjects,groupedProjects});
 global.SelloneCatalogSort=API;
 if(typeof module!=="undefined"&&module.exports)module.exports=API;
})(typeof globalThis!=="undefined"?globalThis:this);
