import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { Text, ActivityIndicator, Button, Chip } from 'react-native-paper';
import { fetchAdminApprovals, approveCustomer, approveRanch, approveTank, acceptAdminOrder } from '../../api/client';

export const AdminApprovalsScreen = () => {
  const [data, setData] = useState<{
    orders?: any[];
    customers?: any[];
    ranches: any[];
    tanks: any[];
  }>({
    orders: [],
    customers: [],
    ranches: [],
    tanks: []
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = () => {
    fetchAdminApprovals()
      .then(res => {
        setData({
          orders: res.orders || [],
          customers: res.customers || [],
          ranches: res.ranches || [],
          tanks: res.tanks || []
        });
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
    loadData();
  }, []);

  const handleAction = async (type: 'order' | 'customer' | 'ranch' | 'tank', id: string, status: string) => {
    try {
      if (type === 'order') {
        await acceptAdminOrder(id);
      } else if (type === 'customer') {
        await approveCustomer(id, status);
      } else if (type === 'ranch') {
        await approveRanch(id, status);
      } else {
        await approveTank(id, status);
      }

      Alert.alert('Success', `${type.toUpperCase()} ${status}`);
      loadData();
    } catch (error) {
      Alert.alert('Error', `Failed to ${status} ${type}`);
    }
  };

  const hasAnyPending =
    (data.orders?.length || 0) > 0 ||
    (data.customers?.length || 0) > 0 ||
    (data.ranches?.length || 0) > 0 ||
    (data.tanks?.length || 0) > 0;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor="#2E5D36" />
        }
      >
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.headerTitle}>Approvals</Text>
          <Text variant="bodyMedium" style={styles.headerSubtitle}>
            Review and approve pending ranches, orders, tanks, and accounts
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator color="#2E5D36" style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Pending Ranches Section */}
            {(data.ranches?.length || 0) > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Pending Ranches ({data.ranches?.length})</Text>
                {data.ranches?.map(ranch => (
                  <View key={ranch.id} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>{ranch.name}</Text>
                        <Text style={styles.cardSubtitle}>{ranch.county} • {ranch.ac} acres</Text>
                        {ranch.entity?.name && (
                          <Text style={styles.entityName}>Entity: {ranch.entity.name}</Text>
                        )}
                      </View>
                      <Chip compact style={styles.pendingChip} textStyle={styles.pendingChipText}>PENDING</Chip>
                    </View>
                    <View style={styles.actionRow}>
                      <Button mode="outlined" textColor="#DC2626" style={styles.btn} onPress={() => handleAction('ranch', ranch.id, 'REJECTED')}>Reject</Button>
                      <Button mode="contained" buttonColor="#2E5D36" style={styles.btn} onPress={() => handleAction('ranch', ranch.id, 'APPROVED')}>Approve</Button>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Pending Orders Section */}
            {(data.orders?.length || 0) > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Pending Orders ({data.orders?.length})</Text>
                {data.orders?.map(order => (
                  <View key={order.id} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>Order #{order.orderId}</Text>
                        <Text style={styles.cardSubtitle}>{order.product} • {order.qty} • ${order.amt?.toLocaleString()}</Text>
                        <Text style={styles.entityName}>Customer: {order.customerEmail || 'Unknown'}</Text>
                      </View>
                      <Chip compact style={styles.pendingChip} textStyle={styles.pendingChipText}>PENDING</Chip>
                    </View>
                    <View style={styles.actionRow}>
                      <Button mode="contained" buttonColor="#2E5D36" style={styles.btn} onPress={() => handleAction('order', order.id, 'ACCEPTED')}>Accept Order</Button>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Pending Tank Setups Section */}
            {(data.tanks?.length || 0) > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Pending Tank Setups ({data.tanks?.length})</Text>
                {data.tanks?.map(tank => (
                  <View key={tank.id} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>{tank.capacity} Gal Fertilizer Tank</Text>
                        <Text style={styles.cardSubtitle}>Location: {tank.location || 'Main Station'}</Text>
                        <Text style={styles.entityName}>Ranch: {tank.ranch?.name || tank.ranchId}</Text>
                      </View>
                      <Chip compact style={styles.pendingChip} textStyle={styles.pendingChipText}>PENDING</Chip>
                    </View>
                    <View style={styles.actionRow}>
                      <Button mode="outlined" textColor="#DC2626" style={styles.btn} onPress={() => handleAction('tank', tank.id, 'REJECTED')}>Reject</Button>
                      <Button mode="contained" buttonColor="#2E5D36" style={styles.btn} onPress={() => handleAction('tank', tank.id, 'APPROVED')}>Approve</Button>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Pending Customer Registrations Section */}
            {(data.customers?.length || 0) > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Pending Customer Accounts ({data.customers?.length})</Text>
                {data.customers?.map(customer => (
                  <View key={customer.id} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>{customer.name || 'New Customer'}</Text>
                        <Text style={styles.cardSubtitle}>{customer.email} • Role: {customer.role || 'Grower'}</Text>
                      </View>
                      <Chip compact style={styles.pendingChip} textStyle={styles.pendingChipText}>PENDING</Chip>
                    </View>
                    <View style={styles.actionRow}>
                      <Button mode="outlined" textColor="#DC2626" style={styles.btn} onPress={() => handleAction('customer', customer.id, 'REJECTED')}>Reject</Button>
                      <Button mode="contained" buttonColor="#2E5D36" style={styles.btn} onPress={() => handleAction('customer', customer.id, 'APPROVED')}>Approve</Button>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {!hasAnyPending && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>All items reviewed! No pending approvals.</Text>
              </View>
            )}
          </>
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
  headerTitle: {
    color: '#0F172A',
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#64748B',
    marginTop: 2,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#334155',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 3,
  },
  entityName: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  pendingChip: {
    backgroundColor: '#FEF3C7',
    height: 24,
  },
  pendingChipText: {
    color: '#B45309',
    fontWeight: 'bold',
    fontSize: 11,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 14,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  btn: {
    borderRadius: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 15,
  },
});
