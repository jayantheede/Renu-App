import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { RootNavigator } from './src/navigation/RootNavigator';
import { lightTheme, darkTheme } from './src/theme/theme';
import { SafeAreaProvider } from 'react-native-safe-area-context';
// Supabase removed
import { useAuthStore } from './src/store/useAuthStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useVideoPlayer, VideoView } from 'expo-video';
import { View, StyleSheet } from 'react-native';

export default function App() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initialize();
  }, []);

  const player = useVideoPlayer(require('./assets/sky_field.mp4'), player => {
    player.loop = true;
    player.play();
  });

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme} settings={{ icon: props => <MaterialCommunityIcons {...props as any} /> }}>
        <View style={styles.container}>
          <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
          <View style={StyleSheet.absoluteFill}>
            <RootNavigator />
          </View>
        </View>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
