import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert, Platform } from 'react-native';
import { Text, Card, Chip, ActivityIndicator, Divider } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store/useAuthStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { fetchRanches, fetchDeliveries, fetchInvoices } from '../api/client';

export const HomeScreen = () => {
  const navigation = useNavigation<any>();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const customerName = user?.name || 'Sierra Agri Group';

  const handleSignOut = () => {
    if (Platform.OS === 'web') {
      logout();
    } else {
      Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: logout }
      ]);
    }
  };

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ranches, setRanches] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);

  const loadData = async () => {
    try {
      const [rData, dData, iData] = await Promise.all([
        fetchRanches().catch(() => []),
        fetchDeliveries().catch(() => []),
        fetchInvoices().catch(() => [])
      ]);

      if (Array.isArray(rData)) setRanches(rData);
      if (Array.isArray(dData)) setDeliveries(dData);
      if (Array.isArray(iData)) setInvoices(iData);
    } catch (e) {
      console.warn('Dashboard load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Compute total acreage strictly from ranches (each ranch's acreage is sum of its blocks)
  const totalComputedAcres = ranches.reduce((sum, r) => sum + (Number(r.ac) || 0), 0);
  const totalBlocksCount = ranches.reduce((sum, r) => sum + ((r.blocks && r.blocks.length) || 0), 0);

  const upcomingDeliveries = deliveries.filter(
    (d: any) => d.status === 'Scheduled' || d.status === 'Out for delivery'
  );

  const openInvoices = invoices.filter(
    (i: any) => i.status === 'Open' || i.status === 'Overdue'
  );

  const totalBalanceDue = openInvoices.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2E5D36" />
        }
      >
        {/* Customer Header - No entity switcher, shows customer name */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={styles.brandRow}>
              <View style={styles.brandBadge}>
                <MaterialCommunityIcons name="leaf" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.brandTitle}>ReNu-Biome</Text>
            </View>
            <TouchableOpacity 
              onPress={handleSignOut}
              style={styles.signOutHeaderBtn}
              accessibilityLabel="Sign out"
            >
              <MaterialCommunityIcons name="logout" size={16} color="#DC2626" />
              <Text style={styles.signOutHeaderText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.greetingSubtitle}>Grower Account</Text>
          <Text style={styles.customerNameTitle} numberOfLines={2}>
            {customerName}
          </Text>
        </View>

        {loading && !refreshing ? (
          <View style={styles.skeletonContainer}>
            <View style={styles.skeletonCard} />
            <View style={styles.skeletonCard} />
          </View>
        ) : (
          <>
            {/* Quick Stat Cards */}
            <View style={styles.statsGrid}>
              <TouchableOpacity
                style={styles.statCard}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('Ranches')}
              >
                <View style={[styles.statIconBox, { backgroundColor: '#E8F5E9' }]}>
                  <MaterialCommunityIcons name="sprout" size={24} color="#2E5D36" />
                </View>
                <Text style={styles.statValue}>
                  {totalComputedAcres > 0 ? `${totalComputedAcres.toLocaleString()} ac` : '0 ac'}
                </Text>
                <Text style={styles.statLabel}>Total Planted Acres</Text>
                <Text style={styles.statSub}>{ranches.length} Ranches · {totalBlocksCount} Blocks</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.statCard}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('Deliveries')}
              >
                <View style={[styles.statIconBox, { backgroundColor: '#EFF6FF' }]}>
                  <MaterialCommunityIcons name="truck-delivery-outline" size={24} color="#1D4ED8" />
                </View>
                <Text style={styles.statValue}>{upcomingDeliveries.length}</Text>
                <Text style={styles.statLabel}>Active Deliveries</Text>
                <Text style={styles.statSub}>
                  {upcomingDeliveries.length > 0 ? 'Scheduled & in transit' : 'No pending deliveries'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Invoices Alert Banner */}
            <TouchableOpacity
              style={styles.invoiceBanner}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Invoices')}
            >
              <View style={styles.bannerLeft}>
                <MaterialCommunityIcons name="receipt-text" size={26} color="#B45309" />
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.bannerTitle}>Open Invoices</Text>
                  <Text style={styles.bannerSubtitle}>
                    {openInvoices.length} outstanding invoice{openInvoices.length === 1 ? '' : 's'}
                  </Text>
                </View>
              </View>
              <View style={styles.bannerRight}>
                <Text style={styles.bannerAmount}>
                  ${totalBalanceDue.toLocaleString()}
                </Text>
                <Text style={styles.bannerStatus}>
                  {openInvoices.some(i => i.status === 'Overdue') ? 'Action Needed' : 'Current'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Upcoming Deliveries Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Delivery Schedule</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Deliveries')}>
                <Text style={styles.sectionLink}>View All ({deliveries.length})</Text>
              </TouchableOpacity>
            </View>

            {upcomingDeliveries.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Card.Content style={styles.emptyContent}>
                  <MaterialCommunityIcons name="calendar-check" size={36} color="#94A3B8" />
                  <Text style={styles.emptyTitle}>No Deliveries Scheduled</Text>
                  <Text style={styles.emptyDesc}>
                    Phone in your order to ReNu-Biome office to schedule your next tank refill.
                  </Text>
                </Card.Content>
              </Card>
            ) : (
              upcomingDeliveries.slice(0, 3).map((item: any) => {
                const isEnRoute = item.status === 'Out for delivery';
                const ranch = ranches.find(r => r.id === item.ranchId);

                return (
                  <TouchableOpacity
                    key={item.id || item.orderId}
                    style={styles.deliveryCard}
                    activeOpacity={0.85}
                    onPress={() => navigation.navigate('Deliveries')}
                  >
                    <View style={styles.deliveryCardHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <MaterialCommunityIcons
                          name={isEnRoute ? 'truck-fast' : 'clock-outline'}
                          size={20}
                          color={isEnRoute ? '#D97706' : '#2E5D36'}
                          style={{ marginRight: 8 }}
                        />
                        <Text style={styles.deliveryOrderNumber}>#{item.orderId}</Text>
                      </View>
                      <Chip
                        style={isEnRoute ? styles.enRouteChip : styles.scheduledChip}
                        textStyle={isEnRoute ? styles.enRouteChipText : styles.scheduledChipText}
                        compact
                      >
                        {item.status}
                      </Chip>
                    </View>

                    <View style={styles.deliveryCardBody}>
                      <Text style={styles.deliveryProduct}>{item.product}</Text>
                      <Text style={styles.deliveryQuantity}>{item.gallons} Gallons</Text>
                    </View>

                    <View style={styles.deliveryFooter}>
                      <Text style={styles.deliveryRanchText}>
                        <MaterialCommunityIcons name="map-marker-outline" size={14} color="#64748B" />{' '}
                        {ranch?.name || 'Ranch Tank'}
                      </Text>
                      <Text style={styles.deliveryDateText}>
                        {item.deliveryWindow || item.date}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}

            {/* Ranches Quick Overview */}
            <View style={[styles.sectionHeader, { marginTop: 24 }]}>
              <Text style={styles.sectionTitle}>Planted Ranches</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Ranches')}>
                <Text style={styles.sectionLink}>Manage Blocks</Text>
              </TouchableOpacity>
            </View>

            {ranches.map((r: any) => (
              <TouchableOpacity
                key={r.id}
                style={styles.ranchCard}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('Ranches')}
              >
                <View style={styles.ranchHeader}>
                  <View>
                    <Text style={styles.ranchName}>{r.name}</Text>
                    <Text style={styles.ranchCounty}>{r.county} County</Text>
                  </View>
                  <View style={styles.ranchAcreageBadge}>
                    <Text style={styles.ranchAcreageNum}>{r.ac || 0}</Text>
                    <Text style={styles.ranchAcreageLabel}>Acres</Text>
                  </View>
                </View>
                <Divider style={{ marginVertical: 10 }} />
                <View style={styles.ranchMetaRow}>
                  <Text style={styles.ranchMetaItem}>
                    {(r.blocks && r.blocks.length) || 0} Planted Blocks
                  </Text>
                  <Text style={styles.ranchMetaDot}>·</Text>
                  <Text style={styles.ranchMetaItem}>
                    {(r.tanks && r.tanks.length) || 0} Delivery Tanks
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 96,
  },
  header: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  brandBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#2E5D36',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  brandTitle: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  greetingSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
  },
  customerNameTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: -0.3,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 120,
  },
  statIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginTop: 2,
  },
  statSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  invoiceBanner: {
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#92400E',
  },
  bannerSubtitle: {
    fontSize: 12,
    color: '#B45309',
  },
  bannerRight: {
    alignItems: 'flex-end',
  },
  bannerAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#92400E',
  },
  bannerStatus: {
    fontSize: 11,
    color: '#B45309',
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2E5D36',
  },
  deliveryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  deliveryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  deliveryOrderNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  scheduledChip: {
    backgroundColor: '#E8F5E9',
  },
  scheduledChipText: {
    color: '#15803D',
    fontWeight: '700',
    fontSize: 11,
  },
  enRouteChip: {
    backgroundColor: '#FEF3C7',
  },
  enRouteChipText: {
    color: '#B45309',
    fontWeight: '700',
    fontSize: 11,
  },
  deliveryCardBody: {
    marginBottom: 10,
  },
  deliveryProduct: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  deliveryQuantity: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  deliveryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  deliveryRanchText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  deliveryDateText: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '600',
  },
  ranchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ranchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ranchName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  ranchCounty: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  ranchAcreageBadge: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  ranchAcreageNum: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2E5D36',
  },
  ranchAcreageLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  ranchMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ranchMetaItem: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  ranchMetaDot: {
    marginHorizontal: 8,
    color: '#94A3B8',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginTop: 10,
  },
  emptyDesc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 16,
  },
  skeletonContainer: {
    gap: 12,
  },
  skeletonCard: {
    height: 120,
    backgroundColor: '#E2E8F0',
    borderRadius: 16,
  },
  signOutHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  signOutHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
  },
});
