import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { Text, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NavigationContext } from '@react-navigation/native';
import { useAuthStore } from '../store/useAuthStore';
import {
  useNotificationStore,
  resolveAlertRoute,
  AppAlertCategory,
  AppAlertItem,
} from '../store/useNotificationStore';
import {
  areNotificationsSupported,
  getNotificationPermissionAsync,
  requestNotificationPermission,
} from '../utils/notifications';

interface Props {
  visible: boolean;
  onClose: () => void;
}

function getAlertVisuals(type: AppAlertCategory): {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  bg: string;
} {
  switch (type) {
    case 'delivery':
      return { icon: 'truck-delivery-outline', color: '#0284C7', bg: '#E0F2FE' };
    case 'telemetry':
      return { icon: 'water-alert-outline', color: '#D97706', bg: '#FEF3C7' };
    case 'lab':
      return { icon: 'flask-outline', color: '#7C3AED', bg: '#EDE9FE' };
    case 'invoice':
      return { icon: 'file-document-alert-outline', color: '#DC2626', bg: '#FEE2E2' };
    case 'system':
    default:
      return { icon: 'bell-check-outline', color: '#1E5631', bg: '#DCFCE7' };
  }
}

const FALLBACK_NAV_CONTEXT = createContext<any>(null);
const SafeNavigationContext = (NavigationContext as React.Context<any> | undefined) || FALLBACK_NAV_CONTEXT;

