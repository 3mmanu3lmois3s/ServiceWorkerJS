// sw.js
const basePath = '/ServiceWorkerJS'; // Define basePath para GitHub Pages

self.addEventListener('install', function(event) {
    console.log('Service Worker installing.');
    event.waitUntil(self.skipWaiting()); // Forzar la activación inmediata
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
    event.waitUntil(clients.claim()); // Tomar el control de las páginas inmediatamente
    // Opcional: Limpiar cachés antiguas aquí
});


self.addEventListener('fetch', function(event) {
    const requestUrl = new URL(event.request.url);

    if (requestUrl.pathname === basePath + '/api/data') {  // Usa basePath
        event.respondWith(
            new Response(JSON.stringify({ message: 'Hello from Service Worker! (data)' }), {
                headers: { 'Content-Type': 'application/json' }
            })
        );
    } else if (requestUrl.pathname === basePath + '/api/users') { // Usa basePath
        event.respondWith(
            new Response(JSON.stringify([{ id: 1, name: 'John Doe' }, { id: 2, name: 'Jane Doe' }]), {
                headers: { 'Content-Type': 'application/json' }
            })
        );
    } else if (requestUrl.pathname.startsWith(basePath + '/api/user/')) { // Usa basePath
        const userId = requestUrl.pathname.substring((basePath + '/api/user/').length); // Ajusta la subcadena
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

// Ya no necesitas el listener para 'message' si usas skipWaiting() en 'install'
// y clients.claim() en 'activate'.  Lo dejo comentado por si lo quieres usar
// en un futuro con una lógica diferente.
/*
self.addEventListener('message', event => {
    if (event.data && event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});
*/