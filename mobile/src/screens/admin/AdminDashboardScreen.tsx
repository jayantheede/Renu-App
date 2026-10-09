import React from 'react';
import { View, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { Text, Avatar } from 'react-native-paper';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

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

import { useAuthStore } from '../../store/useAuthStore';

export const AdminDashboardScreen = ({ navigation }: any) => {
  const user = useAuthStore(state => state.user);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      
      {/* Premium Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good Morning,</Text>
          <Text style={styles.title}>{user?.name || 'Admin Portal'}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation?.navigate('AdminProfile')}>
          {user?.avatarUrl ? (
            <Avatar.Image size={50} source={{ uri: user.avatarUrl }} style={styles.avatar} />
          ) : (
            <Avatar.Text size={50} label={user?.name?.substring(0, 2) || 'A'} style={styles.avatar} />
          )}
        </TouchableOpacity>
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
            title="Pending Orders" 
            value="8" 
            icon="truck-fast" 
            color="#F59E0B" 
            subtitle="Needs action"
            onPress={() => navigation?.navigate('AdminOrders')}
          />
          <StatCard 
            title="Total Users" 
            value="24" 
            icon="account-group" 
            color="#3B82F6" 
            subtitle="View Customers"
            onPress={() => navigation?.navigate('AdminCustomers')}
          />
        </View>
      </View>

      {/* Recent Activity Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <TouchableOpacity>
          <Text style={styles.seeAll}>See All</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.activityCard}>
        <View style={styles.activityRow}>
          <View style={[styles.activityIcon, { backgroundColor: '#F3F4F6' }]}>
            <Ionicons name="cube-outline" size={20} color="#4B5563" />
          </View>
          <View style={styles.activityText}>
            <Text style={styles.activityTitle}>New Order Placed</Text>
            <Text style={styles.activityDesc}>Order #ORD-1099 for $1,240</Text>
          </View>
          <Text style={styles.activityTime}>2m ago</Text>
        </View>
        <View style={[styles.activityRow, styles.noBorder]}>
          <View style={[styles.activityIcon, { backgroundColor: '#F3F4F6' }]}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#4B5563" />
          </View>
          <View style={styles.activityText}>
            <Text style={styles.activityTitle}>Ranch Approved</Text>
            <Text style={styles.activityDesc}>Valley Farms was approved</Text>
          </View>
          <Text style={styles.activityTime}>1h ago</Text>
        </View>
      </View>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 24,
  },
  greeting: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },
  avatar: {
    borderWidth: 2,
    borderColor: '#F3F4F6',
  },
  gridContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 16,
  },
  gridColumn: {
    flex: 1,
    gap: 16,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  statSubtitle: {
    fontSize: 12,
    color: '#10B981',
    marginTop: 8,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: 32,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  seeAll: {
    fontSize: 14,
    color: '#2E5D36',
    fontWeight: '600',
  },
  activityCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  activityText: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  activityDesc: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#9CA3AF',
  }
});
