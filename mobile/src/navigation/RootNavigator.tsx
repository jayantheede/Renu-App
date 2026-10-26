import React, { useMemo } from 'react';
import { View, StyleSheet, Image, Platform } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { useAuthStore } from '../store/useAuthStore';
import { AuthNavigator } from './AuthNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import { AdminTabNavigator } from './AdminTabNavigator';
import { EmployeeTabNavigator } from './EmployeeTabNavigator';

export const RootNavigator = () => {
  const { isLoggedIn, role, isInitialized } = useAuthStore();

  const linking = useMemo(() => {
    const prefixes = [
      'renubiome://',
      'https://app.renu-biome.com',
      'https://renu-biome.com',
      'http://localhost:8081',
      'http://localhost:3000',
    ];

    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
      if (!prefixes.includes(window.location.origin)) {
        prefixes.push(window.location.origin);
      }
    }

    return {
      prefixes,
      config: {
        screens: {
          // Auth flow
          SignIn: '',
          SignUp: 'signup',
          Install: 'install',

          // Client main tabs
          Home: 'home',
          Ranches: 'ranches',
          Deliveries: 'deliveries',
          Invoices: 'invoices',
          More: 'more',
          Shop: 'shop',
          Messages: 'messages',

          // Admin main tabs
          AdminDashboard: 'admin',
          AdminOrders: 'admin-orders',
          AdminCustomers: 'admin-customers',
          AdminRanches: 'admin-ranches',
          AdminInvoices: 'admin-invoices',
          ManageProducts: 'admin-products',
          AdminFeatureFlags: 'admin-settings',

          // Employee main tabs
          EmployeeHome: 'employee',
          Tasks: 'tasks',
          Profile: 'profile',
        },
      },
    };
  }, []);

  const appTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: '#0C6054',
      background: '#F8FAFC',
      card: '#FFFFFF',
      border: '#E2E8F0',
      text: '#0F172A',
    },
  };

  // If restoring auth session from AsyncStorage / localStorage, show a sleek branded splash
  if (!isInitialized) {
    return (
      <View style={styles.splashContainer}>
        <Image
          source={require('../../assets/brand/renu-biome-logo-teal-orange-for-light-backgrounds.png')}
          style={styles.splashLogo}
          resizeMode="contain"
        />
        <ActivityIndicator size="large" color="#0C6054" style={{ marginTop: 24 }} />
        <Text style={styles.splashText}>Restoring your secure session...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer
      key={isLoggedIn ? `auth-${role}` : 'guest'}
      theme={appTheme}
      linking={linking}
    >
      {!isLoggedIn ? (
        <AuthNavigator />
      ) : role?.toLowerCase() === 'admin' ? (
        <AdminTabNavigator />
      ) : role?.toLowerCase() === 'employee' ? (
        <EmployeeTabNavigator />
      ) : (
        <MainTabNavigator />
      )}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 20,
  },
  splashLogo: {
    width: 240,
    height: 70,
  },
  splashText: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 12,
    fontWeight: '500',
  },
});
