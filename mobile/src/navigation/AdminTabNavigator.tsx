import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';
import { AdminOrdersScreen } from '../screens/admin/AdminOrdersScreen';
import { AdminCustomersScreen } from '../screens/admin/AdminCustomersScreen';
import { AdminInvoicesScreen } from '../screens/admin/AdminInvoicesScreen';
import { ManageProductsScreen } from '../screens/admin/ManageProductsScreen';
import { AdminFeatureFlagsScreen } from '../screens/admin/AdminFeatureFlagsScreen';
import { AdminMoreScreen } from '../screens/admin/AdminMoreScreen';
import { RanchesScreen } from '../screens/RanchesScreen';
import { Ionicons } from '@expo/vector-icons';
import { Text } from 'react-native-paper';
import { useAuthStore } from '../store/useAuthStore';
import { InvoiceLogo } from '../components/InvoiceLogo';

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
      {name === 'invoice-logo' ? (
        <InvoiceLogo size={20} color={isFocused ? '#F07E42' : '#E2E8F0'} />
      ) : (
        <Ionicons name={name as any} size={21} color={isFocused ? '#4ADE80' : '#E2E8F0'} />
      )}
      <Text style={[styles.iconLabel, isFocused && styles.iconLabelFocused]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
        {label}
      </Text>
    </Animated.View>
  );
};

const ADMIN_PRIMARY_TABS = [
  'AdminDashboard',
  'AdminOrders',
  'AdminCustomers',
  'AdminRanches',
  'AdminMore',
];

const CustomTabBar = ({ state, descriptors, navigation }: any) => {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.tabBarOuter,
        {
          paddingBottom: Math.max(8, insets.bottom),
          paddingLeft: Math.max(8, insets.left),
          paddingRight: Math.max(8, insets.right),
        },
      ]}
    >
      <View style={styles.tabBarWrapper}>
        <View style={styles.glassTabBar}>
        {state.routes
          .filter((route: any) => ADMIN_PRIMARY_TABS.includes(route.name))
          .map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const label = options.title !== undefined ? options.title : route.name;
          const isFocused = state.routes[state.index]?.name === route.name;

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
          if (route.name === 'AdminMore') iconName = isFocused ? 'ellipsis-horizontal' : 'ellipsis-horizontal-outline';

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
      <Tab.Screen name="AdminMore" component={AdminMoreScreen} options={{ title: 'More' }} />
      <Tab.Screen name="Ranches" component={RanchesScreen} options={{ title: 'Ranches', tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="AdminInvoices" component={AdminInvoicesScreen} options={{ title: 'Invoices', tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="Invoices" component={AdminInvoicesScreen} options={{ title: 'Invoices', tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="ManageProducts" component={ManageProductsScreen} options={{ title: 'Products', tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="AdminFeatureFlags" component={AdminFeatureFlagsScreen} options={{ title: 'Settings', tabBarItemStyle: { display: 'none' } }} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBarOuter: {
    width: '100%',
    backgroundColor: '#083F38',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.14)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 10,
    alignItems: 'center',
  },
  tabBarWrapper: {
    width: '100%',
    maxWidth: 680,
  },
  glassTabBar: {
    flexDirection: 'row',
    height: 60,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 4,
    backgroundColor: '#083F38',
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
    color: '#F07E42',
    fontWeight: '800',
  }
});
