'use strict';
// Network-only: keep authentication and inventory responses out of offline caches.
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  if (event.request.mode !== 'navigate' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).catch(() => new Response(
    '<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#087965"><title>جرد — لا يوجد اتصال</title><body style="font:18px Tahoma,sans-serif;background:#f4f6f8;color:#203d35;text-align:center;padding:15vh 24px;line-height:1.9"><h1>جرد</h1><h2>لا يوجد اتصال بالإنترنت</h2><p>تحتاج اتصالًا لفتح جلسات الجرد وحفظ الكميات.</p><a href="/" style="color:#087965">إعادة المحاولة</a></body></html>',
    {status: 503, headers: {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store'}}
  )));
});
