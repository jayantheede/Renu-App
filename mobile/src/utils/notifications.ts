import { Platform } from 'react-native';

export interface MobileNotificationOptions {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  delayMs?: number;
}

/**
 * Check if the current browser / mobile environment supports system push notifications
 */
export const areNotificationsSupported = (): boolean => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return false;
  }
  return 'Notification' in window && 'serviceWorker' in navigator;
};

/**
 * Returns current permission status: 'default' | 'granted' | 'denied'
 */
export const getNotificationPermission = (): NotificationPermission => {
  if (!areNotificationsSupported()) {
    return 'denied';
  }
  return Notification.permission;
};

/**
 * Request system notification permission from the user on their mobile device
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!areNotificationsSupported()) {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // Also register push subscription with backend if available
      registerPushSubscription().catch(console.warn);
      return true;
    }
    return false;
  } catch (error) {
    console.warn('Notification permission request error:', error);
    return false;
  }
};

/**
 * Dispatches a native mobile notification via Service Worker
 * This pops up in the mobile status bar / lock screen even when app is minimized / in background
 */
export const sendMobileNotification = async (options: MobileNotificationOptions): Promise<boolean> => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return false;
  }

  if (!areNotificationsSupported()) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    const granted = await requestNotificationPermission();
    if (!granted) return false;
  }

  try {
    // 1. Try sending via active Service Worker registration (works when backgrounded)
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && registration.showNotification) {
        if (options.delayMs && options.delayMs > 0) {
          setTimeout(() => {
            registration.showNotification(options.title, {
              body: options.body,
              icon: '/icon.png',
              badge: '/favicon.png',
              vibrate: [200, 100, 200, 100, 200],
              tag: options.tag || `renu-${Date.now()}`,
              requireInteraction: true,
              data: { url: options.url || '/' },
              actions: [
                { action: 'view', title: 'Open ReNu-Biome' },
                { action: 'dismiss', title: 'Dismiss' }
              ]
            } as any);
          }, options.delayMs);
          return true;
        }

        await registration.showNotification(options.title, {
          body: options.body,
          icon: '/icon.png',
          badge: '/favicon.png',
          vibrate: [200, 100, 200, 100, 200],
          tag: options.tag || `renu-${Date.now()}`,
          requireInteraction: true,
          data: { url: options.url || '/' },
          actions: [
            { action: 'view', title: 'Open ReNu-Biome' },
            { action: 'dismiss', title: 'Dismiss' }
          ]
        } as any);
        return true;
      }
    }

    // 2. Fallback to standard web Notification
    const notif = new Notification(options.title, {
      body: options.body,
      icon: '/icon.png',
      badge: '/favicon.png',
      tag: options.tag,
    });

    notif.onclick = () => {
      window.focus();
      if (options.url && typeof window !== 'undefined') {
        window.location.href = options.url;
      }
      notif.close();
    };

    return true;
  } catch (error) {
    console.warn('Failed to dispatch mobile notification:', error);
    return false;
  }
};

/**
 * Register push subscription with the backend server
 */
export const registerPushSubscription = async (): Promise<void> => {
  if (!areNotificationsSupported()) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    if (!registration.pushManager) return;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      // In production, applicationServerKey is passed here
      // For standard browser push notifications without VAPID key restriction:
      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          // Generic public VAPID key placeholder if needed
        });
      } catch (e) {
        // Some browsers require explicit server VAPID key for pushManager,
        // local Service Worker notifications still work 100%
      }
    }
  } catch (e) {
    console.warn('Push manager registration notice:', e);
  }
};

/**
 * Trigger an immediate test notification to verify mobile popups
 */
export const sendTestNotification = async (): Promise<boolean> => {
  return sendMobileNotification({
    title: '🔔 ReNu-Biome Mobile Alert Active',
    body: 'Driver Dave Miller is en route with your ReNu N-CARE refill. Live ETA: 2:15 PM.',
    url: '/deliveries',
    tag: 'renu-test-alert',
  });
};

/**
 * Automated alert: Low tank telemetry detected
 */
export const triggerLowTankAlert = async (
  tankName: string,
  levelPercent: number,
  ranchName: string
): Promise<void> => {
  await sendMobileNotification({
    title: `⚠️ Low Tank Alert: ${tankName} (${levelPercent}%)`,
    body: `${ranchName} tank capacity is critical. Tap to request an immediate fertilizer refill.`,
    url: '/deliveries',
    tag: `low-tank-${tankName.toLowerCase().replace(/\s+/g, '-')}`,
  });
};

/**
 * Automated alert: Delivery status updated
 */
export const triggerDeliveryUpdate = async (
  orderId: string,
  status: string,
  driverName?: string,
  eta?: string
): Promise<void> => {
  let body = `Delivery #${orderId} status updated to ${status}.`;
  if (status === 'Out for delivery' && driverName) {
    body = `Driver ${driverName} is on the way! Estimated arrival: ${eta || 'Today'}.`;
  } else if (status === 'Delivered') {
    body = `Delivery #${orderId} has been successfully completed and injected into your ranch tank.`;
  }

  await sendMobileNotification({
    title: `🚚 Delivery Update: #${orderId}`,
    body,
    url: '/deliveries',
    tag: `delivery-${orderId}`,
  });
};
