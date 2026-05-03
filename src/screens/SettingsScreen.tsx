import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { saveLanguage } from '../i18n';
import { Card } from '../components/Card';

export const SettingsScreen: React.FC = () => {
  const { tokens, mode, setMode } = useTheme();
  const { t, i18n } = useTranslation();

  const changeLanguage = async (lng: string) => {
    await i18n.changeLanguage(lng);
    await saveLanguage(lng);
  };

  const renderSettingItem = (
    label: string, 
    value: string, 
    icon: string, 
    onPress: () => void,
    isSelected: boolean
  ) => (
    <TouchableOpacity 
      style={[
        styles.item, 
        { backgroundColor: isSelected ? tokens.colors.accent.primary + '15' : 'transparent' }
      ]} 
      onPress={onPress}
    >
      <View style={styles.itemContent}>
        <Ionicons name={icon as any} size={22} color={isSelected ? tokens.colors.accent.primary : tokens.colors.text.secondary} />
        <Text style={[
          styles.itemLabel, 
          { color: isSelected ? tokens.colors.accent.primary : tokens.colors.text.primary }
        ]}>
          {label}
        </Text>
      </View>
      {isSelected && (
        <Ionicons name="checkmark-circle" size={22} color={tokens.colors.accent.primary} />
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: tokens.colors.background.app }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: tokens.colors.text.primary }]}>
          {t('settings.title')}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: tokens.colors.text.secondary }]}>
          {t('settings.theme').toUpperCase()}
        </Text>
        <Card style={styles.card}>
          {renderSettingItem(t('theme.light'), 'light', 'sunny-outline', () => setMode('light'), mode === 'light')}
          <View style={[styles.separator, { backgroundColor: tokens.colors.border }]} />
          {renderSettingItem(t('theme.dark'), 'dark', 'moon-outline', () => setMode('dark'), mode === 'dark')}
          <View style={[styles.separator, { backgroundColor: tokens.colors.border }]} />
          {renderSettingItem(t('theme.system'), 'system', 'settings-outline', () => setMode('system'), mode === 'system')}
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: tokens.colors.text.secondary }]}>
          {t('settings.language').toUpperCase()}
        </Text>
        <Card style={styles.card}>
          {renderSettingItem(t('language.uk'), 'uk', 'language-outline', () => changeLanguage('uk'), i18n.language === 'uk')}
          <View style={[styles.separator, { backgroundColor: tokens.colors.border }]} />
          {renderSettingItem(t('language.ru'), 'ru', 'language-outline', () => changeLanguage('ru'), i18n.language === 'ru')}
          <View style={[styles.separator, { backgroundColor: tokens.colors.border }]} />
          {renderSettingItem(t('language.en'), 'en', 'language-outline', () => changeLanguage('en'), i18n.language === 'en')}
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: tokens.colors.text.secondary }]}>
          {t('settings.backup').toUpperCase()}
        </Text>
        <Card style={styles.card}>
          <TouchableOpacity style={styles.item}>
            <View style={styles.itemContent}>
              <Ionicons name="cloud-upload-outline" size={22} color={tokens.colors.text.secondary} />
              <Text style={[styles.itemLabel, { color: tokens.colors.text.primary }]}>
                {t('settings.createBackup')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={tokens.colors.text.secondary} />
          </TouchableOpacity>
        </Card>
      </View>

      <Text style={[styles.version, { color: tokens.colors.text.secondary }]}>
        Version 1.0.0
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { marginTop: 40, marginBottom: 24 },
  title: { fontSize: 28, fontWeight: 'bold' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 8, marginLeft: 4, letterSpacing: 1 },
  card: { padding: 4 },
  item: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: 14,
    borderRadius: 12
  },
  itemContent: { flexDirection: 'row', alignItems: 'center' },
  itemLabel: { fontSize: 16, marginLeft: 12, fontWeight: '500' },
  separator: { height: 1, marginHorizontal: 12 },
  version: { textAlign: 'center', marginTop: 20, marginBottom: 40, fontSize: 12 }
});
