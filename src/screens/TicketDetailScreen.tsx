import React, { useState, useCallback } from 'react';
import { DateTime } from 'luxon';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, Clipboard, Vibration, Linking } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useAlert } from '../theme/AlertContext';
import { Ionicons } from '@expo/vector-icons';
import { ticketRepository } from '../services/database/TicketRepository';
import { registrationMatcher } from '../services/RegistrationMatcher';
import { notificationScheduler } from '../services/NotificationScheduler';
import { Ticket } from '../types/ticket';
import { PillButton } from '../components/PillButton';
import { Card } from '../components/Card';
import { ScreenGradient } from '../components/ScreenGradient';
import { formatDateToDisplay } from '../utils/dateUtils';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'TicketDetail'>;

export const TicketDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { tokens } = useTheme();
  const { t } = useTranslation();
  const { showAlert } = useAlert();
  const { ticketId } = route.params;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [regInfo, setRegInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTicketDetails = async () => {
    try {
      setIsLoading(true);
      const data = await ticketRepository.findById(ticketId);
      if (data) {
        setTicket(data);
        const info = await registrationMatcher.match(data);
        setRegInfo(info);
      }
    } catch (error) {
      console.error('Error fetching ticket details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTicketDetails();
    }, [ticketId])
  );

  const handleToggleNotification = async () => {
    if (!ticket || !regInfo) return;

    try {
      if (ticket.notificationEnabled) {
        if (ticket.notificationId) {
          await notificationScheduler.cancel(ticket.notificationId);
        }
        await ticketRepository.updateNotification(ticket.id, false, undefined);
      } else {
        // Если дата в прошлом, не пытаемся планировать уведомление
        if (regInfo.registrationOpensAt.getTime() < Date.now()) {
          showAlert({
            title: t('registration.online_registration'),
            message: t('registration.alreadyOpened'),
            type: 'warning'
          });
          return;
        }

        const notificationId = await notificationScheduler.schedule(
          ticket,
          regInfo.registrationOpensAt
        );
        if (notificationId) {
          await ticketRepository.updateNotification(ticket.id, true, notificationId);
        } else {
          showAlert({
            title: t('common.error'),
            message: 'Failed to schedule notification. Check permissions.',
            type: 'error'
          });
          return;
        }
      }
      fetchTicketDetails();
    } catch (error) {
      console.error('Error toggling notification:', error);
    }
  };

  const handleShare = async () => {
    if (!ticket) return;
    try {
      await Share.share({
        message: `${ticket.airlineName} ${ticket.flightNumber}\n${ticket.departureAirport} -> ${ticket.arrivalAirport}\nPassenger: ${ticket.passengerName}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleCopyToClipboard = (text: string | undefined, label: string) => {
    if (!text) return;
    Clipboard.setString(text);
    Vibration.vibrate(50);
    showAlert({
      title: t('common.copied') || 'Скопировано!',
      message: `${label}: ${text}`,
      type: 'success'
    });
  };

  const handleDelete = () => {
    showAlert({
      title: t('common.delete'),
      message: t('common.confirmDelete'),
      type: 'warning',
      buttons: [
        { 
          text: t('common.delete'), 
          style: 'destructive',
          onPress: async () => {
            await ticketRepository.delete(ticketId);
            navigation.goBack();
          }
        },
        { text: t('common.cancel'), style: 'cancel' }
      ]
    });
  };

  if (isLoading || !ticket) {
    return (
      <ScreenGradient style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={{ color: tokens.colors.text.secondary }}>{t('common.loading')}...</Text>
        </View>
      </ScreenGradient>
    );
  }

  const timeUntil = regInfo ? registrationMatcher.getTimeUntilRegistration(regInfo.registrationOpensAt) : '';

  return (
    <ScreenGradient style={styles.wrapper}>
      <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={tokens.colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: tokens.colors.text.primary }]}>
          {ticket.flightNumber.includes(ticket.airlineCode) ? ticket.flightNumber : `${ticket.airlineCode} ${ticket.flightNumber}`}
        </Text>
        <TouchableOpacity onPress={handleShare}>
          <Ionicons name="share-outline" size={24} color={tokens.colors.text.primary} />
        </TouchableOpacity>
      </View>

      <Card style={styles.mainCard}>
        <TouchableOpacity 
          style={styles.passengerRow} 
          onPress={() => handleCopyToClipboard(ticket.passengerName, 'Имя пассажира')}
          activeOpacity={0.7}
        >
          <Ionicons name="person-circle-outline" size={24} color={tokens.colors.accent.primary} />
          <Text style={[styles.passengerName, { color: tokens.colors.text.primary }]}>
            {ticket.passengerName}
          </Text>
          <Ionicons 
            name="copy-outline" 
            size={16} 
            color={tokens.colors.text.secondary} 
            style={{ marginLeft: 8 }} 
          />
        </TouchableOpacity>

        <View style={styles.routeContainer}>
          <View style={styles.airportBlock}>
            <Text style={[styles.airportCode, { color: tokens.colors.text.primary }]}>{ticket.departureCity || ticket.departureAirport}</Text>
            <Text style={[styles.city, { color: tokens.colors.text.secondary }]}>{ticket.departureAirport}</Text>
          </View>
          <View style={styles.flightIcon}>
            <Ionicons name="airplane" size={30} color={tokens.colors.accent.primary} />
            <View style={[styles.line, { backgroundColor: tokens.colors.border.default }]} />
          </View>
          <View style={[styles.airportBlock, { alignItems: 'flex-end' }]}>
            <Text style={[styles.airportCode, { color: tokens.colors.text.primary }]}>{ticket.arrivalCity || ticket.arrivalAirport}</Text>
            <Text style={[styles.city, { color: tokens.colors.text.secondary }]}>{ticket.arrivalAirport}</Text>
          </View>
        </View>

        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: tokens.colors.text.secondary }]}>{t('ticket.departureDate').toUpperCase()}</Text>
            <Text style={[styles.detailValue, { color: tokens.colors.text.primary }]}>{formatDateToDisplay(ticket.departureDate)}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: tokens.colors.text.secondary }]}>{t('ticket.departureTime').toUpperCase()}</Text>
            <Text style={[styles.detailValue, { color: tokens.colors.text.primary }]}>{ticket.departureTime?.replace(':', '.')}</Text>
          </View>
          <TouchableOpacity 
            style={styles.detailItem}
            onPress={() => handleCopyToClipboard(ticket.bookingReference, 'PNR (Код бронирования)')}
            activeOpacity={0.7}
            disabled={!ticket.bookingReference}
          >
            <Text style={[styles.detailLabel, { color: tokens.colors.text.secondary }]}>PNR</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <Text style={[styles.detailValue, { color: tokens.colors.status.success, marginTop: 0 }]}>
                {ticket.bookingReference || '—'}
              </Text>
              {ticket.bookingReference ? (
                <Ionicons 
                  name="copy-outline" 
                  size={14} 
                  color={tokens.colors.status.success} 
                  style={{ marginLeft: 6 }} 
                />
              ) : null}
            </View>
          </TouchableOpacity>
        </View>
      </Card>

      <Card style={styles.registrationCard}>
        <View style={styles.regHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="time-outline" size={20} color={tokens.colors.accent.primary} />
            <Text style={[styles.regTitle, { color: tokens.colors.text.primary }]}>
              {t('registration.online_registration')}
            </Text>
          </View>
          {regInfo?.airline?.id ? (
            <TouchableOpacity
              style={styles.airlineDetailButton}
              onPress={() => navigation.navigate('AirlineDetail', { airlineId: regInfo.airline.id })}
              activeOpacity={0.7}
            >
              <Text 
                style={[styles.airlineDetailText, { color: tokens.colors.accent.primary }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {regInfo.airline.name}
              </Text>
              <Ionicons name="chevron-forward" size={14} color={tokens.colors.accent.primary} style={{ marginLeft: 2 }} />
            </TouchableOpacity>
          ) : null}
        </View>
        
        {regInfo ? (
          <>
            <Text style={[styles.regOpensAt, { color: tokens.colors.text.primary }]}>
              {t('registration.opens')}: {regInfo.formattedDate}
            </Text>
            <Text style={[styles.timezoneNote, { color: tokens.colors.text.secondary }]}>
              {t('registration.localTimeIn', { city: ticket.departureCity || 'departure city' })}
            </Text>
            <Text style={[styles.timezoneNote, { color: tokens.colors.text.secondary, marginTop: 4, fontWeight: 'bold' }]}>
              (По Киеву: {DateTime.fromJSDate(regInfo.registrationOpensAt).setZone('Europe/Kyiv').toFormat('dd.MM.yyyy HH:mm')})
            </Text>
            
            <View style={[styles.countdownContainer, { backgroundColor: tokens.colors.background.card }]}>
              <Text style={[
                styles.countdownText, 
                { 
                  color: tokens.colors.status.error 
                }
              ]}>
                {timeUntil}
              </Text>
            </View>

            {regInfo.registrationOpensAt.getTime() < Date.now() ? (
              <TouchableOpacity 
                style={[
                  styles.notificationToggle, 
                  { backgroundColor: tokens.colors.accent.primary }
                ]}
                onPress={async () => {
                  const url = regInfo.airline?.registrationUrl;
                  if (url) {
                    try {
                      const supported = await Linking.canOpenURL(url);
                      if (supported) {
                        await Linking.openURL(url);
                      } else {
                        showAlert({
                          title: t('common.error'),
                          message: `Unsupported URL: ${url}`,
                          type: 'error'
                        });
                      }
                    } catch (error) {
                      console.error('Error opening URL:', error);
                    }
                  } else {
                    showAlert({
                      title: t('common.error'),
                      message: 'Ссылка на сайт регистрации авиакомпании отсутствует.',
                      type: 'warning'
                    });
                  }
                }}
              >
                <Ionicons 
                  name="airplane-outline" 
                  size={20} 
                  color="#FFFFFF" 
                />
                <Text style={[
                  styles.notificationToggleText, 
                  { color: "#FFFFFF" }
                ]}>
                  {t('airline.openWebsite')}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={[
                  styles.notificationToggle, 
                  { backgroundColor: ticket.notificationEnabled ? tokens.colors.accent.primary : tokens.colors.background.card }
                ]}
                onPress={handleToggleNotification}
              >
                <Ionicons 
                  name={ticket.notificationEnabled ? "notifications" : "notifications-outline"} 
                  size={20} 
                  color={ticket.notificationEnabled ? "#FFFFFF" : tokens.colors.text.primary} 
                />
                <Text style={[
                  styles.notificationToggleText, 
                  { color: ticket.notificationEnabled ? "#FFFFFF" : tokens.colors.text.primary }
                ]}>
                  {ticket.notificationEnabled ? t('notification.active_button') : t('notification.enable_button')}
                </Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <Text style={{ color: tokens.colors.text.secondary }}>
            Airline check-in rules not found.
          </Text>
        )}
      </Card>

      <View style={styles.actions}>
        <PillButton 
          title={t('common.delete')} 
          onPress={handleDelete} 
          variant="secondary" 
          style={{ borderColor: tokens.colors.status.error, borderWidth: 1 }}
        />
      </View>
      </ScrollView>
    </ScreenGradient>
  );
};

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  container: { flex: 1, padding: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginTop: 40,
    marginBottom: 20 
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  backButton: { padding: 4 },
  mainCard: { padding: 20, marginBottom: 16 },
  passengerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  passengerName: { fontSize: 18, fontWeight: 'bold', marginLeft: 10, textTransform: 'uppercase' },
  routeContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  airportBlock: { flex: 1 },
  airportCode: { fontSize: 18, fontWeight: 'bold' },
  city: { fontSize: 14, marginTop: 4 },
  flightIcon: { flex: 0.5, alignItems: 'center', justifyContent: 'center' },
  line: { height: 1, width: '100%', position: 'absolute', zIndex: -1 },
  detailsGrid: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 16 },
  detailItem: { flex: 1 },
  detailLabel: { fontSize: 10, fontWeight: 'bold', marginBottom: 4 },
  detailValue: { fontSize: 14, fontWeight: '600' },
  registrationCard: { padding: 20, marginBottom: 24 },
  regHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  regTitle: { fontSize: 14, fontWeight: 'bold', marginLeft: 8 },
  airlineDetailButton: { flexDirection: 'row', alignItems: 'center', maxWidth: '50%' },
  airlineDetailText: { fontSize: 12, fontWeight: 'bold' },
  regOpensAt: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  timezoneNote: { fontSize: 12, marginBottom: 16, fontStyle: 'italic' },
  countdownContainer: { padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 20 },
  countdownText: { fontSize: 18, fontWeight: 'bold' },
  notificationToggle: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 12, 
    borderRadius: 25 
  },
  notificationToggleText: { fontSize: 14, fontWeight: 'bold', marginLeft: 8 },
  actions: { paddingBottom: 40 }
});
