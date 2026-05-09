/**
 * Экран сканирования билетов
 * 
 * Отображает камеру для захвата изображения билета
 * Интегрирует OCR для распознавания текста
 * Обрабатывает ошибки и показывает инструкции
 */

import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Linking, AppState, AppStateStatus, ActivityIndicator } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { ViewfinderOverlay } from '../components/ViewfinderOverlay';
import { PillButton } from '../components/PillButton';
import { Card } from '../components/Card';
import type { RootStackParamList } from '../navigation/types';
import { scanCoordinator } from '../services/ScanCoordinator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const ScannerScreen: React.FC = () => {
  const { tokens } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const isFocused = useIsFocused();
  const cameraRef = useRef<Camera>(null);
  
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();
  
  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  React.useEffect(() => {
    const subscription = AppState.addEventListener('change', setAppState);
    return () => subscription.remove();
  }, []);

  const mapScanErrorToMessage = (err: unknown): string => {
    const rawMessage = err instanceof Error ? err.message : '';
    const message = rawMessage.toLowerCase();

    if (message.includes('api key is missing')) {
      return t('scanner.errorApiKey');
    }
    if (
      message.includes('network request failed') ||
      message.includes('failed to fetch') ||
      message.includes('timeout')
    ) {
      return t('scanner.errorNetwork');
    }
    if (
      message.includes('rate limit') ||
      message.includes('quota') ||
      message.includes('status 429')
    ) {
      return t('scanner.errorRateLimit');
    }
    if (message.includes('не поддерживает vision')) {
      return t('scanner.errorModel');
    }
    if (
      message.includes('не удалось распознать') ||
      message.includes('неверном формате')
    ) {
      return t('scanner.ocrFailed');
    }
    if (message.includes('camera is closed')) {
      return t('scanner.errorCameraClosed');
    }

    return rawMessage || t('common.error');
  };

  // Обработка захвата изображения
  const handleCapture = async () => {
    if (!cameraRef.current || isProcessing || isCapturing) return;

    try {
      setIsCapturing(true);
      setError(null);

      // Захват фото
      const photo = await cameraRef.current.takePhoto({
        enableShutterSound: true,
      });
      setIsCapturing(false);
      setIsProcessing(true);

      // AI-based OCR через Groq/Mistral
      const imageUri = photo.path.startsWith('file://') ? photo.path : `file://${photo.path}`;
      const ticketDataList = await scanCoordinator.coordinateScan(imageUri);
      
      // Переход на экран результата с распознанными данными
      navigation.navigate('ScanResult', { 
        ticketDataList: ticketDataList.length > 0 ? ticketDataList : [{
          passengerName: null,
          airlineName: null,
          airlineCode: null,
          flightNumber: null,
          departureDate: null,
          departureTime: null,
          departureCity: null,
          departureCountry: null,
          departureAirport: null,
          arrivalAirport: null,
          arrivalCity: null,
          arrivalCountry: null,
          seat: null,
          serviceClass: null,
          bookingReference: null,
          rawJson: '',
        }]
      });
    } catch (err: unknown) {
      console.error('Scan error:', err);
      setError(mapScanErrorToMessage(err));
      setIsCapturing(false);
    } finally {
      setIsProcessing(false);
    }
  };

  // Обработка отказа в разрешении
  const handlePermissionDenied = () => {
    Alert.alert(
      t('scanner.permissionDenied'),
      t('scanner.permissionInstructions'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('settings.title'), onPress: () => Linking.openSettings() },
      ]
    );
  };

  // Загрузка
  // 1. Проверяем разрешения ПЕРВЫМ делом
  if (!hasPermission) {
    return (
      <View style={[styles.container, { backgroundColor: tokens.colors.background.app }]}>
        <View style={styles.screenHeader}>
          <Text style={[styles.screenTitle, { color: tokens.colors.text.primary }]}>
            {t('scanner.title')}
          </Text>
        </View>
        <Card style={styles.permissionCard}>
          <Text style={[styles.permissionTitle, { color: tokens.colors.text.primary }]}>
            {t('scanner.permissionDenied')}
          </Text>
          <Text style={[styles.permissionText, { color: tokens.colors.text.secondary }]}>
            {t('scanner.permissionInstructions')}
          </Text>
          <PillButton
            title={t('common.ok')}
            onPress={requestPermission}
            variant="primary"
            style={styles.permissionButton}
          />
          <PillButton
            title={t('settings.title')}
            onPress={handlePermissionDenied}
            variant="secondary"
          />
        </Card>
      </View>
    );
  }

  // 2. Если разрешения есть, но устройство еще не найдено
  if (device == null) {
    return (
      <View style={[styles.container, { backgroundColor: tokens.colors.background.app }]}>
        <View style={styles.screenHeader}>
          <Text style={[styles.screenTitle, { color: tokens.colors.text.primary }]}>
            {t('scanner.title')}
          </Text>
        </View>
        <Text style={[styles.text, { color: tokens.colors.text.primary }]}>
          {t('common.loading')}
        </Text>
        <Text style={{ color: tokens.colors.text.secondary, marginTop: 8, fontSize: 14 }}>
          Пошук камери...
        </Text>
      </View>
    );
  }

  const isCameraActive = isFocused && appState === 'active' && !isProcessing;

  return (
    <View style={styles.container}>
      {/* Заголовок (поверх камеры) */}
      <View style={styles.screenHeader}>
        <Text style={[styles.screenTitle, { color: '#FFF' }]}>
          {t('scanner.title')}
        </Text>
      </View>

      {/* Камера */}
      {isFocused && (
        <Camera
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={isCameraActive}
          photo={true}
        />
      )}

      {/* Оверлей с рамкой */}
      <ViewfinderOverlay />

      {/* Кнопка захвата */}
      <View style={styles.controls}>
        {(isCapturing || isProcessing) && (
          <Card style={styles.processingCard}>
            <ActivityIndicator size="small" color={tokens.colors.accent.primary} />
            <Text style={[styles.processingTitle, { color: tokens.colors.text.primary }]}>
              {t('common.loading')}
            </Text>
            <Text style={[styles.processingSubtitle, { color: tokens.colors.text.secondary }]}>
              {t('scanner.processing')}
            </Text>
          </Card>
        )}

        {error && (
          <Card style={styles.errorCard}>
            <Text style={[styles.errorText, { color: tokens.colors.text.primary }]}>
              {error}
            </Text>
            <PillButton
              title={t('common.retry')}
              onPress={() => setError(null)}
              variant="secondary"
              style={styles.retryButton}
            />
          </Card>
        )}

        <TouchableOpacity
          style={[
            styles.captureButton,
            { 
              backgroundColor: tokens.colors.button.primary.background,
              opacity: isProcessing || isCapturing ? 0.5 : 1,
            },
          ]}
          onPress={handleCapture}
          disabled={isProcessing || isCapturing}
        >
          <View
            style={[
              styles.captureButtonInner,
              { backgroundColor: tokens.colors.background.card },
            ]}
          />
        </TouchableOpacity>

        {isProcessing && (
          <Text style={[styles.processingText, { color: tokens.colors.text.primary }]}>
            {t('common.loading')}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  screenHeader: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    zIndex: 10,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  text: {
    fontSize: 18,
  },
  permissionCard: {
    margin: 16,
    padding: 24,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 24,
  },
  permissionButton: {
    marginBottom: 12,
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 100, // Трохи нижче
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  processingCard: {
    marginBottom: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    width: '100%',
    alignItems: 'center',
  },
  processingTitle: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  processingSubtitle: {
    marginTop: 4,
    fontSize: 13,
  },
  errorCard: {
    marginBottom: 16,
    padding: 16,
    width: '100%',
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    marginTop: 8,
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  processingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
});
