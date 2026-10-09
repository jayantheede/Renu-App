import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { Text, Card, useTheme, Avatar } from 'react-native-paper';
import { useAuthStore } from '../store/useAuthStore';
import { fetchMessages as fetchMessagesApi } from '../api/client';

export const MessagesScreen = () => {
  const theme = useTheme();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const data = await fetchMessagesApi();
      setMessages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch messages', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const renderItem = ({ item }: { item: any }) => (
    <Card style={styles.card}>
      <Card.Content style={styles.row}>
        <Avatar.Icon size={40} icon="message-text" style={{ backgroundColor: '#E8F5E9', marginRight: 12 }} color="#2E5D36" />
        <View style={styles.textContainer}>
          <View style={styles.headerRow}>
            <Text variant="titleMedium" style={styles.title} numberOfLines={1}>{item.title}</Text>
            <Text variant="bodySmall" style={styles.date}>{item.when}</Text>
          </View>
          <Text variant="bodyMedium" style={styles.subtitle} numberOfLines={2}>{item.sub}</Text>
        </View>
        {item.dot === 'true' && <View style={styles.unreadDot} />}
      </Card.Content>
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text variant="headlineMedium" style={styles.pageTitle}>Messages</Text>
      
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#2E5D36" size="large" />
      ) : messages.length === 0 ? (
        <Text style={styles.emptyText}>No messages found.</Text>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 100 }}
          onRefresh={fetchMessages}
          refreshing={loading}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  pageTitle: { fontWeight: 'bold', color: '#2E5D36', marginBottom: 16, marginTop: 40 },
  card: { marginBottom: 12, backgroundColor: '#FFFFFF', borderRadius: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  textContainer: { flex: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { fontWeight: 'bold', flex: 1, marginRight: 8 },
  date: { color: '#888' },
  subtitle: { color: '#555' },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#2E5D36', marginLeft: 12 },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#666' }
});
