import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Modal,
  Switch,
} from 'react-native';
import { Text, Divider, Button, TextInput } from 'react-native-paper';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../../store/useAuthStore';
import { toggleMfa, updateProfile } from '../../api/client';
import { BRAND_COLORS } from '../../theme/theme';
import { InvoiceLogo } from '../../components/InvoiceLogo';
import { NotificationBellButton } from '../../components/NotificationBellButton';
import { NotificationCenterModal } from '../../components/NotificationCenterModal';
import { useResponsiveLayout } from '../../utils/responsive';

export const AdminMoreScreen = ({ navigation }: any) => {
  const {
    insets,
    safeHorizontalPadding,
    centeredContainerStyle,
    tabBarBottomClearance,
    modalMaxHeight,
    modalScrollMaxHeight,
  } = useResponsiveLayout(840);

  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);

  const [alertsModalVisible, setAlertsModalVisible] = useState(false);
  const [securityModalVisible, setSecurityModalVisible] = useState(false);
  const [twoFactorAuth, setTwoFactorAuth] = useState(Boolean(user?.mfaEnabled));
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    if (user?.mfaEnabled !== undefined) {
      setTwoFactorAuth(user.mfaEnabled);
    } else if (user?.email) {
      AsyncStorage.getItem(`@security_prefs_${user.email}`).then((stored) => {
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.twoFactorAuth !== undefined) setTwoFactorAuth(parsed.twoFactorAuth);
        }
      }).catch(() => {});
    }
  }, [user?.email, user?.mfaEnabled]);

  const handleToggleMfa = async (enabled: boolean) => {
    setTwoFactorAuth(enabled);
    try {
      if (user?.email) {
        await toggleMfa(user.email, enabled);
        await updateUser({ mfaEnabled: enabled });
        await AsyncStorage.setItem(
          `@security_prefs_${user.email}`,
          JSON.stringify({ twoFactorAuth: enabled })
        );
      }
      Alert.alert(
        enabled ? 'Admin 2FA Protection Enabled' : 'Admin 2FA Protection Disabled',
        enabled
          ? `Two-Factor Authentication is now active for ${user?.email || 'support@renu-biome.com'}. A 6-digit verification code will be dispatched to your email on your next sign-in.`
          : 'Two-Factor Authentication has been disabled for this administrator account.'
      );
    } catch (e: any) {
      console.warn('Failed to toggle admin 2FA:', e);
      setTwoFactorAuth(!enabled);
      Alert.alert('Notice', e?.message || 'Failed to update two-factor authentication settings.');
    }
  };

  const handleSaveSecurity = async () => {
    if (newPassword || confirmPassword) {
      if (newPassword !== confirmPassword) {
        Alert.alert('Validation Error', 'New passwords do not match. Please verify.');
        return;
      }
      if (newPassword.length < 6) {
        Alert.alert('Validation Error', 'Password must be at least 6 characters long.');
        return;
      }
    }

    setUpdatingPassword(true);
    try {
      if (newPassword) {
        await updateProfile({ password: newPassword });
      }

      if (user?.email) {
        await toggleMfa(user.email, twoFactorAuth);
        await updateUser({ mfaEnabled: twoFactorAuth });
        await AsyncStorage.setItem(
          `@security_prefs_${user.email}`,
          JSON.stringify({ twoFactorAuth })
        );
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSecurityModalVisible(false);
      Alert.alert('Security Updated', 'Admin credentials and two-factor preferences have been updated.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update admin security preferences.');
    } finally {
      setUpdatingPassword(false);
    }
  };

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
      id: 'security',
      title: 'Security & 2FA',
      subtitle: `Two-factor protection (${twoFactorAuth ? 'Active' : 'Disabled'}), admin password, and session SSL`,
      iconType: 'shield-check-outline',
      action: () => setSecurityModalVisible(true),
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
      screen: 'AdminFeatureFlags',
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

        {/* Dedicated 2FA Quick Switch Card */}
        <View style={styles.twoFactorCard}>
          <View style={styles.twoFactorHeader}>
            <View style={styles.twoFactorIconWrap}>
              <MaterialCommunityIcons name="shield-lock" size={24} color="#0C6054" />
            </View>
            <View style={{ flex: 1, marginLeft: 12, marginRight: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.twoFactorTitle}>Two-Factor Authentication</Text>
                <View style={[styles.twoFactorBadge, { backgroundColor: twoFactorAuth ? '#DCFCE7' : '#F1F5F9' }]}>
                  <Text style={[styles.twoFactorBadgeText, { color: twoFactorAuth ? '#15803D' : '#64748B' }]}>
                    {twoFactorAuth ? 'Active' : 'Off'}
                  </Text>
                </View>
              </View>
              <Text style={styles.twoFactorDesc}>
                {twoFactorAuth
                  ? '6-digit OTP verification code required on login'
                  : 'Toggle to require email OTP verification on login'}
              </Text>
            </View>
            <Switch
              value={twoFactorAuth}
              onValueChange={handleToggleMfa}
              trackColor={{ false: '#CBD5E1', true: '#0C6054' }}
              thumbColor="#FFFFFF"
            />
          </View>
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
          <TouchableOpacity
            style={styles.admin2faStatusRow}
            onPress={() => setSecurityModalVisible(true)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name={twoFactorAuth ? 'shield-check' : 'shield-alert-outline'}
              size={18}
              color={twoFactorAuth ? '#15803D' : '#D97706'}
            />
            <Text style={[styles.admin2faStatusText, { color: twoFactorAuth ? '#15803D' : '#D97706' }]}>
              Two-Factor Authentication (2FA): {twoFactorAuth ? 'Active' : 'Disabled'} — Tap to manage
            </Text>
          </TouchableOpacity>
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

      {/* ==================== ADMIN SECURITY & 2FA MODAL ==================== */}
      <Modal visible={securityModalVisible} animationType="slide" transparent>
        <View
          style={[
            styles.modalOverlay,
            {
              paddingLeft: Math.max(16, insets.left),
              paddingRight: Math.max(16, insets.right),
              paddingTop: Math.max(16, insets.top),
              paddingBottom: Math.max(16, insets.bottom),
            },
          ]}
        >
          <View style={[styles.modalContent, { maxHeight: modalMaxHeight }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                <Text style={styles.modalTitle}>Admin Security & 2FA</Text>
                <Text style={styles.modalSubtitle}>Manage two-factor protection and administrator password</Text>
              </View>
              <TouchableOpacity onPress={() => setSecurityModalVisible(false)} style={styles.closeBtn}>
                <MaterialCommunityIcons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: modalScrollMaxHeight }}>
              <View style={styles.settingRow}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.settingName}>Two-Factor Authentication (2FA)</Text>
                  <Text style={styles.settingDesc}>
                    Require secondary 6-digit verification code sent to {user?.email || 'support@renu-biome.com'} when signing in
                  </Text>
                </View>
                <Switch
                  value={twoFactorAuth}
                  onValueChange={handleToggleMfa}
                  trackColor={{ false: '#E2E8F0', true: '#0C6054' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <Divider style={styles.divider} />

              <Text style={[styles.sectionSubtitle, { marginTop: 12, marginBottom: 8 }]}>Update Administrator Password</Text>
              
              <TextInput
                label="Current Password"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
                mode="outlined"
                style={styles.input}
              />
              <TextInput
                label="New Password"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                mode="outlined"
                style={styles.input}
              />
              <TextInput
                label="Confirm New Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                mode="outlined"
                style={styles.input}
              />

              <View style={styles.sessionBox}>
                <MaterialCommunityIcons name="shield-check" size={20} color="#15803D" />
                <View style={{ marginLeft: 8, flex: 1 }}>
                  <Text style={styles.sessionText}>Office Session: SSL / TLS Encrypted</Text>
                  <Text style={styles.sessionSubtext}>Signed in as {user?.email || 'support@renu-biome.com'} (Full Authority)</Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Button 
                mode="outlined" 
                onPress={() => setSecurityModalVisible(false)} 
                textColor="#64748B" 
                style={{ flex: 1, marginRight: 8, borderColor: '#CBD5E1' }}
              >
                Cancel
              </Button>
              <Button 
                mode="contained" 
                onPress={handleSaveSecurity} 
                loading={updatingPassword}
                buttonColor="#0C6054" 
                style={{ flex: 1, marginLeft: 8 }}
              >
                Save Settings
              </Button>
            </View>
          </View>
        </View>
      </Modal>
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
  twoFactorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  twoFactorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  twoFactorIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  twoFactorTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  twoFactorBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  twoFactorBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  twoFactorDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
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
  admin2faStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(12, 96, 84, 0.12)',
  },
  admin2faStatusText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 520,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  settingDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  divider: {
    marginVertical: 12,
    backgroundColor: '#F1F5F9',
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  input: {
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  sessionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginTop: 8,
    marginBottom: 8,
  },
  sessionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
  },
  sessionSubtext: {
    fontSize: 11,
    color: '#166534',
    marginTop: 1,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
});
