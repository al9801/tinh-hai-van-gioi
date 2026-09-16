// Service worker tối giản: chỉ để app cài được lên màn hình chính.
// Chiến lược network-first — luôn lấy bản mới khi có mạng (khỏi kẹt code cũ theo ?v=N),
// chỉ dùng bản đã lưu khi mất mạng.
const CACHE = 'thvg-shell-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith((async () => {
    try {
      const res = await fetch(req);
      // chỉ lưu tài nguyên cùng gốc, tải thành công — để offline còn mở được vỏ app
      if (res && res.status === 200 && new URL(req.url).origin === location.origin) {
        const c = await caches.open(CACHE);
        c.put(req, res.clone());
      }
      return res;
    } catch (err) {
      const cached = await caches.match(req);
      if (cached) return cached;
      throw err;
    }
  })());
});
