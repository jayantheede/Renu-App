import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, FlatList, Dimensions, Modal, TextInput, ActivityIndicator as RNActivityIndicator } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const SCREEN_WIDTH = Dimensions.get('window').width;

const MOCK_BLOCKS = [
  { id: 'N-1', crop: 'Almond, Nonpareil / Monterey', ac: 142, planted: 2012, irrigation: 'Drip, set 3', apn: '054-121-002', coalition: 'East San Joaquin WQC', yield: '2,480 lb/ac', status: 'normal' },
  { id: 'N-2', crop: 'Almond, Nonpareil / Monterey', ac: 138, planted: 2012, irrigation: 'Drip, set 4', apn: '054-121-003', coalition: 'East San Joaquin WQC', yield: '2,300 lb/ac', status: 'normal' },
  { id: 'N-3', crop: 'Almond, Independence', ac: 96, planted: 2019, irrigation: 'Drip, set 5', apn: '054-121-004', coalition: 'East San Joaquin WQC', yield: '2,100 lb/ac', status: 'normal' },
  { id: 'N-4', crop: 'Almond, Nonpareil / Aldrich', ac: 160, planted: 2008, irrigation: 'Drip, set 7', apn: '054-121-005', coalition: 'East San Joaquin WQC', yield: '2,800 lb/ac', status: 'warning' },
  { id: 'S-1', crop: 'Almond, Butte / Padre', ac: 210, planted: 2005, irrigation: 'Valve 7, set 7', apn: '054-121-006', coalition: 'East San Joaquin WQC', yield: '1,900 lb/ac', status: 'normal' },
];

