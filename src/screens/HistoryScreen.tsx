/**
 * Экран истории билетов
 * 
 * Отображает список сохранённых билетов
 */

import React, { useState, useCallback } from 'react';
import { StyleSheet, FlatList, View, Text } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '../components/EmptyState';
import { ScreenGradient } from '../components/ScreenGradient';
import { PillButton } from '../components/PillButton';
import { useTheme } from '../theme/ThemeContext';
import { useAlert } from '../theme/AlertContext';
import type { RootStackParamList } from '../navigation/types';
import { tripRepository } from '../services/database/TripRepository';
import { Trip } from '../types/ticket';
import { TripCard } from '../components/TripCard';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const HistoryScreen: React.FC = () => {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  
  const { showAlert } = useAlert();
  
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
    <ScreenGradient style={styles.container}>
      <View style={styles.screenHeader}>
        <Text style={[styles.screenTitle, { color: tokens.colors.text.primary }]}>
          {t('ticket.history')}
        </Text>
      </View>
      <FlatList
        data={trips}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderTrip}
        contentContainerStyle={trips.length === 0 ? styles.emptyContainer : styles.listContainer}
        ListEmptyComponent={
          !isLoading ? (
            <View style={{ alignItems: 'center', paddingHorizontal: 20 }}>
              <EmptyState
                title={t('ticket.history_tab')}
                message={t('ticket.emptyHistory')}
                icon="calendar-outline"
              />
              <PillButton
                title={t('settings.howToUseTitle')}
                onPress={() => showAlert({
                  title: t('settings.howToUseTitle'),
                  message: t('settings.howToUseMessage'),
                  type: 'info',
                  buttons: [{ text: t('common.ok') }]
                })}
                variant="secondary"
                style={{ marginTop: -20, width: '80%' }}
              />
            </View>
          ) : null
        }
      />
    </ScreenGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screenHeader: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 10,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100, // Добавляем отступ для плавающего меню
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
