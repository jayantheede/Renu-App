import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { Text, ActivityIndicator, Button } from 'react-native-paper';
import { fetchAdminApprovals, approveCustomer, approveRanch, approveTank } from '../../api/client';

export const AdminApprovalsScreen = () => {
  const [data, setData] = useState<{ customers?: any[]; ranches: any[]; tanks: any[] }>({
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

  const handleAction = async (type: 'customer' | 'ranch' | 'tank', id: string, status: string) => {
    try {
      if (type === 'customer') await approveCustomer(id, status);
      else if (type === 'ranch') await approveRanch(id, status);
      else await approveTank(id, status);

      Alert.alert('Success', `${type.toUpperCase()} ${status}`);
      loadData();
    } catch (error) {
      Alert.alert('Error', `Failed to ${status} ${type}`);
    }
  };

  const hasAnyPending =
    (data.customers?.length || 0) > 0 ||
    (data.ranches?.length || 0) > 0 ||
    (data.tanks?.length || 0) > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Approvals</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />
          }
        >
          {/* Pending Customers Section */}
          {(data.customers?.length || 0) > 0 && (
            <>
              <Text style={styles.sectionTitle}>Pending Customer Registrations ({data.customers?.length})</Text>
              {data.customers?.map(customer => (
                <View key={customer.id} style={styles.card}>
                  <View>
                    <Text style={styles.cardTitle}>{customer.name || 'New Customer'}</Text>
                    <Text style={styles.cardSubtitle}>
                      {customer.email} • Role: {customer.role || 'Grower'}
                    </Text>
                    {customer.createdAt && (
                      <Text style={[styles.cardSubtitle, { fontSize: 12, marginTop: 2 }]}>
                        Registered: {new Date(customer.createdAt).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                  <View style={styles.actionRow}>
                    <Button
                      mode="text"
                      textColor="#B71C1C"
                      onPress={() => handleAction('customer', customer.id, 'REJECTED')}
                    >
                      Reject
                    </Button>
                    <Button
                      mode="contained"
                      buttonColor="#2E5D36"
                      onPress={() => handleAction('customer', customer.id, 'APPROVED')}
                    >
                      Approve
                    </Button>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* Pending Ranches Section */}
          <Text style={[styles.sectionTitle, (data.customers?.length || 0) > 0 ? { marginTop: 24 } : {}]}>
            Pending Ranches ({data.ranches?.length || 0})
          </Text>
          {data.ranches?.map(ranch => (
            <View key={ranch.id} style={styles.card}>
              <View>
                <Text style={styles.cardTitle}>{ranch.name}</Text>
                <Text style={styles.cardSubtitle}>{ranch.county} • {ranch.ac} acres</Text>
              </View>
              <View style={styles.actionRow}>
                <Button mode="text" textColor="#B71C1C" onPress={() => handleAction('ranch', ranch.id, 'REJECTED')}>Reject</Button>
                <Button mode="contained" buttonColor="#2E5D36" onPress={() => handleAction('ranch', ranch.id, 'APPROVED')}>Approve</Button>
              </View>
            </View>
          ))}

          {/* Pending Tanks Section */}
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Pending Tank Setups ({data.tanks?.length || 0})</Text>
          {data.tanks?.map(tank => (
            <View key={tank.id} style={styles.card}>
              <View>
                <Text style={styles.cardTitle}>{tank.capacity} Gal at {tank.location}</Text>
                <Text style={styles.cardSubtitle}>Ranch: {tank.ranch?.name || tank.ranchId}</Text>
              </View>
              <View style={styles.actionRow}>
                <Button mode="text" textColor="#B71C1C" onPress={() => handleAction('tank', tank.id, 'REJECTED')}>Reject</Button>
                <Button mode="contained" buttonColor="#2E5D36" onPress={() => handleAction('tank', tank.id, 'APPROVED')}>Approve</Button>
              </View>
            </View>
          ))}

          {!hasAnyPending && (
            <Text style={{ textAlign: 'center', marginTop: 40, color: '#6B7280' }}>No pending approvals.</Text>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F4' },
  header: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  scrollContent: { padding: 20, paddingBottom: 100 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: '#374151' },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  cardSubtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, gap: 8 }
});
