import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { Trip } from '../types/ticket';
import { Card } from './Card';
import { formatDateToDisplay } from '../utils/dateUtils';
import { extractIataCode, cleanCityName } from '../utils/stringUtils';

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

  const tickets = [...(trip.tickets || [])].sort((a, b) => {
    const timeA = a.departureTime || '00:00';
    const timeB = b.departureTime || '00:00';
    const dateTimeA = `${a.departureDate}T${timeA}`;
    const dateTimeB = `${b.departureDate}T${timeB}`;
    return dateTimeA.localeCompare(dateTimeB);
  });

  if (tickets.length === 0) return null;

  // Формируем цепочку городов гарантированно и последовательно
  const routeNodes: { code: string; city: string | null }[] = [];
  
  tickets.forEach(t => {
    const depCode = extractIataCode(t.departureAirport);
    const arrCode = extractIataCode(t.arrivalAirport);
    const depCity = cleanCityName(t.departureCity);
    const arrCity = cleanCityName(t.arrivalCity);

    const depId = depCode || depCity;
    const arrId = arrCode || arrCity;

    // Добавляем вылет, если его еще нет в списке (или если это первый элемент)
    const lastNode = routeNodes[routeNodes.length - 1];
    const lastId = lastNode ? (lastNode.code || lastNode.city) : null;

    if (routeNodes.length === 0 || lastId !== depId) {
      routeNodes.push({
        code: depCode,
        city: depCity
      });
    }
    
    // Добавляем прилет, если он отличается от последнего добавленного
    const currentLastNode = routeNodes[routeNodes.length - 1];
    const currentLastId = currentLastNode ? (currentLastNode.code || currentLastNode.city) : null;

    if (currentLastId !== arrId) {
      routeNodes.push({ 
        code: arrCode, 
        city: arrCity 
      });
    }
  });

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
          <View style={[styles.badge, { backgroundColor: tokens.colors.text.secondary + '15' }]}>
            <Text style={[styles.badgeText, { color: tokens.colors.text.secondary }]}>
              {flightCount} {t('ticket.flights', 'рейсів')}
            </Text>
          </View>
        </View>

        <View style={styles.routeContainer}>
          {routeNodes.map((node, index) => (
            <React.Fragment key={index}>
              <View style={styles.routeRow}>
                <View style={styles.iconColumn}>
                  <View style={[styles.dot, { backgroundColor: tokens.colors.accent.primary }]} />
                  {index < routeNodes.length - 1 && (
                    <View style={[styles.verticalLine, { backgroundColor: tokens.colors.text.secondary + '30' }]}>
                      <Ionicons name="airplane" size={10} color={tokens.colors.text.secondary} style={styles.planeIcon} />
                    </View>
                  )}
                </View>
                <View style={styles.cityBox}>
                  <Text style={[styles.cityCode, { color: tokens.colors.text.primary }]}>
                    {node.city || node.code}
                  </Text>
                  {node.city && (
                    <Text style={[styles.cityText, { color: tokens.colors.text.secondary }]}>
                      {node.code}
                    </Text>
                  )}
                </View>
              </View>
            </React.Fragment>
          ))}
        </View>

        <View style={styles.footer}>
          <View style={styles.infoItem}>
            <Ionicons name="calendar-outline" size={14} color={tokens.colors.text.secondary} />
            <Text style={[styles.infoText, { color: tokens.colors.text.secondary }]}>{startDate}</Text>
          </View>
          
          {/* Показываем партнера, если он есть в первом билете */}
          {tickets[0]?.operatingAirlineName && (
            <View style={styles.infoItem}>
              <Text style={[styles.operatedByText, { color: tokens.colors.accent.primary }]}>
                {tickets[0].operatingAirlineName}
              </Text>
            </View>
          )}

          {trip.pnr && (
            <View style={styles.infoItem}>
              <Ionicons name="bookmark-outline" size={14} color={tokens.colors.status.success} />
              <Text style={[styles.infoText, { color: tokens.colors.status.success }]}>{trip.pnr}</Text>
            </View>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  passengerBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passengerName: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  routeContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingVertical: 4,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconColumn: {
    width: 20,
    alignItems: 'center',
    marginRight: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
  },
  verticalLine: {
    width: 2,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planeIcon: {
    transform: [{ rotate: '180deg' }],
    backgroundColor: 'transparent',
  },
  cityBox: {
    paddingBottom: 4,
  },
  cityCode: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cityText: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: -4,
    textTransform: 'capitalize',
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
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '500',
  },
  operatedByText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
});
