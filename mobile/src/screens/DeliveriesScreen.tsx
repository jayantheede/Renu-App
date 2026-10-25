import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  RefreshControl,
  Linking,
} from 'react-native';
import { Text, Chip, Divider, ActivityIndicator, Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { fetchDeliveries, fetchRanches } from '../api/client';
import { BRAND_COLORS } from '../theme/theme';

export const DeliveriesScreen = () => {
  const navigation = useNavigation<any>();

  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [ranches, setRanches] = useState<any[]>([]);
  const [selectedRanchFilter, setSelectedRanchFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Delivery Detail Modal
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const loadData = async () => {
    try {
      const [dData, rData] = await Promise.all([
        fetchDeliveries().catch(() => []),
        fetchRanches().catch(() => []),
      ]);
      if (Array.isArray(dData)) setDeliveries(dData);
      if (Array.isArray(rData)) setRanches(rData);
    } catch (e) {
      console.warn('Deliveries fetch error:', e);
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

  // Filter deliveries by selected ranch
  const filteredDeliveries = deliveries.filter((d) => {
    if (selectedRanchFilter === 'ALL') return true;
    return d.ranchId === selectedRanchFilter;
  });

  const upcomingDeliveries = filteredDeliveries.filter(
    (d) => d.status === 'Scheduled' || d.status === 'Out for delivery'
  );

  const pastDeliveries = filteredDeliveries.filter(
    (d) => d.status === 'Delivered' || d.status === 'Cancelled'
  );

  const openDetail = (delivery: any) => {
    setSelectedDelivery(delivery);
    setDetailModalVisible(true);
  };

  const getRanchName = (item: any) => {
    if (item.ranchName) return item.ranchName;
    const ranch = ranches.find((r) => r.id === item.ranchId);
    return ranch?.name || 'Sierra Foothills Ranch';
  };

  const getStatusChipStyle = (status: string) => {
    switch (status) {
      case 'Out for delivery':
        return { bg: '#FFF7ED', color: BRAND_COLORS.accentOrange, icon: 'truck-fast', border: '#FED7AA' };
      case 'Delivered':
        return { bg: '#F0FDFA', color: BRAND_COLORS.primaryTeal, icon: 'check-decagram', border: '#99F6E4' };
      case 'Cancelled':
        return { bg: '#FEF2F2', color: '#B91C1C', icon: 'close-circle', border: '#FECACA' };
      default:
        return { bg: '#F0FDFA', color: BRAND_COLORS.primaryTeal, icon: 'clock-outline', border: '#99F6E4' };
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Deliveries</Text>
        <Text style={styles.headerSubtitle}>
          Scheduled tank refills, OptimoRoute driver tracking & nutrient accounting
        </Text>
      </View>

      {/* Ranch Filter Pills */}
      <View style={styles.filterWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <TouchableOpacity
            style={[styles.filterPill, selectedRanchFilter === 'ALL' && styles.filterPillActive]}
            onPress={() => setSelectedRanchFilter('ALL')}
          >
            <Text style={[styles.filterPillText, selectedRanchFilter === 'ALL' && styles.filterPillTextActive]}>
              All Ranches
            </Text>
          </TouchableOpacity>
          {ranches.map((r) => (
            <TouchableOpacity
              key={r.id}
              style={[styles.filterPill, selectedRanchFilter === r.id && styles.filterPillActive]}
              onPress={() => setSelectedRanchFilter(r.id)}
            >
              <Text style={[styles.filterPillText, selectedRanchFilter === r.id && styles.filterPillTextActive]}>
                {r.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND_COLORS.primaryTeal} />
        }
      >
        {loading && !refreshing ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={BRAND_COLORS.primaryTeal} />
            <Text style={{ marginTop: 12, color: '#64748B' }}>Loading deliveries...</Text>
          </View>
        ) : (
          <>
            {/* Upcoming Deliveries First */}
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>
                Upcoming Deliveries ({upcomingDeliveries.length})
              </Text>
            </View>

            {upcomingDeliveries.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No upcoming deliveries scheduled.</Text>
              </View>
            ) : (
              upcomingDeliveries.map((item) => {
                const badge = getStatusChipStyle(item.status);
                const isEnRoute = item.status === 'Out for delivery';

                return (
                  <TouchableOpacity
                    key={item.id || item.orderId}
                    style={styles.card}
                    activeOpacity={0.85}
                    onPress={() => openDetail(item)}
                  >
                    <View style={styles.cardHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.orderIdText}>#{item.orderId}</Text>
                        <Text style={styles.dateText}>· {item.deliveryWindow || item.date}</Text>
                      </View>
                      <Chip
                        style={{ backgroundColor: badge.bg, borderColor: badge.border, borderWidth: 1 }}
                        textStyle={{ color: badge.color, fontWeight: '700', fontSize: 11 }}
                        compact
                      >
                        {item.status}
                      </Chip>
                    </View>

                    <View style={styles.cardBody}>
                      <Text style={styles.productText}>{item.product}</Text>
                      <Text style={styles.gallonsText}>{item.gallons?.toLocaleString()} Gallons</Text>
                    </View>

                    {/* OptimoRoute Live Tracking Banner */}
                    {isEnRoute && item.optimoroute && (
                      <View style={styles.optimoRouteBanner}>
                        <MaterialCommunityIcons name="navigation-variant" size={16} color="#0369A1" />
                        <Text style={styles.optimoRouteText}>
                          Driver: <Text style={{ fontWeight: '700' }}>{item.optimoroute.driverName || 'Dave Miller'}</Text> · Live ETA: <Text style={{ fontWeight: '700' }}>{item.optimoroute.eta || '2:15 PM'}</Text>
                        </Text>
                      </View>
                    )}

                    {/* Nutrient Accounting Row */}
                    {(item.lbN || item.lbK2O) && (
                      <View style={styles.nutrientsRow}>
                        <MaterialCommunityIcons name="molecule" size={14} color={BRAND_COLORS.primaryTeal} />
                        <Text style={styles.nutrientsText}>
                          Nutrients: {item.lbN ? `${item.lbN.toLocaleString()} lb N` : ''}
                          {item.lbN && item.lbK2O ? ' · ' : ''}
                          {item.lbK2O ? `${item.lbK2O.toLocaleString()} lb K₂O` : ''}
                        </Text>
                      </View>
                    )}

                    <View style={styles.cardFooter}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.ranchText} numberOfLines={1}>
                          <MaterialCommunityIcons name="map-marker-outline" size={13} color="#64748B" />{' '}
                          {getRanchName(item)} · {item.tankName || 'Tank T-101'}
                        </Text>
                        <Text style={styles.blocksText} numberOfLines={1}>
                          Blocks: {item.blockIds && item.blockIds.length > 0 ? item.blockIds.join(', ') : 'All Ranch Blocks'}
                        </Text>
                      </View>
                      <MaterialCommunityIcons name="chevron-right" size={20} color="#94A3B8" />
                    </View>
                  </TouchableOpacity>
                );
              })
            )}

            {/* Past Deliveries */}
            <View style={[styles.sectionTitleRow, { marginTop: 20 }]}>
              <Text style={styles.sectionTitle}>
                Past Deliveries ({pastDeliveries.length})
              </Text>
            </View>

            {pastDeliveries.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No past delivery history.</Text>
              </View>
            ) : (
              pastDeliveries.map((item) => {
                const badge = getStatusChipStyle(item.status);
                return (
                  <TouchableOpacity
                    key={item.id || item.orderId}
                    style={[styles.card, styles.pastCard]}
                    activeOpacity={0.85}
                    onPress={() => openDetail(item)}
                  >
                    <View style={styles.cardHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.orderIdText}>#{item.orderId}</Text>
                        <Text style={styles.dateText}>· {item.deliveredDate || item.date}</Text>
                      </View>
                      <Chip
                        style={{ backgroundColor: badge.bg, borderColor: badge.border, borderWidth: 1 }}
                        textStyle={{ color: badge.color, fontWeight: '700', fontSize: 11 }}
                        compact
                      >
                        {item.status}
                      </Chip>
                    </View>

                    <View style={styles.cardBody}>
                      <Text style={styles.productText}>{item.product}</Text>
                      <Text style={styles.gallonsText}>
                        {(item.deliveredGallons || item.gallons)?.toLocaleString()} Gallons Delivered
                      </Text>
                    </View>

                    {(item.lbN || item.lbK2O) && (
                      <View style={styles.nutrientsRow}>
                        <MaterialCommunityIcons name="molecule" size={14} color={BRAND_COLORS.primaryTeal} />
                        <Text style={styles.nutrientsText}>
                          Nutrients: {item.lbN ? `${item.lbN.toLocaleString()} lb N` : ''}
                          {item.lbN && item.lbK2O ? ' · ' : ''}
                          {item.lbK2O ? `${item.lbK2O.toLocaleString()} lb K₂O` : ''}
                        </Text>
                      </View>
                    )}

                    <View style={styles.cardFooter}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.ranchText} numberOfLines={1}>
                          <MaterialCommunityIcons name="map-marker-outline" size={13} color="#64748B" />{' '}
                          {getRanchName(item)} · {item.tankName || 'Tank T-101'}
                        </Text>
                        <Text style={styles.blocksText} numberOfLines={1}>
                          Blocks: {item.blockIds && item.blockIds.length > 0 ? item.blockIds.join(', ') : 'All Ranch Blocks'}
                        </Text>
                      </View>
                      <MaterialCommunityIcons name="chevron-right" size={20} color="#94A3B8" />
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </>
        )}
      </ScrollView>

      {/* Delivery Detail Modal */}
      <Modal visible={detailModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedDelivery && (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalOrderId}>Delivery #{selectedDelivery.orderId}</Text>
                    <Text style={styles.modalProduct}>{selectedDelivery.product}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setDetailModalVisible(false)}
                    style={styles.modalCloseBtn}
                  >
                    <MaterialCommunityIcons name="close" size={24} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
                  {/* OptimoRoute Driver Card */}
                  {selectedDelivery.optimoroute && (
                    <View style={styles.modalOptimoBox}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <MaterialCommunityIcons name="truck-delivery" size={18} color="#0369A1" />
                        <Text style={styles.modalOptimoTitle}>OptimoRoute Live Dispatch</Text>
                      </View>
                      <Text style={styles.modalOptimoDriver}>
                        Assigned Driver: <Text style={{ fontWeight: '700' }}>{selectedDelivery.optimoroute.driverName || 'Dave Miller'}</Text>
                      </Text>
                      <Text style={styles.modalOptimoEta}>
                        Estimated Arrival: <Text style={{ fontWeight: '700', color: BRAND_COLORS.accentOrange }}>{selectedDelivery.optimoroute.eta || '2:15 PM'}</Text>
                      </Text>
                      {selectedDelivery.optimoroute.driverPhone && (
                        <TouchableOpacity
                          style={styles.driverCallBtn}
                          onPress={() => Linking.openURL(`tel:${selectedDelivery.optimoroute.driverPhone}`).catch(() => {})}
                        >
                          <MaterialCommunityIcons name="phone" size={14} color="#0369A1" />
                          <Text style={styles.driverCallText}>Call Driver ({selectedDelivery.optimoroute.driverPhone})</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  {/* Delivery Parameters Grid */}
                  <View style={styles.detailGrid}>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Quantity</Text>
                      <Text style={styles.detailValue}>
                        {(selectedDelivery.deliveredGallons || selectedDelivery.gallons)?.toLocaleString()} Gal
                      </Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Status</Text>
                      <Text style={[styles.detailValue, { color: getStatusChipStyle(selectedDelivery.status).color }]}>
                        {selectedDelivery.status}
                      </Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Ranch Destination</Text>
                      <Text style={styles.detailValue}>{getRanchName(selectedDelivery)}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Tank Refill Target</Text>
                      <Text style={styles.detailValue}>{selectedDelivery.tankName || 'Tank T-101'}</Text>
                    </View>
                  </View>

                  {/* Nutrient Accounting Box */}
                  {(selectedDelivery.lbN || selectedDelivery.lbK2O) && (
                    <View style={styles.modalNutrientBox}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <MaterialCommunityIcons name="leaf" size={16} color={BRAND_COLORS.primaryTeal} />
                        <Text style={styles.modalNutrientTitle}>Delivered Nutrients</Text>
                      </View>
                      <Text style={styles.modalNutrientDetails}>
                        • Available Nitrogen (N): <Text style={{ fontWeight: '700' }}>{selectedDelivery.lbN?.toLocaleString()} lb</Text>
                      </Text>
                      <Text style={styles.modalNutrientDetails}>
                        • Soluble Potassium (K₂O): <Text style={{ fontWeight: '700' }}>{selectedDelivery.lbK2O?.toLocaleString()} lb</Text>
                      </Text>
                    </View>
                  )}

                  {/* Delivery Blocks & Location */}
                  <View style={styles.infoBox}>
                    <Text style={styles.infoBoxLabel}>Planted Blocks Covered:</Text>
                    <Text style={styles.infoBoxValue}>
                      {selectedDelivery.blockIds && selectedDelivery.blockIds.length > 0
                        ? selectedDelivery.blockIds.join(', ')
                        : 'Entire Ranch'}
                    </Text>

                    {selectedDelivery.notes ? (
                      <>
                        <Text style={[styles.infoBoxLabel, { marginTop: 8 }]}>Dispatch Notes:</Text>
                        <Text style={styles.infoBoxValue}>{selectedDelivery.notes}</Text>
                      </>
                    ) : null}
                  </View>

                  {/* 3-Stage Delivery Timeline */}
                  <View style={styles.timelineContainer}>
                    <Text style={styles.timelineHeading}>Delivery Timeline</Text>
                    {selectedDelivery.status === 'Cancelled' ? (
                      <View style={styles.cancelledBox}>
                        <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#B91C1C" />
                        <View style={{ marginLeft: 8 }}>
                          <Text style={styles.cancelledTitle}>Delivery Cancelled</Text>
                          <Text style={styles.cancelledReason}>
                            Reason: {selectedDelivery.cancelReason || 'Customer requested reschedule'}
                          </Text>
                        </View>
                      </View>
                    ) : (
                      ['Scheduled', 'Out for delivery', 'Delivered'].map((stage, idx) => {
                        const isCurrentOrPast =
                          selectedDelivery.status === stage ||
                          (stage === 'Scheduled' && (selectedDelivery.status === 'Out for delivery' || selectedDelivery.status === 'Delivered')) ||
                          (stage === 'Out for delivery' && selectedDelivery.status === 'Delivered');

                        return (
                          <View key={stage} style={styles.timelineRow}>
                            <View style={[styles.timelineNode, isCurrentOrPast && styles.timelineNodeDone]}>
                              {isCurrentOrPast ? (
                                <MaterialCommunityIcons name="check" size={14} color="#FFFFFF" />
                              ) : null}
                            </View>
                            <View style={styles.timelineDetails}>
                              <Text style={[styles.timelineStageTitle, isCurrentOrPast && styles.timelineStageTitleDone]}>
                                {stage}
                              </Text>
                              <Text style={styles.timelineStageDesc}>
                                {stage === 'Scheduled' && 'Order received & scheduled in ReNu-Biome calendar'}
                                {stage === 'Out for delivery' && 'Truck dispatched with live OptimoRoute telemetry'}
                                {stage === 'Delivered' && 'Product transferred to ranch injection tank'}
                              </Text>
                            </View>
                          </View>
                        );
                      })
                    )}
                  </View>

                  {/* Link to Invoice (if delivered) */}
                  {selectedDelivery.status === 'Delivered' && (
                    <View style={styles.invoiceLinkBox}>
                      <MaterialCommunityIcons name="receipt-text-check" size={24} color={BRAND_COLORS.primaryTeal} />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.invoiceLinkTitle}>Invoice Available</Text>
                        <Text style={styles.invoiceLinkSub}>Official QuickBooks invoice issued</Text>
                      </View>
                      <Button
                        mode="contained"
                        buttonColor={BRAND_COLORS.primaryTeal}
                        compact
                        onPress={() => {
                          setDetailModalVisible(false);
                          navigation.navigate('Invoices');
                        }}
                      >
                        View Invoice
                      </Button>
                    </View>
                  )}
                </ScrollView>
              </>
            )}
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
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  filterWrapper: {
    paddingVertical: 8,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterPillActive: {
    backgroundColor: BRAND_COLORS.primaryTeal,
    borderColor: BRAND_COLORS.primaryTeal,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 96,
  },
  sectionTitleRow: {
    marginVertical: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyText: {
    fontSize: 13,
    color: '#64748B',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  pastCard: {
    opacity: 0.9,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderIdText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  dateText: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 6,
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  productText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
    marginRight: 8,
  },
  gallonsText: {
    fontSize: 14,
    fontWeight: '800',
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
  nutrientsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  nutrientsText: {
    fontSize: 11,
    fontWeight: '600',
    color: BRAND_COLORS.primaryTeal,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
    marginTop: 2,
  },
  ranchText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  blocksText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    width: '100%',
    maxWidth: 480,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  modalOrderId: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalProduct: {
    fontSize: 14,
    fontWeight: '600',
    color: BRAND_COLORS.primaryTeal,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalOptimoBox: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  modalOptimoTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0369A1',
    letterSpacing: 0.5,
  },
  modalOptimoDriver: {
    fontSize: 13,
    color: '#1E293B',
    marginTop: 2,
  },
  modalOptimoEta: {
    fontSize: 13,
    color: '#1E293B',
    marginTop: 2,
  },
  driverCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  driverCallText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369A1',
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  detailItem: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
  },
  detailLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  modalNutrientBox: {
    backgroundColor: '#F0FDFA',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  modalNutrientTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: BRAND_COLORS.primaryTeal,
  },
  modalNutrientDetails: {
    fontSize: 12,
    color: '#0F766E',
    marginTop: 2,
  },
  infoBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  infoBoxLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  infoBoxValue: {
    fontSize: 13,
    color: '#1E293B',
    marginTop: 2,
  },
  timelineContainer: {
    marginBottom: 14,
  },
  timelineHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 10,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  timelineNode: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  timelineNodeDone: {
    backgroundColor: BRAND_COLORS.primaryTeal,
  },
  timelineDetails: {
    flex: 1,
  },
  timelineStageTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  timelineStageTitleDone: {
    color: '#0F172A',
    fontWeight: '700',
  },
  timelineStageDesc: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  cancelledBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  cancelledTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B91C1C',
  },
  cancelledReason: {
    fontSize: 11,
    color: '#DC2626',
    marginTop: 2,
  },
  invoiceLinkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  invoiceLinkTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: BRAND_COLORS.primaryTeal,
  },
  invoiceLinkSub: {
    fontSize: 11,
    color: '#0F766E',
  },
});
