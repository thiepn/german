export type OfflineState='UNSUPPORTED'|'UNINSTALLED'|'READY'|'PARTIAL';
export async function offlineState():Promise<OfflineState>{
 if(!('serviceWorker' in navigator)||!('caches' in window))return 'UNSUPPORTED';
 const reg=await navigator.serviceWorker.getRegistration();if(!reg?.active)return 'UNINSTALLED';
 const keys=await caches.keys();const name=keys.find(k=>k.startsWith('sprachgefuehl-shell-'));if(!name)return 'PARTIAL';
 const cache=await caches.open(name);const r=await cache.match('./index.html');if(!r)return 'PARTIAL';
 const html=await r.text();const assets=[...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(x=>x[1]).filter(x=>x.includes('/assets/')||x.startsWith('./assets/'));
 for(const asset of assets)if(!(await cache.match(asset)))return 'PARTIAL';
 return 'READY';
}
export async function installOfflineWorker():Promise<void>{
 if(!('serviceWorker' in navigator))return;
 if(location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1')await navigator.serviceWorker.register(new URL('./sw.js',document.baseURI),{scope:'./'});
}
