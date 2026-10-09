import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { Text, Card, Chip, useTheme, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';

import { fetchInvoices as fetchInvoicesApi } from '../api/client';

export const InvoicesScreen = () => {
  const theme = useTheme();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const data = await fetchInvoicesApi();
      setInvoices(data || []);
    } catch (error) {
      console.error('Failed to fetch invoices', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const renderItem = ({ item }: { item: any }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.row}>
          <View style={styles.headerInfo}>
            <MaterialCommunityIcons name="receipt" size={20} color="#2E5D36" style={{ marginRight: 8 }} />
            <Text variant="titleMedium" style={{ color: '#2E5D36', fontWeight: 'bold' }}>{item.invoiceId}</Text>
          </View>
          <Chip icon={item.st === 'paid' ? 'check' : 'alert-circle-outline'} 
                style={item.st === 'paid' ? styles.paidChip : styles.openChip}
                textStyle={{ color: item.st === 'paid' ? '#1F4E34' : '#B71C1C' }}>
            {item.st.toUpperCase()}
          </Chip>
        </View>
        <Text variant="bodyMedium" style={styles.entityName}>{item.entity?.name}</Text>
        
        <View style={styles.detailsRow}>
          <View>
            <Text variant="bodySmall" style={styles.label}>Date</Text>
            <Text variant="bodyMedium">{new Date(item.dt).toLocaleDateString()}</Text>
          </View>
          <View>
            <Text variant="bodySmall" style={styles.label}>Due</Text>
            <Text variant="bodyMedium">{new Date(item.due).toLocaleDateString()}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text variant="bodySmall" style={styles.label}>Amount</Text>
            <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>${item.amt?.toLocaleString()}</Text>
          </View>
        </View>
        
        {item.st === 'open' && (
          <Button mode="contained" buttonColor="#2E5D36" style={styles.payButton}>
            Pay Invoice
          </Button>
        )}
      </Card.Content>
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text variant="headlineMedium" style={styles.pageTitle}>Invoices</Text>
      
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#2E5D36" size="large" />
      ) : invoices.length === 0 ? (
        <Text style={styles.emptyText}>No invoices found.</Text>
      ) : (
        <FlatList
          data={invoices}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 100 }}
          onRefresh={fetchInvoices}
          refreshing={loading}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  pageTitle: { fontWeight: 'bold', color: '#2E5D36', marginBottom: 16, marginTop: 40 },
  card: { marginBottom: 16, backgroundColor: '#FFFFFF', borderRadius: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerInfo: { flexDirection: 'row', alignItems: 'center' },
  entityName: { color: '#666', marginTop: 4, marginBottom: 16 },
  detailsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { color: '#888', marginBottom: 2 },
  openChip: { backgroundColor: '#FFEBEE' },
  paidChip: { backgroundColor: '#E8F5E9' },
  payButton: { marginTop: 12, borderRadius: 8 },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#666' }
});
