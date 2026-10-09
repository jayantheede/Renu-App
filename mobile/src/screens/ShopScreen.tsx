import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image, FlatList, Dimensions, TextInput } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';
import { fetchProducts } from '../api/client';
import { LinearGradient } from 'expo-linear-gradient';

const SCREEN_WIDTH = Dimensions.get('window').width;

const FALLBACK_PRODUCTS = [
  { id: 'prod-1', name: 'Biome Care', description: 'Fermentation-based liquid designed to improve soil health and water-holding capacity.', price: 120.00, imageUrl: 'https://via.placeholder.com/400x300/15803D/FFFFFF?text=Biome+Care' },
  { id: 'prod-2', name: 'N-CARE', description: 'Green nitrification inhibitor that extends nitrogen shelf life by up to 8 weeks and reduces leaching.', price: 250.00, imageUrl: 'https://via.placeholder.com/400x300/10B981/FFFFFF?text=N-CARE' },
  { id: 'prod-3', name: 'K-RUSH', description: 'Specialized formula for frost prevention and enhancing fruit quality.', price: 180.00, imageUrl: 'https://via.placeholder.com/400x300/FACC15/000000?text=K-RUSH' },
  { id: 'prod-4', name: 'Bee Bloom', description: 'Pheromone blend to promote bee health and optimize pollination.', price: 85.00, imageUrl: 'https://via.placeholder.com/400x300/F59E0B/000000?text=Bee+Bloom' }
];

