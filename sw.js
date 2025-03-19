// sw.js

self.addEventListener('install', function(event) {
    console.log('Service Worker installing.');
    // Opcional: Precargar recursos en caché aquí (si quieres funcionalidad offline)
    // event.waitUntil(
    //     caches.open('my-cache-v1').then(cache => {
    //         return cache.addAll([
    //             '/',
    //             '/index.html',
    //             '/main.js',
    //             // ... otros recursos ...
    //         ]);
    //     })
    // );
});

self.addEventListener('activate', function(event) {
    console.log('Service Worker activating.');
    // Opcional: Limpiar cachés antiguas aquí
});


self.addEventListener('fetch', function(event) {
    const requestUrl = new URL(event.request.url);

    if (requestUrl.pathname === '/api/data') {
        event.respondWith(
            new Response(JSON.stringify({ message: 'Hello from Service Worker! (data)' }), {
                headers: { 'Content-Type': 'application/json' }
            })
        );
    } else if (requestUrl.pathname === '/api/users') {
        event.respondWith(
            new Response(JSON.stringify([{ id: 1, name: 'John Doe' }, { id: 2, name: 'Jane Doe' }]), {
                headers: { 'Content-Type': 'application/json' }
            })
        );
    } else if (requestUrl.pathname.startsWith('/api/user/')) {
        const userId = requestUrl.pathname.substring('/api/user/'.length);
        event.respondWith(
            new Response(JSON.stringify({ id: userId, name: 'User ' + userId }), {
                headers: { 'Content-Type': 'application/json' }
            })
        );
    } else {
        // Importante: fetch(event.request) para otras peticiones
        event.respondWith(fetch(event.request));
    }
});

// Escuchar el mensaje para saltar la espera (skipWaiting)
self.addEventListener('message', event => {
    if (event.data && event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});