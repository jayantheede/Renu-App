import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert, Modal, TouchableOpacity, Platform, Image } from 'react-native';
import { Text, TextInput, Button, Chip, Divider } from 'react-native-paper';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { InvoiceLogo } from '../../components/InvoiceLogo';
import {
  fetchInvoices,
  submitInvoice,
  markInvoicePaid,
  voidInvoice,
  updateInvoice,
  fetchDeliveries,
  fetchCustomers
} from '../../api/client';
import { printInvoiceDocument } from '../../utils/printInvoice';

export const AdminInvoicesScreen = () => {
  const insets = useSafeAreaInsets();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'All' | 'Open' | 'Overdue' | 'Paid' | 'Void'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Hand-Entered Invoice Modal
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newInvoiceNumber, setNewInvoiceNumber] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('Sierra Agri Group');
  const [newCustomerEmail, setNewCustomerEmail] = useState('customer@renu.com');
  const [newDeliveryId, setNewDeliveryId] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newInvoiceDate, setNewInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [newDueDate, setNewDueDate] = useState(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
  const [newProduct, setNewProduct] = useState('ReNu N-32% K-28% Blend');
  const [newGallons, setNewGallons] = useState('');
  const [newQuickbooksId, setNewQuickbooksId] = useState('');
  const [savingInvoice, setSavingInvoice] = useState(false);

  // Mark Paid Modal
  const [payModalVisible, setPayModalVisible] = useState(false);
  const [invoiceToPay, setInvoiceToPay] = useState<any>(null);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [markingPaid, setMarkingPaid] = useState(false);

  // View / Print PDF Modal
  const [pdfModalVisible, setPdfModalVisible] = useState(false);
  const [selectedInvoiceForPdf, setSelectedInvoiceForPdf] = useState<any>(null);

  // Edit Invoice Modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const [editNumber, setEditNumber] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editQbId, setEditQbId] = useState('');
  const [updatingInvoice, setUpdatingInvoice] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [invs, dels] = await Promise.all([
        fetchInvoices().catch(() => []),
        fetchDeliveries().catch(() => [])
      ]);
      setInvoices(Array.isArray(invs) ? invs : []);
      setDeliveries(Array.isArray(dels) ? dels : []);
    } catch (e: any) {
      console.error('Fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenAddModal = () => {
    const today = new Date().toISOString().split('T')[0];
    const due = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    const randomInv = `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`;
    setNewInvoiceNumber(randomInv);
    setNewAmount('');
    setNewInvoiceDate(today);
    setNewDueDate(due);
    setNewDeliveryId('');
    setNewGallons('');
    setNewQuickbooksId('');
    setAddModalVisible(true);
  };

  const handleSaveNewInvoice = async () => {
    if (!newInvoiceNumber.trim() || !newAmount.trim()) {
      Alert.alert('Validation Error', 'Invoice number and amount are required.');
      return;
    }
    const amt = parseFloat(newAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid amount.');
      return;
    }
    setSavingInvoice(true);
    try {
      await submitInvoice({
        invoiceNumber: newInvoiceNumber.trim(),
        customerName: newCustomerName.trim(),
        customerEmail: newCustomerEmail.trim(),
        deliveryId: newDeliveryId || undefined,
        product: newProduct.trim(),
        gallons: parseFloat(newGallons) || 0,
        amount: amt,
        invoiceDate: newInvoiceDate,
        dueDate: newDueDate,
        quickbooksInvoiceId: newQuickbooksId.trim() || undefined,
        status: 'Open',
        pdfData: 'JVBERi0xLjQKJeLjz9MKMSAwIG9iajw8L1R5cGUvQ2F0YWxvZy9QYWdlcyAyIDAgUj4+ZW5kb2JqCg=='
      });
      Alert.alert('Invoice Recorded', `Invoice ${newInvoiceNumber} entered successfully from QuickBooks.`);
      setAddModalVisible(false);
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save invoice');
    } finally {
      setSavingInvoice(false);
    }
  };

  const handleConfirmPaid = async () => {
    if (!invoiceToPay) return;
    setMarkingPaid(true);
    try {
      await markInvoicePaid(invoiceToPay.id, paymentDate || new Date().toISOString().split('T')[0]);
      Alert.alert('Invoice Paid', `Invoice ${invoiceToPay.invoiceNumber} recorded as Paid. Check date logged.`);
      setPayModalVisible(false);
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to mark invoice as paid');
    } finally {
      setMarkingPaid(false);
    }
  };

  const handleVoidInvoice = (inv: any) => {
    Alert.alert(
      'Void Invoice',
      `Are you sure you want to void invoice ${inv.invoiceNumber}? This action cannot be reversed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Void',
          style: 'destructive',
          onPress: async () => {
            try {
              await voidInvoice(inv.id);
              Alert.alert('Voided', `Invoice ${inv.invoiceNumber} has been marked Void.`);
              loadData();
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to void invoice');
            }
          }
        }
      ]
    );
  };

  const openEditModal = (inv: any) => {
    setEditingInvoice(inv);
    setEditNumber(inv.invoiceNumber || '');
    setEditAmount(String(inv.amount || ''));
    setEditDate(inv.invoiceDate || '');
    setEditDueDate(inv.dueDate || '');
    setEditQbId(inv.quickbooksInvoiceId || '');
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editingInvoice) return;
    const amt = parseFloat(editAmount);
    setUpdatingInvoice(true);
    try {
      await updateInvoice(editingInvoice.id, {
        invoiceNumber: editNumber.trim(),
        amount: isNaN(amt) ? editingInvoice.amount : amt,
        invoiceDate: editDate,
        dueDate: editDueDate,
        quickbooksInvoiceId: editQbId.trim() || undefined
      });
      Alert.alert('Updated', `Invoice ${editNumber} details updated.`);
      setEditModalVisible(false);
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update invoice');
    } finally {
      setUpdatingInvoice(false);
    }
  };

  const handlePrintPdf = () => {
    if (selectedInvoiceForPdf) {
      printInvoiceDocument(selectedInvoiceForPdf);
    } else {
      Alert.alert('Print Statement', 'Use the print command from your mobile share menu.');
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    if (statusFilter !== 'All' && inv.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match = (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(q)) ||
                    (inv.customerName && inv.customerName.toLowerCase().includes(q)) ||
                    (inv.product && inv.product.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor="#0C6054" />
        }
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(16, insets.top + 8) }]}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={styles.title} numberOfLines={1}>Invoices (QuickBooks)</Text>
            <Text style={styles.subtitle} numberOfLines={1}>Hand-entered from QuickBooks statements</Text>
          </View>
          <TouchableOpacity onPress={handleOpenAddModal} style={styles.addBtn}>
            <Ionicons name="add" size={18} color="#FFF" />
            <Text style={styles.addBtnText}>Enter Invoice</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 20 }}
          style={{ marginBottom: 12 }}
        >
          {(['All', 'Open', 'Overdue', 'Paid', 'Void'] as const).map(st => (
            <TouchableOpacity
              key={st}
              onPress={() => setStatusFilter(st)}
              style={[styles.filterChip, statusFilter === st && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, statusFilter === st && styles.filterChipTextActive]}>
                {st}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TextInput
          placeholder="Filter by invoice, customer, product..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          mode="outlined"
          dense
          left={<TextInput.Icon icon="magnify" />}
          style={styles.searchInput}
        />

        <Text style={styles.countText}>
          Showing {filteredInvoices.length} Invoices
        </Text>

        {filteredInvoices.length === 0 ? (
          <View style={styles.emptyCard}>
            <InvoiceLogo size={42} color="#94A3B8" />
            <Text style={styles.emptyText}>No invoice records found.</Text>
          </View>
        ) : (
          filteredInvoices.map(inv => {
            const isOpen = inv.status === 'Open';
            const isOverdue = inv.status === 'Overdue';
            const isPaid = inv.status === 'Paid';
            const isVoid = inv.status === 'Void';

            return (
              <View key={inv.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <InvoiceLogo size={28} color="#0C6054" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.invoiceNumber}>{inv.invoiceNumber}</Text>
                      <Text style={styles.customerName}>{inv.customerName || 'Customer'}</Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.amountText, isOverdue && { color: '#DC2626' }]}>
                      ${Number(inv.amount || 0).toLocaleString()}
                    </Text>
                    <Chip
                      compact
                      style={{
                        backgroundColor: isPaid ? '#DCFCE7' : isOverdue ? '#FEE2E2' : isVoid ? '#F1F5F9' : '#DBEAFE',
                        marginTop: 4
                      }}
                      textStyle={{
                        color: isPaid ? '#166534' : isOverdue ? '#DC2626' : isVoid ? '#64748B' : '#1D4ED8',
                        fontWeight: '800',
                        fontSize: 10
                      }}
                    >
                      {inv.status}
                    </Chip>
                  </View>
                </View>

                {/* Dates & QuickBooks Ref */}
                <View style={styles.datesBox}>
                  <Text style={styles.metaText}>
                    <Text style={{ fontWeight: '700' }}>Date: </Text>{inv.invoiceDate} • <Text style={{ fontWeight: '700' }}>Due: </Text>{inv.dueDate}
                  </Text>
                  {isPaid && inv.paidDate && (
                    <Text style={[styles.metaText, { color: '#166534', fontWeight: '700' }]}>
                      Payment Recorded: {inv.paidDate}
                    </Text>
                  )}
                  {inv.quickbooksInvoiceId && (
                    <Text style={styles.metaText}>
                      <Text style={{ fontWeight: '700' }}>QuickBooks ID: </Text>{inv.quickbooksInvoiceId}
                    </Text>
                  )}
                </View>

                {/* Linked Delivery Details */}
                {inv.product ? (
                  <View style={styles.linkedDeliveryBox}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>
                      {inv.deliveryId ? `Linked Delivery: ${inv.deliveryId} • ` : ''}{inv.product}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                      {inv.gallons ? `${inv.gallons} Gallons` : ''} {inv.blocks && inv.blocks.length > 0 ? `• Blocks: ${inv.blocks.join(', ')}` : ''}
                    </Text>
                  </View>
                ) : null}

                {/* Actions */}
                <View style={styles.actionRow}>
                  <Button
                    mode="outlined"
                    onPress={() => {
                      setSelectedInvoiceForPdf(inv);
                      setPdfModalVisible(true);
                    }}
                    icon="file-pdf-box"
                    textColor="#0C6054"
                    style={{ borderColor: '#0C6054', minHeight: 44, justifyContent: 'center' }}
                  >
                    View / Print PDF
                  </Button>

                  {(isOpen || isOverdue) && (
                    <Button
                      mode="contained"
                      onPress={() => {
                        setInvoiceToPay(inv);
                        setPaymentDate(new Date().toISOString().split('T')[0]);
                        setPayModalVisible(true);
                      }}
                      buttonColor="#166534"
                      icon="cash-check"
                      style={{ minHeight: 44, justifyContent: 'center' }}
                    >
                      Mark Paid
                    </Button>
                  )}

                  <Button
                    mode="text"
                    onPress={() => openEditModal(inv)}
                    textColor="#475569"
                  >
                    Edit
                  </Button>

                  {!isVoid && !isPaid && (
                    <Button
                      mode="text"
                      onPress={() => handleVoidInvoice(inv)}
                      textColor="#DC2626"
                    >
                      Void
                    </Button>
                  )}
                </View>
              </View>
            );
          })
        )}

      </ScrollView>

      {/* ================= ADD HAND-ENTERED INVOICE MODAL ================= */}
      <Modal visible={addModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Enter QuickBooks Invoice</Text>
                <Text style={styles.modalSubtitle}>Office manual entry; prices not computed by app</Text>
              </View>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <TextInput label="Invoice Number" value={newInvoiceNumber} onChangeText={setNewInvoiceNumber} mode="outlined" style={styles.modalInput} />
              <TextInput label="Customer Name" value={newCustomerName} onChangeText={setNewCustomerName} mode="outlined" style={styles.modalInput} />
              <TextInput label="Customer Email" value={newCustomerEmail} onChangeText={setNewCustomerEmail} mode="outlined" style={styles.modalInput} />

              <TextInput label="Invoice Amount ($ Total)" value={newAmount} onChangeText={setNewAmount} keyboardType="decimal-pad" mode="outlined" placeholder="e.g. 7500.00" style={styles.modalInput} />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TextInput label="Invoice Date" value={newInvoiceDate} onChangeText={setNewInvoiceDate} mode="outlined" style={[styles.modalInput, { flex: 1 }]} />
                <TextInput label="Due Date" value={newDueDate} onChangeText={setNewDueDate} mode="outlined" style={[styles.modalInput, { flex: 1 }]} />
              </View>

              <TextInput label="QuickBooks Invoice ID" value={newQuickbooksId} onChangeText={setNewQuickbooksId} mode="outlined" placeholder="e.g. QB-94812" style={styles.modalInput} />

              <Text style={{ fontWeight: '700', fontSize: 13, marginTop: 6, marginBottom: 4 }}>Link to Delivery (Optional)</Text>
              <TextInput label="Product Name" value={newProduct} onChangeText={setNewProduct} mode="outlined" style={styles.modalInput} />
              <TextInput label="Gallons" value={newGallons} onChangeText={setNewGallons} keyboardType="numeric" mode="outlined" placeholder="e.g. 500" style={styles.modalInput} />
            </ScrollView>

            <View style={styles.modalActions}>
              <Button mode="outlined" onPress={() => setAddModalVisible(false)} textColor="#64748B" style={{ flex: 1, marginRight: 8, minHeight: 48, justifyContent: 'center' }}>Cancel</Button>
              <Button mode="contained" onPress={handleSaveNewInvoice} loading={savingInvoice} buttonColor="#0C6054" style={{ flex: 1, marginLeft: 8, minHeight: 48, justifyContent: 'center' }}>Save Invoice</Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================= MARK PAID (RECORD CHECK) MODAL ================= */}
      <Modal visible={payModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Record Payment (Check / Wire)</Text>
            <Text style={styles.modalSubtitle}>{invoiceToPay?.invoiceNumber} • ${Number(invoiceToPay?.amount || 0).toLocaleString()}</Text>
            <TextInput
              label="Payment / Check Date"
              value={paymentDate}
              onChangeText={setPaymentDate}
              mode="outlined"
              placeholder="YYYY-MM-DD"
              style={styles.modalInput}
            />
            <View style={styles.modalActions}>
              <Button mode="outlined" onPress={() => setPayModalVisible(false)} textColor="#64748B" style={{ flex: 1, marginRight: 8, minHeight: 48, justifyContent: 'center' }}>Cancel</Button>
              <Button mode="contained" onPress={handleConfirmPaid} loading={markingPaid} buttonColor="#166534" style={{ flex: 1, marginLeft: 8, minHeight: 48, justifyContent: 'center' }}>Record Paid</Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================= IN-APP PRINTABLE PDF MODAL ================= */}
      <Modal visible={pdfModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '92%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Invoice {selectedInvoiceForPdf?.invoiceNumber}</Text>
                <Text style={styles.modalSubtitle}>QuickBooks Statement Document</Text>
              </View>
              <TouchableOpacity onPress={() => setPdfModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.statementBox}>
                <View style={{ borderBottomWidth: 2, borderBottomColor: '#0C6054', paddingBottom: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Image
                      source={require('../../../assets/brand/renu-biome-logo-teal-orange-for-light-backgrounds.png')}
                      style={{ width: 130, height: 38 }}
                      resizeMode="contain"
                    />
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 16, fontWeight: '900', color: '#0C6054' }}>INVOICE</Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B' }}>#{selectedInvoiceForPdf?.invoiceNumber}</Text>
                    </View>
                  </View>
                  <View style={{ marginTop: 6 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#0C6054' }}>ReNu-Biome Inc.</Text>
                    <Text style={{ fontSize: 11, color: '#64748B' }}>Agricultural Biologicals & Nutrients · Central Valley, California</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 12 }}>
                  <View>
                    <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '700' }}>BILLED TO:</Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>{selectedInvoiceForPdf?.customerName}</Text>
                    <Text style={{ fontSize: 12, color: '#475569' }}>{selectedInvoiceForPdf?.customerEmail}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 12, color: '#64748B' }}>Date: {selectedInvoiceForPdf?.invoiceDate}</Text>
                    <Text style={{ fontSize: 12, color: '#64748B' }}>Due Date: {selectedInvoiceForPdf?.dueDate}</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: selectedInvoiceForPdf?.status === 'Paid' ? '#16A34A' : '#DC2626' }}>
                      Status: {selectedInvoiceForPdf?.status}
                    </Text>
                  </View>
                </View>

                <Divider style={{ marginVertical: 8 }} />

                <View style={{ paddingVertical: 8 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>Description</Text>
                  <Text style={{ fontSize: 13, color: '#334155', marginTop: 4 }}>
                    {selectedInvoiceForPdf?.product || 'Custom Agricultural Formulation'}
                    {selectedInvoiceForPdf?.gallons ? ` (${selectedInvoiceForPdf.gallons} Gallons)` : ''}
                  </Text>
                  {selectedInvoiceForPdf?.deliveryId ? (
                    <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                      Reference Delivery Order: {selectedInvoiceForPdf.deliveryId}
                    </Text>
                  ) : null}
                </View>

                <Divider style={{ marginVertical: 8 }} />

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>Total Amount Due</Text>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#0C6054' }}>
                    ${Number(selectedInvoiceForPdf?.amount || 0).toLocaleString()}
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Button mode="outlined" onPress={() => setPdfModalVisible(false)} textColor="#64748B" style={{ flex: 1, marginRight: 8, minHeight: 48, justifyContent: 'center' }}>Close</Button>
              <Button mode="contained" onPress={handlePrintPdf} icon="printer" buttonColor="#0C6054" style={{ flex: 1, marginLeft: 8, minHeight: 48, justifyContent: 'center' }}>Print / Export</Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================= EDIT INVOICE MODAL ================= */}
      <Modal visible={editModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Invoice Details</Text>
            <TextInput label="Invoice Number" value={editNumber} onChangeText={setEditNumber} mode="outlined" style={styles.modalInput} />
            <TextInput label="Amount ($)" value={editAmount} onChangeText={setEditAmount} keyboardType="decimal-pad" mode="outlined" style={styles.modalInput} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TextInput label="Invoice Date" value={editDate} onChangeText={setEditDate} mode="outlined" style={[styles.modalInput, { flex: 1 }]} />
              <TextInput label="Due Date" value={editDueDate} onChangeText={setEditDueDate} mode="outlined" style={[styles.modalInput, { flex: 1 }]} />
            </View>
            <TextInput label="QuickBooks ID" value={editQbId} onChangeText={setEditQbId} mode="outlined" style={styles.modalInput} />
            <View style={styles.modalActions}>
              <Button mode="outlined" onPress={() => setEditModalVisible(false)} textColor="#64748B" style={{ flex: 1, marginRight: 8, minHeight: 48, justifyContent: 'center' }}>Cancel</Button>
              <Button mode="contained" onPress={handleSaveEdit} loading={updatingInvoice} buttonColor="#0C6054" style={{ flex: 1, marginLeft: 8, minHeight: 48, justifyContent: 'center' }}>Save</Button>
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
    width: '100%',
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
    minHeight: 46,
    flexShrink: 0,
  },
  addBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginRight: 8,
    minHeight: 40,
    justifyContent: 'center',
  },
  filterChipActive: { backgroundColor: '#0C6054', borderColor: '#0C6054' },
  filterChipText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  filterChipTextActive: { color: '#FFFFFF' },
  searchInput: { marginBottom: 8, backgroundColor: '#FFFFFF' },
  countText: { fontSize: 12, color: '#64748B', marginBottom: 12, fontWeight: '500' },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
  },
  emptyText: { fontSize: 13, color: '#64748B', marginTop: 8 },
  card: {
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  invoiceNumber: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  customerName: { fontSize: 13, color: '#64748B', marginTop: 2 },
  amountText: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  datesBox: { marginTop: 8, gap: 2 },
  metaText: { fontSize: 12, color: '#475569' },
  linkedDeliveryBox: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  modalTitle: { fontSize: 19, fontWeight: '800', color: '#0F172A' },
  modalSubtitle: { fontSize: 12, color: '#64748B', marginTop: 2 },
  modalInput: { marginBottom: 10, backgroundColor: '#FFFFFF' },
  modalActions: { flexDirection: 'row', marginTop: 12 },
  statementBox: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginVertical: 10,
  },
});
