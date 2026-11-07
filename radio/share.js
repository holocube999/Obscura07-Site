/* Standalone, offline-safe song links. No external audio storage. */
export function createSongLink(base,plan,{lyricsVariant=0,lyrics="",voiceMix=.22,speaker=false}={}){
 const url=new URL(base);url.hash="";url.search="";
 url.searchParams.set("seed",plan.seed);
 url.searchParams.set("vox",plan.withVox?"1":"0");
 url.searchParams.set("style",plan.style);
 url.searchParams.set("mood",plan.mood);
 url.searchParams.set("concept",plan.concept);
 url.searchParams.set("lang",plan.language);
 url.searchParams.set("duration",String(plan.duration));
 if(lyricsVariant>0)url.searchParams.set("lv",String(Math.min(Number.MAX_SAFE_INTEGER-1,Math.floor(lyricsVariant))));
 const text=String(lyrics||"").slice(0,3200).trim();
 if(text)url.searchParams.set("lyrics",text);
 url.searchParams.set("vm",String(Math.round(Math.max(0,Math.min(1,voiceMix))*100)));
 if(speaker)url.searchParams.set("sp","1");
 url.searchParams.set("engine",plan.version||"0.6.0");
 return url.toString();
}
export function shareTargets(link,title){
 const text="Ascolta "+String(title||"Random[null]Radio");
 return {
  whatsapp:"https://api.whatsapp.com/send?text="+encodeURIComponent(text+" "+link),
  telegram:"https://t.me/share/url?url="+encodeURIComponent(link)+"&text="+encodeURIComponent(text),
  email:"mailto:?subject="+encodeURIComponent(title||"Random[null]Radio")+
   "&body="+encodeURIComponent(text+"\n"+link)
 };
}
