// Arc9 Lite hors ligne : la page est servie depuis le cache si le réseau manque,
// les fichiers versionnés (assets/) sont mis en cache au premier chargement.
const VERSION = "arc9-lite-v1";
const BASE = new URL("./", self.location).pathname;
const SHELL = ["", "manifest.webmanifest", "favicon.svg", "icon-192.png", "icon-512.png"].map((p) => BASE + p);

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await cache.addAll(SHELL);
    const html = await (await fetch(BASE, { cache: "no-store" })).text();
    const assets = [...html.matchAll(/(?:src|href)="\.?\/?(assets\/[^"]+)"/g)].map((m) => BASE + m[1]);
    await cache.addAll(assets);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res.ok) (await caches.open(VERSION)).put(BASE, res.clone());
        return res;
      } catch {
        return (await caches.match(BASE)) || Response.error();
      }
    })());
    return;
  }
  event.respondWith((async () => {
    const hit = await caches.match(req);
    if (hit) return hit;
    const res = await fetch(req);
    if (res.ok && url.pathname.startsWith(BASE + "assets/")) (await caches.open(VERSION)).put(req, res.clone());
    return res;
  })());
});
