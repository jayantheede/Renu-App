import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Text, List, useTheme, Avatar, TextInput, Button } from 'react-native-paper';
import { useAuthStore } from '../store/useAuthStore';
import { updateProfile } from '../api/client';

import * as ImagePicker from 'expo-image-picker';

export const MoreScreen = () => {
  const theme = useTheme();
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const updateUser = useAuthStore(state => state.updateUser);

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (user?.name) setName(user.name);
    if (user?.avatarUrl) setAvatarUrl(user.avatarUrl);
  }, [user?.name, user?.avatarUrl]);

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

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={{ paddingBottom: 120 }}
    >
      <Text variant="headlineMedium" style={styles.pageTitle}>Profile & Settings</Text>
      
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

      <List.Section style={styles.listSection}>
        <List.Subheader>Account Preferences</List.Subheader>
        <List.Item
          title="Notifications"
          description="Push & email alerts"
          left={props => <List.Icon {...props} icon="bell-outline" />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
        />
        <List.Item
          title="Security"
          description="Password & 2FA"
          left={props => <List.Icon {...props} icon="shield-outline" />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
        />
        
        <List.Subheader>Support</List.Subheader>
        <List.Item
          title="Help Center"
          left={props => <List.Icon {...props} icon="help-circle-outline" />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
        />
        <List.Item
          title="Log Out"
          onPress={logout}
          titleStyle={{ color: '#D32F2F', fontWeight: 'bold' }}
          left={props => <List.Icon {...props} icon="logout" color="#D32F2F" />}
        />
      </List.Section>
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
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  listSection: { backgroundColor: '#FFFFFF', borderRadius: 16, paddingVertical: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 }
});
