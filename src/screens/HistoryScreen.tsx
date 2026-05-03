/**
 * Экран истории билетов
 * 
 * Отображает список сохранённых билетов
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Text } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { ticketRepository } from '../services/database/TicketRepository';
import { Ticket } from '../types/ticket';
import { formatDateToDisplay } from '../utils/dateUtils';
import type { RootStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const HistoryScreen: React.FC = () => {
  const { tokens } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTickets = async () => {
    try {
      setIsLoading(true);
      const data = await ticketRepository.findAll();
      setTickets(data);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTickets();
    }, [])
  );

  const renderTicket = ({ item }: { item: Ticket }) => (
    <TouchableOpacity onPress={() => navigation.navigate('TicketDetail', { ticketId: item.id })}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <Text style={[styles.airline, { color: tokens.colors.text.primary }]}>
            {item.airlineCode} {item.flightNumber}
          </Text>
          <Text style={[styles.date, { color: tokens.colors.text.secondary }]}>
            {formatDateToDisplay(item.departureDate)}
          </Text>
        </View>
        
        <View style={styles.route}>
          <Text style={[styles.airport, { color: tokens.colors.text.primary }]}>
            {item.departureAirport}
          </Text>
          <Text style={[styles.arrow, { color: tokens.colors.text.secondary }]}> ✈ </Text>
          <Text style={[styles.airport, { color: tokens.colors.text.primary }]}>
            {item.arrivalAirport}
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.passenger, { color: tokens.colors.text.secondary }]}>
            {item.passengerName}
          </Text>
          {item.seat && (
            <Text style={[styles.seat, { color: tokens.colors.text.primary }]}>
              {t('ticket.seat')}: {item.seat}
            </Text>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: tokens.colors.background.app }]}>
      <FlatList
        data={tickets}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderTicket}
        contentContainerStyle={tickets.length === 0 ? styles.emptyContainer : styles.listContainer}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              title={t('ticket.history_tab')}
              message={t('ticket.emptyHistory')}
              icon="ticket-outline"
            />
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContainer: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  airline: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  date: {
    fontSize: 14,
  },
  route: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  airport: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  arrow: {
    fontSize: 20,
    marginHorizontal: 10,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  passenger: {
    fontSize: 14,
  },
  seat: {
    fontSize: 14,
    fontWeight: '600',
  },
});