export const ShopScreen = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'detail' | 'cart' | 'checkout' | 'success'>('list');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Payment State
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  
  // Cart State
  const [cart, setCart] = useState<Array<{ product: any, qty: number }>>([]);
  
  const user = useAuthStore(state => state.user);

  useEffect(() => {
    fetchProducts()
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setProducts(data);
        } else {
          setProducts(FALLBACK_PRODUCTS);
        }
      })
      .catch(e => {
        console.error(e);
        setProducts(FALLBACK_PRODUCTS);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleProductSelect = (product: any) => {
    setSelectedProduct(product);
    setQuantity(1);
    setViewMode('detail');
  };

  const addToCart = () => {
    const existing = cart.find(item => item.product.id === selectedProduct.id);
    if (existing) {
      setCart(cart.map(item => item.product.id === selectedProduct.id ? { ...item, qty: item.qty + quantity } : item));
    } else {
      setCart([...cart, { product: selectedProduct, qty: quantity }]);
    }
    setViewMode('list');
  };
  
  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.product.id !== id));
  };
  
  const updateCartQty = (id: string, newQty: number) => {
    if (newQty < 1) return removeFromCart(id);
    setCart(cart.map(item => item.product.id === id ? { ...item, qty: newQty } : item));
  };

  const handleCheckout = () => {
    setViewMode('checkout');
  };
  
  const processPayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setCart([]);
      setCardNumber('');
      setExpiry('');
      setCvc('');
      setViewMode('success');
    }, 2000);
  };
  
  const cartTotal = cart.reduce((acc, item) => acc + (item.product.price * item.qty), 0);
  const totalItems = cart.reduce((acc, item) => acc + item.qty, 0);

  const renderHeaderWithCart = (title: string, subtitle?: string, showBack = false) => (
    <LinearGradient colors={['#1F4D36', '#2A6B45']} style={styles.header}>
      <View style={styles.headerTopRow}>
        {showBack ? (
          <TouchableOpacity onPress={() => setViewMode(viewMode === 'checkout' ? 'cart' : 'list')} style={styles.backBtnSmall}>
            <MaterialCommunityIcons name="chevron-left" size={26} color="#FFF" />
          </TouchableOpacity>
        ) : <View style={{ width: 34 }} />}
        
        <TouchableOpacity style={styles.cartIconWrapper} onPress={() => setViewMode('cart')}>
          <MaterialCommunityIcons name="shopping-outline" size={24} color="#FFF" />
          {totalItems > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{totalItems}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      <Text style={styles.headerTitle}>{title}</Text>
      {subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
    </LinearGradient>
  );

  const renderList = () => (
    <View style={styles.container}>
      {renderHeaderWithCart('Agricultural Inputs', 'Premium grade supplies for maximum yield')}
      
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#10B981" />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          numColumns={2}
          columnWrapperStyle={styles.rowWrapper}
          renderItem={({ item: prod }) => (
            <TouchableOpacity style={styles.productCard} onPress={() => handleProductSelect(prod)}>
              <Image source={{ uri: prod.imageUrl || 'https://via.placeholder.com/150' }} style={styles.productImage} />
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={1}>{prod.name}</Text>
                <Text style={styles.productPrice}>${prod.price?.toFixed(2)}</Text>
              </View>
              <TouchableOpacity style={styles.addBtnSmall} onPress={() => handleProductSelect(prod)}>
                <MaterialCommunityIcons name="plus" size={20} color="#FFF" />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );

  const renderDetail = () => (
    <View style={styles.container}>
      <View style={styles.detailHeaderActions}>
        <TouchableOpacity style={styles.actionCircle} onPress={() => setViewMode('list')}>
          <MaterialCommunityIcons name="close" size={24} color="#111827" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCircle} onPress={() => setViewMode('cart')}>
          <MaterialCommunityIcons name="shopping-outline" size={22} color="#111827" />
          {totalItems > 0 && (
            <View style={[styles.cartBadge, { top: -2, right: -2 }]}>
              <Text style={styles.cartBadgeText}>{totalItems}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 50 }}>
        <Image source={{ uri: selectedProduct?.imageUrl || 'https://via.placeholder.com/400x300' }} style={styles.detailImage} />
        
        <View style={styles.detailContent}>
          <Text style={styles.detailName}>{selectedProduct?.name}</Text>
          <Text style={styles.detailPrice}>${selectedProduct?.price?.toFixed(2)} / unit</Text>
          
          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>Product Overview</Text>
          <Text style={styles.detailDesc}>{selectedProduct?.description}</Text>
          <View style={styles.divider} />
          
          <Text style={styles.sectionTitle}>Select Quantity</Text>
          <View style={styles.qtyContainer}>
            <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity(Math.max(1, quantity - 1))}>
              <MaterialCommunityIcons name="minus" size={24} color="#15803D" />
            </TouchableOpacity>
            <Text style={styles.qtyText}>{quantity}</Text>
            <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity(quantity + 1)}>
              <MaterialCommunityIcons name="plus" size={24} color="#15803D" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      
      <View style={styles.bottomBar}>
        <View style={styles.priceSummaryRow}>
          <Text style={styles.summaryLabel}>Total:</Text>
          <Text style={styles.summaryValue}>${(selectedProduct?.price * quantity).toFixed(2)}</Text>
        </View>
        <TouchableOpacity style={styles.checkoutBtn} onPress={addToCart}>
          <Text style={styles.checkoutBtnText}>Add to Cart</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCart = () => (
    <View style={styles.container}>
      {renderHeaderWithCart('Shopping Cart', `${totalItems} items`, true)}
      
      {cart.length === 0 ? (
        <View style={styles.emptyCart}>
          <MaterialCommunityIcons name="cart-remove" size={60} color="#D1D5DB" />
          <Text style={styles.emptyCartText}>Your cart is empty.</Text>
          <TouchableOpacity style={styles.continueBtn} onPress={() => setViewMode('list')}>
            <Text style={styles.continueBtnText}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 15 }}>
            {cart.map((item, index) => (
              <View key={index} style={styles.cartItem}>
                <Image source={{ uri: item.product.imageUrl }} style={styles.cartImg} />
                <View style={styles.cartItemInfo}>
                  <Text style={styles.cartItemName}>{item.product.name}</Text>
                  <Text style={styles.cartItemPrice}>${item.product.price?.toFixed(2)}</Text>
                  
                  <View style={styles.cartQtyRow}>
                    <TouchableOpacity style={styles.cartQtyBtn} onPress={() => updateCartQty(item.product.id, item.qty - 1)}>
                      <MaterialCommunityIcons name="minus" size={16} color="#44403C" />
                    </TouchableOpacity>
                    <Text style={styles.cartQtyText}>{item.qty}</Text>
                    <TouchableOpacity style={styles.cartQtyBtn} onPress={() => updateCartQty(item.product.id, item.qty + 1)}>
                      <MaterialCommunityIcons name="plus" size={16} color="#44403C" />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.cartItemTotal}>
                  <Text style={styles.cartItemTotalText}>${(item.product.price * item.qty).toFixed(2)}</Text>
                  <TouchableOpacity onPress={() => removeFromCart(item.product.id)}>
                    <MaterialCommunityIcons name="trash-can-outline" size={22} color="#EF4444" style={{ marginTop: 15 }} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
          
          <View style={styles.bottomBarCart}>
            <View style={styles.cartTotalRow}>
              <Text style={styles.cartTotalLabel}>Subtotal</Text>
              <Text style={styles.cartTotalLabel}>${cartTotal.toFixed(2)}</Text>
            </View>
            <View style={styles.cartTotalRow}>
              <Text style={styles.cartTotalLabel}>Tax & Fees</Text>
              <Text style={styles.cartTotalLabel}>Calculated at checkout</Text>
            </View>
            <View style={[styles.cartTotalRow, { borderTopWidth: 1, borderTopColor: '#E7E5E4', paddingTop: 15, marginTop: 15 }]}>
              <Text style={styles.cartTotalGrand}>Grand Total</Text>
              <Text style={styles.cartTotalGrandValue}>${cartTotal.toFixed(2)}</Text>
            </View>
            
            <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckout}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <MaterialCommunityIcons name="lock" size={18} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.checkoutBtnText}>Checkout Securely</Text>
              </View>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );

  const renderCheckout = () => (
    <View style={styles.container}>
      {renderHeaderWithCart('Secure Checkout', 'Complete your purchase', true)}
      
  <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        <View style={styles.paymentCard}>
          <Text style={styles.sectionTitle}>Payment Details</Text>
          
          <Text style={styles.inputLabel}>Card Number</Text>
          <View style={styles.inputWrapper}>
            <MaterialCommunityIcons name="credit-card-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
            <TextInput style={styles.inputField} placeholder="**** **** **** 4242" value={cardNumber} onChangeText={setCardNumber} keyboardType="numeric" maxLength={19} />
          </View>
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, marginRight: 15 }}>
              <Text style={styles.inputLabel}>Expiry</Text>
              <View style={styles.inputWrapper}>
                <MaterialCommunityIcons name="calendar-blank" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput style={styles.inputField} placeholder="MM/YY" value={expiry} onChangeText={setExpiry} maxLength={5} />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>CVC</Text>
              <View style={styles.inputWrapper}>
                <MaterialCommunityIcons name="lock-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput style={styles.inputField} placeholder="123" value={cvc} onChangeText={setCvc} keyboardType="numeric" maxLength={4} secureTextEntry />
              </View>
            </View>
          </View>
          
          <Text style={styles.inputLabel}>Name on Card</Text>
          <View style={styles.inputWrapper}>
            <MaterialCommunityIcons name="account-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
            <TextInput style={styles.inputField} placeholder="John Doe" />
          </View>
        </View>

        <View style={styles.orderSummaryCard}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          {cart.map((item, idx) => (
            <View key={idx} style={styles.summaryRow}>
              <Text style={styles.summaryItemText}>{item.qty}x {item.product.name}</Text>
              <Text style={styles.summaryItemPrice}>${(item.product.price * item.qty).toFixed(2)}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.cartTotalGrand}>Total to Pay</Text>
            <Text style={styles.cartTotalGrandValue}>${cartTotal.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomBarCart}>
        <TouchableOpacity style={styles.checkoutBtn} onPress={processPayment} disabled={isProcessing}>
          {isProcessing ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <MaterialCommunityIcons name="shield-check" size={20} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.checkoutBtnText}>Pay ${cartTotal.toFixed(2)}</Text>
            </View>
          )}
        </TouchableOpacity>
        <Text style={styles.secureBadgeText}>Encrypted and Secure Payment</Text>
      </View>
    </View>
  );

  const renderSuccess = () => (
    <View style={styles.successContainer}>
      <View style={styles.successCircle}>
        <MaterialCommunityIcons name="check" size={60} color="#FFF" />
      </View>
      <Text style={styles.successTitle}>Payment Successful!</Text>
      <Text style={styles.successSub}>Order #ORD-{Math.floor(1000 + Math.random() * 9000)} has been placed.</Text>
      
      <View style={styles.successDetailsBox}>
        <Text style={styles.successDetailText}>A confirmation email has been sent to {user?.email || 'your account'}.</Text>
        <Text style={styles.successDetailText}>You can track the fulfillment status in the Orders tab.</Text>
      </View>
      
      <TouchableOpacity style={styles.checkoutBtn} onPress={() => setViewMode('list')}>
        <Text style={styles.checkoutBtnText}>Return to Shop</Text>
      </TouchableOpacity>
    </View>
  );

  return viewMode === 'list' ? renderList() : viewMode === 'detail' ? renderDetail() : viewMode === 'cart' ? renderCart() : viewMode === 'checkout' ? renderCheckout() : renderSuccess();
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F6' },
  header: { paddingTop: 50, paddingBottom: 25, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, shadowColor: '#166534', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 5 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  backBtnSmall: { padding: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 },
  headerTitle: { fontSize: 32, fontWeight: '900', color: '#ECFDF5', letterSpacing: 0.5 },
  headerSubtitle: { fontSize: 16, color: '#A7F3D0', marginTop: 4, fontWeight: '500' },
  
  cartIconWrapper: { position: 'relative', backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  cartBadge: { position: 'absolute', top: -5, right: -5, backgroundColor: '#EF4444', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  cartBadgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  
  listContent: { padding: 15, paddingBottom: 100, paddingTop: 25 },
  rowWrapper: { justifyContent: 'space-between', marginBottom: 18 },
  
  productCard: { backgroundColor: '#FFF', borderRadius: 20, width: (SCREEN_WIDTH - 45) / 2, shadowColor: '#8C7C61', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4, borderWidth: 1, borderColor: '#F0EBE1', overflow: 'hidden' },
  productImage: { width: '100%', height: 160, backgroundColor: '#E7E5E4' },
  productInfo: { padding: 15, paddingBottom: 18 },
  productName: { fontSize: 17, fontWeight: '800', color: '#164E63', marginBottom: 6 },
  productPrice: { fontSize: 16, fontWeight: '900', color: '#10B981' },
  addBtnSmall: { position: 'absolute', bottom: 12, right: 12, backgroundColor: '#15803D', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', shadowColor: '#15803D', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 5 },
  
  detailHeaderActions: { position: 'absolute', top: 50, left: 15, right: 15, zIndex: 10, flexDirection: 'row', justifyContent: 'space-between' },
  actionCircle: { backgroundColor: '#FFF', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 5 },
  
  detailImage: { width: SCREEN_WIDTH, height: 380, backgroundColor: '#E7E5E4' },
  detailContent: { padding: 25, paddingBottom: 50, backgroundColor: '#FAF9F6', marginTop: -25, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  detailName: { fontSize: 32, fontWeight: '900', color: '#164E63', letterSpacing: -0.5 },
  detailPrice: { fontSize: 24, fontWeight: '900', color: '#10B981', marginTop: 10 },
  divider: { height: 1.5, backgroundColor: '#E7E5E4', marginVertical: 25 },
  sectionTitle: { fontSize: 19, fontWeight: '900', color: '#44403C', marginBottom: 12 },
  detailDesc: { fontSize: 16, color: '#78716C', lineHeight: 24, fontWeight: '500' },
  
  qtyContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', alignSelf: 'flex-start', borderRadius: 30, borderWidth: 1.5, borderColor: '#A7F3D0', padding: 6, shadowColor: '#16A34A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
  qtyBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#16A34A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  qtyText: { fontSize: 20, fontWeight: '900', color: '#164E63', marginHorizontal: 25 },
  
  bottomBar: { backgroundColor: '#FFF', padding: 20, paddingBottom: 100, borderTopWidth: 1, borderTopColor: '#E7E5E4', shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.08, shadowRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  priceSummaryRow: { flex: 1 },
  summaryLabel: { fontSize: 13, color: '#78716C', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryValue: { fontSize: 26, fontWeight: '900', color: '#10B981' },
  checkoutBtn: { backgroundColor: '#15803D', paddingVertical: 18, paddingHorizontal: 30, borderRadius: 30, alignItems: 'center', shadowColor: '#16A34A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  checkoutBtnText: { color: '#FFF', fontSize: 17, fontWeight: '900' },

  emptyCart: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyCartText: { fontSize: 20, fontWeight: 'bold', color: '#6B7280', marginVertical: 20 },
  continueBtn: { backgroundColor: '#F0FDF4', borderWidth: 1.5, borderColor: '#10B981', paddingVertical: 14, paddingHorizontal: 30, borderRadius: 30 },
  continueBtnText: { color: '#15803D', fontWeight: '900', fontSize: 16 },

  cartItem: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 20, padding: 15, marginBottom: 15, shadowColor: '#8C7C61', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3, borderWidth: 1, borderColor: '#F0EBE1' },
  cartImg: { width: 80, height: 80, borderRadius: 12, backgroundColor: '#E7E5E4' },
  cartItemInfo: { flex: 1, marginLeft: 15 },
  cartItemName: { fontSize: 16, fontWeight: '800', color: '#164E63' },
  cartItemPrice: { fontSize: 15, fontWeight: 'bold', color: '#10B981', marginTop: 4 },
  cartQtyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, backgroundColor: '#F5F5F4', alignSelf: 'flex-start', borderRadius: 15, padding: 2 },
  cartQtyBtn: { padding: 6 },
  cartQtyText: { marginHorizontal: 12, fontWeight: 'bold', fontSize: 14, color: '#44403C' },
  cartItemTotal: { alignItems: 'flex-end', justifyContent: 'space-between' },
  cartItemTotalText: { fontSize: 17, fontWeight: '900', color: '#164E63' },

  bottomBarCart: { backgroundColor: '#FFF', padding: 25, paddingBottom: 100, borderTopLeftRadius: 30, borderTopRightRadius: 30, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10, borderWidth: 1, borderColor: '#F0EBE1' },
  cartTotalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  cartTotalLabel: { fontSize: 15, color: '#78716C', fontWeight: '600' },
  cartTotalGrand: { fontSize: 18, fontWeight: '900', color: '#164E63' },
  cartTotalGrandValue: { fontSize: 24, fontWeight: '900', color: '#10B981' },

  paymentCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, shadowColor: '#8C7C61', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3, borderWidth: 1, borderColor: '#F0EBE1', marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: '700', color: '#44403C', marginBottom: 8, marginTop: 5 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F4', borderRadius: 12, borderWidth: 1, borderColor: '#E7E5E4', marginBottom: 15 },
  inputIcon: { paddingHorizontal: 12 },
  inputField: { flex: 1, paddingVertical: 14, fontSize: 16, color: '#111827' },
  
  orderSummaryCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, shadowColor: '#8C7C61', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3, borderWidth: 1, borderColor: '#F0EBE1', marginBottom: 20 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  summaryItemText: { fontSize: 15, color: '#44403C', fontWeight: '500' },
  summaryItemPrice: { fontSize: 15, fontWeight: '700', color: '#164E63' },
  secureBadgeText: { textAlign: 'center', fontSize: 12, color: '#A8A29E', marginTop: 15, fontWeight: '600' },
  
  successContainer: { flex: 1, backgroundColor: '#FAF9F6', justifyContent: 'center', alignItems: 'center', padding: 20, paddingBottom: 100 },
  successCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center', shadowColor: '#10B981', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 8, marginBottom: 30 },
  successTitle: { fontSize: 28, fontWeight: '900', color: '#164E63', marginBottom: 10 },
  successSub: { fontSize: 16, color: '#44403C', fontWeight: '600', marginBottom: 30, textAlign: 'center' },
  successDetailsBox: { backgroundColor: '#F0FDF4', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#A7F3D0', marginBottom: 40, width: '100%' },
  successDetailText: { fontSize: 14, color: '#064E3B', textAlign: 'center', lineHeight: 22, marginBottom: 8 }
});
