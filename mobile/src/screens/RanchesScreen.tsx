import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Modal,
  Alert,
  Image,
  Share,
  Platform,
  Switch
} from 'react-native';
import { Text, TextInput, Button, Chip, Card, Divider, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { fetchRanches as fetchRanchesApi, submitRanch, submitTankSetup, toggleRanchVisibility, exportData, importData } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';

const SCREEN_WIDTH = Dimensions.get('window').width;

const DEFAULT_RANCH_IMAGES = [
  'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1592417817098-8f3d6910985c?w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=800&auto=format&fit=crop'
];

export const RanchesScreen = () => {
  const user = useAuthStore(state => state.user);
  const isEmployeeOrAdmin = user?.role === 'employee' || user?.role === 'admin';

  const [ranches, setRanches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedRanch, setSelectedRanch] = useState<any>(null);

  // Add Ranch Modal State
  const [addRanchModalVisible, setAddRanchModalVisible] = useState(false);
  const [newRanchName, setNewRanchName] = useState('');
  const [newRanchCounty, setNewRanchCounty] = useState('');
  const [newRanchAc, setNewRanchAc] = useState('');
  const [newRanchImage, setNewRanchImage] = useState(DEFAULT_RANCH_IMAGES[0]);
  const [submittingRanch, setSubmittingRanch] = useState(false);

  // Add Tank Modal State
  const [addTankModalVisible, setAddTankModalVisible] = useState(false);
  const [tankCapacity, setTankCapacity] = useState('1000');
  const [tankLocationName, setTankLocationName] = useState('North Station');
  const [pendingPinCoords, setPendingPinCoords] = useState<{ x: number; y: number } | null>(null);

  // Selected Pin Telemetry Drawer State
  const [selectedPinTank, setSelectedPinTank] = useState<any>(null);

  // Import Modal State
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');

  const loadRanches = async () => {
    setLoading(true);
    try {
      const data = await fetchRanchesApi();
      if (Array.isArray(data)) {
        setRanches(data);
        if (selectedRanch) {
          const updated = data.find((r: any) => r.id === selectedRanch.id);
          if (updated) setSelectedRanch(updated);
        }
      }
    } catch (e) {
      console.error('Failed to load ranches:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRanches();
  }, []);

  const handlePickRanchImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Camera roll permissions are required to upload ranch images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const isPng = asset.mimeType?.includes('png') || asset.uri?.toLowerCase().endsWith('.png');
        const mime = isPng ? 'image/png' : 'image/jpeg';
        if (asset.base64) {
          setNewRanchImage(`data:${mime};base64,${asset.base64}`);
        } else {
          setNewRanchImage(asset.uri);
        }
      }
    } catch (e: any) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleCreateRanch = async () => {
    if (!newRanchName.trim() || !newRanchAc.trim()) {
      Alert.alert('Required Fields', 'Please enter Ranch Name and Acreage');
      return;
    }

    setSubmittingRanch(true);
    try {
      const res = await submitRanch({
        name: newRanchName.trim(),
        county: newRanchCounty.trim() || 'Fresno',
        ac: parseFloat(newRanchAc) || 100,
        imageUrl: newRanchImage
      });

      Alert.alert('Success', 'Ranch created with aerial mapping enabled!');
      setAddRanchModalVisible(false);
      setNewRanchName('');
      setNewRanchCounty('');
      setNewRanchAc('');
      await loadRanches();

      if (res) {
        setSelectedRanch(res);
        setViewMode('map');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create ranch');
    } finally {
      setSubmittingRanch(false);
    }
  };

  const handleToggleHide = async (ranch: any) => {
    const nextHidden = !ranch.hidden;
    try {
      await toggleRanchVisibility(ranch.id, nextHidden);
      setRanches(ranches.map(r => r.id === ranch.id ? { ...r, hidden: nextHidden } : r));
      Alert.alert(
        nextHidden ? 'Ranch Hidden' : 'Ranch Visible',
        `"${ranch.name}" is now ${nextHidden ? 'hidden from operational field view' : 'visible in operations'}.`
      );
    } catch (e: any) {
      Alert.alert('Error', 'Failed to update visibility toggle');
    }
  };

  const handleMapPress = (evt: any) => {
    const { locationX, locationY } = evt.nativeEvent;
    // Map container height is 260
    const xPct = Math.round((locationX / (SCREEN_WIDTH - 40)) * 100);
    const yPct = Math.round((locationY / 260) * 100);
    setPendingPinCoords({ x: Math.max(5, Math.min(95, xPct)), y: Math.max(5, Math.min(95, yPct)) });
    setAddTankModalVisible(true);
  };

  const handleAddTankPin = async () => {
    if (!selectedRanch) return;
    try {
      await submitTankSetup({
        ranchId: selectedRanch.id,
        capacity: parseInt(tankCapacity) || 1000,
        location: tankLocationName.trim() || 'Field Station',
        pinX: pendingPinCoords?.x || 50,
        pinY: pendingPinCoords?.y || 50
      });

      Alert.alert('Tank Pinned', `Tank setup mapped at coordinates (${pendingPinCoords?.x}%, ${pendingPinCoords?.y}%)`);
      setAddTankModalVisible(false);
      setPendingPinCoords(null);
      await loadRanches();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save tank pin');
    }
  };

  const handleExportRanches = async () => {
    try {
      const res = await exportData('ranches');
      const jsonStr = JSON.stringify(res.data, null, 2);
      if (Platform.OS === 'web') {
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `renu_ranches_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        await Share.share({ title: 'Export Ranches', message: jsonStr });
      }
    } catch (e: any) {
      Alert.alert('Export Failed', e.message || 'Could not export ranches');
    }
  };

  const handleImportRanches = async () => {
    try {
      const parsed = JSON.parse(importJsonText);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      await importData('ranches', items);
      Alert.alert('Success', `Imported ${items.length} ranches successfully`);
      setImportModalVisible(false);
      setImportJsonText('');
      loadRanches();
    } catch (e: any) {
      Alert.alert('Invalid Format', 'Please enter a valid JSON array of ranch objects.');
    }
  };

  // ---------------------------------
  // Interactive Map View
  // ---------------------------------
  if (viewMode === 'map' && selectedRanch) {
    const ranchImage = selectedRanch.imageUrl || DEFAULT_RANCH_IMAGES[0];
    const tanks = selectedRanch.tankSetups || [
      { id: 't1', capacity: 1000, location: 'North Injection Valve', pinX: 30, pinY: 40, level: '82%', pressure: '45 PSI' },
      { id: 't2', capacity: 500, location: 'South Field Tank 2', pinX: 70, pinY: 65, level: '64%', pressure: '38 PSI' }
    ];

    return (
      <View style={styles.container}>
        <View style={styles.mapHeader}>
          <TouchableOpacity onPress={() => setViewMode('list')} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#0F172A" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.mapTitle}>{selectedRanch.name}</Text>
            <Text style={styles.mapSubTitle}>{selectedRanch.county} County • {selectedRanch.ac} Acres</Text>
          </View>
          <Button
            mode="contained"
            icon="plus"
            buttonColor="#2E5D36"
            onPress={() => {
              setPendingPinCoords({ x: 50, y: 50 });
              setAddTankModalVisible(true);
            }}
            style={{ borderRadius: 8 }}
          >
            Add Tank
          </Button>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
          {/* Interactive Ranch Canvas Container */}
          <Text style={styles.canvasInstruction}>
            Tap anywhere on the aerial photo to drop or relocate tank injection pins:
          </Text>

          <TouchableOpacity
            activeOpacity={0.95}
            onPress={handleMapPress}
            style={styles.canvasWrapper}
          >
            <Image source={{ uri: ranchImage }} style={styles.canvasImage} resizeMode="cover" />

            {/* Render Mapped Tank Pins */}
            {tanks.map((tank: any, index: number) => {
              const posX = `${tank.pinX || (30 + index * 35)}%` as any;
              const posY = `${tank.pinY || (40 + index * 25)}%` as any;
              const isSelected = selectedPinTank?.id === tank.id;

              return (
                <TouchableOpacity
                  key={tank.id || index}
                  onPress={() => setSelectedPinTank(tank)}
                  style={[
                    styles.pinMarker,
                    { left: posX, top: posY },
                    isSelected && styles.pinMarkerActive
                  ]}
                >
                  <MaterialCommunityIcons name="water-pump" size={20} color="#FFFFFF" />
                  <View style={styles.pinCallout}>
                    <Text style={styles.pinCalloutText}>{tank.location || `Tank ${index + 1}`}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </TouchableOpacity>

          {/* Selected Pin Telemetry Card */}
          {selectedPinTank && (
            <Card style={styles.telemetryCard}>
              <Card.Content>
                <View style={styles.row}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialCommunityIcons name="gauge" size={24} color="#2E5D36" style={{ marginRight: 8 }} />
                    <View>
                      <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#0F172A' }}>
                        {selectedPinTank.location || 'Station Telemetry'}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#64748B' }}>
                        Mapped at ({selectedPinTank.pinX || 30}%, {selectedPinTank.pinY || 40}%)
                      </Text>
                    </View>
                  </View>
                  <Chip style={{ backgroundColor: '#DCFCE7' }} textStyle={{ color: '#15803D', fontWeight: 'bold' }}>
                    ONLINE
                  </Chip>
                </View>

                <Divider style={{ marginVertical: 12 }} />

                <View style={styles.telemetryGrid}>
                  <View style={styles.telemetryItem}>
                    <Text style={styles.tLabel}>Capacity</Text>
                    <Text style={styles.tVal}>{selectedPinTank.capacity} Gal</Text>
                  </View>
                  <View style={styles.telemetryItem}>
                    <Text style={styles.tLabel}>Fill Level</Text>
                    <Text style={[styles.tVal, { color: '#15803D' }]}>{selectedPinTank.level || '78%'}</Text>
                  </View>
                  <View style={styles.telemetryItem}>
                    <Text style={styles.tLabel}>Line Pressure</Text>
                    <Text style={styles.tVal}>{selectedPinTank.pressure || '42 PSI'}</Text>
                  </View>
                  <View style={styles.telemetryItem}>
                    <Text style={styles.tLabel}>Nutrient Active</Text>
                    <Text style={styles.tVal}>Biome Care</Text>
                  </View>
                </View>
              </Card.Content>
            </Card>
          )}

          {/* List of mapped tanks */}
          <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 12 }]}>
            Mapped Tank Assets ({tanks.length})
          </Text>
          {tanks.map((t: any, idx: number) => (
            <View key={t.id || idx} style={styles.tankListItem}>
              <MaterialCommunityIcons name="propane-tank" size={24} color="#2E5D36" style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: '#0F172A' }}>{t.location || `Tank Station ${idx + 1}`}</Text>
                <Text style={{ color: '#64748B', fontSize: 13 }}>{t.capacity} Gal capacity • Auto-telemetry synced</Text>
              </View>
              <Button
                mode="text"
                textColor="#2E5D36"
                onPress={() => setSelectedPinTank(t)}
              >
                Inspect
              </Button>
            </View>
          ))}
        </ScrollView>

        {/* Add Tank Pin Modal */}
        <Modal visible={addTankModalVisible} animationType="slide" transparent>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Map Tank Injection Station</Text>
                <TouchableOpacity onPress={() => setAddTankModalVisible(false)}>
                  <MaterialCommunityIcons name="close-circle" size={28} color="#64748B" />
                </TouchableOpacity>
              </View>
              <TextInput
                label="Station Name / Location"
                value={tankLocationName}
                onChangeText={setTankLocationName}
                mode="outlined"
                style={styles.input}
                outlineColor="#CBD5E1"
                activeOutlineColor="#2E5D36"
              />
              <TextInput
                label="Capacity (Gallons)"
                value={tankCapacity}
                onChangeText={setTankCapacity}
                keyboardType="numeric"
                mode="outlined"
                style={styles.input}
                outlineColor="#CBD5E1"
                activeOutlineColor="#2E5D36"
              />
              <Text style={{ color: '#64748B', fontSize: 12, marginBottom: 16 }}>
                Pin Location: X: {pendingPinCoords?.x}%, Y: {pendingPinCoords?.y}%
              </Text>
              <Button
                mode="contained"
                buttonColor="#2E5D36"
                onPress={handleAddTankPin}
                style={{ borderRadius: 10, paddingVertical: 4 }}
              >
                Save Tank to Map
              </Button>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // ---------------------------------
  // Ranches List View
  // ---------------------------------
  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Screen Header */}
        <View style={styles.header}>
          <View>
            <Text variant="headlineMedium" style={styles.title}>Ranches & Fields</Text>
            <Text variant="bodyMedium" style={styles.subtitle}>Aerial mapping, field boundaries & tank setups</Text>
          </View>
          <View style={styles.topActionsRow}>
            <Button
              mode="contained"
              icon="plus"
              onPress={() => setAddRanchModalVisible(true)}
              buttonColor="#2E5D36"
              style={styles.topBtn}
            >
              Add Ranch
            </Button>
            <Button
              mode="outlined"
              icon="download"
              onPress={handleExportRanches}
              textColor="#2E5D36"
              style={[styles.topBtn, { borderColor: '#2E5D36' }]}
            >
              Export
            </Button>
            <Button
              mode="outlined"
              icon="upload"
              onPress={() => {
                setImportJsonText(JSON.stringify([{
                  id: `ranch-${Date.now()}`,
                  name: 'Green Orchard 4',
                  county: 'Fresno',
                  ac: 160,
                  approvalStatus: 'APPROVED'
                }], null, 2));
                setImportModalVisible(true);
              }}
              textColor="#2E5D36"
              style={[styles.topBtn, { borderColor: '#2E5D36' }]}
            >
              Import
            </Button>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color="#2E5D36" size="large" style={{ marginTop: 40 }} />
        ) : ranches.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="sprout" size={60} color="#94A3B8" />
            <Text style={styles.emptyText}>No ranches registered yet.</Text>
            <Button
              mode="contained"
              buttonColor="#2E5D36"
              onPress={() => setAddRanchModalVisible(true)}
              style={{ marginTop: 16, borderRadius: 10 }}
            >
              Add First Ranch
            </Button>
          </View>
        ) : (
          ranches.map((ranch) => {
            const isApproved = ranch.approvalStatus === 'APPROVED';
            const isHidden = Boolean(ranch.hidden);
            const imageUri = ranch.imageUrl || DEFAULT_RANCH_IMAGES[0];

            return (
              <Card key={ranch.id} style={[styles.card, isHidden && styles.cardHidden]}>
                <Image source={{ uri: imageUri }} style={styles.cardCover} resizeMode="cover" />
                <Card.Content style={{ paddingTop: 14 }}>
                  <View style={styles.row}>
                    <Text variant="titleMedium" style={{ fontWeight: 'bold', color: '#0F172A', fontSize: 18 }}>
                      {ranch.name}
                    </Text>
                    <Chip
                      compact
                      style={{ backgroundColor: isApproved ? '#DCFCE7' : '#FEF3C7' }}
                      textStyle={{ color: isApproved ? '#15803D' : '#D97706', fontWeight: 'bold' }}
                    >
                      {ranch.approvalStatus || 'PENDING'}
                    </Chip>
                  </View>

                  <Text variant="bodyMedium" style={{ color: '#64748B', marginTop: 4 }}>
                    {ranch.county} County • {ranch.ac} Acres • {ranch.entity?.name || 'Registered Farm'}
                  </Text>

                  {/* Employee Hide Ranch Toggle */}
                  {isEmployeeOrAdmin && (
                    <View style={styles.toggleRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <MaterialCommunityIcons
                          name={isHidden ? 'eye-off' : 'eye'}
                          size={18}
                          color={isHidden ? '#EF4444' : '#2E5D36'}
                          style={{ marginRight: 6 }}
                        />
                        <Text style={{ fontSize: 13, fontWeight: '600', color: isHidden ? '#EF4444' : '#334155' }}>
                          {isHidden ? 'Hidden from Ops View' : 'Visible in Field Ops'}
                        </Text>
                      </View>
                      <Switch
                        value={!isHidden}
                        onValueChange={() => handleToggleHide(ranch)}
                        trackColor={{ false: '#CBD5E1', true: '#86EFAC' }}
                        thumbColor={!isHidden ? '#2E5D36' : '#94A3B8'}
                      />
                    </View>
                  )}

                  <Divider style={{ marginVertical: 12 }} />

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Button
                      mode="contained"
                      buttonColor="#2E5D36"
                      icon="map-marker-radius"
                      onPress={() => {
                        setSelectedRanch(ranch);
                        setViewMode('map');
                      }}
                      style={{ flex: 1, borderRadius: 8 }}
                    >
                      Interactive Map
                    </Button>
                    <Button
                      mode="outlined"
                      icon="plus-circle"
                      onPress={() => {
                        setSelectedRanch(ranch);
                        setPendingPinCoords({ x: 50, y: 50 });
                        setAddTankModalVisible(true);
                      }}
                      textColor="#2E5D36"
                      style={{ flex: 1, borderRadius: 8, borderColor: '#2E5D36' }}
                    >
                      Add Tank
                    </Button>
                  </View>
                </Card.Content>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* Add Ranch Modal (with Image Upload & Interactive Canvas Trigger) */}
      <Modal visible={addRanchModalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Ranch</Text>
              <TouchableOpacity onPress={() => setAddRanchModalVisible(false)}>
                <MaterialCommunityIcons name="close-circle" size={28} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <TextInput
                label="Ranch / Farm Name"
                value={newRanchName}
                onChangeText={setNewRanchName}
                mode="outlined"
                style={styles.input}
                outlineColor="#CBD5E1"
                activeOutlineColor="#2E5D36"
              />
              <TextInput
                label="County / Region"
                value={newRanchCounty}
                onChangeText={setNewRanchCounty}
                placeholder="e.g. Fresno, Kern, Madera"
                mode="outlined"
                style={styles.input}
                outlineColor="#CBD5E1"
                activeOutlineColor="#2E5D36"
              />
              <TextInput
                label="Total Acreage (Acres)"
                value={newRanchAc}
                onChangeText={setNewRanchAc}
                keyboardType="numeric"
                mode="outlined"
                style={styles.input}
                outlineColor="#CBD5E1"
                activeOutlineColor="#2E5D36"
              />

              {/* Ranch Photo Upload (PNG / JPG) */}
              <Text style={{ fontWeight: '700', color: '#0F172A', marginTop: 10, marginBottom: 8 }}>
                Ranch Photo / Aerial Map (PNG / JPG)
              </Text>

              <TouchableOpacity onPress={handlePickRanchImage} style={styles.imagePickerBox}>
                <Image source={{ uri: newRanchImage }} style={styles.imagePreview} />
                <View style={styles.imagePickerOverlay}>
                  <MaterialCommunityIcons name="camera-plus" size={28} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontWeight: 'bold', marginTop: 4 }}>
                    Choose Photo (PNG / JPG)
                  </Text>
                </View>
              </TouchableOpacity>

              <Button
                mode="contained"
                buttonColor="#2E5D36"
                loading={submittingRanch}
                disabled={submittingRanch}
                onPress={handleCreateRanch}
                style={{ marginTop: 20, borderRadius: 10, paddingVertical: 4 }}
              >
                Create Ranch & Enable Map
              </Button>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* JSON Import Modal */}
      <Modal visible={importModalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Import Ranches</Text>
              <TouchableOpacity onPress={() => setImportModalVisible(false)}>
                <MaterialCommunityIcons name="close-circle" size={28} color="#64748B" />
              </TouchableOpacity>
            </View>
            <TextInput
              mode="outlined"
              multiline
              numberOfLines={8}
              value={importJsonText}
              onChangeText={setImportJsonText}
              style={{ backgroundColor: '#F8FAFC', fontSize: 12, marginBottom: 16 }}
              outlineColor="#CBD5E1"
              activeOutlineColor="#2E5D36"
            />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Button mode="outlined" onPress={() => setImportModalVisible(false)} style={{ flex: 1 }} textColor="#64748B">
                Cancel
              </Button>
              <Button mode="contained" onPress={handleImportRanches} style={{ flex: 1, backgroundColor: '#2E5D36' }}>
                Import
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingBottom: 120,
    paddingHorizontal: 20,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
  },
  title: {
    color: '#0F172A',
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#64748B',
    marginTop: 2,
    fontSize: 14,
  },
  topActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  topBtn: {
    borderRadius: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 80,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 16,
    marginTop: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHidden: {
    opacity: 0.65,
    borderColor: '#FCA5A5',
  },
  cardCover: {
    height: 140,
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    padding: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  mapSubTitle: {
    fontSize: 12,
    color: '#64748B',
  },
  canvasInstruction: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 16,
    marginBottom: 10,
  },
  canvasWrapper: {
    height: 260,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0F172A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  canvasImage: {
    width: '100%',
    height: '100%',
  },
  pinMarker: {
    position: 'absolute',
    transform: [{ translateX: -16 }, { translateY: -16 }],
    backgroundColor: '#2E5D36',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  pinMarkerActive: {
    backgroundColor: '#10B981',
    transform: [{ translateX: -18 }, { translateY: -18 }],
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
  },
  pinCallout: {
    position: 'absolute',
    top: 34,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pinCalloutText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  telemetryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  telemetryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  telemetryItem: {
    alignItems: 'center',
  },
  tLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 4,
  },
  tVal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  tankListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
  input: {
    backgroundColor: '#FFF',
    marginBottom: 14,
  },
  imagePickerBox: {
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F1F5F9',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imagePickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
