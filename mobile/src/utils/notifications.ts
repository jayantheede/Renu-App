import { NativeModules, Platform } from 'react-native';
import * as apiModule from '../api/client';

export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

export interface MobileNotificationOptions {
  body?: string;
  tag?: string;
  url?: string;
  delaySeconds?: number;
}

interface NativeAppAlertsBridge {
  getPermissionStatus?: () => Promise<string>;
  requestPermission?: () => Promise<boolean>;
  scheduleLocalAlert?: (
    title: string,
    body: string,
    identifier: string,
    delaySeconds: number,
    url: string | null
  ) => Promise<boolean>;
  setBadgeCount?: (count: number) => Promise<boolean>;
}

let cachedNativePermission: NotificationPermissionState = 'default';

function getNativeBridge(): NativeAppAlertsBridge | null {
  if (Platform.OS === 'web') return null;
  const bridge = (NativeModules as { NativeAppAlerts?: NativeAppAlertsBridge } | undefined)?.NativeAppAlerts;
  return bridge || null;
}

function normalizePermission(raw: unknown): NotificationPermissionState {
  if (raw === 'granted' || raw === 'denied' || raw === 'default') {
    return raw;
  }
  return 'unsupported';
}

function hasWebNotifications(): boolean {
  return (
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    'Notification' in window &&
    typeof window.Notification === 'function'
  );
}

async function syncPushSubscription(enabled: boolean): Promise<void> {
  if (!enabled || typeof apiModule.apiClient !== 'function') return;
  try {
    await apiModule.apiClient('/app/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({
        subscription: {
          endpoint: `native://${Platform.OS}/local-alerts`,
          platform: Platform.OS,
          enabled: true,
          updatedAt: new Date().toISOString(),
        },
      }),
    });
  } catch {
    // Non-fatal: local OS alerts still operate without backend push registration
  }
}

export function areNotificationsSupported(): boolean {
  if (Platform.OS === 'web') {
    return hasWebNotifications();
  }
  const bridge = getNativeBridge();
  return Boolean(bridge && typeof bridge.scheduleLocalAlert === 'function');
}

export function getNotificationPermission(): NotificationPermissionState {
  if (Platform.OS === 'web') {
    if (!hasWebNotifications()) return 'unsupported';
    return normalizePermission(window.Notification.permission);
  }
  if (!getNativeBridge()) return 'unsupported';
  return cachedNativePermission;
}

export async function getNotificationPermissionAsync(): Promise<NotificationPermissionState> {
  if (Platform.OS === 'web') {
    return getNotificationPermission();
  }
  const bridge = getNativeBridge();
  if (!bridge || typeof bridge.getPermissionStatus !== 'function') {
    cachedNativePermission = 'unsupported';
    return 'unsupported';
  }
  try {
    const status = await bridge.getPermissionStatus();
    cachedNativePermission = normalizePermission(status);
    return cachedNativePermission;
  } catch {
    return cachedNativePermission;
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (!hasWebNotifications()) return false;
    if (window.Notification.permission === 'granted') {
      await syncPushSubscription(true);
      return true;
    }
    if (window.Notification.permission === 'denied') {
      return false;
    }
    try {
      const result = await window.Notification.requestPermission();
      const granted = result === 'granted';
      if (granted) await syncPushSubscription(true);
      return granted;
    } catch {
      return false;
    }
  }

  const bridge = getNativeBridge();
  if (!bridge || typeof bridge.requestPermission !== 'function') {
    cachedNativePermission = 'unsupported';
    return false;
  }

  try {
    const granted = Boolean(await bridge.requestPermission());
    cachedNativePermission = granted ? 'granted' : 'denied';
    if (granted) {
      await syncPushSubscription(true);
    }
    return granted;
  } catch {
    return false;
  }
}

export async function sendMobileNotification(
  title: string,
  optionsOrBody?: MobileNotificationOptions | string
): Promise<boolean> {
  const opts: MobileNotificationOptions =
    typeof optionsOrBody === 'string' ? { body: optionsOrBody } : optionsOrBody || {};
  const body = opts.body || '';
  const tag = opts.tag || `renu-${Date.now()}`;
  const url = opts.url || null;
  const delaySeconds = typeof opts.delaySeconds === 'number' ? Math.max(0, opts.delaySeconds) : 0;

  if (Platform.OS === 'web') {
    if (!hasWebNotifications() || window.Notification.permission !== 'granted') {
      return false;
    }
    try {
      const notif = new window.Notification(title, {
        body,
        tag,
        icon: '/icon-192.png',
      });
      notif.onclick = () => {
        try {
          window.focus();
          notif.close();
        } catch {
          // Ignore focus errors in restricted frames
        }
      };
      return true;
    } catch {
      return false;
    }
  }

  const bridge = getNativeBridge();
  if (!bridge || typeof bridge.scheduleLocalAlert !== 'function') {
    return false;
  }

  try {
    const perm = await getNotificationPermissionAsync();
    if (perm === 'denied' || perm === 'unsupported') {
      return false;
    }
    const ok = Boolean(
      await bridge.scheduleLocalAlert(title, body, tag, delaySeconds, url)
    );
    if (ok) {
      cachedNativePermission = 'granted';
    }
    return ok;
  } catch {
    return false;
  }
}

export async function syncAppBadgeCount(count: number): Promise<boolean> {
  const safeCount = Math.max(0, Math.floor(Number.isFinite(count) ? count : 0));

  if (Platform.OS === 'web') {
    try {
      const nav = typeof navigator !== 'undefined' ? (navigator as any) : null;
      if (nav && typeof nav.setAppBadge === 'function') {
        await nav.setAppBadge(safeCount);
        return true;
      }
      if (nav && safeCount === 0 && typeof nav.clearAppBadge === 'function') {
        await nav.clearAppBadge();
        return true;
      }
    } catch {
      return false;
    }
    return false;
  }

  const bridge = getNativeBridge();
  if (!bridge || typeof bridge.setBadgeCount !== 'function') {
    return false;
  }
  try {
    return Boolean(await bridge.setBadgeCount(safeCount));
  } catch {
    return false;
  }
}

export async function sendTestNotification(): Promise<boolean> {
  return sendMobileNotification('ReNu-Biome Alerts Active', {
    body: 'Live alerts enabled for tank telemetry, biological deliveries, lab samples, and invoices.',
    tag: `renu-test-${Date.now()}`,
    url: '/home',
  });
}

export async function triggerLowTankAlert(
  ranchName: string,
  blockName: string,
  levelPct: number
): Promise<boolean> {
  return sendMobileNotification(`Low Tank Alert — ${ranchName}`, {
    body: `${blockName} is at ${Math.round(levelPct)}% tank capacity. Schedule a refill soon.`,
    tag: `low-tank-${ranchName}-${blockName}`,
    url: '/ranches',
  });
}

export async function triggerDeliveryUpdate(
  orderId: string,
  status: string,
  eta?: string
): Promise<boolean> {
  const etaSuffix = eta ? ` (ETA: ${eta})` : '';
  return sendMobileNotification(`Delivery ${status} — #${orderId}`, {
    body: `Biological shipment #${orderId} is now ${status}${etaSuffix}.`,
    tag: `delivery-${orderId}`,
    url: '/deliveries',
  });
}
