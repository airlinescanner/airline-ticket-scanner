import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useAlert } from '../theme/AlertContext';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Input } from '../components/Input';
import { PillButton } from '../components/PillButton';
import { ScreenGradient } from '../components/ScreenGradient';
import { formatDateToDisplay, parseDisplayDateToISO } from '../utils/dateUtils';
import { ticketRepository } from '../services/database/TicketRepository';
import { tripRepository } from '../services/database/TripRepository';
import { notificationScheduler } from '../services/NotificationScheduler';
import { registrationMatcher } from '../services/RegistrationMatcher';

type Props = NativeStackScreenProps<RootStackParamList, 'ScanResult'>;

export const ScanResultScreen: React.FC<Props> = ({ route, navigation }) => {
  const { tokens } = useTheme();
  const { t } = useTranslation();
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();
  const { ticketDataList = [] } = route.params || {};

  // Общее имя пассажира для всех рейсов
  const [passengerName, setPassengerName] = useState(ticketDataList[0]?.passengerName || '');
  
  // Состояние для каждого найденного рейса (сегмента)
  const [flights, setFlights] = useState(
    [...(ticketDataList || [])]
      .sort((a, b) => {
        const dateA = new Date(`${a.departureDate}T${a.departureTime || '00:00'}`).getTime();
        const dateB = new Date(`${b.departureDate}T${b.departureTime || '00:00'}`).getTime();
        return dateA - dateB;
      })
      .map(t => ({
        airlineName: t.airlineName || '',
        airlineCode: t.airlineCode || '',
        flightNumber: t.flightNumber || '',
        departureDate: formatDateToDisplay(t.departureDate) || '', 
        departureTime: t.departureTime || '',
        departureCity: t.departureCity || '',
        departureCountry: t.departureCountry || '',
        departureAirport: t.departureAirport || '',
        arrivalAirport: t.arrivalAirport || '',
        arrivalCity: t.arrivalCity || '',
        arrivalCountry: t.arrivalCountry || '',
        seat: t.seat || '',
        serviceClass: t.serviceClass || '',
        bookingReference: t.bookingReference || '',
        operatingAirlineName: t.operatingAirlineName || '',
        operatingAirlineCode: t.operatingAirlineCode || '',
        rawJson: t.rawJson,
        confidence: t.confidence || {}, // Маппим уверенность
      }))
  );

  const [isSaving, setIsSaving] = useState(false);

  const validateForm = () => {
    if (!passengerName) return t('ticket.passengerName') + ' ' + t('airline.validation.required');
    
    for (let i = 0; i < flights.length; i++) {
      const f = flights[i];
      if (!f.airlineCode && !f.airlineName) return `${t('ticket.flight')} ${i+1}: ${t('airline.validation.required')}`;
      if (!f.flightNumber) return `${t('ticket.flight')} ${i+1}: ${t('airline.validation.required')}`;
      if (!f.departureDate) return `${t('ticket.flight')} ${i+1}: ${t('airline.validation.required')}`;
      if (!f.departureTime) return `${t('ticket.flight')} ${i+1}: ${t('airline.validation.required')}`;
    }
    return null;
  };

  const handleSave = async () => {
    const error = validateForm();
    if (error) {
      showAlert({
        title: t('common.error'),
        message: error,
        type: 'warning'
      });
      return;
    }

    try {
      setIsSaving(true);
      
      // 0. Автоматическая очистка дубликатов
      for (const flight of flights) {
        const isoDate = parseDisplayDateToISO(flight.departureDate);
        const duplicate = await ticketRepository.findDuplicate(flight.flightNumber, isoDate, flight.airlineCode, flight.bookingReference);
        
        if (duplicate) {
          console.log(`[ScanResultScreen] Auto-cleaning duplicate ticket ID: ${duplicate.id}`);
          await ticketRepository.delete(duplicate.id);
        }
      }

      // 1. Сначала определяем или создаем поездку (Trip)
      // Берем данные первого рейса как основу для поиска поездки
      const firstFlight = flights[0];
      const tripId = await tripRepository.findOrCreateTripForTicket({
        passengerName: passengerName,
        airlineName: firstFlight.airlineName || null,
        airlineCode: firstFlight.airlineCode,
        flightNumber: firstFlight.flightNumber,
        departureDate: parseDisplayDateToISO(firstFlight.departureDate),
        departureTime: firstFlight.departureTime,
        departureCity: firstFlight.departureCity,
        departureCountry: firstFlight.departureCountry || null,
        departureAirport: firstFlight.departureAirport,
        arrivalAirport: firstFlight.arrivalAirport,
        arrivalCity: firstFlight.arrivalCity || null,
        arrivalCountry: firstFlight.arrivalCountry || null,
        seat: firstFlight.seat || null,
        serviceClass: firstFlight.serviceClass || null,
        bookingReference: firstFlight.bookingReference || null,
        operatingAirlineName: firstFlight.operatingAirlineName || null,
        operatingAirlineCode: firstFlight.operatingAirlineCode || null,
        rawJson: firstFlight.rawJson,
        notificationEnabled: true,
        notificationId: null,
      });

      // 2. Сохраняем каждый рейс как отдельный билет, привязанный к этой поездке
      for (const flight of flights) {
        const savedTicket = await ticketRepository.save({
          passengerName: passengerName,
          airlineName: flight.airlineName || null,
          airlineCode: flight.airlineCode || (flight.flightNumber?.substring(0, 2) || ''),
          flightNumber: flight.flightNumber,
          departureDate: parseDisplayDateToISO(flight.departureDate),
          departureTime: flight.departureTime,
          departureCity: flight.departureCity,
          departureCountry: flight.departureCountry || null,
          departureAirport: flight.departureAirport,
          arrivalAirport: flight.arrivalAirport,
          arrivalCity: flight.arrivalCity || null,
          arrivalCountry: flight.arrivalCountry || null,
          seat: flight.seat || null,
          serviceClass: flight.serviceClass || null,
          bookingReference: flight.bookingReference || null,
          rawJson: flight.rawJson,
          notificationEnabled: true,
          notificationId: null,
          tripId: tripId,
          operatingAirlineName: flight.operatingAirlineName || null,
          operatingAirlineCode: flight.operatingAirlineCode || null,
        });

        // 3. Автоматически планируем уведомление, если возможно
        try {
          const regInfo = await registrationMatcher.match(savedTicket);
          if (regInfo && regInfo.registrationOpensAt.getTime() > Date.now()) {
            const notificationId = await notificationScheduler.schedule(savedTicket, regInfo.registrationOpensAt);
            if (notificationId) {
              await ticketRepository.updateNotification(savedTicket.id, true, notificationId);
            }
          } else if (regInfo && regInfo.registrationOpensAt.getTime() < Date.now()) {
            // Если дата в прошлом, не пытаемся планировать уведомление
            showAlert({
              title: t('registration.online_registration'),
              message: t('registration.alreadyOpened'),
              type: 'warning'
            });
          }
        } catch (err) {
          console.warn('Auto-scheduling notification failed:', err);
        }
      }

      showAlert({
        title: t('common.success'), 
        message: t('ticket.savedSuccess'),
        type: 'success',
        buttons: [{ text: t('common.ok'), onPress: () => navigation.navigate('MainTabs') }]
      });
    } catch (err) {
      console.error('Error saving tickets:', err);
      showAlert({
        title: t('common.error'),
        message: t('common.error'),
        type: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getConflicts = (index: number) => {
    try {
      const raw = JSON.parse(flights[index].rawJson || '{}');
      return {
        conflicts: raw.conflicts || [],
        ai1: raw.ai1 || {},
        ai2: raw.ai2 || {}
      };
    } catch {
      return { conflicts: [], ai1: {}, ai2: {} };
    }
  };

  const passengerConflicts = (() => {
    try {
      const raw = JSON.parse(flights[0]?.rawJson || '{}');
      return {
        hasConflict: raw.conflicts?.includes('passengerName'),
        ai1: raw.ai1?.passengerName,
        ai2: raw.ai2?.passengerName
      };
    } catch {
      return { hasConflict: false };
    }
  })();

  const handleFlightChange = (index: number, field: keyof typeof flights[0], value: string) => {
    const newFlights = [...flights];
    newFlights[index] = { ...newFlights[index], [field]: value };
    setFlights(newFlights);
  };

  const renderConflictInfo = (field: string, ai1Val: string, ai2Val: string) => {
    if (!ai1Val && !ai2Val) return null;
    return (
      <View style={styles.conflictInfo}>
        <Text style={styles.conflictTitle}>Mismatch detected:</Text>
        <Text style={styles.conflictText}>AI 1: <Text style={styles.conflictValue}>{ai1Val || '—'}</Text></Text>
        <Text style={styles.conflictText}>AI 2: <Text style={styles.conflictValue}>{ai2Val || '—'}</Text></Text>
      </View>
    );
  };

  const getWarning = (score?: number) => {
    if (score !== undefined && score < 0.7 && score > 0) {
      return t('ticket.lowConfidence', 'Low confidence');
    }
    return undefined;
  };

  return (
    <ScreenGradient style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={[styles.title, { color: tokens.colors.text.primary }]}>
            {t('ticket.confirm', 'Підтвердіть дані')}
          </Text>

          {/* Индикатор оффлайн режима */}
          {ticketDataList[0]?.rawJson?.includes('"cloud": null') && (
            <View style={[styles.offlineBadge, { backgroundColor: '#FF9500' }]}>
              <Text style={styles.offlineText}>Offline Mode: AI analysis unavailable</Text>
            </View>
          )}
        
        {/* Блок Пассажира */}
        <View style={[styles.card, { backgroundColor: tokens?.colors?.background?.card || '#FFFFFF' }]}>
          <Text style={[styles.sectionTitle, { color: tokens.colors.text.secondary }]}>
            {t('ticket.passengerName').toUpperCase()}
          </Text>
          <Input
            label={t('ticket.passengerName')}
            value={passengerName}
            onChangeText={setPassengerName}
            placeholder="IVANOV/IVAN"
            error={passengerConflicts.hasConflict ? 'Mismatch detected' : undefined}
            warning={getWarning(ticketDataList[0]?.confidence?.passengerName)}
          />
          {passengerConflicts.hasConflict && renderConflictInfo('passengerName', passengerConflicts.ai1, passengerConflicts.ai2)}
        </View>

        {/* Список Рейсов */}
        {flights.map((flight, index) => {
          const { conflicts, ai1, ai2 } = getConflicts(index);
          const conf = flight.confidence;
          
          return (
            <View key={index} style={[styles.card, { backgroundColor: tokens?.colors?.background?.card || '#FFFFFF', marginTop: 16 }]}>
              <Text style={[styles.sectionTitle, { color: tokens.colors.accent?.primary || '#00C853' }]}>
                {t('ticket.flight').toUpperCase()} {index + 1}
              </Text>
              
              <Input
                label={t('ticket.airlineName', 'Airline Name')}
                value={flight.airlineName}
                onChangeText={(text) => handleFlightChange(index, 'airlineName', text)}
                placeholder="Lot Polish Airlines"
                warning={getWarning(conf?.airlineName)}
              />

              {!!flight.operatingAirlineName && (
                <View style={[styles.row, { marginTop: -8, marginBottom: 8 }]}>
                  <View style={styles.flexHalf}>
                    <Input
                      label="Operated by (Name)"
                      value={flight.operatingAirlineName}
                      onChangeText={(text) => handleFlightChange(index, 'operatingAirlineName', text)}
                      placeholder="Air Baltic"
                    />
                  </View>
                  <View style={styles.spacing} />
                  <View style={styles.flexHalf}>
                    <Input
                      label="Operated by (Code)"
                      value={flight.operatingAirlineCode}
                      onChangeText={(text) => handleFlightChange(index, 'operatingAirlineCode', text)}
                      placeholder="BT"
                      autoCapitalize="characters"
                      warning={getWarning(conf?.operatingAirlineCode)}
                    />
                  </View>
                </View>
              )}

              <View style={styles.row}>
                <View style={styles.flexHalf}>
                  <Input
                    label={t('ticket.airlineCode')}
                    value={flight.airlineCode}
                    onChangeText={(text) => handleFlightChange(index, 'airlineCode', text)}
                    placeholder="LO"
                    autoCapitalize="characters"
                    warning={getWarning(conf?.airlineCode)}
                  />
                </View>
                <View style={styles.spacing} />
                <View style={styles.flexHalf}>
                  <Input
                    label={t('ticket.flightNumber')}
                    value={flight.flightNumber}
                    onChangeText={(text) => handleFlightChange(index, 'flightNumber', text)}
                    placeholder="LO347"
                    autoCapitalize="characters"
                    error={conflicts.includes('flightNumber') ? 'Mismatch' : undefined}
                    warning={getWarning(conf?.flightNumber)}
                  />
                </View>
              </View>
              {conflicts.includes('flightNumber') && renderConflictInfo('flightNumber', ai1.flightNumber, ai2.flightNumber)}

              <View style={styles.row}>
                <View style={styles.flexHalf}>
                  <Input
                    label={t('ticket.departureDate')}
                    value={flight.departureDate}
                    onChangeText={(text) => handleFlightChange(index, 'departureDate', text)}
                    placeholder="DD.MM.YYYY"
                    error={conflicts.includes('departureDate') ? 'Mismatch' : undefined}
                    warning={getWarning(conf?.departureDate)}
                  />
                </View>
                <View style={styles.spacing} />
                <View style={styles.flexHalf}>
                  <Input
                    label={t('ticket.departureTime', 'Departure Time')}
                    value={flight.departureTime}
                    onChangeText={(text) => handleFlightChange(index, 'departureTime', text)}
                    placeholder="HH:mm"
                    warning={getWarning(conf?.departureTime)}
                  />
                </View>
              </View>
              {conflicts.includes('departureDate') && renderConflictInfo('departureDate', ai1.departureDate, ai2.departureDate)}

              <View style={styles.row}>
                <View style={styles.flexHalf}>
                  <Input
                    label={t('ticket.departureCity', 'Departure City')}
                    value={flight.departureCity}
                    onChangeText={(text) => handleFlightChange(index, 'departureCity', text)}
                    placeholder="Warsaw"
                    warning={getWarning(conf?.departureCity)}
                  />
                </View>
                <View style={styles.spacing} />
                <View style={styles.flexHalf}>
                  <Input
                    label={t('ticket.departureAirport', 'Departure Airport')}
                    value={flight.departureAirport}
                    onChangeText={(text) => handleFlightChange(index, 'departureAirport', text)}
                    placeholder="WAW"
                    autoCapitalize="characters"
                    warning={getWarning(conf?.departureAirport)}
                  />
                </View>
              </View>
              <View style={styles.row}>
                <View style={styles.flexHalf}>
                  <Input
                    label={t('ticket.arrivalCity', 'Arrival City')}
                    value={flight.arrivalCity}
                    onChangeText={(text) => handleFlightChange(index, 'arrivalCity', text)}
                    placeholder="Paris"
                    warning={getWarning(conf?.arrivalCity)}
                  />
                </View>
                <View style={styles.spacing} />
                <View style={styles.flexHalf}>
                  <Input
                    label={t('ticket.arrivalAirport', 'Arrival Airport')}
                    value={flight.arrivalAirport}
                    onChangeText={(text) => handleFlightChange(index, 'arrivalAirport', text)}
                    placeholder="CDG"
                    autoCapitalize="characters"
                    warning={getWarning(conf?.arrivalAirport)}
                  />
                </View>
              </View>
              <Input
                label={t('ticket.bookingReference', 'Booking Reference (PNR)')}
                value={flight.bookingReference}
                onChangeText={(text) => handleFlightChange(index, 'bookingReference', text)}
                placeholder="AM6X8Y"
                autoCapitalize="characters"
                error={conflicts.includes('bookingReference') ? 'Mismatch' : undefined}
                warning={getWarning(conf?.bookingReference)}
              />
              {conflicts.includes('bookingReference') && renderConflictInfo('bookingReference', ai1.bookingReference, ai2.bookingReference)}
            </View>
          );
        })}

          <View
            style={[
              styles.buttonContainer,
              { marginBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 24) : Math.max(insets.bottom, 12) },
            ]}
          >
            <PillButton
              title={t('common.cancel')}
              onPress={() => navigation.goBack()}
              variant="secondary"
              style={styles.button}
            />
            <PillButton
              title={isSaving ? t('common.loading') : t('common.save')}
              onPress={handleSave}
              variant="primary"
              style={styles.button}
              disabled={isSaving}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, marginTop: 10 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 12, letterSpacing: 1 },
  card: {
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  row: { flexDirection: 'row' },
  flexHalf: { flex: 1 },
  spacing: { width: 16 },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24 },
  button: { flex: 1, marginHorizontal: 8 },
  offlineBadge: {
    padding: 8,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  offlineText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  conflictInfo: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 8,
    padding: 8,
    marginTop: -8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#FF3B30',
  },
  conflictTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  conflictText: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  conflictValue: {
    fontWeight: 'bold',
    color: '#FFFFFF',
    opacity: 1,
  },
});
