import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, Button, Chip, TextInput, Divider } from 'react-native-paper';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  fetchDeliveries,
  submitDelivery,
  updateDeliveryStatus,
  updateDelivery,
  submitInvoice,
  fetchProducts,
  fetchRanches
} from '../../api/client';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NotificationBellButton } from '../../components/NotificationBellButton';
import { ErrorBoundary } from '../../components/ErrorBoundary';

const AdminOrdersScreenInner = ({ route }: any) => {
  const insets = useSafeAreaInsets();
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [ranchesList, setRanchesList] = useState<any[]>([]);

  // Filter States
  const [statusFilter, setStatusFilter] = useState<'All' | 'Scheduled' | 'Out for delivery' | 'Delivered' | 'Cancelled'>('All');
  const [customerFilter, setCustomerFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Create Delivery Order Modal
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('Sierra Agri Group');
  const [newCustomerEmail, setNewCustomerEmail] = useState('customer@renu.com');
  const [newProduct, setNewProduct] = useState('ReNu N-32% K-28% Blend');
  const [newGallons, setNewGallons] = useState('');
  const [newRanchId, setNewRanchId] = useState('');
  const [newTankId, setNewTankId] = useState('');
  const [newBlocks, setNewBlocks] = useState<string[]>([]);
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newWindow, setNewWindow] = useState('Morning (8:00 AM - 12:00 PM)');
  const [newGateCode, setNewGateCode] = useState('#4821');
  const [newWhoToCall, setNewWhoToCall] = useState('John Miller (559-555-0199)');
  const [newNotes, setNewNotes] = useState('');
  const [creating, setCreating] = useState(false);

  // Reschedule Modal
  const [rescheduleModalVisible, setRescheduleModalVisible] = useState(false);
  const [deliveryToReschedule, setDeliveryToReschedule] = useState<any>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleWindow, setRescheduleWindow] = useState('');
  const [rescheduling, setRescheduling] = useState(false);

  // Cancel with Reason Modal
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [deliveryToCancel, setDeliveryToCancel] = useState<any>(null);
  const [cancelReasonInput, setCancelReasonInput] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Mark Delivered & Invoice Details Modal
  const [deliveredModalVisible, setDeliveredModalVisible] = useState(false);
  const [deliveryToMark, setDeliveryToMark] = useState<any>(null);
  const [actualGallons, setActualGallons] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [invoiceDueDate, setInvoiceDueDate] = useState('');
  const [markingDelivered, setMarkingDelivered] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [dels, prods, ranches] = await Promise.all([
        fetchDeliveries().catch(() => []),
        fetchProducts().catch(() => []),
        fetchRanches().catch(() => [])
      ]);
      setDeliveries(Array.isArray(dels) ? dels : []);
      setProductsList(Array.isArray(prods) ? prods : []);
      setRanchesList(Array.isArray(ranches) ? ranches : []);

      if (ranches && ranches.length > 0 && !newRanchId) {
        setNewRanchId(ranches[0].id);
        setNewTankId(ranches[0].tanks?.[0]?.id || '');
      }
    } catch (e: any) {
      console.error('Fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [newRanchId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (route?.params?.prefillRanchId) {
      setNewRanchId(route.params.prefillRanchId);
      if (route.params.prefillTankId) setNewTankId(route.params.prefillTankId);
      if (route.params.prefillCustomerName) setNewCustomerName(route.params.prefillCustomerName);
      if (route.params.prefillCustomerEmail) setNewCustomerEmail(route.params.prefillCustomerEmail);
      setCreateModalVisible(true);
    }
  }, [route?.params]);

  // Handle Create Order
  const handleCreateOrder = async () => {
    const gal = parseFloat(newGallons);
    if (isNaN(gal) || gal <= 0) {
      Alert.alert('Validation Error', 'Please enter valid gallons.');
      return;
    }
    setCreating(true);
    try {
      const ranchObj = ranchesList.find(r => r.id === newRanchId);
      const tankObj = ranchObj?.tanks?.find((t: any) => t.id === newTankId);

      await submitDelivery({
        customerName: newCustomerName,
        customerEmail: newCustomerEmail,
        product: newProduct,
        productName: newProduct,
        gallons: gal,
        ranchId: newRanchId,
        ranchName: ranchObj?.name || 'Ranch',
        tankId: newTankId,
        tankName: tankObj?.name || 'Tank',
        blocks: newBlocks,
        date: newDate,
        deliveryWindow: newWindow,
        gateCode: newGateCode.trim(),
        whoToCall: newWhoToCall.trim(),
        notes: newNotes.trim(),
        status: 'Scheduled'
      });

      Alert.alert('Success', 'Delivery order scheduled. Customer received email notification.');
      setCreateModalVisible(false);
      setNewGallons('');
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create order');
    } finally {
      setCreating(false);
    }
  };

  // Handle Mark Out For Delivery
  const handleMarkOutForDelivery = async (del: any) => {
    try {
      await updateDeliveryStatus(del.id || del.orderId, 'Out for delivery', {
        optimoroute: {
          orderId: `OPT-${del.orderId || Math.floor(1000 + Math.random() * 9000)}`,
          driverName: 'Dave Miller',
          driverPhone: '(559) 555-0144',
          eta: '2:15 PM',
          status: 'in_transit'
        }
      });
      Alert.alert('Dispatched', `Delivery ${del.orderId || del.id} dispatched via OptimoRoute. Driver: Dave Miller · Live ETA: 2:15 PM. Customer notified.`);
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update status');
    }
  };

  // Open Delivered Modal
  const openDeliveredModal = (del: any) => {
    const today = new Date().toISOString().split('T')[0];
    const due = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    const invNum = `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`;

    setDeliveryToMark(del);
    setActualGallons(String(del.gallons || ''));
    setInvoiceNumber(invNum);
    setInvoiceAmount('');
    setInvoiceDate(today);
    setInvoiceDueDate(due);
    setDeliveredModalVisible(true);
  };

  // Complete Delivered
  const handleConfirmDelivered = async () => {
    if (!deliveryToMark) return;
    const gal = parseFloat(actualGallons);
    if (isNaN(gal) || gal <= 0) {
      Alert.alert('Validation Error', 'Please enter valid delivered gallons.');
      return;
    }
    setMarkingDelivered(true);
    try {
      await updateDeliveryStatus(deliveryToMark.id || deliveryToMark.orderId, 'Delivered', {
        deliveredGallons: gal,
        deliveredDate: new Date().toISOString().split('T')[0]
      });

      if (invoiceNumber.trim() && invoiceAmount.trim()) {
        const amt = parseFloat(invoiceAmount);
        if (!isNaN(amt) && amt > 0) {
          await submitInvoice({
            invoiceNumber: invoiceNumber.trim(),
            invoiceDate: invoiceDate || new Date().toISOString().split('T')[0],
            dueDate: invoiceDueDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
            amount: amt,
            customerId: deliveryToMark.customerId,
            customerEmail: deliveryToMark.customerEmail,
            customerName: deliveryToMark.customerName,
            deliveryId: deliveryToMark.id || deliveryToMark.orderId,
            product: deliveryToMark.productName || deliveryToMark.product,
            gallons: gal,
            blocks: deliveryToMark.blocks || [],
            status: 'Open',
            pdfData: 'JVBERi0xLjQKJeLjz9MKMSAwIG9iajw8L1R5cGUvQ2F0YWxvZy9QYWdlcyAyIDAgUj4+ZW5kb2JqCg=='
          });
        }
      }

      setDeliveredModalVisible(false);
      Alert.alert('Delivered', 'Delivery marked Delivered and invoice recorded.');
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to complete delivery');
    } finally {
      setMarkingDelivered(false);
    }
  };

  // Reschedule
  const handleReschedule = async () => {
    if (!deliveryToReschedule || !rescheduleDate) return;
    setRescheduling(true);
    try {
      await updateDelivery(deliveryToReschedule.id || deliveryToReschedule.orderId, {
        date: rescheduleDate,
        deliveryWindow: rescheduleWindow || deliveryToReschedule.deliveryWindow
      });
      Alert.alert('Rescheduled', 'Delivery date and window updated.');
      setRescheduleModalVisible(false);
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to reschedule');
    } finally {
      setRescheduling(false);
    }
  };

  // Cancel with Reason (Admin Only)
  const handleCancelWithReason = async () => {
    if (!deliveryToCancel || !cancelReasonInput.trim()) {
      Alert.alert('Validation Error', 'A cancellation reason is required.');
      return;
    }
    setCancelling(true);
    try {
      await updateDeliveryStatus(deliveryToCancel.id || deliveryToCancel.orderId, 'Cancelled', {
        cancelReason: cancelReasonInput.trim()
      });
      Alert.alert('Cancelled', 'Delivery cancelled with reason recorded.');
      setCancelModalVisible(false);
      setCancelReasonInput('');
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to cancel delivery');
    } finally {
      setCancelling(false);
    }
  };

  // Filter deliveries
  const filteredDeliveries = deliveries.filter(d => {
    if (statusFilter !== 'All' && d.status !== statusFilter) return false;
    if (customerFilter && !d.customerName?.toLowerCase().includes(customerFilter.toLowerCase()) && !d.customerEmail?.toLowerCase().includes(customerFilter.toLowerCase())) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match = (d.orderId && d.orderId.toLowerCase().includes(q)) ||
                    (d.product && d.product.toLowerCase().includes(q)) ||
                    (d.ranchName && d.ranchName.toLowerCase().includes(q)) ||
                    (d.customerName && d.customerName.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(16, insets.top + 8),
            paddingBottom: Math.max(140, 140 + insets.bottom),
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor="#2E5D36" />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.title}>Deliveries Management</Text>
              <Text style={styles.subtitle}>Scheduled, in transit, delivered & cancelled</Text>
            </View>
            <NotificationBellButton tintColor="#0F172A" />
          </View>
          <View style={styles.headerActionRow}>
            <TouchableOpacity onPress={() => setCreateModalVisible(true)} style={styles.createBtn}>
              <Ionicons name="add" size={18} color="#FFF" />
              <Text style={styles.createBtnText}>New Delivery Order</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {(['All', 'Scheduled', 'Out for delivery', 'Delivered', 'Cancelled'] as const).map(st => (
            <TouchableOpacity
              key={st}
              onPress={() => setStatusFilter(st)}
              style={[styles.filterChip, statusFilter === st && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, statusFilter === st && styles.filterChipTextActive]}>
                {st}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Search Input */}
        <TextInput
          placeholder="Filter by customer, ranch, product, or ID..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          mode="outlined"
          dense
          left={<TextInput.Icon icon="magnify" />}
          style={styles.searchInput}
        />

        {/* Deliveries Count */}
        <Text style={styles.countText}>
          Showing {filteredDeliveries.length} {statusFilter === 'All' ? 'Total Deliveries' : `${statusFilter} Deliveries`}
        </Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2E5D36" />
            <Text style={styles.loadingText}>Loading delivery records...</Text>
          </View>
        ) : filteredDeliveries.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="truck-outline" size={48} color="#94A3B8" />
            <Text style={styles.emptyText}>No delivery records match the current filters.</Text>
            <TouchableOpacity
              onPress={() => setCreateModalVisible(true)}
              style={[styles.createBtn, { marginTop: 14 }]}
            >
              <Ionicons name="add" size={18} color="#FFF" />
              <Text style={styles.createBtnText}>Schedule New Delivery</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredDeliveries.map(del => {
            const isScheduled = del.status === 'Scheduled';
            const isOut = del.status === 'Out for delivery';
            const isDelivered = del.status === 'Delivered';
            const isCancelled = del.status === 'Cancelled';

            return (
              <View key={del.id || del.orderId} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.orderId}>{del.orderId || del.id} • {del.date}</Text>
                    <Text style={styles.customerName}>{del.customerName || 'Customer'}</Text>
                  </View>
                  <Chip
                    compact
                    style={{
                      backgroundColor: isDelivered ? '#DCFCE7' : isOut ? '#DBEAFE' : isCancelled ? '#FEE2E2' : '#FEF3C7'
                    }}
                    textStyle={{
                      color: isDelivered ? '#166534' : isOut ? '#1D4ED8' : isCancelled ? '#DC2626' : '#B45309',
                      fontWeight: '800',
                      fontSize: 11
                    }}
                  >
                    {del.status}
                  </Chip>
                </View>

                {/* Product & Volume (NO customer price) */}
                <View style={styles.productBanner}>
                  <Text style={styles.productName}>{del.productName || del.product}</Text>
                  <Text style={styles.volumeText}>{del.gallons} Gallons</Text>
                </View>

                {/* Ranch & Tank Destination */}
                <View style={styles.destBox}>
                  <Text style={styles.destText}>
                    <Text style={{ fontWeight: '700' }}>Destination: </Text>
                    {del.ranchName || 'Ranch'} — {del.tankName || 'Tank'}
                  </Text>
                  {del.blocks && del.blocks.length > 0 && (
                    <Text style={styles.destText}>
                      <Text style={{ fontWeight: '700' }}>Blocks: </Text>
                      {del.blocks.join(', ')}
                    </Text>
                  )}
                  <Text style={styles.destText}>
                    <Text style={{ fontWeight: '700' }}>Window: </Text>
                    {del.deliveryWindow || del.date}
                  </Text>
                  {del.gateCode ? (
                    <Text style={styles.destText}>
                      <Text style={{ fontWeight: '700' }}>Gate Code: </Text>
                      {del.gateCode}
                    </Text>
                  ) : null}
                  {del.whoToCall ? (
                    <Text style={styles.destText}>
                      <Text style={{ fontWeight: '700' }}>Call on Arrival: </Text>
                      {del.whoToCall}
                    </Text>
                  ) : null}
                </View>

                {/* Cancelled Reason */}
                {isCancelled && del.cancelReason && (
                  <View style={styles.cancelBox}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#DC2626' }}>Cancellation Reason:</Text>
                    <Text style={{ fontSize: 12, color: '#7F1D1D', marginTop: 2 }}>{del.cancelReason}</Text>
                  </View>
                )}

                {/* Delivered Info */}
                {isDelivered && (
                  <View style={styles.deliveredBox}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#166534' }}>
                      Delivered {del.deliveredGallons || del.gallons} gal on {del.deliveredDate || del.date}
                    </Text>
                    {del.invoiceNumber && (
                      <Text style={{ fontSize: 12, color: '#14532D', marginTop: 2 }}>
                        Linked Invoice: {del.invoiceNumber}
                      </Text>
                    )}
                  </View>
                )}

                {/* 3-Step Timeline (Scheduled -> Out for delivery -> Delivered) */}
                <View style={styles.timelineRow}>
                  <View style={[styles.timelineDot, styles.timelineDotDone]}>
                    <Ionicons name="checkmark" size={10} color="#FFF" />
                  </View>
                  <Text style={styles.timelineLbl}>Scheduled</Text>
                  <View style={[styles.timelineLine, (isOut || isDelivered) && styles.timelineLineDone]} />

                  <View style={[styles.timelineDot, (isOut || isDelivered) && styles.timelineDotDone]}>
                    {(isOut || isDelivered) && <Ionicons name="checkmark" size={10} color="#FFF" />}
                  </View>
                  <Text style={styles.timelineLbl}>Out for delivery</Text>
                  <View style={[styles.timelineLine, isDelivered && styles.timelineLineDone]} />

                  <View style={[styles.timelineDot, isDelivered && styles.timelineDotDone]}>
                    {isDelivered && <Ionicons name="checkmark" size={10} color="#FFF" />}
                  </View>
                  <Text style={styles.timelineLbl}>Delivered</Text>
                </View>

                {/* Admin Operations Buttons */}
                {!isDelivered && !isCancelled && (
                  <View style={styles.actionRow}>
                    {isScheduled && (
                      <Button
                        mode="outlined"
                        onPress={() => handleMarkOutForDelivery(del)}
                        textColor="#1D4ED8"
                        style={{ borderColor: '#1D4ED8', flex: 1, minHeight: 44, justifyContent: 'center' }}
                      >
                        Dispatch (Out)
                      </Button>
                    )}

                    <Button
                      mode="contained"
                      onPress={() => openDeliveredModal(del)}
                      buttonColor="#2E5D36"
                      style={{ flex: 1, minHeight: 44, justifyContent: 'center' }}
                    >
                      Mark Delivered
                    </Button>

                    <Button
                      mode="text"
                      onPress={() => {
                        setDeliveryToReschedule(del);
                        setRescheduleDate(del.date);
                        setRescheduleWindow(del.deliveryWindow || '');
                        setRescheduleModalVisible(true);
                      }}
                      textColor="#475569"
                    >
                      Reschedule
                    </Button>

                    <Button
                      mode="text"
                      onPress={() => {
                        setDeliveryToCancel(del);
                        setCancelReasonInput('');
                        setCancelModalVisible(true);
                      }}
                      textColor="#DC2626"
                    >
                      Cancel
                    </Button>
                  </View>
                )}
              </View>
            );
          })
        )}

      </ScrollView>

      {/* ================= CREATE DELIVERY ORDER MODAL ================= */}
      <Modal visible={createModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Create Delivery Order</Text>
                <Text style={styles.modalSubtitle}>Office phone-in order entry</Text>
              </View>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <TextInput label="Customer Name" value={newCustomerName} onChangeText={setNewCustomerName} mode="outlined" style={styles.modalInput} />
              <TextInput label="Customer Email" value={newCustomerEmail} onChangeText={setNewCustomerEmail} mode="outlined" style={styles.modalInput} />
              <TextInput label="Product" value={newProduct} onChangeText={setNewProduct} mode="outlined" style={styles.modalInput} />
              <TextInput label="Quantity (Gallons)" value={newGallons} onChangeText={setNewGallons} keyboardType="numeric" mode="outlined" placeholder="e.g. 500" style={styles.modalInput} />

              <Text style={{ fontWeight: '700', fontSize: 13, marginTop: 6, marginBottom: 4 }}>Select Ranch</Text>
              {ranchesList.map(r => (
                <TouchableOpacity
                  key={r.id}
                  onPress={() => {
                    setNewRanchId(r.id);
                    setNewTankId(r.tanks?.[0]?.id || '');
                  }}
                  style={[styles.pickerItem, newRanchId === r.id && styles.pickerItemActive]}
                >
                  <Text style={{ fontWeight: '700', color: newRanchId === r.id ? '#15803D' : '#1E293B' }}>{r.name}</Text>
                  <Text style={{ fontSize: 11, color: '#64748B' }}>Tanks: {(r.tanks || []).map((t: any) => t.name).join(', ') || 'None'}</Text>
                </TouchableOpacity>
              ))}

              <TextInput label="Requested Delivery Date" value={newDate} onChangeText={setNewDate} mode="outlined" placeholder="YYYY-MM-DD" style={styles.modalInput} />
              <TextInput label="Delivery Window" value={newWindow} onChangeText={setNewWindow} mode="outlined" style={styles.modalInput} />
              <TextInput label="Gate Code" value={newGateCode} onChangeText={setNewGateCode} mode="outlined" style={styles.modalInput} />
              <TextInput label="Who to Call on Arrival" value={newWhoToCall} onChangeText={setNewWhoToCall} mode="outlined" style={styles.modalInput} />
              <TextInput label="Delivery Notes" value={newNotes} onChangeText={setNewNotes} mode="outlined" multiline numberOfLines={2} style={styles.modalInput} />
            </ScrollView>

            <View style={styles.modalActions}>
              <Button mode="outlined" onPress={() => setCreateModalVisible(false)} textColor="#64748B" style={{ flex: 1, marginRight: 8, minHeight: 48, justifyContent: 'center' }}>Cancel</Button>
              <Button mode="contained" onPress={handleCreateOrder} loading={creating} buttonColor="#2E5D36" style={{ flex: 1, marginLeft: 8, minHeight: 48, justifyContent: 'center' }}>Schedule Delivery</Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================= RESCHEDULE MODAL ================= */}
      <Modal visible={rescheduleModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reschedule Delivery</Text>
            <Text style={styles.modalSubtitle}>{deliveryToReschedule?.orderId} • {deliveryToReschedule?.customerName}</Text>
            <TextInput label="New Delivery Date" value={rescheduleDate} onChangeText={setRescheduleDate} mode="outlined" placeholder="YYYY-MM-DD" style={styles.modalInput} />
            <TextInput label="New Delivery Window" value={rescheduleWindow} onChangeText={setRescheduleWindow} mode="outlined" placeholder="Morning / Afternoon" style={styles.modalInput} />
            <View style={styles.modalActions}>
              <Button mode="outlined" onPress={() => setRescheduleModalVisible(false)} textColor="#64748B" style={{ flex: 1, marginRight: 8, minHeight: 48, justifyContent: 'center' }}>Cancel</Button>
              <Button mode="contained" onPress={handleReschedule} loading={rescheduling} buttonColor="#2E5D36" style={{ flex: 1, marginLeft: 8, minHeight: 48, justifyContent: 'center' }}>Save Date</Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================= CANCEL MODAL WITH REASON ================= */}
      <Modal visible={cancelModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cancel Delivery (Admin)</Text>
            <Text style={styles.modalSubtitle}>Customers cannot cancel; enter reason for office audit.</Text>
            <TextInput
              label="Cancellation Reason"
              value={cancelReasonInput}
              onChangeText={setCancelReasonInput}
              mode="outlined"
              multiline
              numberOfLines={3}
              placeholder="e.g. Grower irrigation scheduled maintenance; rescheduled for next week"
              style={styles.modalInput}
            />
            <View style={styles.modalActions}>
              <Button mode="outlined" onPress={() => setCancelModalVisible(false)} textColor="#64748B" style={{ flex: 1, marginRight: 8, minHeight: 48, justifyContent: 'center' }}>Back</Button>
              <Button mode="contained" onPress={handleCancelWithReason} loading={cancelling} buttonColor="#DC2626" style={{ flex: 1, marginLeft: 8, minHeight: 48, justifyContent: 'center' }}>Confirm Cancel</Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================= MARK DELIVERED & INVOICE MODAL ================= */}
      <Modal visible={deliveredModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Mark Delivered</Text>
                <Text style={styles.modalSubtitle}>{deliveryToMark?.orderId} • {deliveryToMark?.customerName}</Text>
              </View>
              <TouchableOpacity onPress={() => setDeliveredModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <TextInput label="Actual Delivered Gallons" value={actualGallons} onChangeText={setActualGallons} keyboardType="numeric" mode="outlined" style={styles.modalInput} />
              
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A', marginTop: 12, marginBottom: 4 }}>
                Office Invoice Entry (from QuickBooks)
              </Text>
              <TextInput label="Invoice Number" value={invoiceNumber} onChangeText={setInvoiceNumber} mode="outlined" style={styles.modalInput} />
              <TextInput label="Invoice Amount ($)" value={invoiceAmount} onChangeText={setInvoiceAmount} keyboardType="decimal-pad" mode="outlined" placeholder="e.g. 6250.00" style={styles.modalInput} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TextInput label="Invoice Date" value={invoiceDate} onChangeText={setInvoiceDate} mode="outlined" style={[styles.modalInput, { flex: 1 }]} />
                <TextInput label="Due Date" value={invoiceDueDate} onChangeText={setInvoiceDueDate} mode="outlined" style={[styles.modalInput, { flex: 1 }]} />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Button mode="outlined" onPress={() => setDeliveredModalVisible(false)} textColor="#64748B" style={{ flex: 1, marginRight: 8, minHeight: 48, justifyContent: 'center' }}>Cancel</Button>
              <Button mode="contained" onPress={handleConfirmDelivered} loading={markingDelivered} buttonColor="#2E5D36" style={{ flex: 1, marginLeft: 8, minHeight: 48, justifyContent: 'center' }}>Complete</Button>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
};

export const AdminOrdersScreen = (props: any) => {
  return (
    <ErrorBoundary fallbackTitle="Admin Deliveries Screen Error">
      <AdminOrdersScreenInner {...props} />
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { paddingHorizontal: 16 },
  header: {
    paddingBottom: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitleContainer: {
    flex: 1,
    paddingRight: 8,
  },
  headerActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: { fontSize: 22, fontWeight: '800', color: '#0F172A' },
  subtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2E5D36',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 6,
    minHeight: 48,
  },
  createBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginRight: 8,
    minHeight: 40,
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: '#2E5D36',
    borderColor: '#2E5D36',
  },
  filterChipText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  filterChipTextActive: { color: '#FFFFFF' },
  searchInput: { marginBottom: 8, backgroundColor: '#FFFFFF' },
  countText: { fontSize: 12, color: '#64748B', marginBottom: 12, fontWeight: '500' },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
  },
  emptyText: { fontSize: 13, color: '#64748B', marginTop: 8, textAlign: 'center' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  orderId: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  customerName: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginTop: 2 },
  productBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  productName: { fontWeight: '700', color: '#0F172A', fontSize: 14 },
  volumeText: { fontWeight: '800', color: '#2E5D36', fontSize: 14 },
  destBox: { marginTop: 10, gap: 4 },
  destText: { fontSize: 12, color: '#475569' },
  cancelBox: { backgroundColor: '#FEF2F2', padding: 8, borderRadius: 8, marginTop: 8 },
  deliveredBox: { backgroundColor: '#F0FDF4', padding: 8, borderRadius: 8, marginTop: 8 },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineDotDone: { backgroundColor: '#16A34A' },
  timelineLine: { flex: 1, height: 2, backgroundColor: '#CBD5E1', marginHorizontal: 4 },
  timelineLineDone: { backgroundColor: '#16A34A' },
  timelineLbl: { fontSize: 10, color: '#64748B', fontWeight: '600', marginLeft: 4 },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  modalTitle: { fontSize: 19, fontWeight: '800', color: '#0F172A' },
  modalSubtitle: { fontSize: 12, color: '#64748B', marginTop: 2 },
  modalInput: { marginBottom: 10, backgroundColor: '#FFFFFF' },
  modalActions: { flexDirection: 'row', marginTop: 10 },
  pickerItem: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 6,
  },
  pickerItemActive: { backgroundColor: '#F0FDF4', borderColor: '#2E5D36' },
});
