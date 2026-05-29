import { DateTime } from 'luxon';

/**
 * TimezoneService - сервис для определения часовых поясов по кодам аэропортов или городам
 * 
 * Содержит маппинг 200+ популярных аэропортов мира в IANA Timezone IDs.
 * Геолокация НЕ используется — часовой пояс определяется по коду аэропорта вылета,
 * что является единственно правильным подходом (регистрация открывается по времени аэропорта).
 */
export class TimezoneService {
  // Маппинг кодов IATA → IANA Timezone IDs (200+ аэропортов)
  private airportTimezones: Record<string, string> = {
    // ═══════════════════════════════════════
    // УКРАИНА
    // ═══════════════════════════════════════
    'KBP': 'Europe/Kyiv',     // Киев Борисполь
    'IEV': 'Europe/Kyiv',     // Киев Жуляны
    'ODS': 'Europe/Kyiv',     // Одесса
    'LWO': 'Europe/Kyiv',     // Львов
    'HRK': 'Europe/Kyiv',     // Харьков
    'DNK': 'Europe/Kyiv',     // Днепр
    'ZAP': 'Europe/Kyiv',     // Запорожье

    // ═══════════════════════════════════════
    // ПОЛЬША
    // ═══════════════════════════════════════
    'WAW': 'Europe/Warsaw',   // Варшава Шопен
    'WMI': 'Europe/Warsaw',   // Варшава Модлин
    'KRK': 'Europe/Warsaw',   // Краков
    'GDN': 'Europe/Warsaw',   // Гданьск
    'WRO': 'Europe/Warsaw',   // Вроцлав
    'POZ': 'Europe/Warsaw',   // Познань
    'KTW': 'Europe/Warsaw',   // Катовице
    'RZE': 'Europe/Warsaw',   // Жешув
    'LUZ': 'Europe/Warsaw',   // Люблин
    'SZZ': 'Europe/Warsaw',   // Щецин
    'BZG': 'Europe/Warsaw',   // Быдгощ
    'LCJ': 'Europe/Warsaw',   // Лодзь

    // ═══════════════════════════════════════
    // ГЕРМАНИЯ
    // ═══════════════════════════════════════
    'FRA': 'Europe/Berlin',   // Франкфурт
    'MUC': 'Europe/Berlin',   // Мюнхен
    'BER': 'Europe/Berlin',   // Берлин Бранденбург
    'HAM': 'Europe/Berlin',   // Гамбург
    'DUS': 'Europe/Berlin',   // Дюссельдорф
    'CGN': 'Europe/Berlin',   // Кёльн/Бонн
    'STR': 'Europe/Berlin',   // Штутгарт
    'HAJ': 'Europe/Berlin',   // Ганновер
    'NUE': 'Europe/Berlin',   // Нюрнберг
    'LEJ': 'Europe/Berlin',   // Лейпциг
    'DTM': 'Europe/Berlin',   // Дортмунд
    'DRS': 'Europe/Berlin',   // Дрезден
    'FMO': 'Europe/Berlin',   // Мюнстер
    'BRE': 'Europe/Berlin',   // Бремен
    'HHN': 'Europe/Berlin',   // Франкфурт-Хан

    // ═══════════════════════════════════════
    // ФРАНЦИЯ
    // ═══════════════════════════════════════
    'CDG': 'Europe/Paris',    // Париж Шарль-де-Голль
    'ORY': 'Europe/Paris',    // Париж Орли
    'LYS': 'Europe/Paris',    // Лион
    'NCE': 'Europe/Paris',    // Ницца
    'MRS': 'Europe/Paris',    // Марсель
    'TLS': 'Europe/Paris',    // Тулуза
    'BOD': 'Europe/Paris',    // Бордо
    'NTE': 'Europe/Paris',    // Нант
    'SXB': 'Europe/Paris',    // Страсбург
    'BVA': 'Europe/Paris',    // Бове (Париж)
    'MPL': 'Europe/Paris',    // Монпелье

    // ═══════════════════════════════════════
    // ВЕЛИКОБРИТАНИЯ
    // ═══════════════════════════════════════
    'LHR': 'Europe/London',   // Лондон Хитроу
    'LGW': 'Europe/London',   // Лондон Гатвик
    'STN': 'Europe/London',   // Лондон Станстед
    'LTN': 'Europe/London',   // Лондон Лутон
    'LCY': 'Europe/London',   // Лондон Сити
    'MAN': 'Europe/London',   // Манчестер
    'BHX': 'Europe/London',   // Бирмингем
    'EDI': 'Europe/London',   // Эдинбург
    'GLA': 'Europe/London',   // Глазго
    'BRS': 'Europe/London',   // Бристоль
    'LPL': 'Europe/London',   // Ливерпуль
    'NCL': 'Europe/London',   // Ньюкасл
    'EMA': 'Europe/London',   // Ист-Мидлендс
    'BFS': 'Europe/London',   // Белфаст
    'ABZ': 'Europe/London',   // Абердин
    'CWL': 'Europe/London',   // Кардифф
    'SOU': 'Europe/London',   // Саутгемптон

    // ═══════════════════════════════════════
    // ИТАЛИЯ
    // ═══════════════════════════════════════
    'FCO': 'Europe/Rome',     // Рим Фьюмичино
    'CIA': 'Europe/Rome',     // Рим Чампино
    'MXP': 'Europe/Rome',     // Милан Мальпенса
    'LIN': 'Europe/Rome',     // Милан Линате
    'BGY': 'Europe/Rome',     // Милан Бергамо
    'VCE': 'Europe/Rome',     // Венеция
    'NAP': 'Europe/Rome',     // Неаполь
    'BLQ': 'Europe/Rome',     // Болонья
    'PMO': 'Europe/Rome',     // Палермо
    'CTA': 'Europe/Rome',     // Катания
    'FLR': 'Europe/Rome',     // Флоренция
    'PSA': 'Europe/Rome',     // Пиза
    'TRN': 'Europe/Rome',     // Турин
    'BRI': 'Europe/Rome',     // Бари
    'VRN': 'Europe/Rome',     // Верона
    'CAG': 'Europe/Rome',     // Кальяри
    'OLB': 'Europe/Rome',     // Олбия (Сардиния)

    // ═══════════════════════════════════════
    // ИСПАНИЯ
    // ═══════════════════════════════════════
    'MAD': 'Europe/Madrid',   // Мадрид
    'BCN': 'Europe/Madrid',   // Барселона
    'PMI': 'Europe/Madrid',   // Пальма-де-Мальорка
    'AGP': 'Europe/Madrid',   // Малага
    'ALC': 'Europe/Madrid',   // Аликанте
    'VLC': 'Europe/Madrid',   // Валенсия
    'SVQ': 'Europe/Madrid',   // Севилья
    'BIO': 'Europe/Madrid',   // Бильбао
    'IBZ': 'Europe/Madrid',   // Ибица
    'TFN': 'Atlantic/Canary', // Тенерифе Норте
    'TFS': 'Atlantic/Canary', // Тенерифе Сур
    'LPA': 'Atlantic/Canary', // Гран-Канария
    'ACE': 'Atlantic/Canary', // Лансароте
    'FUE': 'Atlantic/Canary', // Фуэртевентура
    'SCQ': 'Europe/Madrid',   // Сантьяго-де-Компостела
    'GRO': 'Europe/Madrid',   // Жирона

    // ═══════════════════════════════════════
    // ПОРТУГАЛИЯ
    // ═══════════════════════════════════════
    'LIS': 'Europe/Lisbon',   // Лиссабон
    'OPO': 'Europe/Lisbon',   // Порту
    'FAO': 'Europe/Lisbon',   // Фару
    'FNC': 'Atlantic/Madeira',// Мадейра
    'PDL': 'Atlantic/Azores', // Азорские острова

    // ═══════════════════════════════════════
    // НИДЕРЛАНДЫ
    // ═══════════════════════════════════════
    'AMS': 'Europe/Amsterdam',// Амстердам Схипхол
    'EIN': 'Europe/Amsterdam',// Эйндховен
    'RTM': 'Europe/Amsterdam',// Роттердам

    // ═══════════════════════════════════════
    // БЕЛЬГИЯ
    // ═══════════════════════════════════════
    'BRU': 'Europe/Brussels', // Брюссель
    'CRL': 'Europe/Brussels', // Шарлеруа

    // ═══════════════════════════════════════
    // ШВЕЙЦАРИЯ
    // ═══════════════════════════════════════
    'ZRH': 'Europe/Zurich',   // Цюрих
    'GVA': 'Europe/Zurich',   // Женева
    'BSL': 'Europe/Zurich',   // Базель

    // ═══════════════════════════════════════
    // АВСТРИЯ
    // ═══════════════════════════════════════
    'VIE': 'Europe/Vienna',   // Вена
    'SZG': 'Europe/Vienna',   // Зальцбург
    'INN': 'Europe/Vienna',   // Инсбрук
    'GRZ': 'Europe/Vienna',   // Грац

    // ═══════════════════════════════════════
    // ЧЕХИЯ
    // ═══════════════════════════════════════
    'PRG': 'Europe/Prague',   // Прага
    'BRQ': 'Europe/Prague',   // Брно

    // ═══════════════════════════════════════
    // ВЕНГРИЯ
    // ═══════════════════════════════════════
    'BUD': 'Europe/Budapest', // Будапешт

    // ═══════════════════════════════════════
    // РУМЫНИЯ
    // ═══════════════════════════════════════
    'OTP': 'Europe/Bucharest',// Бухарест
    'CLJ': 'Europe/Bucharest',// Клуж
    'TSR': 'Europe/Bucharest',// Тимишоара
    'IAS': 'Europe/Bucharest',// Яссы

    // ═══════════════════════════════════════
    // БОЛГАРИЯ
    // ═══════════════════════════════════════
    'SOF': 'Europe/Sofia',    // София
    'BOJ': 'Europe/Sofia',    // Бургас
    'VAR': 'Europe/Sofia',    // Варна

    // ═══════════════════════════════════════
    // ГРЕЦИЯ
    // ═══════════════════════════════════════
    'ATH': 'Europe/Athens',   // Афины
    'SKG': 'Europe/Athens',   // Салоники
    'HER': 'Europe/Athens',   // Ираклион (Крит)
    'CHQ': 'Europe/Athens',   // Ханья (Крит)
    'RHO': 'Europe/Athens',   // Родос
    'CFU': 'Europe/Athens',   // Корфу
    'KGS': 'Europe/Athens',   // Кос
    'JTR': 'Europe/Athens',   // Санторини
    'JMK': 'Europe/Athens',   // Миконос
    'ZTH': 'Europe/Athens',   // Закинтос

    // ═══════════════════════════════════════
    // ХОРВАТИЯ
    // ═══════════════════════════════════════
    'ZAG': 'Europe/Zagreb',   // Загреб
    'SPU': 'Europe/Zagreb',   // Сплит
    'DBV': 'Europe/Zagreb',   // Дубровник

    // ═══════════════════════════════════════
    // СЕРБИЯ
    // ═══════════════════════════════════════
    'BEG': 'Europe/Belgrade', // Белград

    // ═══════════════════════════════════════
    // СКАНДИНАВИЯ
    // ═══════════════════════════════════════
    'ARN': 'Europe/Stockholm',// Стокгольм Арланда
    'NYO': 'Europe/Stockholm',// Стокгольм Скавста
    'GOT': 'Europe/Stockholm',// Гётеборг
    'CPH': 'Europe/Copenhagen',// Копенгаген
    'BLL': 'Europe/Copenhagen',// Биллунд
    'OSL': 'Europe/Oslo',     // Осло Гардермуэн
    'TRD': 'Europe/Oslo',     // Тронхейм
    'BGO': 'Europe/Oslo',     // Берген
    'SVG': 'Europe/Oslo',     // Ставангер
    'HEL': 'Europe/Helsinki', // Хельсинки
    'TMP': 'Europe/Helsinki', // Тампере
    'TKU': 'Europe/Helsinki', // Турку
    'KEF': 'Atlantic/Reykjavik',// Рейкьявик

    // ═══════════════════════════════════════
    // ПРИБАЛТИКА
    // ═══════════════════════════════════════
    'RIX': 'Europe/Riga',     // Рига
    'VNO': 'Europe/Vilnius',  // Вильнюс
    'KUN': 'Europe/Vilnius',  // Каунас
    'TLL': 'Europe/Tallinn',  // Таллинн

    // ═══════════════════════════════════════
    // МОЛДОВА / БЕЛАРУСЬ
    // ═══════════════════════════════════════
    'KIV': 'Europe/Chisinau', // Кишинёв
    'MSQ': 'Europe/Minsk',    // Минск

    // ═══════════════════════════════════════
    // ТУРЦИЯ
    // ═══════════════════════════════════════
    'IST': 'Europe/Istanbul', // Стамбул
    'SAW': 'Europe/Istanbul', // Стамбул Сабиха
    'AYT': 'Europe/Istanbul', // Анталья
    'ESB': 'Europe/Istanbul', // Анкара
    'ADB': 'Europe/Istanbul', // Измир
    'DLM': 'Europe/Istanbul', // Даламан
    'BJV': 'Europe/Istanbul', // Бодрум
    'TZX': 'Europe/Istanbul', // Трабзон
    'GZT': 'Europe/Istanbul', // Газиантеп

    // ═══════════════════════════════════════
    // КИПР / МАЛЬТА
    // ═══════════════════════════════════════
    'LCA': 'Asia/Nicosia',    // Ларнака
    'PFO': 'Asia/Nicosia',    // Пафос
    'MLA': 'Europe/Malta',    // Мальта

    // ═══════════════════════════════════════
    // ИРЛАНДИЯ
    // ═══════════════════════════════════════
    'DUB': 'Europe/Dublin',   // Дублин
    'SNN': 'Europe/Dublin',   // Шеннон
    'ORK': 'Europe/Dublin',   // Корк

    // ═══════════════════════════════════════
    // ОАЭ
    // ═══════════════════════════════════════
    'DXB': 'Asia/Dubai',      // Дубай
    'DWC': 'Asia/Dubai',      // Дубай Аль-Мактум
    'AUH': 'Asia/Dubai',      // Абу-Даби
    'SHJ': 'Asia/Dubai',      // Шарджа

    // ═══════════════════════════════════════
    // САУДОВСКАЯ АРАВИЯ
    // ═══════════════════════════════════════
    'RUH': 'Asia/Riyadh',     // Эр-Рияд
    'JED': 'Asia/Riyadh',     // Джидда
    'DMM': 'Asia/Riyadh',     // Даммам

    // ═══════════════════════════════════════
    // КАТАР / БАХРЕЙН / ОМАН / КУВЕЙТ
    // ═══════════════════════════════════════
    'DOH': 'Asia/Qatar',      // Доха
    'BAH': 'Asia/Bahrain',    // Бахрейн
    'MCT': 'Asia/Muscat',     // Маскат
    'KWI': 'Asia/Kuwait',     // Кувейт

    // ═══════════════════════════════════════
    // ИЗРАИЛЬ / ИОРДАНИЯ
    // ═══════════════════════════════════════
    'TLV': 'Asia/Jerusalem',  // Тель-Авив
    'AMM': 'Asia/Amman',      // Амман
    'AQJ': 'Asia/Amman',      // Акаба

    // ═══════════════════════════════════════
    // ЕГИПЕТ / МАРОККО / ТУНИС
    // ═══════════════════════════════════════
    'CAI': 'Africa/Cairo',    // Каир
    'HRG': 'Africa/Cairo',    // Хургада
    'SSH': 'Africa/Cairo',    // Шарм-эль-Шейх
    'CMN': 'Africa/Casablanca',// Касабланка
    'RAK': 'Africa/Casablanca',// Марракеш
    'AGA': 'Africa/Casablanca',// Агадир
    'TUN': 'Africa/Tunis',    // Тунис

    // ═══════════════════════════════════════
    // ГРУЗИЯ / АРМЕНИЯ / АЗЕРБАЙДЖАН
    // ═══════════════════════════════════════
    'TBS': 'Asia/Tbilisi',    // Тбилиси
    'BUS': 'Asia/Tbilisi',    // Батуми
    'KUT': 'Asia/Tbilisi',    // Кутаиси
    'EVN': 'Asia/Yerevan',    // Ереван
    'GYD': 'Asia/Baku',       // Баку

    // ═══════════════════════════════════════
    // КАЗАХСТАН / УЗБЕКИСТАН
    // ═══════════════════════════════════════
    'ALA': 'Asia/Almaty',     // Алматы
    'NQZ': 'Asia/Almaty',     // Нур-Султан (Астана)
    'TSE': 'Asia/Almaty',     // Астана (старый код)
    'CIT': 'Asia/Almaty',     // Шымкент
    'TAS': 'Asia/Tashkent',   // Ташкент
    'SKD': 'Asia/Tashkent',   // Самарканд

    // ═══════════════════════════════════════
    // РОССИЯ (основные)
    // ═══════════════════════════════════════
    'SVO': 'Europe/Moscow',   // Москва Шереметьево
    'DME': 'Europe/Moscow',   // Москва Домодедово
    'VKO': 'Europe/Moscow',   // Москва Внуково
    'LED': 'Europe/Moscow',   // Санкт-Петербург
    'AER': 'Europe/Moscow',   // Сочи
    'KRR': 'Europe/Moscow',   // Краснодар
    'ROV': 'Europe/Moscow',   // Ростов-на-Дону
    'SVX': 'Asia/Yekaterinburg',// Екатеринбург
    'OVB': 'Asia/Novosibirsk',// Новосибирск

    // ═══════════════════════════════════════
    // ИНДИЯ
    // ═══════════════════════════════════════
    'DEL': 'Asia/Kolkata',    // Дели
    'BOM': 'Asia/Kolkata',    // Мумбаи
    'BLR': 'Asia/Kolkata',    // Бангалор
    'MAA': 'Asia/Kolkata',    // Ченнай
    'CCU': 'Asia/Kolkata',    // Калькутта
    'HYD': 'Asia/Kolkata',    // Хайдерабад
    'GOI': 'Asia/Kolkata',    // Гоа

    // ═══════════════════════════════════════
    // ЮГО-ВОСТОЧНАЯ АЗИЯ
    // ═══════════════════════════════════════
    'BKK': 'Asia/Bangkok',    // Бангкок Суварнабхуми
    'DMK': 'Asia/Bangkok',    // Бангкок Дон Муанг
    'HKT': 'Asia/Bangkok',    // Пхукет
    'CNX': 'Asia/Bangkok',    // Чиангмай
    'SIN': 'Asia/Singapore',  // Сингапур
    'KUL': 'Asia/Kuala_Lumpur',// Куала-Лумпур
    'CGK': 'Asia/Jakarta',    // Джакарта
    'DPS': 'Asia/Makassar',   // Бали (Денпасар)
    'MNL': 'Asia/Manila',     // Манила
    'SGN': 'Asia/Ho_Chi_Minh',// Хо Ши Мин
    'HAN': 'Asia/Ho_Chi_Minh',// Ханой
    'DAD': 'Asia/Ho_Chi_Minh',// Дананг
    'RGN': 'Asia/Yangon',     // Янгон
    'PNH': 'Asia/Phnom_Penh', // Пномпень
    'REP': 'Asia/Phnom_Penh', // Сием Рип

    // ═══════════════════════════════════════
    // КИТАЙ / ГОНКОНГ / ТАЙВАНЬ
    // ═══════════════════════════════════════
    'PEK': 'Asia/Shanghai',   // Пекин
    'PKX': 'Asia/Shanghai',   // Пекин Дасин
    'PVG': 'Asia/Shanghai',   // Шанхай Пудун
    'SHA': 'Asia/Shanghai',   // Шанхай Хунцяо
    'CAN': 'Asia/Shanghai',   // Гуанчжоу
    'SZX': 'Asia/Shanghai',   // Шэньчжэнь
    'HKG': 'Asia/Hong_Kong',  // Гонконг
    'TPE': 'Asia/Taipei',     // Тайбэй
    'MFM': 'Asia/Macau',      // Макао

    // ═══════════════════════════════════════
    // ЯПОНИЯ / ЮЖНАЯ КОРЕЯ
    // ═══════════════════════════════════════
    'NRT': 'Asia/Tokyo',      // Токио Нарита
    'HND': 'Asia/Tokyo',      // Токио Ханеда
    'KIX': 'Asia/Tokyo',      // Осака Кансай
    'NGO': 'Asia/Tokyo',      // Нагоя
    'FUK': 'Asia/Tokyo',      // Фукуока
    'CTS': 'Asia/Tokyo',      // Саппоро
    'ICN': 'Asia/Seoul',      // Сеул Инчхон
    'GMP': 'Asia/Seoul',      // Сеул Кимпхо
    'PUS': 'Asia/Seoul',      // Пусан

    // ═══════════════════════════════════════
    // АВСТРАЛИЯ / НОВАЯ ЗЕЛАНДИЯ
    // ═══════════════════════════════════════
    'SYD': 'Australia/Sydney',  // Сидней
    'MEL': 'Australia/Melbourne',// Мельбурн
    'BNE': 'Australia/Brisbane',// Брисбен
    'PER': 'Australia/Perth',   // Перт
    'ADL': 'Australia/Adelaide',// Аделаида
    'AKL': 'Pacific/Auckland',  // Окленд
    'WLG': 'Pacific/Auckland',  // Веллингтон
    'CHC': 'Pacific/Auckland',  // Крайстчерч

    // ═══════════════════════════════════════
    // США (основные хабы)
    // ═══════════════════════════════════════
    'JFK': 'America/New_York',  // Нью-Йорк JFK
    'EWR': 'America/New_York',  // Ньюарк
    'LGA': 'America/New_York',  // Нью-Йорк Ла-Гуардия
    'BOS': 'America/New_York',  // Бостон
    'PHL': 'America/New_York',  // Филадельфия
    'IAD': 'America/New_York',  // Вашингтон Даллес
    'DCA': 'America/New_York',  // Вашингтон Рейган
    'MIA': 'America/New_York',  // Майами
    'FLL': 'America/New_York',  // Форт-Лодердейл
    'MCO': 'America/New_York',  // Орландо
    'ATL': 'America/New_York',  // Атланта
    'CLT': 'America/New_York',  // Шарлотт
    'ORD': 'America/Chicago',   // Чикаго О'Хара
    'MDW': 'America/Chicago',   // Чикаго Мидвей
    'DFW': 'America/Chicago',   // Даллас
    'IAH': 'America/Chicago',   // Хьюстон Интерконтинентал
    'MSP': 'America/Chicago',   // Миннеаполис
    'DEN': 'America/Denver',    // Денвер
    'PHX': 'America/Phoenix',   // Финикс
    'LAX': 'America/Los_Angeles',// Лос-Анджелес
    'SFO': 'America/Los_Angeles',// Сан-Франциско
    'SJC': 'America/Los_Angeles',// Сан-Хосе
    'SEA': 'America/Los_Angeles',// Сиэтл
    'PDX': 'America/Los_Angeles',// Портленд
    'LAS': 'America/Los_Angeles',// Лас-Вегас
    'SAN': 'America/Los_Angeles',// Сан-Диего
    'HNL': 'Pacific/Honolulu',  // Гонолулу
    'ANC': 'America/Anchorage', // Анкоридж

    // ═══════════════════════════════════════
    // КАНАДА
    // ═══════════════════════════════════════
    'YYZ': 'America/Toronto',   // Торонто
    'YUL': 'America/Montreal',  // Монреаль
    'YVR': 'America/Vancouver', // Ванкувер
    'YOW': 'America/Toronto',   // Оттава
    'YYC': 'America/Edmonton',  // Калгари

    // ═══════════════════════════════════════
    // МЕКСИКА / КАРИБЫ
    // ═══════════════════════════════════════
    'MEX': 'America/Mexico_City',// Мехико
    'CUN': 'America/Cancun',    // Канкун
    'GDL': 'America/Mexico_City',// Гвадалахара
    'SJO': 'America/Costa_Rica',// Сан-Хосе (Коста-Рика)
    'PTY': 'America/Panama',    // Панама
    'HAV': 'America/Havana',    // Гавана
    'PUJ': 'America/Santo_Domingo',// Пунта-Кана

    // ═══════════════════════════════════════
    // ЮЖНАЯ АМЕРИКА
    // ═══════════════════════════════════════
    'GRU': 'America/Sao_Paulo', // Сан-Паулу
    'GIG': 'America/Sao_Paulo', // Рио-де-Жанейро
    'EZE': 'America/Argentina/Buenos_Aires',// Буэнос-Айрес
    'SCL': 'America/Santiago',  // Сантьяго (Чили)
    'BOG': 'America/Bogota',    // Богота
    'LIM': 'America/Lima',      // Лима

    // ═══════════════════════════════════════
    // АФРИКА (дополнительно)
    // ═══════════════════════════════════════
    'JNB': 'Africa/Johannesburg',// Йоханнесбург
    'CPT': 'Africa/Johannesburg',// Кейптаун
    'NBO': 'Africa/Nairobi',    // Найроби
    'ADD': 'Africa/Addis_Ababa',// Аддис-Абеба
    'LOS': 'Africa/Lagos',      // Лагос
    'ACC': 'Africa/Accra',      // Аккра
    'DAR': 'Africa/Dar_es_Salaam',// Дар-эс-Салам

    // ═══════════════════════════════════════
    // СЛОВАКИЯ / СЛОВЕНИЯ
    // ═══════════════════════════════════════
    'BTS': 'Europe/Bratislava', // Братислава
    'LJU': 'Europe/Ljubljana',  // Любляна

    // ═══════════════════════════════════════
    // ЛЮКСЕМБУРГ
    // ═══════════════════════════════════════
    'LUX': 'Europe/Luxembourg', // Люксембург

    // ═══════════════════════════════════════
    // ЧЕРНОГОРИЯ / СЕВЕРНАЯ МАКЕДОНИЯ / БОСНИЯ / АЛБАНИЯ / КОСОВО
    // ═══════════════════════════════════════
    'TGD': 'Europe/Podgorica', // Подгорица
    'TIV': 'Europe/Podgorica', // Тиват
    'SKP': 'Europe/Skopje',    // Скопье
    'SJJ': 'Europe/Sarajevo',  // Сараево
    'TIA': 'Europe/Tirane',    // Тирана
    'PRN': 'Europe/Belgrade',  // Приштина

    // ═══════════════════════════════════════
    // МАЛЬДИВЫ / ШРИ-ЛАНКА
    // ═══════════════════════════════════════
    'MLE': 'Indian/Maldives',  // Мале (Мальдивы)
    'CMB': 'Asia/Colombo',     // Коломбо (Шри-Ланка)

    // ═══════════════════════════════════════
    // МАВРИКИЙ / СЕЙШЕЛЫ
    // ═══════════════════════════════════════
    'MRU': 'Indian/Mauritius',  // Маврикий
    'SEZ': 'Indian/Mahe',       // Сейшелы
  };

