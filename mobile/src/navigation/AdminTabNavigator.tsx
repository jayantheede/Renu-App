import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';
import { ManageProductsScreen } from '../screens/admin/ManageProductsScreen';
import { AdminCustomersScreen } from '../screens/admin/AdminCustomersScreen';
import { AdminOrdersScreen } from '../screens/admin/AdminOrdersScreen';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Text } from 'react-native-paper';
import { useAuthStore } from '../store/useAuthStore';

const Tab = createBottomTabNavigator();
const { width } = Dimensions.get('window');

const TabBarIcon = ({ name, isFocused, label }: { name: string, isFocused: boolean, label: string }) => {
  const scale = useRef(new Animated.Value(isFocused ? 1.2 : 1)).current;
  const opacity = useRef(new Animated.Value(isFocused ? 1 : 0.6)).current;
  const translateY = useRef(new Animated.Value(isFocused ? -4 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: isFocused ? 1.2 : 1,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: isFocused ? 1 : 0.6,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: isFocused ? -4 : 0,
        useNativeDriver: true,
      })
    ]).start();
  }, [isFocused]);

  return (
    <Animated.View style={[styles.iconContainer, { transform: [{ scale }, { translateY }], opacity }]}>
      <Ionicons name={name as any} size={24} color="#FFF" />
      {isFocused && <Text style={styles.iconLabel}>{label}</Text>}
    </Animated.View>
  );
};

const CustomTabBar = ({ state, descriptors, navigation }: any) => {
  return (
    <View style={styles.tabBarWrapper}>
      <BlurView intensity={60} tint="dark" style={styles.glassTabBar}>
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
          if (route.name === 'AdminDashboard') iconName = 'pie-chart-outline';
          if (route.name === 'ManageProducts') iconName = 'cube-outline';
          if (route.name === 'AdminCustomers') iconName = 'people-outline';
          if (route.name === 'AdminOrders') iconName = 'receipt-outline';
          if (route.name === 'AdminApprovals') iconName = 'checkmark-circle-outline';
          if (route.name === 'AdminProfile') iconName = 'person-circle-outline';

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
      </BlurView>
    </View>
  );
};

import { AdminApprovalsScreen } from '../screens/admin/AdminApprovalsScreen';
import { AdminProfileScreen } from '../screens/admin/AdminProfileScreen';

export const AdminTabNavigator = () => {
  const logout = useAuthStore(state => state.logout);

  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: true,
        headerTransparent: true,
        headerTitleStyle: { color: '#FFF' },
        headerTintColor: '#FFF',
        sceneStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Tab.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ title: 'Overview' }} />
      <Tab.Screen name="AdminOrders" component={AdminOrdersScreen} options={{ title: 'Orders' }} />
      <Tab.Screen name="AdminApprovals" component={AdminApprovalsScreen} options={{ title: 'Approvals' }} />
      <Tab.Screen name="AdminCustomers" component={AdminCustomersScreen} options={{ title: 'Users' }} />
      <Tab.Screen name="ManageProducts" component={ManageProductsScreen} options={{ title: 'Products' }} />
      <Tab.Screen name="AdminProfile" component={AdminProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBarWrapper: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  glassTabBar: {
    flexDirection: 'row',
    height: 70,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLabel: {
    color: '#FFF',
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  }
});