export const RanchesScreen = () => {
  const [viewMode, setViewMode] = useState<'list' | 'blocks' | 'blockDetail'>('list');
  const [selectedRanch, setSelectedRanch] = useState<any>(null);
  const [selectedBlock, setSelectedBlock] = useState<any>(null);

  const [isImporting, setIsImporting] = useState(false);
  const [addRanchModalVisible, setAddRanchModalVisible] = useState(false);
  const [newRanchName, setNewRanchName] = useState('');
  const [newRanchAc, setNewRanchAc] = useState('');
  const [newRanchDesc, setNewRanchDesc] = useState('');
  
  const [ranchesList, setRanchesList] = useState([
    { name: 'Home Ranch', desc: 'Madera County, 5 blocks, Sierra Orchards LLC', ac: '1,180 ac', status: 'APPROVED' },
    { name: 'North Ranch', desc: 'Fresno County, 2 blocks, Sierra Orchards LLC', ac: '1,120 ac', status: 'APPROVED' },
    { name: 'West Ranch', desc: 'Kern County, 3 blocks, SO Farming Partners', ac: '1,400 ac', status: 'APPROVED' },
    { name: 'Rio Vista', desc: 'Madera County, 2 blocks, Rio Vista Vineyards', ac: '420 ac', status: 'APPROVED' }
  ]);

  const [blocksList, setBlocksList] = useState(MOCK_BLOCKS);

  const handleImport = () => {
    setIsImporting(true);
    setTimeout(() => {
      setIsImporting(false);
      setBlocksList([...blocksList, { id: 'E-1', crop: 'Almond, New Import', ac: 85, planted: 2024, irrigation: 'Drip, set 1', apn: '054-999-001', coalition: 'East San Joaquin WQC', yield: 'Pending', status: 'normal' }]);
    }, 2000);
  };

  const handleAddRanch = () => {
    if (newRanchName && newRanchAc) {
       setRanchesList([{ name: newRanchName, desc: newRanchDesc || 'Pending Admin Approval', ac: `${newRanchAc} ac`, status: 'PENDING' }, ...ranchesList]);
       setAddRanchModalVisible(false);
       setNewRanchName(''); setNewRanchAc(''); setNewRanchDesc('');
    }
  };

  const renderHeader = () => {
    if (viewMode === 'list') {
      return (
        <LinearGradient colors={['#1F4D36', '#2A6B45']} style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerTitle}>Ranches</Text>
              <Text style={styles.headerSubtitle}>Sierra Orchards, all entities</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity style={styles.addRanchIcon} onPress={() => setAddRanchModalVisible(true)}>
                <MaterialCommunityIcons name="plus" size={24} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.entityDropdown}>
                <Text style={styles.entityText}>All</Text>
                <MaterialCommunityIcons name="chevron-down" size={16} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      );
    }

    const title = viewMode === 'blocks' ? 'Blocks' : `Block ${selectedBlock?.id}`;
    const subtitle = viewMode === 'blocks' ? selectedRanch?.name : `${selectedRanch?.name}, Almond`;

    return (
      <LinearGradient colors={['#1F4D36', '#2A6B45']} style={styles.headerSmall}>
        <View style={styles.headerContentSmall}>
          <TouchableOpacity onPress={() => setViewMode(viewMode === 'blockDetail' ? 'blocks' : 'list')} style={styles.backButton}>
            <MaterialCommunityIcons name="chevron-left" size={28} color="#FFF" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitleSmall}>{title}</Text>
            <Text style={styles.headerSubtitle}>{subtitle}</Text>
          </View>
        </View>
      </LinearGradient>
    );
  };

  const renderBlockMap = () => (
    <View style={styles.mapContainer}>
      <View style={styles.mapRow}>
        <TouchableOpacity style={[styles.mapBlock, { flex: 1.4 }]} onPress={() => { setSelectedBlock(MOCK_BLOCKS[0]); setViewMode('blockDetail'); }}>
          <Text style={styles.mapBlockTitle}>N-1</Text>
          <Text style={styles.mapBlockSub}>142 ac, set 3</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.mapBlock, { flex: 1.4 }]} onPress={() => { setSelectedBlock(MOCK_BLOCKS[1]); setViewMode('blockDetail'); }}>
          <Text style={styles.mapBlockTitle}>N-2</Text>
          <Text style={styles.mapBlockSub}>138 ac, set 4</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.mapBlock, { flex: 1 }]} onPress={() => { setSelectedBlock(MOCK_BLOCKS[2]); setViewMode('blockDetail'); }}>
          <Text style={styles.mapBlockTitle}>N-3</Text>
          <Text style={styles.mapBlockSub}>96 ac, set 5</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.mapRow}>
        <TouchableOpacity style={[styles.mapBlock, styles.mapBlockWarning, { flex: 1.3 }]} onPress={() => { setSelectedBlock(MOCK_BLOCKS[3]); setViewMode('blockDetail'); }}>
          <Text style={styles.mapBlockTitle}>N-4</Text>
          <Text style={styles.mapBlockSub}>160 ac, set 7</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.mapBlock, { flex: 1.3 }]} onPress={() => { setSelectedBlock(MOCK_BLOCKS[4]); setViewMode('blockDetail'); }}>
          <Text style={styles.mapBlockTitle}>S-1</Text>
          <Text style={styles.mapBlockSub}>210 ac, set 9</Text>
        </TouchableOpacity>
        <View style={[styles.mapBlockEmpty, { flex: 1 }]}>
           <MaterialCommunityIcons name="circle-slice-8" size={20} color="#D97706" />
           <Text style={styles.mapBlockSub}>Tank 3</Text>
        </View>
      </View>
      <View style={styles.legendRow}>
        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#86EFAC' }]} /><Text style={styles.legendText}>Tissue in range</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#FDE047' }]} /><Text style={styles.legendText}>Needs attention</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#93C5FD' }]} /><Text style={styles.legendText}>Canal</Text></View>
      </View>
    </View>
  );

  const renderRanchList = () => (
    <ScrollView style={styles.listContainer} contentContainerStyle={styles.listContent}>
      {ranchesList.map((ranch, idx) => (
        <TouchableOpacity key={idx} style={styles.ranchCard} onPress={() => { setSelectedRanch(ranch); setViewMode('blocks'); }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.ranchName}>{ranch.name}</Text>
              {ranch.status === 'PENDING' && (
                <View style={styles.pendingBadge}><Text style={styles.pendingText}>PENDING</Text></View>
              )}
            </View>
            <Text style={styles.ranchDesc}>{ranch.desc}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.ranchAc}>{ranch.ac}</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#9CA3AF" />
          </View>
        </TouchableOpacity>
      ))}
      
      <TouchableOpacity style={styles.importButton} onPress={() => setAddRanchModalVisible(true)}>
        <MaterialCommunityIcons name="plus-circle" size={22} color="#15803D" />
        <Text style={styles.importButtonText}>Add New Ranch</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderBlocksList = () => (
    <ScrollView style={styles.listContainer}>
      {renderBlockMap()}
      <View style={styles.blocksListHeader}>
        <Text style={styles.blocksTitle}>Blocks</Text>
      </View>
      <View style={styles.blocksTable}>
        <View style={styles.tableRowHeader}>
          <Text style={[styles.tableColHeader, { flex: 0.5 }]}>Block</Text>
          <Text style={[styles.tableColHeader, { flex: 2 }]}>Crop, variety</Text>
          <Text style={[styles.tableColHeader, { flex: 0.5, textAlign: 'right' }]}>Ac</Text>
          <Text style={[styles.tableColHeader, { flex: 0.6, textAlign: 'right' }]}>Planted</Text>
        </View>
        {blocksList.map((block, i) => (
          <TouchableOpacity key={i} style={styles.tableRow} onPress={() => { setSelectedBlock(block); setViewMode('blockDetail'); }}>
            <Text style={[styles.tableCol, styles.tableColBold, { flex: 0.5 }]}>{block.id}</Text>
            <Text style={[styles.tableCol, { flex: 2 }]}>{block.crop}</Text>
            <Text style={[styles.tableCol, { flex: 0.5, textAlign: 'right' }]}>{block.ac}</Text>
            <Text style={[styles.tableCol, { flex: 0.6, textAlign: 'right' }]}>{block.planted}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={[styles.importButton, { margin: 15, marginTop: 0 }]} onPress={handleImport} disabled={isImporting}>
        {isImporting ? <RNActivityIndicator size="small" color="#15803D" /> : <MaterialCommunityIcons name="file-excel" size={22} color="#15803D" />}
        <Text style={styles.importButtonText}>{isImporting ? 'Importing Blocks...' : 'Import blocks from spreadsheet'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderBlockDetail = () => {
    const block = selectedBlock;
    if (!block) return null;
    return (
      <ScrollView style={styles.listContainer} contentContainerStyle={{ paddingBottom: 40 }}>
        {renderBlockMap()}
        <View style={styles.detailCard}>
          <View style={styles.detailRow}><Text style={styles.detailLabel}>Crop</Text><Text style={styles.detailValueBold}>{block.crop}</Text></View>
          <View style={styles.detailRow}><Text style={styles.detailLabel}>Acres</Text><Text style={styles.detailValueBold}>{block.ac}</Text></View>
          <View style={styles.detailRow}><Text style={styles.detailLabel}>Planted</Text><Text style={styles.detailValueBold}>{block.planted}</Text></View>
          <View style={styles.detailRow}><Text style={styles.detailLabel}>Irrigation</Text><Text style={styles.detailValueBold}>{block.irrigation}</Text></View>
          <View style={styles.detailRow}><Text style={styles.detailLabel}>APN</Text><Text style={styles.detailValueBold}>{block.apn}</Text></View>
          <View style={styles.detailRow}><Text style={styles.detailLabel}>Coalition</Text><Text style={styles.detailValueBold}>{block.coalition}</Text></View>
          <View style={[styles.detailRow, { borderBottomWidth: 0 }]}><Text style={styles.detailLabel}>2025 yield</Text><Text style={styles.detailValueBold}>{block.yield}</Text></View>
        </View>

        <Text style={styles.sectionTitle}>Nitrogen plan vs delivered, lb N per acre</Text>
        <View style={styles.chartCard}>
          {/* Mock Chart Area */}
          <View style={styles.barChartContainer}>
             <View style={styles.barGroup}>
               <View style={[styles.bar, styles.barPlan, { height: 40 }]} />
               <View style={[styles.bar, styles.barDelivered, { height: 40 }]}><Text style={styles.barLabel}>40</Text></View>
             </View>
             <View style={styles.barGroup}>
               <View style={[styles.bar, styles.barPlan, { height: 70 }]} />
               <View style={[styles.bar, styles.barDelivered, { height: 58 }]}><Text style={styles.barLabel}>58</Text></View>
             </View>
             <View style={styles.barGroup}>
               <View style={[styles.bar, styles.barPlan, { height: 42 }]} />
               <View style={[styles.bar, styles.barDelivered, { height: 42 }]}><Text style={styles.barLabel}>42</Text></View>
             </View>
          </View>

          {/* Nutrients Sliders Mock */}
          <View style={styles.nutrientRow}>
             <Text style={styles.nutrientLabel}>N %</Text>
             <View style={styles.sliderTrack}><View style={[styles.sliderThumb, { left: '40%', backgroundColor: '#10B981' }]} /></View>
             <View style={styles.nutrientValues}><Text style={styles.nutrientValMain}>2.3</Text><Text style={styles.nutrientValSub}>2.2 to 2.6</Text></View>
          </View>
          <View style={styles.nutrientRow}>
             <Text style={styles.nutrientLabel}>P %</Text>
             <View style={styles.sliderTrack}><View style={[styles.sliderThumb, { left: '30%', backgroundColor: '#10B981' }]} /></View>
             <View style={styles.nutrientValues}><Text style={styles.nutrientValMain}>0.12</Text><Text style={styles.nutrientValSub}>0.1 to 0.3</Text></View>
          </View>
          <View style={styles.nutrientRow}>
             <Text style={styles.nutrientLabel}>K %</Text>
             <View style={styles.sliderTrack}><View style={[styles.sliderThumb, { left: '20%', backgroundColor: '#EF4444' }]} /></View>
             <View style={styles.nutrientValues}><Text style={styles.nutrientValMain}>1.4</Text><Text style={styles.nutrientValSub}>1.6 to 2.4</Text></View>
          </View>
          <View style={styles.nutrientRow}>
             <Text style={styles.nutrientLabel}>Ca %</Text>
             <View style={styles.sliderTrack}><View style={[styles.sliderThumb, { left: '60%', backgroundColor: '#10B981' }]} /></View>
             <View style={styles.nutrientValues}><Text style={styles.nutrientValMain}>2.9</Text><Text style={styles.nutrientValSub}>2 to 4</Text></View>
          </View>

          <Text style={styles.chartFootnote}>Green band is the UC reference range for almond, July leaf.</Text>
          <TouchableOpacity style={styles.uploadButton}>
            <MaterialCommunityIcons name="cloud-upload" size={20} color="#10B981" />
            <Text style={styles.uploadButtonText}>Upload lab PDF or CSV</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Timeline</Text>
        <View style={styles.timelineCard}>
           <View style={styles.timelineItem}>
             <View style={styles.timelineDot} />
             <View style={styles.timelineContent}>
               <Text style={styles.timelineTitle}>Delivered 1,200 gal Green Nitrogen, post-harvest N, tank 3</Text>
               <Text style={styles.timelineSub}>Sep 9, proof of delivery attached</Text>
             </View>
           </View>
           <View style={styles.timelineItem}>
             <View style={styles.timelineDot} />
             <View style={styles.timelineContent}>
               <Text style={styles.timelineTitle}>July leaf tissue results received</Text>
               <Text style={styles.timelineSub}>Jul 22, N 2.3%, K 1.4% low</Text>
             </View>
           </View>
           <View style={[styles.timelineItem, { borderLeftColor: 'transparent' }]}>
             <View style={styles.timelineDot} />
             <View style={styles.timelineContent}>
               <Text style={styles.timelineTitle}>Delivered 1,000 gal KTS</Text>
               <Text style={styles.timelineSub}>Jun 12</Text>
             </View>
           </View>
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      {renderHeader()}
      {viewMode === 'list' && renderRanchList()}
      {viewMode === 'blocks' && renderBlocksList()}
      {viewMode === 'blockDetail' && renderBlockDetail()}

      <Modal visible={addRanchModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.addRanchContainer}>
            <View style={styles.addRanchHeader}>
              <Text style={styles.addRanchTitle}>Add New Ranch</Text>
              <TouchableOpacity onPress={() => setAddRanchModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>Ranches added will be sent to admin and employee for approval.</Text>
            
            <Text style={styles.inputLabel}>Ranch Name</Text>
            <TextInput style={styles.modalInput} placeholder="e.g. South Ranch" value={newRanchName} onChangeText={setNewRanchName} />
            
            <Text style={styles.inputLabel}>Total Acreage</Text>
            <TextInput style={styles.modalInput} placeholder="e.g. 500" keyboardType="numeric" value={newRanchAc} onChangeText={setNewRanchAc} />
            
            <Text style={styles.inputLabel}>Description / County (Optional)</Text>
            <TextInput style={styles.modalInput} placeholder="e.g. Fresno County" value={newRanchDesc} onChangeText={setNewRanchDesc} />
            
            <TouchableOpacity style={styles.submitBtn} onPress={handleAddRanch}>
              <Text style={styles.submitBtnText}>Submit for Approval</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F6' }, // Warm earthy off-white
  header: { paddingTop: 60, paddingBottom: 35, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, shadowColor: '#166534', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 15, elevation: 5 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerTitle: { fontSize: 30, fontWeight: '900', color: '#ECFDF5', letterSpacing: 0.5 },
  headerSubtitle: { fontSize: 15, color: '#A7F3D0', marginTop: 4, fontWeight: '500' },
  entityDropdown: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  entityText: { color: '#FFF', marginRight: 6, fontWeight: '600' },
  addRanchIcon: { backgroundColor: 'rgba(255,255,255,0.15)', padding: 6, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  
  headerSmall: { paddingTop: 50, paddingBottom: 25, paddingHorizontal: 15, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerContentSmall: { flexDirection: 'row', alignItems: 'center' },
  backButton: { marginRight: 15, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: 4 },
  headerTitleSmall: { fontSize: 22, fontWeight: '800', color: '#ECFDF5' },

  listContainer: { flex: 1 },
  listContent: { padding: 15, paddingTop: 20 },
  ranchCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 18, marginBottom: 15, flexDirection: 'row', alignItems: 'center', shadowColor: '#8C7C61', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3, borderWidth: 1, borderColor: '#F0EBE1' },
  ranchName: { fontSize: 18, fontWeight: '800', color: '#164E63' },
  ranchDesc: { fontSize: 13, color: '#78716C', marginTop: 6, lineHeight: 18 },
  ranchAc: { fontSize: 17, fontWeight: '900', color: '#15803D', marginRight: 8 },
  importButton: { backgroundColor: '#F0FDF4', borderWidth: 1.5, borderColor: '#16A34A', borderRadius: 30, paddingVertical: 16, alignItems: 'center', marginTop: 15, flexDirection: 'row', justifyContent: 'center', shadowColor: '#16A34A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6 },
  importButtonText: { color: '#15803D', fontWeight: 'bold', fontSize: 16, marginLeft: 8 },

  mapContainer: { backgroundColor: '#E7E5E4', padding: 15, paddingBottom: 15, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, marginHorizontal: -1 },
  mapRow: { flexDirection: 'row', marginBottom: 10, height: 100 },
  mapBlock: { backgroundColor: '#A7F3D0', borderRadius: 8, marginHorizontal: 5, padding: 8, borderWidth: 2.5, borderColor: '#34D399', justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed' },
  mapBlockWarning: { backgroundColor: '#FEF08A', borderColor: '#EAB308', borderStyle: 'solid' },
  mapBlockEmpty: { marginHorizontal: 5, justifyContent: 'center', alignItems: 'center' },
  mapBlockTitle: { fontWeight: '900', fontSize: 16, color: '#064E3B' },
  mapBlockSub: { fontSize: 11, color: '#065F46', marginTop: 3, textAlign: 'center', fontWeight: '500' },
  
  legendRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 15, backgroundColor: '#FFF', paddingVertical: 12, borderRadius: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 12 },
  legendDot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  legendText: { fontSize: 13, color: '#57534E', fontWeight: '600' },

  blocksListHeader: { padding: 20, paddingBottom: 5 },
  blocksTitle: { fontSize: 22, fontWeight: '900', color: '#164E63' },
  blocksTable: { backgroundColor: '#FFF', margin: 15, borderRadius: 16, padding: 12, shadowColor: '#8C7C61', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, borderWidth: 1, borderColor: '#F0EBE1' },
  tableRowHeader: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1.5, borderBottomColor: '#E7E5E4' },
  tableColHeader: { fontSize: 13, color: '#78716C', fontWeight: 'bold' },
  tableRow: { flexDirection: 'row', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F5F5F4' },
  tableCol: { fontSize: 14, color: '#44403C' },
  tableColBold: { fontWeight: '900', color: '#164E63' },

  detailCard: { backgroundColor: '#FFF', margin: 15, borderRadius: 16, paddingHorizontal: 18, shadowColor: '#8C7C61', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, borderWidth: 1, borderColor: '#F0EBE1' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F5F5F4' },
  detailLabel: { fontSize: 14, color: '#78716C', fontWeight: '500' },
  detailValueBold: { fontSize: 15, fontWeight: '800', color: '#164E63' },
  
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#164E63', marginHorizontal: 20, marginTop: 25, marginBottom: 12 },
  chartCard: { backgroundColor: '#FFF', marginHorizontal: 15, borderRadius: 16, padding: 20, shadowColor: '#8C7C61', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, borderWidth: 1, borderColor: '#F0EBE1' },
  barChartContainer: { flexDirection: 'row', height: 120, alignItems: 'flex-end', justifyContent: 'space-around', marginBottom: 25, borderBottomWidth: 1.5, borderBottomColor: '#E7E5E4' },
  barGroup: { flexDirection: 'row', alignItems: 'flex-end', width: 44, justifyContent: 'space-between' },
  bar: { width: 18, borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  barPlan: { backgroundColor: '#D1FAE5', opacity: 0.7 },
  barDelivered: { backgroundColor: '#10B981', position: 'relative' },
  barLabel: { position: 'absolute', top: -22, left: -4, fontSize: 13, fontWeight: '900', color: '#064E3B' },
  
  nutrientRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  nutrientLabel: { width: 45, fontSize: 14, fontWeight: '900', color: '#44403C' },
  sliderTrack: { flex: 1, height: 8, backgroundColor: '#F0FDF4', borderRadius: 4, position: 'relative', marginHorizontal: 12 },
  sliderThumb: { position: 'absolute', width: 18, height: 18, borderRadius: 9, top: -5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 2 },
  nutrientValues: { width: 65, alignItems: 'flex-end' },
  nutrientValMain: { fontSize: 15, fontWeight: '900', color: '#164E63' },
  nutrientValSub: { fontSize: 11, color: '#78716C', marginTop: 2 },
  
  chartFootnote: { fontSize: 12, color: '#A8A29E', marginVertical: 20, fontStyle: 'italic' },
  uploadButton: { borderWidth: 1.5, borderColor: '#10B981', borderRadius: 25, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  uploadButtonText: { color: '#10B981', fontWeight: 'bold', fontSize: 15, marginLeft: 8 },
  
  timelineCard: { backgroundColor: '#FFF', marginHorizontal: 15, borderRadius: 16, padding: 20, paddingBottom: 10, shadowColor: '#8C7C61', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, borderWidth: 1, borderColor: '#F0EBE1' },
  timelineItem: { flexDirection: 'row', paddingBottom: 25, borderLeftWidth: 2.5, borderLeftColor: '#E7E5E4', marginLeft: 8 },
  timelineDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#10B981', marginLeft: -8, marginTop: 2, borderWidth: 3, borderColor: '#ECFDF5' },
  timelineContent: { marginLeft: 18, flex: 1 },
  timelineTitle: { fontSize: 15, color: '#164E63', fontWeight: '700', lineHeight: 20 },
  timelineSub: { fontSize: 13, color: '#78716C', marginTop: 6 },

  pendingBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, marginLeft: 10, borderWidth: 1, borderColor: '#F59E0B' },
  pendingText: { fontSize: 10, fontWeight: 'bold', color: '#D97706' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  addRanchContainer: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  addRanchHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  addRanchTitle: { fontSize: 20, fontWeight: 'bold', color: '#164E63' },
  modalSub: { fontSize: 13, color: '#6B7280', marginBottom: 20 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  modalInput: { backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 15, paddingVertical: 12, marginBottom: 16, fontSize: 15, color: '#111827' },
  submitBtn: { backgroundColor: '#10B981', paddingVertical: 14, borderRadius: 30, alignItems: 'center', marginTop: 10 },
  submitBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
});
