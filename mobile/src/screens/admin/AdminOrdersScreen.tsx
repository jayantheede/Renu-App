import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { Text, Button, Chip } from 'react-native-paper';

export const AdminOrdersScreen = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrders(); }} />
        }
      >
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>Orders</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>Review and process customer orders</Text>
        </View>

        {loading ? (
          <ActivityIndicator color="#2E5D36" style={{ marginTop: 40 }} />
        ) : orders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No orders found.</Text>
          </View>
        ) : (
          orders.map(order => {
            const isAccepted = order.status === 'ACCEPTED';
            return (
              <View key={order.id} style={styles.card}>
                <View style={styles.row}>
                  <Text style={styles.id}>Order #{order.orderId}</Text>
                  <Chip
                    compact
                    style={[
                      styles.chip,
                      isAccepted ? styles.chipAccepted : styles.chipPending
                    ]}
                    textStyle={{
                      color: isAccepted ? '#15803D' : '#D97706',
                      fontWeight: 'bold',
                      fontSize: 12
                    }}
                  >
                    {order.status}
                  </Chip>
                </View>

                <View style={styles.divider} />

                <Text style={styles.detail}>
                  <Text style={styles.detailLabel}>Customer: </Text>
                  {order.customerEmail || 'Unknown'}
                </Text>
                <Text style={styles.detail}>
                  <Text style={styles.detailLabel}>Product: </Text>
                  {order.product}
                </Text>
                <Text style={styles.detail}>
                  <Text style={styles.detailLabel}>Quantity: </Text>
                  {order.qty}
                </Text>
                <Text style={styles.detail}>
                  <Text style={styles.detailLabel}>Amount: </Text>
                  ${order.amt?.toLocaleString()}
                </Text>

                {order.status === 'PENDING' && (
                  <Button
                    mode="contained"
                    onPress={() => handleAcceptOrder(order.id)}
                    style={styles.btn}
                    buttonColor="#2E5D36"
                  >
                    Accept Order
                  </Button>
                )}
              </View>
            );
          })
        )}
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
    paddingBottom: 120,
    paddingHorizontal: 20,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: {
    color: '#0F172A',
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#64748B',
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 16,
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
    height: 26,
  },
  chipPending: {
    backgroundColor: '#FEF3C7',
  },
  chipAccepted: {
    backgroundColor: '#DCFCE7',
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
  btn: {
    marginTop: 12,
    borderRadius: 10,
  },
});
