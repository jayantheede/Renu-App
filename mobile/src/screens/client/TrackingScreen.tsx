import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { GlassCard } from '../../components/GlassCard';
import { Ionicons } from '@expo/vector-icons';

export const TrackingScreen = () => {
  return (
    <View style={styles.background}>
      <View style={styles.overlay}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text variant="headlineMedium" style={styles.title}>Tracking</Text>
            <Text variant="bodyMedium" style={styles.subtitle}>Monitor your active orders</Text>
          </View>

          <GlassCard style={styles.orderCard}>
            <View style={styles.orderHeader}>
              <Text variant="titleMedium" style={styles.orderId}>Order #8839</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>SHIPPED</Text>
              </View>
            </View>
            <Text style={styles.orderDesc}>1x Premium Fertilizer</Text>
            
            <View style={styles.timeline}>
              <View style={styles.step}>
                <Ionicons name="checkmark-circle" size={24} color="#4ade80" />
                <Text style={styles.stepText}>Ordered</Text>
              </View>
              <View style={styles.stepLine} />
              <View style={styles.step}>
                <Ionicons name="checkmark-circle" size={24} color="#4ade80" />
                <Text style={styles.stepText}>Shipped</Text>
              </View>
              <View style={styles.stepLinePending} />
              <View style={styles.step}>
                <Ionicons name="ellipse-outline" size={24} color="rgba(255,255,255,0.5)" />
                <Text style={styles.stepTextPending}>Delivered</Text>
              </View>
            </View>
          </GlassCard>
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
  orderCard: { padding: 20, marginBottom: 16 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  orderId: { color: '#FFF', fontWeight: 'bold' },
  statusBadge: { backgroundColor: 'rgba(74, 222, 128, 0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: '#4ade80', fontSize: 12, fontWeight: 'bold' },
  orderDesc: { color: 'rgba(255,255,255,0.8)', marginBottom: 24 },
  timeline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  step: { alignItems: 'center' },
  stepText: { color: '#FFF', fontSize: 12, marginTop: 4 },
  stepTextPending: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4 },
  stepLine: { flex: 1, height: 2, backgroundColor: '#4ade80', marginHorizontal: 8, marginBottom: 16 },
  stepLinePending: { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 8, marginBottom: 16 },
});
