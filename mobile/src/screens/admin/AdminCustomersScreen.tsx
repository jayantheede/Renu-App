import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert, Modal, Platform } from 'react-native';
import { Text, TextInput, Button, Chip, Divider, Checkbox } from 'react-native-paper';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { 
  submitRanch, 
  submitBlock, 
  submitTankSetup, 
  submitDelivery, 
  fetchProducts, 
  fetchRanches 
} from '../../api/client';

export const AdminCustomersScreen = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [allRanches, setAllRanches] = useState<any[]>([]);
  const [productsList, setProductsList] = useState<any[]>([]);

  // 1. Create Single Customer Login Modal State (Admin types name, email, phone, password)
  const [createCustomerModalVisible, setCreateCustomerModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [creating, setCreating] = useState(false);

  // 2. Reset Password Modal State
  const [resetPasswordModalVisible, setResetPasswordModalVisible] = useState(false);
  const [selectedCustomerForPassword, setSelectedCustomerForPassword] = useState<any>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  // 3. Drilldown: Ranches, Blocks & Tanks Modal State
  const [drilldownModalVisible, setDrilldownModalVisible] = useState(false);
  const [activeCustomer, setActiveCustomer] = useState<any>(null);

  // Add Ranch submodal
  const [addRanchModalVisible, setAddRanchModalVisible] = useState(false);
  const [ranchName, setRanchName] = useState('');
  const [ranchLocation, setRanchLocation] = useState('');
  const [savingRanch, setSavingRanch] = useState(false);

  // Add Block submodal
  const [addBlockModalVisible, setAddBlockModalVisible] = useState(false);
  const [targetRanchForBlock, setTargetRanchForBlock] = useState<any>(null);
  const [blockIdInput, setBlockIdInput] = useState('');
  const [blockCrop, setBlockCrop] = useState('Almond');
  const [blockVariety, setBlockVariety] = useState('');
  const [blockRootstock, setBlockRootstock] = useState('');
  const [blockAcreage, setBlockAcreage] = useState('');
  const [blockPlantingYear, setBlockPlantingYear] = useState('');
  const [blockIrrigation, setBlockIrrigation] = useState('Drip');
  const [blockFertigationSet, setBlockFertigationSet] = useState('');
  const [blockCounty, setBlockCounty] = useState('Fresno County');
  const [blockApns, setBlockApns] = useState('');
  const [savingBlock, setSavingBlock] = useState(false);

  // Add Tank submodal (Plain form, NO map)
  const [addTankModalVisible, setAddTankModalVisible] = useState(false);
  const [targetRanchForTank, setTargetRanchForTank] = useState<any>(null);
  const [tankNameInput, setTankNameInput] = useState('');
  const [tankCapacityInput, setTankCapacityInput] = useState('');
  const [tankLocationInput, setTankLocationInput] = useState('');
  const [savingTank, setSavingTank] = useState(false);

  // 4. Create Order Modal State (from Customer screen)
  const [createOrderModalVisible, setCreateOrderModalVisible] = useState(false);
  const [orderCustomer, setOrderCustomer] = useState<any>(null);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [orderGallons, setOrderGallons] = useState('');
  const [orderRanchId, setOrderRanchId] = useState('');
  const [orderTankId, setOrderTankId] = useState('');
  const [orderBlocksSelected, setOrderBlocksSelected] = useState<string[]>([]);
  const [orderDate, setOrderDate] = useState('');
  const [orderWindow, setOrderWindow] = useState('Morning (8:00 AM - 12:00 PM)');
  const [orderGateCode, setOrderGateCode] = useState('');
  const [orderWhoToCall, setOrderWhoToCall] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [savingOrder, setSavingOrder] = useState(false);

  const BACKEND_URL = (process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000').replace(/\/+$/, '');

  const loadData = useCallback(async () => {
    try {
      const [custRes, ranches, products] = await Promise.all([
        fetch(`${BACKEND_URL}/api/admin/customers`),
        fetchRanches().catch(() => []),
        fetchProducts().catch(() => [])
      ]);
      const custData = await custRes.json();
      setCustomers(Array.isArray(custData) ? custData : []);
      setAllRanches(Array.isArray(ranches) ? ranches : []);
      setProductsList(Array.isArray(products) ? products : []);
    } catch (e) {
      console.error('Failed to fetch customers & data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [BACKEND_URL]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Admin creates customer single login
  const handleCreateCustomer = async () => {
    if (!newEmail.trim()) {
      Alert.alert('Validation Error', 'Please enter a valid customer email.');
      return;
    }
    if (!newPassword.trim()) {
      Alert.alert('Validation Error', 'Please enter a password for this customer.');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim() || newEmail.split('@')[0],
          email: newEmail.trim(),
          phone: newPhone.trim(),
          password: newPassword.trim(),
          role: 'client'
        })
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert(
          'Customer Account Created',
          `Customer ${newName || newEmail} created. Password: "${newPassword}". Provide this password to the grower by phone.`
        );
        setNewName('');
        setNewEmail('');
        setNewPhone('');
        setNewPassword('');
        setCreateCustomerModalVisible(false);
        loadData();
      } else {
        Alert.alert('Error', data?.error || 'Failed to create customer');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Network request failed');
    } finally {
      setCreating(false);
    }
  };

  // Reset Password by Admin
  const handleResetPassword = async () => {
    if (!selectedCustomerForPassword || !resetPasswordValue.trim()) {
      Alert.alert('Validation Error', 'Please enter the new password.');
      return;
    }
    setResettingPassword(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/customers/${selectedCustomerForPassword.id}/reset-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: resetPasswordValue.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert(
          'Password Reset',
          `Password updated for ${selectedCustomerForPassword.name || selectedCustomerForPassword.email}. Provide new password to customer.`
        );
        setResetPasswordValue('');
        setResetPasswordModalVisible(false);
      } else {
        Alert.alert('Error', data?.error || 'Failed to reset password');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to reset password');
    } finally {
      setResettingPassword(false);
    }
  };

  // Open drilldown
  const openDrilldown = (customer: any) => {
    setActiveCustomer(customer);
    setDrilldownModalVisible(true);
  };

  // Customer Ranches
  const customerRanches = activeCustomer 
    ? allRanches.filter(r => r.customerId === activeCustomer.id || r.customerEmail?.toLowerCase() === activeCustomer.email?.toLowerCase())
    : [];

  // Add Ranch
  const handleAddRanch = async () => {
    if (!ranchName.trim() || !activeCustomer) {
      Alert.alert('Required', 'Please enter a ranch name and choose a customer.');
      return;
    }
    setSavingRanch(true);
    try {
      await submitRanch({
        name: ranchName.trim(),
        location: ranchLocation.trim() || 'Fresno County, CA',
        county: ranchLocation.trim() || 'Fresno County',
        customerId: activeCustomer.id,
        customerEmail: activeCustomer.email
      });
      const savedName = ranchName.trim();
      setRanchName('');
      setRanchLocation('');
      setAddRanchModalVisible(false);
      await loadData();
      Alert.alert('Ranch Added', `Ranch "${savedName}" was successfully added to ${activeCustomer.name || activeCustomer.email}.`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to add ranch');
    } finally {
      setSavingRanch(false);
    }
  };

  // Add Block
  const handleAddBlock = async () => {
    if (!targetRanchForBlock || !blockIdInput.trim()) {
      Alert.alert('Error', 'Block ID is required.');
      return;
    }
    const acNum = parseFloat(blockAcreage);
    if (isNaN(acNum) || acNum <= 0) {
      Alert.alert('Error', 'Please enter a valid acreage number.');
      return;
    }
    setSavingBlock(true);
    try {
      await submitBlock(targetRanchForBlock.id, {
        blockId: blockIdInput.trim(),
        crop: blockCrop.trim(),
        variety: blockVariety.trim(),
        rootstock: blockRootstock.trim(),
        acreage: acNum,
        plantingYear: parseInt(blockPlantingYear) || 2020,
        irrigationType: blockIrrigation.trim(),
        fertigationSet: blockFertigationSet.trim(),
        county: blockCounty.trim(),
        apns: blockApns.split(',').map(s => s.trim()).filter(Boolean)
      });
      setBlockIdInput('');
      setBlockVariety('');
      setBlockRootstock('');
      setBlockAcreage('');
      setBlockFertigationSet('');
      setBlockApns('');
      setAddBlockModalVisible(false);
      await loadData();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to add block');
    } finally {
      setSavingBlock(false);
    }
  };

  // Add Tank (Plain form, NO map)
  const handleAddTank = async () => {
    if (!targetRanchForTank || !tankNameInput.trim()) {
      Alert.alert('Error', 'Tank name is required.');
      return;
    }
    const capNum = parseFloat(tankCapacityInput) || 5000;
    setSavingTank(true);
    try {
      await submitTankSetup({
        ranchId: targetRanchForTank.id,
        name: tankNameInput.trim(),
        capacity: capNum,
        location: tankLocationInput.trim() || 'Ranch primary pad'
      });
      setTankNameInput('');
      setTankCapacityInput('');
      setTankLocationInput('');
      setAddTankModalVisible(false);
      await loadData();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to add tank');
    } finally {
      setSavingTank(false);
    }
  };

  // Open Create Order Modal
  const openCreateOrderModal = (customer: any) => {
    const today = new Date().toISOString().split('T')[0];
    setOrderCustomer(customer);
    setSelectedProduct(productsList[0]?.name || 'Bio-Gro Nitrogen Optimizer');
    setOrderGallons('');
    const cRanches = allRanches.filter(r => r.customerId === customer.id || r.customerEmail?.toLowerCase() === customer.email?.toLowerCase());
    const defaultRanch = cRanches[0];
    setOrderRanchId(defaultRanch?.id || '');
    setOrderTankId(defaultRanch?.tanks?.[0]?.id || '');
    setOrderBlocksSelected([]);
    setOrderDate(today);
    setOrderWindow('Morning (8:00 AM - 12:00 PM)');
    setOrderGateCode('#4821');
    setOrderWhoToCall(customer.phone ? `${customer.name} (${customer.phone})` : customer.name);
    setOrderNotes('');
    setCreateOrderModalVisible(true);
  };

  // Submit Order Created by Admin
  const handleSaveOrder = async () => {
    if (!orderCustomer || !orderGallons.trim()) {
      Alert.alert('Validation Error', 'Please enter gallon quantity.');
      return;
    }
    const galNum = parseFloat(orderGallons);
    if (isNaN(galNum) || galNum <= 0) {
      Alert.alert('Validation Error', 'Please enter valid gallons.');
      return;
    }
    setSavingOrder(true);
    try {
      const ranchObj = allRanches.find(r => r.id === orderRanchId);
      const tankObj = ranchObj?.tanks?.find((t: any) => t.id === orderTankId);

      await submitDelivery({
        customerId: orderCustomer.id,
        customerEmail: orderCustomer.email,
        customerName: orderCustomer.name,
        product: selectedProduct,
        productName: selectedProduct,
        gallons: galNum,
        ranchId: orderRanchId,
        ranchName: ranchObj?.name || 'Ranch',
        tankId: orderTankId,
        tankName: tankObj?.name || 'Tank',
        blocks: orderBlocksSelected,
        date: orderDate || new Date().toISOString().split('T')[0],
        deliveryWindow: orderWindow,
        gateCode: orderGateCode.trim(),
        whoToCall: orderWhoToCall.trim(),
        notes: orderNotes.trim(),
        status: 'Scheduled'
      });

      Alert.alert('Delivery Scheduled', `Order created and scheduled for ${orderCustomer.name}. Customer will receive email confirmation.`);
      setCreateOrderModalVisible(false);
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create order');
    } finally {
      setSavingOrder(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor="#0C6054" />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Customers & Accounts</Text>
            <Text style={styles.subtitle}>Maintain growers, ranches, blocks & logins</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity 
              onPress={() => {
                if (customers.length > 0 && !activeCustomer) {
                  setActiveCustomer(customers[0]);
                }
                setRanchName('');
                setRanchLocation('Fresno County, CA');
                setAddRanchModalVisible(true);
              }} 
              style={[styles.addBtn, { backgroundColor: '#15803D' }]}
            >
              <MaterialCommunityIcons name="plus" size={18} color="#FFF" />
              <Text style={styles.addBtnText}>Add Ranch</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setCreateCustomerModalVisible(true)} 
              style={styles.addBtn}
            >
              <Ionicons name="person-add-outline" size={18} color="#FFF" />
              <Text style={styles.addBtnText}>Add Customer</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Customer Cards List */}
        {customers.map((c: any) => (
          <View key={c.id} style={styles.customerCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.customerName}>{c.name || 'Unnamed Grower'}</Text>
                <Text style={styles.customerContact}>{c.email} {c.phone ? `• ${c.phone}` : ''}</Text>
              </View>
              <Chip compact style={{ backgroundColor: '#F0FDF4' }} textStyle={{ color: '#166534', fontWeight: '700', fontSize: 11 }}>
                Account Active
              </Chip>
            </View>

            {/* Metrics Row */}
            <View style={styles.customerMetricsRow}>
              <View style={styles.metricItem}>
                <Text style={styles.metricVal}>{c.ranchesCount || 0}</Text>
                <Text style={styles.metricLbl}>Ranches</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricVal}>{Number(c.totalAcres || 0).toFixed(1)}</Text>
                <Text style={styles.metricLbl}>Total Acres</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricVal}>{(c.ytdGallons || 0).toLocaleString()}</Text>
                <Text style={styles.metricLbl}>YTD Gal</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={[styles.metricVal, { color: (c.openBalance || 0) > 0 ? '#DC2626' : '#15803D' }]}>
                  ${(c.openBalance || 0).toLocaleString()}
                </Text>
                <Text style={styles.metricLbl}>Open Bal</Text>
              </View>
            </View>

            <Divider style={{ marginVertical: 12, backgroundColor: '#F1F5F9' }} />

            {/* Customer Operations Buttons */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Button 
                mode="contained" 
                onPress={() => openDrilldown(c)}
                buttonColor="#0C6054"
                icon="tree-outline"
                style={{ borderRadius: 10, flex: 1, minWidth: 150 }}
                contentStyle={{ minHeight: 48 }}
              >
                Ranches & Blocks
              </Button>

              <Button 
                mode="outlined" 
                onPress={() => openCreateOrderModal(c)}
                textColor="#0C6054"
                style={{ borderColor: '#0C6054', borderRadius: 10, flex: 1, minWidth: 130 }}
                contentStyle={{ minHeight: 48 }}
              >
                Create Order
              </Button>

              <Button 
                mode="text" 
                onPress={() => {
                  setSelectedCustomerForPassword(c);
                  setResetPasswordValue('');
                  setResetPasswordModalVisible(true);
                }}
                textColor="#64748B"
                style={{ minHeight: 48, justifyContent: 'center' }}
              >
                Reset Password
              </Button>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* ================= CREATE CUSTOMER MODAL ================= */}
      <Modal visible={createCustomerModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Create Customer Login</Text>
                <Text style={styles.modalSubtitle}>Create single login; give password by phone</Text>
              </View>
              <TouchableOpacity onPress={() => setCreateCustomerModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <TextInput
              label="Company / Farm Name"
              value={newName}
              onChangeText={setNewName}
              mode="outlined"
              placeholder="e.g. Central Valley Orchards"
              style={styles.modalInput}
            />
            <TextInput
              label="Email (Login ID)"
              value={newEmail}
              onChangeText={setNewEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              mode="outlined"
              style={styles.modalInput}
            />
            <TextInput
              label="Mobile Number"
              value={newPhone}
              onChangeText={setNewPhone}
              keyboardType="phone-pad"
              mode="outlined"
              placeholder="e.g. (559) 555-0100"
              style={styles.modalInput}
            />
            <TextInput
              label="Password (Admin Types)"
              value={newPassword}
              onChangeText={setNewPassword}
              mode="outlined"
              placeholder="Type initial password"
              style={styles.modalInput}
            />

            <View style={styles.modalActions}>
              <Button 
                mode="outlined" 
                onPress={() => setCreateCustomerModalVisible(false)}
                textColor="#64748B"
                style={{ flex: 1, marginRight: 8, minHeight: 48, justifyContent: 'center' }}
              >
                Cancel
              </Button>
              <Button 
                mode="contained" 
                onPress={handleCreateCustomer}
                loading={creating}
                buttonColor="#0C6054"
                style={{ flex: 1, marginLeft: 8, minHeight: 48, justifyContent: 'center' }}
              >
                Save Login
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================= RESET PASSWORD MODAL ================= */}
      <Modal visible={resetPasswordModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Reset Customer Password</Text>
                <Text style={styles.modalSubtitle}>
                  {selectedCustomerForPassword?.name} ({selectedCustomerForPassword?.email})
                </Text>
              </View>
              <TouchableOpacity onPress={() => setResetPasswordModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <TextInput
              label="New Password"
              value={resetPasswordValue}
              onChangeText={setResetPasswordValue}
              mode="outlined"
              placeholder="Type new password"
              style={styles.modalInput}
            />

            <View style={styles.modalActions}>
              <Button 
                mode="outlined" 
                onPress={() => setResetPasswordModalVisible(false)}
                textColor="#64748B"
                style={{ flex: 1, marginRight: 8, minHeight: 48, justifyContent: 'center' }}
              >
                Cancel
              </Button>
              <Button 
                mode="contained" 
                onPress={handleResetPassword}
                loading={resettingPassword}
                buttonColor="#0C6054"
                style={{ flex: 1, marginLeft: 8, minHeight: 48, justifyContent: 'center' }}
              >
                Update Password
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================= DRILLDOWN: RANCHES, BLOCKS & TANKS ================= */}
      <Modal visible={drilldownModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '92%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{activeCustomer?.name} - Ranches</Text>
                <Text style={styles.modalSubtitle}>Computed acreage, block table & tanks</Text>
              </View>
              <TouchableOpacity onPress={() => setDrilldownModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
                  Ranches ({customerRanches.length})
                </Text>
                <Button 
                  mode="contained" 
                  onPress={() => setAddRanchModalVisible(true)}
                  buttonColor="#0C6054"
                  compact
                  icon="plus"
                >
                  Add Ranch
                </Button>
              </View>

              {customerRanches.length === 0 ? (
                <Text style={{ color: '#64748B', fontStyle: 'italic', paddingVertical: 12 }}>
                  No ranches recorded. Tap "Add Ranch" to create one.
                </Text>
              ) : (
                customerRanches.map((r: any) => {
                  const blocks = r.blocks || [];
                  const tanks = r.tanks || [];
                  const computedAcres = blocks.reduce((sum: number, b: any) => sum + (Number(b.acreage) || 0), 0);

                  return (
                    <View key={r.id} style={styles.drilldownRanchCard}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View>
                          <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>{r.name}</Text>
                          <Text style={{ fontSize: 12, color: '#64748B' }}>{r.location}</Text>
                        </View>
                        <Chip compact style={{ backgroundColor: '#DCFCE7' }} textStyle={{ color: '#166534', fontWeight: '800' }}>
                          {computedAcres.toFixed(1)} Acres (Computed)
                        </Chip>
                      </View>

                      {/* BLOCKS SECTION */}
                      <View style={{ marginTop: 12, backgroundColor: '#F8FAFC', padding: 10, borderRadius: 12 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>
                            Planted Blocks ({blocks.length})
                          </Text>
                          <Button 
                            mode="text" 
                            compact 
                            onPress={() => {
                              setTargetRanchForBlock(r);
                              setAddBlockModalVisible(true);
                            }}
                            textColor="#0C6054"
                          >
                            + Add Block
                          </Button>
                        </View>

                        {blocks.map((b: any, bIdx: number) => (
                          <View key={b.id || bIdx} style={{ paddingVertical: 4, borderBottomWidth: bIdx === blocks.length - 1 ? 0 : 1, borderBottomColor: '#E2E8F0' }}>
                            <Text style={{ fontWeight: '700', fontSize: 13, color: '#1E293B' }}>
                              Block {b.blockId || b.id}: {b.crop} ({b.variety || 'Standard'}, {b.rootstock || 'Rootstock'})
                            </Text>
                            <Text style={{ fontSize: 12, color: '#64748B' }}>
                              {b.acreage} ac • Planted {b.plantingYear} • APN: {Array.isArray(b.apns) ? b.apns.join(', ') : b.apns}
                            </Text>
                          </View>
                        ))}
                      </View>

                      {/* TANKS REGISTER (Plain form, NO map) */}
                      <View style={{ marginTop: 10, backgroundColor: '#F8FAFC', padding: 10, borderRadius: 12 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>
                            Tank Register ({tanks.length})
                          </Text>
                          <Button 
                            mode="text" 
                            compact 
                            onPress={() => {
                              setTargetRanchForTank(r);
                              setAddTankModalVisible(true);
                            }}
                            textColor="#0C6054"
                          >
                            + Add Tank
                          </Button>
                        </View>

                        {tanks.map((t: any, tIdx: number) => (
                          <View key={t.id || tIdx} style={{ paddingVertical: 4 }}>
                            <Text style={{ fontWeight: '700', fontSize: 12, color: '#1E293B' }}>
                              {t.name} • {t.capacity} gal ({t.location || 'Pad'})
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>

            <Button 
              mode="contained" 
              onPress={() => setDrilldownModalVisible(false)}
              buttonColor="#0C6054"
              style={{ marginTop: 14, minHeight: 48, justifyContent: 'center' }}
            >
              Close
            </Button>
          </View>
        </View>
      </Modal>

      {/* ================= SUBMODAL: ADD RANCH ================= */}
      <Modal visible={addRanchModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Ranch</Text>
            <Text style={{ fontSize: 13, color: '#64748B', marginBottom: 12 }}>
              Assign to: <Text style={{ fontWeight: '700', color: '#1E293B' }}>{activeCustomer?.name || activeCustomer?.email || 'Select Customer'}</Text>
            </Text>

            {customers.length > 1 && (
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 }}>
                  Choose Customer / Grower:
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginBottom: 4 }}>
                  {customers.map((c: any) => {
                    const isSelected = activeCustomer?.id === c.id;
                    return (
                      <TouchableOpacity
                        key={c.id}
                        onPress={() => setActiveCustomer(c)}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 20,
                          backgroundColor: isSelected ? '#0C6054' : '#F1F5F9',
                          marginRight: 8,
                          borderWidth: 1,
                          borderColor: isSelected ? '#0C6054' : '#CBD5E1'
                        }}
                      >
                        <Text style={{ color: isSelected ? '#FFFFFF' : '#334155', fontSize: 12, fontWeight: isSelected ? '700' : '500' }}>
                          {c.name || c.email}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            <TextInput
              label="Ranch Name *"
              value={ranchName}
              onChangeText={setRanchName}
              mode="outlined"
              placeholder="e.g. Bear Creek Ranch"
              style={styles.modalInput}
            />
            <TextInput
              label="Location / County *"
              value={ranchLocation}
              onChangeText={setRanchLocation}
              mode="outlined"
              placeholder="e.g. Fresno County, CA"
              style={styles.modalInput}
            />
            <View style={styles.modalActions}>
              <Button mode="outlined" onPress={() => setAddRanchModalVisible(false)} textColor="#64748B" style={{ flex: 1, marginRight: 8, minHeight: 48, justifyContent: 'center' }}>Cancel</Button>
              <Button mode="contained" onPress={handleAddRanch} loading={savingRanch} buttonColor="#0C6054" style={{ flex: 1, marginLeft: 8, minHeight: 48, justifyContent: 'center' }}>Save Ranch</Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================= SUBMODAL: ADD BLOCK ================= */}
      <Modal visible={addBlockModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <Text style={styles.modalTitle}>Add Block to {targetRanchForBlock?.name}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <TextInput label="Block ID (e.g. N-4)" value={blockIdInput} onChangeText={setBlockIdInput} mode="outlined" style={styles.modalInput} />
              <TextInput label="Crop (almond, pistachio, grape)" value={blockCrop} onChangeText={setBlockCrop} mode="outlined" style={styles.modalInput} />
              <TextInput label="Variety" value={blockVariety} onChangeText={setBlockVariety} mode="outlined" placeholder="e.g. Nonpareil" style={styles.modalInput} />
              <TextInput label="Rootstock" value={blockRootstock} onChangeText={setBlockRootstock} mode="outlined" placeholder="e.g. Nemaguard" style={styles.modalInput} />
              <TextInput label="Acreage" value={blockAcreage} onChangeText={setBlockAcreage} keyboardType="numeric" mode="outlined" placeholder="e.g. 45" style={styles.modalInput} />
              <TextInput label="Planting Year" value={blockPlantingYear} onChangeText={setBlockPlantingYear} keyboardType="numeric" mode="outlined" placeholder="e.g. 2018" style={styles.modalInput} />
              <TextInput label="Irrigation Type" value={blockIrrigation} onChangeText={setBlockIrrigation} mode="outlined" placeholder="Drip / Micro-sprinkler" style={styles.modalInput} />
              <TextInput label="Fertigation Set / Valve" value={blockFertigationSet} onChangeText={setBlockFertigationSet} mode="outlined" placeholder="Set 1 Valve B" style={styles.modalInput} />
              <TextInput label="County" value={blockCounty} onChangeText={setBlockCounty} mode="outlined" style={styles.modalInput} />
              <TextInput label="APN(s) (comma separated)" value={blockApns} onChangeText={setBlockApns} mode="outlined" placeholder="e.g. 042-120-008, 042-120-009" style={styles.modalInput} />
            </ScrollView>
            <View style={styles.modalActions}>
              <Button mode="outlined" onPress={() => setAddBlockModalVisible(false)} textColor="#64748B" style={{ flex: 1, marginRight: 8, minHeight: 48, justifyContent: 'center' }}>Cancel</Button>
              <Button mode="contained" onPress={handleAddBlock} loading={savingBlock} buttonColor="#0C6054" style={{ flex: 1, marginLeft: 8, minHeight: 48, justifyContent: 'center' }}>Save Block</Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================= SUBMODAL: ADD TANK (NO MAP) ================= */}
      <Modal visible={addTankModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Tank to {targetRanchForTank?.name}</Text>
            <TextInput label="Tank Name" value={tankNameInput} onChangeText={setTankNameInput} mode="outlined" placeholder="e.g. North Ag Tank #1" style={styles.modalInput} />
            <TextInput label="Capacity (Gallons)" value={tankCapacityInput} onChangeText={setTankCapacityInput} keyboardType="numeric" mode="outlined" placeholder="e.g. 6500" style={styles.modalInput} />
            <TextInput label="Location / Description" value={tankLocationInput} onChangeText={setTankLocationInput} mode="outlined" placeholder="e.g. Well #3 Pad" style={styles.modalInput} />
            <View style={styles.modalActions}>
              <Button mode="outlined" onPress={() => setAddTankModalVisible(false)} textColor="#64748B" style={{ flex: 1, marginRight: 8, minHeight: 48, justifyContent: 'center' }}>Cancel</Button>
              <Button mode="contained" onPress={handleAddTank} loading={savingTank} buttonColor="#0C6054" style={{ flex: 1, marginLeft: 8, minHeight: 48, justifyContent: 'center' }}>Save Tank</Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================= CREATE ORDER MODAL ================= */}
      <Modal visible={createOrderModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Create Delivery Order</Text>
                <Text style={styles.modalSubtitle}>For {orderCustomer?.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setCreateOrderModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldSectionHeading}>Product & Volume</Text>
              {productsList.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => setSelectedProduct(p.name)}
                  style={[
                    styles.radioItem,
                    selectedProduct === p.name && styles.radioItemSelected
                  ]}
                >
                  <Text style={{ fontWeight: '700', color: selectedProduct === p.name ? '#15803D' : '#1E293B' }}>{p.name}</Text>
                  <Text style={{ fontSize: 11, color: '#64748B' }}>{p.analysis || p.description}</Text>
                </TouchableOpacity>
              ))}

              <TextInput
                label="Quantity in Gallons"
                value={orderGallons}
                onChangeText={setOrderGallons}
                keyboardType="numeric"
                mode="outlined"
                placeholder="e.g. 500"
                style={styles.modalInput}
              />

              <Text style={[styles.fieldSectionHeading, { marginTop: 12 }]}>Ranch & Tank Destination</Text>
              {allRanches
                .filter(r => r.customerId === orderCustomer?.id || r.customerEmail?.toLowerCase() === orderCustomer?.email?.toLowerCase())
                .map((r) => (
                  <TouchableOpacity
                    key={r.id}
                    onPress={() => {
                      setOrderRanchId(r.id);
                      setOrderTankId(r.tanks?.[0]?.id || '');
                    }}
                    style={[styles.radioItem, orderRanchId === r.id && styles.radioItemSelected]}
                  >
                    <Text style={{ fontWeight: '700' }}>{r.name}</Text>
                    <Text style={{ fontSize: 11, color: '#64748B' }}>
                      Tanks: {(r.tanks || []).map((t: any) => t.name).join(', ') || 'No registered tanks'}
                    </Text>
                  </TouchableOpacity>
                ))}

              <TextInput
                label="Requested Delivery Window"
                value={orderWindow}
                onChangeText={setOrderWindow}
                mode="outlined"
                placeholder="Morning / Afternoon + Date"
                style={styles.modalInput}
              />

              <TextInput
                label="Gate Code"
                value={orderGateCode}
                onChangeText={setOrderGateCode}
                mode="outlined"
                placeholder="e.g. #4821"
                style={styles.modalInput}
              />

              <TextInput
                label="Who to Call on Arrival"
                value={orderWhoToCall}
                onChangeText={setOrderWhoToCall}
                mode="outlined"
                style={styles.modalInput}
              />

              <TextInput
                label="Delivery Notes"
                value={orderNotes}
                onChangeText={setOrderNotes}
                mode="outlined"
                multiline
                numberOfLines={2}
                style={styles.modalInput}
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <Button mode="outlined" onPress={() => setCreateOrderModalVisible(false)} textColor="#64748B" style={{ flex: 1, marginRight: 8, minHeight: 48, justifyContent: 'center' }}>Cancel</Button>
              <Button mode="contained" onPress={handleSaveOrder} loading={savingOrder} buttonColor="#0C6054" style={{ flex: 1, marginLeft: 8, minHeight: 48, justifyContent: 'center' }}>Schedule Order</Button>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { paddingBottom: 120, paddingHorizontal: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 54,
    paddingBottom: 16,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#0F172A' },
  subtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0C6054',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 4,
    minHeight: 48,
  },
  addBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  customerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  customerName: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  customerContact: { fontSize: 12, color: '#64748B', marginTop: 2 },
  customerMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
  },
  metricItem: { alignItems: 'center', flex: 1 },
  metricVal: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  metricLbl: { fontSize: 11, color: '#64748B', marginTop: 2 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  modalTitle: { fontSize: 19, fontWeight: '800', color: '#0F172A' },
  modalSubtitle: { fontSize: 12, color: '#64748B', marginTop: 2 },
  modalInput: { marginBottom: 10, backgroundColor: '#FFFFFF' },
  modalActions: { flexDirection: 'row', marginTop: 12 },
  drilldownRanchCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  fieldSectionHeading: { fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 6 },
  radioItem: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 6,
  },
  radioItemSelected: {
    backgroundColor: '#F0FDF4',
    borderColor: '#0C6054',
  },
});
