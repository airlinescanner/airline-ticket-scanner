import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, Linking, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useAlert } from '../theme/AlertContext';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Input } from '../components/Input';
import { PillButton } from '../components/PillButton';
import { Card } from '../components/Card';
import { ScreenGradient } from '../components/ScreenGradient';
import { airlineRepository } from '../services/database/AirlineRepository';
import { Airline } from '../types/airline';

type Props = NativeStackScreenProps<RootStackParamList, 'AirlineDetail'>;

export const AirlineDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
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
      title: t('airline.deleteConfirm').split('?')[0],
      message: t('airline.deleteConfirm').replace('{{name}}', formData.name),
      type: 'delete',
      buttons: [
        { 
          text: t('common.delete'), 
          style: 'destructive',
          onPress: async () => {
            try {
              if (airlineId) {
                await airlineRepository.delete(airlineId);
                navigation.goBack();
              }
            } catch (error) {
              showAlert({
                title: t('common.error'),
                message: t('airline.error.deleteFailed'),
                type: 'error'
              });
            }
          }
        },
        { text: t('common.cancel'), style: 'cancel' }
      ]
    });
  };

  if (isLoading) {
    return (
      <ScreenGradient style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tokens.colors.accent.primary} />
        </View>
      </ScreenGradient>
    );
  }

  const openUrl = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        showAlert({
          title: t('common.error'),
          message: 'Unsupported URL',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error opening URL:', error);
    }
  };

  const renderInfoItem = (label: string, value: string | number | null, icon: string, isHighlight?: boolean) => {
    const isUrl = typeof value === 'string' && value.startsWith('http');
    
    return (
      <TouchableOpacity 
        style={styles.infoItem} 
        disabled={!isUrl}
        onPress={() => isUrl && openUrl(value)}
      >
        <View style={[styles.iconBox, { backgroundColor: tokens.colors.accent.primary + '10' }]}>
          <Ionicons name={icon as any} size={20} color={tokens.colors.accent.primary} />
        </View>
        <View style={styles.infoContent}>
          <Text style={[styles.infoLabel, { color: tokens.colors.text.secondary }]}>{label}</Text>
          <Text 
            style={[
              styles.infoValue, 
              { color: isUrl ? tokens.colors.accent.primary : tokens.colors.text.primary },
              isUrl && { textDecorationLine: 'underline' },
              isHighlight && { 
                color: tokens.colors.status.success, 
                fontSize: 16, 
                fontWeight: '800' 
              }
            ]}
          >
            {value || '—'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenGradient style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={[
            styles.content, 
            { 
              paddingTop: insets.top + 25,
              paddingBottom: insets.bottom + 100 // Увеличиваем отступ снизу для клавиатуры
            }
          ]}
          showsVerticalScrollIndicator={false}
        >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity 
              onPress={() => {
                if (isEditing && !isNew) {
                  setIsEditing(false);
                } else {
                  navigation.goBack();
                }
              }} 
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color={tokens.colors.text.primary} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: tokens.colors.text.primary }]} numberOfLines={2}>
              {isNew ? t('airline.addManually') : isEditing ? t('common.edit') : formData.name}
            </Text>
          </View>
          {!isEditing && (
            <TouchableOpacity 
              style={[styles.editButton, { backgroundColor: tokens.colors.accent.primary }]}
              onPress={() => setIsEditing(true)}
            >
              <Ionicons name="create-outline" size={16} color="#FFF" />
            </TouchableOpacity>
          )}
        </View>

        {isEditing ? (
          <View>
            <Input
              label={t('airline.name')}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder={t('airline.placeholders.name')}
            />

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Input
                  label={`${t('airline.iataCode')} ${t('common.letters_2')}`}
                  value={formData.iataCode}
                  onChangeText={(text) => setFormData({ ...formData, iataCode: text.toUpperCase() })}
                  placeholder="KC"
                  maxLength={2}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Input
                  label={`${t('airline.icaoCode')} ${t('common.letters_3')}`}
                  value={formData.icaoCode || ''}
                  onChangeText={(text) => setFormData({ ...formData, icaoCode: text.toUpperCase() })}
                  placeholder="KZR"
                  maxLength={3}
                />
              </View>
            </View>

            <Input
              label={t('airline.country')}
              value={formData.country}
              onChangeText={(text) => setFormData({ ...formData, country: text })}
              placeholder={t('airline.placeholders.country')}
            />

            <Input
              label={t('airline.registrationUrl')}
              value={formData.registrationUrl || ''}
              onChangeText={(text) => setFormData({ ...formData, registrationUrl: text })}
              placeholder="https://..."
              keyboardType="url"
            />

            <Input
              label={t('airline.supportPhone')}
              value={formData.supportPhone || ''}
              onChangeText={(text) => setFormData({ ...formData, supportPhone: text })}
              placeholder="+..."
              keyboardType="phone-pad"
            />

            <Input
              label={t('airline.checkInHoursBefore')}
              value={formData.checkInHoursBefore.toString()}
              onChangeText={(text) => setFormData({ ...formData, checkInHoursBefore: parseInt(text) || 0 })}
              placeholder="24"
              keyboardType="number-pad"
            />

            <View style={styles.buttonContainer}>
              <PillButton 
                title={isSaving ? t('common.loading') : t('common.save')} 
                onPress={handleSave}
                disabled={isSaving}
                style={styles.actionButton}
              />
              
              <PillButton 
                title={t('common.cancel')} 
                variant="secondary"
                onPress={() => isNew ? navigation.goBack() : setIsEditing(false)} 
                style={styles.actionButton}
              />

              {!isNew && (
                <PillButton 
                  title={t('airline.deleteAirline')} 
                  onPress={handleDelete}
                  style={{ ...styles.actionButton, ...styles.deleteButton, marginTop: 40 }}
                />
              )}
            </View>
          </View>
        ) : (
          <View style={styles.viewContainer}>
            <Card style={styles.mainCard}>
              {renderInfoItem(t('airline.country'), formData.country, 'globe-outline')}
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  {renderInfoItem(t('airline.iataCode'), formData.iataCode, 'airplane-outline')}
                </View>
                <View style={{ flex: 1 }}>
                  {renderInfoItem(t('airline.icaoCode'), formData.icaoCode, 'barcode-outline')}
                </View>
              </View>
              {renderInfoItem(t('airline.registrationUrl'), formData.registrationUrl, 'link-outline')}
              {renderInfoItem(t('airline.supportPhone'), formData.supportPhone, 'call-outline')}
              {renderInfoItem(t('airline.checkInHoursBefore'), formData.checkInHoursBefore, 'time-outline', true)}
              
              {formData.registrationUrl && (
                <PillButton 
                  title={t('airline.openWebsite') || 'Go to Registration'} 
                  onPress={() => openUrl(formData.registrationUrl!)}
                  style={{ marginTop: 24 }}
                />
              )}
            </Card>
          </View>
        )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    marginLeft: 10,
    flexShrink: 1,
    lineHeight: 21,
  },
  backButton: {
    padding: 4,
  },
  editButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
  },
  buttonContainer: {
    marginTop: 20,
  },
  actionButton: {
    marginBottom: 12,
    width: '80%',
    alignSelf: 'center',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  viewContainer: {
    marginTop: 8,
  },
  mainCard: {
    borderRadius: 24,
    padding: 24,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '500',
  },
});
