import React, { createContext, useContext, useEffect } from 'react';
import {
  AppState,
  AppStateStatus,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NavigationContext } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/useAuthStore';
import {
  useNotificationStore,
  resolveAlertRoute,
} from '../store/useNotificationStore';

const FALLBACK_NAV_CONTEXT = createContext<any>(null);
const SafeNavigationContext = (NavigationContext as React.Context<any> | undefined) || FALLBACK_NAV_CONTEXT;

export const AppAlertsLifecycle: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const navigation = useContext(SafeNavigationContext);

  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const role = useAuthStore((s) => s.role);
  const userId = useAuthStore((s) => s.user?.id || s.user?.email || '');

  const activeBanner = useNotificationStore((s) => s.activeBanner);
  const initializeAlerts = useNotificationStore((s) => s.initializeAlerts);
  const refreshAlerts = useNotificationStore((s) => s.refreshAlerts);
  const refreshPermissionStatus = useNotificationStore((s) => s.refreshPermissionStatus);
  const dismissBanner = useNotificationStore((s) => s.dismissBanner);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const resetOnLogout = useNotificationStore((s) => s.resetOnLogout);

  useEffect(() => {
    if (!isLoggedIn) {
      resetOnLogout();
      return;
    }

    void initializeAlerts();

    const intervalId = setInterval(() => {
      void refreshAlerts({ notifyNew: true });
    }, 90000);

    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        void refreshPermissionStatus();
        void refreshAlerts({ notifyNew: true });
      }
    });

    return () => {
      clearInterval(intervalId);
      sub.remove();
    };
  }, [
    isLoggedIn,
    userId,
    initializeAlerts,
    refreshAlerts,
    refreshPermissionStatus,
    resetOnLogout,
  ]);

  useEffect(() => {
    if (!activeBanner) return;
    const timer = setTimeout(() => {
      dismissBanner();
    }, 5500);
    return () => clearTimeout(timer);
  }, [activeBanner, dismissBanner]);

  if (!isLoggedIn || !activeBanner) {
    return null;
  }

  const handleOpenAlert = async () => {
    const targetScreen = resolveAlertRoute(activeBanner.actionRoute, role);
    await markAsRead(activeBanner.id);
    if (navigation) {
      try {
        (navigation as any).navigate(targetScreen);
      } catch {
        // Screen unavailable in active navigator
      }
    }
  };

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.bannerHost,
        {
          top: Math.max(14, insets.top + 8),
          paddingLeft: width >= 640 ? Math.max(24, insets.left) : Math.max(12, insets.left),
          paddingRight: width >= 640 ? Math.max(24, insets.right) : Math.max(12, insets.right),
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => void handleOpenAlert()}
        style={styles.bannerCard}
        accessibilityRole="button"
        accessibilityLabel={`${activeBanner.title}: ${activeBanner.message}`}
      >
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name="bell-ring-outline" size={20} color="#FFFFFF" />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.title} numberOfLines={1}>
            {activeBanner.title}
          </Text>
          <Text style={styles.message} numberOfLines={2}>
            {activeBanner.message}
          </Text>
        </View>
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation?.();
            dismissBanner();
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.closeBtn}
          accessibilityLabel="Dismiss alert banner"
        >
          <MaterialCommunityIcons name="close" size={18} color="#CBD5E1" />
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  bannerHost: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2000,
  },
  bannerCard: {
    width: '100%',
    maxWidth: 520,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#1E5631',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1E5631',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
  message: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
});
