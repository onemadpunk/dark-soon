// Dark Soon offline helper: keeps a copy of the game on the device so it plays without the internet.
// Each visit shows the saved copy at once and quietly fetches any update for next time.
const CACHE = 'dark-soon-v4';
const CORE = ['./', 'index.html', 'theme.mp3', 'music-house.mp3', 'music-woods.mp3', 'music-finale.mp3', 'music-cellar.mp3', 'music-roof.mp3', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

async function fromCache(req) {
  const cache = await caches.open(CACHE);
  const key = req.mode === 'navigate' ? 'index.html' : req.url.split('#')[0];
  const hit = await cache.match(key, { ignoreSearch: req.mode === 'navigate' });
  const fresh = fetch(req.mode === 'navigate' ? 'index.html' : key).then(res => {
    if (res.ok || res.type === 'opaque') cache.put(key, res.clone());
    return res;
  }).catch(() => null);
  if (hit) return hit;
  return (await fresh) || new Response('Offline', { status: 503 });
}
async function audioRange(req) { // iPhones and iPads ask for music in slices; serve the slice from the saved copy
  const res = await fromCache(new Request(req.url));
  const buf = await res.arrayBuffer(), m = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range')) || [];
  const start = Number(m[1] || 0), end = m[2] ? Math.min(Number(m[2]), buf.byteLength - 1) : buf.byteLength - 1;
  return new Response(buf.slice(start, end + 1), { status: 206, headers: {
    'Content-Type': 'audio/mpeg', 'Content-Range': `bytes ${start}-${end}/${buf.byteLength}`, 'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes' } });
}
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith('http')) return;
  if (req.headers.get('range') && req.url.endsWith('.mp3')) return e.respondWith(audioRange(req));
  e.respondWith(fromCache(req));
});
