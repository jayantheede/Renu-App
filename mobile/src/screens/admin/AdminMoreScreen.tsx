import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { Text, Divider, Button } from 'react-native-paper';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/useAuthStore';
import { BRAND_COLORS } from '../../theme/theme';
import { InvoiceLogo } from '../../components/InvoiceLogo';
import { NotificationBellButton } from '../../components/NotificationBellButton';
import { NotificationCenterModal } from '../../components/NotificationCenterModal';
import { useResponsiveLayout } from '../../utils/responsive';

export const AdminMoreScreen = ({ navigation }: any) => {
  const { insets, safeHorizontalPadding, centeredContainerStyle, tabBarBottomClearance } = useResponsiveLayout(840);
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const [alertsModalVisible, setAlertsModalVisible] = useState(false);

  const handleSignOut = () => {
    if (Platform.OS === 'web') {
      logout();
    } else {
      Alert.alert('Sign Out', 'Are you sure you want to sign out of the Admin Console?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: logout },
      ]);
    }
  };

  const menuItems = [
    {
      id: 'alerts',
      title: 'App Alerts & Notifications',
      subtitle: 'Live low tank alerts, delivery tracking, lab results & system banners',
      iconType: 'bell-badge-outline',
      action: () => setAlertsModalVisible(true),
    },
    {
      id: 'invoices',
      title: 'Invoices',
      subtitle: 'Open & overdue accounts. Add, edit, mark paid, upload QuickBooks PDF',
      iconType: 'invoice-logo',
      screen: 'AdminInvoices',
    },
    {
      id: 'products',
      title: 'Products',
      subtitle: '7 canonical blends, nutrient analysis (%N, %K₂O, %Ca, lb/gal), OMRI status',
      iconType: 'cube-outline',
      screen: 'ManageProducts',
    },
    {
      id: 'ranches',
      title: 'Ranches & Blocks',
      subtitle: 'All customer ranch locations, block acreage, APNs, and tank setups',
      iconType: 'sprout',
      screen: 'AdminRanches',
    },
    {
      id: 'flags',
      title: 'Feature flags',
      subtitle: 'Global defaults and per-customer overrides for 12 operational modules',
      iconType: 'flag-outline',
      screen: 'AdminFeatureFlags',
    },
    {
      id: 'reports',
      title: 'Reports & Export',
      subtitle: 'Monthly sales by customer/product, aging receivables, CSV & PDF export',
      iconType: 'chart-box-outline',
      screen: 'AdminFeatureFlags', // AdminFeatureFlags has the comprehensive reports export
    },
    {
      id: 'settings',
      title: 'Settings & Integrations',
      subtitle: 'support@renu-biome.com via Microsoft 365, OptimoRoute, Otodata, Environment',
      iconType: 'cog-outline',
      screen: 'AdminFeatureFlags',
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          safeHorizontalPadding,
          centeredContainerStyle,
          { paddingTop: Math.max(16, insets.top + 8), paddingBottom: tabBarBottomClearance },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.header}>
            <Text style={styles.title}>More</Text>
            <Text style={styles.subtitle}>Owner & Office Administration</Text>
          </View>
          <NotificationBellButton tintColor="#0F172A" />
        </View>

        {/* Menu Cards List */}
        <View style={styles.cardList}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.menuRow,
                index === menuItems.length - 1 && { borderBottomWidth: 0 },
              ]}
              onPress={() => {
                if ((item as any).action) {
                  (item as any).action();
                } else if (item.screen) {
                  navigation?.navigate(item.screen);
                }
              }}
              activeOpacity={0.7}
            >
              <View style={styles.iconWrap}>
                {item.iconType === 'invoice-logo' ? (
                  <InvoiceLogo size={22} color="#0C6054" />
                ) : (
                  <MaterialCommunityIcons
                    name={item.iconType as any}
                    size={22}
                    color="#0C6054"
                  />
                )}
              </View>

              <View style={styles.rowTextWrap}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowSubtitle}>{item.subtitle}</Text>
              </View>

              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Signed In As Card */}
        <View style={styles.adminStatusCard}>
          <View style={styles.adminStatusRow}>
            <MaterialCommunityIcons name="shield-account-outline" size={20} color="#0C6054" />
            <Text style={styles.adminStatusText}>
              Signed in as <Text style={{ fontWeight: '700', color: '#0C6054' }}>{user?.email || 'support@renu-biome.com'}</Text>
            </Text>
          </View>
          <Text style={styles.adminRoleNote}>
            Two office logins: Owner & Operations. Full administrative authority.
          </Text>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <MaterialCommunityIcons name="logout" size={18} color="#DC2626" />
          <Text style={styles.signOutBtnText}>Sign Out of Admin Console</Text>
        </TouchableOpacity>
      </ScrollView>

      <NotificationCenterModal
        visible={alertsModalVisible}
        onClose={() => setAlertsModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  header: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0C6054',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  cardList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    overflow: 'hidden',
    marginBottom: 20,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#F0FDFA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  rowTextWrap: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  rowSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  adminStatusCard: {
    backgroundColor: '#F0FDFA',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(12, 96, 84, 0.15)',
    padding: 16,
    marginBottom: 20,
  },
  adminStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  adminStatusText: {
    fontSize: 13,
    color: '#334155',
    flex: 1,
    flexShrink: 1,
  },
  adminRoleNote: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 28,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    minHeight: 48,
  },
  signOutBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
  },
});
