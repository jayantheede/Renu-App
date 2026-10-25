import React, { useState, useEffect } from 'react';
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
  Modal,
  Linking,
} from 'react-native';
import { Text, Card, Chip, Divider, Button, ProgressBar } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';
import { fetchRanches, fetchDeliveries, fetchInvoices, fetchPrograms } from '../api/client';
import { BRAND_COLORS } from '../theme/theme';

export const HomeScreen = () => {
  const navigation = useNavigation<any>();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const customerName = user?.name || 'Sierra Agri Group';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ranches, setRanches] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [supportModalVisible, setSupportModalVisible] = useState(false);

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

  const loadData = async () => {
    try {
      const [rData, dData, iData, pData] = await Promise.all([
        fetchRanches().catch(() => []),
        fetchDeliveries().catch(() => []),
        fetchInvoices().catch(() => []),
        fetchPrograms().catch(() => []),
      ]);

      if (Array.isArray(rData)) setRanches(rData);
      if (Array.isArray(dData)) setDeliveries(dData);
      if (Array.isArray(iData)) setInvoices(iData);
      if (Array.isArray(pData)) setPrograms(pData);
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

  // Compute total acreage strictly from ranches (each ranch acreage is sum of blocks)
  const totalComputedAcres = ranches.reduce((sum, r) => sum + (Number(r.ac) || 0), 0);
  const totalBlocksCount = ranches.reduce((sum, r) => sum + ((r.blocks && r.blocks.length) || 0), 0);

  // Deliveries sorting: upcoming first
  const upcomingDeliveries = deliveries.filter(
    (d: any) => d.status === 'Scheduled' || d.status === 'Out for delivery'
  );

  const openInvoices = invoices.filter(
    (i: any) => i.status === 'Open' || i.status === 'Overdue'
  );
  const totalBalanceDue = openInvoices.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

  // Check all tanks across ranches for Otodata telemetry & low tank alert (< 25%)
  const allTanks: any[] = [];
  ranches.forEach((r) => {
    if (Array.isArray(r.tanks)) {
      r.tanks.forEach((t: any) => {
        allTanks.push({
          ...t,
          ranchName: r.name,
          ranchId: r.id,
        });
      });
    }
  });

  const lowTanks = allTanks.filter((t) => typeof t.levelPercent === 'number' && t.levelPercent < 25);

  // Active nutrition program
  const activeProgram = programs.find((p: any) => p.status === 'active') || programs[0];

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={BRAND_COLORS.primaryTeal}
          />
        }
      >
        {/* Edge-to-Edge Photo Header with Brand Overlay */}
        <View style={styles.headerWrapper}>
          <ImageBackground
            source={require('../../assets/brand/bloom-photo-STOCK-NOT-LICENSED-replace-before-launch.jpg')}
            style={styles.headerBackground}
            resizeMode="cover"
          >
            <LinearGradient
              colors={['rgba(8, 63, 56, 0.94)', 'rgba(12, 96, 84, 0.88)']}
              style={styles.headerGradient}
            >
              {/* Top Navigation Row */}
              <View style={styles.headerTopRow}>
                <Image
                  source={require('../../assets/brand/renu-biome-logo-white-orange-for-dark-backgrounds.png')}
                  style={styles.headerLogo}
                  resizeMode="contain"
                />
                <TouchableOpacity
                  onPress={handleSignOut}
                  style={styles.signOutBtn}
                  accessibilityLabel="Sign out"
                >
                  <MaterialCommunityIcons name="logout" size={16} color="#FFFFFF" />
                  <Text style={styles.signOutBtnText}>Sign Out</Text>
                </TouchableOpacity>
              </View>

              {/* Tagline */}
              <View style={styles.taglineRow}>
                <Text style={styles.taglineText}>Farmer's Pride</Text>
                <View style={styles.stagePill}>
                  <View style={styles.orangeDot} />
                  <Text style={styles.stagePillText}>Bloom Stage</Text>
                </View>
              </View>

              {/* Customer Greeting */}
              <Text style={styles.greetingTitle}>{customerName}</Text>

              {/* Weather & Location Strip */}
              <View style={styles.weatherStrip}>
                <MaterialCommunityIcons name="white-balance-sunny" size={16} color="#FDE047" />
                <Text style={styles.weatherText}>72°F Sunny · Central Valley, California</Text>
              </View>
            </LinearGradient>
          </ImageBackground>
        </View>

        {/* 4 Quick Actions Grid */}
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Ranches', { openSampleModal: true })}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#F0FDFA' }]}>
              <MaterialCommunityIcons name="flask-outline" size={22} color={BRAND_COLORS.primaryTeal} />
            </View>
            <Text style={styles.actionLabel}>Send Lab Results</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Deliveries')}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#FFF7ED' }]}>
              <MaterialCommunityIcons name="truck-delivery-outline" size={22} color={BRAND_COLORS.accentOrange} />
            </View>
            <Text style={styles.actionLabel}>View Deliveries</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Invoices')}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#EFF6FF' }]}>
              <MaterialCommunityIcons name="receipt-text-outline" size={22} color="#2563EB" />
            </View>
            <Text style={styles.actionLabel}>View Invoices</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            activeOpacity={0.8}
            onPress={() => setSupportModalVisible(true)}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#ECFDF5' }]}>
              <MaterialCommunityIcons name="headset" size={22} color="#059669" />
            </View>
            <Text style={styles.actionLabel}>Contact Support</Text>
          </TouchableOpacity>
        </View>

        {/* Otodata Low Tank Alert (Threshold < 25%) */}
        {lowTanks.length > 0 && (
          <View style={styles.tankAlertCard}>
            <View style={styles.tankAlertHeader}>
              <MaterialCommunityIcons name="alert-circle" size={22} color="#DC2626" />
              <Text style={styles.tankAlertTitle}>Low Tank Telemetry Alert</Text>
            </View>
            {lowTanks.map((tank) => (
              <View key={tank.id} style={styles.tankAlertItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tankAlertName}>
                    {tank.name} · {tank.ranchName}
                  </Text>
                  <Text style={styles.tankAlertDetails}>
                    Level: <Text style={{ fontWeight: '700', color: '#DC2626' }}>{tank.levelPercent}%</Text> ({tank.currentGallons} of {tank.capacityGallons} gal)
                  </Text>
                  <Text style={styles.tankAlertSub}>
                    Est. {tank.daysToEmpty || 14} days to empty based on 14-day average usage ({tank.usageRate14d || 320} gal/wk)
                  </Text>
                </View>
                <Button
                  mode="contained"
                  buttonColor={BRAND_COLORS.accentOrange}
                  textColor="#FFFFFF"
                  style={{ borderRadius: 8 }}
                  onPress={() => {
                    Alert.alert(
                      'Request Refill',
                      `To schedule a refill for ${tank.name} (${tank.ranchName}), call ReNu-Biome dispatch at (559) 555-0199 or email dispatch@renu-biome.com.`,
                      [
                        { text: 'Close', style: 'cancel' },
                        {
                          text: 'Call Dispatch',
                          onPress: () => Linking.openURL('tel:5595550199').catch(() => {}),
                        },
                      ]
                    );
                  }}
                >
                  Refill
                </Button>
              </View>
            ))}
          </View>
        )}

        {/* Active Nutrition Program Progress Card */}
        {activeProgram && (
          <TouchableOpacity
            style={styles.programCard}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('Ranches')}
          >
            <View style={styles.programHeaderRow}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <MaterialCommunityIcons name="leaf-circle-outline" size={18} color={BRAND_COLORS.primaryTeal} />
                  <Text style={styles.programBadge}>ANNUAL NUTRITION PROGRAM</Text>
                </View>
                <Text style={styles.programTitle}>{activeProgram.name || '2027 Almond Nutrition Program'}</Text>
                <Text style={styles.programCrop}>
                  Crop: {activeProgram.crop || 'Almonds'} · {totalComputedAcres.toLocaleString()} Total Planted Acres
                </Text>
              </View>
              <Chip style={styles.activeChip} textStyle={styles.activeChipText} compact>
                Active
              </Chip>
            </View>

            <Divider style={{ marginVertical: 12 }} />

            <View style={styles.progressSection}>
              <View style={styles.progressRow}>
                <Text style={styles.progressLabel}>Season Deliveries Progress</Text>
                <Text style={styles.progressPercent}>
                  {Math.round(
                    ((activeProgram.deliveredGallons || 4800) / (activeProgram.plannedGallons || 28000)) * 100
                  )}%
                </Text>
              </View>
              <ProgressBar
                progress={
                  (activeProgram.deliveredGallons || 4800) / (activeProgram.plannedGallons || 28000)
                }
                color={BRAND_COLORS.primaryTeal}
                style={styles.progressBar}
              />
              <View style={styles.progressMetaRow}>
                <Text style={styles.progressMeta}>
                  {(activeProgram.deliveredGallons || 4800).toLocaleString()} / {(activeProgram.plannedGallons || 28000).toLocaleString()} Gallons
                </Text>
                <Text style={styles.progressMeta}>
                  Units Applied: 12.4 lb N/ac · 8.6 lb K2O/ac
                </Text>
              </View>
            </View>

            <View style={styles.programFooterRow}>
              <Text style={styles.programLink}>View Ranches & Stage Windows →</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Quick Stat Cards */}
        <View style={styles.statsGrid}>
          <TouchableOpacity
            style={styles.statCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Ranches')}
          >
            <View style={[styles.statIconBox, { backgroundColor: '#F0FDFA' }]}>
              <MaterialCommunityIcons name="sprout" size={24} color={BRAND_COLORS.primaryTeal} />
            </View>
            <Text style={styles.statValue}>
              {totalComputedAcres > 0 ? `${totalComputedAcres.toLocaleString()} ac` : '1,400 ac'}
            </Text>
            <Text style={styles.statLabel}>Planted Acres</Text>
            <Text style={styles.statSub}>
              {ranches.length || 2} Ranches · {totalBlocksCount || 9} Blocks
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Deliveries')}
          >
            <View style={[styles.statIconBox, { backgroundColor: '#FFF7ED' }]}>
              <MaterialCommunityIcons name="truck-delivery-outline" size={24} color={BRAND_COLORS.accentOrange} />
            </View>
            <Text style={styles.statValue}>{upcomingDeliveries.length || 2}</Text>
            <Text style={styles.statLabel}>Active Deliveries</Text>
            <Text style={styles.statSub}>
              {upcomingDeliveries.some((d: any) => d.status === 'Out for delivery')
                ? 'Driver en route with ETA'
                : 'Scheduled on calendar'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Invoices Balance Alert Card */}
        <TouchableOpacity
          style={styles.invoiceBanner}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Invoices')}
        >
          <View style={styles.bannerLeft}>
            <MaterialCommunityIcons name="receipt-text" size={28} color={BRAND_COLORS.accentOrange} />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.bannerTitle}>Account Invoices</Text>
              <Text style={styles.bannerSubtitle}>
                {openInvoices.length} outstanding invoice{openInvoices.length === 1 ? '' : 's'}
              </Text>
            </View>
          </View>
          <View style={styles.bannerRight}>
            <Text style={styles.bannerAmount}>
              ${totalBalanceDue > 0 ? totalBalanceDue.toLocaleString() : '28,400'}
            </Text>
            <Text style={styles.bannerStatus}>
              {openInvoices.some((i: any) => i.status === 'Overdue') ? 'Payment Due' : 'Current'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Upcoming Deliveries Schedule Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Delivery Operations</Text>
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
                Contact ReNu-Biome office to schedule your next tank refill.
              </Text>
            </Card.Content>
          </Card>
        ) : (
          upcomingDeliveries.slice(0, 3).map((item: any) => {
            const isEnRoute = item.status === 'Out for delivery';

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
                      color={isEnRoute ? BRAND_COLORS.accentOrange : BRAND_COLORS.primaryTeal}
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
                  <Text style={styles.deliveryQuantity}>{item.gallons?.toLocaleString()} Gallons</Text>
                </View>

                {isEnRoute && item.optimoroute && (
                  <View style={styles.optimoRouteBanner}>
                    <MaterialCommunityIcons name="navigation-variant" size={16} color="#0369A1" />
                    <Text style={styles.optimoRouteText}>
                      Driver: <Text style={{ fontWeight: '700' }}>{item.optimoroute.driverName || 'Dave Miller'}</Text> · Live ETA: <Text style={{ fontWeight: '700' }}>{item.optimoroute.eta || '2:15 PM'}</Text>
                    </Text>
                  </View>
                )}

                <View style={styles.deliveryFooter}>
                  <Text style={styles.deliveryRanchText}>
                    <MaterialCommunityIcons name="map-marker-outline" size={14} color="#64748B" />{' '}
                    {item.ranchName || 'Sierra Foothills Ranch'} · {item.tankName || 'Tank T-101'}
                  </Text>
                  <Text style={styles.deliveryDateText}>
                    {item.deliveryWindow || item.date}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* Planted Ranches Section */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>Planted Ranches</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Ranches')}>
            <Text style={styles.sectionLink}>View All Ranches</Text>
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
                <Text style={styles.ranchCounty}>{r.county} County, CA</Text>
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
                {(r.tanks && r.tanks.length) || 0} Otodata Monitored Tanks
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Contact Support Modal */}
      <Modal
        visible={supportModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSupportModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <MaterialCommunityIcons name="headset" size={24} color={BRAND_COLORS.primaryTeal} />
              <Text style={styles.modalTitle}>ReNu-Biome Support</Text>
            </View>
            <Text style={styles.modalSubtitle}>
              Our agronomy and operations teams are ready to assist with orders, tank refills, lab assays, and custom recommendations.
            </Text>

            <TouchableOpacity
              style={styles.contactItem}
              onPress={() => Linking.openURL('tel:5595550199').catch(() => {})}
            >
              <MaterialCommunityIcons name="phone" size={20} color={BRAND_COLORS.primaryTeal} />
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.contactLabel}>Operations & Dispatch Phone</Text>
                <Text style={styles.contactValue}>(559) 555-0199</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.contactItem}
              onPress={() => Linking.openURL('mailto:support@renu-biome.com').catch(() => {})}
            >
              <MaterialCommunityIcons name="email-outline" size={20} color={BRAND_COLORS.primaryTeal} />
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.contactLabel}>Grower Support Email</Text>
                <Text style={styles.contactValue}>support@renu-biome.com</Text>
              </View>
            </TouchableOpacity>

            <Button
              mode="contained"
              buttonColor={BRAND_COLORS.primaryTeal}
              onPress={() => setSupportModalVisible(false)}
              style={{ marginTop: 20, borderRadius: 8 }}
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
    paddingBottom: 96,
  },
  headerWrapper: {
    width: '100%',
    overflow: 'hidden',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  headerBackground: {
    width: '100%',
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingTop: 36,
    paddingBottom: 24,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLogo: {
    width: 170,
    height: 48,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  signOutBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  taglineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  taglineText: {
    color: '#E0EDE9',
    fontStyle: 'italic',
    fontSize: 14,
  },
  stagePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  orangeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BRAND_COLORS.accentOrange,
  },
  stagePillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  greetingTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 6,
  },
  weatherStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  weatherText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    fontWeight: '500',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 6,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  actionIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'center',
  },
  tankAlertCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  tankAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  tankAlertTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#B91C1C',
  },
  tankAlertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  tankAlertName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  tankAlertDetails: {
    fontSize: 13,
    color: '#475569',
    marginTop: 2,
  },
  tankAlertSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  programCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  programHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  programBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: BRAND_COLORS.primaryTeal,
    letterSpacing: 1,
  },
  programTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  programCrop: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  activeChip: {
    backgroundColor: '#F0FDFA',
    borderColor: '#99F6E4',
    borderWidth: 1,
  },
  activeChipText: {
    color: BRAND_COLORS.primaryTeal,
    fontSize: 11,
    fontWeight: '700',
  },
  progressSection: {
    marginTop: 2,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  progressPercent: {
    fontSize: 13,
    fontWeight: '700',
    color: BRAND_COLORS.primaryTeal,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
    marginBottom: 6,
  },
  progressMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressMeta: {
    fontSize: 11,
    color: '#64748B',
  },
  programFooterRow: {
    marginTop: 12,
    alignItems: 'flex-end',
  },
  programLink: {
    fontSize: 12,
    fontWeight: '600',
    color: BRAND_COLORS.primaryTeal,
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  statSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
  invoiceBanner: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  bannerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  bannerRight: {
    alignItems: 'flex-end',
  },
  bannerAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  bannerStatus: {
    fontSize: 11,
    fontWeight: '600',
    color: BRAND_COLORS.accentOrange,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: '600',
    color: BRAND_COLORS.primaryTeal,
  },
  deliveryCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  deliveryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  deliveryOrderNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  scheduledChip: {
    backgroundColor: '#F0FDFA',
    borderColor: '#99F6E4',
    borderWidth: 1,
  },
  scheduledChipText: {
    color: BRAND_COLORS.primaryTeal,
    fontSize: 11,
    fontWeight: '600',
  },
  enRouteChip: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
    borderWidth: 1,
  },
  enRouteChipText: {
    color: BRAND_COLORS.accentOrange,
    fontSize: 11,
    fontWeight: '700',
  },
  deliveryCardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  deliveryProduct: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
    marginRight: 8,
  },
  deliveryQuantity: {
    fontSize: 14,
    fontWeight: '700',
    color: BRAND_COLORS.primaryTeal,
  },
  optimoRouteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  optimoRouteText: {
    fontSize: 12,
    color: '#0369A1',
  },
  deliveryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  deliveryRanchText: {
    fontSize: 12,
    color: '#64748B',
  },
  deliveryDateText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  emptyCard: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginTop: 8,
  },
  emptyDesc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 260,
  },
  ranchCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ranchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ranchName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  ranchCounty: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  ranchAcreageBadge: {
    alignItems: 'flex-end',
  },
  ranchAcreageNum: {
    fontSize: 16,
    fontWeight: '800',
    color: BRAND_COLORS.primaryTeal,
  },
  ranchAcreageLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  ranchMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ranchMetaItem: {
    fontSize: 12,
    color: '#64748B',
  },
  ranchMetaDot: {
    marginHorizontal: 8,
    color: '#94A3B8',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 18,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  contactLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  contactValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
});
