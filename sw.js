// sw.js
/*jshint esversion: 6 */
/*jshint worker: true */
const basePath = '/ServiceWorkerJS/';

self.addEventListener('install', function(event) {
    console.log('Service Worker installing.');
});

self.addEventListener('activate', function(event) {
    console.log('Service Worker activating.');
});

self.addEventListener('fetch', function(event) {
    const requestUrl = new URL(event.request.url);
    console.log('Service Worker: Fetch event for', requestUrl.href); // LOG THE FULL URL

    if (requestUrl.pathname === basePath + '/api/data') {
        console.log('Service Worker: Handling /api/data'); // LOG SPECIFICALLY
        event.respondWith(
            new Response(JSON.stringify({ message: 'Hello from Service Worker! (data)' }), {
                headers: { 'Content-Type': 'application/json' }
            })
        );
    } else if (requestUrl.pathname === basePath + '/api/users') {
         console.log('Service Worker: Handling /api/users'); // LOG SPECIFICALLY
        event.respondWith(
            new Response(JSON.stringify([{ id: 1, name: 'John Doe' }, { id: 2, name: 'Jane Doe' }]), {
                headers: { 'Content-Type': 'application/json' }
            })
        );
    } else if (requestUrl.pathname.startsWith(basePath + '/api/user/')) {
         console.log('Service Worker: Handling /api/user/'); // LOG SPECIFICALLY
        const userId = requestUrl.pathname.substring((basePath + '/api/user/').length);
        event.respondWith(
            new Response(JSON.stringify({ id: userId, name: 'User ' + userId }), {
                headers: { 'Content-Type': 'application/json' }
            })
        );
    } else {
        console.log('Service Worker: Passing request to network:', event.request.url); // LOG
        event.respondWith(fetch(event.request));
    }
});