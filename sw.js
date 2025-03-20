// sw.js
/*jshint esversion: 6 */
/*jshint worker: true */

const basePath = '/ServiceWorkerJS/';
const dbName = 'customerDB';
const storeName = 'customers';

// --- IndexedDB Setup ---
let db;

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);

        request.onerror = (event) => {
            console.error('IndexedDB error:', event.target.error);
            reject(event.target.error);
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log('IndexedDB opened successfully');
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            db = event.target.result;
            if (!db.objectStoreNames.contains(storeName)) {
                db.createObjectStore(storeName, { keyPath: 'id' });
            }
            console.log('IndexedDB upgraded and object store created');
        };
    });
}

// --- Helper Functions using IndexedDB ---

async function addCustomerToDB(customerData) {
    if (!db) {
        await openDB();
    }
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const customerId = `cust-${Date.now()}`;
        const customer = { ...customerData, id: customerId };
        const request = store.add(customer);

        request.onsuccess = () => {
            console.log('Customer added to IndexedDB:', customer);
            resolve(customerId);
        };

        request.onerror = (event) => {
            console.error('Error adding customer to IndexedDB:', event.target.error);
            reject(event.target.error);
        };
    });
}

async function getCustomerFromDB(customerId) {
  if (!db) {
        await openDB();
    }
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(customerId);

        request.onsuccess = () => {
            if (request.result) {
                console.log('Customer found in IndexedDB:', request.result);
                resolve(request.result);
            } else {
                console.log('Customer not found in IndexedDB:', customerId);
                resolve(null);
            }
        };

        request.onerror = (event) => {
            console.error('Error getting customer from IndexedDB:', event.target.error);
            reject(event.target.error);
        };
    });
}

// New function to get ALL customers from IndexedDB
async function getAllCustomersFromDB() {
    if (!db) {
        await openDB();
    }
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll(); // Use getAll() to get all customers

        request.onsuccess = () => {
            console.log('All customers retrieved from IndexedDB:', request.result);
            resolve(request.result); // Resolve with the array of customers
        };

        request.onerror = (event) => {
            console.error('Error getting all customers from IndexedDB:', event.target.error);
            reject(event.target.error);
        };
    });
}

// --- Event Listeners ---

self.addEventListener('install', function(event) {
    console.log('Service Worker installing.');
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', function(event) {
    console.log('Service Worker activating.');
    event.waitUntil(clients.claim().then(() => {
        openDB();
    }));
});

self.addEventListener('fetch', function(event) {
    const requestUrl = new URL(event.request.url);
    console.log('Service Worker: Fetch event for', requestUrl.href);

    if (requestUrl.pathname.startsWith(basePath)) {
        const relativePath = requestUrl.pathname.substring(basePath.length);
        console.log('Service Worker: relativePath is:', relativePath);
        const method = event.request.method;
        console.log('Service Worker: Method is:', method);

        if (relativePath === 'api/data') {
            event.respondWith(
                new Response(JSON.stringify({ message: 'Hello from Service Worker! (data)' }), {
                    headers: { 'Content-Type': 'application/json' }
                })
            );
        } else if (relativePath === 'api/users') {
            event.respondWith(
                new Response(JSON.stringify([{ id: 1, name: 'John Doe' }, { id: 2, name: 'Jane Doe' }]), {
                    headers: { 'Content-Type': 'application/json' }
                })
            );
        } else if (relativePath.startsWith('api/user/')) {
            const userId = relativePath.substring('api/user/'.length);
            event.respondWith(
                new Response(JSON.stringify({ id: userId, name: 'User ' + userId }), {
                    headers: { 'Content-Type': 'application/json' }
                })
            );
        } else if (relativePath === 'api/customers' && method === 'POST') {
            console.log('Service Worker: Handling POST /api/customers');
            event.respondWith(handleCreateCustomer(event.request));
        //CHANGED:  Handle GET /api/customers (no ID) to get ALL customers.
        } else if (relativePath === 'api/customers' && method === 'GET') {
              console.log('Service Worker: Handling GET /api/customers (all customers)');
              event.respondWith(handleGetAllCustomers());
        } else if (relativePath.startsWith('api/customers/') && method === 'GET') {
            console.log('Service Worker: Handling GET /api/customers/{id}');
            const customerId = relativePath.split('/')[2];
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

// --- Request Handlers (using IndexedDB helpers) ---

async function handleCreateCustomer(request) {
    try {
        const body = await request.json();
        console.log('Service Worker: Received customer data:', body);

        const customerId = await addCustomerToDB(body);

        return new Response(JSON.stringify({ customerId: customerId }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Service Worker: Error in handleCreateCustomer:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

async function handleGetCustomer(customerId) {
    try {
        const customer = await getCustomerFromDB(customerId);

        if (customer) {
            return new Response(JSON.stringify(customer), {
                headers: { 'Content-Type': 'application/json' }
            });
        } else {
            return new Response(JSON.stringify({ error: 'Customer not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    } catch (error) {
        console.error('Service Worker: Error in handleGetCustomer:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// New handler for getting ALL customers
async function handleGetAllCustomers() {
    try {
        const allCustomers = await getAllCustomersFromDB(); // Get all from IndexedDB
        return new Response(JSON.stringify(allCustomers), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Service Worker: Error in handleGetAllCustomers:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}