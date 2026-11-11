import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button, useTheme, List, Divider } from 'react-native-paper';
import { useAuthStore } from '../store/useAuthStore';
import { useResponsiveLayout } from '../utils/responsive';

export const ProfileScreen = () => {
  const theme = useTheme();
  const { session, logout } = useAuthStore();
  const { insets, safeHorizontalPadding, centeredContainerStyle, tabBarBottomClearance } = useResponsiveLayout(760);
  const customerName = session?.user?.user_metadata?.full_name || 'Client';
  const email = session?.user?.email || 'N/A';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: 'transparent' }]}
      contentContainerStyle={{ paddingBottom: tabBarBottomClearance }}
    >
      <View
        style={[
          styles.header,
          safeHorizontalPadding,
          { paddingTop: Math.max(20, insets.top + 8) },
        ]}
      >
        <Text variant="headlineMedium">{customerName}</Text>
        <Text variant="bodyLarge">Agri Assistant Client</Text>
      </View>

      <View style={[safeHorizontalPadding, centeredContainerStyle]}>

      <Card style={styles.card}>
        <List.Section>
          <List.Subheader>Account Details</List.Subheader>
          <List.Item title="Email" description={email} left={() => <List.Icon icon="email" />} />
          <List.Item title="Shipping Address" description="123 Farm Road, Central Valley, CA" left={() => <List.Icon icon="map-marker" />} />
        </List.Section>
      </Card>

      <Card style={styles.card}>
        <List.Section>
          <List.Subheader>Preferences</List.Subheader>
          <List.Item title="Reapplication Reminders" description="Enabled" left={() => <List.Icon icon="bell" />} />
          <List.Item title="Order Updates" description="Enabled (Email)" left={() => <List.Icon icon="package" />} />
        </List.Section>
      </Card>

      <Card style={styles.card}>
        <List.Section>
          <List.Subheader>Support</List.Subheader>
          <List.Item title="Contact Support" description="support@renu-biome.com" left={() => <List.Icon icon="help-circle" />} onPress={() => {}} />
        </List.Section>
      </Card>

      <Button mode="outlined" onPress={logout} style={styles.logoutButton} textColor={theme.colors.error}>
        Log Out
      </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 15,
  },
  card: {
    marginBottom: 15,
  },
  logoutButton: {
    marginTop: 8,
    marginBottom: 16,
    borderColor: '#D32F2F',
  },
});
