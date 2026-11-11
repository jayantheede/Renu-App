import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
  ImageBackground,
  Image,
  Linking,
} from 'react-native';
import { Text, Divider } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';
import { fetchRanches, fetchDeliveries, fetchInvoices, fetchGrowerDashboard } from '../api/client';
import { BRAND_COLORS } from '../theme/theme';
import { NotificationBellButton } from '../components/NotificationBellButton';
import { useResponsiveLayout } from '../utils/responsive';

const STAGES = ['Bloom', 'Soil blends', 'Potassium', 'Hull split', 'Post-harvest'];
const CURRENT_STAGE_IDX = 4; // Post-harvest

export const HomeScreen = () => {
  const { insets, safeHorizontalPadding, centeredContainerStyle, tabBarBottomClearance, isCompactHeight } =
    useResponsiveLayout();
  const navigation = useNavigation<any>();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ranches, setRanches] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [dashboardData, setDashboardData] = useState<any>(null);

  // Compute first name from user name (e.g. "Maria Lopez" -> "Maria")
  const rawName = user?.name || 'Maria Lopez';
  const firstName = rawName.trim().split(' ')[0] || 'Maria';
  const customerEntityName = (user as any)?.companyName || 'Sierra Orchards LLC';

  const handleSignOut = () => {
    if (Platform.OS === 'web') {
      logout();
    } else {
      Alert.alert('Sign Out', 'Are you sure you want to sign out of the ReNu-Biome Grower Portal?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: logout },
      ]);
    }
  };

  const loadData = useCallback(async () => {
    try {
      const [rData, dData, iData, dash] = await Promise.all([
        fetchRanches().catch(() => []),
        fetchDeliveries().catch(() => []),
        fetchInvoices().catch(() => []),
        fetchGrowerDashboard().catch(() => null),
      ]);

      if (Array.isArray(rData)) setRanches(rData);
      if (Array.isArray(dData)) setDeliveries(dData);
      if (Array.isArray(iData)) setInvoices(iData);
      if (dash) setDashboardData(dash);
    } catch (e) {
      console.warn('HomeScreen data load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Find next delivery
  const upcomingDeliveries = deliveries
    .filter((d: any) => d.status === 'Scheduled' || d.status === 'Out for delivery')
    .sort((a: any, b: any) => (a.status === 'Out for delivery' ? -1 : 1));
  const nextDelivery = upcomingDeliveries[0] || null;

  // Compute open invoices and balance due
  const openInvoices = invoices.filter(
    (i: any) => i.status === 'Open' || i.status === 'Overdue' || i.status === 'open' || i.status === 'overdue'
  );
  const balanceDue = openInvoices.reduce((sum: number, i: any) => sum + (Number(i.amount) || 0), 0);
  const hasOverdue = openInvoices.some(
    (i: any) => i.status === 'Overdue' || i.status === 'overdue'
  );

  const formattedDate = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarBottomClearance }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={BRAND_COLORS.primaryTeal}
          />
        }
      >
        {/* ================= 1. EDGE-TO-EDGE PHOTO HEADER ================= */}
        <View style={styles.headerWrapper}>
          <ImageBackground
            source={require('../assets/brand/bloom-photo-STOCK-NOT-LICENSED-replace-before-launch.jpg')}
            style={[styles.headerBackground, isCompactHeight && { minHeight: 168 }]}
            resizeMode="cover"
          >
            <LinearGradient
              colors={['rgba(8, 63, 56, 0.92)', 'rgba(12, 96, 84, 0.84)']}
              style={[
                styles.headerGradient,
                safeHorizontalPadding,
                { paddingTop: Math.max(isCompactHeight ? 16 : 32, insets.top + 12) },
              ]}
            >
              <View style={centeredContainerStyle}>
              {/* Top Navigation Row: Logo + Sign Out */}
              <View style={styles.headerTopRow}>
                <Image
                  source={require('../assets/brand/renu-biome-logo-white-orange-for-dark-backgrounds.png')}
                  style={styles.headerLogo}
                  resizeMode="contain"
                />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <NotificationBellButton color="#FFFFFF" />
                  <TouchableOpacity
                    onPress={handleSignOut}
                    style={styles.signOutBtn}
                    accessibilityLabel="Sign out"
                  >
                    <MaterialCommunityIcons name="logout" size={16} color="#FFFFFF" />
                    <Text style={styles.signOutBtnText}>Sign Out</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Greeting & Entity Name */}
              <View style={styles.greetingContainer}>
                <Text style={styles.greetingTitle}>
                  {getGreeting()}, {firstName}
                </Text>
                <Text style={styles.customerEntityText}>{customerEntityName}</Text>

                {/* Single Frosted Stage Chip with Orange Dot (No Weather Chip) */}
                <View style={styles.stageChip}>
                  <View style={styles.orangeDot} />
                  <Text style={styles.stageChipText}>Post-harvest, almond</Text>
                </View>
              </View>
              </View>
            </LinearGradient>
          </ImageBackground>
        </View>

        {/* Container for Overlapping Content */}
        <View style={[styles.bodyWrapper, safeHorizontalPadding, centeredContainerStyle]}>
          {/* ================= 2. SEASON CARD (Overlapping Header) ================= */}
          <View style={styles.seasonCard}>
            <View style={styles.seasonTitleRow}>
              <Text style={styles.seasonTitle}>Season 2026, almond</Text>
              <Text style={styles.seasonDate}>{formattedDate}</Text>
            </View>

            {/* 5-Segment Stage Strip */}
            <View style={styles.stageStripContainer}>
              {STAGES.map((s, i) => {
                const isPast = i < CURRENT_STAGE_IDX;
                const isCurrent = i === CURRENT_STAGE_IDX;
                return (
                  <View key={s} style={styles.stageSegmentWrap}>
                    <View
                      style={[
                        styles.stageBar,
                        isPast && styles.stageBarPast,
                        isCurrent && styles.stageBarCurrent,
                      ]}
                    />
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.stageBarLabel,
                        isCurrent && styles.stageBarLabelCurrent,
                      ]}
                    >
                      {s}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Status Line */}
            <Text style={styles.seasonStatusText}>
              Post-harvest stage, almond. Deliveries and invoices below.
            </Text>
          </View>

          {/* ================= 3. THIS WEEK SECTION ================= */}
          <Text style={styles.sectionHeader}>THIS WEEK</Text>
          <View style={styles.cardList}>
            {/* Next Delivery Row */}
            {nextDelivery ? (
              <TouchableOpacity
                style={styles.deliveryRow}
                onPress={() => navigation.navigate('Deliveries')}
                activeOpacity={0.7}
              >
                <View style={styles.rowLead}>
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor:
                          nextDelivery.status === 'Out for delivery' ? '#F07E42' : '#0C6054',
                      },
                    ]}
                  />
                  <View style={styles.rowTextContainer}>
                    <Text style={styles.rowMainTitle}>
                      {nextDelivery.status === 'Out for delivery' ? 'Arriving today: ' : 'Next delivery, ' + (nextDelivery.date || 'Sep 14') + ': '}
                      <Text style={{ fontWeight: '800' }}>
                        {(nextDelivery.gallons || 3770).toLocaleString()} gal {nextDelivery.productName || nextDelivery.product || 'Almond Post-Harvest'}
                      </Text>
                    </Text>
                    <Text style={styles.rowSubTitle}>
                      {nextDelivery.ranchName || 'Sierra Foothills Ranch'}, {nextDelivery.tankName || nextDelivery.tank || 'Tank 1'}
                      {nextDelivery.deliveryWindow ? ` · ${nextDelivery.deliveryWindow}` : ''}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </TouchableOpacity>
            ) : (
              <View style={styles.deliveryRowEmpty}>
                <View style={styles.rowTextContainer}>
                  <Text style={styles.emptyTitle}>No deliveries scheduled</Text>
                  <Text style={styles.emptySub}>Contact ReNu-Biome office to arrange one</Text>
                </View>
              </View>
            )}

            <Divider style={styles.rowDivider} />

            {/* Balance Due Row */}
            <TouchableOpacity
              style={styles.balanceRow}
              onPress={() => navigation.navigate('Invoices')}
              activeOpacity={0.7}
            >
              <View style={styles.rowLead}>
                <View style={styles.balanceIconWrap}>
                  <MaterialCommunityIcons name="receipt-outline" size={20} color="#0C6054" />
                </View>
                <View style={styles.rowTextContainer}>
                  <Text style={styles.rowMainTitle}>Balance due</Text>
                  <Text style={styles.rowSubTitle}>
                    {openInvoices.length} open {openInvoices.length === 1 ? 'invoice' : 'invoices'}
                    {hasOverdue ? ', 1 overdue' : ''}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.balanceAmountText}>
                  ${balanceDue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </Text>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </View>
            </TouchableOpacity>
          </View>

          {/* ================= 4. PLANTED RANCHES ================= */}
          <Text style={styles.sectionHeader}>PLANTED RANCHES</Text>
          <View style={styles.cardList}>
            {ranches.map((r, idx) => {
              const blockCount = (r.blocks && r.blocks.length) || 0;
              const tankCount = (r.tanks && r.tanks.length) || (r.tankSetups && r.tankSetups.length) || 1;
              const acres = r.ac || (r.blocks && r.blocks.reduce((s: number, b: any) => s + (Number(b.acreage) || 0), 0)) || 0;

              return (
                <React.Fragment key={r.id || idx}>
                  <TouchableOpacity
                    style={styles.ranchItemRow}
                    onPress={() => navigation.navigate('Ranches')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.rowLead}>
                      <View style={styles.ranchIconWrap}>
                        <MaterialCommunityIcons name="sprout" size={20} color="#0C6054" />
                      </View>
                      <View style={styles.rowTextContainer}>
                        <Text style={styles.rowMainTitle}>{r.name}</Text>
                        <Text style={styles.rowSubTitle}>
                          {r.county || 'Central Valley'} · {acres.toLocaleString()} ac · {blockCount} blocks, {tankCount} {tankCount === 1 ? 'tank' : 'tanks'}
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                  {idx < ranches.length - 1 && <Divider style={styles.rowDivider} />}
                </React.Fragment>
              );
            })}
          </View>

          {/* ================= 5. QUICK ACTIONS ================= */}
          <Text style={styles.sectionHeader}>QUICK ACTIONS</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.actionPillBtn}
              onPress={() =>
                Linking.openURL(
                  'mailto:support@renu-biome.com?subject=ReNu-Biome%20Support%20Request'
                ).catch(() => {})
              }
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="email-outline" size={18} color="#0C6054" />
              <Text style={styles.actionPillText}>Email ReNu-Biome</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionPillBtn}
              onPress={() => navigation.navigate('Deliveries')}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="truck-delivery-outline" size={18} color="#0C6054" />
              <Text style={styles.actionPillText}>Deliveries</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    paddingBottom: 160,
  },
  headerWrapper: {
    width: '100%',
    overflow: 'hidden',
  },
  headerBackground: {
    width: '100%',
    minHeight: 210,
  },
  headerGradient: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 42,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLogo: {
    width: 140,
    height: 38,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  signOutBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  greetingContainer: {
    marginTop: 4,
  },
  greetingTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.02,
  },
  customerEntityText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.88)',
    fontWeight: '500',
    marginTop: 2,
  },
  stageChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.20)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  orangeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#F07E42',
  },
  stageChipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  bodyWrapper: {
    paddingHorizontal: 16,
    marginTop: -28,
  },
  seasonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 20,
  },
  seasonTitleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  seasonTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  seasonDate: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  stageStripContainer: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  stageSegmentWrap: {
    flex: 1,
    alignItems: 'center',
  },
  stageBar: {
    height: 5,
    width: '100%',
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
    marginBottom: 5,
  },
  stageBarPast: {
    backgroundColor: '#99D5C9',
  },
  stageBarCurrent: {
    backgroundColor: '#0C6054',
  },
  stageBarLabel: {
    fontSize: 9.5,
    color: '#94A3B8',
    fontWeight: '600',
    textAlign: 'center',
  },
  stageBarLabelCurrent: {
    color: '#0C6054',
    fontWeight: '800',
  },
  seasonStatusText: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 18,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 4,
  },
  cardList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 20,
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  deliveryRowEmpty: {
    padding: 14,
  },
  rowLead: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  rowTextContainer: {
    flex: 1,
  },
  rowMainTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#1E293B',
  },
  rowSubTitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  emptyTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#64748B',
  },
  emptySub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  balanceIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F0FDFA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  balanceAmountText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  ranchItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  ranchIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F0FDFA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  rowDivider: {
    backgroundColor: '#F1F5F9',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  actionPillBtn: {
    flex: 1,
    minWidth: 140,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: 'rgba(12, 96, 84, 0.20)',
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 10,
    minHeight: 48,
  },
  actionPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0C6054',
  },
});
