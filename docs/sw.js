const prefix='vesper:'+self.registration.scope+':';const name=prefix+'bb4b171bbdc3';
const precache=["./","./.nojekyll","./favicon.svg","./index.html","./assets/Newspaper-DbtunUXW.css","./assets/Newspaper-u1VzOXn3.js","./assets/browser-BGjUbR1y.js","./assets/docx-DkFeQNcz.js","./assets/epub-D2oyokMb.js","./assets/exportImage-Bz0ON9xN.js","./assets/import.worker-DVhIpgR6.js","./assets/index-DmYKuSMU.js","./assets/index-Itos07Fs.css","./assets/markup-BqAg5MAF.js","./assets/pdf-BfGmYDAK.js","./assets/quill-cursor.png","./assets/quill.svg","./assets/react-vendor-DgHR5VOW.js","./assets/snape-placeholder.svg","./dict/LICENSE.txt","./dict/a.json","./dict/b.json","./dict/c.json","./dict/d.json","./dict/e.json","./dict/f.json","./dict/g.json","./dict/h.json","./dict/i.json","./dict/j.json","./dict/k.json","./dict/l.json","./dict/m.json","./dict/n.json","./dict/o.json","./dict/p.json","./dict/q.json","./dict/r.json","./dict/s.json","./dict/t.json","./dict/u.json","./dict/v.json","./dict/w.json","./dict/x.json","./dict/y.json","./dict/z.json","./import/pdf-resources.zip","./assets/shelf/banner-parchment.webp","./assets/shelf/bg-castle-moon.webp","./assets/shelf/font-license.txt","./assets/shelf/frame-corner-gold.svg","./assets/shelf/frame-wood-tile.webp","./assets/shelf/icon-cards.svg","./assets/shelf/icon-notebook.svg","./assets/shelf/icon-settings.svg","./assets/shelf/icon-shelf.svg","./assets/shelf/icon-words.svg","./assets/shelf/icon-writing.svg","./assets/shelf/night-grain.webp","./assets/shelf/prop-left-books-bottle.webp","./assets/shelf/prop-owl-letter.webp","./assets/shelf/prop-right-quill-inkwell.webp","./assets/shelf/serif-Bold.woff2","./assets/shelf/serif-Regular.woff2","./assets/shelf/sky-chart.svg","./assets/shelf/spine-texture-blue.webp","./assets/shelf/spine-texture-brown.webp","./assets/shelf/spine-texture-green.webp","./assets/shelf/spine-texture-maroon.webp","./assets/shelf/spine-texture-olive.webp","./assets/shelf/spine-texture-plum.webp","./assets/shelf/spine-texture-slate.webp","./assets/shelf/spine-texture-teal.webp","./assets/shelf/tabbar-parchment.webp","./assets/shelf/title-rule.svg"];
self.oninstall=e=>e.waitUntil(caches.open(name).then(c=>c.addAll(precache.map(path=>
  path==="./"||path==="./index.html"
    ? new Request(new URL(path,self.registration.scope),{cache:"reload"})
    : path
))).then(()=>self.skipWaiting()));
self.onactivate=e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(prefix)&&k!==name).map(k=>caches.delete(k)))).then(()=>clients.claim()));self.onfetch=e=>{if(e.request.method==='GET'&&new URL(e.request.url).origin===location.origin)e.respondWith(caches.open(name).then(async c=>(await c.match(e.request))||(e.request.mode==="navigate"?await c.match(new URL("./index.html",self.registration.scope).href):null)||fetch(e.request)))}
self.addEventListener("notificationclick", (event) => {
  if (!event.notification.tag.startsWith("study-timer:")) return;
  event.notification.close();
  event.waitUntil((async () => {
    const scope = self.registration.scope;
    const windows = await clients.matchAll({ type: "window", includeUncontrolled: true });
    const current = windows.find((client) => client.url.startsWith(scope));
    if (current) await current.focus();
    else await clients.openWindow(scope);
  })());
});
