import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { GlassCard } from '../../components/GlassCard';

export const AdminCustomersScreen = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/admin/customers`)
      .then(r => r.json())
      .then(data => {
        setCustomers(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setLoading(false);
      });
  }, []);

  return (
    <View style={styles.background}>
      <View style={styles.overlay}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text variant="headlineMedium" style={styles.title}>Customers</Text>
            <Text variant="bodyMedium" style={styles.subtitle}>All registered users</Text>
          </View>

          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : customers.length === 0 ? (
            <Text style={{ color: '#FFF' }}>No customers found.</Text>
          ) : (
            customers.map((c, idx) => (
              <GlassCard key={idx} style={styles.card}>
                <Text style={styles.name}>{c.user_metadata?.full_name || 'No Name'}</Text>
                <Text style={styles.email}>{c.email}</Text>
                <Text style={styles.role}>Role: {c.user_metadata?.role || 'client'}</Text>
              </GlassCard>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: 'transparent' },
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.2)' },
  scrollContent: { paddingBottom: 120, paddingHorizontal: 20 },
  header: { paddingTop: 80, paddingBottom: 20 },
  title: { color: '#FFF', fontWeight: 'bold' },
  subtitle: { color: 'rgba(255,255,255,0.7)' },
  card: { marginBottom: 16, padding: 20 },
  name: { color: '#FFF', fontWeight: 'bold', fontSize: 18, marginBottom: 4 },
  email: { color: 'rgba(255,255,255,0.8)', marginBottom: 8 },
  role: { color: '#A0E8AF', fontWeight: '600', fontSize: 12 }
});
