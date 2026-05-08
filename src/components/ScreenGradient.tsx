import React from 'react';
import { StyleProp, StyleSheet, UIManager, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';

interface ScreenGradientProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function ScreenGradient({ children, style }: ScreenGradientProps): React.JSX.Element {
  const { resolvedTheme } = useTheme();

  const colors: readonly [string, string, string] =
    resolvedTheme === 'dark'
      ? ['#082D52', '#15466A', '#2E6F8F']
      : ['#DFEAF5', '#D0E0F0', '#C4D8EA'];

  const hasNativeGradient =
    typeof UIManager.getViewManagerConfig === 'function' &&
    !!(
      UIManager.getViewManagerConfig('ExpoLinearGradient') ||
      UIManager.getViewManagerConfig('ViewManagerAdapter_ExpoLinearGradient')
    );

  if (hasNativeGradient) {
    return (
      <LinearGradient
        colors={colors}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[styles.container, style]}
      >
        {children}
      </LinearGradient>
    );
  }

  // Fallback без нативного модуля: делаем много тонких слоёв, чтобы убрать полосы.
  const gradientSteps = 512;
  const [start, middle, end] = colors;

  const gradientRows = Array.from({ length: gradientSteps }, (_, index) => {
    const ratio = index / (gradientSteps - 1);
    const color =
      ratio < 0.5
        ? mixHex(start, middle, ratio * 2)
        : mixHex(middle, end, (ratio - 0.5) * 2);

    return <View key={index} style={{ flex: 1, backgroundColor: color }} />;
  });

  return (
    <View style={[styles.container, style]}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {gradientRows}
      </View>
      {children}
    </View>
  );
}

function mixHex(fromHex: string, toHex: string, ratio: number): string {
  const from = hexToRgb(fromHex);
  const to = hexToRgb(toHex);
  const r = Math.round(from.r + (to.r - from.r) * ratio);
  const g = Math.round(from.g + (to.g - from.g) * ratio);
  const b = Math.round(from.b + (to.b - from.b) * ratio);
  return `rgb(${r}, ${g}, ${b})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace('#', '');
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
