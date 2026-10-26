import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Text, Chip, Divider, Switch } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BRAND_COLORS } from '../theme/theme';
import {
  areNotificationsSupported,
  getNotificationPermission,
  requestNotificationPermission,
  sendTestNotification,
  triggerLowTankAlert,
  triggerDeliveryUpdate,
} from '../utils/notifications';

export interface InAppNotification {
  id: string;
  title: string;
  body: string;
  category: 'delivery' | 'tank' | 'invoice' | 'lab' | 'system';
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

const DEFAULT_NOTIFICATIONS: InAppNotification[] = [
  {
    id: 'notif-1',
    title: '🚚 Delivery En Route: DEL-101',
    body: 'Driver Carlos V. has departed Fresno Hub with 3,500 gal ReNu N-CARE 32-0-0. ETA: 10:45 AM.',
    category: 'delivery',
    timestamp: '15 mins ago',
    read: false,
    actionUrl: '/deliveries',
  },
  {
    id: 'notif-2',
    title: '⚠️ Low Tank Level: North Station 5K',
    body: 'Cellular telemetry reports level dropped to 22% (1,100 Gal). Auto re-order threshold reached.',
    category: 'tank',
    timestamp: '1 hour ago',
    read: false,
    actionUrl: '/ranches',
  },
  {
    id: 'notif-3',
    title: '📄 Invoice Ready: INV-2026-004',
    body: 'Your biological fertigation program invoice for $13,440.00 is now available for review and payment.',
    category: 'invoice',
    timestamp: 'Yesterday',
    read: true,
    actionUrl: '/invoices',
  },
  {
    id: 'notif-4',
    title: '🔬 Lab Tissue Assay Completed',
    body: 'Dellavalle Laboratory uploaded Block-1 Nonpareil Almond tissue results (3.2% N · Optimal).',
    category: 'lab',
    timestamp: '2 days ago',
    read: true,
    actionUrl: '/ranches',
  },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  onNavigate?: (screen: string) => void;
}

export const NotificationCenterModal: React.FC<Props> = ({
  visible,
  onClose,
  onNavigate,
}) => {
  const [notifications, setNotifications] = useState<InAppNotification[]>(DEFAULT_NOTIFICATIONS);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [permissionStatus, setPermissionStatus] = useState<string>('default');
  const [pushEnabled, setPushEnabled] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  useEffect(() => {
    if (visible) {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const perm = getNotificationPermission();
        setPermissionStatus(perm);
        setPushEnabled(perm === 'granted');
      }
    }
  }, [visible]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleTogglePush = async () => {
    setStatusMessage('');
    if (pushEnabled) {
      setPushEnabled(false);
      setStatusMessage('Push notifications turned off in app.');
      return;
    }

    const granted = await requestNotificationPermission();
    if (granted) {
      setPushEnabled(true);
      setPermissionStatus('granted');
      setStatusMessage('Mobile notifications enabled! Alerts will pop up on your device.');
      await sendTestNotification();
    } else {
      setPushEnabled(false);
      setPermissionStatus(getNotificationPermission());
      setStatusMessage('Permission not granted. Please allow notifications in your browser settings.');
    }
  };

  const handleTestNow = async () => {
    setSendingTest(true);
    setStatusMessage('');
    try {
      const ok = await sendTestNotification();
      if (ok) {
        setStatusMessage('Test notification sent! Check your phone notification tray or status bar.');
      } else {
        setStatusMessage('Could not show notification. Tap Enable Notifications first.');
      }
    } catch (e: any) {
      setStatusMessage('Notification test error: ' + (e.message || 'Unknown'));
    } finally {
      setSendingTest(false);
    }
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleClearAll = () => {
    setNotifications([]);
  };

  const handleItemPress = (item: InAppNotification) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
    );
    onClose();
    if (onNavigate && item.actionUrl) {
      const screenName = item.actionUrl.replace(/^\//, '');
      const capitalized = screenName.charAt(0).toUpperCase() + screenName.slice(1);
      onNavigate(capitalized);
    }
  };

  const filteredItems = filter === 'unread' ? notifications.filter((n) => !n.read) : notifications;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'delivery':
        return { name: 'truck-fast', color: '#0C6054', bg: '#F0FDFA' };
      case 'tank':
        return { name: 'water-pump', color: '#DC2626', bg: '#FEF2F2' };
      case 'invoice':
        return { name: 'file-document-outline', color: '#D97706', bg: '#FFFBEB' };
      case 'lab':
        return { name: 'flask-round-bottom', color: '#2563EB', bg: '#EFF6FF' };
      default:
        return { name: 'bell-outline', color: '#64748B', bg: '#F8FAFC' };
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.headerIconBox}>
                <MaterialCommunityIcons name="bell-ring" size={20} color={BRAND_COLORS.primaryTeal} />
                {unreadCount > 0 && <View style={styles.headerBadgeDot} />}
              </View>
              <View>
                <Text style={styles.headerTitle}>Notifications & Alerts</Text>
                <Text style={styles.headerSubtitle}>
                  {unreadCount > 0 ? `${unreadCount} unread operational alerts` : 'All caught up'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close notifications">
              <MaterialCommunityIcons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Quick Push Notification Enable Strip */}
          <View style={styles.pushStatusCard}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <MaterialCommunityIcons
                  name={pushEnabled ? 'check-circle' : 'alert-circle'}
                  size={15}
                  color={pushEnabled ? '#15803D' : '#D97706'}
                />
                <Text style={styles.pushStatusTitle}>
                  {pushEnabled ? 'Mobile Push Alerts: ACTIVE' : 'Enable Mobile Push Alerts'}
                </Text>
              </View>
              <Text style={styles.pushStatusDesc}>
                {pushEnabled
                  ? 'Alerts will pop up on your mobile lock screen even when app is closed.'
                  : 'Get instant alerts when deliveries depart, arrive, or tanks run low.'}
              </Text>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={handleTogglePush}
              color={BRAND_COLORS.primaryTeal}
            />
          </View>

