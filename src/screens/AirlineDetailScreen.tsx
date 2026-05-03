import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAlert } from '../theme/AlertContext';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Input } from '../components/Input';
import { PillButton } from '../components/PillButton';
import { airlineRepository } from '../services/database/AirlineRepository';
import { Airline } from '../types/airline';

type Props = NativeStackScreenProps<RootStackParamList, 'AirlineDetail'>;

export const AirlineDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { tokens, theme } = useTheme();
  const { t } = useTranslation();
  const { showAlert } = useAlert();
  const { airlineId, mode: initialMode = 'view' } = route.params;

  const isNew = airlineId === undefined;

  const [isEditing, setIsEditing] = useState(isNew || initialMode === 'edit');
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState<Omit<Airline, 'id' | 'updatedAt'>>({
    name: '',
    iataCode: '',
    icaoCode: '',
    country: '',
    logoUrl: null,
    registrationUrl: null,
    supportPhone: null,
    checkInHoursBefore: 24,
    notes: null,
  });

  const fetchAirline = useCallback(async () => {
    if (!airlineId) return;
    try {
      setIsLoading(true);
      const data = await airlineRepository.findById(airlineId);
      if (data) {
        setFormData({
          name: data.name,
          iataCode: data.iataCode,
          icaoCode: data.icaoCode,
          country: data.country,
          logoUrl: data.logoUrl,
          registrationUrl: data.registrationUrl,
          supportPhone: data.supportPhone,
          checkInHoursBefore: data.checkInHoursBefore,
          notes: data.notes,
        });
      }
    } catch (error) {
      console.error('Error fetching airline:', error);
      showAlert({
        title: 'Error',
        message: 'Failed to load airline details',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  }, [airlineId]);

  useEffect(() => {
    fetchAirline();
  }, [fetchAirline]);

  const handleSave = async () => {
    if (!formData.name || !formData.iataCode || !formData.country) {
      showAlert({
        title: 'Warning',
        message: 'Please fill in Name, IATA Code, and Country',
        type: 'warning'
      });
      return;
    }

    try {
      setIsSaving(true);
      if (isNew) {
        await airlineRepository.create(formData);
      } else {
        await airlineRepository.update(airlineId, formData);
      }
      setIsEditing(false);
      if (isNew) navigation.goBack();
    } catch (error: any) {
      console.error('Error saving airline:', error);
      showAlert({
        title: 'Error',
        message: error.message || 'Failed to save airline',
        type: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    showAlert({
      title: 'Delete Airline',
      message: 'Are you sure you want to delete this airline?',
      type: 'delete',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              if (airlineId) {
                await airlineRepository.delete(airlineId);
                navigation.goBack();
              }
            } catch (error) {
              showAlert({
                title: 'Error',
                message: 'Failed to delete airline',
                type: 'error'
              });
            }
          }
        }
      ]
    });
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: tokens.colors.background.app, justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={tokens.colors.accent.primary} />
      </View>
    );
  }

  const renderInfoItem = (label: string, value: string | number | null, icon: string) => (
    <View style={styles.infoItem}>
      <View style={[styles.iconBox, { backgroundColor: tokens.colors.accent.primary + '10' }]}>
        <Ionicons name={icon as any} size={20} color={tokens.colors.accent.primary} />
      </View>
      <View style={styles.infoContent}>
        <Text style={[styles.infoLabel, { color: tokens.colors.text.secondary }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: tokens.colors.text.primary }]}>{value || '—'}</Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: tokens.colors.background.app }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: tokens.colors.text.primary }]}>
            {isNew ? 'Добавить авиакомпанию' : isEditing ? 'Редактировать' : formData.name}
          </Text>
          {!isEditing && (
            <TouchableOpacity 
              style={[styles.editButton, { backgroundColor: tokens.colors.accent.primary }]}
              onPress={() => setIsEditing(true)}
            >
              <Ionicons name="create-outline" size={20} color="#FFF" />
              <Text style={styles.editButtonText}>Змінити</Text>
            </TouchableOpacity>
          )}
        </View>

        {isEditing ? (
          <View>
            <Input
              label="Название"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="Напр. Air Astana"
            />

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Input
                  label="Код IATA (2 буквы)"
                  value={formData.iataCode}
                  onChangeText={(text) => setFormData({ ...formData, iataCode: text.toUpperCase() })}
                  placeholder="KC"
                  maxLength={2}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Input
                  label="Код ICAO (3 буквы)"
                  value={formData.icaoCode || ''}
                  onChangeText={(text) => setFormData({ ...formData, icaoCode: text.toUpperCase() })}
                  placeholder="KZR"
                  maxLength={3}
                />
              </View>
            </View>

            <Input
              label="Страна"
              value={formData.country}
              onChangeText={(text) => setFormData({ ...formData, country: text })}
              placeholder="Напр. Kazakhstan"
            />

            <Input
              label="Ссылка на регистрацию (HTTPS)"
              value={formData.registrationUrl || ''}
              onChangeText={(text) => setFormData({ ...formData, registrationUrl: text })}
              placeholder="https://..."
              keyboardType="url"
            />

            <Input
              label="Телефон поддержки"
              value={formData.supportPhone || ''}
              onChangeText={(text) => setFormData({ ...formData, supportPhone: text })}
              placeholder="+..."
              keyboardType="phone-pad"
            />

            <View style={styles.buttonContainer}>
              <PillButton 
                title={isSaving ? 'Сохранение...' : 'Сохранить'} 
                onPress={handleSave}
                disabled={isSaving}
              />
              
              <TouchableOpacity onPress={() => isNew ? navigation.goBack() : setIsEditing(false)} style={styles.cancelLink}>
                <Text style={[styles.cancelLinkText, { color: tokens.colors.text.secondary }]}>Отмена</Text>
              </TouchableOpacity>

              {!isNew && (
                <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
                  <Text style={styles.deleteButtonText}>Удалить авиакомпанию</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.viewContainer}>
            <View style={[styles.mainCard, { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#F8F9FA' }]}>
              {renderInfoItem('Страна', formData.country, 'globe-outline')}
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  {renderInfoItem('IATA', formData.iataCode, 'airplane-outline')}
                </View>
                <View style={{ flex: 1 }}>
                  {renderInfoItem('ICAO', formData.icaoCode, 'barcode-outline')}
                </View>
              </View>
              {renderInfoItem('Сайт регистрации', formData.registrationUrl, 'link-outline')}
              {renderInfoItem('Телефон поддержки', formData.supportPhone, 'call-outline')}
              {renderInfoItem('Начало регистрации за (часов)', formData.checkInHoursBefore, 'time-outline')}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    flex: 1,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginLeft: 12,
  },
  editButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 6,
  },
  row: {
    flexDirection: 'row',
  },
  buttonContainer: {
    marginTop: 30,
  },
  cancelLink: {
    marginTop: 16,
    alignItems: 'center',
    padding: 8,
  },
  cancelLinkText: {
    fontSize: 16,
    fontWeight: '500',
  },
  deleteButton: {
    marginTop: 30,
    alignItems: 'center',
    padding: 10,
  },
  deleteButtonText: {
    color: '#FF3B30',
    fontWeight: '600',
  },
  viewContainer: {
    marginTop: 8,
  },
  mainCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '700',
  },
});
