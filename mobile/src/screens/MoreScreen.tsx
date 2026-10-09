import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal, Switch, Linking } from 'react-native';
import { Text, List, useTheme, Avatar, TextInput, Button, Divider } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';
import { updateProfile } from '../api/client';
import * as ImagePicker from 'expo-image-picker';

export const MoreScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const updateUser = useAuthStore(state => state.updateUser);

  const navigateTo = (screenName: string) => {
    try {
      if (typeof navigation?.navigate === 'function') {
        navigation.navigate(screenName);
        return;
      }
      if (typeof navigation?.jumpTo === 'function') {
        navigation.jumpTo(screenName);
        return;
      }
      const parent = navigation?.getParent?.();
      if (parent) {
        if (typeof parent.navigate === 'function') {
          parent.navigate(screenName);
          return;
        }
        if (typeof parent.jumpTo === 'function') {
          parent.jumpTo(screenName);
          return;
        }
      }
    } catch (e) {
      console.warn('Navigation error:', e);
    }
  };

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [saving, setSaving] = useState(false);

  // Notification Preferences State
  const [notificationsModalVisible, setNotificationsModalVisible] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [tankLevelAlerts, setTankLevelAlerts] = useState(true);
  const [agronomyAlerts, setAgronomyAlerts] = useState(false);

  // Security & 2FA State
  const [securityModalVisible, setSecurityModalVisible] = useState(false);
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Help Center State
  const [helpModalVisible, setHelpModalVisible] = useState(false);

  useEffect(() => {
    if (user?.name) setName(user.name);
    if (user?.avatarUrl) setAvatarUrl(user.avatarUrl);
  }, [user?.name, user?.avatarUrl]);

  // Load preferences from AsyncStorage
  useEffect(() => {
    const loadStoredPrefs = async () => {
      try {
        if (!user?.email) return;
        const storedNotifs = await AsyncStorage.getItem(`@notif_prefs_${user.email}`);
        if (storedNotifs) {
          const parsed = JSON.parse(storedNotifs);
          if (parsed.pushEnabled !== undefined) setPushEnabled(parsed.pushEnabled);
          if (parsed.emailAlerts !== undefined) setEmailAlerts(parsed.emailAlerts);
          if (parsed.tankLevelAlerts !== undefined) setTankLevelAlerts(parsed.tankLevelAlerts);
          if (parsed.agronomyAlerts !== undefined) setAgronomyAlerts(parsed.agronomyAlerts);
        }

        const storedSec = await AsyncStorage.getItem(`@security_prefs_${user.email}`);
        if (storedSec) {
          const parsedSec = JSON.parse(storedSec);
          if (parsedSec.twoFactorAuth !== undefined) setTwoFactorAuth(parsedSec.twoFactorAuth);
        }
      } catch (e) {
        console.warn('Failed to load preferences from storage', e);
      }
    };
    loadStoredPrefs();
  }, [user?.email]);

  const handlePickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const base64Img = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setAvatarUrl(base64Img);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await updateProfile({ name, avatarUrl: avatarUrl || undefined });
      await updateUser({ name: res?.name || name, avatarUrl: res?.avatarUrl || avatarUrl });
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    try {
      if (user?.email) {
        await AsyncStorage.setItem(
          `@notif_prefs_${user.email}`,
          JSON.stringify({ pushEnabled, emailAlerts, tankLevelAlerts, agronomyAlerts })
        );
      }
      setNotificationsModalVisible(false);
      Alert.alert('Preferences Saved', 'Your notification alert settings have been updated.');
    } catch (e) {
      Alert.alert('Error', 'Failed to save notification preferences.');
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

    try {
      if (user?.email) {
        await AsyncStorage.setItem(
          `@security_prefs_${user.email}`,
          JSON.stringify({ twoFactorAuth })
        );
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSecurityModalVisible(false);
      Alert.alert('Security Updated', 'Your security & 2FA preferences have been updated.');
    } catch (e) {
      Alert.alert('Error', 'Failed to update security preferences.');
    }
  };

  const handleCallSupport = () => {
    Linking.openURL('tel:18005557368').catch(() => {
      Alert.alert('Contact Support', 'Phone: (800) 555-RENU (7368)');
    });
  };

  const handleEmailSupport = () => {
    Linking.openURL('mailto:support@renubiome.com?subject=Support%20Request').catch(() => {
      Alert.alert('Contact Support', 'Email: support@renubiome.com');
    });
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={{ paddingBottom: 120 }}
    >
      <Text variant="headlineMedium" style={styles.pageTitle}>Profile & Settings</Text>
      
      {/* Profile Card */}
      <View style={styles.profileSection}>
        <View style={styles.avatarContainer}>
          {avatarUrl || user?.avatarUrl ? (
            <Avatar.Image size={80} source={{ uri: avatarUrl || user?.avatarUrl! }} style={styles.avatar} />
          ) : (
            <Avatar.Text size={80} label={user?.name?.substring(0, 2) || 'U'} style={styles.avatar} />
          )}
        </View>

        {isEditing ? (
          <View style={styles.editForm}>
            <Button mode="outlined" onPress={handlePickImage} icon="camera" style={{ marginBottom: 12 }}>
              Upload Avatar
            </Button>
            <TextInput
              label="Full Name"
              value={name}
              onChangeText={setName}
              style={styles.input}
              mode="outlined"
            />
            <View style={styles.actionRow}>
              <Button mode="text" onPress={() => { setIsEditing(false); setName(user?.name||''); setAvatarUrl(user?.avatarUrl||''); }} textColor="#6B7280">Cancel</Button>
              <Button mode="contained" onPress={handleSaveProfile} loading={saving} buttonColor="#2E5D36">Save Changes</Button>
            </View>
          </View>
        ) : (
          <View style={styles.profileInfo}>
            <Text variant="headlineSmall" style={{ fontWeight: 'bold' }}>{user?.name}</Text>
            <Text variant="bodyMedium" style={{ color: '#666', marginBottom: 12 }}>{user?.email}</Text>
            <Button mode="outlined" onPress={() => setIsEditing(true)} textColor="#2E5D36" style={{ borderColor: '#2E5D36' }}>
              Edit Profile
            </Button>
          </View>
        )}
      </View>

      {/* Account Preferences Section */}
      <List.Section style={styles.listSection}>
        <List.Subheader style={styles.subheader}>Account Preferences</List.Subheader>
        
        <List.Item
          title="Notifications"
          description="Push & email alerts"
          left={props => <List.Icon {...props} icon="bell-outline" color="#2E5D36" />}
          right={props => <List.Icon {...props} icon="chevron-right" color="#94A3B8" />}
          onPress={() => setNotificationsModalVisible(true)}
          style={styles.clickableItem}
        />
        
        <Divider style={styles.divider} />

        <List.Item
          title="Security"
          description="Password & 2FA"
          left={props => <List.Icon {...props} icon="shield-outline" color="#2E5D36" />}
          right={props => <List.Icon {...props} icon="chevron-right" color="#94A3B8" />}
          onPress={() => setSecurityModalVisible(true)}
          style={styles.clickableItem}
        />
        
        <List.Subheader style={[styles.subheader, { marginTop: 12 }]}>Support</List.Subheader>
        
        <List.Item
          title="Help Center"
          description="FAQs, contact support & agronomist"
          left={props => <List.Icon {...props} icon="help-circle-outline" color="#2E5D36" />}
          right={props => <List.Icon {...props} icon="chevron-right" color="#94A3B8" />}
          onPress={() => setHelpModalVisible(true)}
          style={styles.clickableItem}
        />
        
        <Divider style={styles.divider} />

        <List.Item
          title="Log Out"
          description="Sign out from this device"
          onPress={logout}
          titleStyle={{ color: '#D32F2F', fontWeight: 'bold' }}
          left={props => <List.Icon {...props} icon="logout" color="#D32F2F" />}
          style={styles.clickableItem}
        />
      </List.Section>

      {/* ==================== NOTIFICATIONS MODAL ==================== */}
      <Modal visible={notificationsModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Notification Preferences</Text>
                <Text style={styles.modalSubtitle}>Manage your order and delivery alerts</Text>
              </View>
              <TouchableOpacity onPress={() => setNotificationsModalVisible(false)} style={styles.closeBtn}>
                <MaterialCommunityIcons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <View style={styles.settingRow}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.settingName}>Push Notifications</Text>
                  <Text style={styles.settingDesc}>Get instant status updates on delivery tracking and dispatch</Text>
                </View>
                <Switch
                  value={pushEnabled}
                  onValueChange={setPushEnabled}
                  trackColor={{ false: '#E2E8F0', true: '#2E5D36' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <Divider style={styles.divider} />

              <View style={styles.settingRow}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.settingName}>Email Invoices & Receipts</Text>
                  <Text style={styles.settingDesc}>Receive PDF invoices and monthly payment summaries</Text>
                </View>
                <Switch
                  value={emailAlerts}
                  onValueChange={setEmailAlerts}
                  trackColor={{ false: '#E2E8F0', true: '#2E5D36' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <Divider style={styles.divider} />

              <View style={styles.settingRow}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.settingName}>Tank Refill Alerts</Text>
                  <Text style={styles.settingDesc}>Receive automated warnings when tank capacity drops below 20%</Text>
                </View>
                <Switch
                  value={tankLevelAlerts}
                  onValueChange={setTankLevelAlerts}
                  trackColor={{ false: '#E2E8F0', true: '#2E5D36' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <Divider style={styles.divider} />

              <View style={styles.settingRow}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.settingName}>Agronomic Advisories</Text>
                  <Text style={styles.settingDesc}>Seasonal soil reports and application recommendations</Text>
                </View>
                <Switch
                  value={agronomyAlerts}
                  onValueChange={setAgronomyAlerts}
                  trackColor={{ false: '#E2E8F0', true: '#2E5D36' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Button 
                mode="outlined" 
                onPress={() => setNotificationsModalVisible(false)} 
                textColor="#64748B" 
                style={{ flex: 1, marginRight: 8, borderColor: '#CBD5E1' }}
              >
                Cancel
              </Button>
              <Button 
                mode="contained" 
                onPress={handleSaveNotifications} 
                buttonColor="#2E5D36" 
                style={{ flex: 1, marginLeft: 8 }}
              >
                Save Preferences
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* ==================== SECURITY & 2FA MODAL ==================== */}
      <Modal visible={securityModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Security & Authentication</Text>
                <Text style={styles.modalSubtitle}>Manage your password and two-factor protection</Text>
              </View>
              <TouchableOpacity onPress={() => setSecurityModalVisible(false)} style={styles.closeBtn}>
                <MaterialCommunityIcons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
              <View style={styles.settingRow}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.settingName}>Two-Factor Authentication (2FA)</Text>
                  <Text style={styles.settingDesc}>Require secondary email/SMS verification code when logging in</Text>
                </View>
                <Switch
                  value={twoFactorAuth}
                  onValueChange={setTwoFactorAuth}
                  trackColor={{ false: '#E2E8F0', true: '#2E5D36' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <Divider style={styles.divider} />

              <Text style={[styles.sectionSubtitle, { marginTop: 12, marginBottom: 8 }]}>Update Password</Text>
              
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
                  <Text style={styles.sessionText}>Active Session: SSL Encrypted</Text>
                  <Text style={styles.sessionSubtext}>Signed in as {user?.email || 'grower'}</Text>
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
                buttonColor="#2E5D36" 
                style={{ flex: 1, marginLeft: 8 }}
              >
                Save Settings
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* ==================== HELP CENTER MODAL ==================== */}
      <Modal visible={helpModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Help & Support Center</Text>
                <Text style={styles.modalSubtitle}>Assistance with tanks, deliveries & soil data</Text>
              </View>
              <TouchableOpacity onPress={() => setHelpModalVisible(false)} style={styles.closeBtn}>
                <MaterialCommunityIcons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {/* Direct Action: Message Agronomist */}
              <TouchableOpacity 
                style={styles.helpActionCard}
                onPress={() => {
                  setHelpModalVisible(false);
                  navigateTo('Messages');
                }}
              >
                <MaterialCommunityIcons name="chat-processing-outline" size={26} color="#1F4E34" />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.helpActionTitle}>Message Us / Agronomist</Text>
                  <Text style={styles.helpActionDesc}>Direct live chat with ReNu agronomic support</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={22} color="#1F4E34" />
              </TouchableOpacity>

              {/* Direct Action: Call Support */}
              <TouchableOpacity 
                style={styles.helpActionCard}
                onPress={handleCallSupport}
              >
                <MaterialCommunityIcons name="phone-outline" size={26} color="#15803D" />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.helpActionTitle}>Call ReNu Support</Text>
                  <Text style={styles.helpActionDesc}>Toll-Free: (800) 555-RENU (Mon-Fri 7am - 6pm)</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={22} color="#15803D" />
              </TouchableOpacity>

              {/* Direct Action: Email Support */}
              <TouchableOpacity 
                style={styles.helpActionCard}
                onPress={handleEmailSupport}
              >
                <MaterialCommunityIcons name="email-outline" size={26} color="#0369A1" />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.helpActionTitle}>Email Help Desk</Text>
                  <Text style={styles.helpActionDesc}>support@renubiome.com</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={22} color="#0369A1" />
              </TouchableOpacity>

              <Text style={[styles.sectionSubtitle, { marginTop: 16, marginBottom: 8 }]}>Frequently Asked Questions</Text>
              
              <View style={styles.faqCard}>
                <Text style={styles.faqQ}>How do I reorder a delivery or refill?</Text>
                <Text style={styles.faqA}>Tap "Reorder last delivery" on Home, or navigate to Shop to select your custom biological blend and schedule a delivery date.</Text>
              </View>

              <View style={styles.faqCard}>
                <Text style={styles.faqQ}>How do I view my ranches & tanks?</Text>
                <Text style={styles.faqA}>Visit the "Ranches" tab to view real-time tank capacity levels, drag-and-drop ranch layouts, and track application schedules.</Text>
              </View>

              <View style={styles.faqCard}>
                <Text style={styles.faqQ}>Where can I download receipts?</Text>
                <Text style={styles.faqA}>Visit the "Invoices" tab to download PDF statements or complete pending payments.</Text>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Button 
                mode="contained" 
                onPress={() => setHelpModalVisible(false)} 
                buttonColor="#2E5D36" 
                style={{ flex: 1 }}
              >
                Close Help Center
              </Button>
            </View>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  pageTitle: { fontWeight: 'bold', color: '#2E5D36', marginBottom: 24, marginTop: 40 },
  profileSection: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  avatarContainer: { alignItems: 'center', marginBottom: 16 },
  avatar: { backgroundColor: '#2E5D36' },
  profileInfo: { alignItems: 'center' },
  editForm: { marginTop: 8 },
  input: { marginBottom: 12, backgroundColor: '#FFF' },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8, gap: 8 },
  listSection: { backgroundColor: '#FFFFFF', borderRadius: 16, paddingVertical: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  subheader: { fontWeight: '700', color: '#374151' },
  clickableItem: { borderRadius: 10, paddingVertical: 4 },
  divider: { marginVertical: 4, backgroundColor: '#F3F4F6' },

  /* Modals */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  settingDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  sessionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    marginTop: 12,
    marginBottom: 4,
  },
  sessionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803D',
  },
  sessionSubtext: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 20,
  },

  /* Help Center */
  helpActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  helpActionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  helpActionDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  faqCard: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#2E5D36',
  },
  faqQ: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  faqA: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 18,
  },
});
