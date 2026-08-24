const C='travel-v16';
const CORE=['./','./index.html','./app.js?v=16','./sync.js?v=16','./places.json?v=3','./manifest.json',
 './icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png',
 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js','https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css'];
self.addEventListener('install',e=>{self.skipWaiting();
 e.waitUntil(caches.open(C).then(c=>Promise.allSettled(CORE.map(u=>c.add(u)))))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url);
 if(e.request.method!=='GET')return;
 // 지도 타일: 캐시 우선 (오프라인 대비)
 if(u.hostname.includes('basemaps.cartocdn.com')){
  e.respondWith(caches.open('tiles').then(c=>c.match(e.request).then(r=>r||fetch(e.request).then(res=>{c.put(e.request,res.clone());return res}).catch(()=>r))));return}
 // 앱 셸/데이터: 네트워크 우선, 실패 시 캐시
 e.respondWith(fetch(e.request).then(res=>{
   const cl=res.clone();caches.open(C).then(c=>c.put(e.request,cl));return res
 }).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});