const prefix='vesper:'+self.registration.scope+':';const name=prefix+'2abd44938b12';
const precache=["./","./.nojekyll","./favicon.svg","./index.html","./assets/Newspaper-BskoMYsw.css","./assets/Newspaper-CItWflAw.js","./assets/browser-BGjUbR1y.js","./assets/docx-6ElOVYv3.js","./assets/epub-Dp0BSv0G.js","./assets/exportImage-DBE18pXE.js","./assets/import.worker-I9cflfqa.js","./assets/index-CiOWcYJ8.css","./assets/index-Cn3LFR9J.js","./assets/markup-BqAg5MAF.js","./assets/pdf-DsKaTWpe.js","./assets/quill-cursor.png","./assets/quill.svg","./assets/react-vendor-UILPNB0H.js","./assets/snape-placeholder.svg","./dict/LICENSE.txt","./dict/a.json","./dict/b.json","./dict/c.json","./dict/d.json","./dict/e.json","./dict/f.json","./dict/g.json","./dict/h.json","./dict/i.json","./dict/j.json","./dict/k.json","./dict/l.json","./dict/m.json","./dict/n.json","./dict/o.json","./dict/p.json","./dict/q.json","./dict/r.json","./dict/s.json","./dict/t.json","./dict/u.json","./dict/v.json","./dict/w.json","./dict/x.json","./dict/y.json","./dict/z.json","./import/pdf-resources.zip"];
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
