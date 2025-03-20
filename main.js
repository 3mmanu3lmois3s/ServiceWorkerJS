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

document.addEventListener('click', function(event) {
    if (event.target.matches('[data-api-url]')) {
        const apiUrl = event.target.dataset.apiUrl; // Get the FULL URL
        fetchData(apiUrl);
    } else if (event.target.id === 'updateSW' && newWorker) {
        newWorker.postMessage({ action: 'skipWaiting' });
    } else if (event.target.id === 'createCustomer') {
        createCustomer(); // Call the createCustomer function
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


// --- Create Customer Functionality ---
async function createCustomer() {
    const name = document.getElementById('customerName').value;
    const email = document.getElementById('customerEmail').value;

    if (!name || !email) {
        alert('Please enter both name and email.');
        return;
    }

    const customerData = { name, email };
    console.log('Sending customer data:', customerData); // Log the data being sent

    try {
        const response = await fetch('/ServiceWorkerJS/api/customers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(customerData)
        });

        console.log('Response from server:', response); // Log the raw response

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! Status: ${response.status}, Body: ${errorText}`);
        }

        const responseData = await response.json();
        console.log('Parsed response data:', responseData); // Log the parsed JSON
        document.getElementById('response').textContent = JSON.stringify(responseData, null, 2);

    } catch (error) {
        console.error('Error creating customer:', error);
        document.getElementById('response').textContent = 'Error: ' + error.message;
    }
}