import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Text, List, useTheme, Avatar, TextInput, Button } from 'react-native-paper';
import { useAuthStore } from '../../store/useAuthStore';
import { updateProfile } from '../../api/client';
import * as ImagePicker from 'expo-image-picker';

export const AdminProfileScreen = () => {
  const theme = useTheme();
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const updateUser = useAuthStore(state => state.updateUser);

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [saving, setSaving] = useState(false);

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
      await updateProfile({ name, avatarUrl: avatarUrl || undefined });
      await updateUser({ name, avatarUrl });
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: '#F9FAFB' }]} showsVerticalScrollIndicator={false}>
      
      {/* Premium Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Admin Settings</Text>
        <Text style={styles.subtitle}>Manage your account and preferences</Text>
      </View>

      <View style={styles.profileSection}>
        <View style={styles.avatarContainer}>
          {avatarUrl || user?.avatarUrl ? (
            <Avatar.Image size={80} source={{ uri: avatarUrl || user?.avatarUrl! }} style={styles.avatar} />
          ) : (
            <Avatar.Text size={80} label={user?.name?.substring(0, 2) || 'A'} style={styles.avatar} />
          )}
        </View>

        {isEditing ? (
          <View style={styles.editForm}>
            <Button mode="outlined" onPress={handlePickImage} icon="camera" style={{ marginBottom: 12 }} textColor="#1F4E34" buttonColor="#E8F5E9">
              Upload Avatar
            </Button>
            <TextInput
              label="Full Name"
              value={name}
              onChangeText={setName}
              style={styles.input}
              mode="outlined"
              activeOutlineColor="#1F4E34"
            />
            <View style={styles.actionRow}>
              <Button mode="text" onPress={() => { setIsEditing(false); setName(user?.name||''); setAvatarUrl(user?.avatarUrl||''); }} textColor="#6B7280">Cancel</Button>
              <Button mode="contained" onPress={handleSaveProfile} loading={saving} buttonColor="#1F4E34">Save Changes</Button>
            </View>
          </View>
        ) : (
          <View style={styles.profileInfo}>
            <Text variant="headlineSmall" style={{ fontWeight: '800', color: '#111827' }}>{user?.name}</Text>
            <Text variant="bodyMedium" style={{ color: '#6B7280', marginBottom: 16 }}>{user?.email} • {user?.role}</Text>
            <Button mode="outlined" onPress={() => setIsEditing(true)} textColor="#1F4E34" style={{ borderColor: '#1F4E34', borderRadius: 8 }}>
              Edit Profile
            </Button>
          </View>
        )}
      </View>

      <View style={styles.listSection}>
        <Text style={styles.sectionTitle}>System Administration</Text>
        <List.Item
          title="Platform Settings"
          description="Configure global app behavior"
          left={props => <List.Icon {...props} icon="cog-outline" color="#4B5563" />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
        />
        <List.Item
          title="Security & Audits"
          description="Review activity logs"
          left={props => <List.Icon {...props} icon="shield-check-outline" color="#4B5563" />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
        />
        
        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Account</Text>
        <List.Item
          title="Sign Out"
          description="End your admin session safely"
          onPress={logout}
          titleStyle={{ color: '#DC2626', fontWeight: 'bold' }}
          left={props => <List.Icon {...props} icon="logout" color="#DC2626" />}
          style={styles.logoutItem}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
  },
  profileSection: { backgroundColor: '#FFFFFF', marginHorizontal: 16, borderRadius: 24, padding: 24, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  avatarContainer: { alignItems: 'center', marginBottom: 16 },
  avatar: { backgroundColor: '#1F4E34' },
  profileInfo: { alignItems: 'center' },
  editForm: { marginTop: 8 },
  input: { marginBottom: 12, backgroundColor: '#FFF' },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  listSection: { backgroundColor: '#FFFFFF', marginHorizontal: 16, borderRadius: 24, padding: 20, marginBottom: 120, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 8, marginLeft: 16 },
  logoutItem: { backgroundColor: '#FEF2F2', borderRadius: 12, marginTop: 8 }
});
