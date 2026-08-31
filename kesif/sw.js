self.addEventListener('install', event => event.waitUntil(caches.open('mvc-kesif-v2').then(cache => cache.addAll(['./','./index.html','./app.js','./manifest.webmanifest']))));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request))));
self.addEventListener('notificationclick', event => { event.notification.close(); event.waitUntil(clients.matchAll({ type:'window', includeUncontrolled:true }).then((windows) => windows[0] ? windows[0].focus() : clients.openWindow('./'))); });
