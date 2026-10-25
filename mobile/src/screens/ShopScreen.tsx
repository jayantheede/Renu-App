import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions, RefreshControl, Linking, Modal } from 'react-native';
import { Text, ActivityIndicator, Chip, Button, Divider } from 'react-native-paper';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../store/useAuthStore';
import { fetchProducts, fetchFeatureFlags } from '../api/client';

const SCREEN_WIDTH = Dimensions.get('window').width;

const DEFAULT_REAL_PRODUCTS = [
  {
    id: 'prod-renu-n32-k28',
    name: 'ReNu N-32% K-28% Blend',
    description: 'High-efficiency liquid nitrogen and potassium formulation for bloom and vegetative shoot development. Engineered with biological complexing agents to maximize uptake while preventing leaching.',
    analysis: '32% N, 0% P2O5, 28% K2O, 0% Ca, 0% B, 0% Zn',
    densityLbGal: 10.8,
    omriListed: true,
    countsTowardN: true,
    nPercent: 32,
    p2o5Percent: 0,
    k2oPercent: 28,
    caPercent: 0,
    bPercent: 0,
    znPercent: 0
  },
  {
    id: 'prod-renu-n32-k24',
    name: 'ReNu N-32% K-24% Blend',
    description: 'Balanced crop nutrient solution tailored for orchards on heavier loam soils requiring steady nitrogen release with calibrated potassium feeding.',
    analysis: '32% N, 0% P2O5, 24% K2O, 0% Ca, 0% B, 0% Zn',
    densityLbGal: 10.7,
    omriListed: true,
    countsTowardN: true,
    nPercent: 32,
    p2o5Percent: 0,
    k2oPercent: 24,
    caPercent: 0,
    bPercent: 0,
    znPercent: 0
  },
  {
    id: 'prod-renu-n32-k28-b-zn',
    name: 'ReNu N-32% K-28% Blend + B Zn',
    description: 'Flagship pre-bloom and nut sizing blend fortified with chelated boron (0.25% B) and zinc (0.50% Zn) for enhanced pollen tube elongation and early canopy establishment.',
    analysis: '32% N, 0% P2O5, 28% K2O, 0% Ca, 0.25% B, 0.5% Zn',
    densityLbGal: 10.9,
    omriListed: true,
    countsTowardN: true,
    nPercent: 32,
    p2o5Percent: 0,
    k2oPercent: 28,
    caPercent: 0,
    bPercent: 0.25,
    znPercent: 0.50
  },
  {
    id: 'prod-renu-fruit-care',
    name: 'ReNu Fruit Care',
    description: 'Bio-available calcium acetate and marine polysaccharide foliar spray. Strengthens cell walls, reduces hull split nut disorders, and improves firmness and shelf life.',
    analysis: '0% N, 0% P2O5, 0% K2O, 8% Ca, 0% B, 0% Zn',
    densityLbGal: 9.8,
    omriListed: true,
    countsTowardN: false,
    nPercent: 0,
    p2o5Percent: 0,
    k2oPercent: 0,
    caPercent: 8,
    bPercent: 0,
    znPercent: 0
  },
  {
    id: 'prod-renu-0-0-29-k-acetate',
    name: 'ReNu 0-0-29 Potassium Acetate',
    description: 'Ultra-pure liquid potassium acetate for rapid foliar and drip absorption during kernel fill and hull split without chloride or nitrate salt accumulation.',
    analysis: '0% N, 0% P2O5, 29% K2O, 0% Ca, 0% B, 0% Zn',
    densityLbGal: 11.1,
    omriListed: true,
    countsTowardN: false,
    nPercent: 0,
    p2o5Percent: 0,
    k2oPercent: 29,
    caPercent: 0,
    bPercent: 0,
    znPercent: 0
  },
  {
    id: 'prod-renu-n6-k16-ca20',
    name: 'ReNu N-6% K-16% Ca-20% Blend',
    description: 'Triple-action post-bloom structural formulation delivering bioavailable calcium, potassium, and starter nitrogen for cell division and shell development.',
    analysis: '6% N, 0% P2O5, 16% K2O, 20% Ca, 0% B, 0% Zn',
    densityLbGal: 11.4,
    omriListed: true,
    countsTowardN: true,
    nPercent: 6,
    p2o5Percent: 0,
    k2oPercent: 16,
    caPercent: 20,
    bPercent: 0,
    znPercent: 0
  },
  {
    id: 'prod-renu-bloom-foliars-boron',
    name: 'Bloom foliars + boron',
    description: 'Targeted floral spray applied at 10-20% bloom. Enhances bee attraction, pollen germination, and fruit set in almonds, stone fruit, and pistachios.',
    analysis: '5% N, 0% P2O5, 5% K2O, 0% Ca, 2% B, 1% Zn',
    densityLbGal: 10.2,
    omriListed: true,
    countsTowardN: true,
    nPercent: 5,
    p2o5Percent: 0,
    k2oPercent: 5,
    caPercent: 0,
    bPercent: 2.0,
    znPercent: 1.0
  }
];

