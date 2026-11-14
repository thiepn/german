const CACHE='sprachgefuehl-shell-__SG_BUILD_FINGERPRINT__';
const APP_SHELL=['./','./index.html','./manifest.webmanifest','./icon.svg'];
function bundledAssets(html){
 const assets=[];
 for(const match of html.matchAll(/(?:src|href)="([^"]+)"/g)){const value=match[1];if(value.includes('/assets/')||value.startsWith('./assets/'))assets.push(value);}
 return [...new Set(assets)];
}
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const html=await fetch('./index.html',{cache:'no-store'});if(!html.ok)throw Error('offline shell unavailable');
 const htmlText=await html.text(),assets=bundledAssets(htmlText);
 // Cache exactly the index fetched for THIS worker build; cache.addAll on
 // shell HTML could re-fetch a previously installed index across upgrades.
 const headers=new Headers(html.headers);headers.delete('vary');headers.delete('content-length');
 const fresh=new Response(htmlText,{status:html.status,statusText:html.statusText,headers});
 const cache=await caches.open(CACHE);
 await cache.addAll(['./manifest.webmanifest','./icon.svg',...assets].map(url=>new Request(url,{cache:'no-store'})));
 await cache.put('./index.html',fresh.clone());
 await cache.put('./',fresh.clone());
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('sprachgefuehl-shell-')&&k!==CACHE).map(k=>caches.delete(k)));await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 const request=event.request;if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
 event.respondWith((async()=>{const cache=await caches.open(CACHE);const path=new URL(request.url).pathname;
 // Shell navigation MUST use this active worker's own index, not a stale
 // network/HTTP-cached prior build after upgrade or rollback. Limit this
 // to exact scoped root/index routes: never intercept other origin routes.
 const appRoot=new URL(self.registration.scope).pathname;
 const shellIndex=new URL('./index.html',self.registration.scope).pathname;
 if(request.mode==='navigate'&&(path===appRoot||path===shellIndex)){
  const shell=await cache.match('./index.html',{ignoreVary:true});
  if(shell)return shell;
 }
 // Only content-hashed static JS/CSS can bypass Vary mismatches after a worker update.
 // All other requests keep strict Cache API matching to avoid wrong response variants.
 const immutableShellAsset=/\/assets\/[^/]+\.(?:js|css)$/.test(path);
 const cached=await cache.match(request,immutableShellAsset?{ignoreVary:true}:undefined);if(cached)return cached;
 try{const response=await fetch(request);if(response.ok&&response.type==='basic')await cache.put(request,response.clone());return response;}
 catch{if(request.mode==='navigate'){const fallback=await cache.match('./index.html');if(fallback)return fallback;}return new Response('Offline nicht verfügbar',{status:503});}})());
});
