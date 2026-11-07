/* Optional online news metadata. Fails closed if network/CORS is unavailable. */
const SOURCES={
 it:{query:'(cultura OR tecnologia OR scienza OR economia) sourcelang:italian',domains:['rainews.it','ilpost.it','ilsole24ore.com','repubblica.it','corriere.it']},
 en:{query:'(science OR technology OR culture OR economy) sourcelang:english',domains:['reuters.com','bbc.com','apnews.com','theguardian.com']},
 fr:{query:'(culture OR technologie OR science) sourcelang:french',domains:['lemonde.fr','francetvinfo.fr']},
 de:{query:'(kultur OR technik OR wissenschaft) sourcelang:german',domains:['tagesschau.de','dw.com']},
 es:{query:'(cultura OR tecnologia OR ciencia) sourcelang:spanish',domains:['elpais.com','rtve.es']}
};
function when(seendate){
 const text=String(seendate||'');
 if(/^\d{8}T\d{6}Z$/.test(text))return Date.UTC(+text.slice(0,4),+text.slice(4,6)-1,+text.slice(6,8),+text.slice(9,11),+text.slice(11,13),+text.slice(13,15));
 return Date.parse(text);
}
function clean(s){return String(s||'').replace(/<[^>]*>/g,'').replace(/&(?:amp|quot|lt|gt|#39);/gi,v=>({'&amp;':'&','&quot;':'"','&lt;':'<','&gt;':'>','&#39;':"'"})[v.toLowerCase()]||' ').replace(/\s+/g,' ').trim().slice(0,180);}
export function verifiedHeadline(record,language='it',now=Date.now()){
 const cfg=SOURCES[language]||SOURCES.en;
 if(!record||typeof record.title!=='string'||typeof record.url!=='string')return null;
 let url;try{url=new URL(record.url);}catch{return null;}
 if(url.protocol!=='https:')return null;
 const host=url.hostname.replace(/^www\./,'');
 if(!cfg.domains.some(d=>host===d||host.endsWith('.'+d)))return null;
 const date=when(record.seendate);
 if(!Number.isFinite(date)||date>now+600000||now-date>36*3600*1000)return null;
 const title=clean(record.title);
 if(title.length<12||title.length>180)return null;
 return {title,url:url.href,source:host,published:new Date(date).toISOString(),verified:true};
}
export async function fetchVerifiedNews(language='it',{timeoutMs=4500,fetchImpl=globalThis.fetch,now=Date.now()}={}){
 if(typeof fetchImpl!=='function')return [];
 const cfg=SOURCES[language]||SOURCES.en;
 const url=new URL('https://api.gdeltproject.org/api/v2/doc/doc');
 url.searchParams.set('query',cfg.query);url.searchParams.set('mode','artlist');
 url.searchParams.set('format','json');url.searchParams.set('timespan','24h');
 url.searchParams.set('maxrecords','40');url.searchParams.set('sort','datedesc');
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const res=await fetchImpl(url.toString(),{mode:'cors',cache:'no-store',referrerPolicy:'no-referrer',signal:controller.signal});
  if(!res?.ok)return [];
  const data=await res.json();
  return (Array.isArray(data.articles)?data.articles:[]).map(x=>verifiedHeadline(x,language,now))
   .filter(Boolean).slice(0,10);
 }catch{return [];}finally{clearTimeout(timer);}
}
