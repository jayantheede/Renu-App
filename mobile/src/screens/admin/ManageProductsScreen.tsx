import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, Image } from 'react-native';
import { Text, TextInput, Button, Chip, Divider, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { submitProduct, fetchProducts, deleteProduct } from '../../api/client';

export const ManageProductsScreen = () => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [desc, setDesc] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFileName, setImageFileName] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const data = await fetchProducts();
      setProducts(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to load products', e);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handlePickImage = async () => {
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
        
        if (asset.base64) {
          setImageUrl(`data:${mime};base64,${asset.base64}`);
        } else {
          setImageUrl(asset.uri);
        }

        const nameFromUri = asset.uri.split('/').pop() || (isPng ? 'product_image.png' : 'product_image.jpg');
        setImageFileName(nameFromUri);
      }
    } catch (error: any) {
      Alert.alert('Image Error', 'Failed to select image from device');
    }
  };

  const handleRemoveImage = () => {
    setImageUrl('');
    setImageFileName('');
  };

  const handleAddProduct = async () => {
    if (!name.trim() || !price.trim()) {
      Alert.alert('Required Fields', 'Please enter a product name and price');
      return;
    }
    setLoading(true);
    try {
      await submitProduct({ 
        name: name.trim(), 
        price: parseFloat(price), 
        description: desc.trim(), 
        imageUrl: imageUrl.trim() || undefined 
      });
      Alert.alert('Success', `${name.trim()} added to storefront successfully!`);
      setName('');
      setPrice('');
      setDesc('');
      setImageUrl('');
      setImageFileName('');
      loadProducts();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to add product');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = (id: string, prodName: string) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to remove "${prodName}" from the storefront?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProduct(id);
              loadProducts();
            } catch (e) {
              Alert.alert('Error', 'Failed to delete product');
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
          <Text variant="headlineMedium" style={styles.title}>
            Manage Products
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Add and manage items available on the storefront
          </Text>
        </View>

        {/* Product Creation Card */}
        <View style={styles.formCard}>
          <Text style={styles.formSectionTitle}>Product Details</Text>

          <TextInput
            label="Product Name"
            value={name}
            onChangeText={setName}
            style={styles.input}
            mode="outlined"
            outlineColor="#CBD5E1"
            activeOutlineColor="#2E5D36"
            textColor="#0F172A"
          />

          <TextInput
            label="Price ($)"
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
            style={styles.input}
            mode="outlined"
            outlineColor="#CBD5E1"
            activeOutlineColor="#2E5D36"
            textColor="#0F172A"
          />

          <TextInput
            label="Description"
            value={desc}
            onChangeText={setDesc}
            multiline
            numberOfLines={3}
            style={styles.input}
            mode="outlined"
            outlineColor="#CBD5E1"
            activeOutlineColor="#2E5D36"
            textColor="#0F172A"
          />

          {/* PNG & JPG Image Upload Section */}
          <Text style={styles.imageSectionLabel}>Product Media (PNG / JPG)</Text>

          {imageUrl ? (
            /* Selected Image Preview */
            <View style={styles.previewContainer}>
              <Image source={{ uri: imageUrl }} style={styles.previewImage} resizeMode="cover" />
              <View style={styles.previewMetaRow}>
                <View style={{ flex: 1 }}>
                  <Chip compact style={styles.pngJpgChip} textStyle={styles.pngJpgChipText}>
                    PNG / JPG READY
                  </Chip>
                  {imageFileName ? (
                    <Text numberOfLines={1} style={styles.fileNameText}>
                      {imageFileName}
                    </Text>
                  ) : null}
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity onPress={handlePickImage} style={styles.changeBtn}>
                    <Ionicons name="swap-horizontal" size={14} color="#2E5D36" />
                    <Text style={styles.changeBtnText}>Change</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleRemoveImage} style={styles.removeBtn}>
                    <Ionicons name="trash-outline" size={14} color="#DC2626" />
                    <Text style={styles.removeBtnText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : (
            /* Upload Image Picker Button */
            <TouchableOpacity onPress={handlePickImage} style={styles.uploadArea}>
              <View style={styles.uploadIconCircle}>
                <Ionicons name="image-outline" size={26} color="#2E5D36" />
              </View>
              <Text style={styles.uploadMainText}>Upload Image (PNG, JPG)</Text>
              <Text style={styles.uploadSubText}>Tap to browse photo library or files on your device</Text>
              <View style={styles.badgeRow}>
                <Chip compact style={styles.formatChip} textStyle={styles.formatChipText}>.PNG</Chip>
                <Chip compact style={styles.formatChip} textStyle={styles.formatChipText}>.JPG</Chip>
                <Chip compact style={styles.formatChip} textStyle={styles.formatChipText}>.JPEG</Chip>
              </View>
            </TouchableOpacity>
          )}

          {/* Fallback Image URL Option */}
          <TouchableOpacity 
            onPress={() => setShowUrlInput(!showUrlInput)} 
            style={styles.toggleUrlBtn}
          >
            <Ionicons name={showUrlInput ? "chevron-up" : "link-outline"} size={14} color="#64748B" />
            <Text style={styles.toggleUrlText}>
              {showUrlInput ? "Hide Direct URL Field" : "Or enter external Image URL instead"}
            </Text>
          </TouchableOpacity>

          {showUrlInput && (
            <TextInput
              label="Direct Image URL"
              value={imageUrl}
              onChangeText={setImageUrl}
              style={[styles.input, { marginTop: 8 }]}
              mode="outlined"
              outlineColor="#CBD5E1"
              activeOutlineColor="#2E5D36"
              textColor="#0F172A"
              placeholder="https://example.com/image.png"
            />
          )}

          <Button 
            mode="contained" 
            onPress={handleAddProduct} 
            loading={loading}
            style={styles.button}
            textColor="#FFF"
            buttonColor="#2E5D36"
          >
            Add Product to Storefront
          </Button>
        </View>

        {/* Existing Storefront Products Section */}
        <View style={styles.existingSection}>
          <View style={styles.existingHeaderRow}>
            <Text style={styles.existingTitle}>Storefront Catalog ({products.length})</Text>
            <TouchableOpacity onPress={loadProducts}>
              <Ionicons name="refresh" size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          {loadingProducts ? (
            <ActivityIndicator color="#2E5D36" style={{ marginVertical: 20 }} />
          ) : products.length === 0 ? (
            <Text style={styles.emptyCatalogText}>No products currently listed.</Text>
          ) : (
            products.map((prod) => (
              <View key={prod.id} style={styles.productCard}>
                {prod.imageUrl ? (
                  <Image source={{ uri: prod.imageUrl }} style={styles.productThumb} resizeMode="cover" />
                ) : (
                  <View style={styles.productThumbFallback}>
                    <Ionicons name="cube-outline" size={24} color="#94A3B8" />
                  </View>
                )}
                <View style={styles.productInfo}>
                  <Text style={styles.prodName}>{prod.name}</Text>
                  <Text style={styles.prodPrice}>${Number(prod.price).toLocaleString()}</Text>
                  {prod.description ? (
                    <Text numberOfLines={2} style={styles.prodDesc}>{prod.description}</Text>
                  ) : null}
                </View>
                <TouchableOpacity 
                  onPress={() => handleDeleteProduct(prod.id, prod.name)} 
                  style={styles.deleteProdBtn}
                >
                  <Ionicons name="trash-outline" size={18} color="#DC2626" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingBottom: 120,
    paddingHorizontal: 20,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: {
    color: '#0F172A',
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#64748B',
    marginTop: 2,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 24,
  },
  formSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
  },
  input: {
    marginBottom: 14,
    backgroundColor: '#FFFFFF',
  },
  imageSectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginTop: 6,
    marginBottom: 8,
  },
  uploadArea: {
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    marginBottom: 10,
  },
  uploadIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  uploadMainText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  uploadSubText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  formatChip: {
    backgroundColor: '#F1F5F9',
    height: 22,
  },
  formatChipText: {
    fontSize: 10,
    color: '#475569',
    fontWeight: '600',
  },
  previewContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    marginBottom: 10,
  },
  previewImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#E2E8F0',
  },
  previewMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  pngJpgChip: {
    backgroundColor: '#DCFCE7',
    height: 22,
    alignSelf: 'flex-start',
  },
  pngJpgChipText: {
    color: '#15803D',
    fontWeight: 'bold',
    fontSize: 10,
  },
  fileNameText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 3,
  },
  changeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#E8F5E9',
  },
  changeBtnText: {
    fontSize: 11,
    color: '#2E5D36',
    fontWeight: '600',
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#FEF2F2',
  },
  removeBtnText: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '600',
  },
  toggleUrlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    marginBottom: 8,
  },
  toggleUrlText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  button: {
    marginTop: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },

  /* Catalog */
  existingSection: {
    marginBottom: 40,
  },
  existingHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  existingTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  emptyCatalogText: {
    color: '#94A3B8',
    fontSize: 14,
    marginVertical: 10,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  productThumb: {
    width: 58,
    height: 58,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  productThumbFallback: {
    width: 58,
    height: 58,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  prodName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  prodPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2E5D36',
    marginTop: 2,
  },
  prodDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  deleteProdBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
  },
});
