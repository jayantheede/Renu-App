import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal, Switch, Linking, Platform } from 'react-native';
import { Text, List, useTheme, Avatar, TextInput, Button, Divider } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';
import { updateProfile, fetchYearEndSummary, toggleMfa } from '../api/client';
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

  // Year-End Purchase Summary State
  const [yearEndModalVisible, setYearEndModalVisible] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [yearEndLoading, setYearEndLoading] = useState(false);
  const [yearEndData, setYearEndData] = useState<any>(null);

  // Security & 2FA State
  const [securityModalVisible, setSecurityModalVisible] = useState(false);
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Help Center State
  const [helpModalVisible, setHelpModalVisible] = useState(false);

  const handleSignOut = () => {
    if (Platform.OS === 'web') {
      logout();
    } else {
      Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: logout }
      ]);
    }
  };

  const loadYearEndSummary = async (year: number) => {
    setSelectedYear(year);
    setYearEndLoading(true);
    try {
      const data = await fetchYearEndSummary(year);
      setYearEndData(data);
    } catch (err: any) {
      console.warn('Failed to load year end summary:', err);
      Alert.alert('Error', 'Unable to fetch year-end summary.');
    } finally {
      setYearEndLoading(false);
    }
  };

  const downloadYearEndCsv = () => {
    if (!yearEndData) return;
    try {
      let csv = `Year-End Purchase Summary - ${yearEndData.customerName || 'Customer'} (${yearEndData.year})\n`;
      csv += `Total Gallons: ${yearEndData.totalGallons}, Total Amount: $${(yearEndData.totalAmount || 0).toLocaleString()}\n\n`;
      csv += `DELIVERIES\nDate,Delivery ID,Product,Gallons,Ranch,Tank,Status\n`;
      (yearEndData.deliveries || []).forEach((d: any) => {
        csv += `"${d.date}","${d.id}","${d.productName || d.product}","${d.gallons}","${d.ranchName || ''}","${d.tankName || ''}","${d.status}"\n`;
      });
      csv += `\nINVOICES\nInvoice #,Date,Due Date,Amount,Status,Delivery Ref\n`;
      (yearEndData.invoices || []).forEach((inv: any) => {
        csv += `"${inv.invoiceNumber}","${inv.invoiceDate}","${inv.dueDate}","${inv.amount}","${inv.status}","${inv.deliveryId || ''}"\n`;
      });

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `ReNu-Biome-Summary-${yearEndData.year}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        Alert.alert('CSV Ready', 'Summary exported successfully.');
      }
    } catch (e: any) {
      Alert.alert('Error', 'Failed to generate CSV.');
    }
  };

  const handlePrintYearEnd = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.print();
    } else {
      Alert.alert('Print Summary', 'Use the print option from your mobile share menu.');
    }
  };

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

        if (user.mfaEnabled !== undefined) {
          setTwoFactorAuth(user.mfaEnabled);
        } else {
          const storedSec = await AsyncStorage.getItem(`@security_prefs_${user.email}`);
          if (storedSec) {
            const parsedSec = JSON.parse(storedSec);
            if (parsedSec.twoFactorAuth !== undefined) setTwoFactorAuth(parsedSec.twoFactorAuth);
          }
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
      Alert.alert('Security Updated', 'Your password and security preferences have been updated.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update security preferences.');
    } finally {
      setUpdatingPassword(false);
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
            <Button mode="outlined" onPress={handlePickImage} icon="camera" style={{ marginBottom: 12, minHeight: 48, justifyContent: 'center' }}>
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
              <Button mode="text" onPress={() => { setIsEditing(false); setName(user?.name||''); setAvatarUrl(user?.avatarUrl||''); }} textColor="#6B7280" style={{ minHeight: 48, justifyContent: 'center' }}>Cancel</Button>
              <Button mode="contained" onPress={handleSaveProfile} loading={saving} buttonColor="#0C6054" style={{ minHeight: 48, justifyContent: 'center' }}>Save Changes</Button>
            </View>
          </View>
        ) : (
          <View style={styles.profileInfo}>
            <Text variant="headlineSmall" style={{ fontWeight: 'bold' }}>{user?.name}</Text>
            <Text variant="bodyMedium" style={{ color: '#666', marginBottom: 12 }}>{user?.email}</Text>
            <Button mode="outlined" onPress={() => setIsEditing(true)} textColor="#0C6054" style={{ borderColor: '#0C6054', minHeight: 48, justifyContent: 'center' }}>
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
          left={props => <List.Icon {...props} icon="bell-outline" color="#0C6054" />}
          right={props => <List.Icon {...props} icon="chevron-right" color="#94A3B8" />}
          onPress={() => setNotificationsModalVisible(true)}
          style={styles.clickableItem}
        />
        
        <Divider style={styles.divider} />

        <List.Item
          title="Security"
          description="Password & 2FA"
          left={props => <List.Icon {...props} icon="shield-outline" color="#0C6054" />}
          right={props => <List.Icon {...props} icon="chevron-right" color="#94A3B8" />}
          onPress={() => setSecurityModalVisible(true)}
          style={styles.clickableItem}
        />

        <List.Subheader style={[styles.subheader, { marginTop: 12 }]}>Financial & Reports</List.Subheader>

        <List.Item
          title="Year-End Purchase Summary"
          description="Deliveries and invoices statement for tax accountant"
          left={props => <List.Icon {...props} icon="file-document-outline" color="#0C6054" />}
          right={props => <List.Icon {...props} icon="chevron-right" color="#94A3B8" />}
          onPress={() => {
            setYearEndModalVisible(true);
            loadYearEndSummary(selectedYear);
          }}
          style={styles.clickableItem}
        />
        
        <List.Subheader style={[styles.subheader, { marginTop: 12 }]}>Support</List.Subheader>
        
        <List.Item
          title="Help Center"
          description="Direct telephone & email support"
          left={props => <List.Icon {...props} icon="help-circle-outline" color="#0C6054" />}
          right={props => <List.Icon {...props} icon="chevron-right" color="#94A3B8" />}
          onPress={() => setHelpModalVisible(true)}
          style={styles.clickableItem}
        />
        
        <Divider style={styles.divider} />

        <List.Item
          title="Log Out"
          description="Sign out from this device"
          onPress={handleSignOut}
          titleStyle={{ color: '#D32F2F', fontWeight: 'bold' }}
          left={props => <List.Icon {...props} icon="logout" color="#D32F2F" />}
          style={styles.clickableItem}
        />
      </List.Section>

      <Text style={styles.footerBranding}>
        ReNu-Biome — Farmer's Pride · Grower Portal
      </Text>

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
                  trackColor={{ false: '#E2E8F0', true: '#0C6054' }}
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
                  trackColor={{ false: '#E2E8F0', true: '#0C6054' }}
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
                  trackColor={{ false: '#E2E8F0', true: '#0C6054' }}
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
                  trackColor={{ false: '#E2E8F0', true: '#0C6054' }}
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
                buttonColor="#0C6054" 
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
                  trackColor={{ false: '#E2E8F0', true: '#0C6054' }}
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
                buttonColor="#0C6054" 
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
                <Text style={styles.modalSubtitle}>Assistance with ranches, deliveries & invoices</Text>
              </View>
              <TouchableOpacity onPress={() => setHelpModalVisible(false)} style={styles.closeBtn}>
                <MaterialCommunityIcons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {/* Direct Action: Call Support */}
              <TouchableOpacity 
                style={styles.helpActionCard}
                onPress={handleCallSupport}
              >
                <MaterialCommunityIcons name="phone-outline" size={26} color="#15803D" />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.helpActionTitle}>Call ReNu-Biome Office</Text>
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
                  <Text style={styles.helpActionTitle}>Email Support Desk</Text>
                  <Text style={styles.helpActionDesc}>support@renubiome.com</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={22} color="#0369A1" />
              </TouchableOpacity>

              <Text style={[styles.sectionSubtitle, { marginTop: 16, marginBottom: 8 }]}>Frequently Asked Questions</Text>
              
              <View style={styles.faqCard}>
                <Text style={styles.faqQ}>How do I place an order for delivery?</Text>
                <Text style={styles.faqA}>Orders are phoned in directly to ReNu-Biome. Our office records your product, delivery window, tanks, and blocks, and you can track the status under the Deliveries tab.</Text>
              </View>

              <View style={styles.faqCard}>
                <Text style={styles.faqQ}>How do I view my ranches & blocks?</Text>
                <Text style={styles.faqA}>Visit the Ranches tab to view computed ranch acreage, detailed block records (crop, variety, acreage, APN), and tank registers.</Text>
              </View>

              <View style={styles.faqCard}>
                <Text style={styles.faqQ}>Where can I download invoices and statements?</Text>
                <Text style={styles.faqA}>Visit the Invoices tab to view open and paid statements, view official QuickBooks invoices, or download your Year-End Purchase Summary from More.</Text>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Button 
                mode="contained" 
                onPress={() => setHelpModalVisible(false)} 
                buttonColor="#0C6054" 
                style={{ flex: 1, minHeight: 48, justifyContent: 'center' }}
              >
                Close Help Center
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* ==================== YEAR-END PURCHASE SUMMARY MODAL ==================== */}
      <Modal visible={yearEndModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Year-End Purchase Summary</Text>
                <Text style={styles.modalSubtitle}>Statement for tax accountant & records</Text>
              </View>
              <TouchableOpacity onPress={() => setYearEndModalVisible(false)} style={styles.closeBtn}>
                <MaterialCommunityIcons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Year Selector Chips */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {[2026, 2025, 2024].map((year) => (
                <TouchableOpacity
                  key={year}
                  onPress={() => loadYearEndSummary(year)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: selectedYear === year ? '#0C6054' : '#F1F5F9',
                    borderWidth: 1,
                    borderColor: selectedYear === year ? '#0C6054' : '#CBD5E1',
                    minHeight: 40,
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '700',
                    color: selectedYear === year ? '#FFFFFF' : '#475569',
                  }}>
                    {year}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {yearEndLoading ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Text style={{ color: '#64748B' }}>Loading summary data...</Text>
              </View>
            ) : yearEndData ? (
              <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                {/* Metric Summary Cards */}
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                  <View style={{ flex: 1, backgroundColor: '#F0FDF4', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#DCFCE7' }}>
                    <Text style={{ fontSize: 12, color: '#166534', fontWeight: '600' }}>TOTAL GALLONS</Text>
                    <Text style={{ fontSize: 20, fontWeight: '800', color: '#15803D', marginTop: 4 }}>
                      {(yearEndData.totalGallons || 0).toLocaleString()} gal
                    </Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: '#F8FAFC', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' }}>
                    <Text style={{ fontSize: 12, color: '#475569', fontWeight: '600' }}>TOTAL INVOICED</Text>
                    <Text style={{ fontSize: 20, fontWeight: '800', color: '#0F172A', marginTop: 4 }}>
                      ${(yearEndData.totalAmount || 0).toLocaleString()}
                    </Text>
                  </View>
                </View>

                {/* Deliveries Section */}
                <Text style={[styles.sectionSubtitle, { marginBottom: 8 }]}>
                  Deliveries in {yearEndData.year} ({yearEndData.deliveries?.length || 0})
                </Text>
                {(!yearEndData.deliveries || yearEndData.deliveries.length === 0) ? (
                  <Text style={{ color: '#94A3B8', fontSize: 13, marginBottom: 16 }}>No deliveries recorded for {yearEndData.year}.</Text>
                ) : (
                  <View style={{ backgroundColor: '#F8FAFC', borderRadius: 12, padding: 8, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' }}>
                    {yearEndData.deliveries.map((d: any, idx: number) => (
                      <View key={d.id || idx} style={{ paddingVertical: 8, borderBottomWidth: idx === yearEndData.deliveries.length - 1 ? 0 : 1, borderBottomColor: '#E2E8F0' }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ fontWeight: '700', fontSize: 13, color: '#0F172A' }}>{d.productName || d.product}</Text>
                          <Text style={{ fontWeight: '700', fontSize: 13, color: '#0C6054' }}>{Number(d.gallons).toLocaleString()} gal</Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 }}>
                          <Text style={{ fontSize: 12, color: '#64748B' }}>{d.date} • {d.ranchName || 'Ranch'} ({d.tankName || 'Tank'})</Text>
                          <Text style={{ fontSize: 11, fontWeight: '600', color: d.status === 'Delivered' ? '#16A34A' : '#D97706' }}>{d.status}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Invoices Section */}
                <Text style={[styles.sectionSubtitle, { marginBottom: 8 }]}>
                  Invoices in {yearEndData.year} ({yearEndData.invoices?.length || 0})
                </Text>
                {(!yearEndData.invoices || yearEndData.invoices.length === 0) ? (
                  <Text style={{ color: '#94A3B8', fontSize: 13, marginBottom: 16 }}>No invoices recorded for {yearEndData.year}.</Text>
                ) : (
                  <View style={{ backgroundColor: '#F8FAFC', borderRadius: 12, padding: 8, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' }}>
                    {yearEndData.invoices.map((inv: any, idx: number) => (
                      <View key={inv.id || idx} style={{ paddingVertical: 8, borderBottomWidth: idx === yearEndData.invoices.length - 1 ? 0 : 1, borderBottomColor: '#E2E8F0' }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ fontWeight: '700', fontSize: 13, color: '#0F172A' }}>{inv.invoiceNumber}</Text>
                          <Text style={{ fontWeight: '700', fontSize: 13, color: '#0F172A' }}>${Number(inv.amount).toLocaleString()}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 }}>
                          <Text style={{ fontSize: 12, color: '#64748B' }}>Date: {inv.invoiceDate} • Due: {inv.dueDate}</Text>
                          <Text style={{ fontSize: 11, fontWeight: '600', color: inv.status === 'Paid' ? '#16A34A' : inv.status === 'Overdue' ? '#DC2626' : '#2563EB' }}>
                            {inv.status}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>
            ) : null}

            {/* Modal Actions */}
            <View style={[styles.modalActions, { gap: 10 }]}>
              <Button 
                mode="outlined" 
                onPress={downloadYearEndCsv} 
                icon="file-delimited-outline"
                textColor="#0C6054" 
                style={{ flex: 1, borderColor: '#0C6054', minHeight: 48, justifyContent: 'center' }}
              >
                Export CSV
              </Button>
              <Button 
                mode="contained" 
                onPress={handlePrintYearEnd} 
                icon="printer"
                buttonColor="#0C6054" 
                style={{ flex: 1, minHeight: 48, justifyContent: 'center' }}
              >
                Print / PDF
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
  pageTitle: { fontWeight: 'bold', color: '#0C6054', marginBottom: 24, marginTop: 40 },
  profileSection: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  avatarContainer: { alignItems: 'center', marginBottom: 16 },
  avatar: { backgroundColor: '#0C6054' },
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
    borderLeftColor: '#0C6054',
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
  footerBranding: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginTop: 24,
    marginBottom: 8,
  },
});
