import React, { useState } from 'react';
import { TouchableOpacity, View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NotificationCenterModal } from './NotificationCenterModal';
import { useNotificationStore } from '../store/useNotificationStore';

interface Props {
  color?: string;
  tintColor?: string;
  badgeCount?: number;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

function isLightHex(hex: string): boolean {
  const normalized = hex.trim().toLowerCase();
  return (
    normalized === '#fff' ||
    normalized === '#ffffff' ||
    normalized === 'white' ||
    normalized.startsWith('rgba(255,255,255')
  );
}

export const NotificationBellButton: React.FC<Props> = ({
  color,
  tintColor,
  badgeCount,
  size = 24,
  style,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const storeUnreadCount = useNotificationStore((state) => state.unreadCount);
  const refreshAlerts = useNotificationStore((state) => state.refreshAlerts);

  const iconColor = tintColor || color || '#0F172A';
  const effectiveBadgeCount = badgeCount !== undefined ? badgeCount : storeUnreadCount;
  const lightHeader = isLightHex(iconColor);

  const handleOpen = () => {
    setModalVisible(true);
    void refreshAlerts({ notifyNew: false });
  };

  return (
    <>
      <TouchableOpacity
        onPress={handleOpen}
        style={[
          styles.btn,
          lightHeader ? styles.btnOnDarkHeader : styles.btnOnLightHeader,
          style,
        ]}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={
          effectiveBadgeCount > 0
            ? `App Alerts and Notifications, ${effectiveBadgeCount} unread`
            : 'App Alerts and Notifications'
        }
      >
        <MaterialCommunityIcons
          name={effectiveBadgeCount > 0 ? 'bell-ring-outline' : 'bell-outline'}
          size={size}
          color={iconColor}
        />
        {effectiveBadgeCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {effectiveBadgeCount > 99 ? '99+' : String(effectiveBadgeCount)}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <NotificationCenterModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  btn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
  },
  btnOnDarkHeader: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderColor: 'rgba(255, 255, 255, 0.28)',
  },
  btnOnLightHeader: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  badge: {
    position: 'absolute',
    top: 3,
    right: 3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 12,
  },
});
