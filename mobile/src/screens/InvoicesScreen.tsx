import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Modal, TouchableOpacity, Alert, Share, Platform } from 'react-native';
import { Text, Card, Chip, Button, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { fetchInvoices as fetchInvoicesApi, exportData, importData } from '../api/client';

export const InvoicesScreen = () => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // PDF / Invoice Detail Modal
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const data = await fetchInvoicesApi();
      setInvoices(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch invoices', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const openInvoiceDetail = (item: any) => {
    setSelectedInvoice(item);
    setDetailModalVisible(true);
  };

  const handleExportInvoices = async () => {
    try {
      const res = await exportData('invoices');
      const jsonStr = JSON.stringify(res.data, null, 2);
      if (Platform.OS === 'web') {
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `renu_invoices_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        await Share.share({ title: 'Export Invoices', message: jsonStr });
      }
    } catch (e: any) {
      Alert.alert('Export Failed', e.message || 'Could not export invoices');
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const invNumber = item.invoiceNumber || item.invoiceId || 'INV-2026';
    const amount = item.amount || item.amt || 0;
    const isPaid = item.status === 'PAID' || item.st === 'paid';

    return (
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.row}>
            <View style={styles.headerInfo}>
              <MaterialCommunityIcons name="receipt-text" size={24} color="#2E5D36" style={{ marginRight: 8 }} />
              <View>
                <Text variant="titleMedium" style={{ color: '#0F172A', fontWeight: 'bold' }}>
                  {invNumber}
                </Text>
                <Text variant="bodySmall" style={{ color: '#64748B' }}>
                  Order #{item.orderId || 'ORD-X'}
                </Text>
              </View>
            </View>
            <Chip
              icon={isPaid ? 'check-decagram' : 'clock-outline'}
              style={isPaid ? styles.paidChip : styles.openChip}
              textStyle={{ color: isPaid ? '#15803D' : '#D97706', fontWeight: 'bold', fontSize: 12 }}
            >
              {isPaid ? 'PAID' : 'PENDING'}
            </Chip>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailsRow}>
            <View>
              <Text variant="bodySmall" style={styles.label}>Product & Qty</Text>
              <Text variant="bodyMedium" style={{ fontWeight: '600', color: '#1E293B' }}>
                {item.product || 'Agri Bio-Stimulant'} ({item.qty || 'Standard'})
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text variant="bodySmall" style={styles.label}>Issued Date</Text>
              <Text variant="bodyMedium" style={{ color: '#64748B' }}>
                {item.date || (item.dt ? new Date(item.dt).toLocaleDateString() : '2026-10-09')}
              </Text>
            </View>
          </View>

          <View style={[styles.detailsRow, { marginTop: 10, alignItems: 'center' }]}>
            <View>
              <Text variant="bodySmall" style={styles.label}>Total Amount</Text>
              <Text variant="titleLarge" style={{ fontWeight: 'bold', color: '#2E5D36' }}>
                ${amount.toLocaleString()}
              </Text>
            </View>
            <Button
              mode="contained"
              buttonColor="#2E5D36"
              icon="file-document-outline"
              onPress={() => openInvoiceDetail(item)}
              style={{ borderRadius: 8 }}
            >
              View Invoice
            </Button>
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      {/* Screen Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>Invoices</Text>
          <Text style={styles.subtitle}>Verified billing receipts & tax records</Text>
        </View>
        <Button
          mode="outlined"
          icon="download"
          onPress={handleExportInvoices}
          style={styles.exportBtn}
          textColor="#2E5D36"
        >
          Export
        </Button>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#2E5D36" size="large" />
      ) : invoices.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="receipt" size={56} color="#94A3B8" />
          <Text style={styles.emptyText}>No invoices generated yet.</Text>
          <Text style={{ color: '#94A3B8', fontSize: 13, marginTop: 4, textAlign: 'center' }}>
            Invoices are automatically created and delivered when orders are paid.
          </Text>
        </View>
      ) : (
        <FlatList
          data={invoices}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 100 }}
          onRefresh={fetchInvoices}
          refreshing={loading}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Invoice PDF / Receipt Modal */}
      <Modal visible={detailModalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.invoiceDocTitle}>Renu Biome Inc.</Text>
                <Text style={{ color: '#64748B', fontSize: 12 }}>1250 Agri-Bio Way, Fresno, CA</Text>
              </View>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <MaterialCommunityIcons name="close-circle" size={28} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Divider style={{ marginVertical: 14 }} />

            <View style={styles.metaGrid}>
              <View>
                <Text style={styles.docLabel}>INVOICE NUMBER</Text>
                <Text style={styles.docVal}>{selectedInvoice?.invoiceNumber || 'INV-2026-001'}</Text>
              </View>
              <View>
                <Text style={styles.docLabel}>DATE</Text>
                <Text style={styles.docVal}>{selectedInvoice?.date || '2026-10-09'}</Text>
              </View>
              <View>
                <Text style={styles.docLabel}>BILLED TO</Text>
                <Text style={styles.docVal}>{selectedInvoice?.customerEmail || 'customer@renu.com'}</Text>
              </View>
              <View>
                <Text style={styles.docLabel}>STATUS</Text>
                <Text style={[styles.docVal, { color: '#15803D' }]}>PAID IN FULL</Text>
              </View>
            </View>

            <Divider style={{ marginVertical: 14 }} />

            <Text style={{ fontWeight: '700', color: '#0F172A', marginBottom: 8 }}>LINE ITEMS</Text>
            <View style={styles.tableRow}>
              <Text style={{ flex: 2, color: '#334155', fontWeight: '500' }}>
                {selectedInvoice?.product || 'Biome Care Formula'}
              </Text>
              <Text style={{ flex: 1, textAlign: 'center', color: '#64748B' }}>
                {selectedInvoice?.qty || '10 Gal'}
              </Text>
              <Text style={{ flex: 1, textAlign: 'right', fontWeight: 'bold', color: '#0F172A' }}>
                ${(selectedInvoice?.amount || selectedInvoice?.amt || 0)?.toLocaleString()}
              </Text>
            </View>

            <View style={styles.totalBox}>
              <Text style={{ color: '#0F172A', fontWeight: 'bold', fontSize: 16 }}>Total Paid:</Text>
              <Text style={{ color: '#2E5D36', fontWeight: '800', fontSize: 20 }}>
                ${(selectedInvoice?.amount || selectedInvoice?.amt || 0)?.toLocaleString()}
              </Text>
            </View>

            <View style={styles.modalActions}>
              <Button
                mode="contained"
                buttonColor="#2E5D36"
                icon="share-variant"
                onPress={() => {
                  Share.share({
                    title: `Invoice ${selectedInvoice?.invoiceNumber}`,
                    message: `Renu Biome Invoice #${selectedInvoice?.invoiceNumber} for $${selectedInvoice?.amount?.toLocaleString()} - Verified Paid.`
                  });
                }}
                style={{ flex: 1, borderRadius: 10 }}
              >
                Share Invoice
              </Button>
              <Button
                mode="outlined"
                onPress={() => setDetailModalVisible(false)}
                style={{ flex: 1, borderRadius: 10, borderColor: '#CBD5E1' }}
                textColor="#64748B"
              >
                Close
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
    paddingHorizontal: 20,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pageTitle: {
    fontWeight: 'bold',
    color: '#0F172A',
    fontSize: 26,
  },
  subtitle: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 2,
  },
  exportBtn: {
    borderRadius: 8,
    borderColor: '#2E5D36',
  },
  card: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
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
    color: '#64748B',
    marginBottom: 3,
  },
  openChip: {
    backgroundColor: '#FEF3C7',
    height: 28,
  },
  paidChip: {
    backgroundColor: '#DCFCE7',
    height: 28,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 80,
  },
  emptyText: {
    textAlign: 'center',
    color: '#0F172A',
    fontWeight: '600',
    fontSize: 16,
    marginTop: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  invoiceDocTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2E5D36',
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  docLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 2,
  },
  docVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  totalBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 10,
    marginTop: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
});
