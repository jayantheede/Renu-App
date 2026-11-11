import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as apiClientModule from '../api/client';
import { useAuthStore } from './useAuthStore';
import {
  sendMobileNotification,
  syncAppBadgeCount,
  getNotificationPermissionAsync,
  NotificationPermissionState,
} from '../utils/notifications';

export type AppAlertCategory = 'delivery' | 'telemetry' | 'lab' | 'invoice' | 'system';

export interface AppAlertItem {
  id: string;
  type: AppAlertCategory;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionRoute?: string;
  actionLabel?: string;
  severity?: 'critical' | 'warning' | 'info' | 'success';
  sortKey?: number;
}

interface RefreshOptions {
  notifyNew?: boolean;
}

interface NotificationStoreState {
  alerts: AppAlertItem[];
  customAlerts: AppAlertItem[];
  readIds: string[];
  clearedIds: string[];
  seenLiveIds: string[];
  hasLoadedOnce: boolean;
  isLoading: boolean;
  unreadCount: number;
  permissionStatus: NotificationPermissionState;
  activeBanner: AppAlertItem | null;
  lastSyncedAt: string | null;
  initializeAlerts: () => Promise<void>;
  refreshPermissionStatus: () => Promise<NotificationPermissionState>;
  refreshAlerts: (options?: RefreshOptions) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearAllAlerts: () => Promise<void>;
  dismissBanner: () => void;
  pushLocalAlert: (
    alert: Omit<AppAlertItem, 'timestamp' | 'read'> & { timestamp?: string; read?: boolean },
    options?: { sendOsNotification?: boolean; showInAppBanner?: boolean }
  ) => Promise<void>;
  sendTestAlert: () => Promise<boolean>;
  resetOnLogout: () => void;
}

function getStorageUserKey(): string {
  const user = useAuthStore.getState().user;
  return (user?.email || user?.id || 'guest').toLowerCase().replace(/[^a-z0-9@._-]/g, '_');
}

function mapBackendTypeToCategory(rawType: unknown): AppAlertCategory {
  const t = String(rawType || '').toUpperCase();
  if (t === 'ORDER' || t === 'DELIVERY') return 'delivery';
  if (t === 'PAYMENT' || t === 'INVOICE') return 'invoice';
  if (t === 'LAB') return 'lab';
  if (t === 'RANCH' || t === 'TELEMETRY' || t === 'TANK') return 'telemetry';
  return 'system';
}

function routeForCategory(category: AppAlertCategory): { actionRoute: string; actionLabel: string } {
  switch (category) {
    case 'delivery':
      return { actionRoute: '/deliveries', actionLabel: 'View Delivery' };
    case 'invoice':
      return { actionRoute: '/invoices', actionLabel: 'View Invoices' };
    case 'lab':
      return { actionRoute: '/ranches', actionLabel: 'View Lab Results' };
    case 'telemetry':
      return { actionRoute: '/ranches', actionLabel: 'Inspect Tanks' };
    default:
      return { actionRoute: '/home', actionLabel: 'Open Dashboard' };
  }
}

export function resolveAlertRoute(actionRoute?: string, role?: string): string {
  const r = String(role || '').toLowerCase();
  const isAdmin = r === 'admin';
  const isEmployee = r === 'employee';

  switch (actionRoute) {
    case '/deliveries':
      if (isAdmin) return 'AdminOrders';
      if (isEmployee) return 'Tasks';
      return 'Deliveries';
    case '/invoices':
      if (isAdmin) return 'AdminInvoices';
      if (isEmployee) return 'EmployeeHome';
      return 'Invoices';
    case '/ranches':
      if (isAdmin) return 'AdminRanches';
      return 'Ranches';
    case '/customers':
      return isAdmin ? 'AdminCustomers' : isEmployee ? 'EmployeeHome' : 'Home';
    case '/home':
    default:
      if (isAdmin) return 'AdminDashboard';
      if (isEmployee) return 'EmployeeHome';
      return 'Home';
  }
}

function formatRelativeOrTime(rawTimestamp: unknown): { label: string; sortKey: number } {
  if (!rawTimestamp) {
    const now = Date.now();
    return { label: 'Just now', sortKey: now };
  }
  if (typeof rawTimestamp === 'number' && Number.isFinite(rawTimestamp)) {
    return { label: 'Recent', sortKey: rawTimestamp };
  }
  const str = String(rawTimestamp);
  const parsed = Date.parse(str);
  if (!Number.isNaN(parsed)) {
    const diffMin = Math.round((Date.now() - parsed) / 60000);
    if (diffMin <= 1) return { label: 'Just now', sortKey: parsed };
    if (diffMin < 60) return { label: `${diffMin}m ago`, sortKey: parsed };
    const diffHours = Math.round(diffMin / 60);
    if (diffHours < 24) return { label: `${diffHours}h ago`, sortKey: parsed };
    const diffDays = Math.round(diffHours / 24);
    return { label: `${diffDays}d ago`, sortKey: parsed };
  }
  return { label: str, sortKey: Date.now() - 60000 };
}

