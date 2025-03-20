// sw.js
/*jshint esversion: 6 */
/*jshint worker: true */
const basePath = '/ServiceWorkerJS/';
// No longer needed: let nextCustomerId = 1;
// No longer needed: const customers = {};

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
        } else if (relativePath.startsWith('api/customers') && method === 'POST') {
            // --- Handle POST request to create a customer ---
            console.log('Service Worker: Handling POST /api/customers');
            event.respondWith(handleCreateCustomer(event.request));

        } else if (relativePath.startsWith('api/customers/') && method === 'GET') {
            // --- Handle GET request to retrieve a customer ---
            console.log('Service Worker: Handling GET /api/customers/{id}');
            const customerId = relativePath.split('/')[2]; // Extract customer ID
            event.respondWith(handleGetCustomer(customerId));
        } else {
            console.log('Service Worker: Passing request to network (under base path, but not API):', event.request.url);
            event.respondWith(fetch(event.request));
        }
    } else {
        console.log('Service Worker: Passing request to network (not in base path):', event.request.url);
        event.respondWith(fetch(event.request));
    }
});

// Helper function to handle customer creation (using localStorage)
async function handleCreateCustomer(request) {
    try {
        const body = await request.json(); // Parse the request body
        console.log('Service Worker: Received customer data:', body); // Log received data

        // Get existing customers from localStorage
        let customers = JSON.parse(localStorage.getItem('customers') || '{}');

        // "Create" the customer (in localStorage)
        const customerId = `cust-${Date.now()}`; // Use timestamp for unique ID
        customers[customerId] = { ...body, id: customerId };

        // Save back to localStorage
        localStorage.setItem('customers', JSON.stringify(customers));

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

// Helper function to handle customer retrieval (using localStorage)
async function handleGetCustomer(customerId) {
    try {
        // Get customers from localStorage
        const customers = JSON.parse(localStorage.getItem('customers') || '{}');

        // Check if customer exists
        if (customers[customerId]) {
            console.log('Service Worker: Found customer:', customers[customerId]);
            return new Response(JSON.stringify(customers[customerId]), {
                headers: { 'Content-Type': 'application/json' }
            });
        } else {
            console.log('Service Worker: Customer not found:', customerId);
            return new Response(JSON.stringify({ error: 'Customer not found' }), {
                status: 404, // Not Found
                headers: { 'Content-Type': 'application/json' }
            });
        }
    } catch (error) {
        console.error('Service Worker: Error in handleGetCustomer:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500, // Internal Server Error
            headers: { 'Content-Type': 'application/json' }
        });
    }
}