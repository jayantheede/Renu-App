import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { GlassCard } from '../../components/GlassCard';
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
      Alert.alert('Success', 'Product added to shop!');
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
    <View style={styles.background}>
      <View style={styles.overlay}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <View style={styles.header}>
            <Text variant="headlineMedium" style={styles.title}>
              Manage Products
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Add items to the storefront
            </Text>
          </View>

          <GlassCard style={styles.formCard}>
            <TextInput
              label="Product Name"
              value={name}
              onChangeText={setName}
              style={styles.input}
              mode="outlined"
              outlineColor="rgba(255,255,255,0.3)"
              activeOutlineColor="#FFFFFF"
              textColor="#FFFFFF"
              theme={{ colors: { onSurfaceVariant: 'rgba(255,255,255,0.7)' } }}
            />
            <TextInput
              label="Price ($)"
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
              style={styles.input}
              mode="outlined"
              outlineColor="rgba(255,255,255,0.3)"
              activeOutlineColor="#FFFFFF"
              textColor="#FFFFFF"
              theme={{ colors: { onSurfaceVariant: 'rgba(255,255,255,0.7)' } }}
            />
            <TextInput
              label="Description"
              value={desc}
              onChangeText={setDesc}
              multiline
              numberOfLines={3}
              style={styles.input}
              mode="outlined"
              outlineColor="rgba(255,255,255,0.3)"
              activeOutlineColor="#FFFFFF"
              textColor="#FFFFFF"
              theme={{ colors: { onSurfaceVariant: 'rgba(255,255,255,0.7)' } }}
            />
            <TextInput
              label="Image URL (Optional)"
              value={imageUrl}
              onChangeText={setImageUrl}
              style={styles.input}
              mode="outlined"
              outlineColor="rgba(255,255,255,0.3)"
              activeOutlineColor="#FFFFFF"
              textColor="#FFFFFF"
              theme={{ colors: { onSurfaceVariant: 'rgba(255,255,255,0.7)' } }}
            />

            <Button 
              mode="contained" 
              onPress={handleAddProduct} 
              loading={loading}
              style={styles.button}
              textColor="#000"
              buttonColor="#FFF"
            >
              Add Product
            </Button>
          </GlassCard>
          
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  scrollContent: {
    paddingBottom: 120,
    paddingHorizontal: 20,
  },
  header: {
    paddingTop: 80,
    paddingBottom: 20,
  },
  title: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
  },
  formCard: {
    padding: 24,
  },
  input: {
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  button: {
    marginTop: 8,
    paddingVertical: 6,
  }
});
