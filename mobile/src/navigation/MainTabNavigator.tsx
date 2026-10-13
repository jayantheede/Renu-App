import React from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from '../screens/HomeScreen';
import { InvoicesScreen } from '../screens/InvoicesScreen';
import { MoreScreen } from '../screens/MoreScreen';
import { RanchesScreen } from '../screens/RanchesScreen';
import { DeliveriesScreen } from '../screens/DeliveriesScreen';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from 'react-native-paper';

const Tab = createBottomTabNavigator();

const TabBarIcon = ({ name, isFocused, label }: { name: string; isFocused: boolean; label: string }) => {
  return (
    <View style={[styles.iconWrapper, isFocused && styles.activeIconWrapper]}>
      <MaterialCommunityIcons 
        name={name as any} 
        size={22} 
        color={isFocused ? '#1F4E34' : '#64748B'} 
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
          if (route.name === 'Home') iconName = 'home-outline';
          if (route.name === 'Ranches') iconName = 'sprout';
          if (route.name === 'Deliveries') iconName = 'truck-delivery-outline';
          if (route.name === 'Invoices') iconName = 'receipt';
          if (route.name === 'More') iconName = 'dots-horizontal';

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={onPress}
              style={styles.tabButton}
              activeOpacity={0.7}
            >
              <TabBarIcon name={iconName} isFocused={isFocused} label={label} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        unmountOnBlur: true, // Unmount screens you leave as specified
      } as any}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Ranches" component={RanchesScreen} options={{ title: 'Ranches' }} />
      <Tab.Screen name="Deliveries" component={DeliveriesScreen} options={{ title: 'Deliveries' }} />
      <Tab.Screen name="Invoices" component={InvoicesScreen} options={{ title: 'Invoices' }} />
      <Tab.Screen name="More" component={MoreScreen} options={{ title: 'More' }} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBarWrapper: {
    position: 'absolute',
    bottom: 14,
    left: 12,
    right: 12,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabBar: {
    flexDirection: 'row',
    height: 64,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48, // 48px min tap target
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 16,
  },
  activeIconWrapper: {
    backgroundColor: '#E8F5E9',
  },
  iconLabel: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 2,
    fontWeight: '500',
  },
  activeIconLabel: {
    color: '#1F4E34',
    fontWeight: '700',
  }
});
