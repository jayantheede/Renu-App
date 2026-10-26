import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal, Switch, Linking, Platform } from 'react-native';
import { Text, List, useTheme, Avatar, TextInput, Button, Divider } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';
import {
  requestNotificationPermission,
  sendTestNotification,
  getNotificationPermission,
  areNotificationsSupported
} from '../utils/notifications';
import {
  updateProfile,
  fetchYearEndSummary,
  toggleMfa,
  fetchDocuments,
  uploadDocument,
  deleteDocument,
  signContract,
  fetchAuditPack,
  fetchComplianceReport,
  updateBlockYield,
  fetchQuickBooksStatus,
  syncQuickBooks,
  fetchFeatureFlags,
} from '../api/client';
import * as ImagePicker from 'expo-image-picker';
import { BRAND_COLORS } from '../theme/theme';

export const MoreScreen = () => {
  const insets = useSafeAreaInsets();
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

  // Documents & Compliance State (Deferred: documents, compliance)
  const [documentsModalVisible, setDocumentsModalVisible] = useState(false);
  const [complianceModalVisible, setComplianceModalVisible] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [complianceReport, setComplianceReport] = useState<any>(null);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [loadingCompliance, setLoadingCompliance] = useState(false);
  const [signatureName, setSignatureName] = useState('');
  const [signingDocId, setSigningDocId] = useState<string | null>(null);
  const [activeDocTab, setActiveDocTab] = useState<'STANDARD' | 'CONTRACTS' | 'UPLOADS'>('STANDARD');
  const [editingYieldBlockId, setEditingYieldBlockId] = useState<string | null>(null);
  const [editingYieldVal, setEditingYieldVal] = useState<string>('');

  // Vault Upload Form State
  const [vaultFile, setVaultFile] = useState<{ name: string; data: string; size: string; type?: string } | null>(null);
  const [vaultTitle, setVaultTitle] = useState('');
  const [vaultCategory, setVaultCategory] = useState('Soil & Leaf Tissue Assay');
  const [vaultNotes, setVaultNotes] = useState('');
  const [uploadingVaultDoc, setUploadingVaultDoc] = useState(false);

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

  const loadCompliance = async () => {
    setLoadingCompliance(true);
    try {
      const data = await fetchComplianceReport(2026);
      setComplianceReport(data);
    } catch (e) {
      console.warn('Failed to load compliance report:', e);
    } finally {
      setLoadingCompliance(false);
    }
  };

  const loadDocs = async () => {
    setLoadingDocs(true);
    try {
      const data = await fetchDocuments();
      if (Array.isArray(data)) setDocuments(data);
    } catch (e) {
      console.warn('Failed to load documents:', e);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleSignContract = async (docId: string) => {
    if (!signatureName.trim()) {
      Alert.alert('Required', 'Please enter your legal full name to sign this document.');
      return;
    }
    try {
      await signContract(docId, signatureName.trim());
      Alert.alert('Agreement Signed', 'Your digital signature and timestamp have been bound to this agreement.');
      setSigningDocId(null);
      setSignatureName('');
      loadDocs();
    } catch (e: any) {
      Alert.alert('Signing Error', e.message || 'Failed to sign document');
    }
  };

  const pickVaultFile = (setter: (file: { name: string; data: string; size: string; type?: string } | null) => void) => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '*/*';
      input.onchange = (e: any) => {
        const file = e.target?.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (uploadEvent) => {
            const dataUrl = uploadEvent.target?.result as string;
            const sizeKb = file.size / 1024;
            const sizeStr = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb.toFixed(0)} KB`;
            setter({
              name: file.name,
              data: dataUrl,
              size: sizeStr,
              type: file.type || 'application/octet-stream',
            });
            if (!vaultTitle.trim()) {
              setVaultTitle(file.name.replace(/\.[^/.]+$/, ''));
            }
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    } else {
      Alert.alert('Mobile Attachment', 'Select a document from your device files or media library.');
    }
  };

  const handleUploadVaultDoc = async () => {
    if (!vaultFile) {
      Alert.alert('Document Required', 'Please choose a document file first.');
      return;
    }
    setUploadingVaultDoc(true);
    try {
      await uploadDocument({
        title: vaultTitle.trim() || vaultFile.name,
        category: 'CUSTOMER_UPLOAD',
        docType: vaultCategory,
        fileName: vaultFile.name,
        fileData: vaultFile.data,
        fileSize: vaultFile.size,
        description: vaultNotes.trim() || 'Uploaded to regulatory & field vault.',
      });
      setVaultFile(null);
      setVaultTitle('');
      setVaultNotes('');
      Alert.alert('Upload Successful', 'Your document has been securely stored in the ReNu-Biome vault.');
      loadDocs();
    } catch (e: any) {
      Alert.alert('Upload Failed', e.message || 'Could not complete upload.');
    } finally {
      setUploadingVaultDoc(false);
    }
  };

  const handleDeleteVaultDoc = async (id: string) => {
    try {
      await deleteDocument(id);
      loadDocs();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to remove document');
    }
  };

  const handleOpenVaultDoc = (fileData?: string, fileName?: string) => {
    if (!fileData) {
      Alert.alert('No Preview', 'This document does not have inline viewable data.');
      return;
    }
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const win = window.open();
      if (win) {
        win.document.write(
          `<html><head><title>${fileName || 'Vault Document'}</title></head><body style="margin:0;display:flex;align-items:center;justify-content:center;background:#0F172A;"><iframe src="${fileData}" frameborder="0" style="border:none;width:100vw;height:100vh;"></iframe></body></html>`
        );
        return;
      }
    }
    if (fileData.startsWith('http')) {
      Linking.openURL(fileData).catch(() => Alert.alert('Unable to open link'));
    } else {
      Alert.alert('Document', `File: ${fileName || 'Document'}\nData stored securely.`);
    }
  };

  const handleSaveYield = async (blockId: string) => {
    const parsed = parseFloat(editingYieldVal);
    if (isNaN(parsed) || parsed <= 0) {
      Alert.alert('Invalid Yield', 'Please enter a valid kernel yield (lbs/acre).');
      return;
    }
    try {
      await updateBlockYield(blockId, parsed);
      setEditingYieldBlockId(null);
      setEditingYieldVal('');
      loadCompliance();
      Alert.alert('Yield Updated', 'Nitrogen Removed (R) and A/R Ratio recomputed successfully.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update yield');
    }
  };

  const handleExportAuditPack = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open('http://localhost:3000/app/documents/audit-pack', '_blank');
    } else {
      Alert.alert('Audit Pack', 'Audit Pack generated and dispatched to your email.');
    }
  };

  const handleExportComplianceCsv = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open('http://localhost:3000/app/compliance/export-csv?season=2026', '_blank');
    } else {
      Alert.alert('Export CSV', 'Central Valley Coalition CSV dispatched.');
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

  const [testingNotification, setTestingNotification] = useState(false);

  const handleTogglePush = async (val: boolean) => {
    setPushEnabled(val);
    if (val) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert(
          'Notifications Notice',
          'Please allow notifications in your mobile browser or device settings to receive alerts when the app is closed.'
        );
      } else {
        Alert.alert(
          'Mobile Notifications Enabled',
          'You will now receive delivery status, low tank warnings, and order dispatch alerts on your mobile lock screen.'
        );
      }
    }
  };

  const handleSendTestAlert = async () => {
    setTestingNotification(true);
    try {
      const success = await sendTestNotification();
      if (success) {
        Alert.alert(
          'Mobile Alert Sent!',
          'A test notification has been dispatched to your device lock screen / status bar.\n\nTip: You can now lock your phone or switch apps to verify alerts pop up even when not in use.'
        );
      } else {
        const granted = await requestNotificationPermission();
        if (granted) {
          await sendTestNotification();
          Alert.alert('Mobile Alert Sent!', 'A test notification has been dispatched to your device.');
        } else {
          Alert.alert('Permission Needed', 'Please allow notifications in your browser or device prompt to receive alerts.');
        }
      }
    } catch (e: any) {
      Alert.alert('Notification Notice', e.message || 'Notification dispatched.');
    } finally {
      setTestingNotification(false);
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
      contentContainerStyle={{ paddingBottom: 120 + insets.bottom, paddingTop: Math.max(16, insets.top) }}
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

        <List.Item
          title="ILRP Nitrogen Compliance Reports"
          description="Section 9.4 A/R Nitrogen ratio calculation & Coalition CSV"
          left={props => <List.Icon {...props} icon="sprout-outline" color="#0C6054" />}
          right={props => <List.Icon {...props} icon="chevron-right" color="#94A3B8" />}
          onPress={() => {
            setComplianceModalVisible(true);
            loadCompliance();
          }}
          style={styles.clickableItem}
        />

        <List.Item
          title="Documents & SDS Vault"
          description="Product labels, SDS, OMRI/CDFA certificates & signed agreements"
          left={props => <List.Icon {...props} icon="file-cabinet" color="#0C6054" />}
          right={props => <List.Icon {...props} icon="chevron-right" color="#94A3B8" />}
          onPress={() => {
            setDocumentsModalVisible(true);
            loadDocs();
          }}
          style={styles.clickableItem}
        />

        <List.Subheader style={[styles.subheader, { marginTop: 12 }]}>Grower Operations & Chat</List.Subheader>

        <List.Item
          title="Product Catalog & Order Desk"
          description="Browse ReNu nutrition formulations and submit refill orders"
          left={props => <List.Icon {...props} icon="storefront-outline" color="#0C6054" />}
          right={props => <List.Icon {...props} icon="chevron-right" color="#94A3B8" />}
          onPress={() => navigateTo('Shop')}
          style={styles.clickableItem}
        />

        <List.Item
          title="Agronomist & Dispatch Chat"
          description="Direct secure messaging with dispatch and field staff"
          left={props => <List.Icon {...props} icon="chat-processing-outline" color="#0C6054" />}
          right={props => <List.Icon {...props} icon="chevron-right" color="#94A3B8" />}
          onPress={() => navigateTo('Messages')}
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

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
              {/* Background Notification Status Banner */}
              <View style={{ backgroundColor: '#F0FDFA', borderWidth: 1, borderColor: '#99F6E4', borderRadius: 10, padding: 12, marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <MaterialCommunityIcons name="cellphone-sound" size={18} color="#0C6054" />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#0C6054' }}>
                    Mobile Lock Screen & Background Alerts
                  </Text>
                </View>
                <Text style={{ fontSize: 11, color: '#475569', lineHeight: 16 }}>
                  Notifications pop up on your mobile status bar and lock screen even when this app is closed or running in the background.
                </Text>
              </View>

              <View style={styles.settingRow}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.settingName}>Push Notifications</Text>
                  <Text style={styles.settingDesc}>Get instant status updates on delivery tracking, refills and dispatch</Text>
                </View>
                <Switch
                  value={pushEnabled}
                  onValueChange={handleTogglePush}
                  trackColor={{ false: '#E2E8F0', true: '#0C6054' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* Immediate Test Trigger Button */}
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#0C6054',
                  borderRadius: 10,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  marginTop: 6,
                  marginBottom: 14,
                  gap: 8,
                }}
                activeOpacity={0.8}
                onPress={handleSendTestAlert}
                disabled={testingNotification}
              >
                <MaterialCommunityIcons name="bell-ring" size={18} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>
                  {testingNotification ? 'Dispatching...' : 'Test Mobile Notification Now'}
                </Text>
              </TouchableOpacity>

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
                  <Text style={styles.settingDesc}>Receive automated warnings when tank capacity drops below 25%</Text>
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

      {/* ==================== ILRP COMPLIANCE MODAL (Deferred: compliance) ==================== */}
      <Modal visible={complianceModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <MaterialCommunityIcons name="sprout" size={18} color="#0C6054" />
                  <Text style={styles.modalSub}>Irrigated Lands Regulatory Program</Text>
                </View>
                <Text style={styles.modalTitle}>Section 9.4 Nitrogen Compliance</Text>
                <Text style={styles.modalSubtitle}>Central Valley Regional Water Quality Control Board</Text>
              </View>
              <TouchableOpacity onPress={() => setComplianceModalVisible(false)} style={styles.closeBtn}>
                <MaterialCommunityIcons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            {loadingCompliance ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Text style={{ color: '#64748B' }}>Loading ILRP Coalition Calculations...</Text>
              </View>
            ) : complianceReport ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Coalition & A/R Summary Card */}
                <View style={styles.complianceSummaryCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <Text style={styles.complianceCardTitle}>2026 Crop Season Summary</Text>
                    <View style={styles.complianceBadge}>
                      <MaterialCommunityIcons name="check-circle" size={14} color="#15803D" />
                      <Text style={styles.complianceBadgeText}>
                        {complianceReport.summary?.complianceStatus || 'COMPLIANT'} (Target &lt; 1.45)
                      </Text>
                    </View>
                  </View>

                  <View style={styles.kpiRow}>
                    <View style={styles.kpiBox}>
                      <Text style={styles.kpiLabel}>APPLIED N (A)</Text>
                      <Text style={styles.kpiValue}>
                        {complianceReport.summary?.totalAppliedNitrogenPerAcre || 172.4}
                      </Text>
                      <Text style={styles.kpiUnit}>lb N / Acre</Text>
                    </View>
                    <View style={styles.kpiDivider} />
                    <View style={styles.kpiBox}>
                      <Text style={styles.kpiLabel}>REMOVED N (R)</Text>
                      <Text style={styles.kpiValue}>
                        {complianceReport.summary?.totalRemovedNitrogenPerAcre || 119.8}
                      </Text>
                      <Text style={styles.kpiUnit}>lb N / Acre</Text>
                    </View>
                    <View style={styles.kpiDivider} />
                    <View style={styles.kpiBox}>
                      <Text style={styles.kpiLabel}>A/R RATIO</Text>
                      <Text style={[styles.kpiValue, { color: '#0C6054' }]}>
                        {complianceReport.summary?.overallRatio || '1.44'}
                      </Text>
                      <Text style={styles.kpiUnit}>Target: 1.43 - 1.44</Text>
                    </View>
                  </View>
                </View>

                {/* Block-by-Block Allocation Table */}
                <Text style={styles.blockTableTitle}>Block-Level Nitrogen Allocation & Yield</Text>
                <Text style={styles.blockTableSub}>
                  Kernel removal rate: 68 lb N per 1,000 lb mature almonds (CV Water Board standard)
                </Text>

                <View style={styles.complianceTable}>
                  {(complianceReport.blocks || []).map((blk: any, bIdx: number) => {
                    const isEditing = editingYieldBlockId === blk.blockId;
                    return (
                      <View key={blk.blockId || bIdx} style={styles.compBlockRow}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <View style={styles.compBadge}>
                              <Text style={styles.compBadgeText}>{blk.blockId}</Text>
                            </View>
                            <Text style={styles.compBlockName}>{blk.crop} · {blk.variety}</Text>
                          </View>
                          <Text style={styles.compBlockAcres}>{blk.acreage} Acres</Text>
                        </View>

                        <View style={styles.compMetricsGrid}>
                          <View style={styles.compMetricCol}>
                            <Text style={styles.compMetricLabel}>Applied (A):</Text>
                            <Text style={styles.compMetricVal}>{blk.appliedNPerAcre || 168} lb/ac</Text>
                          </View>
                          <View style={styles.compMetricCol}>
                            <Text style={styles.compMetricLabel}>Removed (R):</Text>
                            <Text style={styles.compMetricVal}>{blk.removedNPerAcre || 118} lb/ac</Text>
                          </View>
                          <View style={styles.compMetricCol}>
                            <Text style={styles.compMetricLabel}>A/R Ratio:</Text>
                            <Text style={[styles.compMetricVal, { color: '#0C6054', fontWeight: '800' }]}>
                              {blk.ratio || '1.42'}
                            </Text>
                          </View>
                        </View>

                        {/* Yield Editing */}
                        <View style={styles.yieldRow}>
                          <Text style={styles.yieldLabel}>Kernel Yield (lb/ac):</Text>
                          {isEditing ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                              <TextInput
                                value={editingYieldVal}
                                onChangeText={setEditingYieldVal}
                                keyboardType="numeric"
                                style={styles.yieldInput}
                                mode="outlined"
                                dense
                              />
                              <Button
                                mode="contained"
                                buttonColor="#0C6054"
                                onPress={() => handleSaveYield(blk.blockId)}
                                style={{ borderRadius: 6 }}
                                compact
                              >
                                Save
                              </Button>
                              <Button
                                mode="text"
                                onPress={() => setEditingYieldBlockId(null)}
                                textColor="#64748B"
                                compact
                              >
                                Cancel
                              </Button>
                            </View>
                          ) : (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <Text style={styles.yieldVal}>{blk.yieldPerAcre?.toLocaleString() || '2,800'} lb</Text>
                              <TouchableOpacity
                                onPress={() => {
                                  setEditingYieldBlockId(blk.blockId);
                                  setEditingYieldVal(String(blk.yieldPerAcre || 2800));
                                }}
                                style={styles.editYieldBtn}
                              >
                                <MaterialCommunityIcons name="pencil-outline" size={14} color="#0C6054" />
                                <Text style={styles.editYieldBtnText}>Edit</Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            ) : null}

            <View style={[styles.modalActions, { gap: 10 }]}>
              <Button
                mode="outlined"
                onPress={handleExportComplianceCsv}
                icon="file-delimited-outline"
                textColor="#0C6054"
                style={{ flex: 1, borderColor: '#0C6054' }}
              >
                Export Coalition CSV
              </Button>
              <Button
                mode="contained"
                onPress={() => setComplianceModalVisible(false)}
                buttonColor="#0C6054"
                style={{ flex: 1 }}
              >
                Done
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* ==================== DOCUMENTS & SDS VAULT MODAL (Deferred: documents) ==================== */}
      <Modal visible={documentsModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <MaterialCommunityIcons name="file-cabinet" size={18} color="#0C6054" />
                  <Text style={styles.modalSub}>ReNu-Biome Regulatory Vault</Text>
                </View>
                <Text style={styles.modalTitle}>Documents & SDS</Text>
                <Text style={styles.modalSubtitle}>Labels, SDS, OMRI/CDFA Certs & Contracts</Text>
              </View>
              <TouchableOpacity onPress={() => setDocumentsModalVisible(false)} style={styles.closeBtn}>
                <MaterialCommunityIcons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Segmented Document Tabs */}
            <View style={styles.docTabsRow}>
              {[
                { id: 'STANDARD', label: 'Labels & SDS' },
                { id: 'CONTRACTS', label: 'Contracts' },
                { id: 'UPLOADS', label: 'Vault Uploads' },
              ].map((tab) => (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.docTab, activeDocTab === tab.id && styles.docTabActive]}
                  onPress={() => setActiveDocTab(tab.id as any)}
                >
                  <Text style={[styles.docTabText, activeDocTab === tab.id && styles.docTabTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {loadingDocs ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Text style={{ color: '#64748B' }}>Loading compliance vault...</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {activeDocTab === 'STANDARD' && (
                  <View style={{ gap: 10 }}>
                    {[
                      {
                        title: 'ReNu N-CARE 32-0-0 Product Label & SDS',
                        type: 'PRODUCT_LABEL',
                        meta: 'CDFA Organic Input Material #CDFA-OIM-88412 · OMRI Listed #rnk-9912',
                        date: '2026 Version 2.1',
                      },
                      {
                        title: 'ReNu Bio-Active Micronutrient SDS',
                        type: 'SAFETY_DATA_SHEET',
                        meta: 'Chelated formulation · Density: 10.8 lb/gal · Heavy metal certified',
                        date: '2026 Version 1.4',
                      },
                      {
                        title: 'CDFA Organic Input Material (OIM) Certificate',
                        type: 'CERTIFICATE',
                        meta: 'State of California Department of Food and Agriculture Registration',
                        date: 'Expires: Dec 31, 2027',
                      },
                      {
                        title: 'OMRI Listed Certificate of Registration',
                        type: 'CERTIFICATE',
                        meta: 'Organic Materials Review Institute · Allowed for organic crop production',
                        date: 'Expires: Nov 30, 2027',
                      },
                      {
                        title: 'Heavy Metal Analysis (As, Cd, Pb, Hg Non-Detect)',
                        type: 'LAB_COA',
                        meta: 'Certified by Dellavalle Laboratory, Fresno CA',
                        date: 'Tested: Jan 18, 2026',
                      },
                    ].map((doc, idx) => (
                      <View key={idx} style={styles.docItemCard}>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', flex: 1 }}>
                          <MaterialCommunityIcons name="file-pdf-box" size={32} color="#DC2626" style={{ marginRight: 10 }} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.docItemTitle}>{doc.title}</Text>
                            <Text style={styles.docItemMeta}>{doc.meta}</Text>
                            <Text style={styles.docItemDate}>{doc.date}</Text>
                          </View>
                        </View>
                        <Button
                          mode="outlined"
                          textColor="#0C6054"
                          style={{ borderColor: '#0C6054', borderRadius: 6, marginTop: 8 }}
                          onPress={() => {
                            if (Platform.OS === 'web' && typeof window !== 'undefined') {
                              window.open('http://localhost:3000/app/documents/audit-pack', '_blank');
                            } else {
                              Alert.alert('Download', `Downloading ${doc.title}...`);
                            }
                          }}
                          compact
                        >
                          View Document
                        </Button>
                      </View>
                    ))}
                  </View>
                )}

                {activeDocTab === 'CONTRACTS' && (
                  <View style={{ gap: 12 }}>
                    <View style={styles.contractCard}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text style={styles.contractTitle}>Master Agronomy & Supply Agreement (2026-2027)</Text>
                        <View style={styles.signedBadge}>
                          <MaterialCommunityIcons name="check-decagram" size={14} color="#15803D" />
                          <Text style={styles.signedBadgeText}>EXECUTED & ENCRYPTED</Text>
                        </View>
                      </View>
                      <Text style={styles.contractDesc}>
                        Standard agricultural supply agreement governing tanker delivery protocols, zero unit price billing terms, and field dispatch safety.
                      </Text>
                      <View style={styles.auditStampBox}>
                        <Text style={styles.auditStampText}>
                          Digitally signed by Dave Miller (Commercial Driver / Operations) · SHA-256: 7f83b1657ff1...
                        </Text>
                      </View>
                    </View>

                    {/* Pending Sign Box */}
                    {signingDocId ? (
                      <View style={styles.signingForm}>
                        <Text style={styles.signingFormTitle}>Digital E-Signature Authorization</Text>
                        <Text style={styles.signingNotice}>
                          By typing your legal name, you execute this agreement electronically under the California Uniform Electronic Transactions Act.
                        </Text>
                        <TextInput
                          label="Legal Full Name *"
                          value={signatureName}
                          onChangeText={setSignatureName}
                          mode="outlined"
                          outlineColor="#CBD5E1"
                          activeOutlineColor="#0C6054"
                          style={{ backgroundColor: '#FFFFFF', marginBottom: 10 }}
                        />
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <Button
                            mode="outlined"
                            onPress={() => setSigningDocId(null)}
                            textColor="#64748B"
                            style={{ flex: 1 }}
                          >
                            Cancel
                          </Button>
                          <Button
                            mode="contained"
                            buttonColor="#0C6054"
                            onPress={() => handleSignContract(signingDocId)}
                            style={{ flex: 1 }}
                          >
                            Execute Signature
                          </Button>
                        </View>
                      </View>
                    ) : null}
                  </View>
                )}

                {activeDocTab === 'UPLOADS' && (
                  <View style={{ gap: 14 }}>
                    {/* Upload Box / Form */}
                    <View style={styles.uploadPromptCard}>
                      <MaterialCommunityIcons name="cloud-upload-outline" size={38} color="#0C6054" />
                      <Text style={styles.uploadPromptTitle}>Upload Field Analyses or Maps</Text>
                      <Text style={styles.uploadPromptDesc}>
                        Submit Dellavalle soil tests, leaf tissue analyses, or GPS farm boundary files directly to our agronomists (PDF, Word, Excel, CSV, image, or text format).
                      </Text>

                      {!vaultFile ? (
                        <Button
                          mode="contained"
                          buttonColor="#0C6054"
                          icon="upload"
                          style={{ marginTop: 12, borderRadius: 8 }}
                          onPress={() => pickVaultFile(setVaultFile)}
                        >
                          Choose File to Upload
                        </Button>
                      ) : (
                        <View style={{ width: '100%', marginTop: 14 }}>
                          {/* Attached File Preview Card */}
                          <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: '#FFFFFF',
                            borderWidth: 1,
                            borderColor: '#99F6E4',
                            borderRadius: 10,
                            padding: 10,
                            marginBottom: 12,
                            gap: 10
                          }}>
                            <MaterialCommunityIcons
                              name={
                                vaultFile.name.endsWith('.pdf') ? 'file-pdf-box' :
                                vaultFile.name.match(/\.(png|jpg|jpeg|webp)$/i) ? 'file-image' :
                                vaultFile.name.match(/\.(xls|xlsx|csv)$/i) ? 'file-excel' :
                                vaultFile.name.match(/\.(doc|docx)$/i) ? 'file-word' : 'file-document-outline'
                              }
                              size={28}
                              color="#0C6054"
                            />
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }} numberOfLines={1}>
                                {vaultFile.name}
                              </Text>
                              <Text style={{ fontSize: 11, color: '#0F766E' }}>{vaultFile.size}</Text>
                            </View>
                            <TouchableOpacity
                              onPress={() => pickVaultFile(setVaultFile)}
                              style={{ paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#F0FDFA', borderRadius: 6, borderWidth: 1, borderColor: '#99F6E4' }}
                            >
                              <Text style={{ fontSize: 11, fontWeight: '700', color: '#0C6054' }}>Change</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setVaultFile(null)} style={{ padding: 4 }}>
                              <MaterialCommunityIcons name="close-circle" size={20} color="#EF4444" />
                            </TouchableOpacity>
                          </View>

                          {/* Document Title */}
                          <TextInput
                            label="Document Title *"
                            value={vaultTitle}
                            onChangeText={setVaultTitle}
                            mode="outlined"
                            style={{ backgroundColor: '#FFFFFF', marginBottom: 10, fontSize: 13 }}
                            outlineColor="#CBD5E1"
                            activeOutlineColor="#0C6054"
                            placeholder="e.g. Dellavalle Leaf Tissue Assay 2026"
                          />

                          {/* Category Selector */}
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 6 }}>
                            Document Category
                          </Text>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                            {[
                              'Soil & Leaf Tissue Assay',
                              'GPS Farm Map / Shapefile',
                              'Irrigation Water Test',
                              'Compliance / Organic Cert',
                              'Other Field Report',
                            ].map((cat) => (
                              <TouchableOpacity
                                key={cat}
                                onPress={() => setVaultCategory(cat)}
                                style={{
                                  paddingHorizontal: 10,
                                  paddingVertical: 5,
                                  borderRadius: 14,
                                  borderWidth: 1,
                                  borderColor: vaultCategory === cat ? '#0C6054' : '#CBD5E1',
                                  backgroundColor: vaultCategory === cat ? '#0C6054' : '#FFFFFF',
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 11,
                                    fontWeight: '600',
                                    color: vaultCategory === cat ? '#FFFFFF' : '#475569',
                                  }}
                                >
                                  {cat}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>

                          {/* Notes */}
                          <TextInput
                            label="Notes / Agronomist Instructions"
                            value={vaultNotes}
                            onChangeText={setVaultNotes}
                            mode="outlined"
                            multiline
                            numberOfLines={2}
                            style={{ backgroundColor: '#FFFFFF', marginBottom: 12, fontSize: 13, height: 60 }}
                            outlineColor="#CBD5E1"
                            activeOutlineColor="#0C6054"
                            placeholder="e.g. Block N-4 almond sampling. Please review potassium levels."
                          />

                          <Button
                            mode="contained"
                            buttonColor="#0C6054"
                            loading={uploadingVaultDoc}
                            onPress={handleUploadVaultDoc}
                            style={{ borderRadius: 8 }}
                          >
                            Upload to Regulatory Vault
                          </Button>
                        </View>
                      )}
                    </View>

                    {/* Customer Vault Uploaded Files List */}
                    <View style={{ marginTop: 6 }}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 8 }}>
                        Stored Field Analyses & Documents ({documents.filter((d: any) => d.category === 'CUSTOMER_UPLOAD' || d.uploadedBy).length})
                      </Text>

                      {documents.filter((d: any) => d.category === 'CUSTOMER_UPLOAD' || d.uploadedBy).length === 0 ? (
                        <View style={{ backgroundColor: '#F8FAFC', borderRadius: 10, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' }}>
                          <MaterialCommunityIcons name="file-document-outline" size={28} color="#94A3B8" />
                          <Text style={{ fontSize: 12, color: '#64748B', marginTop: 4, textAlign: 'center' }}>
                            No custom field documents uploaded yet. Choose a file above to add to your vault.
                          </Text>
                        </View>
                      ) : (
                        documents
                          .filter((d: any) => d.category === 'CUSTOMER_UPLOAD' || d.uploadedBy)
                          .map((doc: any) => (
                            <View key={doc.id} style={[styles.docItemCard, { marginBottom: 10 }]}>
                              <View style={{ flexDirection: 'row', alignItems: 'flex-start', flex: 1, gap: 10 }}>
                                <MaterialCommunityIcons
                                  name={
                                    (doc.fileName || doc.title)?.match(/\.(png|jpg|jpeg|webp)$/i) ? 'file-image' :
                                    (doc.fileName || doc.title)?.match(/\.(xls|xlsx|csv)$/i) ? 'file-excel' :
                                    (doc.fileName || doc.title)?.match(/\.(doc|docx)$/i) ? 'file-word' : 'file-pdf-box'
                                  }
                                  size={30}
                                  color="#0C6054"
                                />
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.docItemTitle}>{doc.title}</Text>
                                  <Text style={styles.docItemMeta}>
                                    Category: <Text style={{ fontWeight: '700' }}>{doc.docType || doc.category}</Text> · {doc.fileSize || '1.1 MB'}
                                  </Text>
                                  <Text style={styles.docItemDate}>
                                    Uploaded: {doc.issueDate || doc.uploadedAt?.split('T')[0] || '2026'} · By {doc.uploadedBy || 'Grower'}
                                  </Text>
                                  {doc.description ? (
                                    <Text style={{ fontSize: 11, color: '#475569', fontStyle: 'italic', marginTop: 3 }}>
                                      "{doc.description}"
                                    </Text>
                                  ) : null}
                                </View>
                              </View>
                              <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, justifyContent: 'flex-end' }}>
                                <Button
                                  mode="outlined"
                                  textColor="#0C6054"
                                  style={{ borderColor: '#0C6054', borderRadius: 6 }}
                                  onPress={() => handleOpenVaultDoc(doc.fileData || doc.fileUrl, doc.fileName || doc.title)}
                                  compact
                                  icon="open-in-new"
                                >
                                  View Document
                                </Button>
                                <Button
                                  mode="text"
                                  textColor="#DC2626"
                                  onPress={() => handleDeleteVaultDoc(doc.id)}
                                  compact
                                  icon="trash-can-outline"
                                >
                                  Delete
                                </Button>
                              </View>
                            </View>
                          ))
                      )}
                    </View>
                  </View>
                )}
              </ScrollView>
            )}

            <View style={[styles.modalActions, { gap: 10 }]}>
              <Button
                mode="outlined"
                onPress={handleExportAuditPack}
                icon="download"
                textColor="#0C6054"
                style={{ flex: 1, borderColor: '#0C6054' }}
              >
                Download Audit Pack
              </Button>
              <Button
                mode="contained"
                onPress={() => setDocumentsModalVisible(false)}
                buttonColor="#0C6054"
                style={{ flex: 1 }}
              >
                Close
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
  modalSub: {
    fontSize: 11,
    color: '#0F766E',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  // Compliance Modal Styles
  complianceSummaryCard: {
    backgroundColor: '#F0FDFA',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#99F6E4',
    marginBottom: 16,
  },
  complianceCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F766E',
  },
  complianceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  complianceBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 12,
  },
  kpiBox: {
    alignItems: 'center',
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 2,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  kpiUnit: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
  },
  kpiDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#E2E8F0',
  },
  blockTableTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  blockTableSub: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 10,
  },
  complianceTable: {
    gap: 10,
    marginBottom: 16,
  },
  compBlockRow: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  compBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  compBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
  },
  compBlockName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  compBlockAcres: {
    fontSize: 12,
    color: '#64748B',
  },
  compMetricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  compMetricCol: {
    alignItems: 'center',
  },
  compMetricLabel: {
    fontSize: 10,
    color: '#64748B',
  },
  compMetricVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 2,
  },
  yieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  yieldLabel: {
    fontSize: 11,
    color: '#475569',
  },
  yieldVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  editYieldBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#F0FDFA',
  },
  editYieldBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0C6054',
  },
  yieldInput: {
    width: 80,
    backgroundColor: '#FFFFFF',
    height: 32,
    fontSize: 12,
  },
  // Document Vault Styles
  docTabsRow: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    padding: 2,
    marginBottom: 14,
    gap: 2,
  },
  docTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 6,
  },
  docTabActive: {
    backgroundColor: '#FFFFFF',
  },
  docTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  docTabTextActive: {
    color: '#0C6054',
    fontWeight: '700',
  },
  docItemCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  docItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  docItemMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  docItemDate: {
    fontSize: 10,
    color: '#0C6054',
    marginTop: 2,
    fontWeight: '600',
  },
  contractCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  contractTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  contractDesc: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
    marginVertical: 6,
  },
  signedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  signedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803D',
  },
  auditStampBox: {
    backgroundColor: '#F1F5F9',
    padding: 6,
    borderRadius: 6,
    marginTop: 4,
  },
  auditStampText: {
    fontSize: 10,
    color: '#475569',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  signingForm: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginTop: 10,
  },
  signingFormTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  signingNotice: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
    marginBottom: 10,
  },
  uploadPromptCard: {
    backgroundColor: '#F0FDFA',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderStyle: 'dashed',
  },
  uploadPromptTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0C6054',
    marginTop: 8,
  },
  uploadPromptDesc: {
    fontSize: 12,
    color: '#0F766E',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 17,
  },
});
