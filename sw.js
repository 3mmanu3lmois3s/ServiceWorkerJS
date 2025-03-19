self.addEventListener('install', function(event) {
    console.log('Service Worker installing.');
    // Perform install steps
});

self.addEventListener('activate', function(event) {
    console.log('Service Worker activating.');
});

self.addEventListener('fetch', function(event) {
    if (event.request.url.endsWith('/api/data')) {
        event.respondWith(
            new Response(JSON.stringify({ message: 'Hello from Service Worker!' }), {
                headers: { 'Content-Type': 'application/json' }
            })
        );
    } else {
        event.respondWith(fetch(event.request));
    }
});