import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from 'react-native-paper';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
}

export const GlassCard = ({ 
  children, 
  style, 
  intensity = 60, 
  tint = 'light' 
}: GlassCardProps) => {
  const theme = useTheme();

  return (
    <BlurView
      intensity={intensity}
      tint={tint}
      style={[
        styles.container,
        {
          borderRadius: theme.roundness * 4, // Utilizing the updated theme roundness (24px)
          backgroundColor: theme.colors.surfaceVariant, // The translucent color we added
        },
        style,
      ]}
    >
      {children}
    </BlurView>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)', // Light glass border
  },
});
