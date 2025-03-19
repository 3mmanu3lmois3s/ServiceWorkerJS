// sw.js
/*jshint esversion: 6 */
/*jshint worker: true */
const basePath = '/ServiceWorkerJS/';

self.addEventListener('install', function(event) {
    console.log('Service Worker installing.');
    event.waitUntil(self.skipWaiting()); // Immediate activation
});

self.addEventListener('activate', function(event) {
    console.log('Service Worker activating.');
    event.waitUntil(clients.claim()); // Take control immediately
});

self.addEventListener('fetch', function(event) {
    const requestUrl = new URL(event.request.url);
    console.log('Service Worker: Fetch event for', requestUrl.href);

    if (requestUrl.pathname.startsWith(basePath)) {
        const relativePath = requestUrl.pathname.substring(basePath.length).trim(); // .trim() HERE!
        console.log('Service Worker: relativePath is:', relativePath); // Keep this log

        if (relativePath === '/api/data') {
            console.log('Service Worker: Handling /api/data');
            event.respondWith(
                new Response(JSON.stringify({ message: 'Hello from Service Worker! (data)' }), {
                    headers: { 'Content-Type': 'application/json' }
                })
            );
        } else if (relativePath === '/api/users') {
            console.log('Service Worker: Handling /api/users');
            event.respondWith(
                new Response(JSON.stringify([{ id: 1, name: 'John Doe' }, { id: 2, name: 'Jane Doe' }]), {
                    headers: { 'Content-Type': 'application/json' }
                })
            );
        } else if (relativePath.startsWith('/api/user/')) {
            console.log('Service Worker: Handling /api/user/');
            const userId = relativePath.substring('/api/user/'.length);
            event.respondWith(
                new Response(JSON.stringify({ id: userId, name: 'User ' + userId }), {
                    headers: { 'Content-Type': 'application/json' }
                })
            );
        } else {
            console.log('Service Worker: Passing request to network (under base path, but not API):', event.request.url);
            event.respondWith(fetch(event.request));
        }
    } else {
        console.log('Service Worker: Passing request to network (not in base path):', event.request.url);
        event.respondWith(fetch(event.request));
    }
});