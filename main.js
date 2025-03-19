// main.js
let newWorker; // Variable to hold the new (waiting) service worker
const basePath = '/ServiceWorkerJS'; // Base path for GitHub Pages

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register(basePath + '/sw.js')
        .then(registration => {
            console.log('Service Worker registered with scope:', registration.scope);

            // Check for a waiting service worker
            if (registration.waiting) {
                newWorker = registration.waiting;
                showUpdateButton();
            }

            // Listen for a new service worker being installed
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

// Centralized click handler for all buttons
document.addEventListener('click', function(event) {
    if (event.target.matches('[data-api-url]')) {
        const apiUrl = basePath + event.target.dataset.apiUrl;
        fetchData(apiUrl);
    } else if (event.target.id === 'updateSW' && newWorker) {
        newWorker.postMessage({ action: 'skipWaiting' });
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
updateOnlineStatus(); // Initial status update

// Prevent automatic reload on controller change (we handle it manually)
// let refreshing;  // No longer needed
// navigator.serviceWorker.addEventListener('controllerchange', () => {
//     if (refreshing) return;
//     window.location.reload();
//     refreshing = true;
// });