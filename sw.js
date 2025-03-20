// sw.js
/*jshint esversion: 6 */
/*jshint worker: true */
const basePath = '/ServiceWorkerJS/';
let nextCustomerId = 1; // Keep track of the next customer ID

// In-memory customer data (for this simplified example)
const customers = {};


self.addEventListener('install', function(event) {
    console.log('Service Worker installing.');
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', function(event) {
    console.log('Service Worker activating.');
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', function(event) {
    const requestUrl = new URL(event.request.url);
    console.log('Service Worker: Fetch event for', requestUrl.href);

    if (requestUrl.pathname.startsWith(basePath)) {
        const relativePath = requestUrl.pathname.substring(basePath.length);
        console.log('Service Worker: relativePath is:', relativePath);
        const method = event.request.method; // Get the request method
        console.log('Service Worker: Method is:', method);

        if (relativePath === 'api/data') {
            console.log('Service Worker: Handling /api/data');
            event.respondWith(
                new Response(JSON.stringify({ message: 'Hello from Service Worker! (data)' }), {
                    headers: { 'Content-Type': 'application/json' }
                })
            );
        } else if (relativePath === 'api/users') {
            console.log('Service Worker: Handling /api/users');
            event.respondWith(
                new Response(JSON.stringify([{ id: 1, name: 'John Doe' }, { id: 2, name: 'Jane Doe' }]), {
                    headers: { 'Content-Type': 'application/json' }
                })
            );
        } else if (relativePath.startsWith('api/user/')) {
            console.log('Service Worker: Handling /api/user/');
            const userId = relativePath.substring('api/user/'.length);
            event.respondWith(
                new Response(JSON.stringify({ id: userId, name: 'User ' + userId }), {
                    headers: { 'Content-Type': 'application/json' }
                })
            );
        } else if (relativePath === 'api/customers' && method === 'POST') {
            // --- Handle POST request to create a customer ---
            console.log('Service Worker: Handling POST /api/customers');
            event.respondWith(handleCreateCustomer(event.request));

        } else {
            console.log('Service Worker: Passing request to network (under base path, but not API):', event.request.url);
            event.respondWith(fetch(event.request));
        }
    } else {
        console.log('Service Worker: Passing request to network (not in base path):', event.request.url);
        event.respondWith(fetch(event.request));
    }
});

// Helper function to handle customer creation
async function handleCreateCustomer(request) {
    try {
        const body = await request.json(); // Parse the request body
        console.log('Service Worker: Received customer data:', body); // Log received data

        // "Create" the customer (in-memory)
        const customerId = `cust-${nextCustomerId++}`;
        customers[customerId] = { ...body, id: customerId };

        console.log('Service Worker: Created customer:', customers[customerId]); // Log the created customer

        // Return the new customer's ID
        return new Response(JSON.stringify({ customerId: customerId }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Service Worker: Error in handleCreateCustomer:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400, // Bad Request
            headers: { 'Content-Type': 'application/json' }
        });
    }
}