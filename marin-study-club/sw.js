// Service worker: rende l'app installabile e veloce. Le chiamate all'AI non vengono mai salvate.
const CACHE = 'marin-v1';
const STATIC = ['/', '/index.html', '/firebase-config.js', '/marin.webp', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png', '/manifest.webmanifest'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.pathname.startsWith('/api/')) return;
  if (u.origin === location.origin && (e.request.mode === 'navigate' || u.pathname === '/' || u.pathname.endsWith('.html') || u.pathname.endsWith('config.js'))) {
    // pagina: prima la rete (così vedi sempre l'ultima versione), poi la copia salvata
    e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match('/'))));
    return;
  }
  if (u.origin === location.origin || u.hostname.endsWith('cdnjs.cloudflare.com') || u.hostname === 'fonts.gstatic.com' || u.hostname === 'fonts.googleapis.com') {
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => { if (r.ok && !u.pathname.endsWith('.mp3')) { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); } return r; })));
  }
});
