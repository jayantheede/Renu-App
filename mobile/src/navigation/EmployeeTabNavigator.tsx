import React from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from 'react-native-paper';
import { AdminProfileScreen } from '../screens/admin/AdminProfileScreen';

const Tab = createBottomTabNavigator();
const { width } = Dimensions.get('window');

import { EmployeeDashboardScreen } from '../screens/employee/EmployeeDashboardScreen';
import { EmployeeTasksScreen } from '../screens/employee/EmployeeTasksScreen';

const TabBarIcon = ({ name, isFocused, label }: { name: string, isFocused: boolean, label: string }) => {
  return (
    <View style={[styles.iconWrapper, isFocused && styles.activeIconWrapper]}>
      <MaterialCommunityIcons 
        name={name as any} 
        size={24} 
        color={isFocused ? '#1F4E34' : '#6B7280'} 
      />
      <Text style={[styles.iconLabel, isFocused && styles.activeIconLabel]}>
        {label}
      </Text>
    </View>
  );
};

const CustomTabBar = ({ state, descriptors, navigation }: any) => {
  return (
    <View style={styles.tabBarWrapper}>
      <View style={styles.tabBar}>
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

          let iconName = 'leaf';
          if (route.name === 'EmployeeHome') iconName = 'view-dashboard';
          if (route.name === 'Tasks') iconName = 'clipboard-check-outline';
          if (route.name === 'Profile') iconName = 'account-outline';

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

export const EmployeeTabNavigator = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="EmployeeHome" component={EmployeeDashboardScreen} options={{ title: 'Overview' }} />
      <Tab.Screen name="Tasks" component={EmployeeTasksScreen} options={{ title: 'Tasks' }} />
      <Tab.Screen name="Profile" component={AdminProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F7F4',
  },
  tabBarWrapper: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  tabBar: {
    flexDirection: 'row',
    height: 70,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  activeIconWrapper: {
    backgroundColor: '#E8F5E9',
  },
  iconLabel: {
    color: '#6B7280',
    fontSize: 10,
    marginTop: 2,
    fontWeight: '500',
  },
  activeIconLabel: {
    color: '#1F4E34',
    fontWeight: 'bold',
  }
});
