import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text, Chip, Checkbox, Searchbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const TASKS = [
  { id: '1', title: 'Apply Green Nitrogen', location: 'Ranch A - Sector 4', due: 'Today, 2:00 PM', status: 'pending', priority: 'high' },
  { id: '2', title: 'Inspect Irrigation line 2', location: 'Ranch B - North Field', due: 'Today, 4:30 PM', status: 'pending', priority: 'medium' },
  { id: '3', title: 'Soil sample collection', location: 'Ranch A - Sector 1', due: 'Tomorrow, 9:00 AM', status: 'pending', priority: 'low' },
  { id: '4', title: 'Equipment Maintenance', location: 'Main Depot', due: 'Yesterday', status: 'completed', priority: 'medium' },
];

export const EmployeeTasksScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [tasks, setTasks] = useState(TASKS);

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, status: t.status === 'completed' ? 'pending' : 'completed' } : t));
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#3B82F6';
      default: return '#6B7280';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Tasks</Text>
      </View>
      
      <Searchbar
        placeholder="Search tasks..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
        iconColor="#2E5D36"
        inputStyle={{ color: '#111827' }}
      />

      <View style={styles.filterRow}>
        <Chip style={styles.chip} textStyle={styles.chipText} selectedColor="#2E5D36">All</Chip>
        <Chip style={[styles.chip, { backgroundColor: '#F3F4F6' }]} textStyle={{ color: '#6B7280' }}>Pending</Chip>
        <Chip style={[styles.chip, { backgroundColor: '#F3F4F6' }]} textStyle={{ color: '#6B7280' }}>Completed</Chip>
      </View>

      <FlatList
        data={tasks.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()))}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[styles.taskCard, item.status === 'completed' && { opacity: 0.6 }]} 
            activeOpacity={0.7}
            onPress={() => toggleTask(item.id)}
          >
            <View style={styles.taskLeft}>
              <Checkbox.Android 
                status={item.status === 'completed' ? 'checked' : 'unchecked'} 
                color="#2E5D36"
                onPress={() => toggleTask(item.id)}
              />
            </View>
            <View style={styles.taskCenter}>
              <Text style={[styles.taskTitle, item.status === 'completed' && { textDecorationLine: 'line-through', color: '#9CA3AF' }]}>
                {item.title}
              </Text>
              <View style={styles.taskDetails}>
                <MaterialCommunityIcons name="map-marker-outline" size={14} color="#6B7280" />
                <Text style={styles.taskDetailText}>{item.location}</Text>
              </View>
              <View style={styles.taskDetails}>
                <MaterialCommunityIcons name="clock-outline" size={14} color="#6B7280" />
                <Text style={styles.taskDetailText}>{item.due}</Text>
              </View>
            </View>
            <View style={styles.taskRight}>
              <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(item.priority) }]} />
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  searchbar: {
    marginHorizontal: 24,
    marginBottom: 16,
    backgroundColor: '#FFF',
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 16,
    gap: 8,
  },
  chip: {
    backgroundColor: '#E8F5E9',
    borderRadius: 20,
  },
  chipText: {
    fontWeight: '600',
  },
  listContent: {
    padding: 24,
    paddingTop: 8,
    paddingBottom: 100,
  },
  taskCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
  },
  taskLeft: {
    marginRight: 12,
  },
  taskCenter: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  taskDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  taskDetailText: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 4,
  },
  taskRight: {
    paddingLeft: 12,
    justifyContent: 'flex-start',
    height: '100%',
    paddingTop: 8,
  },
  priorityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  }
});
