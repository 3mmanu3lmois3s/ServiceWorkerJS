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