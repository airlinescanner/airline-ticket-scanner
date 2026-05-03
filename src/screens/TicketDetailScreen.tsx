import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share } from 'react-native';
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

  const handleDelete = () => {
    showAlert({
      title: t('common.delete'),
      message: t('common.confirmDelete'),
      type: 'warning',
      buttons: [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('common.delete'), 
          style: 'destructive',
          onPress: async () => {
            await ticketRepository.delete(ticketId);
            navigation.goBack();
          }
        }
      ]
    });
  };

  if (isLoading || !ticket) {
    return (
      <View style={[styles.container, { backgroundColor: tokens.colors.background.app, justifyContent: 'center' }]}>
        <Text style={{ color: tokens.colors.text.secondary }}>{t('common.loading')}...</Text>
      </View>
    );
  }

  const timeUntil = regInfo ? registrationMatcher.getTimeUntilRegistration(regInfo.registrationOpensAt) : '';

  return (
    <ScrollView style={[styles.container, { backgroundColor: tokens.colors.background.app }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={tokens.colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: tokens.colors.text.primary }]}>
          {ticket.airlineCode} {ticket.flightNumber}
        </Text>
        <TouchableOpacity onPress={handleShare}>
          <Ionicons name="share-outline" size={24} color={tokens.colors.text.primary} />
        </TouchableOpacity>
      </View>

      <Card style={styles.mainCard}>
        <View style={styles.passengerRow}>
          <Ionicons name="person-circle-outline" size={24} color={tokens.colors.accent.primary} />
          <Text style={[styles.passengerName, { color: tokens.colors.text.primary }]}>
            {ticket.passengerName}
          </Text>
        </View>

        <View style={styles.routeContainer}>
          <View style={styles.airportBlock}>
            <Text style={[styles.airportCode, { color: tokens.colors.text.primary }]}>{ticket.departureAirport}</Text>
            <Text style={[styles.city, { color: tokens.colors.text.secondary }]}>{ticket.departureCity}</Text>
          </View>
          <View style={styles.flightIcon}>
            <Ionicons name="airplane" size={30} color={tokens.colors.accent.primary} />
            <View style={[styles.line, { backgroundColor: tokens.colors.border }]} />
          </View>
          <View style={[styles.airportBlock, { alignItems: 'flex-end' }]}>
            <Text style={[styles.airportCode, { color: tokens.colors.text.primary }]}>{ticket.arrivalAirport}</Text>
          </View>
        </View>

        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: tokens.colors.text.secondary }]}>DATE</Text>
            <Text style={[styles.detailValue, { color: tokens.colors.text.primary }]}>{formatDateToDisplay(ticket.departureDate)}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: tokens.colors.text.secondary }]}>TIME</Text>
            <Text style={[styles.detailValue, { color: tokens.colors.text.primary }]}>{ticket.departureTime}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: tokens.colors.text.secondary }]}>SEAT</Text>
            <Text style={[styles.detailValue, { color: tokens.colors.text.primary }]}>{ticket.seat || 'N/A'}</Text>
          </View>
        </View>
      </Card>

      <Card style={styles.registrationCard}>
        <View style={styles.regHeader}>
          <Ionicons name="time-outline" size={20} color={tokens.colors.accent.primary} />
          <Text style={[styles.regTitle, { color: tokens.colors.text.primary }]}>
            ONLINE REGISTRATION
          </Text>
        </View>
        
        {regInfo ? (
          <>
            <Text style={[styles.regOpensAt, { color: tokens.colors.text.primary }]}>
              Opens: {regInfo.formattedDate}
            </Text>
            <Text style={[styles.timezoneNote, { color: tokens.colors.text.secondary }]}>
              (Local time in {ticket.departureCity || 'departure city'})
            </Text>
            
            <View style={[styles.countdownContainer, { backgroundColor: tokens.colors.background.input }]}>
              <Text style={[styles.countdownText, { color: tokens.colors.accent.primary }]}>
                {timeUntil}
              </Text>
            </View>

            <TouchableOpacity 
              style={[
                styles.notificationToggle, 
                { backgroundColor: ticket.notificationEnabled ? tokens.colors.accent.primary : tokens.colors.background.buttonSecondary }
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
                {ticket.notificationEnabled ? 'Notification Active' : 'Enable Notification'}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={{ color: tokens.colors.text.secondary }}>
            Airline check-in rules not found.
          </Text>
        )}
      </Card>

      <View style={styles.actions}>
        <PillButton 
          title="Delete Ticket" 
          onPress={handleDelete} 
          variant="secondary" 
          style={{ borderColor: tokens.colors.error, borderWidth: 1 }}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
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
  airportCode: { fontSize: 32, fontWeight: 'bold' },
  city: { fontSize: 14, marginTop: 4 },
  flightIcon: { flex: 0.5, alignItems: 'center', justifyContent: 'center' },
  line: { height: 1, width: '100%', position: 'absolute', zIndex: -1 },
  detailsGrid: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 16 },
  detailItem: { flex: 1 },
  detailLabel: { fontSize: 10, fontWeight: 'bold', marginBottom: 4 },
  detailValue: { fontSize: 14, fontWeight: '600' },
  registrationCard: { padding: 20, marginBottom: 24 },
  regHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  regTitle: { fontSize: 14, fontWeight: 'bold', marginLeft: 8 },
  regOpensAt: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  timezoneNote: { fontSize: 12, marginBottom: 16, fontStyle: 'italic' },
  countdownContainer: { padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 20 },
  countdownText: { fontSize: 16, fontWeight: 'bold' },
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
