import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity, Alert, Modal } from 'react-native';
import { Text, TextInput, Button, Chip, Divider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { updateCustomer } from '../../api/client';

export const AdminCustomersScreen = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Create Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('Grower');
  const [creating, setCreating] = useState(false);

  // Edit Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('Grower');
  const [editStatus, setEditStatus] = useState<'APPROVED' | 'PENDING' | 'REJECTED'>('APPROVED');
  const [editPassword, setEditPassword] = useState('');
  const [updating, setUpdating] = useState(false);

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
          role: newRole
        })
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert('Success', 'Customer created successfully!');
        setNewName('');
        setNewEmail('');
        setNewPassword('');
        setNewRole('Grower');
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

  const openEditModal = (c: any) => {
    setSelectedCustomerId(c.id);
    setEditName(c.name || c.user_metadata?.full_name || '');
    setEditEmail(c.email || '');
    setEditRole(c.role || c.user_metadata?.role || 'Grower');
    setEditStatus(c.approvalStatus || c.user_metadata?.approvalStatus || 'APPROVED');
    setEditPassword('');
    setEditModalVisible(true);
  };

  const handleSaveCustomerEdit = async () => {
    if (!selectedCustomerId) return;
    if (!editEmail.trim()) {
      Alert.alert('Error', 'Email address is required');
      return;
    }

    setUpdating(true);
    try {
      const payload: any = {
        name: editName.trim(),
        email: editEmail.trim(),
        role: editRole,
        approvalStatus: editStatus,
      };
      if (editPassword.trim()) {
        payload.password = editPassword.trim();
      }

      await updateCustomer(selectedCustomerId, payload);
      Alert.alert('Success', 'Customer profile updated successfully!');
      setEditModalVisible(false);
      fetchCustomers();
    } catch (e: any) {
      console.error(e);
      Alert.alert('Error', e.message || 'Failed to update customer');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2E5D36" />
        }
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text variant="headlineMedium" style={styles.title}>Customers</Text>
            <Text variant="bodyMedium" style={styles.subtitle}>All registered clients and growers</Text>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity onPress={onRefresh} style={styles.iconBtn}>
              <Ionicons name="refresh" size={18} color="#0F172A" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addBtn}>
              <Ionicons name="add" size={18} color="#FFF" />
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color="#2E5D36" style={{ marginTop: 40 }} />
        ) : customers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color="#94A3B8" />
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
              <View key={c.id || idx} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{displayName}</Text>
                    <Text style={styles.email}>{c.email}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <Chip
                      compact
                      style={[
                        styles.chip,
                        isPending ? styles.pendingChip : styles.approvedChip
                      ]}
                      textStyle={{
                        color: isPending ? '#B45309' : '#15803D',
                        fontSize: 11,
                        fontWeight: 'bold'
                      }}
                    >
                      {status.toUpperCase()}
                    </Chip>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <View>
                    <Text style={styles.role}>Role: {displayRole}</Text>
                    {c.createdAt && (
                      <Text style={styles.date}>
                        Joined: {new Date(c.createdAt).toLocaleDateString()}
                      </Text>
                    )}
                  </View>

                  <TouchableOpacity onPress={() => openEditModal(c)} style={styles.editCardBtn}>
                    <Ionicons name="pencil" size={14} color="#2E5D36" />
                    <Text style={styles.editCardBtnText}>Edit</Text>
                  </TouchableOpacity>
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
                      Approve
                    </Button>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* ---------------- EDIT CUSTOMER MODAL ---------------- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text variant="titleLarge" style={styles.modalTitle}>Edit Customer</Text>
                <Text variant="bodySmall" style={styles.modalSub}>Update client information & status</Text>
              </View>
              <TouchableOpacity onPress={() => setEditModalVisible(false)} style={styles.closeModalBtn}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
              <TextInput
                label="Full Name"
                value={editName}
                onChangeText={setEditName}
                style={styles.input}
                mode="outlined"
                activeOutlineColor="#2E5D36"
              />

              <TextInput
                label="Email Address"
                value={editEmail}
                onChangeText={setEditEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
                mode="outlined"
                activeOutlineColor="#2E5D36"
              />

              {/* Role Selection Chips */}
              <Text style={styles.fieldSectionLabel}>Role</Text>
              <View style={styles.chipsRow}>
                {['Grower', 'Ranch Manager', 'Agronomist', 'Admin'].map(r => (
                  <TouchableOpacity
                    key={r}
                    onPress={() => setEditRole(r)}
                    style={[styles.roleSelectChip, editRole === r && styles.roleSelectChipActive]}
                  >
                    <Text style={[styles.roleSelectChipText, editRole === r && styles.roleSelectChipTextActive]}>
                      {r}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Status Selection Chips */}
              <Text style={[styles.fieldSectionLabel, { marginTop: 12 }]}>Approval Status</Text>
              <View style={styles.chipsRow}>
                {[
                  { key: 'APPROVED', label: 'Approved', color: '#15803D' },
                  { key: 'PENDING', label: 'Pending', color: '#B45309' },
                  { key: 'REJECTED', label: 'Rejected', color: '#DC2626' }
                ].map(s => (
                  <TouchableOpacity
                    key={s.key}
                    onPress={() => setEditStatus(s.key as any)}
                    style={[
                      styles.statusSelectChip,
                      editStatus === s.key && { backgroundColor: s.color, borderColor: s.color }
                    ]}
                  >
                    <Text style={[styles.statusSelectChipText, editStatus === s.key && { color: '#FFF' }]}>
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                label="Reset Password (leave empty to keep current)"
                value={editPassword}
                onChangeText={setEditPassword}
                secureTextEntry
                style={[styles.input, { marginTop: 14 }]}
                mode="outlined"
                activeOutlineColor="#2E5D36"
              />
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <Button
                mode="outlined"
                onPress={() => setEditModalVisible(false)}
                style={{ flex: 1, borderColor: '#CBD5E1' }}
                textColor="#64748B"
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleSaveCustomerEdit}
                loading={updating}
                disabled={updating}
                buttonColor="#2E5D36"
                style={{ flex: 1 }}
              >
                Save Changes
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* ---------------- CREATE CUSTOMER MODAL ---------------- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text variant="titleLarge" style={styles.modalTitle}>Add New Customer</Text>
                <Text variant="bodySmall" style={styles.modalSub}>Create a customer account directly</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeModalBtn}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <TextInput
              label="Full Name"
              value={newName}
              onChangeText={setNewName}
              style={styles.input}
              mode="outlined"
              activeOutlineColor="#2E5D36"
            />

            <TextInput
              label="Email Address"
              value={newEmail}
              onChangeText={setNewEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
              mode="outlined"
              activeOutlineColor="#2E5D36"
            />

            <TextInput
              label="Password (optional, default: Customer123!)"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              style={styles.input}
              mode="outlined"
              activeOutlineColor="#2E5D36"
            />

            <Text style={styles.fieldSectionLabel}>Role</Text>
            <View style={styles.chipsRow}>
              {['Grower', 'Ranch Manager', 'Agronomist'].map(r => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setNewRole(r)}
                  style={[styles.roleSelectChip, newRole === r && styles.roleSelectChipActive]}
                >
                  <Text style={[styles.roleSelectChipText, newRole === r && styles.roleSelectChipTextActive]}>
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalBtnRow}>
              <Button
                mode="text"
                onPress={() => setModalVisible(false)}
                style={{ flex: 1 }}
                textColor="#64748B"
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: '#0F172A',
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#64748B',
    marginTop: 2,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#2E5D36',
  },
  addBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    padding: 20,
  },
  emptyText: {
    color: '#64748B',
    marginTop: 12,
    fontSize: 16,
  },
  emptyBtn: {
    marginTop: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
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
  name: {
    color: '#0F172A',
    fontWeight: 'bold',
    fontSize: 17,
    marginBottom: 2,
  },
  email: {
    color: '#64748B',
    fontSize: 13,
  },
  chip: {
    height: 24,
    alignSelf: 'flex-start',
  },
  pendingChip: {
    backgroundColor: '#FEF3C7',
  },
  approvedChip: {
    backgroundColor: '#DCFCE7',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  role: {
    color: '#2E5D36',
    fontWeight: '600',
    fontSize: 12,
  },
  date: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  editCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  editCardBtnText: {
    color: '#2E5D36',
    fontWeight: '700',
    fontSize: 12,
  },
  approvalActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
    paddingTop: 8,
  },
  actionBtn: {
    borderRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    maxHeight: '90%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  modalTitle: {
    fontWeight: 'bold',
    color: '#0F172A',
  },
  modalSub: {
    color: '#64748B',
  },
  closeModalBtn: {
    padding: 4,
  },
  input: {
    marginBottom: 12,
    backgroundColor: '#FFF',
  },
  fieldSectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
    marginTop: 4,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  roleSelectChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  roleSelectChipActive: {
    backgroundColor: '#2E5D36',
    borderColor: '#2E5D36',
  },
  roleSelectChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  roleSelectChipTextActive: {
    color: '#FFF',
  },
  statusSelectChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusSelectChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
});