export const NotificationCenterModal: React.FC<Props> = ({ visible, onClose }) => {
  const { width, height } = useWindowDimensions();
  const isWideViewport = width >= 640;
  const navigation = useContext(SafeNavigationContext);
  const role = useAuthStore((s) => s.role);

  const alerts = useNotificationStore((s) => s.alerts);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const isLoading = useNotificationStore((s) => s.isLoading);
  const permissionStatus = useNotificationStore((s) => s.permissionStatus);
  const refreshPermissionStatus = useNotificationStore((s) => s.refreshPermissionStatus);
  const refreshAlerts = useNotificationStore((s) => s.refreshAlerts);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);
  const clearAllAlerts = useNotificationStore((s) => s.clearAllAlerts);
  const sendTestAlert = useNotificationStore((s) => s.sendTestAlert);

  const [statusNote, setStatusNote] = useState<string | null>(null);
  const [testingAlert, setTestingAlert] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setStatusNote(null);
    void (async () => {
      await refreshPermissionStatus();
      await refreshAlerts({ notifyNew: false });
    })();
  }, [visible, refreshPermissionStatus, refreshAlerts]);

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    const updated = await getNotificationPermissionAsync();
    await refreshPermissionStatus();

    if (granted || updated === 'granted') {
      const ok = await sendTestAlert();
      setStatusNote(
        ok
          ? 'Native app alerts enabled — test alert dispatched.'
          : 'Alert permission enabled.'
      );
    } else if (updated === 'denied') {
      const settingsLabel =
        Platform.OS === 'web'
          ? 'your browser site settings'
          : 'System Settings / iOS Notification Center for ReNu-Biome';
      Alert.alert(
        'App Alerts Blocked',
        `Notification access is currently turned off. Enable alerts in ${settingsLabel} to receive tank warnings and delivery updates.`
      );
    } else {
      setStatusNote('App alert prompt was dismissed.');
    }
  };

  const handleSendTest = async () => {
    setTestingAlert(true);
    try {
      const perm = await getNotificationPermissionAsync();
      if (perm !== 'granted' && perm !== 'unsupported') {
        await requestNotificationPermission();
        await refreshPermissionStatus();
      }
      const deliveredOs = await sendTestAlert();
      setStatusNote(
        deliveredOs
          ? 'Test alert sent to your notification center and inbox.'
          : 'Test alert added to in-app alert center.'
      );
    } finally {
      setTestingAlert(false);
    }
  };

  const handleAlertPress = async (item: AppAlertItem) => {
    await markAsRead(item.id);
    onClose();
    if (navigation && item.actionRoute) {
      const targetScreen = resolveAlertRoute(item.actionRoute, role);
      try {
        (navigation as any).navigate(targetScreen);
      } catch {
        // Screen not present in current stack
      }
    }
  };

  const supported = areNotificationsSupported();
  const permissionBadgeText =
    permissionStatus === 'granted'
      ? 'Active'
      : permissionStatus === 'denied'
        ? 'Blocked'
        : supported
          ? 'Off'
          : 'In-App Only';

  return (
    <Modal
      visible={visible}
      transparent
      animationType={isWideViewport ? 'fade' : 'slide'}
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, isWideViewport && styles.overlayCentered]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />

        <View
          style={[
            styles.sheet,
            isWideViewport
              ? [styles.sheetWide, { maxHeight: Math.min(720, Math.round(height * 0.85)) }]
              : [styles.sheetCompact, { maxHeight: Math.round(height * 0.88) }],
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <MaterialCommunityIcons name="bell-badge-outline" size={20} color="#1E5631" />
              </View>
              <View>
                <Text style={styles.headerTitle}>App Alerts & Updates</Text>
                <Text style={styles.headerSubtitle}>
                  {unreadCount > 0 ? `${unreadCount} unread operational alert${unreadCount === 1 ? '' : 's'}` : 'All caught up'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityLabel="Close alerts"
            >
              <MaterialCommunityIcons name="close" size={20} color="#475569" />
            </TouchableOpacity>
          </View>

          {/* OS Notification Status & Controls */}
          <View style={styles.statusBanner}>
            <View style={styles.statusTopRow}>
              <View style={styles.statusTextCol}>
                <View style={styles.statusTitleRow}>
                  <Text style={styles.statusTitle}>System Banner & Sound Alerts</Text>
                  <View
                    style={[
                      styles.permPill,
                      permissionStatus === 'granted'
                        ? styles.permPillOn
                        : permissionStatus === 'denied'
                          ? styles.permPillBlocked
                          : styles.permPillOff,
                    ]}
                  >
                    <Text
                      style={[
                        styles.permPillText,
                        permissionStatus === 'granted'
                          ? styles.permPillTextOn
                          : permissionStatus === 'denied'
                            ? styles.permPillTextBlocked
                            : styles.permPillTextOff,
                      ]}
                    >
                      {permissionBadgeText}
                    </Text>
                  </View>
                </View>
                <Text style={styles.statusDesc}>
                  Receive real-time alerts for low tank telemetry, deliveries, lab samples, and overdue billing across iPhone, iPad, Mac, and Web.
                </Text>
              </View>
            </View>

            <View style={styles.bannerActions}>
              {permissionStatus !== 'granted' && supported && (
                <TouchableOpacity
                  onPress={handleEnableNotifications}
                  style={styles.enableBtn}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="bell-ring-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.enableBtnText}>Enable Native Alerts</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={handleSendTest}
                style={styles.testBtn}
                disabled={testingAlert}
                activeOpacity={0.75}
              >
                {testingAlert ? (
                  <ActivityIndicator size="small" color="#1E5631" />
                ) : (
                  <MaterialCommunityIcons name="bell-plus-outline" size={16} color="#1E5631" />
                )}
                <Text style={styles.testBtnText}>Send Test Alert</Text>
              </TouchableOpacity>
            </View>

            {statusNote && <Text style={styles.statusFeedback}>{statusNote}</Text>}
          </View>

          {/* Toolbar */}
          <View style={styles.toolbar}>
            <TouchableOpacity
              onPress={() => void refreshAlerts({ notifyNew: false })}
              style={styles.toolbarBtn}
              disabled={isLoading}
            >
              <MaterialCommunityIcons name="refresh" size={15} color="#334155" />
              <Text style={styles.toolbarBtnText}>Refresh</Text>
            </TouchableOpacity>

            <View style={styles.toolbarRight}>
              {unreadCount > 0 && (
                <TouchableOpacity
                  onPress={() => void markAllAsRead()}
                  style={styles.toolbarLink}
                >
                  <Text style={styles.toolbarLinkText}>Mark all read</Text>
                </TouchableOpacity>
              )}
              {alerts.length > 0 && (
                <TouchableOpacity
                  onPress={() => void clearAllAlerts()}
                  style={styles.toolbarLink}
                >
                  <Text style={[styles.toolbarLinkText, { color: '#DC2626' }]}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <Divider />

          {/* Alert List */}
          <ScrollView
            style={styles.listScroll}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {isLoading && alerts.length === 0 ? (
              <View style={styles.emptyBox}>
                <ActivityIndicator size="small" color="#1E5631" />
                <Text style={styles.emptySubtitle}>Loading live operational alerts...</Text>
              </View>
            ) : alerts.length === 0 ? (
              <View style={styles.emptyBox}>
                <MaterialCommunityIcons name="check-decagram-outline" size={38} color="#94A3B8" />
                <Text style={styles.emptyTitle}>No Active Alerts</Text>
                <Text style={styles.emptySubtitle}>
                  All tank levels, deliveries, and account monitors look good right now.
                </Text>
              </View>
            ) : (
              alerts.map((item) => {
                const visuals = getAlertVisuals(item.type);
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => void handleAlertPress(item)}
                    activeOpacity={0.75}
                    style={[styles.alertCard, !item.read && styles.alertCardUnread]}
                  >
                    <View style={[styles.iconBox, { backgroundColor: visuals.bg }]}>
                      <MaterialCommunityIcons
                        name={visuals.icon}
                        size={20}
                        color={visuals.color}
                      />
                    </View>

                    <View style={styles.alertBody}>
                      <View style={styles.alertTitleRow}>
                        <Text style={styles.alertTitle} numberOfLines={1}>
                          {item.title}
                        </Text>
                        {!item.read && <View style={styles.unreadDot} />}
                      </View>

                      <Text style={styles.alertMessage}>{item.message}</Text>

                      <View style={styles.alertMetaRow}>
                        <Text style={styles.alertTimestamp}>{item.timestamp}</Text>
                        {item.actionLabel && (
                          <Text style={styles.alertActionText}>{item.actionLabel} →</Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  overlayCentered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 16,
  },
  sheetCompact: {
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  sheetWide: {
    width: '100%',
    maxWidth: 560,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBanner: {
    margin: 14,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  statusTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statusTextCol: {
    flex: 1,
  },
  statusTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  statusTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  permPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  permPillOn: { backgroundColor: '#DCFCE7' },
  permPillBlocked: { backgroundColor: '#FEE2E2' },
  permPillOff: { backgroundColor: '#E2E8F0' },
  permPillText: { fontSize: 11, fontWeight: '700' },
  permPillTextOn: { color: '#166534' },
  permPillTextBlocked: { color: '#991B1B' },
  permPillTextOff: { color: '#334155' },
  statusDesc: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
    marginTop: 4,
  },
  bannerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  enableBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E5631',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  enableBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
  },
  testBtnText: {
    color: '#1E5631',
    fontSize: 12,
    fontWeight: '700',
  },
  statusFeedback: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1E5631',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  toolbarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  toolbarBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  toolbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  toolbarLink: {
    paddingVertical: 4,
  },
  toolbarLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E5631',
  },
  listScroll: {
    flexGrow: 0,
  },
  listContent: {
    padding: 14,
    gap: 10,
    paddingBottom: 24,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  alertCardUnread: {
    backgroundColor: '#F8FAFC',
    borderColor: '#BBF7D0',
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  alertBody: {
    flex: 1,
  },
  alertTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  alertMessage: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
    marginTop: 3,
  },
  alertMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  alertTimestamp: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  alertActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E5631',
  },
});
