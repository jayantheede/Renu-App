import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, ScrollView, Share, Platform } from 'react-native';
import { Text, Chip, Searchbar, Button, Card, Divider, TextInput, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { fetchTasks, updateTaskStatus, submitLabResult, exportData, importData } from '../../api/client';
import { useAuthStore } from '../../store/useAuthStore';

export const EmployeeTasksScreen = () => {
  const user = useAuthStore(state => state.user);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Lab Result Modal State
  const [labModalVisible, setLabModalVisible] = useState(false);
  const [selectedTaskForLab, setSelectedTaskForLab] = useState<any>(null);
  const [labPH, setLabPH] = useState('6.8');
  const [labNitrogen, setLabNitrogen] = useState('42');
  const [labMoisture, setLabMoisture] = useState('24');
  const [labMicrobial, setLabMicrobial] = useState('92');
  const [labNotes, setLabNotes] = useState('');
  const [submittingLab, setSubmittingLab] = useState(false);

  // Import Modal State
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await fetchTasks();
      if (Array.isArray(data)) {
        setTasks(data);
      }
    } catch (e) {
      console.error('Failed to load tasks:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleUpdateStatus = async (taskId: string, newStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED') => {
    try {
      await updateTaskStatus(taskId, newStatus, user?.email || 'employee@renu.com');
      setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
      Alert.alert(
        'Task Status Updated',
        `Task marked as "${newStatus}". Notification sent to Super Administrator login.`
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update task status');
    }
  };

  const openLabModal = (task: any) => {
    setSelectedTaskForLab(task);
    setLabModalVisible(true);
  };

  const handleSubmitLab = async () => {
    setSubmittingLab(true);
    try {
      await submitLabResult({
        ranchName: selectedTaskForLab?.ranchName || 'Assigned Field Site',
        growerEmail: selectedTaskForLab?.assignedToEmail || 'customer@renu.com',
        pH: parseFloat(labPH) || 6.8,
        nitrogenPPM: parseFloat(labNitrogen) || 40,
        moisturePercent: parseFloat(labMoisture) || 22,
        microbialScore: parseFloat(labMicrobial) || 88,
        notes: labNotes.trim() || 'Soil sample assay logged from mobile agronomy terminal.',
        recordedBy: user?.email || 'employee@renu.com'
      });

      Alert.alert('Lab Assay Submitted', 'Assay results recorded successfully and dispatched to Admin Dashboard.');
      setLabModalVisible(false);
      setLabNotes('');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to submit lab results');
    } finally {
      setSubmittingLab(false);
    }
  };

  const handleExportTasks = async () => {
    try {
      const res = await exportData('tasks');
      const jsonStr = JSON.stringify(res.data, null, 2);
      if (Platform.OS === 'web') {
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `renu_tasks_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        await Share.share({ title: 'Export Tasks', message: jsonStr });
      }
    } catch (e: any) {
      Alert.alert('Export Failed', e.message || 'Could not export tasks');
    }
  };

  const handleImportTasks = async () => {
    try {
      const parsed = JSON.parse(importJsonText);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      await importData('tasks', items);
      Alert.alert('Success', `Imported ${items.length} tasks successfully`);
      setImportModalVisible(false);
      setImportJsonText('');
      loadTasks();
    } catch (e: any) {
      Alert.alert('Invalid Format', 'Please enter a valid JSON array of tasks.');
    }
  };

  const filteredTasks = tasks.filter(t => {
    const matchesSearch = (t.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (t.ranchName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (t.growerName || '').toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (statusFilter === 'ALL') return true;
    return (t.status || 'PENDING').toUpperCase() === statusFilter;
  });

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'COMPLETED':
        return { bg: '#DCFCE7', color: '#15803D', label: 'Completed' };
      case 'IN_PROGRESS':
        return { bg: '#DBEAFE', color: '#1D4ED8', label: 'In Progress' };
      default:
        return { bg: '#FEF3C7', color: '#B45309', label: 'Pending' };
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Tasks & Field Ops</Text>
          <Text style={styles.subtitle}>Track 3 statuses, submit lab results & sync with Admin</Text>
        </View>
        <View style={styles.topActionsRow}>
          <Button
            mode="outlined"
            icon="download"
            onPress={handleExportTasks}
            style={styles.actionBtn}
            textColor="#2E5D36"
          >
            Export
          </Button>
          <Button
            mode="contained"
            icon="upload"
            onPress={() => {
              setImportJsonText(JSON.stringify([{
                id: `task-${Date.now()}`,
                title: 'Check Tank Telemetry',
                description: 'Verify 500 Gal tank pressure and level sensor.',
                status: 'PENDING',
                priority: 'HIGH'
              }], null, 2));
              setImportModalVisible(true);
            }}
            style={[styles.actionBtn, { backgroundColor: '#2E5D36' }]}
            textColor="#FFFFFF"
          >
            Import
          </Button>
        </View>
      </View>

      <Searchbar
        placeholder="Search tasks, ranches, growers..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
        iconColor="#2E5D36"
        inputStyle={{ color: '#0F172A' }}
      />

      {/* 3 Status Filter Chips */}
      <View style={styles.filterRow}>
        <Chip
          selected={statusFilter === 'ALL'}
          onPress={() => setStatusFilter('ALL')}
          style={[styles.chip, statusFilter === 'ALL' && styles.chipActive]}
          textStyle={{ fontWeight: 'bold', color: statusFilter === 'ALL' ? '#FFFFFF' : '#334155' }}
        >
          All
        </Chip>
        <Chip
          selected={statusFilter === 'PENDING'}
          onPress={() => setStatusFilter('PENDING')}
          style={[styles.chip, statusFilter === 'PENDING' && styles.chipActive]}
          textStyle={{ fontWeight: 'bold', color: statusFilter === 'PENDING' ? '#FFFFFF' : '#B45309' }}
        >
          Pending
        </Chip>
        <Chip
          selected={statusFilter === 'IN_PROGRESS'}
          onPress={() => setStatusFilter('IN_PROGRESS')}
          style={[styles.chip, statusFilter === 'IN_PROGRESS' && styles.chipActive]}
          textStyle={{ fontWeight: 'bold', color: statusFilter === 'IN_PROGRESS' ? '#FFFFFF' : '#1D4ED8' }}
        >
          In Progress
        </Chip>
        <Chip
          selected={statusFilter === 'COMPLETED'}
          onPress={() => setStatusFilter('COMPLETED')}
          style={[styles.chip, statusFilter === 'COMPLETED' && styles.chipActive]}
          textStyle={{ fontWeight: 'bold', color: statusFilter === 'COMPLETED' ? '#FFFFFF' : '#15803D' }}
        >
          Completed
        </Chip>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#2E5D36" size="large" />
      ) : filteredTasks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="clipboard-check-outline" size={56} color="#94A3B8" />
          <Text style={styles.emptyText}>No tasks found matching filter.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTasks}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const badge = getStatusBadge(item.status);
            const isCompleted = item.status?.toUpperCase() === 'COMPLETED';
            const isInProgress = item.status?.toUpperCase() === 'IN_PROGRESS';

            return (
              <Card style={[styles.taskCard, isCompleted && { opacity: 0.85 }]}>
                <Card.Content>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={[styles.taskTitle, isCompleted && { textDecorationLine: 'line-through', color: '#64748B' }]}>
                        {item.title}
                      </Text>
                      <Text style={styles.taskSub}>
                        {item.growerName || 'Assigned Grower'} • {item.ranchName || 'Field Site'}
                      </Text>
                    </View>
                    <Chip style={{ backgroundColor: badge.bg, height: 28 }} textStyle={{ color: badge.color, fontWeight: 'bold', fontSize: 11 }}>
                      {badge.label}
                    </Chip>
                  </View>

                  <Text style={styles.taskDesc}>{item.description}</Text>

                  <Divider style={{ marginVertical: 12 }} />

                  {/* 3 Status Action Transition Buttons */}
                  <View style={styles.statusButtonsRow}>
                    <Button
                      mode={isInProgress ? 'contained' : 'outlined'}
                      buttonColor={isInProgress ? '#1D4ED8' : undefined}
                      textColor={isInProgress ? '#FFFFFF' : '#1D4ED8'}
                      onPress={() => handleUpdateStatus(item.id, 'IN_PROGRESS')}
                      style={{ flex: 1, borderRadius: 8, borderColor: '#1D4ED8' }}
                      labelStyle={{ fontSize: 11 }}
                    >
                      In Progress
                    </Button>
                    <Button
                      mode={isCompleted ? 'contained' : 'outlined'}
                      buttonColor={isCompleted ? '#15803D' : undefined}
                      textColor={isCompleted ? '#FFFFFF' : '#15803D'}
                      onPress={() => handleUpdateStatus(item.id, 'COMPLETED')}
                      style={{ flex: 1, borderRadius: 8, borderColor: '#15803D' }}
                      labelStyle={{ fontSize: 11 }}
                    >
                      Completed
                    </Button>
                    <Button
                      mode="contained"
                      buttonColor="#2E5D36"
                      icon="flask-outline"
                      onPress={() => openLabModal(item)}
                      style={{ flex: 1.2, borderRadius: 8 }}
                      labelStyle={{ fontSize: 11 }}
                    >
                      Lab Results
                    </Button>
                  </View>
                </Card.Content>
              </Card>
            );
          }}
        />
      )}

      {/* Lab Results Entry Modal */}
      <Modal visible={labModalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Record Soil & Lab Assay</Text>
                <Text style={styles.modalSubtitle}>{selectedTaskForLab?.ranchName || 'Field Site'}</Text>
              </View>
              <TouchableOpacity onPress={() => setLabModalVisible(false)}>
                <MaterialCommunityIcons name="close-circle" size={28} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.gridRow}>
                <TextInput
                  label="Soil pH (e.g. 6.8)"
                  value={labPH}
                  onChangeText={setLabPH}
                  keyboardType="numeric"
                  mode="outlined"
                  style={styles.gridInput}
                  outlineColor="#CBD5E1"
                  activeOutlineColor="#2E5D36"
                />
                <TextInput
                  label="Nitrogen (PPM)"
                  value={labNitrogen}
                  onChangeText={setLabNitrogen}
                  keyboardType="numeric"
                  mode="outlined"
                  style={styles.gridInput}
                  outlineColor="#CBD5E1"
                  activeOutlineColor="#2E5D36"
                />
              </View>

              <View style={styles.gridRow}>
                <TextInput
                  label="Moisture (%)"
                  value={labMoisture}
                  onChangeText={setLabMoisture}
                  keyboardType="numeric"
                  mode="outlined"
                  style={styles.gridInput}
                  outlineColor="#CBD5E1"
                  activeOutlineColor="#2E5D36"
                />
                <TextInput
                  label="Microbial Score (0-100)"
                  value={labMicrobial}
                  onChangeText={setLabMicrobial}
                  keyboardType="numeric"
                  mode="outlined"
                  style={styles.gridInput}
                  outlineColor="#CBD5E1"
                  activeOutlineColor="#2E5D36"
                />
              </View>

              <TextInput
                label="Agronomist Observations & Recommendations"
                value={labNotes}
                onChangeText={setLabNotes}
                mode="outlined"
                multiline
                numberOfLines={3}
                style={[styles.input, { marginTop: 10 }]}
                outlineColor="#CBD5E1"
                activeOutlineColor="#2E5D36"
              />

              <Button
                mode="contained"
                buttonColor="#2E5D36"
                loading={submittingLab}
                disabled={submittingLab}
                onPress={handleSubmitLab}
                style={{ marginTop: 16, borderRadius: 10, paddingVertical: 4 }}
              >
                Submit Lab Results & Notify Admin
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
              <Text style={styles.modalTitle}>Import Tasks</Text>
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
              <Button mode="contained" onPress={handleImportTasks} style={{ flex: 1, backgroundColor: '#2E5D36' }}>
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
    paddingHorizontal: 20,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  subtitle: {
    color: '#64748B',
    marginTop: 2,
    fontSize: 13,
  },
  topActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  actionBtn: {
    borderRadius: 8,
    borderColor: '#2E5D36',
  },
  searchbar: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 1,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: '#2E5D36',
  },
  listContent: {
    paddingBottom: 120,
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  taskSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  taskDesc: {
    color: '#334155',
    fontSize: 13,
    marginTop: 8,
  },
  statusButtonsRow: {
    flexDirection: 'row',
    gap: 6,
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
  gridRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  gridInput: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  input: {
    backgroundColor: '#FFF',
    marginBottom: 12,
  },
});
