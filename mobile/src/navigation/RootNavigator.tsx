import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { useAuthStore } from '../store/useAuthStore';
import { AuthNavigator } from './AuthNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import { AdminTabNavigator } from './AdminTabNavigator';

import { EmployeeTabNavigator } from './EmployeeTabNavigator';

export const RootNavigator = () => {
  const { isLoggedIn, role } = useAuthStore();

  const transparentTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: 'transparent',
      background: 'transparent',
      card: 'transparent',
      border: 'transparent',
      text: '#FFF',
    },
  };

  return (
    <NavigationContainer theme={transparentTheme}>
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
