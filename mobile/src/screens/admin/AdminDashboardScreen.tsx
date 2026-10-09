import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, TouchableOpacity, Modal, RefreshControl } from 'react-native';
import { Text, Avatar, Button, Chip, Divider } from 'react-native-paper';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/useAuthStore';
import { fetchAdminNotifications, markNotificationsRead } from '../../api/client';

const StatCard = ({ title, value, icon, color, subtitle, onPress }: any) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.statCard}>
    <View style={[styles.iconContainer, { backgroundColor: color + '1A' }]}>
      <MaterialCommunityIcons name={icon} size={28} color={color} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statTitle}>{title}</Text>
    {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
  </TouchableOpacity>
);

export const AdminDashboardScreen = ({ navigation }: any) => {
  const user = useAuthStore(state => state.user);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = async () => {
    try {
      const data = await fetchAdminNotifications();
      if (Array.isArray(data)) {
        setNotifications(data);
      }
    } catch (e) {
      console.error('Failed to load notifications:', e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await markNotificationsRead();
      setNotifications(notifications.map(n => ({ ...n, read: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'PAYMENT': return { name: 'cash-check', color: '#15803D', bg: '#DCFCE7' };
      case 'TASK': return { name: 'clipboard-check', color: '#1D4ED8', bg: '#DBEAFE' };
      case 'LAB': return { name: 'flask', color: '#7E22CE', bg: '#F3E8FF' };
      case 'ORDER': return { name: 'cube-send', color: '#D97706', bg: '#FEF3C7' };
      default: return { name: 'bell-ring', color: '#2E5D36', bg: '#E8F5E9' };
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadNotifications(); }} tintColor="#2E5D36" />
        }
      >
        {/* Premium Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good Morning,</Text>
            <Text style={styles.title}>{user?.name || 'Super Administrator'}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {/* Notification Bell with Badge */}
            <TouchableOpacity onPress={() => setNotifModalVisible(true)} style={styles.bellBtn}>
              <MaterialCommunityIcons name="bell-outline" size={24} color="#0F172A" />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation?.navigate('AdminProfile')}>
              {user?.avatarUrl ? (
                <Avatar.Image size={48} source={{ uri: user.avatarUrl }} style={styles.avatar} />
              ) : (
                <Avatar.Text size={48} label={user?.name?.substring(0, 2) || 'A'} style={styles.avatar} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Stats Grid */}
        <View style={styles.gridContainer}>
          <View style={styles.gridColumn}>
            <StatCard 
              title="Total Revenue" 
              value="$42,500" 
              icon="cash-multiple" 
              color="#10B981" 
              subtitle="+14% this week"
              onPress={() => navigation?.navigate('AdminOrders')}
            />
            <StatCard 
              title="Active Ranches" 
              value="12" 
              icon="sprout" 
              color="#8B5CF6" 
              onPress={() => navigation?.navigate('AdminApprovals')}
            />
          </View>
          <View style={styles.gridColumn}>
            <StatCard 
              title="Orders & Invoices" 
              value="8" 
              icon="truck-fast" 
              color="#F59E0B" 
              subtitle="View Orders"
              onPress={() => navigation?.navigate('AdminOrders')}
            />
            <StatCard 
              title="Total Customers" 
              value="24" 
              icon="account-group" 
              color="#3B82F6" 
              subtitle="Manage Growers"
              onPress={() => navigation?.navigate('AdminCustomers')}
            />
          </View>
        </View>

        {/* Live Admin Notifications Activity Stream */}
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.sectionTitle}>Real-Time Activity & Alerts</Text>
            {unreadCount > 0 && (
              <Chip compact style={{ backgroundColor: '#DCFCE7' }} textStyle={{ color: '#15803D', fontWeight: 'bold', fontSize: 10 }}>
                {unreadCount} NEW
              </Chip>
            )}
          </View>
          <TouchableOpacity onPress={() => setNotifModalVisible(true)}>
            <Text style={styles.seeAll}>View All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.activityCard}>
          {notifications.length === 0 ? (
            <Text style={{ textAlign: 'center', color: '#64748B', paddingVertical: 16 }}>
              No recent notifications logged.
            </Text>
          ) : (
            notifications.slice(0, 4).map((notif, index) => {
              const iconCfg = getNotifIcon(notif.type);
              const isLast = index === Math.min(notifications.length - 1, 3);

              return (
                <View key={notif.id || index} style={[styles.activityRow, isLast && styles.noBorder]}>
                  <View style={[styles.activityIcon, { backgroundColor: iconCfg.bg }]}>
                    <MaterialCommunityIcons name={iconCfg.name as any} size={22} color={iconCfg.color} />
                  </View>
                  <View style={styles.activityText}>
                    <Text style={styles.activityTitle}>{notif.title}</Text>
                    <Text style={styles.activityDesc} numberOfLines={2}>{notif.message}</Text>
                  </View>
                  <Text style={styles.activityTime}>
                    {notif.timestamp ? new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Full Notifications Drawer / Modal */}
      <Modal visible={notifModalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>System Notifications</Text>
                <Text style={styles.modalSubtitle}>Payments, Task Completions, and Field Assays</Text>
              </View>
              <TouchableOpacity onPress={() => setNotifModalVisible(false)}>
                <MaterialCommunityIcons name="close-circle" size={28} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 13, color: '#64748B' }}>Total ({notifications.length})</Text>
              {unreadCount > 0 && (
                <Button mode="text" textColor="#2E5D36" onPress={handleMarkAllRead} compact>
                  Mark all as read
                </Button>
              )}
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {notifications.map((n, idx) => {
                const iconCfg = getNotifIcon(n.type);
                return (
                  <View key={n.id || idx} style={[styles.notifItem, !n.read && styles.notifItemUnread]}>
                    <View style={[styles.activityIcon, { backgroundColor: iconCfg.bg }]}>
                      <MaterialCommunityIcons name={iconCfg.name as any} size={22} color={iconCfg.color} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={{ fontWeight: 'bold', color: '#0F172A', fontSize: 14 }}>{n.title}</Text>
                      <Text style={{ color: '#475569', fontSize: 13, marginTop: 2 }}>{n.message}</Text>
                      <Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 4 }}>
                        {n.timestamp ? new Date(n.timestamp).toLocaleString() : 'Just now'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            <Button
              mode="contained"
              buttonColor="#2E5D36"
              onPress={() => setNotifModalVisible(false)}
              style={{ marginTop: 16, borderRadius: 10 }}
            >
              Close
            </Button>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 70,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  bellBtn: {
    padding: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#EF4444',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  avatar: {
    backgroundColor: '#2E5D36',
  },
  gridContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 16,
    marginBottom: 20,
  },
  gridColumn: {
    flex: 1,
    gap: 16,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  statSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  seeAll: {
    fontSize: 14,
    color: '#2E5D36',
    fontWeight: '600',
  },
  activityCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityText: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  activityDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#94A3B8',
    marginLeft: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  notifItem: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  notifItemUnread: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
});
