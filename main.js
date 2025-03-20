// main.js
let newWorker;
const basePath = '/ServiceWorkerJS';

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register(basePath + '/sw.js')
        .then(registration => {
            console.log('Service Worker registered with scope:', registration.scope);

            if (registration.waiting) {
                newWorker = registration.waiting;
                showUpdateButton();
            }

            registration.addEventListener('updatefound', () => {
                newWorker = registration.installing;

                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        showUpdateButton();
                    }
                });
            });
        })
        .catch(error => {
            console.log('Service Worker registration failed:', error);
        });
}

let customerId;
let quoteId;
let policyId;
let claimId;

document.addEventListener('click', function(event) {
    if (event.target.matches('[data-api-url]')) {
        const apiUrl = event.target.dataset.apiUrl;
        fetchData(apiUrl);
    } else if (event.target.id === 'updateSW' && newWorker) {
        newWorker.postMessage({ action: 'skipWaiting' });
    } else if (event.target.id === 'createCustomer') {
        createCustomer();
    } else if (event.target.id === 'getCustomer') {
        getCustomer();
    } else if (event.target.id === 'getAllCustomers') {
        getAllCustomers();
    } else if (event.target.id === 'postMessage') {
        postMessage();
    } else if (event.target.id === 'searchMessages') {
        searchMessages();
    }
});

function fetchData(url) {
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            document.getElementById('response').textContent = JSON.stringify(data, null, 2);
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            document.getElementById('response').textContent = 'Error: ' + error.message;
        });
}

function showUpdateButton() {
    document.getElementById('updateSW').style.display = 'block';
}

function updateOnlineStatus() {
    document.getElementById('status').textContent = navigator.onLine ? 'Online' : 'Offline';
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
updateOnlineStatus();

async function createCustomer() {
    const name = document.getElementById('customerName').value;
    const email = document.getElementById('customerEmail').value;

    if (!name || !email) {
        alert('Please enter both name and email.');
        return;
    }

    const customerData = { name, email };
    console.log('Sending customer data:', customerData);

    try {
        const response = await fetch('/ServiceWorkerJS/api/customers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(customerData)
        });

        console.log('Response from server:', response);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! Status: ${response.status}, Body: ${errorText}`);
        }

        const responseData = await response.json();
        console.log('Parsed response data:', responseData);
        document.getElementById('response').textContent = JSON.stringify(responseData, null, 2);

    } catch (error) {
        console.error('Error creating customer:', error);
        document.getElementById('response').textContent = 'Error: ' + error.message;
    }
}

async function getCustomer() {
    const customerId = document.getElementById('getCustomerId').value;

    if (!customerId) {
        alert('Please enter a customer ID.');
        return;
    }

    try {
        const response = await fetch(`/ServiceWorkerJS/api/customers/${customerId}`, {
            method: 'GET'
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! Status: ${response.status}, Body: ${errorText}`);
        }

        const customerData = await response.json();
        document.getElementById('response').textContent = JSON.stringify(customerData, null, 2);

    } catch (error) {
        console.error('Error getting customer:', error);
        document.getElementById('response').textContent = 'Error: ' + error.message;
    }
}

async function getAllCustomers() {
    try {
        const response = await fetch('/ServiceWorkerJS/api/customers', {
            method: 'GET'
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! Status: ${response.status}, Body: ${errorText}`);
        }

        const customers = await response.json();
        document.getElementById('response').textContent = JSON.stringify(customers, null, 2);
    } catch (error) {
        console.error('Error getting all customers:', error);
        document.getElementById('response').textContent = 'Error: ' + error.message;
    }
}

async function postMessage() {
    const messageData = document.getElementById('messageData').value;
    if (!messageData) {
        alert('Please enter JSON data.');
        return;
    }

    // NO JSON.parse here.  sw.js will handle it.

    try {
        const response = await fetch('/ServiceWorkerJS/api/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: messageData // Send the raw string
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! Status: ${response.status}, Body: ${errorText}`);
        }

        const responseData = await response.json();
        document.getElementById('response').textContent = JSON.stringify(responseData, null, 2);
    } catch (error) {
        console.error('Error posting message:', error);
        document.getElementById('response').textContent = 'Error: ' + error.message;
    }
}

async function searchMessages() {
    const searchTerms = document.getElementById('searchTerms').value;
    if (!searchTerms) {
      alert('Please enter search terms.');
      return;
    }

    try {
        // Encode the search terms for the URL
        const encodedSearchTerms = encodeURIComponent(searchTerms);
        const response = await fetch(`/ServiceWorkerJS/api/search?terms=${encodedSearchTerms}`, {
            method: 'GET' // GET is appropriate for searches
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! Status: ${response.status}, Body: ${errorText}`);
        }

        const results = await response.json();
        document.getElementById('response').textContent = JSON.stringify(results, null, 2);

    } catch (error) {
        console.error('Error searching messages:', error);
        document.getElementById('response').textContent = 'Error: ' + error.message;
    }
}