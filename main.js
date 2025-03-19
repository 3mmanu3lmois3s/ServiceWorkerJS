// main.js (MODIFICADO)
// --- Service Worker Registration ---
let newWorker; // Variable global para el nuevo service worker

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/ServiceWorkerJS/sw.js') // Ruta ABSOLUTA correcta
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

// --- Event Listeners para los Botones ---

document.getElementById('fetchData').addEventListener('click', () => fetchData('/api/data'));
document.getElementById('fetchUsers').addEventListener('click', () => fetchData('/api/users'));
document.getElementById('fetchUser123').addEventListener('click', () => fetchData('/api/user/123'));
document.getElementById('updateSW').addEventListener('click', () => {
  if (newWorker) {
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

// --- Recargar la página cuando el Service Worker cambie --- (COMENTADO)
// let refreshing;
// navigator.serviceWorker.addEventListener('controllerchange', () => {
//     if (refreshing) return;
//     window.location.reload();
//     refreshing = true;
// });