// sw.js
/*jshint esversion: 6 */
/*jshint worker: true */
const basePath = '/ServiceWorkerJS/';
const dbName = 'insuranceDB';
const customerStoreName = 'customers';
const messageStoreName = 'messages';
let db;

// --- IndexedDB Setup ---

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 2); // Increment version number!

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

            // Create the customers object store if it doesn't exist
            if (!db.objectStoreNames.contains(customerStoreName)) {
                db.createObjectStore(customerStoreName, { keyPath: 'id' });
            }

            // Create the messages object store if it doesn't exist
            if (!db.objectStoreNames.contains(messageStoreName)) {
                db.createObjectStore(messageStoreName, { autoIncrement: true, keyPath: 'id' }); // Auto-incrementing key
            }

            console.log('IndexedDB upgraded and object stores created/checked');
        };
    });
}


// --- Helper Functions using IndexedDB ---

async function addCustomerToDB(customerData) {
    if (!db) {
        await openDB();
    }
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([customerStoreName], 'readwrite');
        const store = transaction.objectStore(customerStoreName);
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
        const transaction = db.transaction([customerStoreName], 'readonly');
        const store = transaction.objectStore(customerStoreName);
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

async function getAllCustomersFromDB() {
    if (!db) {
        await openDB();
    }
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([customerStoreName], 'readonly');
        const store = transaction.objectStore(customerStoreName);
        const request = store.getAll();

        request.onsuccess = () => {
            console.log('All customers retrieved from IndexedDB:', request.result);
            resolve(request.result);
        };

        request.onerror = (event) => {
            console.error('Error getting all customers from IndexedDB:', event.target.error);
            reject(event.target.error);
        };
    });
}

// Add a new message to IndexedDB
async function addMessageToDB(messageData) {
    if (!db) {
      await openDB();
    }
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([messageStoreName], 'readwrite');
      const store = transaction.objectStore(messageStoreName);
      const request = store.add(messageData); // IndexedDB will auto-generate a key

      request.onsuccess = () => {
        console.log('Message added to IndexedDB:', request.result); // result will be the key
        resolve(request.result);  // Resolve with the new message ID
      };

      request.onerror = (event) => {
        console.error('Error adding message to IndexedDB:', event.target.error);
        reject(event.target.error);
      };
    });
  }

// Search IndexedDB for messages and customer data matching the given terms
async function searchData(terms) {
    if (!db) {
        await openDB();
    }
    const searchTerms = terms.toLowerCase().split(/\s+/).filter(term => term !== '');
    if (searchTerms.length === 0) {
        return [];
    }

    const results = [];

    function objectMatchesTerms(obj, terms) {
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const value = obj[key];
                if (typeof value === 'string' && terms.some(term => value.toLowerCase().includes(term))) {
                    return true;
                } else if (typeof value === 'object' && value !== null) {
                    if (objectMatchesTerms(value, terms)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }


    // Search the 'customers' store (no changes here)
    const customerTransaction = db.transaction([customerStoreName], 'readonly');
    const customerStore = customerTransaction.objectStore(customerStoreName);
    const customerRequest = customerStore.getAll();
    await new Promise((resolve, reject) => {
        customerRequest.onsuccess = () => {
            const customers = customerRequest.result;
            const matchedCustomers = customers.filter(customer => objectMatchesTerms(customer, searchTerms));
            results.push(...matchedCustomers.map(customer => ({ ...customer, type: 'customer' })));
            resolve();
        };
        customerRequest.onerror = () => reject(customerRequest.error);
    });

    // Search the 'messages' store (MODIFIED LOGIC)
    const messageTransaction = db.transaction([messageStoreName], 'readonly');
    const messageStore = messageTransaction.objectStore(messageStoreName);
    const messageRequest = messageStore.getAll();
    await new Promise((resolve, reject) => {
        messageRequest.onsuccess = () => {
            const messages = messageRequest.result;
            const matchedMessages = [];

            messages.forEach(message => {
                if (Array.isArray(message)) {
                    // If it's an array, iterate through each element
                    message.forEach(item => {
                        if (objectMatchesTerms(item, searchTerms)) {
                            matchedMessages.push({...item, type: "message"}); // Add individual item
                        }
                    });
                } else if (typeof message === 'object' && message !== null) {
                    // If it's a single object
                    if (objectMatchesTerms(message, searchTerms)) {
                        matchedMessages.push({...message, type: "message"});
                    }
                }
                // Ignore other types (shouldn't happen, but good to be defensive)
            });

            results.push(...matchedMessages);
            resolve();
        };
        messageRequest.onerror = () => reject(messageRequest.error);
    });

    return results;
}

// Calculate the total size of messages in IndexedDB
async function calculateTotalSize() {
    if (!db) {
        await openDB();
    }
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([messageStoreName], 'readonly');
        const store = transaction.objectStore(messageStoreName);
        const request = store.openCursor(); // Use a cursor to iterate
        let totalSize = 0;

        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                // Estimate size of the stored object (rough estimate)
                totalSize += JSON.stringify(cursor.value).length;
                cursor.continue(); // Move to the next object
            } else {
                // No more objects, resolve with the total size
                resolve(totalSize);
            }
        };

        request.onerror = (event) => {
            console.error('Error calculating total size:', event.target.error);
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
        openDB(); // Initialize IndexedDB
    }));
});

