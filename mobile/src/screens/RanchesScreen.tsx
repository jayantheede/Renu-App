import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  RefreshControl,
} from 'react-native';
import { Text, TextInput, Button, Card, Divider, Chip, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  fetchRanches,
  submitRanch,
  submitBlock,
  submitTankSetup,
  fetchDeliveries,
  deleteTank,
} from '../api/client';
import { useAuthStore } from '../store/useAuthStore';

export const RanchesScreen = () => {
  const user = useAuthStore(state => state.user);
  const isAdmin = user?.role === 'admin';

  const [ranches, setRanches] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Selected Block Detail Modal
  const [selectedBlock, setSelectedBlock] = useState<any>(null);
  const [selectedBlockRanch, setSelectedBlockRanch] = useState<any>(null);
  const [blockModalVisible, setBlockModalVisible] = useState(false);

  // Add Ranch Modal
  const [addRanchModalVisible, setAddRanchModalVisible] = useState(false);
  const [newRanchName, setNewRanchName] = useState('');
  const [newRanchCounty, setNewRanchCounty] = useState('Fresno');
  const [submittingRanch, setSubmittingRanch] = useState(false);

  // Add Block Modal
  const [addBlockModalVisible, setAddBlockModalVisible] = useState(false);
  const [targetRanchForBlock, setTargetRanchForBlock] = useState<any>(null);
  const [blkId, setBlkId] = useState('');
  const [blkCrop, setBlkCrop] = useState('Almond');
  const [blkVariety, setBlkVariety] = useState('Nonpareil');
  const [blkRootstock, setBlkRootstock] = useState('Nemaguard');
  const [blkAcres, setBlkAcres] = useState('');
  const [blkPlantingYear, setBlkPlantingYear] = useState('2020');
  const [blkIrrigation, setBlkIrrigation] = useState('Drip');
  const [blkFertigationSet, setBlkFertigationSet] = useState('Set 1');
  const [blkCounty, setBlkCounty] = useState('Fresno');
  const [blkApns, setBlkApns] = useState('');
  const [submittingBlock, setSubmittingBlock] = useState(false);

  // Add Tank Modal (Plain form, no map!)
  const [addTankModalVisible, setAddTankModalVisible] = useState(false);
  const [targetRanchForTank, setTargetRanchForTank] = useState<any>(null);
  const [tankName, setTankName] = useState('');
  const [tankCapacity, setTankCapacity] = useState('1000');
  const [tankLocation, setTankLocation] = useState('');
  const [submittingTank, setSubmittingTank] = useState(false);

  const loadAll = async () => {
    try {
      const [rData, dData] = await Promise.all([
        fetchRanches().catch(() => []),
        fetchDeliveries().catch(() => []),
      ]);
      if (Array.isArray(rData)) setRanches(rData);
      if (Array.isArray(dData)) setDeliveries(dData);
    } catch (e) {
      console.warn('Ranches load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadAll();
  };

  const handleOpenBlockDetail = (ranch: any, block: any) => {
    setSelectedBlock(block);
    setSelectedBlockRanch(ranch);
    setBlockModalVisible(true);
  };

  const handleCreateRanch = async () => {
    if (!newRanchName.trim()) {
      Alert.alert('Required', 'Please enter a ranch name.');
      return;
    }
    setSubmittingRanch(true);
    try {
      await submitRanch({ name: newRanchName.trim(), county: newRanchCounty.trim() });
      setAddRanchModalVisible(false);
      setNewRanchName('');
      loadAll();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create ranch');
    } finally {
      setSubmittingRanch(false);
    }
  };

  const handleCreateBlock = async () => {
    if (!targetRanchForBlock) return;
    if (!blkId.trim() || !blkAcres.trim()) {
      Alert.alert('Required', 'Please enter Block ID and Acreage.');
      return;
    }
    setSubmittingBlock(true);
    try {
      const apnList = blkApns
        .split(',')
        .map(a => a.trim())
        .filter(Boolean);

      await submitBlock(targetRanchForBlock.id, {
        blockId: blkId.trim(),
        crop: blkCrop.trim(),
        variety: blkVariety.trim(),
        rootstock: blkRootstock.trim(),
        acreage: parseFloat(blkAcres) || 0,
        plantingYear: parseInt(blkPlantingYear, 10) || 2020,
        irrigationType: blkIrrigation.trim(),
        fertigationSet: blkFertigationSet.trim(),
        county: blkCounty.trim() || targetRanchForBlock.county,
        apns: apnList.length > 0 ? apnList : ['045-120-001'],
      });

      setAddBlockModalVisible(false);
      setBlkId('');
      setBlkAcres('');
      setBlkApns('');
      loadAll();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to add block');
    } finally {
      setSubmittingBlock(false);
    }
  };

  const handleCreateTank = async () => {
    if (!targetRanchForTank) return;
    if (!tankName.trim() || !tankCapacity.trim()) {
      Alert.alert('Required', 'Please enter tank name and capacity.');
      return;
    }
    setSubmittingTank(true);
    try {
      await submitTankSetup({
        ranchId: targetRanchForTank.id,
        name: tankName.trim(),
        capacity: parseInt(tankCapacity, 10) || 1000,
        location: tankLocation.trim() || 'Injection Station',
      });
      setAddTankModalVisible(false);
      setTankName('');
      setTankLocation('');
      loadAll();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to add tank');
    } finally {
      setSubmittingTank(false);
    }
  };

  // Find deliveries matching the selected block
  const getDeliveriesForBlock = (blockId: string) => {
    return deliveries.filter(d => {
      if (!d.blockIds || !Array.isArray(d.blockIds)) return false;
      return d.blockIds.includes(blockId);
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2E5D36" />
        }
      >
        {/* Top Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Ranches & Blocks</Text>
            <Text style={styles.subtitle}>
              Planted field inventory & ranch injection tanks
            </Text>
          </View>
          {isAdmin && (
            <TouchableOpacity
              style={styles.addRanchBtn}
              activeOpacity={0.8}
              onPress={() => setAddRanchModalVisible(true)}
            >
              <MaterialCommunityIcons name="plus" size={18} color="#FFFFFF" />
              <Text style={styles.addRanchBtnText}>Add Ranch</Text>
            </TouchableOpacity>
          )}
        </View>

        {loading && !refreshing ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#2E5D36" />
            <Text style={{ marginTop: 12, color: '#64748B' }}>Loading ranches & blocks...</Text>
          </View>
        ) : ranches.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <MaterialCommunityIcons name="sprout" size={48} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No Ranches Configured</Text>
              <Text style={styles.emptyDesc}>
                Contact ReNu-Biome administration to set up your ranch profile and blocks.
              </Text>
            </Card.Content>
          </Card>
        ) : (
          ranches.map((ranch: any) => {
            const blocks = ranch.blocks || [];
            const tanks = ranch.tanks || ranch.tankSetups || [];
            // Ranch acreage is strictly computed from blocks
            const computedAcres = blocks.reduce((s: number, b: any) => s + (Number(b.acreage) || 0), 0);

            return (
              <View key={ranch.id} style={styles.ranchSection}>
                {/* Ranch Card Banner */}
                <View style={styles.ranchBanner}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ranchTitle}>{ranch.name}</Text>
                    <Text style={styles.ranchCountyText}>
                      <MaterialCommunityIcons name="map-marker-outline" size={14} color="#64748B" />{' '}
                      {ranch.county} County
                    </Text>
                  </View>
                  <View style={styles.acreageBadge}>
                    <Text style={styles.acreageNumber}>{computedAcres}</Text>
                    <Text style={styles.acreageUnit}>Acres</Text>
                  </View>
                </View>

                {/* Blocks Table Header */}
                <View style={styles.blocksHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialCommunityIcons name="view-grid-outline" size={18} color="#0F172A" style={{ marginRight: 6 }} />
                    <Text style={styles.blocksSectionTitle}>
                      Blocks ({blocks.length})
                    </Text>
                  </View>
                  {isAdmin && (
                    <TouchableOpacity
                      onPress={() => {
                        setTargetRanchForBlock(ranch);
                        setBlkCounty(ranch.county);
                        setAddBlockModalVisible(true);
                      }}
                      style={styles.addInlineBtn}
                    >
                      <MaterialCommunityIcons name="plus-circle-outline" size={16} color="#2E5D36" />
                      <Text style={styles.addInlineBtnText}>Add Block</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Blocks Table */}
                {blocks.length === 0 ? (
                  <View style={styles.noItemsBox}>
                    <Text style={styles.noItemsText}>No planted blocks added yet.</Text>
                  </View>
                ) : (
                  <View style={styles.tableContainer}>
                    {/* Table Header Row */}
                    <View style={styles.tableHeaderRow}>
                      <Text style={[styles.tableColHeader, { flex: 1.2 }]}>Block ID</Text>
                      <Text style={[styles.tableColHeader, { flex: 2.2 }]}>Crop & Variety</Text>
                      <Text style={[styles.tableColHeader, { flex: 1.2, textAlign: 'right' }]}>Acres</Text>
                      <Text style={[styles.tableColHeader, { flex: 1.2, textAlign: 'right' }]}>Planted</Text>
                    </View>

                    {/* Table Body */}
                    {blocks.map((b: any, idx: number) => {
                      const isLast = idx === blocks.length - 1;
                      return (
                        <TouchableOpacity
                          key={b.id || idx}
                          style={[styles.tableRow, isLast && styles.noBorder]}
                          activeOpacity={0.7}
                          onPress={() => handleOpenBlockDetail(ranch, b)}
                        >
                          <View style={{ flex: 1.2, flexDirection: 'row', alignItems: 'center' }}>
                            <View style={styles.blockIdBadge}>
                              <Text style={styles.blockIdBadgeText}>{b.blockId}</Text>
                            </View>
                          </View>
                          <View style={{ flex: 2.2 }}>
                            <Text style={styles.cropVarietyText} numberOfLines={1}>
                              {b.crop} · {b.variety}
                            </Text>
                            <Text style={styles.rootstockText} numberOfLines={1}>
                              Root: {b.rootstock || 'Std'}
                            </Text>
                          </View>
                          <Text style={[styles.acresText, { flex: 1.2, textAlign: 'right' }]}>
                            {b.acreage} ac
                          </Text>
                          <Text style={[styles.plantedYearText, { flex: 1.2, textAlign: 'right' }]}>
                            {b.plantingYear}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {/* Tank Register Section */}
                <View style={[styles.blocksHeaderRow, { marginTop: 18 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialCommunityIcons name="water-pump" size={18} color="#0F172A" style={{ marginRight: 6 }} />
                    <Text style={styles.blocksSectionTitle}>
                      Tank Register ({tanks.length})
                    </Text>
                  </View>
                  {isAdmin && (
                    <TouchableOpacity
                      onPress={() => {
                        setTargetRanchForTank(ranch);
                        setAddTankModalVisible(true);
                      }}
                      style={styles.addInlineBtn}
                    >
                      <MaterialCommunityIcons name="plus-circle-outline" size={16} color="#2E5D36" />
                      <Text style={styles.addInlineBtnText}>Add Tank</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Tanks List */}
                {tanks.length === 0 ? (
                  <View style={styles.noItemsBox}>
                    <Text style={styles.noItemsText}>No injection tanks registered.</Text>
                  </View>
                ) : (
                  <View style={styles.tanksContainer}>
                    {tanks.map((tank: any, tIdx: number) => (
                      <View key={tank.id || tIdx} style={styles.tankCard}>
                        <View style={styles.tankIconBox}>
                          <MaterialCommunityIcons name="water-pump" size={22} color="#1D4ED8" />
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={styles.tankName}>{tank.name || `Tank #${tIdx + 1}`}</Text>
                          <Text style={styles.tankLocation} numberOfLines={1}>
                            {tank.location || 'Injection Station'}
                          </Text>
                          <View style={styles.tankMetaRow}>
                            <Text style={styles.tankCapacityText}>
                              Capacity: {(tank.capacity || 1000).toLocaleString()} Gal
                            </Text>
                            {tank.level ? (
                              <Text style={styles.tankTelemetryText}>· Level: {tank.level}</Text>
                            ) : null}
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Block Detail & Delivery Timeline Modal */}
      <Modal visible={blockModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedBlock && (
              <>
                <View style={styles.modalHeader}>
                  <View>
                    <View style={styles.modalBadgeRow}>
                      <View style={styles.modalBadge}>
                        <Text style={styles.modalBadgeText}>{selectedBlock.blockId}</Text>
                      </View>
                      <Text style={styles.modalRanchName}>{selectedBlockRanch?.name}</Text>
                    </View>
                    <Text style={styles.modalTitle}>
                      {selectedBlock.crop} · {selectedBlock.variety}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setBlockModalVisible(false)}
                    style={styles.modalCloseBtn}
                  >
                    <MaterialCommunityIcons name="close" size={24} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
                  {/* Block Specifications Grid */}
                  <View style={styles.detailGrid}>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Acreage</Text>
                      <Text style={styles.detailValue}>{selectedBlock.acreage} Acres</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Planting Year</Text>
                      <Text style={styles.detailValue}>{selectedBlock.plantingYear}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Rootstock</Text>
                      <Text style={styles.detailValue}>{selectedBlock.rootstock || 'None'}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Irrigation</Text>
                      <Text style={styles.detailValue}>{selectedBlock.irrigationType || 'Drip'}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Fertigation Set</Text>
                      <Text style={styles.detailValue}>{selectedBlock.fertigationSet || 'Set 1'}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>County</Text>
                      <Text style={styles.detailValue}>{selectedBlock.county || selectedBlockRanch?.county}</Text>
                    </View>
                  </View>

                  {/* APN List */}
                  <View style={styles.apnContainer}>
                    <Text style={styles.apnTitle}>Assessor Parcel Numbers (APNs):</Text>
                    <View style={styles.apnChipsRow}>
                      {(selectedBlock.apns || ['045-120-001']).map((apn: string, i: number) => (
                        <Chip key={i} style={styles.apnChip} textStyle={styles.apnChipText}>
                          {apn}
                        </Chip>
                      ))}
                    </View>
                  </View>

                  <Divider style={{ marginVertical: 16 }} />

                  {/* Timeline of Deliveries for this Block */}
                  <View style={styles.timelineSection}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                      <MaterialCommunityIcons name="timeline-clock-outline" size={20} color="#2E5D36" style={{ marginRight: 6 }} />
                      <Text style={styles.timelineTitle}>Delivery History for this Block</Text>
                    </View>

                    {(() => {
                      const blockDeliveries = getDeliveriesForBlock(selectedBlock.blockId);
                      if (blockDeliveries.length === 0) {
                        return (
                          <Text style={styles.timelineEmptyText}>
                            No past or scheduled deliveries recorded for Block {selectedBlock.blockId}.
                          </Text>
                        );
                      }

                      return blockDeliveries.map((del: any, idx: number) => (
                        <View key={del.id || idx} style={styles.timelineItem}>
                          <View style={styles.timelineDot} />
                          <View style={styles.timelineContent}>
                            <View style={styles.timelineHeader}>
                              <Text style={styles.timelineProduct}>{del.product}</Text>
                              <Text style={styles.timelineDate}>{del.deliveredDate || del.date}</Text>
                            </View>
                            <Text style={styles.timelineGallons}>
                              {del.deliveredGallons || del.gallons} Gallons · Status: {del.status}
                            </Text>
                            {del.notes ? (
                              <Text style={styles.timelineNotes}>"{del.notes}"</Text>
                            ) : null}
                          </View>
                        </View>
                      ));
                    })()}
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Add Ranch Modal */}
      <Modal visible={addRanchModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.formTitle}>Add New Ranch</Text>
            <Text style={styles.formSubtitle}>Ranch acreage will be computed automatically from its blocks.</Text>

            <TextInput
              label="Ranch Name *"
              value={newRanchName}
              onChangeText={setNewRanchName}
              mode="outlined"
              style={styles.input}
              outlineColor="#CBD5E1"
              activeOutlineColor="#2E5D36"
            />
            <TextInput
              label="County *"
              value={newRanchCounty}
              onChangeText={setNewRanchCounty}
              mode="outlined"
              style={styles.input}
              outlineColor="#CBD5E1"
              activeOutlineColor="#2E5D36"
            />

            <View style={styles.modalButtonsRow}>
              <Button
                mode="outlined"
                onPress={() => setAddRanchModalVisible(false)}
                style={styles.cancelBtn}
                textColor="#64748B"
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleCreateRanch}
                loading={submittingRanch}
                style={styles.submitBtn}
                buttonColor="#2E5D36"
              >
                Create Ranch
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Block Modal */}
      <Modal visible={addBlockModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.formTitle}>
              Add Block to {targetRanchForBlock?.name}
            </Text>
            <Text style={styles.formSubtitle}>Enter planted unit details.</Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              <TextInput
                label="Block ID (e.g. N-4, Block 12) *"
                value={blkId}
                onChangeText={setBlkId}
                mode="outlined"
                style={styles.input}
                outlineColor="#CBD5E1"
                activeOutlineColor="#2E5D36"
              />
              <TextInput
                label="Crop (Almond, Pistachio, Grape) *"
                value={blkCrop}
                onChangeText={setBlkCrop}
                mode="outlined"
                style={styles.input}
                outlineColor="#CBD5E1"
                activeOutlineColor="#2E5D36"
              />
              <TextInput
                label="Variety (e.g. Nonpareil, Golden Hills) *"
                value={blkVariety}
                onChangeText={setBlkVariety}
                mode="outlined"
                style={styles.input}
                outlineColor="#CBD5E1"
                activeOutlineColor="#2E5D36"
              />
              <TextInput
                label="Rootstock (e.g. Nemaguard, UCB-1)"
                value={blkRootstock}
                onChangeText={setBlkRootstock}
                mode="outlined"
                style={styles.input}
                outlineColor="#CBD5E1"
                activeOutlineColor="#2E5D36"
              />
              <TextInput
                label="Acreage (e.g. 40) *"
                value={blkAcres}
                onChangeText={setBlkAcres}
                keyboardType="numeric"
                mode="outlined"
                style={styles.input}
                outlineColor="#CBD5E1"
                activeOutlineColor="#2E5D36"
              />
              <TextInput
                label="Planting Year (e.g. 2018)"
                value={blkPlantingYear}
                onChangeText={setBlkPlantingYear}
                keyboardType="numeric"
                mode="outlined"
                style={styles.input}
                outlineColor="#CBD5E1"
                activeOutlineColor="#2E5D36"
              />
              <TextInput
                label="Irrigation Type (Drip, Micro-sprinkler)"
                value={blkIrrigation}
                onChangeText={setBlkIrrigation}
                mode="outlined"
                style={styles.input}
                outlineColor="#CBD5E1"
                activeOutlineColor="#2E5D36"
              />
              <TextInput
                label="Fertigation Set or Valve (e.g. Set 1, Valve 14B)"
                value={blkFertigationSet}
                onChangeText={setBlkFertigationSet}
                mode="outlined"
                style={styles.input}
                outlineColor="#CBD5E1"
                activeOutlineColor="#2E5D36"
              />
              <TextInput
                label="APN(s) (comma-separated, e.g. 045-120-032, 045-120-033)"
                value={blkApns}
                onChangeText={setBlkApns}
                mode="outlined"
                style={styles.input}
                outlineColor="#CBD5E1"
                activeOutlineColor="#2E5D36"
              />
            </ScrollView>

            <View style={styles.modalButtonsRow}>
              <Button
                mode="outlined"
                onPress={() => setAddBlockModalVisible(false)}
                style={styles.cancelBtn}
                textColor="#64748B"
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleCreateBlock}
                loading={submittingBlock}
                style={styles.submitBtn}
                buttonColor="#2E5D36"
              >
                Save Block
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Tank Modal (Plain form, no map!) */}
      <Modal visible={addTankModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.formTitle}>
              Add Tank to {targetRanchForTank?.name}
            </Text>
            <Text style={styles.formSubtitle}>Plain form entry for ranch injection station.</Text>

            <TextInput
              label="Tank Name (e.g. Station Tank #1) *"
              value={tankName}
              onChangeText={setTankName}
              mode="outlined"
              style={styles.input}
              outlineColor="#CBD5E1"
              activeOutlineColor="#2E5D36"
            />
            <TextInput
              label="Capacity in Gallons (e.g. 1000) *"
              value={tankCapacity}
              onChangeText={setTankCapacity}
              keyboardType="numeric"
              mode="outlined"
              style={styles.input}
              outlineColor="#CBD5E1"
              activeOutlineColor="#2E5D36"
            />
            <TextInput
              label="Location Description (e.g. North Well Pump 2)"
              value={tankLocation}
              onChangeText={setTankLocation}
              mode="outlined"
              style={styles.input}
              outlineColor="#CBD5E1"
              activeOutlineColor="#2E5D36"
            />

            <View style={styles.modalButtonsRow}>
              <Button
                mode="outlined"
                onPress={() => setAddTankModalVisible(false)}
                style={styles.cancelBtn}
                textColor="#64748B"
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleCreateTank}
                loading={submittingTank}
                style={styles.submitBtn}
                buttonColor="#2E5D36"
              >
                Save Tank
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 96,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  addRanchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2E5D36',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    minHeight: 48, // 48px tap target
  },
  addRanchBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
    marginLeft: 4,
  },
  ranchSection: {
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ranchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  ranchTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  ranchCountyText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  acreageBadge: {
    backgroundColor: '#E8F5E9',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  acreageNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2E5D36',
  },
  acreageUnit: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2E5D36',
    textTransform: 'uppercase',
  },
  blocksHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  blocksSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  addInlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    minHeight: 48,
  },
  addInlineBtnText: {
    fontSize: 12,
    color: '#2E5D36',
    fontWeight: '700',
    marginLeft: 4,
  },
  tableContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tableColHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    minHeight: 48, // 48px min target
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  blockIdBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  blockIdBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E293B',
  },
  cropVarietyText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  rootstockText: {
    fontSize: 11,
    color: '#64748B',
  },
  acresText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  plantedYearText: {
    fontSize: 12,
    color: '#64748B',
  },
  tanksContainer: {
    gap: 8,
  },
  tankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tankIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tankName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  tankLocation: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  tankMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  tankCapacityText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1D4ED8',
  },
  tankTelemetryText: {
    fontSize: 11,
    color: '#059669',
    marginLeft: 4,
    fontWeight: '600',
  },
  noItemsBox: {
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
  },
  noItemsText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginTop: 10,
  },
  emptyDesc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalBadge: {
    backgroundColor: '#2E5D36',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginRight: 8,
  },
  modalBadgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  modalRanchName: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalCloseBtn: {
    padding: 6,
    minHeight: 48,
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  detailItem: {
    width: '47%',
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  apnContainer: {
    marginTop: 8,
  },
  apnTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  apnChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  apnChip: {
    backgroundColor: '#E2E8F0',
  },
  apnChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1E293B',
  },
  timelineSection: {
    marginTop: 8,
  },
  timelineTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  timelineEmptyText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingLeft: 4,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2E5D36',
    marginTop: 5,
    marginRight: 10,
  },
  timelineContent: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timelineProduct: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  timelineDate: {
    fontSize: 11,
    color: '#64748B',
  },
  timelineGallons: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  timelineNotes: {
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
    marginTop: 2,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  formSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  input: {
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
  },
  cancelBtn: {
    borderColor: '#CBD5E1',
    minHeight: 48,
    justifyContent: 'center',
  },
  submitBtn: {
    borderRadius: 8,
    minHeight: 48,
    justifyContent: 'center',
  },
});
