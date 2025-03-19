// main.js (CORREGIDO - Opción 2 - MEJORADO)
// --- Service Worker Registration ---
let newWorker; // Variable global para el nuevo service worker
const basePath = '/ServiceWorkerJS';

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register(basePath + '/sw.js')
        .then(registration => {
            console.log('Service Worker registered with scope:', registration.scope);

            // Detectar si hay un nuevo service worker esperando
            if (registration.waiting) {
                newWorker = registration.waiting;
                showUpdateButton();
            }

            // Detectar cambios en la instalación del service worker
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

// --- Event Listener para los Botones (Centralizado) ---
document.addEventListener('click', function(event) {
    if (event.target.matches('[data-api-url]')) { // Usar un atributo de datos
        const apiUrl = basePath + event.target.dataset.apiUrl;
        fetchData(apiUrl);
    } else if (event.target.id === 'updateSW' && newWorker) {
        newWorker.postMessage({ action: 'skipWaiting' });
    }
});

// --- Función fetchData (reutilizable) ---
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

// --- Función para mostrar el botón de actualización ---
function showUpdateButton() {
    document.getElementById('updateSW').style.display = 'block';
}

// ---  Online/Offline Status ---
function updateOnlineStatus() {
    document.getElementById('status').textContent = navigator.onLine ? 'Online' : 'Offline';
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
updateOnlineStatus(); // Llamar al inicio