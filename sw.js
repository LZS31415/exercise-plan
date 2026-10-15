const CACHE = 'exercise-plan-v2';
const FONTS = 'exercise-plan-fonts';
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== FONTS).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Fetch a fresh copy of the page and save it for next launch.
function refreshPage() {
  return fetch('index.html', { cache: 'no-cache' })
    .then(res => { if (res.ok) return caches.open(CACHE).then(c => c.put('index.html', res)); })
    .catch(() => {});
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Page: open the saved copy instantly, update it in the background for next time.
  if (req.mode === 'navigate') {
    e.respondWith(caches.match('index.html').then(hit => {
      if (hit) { e.waitUntil(refreshPage()); return hit; }
      return fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put('index.html', copy)); return res; });
    }));
    return;
  }

  // Fonts: keep them in their own cache so they survive app updates.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONTS).then(c => c.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok || res.type === 'opaque') c.put(req, res.clone());
      return res;
    }))));
    return;
  }

  // Icons and manifest: cache first.
  e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});
