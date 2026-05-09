/**
 * Извлекает 3-буквенный IATA код из строки.
 * Например: "Munich (MUC)" -> "MUC", "London Heathrow - LHR" -> "LHR", "JFK" -> "JFK"
 */
export const extractIataCode = (text: string | null | undefined): string => {
  if (!text) return '';
  
  // Ищем 3 заглавные буквы, окруженные границами слов или скобками
  const match = text.match(/\b([A-Z]{3})\b/) || text.match(/\(([A-Z]{3})\)/);
  
  if (match && match[1]) {
    return match[1];
  }
  
  // Если не нашли регуляркой, но строка короткая (3-4 символа), возвращаем как есть
  if (text.length >= 3 && text.length <= 4) {
    return text.toUpperCase();
  }
  
  return text.substring(0, 3).toUpperCase();
};

/**
 * Очищает название города от лишних деталей
 */
export const cleanCityName = (text: string | null | undefined): string => {
  if (!text) return '';
  
  // Убираем все что в скобках
  let clean = text.replace(/\(.*\)/g, '').trim();
  
  // Убираем IATA коды в конце строки через тире или пробел
  clean = clean.replace(/[-\s][A-Z]{3}$/, '').trim();
  
  return clean;
};
