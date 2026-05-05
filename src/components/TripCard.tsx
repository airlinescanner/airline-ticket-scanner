import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { Trip } from '../types/ticket';
import { Card } from './Card';
import { formatDateToDisplay } from '../utils/dateUtils';

interface TripCardProps {
  trip: Trip;
  onPress: () => void;
}

/**
 * TripCard — карточка поездки, группирующая несколько билетов
 */
export const TripCard: React.FC<TripCardProps> = ({ trip, onPress }) => {
  const { tokens } = useTheme();
  const { t } = useTranslation();

  const tickets = trip.tickets || [];
  if (tickets.length === 0) return null;

  // Формируем цепочку городов с названиями
  const routeNodes: { code: string; city: string | null }[] = [];
  if (tickets.length > 0) {
    routeNodes.push({ 
      code: tickets[0].departureAirport, 
      city: tickets[0].departureCity 
    });
    
    tickets.forEach(t => {
      if (routeNodes[routeNodes.length - 1].code !== t.arrivalAirport) {
        routeNodes.push({ 
          code: t.arrivalAirport, 
          city: t.arrivalCity 
        });
      }
    });
  }

  const startDate = formatDateToDisplay(tickets[0].departureDate);
  const flightCount = tickets.length;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <View style={styles.passengerBox}>
            <Ionicons name="person-circle-outline" size={24} color={tokens.colors.accent.primary} />
            <Text style={[styles.passengerName, { color: tokens.colors.text.primary }]}>
              {trip.passengerName}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: tokens.colors.accent.primary + '15' }]}>
            <Text style={[styles.badgeText, { color: tokens.colors.accent.primary }]}>
              {flightCount} {t('ticket.flights', 'рейсів')}
            </Text>
          </View>
        </View>

        <View style={styles.routeContainer}>
          {routeNodes.map((node, index) => (
            <React.Fragment key={index}>
              <View style={styles.cityBox}>
                <Text style={[styles.cityCode, { color: tokens.colors.text.primary }]}>{node.code}</Text>
                {node.city && (
                  <Text style={[styles.cityText, { color: tokens.colors.text.secondary }]}>
                    {node.city}
                  </Text>
                )}
              </View>
              {index < routeNodes.length - 1 && (
                <Ionicons 
                  name="chevron-forward" 
                  size={16} 
                  color={tokens.colors.text.secondary} 
                  style={styles.arrow}
                />
              )}
            </React.Fragment>
          ))}
        </View>

        <View style={styles.footer}>
          <View style={styles.infoItem}>
            <Ionicons name="calendar-outline" size={14} color={tokens.colors.text.secondary} />
            <Text style={[styles.infoText, { color: tokens.colors.text.secondary }]}>{startDate}</Text>
          </View>
          {trip.pnr && (
            <View style={styles.infoItem}>
              <Ionicons name="bookmark-outline" size={14} color={tokens.colors.text.secondary} />
              <Text style={[styles.infoText, { color: tokens.colors.text.secondary }]}>{trip.pnr}</Text>
            </View>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  passengerBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passengerName: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  cityBox: {
    padding: 4,
  },
  cityCode: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1,
  },
  cityText: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: -2,
    textTransform: 'capitalize',
  },
  arrow: {
    marginHorizontal: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 13,
    marginLeft: 6,
    fontWeight: '500',
  },
});
