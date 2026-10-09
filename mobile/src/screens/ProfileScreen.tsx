import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button, useTheme, List, Divider } from 'react-native-paper';
import { useAuthStore } from '../store/useAuthStore';

export const ProfileScreen = () => {
  const theme = useTheme();
  const { session, logout } = useAuthStore();
  const customerName = session?.user?.user_metadata?.full_name || 'Client';
  const email = session?.user?.email || 'N/A';

  return (
    <ScrollView style={[styles.container, { backgroundColor: 'transparent' }]}>
      <View style={styles.header}>
        <Text variant="headlineMedium">{customerName}</Text>
        <Text variant="bodyLarge">Agri Assistant Client</Text>
      </View>

      <Card style={styles.card}>
        <List.Section>
          <List.Subheader>Account Details</List.Subheader>
          <List.Item title="Email" description={email} left={() => <List.Icon icon="email" />} />
          <List.Item title="Phone" description="(555) 123-4567" left={() => <List.Icon icon="phone" />} />
          <List.Item title="Shipping Address" description="123 Farm Road, Agriville, CA 90210" left={() => <List.Icon icon="map-marker" />} />
        </List.Section>
      </Card>

      <Card style={styles.card}>
        <List.Section>
          <List.Subheader>Preferences</List.Subheader>
          <List.Item title="Reapplication Reminders" description="Enabled" left={() => <List.Icon icon="bell" />} />
          <List.Item title="Order Updates" description="Enabled (SMS & Email)" left={() => <List.Icon icon="package" />} />
        </List.Section>
      </Card>

      <Card style={styles.card}>
        <List.Section>
          <List.Subheader>Support</List.Subheader>
          <List.Item title="Contact Support" description="support@ReNu-Biome.com" left={() => <List.Icon icon="help-circle" />} onPress={() => {}} />
        </List.Section>
      </Card>

      <Button mode="outlined" onPress={logout} style={styles.logoutButton} textColor={theme.colors.error}>
        Log Out
      </Button>
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
    marginBottom: 10,
  },
  card: {
    marginHorizontal: 15,
    marginBottom: 15,
  },
  logoutButton: {
    margin: 15,
    marginBottom: 40,
    borderColor: '#D32F2F',
  },
});
