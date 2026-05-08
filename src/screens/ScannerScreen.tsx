/**
 * Экран сканирования билетов
 * 
 * Отображает камеру для захвата изображения билета
 * Интегрирует OCR для распознавания текста
 * Обрабатывает ошибки и показывает инструкции
 */

import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Linking } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { ViewfinderOverlay } from '../components/ViewfinderOverlay';
import { PillButton } from '../components/PillButton';
import { Card } from '../components/Card';
import type { RootStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const ScannerScreen: React.FC = () => {
  const { tokens } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const cameraRef = useRef<Camera>(null);
  
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Обработка захвата изображения
  const handleCapture = async () => {
    if (!cameraRef.current || isProcessing) return;

    try {
      setIsProcessing(true);
      setError(null);

      // Захват фото
      const photo = await cameraRef.current.takePhoto({});

      // TODO: Интеграция OCR и парсинга
      // const ocrResult = await ocrService.recognizeText(`file://${photo.path}`);
      // const ticketData = ticketParser.parse(ocrResult.rawText);
      
      // Временно: переход с пустыми данными
      navigation.navigate('ScanResult', { 
        ticketDataList: [{
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
    } catch (err: any) {
      console.error('Scan error:', err);
      setError(t('common.error'));
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
  if (device == null) {
    return (
      <View style={[styles.container, { backgroundColor: tokens.colors.background.app }]}>
        <Text style={[styles.text, { color: tokens.colors.text.primary }]}>
          {t('common.loading')}
        </Text>
      </View>
    );
  }

  // Нет разрешения
  if (!hasPermission) {
    return (
      <View style={[styles.container, { backgroundColor: tokens.colors.background.app }]}>
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

  return (
    <View style={styles.container}>
      {/* Камера */}
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={!isProcessing}
        photo={true}
      />

      {/* Оверлей с рамкой */}
      <ViewfinderOverlay />

      {/* Кнопка захвата */}
      <View style={styles.controls}>
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
              opacity: isProcessing ? 0.5 : 1,
            },
          ]}
          onPress={handleCapture}
          disabled={isProcessing}
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
    paddingBottom: 48,
    paddingHorizontal: 16,
    alignItems: 'center',
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