  /**
   * Получить ID часового пояса по коду аэропорта или названию города
   */
  getTimezone(airportCode: string, city: string = ''): string {
    const code = airportCode.toUpperCase();
    
    // 1. По коду аэропорта (самый точный способ)
    if (this.airportTimezones[code]) {
      return this.airportTimezones[code];
    }

    // 2. По названию города (эвристика)
    const normalizedCity = city.toLowerCase();
    if (normalizedCity.includes('warsaw') || normalizedCity.includes('варшава')) return 'Europe/Warsaw';
    if (normalizedCity.includes('kyiv') || normalizedCity.includes('киев') || normalizedCity.includes('київ')) return 'Europe/Kyiv';
    if (normalizedCity.includes('berlin') || normalizedCity.includes('берлин') || normalizedCity.includes('берлін')) return 'Europe/Berlin';
    if (normalizedCity.includes('paris') || normalizedCity.includes('париж') || normalizedCity.includes('паріж')) return 'Europe/Paris';
    if (normalizedCity.includes('london') || normalizedCity.includes('лондон')) return 'Europe/London';
    if (normalizedCity.includes('dubai') || normalizedCity.includes('дубай') || normalizedCity.includes('дубаї')) return 'Asia/Dubai';
    if (normalizedCity.includes('istanbul') || normalizedCity.includes('стамбул') || normalizedCity.includes('стамбул')) return 'Europe/Istanbul';
    if (normalizedCity.includes('rome') || normalizedCity.includes('рим') || normalizedCity.includes('roma')) return 'Europe/Rome';
    if (normalizedCity.includes('madrid') || normalizedCity.includes('мадрид')) return 'Europe/Madrid';
    if (normalizedCity.includes('barcelona') || normalizedCity.includes('барселона')) return 'Europe/Madrid';
    if (normalizedCity.includes('amsterdam') || normalizedCity.includes('амстердам')) return 'Europe/Amsterdam';
    if (normalizedCity.includes('vienna') || normalizedCity.includes('вена') || normalizedCity.includes('відень')) return 'Europe/Vienna';
    if (normalizedCity.includes('prague') || normalizedCity.includes('прага')) return 'Europe/Prague';
    if (normalizedCity.includes('budapest') || normalizedCity.includes('будапешт')) return 'Europe/Budapest';
    if (normalizedCity.includes('lisbon') || normalizedCity.includes('лиссабон') || normalizedCity.includes('лісабон')) return 'Europe/Lisbon';
    if (normalizedCity.includes('athens') || normalizedCity.includes('афины') || normalizedCity.includes('афіни')) return 'Europe/Athens';
    if (normalizedCity.includes('bangkok') || normalizedCity.includes('бангкок')) return 'Asia/Bangkok';
    if (normalizedCity.includes('singapore') || normalizedCity.includes('сингапур')) return 'Asia/Singapore';
    if (normalizedCity.includes('tokyo') || normalizedCity.includes('токио') || normalizedCity.includes('токіо')) return 'Asia/Tokyo';
    if (normalizedCity.includes('seoul') || normalizedCity.includes('сеул')) return 'Asia/Seoul';
    if (normalizedCity.includes('new york') || normalizedCity.includes('нью-йорк')) return 'America/New_York';
    if (normalizedCity.includes('los angeles') || normalizedCity.includes('лос-анджелес')) return 'America/Los_Angeles';
    if (normalizedCity.includes('chicago') || normalizedCity.includes('чикаго')) return 'America/Chicago';
    if (normalizedCity.includes('toronto') || normalizedCity.includes('торонто')) return 'America/Toronto';
    if (normalizedCity.includes('moscow') || normalizedCity.includes('москва')) return 'Europe/Moscow';
    if (normalizedCity.includes('tbilisi') || normalizedCity.includes('тбилиси') || normalizedCity.includes('тбілісі')) return 'Asia/Tbilisi';
    if (normalizedCity.includes('batumi') || normalizedCity.includes('батуми') || normalizedCity.includes('батумі')) return 'Asia/Tbilisi';
    if (normalizedCity.includes('baku') || normalizedCity.includes('баку')) return 'Asia/Baku';
    if (normalizedCity.includes('yerevan') || normalizedCity.includes('ереван') || normalizedCity.includes('єреван')) return 'Asia/Yerevan';
    if (normalizedCity.includes('almaty') || normalizedCity.includes('алматы')) return 'Asia/Almaty';
    if (normalizedCity.includes('tashkent') || normalizedCity.includes('ташкент')) return 'Asia/Tashkent';

    // 3. Фолбэк — часовой пояс устройства пользователя
    // Это используется только когда аэропорт не найден ни в маппинге, ни по городу.
    // Работает через настройки ОС (не требует GPS).
    console.warn(`[TimezoneService] Airport ${code} not found in mapping, using device timezone as fallback`);
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  /**
   * Рассчитать момент открытия регистрации в UTC
   * 
   * @param departureDate Дата вылета (YYYY-MM-DD)
   * @param departureTime Время вылета (HH:mm)
   * @param timezone Часовой пояс аэропорта вылета
   * @param hoursBefore За сколько часов открывается регистрация
   */
  getCheckInOpeningUTC(
    departureDate: string,
    departureTime: string,
    timezone: string,
    hoursBefore: number
  ): DateTime {
    // 1. Создаем объект даты-времени в местном поясе аэропорта
    const localDeparture = DateTime.fromFormat(`${departureDate} ${departureTime}`, 'yyyy-MM-dd HH:mm', {
      zone: timezone,
    });

    // 2. Отнимаем часы до открытия регистрации
    const localOpening = localDeparture.minus({ hours: hoursBefore });

    // 3. Возвращаем в UTC (Luxon автоматически обрабатывает DST/переходы)
    return localOpening.toUTC();
  }
}

export const timezoneService = new TimezoneService();
