// Service Worker para permitir notificaciones en navegadores móviles (Android Chrome/Edge)
self.addEventListener('push', function(event) {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'Nuevo Mensaje';
    const options = {
        body: data.body || 'Tienes un nuevo mensaje.',
        icon: 'https://cdn-icons-png.flaticon.com/512/732/732200.png',
        badge: 'https://cdn-icons-png.flaticon.com/512/732/732200.png'
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('/')
    );
});