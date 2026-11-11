import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { useColorScheme, View, StyleSheet, Platform, Alert } from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { RootNavigator } from './src/navigation/RootNavigator';
import { lightTheme, darkTheme } from './src/theme/theme';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from './src/store/useAuthStore';
import { warmUpBackend } from './src/api/client';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import './src/utils/alertPolyfill';

export default function App() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initialize();
    warmUpBackend().catch(() => {});

    // Register Web App Manifest, Service Worker & Font Fallbacks for Offline PWA
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      // 0. Resolve SPA 404 redirect param if redirected from 404.html
      if (typeof window !== 'undefined' && window.location.search.includes('p=')) {
        try {
          const params = new URLSearchParams(window.location.search);
          const redirectPath = params.get('p');
          if (redirectPath) {
            const query = params.get('q') ? '?' + params.get('q')!.replace(/~and~/g, '&') : '';
            window.history.replaceState(null, '', redirectPath + query + window.location.hash);
          }
        } catch (e) {}
      }

      // 1. Add manifest link if not present
      if (!document.querySelector('link[rel="manifest"]')) {
        const manifestLink = document.createElement('link');
        manifestLink.rel = 'manifest';
        manifestLink.href = '/manifest.json';
        document.head.appendChild(manifestLink);
      }

      // 2. Add Apple mobile web app capable meta tag
      if (!document.querySelector('meta[name="apple-mobile-web-app-capable"]')) {
        const meta = document.createElement('meta');
        meta.name = 'apple-mobile-web-app-capable';
        meta.content = 'yes';
        document.head.appendChild(meta);
      }

      // 3. Ensure responsive mobile viewport meta tag
      let viewportMeta = document.querySelector('meta[name="viewport"]');
      if (!viewportMeta) {
        viewportMeta = document.createElement('meta');
        viewportMeta.setAttribute('name', 'viewport');
        document.head.appendChild(viewportMeta);
      }
      viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');

      // 4. Register service worker for offline caching & background push notifications
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').then((reg) => {
          // Check for service worker updates
          reg.update().catch(() => {});
        }).catch((err) => {
          console.warn('Service worker registration failed:', err);
        });
      }

      // 5. Offline vector icon font fallback & mobile alignment CSS
      const styleId = 'expo-vector-icons-web-fonts';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.type = 'text/css';
        style.appendChild(document.createTextNode(`
          html, body, #root {
            width: 100%;
            min-height: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
            overflow-x: hidden;
            -webkit-font-smoothing: antialiased;
            -webkit-overflow-scrolling: touch;
            touch-action: manipulation;
          }
          * {
            box-sizing: border-box;
          }
          @font-face {
            font-family: 'Ionicons';
            src: local('Ionicons'),
                 url('/assets/Ionicons.ttf') format('truetype');
            font-display: swap;
          }
          @font-face {
            font-family: 'MaterialCommunityIcons';
            src: local('MaterialCommunityIcons'),
                 url('/assets/MaterialCommunityIcons.ttf') format('truetype');
            font-display: swap;
          }
          @keyframes rbFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes rbFadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
          }
          @keyframes rbScaleUp {
            from { opacity: 0; transform: scale(0.94); }
            to { opacity: 1; transform: scale(1); }
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
