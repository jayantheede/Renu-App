import { useContext, useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import * as SafeArea from 'react-native-safe-area-context';

const DEFAULT_INSETS = { top: 0, right: 0, bottom: 0, left: 0 };

export function useSafeInsets() {
  const ctx = SafeArea.SafeAreaInsetsContext;
  if (ctx) {
    return useContext(ctx) ?? DEFAULT_INSETS;
  }
  return SafeArea.useSafeAreaInsets();
}

export interface ResponsiveLayout {
  width: number;
  height: number;
  insets: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  isLandscape: boolean;
  isCompactHeight: boolean;
  isNarrowPortrait: boolean;
  isTabletOrDesktop: boolean;
  contentMaxWidth: number | undefined;
  safeHorizontalPadding: {
    paddingLeft: number;
    paddingRight: number;
  };
  centeredContainerStyle: {
    width: '100%';
    maxWidth?: number;
    alignSelf: 'center';
  };
  tabBarBottomClearance: number;
  modalMaxHeight: number;
  modalScrollMaxHeight: number;
}

/**
 * Reactive viewport + safe-area metrics for portrait/landscape phones, tablets, and macOS.
 */
export function useResponsiveLayout(maxContentWidth = 960): ResponsiveLayout {
  const { width, height } = useWindowDimensions();
  const insets = useSafeInsets();

  return useMemo(() => {
    const isLandscape = width > height;
    const isCompactHeight = height < 520;
    const isNarrowPortrait = width < 390;
    const isTabletOrDesktop = width >= 768 && height >= 520;
    const contentMaxWidth = width > maxContentWidth ? maxContentWidth : undefined;

    return {
      width,
      height,
      insets,
      isLandscape,
      isCompactHeight,
      isNarrowPortrait,
      isTabletOrDesktop,
      contentMaxWidth,
      safeHorizontalPadding: {
        paddingLeft: Math.max(16, insets.left),
        paddingRight: Math.max(16, insets.right),
      },
      centeredContainerStyle: contentMaxWidth
        ? { width: '100%', maxWidth: contentMaxWidth, alignSelf: 'center' }
        : { width: '100%', alignSelf: 'center' },
      tabBarBottomClearance: 28,
      modalMaxHeight: Math.max(260, Math.round(height * 0.88)),
      modalScrollMaxHeight: Math.max(
        160,
        Math.round(height * (isCompactHeight ? 0.56 : 0.62))
      ),
    };
  }, [width, height, insets, maxContentWidth]);
}
