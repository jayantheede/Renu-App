import React from 'react';
import { View, StyleSheet, ScrollView, Image } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { GlassCard } from '../../components/GlassCard';
import { Ionicons } from '@expo/vector-icons';

const DUMMY_PRODUCTS = [
  { id: 1, name: 'Premium Fertilizer', price: 49.99, desc: 'High-yield nutrient mix.' },
  { id: 2, name: 'Orchard Care Kit', price: 89.99, desc: 'Complete pesticide and health kit for fruit trees.' }
];

export const ShopScreen = () => {
  return (
    <View style={styles.background}>
      <View style={styles.overlay}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text variant="headlineMedium" style={styles.title}>Shop</Text>
            <Text variant="bodyMedium" style={styles.subtitle}>Purchase agricultural products</Text>
          </View>

          {DUMMY_PRODUCTS.map(prod => (
            <GlassCard key={prod.id} style={styles.productCard}>
              <View style={styles.productHeader}>
                <View style={styles.iconBox}>
                  <Ionicons name="leaf" size={24} color="#FFF" />
                </View>
                <View style={styles.productInfo}>
                  <Text variant="titleMedium" style={styles.productName}>{prod.name}</Text>
                  <Text variant="titleLarge" style={styles.productPrice}>${prod.price}</Text>
                </View>
              </View>
              <Text style={styles.productDesc}>{prod.desc}</Text>
              <Button mode="contained" buttonColor="#FFF" textColor="#000" style={styles.buyButton}>
                Purchase
              </Button>
            </GlassCard>
          ))}
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
  productCard: { padding: 20, marginBottom: 16 },
  productHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  iconBox: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  productInfo: { flex: 1 },
  productName: { color: '#FFF', fontWeight: 'bold' },
  productPrice: { color: '#FFF' },
  productDesc: { color: 'rgba(255,255,255,0.8)', marginBottom: 16 },
  buyButton: { borderRadius: 12 },
});
