import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { useAuthStore } from '../store/useAuthStore';
import { AuthNavigator } from './AuthNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import { AdminTabNavigator } from './AdminTabNavigator';
import { EmployeeTabNavigator } from './EmployeeTabNavigator';

const linking = {
  prefixes: ['https://app.renu-biome.com', 'http://localhost:8081', 'http://localhost:3000', 'renubiome://'],
  config: {
    screens: {
      Install: 'install',
      SignIn: '',
      Home: 'home',
      Ranches: 'ranches',
      Deliveries: 'deliveries',
      Invoices: 'invoices',
    },
  },
};

export const RootNavigator = () => {
  const { isLoggedIn, role } = useAuthStore();

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