self.addEventListener('fetch', function(event) {
    const requestUrl = new URL(event.request.url);

    if (requestUrl.pathname.startsWith(basePath)) {
        const relativePath = requestUrl.pathname.substring(basePath.length);
        const method = event.request.method;

        // Handle API requests
        if (relativePath.startsWith('api/')) {
            const apiPath = relativePath.substring(4); // Remove 'api/'

            if (apiPath === 'data' && method === 'GET') {
                event.respondWith(
                    new Response(JSON.stringify({ message: 'Hello from Service Worker! (data)' }), {
                        headers: { 'Content-Type': 'application/json' }
                    })
                );
            } else if (apiPath === 'users' && method === 'GET') {
                event.respondWith(
                    new Response(JSON.stringify([{ id: 1, name: 'John Doe' }, { id: 2, name: 'Jane Doe' }]), {
                        headers: { 'Content-Type': 'application/json' }
                    })
                );
            } else if (apiPath.startsWith('user/') && method === 'GET') {
                const userId = apiPath.substring('user/'.length);
                event.respondWith(
                    new Response(JSON.stringify({ id: userId, name: 'User ' + userId }), {
                        headers: { 'Content-Type': 'application/json' }
                    })
                );
            } else if (apiPath === 'customers' && method === 'POST') {
                event.respondWith(handleCreateCustomer(event.request));
            } else if (apiPath.startsWith('customers/') && method === 'GET') {
                const customerId = apiPath.split('/')[1];
                event.respondWith(handleGetCustomer(customerId));
            } else if (apiPath === 'customers' && method === 'GET') {
                event.respondWith(handleGetAllCustomers());
            }else if (apiPath === 'messages' && method === 'POST') {
              event.respondWith(handlePostMessage(event.request));
            }
             else if (apiPath.startsWith('search') && method === 'GET') {
                const urlParams = new URLSearchParams(requestUrl.search);
                const terms = urlParams.get('terms');
                event.respondWith(handleSearchMessages(terms));
            } else {
                // Request for an API endpoint that's not handled
                console.log('Service Worker: Passing request to network (API endpoint not found):', event.request.url);
                event.respondWith(fetch(event.request));
            }
       }else {
            // Request for a non-API resource (e.g., HTML, CSS, JS files)
            console.log('Service Worker: Passing request to network (Non-API request):', event.request.url);
            event.respondWith(fetch(event.request));
        }

    } else {
        // Request is not within the base path
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
async function handleGetAllCustomers() {
    try {
        const customers = await getAllCustomersFromDB();
        return new Response(JSON.stringify(customers), {
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

async function handlePostMessage(request) {
    try {
      const messageText = await request.text(); // Get raw text first
      const messageData = JSON.parse(messageText); // THEN parse
      const currentSize = await calculateTotalSize();
      if (currentSize + messageText.length > 3000) {
        return new Response(JSON.stringify({ error: 'Adding this message would exceed the 3000 character limit.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const messageId = await addMessageToDB(messageData);
      return new Response(JSON.stringify({ messageId }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Service Worker: Error in handlePostMessage:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400, // Or appropriate error code
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

async function handleSearchMessages(terms) {
  try {
    const results = await searchData(terms);
    return new Response(JSON.stringify(results), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Service Worker: Error in handleSearchMessages:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}