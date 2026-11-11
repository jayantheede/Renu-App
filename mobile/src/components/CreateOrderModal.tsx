import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Modal,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { Text, TextInput, Button, Chip, Divider } from 'react-native-paper';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { fetchAdminCustomers, fetchRanches, fetchProducts, submitDelivery } from '../api/client';
import { BRAND_COLORS } from '../theme/theme';
import { useResponsiveLayout } from '../utils/responsive';

export interface CreateOrderModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialCustomerId?: string;
  initialCustomerName?: string;
}

const CANONICAL_PRODUCTS = [
  'ReNu N-32%, K-28% Blend',
  'ReNu N-32%, K-24% Blend (K acetate)',
  'ReNu N-32%, K-28% Blend + B, Zn',
  'ReNu Fruit Care',
  'ReNu 0-0-29 Potassium Acetate',
  'ReNu N-6%, K-16%, Ca-20% Blend',
  'Bloom foliars + boron',
];

export const CreateOrderModal: React.FC<CreateOrderModalProps> = ({
  visible,
  onClose,
  onSuccess,
  initialCustomerId,
  initialCustomerName,
}) => {
  const { insets, modalMaxHeight } = useResponsiveLayout(600);
  const [customers, setCustomers] = useState<any[]>([]);
  const [ranches, setRanches] = useState<any[]>([]);
  const [products, setProducts] = useState<string[]>(CANONICAL_PRODUCTS);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(initialCustomerId || '');
  const [selectedCustomerName, setSelectedCustomerName] = useState<string>(initialCustomerName || '');
  const [selectedCustomerEmail, setSelectedCustomerEmail] = useState<string>('');

  const [selectedRanchId, setSelectedRanchId] = useState<string>('');
  const [selectedTankId, setSelectedTankId] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<string>(CANONICAL_PRODUCTS[0]);
  const [gallons, setGallons] = useState<string>('');
  const [selectedBlocks, setSelectedBlocks] = useState<string[]>([]);
  const [deliveryDate, setDeliveryDate] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [deliveryWindow, setDeliveryWindow] = useState<string>('Morning (8:00 AM - 12:00 PM)');
  const [gateCode, setGateCode] = useState<string>('');
  const [whoToCall, setWhoToCall] = useState<string>('');
  const [driverNotes, setDriverNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (visible) {
      loadInitialData();
    }
  }, [visible]);

  const loadInitialData = async () => {
    try {
      const [cData, rData, pData] = await Promise.all([
        fetchAdminCustomers().catch(() => []),
        fetchRanches().catch(() => []),
        fetchProducts().catch(() => []),
      ]);

      const custList = Array.isArray(cData) && cData.length > 0 ? cData : [
        { id: 'mock-cust-1', name: 'Sierra Orchards LLC', email: 'rgundavelli@gmail.com' },
        { id: 'c2', name: 'Kern Pistachio Partners', email: 'kern@farmops.com' },
        { id: 'c3', name: 'Madera Almond Partners', email: 'madera@farmops.com' }
      ];
      setCustomers(custList);

      if (Array.isArray(rData) && rData.length > 0) {
        setRanches(rData);
      }

      if (Array.isArray(pData) && pData.length > 0) {
        setProducts(pData.map((p: any) => p.name || p.title));
      }

      // Default customer selection
      const defCust = custList.find((c: any) => c.id === initialCustomerId) || custList[0];
      if (defCust) {
        setSelectedCustomerId(defCust.id);
        setSelectedCustomerName(defCust.name);
        setSelectedCustomerEmail(defCust.email || '');
      }
    } catch (e) {
      console.warn('Failed to load initial order data:', e);
    }
  };

  // Filter ranches for the selected customer
  const availableRanches = ranches.filter((r) => {
    if (!selectedCustomerId) return true;
    return (
      r.customerId === selectedCustomerId ||
      r.customerEmail === selectedCustomerEmail ||
      r.customerName === selectedCustomerName ||
      !r.customerId
    );
  });

  const activeRanch = availableRanches.find((r) => r.id === selectedRanchId) || availableRanches[0];

  // Update ranch-dependent fields when active ranch changes
  useEffect(() => {
    if (activeRanch) {
      setSelectedRanchId(activeRanch.id);
      if (activeRanch.tanks && activeRanch.tanks.length > 0) {
        setSelectedTankId(activeRanch.tanks[0].id || activeRanch.tanks[0].name);
      }
      setGateCode(activeRanch.gate || activeRanch.gateCode || '#4821');
      setWhoToCall(activeRanch.contact || activeRanch.whoToCall || 'Ranch Manager');
      if (activeRanch.blocks && activeRanch.blocks.length > 0) {
        setSelectedBlocks(activeRanch.blocks.slice(0, 2).map((b: any) => b.id || b.blockId));
      }
    }
  }, [selectedCustomerId, activeRanch?.id]);

  const toggleBlock = (blockId: string) => {
    if (selectedBlocks.includes(blockId)) {
      setSelectedBlocks(selectedBlocks.filter((b) => b !== blockId));
    } else {
      setSelectedBlocks([...selectedBlocks, blockId]);
    }
  };

  const handleSelectCustomer = (cust: any) => {
    setSelectedCustomerId(cust.id);
    setSelectedCustomerName(cust.name);
    setSelectedCustomerEmail(cust.email || '');
  };

  const handleSubmit = async () => {
    const galNum = parseFloat(gallons);
    if (isNaN(galNum) || galNum <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid gallons quantity.');
      return;
    }

    setSubmitting(true);
    try {
      await submitDelivery({
        customerId: selectedCustomerId,
        customerName: selectedCustomerName,
        customerEmail: selectedCustomerEmail,
        product: selectedProduct,
        productName: selectedProduct,
        gallons: galNum,
        ranchId: selectedRanchId,
        ranchName: activeRanch?.name || 'Home Ranch',
        tankId: selectedTankId,
        blocks: selectedBlocks,
        date: deliveryDate,
        deliveryWindow,
        gateCode,
        whoToCall,
        notes: driverNotes,
        status: 'Scheduled',
      });

      Alert.alert('Order Created', `Scheduled delivery of ${galNum.toLocaleString()} gal ${selectedProduct} to ${activeRanch?.name || 'Ranch'}.`);
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create order.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View
        style={[
          styles.modalOverlay,
          {
            paddingLeft: Math.max(16, insets.left),
            paddingRight: Math.max(16, insets.right),
            paddingTop: Math.max(16, insets.top),
            paddingBottom: Math.max(16, insets.bottom),
          },
        ]}
      >
        <View style={[styles.modalContent, { maxHeight: modalMaxHeight }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
              <Text style={styles.modalTitle}>Create Delivery Order</Text>
              <Text style={styles.modalSubtitle}>Office order entry from phone call or email</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialCommunityIcons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formContent}>
            {/* 1. Customer Picker */}
            <Text style={styles.fieldLabel}>CUSTOMER</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {customers.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.customerChip, selectedCustomerId === c.id && styles.customerChipActive]}
                  onPress={() => handleSelectCustomer(c)}
                >
                  <Text style={[styles.customerChipText, selectedCustomerId === c.id && styles.customerChipTextActive]}>
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* 2. Ranch Picker (Scoped to Customer) */}
            <Text style={styles.fieldLabel}>DELIVERY RANCH</Text>
            <View style={styles.selectionGrid}>
              {availableRanches.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.ranchCard, selectedRanchId === r.id && styles.ranchCardActive]}
                  onPress={() => setSelectedRanchId(r.id)}
                >
                  <Text style={[styles.ranchName, selectedRanchId === r.id && styles.ranchNameActive]}>
                    {r.name}
                  </Text>
                  <Text style={styles.ranchSub}>{r.county || 'Central Valley'} · {r.ac || 0} acres</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 3. Destination Tank */}
            {activeRanch?.tanks && activeRanch.tanks.length > 0 && (
              <>
                <Text style={styles.fieldLabel}>DESTINATION TANK</Text>
                <View style={styles.chipWrapRow}>
                  {activeRanch.tanks.map((t: any) => (
                    <TouchableOpacity
                      key={t.id || t.name}
                      style={[styles.tankChip, selectedTankId === (t.id || t.name) && styles.tankChipActive]}
                      onPress={() => setSelectedTankId(t.id || t.name)}
                    >
                      <MaterialCommunityIcons
                        name="storage-tank"
                        size={16}
                        color={selectedTankId === (t.id || t.name) ? '#0C6054' : '#64748B'}
                      />
                      <Text style={[styles.tankChipText, selectedTankId === (t.id || t.name) && styles.tankChipTextActive]}>
                        {t.name} ({t.capacity || t.capacityGallons || 2500} gal)
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* 4. Product Picker (7 Canonical Blends) */}
            <Text style={styles.fieldLabel}>PRODUCT BLEND</Text>
            <View style={styles.productPickerWrap}>
              {products.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.productOption, selectedProduct === p && styles.productOptionActive]}
                  onPress={() => setSelectedProduct(p)}
                >
                  <View style={[styles.radioCircle, selectedProduct === p && styles.radioCircleActive]}>
                    {selectedProduct === p && <View style={styles.radioDot} />}
                  </View>
                  <Text style={[styles.productText, selectedProduct === p && styles.productTextActive]}>
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 5. Gallons */}
            <Text style={styles.fieldLabel}>GALLONS</Text>
            <TextInput
              value={gallons}
              onChangeText={setGallons}
              keyboardType="numeric"
              mode="outlined"
              placeholder="e.g. 3,770"
              outlineColor="#CBD5E1"
              activeOutlineColor="#0C6054"
              style={styles.textInput}
            />

            {/* 6. Blocks Multi-Select Chips */}
            {activeRanch?.blocks && activeRanch.blocks.length > 0 && (
              <>
                <Text style={styles.fieldLabel}>BLOCKS COVERED</Text>
                <View style={styles.blocksWrap}>
                  {activeRanch.blocks.map((b: any) => {
                    const bId = b.id || b.blockId;
                    const isSelected = selectedBlocks.includes(bId);
                    return (
                      <TouchableOpacity
                        key={bId}
                        style={[styles.blockChip, isSelected && styles.blockChipActive]}
                        onPress={() => toggleBlock(bId)}
                      >
                        <Text style={[styles.blockChipText, isSelected && styles.blockChipTextActive]}>
                          {bId} ({b.crop || 'Almond'}, {b.acres || b.acreage || 0} ac)
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            {/* 7. Date & Window */}
            <View style={styles.splitRow}>
              <View style={styles.splitCol}>
                <Text style={styles.fieldLabel}>DELIVERY DATE</Text>
                <TextInput
                  value={deliveryDate}
                  onChangeText={setDeliveryDate}
                  mode="outlined"
                  placeholder="YYYY-MM-DD"
                  outlineColor="#CBD5E1"
                  activeOutlineColor="#0C6054"
                  style={styles.textInput}
                />
              </View>
              <View style={styles.splitCol}>
                <Text style={styles.fieldLabel}>WINDOW</Text>
                <TextInput
                  value={deliveryWindow}
                  onChangeText={setDeliveryWindow}
                  mode="outlined"
                  placeholder="Morning / Afternoon"
                  outlineColor="#CBD5E1"
                  activeOutlineColor="#0C6054"
                  style={styles.textInput}
                />
              </View>
            </View>

            {/* 8. Gate Code & Who To Call */}
            <View style={styles.splitRow}>
              <View style={styles.splitCol}>
                <Text style={styles.fieldLabel}>GATE CODE</Text>
                <TextInput
                  value={gateCode}
                  onChangeText={setGateCode}
                  mode="outlined"
                  placeholder="e.g. #4821"
                  outlineColor="#CBD5E1"
                  activeOutlineColor="#0C6054"
                  style={styles.textInput}
                />
              </View>
              <View style={styles.splitCol}>
                <Text style={styles.fieldLabel}>WHO TO CALL ON ARRIVAL</Text>
                <TextInput
                  value={whoToCall}
                  onChangeText={setWhoToCall}
                  mode="outlined"
                  placeholder="Ranch Contact"
                  outlineColor="#CBD5E1"
                  activeOutlineColor="#0C6054"
                  style={styles.textInput}
                />
              </View>
            </View>

            {/* 9. Notes */}
            <Text style={styles.fieldLabel}>DELIVERY NOTES FOR DRIVER</Text>
            <TextInput
              value={driverNotes}
              onChangeText={setDriverNotes}
              mode="outlined"
              placeholder="e.g. Fill tank 1 first; watch for irrigation lines."
              multiline
              numberOfLines={2}
              outlineColor="#CBD5E1"
              activeOutlineColor="#0C6054"
              style={styles.textInput}
            />
          </ScrollView>

          {/* Modal Actions */}
          <View style={styles.actionRow}>
            <Button
              mode="outlined"
              onPress={onClose}
              textColor="#64748B"
              style={styles.cancelBtn}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={submitting}
              buttonColor="#0C6054"
              textColor="#FFFFFF"
              style={styles.submitBtn}
            >
              Schedule Delivery
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(8, 30, 26, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    maxWidth: 600,
    width: '100%',
    maxHeight: '90%',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0C6054',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
  },
  formContent: {
    paddingBottom: 20,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 6,
  },
  chipRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  chipWrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  customerChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  customerChipActive: {
    backgroundColor: '#E6F3F1',
    borderColor: '#0C6054',
  },
  customerChipText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
  customerChipTextActive: {
    color: '#0C6054',
    fontWeight: '700',
  },
  selectionGrid: {
    gap: 8,
  },
  ranchCard: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ranchCardActive: {
    backgroundColor: '#F0FDFA',
    borderColor: '#0C6054',
  },
  ranchName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  ranchNameActive: {
    color: '#0C6054',
  },
  ranchSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  tankChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tankChipActive: {
    backgroundColor: '#E6F3F1',
    borderColor: '#0C6054',
  },
  tankChipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  tankChipTextActive: {
    color: '#0C6054',
    fontWeight: '700',
  },
  productPickerWrap: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  productOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  productOptionActive: {
    backgroundColor: '#F0FDFA',
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  radioCircleActive: {
    borderColor: '#0C6054',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0C6054',
  },
  productText: {
    flex: 1,
    flexShrink: 1,
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  productTextActive: {
    color: '#0C6054',
    fontWeight: '700',
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    fontSize: 13.5,
  },
  blocksWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  blockChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  blockChipActive: {
    backgroundColor: '#E6F3F1',
    borderColor: '#0C6054',
  },
  blockChipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  blockChipTextActive: {
    color: '#0C6054',
    fontWeight: '700',
  },
  splitRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  splitCol: {
    flex: 1,
    minWidth: 135,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cancelBtn: {
    flex: 1,
    borderRadius: 999,
    minHeight: 46,
    justifyContent: 'center',
    borderColor: '#CBD5E1',
  },
  submitBtn: {
    flex: 2,
    borderRadius: 999,
    minHeight: 46,
    justifyContent: 'center',
  },
});
