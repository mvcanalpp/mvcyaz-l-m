self.addEventListener('install', event => event.waitUntil(caches.open('mvc-kesif-v3').then(cache => cache.addAll(['./','./index.html','./manifest.webmanifest']))));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== 'mvc-kesif-v3').map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => { if (event.request.method !== 'GET') return; event.respondWith(fetch(event.request).catch(() => caches.match(event.request))); });
self.addEventListener('notificationclick', event => { event.notification.close(); event.waitUntil(clients.matchAll({ type:'window', includeUncontrolled:true }).then((windows) => windows[0] ? windows[0].focus() : clients.openWindow('./'))); });
