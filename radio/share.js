/* Standalone, offline-safe song links. No external audio storage. */
export function createSongLink(base,plan,{lyricsVariant=0,lyrics=""}={}){
 const url=new URL(base);url.hash="";url.search="";
 url.searchParams.set("seed",plan.seed);
 if(lyricsVariant>0)url.searchParams.set("lv",String(Math.min(9999,Math.floor(lyricsVariant))));
 const text=String(lyrics||"").slice(0,3200).trim();
 if(text)url.searchParams.set("lyrics",text);
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
