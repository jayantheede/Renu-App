import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Path, Rect, Text as SvgText, Circle, G } from 'react-native-svg';

interface InvoiceLogoProps {
  size?: number;
  color?: string;
  style?: ViewStyle;
}

/**
 * Pixel-perfect vector icon matching the official line-art invoice logo:
 * - Document with rounded top corners and folded dog-ear bottom-left corner
 * - Bold 'INVOICE' typography at the top
 * - Three horizontal item lines with right-side dots/dashes
 * - Overlapping circular payment coin at the bottom right with a '$' symbol
 */
export const InvoiceLogo: React.FC<InvoiceLogoProps> = ({
  size = 28,
  color = '#0F172A',
  style,
}) => {
  // ViewBox is 100 x 100
  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        {/* Document Body Path with folded bottom-left corner and gap for coin on bottom-right */}
        {/* Top-left rounded corner, top-right rounded corner, right edge down to coin, bottom edge to fold */}
        <Path
          d="
            M 36 21
            L 59 21
            C 63.5 21, 65 22.5, 65 27
            L 65 40
            M 65 43
            L 65 56
            M 60 78
            L 37 78
            L 25 66
            L 25 27
            C 25 22.5, 26.5 21, 31 21
            L 36 21
          "
          stroke={color}
          strokeWidth="4.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Folded bottom-left corner flap */}
        <Path
          d="M 25 66 L 37 66 C 37 72, 37 78, 37 78"
          stroke={color}
          strokeWidth="4.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 'INVOICE' Header Text inside document */}
        <SvgText
          x="45"
          y="31.5"
          textAnchor="middle"
          fill={color}
          fontSize="11"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing="1.2"
        >
          INVOICE
        </SvgText>

        {/* Line Item 1 */}
        <Path
          d="M 30 38 L 49 38"
          stroke={color}
          strokeWidth="3.6"
          strokeLinecap="round"
        />
        <Path
          d="M 55 38 L 58 38"
          stroke={color}
          strokeWidth="3.6"
          strokeLinecap="round"
        />

        {/* Line Item 2 */}
        <Path
          d="M 30 46 L 43 46"
          stroke={color}
          strokeWidth="3.6"
          strokeLinecap="round"
        />
        <Path
          d="M 55 46 L 58 46"
          stroke={color}
          strokeWidth="3.6"
          strokeLinecap="round"
        />

        {/* Line Item 3 */}
        <Path
          d="M 30 54 L 52 54"
          stroke={color}
          strokeWidth="3.6"
          strokeLinecap="round"
        />
        <Path
          d="M 55 54 L 58 54"
          stroke={color}
          strokeWidth="3.6"
          strokeLinecap="round"
        />

        {/* Bottom-right Dollar Coin Circle */}
        <Circle
          cx="66"
          cy="69"
          r="16"
          stroke={color}
          strokeWidth="4.2"
          strokeLinecap="round"
          strokeDasharray="95 12"
        />

        {/* Dollar sign '$' inside circle */}
        <Path
          d="
            M 66 60.5 L 66 77.5
            M 69.5 64.5 C 69 63, 67.5 62.5, 66 62.5 C 64 62.5, 62.5 63.5, 62.5 65.5 C 62.5 68, 69.5 68.5, 69.5 72 C 69.5 74.5, 67.5 75.5, 66 75.5 C 64 75.5, 62.5 74.5, 62 73
          "
          stroke={color}
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default InvoiceLogo;
