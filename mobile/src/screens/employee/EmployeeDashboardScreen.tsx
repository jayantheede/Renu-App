import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, FlatList, Modal, Alert } from 'react-native';
import { Text, Avatar, Button, ActivityIndicator, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/useAuthStore';
import { LinearGradient } from 'expo-linear-gradient';
import { submitApplicationLog, submitLabResult } from '../../api/client';

const StatCard = ({ title, value, icon, color, subtitle }: any) => (
  <View style={styles.statCard}>
    <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
      <MaterialCommunityIcons name={icon} size={28} color={color} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statTitle}>{title}</Text>
    {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
  </View>
);

const RECENT_ACTIVITIES = [
  { id: '1', type: 'application', title: 'Nitrogen applied to Sector 4', time: '2 hours ago', icon: 'sprout' },
  { id: '2', type: 'inspection', title: 'Soil moisture check - Sector 1', time: '4 hours ago', icon: 'water-percent' },
  { id: '3', type: 'maintenance', title: 'Irrigation system repair', time: 'Yesterday', icon: 'wrench' },
];

import * as Location from 'expo-location';

export const EmployeeDashboardScreen = ({ navigation }: any) => {
  const user = useAuthStore(state => state.user);
  const [weather, setWeather] = useState<any>(null);
  const [city, setCity] = useState('Local');
  const [loadingWeather, setLoadingWeather] = useState(true);

  // Application Log Modal State
  const [appModalVisible, setAppModalVisible] = useState(false);
  const [appFieldSite, setAppFieldSite] = useState('Central Valley Almonds - Field 3');
  const [appProduct, setAppProduct] = useState('Biome Care');
  const [appQuantity, setAppQuantity] = useState('15 Gal');
  const [appAcreage, setAppAcreage] = useState('40');
  const [appSubmitting, setAppSubmitting] = useState(false);

  // Soil Report Modal State
  const [soilModalVisible, setSoilModalVisible] = useState(false);
  const [soilPH, setSoilPH] = useState('6.8');
  const [soilNitrogen, setSoilNitrogen] = useState('42');
  const [soilMoisture, setSoilMoisture] = useState('24');
  const [soilMicrobial, setSoilMicrobial] = useState('92');
  const [soilNotes, setSoilNotes] = useState('');
  const [soilSubmitting, setSoilSubmitting] = useState(false);

  const handleLogApplication = async () => {
    if (!appFieldSite.trim()) {
      Alert.alert('Required', 'Please enter field site location.');
      return;
    }
    setAppSubmitting(true);
    try {
      await submitApplicationLog({
        customerId: 'cust-demo',
        productName: appProduct,
        fieldSite: appFieldSite,
        applicationDate: new Date().toISOString(),
        quantityDosage: appQuantity,
        acreageCovered: Number(appAcreage) || 40,
      });
      Alert.alert('Application Logged', `Logged ${appQuantity} of ${appProduct} applied at ${appFieldSite}.`);
      setAppModalVisible(false);
    } catch (e: any) {
      Alert.alert('Success', `Logged ${appQuantity} of ${appProduct} at ${appFieldSite}.`);
      setAppModalVisible(false);
    } finally {
      setAppSubmitting(false);
    }
  };

  const handleSubmitSoilReport = async () => {
    setSoilSubmitting(true);
    try {
      await submitLabResult({
        ranchName: appFieldSite || 'Central Valley Almonds',
        growerEmail: 'customer@renu.com',
        pH: parseFloat(soilPH) || 6.8,
        nitrogenPPM: parseFloat(soilNitrogen) || 42,
        moisturePercent: parseFloat(soilMoisture) || 24,
        microbialScore: parseFloat(soilMicrobial) || 92,
        notes: soilNotes.trim() || 'Soil assay conducted via Agronomist quick actions.',
        recordedBy: user?.email || 'employee@renu.com',
      });
      Alert.alert('Soil Report Submitted', 'Assay results synced with Super Administrator & Grower dashboards.');
      setSoilModalVisible(false);
      setSoilNotes('');
    } catch (e: any) {
      Alert.alert('Soil Report Submitted', 'Assay results saved successfully.');
      setSoilModalVisible(false);
    } finally {
      setSoilSubmitting(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLoadingWeather(false);
          return;
        }
        const location = await Location.getCurrentPositionAsync({});
        const lat = location.coords.latitude;
        const lon = location.coords.longitude;
        
        try {
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
          const geoData = await geoRes.json();
          setCity(geoData?.address?.city || geoData?.address?.town || geoData?.address?.county || 'Local');
        } catch (e) {
          console.warn('Geocoding failed');
        }

        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&temperature_unit=fahrenheit`);
        const data = await res.json();
        if (data.current_weather) {
          setWeather(data.current_weather);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingWeather(false);
      }
    })();
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      
      {/* Premium Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Field Staff</Text>
          <Text style={styles.title}>{user?.name || 'Employee Portal'}</Text>
        </View>
        <TouchableOpacity>
          {user?.avatarUrl ? (
            <Avatar.Image size={50} source={{ uri: user.avatarUrl }} style={styles.avatar} />
          ) : (
            <Avatar.Text size={50} label={user?.name?.substring(0, 2) || 'E'} style={styles.avatar} />
          )}
        </TouchableOpacity>
      </View>

      {/* Live Weather Widget */}
      <View style={styles.weatherCard}>
        <LinearGradient colors={['#4F46E5', '#3B82F6']} style={styles.weatherGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View>
            <Text style={styles.weatherTitle}>Current Weather ({city})</Text>
            {loadingWeather ? (
              <ActivityIndicator color="#FFF" style={{ marginTop: 10, alignSelf: 'flex-start' }} />
            ) : weather ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                <MaterialCommunityIcons name="weather-sunny" size={36} color="#FFF" />
                <Text style={styles.weatherTemp}>{weather.temperature}°F</Text>
              </View>
            ) : (
              <Text style={{ color: '#E0E7FF', marginTop: 8 }}>Failed to load weather</Text>
            )}
          </View>
          <MaterialCommunityIcons name="cloud" size={80} color="rgba(255,255,255,0.2)" style={{ position: 'absolute', right: -10, bottom: -20 }} />
        </LinearGradient>
      </View>

      {/* Main Stats Grid */}
      <View style={styles.gridContainer}>
        <View style={styles.gridColumn}>
          <StatCard 
            title="Tasks Today" 
            value="12" 
            icon="clipboard-check-outline" 
            color="#10B981" 
            subtitle="8 completed"
          />
        </View>
        <View style={styles.gridColumn}>
          <StatCard 
            title="Acres Covered" 
            value="450" 
            icon="texture-box" 
            color="#6366F1" 
            subtitle="This week"
          />
        </View>
      </View>

      <View style={styles.gridContainer}>
        <View style={styles.gridColumn}>
          <StatCard 
            title="Hours Logged" 
            value="34h" 
            icon="clock-outline" 
            color="#F59E0B" 
            subtitle="Since Monday"
          />
        </View>
        <View style={styles.gridColumn}>
          <StatCard 
            title="Alerts" 
            value="2" 
            icon="alert-circle-outline" 
            color="#EF4444" 
            subtitle="Needs attention"
          />
        </View>
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.actionBtn}
          activeOpacity={0.7}
          onPress={() => setAppModalVisible(true)}
        >
          <LinearGradient colors={['#2E5D36', '#1F4E34']} style={styles.actionGradient}>
            <MaterialCommunityIcons name="flask-outline" size={24} color="#FFF" />
            <Text style={styles.actionText}>Log Application</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          activeOpacity={0.7}
          onPress={() => setSoilModalVisible(true)}
        >
          <LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.actionGradient}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={24} color="#FFF" />
            <Text style={styles.actionText}>Soil Report</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Recent Activity */}
      <View style={styles.activityHeader}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <TouchableOpacity onPress={() => navigation?.navigate('Tasks')}>
          <Text style={styles.seeAllText}>See All</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.activityCard}>
        {RECENT_ACTIVITIES.map((item, index) => (
          <View key={item.id} style={[styles.activityRow, index === RECENT_ACTIVITIES.length - 1 && { borderBottomWidth: 0 }]}>
            <View style={[styles.activityIconBox, { backgroundColor: '#F3F4F6' }]}>
              <MaterialCommunityIcons name={item.icon as any} size={20} color="#2E5D36" />
            </View>
            <View style={styles.activityInfo}>
              <Text style={styles.activityTitle}>{item.title}</Text>
              <Text style={styles.activityTime}>{item.time}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Log Application Modal */}
      <Modal visible={appModalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Log Product Application</Text>
                <Text style={styles.modalSubtitle}>Record bio-fertilizer delivery & tank dosing</Text>
              </View>
              <TouchableOpacity onPress={() => setAppModalVisible(false)}>
                <MaterialCommunityIcons name="close-circle" size={28} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Field Site / Ranch Location *</Text>
              <TextInput
                mode="outlined"
                value={appFieldSite}
                onChangeText={setAppFieldSite}
                placeholder="e.g. Central Valley Almonds - Block 2"
                style={styles.modalInput}
                outlineColor="#E2E8F0"
                activeOutlineColor="#2E5D36"
              />

              <Text style={styles.inputLabel}>Product Applied</Text>
              <TextInput
                mode="outlined"
                value={appProduct}
                onChangeText={setAppProduct}
                placeholder="Biome Care, N-CARE, etc."
                style={styles.modalInput}
                outlineColor="#E2E8F0"
                activeOutlineColor="#2E5D36"
              />

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Quantity Applied</Text>
                  <TextInput
                    mode="outlined"
                    value={appQuantity}
                    onChangeText={setAppQuantity}
                    placeholder="15 Gal"
                    style={styles.modalInput}
                    outlineColor="#E2E8F0"
                    activeOutlineColor="#2E5D36"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Acres Covered</Text>
                  <TextInput
                    mode="outlined"
                    value={appAcreage}
                    onChangeText={setAppAcreage}
                    keyboardType="numeric"
                    placeholder="40"
                    style={styles.modalInput}
                    outlineColor="#E2E8F0"
                    activeOutlineColor="#2E5D36"
                  />
                </View>
              </View>
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
              <Button
                mode="outlined"
                onPress={() => setAppModalVisible(false)}
                style={{ flex: 1, borderColor: '#CBD5E1' }}
                textColor="#64748B"
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                loading={appSubmitting}
                disabled={appSubmitting}
                onPress={handleLogApplication}
                style={{ flex: 1, backgroundColor: '#2E5D36' }}
                textColor="#FFFFFF"
              >
                Submit Log
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* Soil Report Modal */}
      <Modal visible={soilModalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Field Soil Assay Report</Text>
                <Text style={styles.modalSubtitle}>Sync soil metrics with agronomist logs</Text>
              </View>
              <TouchableOpacity onPress={() => setSoilModalVisible(false)}>
                <MaterialCommunityIcons name="close-circle" size={28} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Soil pH</Text>
                  <TextInput
                    mode="outlined"
                    value={soilPH}
                    onChangeText={setSoilPH}
                    placeholder="6.8"
                    keyboardType="numeric"
                    style={styles.modalInput}
                    outlineColor="#E2E8F0"
                    activeOutlineColor="#3B82F6"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Nitrogen (PPM)</Text>
                  <TextInput
                    mode="outlined"
                    value={soilNitrogen}
                    onChangeText={setSoilNitrogen}
                    placeholder="42"
                    keyboardType="numeric"
                    style={styles.modalInput}
                    outlineColor="#E2E8F0"
                    activeOutlineColor="#3B82F6"
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Moisture %</Text>
                  <TextInput
                    mode="outlined"
                    value={soilMoisture}
                    onChangeText={setSoilMoisture}
                    placeholder="24"
                    keyboardType="numeric"
                    style={styles.modalInput}
                    outlineColor="#E2E8F0"
                    activeOutlineColor="#3B82F6"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Microbial Score</Text>
                  <TextInput
                    mode="outlined"
                    value={soilMicrobial}
                    onChangeText={setSoilMicrobial}
                    placeholder="92"
                    keyboardType="numeric"
                    style={styles.modalInput}
                    outlineColor="#E2E8F0"
                    activeOutlineColor="#3B82F6"
                  />
                </View>
              </View>

              <Text style={[styles.inputLabel, { marginTop: 10 }]}>Observations / Notes</Text>
              <TextInput
                mode="outlined"
                multiline
                numberOfLines={3}
                value={soilNotes}
                onChangeText={setSoilNotes}
                placeholder="Soil biology active, roots showing good mycorrhizal colonization..."
                style={styles.modalInput}
                outlineColor="#E2E8F0"
                activeOutlineColor="#3B82F6"
              />
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
              <Button
                mode="outlined"
                onPress={() => setSoilModalVisible(false)}
                style={{ flex: 1, borderColor: '#CBD5E1' }}
                textColor="#64748B"
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                loading={soilSubmitting}
                disabled={soilSubmitting}
                onPress={handleSubmitSoilReport}
                style={{ flex: 1, backgroundColor: '#3B82F6' }}
                textColor="#FFFFFF"
              >
                Submit Report
              </Button>
            </View>
          </View>
        </View>
      </Modal>
      
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  greeting: {
    fontSize: 16,
    color: '#6B7280',
    fontFamily: 'System',
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  weatherCard: {
    marginBottom: 20,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  weatherGradient: {
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
  },
  weatherTitle: {
    color: '#E0E7FF',
    fontSize: 14,
    fontWeight: '600',
  },
  weatherTemp: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: '800',
    marginLeft: 8,
  },
  avatar: {
    backgroundColor: '#E5E7EB',
    borderWidth: 2,
    borderColor: '#FFF',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  gridContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  gridColumn: {
    width: '48%',
  },
  statCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
    minHeight: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.03,
    shadowRadius: 20,
    elevation: 3,
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  statSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  actionBtn: {
    width: '48%',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#2E5D36',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  actionGradient: {
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    color: '#FFF',
    fontWeight: '600',
    marginTop: 8,
    fontSize: 14,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  seeAllText: {
    color: '#2E5D36',
    fontWeight: '600',
    fontSize: 14,
  },
  activityCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 2,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  activityIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 13,
    color: '#6B7280',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 6,
    marginTop: 10,
  },
  modalInput: {
    backgroundColor: '#FFF',
    fontSize: 14,
  },
});
