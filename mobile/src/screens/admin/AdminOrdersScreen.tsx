import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, Alert, Modal, TouchableOpacity, Share, Platform } from 'react-native';
import { Text, Button, Chip, TextInput, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { acceptOrderAndEmail, payOrder, updateOrderTracking, exportData, importData } from '../../api/client';

export const AdminOrdersScreen = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Tracking Modal State
  const [trackingModalVisible, setTrackingModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  // Import Modal State
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');

  const BACKEND_URL = (process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000').replace(/\/+$/, '');

  const fetchOrders = () => {
    fetch(`${BACKEND_URL}/api/admin/orders`)
      .then(r => r.json())
      .then(data => {
        setOrders(Array.isArray(data) ? data : []);
        setLoading(false);
        setRefreshing(false);
      })
      .catch(e => {
        console.error(e);
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleAcceptOrder = async (id: string) => {
    setActionLoadingId(id);
    try {
      await acceptOrderAndEmail(id);
      Alert.alert(
        'Order Accepted & Payment Link Emailed',
        'Customer was notified via email with payment instructions and secure checkout link.'
      );
      fetchOrders();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to accept order');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handlePayOrder = async (id: string) => {
    setActionLoadingId(id);
    try {
      const res = await payOrder(id);
      Alert.alert(
        'Payment Confirmed & Invoice Issued',
        `Invoice #${res.invoice?.invoiceNumber || 'INV-2026-X'} has been generated, emailed to customer, and stored in Invoices.`
      );
      fetchOrders();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to process payment');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUpdateStep = async (orderId: string, status: string, step: number) => {
    try {
      await updateOrderTracking(orderId, status, step);
      Alert.alert('Tracking Updated', `Order status progressed to "${status}" (Step ${step}/5)`);
      fetchOrders();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev: any) => ({
          ...prev,
          status,
          trackingStep: step,
          trackingTimeline: prev.trackingTimeline?.map((t: any, idx: number) =>
            idx < step ? { ...t, done: true } : t
          )
        }));
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update tracking');
    }
  };

  const handleExportOrders = async () => {
    try {
      const res = await exportData('orders');
      const jsonStr = JSON.stringify(res.data, null, 2);
      if (Platform.OS === 'web') {
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `renu_orders_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        await Share.share({
          title: 'Export Renu Orders',
          message: jsonStr
        });
      }
    } catch (e: any) {
      Alert.alert('Export Failed', e.message || 'Could not export orders');
    }
  };

  const handleImportOrders = async () => {
    try {
      const parsed = JSON.parse(importJsonText);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      await importData('orders', items);
      Alert.alert('Success', `Imported ${items.length} order records successfully`);
      setImportModalVisible(false);
      setImportJsonText('');
      fetchOrders();
    } catch (e: any) {
      Alert.alert('Invalid Format', 'Please enter valid JSON array of order objects.');
    }
  };

  const openTrackingModal = (order: any) => {
    setSelectedOrder(order);
    setTrackingModalVisible(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return { bg: '#FEF3C7', color: '#B45309', label: 'Pending Review' };
      case 'AWAITING_PAYMENT':
      case 'ACCEPTED':
        return { bg: '#DBEAFE', color: '#1D4ED8', label: 'Awaiting Payment' };
      case 'PAID':
        return { bg: '#DCFCE7', color: '#15803D', label: 'Paid & Blending' };
      case 'DISPATCHED':
        return { bg: '#F3E8FF', color: '#7E22CE', label: 'Dispatched / En Route' };
      case 'DELIVERED':
        return { bg: '#E0F2FE', color: '#0369A1', label: 'Delivered to Tank' };
      default:
        return { bg: '#F1F5F9', color: '#475569', label: status };
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrders(); }} />
        }
      >
        {/* Header with Title & Export/Import Controls */}
        <View style={styles.header}>
          <View>
            <Text variant="headlineMedium" style={styles.title}>Orders Management</Text>
            <Text variant="bodyMedium" style={styles.subtitle}>Review orders, trigger payments & live delivery tracking</Text>
          </View>
          <View style={styles.topActionsRow}>
            <Button
              mode="outlined"
              icon="download"
              onPress={handleExportOrders}
              style={styles.actionBtnSmall}
              textColor="#2E5D36"
            >
              Export
            </Button>
            <Button
              mode="contained"
              icon="upload"
              onPress={() => {
                setImportJsonText(JSON.stringify([{
                  id: `ord-${Date.now()}`,
                  orderId: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
                  customerEmail: 'grower@demo.com',
                  product: 'Biome Care',
                  qty: '15 Gal',
                  amt: 1860,
                  status: 'PENDING',
                  date: new Date().toISOString().split('T')[0]
                }], null, 2));
                setImportModalVisible(true);
              }}
              style={[styles.actionBtnSmall, { backgroundColor: '#2E5D36' }]}
              textColor="#FFFFFF"
            >
              Import
            </Button>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color="#2E5D36" style={{ marginTop: 40 }} size="large" />
        ) : orders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={56} color="#94A3B8" />
            <Text style={styles.emptyText}>No orders found.</Text>
          </View>
        ) : (
          orders.map(order => {
            const badge = getStatusBadge(order.status);
            const isPending = order.status === 'PENDING';
            const isAwaitingPay = order.status === 'AWAITING_PAYMENT' || order.status === 'ACCEPTED';
            const isPaid = order.status === 'PAID';
            const isDispatched = order.status === 'DISPATCHED';
            const isLoading = actionLoadingId === order.id;

            return (
              <View key={order.id} style={styles.card}>
                <View style={styles.row}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialCommunityIcons name="cube-send" size={22} color="#2E5D36" style={{ marginRight: 8 }} />
                    <Text style={styles.id}>Order #{order.orderId}</Text>
                  </View>
                  <Chip
                    compact
                    style={[styles.chip, { backgroundColor: badge.bg }]}
                    textStyle={{ color: badge.color, fontWeight: 'bold', fontSize: 12 }}
                  >
                    {badge.label}
                  </Chip>
                </View>

                <View style={styles.divider} />

                <Text style={styles.detail}>
                  <Text style={styles.detailLabel}>Customer: </Text>
                  {order.customerEmail || 'customer@renu.com'}
                </Text>
                <Text style={styles.detail}>
                  <Text style={styles.detailLabel}>Product: </Text>
                  {order.product} ({order.qty})
                </Text>
                <Text style={styles.detail}>
                  <Text style={styles.detailLabel}>Amount: </Text>
                  ${order.amt?.toLocaleString()}
                </Text>
                <Text style={styles.detail}>
                  <Text style={styles.detailLabel}>Order Date: </Text>
                  {order.date}
                </Text>

                {/* Email Notification Status */}
                {order.paymentEmailSent && (
                  <View style={styles.emailBadge}>
                    <MaterialCommunityIcons name="email-check" size={16} color="#15803D" style={{ marginRight: 6 }} />
                    <Text style={styles.emailBadgeText}>Payment Request Delivered to Customer</Text>
                  </View>
                )}

                {/* Invoiced Status */}
                {order.invoiceId && (
                  <View style={styles.invoiceBadge}>
                    <MaterialCommunityIcons name="receipt" size={16} color="#0369A1" style={{ marginRight: 6 }} />
                    <Text style={styles.invoiceBadgeText}>Official Invoice Generated & Emailed</Text>
                  </View>
                )}

                {/* Action Buttons Row */}
                <View style={styles.buttonStack}>
                  {isPending && (
                    <Button
                      mode="contained"
                      icon="email-fast"
                      loading={isLoading}
                      disabled={isLoading}
                      onPress={() => handleAcceptOrder(order.id)}
                      style={styles.actionBtn}
                      buttonColor="#2E5D36"
                    >
                      Accept & Send Payment Email
                    </Button>
                  )}

                  {isAwaitingPay && (
                    <Button
                      mode="contained"
                      icon="credit-card-check"
                      loading={isLoading}
                      disabled={isLoading}
                      onPress={() => handlePayOrder(order.id)}
                      style={[styles.actionBtn, { backgroundColor: '#15803D' }]}
                    >
                      Confirm Payment & Issue Invoice
                    </Button>
                  )}

                  {isPaid && (
                    <Button
                      mode="contained"
                      icon="truck-delivery"
                      onPress={() => handleUpdateStep(order.id, 'DISPATCHED', 4)}
                      style={[styles.actionBtn, { backgroundColor: '#7E22CE' }]}
                    >
                      Mark Dispatched for Delivery
                    </Button>
                  )}

                  {isDispatched && (
                    <Button
                      mode="contained"
                      icon="check-decagram"
                      onPress={() => handleUpdateStep(order.id, 'DELIVERED', 5)}
                      style={[styles.actionBtn, { backgroundColor: '#0369A1' }]}
                    >
                      Confirm Injection & Delivery
                    </Button>
                  )}

                  {/* Always Available Tracking Stepper Button */}
                  <Button
                    mode="outlined"
                    icon="map-marker-path"
                    onPress={() => openTrackingModal(order)}
                    style={styles.trackingBtn}
                    textColor="#2E5D36"
                  >
                    View Live Tracking Timeline
                  </Button>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Live Order Tracking Modal */}
      <Modal visible={trackingModalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Order Tracking</Text>
                <Text style={styles.modalSubtitle}>Order #{selectedOrder?.orderId} • {selectedOrder?.product}</Text>
              </View>
              <TouchableOpacity onPress={() => setTrackingModalVisible(false)}>
                <MaterialCommunityIcons name="close-circle" size={28} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {[
                { title: '1. Order Placed', desc: 'Received & validated in agronomist system', key: 1 },
                { title: '2. Accepted & Payment Link Sent', desc: 'Customer received secure payment link via email', key: 2 },
                { title: '3. Payment Confirmed & Blending', desc: 'Invoice generated and biological culture batch blending initiated', key: 3 },
                { title: '4. Dispatched', desc: 'Tank truck en route to ranch location', key: 4 },
                { title: '5. Delivered & Injected', desc: 'Product injected directly into ranch tank station', key: 5 }
              ].map((step, idx) => {
                const currentStep = selectedOrder?.trackingStep || 1;
                const isCompleted = idx + 1 <= currentStep;
                const isCurrent = idx + 1 === currentStep;

                return (
                  <View key={step.key} style={styles.stepperRow}>
                    <View style={styles.stepperLeft}>
                      <View style={[
                        styles.stepperDot,
                        isCompleted ? styles.dotCompleted : styles.dotPending,
                        isCurrent && styles.dotActive
                      ]}>
                        <MaterialCommunityIcons
                          name={isCompleted ? 'check' : 'circle-outline'}
                          size={16}
                          color={isCompleted ? '#FFF' : '#94A3B8'}
                        />
                      </View>
                      {idx < 4 && (
                        <View style={[
                          styles.stepperLine,
                          idx + 1 < currentStep ? styles.lineCompleted : styles.linePending
                        ]} />
                      )}
                    </View>
                    <View style={styles.stepperContent}>
                      <Text style={[styles.stepperTitle, isCompleted && styles.stepperTitleCompleted]}>
                        {step.title}
                      </Text>
                      <Text style={styles.stepperDesc}>{step.desc}</Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            <Button
              mode="contained"
              buttonColor="#2E5D36"
              onPress={() => setTrackingModalVisible(false)}
              style={{ marginTop: 20, borderRadius: 10 }}
            >
              Close Tracking View
            </Button>
          </View>
        </View>
      </Modal>

      {/* JSON Import Modal */}
      <Modal visible={importModalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Import Orders</Text>
              <TouchableOpacity onPress={() => setImportModalVisible(false)}>
                <MaterialCommunityIcons name="close-circle" size={28} color="#64748B" />
              </TouchableOpacity>
            </View>
            <Text style={{ color: '#64748B', marginBottom: 12 }}>
              Paste JSON array of orders below to synchronize into system store:
            </Text>
            <TextInput
              mode="outlined"
              multiline
              numberOfLines={8}
              value={importJsonText}
              onChangeText={setImportJsonText}
              style={{ backgroundColor: '#F8FAFC', fontSize: 12, marginBottom: 16 }}
              outlineColor="#CBD5E1"
              activeOutlineColor="#2E5D36"
            />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Button
                mode="outlined"
                onPress={() => setImportModalVisible(false)}
                style={{ flex: 1 }}
                textColor="#64748B"
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleImportOrders}
                style={{ flex: 1, backgroundColor: '#2E5D36' }}
              >
                Submit Import
              </Button>
            </View>
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
    paddingHorizontal: 20,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
  },
  title: {
    color: '#0F172A',
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#64748B',
    marginTop: 2,
    fontSize: 14,
  },
  topActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  actionBtnSmall: {
    borderRadius: 8,
    borderColor: '#2E5D36',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 16,
    marginTop: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  id: {
    color: '#0F172A',
    fontWeight: 'bold',
    fontSize: 18,
  },
  chip: {
    height: 28,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  detail: {
    color: '#334155',
    fontSize: 14,
    marginBottom: 6,
  },
  detailLabel: {
    fontWeight: '600',
    color: '#64748B',
  },
  emailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  emailBadgeText: {
    color: '#15803D',
    fontSize: 12,
    fontWeight: '600',
  },
  invoiceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    padding: 8,
    borderRadius: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  invoiceBadgeText: {
    color: '#0369A1',
    fontSize: 12,
    fontWeight: '600',
  },
  buttonStack: {
    marginTop: 14,
    gap: 8,
  },
  actionBtn: {
    borderRadius: 10,
  },
  trackingBtn: {
    borderRadius: 10,
    borderColor: '#2E5D36',
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
    marginBottom: 20,
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
  stepperRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  stepperLeft: {
    alignItems: 'center',
    width: 32,
  },
  stepperDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotCompleted: {
    backgroundColor: '#2E5D36',
  },
  dotPending: {
    backgroundColor: '#E2E8F0',
  },
  dotActive: {
    borderWidth: 2,
    borderColor: '#10B981',
  },
  stepperLine: {
    width: 2,
    height: 38,
  },
  lineCompleted: {
    backgroundColor: '#2E5D36',
  },
  linePending: {
    backgroundColor: '#E2E8F0',
  },
  stepperContent: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 20,
  },
  stepperTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  stepperTitleCompleted: {
    color: '#0F172A',
  },
  stepperDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
});
