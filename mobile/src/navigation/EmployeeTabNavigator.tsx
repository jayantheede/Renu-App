import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from 'react-native-paper';
import { AdminProfileScreen } from '../screens/admin/AdminProfileScreen';

const Tab = createBottomTabNavigator();

import { EmployeeDashboardScreen } from '../screens/employee/EmployeeDashboardScreen';
import { EmployeeTasksScreen } from '../screens/employee/EmployeeTasksScreen';
import { RanchesScreen } from '../screens/RanchesScreen';
import { MessagesScreen } from '../screens/MessagesScreen';

const TabBarIcon = ({ name, isFocused, label }: { name: string, isFocused: boolean, label: string }) => {
  return (
    <View style={[styles.iconWrapper, isFocused && styles.activeIconWrapper]}>
      <MaterialCommunityIcons 
        name={name as any} 
        size={22} 
        color={isFocused ? '#1F4E34' : '#6B7280'} 
      />
      <Text style={[styles.iconLabel, isFocused && styles.activeIconLabel]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
        {label}
      </Text>
    </View>
  );
};

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
          if (route.name === 'Ranches') iconName = 'sprout';
          if (route.name === 'Messages') iconName = 'message-outline';
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
      <Tab.Screen name="Ranches" component={RanchesScreen} options={{ title: 'Ranches' }} />
      <Tab.Screen name="Messages" component={MessagesScreen} options={{ title: 'Messages' }} />
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
  tabBarOuter: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 10,
    alignItems: 'center',
  },
  tabBarWrapper: {
    width: '100%',
    maxWidth: 680,
  },
  tabBar: {
    flexDirection: 'row',
    height: 60,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 6,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 16,
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
