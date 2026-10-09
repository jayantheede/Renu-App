import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Card, Button, useTheme } from 'react-native-paper';

export const PaymentScreen = () => {
  const theme = useTheme();

  const handlePayNow = () => {
    // Hands off to Shopify Checkout web-view or native SDK
    console.log('Initiating Shopify Checkout for outstanding balance');
  };

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <Card style={styles.card}>
        <Card.Title title="Outstanding Balance" />
        <Card.Content>
          <Text variant="displaySmall" style={{ color: theme.colors.error, marginVertical: 10 }}>
            $450.00
          </Text>
          <Text variant="bodyMedium">Net-30 Invoice #INV-1029</Text>
          <Text variant="bodyMedium">Due Date: Oct 31, 2023</Text>
        </Card.Content>
        <Card.Actions>
          <Button mode="contained" onPress={handlePayNow} style={{ width: '100%' }}>
            Pay Now via Shopify
          </Button>
        </Card.Actions>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Payment History" />
        <Card.Content>
          <Text variant="bodyMedium">Sept 15: $1200.00 (Paid)</Text>
          <Text variant="bodyMedium">Aug 02: $340.00 (Paid)</Text>
        </Card.Content>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
  },
  card: {
    marginBottom: 20,
  },
});
