import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Dimensions, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';
import { AdminOrdersScreen } from '../screens/admin/AdminOrdersScreen';
import { AdminCustomersScreen } from '../screens/admin/AdminCustomersScreen';
import { AdminInvoicesScreen } from '../screens/admin/AdminInvoicesScreen';
import { ManageProductsScreen } from '../screens/admin/ManageProductsScreen';
import { AdminFeatureFlagsScreen } from '../screens/admin/AdminFeatureFlagsScreen';
import { RanchesScreen } from '../screens/RanchesScreen';
import { Ionicons } from '@expo/vector-icons';
import { Text } from 'react-native-paper';
import { useAuthStore } from '../store/useAuthStore';

const Tab = createBottomTabNavigator();
const isWeb = Platform.OS === 'web';

const TabBarIcon = ({ name, isFocused, label }: { name: string; isFocused: boolean; label: string }) => {
  const scale = useRef(new Animated.Value(isFocused ? 1.15 : 1)).current;
  const opacity = useRef(new Animated.Value(isFocused ? 1 : 0.65)).current;
  const translateY = useRef(new Animated.Value(isFocused ? -2 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: isFocused ? 1.15 : 1,
        useNativeDriver: !isWeb,
      }),
      Animated.timing(opacity, {
        toValue: isFocused ? 1 : 0.65,
        duration: 180,
        useNativeDriver: !isWeb,
      }),
      Animated.spring(translateY, {
        toValue: isFocused ? -2 : 0,
        useNativeDriver: !isWeb,
      })
    ]).start();
  }, [isFocused]);

  return (
    <Animated.View style={[styles.iconContainer, { transform: [{ scale }, { translateY }], opacity }]}>
      <Ionicons name={name as any} size={22} color={isFocused ? '#4ADE80' : '#E2E8F0'} />
      <Text style={[styles.iconLabel, isFocused && styles.iconLabelFocused]}>{label}</Text>
    </Animated.View>
  );
};

const CustomTabBar = ({ state, descriptors, navigation }: any) => {
  return (
    <View style={styles.tabBarWrapper}>
      <View style={styles.glassTabBar}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const label = options.title !== undefined ? options.title : route.name;
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          let iconName = 'settings-outline';
          if (route.name === 'AdminDashboard') iconName = isFocused ? 'calendar' : 'calendar-outline';
          if (route.name === 'AdminOrders') iconName = isFocused ? 'bus' : 'bus-outline';
          if (route.name === 'AdminCustomers') iconName = isFocused ? 'people' : 'people-outline';
          if (route.name === 'AdminRanches') iconName = isFocused ? 'leaf' : 'leaf-outline';
          if (route.name === 'AdminInvoices') iconName = isFocused ? 'receipt' : 'receipt-outline';
          if (route.name === 'ManageProducts') iconName = isFocused ? 'cube' : 'cube-outline';
          if (route.name === 'AdminFeatureFlags') iconName = isFocused ? 'settings' : 'settings-outline';

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={onPress}
              style={styles.tabButton}
            >
              <TabBarIcon name={iconName} isFocused={isFocused} label={label} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export const AdminTabNavigator = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        unmountOnBlur: true,
        sceneStyle: { backgroundColor: '#F8FAFC' },
      } as any}
    >
      <Tab.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ title: 'Today' }} />
      <Tab.Screen name="AdminOrders" component={AdminOrdersScreen} options={{ title: 'Deliveries' }} />
      <Tab.Screen name="AdminCustomers" component={AdminCustomersScreen} options={{ title: 'Customers' }} />
      <Tab.Screen name="AdminRanches" component={RanchesScreen} options={{ title: 'Ranches' }} />
      <Tab.Screen name="AdminInvoices" component={AdminInvoicesScreen} options={{ title: 'Invoices' }} />
      <Tab.Screen name="ManageProducts" component={ManageProductsScreen} options={{ title: 'Products' }} />
      <Tab.Screen name="AdminFeatureFlags" component={AdminFeatureFlagsScreen} options={{ title: 'Settings' }} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBarWrapper: {
    position: 'absolute',
    bottom: 12,
    left: 8,
    right: 8,
    borderRadius: 24,
    overflow: 'hidden',
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
  },
  glassTabBar: {
    flexDirection: 'row',
    height: 64,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 4,
    backgroundColor: '#0F2318',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    cursor: 'pointer' as any,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLabel: {
    color: '#94A3B8',
    fontSize: 9,
    marginTop: 2,
    fontWeight: '600',
  },
  iconLabelFocused: {
    color: '#4ADE80',
    fontWeight: '800',
  }
});
