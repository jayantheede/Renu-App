import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { submitProduct } from '../../api/client';

export const ManageProductsScreen = () => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [desc, setDesc] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddProduct = async () => {
    if (!name || !price) {
      Alert.alert('Error', 'Please enter a name and price');
      return;
    }
    setLoading(true);
    try {
      await submitProduct({ 
        name, 
        price: parseFloat(price), 
        description: desc,
        imageUrl: imageUrl || undefined 
      });
      Alert.alert('Success', 'Product added to storefront successfully!');
      setName('');
      setPrice('');
      setDesc('');
      setImageUrl('');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to add product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>
            Manage Products
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Add and manage items available on the storefront
          </Text>
        </View>

        <View style={styles.formCard}>
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
          <TextInput
            label="Image URL (Optional)"
            value={imageUrl}
            onChangeText={setImageUrl}
            style={styles.input}
            mode="outlined"
            outlineColor="#CBD5E1"
            activeOutlineColor="#2E5D36"
            textColor="#0F172A"
          />

          <Button 
            mode="contained" 
            onPress={handleAddProduct} 
            loading={loading}
            style={styles.button}
            textColor="#FFF"
            buttonColor="#2E5D36"
          >
            Add Product
          </Button>
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
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  button: {
    marginTop: 8,
    paddingVertical: 6,
    borderRadius: 10,
  }
});
