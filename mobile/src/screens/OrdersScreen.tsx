import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Modal, TouchableOpacity, Alert, Share, Platform } from 'react-native';
import { Text, Card, Button, Chip, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { fetchOrders as fetchOrdersApi, payOrder, exportData, importData } from '../api/client';

export const OrdersScreen = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);

  // Tracking Modal State
  const [trackingModalVisible, setTrackingModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  // Import Modal State
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');

  // Duplicate / Checkout Modal State
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [orderToDuplicate, setOrderToDuplicate] = useState<any>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await fetchOrdersApi();
      if (Array.isArray(data)) {
        setOrders(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handlePayOrder = async (orderId: string) => {
    setPayingOrderId(orderId);
    try {
      const res = await payOrder(orderId);
      Alert.alert(
        'Payment Complete & Invoice Issued',
        `Invoice #${res.invoice?.invoiceNumber || 'INV-2026-X'} has been generated and sent to your email. You can also view it in the Invoices tab.`
      );
      fetchOrders();
    } catch (e: any) {
      Alert.alert('Payment Failed', e.message || 'Could not complete online payment');
    } finally {
      setPayingOrderId(null);
    }
  };

  const openTrackingModal = (order: any) => {
    setSelectedOrder(order);
    setTrackingModalVisible(true);
  };

  const handleDuplicate = (order: any) => {
    setOrderToDuplicate(order);
    setPaymentModalVisible(true);
  };

  const processPayment = () => {
    setIsProcessingPayment(true);
    setTimeout(() => {
      const newOrder = {
        id: `ord-${Date.now()}`,
        orderId: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
        product: orderToDuplicate.product || 'Biome Care',
        qty: orderToDuplicate.qty || '10 Gal',
        amt: orderToDuplicate.amt || orderToDuplicate.totalAmount || 1200,
        status: 'PENDING',
        date: new Date().toISOString().split('T')[0],
        trackingStep: 1,
        trackingTimeline: [
          { title: 'Order Placed', desc: 'Received and awaiting admin review', date: new Date().toISOString().replace('T', ' ').substring(0, 16), done: true },
          { title: 'Accepted & Payment Sent', desc: 'Awaiting payment link', date: 'Pending', done: false },
          { title: 'Payment Confirmed', desc: 'Pending', date: 'Pending', done: false },
          { title: 'Dispatched', desc: 'Pending', date: 'Pending', done: false },
          { title: 'Delivered', desc: 'Pending', date: 'Pending', done: false }
        ]
      };

      setOrders([newOrder, ...orders]);
      setIsProcessingPayment(false);
      setPaymentModalVisible(false);
      Alert.alert('Order Submitted', `Order #${newOrder.orderId} placed successfully.`);
    }, 1200);
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
        a.download = `my_orders_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        await Share.share({ title: 'Export My Orders', message: jsonStr });
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
      Alert.alert('Success', `Imported ${items.length} orders successfully`);
      setImportModalVisible(false);
      setImportJsonText('');
      fetchOrders();
    } catch (e: any) {
      Alert.alert('Invalid Format', 'Please enter a valid JSON array of order records.');
    }
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
        return { bg: '#F3E8FF', color: '#7E22CE', label: 'Dispatched' };
      case 'DELIVERED':
        return { bg: '#E0F2FE', color: '#0369A1', label: 'Delivered' };
      default:
        return { bg: '#F1F5F9', color: '#475569', label: status };
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const badge = getStatusBadge(item.status);
    const orderNum = item.orderId || item.orderNumber || 'ORD-NEW';
    const amount = item.amt || item.totalAmount || 0;
    const isAwaitingPay = item.status === 'AWAITING_PAYMENT' || item.status === 'ACCEPTED';
    const isPaying = payingOrderId === item.id;

    return (
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.row}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name="cube-outline" size={22} color="#2E5D36" style={{ marginRight: 6 }} />
              <Text variant="titleMedium" style={{ fontWeight: 'bold', color: '#0F172A' }}>
                Order #{orderNum}
              </Text>
            </View>
            <Chip
              style={[styles.chip, { backgroundColor: badge.bg }]}
              textStyle={{ color: badge.color, fontWeight: 'bold', fontSize: 12 }}
            >
              {badge.label}
            </Chip>
          </View>

          <Text variant="bodyMedium" style={styles.productText}>
            {item.product || 'Agricultural Bio-Nutrient'} {item.qty ? `(${item.qty})` : ''}
          </Text>

          <View style={styles.metaRow}>
            <Text variant="bodySmall" style={{ color: '#64748B' }}>
              Date: {item.date || (item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Today')}
            </Text>
            <Text variant="titleMedium" style={{ color: '#2E5D36', fontWeight: 'bold' }}>
              ${amount.toLocaleString()}
            </Text>
          </View>

          {/* Pay Invoice Button if Order Accepted */}
          {isAwaitingPay && (
            <Button
              mode="contained"
              icon="credit-card"
              loading={isPaying}
              disabled={isPaying}
              buttonColor="#15803D"
              onPress={() => handlePayOrder(item.id)}
              style={styles.payNowBtn}
            >
              Pay Invoice Now (${amount.toLocaleString()})
            </Button>
          )}

          <View style={styles.cardActionsRow}>
            <Button
              mode="outlined"
              icon="map-marker-path"
              onPress={() => openTrackingModal(item)}
              textColor="#2E5D36"
              style={styles.trackingBtn}
            >
              Live Tracking
            </Button>
            <Button
              mode="outlined"
              icon="content-copy"
              onPress={() => handleDuplicate(item)}
              textColor="#64748B"
              style={styles.dupBtn}
            >
              Reorder
            </Button>
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.screenTitle}>My Orders</Text>
          <Text style={styles.subtitle}>Track deliveries, pay invoices & reorder</Text>
        </View>
        <View style={styles.headerActions}>
          <Button
            mode="outlined"
            icon="download"
            onPress={handleExportOrders}
            style={styles.actionBtn}
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
                product: 'N-CARE',
                qty: '20 Gal',
                amt: 5000,
                status: 'PENDING',
                date: new Date().toISOString().split('T')[0]
              }], null, 2));
              setImportModalVisible(true);
            }}
            style={[styles.actionBtn, { backgroundColor: '#2E5D36' }]}
            textColor="#FFFFFF"
          >
            Import
          </Button>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#2E5D36" size="large" />
      ) : orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="cube-scan" size={56} color="#94A3B8" />
          <Text style={styles.emptyText}>No orders found. Place your first order from the Shop.</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 100 }}
          onRefresh={fetchOrders}
          refreshing={loading}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Live Order Tracking Modal */}
      <Modal visible={trackingModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalSheetTitle}>Delivery & Tank Tracking</Text>
                <Text style={styles.modalSubtitle}>Order #{selectedOrder?.orderId || selectedOrder?.orderNumber} • {selectedOrder?.product}</Text>
              </View>
              <TouchableOpacity onPress={() => setTrackingModalVisible(false)}>
                <MaterialCommunityIcons name="close-circle" size={28} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={{ marginVertical: 12 }}>
              {[
                { title: '1. Order Placed', desc: 'Received & logged in agronomy queue', key: 1 },
                { title: '2. Accepted & Payment Link Sent', desc: 'Invoice delivered to email for settlement', key: 2 },
                { title: '3. Payment Confirmed & Blending', desc: 'Formula batch blending active at formulation depot', key: 3 },
                { title: '4. Dispatched', desc: 'Tanker truck dispatched and in transit', key: 4 },
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
            </View>

            <Button
              mode="contained"
              buttonColor="#2E5D36"
              onPress={() => setTrackingModalVisible(false)}
              style={{ marginTop: 12, borderRadius: 10 }}
            >
              Close Tracking Timeline
            </Button>
          </View>
        </View>
      </Modal>

      {/* Duplicate / Reorder Payment Modal */}
      <Modal visible={paymentModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.paymentContainer}>
            <View style={styles.paymentHeader}>
              <Text style={styles.paymentTitle}>Quick Reorder Checkout</Text>
              <TouchableOpacity onPress={() => !isProcessingPayment && setPaymentModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <View style={styles.paymentDetails}>
              <Text style={styles.detailLabel}>Product:</Text>
              <Text style={styles.detailValue}>{orderToDuplicate?.product || 'Biome Care'} ({orderToDuplicate?.qty || '10 Gal'})</Text>
              <View style={styles.divider} />
              <Text style={styles.detailLabel}>Total Amount:</Text>
              <Text style={styles.amountValue}>${(orderToDuplicate?.amt || orderToDuplicate?.totalAmount || 0)?.toLocaleString()}</Text>
            </View>

            <Text style={styles.inputLabel}>Card Number</Text>
            <TextInput mode="outlined" placeholder="**** **** **** 4242" style={styles.input} disabled={isProcessingPayment} outlineColor="#E2E8F0" activeOutlineColor="#2E5D36" />

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.inputLabel}>Expiry</Text>
                <TextInput mode="outlined" placeholder="MM/YY" style={styles.input} disabled={isProcessingPayment} outlineColor="#E2E8F0" activeOutlineColor="#2E5D36" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>CVC</Text>
                <TextInput mode="outlined" placeholder="123" style={styles.input} disabled={isProcessingPayment} outlineColor="#E2E8F0" activeOutlineColor="#2E5D36" />
              </View>
            </View>

            <Button
              mode="contained"
              onPress={processPayment}
              loading={isProcessingPayment}
              disabled={isProcessingPayment}
              style={styles.payButton}
              buttonColor="#2E5D36"
            >
              {isProcessingPayment ? 'Processing...' : `Confirm & Place Order`}
            </Button>
          </View>
        </View>
      </Modal>

      {/* JSON Import Modal */}
      <Modal visible={importModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalSheetTitle}>Import Orders</Text>
              <TouchableOpacity onPress={() => setImportModalVisible(false)}>
                <MaterialCommunityIcons name="close-circle" size={28} color="#64748B" />
              </TouchableOpacity>
            </View>
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
              <Button mode="outlined" onPress={() => setImportModalVisible(false)} style={{ flex: 1 }} textColor="#64748B">
                Cancel
              </Button>
              <Button mode="contained" onPress={handleImportOrders} style={{ flex: 1, backgroundColor: '#2E5D36' }}>
                Import
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
    paddingHorizontal: 20,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  subtitle: {
    color: '#64748B',
    marginTop: 2,
    fontSize: 14,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  actionBtn: {
    borderRadius: 8,
    borderColor: '#2E5D36',
  },
  card: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
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
  productText: {
    color: '#334155',
    fontSize: 15,
    marginTop: 8,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  chip: {
    height: 28,
  },
  payNowBtn: {
    marginTop: 12,
    borderRadius: 10,
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  trackingBtn: {
    flex: 1.2,
    borderRadius: 8,
    borderColor: '#2E5D36',
  },
  dupBtn: {
    flex: 0.8,
    borderRadius: 8,
    borderColor: '#CBD5E1',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 80,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  modalOverlay: {
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
    marginBottom: 16,
  },
  modalSheetTitle: {
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
  paymentContainer: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  paymentTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  paymentDetails: {
    backgroundColor: '#F8FAFC',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailLabel: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  },
  amountValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E5D36',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFF',
    marginBottom: 16,
  },
  payButton: {
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: 10,
  },
});
