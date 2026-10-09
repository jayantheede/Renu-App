import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { GlassCard } from '../../components/GlassCard';

export const HistoryScreen = () => {
  return (
    <View style={styles.background}>
      <View style={styles.overlay}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text variant="headlineMedium" style={styles.title}>History</Text>
            <Text variant="bodyMedium" style={styles.subtitle}>Past applications & purchases</Text>
          </View>

          <GlassCard style={styles.historyCard}>
            <View style={styles.cardRow}>
              <Text style={styles.dateText}>Oct 12, 2026</Text>
              <Text style={styles.amountText}>-$49.99</Text>
            </View>
            <Text variant="titleMedium" style={styles.itemName}>Premium Fertilizer</Text>
            <Text style={styles.descText}>Delivered</Text>
          </GlassCard>

          <GlassCard style={styles.historyCard}>
            <View style={styles.cardRow}>
              <Text style={styles.dateText}>Sep 05, 2026</Text>
              <Text style={styles.amountText}>-$89.99</Text>
            </View>
            <Text variant="titleMedium" style={styles.itemName}>Orchard Care Kit</Text>
            <Text style={styles.descText}>Delivered</Text>
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
  historyCard: { padding: 20, marginBottom: 12 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  dateText: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  amountText: { color: '#ff6b6b', fontWeight: 'bold' },
  itemName: { color: '#FFF', fontWeight: 'bold' },
  descText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 4 },
});
