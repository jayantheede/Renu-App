import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, TouchableOpacity, Platform } from 'react-native';
import { Text, Card, TextInput, Button, useTheme, SegmentedButtons } from 'react-native-paper';
import { LineChart } from 'react-native-chart-kit';
import { MapView, Polygon, Marker } from '../components/Map';

const MOCK_FIELDS = [
  {
    id: 'f1',
    name: 'North Plot',
    product: 'Green Nitrogen',
    coordinates: [
      { latitude: 37.78825, longitude: -122.4324 },
      { latitude: 37.78925, longitude: -122.4324 },
      { latitude: 37.78925, longitude: -122.4314 },
      { latitude: 37.78825, longitude: -122.4314 },
    ],
  },
  {
    id: 'f2',
    name: 'East Plot',
    product: 'Mycorrhizae',
    coordinates: [
      { latitude: 37.78725, longitude: -122.4314 },
      { latitude: 37.78825, longitude: -122.4314 },
      { latitude: 37.78825, longitude: -122.4294 },
      { latitude: 37.78725, longitude: -122.4294 },
    ],
  }
];

export const UtilizationScreen = () => {
  const theme = useTheme();
  const [period, setPeriod] = useState('monthly');
  
  // Form state
  const [product, setProduct] = useState('');
  const [field, setField] = useState('');
  const [amount, setAmount] = useState('');

  const handleLogApplication = () => {
    console.log('Logging:', { product, field, amount });
    setProduct(''); setField(''); setAmount('');
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      
      {/* Field Level Map View */}
      <Card style={styles.mapCard}>
        <View style={styles.mapContainer}>
          <MapView 
            style={styles.map}
            initialRegion={{
              latitude: 37.78825,
              longitude: -122.4324,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            }}
          >
            {MOCK_FIELDS.map(f => (
              <React.Fragment key={f.id}>
                <Polygon
                  coordinates={f.coordinates}
                  fillColor="rgba(76, 175, 80, 0.3)"
                  strokeColor={theme.colors.primary}
                  strokeWidth={2}
                />
                <Marker coordinate={f.coordinates[0]} title={f.name} description={`Active: ${f.product}`} />
              </React.Fragment>
            ))}
          </MapView>
        </View>
        <Card.Content style={{ paddingTop: 12 }}>
          <Text variant="titleSmall">Field Status</Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            2 Fields Tracking Active Applications
          </Text>
        </Card.Content>
      </Card>

      {/* Analytics Chart */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.rowBetween}>
            <Text variant="titleMedium">Usage Over Time</Text>
            <SegmentedButtons
              value={period}
              onValueChange={setPeriod}
              buttons={[
                { value: 'weekly', label: '1W' },
                { value: 'monthly', label: '1M' },
                { value: 'seasonal', label: 'Season' },
              ]}
              style={{ width: 180 }}
              density="small"
            />
          </View>

          <View style={{ alignItems: 'center', marginTop: 16 }}>
            <LineChart
              data={{
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{ data: [20, 45, 28, 80, 99, 43] }],
              }}
              width={Dimensions.get('window').width - 64}
              height={200}
              yAxisSuffix=" gal"
              chartConfig={{
                backgroundColor: theme.colors.surface,
                backgroundGradientFrom: theme.colors.surface,
                backgroundGradientTo: theme.colors.surface,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(27, 94, 32, ${opacity})`,
                labelColor: (opacity = 1) => theme.colors.onSurfaceVariant,
                style: { borderRadius: 12 },
                propsForDots: { r: '4', strokeWidth: '2', stroke: theme.colors.primary },
              }}
              bezier
              style={{ borderRadius: 12 }}
            />
          </View>
          
          <View style={styles.statsRow}>
            <View style={{ alignItems: 'center' }}>
              <Text variant="titleMedium" style={{ color: theme.colors.primary }}>315 gal</Text>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Total Season</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text variant="titleMedium" style={{ color: theme.colors.primary }}>45 Acres</Text>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Coverage</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text variant="titleMedium" style={{ color: theme.colors.secondary }}>14 Days</Text>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Since Last App</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Log Application Form */}
      <Card style={[styles.card, { marginBottom: 40 }]}>
        <Card.Title title="Log Application" />
        <Card.Content>
          <TextInput
            mode="outlined"
            label="Product (e.g. Green Nitrogen)"
            value={product}
            onChangeText={setProduct}
            style={styles.input}
            outlineColor="#E0E0E0"
          />
          <TextInput
            mode="outlined"
            label="Field / Site"
            value={field}
            onChangeText={setField}
            style={styles.input}
            outlineColor="#E0E0E0"
          />
          <TextInput
            mode="outlined"
            label="Quantity / Acreage"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            style={styles.input}
            outlineColor="#E0E0E0"
          />
          <Button mode="contained" onPress={handleLogApplication} style={styles.button}>
            Save Log
          </Button>
        </Card.Content>
      </Card>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  mapCard: { margin: 16, borderRadius: 12, overflow: 'hidden' },
  mapContainer: { height: 200, width: '100%' },
  map: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  card: { marginHorizontal: 16, marginBottom: 16, borderRadius: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#eee' },
  input: { marginBottom: 12, backgroundColor: '#fff' },
  button: { marginTop: 8, borderRadius: 8, paddingVertical: 4 },
});
