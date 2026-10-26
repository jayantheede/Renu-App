// ReNu-Biome Service Worker for Offline PWA & Real Mobile Push Notifications
const CACHE_NAME = 'renu-biome-cache-v2';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon.png',
  '/favicon.png',
  '/brand/invoice-logo.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((e) => console.warn('Cache addAll warning:', e));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// =========================================================================
// 1. Web Push Event Listener (Pops up on mobile even when app is closed)
// =========================================================================
self.addEventListener('push', (event) => {
  let payload = {
    title: 'ReNu-Biome Operational Alert',
    body: 'New delivery and agronomy updates are available in your portal.',
    url: '/deliveries',
    tag: 'renu-biome-alert',
  };

  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch (e) {
      payload.body = event.data.text() || payload.body;
    }
  }

  const notificationOptions = {
    body: payload.body,
    icon: payload.icon || '/icon.png',
    badge: payload.badge || '/icon.png',
    image: payload.image || undefined,
    vibrate: [200, 100, 200, 100, 300],
    tag: payload.tag || `renu-${Date.now()}`,
    renotify: true,
    requireInteraction: true,
    data: {
      url: payload.url || '/',
      timestamp: Date.now(),
    },
    actions: [
      { action: 'view', title: 'Open ReNu-Biome' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, notificationOptions)
  );
});

// =========================================================================
// 2. Notification Click Handler (Brings user directly to screen)
// =========================================================================
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetPath = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is an existing tab open
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if ('navigate' in client && targetPath) {
            client.navigate(targetPath);
          }
          return client.focus();
        }
      }
      // If no tab is open, open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetPath);
      }
    })
  );
});

// =========================================================================
// 3. Client Message Handler (Trigger background notifications via SW)
// =========================================================================
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'TRIGGER_NOTIFICATION') {
    const { title, body, url, tag, delayMs } = event.data;
    const show = () => {
      self.registration.showNotification(title || 'ReNu-Biome Alert', {
        body: body || 'You have a new update in your farm portal.',
        icon: '/icon.png',
        badge: '/icon.png',
        vibrate: [200, 100, 200],
        tag: tag || `renu-${Date.now()}`,
        renotify: true,
        requireInteraction: true,
        data: { url: url || '/' },
        actions: [
          { action: 'view', title: 'Open ReNu-Biome' },
          { action: 'dismiss', title: 'Dismiss' }
        ]
      });
    };

    if (delayMs && delayMs > 0) {
      setTimeout(show, delayMs);
    } else {
      show();
    }
  }
});

// =========================================================================
// 4. Fetch Caching Strategy (Offline & Shell Cache)
// =========================================================================
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests and chrome extensions
  if (event.request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // Cache-first for static assets and brand media
  if (url.origin === location.origin && (url.pathname.startsWith('/assets') || url.pathname.startsWith('/brand') || url.pathname === '/manifest.json')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Network-first with cache fallback for navigation / app shell
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/');
          }
          return new Response(JSON.stringify({ offline: true, message: 'You are offline.' }), {
            headers: { 'Content-Type': 'application/json' }
          });
        });
      })
  );
});
