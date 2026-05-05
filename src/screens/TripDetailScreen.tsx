import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useAlert } from '../theme/AlertContext';
import { Ionicons } from '@expo/vector-icons';
import { tripRepository } from '../services/database/TripRepository';
import { registrationMatcher } from '../services/RegistrationMatcher';
import { Ticket, Trip } from '../types/ticket';
import { Card } from '../components/Card';
import { formatDateToDisplay } from '../utils/dateUtils';
import { openUrl } from '../utils/linkingUtils';
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

  const fetchTripDetails = async () => {
    try {
      setIsLoading(true);
      const currentTrip = await tripRepository.findById(tripId);
      
      if (currentTrip) {
        setTrip(currentTrip);
        
        // Получаем информацию о регистрации для каждого билета
        const infos: Record<number, any> = {};
        for (const ticket of currentTrip.tickets || []) {
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

  if (isLoading || !trip) {
    return (
      <View style={[styles.container, { backgroundColor: tokens.colors.background.app, justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={tokens.colors.accent.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: tokens.colors.background.app }]}>
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
            <Text style={[styles.headerSubtitle, { color: tokens.colors.text.secondary }]}>
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
                  {!isLast && <View style={[styles.line, { backgroundColor: tokens.colors.border }]} />}
                </View>

                {/* Карточка сегмента */}
                <View style={styles.contentColumn}>
                  <Card style={styles.flightCard}>
                    <TouchableOpacity 
                      onPress={() => navigation.navigate('TicketDetail', { ticketId: ticket.id })}
                    >
                      <View style={styles.flightHeader}>
                        <Text style={[styles.flightNumber, { color: tokens.colors.text.primary }]}>
                          {ticket.airlineCode} {ticket.flightNumber}
                        </Text>
                        <Text style={[styles.flightDate, { color: tokens.colors.text.secondary }]}>
                          {formatDateToDisplay(ticket.departureDate)}
                        </Text>
                      </View>

                      <View style={styles.routeBox}>
                        <View style={styles.airportBox}>
                          <Text style={[styles.airportCode, { color: tokens.colors.text.primary }]}>
                            {ticket.departureAirport}
                          </Text>
                          {(ticket.departureCity || ticket.departureCountry) && (
                            <Text style={[styles.locationText, { color: tokens.colors.text.secondary }]}>
                              {ticket.departureCity}{ticket.departureCountry ? `, ${ticket.departureCountry}` : ''}
                            </Text>
                          )}
                          <Text style={[styles.airportTime, { color: tokens.colors.text.primary }]}>
                            {ticket.departureTime}
                          </Text>
                        </View>
                        
                        <Ionicons name="airplane" size={16} color={tokens.colors.accent.primary} style={styles.routeIcon} />
                        
                        <View style={[styles.airportBox, { alignItems: 'flex-end' }]}>
                          <Text style={[styles.airportCode, { color: tokens.colors.text.primary }]}>
                            {ticket.arrivalAirport}
                          </Text>
                          {(() => {
                            // Умный поиск названия города, если оно не сохранено в текущем билете
                            const cityName = ticket.arrivalCity || 
                              trip.tickets?.find(t => t.departureAirport === ticket.arrivalAirport && t.departureCity)?.departureCity ||
                              ticket.arrivalCountry;
                            
                            return cityName ? (
                              <Text style={[styles.locationText, { color: tokens.colors.text.secondary, textAlign: 'right' }]}>
                                {cityName}
                              </Text>
                            ) : null;
                          })()}
                          <Text style={[styles.airportTime, { color: tokens.colors.text.secondary }]}>
                             — 
                          </Text>
                        </View>
                      </View>

                      {regInfo && (
                        <View style={[styles.regBox, { borderTopColor: tokens.colors.border }]}>
                          <View style={styles.regInfo}>
                            <Text style={[styles.regLabel, { color: tokens.colors.text.secondary }]}>
                              {t('registration.opens')}
                            </Text>
                            <Text style={[styles.regValue, { color: tokens.colors.status.success }]}>
                              {regInfo.formattedDate}
                            </Text>
                            <Text style={[styles.regTimeUntil, { color: tokens.colors.text.secondary }]}>
                              {timeUntil}
                            </Text>
                          </View>
                          
                          {regInfo.registrationUrl && (
                            <TouchableOpacity 
                              style={[styles.regButton, { backgroundColor: tokens.colors.accent.primary }]}
                              onPress={() => openUrl(regInfo.registrationUrl)}
                            >
                              <Ionicons name="globe-outline" size={18} color="#FFF" />
                            </TouchableOpacity>
                          )}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  flightDate: { fontSize: 13 },
  routeBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  airportBox: { flex: 1 },
  airportCode: { fontSize: 24, fontWeight: '800' },
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
  regValue: { fontSize: 14, fontWeight: '800' },
  regTimeUntil: { fontSize: 12, marginTop: 2, fontWeight: '500' },
  regButton: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginLeft: 12,
  }
});
