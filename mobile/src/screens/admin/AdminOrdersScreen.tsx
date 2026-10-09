import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { GlassCard } from '../../components/GlassCard';

export const AdminOrdersScreen = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const BACKEND_URL = (process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000').replace(/\/+$/, '');

  const fetchOrders = () => {
    setLoading(true);
    fetch(`${BACKEND_URL}/api/admin/orders`)
      .then(r => r.json())
      .then(data => {
        setOrders(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleAcceptOrder = (id: string) => {
    fetch(`${BACKEND_URL}/api/admin/orders/${id}/accept`, { method: 'POST' })
      .then(r => r.json())
      .then(() => {
        Alert.alert('Success', 'Order accepted successfully');
        fetchOrders();
      })
      .catch(e => Alert.alert('Error', 'Failed to accept order'));
  };

  return (
    <View style={styles.background}>
      <View style={styles.overlay}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text variant="headlineMedium" style={styles.title}>Orders</Text>
            <Text variant="bodyMedium" style={styles.subtitle}>Review and process customer orders</Text>
          </View>

          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : orders.length === 0 ? (
            <Text style={{ color: '#FFF' }}>No orders found.</Text>
          ) : (
            orders.map(order => (
              <GlassCard key={order.id} style={styles.card}>
                <View style={styles.row}>
                  <Text style={styles.id}>Order #{order.orderId}</Text>
                  <Text style={[styles.status, order.status === 'ACCEPTED' && styles.statusAccepted]}>
                    {order.status}
                  </Text>
                </View>
                <Text style={styles.detail}>Customer: {order.customerEmail || 'Unknown'}</Text>
                <Text style={styles.detail}>Product: {order.product}</Text>
                <Text style={styles.detail}>Quantity: {order.qty}</Text>
                <Text style={styles.detail}>Amount: ${order.amt?.toLocaleString()}</Text>
                
                {order.status === 'PENDING' && (
                  <Button 
                    mode="contained" 
                    onPress={() => handleAcceptOrder(order.id)}
                    style={styles.btn}
                    buttonColor="#5BC18D"
                  >
                    Accept Order
                  </Button>
                )}
              </GlassCard>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: 'transparent' },
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.2)' },
  scrollContent: { paddingBottom: 120, paddingHorizontal: 20 },
  header: { paddingTop: 80, paddingBottom: 20 },
  title: { color: '#FFF', fontWeight: 'bold' },
  subtitle: { color: 'rgba(255,255,255,0.7)' },
  card: { marginBottom: 16, padding: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  id: { color: '#FFF', fontWeight: 'bold', fontSize: 18 },
  status: { color: '#F47F46', fontWeight: 'bold' },
  statusAccepted: { color: '#A0E8AF' },
  detail: { color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  btn: { marginTop: 16 }
});
