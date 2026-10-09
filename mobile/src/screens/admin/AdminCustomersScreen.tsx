import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity, Alert, Modal } from 'react-native';
import { Text, TextInput, Button, Chip } from 'react-native-paper';
import { GlassCard } from '../../components/GlassCard';
import { Ionicons } from '@expo/vector-icons';

export const AdminCustomersScreen = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [creating, setCreating] = useState(false);

  const BACKEND_URL = (process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000').replace(/\/+$/, '');

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/customers`);
      const data = await res.json();
      setCustomers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to fetch customers:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [BACKEND_URL]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCustomers();
  };

  const handleApproveCustomer = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/approvals/customer/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        Alert.alert('Success', `Customer marked as ${status}`);
        fetchCustomers();
      } else {
        Alert.alert('Error', 'Failed to update customer status');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error updating customer status');
    }
  };

  const handleCreateCustomer = async () => {
    if (!newEmail.trim()) {
      Alert.alert('Missing Email', 'Please provide an email address.');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          email: newEmail.trim(),
          password: newPassword.trim() || 'Customer123!',
          role: 'Grower'
        })
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert('Success', 'Customer created successfully!');
        setNewName('');
        setNewEmail('');
        setNewPassword('');
        setModalVisible(false);
        fetchCustomers();
      } else {
        Alert.alert('Error', data?.error || 'Failed to create customer');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Network request failed');
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={styles.background}>
      <View style={styles.overlay}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFF" />
          }
        >
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text variant="headlineMedium" style={styles.title}>Customers</Text>
              <Text variant="bodyMedium" style={styles.subtitle}>All registered clients and growers</Text>
            </View>
            <View style={styles.headerButtons}>
              <TouchableOpacity onPress={onRefresh} style={styles.iconBtn}>
                <Ionicons name="refresh" size={20} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addBtn}>
                <Ionicons name="add" size={20} color="#FFF" />
                <Text style={styles.addBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator color="#FFF" style={{ marginTop: 40 }} />
          ) : customers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color="rgba(255,255,255,0.6)" />
              <Text style={styles.emptyText}>No customers found.</Text>
              <Button mode="contained" onPress={() => setModalVisible(true)} style={styles.emptyBtn} buttonColor="#2E5D36">
                Create First Customer
              </Button>
            </View>
          ) : (
            customers.map((c, idx) => {
              const displayName = c.name || c.user_metadata?.full_name || 'Grower Client';
              const displayRole = c.role || c.user_metadata?.role || 'Grower';
              const status = c.approvalStatus || c.user_metadata?.approvalStatus || 'APPROVED';
              const isPending = status.toUpperCase() === 'PENDING';

              return (
                <GlassCard key={c.id || idx} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{displayName}</Text>
                      <Text style={styles.email}>{c.email}</Text>
                    </View>
                    <Chip
                      compact
                      style={[
                        styles.chip,
                        isPending ? styles.pendingChip : styles.approvedChip
                      ]}
                      textStyle={{
                        color: isPending ? '#D97706' : '#15803D',
                        fontSize: 11,
                        fontWeight: 'bold'
                      }}
                    >
                      {status.toUpperCase()}
                    </Chip>
                  </View>

                  <View style={styles.metaRow}>
                    <Text style={styles.role}>Role: {displayRole}</Text>
                    {c.createdAt && (
                      <Text style={styles.date}>
                        Joined: {new Date(c.createdAt).toLocaleDateString()}
                      </Text>
                    )}
                  </View>

                  {isPending && (
                    <View style={styles.approvalActionRow}>
                      <Button
                        mode="outlined"
                        textColor="#DC2626"
                        style={styles.actionBtn}
                        onPress={() => handleApproveCustomer(c.id, 'REJECTED')}
                      >
                        Reject
                      </Button>
                      <Button
                        mode="contained"
                        buttonColor="#2E5D36"
                        style={styles.actionBtn}
                        onPress={() => handleApproveCustomer(c.id, 'APPROVED')}
                      >
                        Approve Customer
                      </Button>
                    </View>
                  )}
                </GlassCard>
              );
            })
          )}
        </ScrollView>

        {/* Create Customer Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text variant="titleLarge" style={styles.modalTitle}>Add New Customer</Text>
              <Text variant="bodySmall" style={styles.modalSub}>Create a customer account directly</Text>

              <TextInput
                label="Full Name"
                value={newName}
                onChangeText={setNewName}
                style={styles.input}
                mode="outlined"
              />

              <TextInput
                label="Email Address"
                value={newEmail}
                onChangeText={setNewEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
                mode="outlined"
              />

              <TextInput
                label="Password (optional, default: Customer123!)"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                style={styles.input}
                mode="outlined"
              />

              <View style={styles.modalBtnRow}>
                <Button
                  mode="text"
                  onPress={() => setModalVisible(false)}
                  style={{ flex: 1 }}
                  textColor="#6B7280"
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleCreateCustomer}
                  loading={creating}
                  disabled={creating}
                  buttonColor="#2E5D36"
                  style={{ flex: 1 }}
                >
                  Create
                </Button>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: 'transparent' },
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.25)' },
  scrollContent: { paddingBottom: 120, paddingHorizontal: 20 },
  header: {
    paddingTop: 70,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  title: { color: '#FFF', fontWeight: 'bold' },
  subtitle: { color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  headerButtons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)'
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#2E5D36'
  },
  addBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    padding: 20
  },
  emptyText: { color: '#FFF', marginTop: 12, fontSize: 16 },
  emptyBtn: { marginTop: 16 },
  card: { marginBottom: 14, padding: 18 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  name: { color: '#FFF', fontWeight: 'bold', fontSize: 18, marginBottom: 2 },
  email: { color: 'rgba(255,255,255,0.85)', fontSize: 13 },
  chip: { height: 24, alignSelf: 'flex-start' },
  pendingChip: { backgroundColor: '#FEF3C7' },
  approvedChip: { backgroundColor: '#DCFCE7' },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.15)',
    paddingTop: 8
  },
  role: { color: '#A0E8AF', fontWeight: '600', fontSize: 12 },
  date: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
  approvalActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
    paddingTop: 8
  },
  actionBtn: { borderRadius: 8 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20
  },
  modalCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    elevation: 6
  },
  modalTitle: { fontWeight: 'bold', color: '#111827' },
  modalSub: { color: '#6B7280', marginBottom: 16 },
  input: { marginBottom: 12, backgroundColor: '#FFF' },
  modalBtnRow: { flexDirection: 'row', gap: 12, marginTop: 12 }
});
