/**
 * Экран истории билетов
 * 
 * Отображает список сохранённых билетов
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '../components/EmptyState';
import type { RootStackParamList } from '../navigation/types';
import { tripRepository } from '../services/database/TripRepository';
import { Trip } from '../types/ticket';
import { TripCard } from '../components/TripCard';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const HistoryScreen: React.FC = () => {
  const { tokens } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTrips = async () => {
    try {
      setIsLoading(true);
      const data = await tripRepository.findAllTrips();
      setTrips(data);
    } catch (error) {
      console.error('Error fetching trips:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTrips();
    }, [])
  );

  const renderTrip = ({ item }: { item: Trip }) => (
    <TripCard 
      trip={item} 
      onPress={() => navigation.navigate('TripDetail', { tripId: item.id })} 
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: tokens.colors.background.app }]}>
      <FlatList
        data={trips}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderTrip}
        contentContainerStyle={trips.length === 0 ? styles.emptyContainer : styles.listContainer}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              title={t('ticket.history_tab')}
              message={t('ticket.emptyHistory')}
              icon="calendar-outline"
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
    marginBottom: 10,
    paddingVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  airline: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  date: {
    fontSize: 11,
  },
  route: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  airport: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  arrow: {
    fontSize: 13,
    marginHorizontal: 6,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  passenger: {
    fontSize: 13,
    fontWeight: '500',
  },
  seat: {
    fontSize: 11,
    fontWeight: '600',
  },
});
