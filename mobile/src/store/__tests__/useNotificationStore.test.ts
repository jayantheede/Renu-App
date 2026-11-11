import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../useAuthStore';
import {
  useNotificationStore,
  resolveAlertRoute,
} from '../useNotificationStore';
import * as apiClient from '../../api/client';
import {
  areNotificationsSupported,
  getNotificationPermissionAsync,
  requestNotificationPermission,
} from '../../utils/notifications';

describe('useNotificationStore & Native App Alerts', () => {
  const originalNativeModule = NativeModules.NativeAppAlerts;
  const originalPlatformOS = Platform.OS;

  beforeEach(async () => {
    jest.restoreAllMocks();
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    NativeModules.NativeAppAlerts = {
      getPermissionStatus: jest.fn().mockResolvedValue('default'),
      requestPermission: jest.fn().mockResolvedValue(true),
      scheduleLocalAlert: jest.fn().mockResolvedValue(true),
      setBadgeCount: jest.fn().mockResolvedValue(true),
    };

    await AsyncStorage.clear();
    useNotificationStore.getState().resetOnLogout();
    useAuthStore.setState({
      user: { id: 'usr_1', email: 'grower@farm.com', name: 'Test User', role: 'client' },
      token: 'tok_test',
      isLoggedIn: true,
      role: 'client',
      isInitialized: true,
    });
  });

  afterEach(() => {
    NativeModules.NativeAppAlerts = originalNativeModule;
    Object.defineProperty(Platform, 'OS', { value: originalPlatformOS, configurable: true });
  });

  it('detects native iOS/Mac alert support and requests permission', async () => {
    expect(areNotificationsSupported()).toBe(true);
    expect(await getNotificationPermissionAsync()).toBe('default');

    jest.spyOn(apiClient, 'apiClient').mockResolvedValue({ success: true });
    const granted = await requestNotificationPermission();
    expect(granted).toBe(true);
    expect(NativeModules.NativeAppAlerts.requestPermission).toHaveBeenCalledTimes(1);
    expect(apiClient.apiClient).toHaveBeenCalledWith(
      '/app/push/subscribe',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('aggregates live admin alerts, syncs OS badge count, and marks read', async () => {
    useAuthStore.setState({
      user: { id: 'adm_1', email: 'ops@renubiome.com', name: 'Admin', role: 'admin' },
      token: 'tok_admin',
      isLoggedIn: true,
      role: 'admin',
    });

    jest.spyOn(apiClient, 'fetchAdminNotifications').mockResolvedValue([
      {
        id: 'notif-1',
        title: 'New Order #101',
        message: 'Valley Farm requested 500 gal.',
        type: 'ORDER',
        timestamp: new Date().toISOString(),
        read: false,
      },
    ]);
    jest.spyOn(apiClient, 'fetchAdminDashboard').mockResolvedValue({
      lowTanksAlerts: [{ ranchId: 'r1', ranchName: 'North Ranch', blockName: 'Block A', tankLevelPct: 14 }],
      pendingSamplesAlerts: [],
      overdueInvoices: [{ id: 'inv-9', amount: 450 }],
      overdueTotal: 450,
      deliveriesDueSoon: [],
    });
    jest.spyOn(apiClient, 'markNotificationsRead').mockResolvedValue({ success: true });

    await useNotificationStore.getState().initializeAlerts();

    const state = useNotificationStore.getState();
    expect(state.alerts.length).toBe(3);
    expect(state.unreadCount).toBe(3);
    expect(NativeModules.NativeAppAlerts.setBadgeCount).toHaveBeenCalledWith(3);

    await useNotificationStore.getState().markAsRead('notif-1');
    expect(useNotificationStore.getState().unreadCount).toBe(2);
    expect(NativeModules.NativeAppAlerts.setBadgeCount).toHaveBeenLastCalledWith(2);

    await useNotificationStore.getState().markAllAsRead();
    expect(useNotificationStore.getState().unreadCount).toBe(0);
    expect(NativeModules.NativeAppAlerts.setBadgeCount).toHaveBeenLastCalledWith(0);
  });

  it('builds grower operational alerts and triggers test OS + in-app alert banners', async () => {
    jest.spyOn(apiClient, 'apiClient').mockResolvedValue({ notifications: [] });
    jest.spyOn(apiClient, 'fetchRanches').mockResolvedValue([
      { id: 'r1', name: 'River Ranch', blocks: [{ id: 'b1', name: 'East Block', tankLevelPct: 18 }] },
    ]);
    jest.spyOn(apiClient, 'fetchDeliveries').mockResolvedValue([
      { id: 'd1', status: 'Out for delivery', gallons: 300, productName: 'Soil Boost', ranchName: 'River Ranch' },
    ]);
    jest.spyOn(apiClient, 'fetchInvoices').mockResolvedValue([
      { id: 'i1', invoiceNumber: 'INV-44', status: 'Overdue', amount: 820 },
    ]);

    await useNotificationStore.getState().refreshAlerts({ notifyNew: false });
    expect(useNotificationStore.getState().unreadCount).toBe(3);

    NativeModules.NativeAppAlerts.getPermissionStatus.mockResolvedValue('granted');
    const delivered = await useNotificationStore.getState().sendTestAlert();
    expect(delivered).toBe(true);
    expect(useNotificationStore.getState().activeBanner?.title).toBe('ReNu-Biome Alerts Active');
    expect(NativeModules.NativeAppAlerts.scheduleLocalAlert).toHaveBeenCalledWith(
      'ReNu-Biome Alerts Active',
      expect.any(String),
      expect.any(String),
      0,
      '/home'
    );
  });

  it('resolves role-aware destination screens accurately', () => {
    expect(resolveAlertRoute('/deliveries', 'admin')).toBe('AdminOrders');
    expect(resolveAlertRoute('/deliveries', 'client')).toBe('Deliveries');
    expect(resolveAlertRoute('/invoices', 'admin')).toBe('AdminInvoices');
    expect(resolveAlertRoute('/invoices', 'client')).toBe('Invoices');
    expect(resolveAlertRoute('/ranches', 'admin')).toBe('AdminRanches');
    expect(resolveAlertRoute('/home', 'admin')).toBe('AdminDashboard');
    expect(resolveAlertRoute('/home', 'client')).toBe('Home');
  });
});

