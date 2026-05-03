import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { ViewfinderOverlay } from '../components/ViewfinderOverlay';
import { PillButton } from '../components/PillButton';
import { Card } from '../components/Card';
import { geminiService } from '../services/GeminiService';
import type { RootStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const ScannerScreen: React.FC = () => {
  const { tokens } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const cameraRef = useRef<Camera>(null);
  const isLocked = useRef(false);
  
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Анимация вспышки
  const flashOpacity = useRef(new Animated.Value(0)).current;

  const triggerFlash = () => {
    flashOpacity.setValue(1); // Резкая белая вспышка
    Animated.timing(flashOpacity, {
      toValue: 0,
      duration: 600, // Плавное затухание за полсекунды
      useNativeDriver: true,
    }).start();
  };

  const processTicket = useCallback(async (path: string) => {
    try {
      const ticketDataArray = await geminiService.analyzeTicket(path);
      
      if (ticketDataArray && ticketDataArray.length > 0) {
        navigation.navigate('ScanResult', { ticketDataList: ticketDataArray });
        return true;
      } else {
        setError("Не удалось найти данные билета на фото. Попробуйте еще раз.");
        return false;
      }
    } catch (err: any) {
      console.error('AI Processing Error:', err);
      setError("Ошибка соединения с ИИ. Попробуйте позже.");
      return false;
    }
  }, [navigation]);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || isLocked.current) return;
    
    try {
      isLocked.current = true;
      setError(null);
      
      // 1. Автоматическая фокусировка перед снимком
      await cameraRef.current.focus({ x: 0.5, y: 0.5 });
      await new Promise(resolve => setTimeout(resolve, 800)); // Даем время линзе сфокусироваться

      // 2. Делаем качественный снимок
      const photo = await cameraRef.current.takePhoto({ 
        flash: 'auto',
        enableShutterSound: true,
        qualityPrioritization: 'quality',
      });

      // 3. Эффект вспышки на экране (показывает, что фото сделано!)
      triggerFlash();

      // 4. Включаем экран загрузки
      setIsProcessing(true);

      // 5. Отправляем в ИИ
      await processTicket(photo.path);
      
    } catch (err) {
      console.error('Capture error:', err);
      setError("Ошибка камеры.");
    } finally {
      setIsProcessing(false);
      isLocked.current = false;
    }
  }, [processTicket]);

  if (device == null) return null;

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        photo={true}
        enableZoomGesture={true}
      />
      
      {/* Показываем рамку только если не обрабатываем фото */}
      {!isProcessing && <ViewfinderOverlay />}

      {/* Анимация Вспышки */}
      <Animated.View 
        style={[
          StyleSheet.absoluteFill, 
          { backgroundColor: 'white', opacity: flashOpacity, zIndex: 9 }
        ]} 
        pointerEvents="none"
      />

      {/* Экран загрузки во время работы ИИ */}
      {isProcessing && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={tokens?.colors?.accent?.primary || '#00C853'} />
          <Text style={styles.loadingText}>Фото сделано!</Text>
          <Text style={styles.loadingSubText}>ИИ распознает данные рейсов...</Text>
        </View>
      )}

      <View style={styles.controls}>
        {error && (
          <Card style={styles.errorCard}>
            <Text style={{ color: tokens?.colors?.text?.primary || '#000', textAlign: 'center', marginBottom: 10 }}>{error}</Text>
            <PillButton title="Попробовать снова" onPress={() => setError(null)} variant="secondary" />
          </Card>
        )}
        
        {!isProcessing && !error && (
          <TouchableOpacity
            style={[styles.captureButton, { backgroundColor: tokens?.colors?.button?.primary?.background || '#2979FF' }]}
            onPress={handleCapture}
            disabled={isProcessing}
          >
            <View style={[styles.captureButtonInner, { backgroundColor: tokens?.colors?.background?.card || '#FFF' }]} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 8,
  },
  loadingSubText: {
    color: '#AAA',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  errorCard: { marginBottom: 30, padding: 20, width: '85%' },
  controls: { position: 'absolute', bottom: 60, left: 0, right: 0, alignItems: 'center', zIndex: 11 },
  captureButton: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center' },
  captureButtonInner: { width: 60, height: 60, borderRadius: 30 },
});
