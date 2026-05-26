import React, { useState, useCallback } from 'react';
import { DateTime } from 'luxon';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, TextInput, KeyboardAvoidingView } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useAlert } from '../theme/AlertContext';
import { Ionicons } from '@expo/vector-icons';
import { tripRepository } from '../services/database/TripRepository';
import { ticketRepository } from '../services/database/TicketRepository';
import { notificationScheduler } from '../services/NotificationScheduler';
import { registrationMatcher } from '../services/RegistrationMatcher';
import { Ticket, Trip } from '../types/ticket';
import { Card } from '../components/Card';
import { ScreenGradient } from '../components/ScreenGradient';
import { formatDateToDisplay, parseISO } from '../utils/dateUtils';
import { openUrl } from '../utils/linkingUtils';
import { extractIataCode, cleanCityName } from '../utils/stringUtils';
import { Modal, Pressable } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'TripDetail'>;

export const TripDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { tokens } = useTheme();
  const { t } = useTranslation();
  const { showAlert } = useAlert();
  const { tripId } = route.params;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [regInfos, setRegInfos] = useState<Record<number, any>>({});
  
  // Состояние для ручного уведомления
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [tempDate, setTempDate] = useState(new Date());
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');

  const fetchTripDetails = async () => {
    try {
      setIsLoading(true);
      const currentTrip = await tripRepository.findById(tripId);
      
      if (currentTrip && currentTrip.tickets) {
        // Сортируем билеты: 
        // 1. Группируем по "поездкам" (разрыв более 3 дней считается новой поездкой)
        // 2. Самые новые поездки — вверх
        // 3. Внутри поездки — по порядку вылета
        const sortedTickets = [...currentTrip.tickets].sort((a, b) => {
          const dateA = new Date(a.departureDate).getTime();
          const dateB = new Date(b.departureDate).getTime();
          // Сначала по году/месяцу (убывание), чтобы 2026 был выше 2024
          if (a.departureDate.substring(0, 7) !== b.departureDate.substring(0, 7)) {
            return dateB - dateA;
          }
          // Если месяц один - по возрастанию дня (чтобы 9-е было выше 10-го)
          return dateA - dateB;
        });

        setTrip({ ...currentTrip, tickets: sortedTickets });
        
        // Получаем информацию о регистрации для каждого билета
        const infos: Record<number, any> = {};
        for (const ticket of sortedTickets) {
          const info = await registrationMatcher.match(ticket);
          infos[ticket.id] = info;
        }
        setRegInfos(infos);
      }
    } catch (error) {
      console.error('Error fetching trip details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTripDetails();
    }, [tripId])
  );

  const handleDeleteTrip = () => {
    showAlert({
      title: t('common.delete'),
      message: t('trip.confirmDelete', 'Видалити всю поїздку та всі квитки?'),
      type: 'warning',
      buttons: [
        { 
          text: t('common.delete'), 
          style: 'destructive',
          onPress: async () => {
            await tripRepository.deleteTrip(tripId);
            navigation.goBack();
          }
        },
        { text: t('common.cancel'), style: 'cancel' }
      ]
    });
  };

  // Custom Picker State
  const [manualDate, setManualDate] = useState('');
  const [manualTime, setManualTime] = useState('');

  const handleOpenDatePicker = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    const initialDate = ticket.customNotificationDate 
      ? new Date(ticket.customNotificationDate) 
      : new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow by default
    
    // Set initial values for manual input
    const d = initialDate.getDate().toString().padStart(2, '0');
    const m = (initialDate.getMonth() + 1).toString().padStart(2, '0');
    const y = initialDate.getFullYear();
    setManualDate(`${d}.${m}.${y}`);

    const hr = initialDate.getHours().toString().padStart(2, '0');
    const min = initialDate.getMinutes().toString().padStart(2, '0');
    setManualTime(`${hr}:${min}`);
    
    setIsDatePickerVisible(true);
  };

  const handleConfirmCustomDate = () => {
    const [d, m, y] = manualDate.split('.');
    const [hr, min] = manualTime.split(':');
    
    const finalDate = new Date();
    finalDate.setFullYear(parseInt(y) || new Date().getFullYear());
    finalDate.setMonth((parseInt(m) || 1) - 1);
    finalDate.setDate(parseInt(d) || new Date().getDate());
    finalDate.setHours(parseInt(hr) || 0, parseInt(min) || 0, 0, 0);
    
    setIsDatePickerVisible(false);
    saveCustomNotification(finalDate);
  };

  const saveCustomNotification = async (date: Date) => {
    if (!selectedTicket) return;

    try {
      // Отменяем старое ручное уведомление, если оно было
      if (selectedTicket.customNotificationId) {
        await notificationScheduler.cancel(selectedTicket.customNotificationId);
      }

      // Планируем новое
      const notificationId = await notificationScheduler.scheduleCustom(selectedTicket, date);
      
      // Сохраняем в базу
      await ticketRepository.updateCustomNotification(
        selectedTicket.id, 
        notificationId, 
        date.toISOString()
      );

      // Обновляем UI
      fetchTripDetails();
      
      showAlert({
        title: t('common.success'),
        message: t('registration.reminderSet', 'Нагадування встановлено!'),
        type: 'success'
      });
    } catch (error) {
      console.error('Error saving custom notification:', error);
    }
  };

  const handleRemoveCustomNotification = async (ticket: Ticket) => {
    try {
      if (ticket.customNotificationId) {
        await notificationScheduler.cancel(ticket.customNotificationId);
      }
      await ticketRepository.updateCustomNotification(ticket.id, null, null);
      fetchTripDetails();
    } catch (error) {
      console.error('Error removing custom notification:', error);
    }
  };

  if (isLoading || !trip) {
    return (
      <ScreenGradient style={styles.container}>
        <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={tokens.colors.accent.primary} />
        </View>
      </ScreenGradient>
    );
  }

  return (
    <ScreenGradient style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={tokens.colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitleBox}>
          <Text style={[styles.headerTitle, { color: tokens.colors.text.primary }]}>
            {trip.passengerName}
          </Text>
          {trip.pnr && (
            <Text style={[styles.headerSubtitle, { color: tokens.colors.status.success }]}>
              Booking: {trip.pnr}
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={handleDeleteTrip}>
          <Ionicons name="trash-outline" size={24} color={tokens.colors.status.error} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.timeline}>
          {trip.tickets?.map((ticket, index) => {
            const regInfo = regInfos[ticket.id];
            const isLast = index === (trip.tickets?.length || 0) - 1;
            const timeUntil = regInfo ? registrationMatcher.getTimeUntilRegistration(regInfo.registrationOpensAt) : '';

            return (
              <View key={ticket.id} style={styles.timelineItem}>
                {/* Вертикальная линия */}
                <View style={styles.lineColumn}>
                  <View style={[styles.dot, { backgroundColor: tokens.colors.accent.primary }]} />
                  {!isLast && <View style={[styles.line, { backgroundColor: tokens.colors.border.default }]} />}
                </View>

                {/* Карточка сегмента */}
                <View style={styles.contentColumn}>
                  <Card style={styles.flightCard}>
                    <TouchableOpacity 
                      onPress={() => navigation.navigate('TicketDetail', { ticketId: ticket.id })}
                    >
                      <View style={styles.flightHeader}>
                        <View>
                          <Text style={[styles.flightNumber, { color: tokens.colors.text.primary }]}>
                            {ticket.airlineCode} {ticket.flightNumber}
                          </Text>
                          {ticket.operatingAirlineName && (
                            <Text style={[styles.operatedBy, { color: tokens.colors.accent.primary }]}>
                              Operated by {ticket.operatingAirlineName}
                            </Text>
                          )}
                        </View>
                        <Text style={[styles.flightDate, { color: tokens.colors.text.secondary }]}>
                          {formatDateToDisplay(ticket.departureDate)}
                        </Text>
                      </View>

                      <View style={styles.routeBox}>
                        <View style={styles.airportBox}>
                          <Text style={[styles.airportCode, { color: tokens.colors.text.primary }]}>
                            {cleanCityName(ticket.departureCity) || extractIataCode(ticket.departureAirport)}
                          </Text>
                          <Text style={[styles.locationText, { color: tokens.colors.text.secondary }]}>
                            {extractIataCode(ticket.departureAirport)}
                          </Text>
                          <Text style={[styles.airportTime, { color: tokens.colors.text.primary }]}>
                            {ticket.departureTime?.replace(':', '.')}
                          </Text>
                        </View>
                        
                        <Ionicons name="airplane" size={16} color={tokens.colors.accent.primary} style={styles.routeIcon} />
                        
                        <View style={[styles.airportBox, { alignItems: 'flex-end' }]}>
                          <Text style={[styles.airportCode, { color: tokens.colors.text.primary }]}>
                            {cleanCityName(ticket.arrivalCity) || extractIataCode(ticket.arrivalAirport)}
                          </Text>
                          <Text style={[styles.locationText, { color: tokens.colors.text.secondary, textAlign: 'right' }]}>
                            {extractIataCode(ticket.arrivalAirport)}
                          </Text>
                          <Text style={[styles.airportTime, { color: tokens.colors.text.secondary }]}>
                             — 
                          </Text>
                        </View>
                      </View>

                      {regInfo && (
                        <View style={[styles.regBox, { borderTopColor: tokens.colors.border.default }]}>
                          <View style={styles.regInfo}>
                            <Text style={[styles.regLabel, { color: tokens.colors.text.secondary }]}>
                              {t('registration.opens')}
                            </Text>
                            <View style={styles.regValueRow}>
                              <Text style={[styles.regValue, { color: tokens.colors.status.success }]}>
                                {regInfo.formattedDate}
                              </Text>
                            </View>
                            <Text style={{ fontSize: 11, color: tokens.colors.text.secondary, marginTop: 2, fontWeight: 'bold' }}>
                              По Киеву: {DateTime.fromJSDate(regInfo.registrationOpensAt).setZone('Europe/Kyiv').toFormat('dd.MM.yyyy HH.mm')}
                            </Text>
                            
                            {ticket.customNotificationDate && (
                              <TouchableOpacity 
                                style={styles.customReminderBox}
                                onPress={() => {
                                  showAlert({
                                    title: t('registration.reminder'),
                                    message: `${t('registration.reminderAt', 'Нагадування встановлено на')}: ${new Date(ticket.customNotificationDate).toLocaleString()}`,
                                    buttons: [
                                      { text: t('common.change'), onPress: () => handleOpenDatePicker(ticket) },
                                      { text: t('common.delete'), style: 'destructive', onPress: () => handleRemoveCustomNotification(ticket) },
                                      { text: t('common.close'), style: 'cancel' }
                                    ]
                                  });
                                }}
                              >
                                <Text style={[styles.customReminderText, { color: tokens.colors.accent.primary }]}>
                                  🔔 {DateTime.fromISO(ticket.customNotificationDate).toFormat('dd.MM.yyyy HH.mm')}
                                </Text>
                              </TouchableOpacity>
                            )}

                            <Text style={[
                              styles.regTimeUntil, 
                              { 
                                color: tokens.colors.status.error 
                              }
                            ]}>
                              {timeUntil}
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <TouchableOpacity 
                              style={[styles.regButton, { backgroundColor: 'transparent' }]}
                              onPress={() => handleOpenDatePicker(ticket)}
                            >
                              <Ionicons 
                                name={ticket.customNotificationDate ? "notifications" : "notifications-outline"} 
                                size={28} 
                                color={ticket.customNotificationDate ? tokens.colors.status.error : tokens.colors.text.secondary} 
                              />
                            </TouchableOpacity>

                            {regInfo.registrationUrl && (
                              <TouchableOpacity 
                                style={[styles.regButton, { backgroundColor: tokens.colors.accent.primary }]}
                                onPress={() => openUrl(regInfo.registrationUrl)}
                              >
                                <Ionicons name="globe-outline" size={18} color="#FFF" />
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      )}
                    </TouchableOpacity>
                  </Card>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Custom JS Date/Time Picker Modal */}
      <Modal
        visible={isDatePickerVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsDatePickerVisible(false)}
      >
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setIsDatePickerVisible(false)}
        >
          <Pressable 
            style={[
              styles.pickerContainer, 
              { 
                backgroundColor: tokens.colors.background.card,
                borderColor: tokens.colors.border.default,
                borderWidth: 1,
              }
            ]} 
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHandle} />
            <Text style={[styles.pickerTitle, { color: tokens.colors.text.primary }]}>
              {t('registration.selectTime', 'Оберіть час нагадування')}
            </Text>
            
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: tokens.colors.text.secondary }]}>Дата (ДД.ММ.ГГГГ)</Text>
              <TextInput
                style={[
                  styles.manualInput,
                  { 
                    backgroundColor: tokens.colors.background.app, 
                    color: tokens.colors.text.primary,
                    borderColor: tokens.colors.border.default
                  }
                ]}
                value={manualDate}
                onChangeText={setManualDate}
                keyboardType="numeric"
                placeholder="16.05.2026"
                placeholderTextColor={tokens.colors.text.tertiary}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: tokens.colors.text.secondary }]}>Час (ГГ:ХХ)</Text>
              <TextInput
                style={[
                  styles.manualInput,
                  { 
                    backgroundColor: tokens.colors.background.app, 
                    color: tokens.colors.text.primary,
                    borderColor: tokens.colors.border.default
                  }
                ]}
                value={manualTime}
                onChangeText={setManualTime}
                keyboardType="numeric"
                placeholder="12:00"
                placeholderTextColor={tokens.colors.text.tertiary}
              />
            </View>

            <View style={styles.pickerActions}>
              <TouchableOpacity style={styles.pickerCancelBtn} onPress={() => setIsDatePickerVisible(false)}>
                <Text style={{ color: tokens.colors.text.secondary, fontWeight: 'bold' }}>{t('common.cancel', 'Скасувати')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.pickerConfirmBtn, { backgroundColor: tokens.colors.accent.primary }]} onPress={handleConfirmCustomDate}>
                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>{t('common.save', 'Зберегти')}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingTop: 50, 
    paddingHorizontal: 20, 
    paddingBottom: 20 
  },
  backButton: { padding: 4 },
  headerTitleBox: { flex: 1, marginLeft: 16 },
  headerTitle: { fontSize: 18, fontWeight: '800', textTransform: 'uppercase' },
  headerSubtitle: { fontSize: 12, marginTop: 2 },
  scrollContent: { padding: 20 },
  timeline: { width: '100%' },
  timelineItem: { flexDirection: 'row', marginBottom: 0 },
  lineColumn: { alignItems: 'center', width: 24, marginRight: 12 },
  dot: { width: 12, height: 12, borderRadius: 6, zIndex: 2, marginTop: 24 },
  line: { width: 2, flex: 1, marginTop: -4, marginBottom: -20 },
  contentColumn: { flex: 1, paddingBottom: 24 },
  flightCard: { padding: 16, borderRadius: 20 },
  flightHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  flightNumber: { fontSize: 15, fontWeight: '700' },
  operatedBy: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', marginTop: 2 },
  flightDate: { fontSize: 13 },
  routeBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  airportBox: { flex: 1 },
  airportCode: { fontSize: 18, fontWeight: '800' },
  locationText: { fontSize: 10, fontWeight: '500', marginTop: -2, marginBottom: 4 },
  airportTime: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  routeIcon: { marginHorizontal: 10 },
  regBox: { 
    marginTop: 12, 
    paddingTop: 12, 
    borderTopWidth: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between' 
  },
  regInfo: { flex: 1 },
  regLabel: { fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 2 },
  regValueRow: { flexDirection: 'row', alignItems: 'center' },
  regValue: { fontSize: 14, fontWeight: '800' },
  bellIcon: { padding: 4, marginLeft: 8 },
  customReminderBox: { 
    marginTop: 4, 
    backgroundColor: 'rgba(41, 121, 255, 0.1)', 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 6,
    alignSelf: 'flex-start'
  },
  customReminderText: { fontSize: 11, fontWeight: '700' },
  regTimeUntil: { fontSize: 14, marginTop: 4, fontWeight: '700' },
  regButton: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginLeft: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 20,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(150,150,150,0.3)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
    marginTop: -8,
  },
  pickerTitle: { fontSize: 20, fontWeight: '800', marginBottom: 24, textAlign: 'center' },
  inputContainer: { marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  manualInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 1,
  },
  pickerActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  pickerCancelBtn: { flex: 1, padding: 16, alignItems: 'center', borderRadius: 16, backgroundColor: 'transparent' },
  pickerConfirmBtn: { flex: 1, padding: 16, alignItems: 'center', borderRadius: 16, marginLeft: 12 }
});
