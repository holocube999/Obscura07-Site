/* Random[null]Radio offline app shell - static-origin cache only.
 * No news scraping, API tokens, telemetry, user text or PCM persisted.
 * Works after the initial successful online visit and install.
 */
const CACHE="rnr-static-v11";
const STATIC=[
 "./","./index.html","./embed.html","./embed.js","./widget.js",
 "./widget.css","./site-dock.js","./site-dock.css",
 "./radio.js","./arrangement.js","./musical-form.js","./composition-coherence.js","./lyrics.js","./rap-poetics.js","./music-dna.js","./playlist-core.js","./karaoke.js","./speaker.js","./station-director.js","./news-source.js","./share.js",
 "./linguistic-corpus.js","./vocal-director.js","./phonology.js","./articulatory-dsp.js","./voice-genome.js","./voice-render.js","./cover-art.js",
 "./async.js","./render-worker.js","./transition.js",
 "./api.js","./bridge.js","./encode.js",
 "./vendor/lame.min.js"
];
self.addEventListener("install",event=>{
 event.waitUntil(caches.open(CACHE).then(async cache=>{
  // Optional assets may be missing in preview branches; cache independently.
  for(const path of STATIC){
   try{await cache.add(new Request(new URL(path,self.registration.scope),
     {cache:"reload"}));}catch(_){}
  }
 }).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",event=>{
 event.waitUntil(Promise.all([
  caches.keys().then(keys=>Promise.all(keys.filter(k=>
   k.startsWith("rnr-static-")&&k!==CACHE).map(k=>caches.delete(k)))),
  self.clients.claim()
 ]));
});
self.addEventListener("fetch",event=>{
 const request=event.request;
 if(request.method!=="GET")return;
 const url=new URL(request.url);
 if(url.origin!==self.location.origin||
    !url.pathname.startsWith(new URL(self.registration.scope).pathname))return;
 const isCode=["script","worker","style"].includes(request.destination||"")||
  /\.(?:js|css)$/.test(url.pathname);
 const network=()=>fetch(request).then(response=>{
  if(response.ok&&["script","style","document","worker",""].includes(request.destination||"")){
   const copy=response.clone();
   event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)));
  }
  return response;
 });
 // Refresh scripts and styles online; retain exact same local files offline.
 event.respondWith(isCode?
  network().catch(()=>caches.match(request).then(cached=>cached||Response.error())):
  caches.match(request).then(cached=>cached||network()));

});
