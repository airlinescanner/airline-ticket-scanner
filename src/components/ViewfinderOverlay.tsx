/**
 * ViewfinderOverlay - направляющая рамка поверх видеопотока камеры
 * 
 * Отображает полупрозрачный оверлей с вертикальным ЗАКРУГЛЕННЫМ вырезом
 */

import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const FRAME_WIDTH = SCREEN_WIDTH * 0.85;
const FRAME_HEIGHT = Math.min(FRAME_WIDTH * 1.6, SCREEN_HEIGHT * 0.75);
const CORNER_RADIUS = 24;

export const ViewfinderOverlay: React.FC = () => {
  const { tokens } = useTheme();
  const themeColor = tokens?.colors?.accent?.primary || '#F5A623';

  return (
    <View style={styles.container} pointerEvents="none">
      {/* 
        Технология "Hole in the box": 
        Мы берем огромную рамку с толстыми границами. 
        Центральное пустое пространство и будет нашим вырезом.
      */}
      <View style={[
        styles.cutout, 
        { 
          width: FRAME_WIDTH + 2000, 
          height: FRAME_HEIGHT + 2000,
          borderWidth: 1000,
          borderColor: 'rgba(0, 0, 0, 0.7)',
          borderRadius: 1000 + CORNER_RADIUS,
        }
      ]} />

      {/* Желтые углы поверх выреза */}
      <View style={[styles.cornersContainer, { width: FRAME_WIDTH, height: FRAME_HEIGHT }]}>
        <View style={[styles.corner, styles.topLeft, { borderColor: themeColor }]} />
        <View style={[styles.corner, styles.topRight, { borderColor: themeColor }]} />
        <View style={[styles.corner, styles.bottomLeft, { borderColor: themeColor }]} />
        <View style={[styles.corner, styles.bottomRight, { borderColor: themeColor }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cutout: {
    position: 'absolute',
    backgroundColor: 'transparent',
  },
  cornersContainer: {
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderWidth: 5,
  },
  topLeft: {
    top: -2,
    left: -2,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: CORNER_RADIUS,
  },
  topRight: {
    top: -2,
    right: -2,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: CORNER_RADIUS,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: CORNER_RADIUS,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: CORNER_RADIUS,
  },
});
