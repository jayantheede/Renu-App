import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  RefreshControl,
} from 'react-native';
import { Text, Card, Chip, Divider, ActivityIndicator, Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { fetchDeliveries, fetchRanches } from '../api/client';

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
  const filteredDeliveries = deliveries.filter(d => {
    if (selectedRanchFilter === 'ALL') return true;
    return d.ranchId === selectedRanchFilter;
  });

  const upcomingDeliveries = filteredDeliveries.filter(
    d => d.status === 'Scheduled' || d.status === 'Out for delivery'
  );

  const pastDeliveries = filteredDeliveries.filter(
    d => d.status === 'Delivered' || d.status === 'Cancelled'
  );

  const openDetail = (delivery: any) => {
    setSelectedDelivery(delivery);
    setDetailModalVisible(true);
  };

  const getRanchName = (ranchId: string) => {
    const ranch = ranches.find(r => r.id === ranchId);
    return ranch?.name || 'Ranch Tank';
  };

  const getStatusChipStyle = (status: string) => {
    switch (status) {
      case 'Out for delivery':
        return { bg: '#FEF3C7', color: '#B45309', icon: 'truck-fast' };
      case 'Delivered':
        return { bg: '#E8F5E9', color: '#15803D', icon: 'check-decagram' };
      case 'Cancelled':
        return { bg: '#FEE2E2', color: '#B91C1C', icon: 'close-circle' };
      default:
        return { bg: '#EFF6FF', color: '#1D4ED8', icon: 'clock-outline' };
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Deliveries</Text>
        <Text style={styles.headerSubtitle}>
          Scheduled tank refills & completed microbial applications
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
          {ranches.map(r => (
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2E5D36" />
        }
      >
        {loading && !refreshing ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#2E5D36" />
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
              upcomingDeliveries.map(item => {
                const badge = getStatusChipStyle(item.status);
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
                        style={{ backgroundColor: badge.bg }}
                        textStyle={{ color: badge.color, fontWeight: '700', fontSize: 11 }}
                        compact
                      >
                        {item.status}
                      </Chip>
                    </View>

                    <View style={styles.cardBody}>
                      <Text style={styles.productText}>{item.product}</Text>
                      <Text style={styles.gallonsText}>{item.gallons} Gallons</Text>
                    </View>

                    <View style={styles.cardFooter}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.ranchText} numberOfLines={1}>
                          <MaterialCommunityIcons name="terrain" size={13} color="#64748B" />{' '}
                          {getRanchName(item.ranchId)}
                        </Text>
                        <Text style={styles.blocksText} numberOfLines={1}>
                          Blocks: {item.blockIds && item.blockIds.length > 0 ? item.blockIds.join(', ') : 'All Blocks'}
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
              pastDeliveries.map(item => {
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
                        style={{ backgroundColor: badge.bg }}
                        textStyle={{ color: badge.color, fontWeight: '700', fontSize: 11 }}
                        compact
                      >
                        {item.status}
                      </Chip>
                    </View>

                    <View style={styles.cardBody}>
                      <Text style={styles.productText}>{item.product}</Text>
                      <Text style={styles.gallonsText}>
                        {item.deliveredGallons || item.gallons} Gallons delivered
                      </Text>
                    </View>

                    <View style={styles.cardFooter}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.ranchText} numberOfLines={1}>
                          <MaterialCommunityIcons name="terrain" size={13} color="#64748B" />{' '}
                          {getRanchName(item.ranchId)}
                        </Text>
                        <Text style={styles.blocksText} numberOfLines={1}>
                          Blocks: {item.blockIds && item.blockIds.length > 0 ? item.blockIds.join(', ') : 'All Blocks'}
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
                  <View>
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

                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
                  {/* Delivery Parameters Grid */}
                  <View style={styles.detailGrid}>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Requested Gallons</Text>
                      <Text style={styles.detailValue}>{selectedDelivery.gallons} Gal</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Status</Text>
                      <Text style={[styles.detailValue, { color: getStatusChipStyle(selectedDelivery.status).color }]}>
                        {selectedDelivery.status}
                      </Text>
                    </View>
                    {selectedDelivery.deliveredGallons ? (
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Delivered Gallons</Text>
                        <Text style={styles.detailValue}>{selectedDelivery.deliveredGallons} Gal</Text>
                      </View>
                    ) : null}
                    {selectedDelivery.deliveredDate ? (
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Delivered Date</Text>
                        <Text style={styles.detailValue}>{selectedDelivery.deliveredDate}</Text>
                      </View>
                    ) : null}
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Delivery Window</Text>
                      <Text style={styles.detailValue}>{selectedDelivery.deliveryWindow || 'Window TBD'}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Ranch Destination</Text>
                      <Text style={styles.detailValue}>{getRanchName(selectedDelivery.ranchId)}</Text>
                    </View>
                  </View>

                  {/* Delivery Blocks & Location */}
                  <View style={styles.infoBox}>
                    <Text style={styles.infoBoxLabel}>Planted Blocks:</Text>
                    <Text style={styles.infoBoxValue}>
                      {selectedDelivery.blockIds && selectedDelivery.blockIds.length > 0
                        ? selectedDelivery.blockIds.join(', ')
                        : 'Entire Ranch'}
                    </Text>

                    {selectedDelivery.gateCode ? (
                      <>
                        <Text style={[styles.infoBoxLabel, { marginTop: 8 }]}>Gate Access Code:</Text>
                        <Text style={styles.infoBoxValue}>{selectedDelivery.gateCode}</Text>
                      </>
                    ) : null}

                    {selectedDelivery.contactOnArrival ? (
                      <>
                        <Text style={[styles.infoBoxLabel, { marginTop: 8 }]}>Contact on Arrival:</Text>
                        <Text style={styles.infoBoxValue}>{selectedDelivery.contactOnArrival}</Text>
                      </>
                    ) : null}

                    {selectedDelivery.notes ? (
                      <>
                        <Text style={[styles.infoBoxLabel, { marginTop: 8 }]}>Driver Notes:</Text>
                        <Text style={styles.infoBoxValue}>{selectedDelivery.notes}</Text>
                      </>
                    ) : null}
                  </View>

                  {/* 3-Stage Timeline (Scheduled -> Out for delivery -> Delivered) */}
                  <View style={styles.timelineContainer}>
                    <Text style={styles.timelineHeading}>Delivery Timeline</Text>
                    {selectedDelivery.status === 'Cancelled' ? (
                      <View style={styles.cancelledBox}>
                        <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#B91C1C" />
                        <View style={{ marginLeft: 8 }}>
                          <Text style={styles.cancelledTitle}>Order Cancelled by Administration</Text>
                          <Text style={styles.cancelledReason}>
                            Reason: {selectedDelivery.cancelReason || 'Administrative cancellation'}
                          </Text>
                        </View>
                      </View>
                    ) : (
                      ['Scheduled', 'Out for delivery', 'Delivered'].map((stage, idx) => {
                        const isCurrentOrPast =
                          selectedDelivery.status === stage ||
                          (stage === 'Scheduled' && (selectedDelivery.status === 'Out for delivery' || selectedDelivery.status === 'Delivered')) ||
                          (stage === 'Out for delivery' && selectedDelivery.status === 'Delivered');

                        const isDone = isCurrentOrPast;
                        const timelineItem = selectedDelivery.timeline ? selectedDelivery.timeline[idx] : null;

                        return (
                          <View key={stage} style={styles.timelineRow}>
                            <View style={[styles.timelineNode, isDone && styles.timelineNodeDone]}>
                              {isDone ? (
                                <MaterialCommunityIcons name="check" size={14} color="#FFFFFF" />
                              ) : null}
                            </View>
                            <View style={styles.timelineDetails}>
                              <Text style={[styles.timelineStageTitle, isDone && styles.timelineStageTitleDone]}>
                                {stage}
                              </Text>
                              <Text style={styles.timelineStageDesc}>
                                {stage === 'Scheduled' && 'Order received & scheduled in delivery calendar'}
                                {stage === 'Out for delivery' && 'Dispatch truck en route to ranch injection tank'}
                                {stage === 'Delivered' && 'Product successfully injected into ranch tank'}
                              </Text>
                              {timelineItem && timelineItem.date && timelineItem.date !== 'Pending' ? (
                                <Text style={styles.timelineStageDate}>{timelineItem.date}</Text>
                              ) : null}
                            </View>
                          </View>
                        );
                      })
                    )}
                  </View>

                  {/* Link to Invoice (if delivered) */}
                  {selectedDelivery.status === 'Delivered' && (
                    <View style={styles.invoiceLinkBox}>
                      <MaterialCommunityIcons name="receipt-text-check" size={24} color="#2E5D36" />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.invoiceLinkTitle}>Invoice Available</Text>
                        <Text style={styles.invoiceLinkSub}>Official QuickBooks invoice issued</Text>
                      </View>
                      <Button
                        mode="contained"
                        buttonColor="#2E5D36"
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
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 48, // 48px touch target
    justifyContent: 'center',
  },
  filterPillActive: {
    backgroundColor: '#1E293B',
    borderColor: '#1E293B',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 96,
  },
  sectionTitleRow: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pastCard: {
    opacity: 0.9,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    marginBottom: 10,
  },
  productText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  gallonsText: {
    fontSize: 13,
    color: '#475569',
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  ranchText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  blocksText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalOrderId: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  modalProduct: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  modalCloseBtn: {
    minHeight: 48,
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  detailItem: {
    width: '47%',
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  infoBox: {
    backgroundColor: '#F1F5F9',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  infoBoxLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
  },
  infoBoxValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 2,
  },
  timelineContainer: {
    marginBottom: 16,
  },
  timelineHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  timelineRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  timelineNode: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    marginRight: 10,
  },
  timelineNodeDone: {
    backgroundColor: '#2E5D36',
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
    fontWeight: '800',
    color: '#0F172A',
  },
  timelineStageDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  timelineStageDate: {
    fontSize: 10,
    color: '#2E5D36',
    fontWeight: '700',
    marginTop: 2,
  },
  cancelledBox: {
    flexDirection: 'row',
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelledTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#991B1B',
  },
  cancelledReason: {
    fontSize: 11,
    color: '#B91C1C',
    marginTop: 2,
  },
  invoiceLinkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  invoiceLinkTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  invoiceLinkSub: {
    fontSize: 11,
    color: '#2E5D36',
  },
});
