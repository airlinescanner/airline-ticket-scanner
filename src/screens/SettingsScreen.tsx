import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAlert } from '../theme/AlertContext';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { saveLanguage } from '../i18n';
import { Card } from '../components/Card';
import { ScreenGradient } from '../components/ScreenGradient';
import { airlineUpdateService } from '../services/AirlineUpdateService';
import { notificationScheduler } from '../services/NotificationScheduler';

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

  const [isSyncing, setIsSyncing] = React.useState(false);
  const [syncProgress, setSyncProgress] = React.useState(0);
  const [syncStatus, setSyncStatus] = React.useState('');

  const handleSyncAirlines = async () => {
    setIsSyncing(true);
    setSyncProgress(0);
    setSyncStatus('Starting...');
    
    try {
      const report = await airlineUpdateService.performUpdate((progress, status) => {
        setSyncProgress(progress);
        setSyncStatus(status);
      });
      
      let reportMessage = '';
      const isRu = i18n.language === 'ru';
      const isUk = i18n.language === 'uk';

      if (report.changes.length > 0) {
        const successTitle = isRu 
          ? 'Обновленные правила регистрации'
          : isUk 
          ? 'Оновлені правила реєстрації' 
          : 'Updated registration rules';
          
        reportMessage += `📢  ${successTitle.toUpperCase()}:\n`;
        reportMessage += `⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯\n`;
        
        report.changes.forEach(c => {
          let changeText = '';
          const hourUnit = isRu ? 'ч' : isUk ? 'год' : 'h';
          const linkUpdatedStr = isRu ? 'обновлена ссылка' : isUk ? 'оновлено посилання' : 'link updated';

          // Извлекаем чистые числовые значения часов
          const getCleanHours = (val: any) => {
            if (typeof val === 'number') return val;
            const match = String(val).match(/^(\d+)/);
            return match ? parseInt(match[1]) : val;
          };

          const oldH = getCleanHours(c.oldValue);
          const newH = getCleanHours(c.newValue);

          if (c.field === 'both') {
            changeText = `✈️  ${c.airlineName}\n    ${oldH}${hourUnit} ➔ ${newH}${hourUnit} (${linkUpdatedStr})`;
          } else if (c.field === 'hours') {
            changeText = `🕒  ${c.airlineName}\n    ${oldH}${hourUnit} ➔ ${newH}${hourUnit}`;
          } else if (c.field === 'url') {
            changeText = `🔗  ${c.airlineName}\n    ${isRu ? 'Обновлена ссылка на регистрацию' : isUk ? 'Оновлено посилання на реєстрацію' : 'Registration link updated'}`;
          } else {
            changeText = `✈️  ${c.airlineName}\n    ${c.newValue}`;
          }
          reportMessage += `${changeText}\n\n`;
        });
        reportMessage += `⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯\n`;
      }

      // Группируем предупреждения/ошибки компактно
      if (report.failed.length > 0) {
        const warningsCount = report.failed.filter(f => f.type === 'warning' || f.reason.includes('не найдены') || f.reason.includes('not found') || f.reason.includes('найдены')).length;
        const realErrors = report.failed.filter(f => f.type === 'error' && !f.reason.includes('не найдены') && !f.reason.includes('not found') && !f.reason.includes('найдены'));
        
        if (warningsCount > 0) {
          const warningTitle = isRu 
            ? `ℹ️  Для ${warningsCount} авиакомпаний данные не изменились`
            : isUk
            ? `ℹ️  Для ${warningsCount} авіакомпаній дані не змінилися`
            : `ℹ️  For ${warningsCount} airlines, data was unchanged`;
          reportMessage += `${warningTitle}\n`;
        }
        
        if (realErrors.length > 0) {
          const errorTitle = isRu ? '⚠️  Ошибки подключения' : isUk ? '⚠️  Помилки підключення' : '⚠️  Connection errors';
          reportMessage += `\n${errorTitle}:\n`;
          realErrors.forEach(err => {
            reportMessage += `• ${err.airlineName}: ${err.reason}\n`;
          });
        }
      }

      if (report.changes.length === 0 && report.failed.length === 0) {
        reportMessage = t('settings.upToDateMessage');
      }

      showAlert({
        title: t('settings.airlineDatabase'),
        message: reportMessage,
        buttons: [{ text: t('common.ok') }]
      });
    } catch (e) {
      showAlert({
        title: t('common.error'),
        message: 'Failed to update airline database. Please check your connection.',
        buttons: [{ text: t('common.ok') }]
      });
    } finally {
      setIsSyncing(false);
      setSyncProgress(0);
      setSyncStatus('');
    }
  };

  return (
    <ScreenGradient style={styles.wrapper}>
      <ScrollView style={styles.container}>
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
          {t('settings.airlineDatabase').toUpperCase()}
        </Text>
        <Card style={styles.card}>
          <TouchableOpacity 
            style={styles.item} 
            onPress={handleSyncAirlines}
            disabled={isSyncing}
          >
            <View style={styles.itemContent}>
              <Ionicons 
                name={isSyncing ? "sync-outline" : "cloud-download-outline"} 
                size={22} 
                color={tokens.colors.accent.primary} 
              />
              <Text style={[styles.itemLabel, { color: tokens.colors.text.primary }]}>
                {isSyncing ? t('settings.syncing') : t('settings.syncRules')}
              </Text>
            </View>
            {!isSyncing && <Ionicons name="refresh" size={20} color={tokens.colors.accent.primary} />}
          </TouchableOpacity>
        </Card>

        {isSyncing && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBarBg, { backgroundColor: tokens.colors.background.card }]}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { 
                    backgroundColor: tokens.colors.accent.primary,
                    width: `${syncProgress}%`
                  }
                ]} 
              />
            </View>
            <View style={styles.progressInfo}>
              <Text style={[styles.statusText, { color: tokens.colors.text.secondary }]}>
                {syncStatus}
              </Text>
              <Text style={[styles.percentText, { color: tokens.colors.accent.primary }]}>
                {syncProgress}%
              </Text>
            </View>
          </View>
        )}

        <Text style={{ fontSize: 10, color: tokens.colors.text.secondary, marginTop: 8, marginLeft: 4 }}>
          {t('settings.updateHint')}
        </Text>
      </View>

        <Text style={[styles.version, { color: tokens.colors.text.secondary }]}>
          Version 1.0.0
        </Text>
      </ScrollView>
    </ScreenGradient>
  );
};

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
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
  version: { textAlign: 'center', marginTop: 20, marginBottom: 40, fontSize: 12 },
  progressContainer: {
    marginTop: 16,
    paddingHorizontal: 4,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  statusText: {
    fontSize: 12,
    flex: 1,
    marginRight: 8,
  },
  percentText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});
