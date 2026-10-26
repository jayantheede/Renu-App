import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  Divider,
  Chip,
  ActivityIndicator,
  ProgressBar,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  fetchRanches,
  submitRanch,
  submitBlock,
  submitTankSetup,
  addTankMedicine,
  deleteTankMedicine,
  updateTankTracker,
  addTankReport,
  deleteTankReport,
  fetchDeliveries,
  fetchPrograms,
  fetchSamples,
  submitSample,
  replyToRecommendation,
  importBlocks,
  exportBlocks,
  fetchFeatureFlags,
} from '../api/client';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/useAuthStore';
import { BRAND_COLORS } from '../theme/theme';

export const RanchesScreen = ({ route }: any) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'admin';

  const [ranches, setRanches] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [samples, setSamples] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Deferred Launch Flags
  const [flags, setFlags] = useState<any>({
    map: true,
    telemetry: true,
    recommendations: true,
    labResults: true,
  });
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [activeMapRanchId, setActiveMapRanchId] = useState<string>('');
  const [telemetryModalVisible, setTelemetryModalVisible] = useState(false);
  const [selectedTelemetryTank, setSelectedTelemetryTank] = useState<any>(null);
  const [selectedTelemetryRanch, setSelectedTelemetryRanch] = useState<any>(null);

  // Selected Block Detail Modal
  const [selectedBlock, setSelectedBlock] = useState<any>(null);
  const [selectedBlockRanch, setSelectedBlockRanch] = useState<any>(null);
  const [blockModalVisible, setBlockModalVisible] = useState(false);

  // Add Ranch Modal
  const [addRanchModalVisible, setAddRanchModalVisible] = useState(false);
  const [newRanchName, setNewRanchName] = useState('');
  const [newRanchCounty, setNewRanchCounty] = useState('Fresno');
  const [submittingRanch, setSubmittingRanch] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

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

  // Add Tank Modal
  const [addTankModalVisible, setAddTankModalVisible] = useState(false);
  const [targetRanchForTank, setTargetRanchForTank] = useState<any>(null);
  const [tankName, setTankName] = useState('');
  const [tankCapacity, setTankCapacity] = useState('5000');
  const [tankLocation, setTankLocation] = useState('');
  const [submittingTank, setSubmittingTank] = useState(false);

  // Send Lab Results Modal
  const [sampleModalVisible, setSampleModalVisible] = useState(false);
  const [sampleRanchId, setSampleRanchId] = useState('');
  const [sampleBlockId, setSampleBlockId] = useState('');
  const [sampleType, setSampleType] = useState('Leaf tissue');
  const [sampleDate, setSampleDate] = useState(new Date().toISOString().split('T')[0]);
  const [sampleLabName, setSampleLabName] = useState('Dellavalle Laboratory');
  const [sampleNotes, setSampleNotes] = useState('');
  const [sampleDocument, setSampleDocument] = useState<{ name: string; type: string; size: string; data: string } | null>(null);
  const [submittingSample, setSubmittingSample] = useState(false);

  // Tank Hub Modal (Medicines, Trackers, Reports)
  const [tankHubModalVisible, setTankHubModalVisible] = useState(false);
  const [selectedHubTank, setSelectedHubTank] = useState<any>(null);
  const [selectedHubRanch, setSelectedHubRanch] = useState<any>(null);
  const [hubActiveTab, setHubActiveTab] = useState<'medicines' | 'trackers' | 'reports'>('medicines');

  // Add Medicine Form
  const [showAddMedForm, setShowAddMedForm] = useState(false);
  const [medName, setMedName] = useState('');
  const [medType, setMedType] = useState('Bio-Fertilizer');
  const [medDosage, setMedDosage] = useState('');
  const [medBatch, setMedBatch] = useState('');
  const [medTarget, setMedTarget] = useState('');
  const [medNotes, setMedNotes] = useState('');
  const [submittingMed, setSubmittingMed] = useState(false);

  // Configure Tracker Form
  const [showTrackerForm, setShowTrackerForm] = useState(false);
  const [trkType, setTrkType] = useState('Otodata Cellular Telemetry');
  const [trkSerial, setTrkSerial] = useState('');
  const [trkCellularId, setTrkCellularId] = useState('');
  const [trkThreshold, setTrkThreshold] = useState('25');
  const [submittingTrk, setSubmittingTrk] = useState(false);

  // Add Tank Report Form
  const [showAddReportForm, setShowAddReportForm] = useState(false);
  const [rptTitle, setRptTitle] = useState('');
  const [rptType, setRptType] = useState('Refill & Level Log');
  const [rptNotes, setRptNotes] = useState('');
  const [rptDocument, setRptDocument] = useState<{ name: string; type: string; size: string; data: string } | null>(null);
  const [submittingRpt, setSubmittingRpt] = useState(false);

  // Recommendation Reply State
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  // Import Blocks CSV Modal
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importRanch, setImportRanch] = useState<any>(null);
  const [csvContent, setCsvContent] = useState('');
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);

  const loadAll = async () => {
    try {
      const [rData, dData, pData, sData, fData] = await Promise.all([
        fetchRanches().catch(() => []),
        fetchDeliveries().catch(() => []),
        fetchPrograms().catch(() => []),
        fetchSamples().catch(() => []),
        fetchFeatureFlags().catch(() => ({})),
      ]);
      if (Array.isArray(rData)) {
        setRanches(rData);
        if (rData.length > 0) {
          setActiveMapRanchId((prev) => prev || rData[0].id);
        }
      }
      if (Array.isArray(dData)) setDeliveries(dData);
      if (Array.isArray(pData)) setPrograms(pData);
      if (Array.isArray(sData)) setSamples(sData);
      if (fData) {
        setFlags({
          map: Boolean(fData.global?.map ?? fData.map ?? true),
          telemetry: Boolean(fData.global?.telemetry ?? fData.telemetry ?? true),
          recommendations: Boolean(fData.global?.recommendations ?? fData.recommendations ?? true),
          labResults: Boolean(fData.global?.labResults ?? fData.labResults ?? true),
        });
      }

      if (rData.length > 0 && !sampleRanchId) {
        setSampleRanchId(rData[0].id);
        if (rData[0].blocks && rData[0].blocks.length > 0) {
          setSampleBlockId(rData[0].blocks[0].blockId);
        }
      }
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

  useEffect(() => {
    if (route?.params?.openSampleModal) {
      setSampleModalVisible(true);
    }
  }, [route?.params]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAll();
  };

  const handleOpenBlockDetail = (ranch: any, block: any) => {
    setSelectedBlock(block);
    setSelectedBlockRanch(ranch);
    setReplyText('');
    setBlockModalVisible(true);
  };

  const handleCreateRanch = async () => {
    if (!newRanchName.trim()) {
      Alert.alert('Required', 'Please enter a ranch name.');
      return;
    }
    setSubmittingRanch(true);
    try {
      await submitRanch({
        name: newRanchName.trim(),
        county: newRanchCounty.trim() || 'Fresno County',
        location: newRanchCounty.trim() || 'Fresno County',
      });
      setAddRanchModalVisible(false);
      setNewRanchName('');
      loadAll();
      Alert.alert('Ranch Created', `Ranch "${newRanchName.trim()}" added successfully!`);
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
        .map((a) => a.trim())
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
        capacity: parseInt(tankCapacity, 10) || 5000,
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

  const pickFile = (onPicked: (file: { name: string; type: string; size: string; data: string }) => void) => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '*/*'; // Accept any format!
      input.onchange = (e: any) => {
        const file = e.target?.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            const dataUri = reader.result as string;
            const sizeKb = file.size / 1024;
            const formattedSize = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${Math.round(sizeKb)} KB`;
            onPicked({
              name: file.name,
              type: file.type || 'application/octet-stream',
              size: formattedSize,
              data: dataUri,
            });
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    } else {
      Alert.alert(
        'Attach Document',
        'Upload your lab assay or report document in any format.',
        [
          {
            text: 'Attach Sample PDF',
            onPress: () =>
              onPicked({
                name: 'Lab_Assay_Report.pdf',
                type: 'application/pdf',
                size: '1.2 MB',
                data: 'data:application/pdf;base64,JVBERi0xLjQKJeLjz9MKMSAwIG9iajw8L1R5cGUvQ2F0YWxvZy9QYWdlcyAyIDAgUj4+ZW5kb2JqCg==',
              }),
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  const handleOpenDocument = (fileDataOrUrl?: string, fileName?: string) => {
    if (!fileDataOrUrl) {
      Alert.alert('Notice', 'No document file data is attached.');
      return;
    }
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const win = window.open();
      if (win) {
        if (fileDataOrUrl.startsWith('data:image')) {
          win.document.write(`<img src="${fileDataOrUrl}" style="max-width:100%;height:auto;margin:20px auto;display:block;" />`);
        } else if (fileDataOrUrl.startsWith('data:application/pdf') || fileDataOrUrl.startsWith('data:')) {
          win.document.write(`
            <html>
              <head><title>${fileName || 'Attached Document'}</title></head>
              <body style="margin:0;padding:20px;font-family:sans-serif;background:#F8FAFC;">
                <h3 style="color:#0C6054;">${fileName || 'Attached Document'}</h3>
                <iframe src="${fileDataOrUrl}" width="100%" height="800px" style="border:1px solid #CBD5E1;border-radius:8px;"></iframe>
              </body>
            </html>
          `);
        } else {
          win.location.href = fileDataOrUrl;
        }
      } else {
        window.location.href = fileDataOrUrl;
      }
    } else {
      Alert.alert('Document Attached', `Document "${fileName || 'File'}" is saved and available for viewing.`);
    }
  };

  const handleSubmitSample = async () => {
    if (!sampleRanchId || !sampleBlockId) {
      Alert.alert('Selection Required', 'Please select a ranch and block for this assay sample.');
      return;
    }
    setSubmittingSample(true);
    try {
      const chosenRanch = ranches.find((r) => r.id === sampleRanchId);
      await submitSample({
        ranchId: sampleRanchId,
        ranchName: chosenRanch?.name || 'Ranch',
        blockId: sampleBlockId,
        sampleType,
        samplingDate: sampleDate,
        labName: sampleLabName,
        notes: sampleNotes,
        pdfFileName: sampleDocument?.name || 'Lab_Assay_Report.pdf',
        pdfData: sampleDocument?.data || undefined,
        documentType: sampleDocument?.type || 'application/pdf',
        documentSize: sampleDocument?.size || '1.2 MB',
      });
      setSampleModalVisible(false);
      setSampleNotes('');
      setSampleDocument(null);
      loadAll();
      Alert.alert(
        'Sample Submitted',
        'Your lab assay has been received. Our agronomy team will review the results and generate your custom nutrition recommendation.'
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to submit lab sample');
    } finally {
      setSubmittingSample(false);
    }
  };

  const handleOpenTankHub = (ranch: any, tank: any) => {
    setSelectedHubRanch(ranch);
    setSelectedHubTank(tank);
    setHubActiveTab('medicines');
    setShowAddMedForm(false);
    setShowTrackerForm(false);
    setShowAddReportForm(false);
    setTrkSerial(tank.serial || '');
    setTrkThreshold(String(tank.reorderThresholdPercent || 25));
    setTankHubModalVisible(true);
  };

  const handleAddMedicine = async () => {
    if (!medName.trim()) {
      Alert.alert('Required', 'Please enter a medicine or nutrient product name.');
      return;
    }
    setSubmittingMed(true);
    try {
      await addTankMedicine(selectedHubTank.id, {
        name: medName.trim(),
        type: medType,
        dosage: medDosage.trim() || '25 Gallons',
        batchNumber: medBatch.trim() || `BAT-${Math.floor(1000 + Math.random() * 9000)}`,
        targetDeficiency: medTarget.trim() || 'Crop Fortification',
        notes: medNotes.trim(),
        status: 'Active',
      });
      setMedName('');
      setMedDosage('');
      setMedBatch('');
      setMedTarget('');
      setMedNotes('');
      setShowAddMedForm(false);
      await loadAll();
      Alert.alert('Medicine Added', 'Treatment recorded for this tank.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to add medicine');
    } finally {
      setSubmittingMed(false);
    }
  };

  const handleDeleteMedicine = async (medId: string) => {
    try {
      await deleteTankMedicine(selectedHubTank.id, medId);
      await loadAll();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to remove medicine');
    }
  };

  const handleUpdateTracker = async () => {
    setSubmittingTrk(true);
    try {
      await updateTankTracker(selectedHubTank.id, {
        trackerType: trkType,
        serialNumber: trkSerial.trim() || selectedHubTank.serial,
        cellularId: trkCellularId.trim() || undefined,
        alertThresholdPercent: parseInt(trkThreshold, 10) || 25,
      });
      setShowTrackerForm(false);
      await loadAll();
      Alert.alert('Tracker Updated', 'Telemetry configuration saved.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update tracker');
    } finally {
      setSubmittingTrk(false);
    }
  };

  const handleAddTankReport = async () => {
    if (!rptTitle.trim()) {
      Alert.alert('Required', 'Please enter a report title.');
      return;
    }
    setSubmittingRpt(true);
    try {
      await addTankReport(selectedHubTank.id, {
        title: rptTitle.trim(),
        reportType: rptType,
        notes: rptNotes.trim(),
        fileName: rptDocument?.name || 'Tank_Report.pdf',
        fileData: rptDocument?.data || undefined,
      });
      setRptTitle('');
      setRptNotes('');
      setRptDocument(null);
      setShowAddReportForm(false);
      await loadAll();
      Alert.alert('Report Saved', 'Report logged for this tank.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to add report');
    } finally {
      setSubmittingRpt(false);
    }
  };

  const handleDeleteTankReport = async (reportId: string) => {
    try {
      await deleteTankReport(selectedHubTank.id, reportId);
      await loadAll();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to remove report');
    }
  };

  const handleReplyToRecommendation = async (sampleId: string) => {
    if (!replyText.trim()) return;
    setSubmittingReply(true);
    try {
      await replyToRecommendation(sampleId, replyText.trim());
      setReplyText('');
      loadAll();
      Alert.alert('Reply Sent', 'Your follow-up question was sent to the agronomist.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to send reply');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleImportCSV = async () => {
    if (!csvContent.trim() || !importRanch) return;
    setImporting(true);
    setImportErrors([]);

    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) {
      setImportErrors(['CSV must contain a header row and at least one data row.']);
      setImporting(false);
      return;
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const parsedBlocks: any[] = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cols = line.split(',').map((c) => c.trim());
      const rowObj: any = {};
      headers.forEach((h, idx) => {
        rowObj[h] = cols[idx] || '';
      });

      const blockId = rowObj['blockid'] || rowObj['block_id'] || cols[0];
      const acreage = parseFloat(rowObj['acreage'] || rowObj['acres'] || cols[4]);

      if (!blockId) {
        errors.push(`Row ${i + 1}: Missing required Block ID.`);
      }
      if (isNaN(acreage) || acreage <= 0) {
        errors.push(`Row ${i + 1} (${blockId || 'Unknown'}): Invalid acreage.`);
      }

      parsedBlocks.push({
        blockId,
        crop: rowObj['crop'] || cols[1] || 'Almond',
        variety: rowObj['variety'] || cols[2] || 'Nonpareil',
        rootstock: rowObj['rootstock'] || cols[3] || 'Nemaguard',
        acreage: acreage || 0,
        plantingYear: parseInt(rowObj['plantingyear'] || rowObj['year'] || cols[5], 10) || 2020,
        irrigationType: rowObj['irrigationtype'] || rowObj['irrigation'] || cols[6] || 'Drip',
        fertigationSet: rowObj['fertigationset'] || rowObj['set'] || cols[7] || 'Set 1',
        county: rowObj['county'] || importRanch.county || 'Fresno',
        apns: (rowObj['apns'] || cols[9] || '').split(';').map((a: string) => a.trim()).filter(Boolean),
      });
    }

    if (errors.length > 0) {
      setImportErrors(errors);
      setImporting(false);
      return;
    }

    try {
      await importBlocks(importRanch.id, parsedBlocks);
      setImportModalVisible(false);
      setCsvContent('');
      loadAll();
      Alert.alert('Import Complete', `Successfully imported ${parsedBlocks.length} blocks into ${importRanch.name}!`);
    } catch (e: any) {
      setImportErrors([e.message || 'Failed to import blocks']);
    } finally {
      setImporting(false);
    }
  };

  const handleExportCSV = async (ranch: any) => {
    try {
      const res = await exportBlocks(ranch.id);
      if (res?.csv) {
        Alert.alert(
          'Block Export Ready',
          `CSV for ${ranch.name} exported with ${ranch.blocks?.length || 0} blocks.`,
          [{ text: 'OK' }]
        );
      }
    } catch (e: any) {
      Alert.alert('Export Error', e.message || 'Could not export blocks.');
    }
  };

  const getDeliveriesForBlock = (blockId: string) => {
    return deliveries.filter((d) => {
      if (!d.blockIds || !Array.isArray(d.blockIds)) return false;
      return d.blockIds.includes(blockId);
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(16, insets.top + 8),
            paddingBottom: 110 + insets.bottom,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={BRAND_COLORS.primaryTeal}
          />
        }
      >
        {/* Top Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Ranches & Programs</Text>
            <Text style={styles.subtitle}>
              Planted field inventory, nutrition programs & Otodata tank telemetry
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={styles.labSampleBtn}
              activeOpacity={0.8}
              onPress={() => setSampleModalVisible(true)}
            >
              <MaterialCommunityIcons name="flask-outline" size={16} color="#FFFFFF" />
              <Text style={styles.labSampleBtnText}>Send Lab Results</Text>
            </TouchableOpacity>

            {isAdmin && (
              <TouchableOpacity
                style={styles.addRanchBtn}
                activeOpacity={0.8}
                onPress={() => setAddRanchModalVisible(true)}
              >
                <MaterialCommunityIcons name="plus" size={16} color="#FFFFFF" />
                <Text style={styles.addRanchBtnText}>Add Ranch</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Map / List View Switcher (Deferred: map) */}
        {flags.map && (
          <View style={styles.viewModeToggleRow}>
            <TouchableOpacity
              style={[styles.viewModeBtn, viewMode === 'list' && styles.viewModeBtnActive]}
              onPress={() => setViewMode('list')}
            >
              <MaterialCommunityIcons
                name="format-list-bulleted"
                size={16}
                color={viewMode === 'list' ? '#FFFFFF' : '#64748B'}
              />
              <Text style={[styles.viewModeText, viewMode === 'list' && styles.viewModeTextActive]}>
                List View
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewModeBtn, viewMode === 'map' && styles.viewModeBtnActive]}
              onPress={() => setViewMode('map')}
            >
              <MaterialCommunityIcons
                name="map"
                size={16}
                color={viewMode === 'map' ? '#FFFFFF' : '#64748B'}
              />
              <Text style={[styles.viewModeText, viewMode === 'map' && styles.viewModeTextActive]}>
                Satellite Farm Map
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {viewMode === 'map' ? (
          <View style={styles.mapContainer}>
            {/* Ranch Switcher Tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mapRanchStrip}>
              {ranches.map((r) => {
                const isSel = (activeMapRanchId || ranches[0]?.id) === r.id;
                return (
                  <TouchableOpacity
                    key={r.id}
                    style={[styles.mapRanchPill, isSel && styles.mapRanchPillActive]}
                    onPress={() => setActiveMapRanchId(r.id)}
                  >
                    <MaterialCommunityIcons
                      name="sprout"
                      size={14}
                      color={isSel ? '#FFFFFF' : '#0C6054'}
                    />
                    <Text style={[styles.mapRanchPillText, isSel && styles.mapRanchPillTextActive]}>
                      {r.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* GPS & Weather Telemetry HUD */}
            {(() => {
              const currentRanch = ranches.find((r) => r.id === (activeMapRanchId || ranches[0]?.id)) || ranches[0];
              if (!currentRanch) return null;
              const isRanch2 = currentRanch.id === 'ranch-2';
              const gpsCoords = isRanch2 ? '36.9613° N, -120.0607° W' : '36.5963° N, -119.4504° W';
              const locationName = isRanch2 ? 'Madera County, CA · Westside Irrigation District' : 'Fresno County, CA · Reedley · FID District';
              const rBlocks = currentRanch.blocks || [];
              const rTanks = currentRanch.tanks || currentRanch.tankSetups || [];

              return (
                <View style={styles.mapHudCard}>
                  <View style={styles.mapHudHeader}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <MaterialCommunityIcons name="crosshairs-gps" size={16} color="#0C6054" />
                        <Text style={styles.mapHudCoords}>{gpsCoords}</Text>
                      </View>
                      <Text style={styles.mapHudSub}>{locationName} · Elev. 348 ft</Text>
                    </View>
                    <View style={styles.mapWeatherBadge}>
                      <MaterialCommunityIcons name="weather-sunny" size={18} color="#D97706" />
                      <Text style={styles.mapWeatherText}>78°F · ETo 0.22"</Text>
                    </View>
                  </View>

                  {/* Aerial Field Satellite Canvas */}
                  <View style={styles.satelliteCanvas}>
                    <View style={styles.satelliteGridLines}>
                      <View style={styles.satelliteHeaderBadge}>
                        <MaterialCommunityIcons name="satellite-variant" size={14} color="#0C6054" />
                        <Text style={styles.satelliteWaterMark}>RE-NU BIOME SATELLITE FIELD PLOT</Text>
                      </View>

                      {/* Blocks Grid Visual */}
                      <View style={styles.mapBlocksRow}>
                        {rBlocks.map((blk: any, bIdx: number) => {
                          return (
                            <TouchableOpacity
                              key={blk.blockId || bIdx}
                              style={styles.mapBlockCard}
                              onPress={() => handleOpenBlockDetail(currentRanch, blk)}
                              activeOpacity={0.85}
                            >
                              <View style={styles.mapBlockHeader}>
                                <View style={styles.mapBlockBadge}>
                                  <Text style={styles.mapBlockBadgeText}>{blk.blockId}</Text>
                                </View>
                                <Text style={styles.mapBlockAcres}>{blk.acreage} Ac</Text>
                              </View>
                              <Text style={styles.mapBlockCrop}>{blk.crop}</Text>
                              <Text style={styles.mapBlockVariety}>{blk.variety}</Text>
                              <View style={styles.mapBlockFooter}>
                                <View style={styles.mapStatusDot} />
                                <Text style={styles.mapBlockStatusText}>Optimal Vigor · Tap for Lab</Text>
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      {/* Tanks On Map Layer */}
                      <View style={styles.mapTanksLayer}>
                        <Text style={styles.mapTanksTitle}>Otodata Telemetry Tank Stations on Field:</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                          {rTanks.map((tank: any, tIdx: number) => {
                            const isLow = (tank.levelPercent || 68) < 25;
                            return (
                              <TouchableOpacity
                                key={tank.id || tIdx}
                                style={[styles.mapTankPin, isLow && styles.mapTankPinLow]}
                                onPress={() => {
                                  setSelectedTelemetryTank(tank);
                                  setSelectedTelemetryRanch(currentRanch);
                                  setTelemetryModalVisible(true);
                                }}
                              >
                                <View style={[styles.mapTankDot, isLow && styles.mapTankDotLow]}>
                                  <MaterialCommunityIcons
                                    name="water-pump"
                                    size={16}
                                    color={isLow ? '#DC2626' : '#0C6054'}
                                  />
                                </View>
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.mapTankName}>{tank.name}</Text>
                                  <Text style={[styles.mapTankLevel, isLow && { color: '#DC2626' }]}>
                                    {tank.levelPercent || 68}% · {(tank.currentGallons || 3400).toLocaleString()} Gal
                                  </Text>
                                </View>
                                <MaterialCommunityIcons name="remote" size={14} color="#0C6054" />
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })()}
          </View>
        ) : loading && !refreshing ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={BRAND_COLORS.primaryTeal} />
            <Text style={{ marginTop: 12, color: '#64748B' }}>Loading ranches & telemetry...</Text>
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
            const computedAcres = blocks.reduce((s: number, b: any) => s + (Number(b.acreage) || 0), 0);
            const ranchPrograms = programs.filter(
              (p: any) => p.ranchId === ranch.id || (!p.ranchId && ranch.name.includes('Sierra'))
            );

            return (
              <View key={ranch.id} style={styles.ranchSection}>
                {/* Ranch Card Banner */}
                <View style={styles.ranchBanner}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ranchTitle}>{ranch.name}</Text>
                    <Text style={styles.ranchCountyText}>
                      <MaterialCommunityIcons name="map-marker-outline" size={14} color="#64748B" />{' '}
                      {ranch.county} County, California
                    </Text>
                  </View>
                  <View style={styles.acreageBadge}>
                    <Text style={styles.acreageNumber}>{computedAcres.toLocaleString()}</Text>
                    <Text style={styles.acreageUnit}>Acres</Text>
                  </View>
                </View>

                {/* Nutrition Programs for this Ranch (Phase 2 - Section 4) */}
                {ranchPrograms.map((prog: any) => {
                  const delivered = prog.deliveredGallons || 4800;
                  const planned = prog.plannedGallons || 28000;
                  const pct = Math.min(100, Math.round((delivered / planned) * 100));

                  return (
                    <View key={prog.id} style={styles.programBanner}>
                      <View style={styles.progHeaderRow}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                            <MaterialCommunityIcons name="sprout" size={16} color={BRAND_COLORS.primaryTeal} />
                            <Text style={styles.progBadgeText}>ANNUAL NUTRITION PROGRAM</Text>
                          </View>
                          <Text style={styles.progTitle}>{prog.name || '2027 Almond Nutrition Program'}</Text>
                          <Text style={styles.progSubtitle}>
                            Crop: {prog.crop || 'Almond'} · Units: {prog.nUnitsPerAcre || 180} lb N/ac · {prog.k2oUnitsPerAcre || 200} lb K2O/ac
                          </Text>
                        </View>
                        <Chip style={styles.activePill} textStyle={styles.activePillText} compact>
                          Active
                        </Chip>
                      </View>

                      <View style={{ marginTop: 10 }}>
                        <View style={styles.progBarMetaRow}>
                          <Text style={styles.progProgressLabel}>Season Delivery Progress</Text>
                          <Text style={styles.progProgressPct}>{pct}%</Text>
                        </View>
                        <ProgressBar
                          progress={delivered / planned}
                          color={BRAND_COLORS.primaryTeal}
                          style={styles.progProgressBar}
                        />
                        <View style={styles.progStatsRow}>
                          <Text style={styles.progStatsText}>
                            {delivered.toLocaleString()} / {planned.toLocaleString()} Gallons Delivered
                          </Text>
                          <Text style={styles.progBufferText}>Includes 6% N-loss buffer</Text>
                        </View>
                      </View>
                    </View>
                  );
                })}

                {/* Blocks Table Header Row & Actions */}
                <View style={styles.blocksHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialCommunityIcons name="view-grid-outline" size={18} color="#0F172A" style={{ marginRight: 6 }} />
                    <Text style={styles.blocksSectionTitle}>
                      Blocks ({blocks.length})
                    </Text>
                  </View>
                  <View style={styles.blockActionsRow}>
                    <TouchableOpacity
                      onPress={() => {
                        setImportRanch(ranch);
                        setCsvContent(
                          'blockId,crop,variety,rootstock,acreage,plantingYear,irrigationType,fertigationSet,county,apns\n' +
                          'Block-10,Almond,Nonpareil,Nemaguard,80,2021,Drip,Set 1,Fresno,045-120-010'
                        );
                        setImportErrors([]);
                        setImportModalVisible(true);
                      }}
                      style={styles.actionPill}
                    >
                      <MaterialCommunityIcons name="file-upload-outline" size={14} color={BRAND_COLORS.primaryTeal} />
                      <Text style={styles.actionPillText}>Import CSV</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleExportCSV(ranch)}
                      style={styles.actionPill}
                    >
                      <MaterialCommunityIcons name="file-download-outline" size={14} color={BRAND_COLORS.primaryTeal} />
                      <Text style={styles.actionPillText}>Export CSV</Text>
                    </TouchableOpacity>

                    {isAdmin && (
                      <TouchableOpacity
                        onPress={() => {
                          setTargetRanchForBlock(ranch);
                          setBlkCounty(ranch.county);
                          setAddBlockModalVisible(true);
                        }}
                        style={[styles.actionPill, { backgroundColor: BRAND_COLORS.primaryTeal }]}
                      >
                        <MaterialCommunityIcons name="plus" size={14} color="#FFFFFF" />
                        <Text style={[styles.actionPillText, { color: '#FFFFFF' }]}>Add Block</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Blocks Table */}
                {blocks.length === 0 ? (
                  <View style={styles.noItemsBox}>
                    <Text style={styles.noItemsText}>No planted blocks added yet.</Text>
                  </View>
                ) : (
                  <View style={styles.tableContainer}>
                    <View style={styles.tableHeaderRow}>
                      <Text style={[styles.tableColHeader, { flex: 1.2 }]}>Block ID</Text>
                      <Text style={[styles.tableColHeader, { flex: 2.2 }]}>Crop & Variety</Text>
                      <Text style={[styles.tableColHeader, { flex: 1.2, textAlign: 'right' }]}>Acres</Text>
                      <Text style={[styles.tableColHeader, { flex: 1.2, textAlign: 'right' }]}>Planted</Text>
                    </View>

                    {blocks.map((b: any, idx: number) => {
                      const isLast = idx === blocks.length - 1;
                      const hasSample = samples.some((s) => s.blockId === b.blockId);

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
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={styles.cropVarietyText} numberOfLines={1}>
                                {b.crop} · {b.variety}
                              </Text>
                              {hasSample && (
                                <View style={styles.sampleDot} />
                              )}
                            </View>
                            <Text style={styles.rootstockText} numberOfLines={1}>
                              Root: {b.rootstock || 'Std'} · Set: {b.fertigationSet || '1'}
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

                {/* Otodata Monitored Tanks Register (Phase 2 - Section 3) */}
                <View style={[styles.blocksHeaderRow, { marginTop: 22 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialCommunityIcons name="water-pump" size={18} color="#0F172A" style={{ marginRight: 6 }} />
                    <Text style={styles.blocksSectionTitle}>
                      Otodata Monitored Tanks ({tanks.length})
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setTargetRanchForTank(ranch);
                      setAddTankModalVisible(true);
                    }}
                    style={styles.addInlineBtn}
                  >
                    <MaterialCommunityIcons name="plus-circle-outline" size={16} color={BRAND_COLORS.primaryTeal} />
                    <Text style={styles.addInlineBtnText}>Add Tank</Text>
                  </TouchableOpacity>
                </View>

                {tanks.length === 0 ? (
                  <View style={styles.noItemsBox}>
                    <Text style={styles.noItemsText}>No injection tanks registered.</Text>
                  </View>
                ) : (
                  <View style={styles.tanksContainer}>
                    {tanks.map((tank: any, tIdx: number) => {
                      const level = tank.levelPercent || 68;
                      const isLow = level < 25;
                      const barColor = isLow ? '#DC2626' : level < 50 ? BRAND_COLORS.accentOrange : BRAND_COLORS.primaryTeal;

                      return (
                        <View key={tank.id || tIdx} style={[styles.tankCard, isLow && styles.tankCardLow]}>
                          <View style={styles.tankCardHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                              <View style={[styles.tankIconBox, { backgroundColor: isLow ? '#FEF2F2' : '#F0FDFA' }]}>
                                <MaterialCommunityIcons
                                  name="water-pump"
                                  size={22}
                                  color={isLow ? '#DC2626' : BRAND_COLORS.primaryTeal}
                                />
                              </View>
                              <View style={{ marginLeft: 12, flex: 1 }}>
                                <Text style={styles.tankName} numberOfLines={1}>{tank.name || `Tank #${tIdx + 1}`}</Text>
                                <Text style={styles.tankLocation} numberOfLines={1}>
                                  {tank.location || 'Injection Station'} · Cellular: <Text style={{ fontWeight: '600' }}>{tank.serial || 'OTO-99214'}</Text>
                                </Text>
                              </View>
                            </View>

                            <View style={{ alignItems: 'flex-end' }}>
                              <Text style={[styles.tankLevelPct, { color: barColor }]}>{level}%</Text>
                              <Text style={styles.tankCapacityMeta}>
                                {(tank.currentGallons || 3400).toLocaleString()} / {(tank.capacityGallons || tank.capacity || 5000).toLocaleString()} Gal
                              </Text>
                            </View>
                          </View>

                          {/* Level Progress Bar */}
                          <ProgressBar progress={level / 100} color={barColor} style={styles.tankProgressBar} />

                          {/* Telemetry Metrics Row */}
                          <View style={styles.telemetryMetricsRow}>
                            <Text style={styles.telemetryMetricItem}>
                              Pressure: <Text style={{ fontWeight: '700', color: '#0F172A' }}>{tank.pressurePsi || 42} PSI</Text>
                            </Text>
                            <Text style={styles.telemetryMetricItem}>
                              14-Day Usage: <Text style={{ fontWeight: '700', color: '#0F172A' }}>{tank.usageRate14d || 480} Gal/Wk</Text>
                            </Text>
                            <Text style={styles.telemetryMetricItem}>
                              Days to Empty: <Text style={{ fontWeight: '700', color: isLow ? '#DC2626' : '#0F172A' }}>~{tank.daysToEmpty || 50} Days</Text>
                            </Text>
                          </View>

                          {/* Tank Pills Summary (Medicines, Trackers, Reports) */}
                          <View style={styles.tankSummaryPillsRow}>
                            <View style={styles.tankPill}>
                              <MaterialCommunityIcons name="pill" size={13} color="#0D9488" />
                              <Text style={styles.tankPillText}>
                                {tank.medicines?.length || 0} Medicines
                              </Text>
                            </View>
                            <View style={styles.tankPill}>
                              <MaterialCommunityIcons name="satellite-variant" size={13} color="#2563EB" />
                              <Text style={styles.tankPillText}>
                                {tank.trackers?.length || 1} Tracker
                              </Text>
                            </View>
                            <View style={styles.tankPill}>
                              <MaterialCommunityIcons name="file-document-outline" size={13} color="#7C3AED" />
                              <Text style={styles.tankPillText}>
                                {tank.reports?.length || 0} Reports
                              </Text>
                            </View>
                          </View>

                          {/* Tank Actions: Hub & Live Feed */}
                          <View style={styles.tankActionsRow}>
                            <TouchableOpacity
                              style={styles.tankHubBtn}
                              onPress={() => handleOpenTankHub(ranch, tank)}
                            >
                              <MaterialCommunityIcons name="layers-outline" size={14} color="#FFFFFF" />
                              <Text style={styles.tankHubBtnText}>Tank Hub (Medicines, Trackers, Reports)</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.openTelemetryBtn}
                              onPress={() => {
                                setSelectedTelemetryTank(tank);
                                setSelectedTelemetryRanch(ranch);
                                setTelemetryModalVisible(true);
                              }}
                            >
                              <MaterialCommunityIcons name="remote" size={14} color="#0C6054" />
                              <Text style={styles.openTelemetryBtnText}>Live Feed</Text>
                            </TouchableOpacity>
                          </View>

                          {/* Low-Tank Alert Action */}
                          {isLow && (
                            <View style={styles.tankLowAlertStrip}>
                              <MaterialCommunityIcons name="alert-circle" size={16} color="#DC2626" />
                              <Text style={styles.tankLowAlertText}>
                                Tank level is below 25% threshold. Refill recommended.
                              </Text>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Block Detail & Lab Recommendations Modal */}
      <Modal visible={blockModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedBlock && (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
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

                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
                  {/* Specifications */}
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
                      <Text style={styles.detailValue}>{selectedBlock.rootstock || 'Nemaguard'}</Text>
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

                  {/* APNs */}
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

                  <Divider style={{ marginVertical: 14 }} />

                  {/* Lab Assays & UC Reference Ranges (Phase 2 - Section 5) */}
                  <View style={styles.labSection}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                      <MaterialCommunityIcons name="flask-round-bottom" size={20} color={BRAND_COLORS.primaryTeal} style={{ marginRight: 6 }} />
                      <Text style={styles.sectionHeaderTitle}>Soil & Leaf Tissue Assays</Text>
                    </View>

                    {(() => {
                      const blockSamples = samples.filter((s) => s.blockId === selectedBlock.blockId);
                      if (blockSamples.length === 0) {
                        return (
                          <View style={styles.emptySampleBox}>
                            <Text style={styles.emptySampleText}>
                              No laboratory assays submitted yet for {selectedBlock.blockId}.
                            </Text>
                            <Button
                              mode="outlined"
                              textColor={BRAND_COLORS.primaryTeal}
                              style={{ borderColor: BRAND_COLORS.primaryTeal, marginTop: 8 }}
                              onPress={() => {
                                setSampleRanchId(selectedBlockRanch?.id);
                                setSampleBlockId(selectedBlock.blockId);
                                setSampleModalVisible(true);
                              }}
                            >
                              Send Lab Results for this Block
                            </Button>
                          </View>
                        );
                      }

                      return blockSamples.map((sample: any) => (
                        <View key={sample.id} style={styles.sampleCard}>
                          <View style={styles.sampleCardHeader}>
                            <View>
                              <Text style={styles.sampleCardTitle}>
                                {sample.sampleType} · {sample.samplingDate}
                              </Text>
                              <Text style={styles.sampleCardLab}>
                                Lab: {sample.labName} · ID: {sample.id}
                              </Text>
                            </View>
                            <Chip style={styles.sampleStatusChip} textStyle={styles.sampleStatusChipText} compact>
                              {sample.status}
                            </Chip>
                          </View>

                          {sample.customerNotes ? (
                            <Text style={styles.sampleNotesText}>
                              "{sample.customerNotes}"
                            </Text>
                          ) : null}

                          {/* Attached Lab Document (Any Format) */}
                          {(sample.pdfData || sample.pdfUrl || sample.pdfFileName) && (
                            <View style={styles.sampleDocStrip}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                                <MaterialCommunityIcons
                                  name={
                                    sample.pdfFileName?.match(/\.(png|jpg|jpeg|webp)$/i) ? 'file-image' :
                                    sample.pdfFileName?.match(/\.(xls|xlsx|csv)$/i) ? 'file-excel' :
                                    sample.pdfFileName?.match(/\.(doc|docx)$/i) ? 'file-word' : 'file-pdf-box'
                                  }
                                  size={18}
                                  color={BRAND_COLORS.primaryTeal}
                                />
                                <Text style={styles.sampleDocName} numberOfLines={1}>
                                  {sample.pdfFileName || 'Lab_Assay_Report.pdf'}
                                </Text>
                              </View>
                              <TouchableOpacity
                                style={styles.viewDocBadgeBtn}
                                onPress={() => handleOpenDocument(sample.pdfData || sample.pdfUrl, sample.pdfFileName)}
                              >
                                <MaterialCommunityIcons name="open-in-new" size={14} color="#0C6054" />
                                <Text style={styles.viewDocBadgeText}>View Document</Text>
                              </TouchableOpacity>
                            </View>
                          )}

                          {/* UC Reference Ranges Comparison Table */}
                          {sample.values && (
                            <View style={styles.ucTable}>
                              <Text style={styles.ucTableTitle}>UC Reference Ranges (Almond July Leaf):</Text>
                              <View style={styles.ucTableRowHeader}>
                                <Text style={[styles.ucCol, { flex: 1.5 }]}>Nutrient</Text>
                                <Text style={[styles.ucCol, { flex: 1.2 }]}>Assay</Text>
                                <Text style={[styles.ucCol, { flex: 1.8 }]}>UC Standard</Text>
                                <Text style={[styles.ucCol, { flex: 1.2, textAlign: 'right' }]}>Status</Text>
                              </View>

                              {/* Nitrogen */}
                              <View style={styles.ucTableRow}>
                                <Text style={[styles.ucCell, { flex: 1.5 }]}>Nitrogen (N)</Text>
                                <Text style={[styles.ucCell, { flex: 1.2, fontWeight: '700' }]}>{sample.values.nitrogenPct || '2.15'}%</Text>
                                <Text style={[styles.ucCell, { flex: 1.8, color: '#64748B' }]}>2.2 - 2.5%</Text>
                                <View style={{ flex: 1.2, alignItems: 'flex-end' }}>
                                  <View style={[styles.statusTag, { backgroundColor: '#FEE2E2' }]}>
                                    <Text style={[styles.statusTagText, { color: '#B91C1C' }]}>Low</Text>
                                  </View>
                                </View>
                              </View>

                              {/* Potassium */}
                              <View style={styles.ucTableRow}>
                                <Text style={[styles.ucCell, { flex: 1.5 }]}>Potassium (K)</Text>
                                <Text style={[styles.ucCell, { flex: 1.2, fontWeight: '700' }]}>{sample.values.potassiumPct || '1.15'}%</Text>
                                <Text style={[styles.ucCell, { flex: 1.8, color: '#64748B' }]}>1.4 - 2.0%</Text>
                                <View style={{ flex: 1.2, alignItems: 'flex-end' }}>
                                  <View style={[styles.statusTag, { backgroundColor: '#FEE2E2' }]}>
                                    <Text style={[styles.statusTagText, { color: '#B91C1C' }]}>Low</Text>
                                  </View>
                                </View>
                              </View>

                              {/* Calcium */}
                              <View style={styles.ucTableRow}>
                                <Text style={[styles.ucCell, { flex: 1.5 }]}>Calcium (Ca)</Text>
                                <Text style={[styles.ucCell, { flex: 1.2, fontWeight: '700' }]}>{sample.values.calciumPct || '2.45'}%</Text>
                                <Text style={[styles.ucCell, { flex: 1.8, color: '#64748B' }]}>&gt;2.0%</Text>
                                <View style={{ flex: 1.2, alignItems: 'flex-end' }}>
                                  <View style={[styles.statusTag, { backgroundColor: '#DCFCE7' }]}>
                                    <Text style={[styles.statusTagText, { color: '#15803D' }]}>Adequate</Text>
                                  </View>
                                </View>
                              </View>

                              {/* Boron */}
                              <View style={styles.ucTableRow}>
                                <Text style={[styles.ucCell, { flex: 1.5 }]}>Boron (B)</Text>
                                <Text style={[styles.ucCell, { flex: 1.2, fontWeight: '700' }]}>{sample.values.boronPpm || '42'} ppm</Text>
                                <Text style={[styles.ucCell, { flex: 1.8, color: '#64748B' }]}>30 - 65 ppm</Text>
                                <View style={{ flex: 1.2, alignItems: 'flex-end' }}>
                                  <View style={[styles.statusTag, { backgroundColor: '#DCFCE7' }]}>
                                    <Text style={[styles.statusTagText, { color: '#15803D' }]}>Adequate</Text>
                                  </View>
                                </View>
                              </View>

                              {/* Zinc */}
                              <View style={[styles.ucTableRow, { borderBottomWidth: 0 }]}>
                                <Text style={[styles.ucCell, { flex: 1.5 }]}>Zinc (Zn)</Text>
                                <Text style={[styles.ucCell, { flex: 1.2, fontWeight: '700' }]}>{sample.values.zincPpm || '18'} ppm</Text>
                                <Text style={[styles.ucCell, { flex: 1.8, color: '#64748B' }]}>&gt;15 ppm</Text>
                                <View style={{ flex: 1.2, alignItems: 'flex-end' }}>
                                  <View style={[styles.statusTag, { backgroundColor: '#DCFCE7' }]}>
                                    <Text style={[styles.statusTagText, { color: '#15803D' }]}>Adequate</Text>
                                  </View>
                                </View>
                              </View>
                            </View>
                          )}

                          {/* Custom Recommendation */}
                          {sample.recommendation && (
                            <View style={styles.recBox}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                <MaterialCommunityIcons name="certificate" size={16} color={BRAND_COLORS.primaryTeal} />
                                <Text style={styles.recTitle}>Agronomist Prescription</Text>
                              </View>
                              <Text style={styles.recText}>{sample.recommendation.prescription}</Text>
                              <Text style={styles.recMeta}>
                                By {sample.recommendation.agronomistName} · {sample.recommendation.date}
                              </Text>

                              {/* Accept Prescription & Request Delivery (Deferred: recommendations & ordering) */}
                              <TouchableOpacity
                                style={styles.acceptPrescriptionBtn}
                                onPress={() => {
                                  setBlockModalVisible(false);
                                  navigation.navigate('Deliveries', {
                                    autoOpenOrder: true,
                                    prefillProduct: 'ReNu N-CARE 32-0-0',
                                    prefillRanchId: selectedBlockRanch?.id,
                                    prefillTankId: selectedBlockRanch?.tanks?.[0]?.id,
                                  });
                                }}
                              >
                                <MaterialCommunityIcons name="cart-plus" size={16} color="#FFFFFF" />
                                <Text style={styles.acceptPrescriptionBtnText}>
                                  Accept Prescription & Schedule Refill
                                </Text>
                              </TouchableOpacity>

                              {/* Conversation / Reply Thread */}
                              {sample.recommendation.replies?.map((r: any, rIdx: number) => (
                                <View key={rIdx} style={styles.replyBubble}>
                                  <Text style={styles.replyAuthor}>{r.sender}:</Text>
                                  <Text style={styles.replyContent}>{r.message}</Text>
                                </View>
                              ))}

                              {/* Reply Input */}
                              <View style={styles.replyInputRow}>
                                <TextInput
                                  placeholder="Ask agronomist follow-up..."
                                  value={replyText}
                                  onChangeText={setReplyText}
                                  style={styles.replyInput}
                                  mode="outlined"
                                  outlineColor="#CBD5E1"
                                  activeOutlineColor={BRAND_COLORS.primaryTeal}
                                  dense
                                />
                                <Button
                                  mode="contained"
                                  buttonColor={BRAND_COLORS.primaryTeal}
                                  loading={submittingReply}
                                  onPress={() => handleReplyToRecommendation(sample.id)}
                                  style={{ borderRadius: 8 }}
                                >
                                  Reply
                                </Button>
                              </View>
                            </View>
                          )}
                        </View>
                      ));
                    })()}
                  </View>

                  <Divider style={{ marginVertical: 14 }} />

                  {/* Delivery History for this Block */}
                  <View style={styles.timelineSection}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                      <MaterialCommunityIcons name="timeline-clock-outline" size={20} color={BRAND_COLORS.primaryTeal} style={{ marginRight: 6 }} />
                      <Text style={styles.sectionHeaderTitle}>Delivery History for this Block</Text>
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
                              {(del.deliveredGallons || del.gallons)?.toLocaleString()} Gallons · Status: {del.status}
                            </Text>
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

      {/* Send Lab Results Modal (Phase 2 - Section 5.1) */}
      <Modal visible={sampleModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialCommunityIcons name="flask-outline" size={24} color={BRAND_COLORS.primaryTeal} />
                <Text style={styles.formTitle}>Submit Lab Assay Results</Text>
              </View>
              <TouchableOpacity onPress={() => setSampleModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <Text style={styles.formLabel}>Select Planted Ranch *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {ranches.map((r) => {
                  const sel = sampleRanchId === r.id;
                  return (
                    <TouchableOpacity
                      key={r.id}
                      onPress={() => {
                        setSampleRanchId(r.id);
                        if (r.blocks && r.blocks.length > 0) {
                          setSampleBlockId(r.blocks[0].blockId);
                        }
                      }}
                      style={[styles.selectorChip, sel && styles.selectorChipActive]}
                    >
                      <Text style={[styles.selectorChipText, sel && styles.selectorChipTextActive]}>
                        {r.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={styles.formLabel}>Select Planted Block *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {(ranches.find((r) => r.id === sampleRanchId)?.blocks || []).map((b: any) => {
                  const sel = sampleBlockId === b.blockId;
                  return (
                    <TouchableOpacity
                      key={b.blockId}
                      onPress={() => setSampleBlockId(b.blockId)}
                      style={[styles.selectorChip, sel && styles.selectorChipActive]}
                    >
                      <Text style={[styles.selectorChipText, sel && styles.selectorChipTextActive]}>
                        {b.blockId} ({b.crop})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={styles.formLabel}>Sample Type *</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {['Leaf tissue', 'Soil sample', 'Petiole', 'Irrigation water'].map((t) => {
                  const sel = sampleType === t;
                  return (
                    <TouchableOpacity
                      key={t}
                      onPress={() => setSampleType(t)}
                      style={[styles.selectorChip, sel && styles.selectorChipActive]}
                    >
                      <Text style={[styles.selectorChipText, sel && styles.selectorChipTextActive]}>{t}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TextInput
                label="Sampling Date (YYYY-MM-DD) *"
                value={sampleDate}
                onChangeText={setSampleDate}
                mode="outlined"
                style={styles.input}
                outlineColor="#CBD5E1"
                activeOutlineColor={BRAND_COLORS.primaryTeal}
              />

              <TextInput
                label="Testing Laboratory Name *"
                value={sampleLabName}
                onChangeText={setSampleLabName}
                mode="outlined"
                style={styles.input}
                outlineColor="#CBD5E1"
                activeOutlineColor={BRAND_COLORS.primaryTeal}
              />

              <TextInput
                label="Assay Notes / Key Findings"
                value={sampleNotes}
                onChangeText={setSampleNotes}
                mode="outlined"
                multiline
                numberOfLines={3}
                style={[styles.input, { height: 75 }]}
                outlineColor="#CBD5E1"
                activeOutlineColor={BRAND_COLORS.primaryTeal}
                placeholder="e.g. July almond leaf analysis from Dellavalle. Noted yellowing on lower leaves."
              />

              {/* Attach Document of Result (Any format) */}
              <Text style={styles.formLabel}>Attach Document of Result (Any Format) *</Text>
              {sampleDocument ? (
                <View style={styles.attachedDocCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 }}>
                    <View style={styles.docIconBox}>
                      <MaterialCommunityIcons
                        name={
                          sampleDocument.name.endsWith('.pdf') ? 'file-pdf-box' :
                          sampleDocument.name.match(/\.(png|jpg|jpeg|webp)$/i) ? 'file-image' :
                          sampleDocument.name.match(/\.(xls|xlsx|csv)$/i) ? 'file-excel' :
                          sampleDocument.name.match(/\.(doc|docx)$/i) ? 'file-word' : 'file-document-outline'
                        }
                        size={28}
                        color={BRAND_COLORS.primaryTeal}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.docFileName} numberOfLines={1}>
                        {sampleDocument.name}
                      </Text>
                      <Text style={styles.docFileSize}>{sampleDocument.size}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                    <TouchableOpacity
                      onPress={() => pickFile(setSampleDocument)}
                      style={styles.changeDocBtn}
                    >
                      <Text style={styles.changeDocBtnText}>Change</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setSampleDocument(null)}
                      style={styles.removeDocBtn}
                    >
                      <MaterialCommunityIcons name="close-circle" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => pickFile(setSampleDocument)}
                  style={styles.docUploadDashedBox}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="cloud-upload-outline" size={28} color={BRAND_COLORS.primaryTeal} />
                  <Text style={styles.docUploadTitle}>Upload Result Document (Any Format)</Text>
                  <Text style={styles.docUploadSubtitle}>
                    Accepts PDF, Word documents (.doc/.docx), Excel spreadsheets (.xls/.xlsx), CSV, images (.png/.jpg), or text files
                  </Text>
                </TouchableOpacity>
              )}

              <View style={styles.modalButtonsRow}>
                <Button
                  mode="outlined"
                  onPress={() => setSampleModalVisible(false)}
                  style={styles.cancelBtn}
                  textColor="#64748B"
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleSubmitSample}
                  loading={submittingSample}
                  style={styles.submitBtn}
                  buttonColor={BRAND_COLORS.primaryTeal}
                >
                  Submit Lab Results
                </Button>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Import Blocks CSV Modal (Section A11) */}
      <Modal visible={importModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialCommunityIcons name="file-delimited-outline" size={24} color={BRAND_COLORS.primaryTeal} />
                <Text style={styles.formTitle}>Import Blocks (CSV)</Text>
              </View>
              <TouchableOpacity onPress={() => setImportModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.formSubtitle}>
              Target: <Text style={{ fontWeight: '700' }}>{importRanch?.name}</Text>. Paste CSV rows below with header:
            </Text>
            <Text style={styles.codeSnippet}>
              blockId,crop,variety,rootstock,acreage,plantingYear,irrigationType,fertigationSet,county,apns
            </Text>

            <TextInput
              value={csvContent}
              onChangeText={setCsvContent}
              mode="outlined"
              multiline
              numberOfLines={8}
              style={[styles.input, { height: 160, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 12 }]}
              outlineColor="#CBD5E1"
              activeOutlineColor={BRAND_COLORS.primaryTeal}
            />

            {importErrors.length > 0 && (
              <View style={styles.importErrorBox}>
                <Text style={styles.importErrorTitle}>Validation Errors:</Text>
                {importErrors.map((err, i) => (
                  <Text key={i} style={styles.importErrorItem}>
                    • {err}
                  </Text>
                ))}
              </View>
            )}

            <View style={styles.modalButtonsRow}>
              <Button
                mode="outlined"
                onPress={() => setImportModalVisible(false)}
                style={styles.cancelBtn}
                textColor="#64748B"
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleImportCSV}
                loading={importing}
                style={styles.submitBtn}
                buttonColor={BRAND_COLORS.primaryTeal}
              >
                Validate & Import
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Ranch Modal */}
      <Modal visible={addRanchModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.formTitle}>Add New Ranch</Text>
            <Text style={styles.formSubtitle}>
              Ranch acreage is strictly computed from its planted blocks.
            </Text>

            <TextInput
              label="Ranch Name *"
              value={newRanchName}
              onChangeText={setNewRanchName}
              mode="outlined"
              style={styles.input}
              outlineColor="#CBD5E1"
              activeOutlineColor={BRAND_COLORS.primaryTeal}
            />
            <TextInput
              label="County *"
              value={newRanchCounty}
              onChangeText={setNewRanchCounty}
              mode="outlined"
              style={styles.input}
              outlineColor="#CBD5E1"
              activeOutlineColor={BRAND_COLORS.primaryTeal}
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
                buttonColor={BRAND_COLORS.primaryTeal}
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
            <Text style={styles.formTitle}>Add Block to {targetRanchForBlock?.name}</Text>
            <Text style={styles.formSubtitle}>Enter planted field unit specifications.</Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              <TextInput
                label="Block ID (e.g. Block-10) *"
                value={blkId}
                onChangeText={setBlkId}
                mode="outlined"
                style={styles.input}
                outlineColor="#CBD5E1"
                activeOutlineColor={BRAND_COLORS.primaryTeal}
              />
              <TextInput
                label="Crop (Almond, Pistachio, Grape) *"
                value={blkCrop}
                onChangeText={setBlkCrop}
                mode="outlined"
                style={styles.input}
                outlineColor="#CBD5E1"
                activeOutlineColor={BRAND_COLORS.primaryTeal}
              />
              <TextInput
                label="Variety (e.g. Nonpareil, Golden Hills) *"
                value={blkVariety}
                onChangeText={setBlkVariety}
                mode="outlined"
                style={styles.input}
                outlineColor="#CBD5E1"
                activeOutlineColor={BRAND_COLORS.primaryTeal}
              />
              <TextInput
                label="Rootstock (e.g. Nemaguard, UCB-1)"
                value={blkRootstock}
                onChangeText={setBlkRootstock}
                mode="outlined"
                style={styles.input}
                outlineColor="#CBD5E1"
                activeOutlineColor={BRAND_COLORS.primaryTeal}
              />
              <TextInput
                label="Acreage (Acres) *"
                value={blkAcres}
                onChangeText={setBlkAcres}
                keyboardType="numeric"
                mode="outlined"
                style={styles.input}
                outlineColor="#CBD5E1"
                activeOutlineColor={BRAND_COLORS.primaryTeal}
              />
              <TextInput
                label="Planting Year"
                value={blkPlantingYear}
                onChangeText={setBlkPlantingYear}
                keyboardType="numeric"
                mode="outlined"
                style={styles.input}
                outlineColor="#CBD5E1"
                activeOutlineColor={BRAND_COLORS.primaryTeal}
              />
              <TextInput
                label="Irrigation (Drip, Micro-Sprinkler)"
                value={blkIrrigation}
                onChangeText={setBlkIrrigation}
                mode="outlined"
                style={styles.input}
                outlineColor="#CBD5E1"
                activeOutlineColor={BRAND_COLORS.primaryTeal}
              />
              <TextInput
                label="Fertigation Set (e.g. Set 1, Set 2)"
                value={blkFertigationSet}
                onChangeText={setBlkFertigationSet}
                mode="outlined"
                style={styles.input}
                outlineColor="#CBD5E1"
                activeOutlineColor={BRAND_COLORS.primaryTeal}
              />
              <TextInput
                label="APNs (Comma-separated, e.g. 045-120-001)"
                value={blkApns}
                onChangeText={setBlkApns}
                mode="outlined"
                style={styles.input}
                outlineColor="#CBD5E1"
                activeOutlineColor={BRAND_COLORS.primaryTeal}
              />

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
                  buttonColor={BRAND_COLORS.primaryTeal}
                >
                  Add Block
                </Button>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Tank Modal */}
      <Modal visible={addTankModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.formTitle}>Register Injection Tank</Text>
            <Text style={styles.formSubtitle}>
              Add an Otodata monitored tank to {targetRanchForTank?.name}.
            </Text>

            <TextInput
              label="Tank Name (e.g. Tank T-103) *"
              value={tankName}
              onChangeText={setTankName}
              mode="outlined"
              style={styles.input}
              outlineColor="#CBD5E1"
              activeOutlineColor={BRAND_COLORS.primaryTeal}
            />
            <TextInput
              label="Capacity (Gallons) *"
              value={tankCapacity}
              onChangeText={setTankCapacity}
              keyboardType="numeric"
              mode="outlined"
              style={styles.input}
              outlineColor="#CBD5E1"
              activeOutlineColor={BRAND_COLORS.primaryTeal}
            />
            <TextInput
              label="Location / Injection Station"
              value={tankLocation}
              onChangeText={setTankLocation}
              mode="outlined"
              style={styles.input}
              outlineColor="#CBD5E1"
              activeOutlineColor={BRAND_COLORS.primaryTeal}
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
                buttonColor={BRAND_COLORS.primaryTeal}
              >
                Register Tank
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* ==================== OTODATA TELEMETRY MODAL (Deferred: telemetry) ==================== */}
      <Modal visible={telemetryModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedTelemetryTank && (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <MaterialCommunityIcons name="remote" size={16} color="#0C6054" />
                      <Text style={styles.modalSub}>Otodata Cellular Telemetry Feed</Text>
                    </View>
                    <Text style={styles.modalTitle}>{selectedTelemetryTank.name}</Text>
                    <Text style={styles.telemetryRanchSub}>
                      {selectedTelemetryRanch?.name} · Serial #{selectedTelemetryTank.serial || 'OTO-99214'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setTelemetryModalVisible(false)}
                    style={styles.modalCloseBtn}
                  >
                    <MaterialCommunityIcons name="close" size={24} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
                  {/* Cellular Sensor Status Strip */}
                  <View style={styles.telemetryStatusStrip}>
                    <View style={styles.telemetryChip}>
                      <MaterialCommunityIcons name="signal-cellular-3" size={14} color="#15803D" />
                      <Text style={styles.telemetryChipText}>LTE-M Online (-74 dBm)</Text>
                    </View>
                    <View style={styles.telemetryChip}>
                      <MaterialCommunityIcons name="battery-90" size={14} color="#15803D" />
                      <Text style={styles.telemetryChipText}>Battery: 98% (Solar Active)</Text>
                    </View>
                    <View style={styles.telemetryChip}>
                      <MaterialCommunityIcons name="thermometer" size={14} color="#0C6054" />
                      <Text style={styles.telemetryChipText}>Temp: 74°F · 42 PSI</Text>
                    </View>
                  </View>

                  {/* Big Fill Gauge Card */}
                  <View style={styles.telemetryGaugeCard}>
                    <Text style={styles.gaugeLabel}>CURRENT INVENTORY LEVEL</Text>
                    <Text style={[styles.gaugePct, { color: (selectedTelemetryTank.levelPercent || 68) < 25 ? '#DC2626' : '#0C6054' }]}>
                      {selectedTelemetryTank.levelPercent || 68}%
                    </Text>
                    <ProgressBar
                      progress={(selectedTelemetryTank.levelPercent || 68) / 100}
                      color={(selectedTelemetryTank.levelPercent || 68) < 25 ? '#DC2626' : '#0C6054'}
                      style={styles.gaugeBar}
                    />
                    <View style={styles.gaugeMetaRow}>
                      <Text style={styles.gaugeMetaText}>
                        {(selectedTelemetryTank.currentGallons || 3400).toLocaleString()} Gallons Remaining
                      </Text>
                      <Text style={styles.gaugeMetaText}>
                        Capacity: {(selectedTelemetryTank.capacityGallons || selectedTelemetryTank.capacity || 5000).toLocaleString()} Gal
                      </Text>
                    </View>
                  </View>

                  {/* 7-Day Tank Depletion Trend */}
                  <View style={styles.depletionCard}>
                    <Text style={styles.depletionTitle}>7-Day Tank Consumption History</Text>
                    <Text style={styles.depletionSub}>Average draw: ~92 Gal / day during active fertigation</Text>
                    <View style={styles.depletionTable}>
                      {[
                        { day: 'Today', gal: (selectedTelemetryTank.currentGallons || 3400), diff: '-80 Gal', event: 'Scheduled Fertigation' },
                        { day: 'Yesterday', gal: (selectedTelemetryTank.currentGallons || 3400) + 80, diff: '-95 Gal', event: 'Drip Set 1 Active' },
                        { day: 'Oct 23', gal: (selectedTelemetryTank.currentGallons || 3400) + 175, diff: '-85 Gal', event: 'Nutrient Injection' },
                        { day: 'Oct 22', gal: (selectedTelemetryTank.currentGallons || 3400) + 260, diff: '-110 Gal', event: 'Micro-sprinkler Set 2' },
                        { day: 'Oct 21', gal: (selectedTelemetryTank.currentGallons || 3400) + 370, diff: '-90 Gal', event: 'Scheduled Fertigation' },
                      ].map((item, idx) => (
                        <View key={idx} style={[styles.depletionRow, idx === 4 && { borderBottomWidth: 0 }]}>
                          <Text style={[styles.depletionCell, { flex: 1.2, fontWeight: '700' }]}>{item.day}</Text>
                          <Text style={[styles.depletionCell, { flex: 1.5 }]}>{item.gal.toLocaleString()} Gal</Text>
                          <Text style={[styles.depletionCell, { flex: 1.2, color: '#DC2626', fontWeight: '600' }]}>{item.diff}</Text>
                          <Text style={[styles.depletionCell, { flex: 2, color: '#64748B' }]}>{item.event}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Refill Recommendation CTA */}
                  <View style={styles.telemetryCtaCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.ctaTitle}>Projected Run-Out: ~{selectedTelemetryTank.daysToEmpty || 38} Days</Text>
                      <Text style={styles.ctaSub}>Schedule advance delivery before level drops below 20%</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.telemetryOrderBtn}
                      onPress={() => {
                        setTelemetryModalVisible(false);
                        navigation.navigate('Deliveries', {
                          autoOpenOrder: true,
                          prefillProduct: 'ReNu N-CARE 32-0-0',
                          prefillRanchId: selectedTelemetryRanch?.id,
                          prefillTankId: selectedTelemetryTank?.id,
                        });
                      }}
                    >
                      <MaterialCommunityIcons name="truck-fast" size={16} color="#FFFFFF" />
                      <Text style={styles.telemetryOrderBtnText}>Request Refill</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>

                <View style={styles.modalButtonsRow}>
                  <Button
                    mode="contained"
                    buttonColor={BRAND_COLORS.primaryTeal}
                    onPress={() => setTelemetryModalVisible(false)}
                    style={{ flex: 1, borderRadius: 8 }}
                  >
                    Close Feed
                  </Button>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Tank Operations Hub Modal: Medicines, Trackers, Reports */}
      <Modal visible={tankHubModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '92%' }]}>
            {selectedHubTank && (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <MaterialCommunityIcons name="layers-outline" size={16} color={BRAND_COLORS.primaryTeal} />
                      <Text style={styles.modalSub}>Tank Operations & Inventory Hub</Text>
                    </View>
                    <Text style={styles.modalTitle}>{selectedHubTank.name}</Text>
                    <Text style={styles.telemetryRanchSub}>
                      {selectedHubRanch?.name} · {selectedHubTank.location || 'Pump Pad'} · Serial #{selectedHubTank.serial || 'OTO-99214'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setTankHubModalVisible(false)}
                    style={styles.modalCloseBtn}
                  >
                    <MaterialCommunityIcons name="close" size={24} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {/* Level Snapshot Bar */}
                <View style={styles.hubSnapshotCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={styles.hubSnapshotLabel}>CURRENT INVENTORY LEVEL</Text>
                    <Text style={[styles.hubSnapshotPct, { color: (selectedHubTank.levelPercent || 78) < 25 ? '#DC2626' : BRAND_COLORS.primaryTeal }]}>
                      {selectedHubTank.levelPercent || 78}%
                    </Text>
                  </View>
                  <ProgressBar
                    progress={(selectedHubTank.levelPercent || 78) / 100}
                    color={(selectedHubTank.levelPercent || 78) < 25 ? '#DC2626' : BRAND_COLORS.primaryTeal}
                    style={styles.gaugeBar}
                  />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                    <Text style={styles.hubSnapshotMeta}>
                      {(selectedHubTank.currentGallons || Math.round(((selectedHubTank.levelPercent || 78) / 100) * (selectedHubTank.capacity || 5000))).toLocaleString()} Gallons
                    </Text>
                    <Text style={styles.hubSnapshotMeta}>
                      Capacity: {(selectedHubTank.capacityGallons || selectedHubTank.capacity || 5000).toLocaleString()} Gal
                    </Text>
                  </View>
                </View>

                {/* 3 Hub Tabs */}
                <View style={styles.hubTabsRow}>
                  <TouchableOpacity
                    style={[styles.hubTabBtn, hubActiveTab === 'medicines' && styles.hubTabBtnActive]}
                    onPress={() => setHubActiveTab('medicines')}
                  >
                    <MaterialCommunityIcons
                      name="pill"
                      size={15}
                      color={hubActiveTab === 'medicines' ? BRAND_COLORS.primaryTeal : '#64748B'}
                    />
                    <Text style={[styles.hubTabText, hubActiveTab === 'medicines' && styles.hubTabTextActive]}>
                      Medicines ({selectedHubTank.medicines?.length || 0})
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.hubTabBtn, hubActiveTab === 'trackers' && styles.hubTabBtnActive]}
                    onPress={() => setHubActiveTab('trackers')}
                  >
                    <MaterialCommunityIcons
                      name="satellite-variant"
                      size={15}
                      color={hubActiveTab === 'trackers' ? BRAND_COLORS.primaryTeal : '#64748B'}
                    />
                    <Text style={[styles.hubTabText, hubActiveTab === 'trackers' && styles.hubTabTextActive]}>
                      Trackers
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.hubTabBtn, hubActiveTab === 'reports' && styles.hubTabBtnActive]}
                    onPress={() => setHubActiveTab('reports')}
                  >
                    <MaterialCommunityIcons
                      name="file-document-outline"
                      size={15}
                      color={hubActiveTab === 'reports' ? BRAND_COLORS.primaryTeal : '#64748B'}
                    />
                    <Text style={[styles.hubTabText, hubActiveTab === 'reports' && styles.hubTabTextActive]}>
                      Reports ({selectedHubTank.reports?.length || 0})
                    </Text>
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
                  {/* TAB 1: MEDICINES & TREATMENTS */}
                  {hubActiveTab === 'medicines' && (
                    <View style={styles.tabContentArea}>
                      <View style={styles.tabHeaderRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.tabHeading}>Tank Injected Treatments</Text>
                          <Text style={styles.tabSubheading}>
                            Bio-fertilizers, biological fungicides, and conditioning brews
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.hubAddActionBtn}
                          onPress={() => setShowAddMedForm(!showAddMedForm)}
                        >
                          <MaterialCommunityIcons name={showAddMedForm ? 'minus' : 'plus'} size={14} color="#FFFFFF" />
                          <Text style={styles.hubAddActionBtnText}>
                            {showAddMedForm ? 'Cancel' : 'Add Medicine'}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {showAddMedForm && (
                        <View style={styles.hubFormCard}>
                          <Text style={styles.hubFormTitle}>Record Injected Treatment</Text>
                          <TextInput
                            label="Medicine / Product Name *"
                            value={medName}
                            onChangeText={setMedName}
                            mode="outlined"
                            style={styles.hubInput}
                            placeholder="e.g. ReNu Bio-Gold NPK 10-5-5"
                          />

                          <Text style={styles.formLabel}>Treatment Category</Text>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                            {['Bio-Fertilizer', 'Biological Fungicide', 'Micro-Nutrient', 'Soil Conditioner', 'Inoculant'].map((cat) => (
                              <TouchableOpacity
                                key={cat}
                                onPress={() => setMedType(cat)}
                                style={[styles.selectorChip, medType === cat && styles.selectorChipActive]}
                              >
                                <Text style={[styles.selectorChipText, medType === cat && styles.selectorChipTextActive]}>
                                  {cat}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>

                          <TextInput
                            label="Dosage / Volume Added *"
                            value={medDosage}
                            onChangeText={setMedDosage}
                            mode="outlined"
                            style={styles.hubInput}
                            placeholder="e.g. 50 Gallons or 5 gal/1000 gal"
                          />

                          <TextInput
                            label="Batch / Lot Number"
                            value={medBatch}
                            onChangeText={setMedBatch}
                            mode="outlined"
                            style={styles.hubInput}
                            placeholder="e.g. BAT-2026-904"
                          />

                          <TextInput
                            label="Target Deficiency / Condition"
                            value={medTarget}
                            onChangeText={setMedTarget}
                            mode="outlined"
                            style={styles.hubInput}
                            placeholder="e.g. Pre-bloom root feeding"
                          />

                          <TextInput
                            label="Application Notes"
                            value={medNotes}
                            onChangeText={setMedNotes}
                            mode="outlined"
                            multiline
                            numberOfLines={2}
                            style={[styles.hubInput, { height: 60 }]}
                            placeholder="e.g. Injected into Drip Set 1 during 4-hour cycle"
                          />

                          <Button
                            mode="contained"
                            buttonColor={BRAND_COLORS.primaryTeal}
                            loading={submittingMed}
                            onPress={handleAddMedicine}
                            style={{ borderRadius: 8, marginTop: 4 }}
                          >
                            Save Medicine to Tank
                          </Button>
                        </View>
                      )}

                      {(!selectedHubTank.medicines || selectedHubTank.medicines.length === 0) ? (
                        <View style={styles.hubEmptyBox}>
                          <MaterialCommunityIcons name="pill" size={24} color="#94A3B8" />
                          <Text style={styles.hubEmptyText}>No medicines or treatments logged for this tank yet.</Text>
                        </View>
                      ) : (
                        selectedHubTank.medicines.map((m: any) => (
                          <View key={m.id} style={styles.hubItemCard}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <View style={{ flex: 1, marginRight: 8 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  <Text style={styles.hubItemName}>{m.name}</Text>
                                  <View style={styles.hubBadgePill}>
                                    <Text style={styles.hubBadgeText}>{m.type}</Text>
                                  </View>
                                </View>
                                <Text style={styles.hubItemMeta}>
                                  Dosage: <Text style={{ fontWeight: '700', color: '#0F172A' }}>{m.dosage}</Text> · Batch: {m.batchNumber || 'N/A'} · Added: {m.dateAdded}
                                </Text>
                                {m.targetDeficiency ? (
                                  <Text style={styles.hubItemTarget}>Target: {m.targetDeficiency}</Text>
                                ) : null}
                                {m.notes ? (
                                  <Text style={styles.hubItemNotes}>"{m.notes}"</Text>
                                ) : null}
                              </View>
                              <TouchableOpacity
                                onPress={() => handleDeleteMedicine(m.id)}
                                style={{ padding: 4 }}
                              >
                                <MaterialCommunityIcons name="trash-can-outline" size={18} color="#94A3B8" />
                              </TouchableOpacity>
                            </View>
                          </View>
                        ))
                      )}
                    </View>
                  )}

                  {/* TAB 2: TRACKERS & TELEMETRY */}
                  {hubActiveTab === 'trackers' && (
                    <View style={styles.tabContentArea}>
                      <View style={styles.tabHeaderRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.tabHeading}>Paired Cellular Tracker</Text>
                          <Text style={styles.tabSubheading}>
                            Otodata cellular unit, level sensors, and alert thresholds
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.hubAddActionBtn}
                          onPress={() => setShowTrackerForm(!showTrackerForm)}
                        >
                          <MaterialCommunityIcons name="cog-outline" size={14} color="#FFFFFF" />
                          <Text style={styles.hubAddActionBtnText}>
                            {showTrackerForm ? 'Cancel' : 'Configure'}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {showTrackerForm && (
                        <View style={styles.hubFormCard}>
                          <Text style={styles.hubFormTitle}>Configure Telemetry Tracker</Text>
                          <TextInput
                            label="Tracker Device Serial Number *"
                            value={trkSerial}
                            onChangeText={setTrkSerial}
                            mode="outlined"
                            style={styles.hubInput}
                            placeholder="e.g. OTO-99214"
                          />

                          <TextInput
                            label="Cellular Unit ID (LTE-M)"
                            value={trkCellularId}
                            onChangeText={setTrkCellularId}
                            mode="outlined"
                            style={styles.hubInput}
                            placeholder="e.g. LTE-M-8821"
                          />

                          <TextInput
                            label="Low-Level Alert Threshold (% remaining) *"
                            value={trkThreshold}
                            onChangeText={setTrkThreshold}
                            mode="outlined"
                            keyboardType="numeric"
                            style={styles.hubInput}
                            placeholder="25"
                          />

                          <Button
                            mode="contained"
                            buttonColor={BRAND_COLORS.primaryTeal}
                            loading={submittingTrk}
                            onPress={handleUpdateTracker}
                            style={{ borderRadius: 8, marginTop: 4 }}
                          >
                            Update Tracker Settings
                          </Button>
                        </View>
                      )}

                      <View style={styles.trackerDetailCard}>
                        <View style={styles.trackerDetailHeader}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <View style={styles.trackerIconBox}>
                              <MaterialCommunityIcons name="satellite-variant" size={20} color="#2563EB" />
                            </View>
                            <View>
                              <Text style={styles.trackerTitle}>Otodata Cellular Telemetry Unit</Text>
                              <Text style={styles.trackerSerial}>
                                Serial: <Text style={{ fontWeight: '700', color: '#0F172A' }}>{selectedHubTank.serial || 'OTO-99214'}</Text>
                              </Text>
                            </View>
                          </View>
                          <View style={styles.trackerStatusPill}>
                            <View style={styles.trackerStatusDot} />
                            <Text style={styles.trackerStatusText}>Online</Text>
                          </View>
                        </View>

                        <View style={styles.trackerGrid}>
                          <View style={styles.trackerGridItem}>
                            <Text style={styles.trackerGridLabel}>Cellular Link</Text>
                            <Text style={styles.trackerGridVal}>LTE-M Active</Text>
                            <Text style={styles.trackerGridSub}>-74 dBm (Strong)</Text>
                          </View>
                          <View style={styles.trackerGridItem}>
                            <Text style={styles.trackerGridLabel}>Battery</Text>
                            <Text style={styles.trackerGridVal}>98%</Text>
                            <Text style={styles.trackerGridSub}>Solar Recharging</Text>
                          </View>
                          <View style={styles.trackerGridItem}>
                            <Text style={styles.trackerGridLabel}>Sensor Pressure</Text>
                            <Text style={styles.trackerGridVal}>{selectedHubTank.pressurePsi || '42'} PSI</Text>
                            <Text style={styles.trackerGridSub}>Submersible transducer</Text>
                          </View>
                          <View style={styles.trackerGridItem}>
                            <Text style={styles.trackerGridLabel}>Refill Alert At</Text>
                            <Text style={[styles.trackerGridVal, { color: BRAND_COLORS.accentOrange }]}>
                              &lt; {selectedHubTank.reorderThresholdPercent || 25}%
                            </Text>
                            <Text style={styles.trackerGridSub}>Automated trigger</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  )}

                  {/* TAB 3: TANK REPORTS & LOGS */}
                  {hubActiveTab === 'reports' && (
                    <View style={styles.tabContentArea}>
                      <View style={styles.tabHeaderRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.tabHeading}>Tank Reports & Documents</Text>
                          <Text style={styles.tabSubheading}>
                            Refill logs, calibration audits, inspections, and attached documents
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.hubAddActionBtn}
                          onPress={() => setShowAddReportForm(!showAddReportForm)}
                        >
                          <MaterialCommunityIcons name={showAddReportForm ? 'minus' : 'plus'} size={14} color="#FFFFFF" />
                          <Text style={styles.hubAddActionBtnText}>
                            {showAddReportForm ? 'Cancel' : 'Add Report'}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {showAddReportForm && (
                        <View style={styles.hubFormCard}>
                          <Text style={styles.hubFormTitle}>Create Tank Report</Text>
                          <TextInput
                            label="Report Title *"
                            value={rptTitle}
                            onChangeText={setRptTitle}
                            mode="outlined"
                            style={styles.hubInput}
                            placeholder="e.g. Seasonal Tank Flush & Inspection"
                          />

                          <Text style={styles.formLabel}>Report Category</Text>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                            {['Refill & Level Log', 'Quality & Assay Report', 'Maintenance & Sensor Check', 'Compliance Inspection'].map((rcat) => (
                              <TouchableOpacity
                                key={rcat}
                                onPress={() => setRptType(rcat)}
                                style={[styles.selectorChip, rptType === rcat && styles.selectorChipActive]}
                              >
                                <Text style={[styles.selectorChipText, rptType === rcat && styles.selectorChipTextActive]}>
                                  {rcat}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>

                          <TextInput
                            label="Report Notes / Key Findings"
                            value={rptNotes}
                            onChangeText={setRptNotes}
                            mode="outlined"
                            multiline
                            numberOfLines={2}
                            style={[styles.hubInput, { height: 60 }]}
                            placeholder="e.g. Pump pressure verified, clean discharge line"
                          />

                          {/* Document Attachment in Any Format */}
                          <Text style={styles.formLabel}>Attach Report Document (Any Format)</Text>
                          {rptDocument ? (
                            <View style={styles.attachedDocCard}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 }}>
                                <MaterialCommunityIcons
                                  name={
                                    rptDocument.name.endsWith('.pdf') ? 'file-pdf-box' :
                                    rptDocument.name.match(/\.(png|jpg|jpeg|webp)$/i) ? 'file-image' :
                                    rptDocument.name.match(/\.(xls|xlsx|csv)$/i) ? 'file-excel' :
                                    rptDocument.name.match(/\.(doc|docx)$/i) ? 'file-word' : 'file-document-outline'
                                  }
                                  size={24}
                                  color={BRAND_COLORS.primaryTeal}
                                />
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.docFileName} numberOfLines={1}>
                                    {rptDocument.name}
                                  </Text>
                                  <Text style={styles.docFileSize}>{rptDocument.size}</Text>
                                </View>
                              </View>
                              <TouchableOpacity
                                onPress={() => setRptDocument(null)}
                                style={styles.removeDocBtn}
                              >
                                <MaterialCommunityIcons name="close-circle" size={18} color="#EF4444" />
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <TouchableOpacity
                              onPress={() => pickFile(setRptDocument)}
                              style={styles.docUploadDashedBox}
                              activeOpacity={0.7}
                            >
                              <MaterialCommunityIcons name="cloud-upload-outline" size={24} color={BRAND_COLORS.primaryTeal} />
                              <Text style={styles.docUploadTitle}>Attach Document (PDF, Word, Excel, Image, etc.)</Text>
                            </TouchableOpacity>
                          )}

                          <Button
                            mode="contained"
                            buttonColor={BRAND_COLORS.primaryTeal}
                            loading={submittingRpt}
                            onPress={handleAddTankReport}
                            style={{ borderRadius: 8, marginTop: 10 }}
                          >
                            Save Tank Report
                          </Button>
                        </View>
                      )}

                      {(!selectedHubTank.reports || selectedHubTank.reports.length === 0) ? (
                        <View style={styles.hubEmptyBox}>
                          <MaterialCommunityIcons name="file-document-outline" size={24} color="#94A3B8" />
                          <Text style={styles.hubEmptyText}>No reports or compliance documents logged for this tank yet.</Text>
                        </View>
                      ) : (
                        selectedHubTank.reports.map((r: any) => (
                          <View key={r.id} style={styles.hubItemCard}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <View style={{ flex: 1, marginRight: 8 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  <Text style={styles.hubItemName}>{r.title}</Text>
                                  <View style={styles.hubBadgePill}>
                                    <Text style={styles.hubBadgeText}>{r.reportType}</Text>
                                  </View>
                                </View>
                                <Text style={styles.hubItemMeta}>
                                  Logged: {r.date} · Author: {r.author || 'Grower'}
                                </Text>
                                {r.notes ? (
                                  <Text style={styles.hubItemNotes}>"{r.notes}"</Text>
                                ) : null}

                                {/* Attached Document */}
                                {(r.fileData || r.fileName) && (
                                  <View style={[styles.sampleDocStrip, { marginTop: 6 }]}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                                      <MaterialCommunityIcons
                                        name={
                                          r.fileName?.match(/\.(png|jpg|jpeg|webp)$/i) ? 'file-image' :
                                          r.fileName?.match(/\.(xls|xlsx|csv)$/i) ? 'file-excel' :
                                          r.fileName?.match(/\.(doc|docx)$/i) ? 'file-word' : 'file-pdf-box'
                                        }
                                        size={18}
                                        color={BRAND_COLORS.primaryTeal}
                                      />
                                      <Text style={styles.sampleDocName} numberOfLines={1}>
                                        {r.fileName || 'Report_Document.pdf'}
                                      </Text>
                                    </View>
                                    <TouchableOpacity
                                      style={styles.viewDocBadgeBtn}
                                      onPress={() => handleOpenDocument(r.fileData, r.fileName)}
                                    >
                                      <MaterialCommunityIcons name="open-in-new" size={14} color="#0C6054" />
                                      <Text style={styles.viewDocBadgeText}>View</Text>
                                    </TouchableOpacity>
                                  </View>
                                )}
                              </View>
                              <TouchableOpacity
                                onPress={() => handleDeleteTankReport(r.id)}
                                style={{ padding: 4 }}
                              >
                                <MaterialCommunityIcons name="trash-can-outline" size={18} color="#94A3B8" />
                              </TouchableOpacity>
                            </View>
                          </View>
                        ))
                      )}
                    </View>
                  )}
                </ScrollView>

                <View style={[styles.modalButtonsRow, { marginTop: 12 }]}>
                  <Button
                    mode="contained"
                    buttonColor={BRAND_COLORS.primaryTeal}
                    onPress={() => setTankHubModalVisible(false)}
                    style={{ flex: 1, borderRadius: 8 }}
                  >
                    Close Tank Hub
                  </Button>
                </View>
              </>
            )}
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
    paddingBottom: 110,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 10,
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
  labSampleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: BRAND_COLORS.accentOrange,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  labSampleBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  addRanchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BRAND_COLORS.primaryTeal,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addRanchBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
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
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 280,
  },
  ranchSection: {
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  ranchBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#99F6E4',
    alignItems: 'center',
  },
  acreageNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: BRAND_COLORS.primaryTeal,
  },
  acreageUnit: {
    fontSize: 10,
    fontWeight: '600',
    color: '#0F766E',
  },
  programBanner: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  progHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  progBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: BRAND_COLORS.primaryTeal,
    letterSpacing: 1,
  },
  progTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  progSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  activePill: {
    backgroundColor: '#F0FDFA',
    borderColor: '#99F6E4',
    borderWidth: 1,
  },
  activePillText: {
    color: BRAND_COLORS.primaryTeal,
    fontSize: 11,
    fontWeight: '700',
  },
  progBarMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progProgressLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  progProgressPct: {
    fontSize: 12,
    fontWeight: '700',
    color: BRAND_COLORS.primaryTeal,
  },
  progProgressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
  },
  progStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  progStatsText: {
    fontSize: 11,
    color: '#64748B',
  },
  progBufferText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0F766E',
  },
  blocksHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  blocksSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  blockActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  actionPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  addInlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addInlineBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: BRAND_COLORS.primaryTeal,
  },
  noItemsBox: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  noItemsText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  tableContainer: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tableColHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  blockIdBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  blockIdBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  sampleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BRAND_COLORS.accentOrange,
  },
  cropVarietyText: {
    fontSize: 13,
    fontWeight: '600',
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
    gap: 10,
  },
  tankCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tankCardLow: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FECDD3',
  },
  tankCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tankIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tankName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  tankLocation: {
    fontSize: 11,
    color: '#64748B',
  },
  tankLevelPct: {
    fontSize: 16,
    fontWeight: '800',
  },
  tankCapacityMeta: {
    fontSize: 11,
    color: '#64748B',
  },
  tankProgressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
    marginBottom: 8,
  },
  telemetryMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  telemetryMetricItem: {
    fontSize: 11,
    color: '#64748B',
  },
  tankLowAlertStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  tankLowAlertText: {
    fontSize: 11,
    color: '#B91C1C',
    fontWeight: '600',
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    width: '100%',
    maxWidth: 520,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  modalBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  modalBadge: {
    backgroundColor: '#F0FDFA',
    borderColor: '#99F6E4',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  modalBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: BRAND_COLORS.primaryTeal,
  },
  modalRanchName: {
    fontSize: 12,
    color: '#64748B',
  },
  modalSub: {
    fontSize: 11,
    color: '#0F766E',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalCloseBtn: {
    padding: 4,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  detailItem: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
  },
  detailLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  apnContainer: {
    marginTop: 4,
  },
  apnTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  apnChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  apnChip: {
    backgroundColor: '#F1F5F9',
  },
  apnChipText: {
    fontSize: 11,
    color: '#334155',
  },
  labSection: {
    marginTop: 4,
  },
  sectionHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  emptySampleBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  emptySampleText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  sampleCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sampleCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  sampleCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  sampleCardLab: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  sampleStatusChip: {
    backgroundColor: '#F0FDFA',
    borderColor: '#99F6E4',
    borderWidth: 1,
  },
  sampleStatusChipText: {
    color: BRAND_COLORS.primaryTeal,
    fontSize: 10,
    fontWeight: '700',
  },
  ucTable: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  ucTableTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  ucTableRowHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 4,
    marginBottom: 4,
  },
  ucCol: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  ucTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  ucCell: {
    fontSize: 11,
    color: '#334155',
  },
  statusTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  recBox: {
    backgroundColor: '#F0FDFA',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#99F6E4',
    marginTop: 6,
  },
  recTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: BRAND_COLORS.primaryTeal,
  },
  recText: {
    fontSize: 12,
    color: '#0F766E',
    lineHeight: 16,
  },
  recMeta: {
    fontSize: 10,
    color: '#14B8A6',
    marginTop: 4,
  },
  replyBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  replyAuthor: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0F766E',
  },
  replyContent: {
    fontSize: 11,
    color: '#334155',
    marginTop: 2,
  },
  replyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  replyInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    fontSize: 12,
  },
  timelineSection: {
    marginTop: 4,
  },
  timelineEmptyText: {
    fontSize: 12,
    color: '#64748B',
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BRAND_COLORS.primaryTeal,
    marginTop: 5,
    marginRight: 10,
  },
  timelineContent: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineProduct: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  timelineDate: {
    fontSize: 11,
    color: '#64748B',
  },
  timelineGallons: {
    fontSize: 11,
    color: '#334155',
    marginTop: 2,
  },
  formTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  formSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
    marginTop: 2,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  selectorChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectorChipActive: {
    backgroundColor: BRAND_COLORS.primaryTeal,
    borderColor: BRAND_COLORS.primaryTeal,
  },
  selectorChipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  selectorChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
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
    borderRadius: 8,
  },
  submitBtn: {
    borderRadius: 8,
  },
  codeSnippet: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#0F766E',
    backgroundColor: '#F0FDFA',
    padding: 8,
    borderRadius: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  importErrorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  importErrorTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B91C1C',
    marginBottom: 4,
  },
  importErrorItem: {
    fontSize: 11,
    color: '#DC2626',
    lineHeight: 16,
  },
  // Map and View Mode Styles
  viewModeToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    padding: 3,
    marginBottom: 16,
    gap: 4,
  },
  viewModeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  viewModeBtnActive: {
    backgroundColor: BRAND_COLORS.primaryTeal,
  },
  viewModeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  viewModeTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  mapContainer: {
    marginBottom: 24,
  },
  mapRanchStrip: {
    marginBottom: 12,
  },
  mapRanchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginRight: 8,
    gap: 6,
  },
  mapRanchPillActive: {
    backgroundColor: BRAND_COLORS.primaryTeal,
    borderColor: BRAND_COLORS.primaryTeal,
  },
  mapRanchPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  mapRanchPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  mapHudCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  mapHudHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mapHudCoords: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  mapHudSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  mapWeatherBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  mapWeatherText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  satelliteCanvas: {
    backgroundColor: '#0F241E',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#164E43',
  },
  satelliteGridLines: {
    gap: 12,
  },
  satelliteHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(12, 96, 84, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  satelliteWaterMark: {
    fontSize: 10,
    fontWeight: '800',
    color: '#5EEAD4',
    letterSpacing: 1,
  },
  mapBlocksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  mapBlockCard: {
    backgroundColor: '#1E3D35',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#2D5E52',
    minWidth: 140,
    flex: 1,
  },
  mapBlockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  mapBlockBadge: {
    backgroundColor: '#2D5E52',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  mapBlockBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#CCFBF1',
  },
  mapBlockAcres: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  mapBlockCrop: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  mapBlockVariety: {
    fontSize: 11,
    color: '#A7F3D0',
    marginBottom: 6,
  },
  mapBlockFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mapStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34D399',
  },
  mapBlockStatusText: {
    fontSize: 9,
    color: '#A7F3D0',
  },
  mapTanksLayer: {
    backgroundColor: '#132E27',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#235044',
  },
  mapTanksTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#99F6E4',
    marginBottom: 8,
  },
  mapTankPin: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  mapTankPinLow: {
    borderColor: '#F87171',
    backgroundColor: '#FEF2F2',
  },
  mapTankDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F0FDFA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapTankDotLow: {
    backgroundColor: '#FEE2E2',
  },
  mapTankName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  mapTankLevel: {
    fontSize: 10,
    color: '#0C6054',
    fontWeight: '600',
  },
  openTelemetryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#99F6E4',
    gap: 4,
  },
  openTelemetryBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0C6054',
  },
  acceptPrescriptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0C6054',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 8,
    marginBottom: 10,
    gap: 6,
  },
  acceptPrescriptionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  telemetryRanchSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  telemetryStatusStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  telemetryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  telemetryChipText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '600',
  },
  telemetryGaugeCard: {
    backgroundColor: '#F0FDFA',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#99F6E4',
    marginBottom: 14,
  },
  gaugeLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0F766E',
    letterSpacing: 1,
  },
  gaugePct: {
    fontSize: 38,
    fontWeight: '900',
    marginVertical: 4,
  },
  gaugeBar: {
    width: '100%',
    height: 10,
    borderRadius: 5,
    backgroundColor: '#CCFBF1',
    marginVertical: 8,
  },
  gaugeMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  gaugeMetaText: {
    fontSize: 11,
    color: '#0F766E',
    fontWeight: '600',
  },
  depletionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  depletionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  depletionSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 8,
  },
  depletionTable: {
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 8,
    overflow: 'hidden',
  },
  depletionRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  depletionCell: {
    fontSize: 11,
    color: '#334155',
  },
  telemetryCtaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 12,
  },
  ctaTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  ctaSub: {
    fontSize: 10,
    color: '#B45309',
    marginTop: 2,
  },
  telemetryOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D97706',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  telemetryOrderBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },

  // Document Upload & Attachment Styles
  attachedDocCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  docIconBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docFileName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  docFileSize: {
    fontSize: 11,
    color: '#0F766E',
    marginTop: 2,
  },
  changeDocBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  changeDocBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: BRAND_COLORS.primaryTeal,
  },
  removeDocBtn: {
    padding: 4,
  },
  docUploadDashedBox: {
    borderWidth: 1.5,
    borderColor: '#99F6E4',
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: '#F0FDFA',
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  docUploadTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: BRAND_COLORS.primaryTeal,
    marginTop: 6,
    textAlign: 'center',
  },
  docUploadSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 15,
  },
  sampleDocStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 8,
    gap: 8,
  },
  sampleDocName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  viewDocBadgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  viewDocBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0C6054',
  },

  // Tank Summary Pills & Actions Row
  tankSummaryPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    marginBottom: 10,
  },
  tankPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tankPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  tankActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  tankHubBtn: {
    flex: 1,
    minWidth: 180,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND_COLORS.primaryTeal,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  tankHubBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11,
  },

  // Tank Hub Modal Elements
  hubSnapshotCard: {
    backgroundColor: '#F0FDFA',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#99F6E4',
    marginBottom: 12,
  },
  hubSnapshotLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0F766E',
    letterSpacing: 0.5,
  },
  hubSnapshotPct: {
    fontSize: 16,
    fontWeight: '800',
  },
  hubSnapshotMeta: {
    fontSize: 11,
    color: '#0F766E',
    fontWeight: '600',
  },
  hubTabsRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
    marginBottom: 14,
    gap: 4,
  },
  hubTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 5,
  },
  hubTabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  hubTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  hubTabTextActive: {
    color: BRAND_COLORS.primaryTeal,
    fontWeight: '700',
  },
  tabContentArea: {
    paddingBottom: 8,
  },
  tabHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  tabHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  tabSubheading: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  hubAddActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BRAND_COLORS.primaryTeal,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  hubAddActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  hubFormCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginBottom: 12,
  },
  hubFormTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  hubInput: {
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
    fontSize: 12,
  },
  hubEmptyBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  hubEmptyText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
  hubItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  hubItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  hubBadgePill: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  hubBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: BRAND_COLORS.primaryTeal,
  },
  hubItemMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 3,
  },
  hubItemTarget: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0F766E',
    marginTop: 3,
  },
  hubItemNotes: {
    fontSize: 11,
    color: '#334155',
    fontStyle: 'italic',
    marginTop: 3,
  },
  trackerDetailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  trackerDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  trackerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  trackerSerial: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  trackerStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  trackerStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  trackerStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  trackerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  trackerGridItem: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  trackerGridLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  trackerGridVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  trackerGridSub: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
});
