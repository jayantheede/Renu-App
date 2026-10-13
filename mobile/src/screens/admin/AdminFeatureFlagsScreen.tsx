import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert, TouchableOpacity, Platform } from 'react-native';
import { Text, Switch, Button, Divider, TextInput, Chip } from 'react-native-paper';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { fetchFeatureFlags, saveFeatureFlags, exportReportCsv, fetchAdminCustomers } from '../../api/client';
import { useAuthStore } from '../../store/useAuthStore';

export const AdminFeatureFlagsScreen = () => {
  const logout = useAuthStore(state => state.logout);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('global');

  // The 11 Deferred Flags (Global Default)
  const [globalFlags, setGlobalFlags] = useState<{ [key: string]: boolean }>({
    payments: false,
    recommendations: false,
    labResults: false,
    documents: false,
    compliance: false,
    messaging: false,
    staffTasks: false,
    optimoroute: false,
    telemetry: false,
    quickbooks: false,
    map: false
  });

  // Customer Overrides
  const [customerOverrides, setCustomerOverrides] = useState<{ [customerId: string]: { [flag: string]: boolean } }>({});
  const [saving, setSaving] = useState(false);

  // Reports CSV Export State
  const [reportType, setReportType] = useState<'deliveries' | 'invoices'>('deliveries');
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [exportingReport, setExportingReport] = useState(false);

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

  const flagDescriptions: { [key: string]: { title: string; desc: string; icon: string } } = {
    payments: {
      title: 'Payments',
      desc: 'Pay invoices in-app by ACH & card; status sync back to QuickBooks',
      icon: 'credit-card-outline'
    },
    recommendations: {
      title: 'Recommendations',
      desc: 'Admin posts agronomic recommendation per block; customer accepts into order',
      icon: 'flask-round-bottom'
    },
    labResults: {
      title: 'Lab Results',
      desc: 'Upload soil, tissue and water assays per block; UC reference ranges',
      icon: 'test-tube'
    },
    documents: {
      title: 'Documents',
      desc: 'Labels, SDS, OMRI & CDFA certificates; contracts for e-signature',
      icon: 'file-certificate-outline'
    },
    compliance: {
      title: 'Compliance',
      desc: 'Applied nitrogen per APN and season for ILRP coalition reports',
      icon: 'shield-check-outline'
    },
    messaging: {
      title: 'Messaging',
      desc: 'In-app message thread per customer with photo; SMS and email sync',
      icon: 'chat-processing-outline'
    },
    staffTasks: {
      title: 'Staff Tasks',
      desc: 'Employee role, assigned field tasks (tank maintenance, sampling visits)',
      icon: 'clipboard-list-outline'
    },
    optimoroute: {
      title: 'OptimoRoute',
      desc: 'Delivery status and ETA from OptimoRoute; proof of delivery with photo',
      icon: 'map-marker-path'
    },
    telemetry: {
      title: 'Telemetry',
      desc: 'Tank level sensor alerts and live pressure telemetry feeds',
      icon: 'gauge'
    },
    quickbooks: {
      title: 'QuickBooks Sync',
      desc: 'Direct QBO sync of customers, products, invoices and payments',
      icon: 'sync'
    },
    map: {
      title: 'Map',
      desc: 'Satellite tiles with block boundaries and interactive tank markers',
      icon: 'map-outline'
    }
  };

  const loadData = useCallback(async () => {
    try {
      const [flagRes, custList] = await Promise.all([
        fetchFeatureFlags().catch(() => ({})),
        fetchAdminCustomers().catch(() => [])
      ]);
      if (flagRes?.global) {
        setGlobalFlags({ ...globalFlags, ...flagRes.global });
      }
      if (flagRes?.customerOverrides) {
        setCustomerOverrides(flagRes.customerOverrides);
      }
      setCustomers(Array.isArray(custList) ? custList : []);
    } catch (e) {
      console.error('Failed to load feature flags', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleFlag = (flagKey: string) => {
    if (selectedCustomerId === 'global') {
      setGlobalFlags(prev => ({ ...prev, [flagKey]: !prev[flagKey] }));
    } else {
      setCustomerOverrides(prev => {
        const currentCust = prev[selectedCustomerId] || {};
        const currentVal = currentCust[flagKey] !== undefined ? currentCust[flagKey] : (globalFlags[flagKey] || false);
        return {
          ...prev,
          [selectedCustomerId]: {
            ...currentCust,
            [flagKey]: !currentVal
          }
        };
      });
    }
  };

  const handleSaveFlags = async () => {
    setSaving(true);
    try {
      await saveFeatureFlags({
        global: globalFlags,
        customerOverrides: customerOverrides
      });
      Alert.alert('Settings Saved', 'Feature flags configuration updated successfully.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save feature flags');
    } finally {
      setSaving(false);
    }
  };

  const handleExportReport = async () => {
    setExportingReport(true);
    try {
      const csvData = await exportReportCsv(reportType, startDate, endDate);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `ReNu-${reportType}-${startDate}-to-${endDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        Alert.alert('Export Complete', `${reportType.toUpperCase()} CSV report generated successfully.`);
      }
    } catch (e: any) {
      Alert.alert('Export Error', e.message || 'Failed to export CSV report');
    } finally {
      setExportingReport(false);
    }
  };

  const isFlagActive = (flagKey: string) => {
    if (selectedCustomerId === 'global') {
      return !!globalFlags[flagKey];
    }
    const custOverride = customerOverrides[selectedCustomerId];
    if (custOverride && custOverride[flagKey] !== undefined) {
      return !!custOverride[flagKey];
    }
    return !!globalFlags[flagKey];
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor="#2E5D36" />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Feature Flags & Reports</Text>
          <Text style={styles.subtitle}>Configure deferred modules & export operational reports</Text>
        </View>

        {/* Scope Selector: Global vs Customer Override */}
        <View style={styles.scopeCard}>
          <Text style={styles.scopeHeading}>Target Configuration Scope</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            <TouchableOpacity
              onPress={() => setSelectedCustomerId('global')}
              style={[styles.scopeChip, selectedCustomerId === 'global' && styles.scopeChipActive]}
            >
              <Text style={[styles.scopeChipText, selectedCustomerId === 'global' && styles.scopeChipTextActive]}>
                Global Default
              </Text>
            </TouchableOpacity>

            {customers.map(c => (
              <TouchableOpacity
                key={c.id}
                onPress={() => setSelectedCustomerId(c.id)}
                style={[styles.scopeChip, selectedCustomerId === c.id && styles.scopeChipActive]}
              >
                <Text style={[styles.scopeChipText, selectedCustomerId === c.id && styles.scopeChipTextActive]}>
                  {c.name || c.email}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.scopeHelp}>
            {selectedCustomerId === 'global' 
              ? 'Configuring system-wide defaults for all customers.'
              : `Configuring individual feature override for ${customers.find(c => c.id === selectedCustomerId)?.name || 'Grower'}.`}
          </Text>
        </View>

        {/* 11 Deferred Feature Flags List (ALL OFF by default) */}
        <View style={styles.flagsCard}>
          <Text style={styles.flagsCardTitle}>Deferred Launch Capabilities</Text>

          {Object.keys(flagDescriptions).map((key, idx) => {
            const meta = flagDescriptions[key];
            const active = isFlagActive(key);

            return (
              <View key={key} style={[styles.flagRow, idx === Object.keys(flagDescriptions).length - 1 && { borderBottomWidth: 0 }]}>
                <View style={[styles.flagIconWrap, { backgroundColor: active ? '#DCFCE7' : '#F1F5F9' }]}>
                  <MaterialCommunityIcons name={meta.icon as any} size={22} color={active ? '#15803D' : '#64748B'} />
                </View>

                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.flagName}>{meta.title}</Text>
                  <Text style={styles.flagDesc}>{meta.desc}</Text>
                </View>

                <Switch
                  value={active}
                  onValueChange={() => handleToggleFlag(key)}
                  color="#2E5D36"
                />
              </View>
            );
          })}

          <Button
            mode="contained"
            onPress={handleSaveFlags}
            loading={saving}
            buttonColor="#2E5D36"
            style={{ marginTop: 14, borderRadius: 12 }}
            contentStyle={{ minHeight: 48 }}
          >
            Save Flag Settings
          </Button>
        </View>

        {/* Reports CSV Export Section */}
        <View style={styles.reportsCard}>
          <Text style={styles.flagsCardTitle}>Admin Operational Reports (CSV Export)</Text>
          <Text style={styles.scopeHelp}>Export comprehensive records for bookkeeping and audits.</Text>

          {/* Type Picker */}
          <View style={{ flexDirection: 'row', gap: 10, marginVertical: 12 }}>
            <TouchableOpacity
              onPress={() => setReportType('deliveries')}
              style={[styles.typeBtn, reportType === 'deliveries' && styles.typeBtnActive]}
            >
              <Text style={[styles.typeBtnText, reportType === 'deliveries' && styles.typeBtnTextActive]}>
                Deliveries Log
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setReportType('invoices')}
              style={[styles.typeBtn, reportType === 'invoices' && styles.typeBtnActive]}
            >
              <Text style={[styles.typeBtnText, reportType === 'invoices' && styles.typeBtnTextActive]}>
                Invoices Ledger
              </Text>
            </TouchableOpacity>
          </View>

          {/* Date Range Inputs */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TextInput
              label="Start Date"
              value={startDate}
              onChangeText={setStartDate}
              mode="outlined"
              placeholder="YYYY-MM-DD"
              style={[styles.input, { flex: 1 }]}
            />
            <TextInput
              label="End Date"
              value={endDate}
              onChangeText={setEndDate}
              mode="outlined"
              placeholder="YYYY-MM-DD"
              style={[styles.input, { flex: 1 }]}
            />
          </View>

          <Button
            mode="outlined"
            onPress={handleExportReport}
            loading={exportingReport}
            icon="file-download-outline"
            textColor="#2E5D36"
            style={{ borderColor: '#2E5D36', borderRadius: 12, marginTop: 8 }}
            contentStyle={{ minHeight: 48 }}
          >
            Download {reportType === 'deliveries' ? 'Deliveries' : 'Invoices'} CSV
          </Button>
        </View>

        {/* Account & Session Management */}
        <View style={styles.logoutCard}>
          <Text style={styles.flagsCardTitle}>Admin Session</Text>
          <Text style={styles.flagDesc}>Sign out from this device to end your administrative session.</Text>
          <Button
            mode="contained"
            onPress={handleSignOut}
            icon="logout"
            buttonColor="#DC2626"
            textColor="#FFFFFF"
            style={{ borderRadius: 12, marginTop: 14 }}
            contentStyle={{ minHeight: 48 }}
          >
            Sign Out
          </Button>
        </View>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { paddingBottom: 120, paddingHorizontal: 16 },
  header: { paddingTop: 54, paddingBottom: 16 },
  title: { fontSize: 22, fontWeight: '800', color: '#0F172A' },
  subtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
  scopeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  scopeHeading: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  scopeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    minHeight: 38,
    justifyContent: 'center',
  },
  scopeChipActive: { backgroundColor: '#2E5D36', borderColor: '#2E5D36' },
  scopeChipText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  scopeChipTextActive: { color: '#FFFFFF' },
  scopeHelp: { fontSize: 12, color: '#64748B', marginTop: 10 },
  flagsCard: {
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
  flagsCardTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 12 },
  flagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  flagIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  flagName: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  flagDesc: { fontSize: 12, color: '#64748B', marginTop: 2, lineHeight: 16 },
  reportsCard: {
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
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  typeBtnActive: { backgroundColor: '#2E5D36', borderColor: '#2E5D36' },
  typeBtnText: { fontSize: 13, fontWeight: '700', color: '#475569' },
  typeBtnTextActive: { color: '#FFFFFF' },
  input: { marginBottom: 10, backgroundColor: '#FFFFFF' },
  logoutCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginTop: 14,
    marginBottom: 40,
  },
});
