import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Modal, TouchableOpacity } from 'react-native';
import { Text, Card, Button, useTheme, Chip, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { fetchOrders as fetchOrdersApi } from '../api/client';

const INITIAL_MOCK_ORDERS = [
  { id: '1', orderNumber: 'ORD-1001', status: 'DELIVERED', totalAmount: 450, createdAt: new Date(Date.now() - 864000000).toISOString() },
  { id: '2', orderNumber: 'ORD-1002', status: 'PROCESSING', totalAmount: 1250, createdAt: new Date().toISOString() }
];

export const OrdersScreen = () => {
  const theme = useTheme();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [orderToDuplicate, setOrderToDuplicate] = useState<any>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await fetchOrdersApi();
      if (Array.isArray(data) && data.length > 0) {
         setOrders(data);
      } else {
         // Fallback to local mock orders if backend returns []
         setOrders(INITIAL_MOCK_ORDERS);
      }
    } catch (e) {
      console.error(e);
      setOrders(INITIAL_MOCK_ORDERS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleDuplicate = (order: any) => {
    setOrderToDuplicate(order);
    setPaymentModalVisible(true);
  };

  const processPayment = () => {
    setIsProcessingPayment(true);
    setTimeout(() => {
      // Create duplicate order
      const newOrder = {
        id: Math.random().toString(),
        orderNumber: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
        status: 'PROCESSING',
        totalAmount: orderToDuplicate.totalAmount,
        createdAt: new Date().toISOString()
      };
      
      setOrders([newOrder, ...orders]);
      setIsProcessingPayment(false);
      setPaymentModalVisible(false);
    }, 1500);
  };

  const renderItem = ({ item }: { item: any }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.row}>
          <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>Order #{item.orderNumber}</Text>
          <Chip icon={item.status === 'DELIVERED' ? 'check' : 'clock-outline'} style={item.status === 'DELIVERED' ? styles.chipSuccess : styles.chipWarning}>
            {item.status}
          </Chip>
        </View>
        <Text variant="bodyMedium" style={{ marginTop: 8, color: '#6B7280' }}>
          Date: {new Date(item.createdAt).toLocaleDateString()}
        </Text>
        <View style={[styles.row, { marginTop: 12 }]}>
          <Text variant="titleMedium" style={{ color: '#10B981', fontWeight: 'bold' }}>
            ${item.totalAmount?.toLocaleString()}
          </Text>
          <Button mode="outlined" icon="content-copy" onPress={() => handleDuplicate(item)} textColor="#15803D" style={{ borderColor: '#15803D' }}>
            Duplicate
          </Button>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: '#F3F4F0' }]}>
      <Text style={styles.screenTitle}>Orders</Text>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#10B981" />
      ) : orders.length === 0 ? (
        <Text style={{ textAlign: 'center', marginTop: 40 }}>No orders found.</Text>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
          onRefresh={fetchOrders}
          refreshing={loading}
        />
      )}

      {/* Mock Payment Gateway Modal */}
      <Modal visible={paymentModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.paymentContainer}>
            <View style={styles.paymentHeader}>
              <Text style={styles.paymentTitle}>Secure Checkout</Text>
              <TouchableOpacity onPress={() => !isProcessingPayment && setPaymentModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.paymentDetails}>
              <Text style={styles.detailLabel}>Duplicating Order:</Text>
              <Text style={styles.detailValue}>#{orderToDuplicate?.orderNumber}</Text>
              <View style={styles.divider} />
              <Text style={styles.detailLabel}>Total Amount:</Text>
              <Text style={styles.amountValue}>${orderToDuplicate?.totalAmount?.toLocaleString()}</Text>
            </View>

            <Text style={styles.inputLabel}>Card Number</Text>
            <TextInput mode="outlined" placeholder="**** **** **** 4242" style={styles.input} disabled={isProcessingPayment} outlineColor="#E5E7EB" activeOutlineColor="#10B981" />
            
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.inputLabel}>Expiry</Text>
                <TextInput mode="outlined" placeholder="MM/YY" style={styles.input} disabled={isProcessingPayment} outlineColor="#E5E7EB" activeOutlineColor="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>CVC</Text>
                <TextInput mode="outlined" placeholder="123" style={styles.input} disabled={isProcessingPayment} outlineColor="#E5E7EB" activeOutlineColor="#10B981" />
              </View>
            </View>

            <Button mode="contained" onPress={processPayment} loading={isProcessingPayment} disabled={isProcessingPayment} style={styles.payButton} labelStyle={styles.payButtonText}>
              {isProcessingPayment ? 'Processing...' : `Pay $${orderToDuplicate?.totalAmount?.toLocaleString()}`}
            </Button>
            
            <View style={styles.secureFooter}>
              <MaterialCommunityIcons name="lock" size={14} color="#6B7280" />
              <Text style={styles.secureText}>Payments are secure and encrypted</Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, paddingTop: 50 },
  screenTitle: { fontSize: 26, fontWeight: 'bold', color: '#1F4D36', marginBottom: 20 },
  card: { marginBottom: 15, backgroundColor: '#FFF', borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chipSuccess: { backgroundColor: '#D1FAE5' },
  chipWarning: { backgroundColor: '#FEF3C7' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  paymentContainer: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  paymentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  paymentTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  paymentDetails: { backgroundColor: '#F9FAFB', padding: 15, borderRadius: 12, marginBottom: 20 },
  detailLabel: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
  detailValue: { fontSize: 16, fontWeight: 'bold', color: '#374151' },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 12 },
  amountValue: { fontSize: 24, fontWeight: 'bold', color: '#10B981' },
  
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { backgroundColor: '#FFF', marginBottom: 16, height: 50 },
  payButton: { backgroundColor: '#10B981', paddingVertical: 8, borderRadius: 30, marginTop: 10 },
  payButtonText: { fontSize: 16, fontWeight: 'bold' },
  
  secureFooter: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  secureText: { fontSize: 12, color: '#6B7280', marginLeft: 6 }
});
