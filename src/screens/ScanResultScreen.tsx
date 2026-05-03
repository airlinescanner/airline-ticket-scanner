import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAlert } from '../theme/AlertContext';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Input } from '../components/Input';
import { PillButton } from '../components/PillButton';
import { formatDateToDisplay, parseDisplayDateToISO } from '../utils/dateUtils';
import { ticketRepository } from '../services/database/TicketRepository';

type Props = NativeStackScreenProps<RootStackParamList, 'ScanResult'>;

export const ScanResultScreen: React.FC<Props> = ({ route, navigation }) => {
  const { tokens } = useTheme();
  const { t } = useTranslation();
  const { showAlert } = useAlert();
  const { ticketDataList } = route.params;

  // Общее имя пассажира для всех рейсов
  const [passengerName, setPassengerName] = useState(ticketDataList[0]?.passengerName || '');
  
  // Состояние для каждого найденного рейса (сегмента)
  const [flights, setFlights] = useState(ticketDataList.map(t => ({
    airlineName: t.airlineName || '',
    airlineCode: t.airlineCode || '',
    flightNumber: t.flightNumber || '',
    departureDate: formatDateToDisplay(t.departureDate) || '', 
    departureTime: t.departureTime || '',
    departureCity: t.departureCity || '',
    departureCountry: t.departureCountry || '',
    departureAirport: t.departureAirport || '',
    arrivalAirport: t.arrivalAirport || '',
    seat: t.seat || '',
    serviceClass: t.serviceClass || '',
    rawJson: t.rawJson,
  })));

  const [isSaving, setIsSaving] = useState(false);

  const validateForm = () => {
    if (!passengerName) return t('ticket.passengerName') + ' ' + t('airline.validation.required');
    
    for (let i = 0; i < flights.length; i++) {
      const f = flights[i];
      if (!f.airlineCode && !f.airlineName) return `Flight ${i+1}: Airline required`;
      if (!f.flightNumber) return `Flight ${i+1}: Flight number required`;
      if (!f.departureDate) return `Flight ${i+1}: Departure date required`;
      if (!f.departureTime) return `Flight ${i+1}: Departure time required`;
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
      
      // Сохраняем каждый рейс как отдельный билет в базе
      for (const flight of flights) {
        await ticketRepository.save({
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
          seat: flight.seat || null,
          serviceClass: flight.serviceClass || null,
          rawJson: flight.rawJson,
          notificationEnabled: false,
          notificationId: null,
        });
      }

      showAlert({
        title: t('common.success'), 
        message: t('ticket.savedSuccess', 'Квитки успішно збережено'),
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

  const handleFlightChange = (index: number, field: keyof typeof flights[0], value: string) => {
    const newFlights = [...flights];
    newFlights[index] = { ...newFlights[index], [field]: value };
    setFlights(newFlights);
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: tokens.colors.background.app }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.title, { color: tokens.colors.text.primary }]}>
          {t('ticket.confirm', 'Підтвердіть дані')}
        </Text>
        
        {/* Блок Пассажира */}
        <View style={[styles.card, { backgroundColor: tokens?.colors?.background?.card || '#FFFFFF' }]}>
          <Text style={[styles.sectionTitle, { color: tokens.colors.text.secondary }]}>
            PASSENGER
          </Text>
          <Input
            label={t('ticket.passengerName')}
            value={passengerName}
            onChangeText={setPassengerName}
            placeholder="IVANOV/IVAN"
          />
        </View>

        {/* Список Рейсов */}
        {flights.map((flight, index) => (
          <View key={index} style={[styles.card, { backgroundColor: tokens?.colors?.background?.card || '#FFFFFF', marginTop: 16 }]}>
            <Text style={[styles.sectionTitle, { color: tokens.colors.accent?.primary || '#00C853' }]}>
              FLIGHT SEGMENT {index + 1}
            </Text>
            
            <Input
              label="Airline Name"
              value={flight.airlineName}
              onChangeText={(text) => handleFlightChange(index, 'airlineName', text)}
              placeholder="Lot Polish Airlines"
            />

            <View style={styles.row}>
              <View style={styles.flexHalf}>
                <Input
                  label={t('ticket.airlineCode')}
                  value={flight.airlineCode}
                  onChangeText={(text) => handleFlightChange(index, 'airlineCode', text)}
                  placeholder="LO"
                  autoCapitalize="characters"
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
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.flexHalf}>
                <Input
                  label={t('ticket.departureDate')}
                  value={flight.departureDate}
                  onChangeText={(text) => handleFlightChange(index, 'departureDate', text)}
                  placeholder="DD.MM.YYYY"
                />
              </View>
              <View style={styles.spacing} />
              <View style={styles.flexHalf}>
                <Input
                  label="Departure Time"
                  value={flight.departureTime}
                  onChangeText={(text) => handleFlightChange(index, 'departureTime', text)}
                  placeholder="HH:mm"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.flexHalf}>
                <Input
                  label="Departure City"
                  value={flight.departureCity}
                  onChangeText={(text) => handleFlightChange(index, 'departureCity', text)}
                  placeholder="Warsaw"
                />
              </View>
              <View style={styles.spacing} />
              <View style={styles.flexHalf}>
                <Input
                  label="Departure Airport"
                  value={flight.departureAirport}
                  onChangeText={(text) => handleFlightChange(index, 'departureAirport', text)}
                  placeholder="WAW"
                  autoCapitalize="characters"
                />
              </View>
            </View>

            <Input
              label={t('ticket.arrivalAirport')}
              value={flight.arrivalAirport}
              onChangeText={(text) => handleFlightChange(index, 'arrivalAirport', text)}
              placeholder="LYS"
              autoCapitalize="characters"
            />
          </View>
        ))}

        <View style={styles.buttonContainer}>
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
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
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
});
