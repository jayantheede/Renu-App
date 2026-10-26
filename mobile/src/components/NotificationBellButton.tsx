import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NotificationCenterModal } from './NotificationCenterModal';
import { useNavigation } from '@react-navigation/native';

interface Props {
  color?: string;
  badgeCount?: number;
}

export const NotificationBellButton: React.FC<Props> = ({
  color = '#FFFFFF',
  badgeCount = 2,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const navigation = useNavigation<any>();

  const handleNavigate = (screen: string) => {
    try {
      navigation.navigate(screen);
    } catch (e) {
      console.warn('Navigation error:', e);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.bellBtn}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
        accessibilityLabel="Notifications"
      >
        <MaterialCommunityIcons name="bell-outline" size={20} color={color} />
        {badgeCount > 0 && (
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>{badgeCount > 9 ? '9+' : badgeCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      <NotificationCenterModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onNavigate={handleNavigate}
      />
    </>
  );
};

const styles = StyleSheet.create({
  bellBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badgeContainer: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#F97316',
    borderRadius: 9,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#0C6054',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 11,
  },
});
