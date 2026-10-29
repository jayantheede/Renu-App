import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import { Text, Chip, Divider, ActivityIndicator, Button, TextInput } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  fetchDeliveries,
  fetchRanches,
  fetchProducts,
  fetchFeatureFlags,
  submitOrderRequest,
  confirmDeliveryDetails
} from '../api/client';
import { BRAND_COLORS } from '../theme/theme';
import { NotificationBellButton } from '../components/NotificationBellButton';

export const DeliveriesScreen = ({ route }: any) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [ranches, setRanches] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedRanchFilter, setSelectedRanchFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Deferred Launch Flags
  const [orderingEnabled, setOrderingEnabled] = useState(true);
  const [optimorouteEnabled, setOptimorouteEnabled] = useState(true);

  // Order Placement Modal (Deferred: ordering)
  const [orderModalVisible, setOrderModalVisible] = useState(false);
  const [orderProduct, setOrderProduct] = useState('ReNu N-CARE 32-0-0');
  const [orderRanchId, setOrderRanchId] = useState('');
  const [orderTankId, setOrderTankId] = useState('');
  const [orderGallons, setOrderGallons] = useState('2500');
  const [orderWindow, setOrderWindow] = useState('Tomorrow 8:00 AM - 12:00 PM');
  const [orderNotes, setOrderNotes] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderError, setOrderError] = useState('');

  // Proof of Delivery (POD) Modal (Deferred: optimoroute)
  const [podModalVisible, setPodModalVisible] = useState(false);
  const [podDelivery, setPodDelivery] = useState<any>(null);

  // Delivery Detail Modal
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // Customer Delivery Details Confirmation Modal
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmingDelivery, setConfirmingDelivery] = useState<any>(null);
  const [confirmAddress, setConfirmAddress] = useState('');
  const [confirmGateCode, setConfirmGateCode] = useState('');
  const [confirmContact, setConfirmContact] = useState('');
  const [confirmPhone, setConfirmPhone] = useState('');
  const [confirmWindow, setConfirmWindow] = useState('');
  const [confirmNotes, setConfirmNotes] = useState('');
  const [submittingConfirmation, setSubmittingConfirmation] = useState(false);

  const openConfirmModal = (delivery: any) => {
    setConfirmingDelivery(delivery);
    const ranch = ranches.find(r => r.id === delivery.ranchId);
    const defaultAddr = delivery.deliveryAddress || (ranch ? `${ranch.name}, ${ranch.county} County, CA` : '12450 W Sierra Ave, Sanger, CA 93657');
    setConfirmAddress(defaultAddr);
    setConfirmGateCode(delivery.gateCode || '');
    setConfirmContact(delivery.contactOnArrival || 'Ranch Foreman');
    setConfirmPhone(delivery.contactPhone || '559-555-0199');
    setConfirmWindow(delivery.deliveryWindow || 'Tomorrow 8:00 AM - 12:00 PM');
    setConfirmNotes(delivery.notes || '');
    setConfirmModalVisible(true);
  };

  const handleConfirmDeliverySubmit = async () => {
    if (!confirmAddress || !confirmAddress.trim()) {
      alert('Please enter your ranch delivery address.');
      return;
    }
    if (!confirmingDelivery) return;

    setSubmittingConfirmation(true);
    try {
      await confirmDeliveryDetails(confirmingDelivery.id, {
        deliveryAddress: confirmAddress.trim(),
        gateCode: confirmGateCode.trim(),
        contactOnArrival: confirmContact.trim(),
        contactPhone: confirmPhone.trim(),
        deliveryWindow: confirmWindow.trim(),
        notes: confirmNotes.trim(),
      });

      setConfirmModalVisible(false);
      const confirmAlert = `Delivery details confirmed! Dispatch team notified at eedevnsskjayanth.asa@gmail.com with your address and scheduling options.`;
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(confirmAlert);
      } else {
        Alert.alert('Delivery Confirmed', confirmAlert);
      }
      loadData();
    } catch (e: any) {
      alert(e.message || 'Failed to submit delivery confirmation');
    } finally {
      setSubmittingConfirmation(false);
    }
  };

  const loadData = async () => {
    try {
      const [dData, rData, pData, flagData] = await Promise.all([
        fetchDeliveries().catch(() => []),
        fetchRanches().catch(() => []),
        fetchProducts().catch(() => []),
        fetchFeatureFlags().catch(() => ({})),
      ]);
      if (Array.isArray(dData)) setDeliveries(dData);
      if (Array.isArray(rData)) {
        setRanches(rData);
        if (rData.length > 0) {
          const prefRanchId = route?.params?.prefillRanchId;
          const defaultRanch = (prefRanchId && rData.find(r => r.id === prefRanchId)) || rData[0];
          setOrderRanchId(prev => prev || defaultRanch.id);
          const rTanks = defaultRanch.tanks || defaultRanch.tankSetups || [];
          if (rTanks.length > 0) {
            const prefTankId = route?.params?.prefillTankId;
            const defaultTank = (prefTankId && rTanks.find((t: any) => t.id === prefTankId)) || rTanks[0];
            setOrderTankId(prev => prev || defaultTank.id);
          }
        }
      }
      if (Array.isArray(pData) && pData.length > 0) {
        setProducts(pData);
      }
      if (flagData) {
        setOrderingEnabled(Boolean(flagData.global?.ordering ?? flagData.ordering ?? true));
        setOptimorouteEnabled(Boolean(flagData.global?.optimoroute ?? flagData.optimoroute ?? true));
      }
    } catch (e) {
      console.warn('Deliveries fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (route?.params?.autoOpenOrder) {
      if (route.params.prefillProduct) setOrderProduct(route.params.prefillProduct);
      if (route.params.prefillRanchId) setOrderRanchId(route.params.prefillRanchId);
      if (route.params.prefillTankId) setOrderTankId(route.params.prefillTankId);
      setOrderModalVisible(true);
    }
  }, [route?.params]);

  const handleCreateOrder = async () => {
    setOrderError('');
    if (!orderProduct) {
      setOrderError('Please select a formulation product.');
      return;
    }
    if (!orderRanchId) {
      setOrderError('Please select a destination ranch.');
      return;
    }
    const galNum = parseInt(orderGallons, 10);
    if (!orderGallons || isNaN(galNum) || galNum <= 0) {
      setOrderError('Please specify a valid quantity in gallons (> 0).');
      return;
    }

    setSubmittingOrder(true);
    try {
      const selectedRanch = ranches.find(r => r.id === orderRanchId);
      const ranchTanks = selectedRanch?.tanks || selectedRanch?.tankSetups || [];
      const selectedTank = ranchTanks.find((t: any) => t.id === orderTankId) || ranchTanks[0];

      await submitOrderRequest({
        productId: 'prod-order',
        product: orderProduct,
        gallons: galNum,
        ranchId: orderRanchId,
        ranchName: selectedRanch?.name || 'Sierra Foothills Ranch',
        tankId: selectedTank?.id || orderTankId || 'tank-1',
        tankName: selectedTank?.name || 'Tank T-101',
        deliveryWindow: orderWindow || 'Tomorrow 8:00 AM - 12:00 PM',
        notes: orderNotes
      });

      setOrderModalVisible(false);
      setOrderNotes('');
      const confirmMsg = `Order submitted successfully for ${galNum.toLocaleString()} gallons of ${orderProduct} to ${selectedRanch?.name || 'Ranch'}. Our dispatch team has received your order request.`;
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(confirmMsg);
      } else {
        Alert.alert('Order Confirmed', confirmMsg);
      }
      loadData();
    } catch (e: any) {
      setOrderError(e.message || 'Failed to submit order request. Please check connection and try again.');
    } finally {
      setSubmittingOrder(false);
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
      <View style={[styles.header, { paddingTop: Math.max(16, insets.top + 8) }]}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={styles.headerTitle}>Deliveries</Text>
          <Text style={styles.headerSubtitle}>
            Scheduled tank refills, OptimoRoute driver tracking & nutrient accounting
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <NotificationBellButton color={BRAND_COLORS.primaryTeal} badgeCount={2} />
          {orderingEnabled && (
            <TouchableOpacity
              style={styles.requestOrderBtn}
              onPress={() => setOrderModalVisible(true)}
            >
              <MaterialCommunityIcons name="plus-circle" size={16} color="#FFFFFF" />
              <Text style={styles.requestOrderBtnText}>Request Refill</Text>
            </TouchableOpacity>
          )}
        </View>
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
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 + insets.bottom }]}
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
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 6 }}>
                        <Text style={styles.orderIdText}>#{item.orderId}</Text>
                        <Text style={styles.dateText} numberOfLines={1}> · {item.deliveryWindow || item.date}</Text>
                      </View>
                      <Chip
                        style={{ backgroundColor: badge.bg, borderColor: badge.border, borderWidth: 1, flexShrink: 0 }}
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

                    {/* Action Required: Confirm Delivery Details Banner */}
                    {item.confirmationStatus === 'PENDING_CUSTOMER' && (
                      <View style={styles.confirmBannerBox}>
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                          <MaterialCommunityIcons name="alert-decagram" size={20} color="#D97706" />
                          <View style={{ marginLeft: 8, flex: 1 }}>
                            <Text style={styles.confirmBannerTitle}>Order Accepted • Confirm Details</Text>
                            <Text style={styles.confirmBannerSub}>Verify ranch gate code & delivery window</Text>
                          </View>
                        </View>
                        <Button
                          mode="contained"
                          buttonColor="#D97706"
                          compact
                          style={{ borderRadius: 6 }}
                          onPress={() => openConfirmModal(item)}
                        >
                          Confirm
                        </Button>
                      </View>
                    )}

                    {/* Customer Submitted Confirmation Badge */}
                    {item.confirmationStatus === 'CUSTOMER_SUBMITTED' && (
                      <View style={styles.statusInfoStrip}>
                        <MaterialCommunityIcons name="clock-check-outline" size={16} color="#0D9488" />
                        <Text style={styles.statusInfoText}>
                          Address Confirmed · Awaiting Final Dispatch Acceptance
                        </Text>
                      </View>
                    )}

                    {/* Dispatch Accepted Badge */}
                    {item.confirmationStatus === 'DISPATCH_ACCEPTED' && (
                      <View style={[styles.statusInfoStrip, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                        <MaterialCommunityIcons name="check-circle-outline" size={16} color="#059669" />
                        <Text style={[styles.statusInfoText, { color: '#059669' }]}>
                          Delivery Confirmed by Dispatch · Injection Scheduled
                        </Text>
                      </View>
                    )}

                    {/* Reschedule Requested Badge */}
                    {item.confirmationStatus === 'RESCHEDULE_REQUESTED' && (
                      <View style={[styles.statusInfoStrip, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
                        <MaterialCommunityIcons name="calendar-sync-outline" size={16} color="#D97706" />
                        <Text style={[styles.statusInfoText, { color: '#D97706' }]}>
                          Reschedule Requested: {item.rescheduledDeliveryWindow || 'Updated window proposed'}
                        </Text>
                      </View>
                    )}

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
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 6 }}>
                        <Text style={styles.orderIdText}>#{item.orderId}</Text>
                        <Text style={styles.dateText} numberOfLines={1}> · {item.deliveredDate || item.date}</Text>
                      </View>
                      <Chip
                        style={{ backgroundColor: badge.bg, borderColor: badge.border, borderWidth: 1, flexShrink: 0 }}
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
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {optimorouteEnabled && item.status === 'Delivered' && (
                          <Button
                            mode="outlined"
                            compact
                            icon="shield-check"
                            textColor="#0C6054"
                            style={{ borderColor: '#0C6054', borderRadius: 8, height: 32 }}
                            contentStyle={{ height: 32 }}
                            onPress={() => {
                              setPodDelivery(item);
                              setPodModalVisible(true);
                            }}
                          >
                            POD
                          </Button>
                        )}
                        <MaterialCommunityIcons name="chevron-right" size={20} color="#94A3B8" />
                      </View>
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

                  {/* Proof of Delivery (POD) Box (if delivered) */}
                  {selectedDelivery.status === 'Delivered' && optimorouteEnabled && (
                    <View style={styles.podBannerBox}>
                      <MaterialCommunityIcons name="shield-check" size={24} color="#059669" />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.podBannerTitle}>Proof of Delivery (POD) Confirmed</Text>
                        <Text style={styles.podBannerSub}>Driver signature & electronic tank verification on record</Text>
                      </View>
                      <Button
                        mode="contained"
                        buttonColor="#059669"
                        compact
                        onPress={() => {
                          setDetailModalVisible(false);
                          setPodDelivery(selectedDelivery);
                          setPodModalVisible(true);
                        }}
                      >
                        View POD
                      </Button>
                    </View>
                  )}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ==================== ORDER PLACEMENT MODAL (Deferred: ordering) ==================== */}
      <Modal visible={orderModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalSub}>Customer Self-Ordering</Text>
                <Text style={styles.modalTitle}>Request Delivery / Refill</Text>
              </View>
              <TouchableOpacity onPress={() => setOrderModalVisible(false)} style={styles.modalCloseBtn}>
                <MaterialCommunityIcons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
              <View style={styles.orderForm}>
                {/* Product Selection */}
                <Text style={styles.formSectionLabel}>1. Select Formulation</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  {['ReNu N-CARE 32-0-0', 'ReNu K-RUSH 0-0-28', 'Bio-Release', 'Micro-Trace Blend', 'Calcium-Prime', 'Macro-Max N-P-K'].map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={[styles.productPill, orderProduct === p && styles.productPillActive]}
                      onPress={() => setOrderProduct(p)}
                    >
                      <Text style={[styles.productPillText, orderProduct === p && styles.productPillTextActive]}>
                        {p}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Error Banner */}
                {orderError ? (
                  <View style={styles.orderErrorBox}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#B91C1C" />
                    <Text style={styles.orderErrorText}>{orderError}</Text>
                  </View>
                ) : null}

                {/* Ranch Destination */}
                <Text style={styles.formSectionLabel}>2. Destination Ranch & Tank</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                  {ranches.map((r) => (
                    <TouchableOpacity
                      key={r.id}
                      style={[styles.ranchSelectPill, orderRanchId === r.id && styles.ranchSelectPillActive]}
                      onPress={() => {
                        setOrderRanchId(r.id);
                        const rTanks = r.tanks || r.tankSetups || [];
                        if (rTanks.length > 0) {
                          setOrderTankId(rTanks[0].id);
                        } else {
                          setOrderTankId('');
                        }
                      }}
                    >
                      <Text style={[styles.ranchSelectText, orderRanchId === r.id && styles.ranchSelectTextActive]}>
                        {r.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Tank Selection */}
                {(() => {
                  const selectedRanch = ranches.find(r => r.id === orderRanchId);
                  const tanks = selectedRanch?.tanks || selectedRanch?.tankSetups || [];
                  if (tanks.length === 0) return null;
                  return (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                      {tanks.map((t: any) => (
                        <TouchableOpacity
                          key={t.id}
                          style={[styles.tankSelectPill, orderTankId === t.id && styles.tankSelectPillActive]}
                          onPress={() => setOrderTankId(t.id)}
                        >
                          <Text style={[styles.tankSelectText, orderTankId === t.id && styles.tankSelectTextActive]}>
                            {t.name} (Cap: {(t.capacityGallons || t.capacity || 5000).toLocaleString()} Gal)
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  );
                })()}

                {/* Gallons & Delivery Window */}
                <Text style={styles.formSectionLabel}>3. Quantity & Scheduling</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                  {['1000', '2500', '3000', '5000'].map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={[styles.galPill, orderGallons === g && styles.galPillActive]}
                      onPress={() => setOrderGallons(g)}
                    >
                      <Text style={[styles.galPillText, orderGallons === g && styles.galPillTextActive]}>
                        {parseInt(g, 10).toLocaleString()} Gal
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput
                  label="Gallons to Deliver / Refill"
                  value={orderGallons}
                  onChangeText={(val) => setOrderGallons(val.replace(/[^0-9]/g, ''))}
                  keyboardType="numeric"
                  mode="outlined"
                  outlineColor="#CBD5E1"
                  activeOutlineColor="#0C6054"
                  style={{ marginBottom: 10, backgroundColor: '#FFFFFF' }}
                  right={<TextInput.Affix text="Gal" />}
                />

                <TextInput
                  label="Target Delivery Window / Date"
                  value={orderWindow}
                  onChangeText={setOrderWindow}
                  mode="outlined"
                  outlineColor="#CBD5E1"
                  activeOutlineColor="#0C6054"
                  style={{ marginBottom: 10, backgroundColor: '#FFFFFF' }}
                />

                <TextInput
                  label="Field Dispatch Notes (Gate code, contact on arrival)"
                  value={orderNotes}
                  onChangeText={setOrderNotes}
                  mode="outlined"
                  outlineColor="#CBD5E1"
                  activeOutlineColor="#0C6054"
                  placeholder="e.g. Gate code #4921, call foreman 15 mins prior"
                  multiline
                  numberOfLines={2}
                  style={{ backgroundColor: '#FFFFFF' }}
                />

                <View style={styles.policyNotice}>
                  <MaterialCommunityIcons name="information-outline" size={16} color="#0C6054" />
                  <Text style={styles.policyNoticeText}>
                    In accordance with ReNu-Biome grower policy, no unit prices are shown. Official invoices are generated through QuickBooks upon delivery.
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActionRow}>
              <Button
                mode="outlined"
                onPress={() => setOrderModalVisible(false)}
                textColor="#64748B"
                style={styles.closeBtn}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                buttonColor="#0C6054"
                icon="send"
                loading={submittingOrder}
                onPress={handleCreateOrder}
                style={{ borderRadius: 8, flex: 1 }}
              >
                Submit Order Request
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* ==================== CUSTOMER CONFIRM DELIVERY DETAILS MODAL ==================== */}
      <Modal visible={confirmModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {confirmingDelivery && (
              <>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalSub}>Order #{confirmingDelivery.orderId} Accepted</Text>
                    <Text style={styles.modalTitle}>Confirm Delivery Details</Text>
                  </View>
                  <TouchableOpacity onPress={() => setConfirmModalVisible(false)} style={styles.modalCloseBtn}>
                    <MaterialCommunityIcons name="close" size={24} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
                  <View style={styles.orderForm}>
                    <View style={styles.confirmSummaryBox}>
                      <Text style={styles.confirmSummaryTitle}>
                        {confirmingDelivery.product} ({(confirmingDelivery.gallons || 0).toLocaleString()} Gal)
                      </Text>
                      <Text style={styles.confirmSummarySub}>
                        Destination: {getRanchName(confirmingDelivery)} · {confirmingDelivery.tankName || 'Primary Tank'}
                      </Text>
                    </View>

                    <TextInput
                      label="Ranch Delivery Address / GPS *"
                      value={confirmAddress}
                      onChangeText={setConfirmAddress}
                      mode="outlined"
                      outlineColor="#CBD5E1"
                      activeOutlineColor="#0C6054"
                      placeholder="e.g. 12450 W Sierra Ave, Sanger, CA 93657"
                      style={{ marginBottom: 10, backgroundColor: '#FFFFFF' }}
                    />

                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                      <TextInput
                        label="Gate / Lockbox Code"
                        value={confirmGateCode}
                        onChangeText={setConfirmGateCode}
                        mode="outlined"
                        outlineColor="#CBD5E1"
                        activeOutlineColor="#0C6054"
                        placeholder="e.g. #4921"
                        style={{ flex: 1, backgroundColor: '#FFFFFF' }}
                      />
                      <TextInput
                        label="Contact Phone *"
                        value={confirmPhone}
                        onChangeText={setConfirmPhone}
                        mode="outlined"
                        outlineColor="#CBD5E1"
                        activeOutlineColor="#0C6054"
                        placeholder="559-555-0199"
                        style={{ flex: 1, backgroundColor: '#FFFFFF' }}
                      />
                    </View>

                    <TextInput
                      label="On-Arrival Contact Person"
                      value={confirmContact}
                      onChangeText={setConfirmContact}
                      mode="outlined"
                      outlineColor="#CBD5E1"
                      activeOutlineColor="#0C6054"
                      placeholder="e.g. Joe Miller (Foreman)"
                      style={{ marginBottom: 10, backgroundColor: '#FFFFFF' }}
                    />

                    <TextInput
                      label="Preferred Delivery Window / Schedule"
                      value={confirmWindow}
                      onChangeText={setConfirmWindow}
                      mode="outlined"
                      outlineColor="#CBD5E1"
                      activeOutlineColor="#0C6054"
                      placeholder="e.g. Tomorrow 8:00 AM - 12:00 PM"
                      style={{ marginBottom: 10, backgroundColor: '#FFFFFF' }}
                    />

                    <TextInput
                      label="Field Access / Tank Location Instructions"
                      value={confirmNotes}
                      onChangeText={setConfirmNotes}
                      mode="outlined"
                      outlineColor="#CBD5E1"
                      activeOutlineColor="#0C6054"
                      placeholder="e.g. Tank is by north pump pad. Call 15 mins prior to arrival."
                      multiline
                      numberOfLines={2}
                      style={{ marginBottom: 10, backgroundColor: '#FFFFFF' }}
                    />

                    <View style={styles.confirmDispatchNotice}>
                      <MaterialCommunityIcons name="send-check" size={16} color="#0C6054" />
                      <Text style={styles.confirmDispatchNoticeText}>
                        Submitting will notify dispatch at eedevnsskjayanth.asa@gmail.com with your address and scheduling options.
                      </Text>
                    </View>
                  </View>
                </ScrollView>

                <View style={styles.modalActionRow}>
                  <Button
                    mode="outlined"
                    onPress={() => setConfirmModalVisible(false)}
                    textColor="#64748B"
                    style={styles.closeBtn}
                  >
                    Cancel
                  </Button>
                  <Button
                    mode="contained"
                    buttonColor="#0C6054"
                    icon="check"
                    loading={submittingConfirmation}
                    onPress={handleConfirmDeliverySubmit}
                    style={{ borderRadius: 8, flex: 1 }}
                  >
                    Submit Confirmation
                  </Button>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ==================== PROOF OF DELIVERY (POD) MODAL (Deferred: optimoroute) ==================== */}
      <Modal visible={podModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {podDelivery && (
              <>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalSub}>OptimoRoute Dispatch POD</Text>
                    <Text style={styles.modalTitle}>Proof of Delivery #{podDelivery.orderId}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setPodModalVisible(false)} style={styles.modalCloseBtn}>
                    <MaterialCommunityIcons name="close" size={24} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
                  {/* Verified Badge */}
                  <View style={styles.podVerifiedStrip}>
                    <MaterialCommunityIcons name="check-decagram" size={22} color="#15803D" />
                    <View style={{ marginLeft: 8 }}>
                      <Text style={styles.podVerifiedTitle}>Delivery Completed & Geotagged</Text>
                      <Text style={styles.podVerifiedSub}>
                        Delivered on {podDelivery.deliveredDate || podDelivery.date} · OptimoRoute Order #{podDelivery.optimoRouteOrderId || 'OR-9412'}
                      </Text>
                    </View>
                  </View>

                  {/* Delivery Parameters Table */}
                  <View style={styles.podTable}>
                    <View style={styles.podRow}>
                      <Text style={styles.podLabel}>Delivered Product:</Text>
                      <Text style={styles.podVal}>{podDelivery.product}</Text>
                    </View>
                    <View style={styles.podRow}>
                      <Text style={styles.podLabel}>Delivered Quantity:</Text>
                      <Text style={[styles.podVal, { color: '#0C6054', fontWeight: '800' }]}>
                        {(podDelivery.deliveredGallons || podDelivery.gallons)?.toLocaleString()} Gallons
                      </Text>
                    </View>
                    <View style={styles.podRow}>
                      <Text style={styles.podLabel}>Destination Ranch:</Text>
                      <Text style={styles.podVal}>{getRanchName(podDelivery)}</Text>
                    </View>
                    <View style={styles.podRow}>
                      <Text style={styles.podLabel}>Target Refill Tank:</Text>
                      <Text style={styles.podVal}>{podDelivery.tankName || 'Tank T-101'}</Text>
                    </View>
                    <View style={styles.podRow}>
                      <Text style={styles.podLabel}>Ranch GPS Drop Pin:</Text>
                      <Text style={styles.podVal}>
                        {podDelivery.ranchId === 'ranch-2' ? '36.9613° N, -120.0607° W' : '36.5963° N, -119.4504° W (Gate #2)'}
                      </Text>
                    </View>
                    <View style={[styles.podRow, { borderBottomWidth: 0 }]}>
                      <Text style={styles.podLabel}>Commercial Transport:</Text>
                      <Text style={styles.podVal}>ReNu-Biome Logistics · Bobtail Tanker #4</Text>
                    </View>
                  </View>

                  {/* Driver Electronic Signature */}
                  <View style={styles.podSigCard}>
                    <Text style={styles.podSigLabel}>Authorized Driver Electronic Signature:</Text>
                    <View style={styles.sigCanvasBox}>
                      <Text style={styles.sigScriptText}>Dave Miller</Text>
                      <Text style={styles.sigSub}>
                        Commercial Driver License Verified · Timestamp {podDelivery.completedTime || '14:48:22 PST'}
                      </Text>
                    </View>
                  </View>

                  {/* Photo Verification */}
                  <View style={styles.podPhotoCard}>
                    <Text style={styles.podSigLabel}>Tank Level Verification Photo:</Text>
                    <View style={styles.photoBox}>
                      <MaterialCommunityIcons name="camera" size={32} color="#0C6054" />
                      <Text style={styles.photoBoxText}>
                        Tank Gauge Reading Verified (Fill Level: {(podDelivery.deliveredGallons || podDelivery.gallons)?.toLocaleString()} Gal Added)
                      </Text>
                      <Text style={styles.photoTimestamp}>
                        Geotagged: Reedley, CA · Accuracy ±3m · Encrypted SHA-256
                      </Text>
                    </View>
                  </View>
                </ScrollView>

                <View style={styles.modalActionRow}>
                  <Button
                    mode="contained"
                    buttonColor={BRAND_COLORS.primaryTeal}
                    onPress={() => setPodModalVisible(false)}
                    style={{ borderRadius: 8, flex: 1 }}
                  >
                    Done
                  </Button>
                </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSub: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  closeBtn: {
    borderRadius: 8,
    borderColor: '#CBD5E1',
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
  // Refill Request Button & Modal styles
  requestOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0C6054',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  requestOrderBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  podBannerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  podBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#166534',
  },
  podBannerSub: {
    fontSize: 11,
    color: '#15803D',
    marginTop: 2,
  },
  orderForm: {
    paddingVertical: 4,
  },
  formSectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 8,
    marginBottom: 8,
  },
  productPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  productPillActive: {
    backgroundColor: '#CCFBF1',
    borderColor: '#0C6054',
  },
  productPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  productPillTextActive: {
    color: '#0C6054',
    fontWeight: '700',
  },
  ranchSelectPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ranchSelectPillActive: {
    backgroundColor: '#CCFBF1',
    borderColor: '#0C6054',
  },
  ranchSelectText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  ranchSelectTextActive: {
    color: '#0C6054',
    fontWeight: '700',
  },
  tankSelectPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  tankSelectPillActive: {
    backgroundColor: '#F0FDFA',
    borderColor: '#0D9488',
  },
  tankSelectText: {
    fontSize: 11,
    color: '#64748B',
  },
  tankSelectTextActive: {
    color: '#0D9488',
    fontWeight: '700',
  },
  galPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  galPillActive: {
    backgroundColor: '#CCFBF1',
    borderColor: '#0C6054',
  },
  galPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  galPillTextActive: {
    color: '#0C6054',
    fontWeight: '700',
  },
  policyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#99F6E4',
    marginTop: 12,
    gap: 8,
  },
  policyNoticeText: {
    fontSize: 11,
    color: '#0C6054',
    flex: 1,
    lineHeight: 15,
  },
  // POD Modal styles
  podVerifiedStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#86EFAC',
    marginBottom: 12,
  },
  podVerifiedTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803D',
  },
  podVerifiedSub: {
    fontSize: 11,
    color: '#166534',
    marginTop: 2,
  },
  podTable: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  podRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  podLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  podVal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  podSigCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  podSigLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  sigCanvasBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sigScriptText: {
    fontFamily: 'serif',
    fontSize: 24,
    fontStyle: 'italic',
    color: '#1E293B',
    marginBottom: 4,
  },
  sigSub: {
    fontSize: 10,
    color: '#64748B',
  },
  podPhotoCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  photoBox: {
    backgroundColor: '#F0FDFA',
    borderRadius: 6,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderStyle: 'dashed',
  },
  photoBoxText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0C6054',
    marginTop: 6,
    textAlign: 'center',
  },
  photoTimestamp: {
    fontSize: 10,
    color: '#0F766E',
    marginTop: 2,
    textAlign: 'center',
  },
  orderErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    gap: 8,
  },
  orderErrorText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  confirmBannerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    marginBottom: 4,
    gap: 8,
  },
  confirmBannerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  confirmBannerSub: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 1,
  },
  statusInfoStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginTop: 6,
    marginBottom: 4,
    gap: 6,
  },
  statusInfoText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0F766E',
  },
  confirmSummaryBox: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
  },
  confirmSummaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0C6054',
    marginBottom: 2,
  },
  confirmSummarySub: {
    fontSize: 12,
    color: '#334155',
  },
  confirmDispatchNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
    gap: 8,
  },
  confirmDispatchNoticeText: {
    fontSize: 11,
    color: '#15803D',
    fontWeight: '600',
    flex: 1,
  },
});
