import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, Image, Modal } from 'react-native';
import { Text, TextInput, Button, Chip, Divider, Switch } from 'react-native-paper';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { submitProduct, fetchProducts, deleteProduct, updateProduct, fetchFeatureFlags } from '../../api/client';

export const ManageProductsScreen = () => {
  const [name, setName] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [omriListed, setOmriListed] = useState(true);
  const [desc, setDesc] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFileName, setImageFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [documentsFlag, setDocumentsFlag] = useState(false);

  // Edit Product Modal State (NO PRICE)
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editAnalysis, setEditAnalysis] = useState('');
  const [editOmriListed, setEditOmriListed] = useState(false);
  const [editDesc, setEditDesc] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [updating, setUpdating] = useState(false);

  const loadData = async () => {
    setLoadingProducts(true);
    try {
      const [prods, flags] = await Promise.all([
        fetchProducts().catch(() => []),
        fetchFeatureFlags().catch(() => ({}))
      ]);
      setProducts(Array.isArray(prods) ? prods : []);
      setDocumentsFlag(flags?.global?.documents ?? flags?.documents ?? false);
    } catch (e) {
      console.error('Failed to load products', e);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePickImage = async (isEdit = false) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const isPng = asset.mimeType?.includes('png') || asset.uri?.toLowerCase().endsWith('.png');
        const mime = isPng ? 'image/png' : 'image/jpeg';
        const dataUri = asset.base64 ? `data:${mime};base64,${asset.base64}` : asset.uri;

        if (isEdit) {
          setEditImageUrl(dataUri);
        } else {
          setImageUrl(dataUri);
          const nameFromUri = asset.uri.split('/').pop() || 'product_image.jpg';
          setImageFileName(nameFromUri);
        }
      }
    } catch (error: any) {
      Alert.alert('Image Error', 'Failed to select image from device');
    }
  };

  const handleAddProduct = async () => {
    if (!name.trim()) {
      Alert.alert('Required Field', 'Please enter a product name');
      return;
    }
    setLoading(true);
    try {
      await submitProduct({ 
        name: name.trim(), 
        description: desc.trim(),
        analysis: analysis.trim() || 'Custom Agricultural Formulation',
        omriListed: omriListed,
        imageUrl: imageUrl.trim() || undefined 
      });
      Alert.alert('Success', `${name.trim()} added to product catalogue.`);
      setName('');
      setAnalysis('');
      setDesc('');
      setImageUrl('');
      setImageFileName('');
      setOmriListed(true);
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to add product');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (p: any) => {
    setEditingProduct(p);
    setEditName(p.name || '');
    setEditAnalysis(p.analysis || '');
    setEditOmriListed(p.omriListed ?? true);
    setEditDesc(p.description || '');
    setEditImageUrl(p.imageUrl || '');
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editingProduct || !editName.trim()) return;
    setUpdating(true);
    try {
      await updateProduct(editingProduct.id, {
        name: editName.trim(),
        analysis: editAnalysis.trim(),
        omriListed: editOmriListed,
        description: editDesc.trim(),
        imageUrl: editImageUrl || undefined
      });
      Alert.alert('Product Updated', `${editName.trim()} specifications saved.`);
      setEditModalVisible(false);
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update product');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteProduct = (p: any) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to remove ${p.name} from the catalogue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProduct(p.id);
              loadData();
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to delete product');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Product Catalogue</Text>
          <Text style={styles.subtitle}>Maintain product formulations, nutrient analysis & OMRI status</Text>
        </View>

        {/* Add Product Card */}
        <View style={styles.formCard}>
          <Text style={styles.cardTitle}>Add New Catalogue Formulation</Text>

          <TextInput
            label="Product Name"
            value={name}
            onChangeText={setName}
            mode="outlined"
            placeholder="e.g. Bio-Gro Nitrogen Optimizer"
            style={styles.input}
          />

          <TextInput
            label="Guaranteed Analysis / Inoculant Specs"
            value={analysis}
            onChangeText={setAnalysis}
            mode="outlined"
            placeholder="e.g. 10-0-0 + Microbial Inoculant"
            style={styles.input}
          />

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>OMRI Listed (Organic Certified)</Text>
              <Text style={styles.switchSub}>Display organic certification seal in catalogue</Text>
            </View>
            <Switch
              value={omriListed}
              onValueChange={setOmriListed}
              color="#2E5D36"
            />
          </View>

          <TextInput
            label="Description & Agronomic Benefits"
            value={desc}
            onChangeText={setDesc}
            mode="outlined"
            multiline
            numberOfLines={3}
            placeholder="e.g. Fast-uptake biological nitrogen catalyst promoting active beneficial soil microbiota."
            style={styles.input}
          />

          {/* Image Picker */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 4, marginBottom: 12 }}>
            <Button
              mode="outlined"
              onPress={() => handlePickImage(false)}
              icon="camera"
              textColor="#2E5D36"
              style={{ borderColor: '#2E5D36', flex: 1, minHeight: 48, justifyContent: 'center' }}
            >
              {imageUrl ? 'Change Photo' : 'Upload Photo'}
            </Button>
            {imageUrl ? (
              <Button
                mode="text"
                onPress={() => setImageUrl('')}
                textColor="#DC2626"
                style={{ minHeight: 48, justifyContent: 'center' }}
              >
                Clear
              </Button>
            ) : null}
          </View>

          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.previewImage} resizeMode="cover" />
          ) : null}

          {/* Product Documents (behind documents flag) */}
          {documentsFlag && (
            <View style={styles.docsFlagBox}>
              <MaterialCommunityIcons name="file-certificate" size={20} color="#0369A1" />
              <View style={{ marginLeft: 8, flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>Product Documents (Active Flag)</Text>
                <Text style={{ fontSize: 11, color: '#64748B' }}>Labels, SDS and OMRI certificates are attached and available for delivery audits.</Text>
              </View>
            </View>
          )}

          <Button
            mode="contained"
            onPress={handleAddProduct}
            loading={loading}
            buttonColor="#2E5D36"
            style={{ marginTop: 8, borderRadius: 12 }}
            contentStyle={{ minHeight: 48 }}
          >
            Add to Catalogue
          </Button>
        </View>

        {/* Existing Products List */}
        <Text style={[styles.sectionHeading, { marginTop: 24 }]}>
          Current Catalogue ({products.length})
        </Text>

        {products.map((p) => (
          <View key={p.id} style={styles.productCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.productName}>{p.name}</Text>
                {p.analysis ? (
                  <Text style={styles.productAnalysis}>{p.analysis}</Text>
                ) : null}
              </View>

              {p.omriListed ? (
                <Chip compact style={{ backgroundColor: '#DCFCE7' }} textStyle={{ color: '#166534', fontWeight: '800', fontSize: 10 }}>
                  OMRI Listed
                </Chip>
              ) : (
                <Chip compact style={{ backgroundColor: '#F1F5F9' }} textStyle={{ color: '#475569', fontSize: 10 }}>
                  Conventional
                </Chip>
              )}
            </View>

            <Text style={styles.productDesc}>{p.description || 'No description provided.'}</Text>

            <Divider style={{ marginVertical: 12, backgroundColor: '#F1F5F9' }} />

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
              <Button
                mode="outlined"
                onPress={() => openEditModal(p)}
                textColor="#2E5D36"
                style={{ borderColor: '#2E5D36', minHeight: 44, justifyContent: 'center' }}
              >
                Edit Specifications
              </Button>
              <Button
                mode="text"
                onPress={() => handleDeleteProduct(p)}
                textColor="#DC2626"
                style={{ minHeight: 44, justifyContent: 'center' }}
              >
                Delete
              </Button>
            </View>
          </View>
        ))}

      </ScrollView>

      {/* ================= EDIT PRODUCT MODAL (NO PRICE) ================= */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Edit Product Specifications</Text>
                <Text style={styles.modalSubtitle}>{editingProduct?.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <TextInput
                label="Product Name"
                value={editName}
                onChangeText={setEditName}
                mode="outlined"
                style={styles.input}
              />

              <TextInput
                label="Guaranteed Analysis / Active Ingredients"
                value={editAnalysis}
                onChangeText={setEditAnalysis}
                mode="outlined"
                style={styles.input}
              />

              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchLabel}>OMRI Listed</Text>
                  <Text style={styles.switchSub}>Certified organic input</Text>
                </View>
                <Switch
                  value={editOmriListed}
                  onValueChange={setEditOmriListed}
                  color="#2E5D36"
                />
              </View>

              <TextInput
                label="Description"
                value={editDesc}
                onChangeText={setEditDesc}
                mode="outlined"
                multiline
                numberOfLines={3}
                style={styles.input}
              />

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                <Button
                  mode="outlined"
                  onPress={() => handlePickImage(true)}
                  icon="camera"
                  textColor="#2E5D36"
                  style={{ borderColor: '#2E5D36', flex: 1, minHeight: 48, justifyContent: 'center' }}
                >
                  Update Photo
                </Button>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                mode="outlined"
                onPress={() => setEditModalVisible(false)}
                textColor="#64748B"
                style={{ flex: 1, marginRight: 8, minHeight: 48, justifyContent: 'center' }}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleSaveEdit}
                loading={updating}
                buttonColor="#2E5D36"
                style={{ flex: 1, marginLeft: 8, minHeight: 48, justifyContent: 'center' }}
              >
                Save Changes
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
  scrollContent: { paddingBottom: 120, paddingHorizontal: 16 },
  header: { paddingTop: 54, paddingBottom: 16 },
  title: { fontSize: 22, fontWeight: '800', color: '#0F172A' },
  subtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 12 },
  input: { marginBottom: 10, backgroundColor: '#FFFFFF' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginBottom: 8,
  },
  switchLabel: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  switchSub: { fontSize: 11, color: '#64748B' },
  previewImage: {
    width: '100%',
    height: 140,
    borderRadius: 10,
    marginBottom: 10,
  },
  docsFlagBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginBottom: 10,
  },
  sectionHeading: { fontSize: 17, fontWeight: '800', color: '#0F172A', marginBottom: 12 },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  productName: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  productAnalysis: { fontSize: 12, fontWeight: '700', color: '#2E5D36', marginTop: 2 },
  productDesc: { fontSize: 13, color: '#475569', marginTop: 6, lineHeight: 18 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  modalTitle: { fontSize: 19, fontWeight: '800', color: '#0F172A' },
  modalSubtitle: { fontSize: 12, color: '#64748B', marginTop: 2 },
  modalActions: { flexDirection: 'row', marginTop: 12 },
});
