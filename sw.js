// sw.js
/*jshint esversion: 6 */
/*jshint worker: true */
const basePath = '/ServiceWorkerJS/';

self.addEventListener('install', function(event) {
    event.waitUntil(self.skipWaiting()); // FIRST THING: Force immediate activation
    console.log('Service Worker installing.');
});

self.addEventListener('activate', function(event) {
    event.waitUntil(clients.claim()); // FIRST THING: Take control immediately
    console.log('Service Worker activating.');
});

self.addEventListener('fetch', function(event) {
    const requestUrl = new URL(event.request.url);
    console.log('Service Worker: Fetch event for', requestUrl.href); // LOG THE FULL URL

    if (requestUrl.pathname.startsWith(basePath)) { //Check if path starts with base path
        const relativePath = requestUrl.pathname.substring(basePath.length); // Get the path after the base path

        if (relativePath === '/api/data') {
            console.log('Service Worker: Handling /api/data'); // LOG SPECIFICALLY
            event.respondWith(
                new Response(JSON.stringify({ message: 'Hello from Service Worker! (data)' }), {
                    headers: { 'Content-Type': 'application/json' }
                })
            );
        } else if (relativePath === '/api/users') {
            console.log('Service Worker: Handling /api/users'); // LOG SPECIFICALLY
            event.respondWith(
                new Response(JSON.stringify([{ id: 1, name: 'John Doe' }, { id: 2, name: 'Jane Doe' }]), {
                    headers: { 'Content-Type': 'application/json' }
                })
            );
        } else if (relativePath.startsWith('/api/user/')) {
            console.log('Service Worker: Handling /api/user/'); // LOG SPECIFICALLY
            const userId = relativePath.substring('/api/user/'.length); // No need to add basePath again
            event.respondWith(
                new Response(JSON.stringify({ id: userId, name: 'User ' + userId }), {
                    headers: { 'Content-Type': 'application/json' }
                })
            );
        } else {
          //If it's under basepath, but none of the above.
          //For example, /ServiceWorkerJS/other-resource
          console.log('Service Worker: Passing request to network:', event.request.url);
          event.respondWith(fetch(event.request));
        }
    }
     else {
        //If the path does NOT start with basePath.  For example, requests for
        //extension resources, or other domains.
        console.log('Service Worker: Passing request to network (not in base path):', event.request.url);
        event.respondWith(fetch(event.request));
    }
});