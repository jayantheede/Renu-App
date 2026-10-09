import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { useAuthStore } from '../store/useAuthStore';
import { AuthNavigator } from './AuthNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import { AdminTabNavigator } from './AdminTabNavigator';
import { EmployeeTabNavigator } from './EmployeeTabNavigator';

export const RootNavigator = () => {
  const { isLoggedIn, role } = useAuthStore();

  const appTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: '#1F4E34',
      background: '#F8FAFC',
      card: '#FFFFFF',
      border: '#E2E8F0',
      text: '#111827',
    },
  };

  return (
    <NavigationContainer theme={appTheme}>
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
