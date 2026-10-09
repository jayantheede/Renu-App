import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { useColorScheme, View, StyleSheet, Platform } from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { RootNavigator } from './src/navigation/RootNavigator';
import { lightTheme, darkTheme } from './src/theme/theme';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from './src/store/useAuthStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function App() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initialize();

    // On Web, inject @font-face rules so vector icons never render as broken ☒ glyphs
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const styleId = 'expo-vector-icons-web-fonts';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.type = 'text/css';
        style.appendChild(document.createTextNode(`
          @font-face {
            font-family: 'ionicons';
            src: url('https://cdnjs.cloudflare.com/ajax/libs/ionicons/7.4.0/fonts/ionicons.woff2') format('woff2'),
                 url('https://cdnjs.cloudflare.com/ajax/libs/ionicons/7.4.0/fonts/ionicons.ttf') format('truetype');
            font-display: swap;
          }
          @font-face {
            font-family: 'Ionicons';
            src: url('https://cdnjs.cloudflare.com/ajax/libs/ionicons/7.4.0/fonts/ionicons.woff2') format('woff2'),
                 url('https://cdnjs.cloudflare.com/ajax/libs/ionicons/7.4.0/fonts/ionicons.ttf') format('truetype');
            font-display: swap;
          }
          @font-face {
            font-family: 'material-community';
            src: url('https://cdnjs.cloudflare.com/ajax/libs/MaterialDesign-Webfont/7.4.47/fonts/materialdesignicons-webfont.woff2') format('woff2'),
                 url('https://cdnjs.cloudflare.com/ajax/libs/MaterialDesign-Webfont/7.4.47/fonts/materialdesignicons-webfont.ttf') format('truetype');
            font-display: swap;
          }
          @font-face {
            font-family: 'MaterialCommunityIcons';
            src: url('https://cdnjs.cloudflare.com/ajax/libs/MaterialDesign-Webfont/7.4.47/fonts/materialdesignicons-webfont.woff2') format('woff2'),
                 url('https://cdnjs.cloudflare.com/ajax/libs/MaterialDesign-Webfont/7.4.47/fonts/materialdesignicons-webfont.ttf') format('truetype');
            font-display: swap;
          }
          @font-face {
            font-family: 'Material Design Icons';
            src: url('https://cdnjs.cloudflare.com/ajax/libs/MaterialDesign-Webfont/7.4.47/fonts/materialdesignicons-webfont.woff2') format('woff2'),
                 url('https://cdnjs.cloudflare.com/ajax/libs/MaterialDesign-Webfont/7.4.47/fonts/materialdesignicons-webfont.ttf') format('truetype');
            font-display: swap;
          }
        `));
        document.head.appendChild(style);
      }
    }
  }, []);

  return (
    <SafeAreaProvider style={styles.safeArea}>
      <PaperProvider theme={theme as any} settings={{ icon: props => <MaterialCommunityIcons {...props as any} /> }}>
        <View style={styles.container}>
          <RootNavigator />
        </View>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#F8FAFC',
  },
});
