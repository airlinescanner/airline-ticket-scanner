import { DateTime } from 'luxon';

/**
 * Форматирует дату из ISO (YYYY-MM-DD) в формат DD.MM.YYYY
 * @param isoDate Строка даты в формате YYYY-MM-DD
 * @returns Строка даты в формате DD.MM.YYYY или исходная строка, если формат неверный
 */
export const formatDateToDisplay = (isoDate: string | null | undefined): string => {
  if (!isoDate) return '';
  
  // Если дата уже в формате DD.MM.YYYY, возвращаем как есть
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(isoDate)) {
    return isoDate;
  }

  const dt = DateTime.fromISO(isoDate);
  if (dt.isValid) {
    return dt.toFormat('dd.MM.yyyy');
  }
  
  return isoDate;
};

/**
 * Конвертирует дату из формата DD.MM.YYYY в ISO (YYYY-MM-DD)
 * @param displayDate Строка даты в формате DD.MM.YYYY
 * @returns Строка даты в формате YYYY-MM-DD или исходная строка
 */
export const parseDisplayDateToISO = (displayDate: string | null | undefined): string => {
  if (!displayDate) return '';
  
  const dt = DateTime.fromFormat(displayDate, 'dd.MM.yyyy');
  if (dt.isValid) {
    return dt.toISODate() || displayDate;
  }
  
  return displayDate;
};
