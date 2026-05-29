import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  SUCCESSFUL_SCANS: 'rate_limit_successful_scans',
  CONSECUTIVE_FAILURES: 'rate_limit_consecutive_failures',
  LOCK_UNTIL: 'rate_limit_lock_until',
};

const DAILY_LIMIT = 10;
const MAX_CONSECUTIVE_FAILURES = 5;
const COOLDOWN_DURATION_MS = 5 * 60 * 1000; // 5 минут

export interface LimitStatus {
  allowed: boolean;
  reason?: 'daily_limit' | 'consecutive_failures';
  cooldownRemainingSeconds?: number;
  remainingScans: number;
}

class RateLimitService {
  /**
   * Проверить текущий статус лимитов
   */
  async checkLimit(): Promise<LimitStatus> {
    const now = Date.now();
    const remainingScans = await this.getRemainingScans();

    // 1. Проверяем блокировку из-за ошибок
    const lockUntilStr = await AsyncStorage.getItem(STORAGE_KEYS.LOCK_UNTIL);
    if (lockUntilStr) {
      const lockUntil = parseInt(lockUntilStr, 10);
      if (now < lockUntil) {
        const cooldownRemainingSeconds = Math.ceil((lockUntil - now) / 1000);
        return {
          allowed: false,
          reason: 'consecutive_failures',
          cooldownRemainingSeconds,
          remainingScans,
        };
      } else {
        // Срок блокировки истек, очищаем ее и сбрасываем счетчик ошибок
        await AsyncStorage.removeItem(STORAGE_KEYS.LOCK_UNTIL);
        await AsyncStorage.setItem(STORAGE_KEYS.CONSECUTIVE_FAILURES, '0');
      }
    }

    // 2. Проверяем дневной лимит
    if (remainingScans <= 0) {
      return {
        allowed: false,
        reason: 'daily_limit',
        remainingScans: 0,
      };
    }

    return {
      allowed: true,
      remainingScans,
    };
  }

  /**
   * Записать успешное сканирование (сбрасывает ошибки)
   */
  async recordSuccess(): Promise<void> {
    const now = Date.now();
    const scans = await this.getSuccessfulScans();
    
    // Добавляем текущий запуск
    scans.push(now);
    
    // Сохраняем и сбрасываем неуспешные попытки
    await AsyncStorage.setItem(STORAGE_KEYS.SUCCESSFUL_SCANS, JSON.stringify(scans));
    await AsyncStorage.setItem(STORAGE_KEYS.CONSECUTIVE_FAILURES, '0');
    await AsyncStorage.removeItem(STORAGE_KEYS.LOCK_UNTIL);
    console.log('[RateLimitService] Scan recorded successfully. Failure counters reset.');
  }

  /**
   * Записать неуспешное сканирование
   */
  async recordFailure(): Promise<boolean> {
    const currentFailuresStr = await AsyncStorage.getItem(STORAGE_KEYS.CONSECUTIVE_FAILURES) || '0';
    const nextFailures = parseInt(currentFailuresStr, 10) + 1;
    
    console.log(`[RateLimitService] Consecutive failures count: ${nextFailures}/${MAX_CONSECUTIVE_FAILURES}`);

    if (nextFailures >= MAX_CONSECUTIVE_FAILURES) {
      const lockUntil = Date.now() + COOLDOWN_DURATION_MS;
      await AsyncStorage.setItem(STORAGE_KEYS.LOCK_UNTIL, lockUntil.toString());
      await AsyncStorage.setItem(STORAGE_KEYS.CONSECUTIVE_FAILURES, nextFailures.toString());
      console.warn('[RateLimitService] Anti-spam block activated for 5 minutes.');
      return true; // Блокировка активирована
    }

    await AsyncStorage.setItem(STORAGE_KEYS.CONSECUTIVE_FAILURES, nextFailures.toString());
    return false; // Еще не заблокирован
  }

  /**
   * Получить количество оставшихся успешных сканирований на сегодня
   */
  async getRemainingScans(): Promise<number> {
    const scans = await this.getSuccessfulScans();
    const remaining = DAILY_LIMIT - scans.length;
    return Math.max(0, remaining);
  }

  /**
   * Вспомогательный метод для получения и очистки старых успешных сканирований
   */
  private async getSuccessfulScans(): Promise<number[]> {
    try {
      const scansStr = await AsyncStorage.getItem(STORAGE_KEYS.SUCCESSFUL_SCANS);
      if (!scansStr) return [];
      
      const scans: number[] = JSON.parse(scansStr);
      const now = Date.now();
      const oneDayAgo = now - 24 * 60 * 60 * 1000;
      
      // Фильтруем только сканирования за последние 24 часа
      const activeScans = scans.filter(timestamp => timestamp > oneDayAgo);
      
      // Если список изменился, обновляем хранилище
      if (activeScans.length !== scans.length) {
        await AsyncStorage.setItem(STORAGE_KEYS.SUCCESSFUL_SCANS, JSON.stringify(activeScans));
      }
      
      return activeScans;
    } catch (e) {
      return [];
    }
  }

  /**
   * Полный сброс лимитов (для отладки/тестирования)
   */
  async resetAllLimits(): Promise<void> {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.SUCCESSFUL_SCANS,
      STORAGE_KEYS.CONSECUTIVE_FAILURES,
      STORAGE_KEYS.LOCK_UNTIL,
    ]);
  }
}

export const rateLimitService = new RateLimitService();
