import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, ActivityIndicator, Button } from 'react-native-paper';
import { fetchAdminApprovals, approveRanch, approveTank } from '../../api/client';

export const AdminApprovalsScreen = () => {
  const [data, setData] = useState<{ranches: any[], tanks: any[]}>({ ranches: [], tanks: [] });
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    setLoading(true);
    fetchAdminApprovals()
      .then(res => {
        setData(res);
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAction = async (type: 'ranch' | 'tank', id: string, status: string) => {
    try {
      if (type === 'ranch') await approveRanch(id, status);
      else await approveTank(id, status);
      
      Alert.alert('Success', `${type} ${status}`);
      loadData();
    } catch (error) {
      Alert.alert('Error', `Failed to ${status} ${type}`);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Approvals</Text>
      </View>
      
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.sectionTitle}>Pending Ranches ({data.ranches?.length || 0})</Text>
          {data.ranches?.map(ranch => (
            <View key={ranch.id} style={styles.card}>
              <View>
                <Text style={styles.cardTitle}>{ranch.name}</Text>
                <Text style={styles.cardSubtitle}>{ranch.county} • {ranch.ac} acres</Text>
              </View>
              <View style={styles.actionRow}>
                <Button mode="text" textColor="#B71C1C" onPress={() => handleAction('ranch', ranch.id, 'REJECTED')}>Reject</Button>
                <Button mode="contained" buttonColor="#2E5D36" onPress={() => handleAction('ranch', ranch.id, 'APPROVED')}>Approve</Button>
              </View>
            </View>
          ))}

          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Pending Tank Setups ({data.tanks?.length || 0})</Text>
          {data.tanks?.map(tank => (
            <View key={tank.id} style={styles.card}>
              <View>
                <Text style={styles.cardTitle}>{tank.capacity} Gal at {tank.location}</Text>
                <Text style={styles.cardSubtitle}>Ranch: {tank.ranch?.name || tank.ranchId}</Text>
              </View>
              <View style={styles.actionRow}>
                <Button mode="text" textColor="#B71C1C" onPress={() => handleAction('tank', tank.id, 'REJECTED')}>Reject</Button>
                <Button mode="contained" buttonColor="#2E5D36" onPress={() => handleAction('tank', tank.id, 'APPROVED')}>Approve</Button>
              </View>
            </View>
          ))}
          
          {data.ranches?.length === 0 && data.tanks?.length === 0 && (
            <Text style={{ textAlign: 'center', marginTop: 40, color: '#6B7280' }}>No pending approvals.</Text>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F4' },
  header: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  scrollContent: { padding: 20, paddingBottom: 100 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: '#374151' },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  cardSubtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, gap: 8 }
});
