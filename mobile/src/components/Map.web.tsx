import React from 'react';
import { View, Text } from 'react-native';

export const MapView = ({ children, style, initialRegion }: any) => (
  <View style={[{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e0e0e0' }, style]}>
    <Text>Interactive Maps are available on the native app.</Text>
  </View>
);
export const Polygon = (props: any) => null;
export const Marker = (props: any) => null;
