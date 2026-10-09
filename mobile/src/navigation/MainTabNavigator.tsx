import React from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from '../screens/HomeScreen';
import { InvoicesScreen } from '../screens/InvoicesScreen';
import { MessagesScreen } from '../screens/MessagesScreen';
import { MoreScreen } from '../screens/MoreScreen';
import { ShopScreen } from '../screens/ShopScreen';
import { RanchesScreen } from '../screens/RanchesScreen';
import { OrdersScreen } from '../screens/OrdersScreen';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from 'react-native-paper';

const Tab = createBottomTabNavigator();
const { width } = Dimensions.get('window');

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
          if (route.name === 'Home') iconName = 'home-outline';
          if (route.name === 'Ranches') iconName = 'terrain';
          if (route.name === 'Orders') iconName = 'truck-outline';
          if (route.name === 'Invoices') iconName = 'receipt';
          if (route.name === 'Messages') iconName = 'message-outline';
          if (route.name === 'Shop') iconName = 'cart-outline';
          if (route.name === 'More') iconName = 'dots-horizontal';

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

export const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Ranches" component={RanchesScreen} options={{ title: 'Ranches' }} />
      <Tab.Screen name="Orders" component={OrdersScreen} options={{ title: 'Orders' }} />
      <Tab.Screen name="Invoices" component={InvoicesScreen} options={{ title: 'Invoices' }} />
      <Tab.Screen name="Messages" component={MessagesScreen} options={{ title: 'Messages' }} />
      <Tab.Screen name="Shop" component={ShopScreen} options={{ title: 'Shop' }} />
      <Tab.Screen name="More" component={MoreScreen} options={{ title: 'More' }} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
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
