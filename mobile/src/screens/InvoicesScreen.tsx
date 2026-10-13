import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  RefreshControl,
  Platform,
} from 'react-native';
import { Text, Card, Chip, Button, Divider, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { fetchInvoices } from '../api/client';

export const InvoicesScreen = () => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'PAID'>('ALL');

  // PDF / Detail Modal
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const loadInvoices = async () => {
    try {
      const data = await fetchInvoices();
      if (Array.isArray(data)) setInvoices(data);
    } catch (e) {
      console.warn('Invoices fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadInvoices();
  };

  const filteredInvoices = invoices.filter(inv => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'OPEN') return inv.status === 'Open' || inv.status === 'Overdue';
    if (statusFilter === 'PAID') return inv.status === 'Paid';
    return true;
  });

  const openInvoiceDetail = (inv: any) => {
    setSelectedInvoice(inv);
    setDetailModalVisible(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Paid':
        return { bg: '#E8F5E9', color: '#15803D', icon: 'check-decagram' };
      case 'Overdue':
        return { bg: '#FEE2E2', color: '#B91C1C', icon: 'alert-circle' };
      case 'Void':
        return { bg: '#F1F5F9', color: '#64748B', icon: 'cancel' };
      default:
        return { bg: '#FEF3C7', color: '#B45309', icon: 'clock-outline' };
    }
  };

  const handlePrint = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Invoices</Text>
        <Text style={styles.subtitle}>QuickBooks billing records & payment status</Text>
      </View>

      {/* Filter Tabs: Open, Paid, All */}
      <View style={styles.filterTabs}>
        <TouchableOpacity
          style={[styles.filterTab, statusFilter === 'OPEN' && styles.filterTabActive]}
          onPress={() => setStatusFilter('OPEN')}
        >
          <Text style={[styles.filterTabText, statusFilter === 'OPEN' && styles.filterTabTextActive]}>
            Open
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, statusFilter === 'PAID' && styles.filterTabActive]}
          onPress={() => setStatusFilter('PAID')}
        >
          <Text style={[styles.filterTabText, statusFilter === 'PAID' && styles.filterTabTextActive]}>
            Paid
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, statusFilter === 'ALL' && styles.filterTabActive]}
          onPress={() => setStatusFilter('ALL')}
        >
          <Text style={[styles.filterTabText, statusFilter === 'ALL' && styles.filterTabTextActive]}>
            All
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2E5D36" />
        }
      >
        {loading && !refreshing ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#2E5D36" />
            <Text style={{ marginTop: 12, color: '#64748B' }}>Loading invoices...</Text>
          </View>
        ) : filteredInvoices.length === 0 ? (
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons name="receipt" size={36} color="#94A3B8" />
            <Text style={styles.emptyText}>No invoices matching selected filter.</Text>
          </View>
        ) : (
          filteredInvoices.map((item: any) => {
            const badge = getStatusBadge(item.status);
            const amount = Number(item.amount) || 0;

            return (
              <Card key={item.id || item.invoiceNumber} style={styles.card}>
                <Card.Content>
                  <View style={styles.row}>
                    <View style={styles.headerInfo}>
                      <MaterialCommunityIcons name="receipt-text" size={24} color="#2E5D36" style={{ marginRight: 8 }} />
                      <View>
                        <Text variant="titleMedium" style={{ color: '#0F172A', fontWeight: '800' }}>
                          #{item.invoiceNumber}
                        </Text>
                        <Text variant="bodySmall" style={{ color: '#64748B' }}>
                          {item.deliveryId ? `Linked Delivery: #${item.deliveryId}` : 'Direct Farm Billing'}
                        </Text>
                      </View>
                    </View>
                    <Chip
                      style={{ backgroundColor: badge.bg }}
                      textStyle={{ color: badge.color, fontWeight: '700', fontSize: 11 }}
                      compact
                    >
                      {item.status.toUpperCase()}
                    </Chip>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.detailsRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Product & Qty</Text>
                      <Text style={styles.valueText} numberOfLines={1}>
                        {item.product || 'ReNu-Biome Product'} {item.gallons ? `(${item.gallons} Gal)` : ''}
                      </Text>
                      {item.blockIds && item.blockIds.length > 0 ? (
                        <Text style={styles.subValueText}>
                          Blocks: {item.blockIds.join(', ')}
                        </Text>
                      ) : null}
                    </View>
                    <View style={{ alignItems: 'flex-end', marginLeft: 12 }}>
                      <Text style={styles.label}>
                        {item.status === 'Paid' ? 'Paid Date' : 'Due Date'}
                      </Text>
                      <Text style={styles.dateText}>
                        {item.status === 'Paid' ? (item.paidDate || item.dueDate) : item.dueDate}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.detailsRow, { marginTop: 14, alignItems: 'center' }]}>
                    <View>
                      <Text style={styles.label}>Invoice Amount</Text>
                      <Text style={styles.amountText}>
                        ${amount.toLocaleString()}
                      </Text>
                    </View>
                    <Button
                      mode="contained"
                      buttonColor="#2E5D36"
                      icon="file-document-outline"
                      onPress={() => openInvoiceDetail(item)}
                      style={styles.openPdfBtn}
                    >
                      View PDF
                    </Button>
                  </View>
                </Card.Content>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* Invoice PDF & Detail In-App Modal */}
      <Modal visible={detailModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedInvoice && (
              <>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalSub}>QuickBooks Export</Text>
                    <Text style={styles.modalTitle}>Invoice #{selectedInvoice.invoiceNumber}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setDetailModalVisible(false)}
                    style={styles.modalCloseBtn}
                  >
                    <MaterialCommunityIcons name="close" size={24} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
                  {/* Clean Printable Invoice Document */}
                  <View style={styles.paperInvoice}>
                    <View style={styles.invoiceHeaderRow}>
                      <View>
                        <Text style={styles.docBrand}>ReNu-Biome Inc.</Text>
                        <Text style={styles.docAddress}>Agricultural Soil Nutrition</Text>
                        <Text style={styles.docAddress}>Central Valley, CA</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.docInvoiceBadge}>INVOICE</Text>
                        <Text style={styles.docInvNum}>#{selectedInvoice.invoiceNumber}</Text>
                      </View>
                    </View>

                    <Divider style={{ marginVertical: 12 }} />

                    <View style={styles.docMetaRow}>
                      <View>
                        <Text style={styles.docLabel}>Billed To:</Text>
                        <Text style={styles.docVal}>{selectedInvoice.customerEmail}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.docLabel}>Invoice Date:</Text>
                        <Text style={styles.docVal}>{selectedInvoice.invoiceDate || '2026-10-09'}</Text>
                        <Text style={[styles.docLabel, { marginTop: 4 }]}>Due Date:</Text>
                        <Text style={styles.docVal}>{selectedInvoice.dueDate}</Text>
                      </View>
                    </View>

                    {/* Line Items */}
                    <View style={styles.docTable}>
                      <View style={styles.docTableHeader}>
                        <Text style={[styles.docColHeader, { flex: 2 }]}>Description</Text>
                        <Text style={[styles.docColHeader, { flex: 1, textAlign: 'center' }]}>Gallons</Text>
                        <Text style={[styles.docColHeader, { flex: 1, textAlign: 'right' }]}>Total</Text>
                      </View>

                      <View style={styles.docTableRow}>
                        <View style={{ flex: 2 }}>
                          <Text style={styles.docItemName}>
                            {selectedInvoice.product || 'Agri Bio-Stimulant Inoculant'}
                          </Text>
                          {selectedInvoice.blockIds && selectedInvoice.blockIds.length > 0 ? (
                            <Text style={styles.docItemSub}>
                              Treated Blocks: {selectedInvoice.blockIds.join(', ')}
                            </Text>
                          ) : null}
                        </View>
                        <Text style={[styles.docItemQty, { flex: 1, textAlign: 'center' }]}>
                          {selectedInvoice.gallons || '—'}
                        </Text>
                        <Text style={[styles.docItemPrice, { flex: 1, textAlign: 'right' }]}>
                          ${Number(selectedInvoice.amount).toLocaleString()}
                        </Text>
                      </View>
                    </View>

                    <Divider style={{ marginVertical: 12 }} />

                    {/* Total & Status */}
                    <View style={styles.docTotalRow}>
                      <View>
                        <Text style={styles.docStatusLabel}>Payment Status:</Text>
                        <Text style={[styles.docStatusValue, { color: getStatusBadge(selectedInvoice.status).color }]}>
                          {selectedInvoice.status.toUpperCase()}
                          {selectedInvoice.paidDate ? ` (${selectedInvoice.paidDate})` : ''}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.docTotalLabel}>Total Due:</Text>
                        <Text style={styles.docTotalAmount}>
                          ${Number(selectedInvoice.amount).toLocaleString()}
                        </Text>
                      </View>
                    </View>
                  </View>
                </ScrollView>

                <View style={styles.modalActionRow}>
                  <Button
                    mode="outlined"
                    icon="printer"
                    onPress={handlePrint}
                    style={styles.printBtn}
                    textColor="#1E293B"
                  >
                    Print / PDF
                  </Button>
                  <Button
                    mode="contained"
                    buttonColor="#2E5D36"
                    onPress={() => setDetailModalVisible(false)}
                    style={styles.closeBtn}
                  >
                    Close
                  </Button>
                </View>
              </>
            )}
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
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  filterTab: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 48, // 48px touch target
    justifyContent: 'center',
  },
  filterTabActive: {
    backgroundColor: '#1E293B',
    borderColor: '#1E293B',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 96,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  valueText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 2,
  },
  subValueText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  dateText: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
    marginTop: 2,
  },
  amountText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2E5D36',
    marginTop: 2,
  },
  openPdfBtn: {
    borderRadius: 8,
    minHeight: 48,
    justifyContent: 'center',
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 20,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  modalSub: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2E5D36',
    textTransform: 'uppercase',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalCloseBtn: {
    minHeight: 48,
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paperInvoice: {
    backgroundColor: '#FAFAF9',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E7E5E4',
  },
  invoiceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  docBrand: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2E5D36',
  },
  docAddress: {
    fontSize: 11,
    color: '#78716C',
  },
  docInvoiceBadge: {
    fontSize: 12,
    fontWeight: '800',
    color: '#78716C',
    letterSpacing: 1,
  },
  docInvNum: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  docMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  docLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#78716C',
    textTransform: 'uppercase',
  },
  docVal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1C1917',
  },
  docTable: {
    marginTop: 8,
  },
  docTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#E7E5E4',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  docColHeader: {
    fontSize: 10,
    fontWeight: '700',
    color: '#44403C',
    textTransform: 'uppercase',
  },
  docTableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  docItemName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1C1917',
  },
  docItemSub: {
    fontSize: 10,
    color: '#78716C',
    marginTop: 2,
  },
  docItemQty: {
    fontSize: 12,
    color: '#44403C',
  },
  docItemPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1C1917',
  },
  docTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  docStatusLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#78716C',
  },
  docStatusValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  docTotalLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#78716C',
    textTransform: 'uppercase',
  },
  docTotalAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2E5D36',
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  printBtn: {
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
    borderColor: '#CBD5E1',
  },
  closeBtn: {
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
  },
});
