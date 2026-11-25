import fs from "node:fs";
import crypto from "node:crypto";
const paths = fs
  .readdirSync("docs", { recursive: true })
  .filter((p) => p !== "sw.js" && fs.statSync("docs/" + p).isFile());
const precache = paths.filter((path) => !path.startsWith("cards/"));
const version = crypto.createHash("sha256");
for (const p of paths) version.update(fs.readFileSync("docs/" + p));
fs.writeFileSync(
  "docs/sw.js",
  `const prefix='vesper:'+self.registration.scope+':';const name=prefix+'${version.digest("hex").slice(0, 12)}';self.oninstall=e=>e.waitUntil(caches.open(name).then(c=>c.addAll(${JSON.stringify(["./", ...precache.map((p) => "./" + p)])})).then(()=>self.skipWaiting()));self.onactivate=e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(prefix)&&k!==name).map(k=>caches.delete(k)))).then(()=>clients.claim()));self.onfetch=e=>{if(e.request.method==='GET'&&new URL(e.request.url).origin===location.origin)e.respondWith(caches.open(name).then(async c=>(await c.match(e.request))||(e.request.mode==="navigate"?await c.match(new URL("./index.html",self.registration.scope).href):null)||fetch(e.request)))}`,
);
fs.appendFileSync(
  "docs/sw.js",
  `
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
`,
);
