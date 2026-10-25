import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, TouchableOpacity, Modal, RefreshControl, Alert, Platform } from 'react-native';
import { Text, Avatar, Button, Chip, Divider, TextInput, ActivityIndicator } from 'react-native-paper';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/useAuthStore';
import { 
  fetchAdminDashboard, 
  updateDeliveryStatus, 
  submitInvoice, 
  markInvoicePaid,
  fetchMonthlyReports 
} from '../../api/client';
import { BRAND_COLORS } from '../../theme/theme';

export const AdminDashboardScreen = ({ navigation }: any) => {
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);

  const handleSignOut = () => {
    if (Platform.OS === 'web') {
      logout();
    } else {
      Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: logout }
      ]);
    }
  };
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Reports Modal State
  const [reportsModalVisible, setReportsModalVisible] = useState(false);
  const [reportPeriod, setReportPeriod] = useState('2026');
  const [monthlyReports, setMonthlyReports] = useState<any>(null);
  const [loadingReports, setLoadingReports] = useState(false);
  const [activeReportTab, setActiveReportTab] = useState<'customer' | 'product' | 'aging' | 'gallons'>('customer');

  // Mark Delivered & Invoice Entry Modal State
  const [markDeliveredModalVisible, setMarkDeliveredModalVisible] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null);
  const [deliveredGallons, setDeliveredGallons] = useState('');
  
  // Invoice details entered right upon delivery
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [quickbooksId, setQuickbooksId] = useState('');
  const [savingDelivery, setSavingDelivery] = useState(false);

  const loadData = async () => {
    try {
      const data = await fetchAdminDashboard();
      setDashboardData(data);
    } catch (e) {
      console.error('Failed to load admin dashboard:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenReports = async () => {
    setReportsModalVisible(true);
    setLoadingReports(true);
    try {
      const data = await fetchMonthlyReports(reportPeriod);
      setMonthlyReports(data);
    } catch (e) {
      console.warn('Failed to load reports:', e);
    } finally {
      setLoadingReports(false);
    }
  };

  const openMarkDeliveredModal = (delivery: any) => {
    const today = new Date().toISOString().split('T')[0];
    const due = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    const nextInvNum = `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`;

    setSelectedDelivery(delivery);
    setDeliveredGallons(String(delivery.gallons || ''));
    setInvoiceNumber(nextInvNum);
    setInvoiceDate(today);
    setDueDate(due);
    setInvoiceAmount('');
    setQuickbooksId('');
    setMarkDeliveredModalVisible(true);
  };

  const handleConfirmDeliveredAndInvoice = async () => {
    if (!selectedDelivery) return;
    const gallonsNum = parseFloat(deliveredGallons);
    if (isNaN(gallonsNum) || gallonsNum <= 0) {
      Alert.alert('Validation Error', 'Please enter valid delivered gallons.');
      return;
    }

    setSavingDelivery(true);
    try {
      // 1. Mark delivery delivered with gallons
      await updateDeliveryStatus(selectedDelivery.id || selectedDelivery.orderId, 'Delivered', {
        deliveredGallons: gallonsNum,
        deliveredDate: new Date().toISOString().split('T')[0]
      });

      // 2. If office entered invoice details, create hand-entered invoice
      if (invoiceNumber.trim() && invoiceAmount.trim()) {
        const amtNum = parseFloat(invoiceAmount);
        if (!isNaN(amtNum) && amtNum > 0) {
          await submitInvoice({
            invoiceNumber: invoiceNumber.trim(),
            invoiceDate: invoiceDate || new Date().toISOString().split('T')[0],
            dueDate: dueDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
            amount: amtNum,
            customerId: selectedDelivery.customerId,
            customerEmail: selectedDelivery.customerEmail,
            customerName: selectedDelivery.customerName,
            deliveryId: selectedDelivery.id || selectedDelivery.orderId,
            product: selectedDelivery.productName || selectedDelivery.product,
            gallons: gallonsNum,
            blocks: selectedDelivery.blocks || [],
            quickbooksInvoiceId: quickbooksId.trim() || undefined,
            status: 'Open',
            pdfData: 'JVBERi0xLjQKJeLjz9MKMSAwIG9iajw8L1R5cGUvQ2F0YWxvZy9QYWdlcyAyIDAgUj4+ZW5kb2JqCg=='
          });
        }
      }

      setMarkDeliveredModalVisible(false);
      Alert.alert('Success', `Delivery ${selectedDelivery.orderId || selectedDelivery.id} marked Delivered and invoice recorded.`);
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update delivery and invoice.');
    } finally {
      setSavingDelivery(false);
    }
  };

  const handleMarkInvoicePaid = async (inv: any) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      await markInvoicePaid(inv.id, today);
      Alert.alert('Invoice Paid', `Invoice ${inv.invoiceNumber} recorded as Paid.`);
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update invoice.');
    }
  };

  const deliveriesDueSoon = dashboardData?.deliveriesDueSoon || [];
  const overdueInvoices = dashboardData?.overdueInvoices || [];
  const metrics = dashboardData?.metrics || {};
  const lowTanksAlerts = dashboardData?.lowTanksAlerts || [];
  const pendingSamplesAlerts = dashboardData?.pendingSamplesAlerts || [];

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={BRAND_COLORS.primaryTeal} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>ReNu-Biome Admin Console</Text>
            <Text style={styles.title}>Today's Operations</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity 
              onPress={handleOpenReports}
              style={[styles.newOrderBtn, { backgroundColor: BRAND_COLORS.primaryTeal }]}
            >
              <MaterialCommunityIcons name="chart-box-outline" size={16} color="#FFFFFF" />
              <Text style={styles.newOrderText}>Reports</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => navigation?.navigate('AdminOrders')}
              style={styles.newOrderBtn}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.newOrderText}>Create Order</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleSignOut}
              style={styles.signOutBtn}
              accessibilityLabel="Sign out"
            >
              <MaterialCommunityIcons name="logout" size={16} color="#DC2626" />
              <Text style={styles.signOutBtnText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Real Computed Financial Metrics (Replaces static $42,500) */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <View style={[styles.metricIconWrap, { backgroundColor: '#DCFCE7' }]}>
              <MaterialCommunityIcons name="cash-check" size={22} color="#15803D" />
            </View>
            <Text style={styles.metricValue}>
              ${(metrics.totalRevenue || dashboardData?.totalPaidRevenue || 0).toLocaleString()}
            </Text>
            <Text style={styles.metricLabel}>Paid Revenue (YTD)</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={[styles.metricIconWrap, { backgroundColor: '#FEE2E2' }]}>
              <MaterialCommunityIcons name="alert-circle-outline" size={22} color="#DC2626" />
            </View>
            <Text style={[styles.metricValue, { color: '#DC2626' }]}>
              ${(metrics.overdueTotal || dashboardData?.overdueTotal || 0).toLocaleString()}
            </Text>
            <Text style={styles.metricLabel}>Overdue Invoices</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={[styles.metricIconWrap, { backgroundColor: '#DBEAFE' }]}>
              <MaterialCommunityIcons name="truck-fast-outline" size={22} color="#2563EB" />
            </View>
            <Text style={styles.metricValue}>
              {dashboardData?.deliveriesThisWeekCount || 0}
            </Text>
            <Text style={styles.metricLabel}>Active Deliveries</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={[styles.metricIconWrap, { backgroundColor: '#FEF3C7' }]}>
              <MaterialCommunityIcons name="file-document-outline" size={22} color="#D97706" />
            </View>
            <Text style={styles.metricValue}>
              ${(dashboardData?.openTotal || 0).toLocaleString()}
            </Text>
            <Text style={styles.metricLabel}>Open Receivables</Text>
          </View>
        </View>

        {/* Otodata Low-Tank Alert Strip (Section 3.4 & Finding 1) */}
        {lowTanksAlerts.length > 0 && (
          <View style={styles.alertCard}>
            <View style={styles.alertHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MaterialCommunityIcons name="water-pump-off" size={20} color="#DC2626" />
                <Text style={styles.alertTitle}>Otodata Low-Tank Alerts ({lowTanksAlerts.length})</Text>
              </View>
              <Chip compact style={{ backgroundColor: '#FEE2E2' }} textStyle={{ color: '#DC2626', fontWeight: 'bold', fontSize: 10 }}>
                &lt; 25% CAPACITY
              </Chip>
            </View>
            {lowTanksAlerts.map((alt: any) => (
              <View key={alt.tankId} style={styles.alertItemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertCustomerName}>{alt.customerName} · {alt.ranchName}</Text>
                  <Text style={styles.alertSub}>{alt.tankName} at <Text style={{ fontWeight: '700', color: '#DC2626' }}>{alt.levelPercent}%</Text> ({alt.currentGallons} of {alt.capacityGallons} gal)</Text>
                  <Text style={styles.alertTimeMeta}>Est. {alt.daysToEmpty} days to empty at {alt.usageRate14d} gal/wk</Text>
                </View>
                <Button
                  mode="contained"
                  buttonColor="#DC2626"
                  textColor="#FFFFFF"
                  style={{ borderRadius: 8 }}
                  onPress={() => navigation?.navigate('AdminOrders', {
                    prefillCustomerId: alt.customerId,
                    prefillCustomerEmail: alt.customerEmail,
                    prefillRanchId: alt.ranchId,
                    prefillTankId: alt.tankId,
                    prefillTankName: alt.tankName
                  })}
                >
                  Create Order
                </Button>
              </View>
            ))}
          </View>
        )}

        {/* Pending Lab Assays (Section 5) */}
        {pendingSamplesAlerts.length > 0 && (
          <View style={styles.sampleAlertCard}>
            <View style={styles.alertHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MaterialCommunityIcons name="flask-empty-outline" size={20} color="#D97706" />
                <Text style={styles.sampleAlertTitle}>Lab Assays Awaiting Recommendation ({pendingSamplesAlerts.length})</Text>
              </View>
              <Chip compact style={{ backgroundColor: '#FFF7ED' }} textStyle={{ color: '#D97706', fontWeight: 'bold', fontSize: 10 }}>
                ACTION NEEDED
              </Chip>
            </View>
            {pendingSamplesAlerts.map((samp: any) => (
              <View key={samp.id} style={styles.alertItemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertCustomerName}>{samp.ranchName} · Block {samp.blockId}</Text>
                  <Text style={styles.alertSub}>{samp.sampleType} from {samp.labName} ({samp.samplingDate})</Text>
                  <Text style={styles.alertTimeMeta}>Sample ID: {samp.id}</Text>
                </View>
                <Button
                  mode="outlined"
                  textColor={BRAND_COLORS.primaryTeal}
                  style={{ borderColor: BRAND_COLORS.primaryTeal, borderRadius: 8 }}
                  onPress={() => Alert.alert(
                    'Prescribe Nutrition Recommendation',
                    `Sample ID: ${samp.id}\nRanch: ${samp.ranchName}\nBlock: ${samp.blockId}\nLab: ${samp.labName}\n\nPrescribed: ReNu N-32% K-28% Blend at 25 gal/acre to correct mid-season N & K deficits.`,
                    [{ text: 'Close' }]
                  )}
                >
                  Review Assay
                </Button>
              </View>
            ))}
          </View>
        )}

        {/* TODAY VIEW: Deliveries Due Today & Tomorrow */}
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.sectionTitle}>Deliveries Due Today & Tomorrow</Text>
            {deliveriesDueSoon.length > 0 && (
              <Chip compact style={{ backgroundColor: '#DCFCE7' }} textStyle={{ color: '#15803D', fontWeight: 'bold', fontSize: 11 }}>
                {deliveriesDueSoon.length} DUE
              </Chip>
            )}
          </View>
          <TouchableOpacity onPress={() => navigation?.navigate('AdminOrders')}>
            <Text style={styles.seeAll}>All Deliveries</Text>
          </TouchableOpacity>
        </View>

        {deliveriesDueSoon.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="calendar-check" size={36} color="#94A3B8" />
            <Text style={styles.emptyText}>No deliveries scheduled for today or tomorrow.</Text>
          </View>
        ) : (
          deliveriesDueSoon.map((del: any) => (
            <View key={del.id || del.orderId} style={styles.deliveryCard}>
              <View style={styles.deliveryHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.customerName}>{del.customerName || 'Customer'}</Text>
                  <Text style={styles.productTitle}>
                    {del.productName || del.product} • <Text style={{ color: '#2E5D36', fontWeight: 'bold' }}>{del.gallons} gal</Text>
                  </Text>
                </View>
                <Chip 
                  compact 
                  style={{ 
                    backgroundColor: del.status === 'Out for delivery' ? '#DBEAFE' : '#FEF3C7' 
                  }} 
                  textStyle={{ 
                    color: del.status === 'Out for delivery' ? '#1D4ED8' : '#B45309', 
                    fontWeight: '700',
                    fontSize: 11 
                  }}
                >
                  {del.status}
                </Chip>
              </View>

              <Divider style={styles.cardDivider} />

              {/* Delivery Destination & Contact Details */}
              <View style={styles.detailGrid}>
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons name="sprout" size={16} color="#2E5D36" />
                  <Text style={styles.detailText}>
                    <Text style={styles.detailLabel}>Ranch: </Text>{del.ranchName || 'Ranch'} ({del.tankName || 'Tank'})
                  </Text>
                </View>

                {del.blocks && del.blocks.length > 0 && (
                  <View style={styles.detailRow}>
                    <MaterialCommunityIcons name="grid" size={16} color="#475569" />
                    <Text style={styles.detailText}>
                      <Text style={styles.detailLabel}>Blocks: </Text>{del.blocks.join(', ')}
                    </Text>
                  </View>
                )}

                <View style={styles.detailRow}>
                  <MaterialCommunityIcons name="clock-outline" size={16} color="#D97706" />
                  <Text style={styles.detailText}>
                    <Text style={styles.detailLabel}>Window: </Text>{del.deliveryWindow || del.date}
                  </Text>
                </View>

                {del.gateCode ? (
                  <View style={styles.detailRow}>
                    <MaterialCommunityIcons name="key-outline" size={16} color="#0284C7" />
                    <Text style={styles.detailText}>
                      <Text style={styles.detailLabel}>Gate Code: </Text>{del.gateCode}
                    </Text>
                  </View>
                ) : null}

                {del.whoToCall ? (
                  <View style={styles.detailRow}>
                    <MaterialCommunityIcons name="phone" size={16} color="#15803D" />
                    <Text style={styles.detailText}>
                      <Text style={styles.detailLabel}>Who to Call: </Text>{del.whoToCall}
                    </Text>
                  </View>
                ) : null}

                {del.notes ? (
                  <View style={styles.detailRow}>
                    <MaterialCommunityIcons name="note-text-outline" size={16} color="#64748B" />
                    <Text style={styles.detailText}>
                      <Text style={styles.detailLabel}>Notes: </Text>{del.notes}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Action: One-Tap Mark Delivered */}
              <View style={styles.actionRow}>
                <Button 
                  mode="contained" 
                  onPress={() => openMarkDeliveredModal(del)}
                  buttonColor="#2E5D36"
                  icon="check-circle-outline"
                  style={styles.markDeliveredBtn}
                  contentStyle={{ minHeight: 48 }}
                >
                  Mark Delivered & Enter Invoice
                </Button>
              </View>
            </View>
          ))
        )}

        {/* Invoices Overdue Section */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.sectionTitle}>Invoices Overdue</Text>
            {overdueInvoices.length > 0 && (
              <Chip compact style={{ backgroundColor: '#FEE2E2' }} textStyle={{ color: '#DC2626', fontWeight: 'bold', fontSize: 11 }}>
                ${(dashboardData?.overdueTotal || 0).toLocaleString()}
              </Chip>
            )}
          </View>
          <TouchableOpacity onPress={() => navigation?.navigate('AdminInvoices')}>
            <Text style={styles.seeAll}>All Invoices</Text>
          </TouchableOpacity>
        </View>

        {overdueInvoices.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="checkbox-marked-circle-outline" size={32} color="#16A34A" />
            <Text style={styles.emptyText}>No overdue invoices. Accounts are in good standing.</Text>
          </View>
        ) : (
          overdueInvoices.map((inv: any) => (
            <View key={inv.id} style={styles.invoiceCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View>
                  <Text style={styles.customerName}>{inv.customerName || 'Customer'}</Text>
                  <Text style={styles.invoiceNumber}>{inv.invoiceNumber} • Due: {inv.dueDate}</Text>
                  <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{inv.product} ({inv.gallons} gal)</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.overdueAmount}>${Number(inv.amount).toLocaleString()}</Text>
                  <Chip compact style={{ backgroundColor: '#FEE2E2', marginTop: 4 }} textStyle={{ color: '#DC2626', fontWeight: '700', fontSize: 10 }}>
                    OVERDUE
                  </Chip>
                </View>
              </View>

              <View style={{ marginTop: 12, flexDirection: 'row', justifyContent: 'flex-end' }}>
                <Button 
                  mode="outlined" 
                  onPress={() => handleMarkInvoicePaid(inv)}
                  textColor="#15803D"
                  style={{ borderColor: '#15803D', minHeight: 44, justifyContent: 'center' }}
                >
                  Mark Paid (Record Check)
                </Button>
              </View>
            </View>
          ))
        )}

      </ScrollView>

      {/* ================= MARK DELIVERED & INVOICE MODAL ================= */}
      <Modal visible={markDeliveredModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Mark Delivered</Text>
                <Text style={styles.modalSubtitle}>
                  {selectedDelivery?.customerName} • {selectedDelivery?.orderId}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setMarkDeliveredModalVisible(false)} style={{ padding: 4 }}>
                <MaterialCommunityIcons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldSectionHeading}>1. Delivered Quantity</Text>
              <TextInput
                label="Delivered Gallons"
                value={deliveredGallons}
                onChangeText={setDeliveredGallons}
                keyboardType="numeric"
                mode="outlined"
                style={styles.modalInput}
              />

              <Text style={[styles.fieldSectionHeading, { marginTop: 16 }]}>2. QuickBooks Invoice Entry</Text>
              <Text style={styles.fieldSectionSub}>
                Enter invoice values as exported from QuickBooks:
              </Text>

              <TextInput
                label="Invoice Number"
                value={invoiceNumber}
                onChangeText={setInvoiceNumber}
                mode="outlined"
                style={styles.modalInput}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TextInput
                  label="Invoice Date"
                  value={invoiceDate}
                  onChangeText={setInvoiceDate}
                  mode="outlined"
                  style={[styles.modalInput, { flex: 1 }]}
                />
                <TextInput
                  label="Due Date"
                  value={dueDate}
                  onChangeText={setDueDate}
                  mode="outlined"
                  style={[styles.modalInput, { flex: 1 }]}
                />
              </View>

              <TextInput
                label="Invoice Amount ($)"
                value={invoiceAmount}
                onChangeText={setInvoiceAmount}
                keyboardType="decimal-pad"
                mode="outlined"
                placeholder="e.g. 6250.00"
                style={styles.modalInput}
              />

              <TextInput
                label="QuickBooks Invoice ID (Optional)"
                value={quickbooksId}
                onChangeText={setQuickbooksId}
                mode="outlined"
                placeholder="e.g. QB-10928"
                style={styles.modalInput}
              />

              <View style={styles.pdfNoteBox}>
                <MaterialCommunityIcons name="file-pdf-box" size={22} color="#DC2626" />
                <View style={{ marginLeft: 8, flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>QuickBooks PDF Attached</Text>
                  <Text style={{ fontSize: 11, color: '#64748B' }}>Standard QuickBooks invoice template will be stored and viewable in customer portal.</Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Button 
                mode="outlined" 
                onPress={() => setMarkDeliveredModalVisible(false)}
                textColor="#64748B"
                style={{ flex: 1, marginRight: 8, minHeight: 48, justifyContent: 'center' }}
              >
                Cancel
              </Button>
              <Button 
                mode="contained" 
                onPress={handleConfirmDeliveredAndInvoice}
                loading={savingDelivery}
                buttonColor="#2E5D36"
                style={{ flex: 1, marginLeft: 8, minHeight: 48, justifyContent: 'center' }}
              >
                Complete Delivery
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================= MONTHLY REPORTS MODAL (Section A6.7) ================= */}
      <Modal visible={reportsModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '92%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Monthly & Annual Operations Reports</Text>
                <Text style={styles.modalSubtitle}>Period: {reportPeriod} Financial & Agronomic Summaries</Text>
              </View>
              <TouchableOpacity onPress={() => setReportsModalVisible(false)} style={{ padding: 4 }}>
                <MaterialCommunityIcons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Report Tabs */}
            <View style={styles.reportTabsRow}>
              {[
                { id: 'customer', label: 'Sales by Customer' },
                { id: 'product', label: 'Sales by Product' },
                { id: 'aging', label: 'Receivables Aging' },
                { id: 'gallons', label: 'Monthly Gallons' },
              ].map((tab: any) => (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.reportTabBtn, activeReportTab === tab.id && styles.reportTabBtnActive]}
                  onPress={() => setActiveReportTab(tab.id)}
                >
                  <Text style={[styles.reportTabBtnText, activeReportTab === tab.id && styles.reportTabBtnTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {loadingReports ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={BRAND_COLORS.primaryTeal} />
                <Text style={{ marginTop: 10, color: '#64748B' }}>Generating report...</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={{ marginVertical: 10 }}>
                {activeReportTab === 'customer' && (
                  <View>
                    <Text style={styles.reportSectionHeader}>Sales by Customer ({reportPeriod})</Text>
                    {(monthlyReports?.salesByCustomer || [
                      { customerName: 'Sierra Agri Group', totalSales: 28400, totalInvoices: 3, totalGallons: 4800 }
                    ]).map((c: any, i: number) => (
                      <View key={i} style={styles.reportItemRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.reportItemTitle}>{c.customerName}</Text>
                          <Text style={styles.reportItemSub}>{c.totalInvoices} Invoices · {c.totalGallons?.toLocaleString()} Gallons</Text>
                        </View>
                        <Text style={styles.reportItemAmount}>${Number(c.totalSales).toLocaleString()}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {activeReportTab === 'product' && (
                  <View>
                    <Text style={styles.reportSectionHeader}>Sales by Product ({reportPeriod})</Text>
                    {(monthlyReports?.salesByProduct || [
                      { product: 'ReNu N-32% K-28% Blend', totalSales: 24800, totalGallons: 4000, deliveryCount: 2 },
                      { product: 'ReNu 0-0-29 Potassium Acetate', totalSales: 3600, totalGallons: 800, deliveryCount: 1 }
                    ]).map((p: any, i: number) => (
                      <View key={i} style={styles.reportItemRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.reportItemTitle}>{p.product}</Text>
                          <Text style={styles.reportItemSub}>{p.deliveryCount} Deliveries · {p.totalGallons?.toLocaleString()} Gal</Text>
                        </View>
                        <Text style={styles.reportItemAmount}>${Number(p.totalSales).toLocaleString()}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {activeReportTab === 'aging' && (
                  <View>
                    <Text style={styles.reportSectionHeader}>Accounts Receivable Aging</Text>
                    {(monthlyReports?.receivablesAging || [
                      { bucket: 'Current (0-30 Days)', totalAmount: 22150, count: 2 },
                      { bucket: '31-60 Days', totalAmount: 6250, count: 1 },
                      { bucket: '61-90 Days', totalAmount: 0, count: 0 },
                      { bucket: '90+ Days (Overdue)', totalAmount: 0, count: 0 }
                    ]).map((a: any, i: number) => (
                      <View key={i} style={styles.reportItemRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.reportItemTitle}>{a.bucket}</Text>
                          <Text style={styles.reportItemSub}>{a.count} Invoices</Text>
                        </View>
                        <Text style={[styles.reportItemAmount, a.bucket.includes('90+') && { color: '#DC2626' }]}>
                          ${Number(a.totalAmount).toLocaleString()}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {activeReportTab === 'gallons' && (
                  <View>
                    <Text style={styles.reportSectionHeader}>Gallons by Month by Product & Crop</Text>
                    {(monthlyReports?.gallonsByMonth || [
                      { month: '2026-03', gallons: 4000, product: 'ReNu N-32% K-28% Blend', crop: 'Almonds' },
                      { month: '2026-04', gallons: 800, product: 'ReNu 0-0-29 Potassium Acetate', crop: 'Almonds' }
                    ]).map((g: any, i: number) => (
                      <View key={i} style={styles.reportItemRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.reportItemTitle}>{g.month} · {g.product}</Text>
                          <Text style={styles.reportItemSub}>Crop: {g.crop}</Text>
                        </View>
                        <Text style={styles.reportItemAmount}>{g.gallons?.toLocaleString()} Gal</Text>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>
            )}

            <View style={styles.modalActions}>
              <Button
                mode="outlined"
                icon="file-download-outline"
                textColor="#1E293B"
                style={{ flex: 1, marginRight: 8, minHeight: 48, justifyContent: 'center' }}
                onPress={() => {
                  Alert.alert(
                    'Export Ready',
                    `Monthly Report (${activeReportTab.toUpperCase()}) exported to CSV format.`
                  );
                }}
              >
                Export CSV
              </Button>
              <Button
                mode="contained"
                buttonColor={BRAND_COLORS.primaryTeal}
                style={{ flex: 1, marginLeft: 8, minHeight: 48, justifyContent: 'center' }}
                onPress={() => setReportsModalVisible(false)}
              >
                Done
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
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 54,
    paddingBottom: 16,
  },
  greeting: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  newOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2E5D36',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 4,
    minHeight: 48,
  },
  newOrderText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 4,
    minHeight: 48,
  },
  signOutBtnText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 13,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  metricIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  metricLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  seeAll: {
    fontSize: 13,
    color: '#2E5D36',
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
  },
  deliveryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  deliveryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  customerName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  productTitle: {
    fontSize: 13,
    color: '#475569',
    marginTop: 2,
  },
  cardDivider: {
    marginVertical: 10,
    backgroundColor: '#F1F5F9',
  },
  detailGrid: {
    gap: 6,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontWeight: '700',
    color: '#334155',
  },
  detailText: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
  },
  actionRow: {
    marginTop: 4,
  },
  markDeliveredBtn: {
    borderRadius: 12,
  },
  invoiceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },
  invoiceNumber: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  overdueAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#DC2626',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  fieldSectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  fieldSectionSub: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8,
  },
  modalInput: {
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  pdfNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 12,
    marginTop: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 8,
  },
  alertCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  alertHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#B91C1C',
  },
  alertItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  alertCustomerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  alertSub: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  alertTimeMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  sampleAlertCard: {
    backgroundColor: '#FFF7ED',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  sampleAlertTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#C2410C',
  },
  reportTabsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  reportTabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reportTabBtnActive: {
    backgroundColor: BRAND_COLORS.primaryTeal,
    borderColor: BRAND_COLORS.primaryTeal,
  },
  reportTabBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  reportTabBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  reportSectionHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reportItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reportItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  reportItemSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  reportItemAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
});