          {statusMessage ? (
            <View style={styles.statusMessageBox}>
              <MaterialCommunityIcons name="information-outline" size={16} color={BRAND_COLORS.primaryTeal} />
              <Text style={styles.statusMessageText}>{statusMessage}</Text>
            </View>
          ) : null}

          {/* Filter Pills & Actions Row */}
          <View style={styles.filterRow}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={[styles.filterPill, filter === 'all' && styles.filterPillActive]}
                onPress={() => setFilter('all')}
              >
                <Text style={[styles.filterPillText, filter === 'all' && styles.filterPillTextActive]}>
                  All ({notifications.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterPill, filter === 'unread' && styles.filterPillActive]}
                onPress={() => setFilter('unread')}
              >
                <Text style={[styles.filterPillText, filter === 'unread' && styles.filterPillTextActive]}>
                  Unread ({unreadCount})
                </Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              {unreadCount > 0 && (
                <TouchableOpacity onPress={handleMarkAllRead} style={styles.textActionBtn}>
                  <Text style={styles.textActionText}>Mark all read</Text>
                </TouchableOpacity>
              )}
              {notifications.length > 0 && (
                <TouchableOpacity onPress={handleClearAll} style={styles.textActionBtn}>
                  <Text style={[styles.textActionText, { color: '#94A3B8' }]}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Notifications Scroll List */}
          <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false}>
            {filteredItems.length === 0 ? (
              <View style={styles.emptyBox}>
                <MaterialCommunityIcons name="bell-sleep-outline" size={42} color="#94A3B8" />
                <Text style={styles.emptyTitle}>No Notifications</Text>
                <Text style={styles.emptySubtitle}>
                  You have no {filter === 'unread' ? 'unread ' : ''}operational alerts at this time.
                </Text>
              </View>
            ) : (
              filteredItems.map((item) => {
                const iconInfo = getCategoryIcon(item.category);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.notifItem, !item.read && styles.notifItemUnread]}
                    onPress={() => handleItemPress(item)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.itemIconBox, { backgroundColor: iconInfo.bg }]}>
                      <MaterialCommunityIcons name={iconInfo.name as any} size={20} color={iconInfo.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={[styles.itemTitle, !item.read && styles.itemTitleUnread]} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={styles.itemTime}>{item.timestamp}</Text>
                      </View>
                      <Text style={styles.itemBody} numberOfLines={2}>
                        {item.body}
                      </Text>
                    </View>
                    {!item.read && <View style={styles.unreadDot} />}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          {/* Footer with Test Button */}
          <View style={styles.footerRow}>
            <TouchableOpacity
              style={styles.testBtn}
              onPress={handleTestNow}
              disabled={sendingTest}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="send" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.testBtnText}>
                {sendingTest ? 'Sending...' : 'Send Test Notification'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0FDFA',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  headerBadgeDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#F97316',
    position: 'absolute',
    top: 6,
    right: 6,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pushStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  pushStatusTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  pushStatusDesc: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
    marginTop: 2,
  },
  statusMessageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDFA',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#99F6E4',
    marginBottom: 12,
  },
  statusMessageText: {
    fontSize: 12,
    color: '#0C6054',
    fontWeight: '600',
    flex: 1,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  filterPillActive: {
    backgroundColor: BRAND_COLORS.primaryTeal,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  textActionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  textActionText: {
    fontSize: 12,
    color: BRAND_COLORS.primaryTeal,
    fontWeight: '600',
  },
  listScroll: {
    maxHeight: 380,
    marginBottom: 16,
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 8,
    gap: 12,
  },
  notifItemUnread: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  itemIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
    marginRight: 6,
  },
  itemTitleUnread: {
    fontWeight: '800',
    color: '#0F172A',
  },
  itemTime: {
    fontSize: 10,
    color: '#94A3B8',
  },
  itemBody: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F97316',
  },
  emptyBox: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 24,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND_COLORS.primaryTeal,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    width: '100%',
  },
  testBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
