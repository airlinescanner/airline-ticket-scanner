import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAlert } from '../theme/AlertContext';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { saveLanguage } from '../i18n';
import { Card } from '../components/Card';
import { secretService } from '../services/SecretService';
import { Input } from '../components/Input';

export const SettingsScreen: React.FC = () => {
  const { tokens, mode, setMode } = useTheme();
  const { t, i18n } = useTranslation();
  const { showAlert } = useAlert();

  const changeLanguage = async (lng: string) => {
    await i18n.changeLanguage(lng);
    await saveLanguage(lng);
  };

  const getThemeLabel = (m: string) => {
    switch (m) {
      case 'light': return t('theme.light');
      case 'dark': return t('theme.dark');
      case 'system': return t('theme.system');
      default: return m;
    }
  };

  const getLanguageLabel = (l: string) => {
    switch (l) {
      case 'uk': return t('language.uk');
      case 'ru': return t('language.ru');
      case 'en': return t('language.en');
      default: return l;
    }
  };

  const openThemeSelection = () => {
    showAlert({
      title: t('settings.theme'),
      message: t('settings.chooseTheme'),
      buttons: [
        { text: t('theme.light'), onPress: () => setMode('light') },
        { text: t('theme.dark'), onPress: () => setMode('dark') },
        { text: t('theme.system'), onPress: () => setMode('system') },
        { text: t('common.cancel'), style: 'cancel' },
      ]
    });
  };

  const openLanguageSelection = () => {
    showAlert({
      title: t('settings.language'),
      message: t('settings.chooseLanguage'),
      buttons: [
        { text: t('language.uk'), onPress: () => changeLanguage('uk') },
        { text: t('language.ru'), onPress: () => changeLanguage('ru') },
        { text: t('language.en'), onPress: () => changeLanguage('en') },
        { text: t('common.cancel'), style: 'cancel' },
      ]
    });
  };

  const [customKey, setCustomKey] = React.useState('');
  
  React.useEffect(() => {
    secretService.getApiKey().then(k => {
      // Показываем только если это не системный ключ
      if (k !== 'AIzaSyAS-iXsJLT9tq4hlYsNx06Q_PeQMnNZx9o') {
        setCustomKey(k);
      }
    });
  }, []);

  const saveCustomKey = async (key: string) => {
    setCustomKey(key);
    if (key.trim()) {
      await secretService.setCustomApiKey(key.trim());
    } else {
      await secretService.resetApiKey();
    }
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
          <TouchableOpacity style={styles.item} onPress={openThemeSelection}>
            <View style={styles.itemContent}>
              <Ionicons 
                name={mode === 'light' ? 'sunny-outline' : mode === 'dark' ? 'moon-outline' : 'settings-outline'} 
                size={22} 
                color={tokens.colors.text.secondary} 
              />
              <Text style={[styles.itemLabel, { color: tokens.colors.text.primary }]}>
                {getThemeLabel(mode)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={tokens.colors.text.secondary} />
          </TouchableOpacity>
        </Card>
      </View>
 
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: tokens.colors.text.secondary }]}>
          {t('settings.language').toUpperCase()}
        </Text>
        <Card style={styles.card}>
          <TouchableOpacity style={styles.item} onPress={openLanguageSelection}>
            <View style={styles.itemContent}>
              <Ionicons name="language-outline" size={22} color={tokens.colors.text.secondary} />
              <Text style={[styles.itemLabel, { color: tokens.colors.text.primary }]}>
                {getLanguageLabel(i18n.language)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={tokens.colors.text.secondary} />
          </TouchableOpacity>
        </Card>
      </View>


      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: tokens.colors.text.secondary }]}>
          AI ENGINE (ADVANCED)
        </Text>
        <Card style={[styles.card, { padding: 16 }]}>
          <Text style={[styles.itemLabel, { color: tokens.colors.text.secondary, marginLeft: 0, marginBottom: 8, fontSize: 12 }]}>
            Custom Gemini API Key
          </Text>
          <Input
            value={customKey}
            onChangeText={saveCustomKey}
            placeholder="AIzaSy..."
            secureTextEntry={true}
            style={{ marginBottom: 0 }}
          />
          <Text style={{ fontSize: 10, color: tokens.colors.text.secondary, marginTop: 8 }}>
            Якщо системний ключ перестане працювати, вставте сюди свій власний.
          </Text>
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
  title: { fontSize: 24, fontWeight: 'bold' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 11, fontWeight: 'bold', marginBottom: 8, marginLeft: 4, letterSpacing: 1 },
  card: { padding: 4 },
  item: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: 14,
    borderRadius: 12
  },
  itemContent: { flexDirection: 'row', alignItems: 'center' },
  itemLabel: { fontSize: 14, marginLeft: 12, fontWeight: '500' },
  separator: { height: 1, marginHorizontal: 12 },
  version: { textAlign: 'center', marginTop: 20, marginBottom: 40, fontSize: 12 }
});
