import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { ScreenGradient } from '../components/ScreenGradient';
import { airlineRepository } from '../services/database/AirlineRepository';
import { Airline } from '../types/airline';
import type { RootStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const AirlinesScreen: React.FC = () => {
  const { tokens } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  
  const [airlines, setAirlines] = useState<Airline[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchAirlines = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = searchQuery.length > 0 
        ? await airlineRepository.search(searchQuery)
        : await airlineRepository.findAll();
      setAirlines(data);
    } catch (error) {
      console.error('Error fetching airlines:', error);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchAirlines();
    });
    return unsubscribe;
  }, [navigation, fetchAirlines]);

  useEffect(() => {
    fetchAirlines();
  }, [fetchAirlines]);

  const renderAirline = ({ item }: { item: Airline }) => (
    <TouchableOpacity 
      onPress={() => navigation.navigate('AirlineDetail', { airlineId: item.id })}
      activeOpacity={0.7}
    >
      <Card style={styles.card}>
        <View style={styles.header}>
          <Text style={[styles.name, { color: tokens.colors.text.primary }]}>
            {item.name}
          </Text>
          <Text style={[styles.codes, { color: tokens.colors.text.secondary }]}>
            {item.iataCode}
          </Text>
        </View>
        <View style={styles.footer}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Ionicons name="location-outline" size={14} color={tokens.colors.text.secondary} />
            <Text style={[styles.country, { color: tokens.colors.text.secondary, marginLeft: 4 }]}>
              {item.country}
            </Text>
          </View>
          <View style={[styles.checkInBadge, { backgroundColor: tokens.colors.status.success + '15' }]}>
            <Ionicons name="time-outline" size={12} color={tokens.colors.status.success} />
            <Text style={[styles.checkInText, { color: tokens.colors.status.success }]}>
              {item.checkInHoursBefore}h
            </Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <ScreenGradient style={styles.container}>
      <View style={styles.searchContainer}>
        <Input
          placeholder={t('airline.search')}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
        />
      </View>

      <FlatList
        data={airlines}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderAirline}
        contentContainerStyle={[
          styles.listContainer,
          airlines.length === 0 && styles.emptyContainer
        ]}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              title={t('airline.list_title')}
              message={t('airline.emptySearch')}
              icon="airplane-outline"
            />
          ) : (
            <ActivityIndicator size="large" color={tokens.colors.accent.primary} style={{ marginTop: 40 }} />
          )
        }
      />

      {/* Кнопка добавления новой авиакомпании */}
      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: tokens.colors.accent.primary }]}
        onPress={() => navigation.navigate('AirlineDetail', { airlineId: undefined as any })}
      >
        <Ionicons name="add" size={30} color="#FFF" />
      </TouchableOpacity>
    </ScreenGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchInput: {
    marginBottom: 0,
  },
  listContainer: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 180, // Достаточно места для FAB и плавающего меню
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    marginBottom: 12,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
  },
  codes: {
    fontSize: 15,
    fontWeight: '800',
    marginLeft: 8,
    letterSpacing: 1,
  },
  country: {
    fontSize: 14,
  },
  checkInBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  checkInText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 110, // Поднимаем над плавающим меню
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    zIndex: 100,
  },
});