export const ShopScreen = () => {
  const [products, setProducts] = useState<any[]>(DEFAULT_REAL_PRODUCTS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orderingEnabled, setOrderingEnabled] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [orderModalVisible, setOrderModalVisible] = useState(false);
  const [requestedGallons, setRequestedGallons] = useState('1000');
  const [notes, setNotes] = useState('');

  const user = useAuthStore(state => state.user);

  const loadData = async () => {
    try {
      const [prods, flags] = await Promise.all([
        fetchProducts().catch(() => []),
        fetchFeatureFlags().catch(() => ({}))
      ]);
      if (Array.isArray(prods) && prods.length > 0) {
        setProducts(prods);
      } else {
        setProducts(DEFAULT_REAL_PRODUCTS);
      }
      const isOrdering = Boolean(flags?.global?.ordering ?? flags?.ordering);
      setOrderingEnabled(isOrdering);
    } catch (e) {
      console.warn('Failed to fetch product data:', e);
      setProducts(DEFAULT_REAL_PRODUCTS);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openProductDetail = (prod: any) => {
    setSelectedProduct(prod);
    setDetailVisible(true);
  };

  const handleContactOffice = () => {
    Linking.openURL('mailto:support@renu-biome.com?subject=ReNu-Biome%20Product%20Order%20Inquiry');
  };

  return (
    <View style={styles.container}>
      {/* Brand Header */}
      <LinearGradient colors={['#083F38', '#0C6054']} style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.brandTag}>FARMER'S PRIDE</Text>
          <Text style={styles.headerTitle}>Product Catalogue</Text>
          <Text style={styles.headerSubtitle}>
            Agricultural Biologicals & Liquid Nutrient Formulations
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
            tintColor="#0C6054"
          />
        }
      >
        {/* Ordering Feature Flag Notice (A2.5 / Finding 5) */}
        {!orderingEnabled ? (
          <View style={styles.orderingFlagBanner}>
            <View style={styles.flagIconBox}>
              <MaterialCommunityIcons name="information" size={24} color="#0C6054" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.flagTitle}>Ordering Managed via Dispatch</Text>
              <Text style={styles.flagText}>
                Direct in-app ordering is currently disabled behind the operations feature flag. All tank deliveries and refills are scheduled directly with your ReNu-Biome field representative and dispatch team.
              </Text>
              <TouchableOpacity onPress={handleContactOffice} style={styles.contactSupportBtn}>
                <Ionicons name="mail" size={16} color="#0C6054" />
                <Text style={styles.contactSupportText}>Email Dispatch · support@renu-biome.com</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={[styles.orderingFlagBanner, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
            <View style={[styles.flagIconBox, { backgroundColor: '#DCFCE7' }]}>
              <MaterialCommunityIcons name="cart-check" size={24} color="#166534" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.flagTitle, { color: '#166534' }]}>Direct Ordering Active</Text>
              <Text style={[styles.flagText, { color: '#166534' }]}>
                Select a formulation below to submit a delivery dispatch request to your ranch tanks.
              </Text>
            </View>
          </View>
        )}

        {/* Product Count & Notice */}
        <View style={styles.catalogMetaRow}>
          <Text style={styles.catalogCount}>7 Registered Formulations</Text>
          <Text style={styles.noPricingNotice}>Chemical Analyses Listed · Invoices via QuickBooks</Text>
        </View>

        {/* Product Cards */}
        {products.map(prod => (
          <TouchableOpacity
            key={prod.id || prod.name}
            style={styles.card}
            onPress={() => openProductDetail(prod)}
            activeOpacity={0.85}
          >
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.productName}>{prod.name}</Text>
                <Text style={styles.analysisText}>{prod.analysis || 'Custom Nutrient Blend'}</Text>
              </View>
              {prod.omriListed && (
                <View style={styles.omriBadge}>
                  <MaterialCommunityIcons name="leaf" size={12} color="#166534" />
                  <Text style={styles.omriBadgeText}>OMRI</Text>
                </View>
              )}
            </View>

            <Text style={styles.productDesc} numberOfLines={2}>
              {prod.description}
            </Text>

            {/* Nutrient Analysis Chips */}
            <View style={styles.chipRow}>
              {prod.nPercent !== undefined && (
                <View style={[styles.nutrientChip, prod.countsTowardN && styles.nAccountingChip]}>
                  <Text style={styles.nutrientChipLabel}>N</Text>
                  <Text style={styles.nutrientChipVal}>{prod.nPercent}%</Text>
                </View>
              )}
              {prod.p2o5Percent !== undefined && (
                <View style={styles.nutrientChip}>
                  <Text style={styles.nutrientChipLabel}>P₂O₅</Text>
                  <Text style={styles.nutrientChipVal}>{prod.p2o5Percent}%</Text>
                </View>
              )}
              {prod.k2oPercent !== undefined && (
                <View style={[styles.nutrientChip, { backgroundColor: '#FFF7ED', borderColor: '#FFEDD5' }]}>
                  <Text style={[styles.nutrientChipLabel, { color: '#C2410C' }]}>K₂O</Text>
                  <Text style={[styles.nutrientChipVal, { color: '#9A3412' }]}>{prod.k2oPercent}%</Text>
                </View>
              )}
              {prod.caPercent > 0 && (
                <View style={styles.nutrientChip}>
                  <Text style={styles.nutrientChipLabel}>Ca</Text>
                  <Text style={styles.nutrientChipVal}>{prod.caPercent}%</Text>
                </View>
              )}
              {prod.bPercent > 0 && (
                <View style={styles.nutrientChip}>
                  <Text style={styles.nutrientChipLabel}>B</Text>
                  <Text style={styles.nutrientChipVal}>{prod.bPercent}%</Text>
                </View>
              )}
              {prod.znPercent > 0 && (
                <View style={styles.nutrientChip}>
                  <Text style={styles.nutrientChipLabel}>Zn</Text>
                  <Text style={styles.nutrientChipVal}>{prod.znPercent}%</Text>
                </View>
              )}
              {prod.densityLbGal && (
                <View style={[styles.nutrientChip, { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' }]}>
                  <Text style={styles.nutrientChipVal}>{prod.densityLbGal} lb/gal</Text>
                </View>
              )}
            </View>

            <View style={styles.cardFooter}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {prod.countsTowardN ? (
                  <Text style={styles.complianceTag}>Counts toward N regulation</Text>
                ) : (
                  <Text style={[styles.complianceTag, { color: '#64748B' }]}>Non-nitrogen application</Text>
                )}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={styles.viewSpecText}>View Spec Sheet</Text>
                <Ionicons name="chevron-forward" size={14} color="#0C6054" />
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Product Spec Modal */}
      <Modal visible={detailVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.modalBrand}>RENU-BIOME FORMULATION SPEC</Text>
                <Text style={styles.modalTitle}>{selectedProduct?.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setDetailVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
              <View style={styles.specBox}>
                <Text style={styles.specLabel}>Guaranteed Chemical Analysis</Text>
                <Text style={styles.specAnalysis}>{selectedProduct?.analysis}</Text>
                {selectedProduct?.densityLbGal && (
                  <Text style={styles.specDensity}>Bulk Density: {selectedProduct.densityLbGal} lb/gal at 68°F</Text>
                )}
              </View>

              <Text style={styles.modalSectionTitle}>Agronomic Description</Text>
              <Text style={styles.modalDesc}>{selectedProduct?.description}</Text>

              <Divider style={{ marginVertical: 14 }} />

              <Text style={styles.modalSectionTitle}>Regulatory & Compliance</Text>
              <View style={styles.complianceList}>
                <View style={styles.complianceRow}>
                  <MaterialCommunityIcons
                    name={selectedProduct?.omriListed ? 'check-circle' : 'close-circle'}
                    size={20}
                    color={selectedProduct?.omriListed ? '#16A34A' : '#94A3B8'}
                  />
                  <Text style={styles.complianceRowText}>
                    {selectedProduct?.omriListed ? 'OMRI Listed for Certified Organic Production' : 'Conventional Agricultural Use Only'}
                  </Text>
                </View>
                <View style={styles.complianceRow}>
                  <MaterialCommunityIcons
                    name={selectedProduct?.countsTowardN ? 'check-circle' : 'minus-circle-outline'}
                    size={20}
                    color={selectedProduct?.countsTowardN ? '#0C6054' : '#94A3B8'}
                  />
                  <Text style={styles.complianceRowText}>
                    {selectedProduct?.countsTowardN
                      ? 'Reportable Nitrogen: Calculated under California Central Valley Regional Water Board guidelines'
                      : 'Exempt from Regional Water Board nitrogen reporting thresholds'}
                  </Text>
                </View>
              </View>

              <View style={styles.pricingDisclaimerBox}>
                <MaterialCommunityIcons name="receipt" size={18} color="#0C6054" />
                <Text style={styles.pricingDisclaimerText}>
                  In keeping with ReNu-Biome grower policy, no unit prices are shown. All shipments are invoiced through QuickBooks based on your seasonal contract.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                mode="outlined"
                onPress={() => setDetailVisible(false)}
                textColor="#64748B"
                style={{ flex: 1, marginRight: 8, minHeight: 48, justifyContent: 'center' }}
              >
                Close
              </Button>
              <Button
                mode="contained"
                onPress={() => {
                  setDetailVisible(false);
                  handleContactOffice();
                }}
                buttonColor="#0C6054"
                icon="phone"
                style={{ flex: 1, marginLeft: 8, minHeight: 48, justifyContent: 'center' }}
              >
                Order Inquiry
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    paddingTop: 54,
    paddingBottom: 22,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {},
  brandTag: {
    color: '#F07E42',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#CCFBF1',
    marginTop: 4,
    lineHeight: 18,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  orderingFlagBanner: {
    flexDirection: 'row',
    backgroundColor: '#F0FDFA',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#99F6E4',
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  flagIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flagTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#083F38',
  },
  flagText: {
    fontSize: 12,
    color: '#115E59',
    marginTop: 4,
    lineHeight: 17,
  },
  contactSupportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  contactSupportText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0C6054',
  },
  catalogMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  catalogCount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  noPricingNotice: {
    fontSize: 11,
    color: '#64748B',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  productName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  analysisText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0C6054',
    marginTop: 2,
  },
  omriBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  omriBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#166534',
  },
  productDesc: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginTop: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  nutrientChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  nAccountingChip: {
    backgroundColor: '#F0FDFA',
    borderColor: '#CCFBF1',
  },
  nutrientChipLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0C6054',
  },
  nutrientChipVal: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 14,
    paddingTop: 10,
  },
  complianceTag: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0C6054',
  },
  viewSpecText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0C6054',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  modalBrand: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F07E42',
    letterSpacing: 1.2,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  specBox: {
    backgroundColor: '#F0FDFA',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#99F6E4',
    marginVertical: 10,
  },
  specLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#083F38',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  specAnalysis: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0C6054',
    marginTop: 4,
  },
  specDensity: {
    fontSize: 12,
    color: '#115E59',
    marginTop: 4,
    fontWeight: '600',
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 12,
    marginBottom: 6,
  },
  modalDesc: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
  },
  complianceList: {
    gap: 8,
  },
  complianceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  complianceRowText: {
    flex: 1,
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
  },
  pricingDisclaimerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 16,
  },
  pricingDisclaimerText: {
    flex: 1,
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 16,
  },
});
