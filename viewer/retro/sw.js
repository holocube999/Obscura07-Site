/* Temporary, local media are only served under this worker's virtual namespace. */
'use strict';
const CACHE='sellone-retro-session-v1';
self.addEventListener('install',e=>e.waitUntil(self.skipWaiting()));
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{
 const url=new URL(e.request.url),scope=new URL(self.registration.scope);
 if(url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname+'virtual/'))return;
 e.respondWith(caches.open(CACHE).then(c=>c.match(e.request)).then(r=>r||new Response('Media not found',{status:404,headers:{'Content-Type':'text/plain','Cache-Control':'no-store'}})));
});
