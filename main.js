// Register the service worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').then(function(registration) {
        console.log('Service Worker registered with scope:', registration.scope);
    }).catch(function(error) {
        console.log('Service Worker registration failed:', error);
    });
}

// Fetch data when the button is clicked
document.getElementById('fetchData').addEventListener('click', function() {
    fetch('/api/data')
        .then(response => response.json())
        .then(data => {
            document.getElementById('response').textContent = JSON.stringify(data, null, 2);
        })
        .catch(error => {
            console.error('Error fetching data:', error);
        });
});