async function persistIds(keyPrefix: string, ids: string[]): Promise<void> {
  try {
    const userKey = getStorageUserKey();
    await AsyncStorage.setItem(`${keyPrefix}${userKey}`, JSON.stringify(ids.slice(-200)));
  } catch {
    // Non-fatal persistence error
  }
}

async function loadPersistedIds(keyPrefix: string): Promise<string[]> {
  try {
    const userKey = getStorageUserKey();
    const raw = await AsyncStorage.getItem(`${keyPrefix}${userKey}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function mergeAndFinalizeAlerts(
  rawItems: AppAlertItem[],
  readIds: string[],
  clearedIds: string[]
): { items: AppAlertItem[]; unreadCount: number } {
  const readSet = new Set(readIds);
  const clearedSet = new Set(clearedIds);
  const byId = new Map<string, AppAlertItem>();

  for (const item of rawItems) {
    if (!item || !item.id || clearedSet.has(item.id)) continue;
    const isRead = Boolean(item.read || readSet.has(item.id));
    const existing = byId.get(item.id);
    if (!existing) {
      byId.set(item.id, { ...item, read: isRead });
    } else {
      byId.set(item.id, {
        ...existing,
        ...item,
        read: existing.read || isRead,
      });
    }
  }

  const items = Array.from(byId.values()).sort(
    (a, b) => (b.sortKey ?? 0) - (a.sortKey ?? 0)
  );
  const unreadCount = items.filter((item) => !item.read).length;
  return { items, unreadCount };
}

export const useNotificationStore = create<NotificationStoreState>((set, get) => ({
  alerts: [],
  customAlerts: [],
  readIds: [],
  clearedIds: [],
  seenLiveIds: [],
  hasLoadedOnce: false,
  isLoading: false,
  unreadCount: 0,
  permissionStatus: 'default',
  activeBanner: null,
  lastSyncedAt: null,

  refreshPermissionStatus: async () => {
    const status = await getNotificationPermissionAsync();
    set({ permissionStatus: status });
    return status;
  },

  initializeAlerts: async () => {
    const [readIds, clearedIds] = await Promise.all([
      loadPersistedIds('@renu_alerts_read_'),
      loadPersistedIds('@renu_alerts_cleared_'),
    ]);
    const permissionStatus = await getNotificationPermissionAsync();
    set({ readIds, clearedIds, permissionStatus });
    await get().refreshAlerts({ notifyNew: false });
  },

  refreshAlerts: async (options = {}) => {
    const auth = useAuthStore.getState();
    if (!auth.isLoggedIn) {
      return;
    }

    set({ isLoading: true });
    const role = String(auth.role || auth.user?.role || 'client').toLowerCase();
    const isAdmin = role === 'admin';
    const collected: AppAlertItem[] = [...get().customAlerts];
    const nowTs = Date.now();

    try {
      // 1. Backend persisted / feed notifications
      if (isAdmin && typeof apiClientModule.fetchAdminNotifications === 'function') {
        try {
          const adminFeed = await apiClientModule.fetchAdminNotifications();
          if (Array.isArray(adminFeed)) {
            for (const n of adminFeed) {
              if (!n?.id) continue;
              const category = mapBackendTypeToCategory(n.type);
              const routeMeta = routeForCategory(category);
              const formatted = formatRelativeOrTime(n.timestamp);
              collected.push({
                id: String(n.id),
                type: category,
                title: String(n.title || 'ReNu-Biome Update'),
                message: String(n.message || ''),
                timestamp: formatted.label,
                read: Boolean(n.read),
                actionRoute: routeMeta.actionRoute,
                actionLabel: routeMeta.actionLabel,
                severity: category === 'telemetry' ? 'warning' : 'info',
                sortKey: formatted.sortKey,
              });
            }
          }
        } catch {
          // Continue to secondary alert sources
        }
      } else if (typeof apiClientModule.apiClient === 'function') {
        try {
          const res = await apiClientModule.apiClient('/app/notifications');
          const list = Array.isArray(res?.notifications) ? res.notifications : [];
          for (const n of list) {
            if (!n?.id) continue;
            const category = mapBackendTypeToCategory(n.type);
            const routeMeta = routeForCategory(category);
            const formatted = formatRelativeOrTime(n.timestamp);
            collected.push({
              id: String(n.id),
              type: category,
              title: String(n.title || 'ReNu-Biome Alert'),
              message: String(n.message || ''),
              timestamp: formatted.label,
              read: Boolean(n.read),
              actionRoute: routeMeta.actionRoute,
              actionLabel: routeMeta.actionLabel,
              severity: 'info',
              sortKey: formatted.sortKey,
            });
          }
        } catch {
          // Continue to operational synthesis
        }
      }

      // 2. Operational telemetry / delivery / invoice alerts from live workspace endpoints
      if (isAdmin && typeof apiClientModule.fetchAdminDashboard === 'function') {
        try {
          const dash = await apiClientModule.fetchAdminDashboard();
          if (Array.isArray(dash?.lowTanksAlerts)) {
            dash.lowTanksAlerts.forEach((tank: any, idx: number) => {
              const id = `op-low-tank-${tank.ranchId || tank.blockId || tank.name || idx}`;
              const pct = tank.tankLevelPct ?? tank.levelPct ?? tank.level ?? 20;
              collected.push({
                id,
                type: 'telemetry',
                title: `Low Tank — ${tank.ranchName || tank.name || 'Field Block'}`,
                message: `${tank.blockName || 'Bio-tank'} is at ${Math.round(Number(pct))}% capacity.`,
                timestamp: 'Live Telemetry',
                read: false,
                actionRoute: '/ranches',
                actionLabel: 'Inspect Ranches',
                severity: Number(pct) <= 15 ? 'critical' : 'warning',
                sortKey: nowTs - idx,
              });
            });
          }
          if (Array.isArray(dash?.pendingSamplesAlerts)) {
            dash.pendingSamplesAlerts.forEach((sample: any, idx: number) => {
              const id = `op-lab-${sample.id || idx}`;
              collected.push({
                id,
                type: 'lab',
                title: `Pending Lab Sample — ${sample.ranchName || sample.blockName || 'Block'}`,
                message: sample.summary || sample.message || 'Lab biology sample is awaiting analysis or review.',
                timestamp: 'Lab Queue',
                read: false,
                actionRoute: '/ranches',
                actionLabel: 'Open Ranches',
                severity: 'info',
                sortKey: nowTs - 100 - idx,
              });
            });
          }
          if (Array.isArray(dash?.overdueInvoices) && dash.overdueInvoices.length > 0) {
            const count = dash.overdueInvoices.length;
            const total = dash.overdueTotal ? ` ($${Number(dash.overdueTotal).toLocaleString()})` : '';
            collected.push({
              id: `op-overdue-invoices-${count}`,
              type: 'invoice',
              title: `${count} Overdue Invoice${count > 1 ? 's' : ''}`,
              message: `Customer billing follow-up needed${total}.`,
              timestamp: 'Billing',
              read: false,
              actionRoute: '/invoices',
              actionLabel: 'View Billing',
              severity: 'warning',
              sortKey: nowTs - 200,
            });
          }
          if (Array.isArray(dash?.deliveriesDueSoon)) {
            dash.deliveriesDueSoon.slice(0, 3).forEach((del: any, idx: number) => {
              const id = `op-due-delivery-${del.id || idx}`;
              collected.push({
                id,
                type: 'delivery',
                title: `Dispatch Scheduled — ${del.customerName || del.ranchName || 'Grower'}`,
                message: `${del.gallons || del.volumeGallons || ''} gal ${del.productName || 'ReNu-Biome'} scheduled ${del.scheduledDate || 'soon'}.`.trim(),
                timestamp: del.scheduledDate || 'Upcoming',
                read: false,
                actionRoute: '/deliveries',
                actionLabel: 'Manage Orders',
                severity: 'info',
                sortKey: nowTs - 300 - idx,
              });
            });
          }
        } catch {
          // Non-fatal
        }
      } else {
        // Grower / employee operational synthesis
        const [ranchesRes, deliveriesRes, invoicesRes] = await Promise.allSettled([
          typeof apiClientModule.fetchRanches === 'function' ? apiClientModule.fetchRanches() : Promise.resolve([]),
          typeof apiClientModule.fetchDeliveries === 'function' ? apiClientModule.fetchDeliveries() : Promise.resolve([]),
          typeof apiClientModule.fetchInvoices === 'function' ? apiClientModule.fetchInvoices() : Promise.resolve([]),
        ]);

        if (ranchesRes.status === 'fulfilled' && Array.isArray(ranchesRes.value)) {
          ranchesRes.value.forEach((ranch: any, rIdx: number) => {
            const blocks = Array.isArray(ranch?.blocks) ? ranch.blocks : [];
            blocks.forEach((block: any, bIdx: number) => {
              const lvl = Number(block?.tankLevelPct ?? block?.tankLevel ?? block?.currentLevel ?? 100);
              if (Number.isFinite(lvl) && lvl <= 25) {
                collected.push({
                  id: `grower-tank-${ranch.id || rIdx}-${block.id || bIdx}`,
                  type: 'telemetry',
                  title: `Low Tank Alert — ${ranch.name || 'Ranch'}`,
                  message: `${block.name || 'Block'} is at ${Math.round(lvl)}% tank capacity. Refill recommended.`,
                  timestamp: 'Live Telemetry',
                  read: false,
                  actionRoute: '/ranches',
                  actionLabel: 'View Tank',
                  severity: lvl <= 15 ? 'critical' : 'warning',
                  sortKey: nowTs - rIdx * 10 - bIdx,
                });
              }
            });
          });
        }

        if (deliveriesRes.status === 'fulfilled' && Array.isArray(deliveriesRes.value)) {
          deliveriesRes.value.slice(0, 4).forEach((del: any, idx: number) => {
            const status = String(del?.status || '');
            if (/out for delivery|in transit|scheduled/i.test(status)) {
              collected.push({
                id: `grower-del-${del.id || idx}-${status.toLowerCase().replace(/\s+/g, '-')}`,
                type: 'delivery',
                title: `Delivery ${status}`,
                message: `${del.gallons || del.volumeGallons || ''} gal ${del.productName || 'treatment'} for ${del.ranchName || del.blockName || 'your ranch'}.`.trim(),
                timestamp: del.scheduledDate || 'Active',
                read: false,
                actionRoute: '/deliveries',
                actionLabel: 'Track Delivery',
                severity: /out for delivery/i.test(status) ? 'success' : 'info',
                sortKey: nowTs - 150 - idx,
              });
            }
          });
        }

        if (invoicesRes.status === 'fulfilled' && Array.isArray(invoicesRes.value)) {
          invoicesRes.value.slice(0, 3).forEach((inv: any, idx: number) => {
            const status = String(inv?.status || '');
            if (/overdue|past due/i.test(status)) {
              collected.push({
                id: `grower-inv-${inv.id || idx}`,
                type: 'invoice',
                title: `Invoice Overdue — #${inv.invoiceNumber || inv.id || ''}`,
                message: `Amount due: $${Number(inv.amount || inv.total || 0).toLocaleString()}.`,
                timestamp: inv.dueDate || 'Due Now',
                read: false,
                actionRoute: '/invoices',
                actionLabel: 'View Invoice',
                severity: 'warning',
                sortKey: nowTs - 250 - idx,
              });
            }
          });
        }
      }

      if (collected.length === 0) {
        collected.push({
          id: 'system-alerts-ready',
          type: 'system',
          title: 'ReNu-Biome Alerts Active',
          message: 'All ranch telemetry, biological deliveries, lab results, and billing monitors are up to date.',
          timestamp: 'Synced',
          read: true,
          actionRoute: '/home',
          actionLabel: 'Dashboard',
          severity: 'success',
          sortKey: nowTs - 500,
        });
      }

      const state = get();
      const { items, unreadCount } = mergeAndFinalizeAlerts(
        collected,
        state.readIds,
        state.clearedIds
      );

      const prevSeen = new Set(state.seenLiveIds);
      const newlyArrivedUnread = items.filter((item) => !item.read && !prevSeen.has(item.id));
      const updatedSeenIds = Array.from(new Set([...state.seenLiveIds, ...items.map((i) => i.id)])).slice(-250);

      let nextBanner = state.activeBanner;
      if (options.notifyNew && state.hasLoadedOnce && newlyArrivedUnread.length > 0) {
        const newest = newlyArrivedUnread[0];
        nextBanner = newest;
        void sendMobileNotification(newest.title, {
          body: newest.message,
          tag: newest.id,
          url: newest.actionRoute || '/home',
        });
      }

      await syncAppBadgeCount(unreadCount);

      set({
        alerts: items,
        unreadCount,
        seenLiveIds: updatedSeenIds,
        hasLoadedOnce: true,
        isLoading: false,
        activeBanner: nextBanner,
        lastSyncedAt: new Date().toISOString(),
      });
    } catch {
      set({ isLoading: false, hasLoadedOnce: true });
    }
  },

  markAsRead: async (id: string) => {
    const state = get();
    const readIds = Array.from(new Set([...state.readIds, id]));
    const customAlerts = state.customAlerts.map((item) =>
      item.id === id ? { ...item, read: true } : item
    );
    const { items, unreadCount } = mergeAndFinalizeAlerts(
      state.alerts.map((a) => (a.id === id ? { ...a, read: true } : a)),
      readIds,
      state.clearedIds
    );
    set({
      readIds,
      customAlerts,
      alerts: items,
      unreadCount,
      activeBanner: state.activeBanner?.id === id ? null : state.activeBanner,
    });
    await Promise.all([
      persistIds('@renu_alerts_read_', readIds),
      syncAppBadgeCount(unreadCount),
    ]);
  },

  markAllAsRead: async () => {
    const state = get();
    const allIds = state.alerts.map((a) => a.id);
    const readIds = Array.from(new Set([...state.readIds, ...allIds]));
    const alerts = state.alerts.map((a) => ({ ...a, read: true }));
    const customAlerts = state.customAlerts.map((a) => ({ ...a, read: true }));

    set({
      readIds,
      customAlerts,
      alerts,
      unreadCount: 0,
      activeBanner: null,
    });

    const role = String(useAuthStore.getState().role || '').toLowerCase();
    if (role === 'admin' && typeof apiClientModule.markNotificationsRead === 'function') {
      try {
        await apiClientModule.markNotificationsRead();
      } catch {
        // Non-fatal
      }
    }

    await Promise.all([
      persistIds('@renu_alerts_read_', readIds),
      syncAppBadgeCount(0),
    ]);
  },

  clearAllAlerts: async () => {
    const state = get();
    const clearedIds = Array.from(new Set([...state.clearedIds, ...state.alerts.map((a) => a.id)]));
    set({
      clearedIds,
      customAlerts: [],
      alerts: [],
      unreadCount: 0,
      activeBanner: null,
    });
    await Promise.all([
      persistIds('@renu_alerts_cleared_', clearedIds),
      syncAppBadgeCount(0),
    ]);
  },

  dismissBanner: () => {
    set({ activeBanner: null });
  },

  pushLocalAlert: async (alertInput, options = {}) => {
    const { sendOsNotification = true, showInAppBanner = true } = options;
    const state = get();
    const now = Date.now();
    const item: AppAlertItem = {
      ...alertInput,
      timestamp: alertInput.timestamp || 'Just now',
      read: Boolean(alertInput.read ?? false),
      sortKey: alertInput.sortKey ?? now,
    };

    const customAlerts = [item, ...state.customAlerts.filter((c) => c.id !== item.id)].slice(0, 25);
    const clearedIds = state.clearedIds.filter((id) => id !== item.id);
    const readIds = item.read ? state.readIds : state.readIds.filter((id) => id !== item.id);

    const { items, unreadCount } = mergeAndFinalizeAlerts(
      [item, ...state.alerts.filter((a) => a.id !== item.id)],
      readIds,
      clearedIds
    );

    const seenLiveIds = Array.from(new Set([...state.seenLiveIds, item.id])).slice(-250);

    set({
      customAlerts,
      clearedIds,
      readIds,
      seenLiveIds,
      alerts: items,
      unreadCount,
      activeBanner: showInAppBanner ? item : state.activeBanner,
    });

    await syncAppBadgeCount(unreadCount);

    if (sendOsNotification) {
      await sendMobileNotification(item.title, {
        body: item.message,
        tag: item.id,
        url: item.actionRoute || '/home',
      });
    }
  },

  sendTestAlert: async () => {
    const id = `test-alert-${Date.now()}`;
    await get().pushLocalAlert(
      {
        id,
        type: 'system',
        title: 'ReNu-Biome Alerts Active',
        message: 'You will now receive delivery tracking, low tank warnings, and billing alerts across iOS, iPad, and Mac.',
        actionRoute: '/home',
        actionLabel: 'Open Dashboard',
        severity: 'success',
      },
      { sendOsNotification: false, showInAppBanner: true }
    );
    const deliveredOs = await sendMobileNotification('ReNu-Biome Alerts Active', {
      body: 'Live alerts enabled for tank telemetry, biological deliveries, lab samples, and invoices.',
      tag: id,
      url: '/home',
    });
    const permissionStatus = await getNotificationPermissionAsync();
    set({ permissionStatus });
    return deliveredOs;
  },

  resetOnLogout: () => {
    void syncAppBadgeCount(0);
    set({
      alerts: [],
      customAlerts: [],
      readIds: [],
      clearedIds: [],
      seenLiveIds: [],
      hasLoadedOnce: false,
      isLoading: false,
      unreadCount: 0,
      activeBanner: null,
      lastSyncedAt: null,
    });
  },
}));
