const CACHE='sprachgefuehl-shell-0.1';
const APP_SHELL=['./','./index.html','./manifest.webmanifest','./icon.svg'];
function bundledAssets(html){
 const assets=[];
 for(const match of html.matchAll(/(?:src|href)="([^"]+)"/g)){const value=match[1];if(value.includes('/assets/')||value.startsWith('./assets/'))assets.push(value);}
 return [...new Set(assets)];
}
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const html=await fetch('./index.html',{cache:'no-store'});if(!html.ok)throw Error('offline shell unavailable');
 const assets=bundledAssets(await html.text());
 const cache=await caches.open(CACHE);await cache.addAll([...APP_SHELL,...assets]);await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('sprachgefuehl-shell-')&&k!==CACHE).map(k=>caches.delete(k)));await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 const request=event.request;if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
 event.respondWith((async()=>{const cache=await caches.open(CACHE);const cached=await cache.match(request);if(cached)return cached;
 try{const response=await fetch(request);if(response.ok&&response.type==='basic')await cache.put(request,response.clone());return response;}
 catch{if(request.mode==='navigate'){const fallback=await cache.match('./index.html');if(fallback)return fallback;}return new Response('Offline nicht verfügbar',{status:503});}})());
});
