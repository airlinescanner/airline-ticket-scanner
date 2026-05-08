import { TicketData } from '../types/ticket';

export class TicketParser {
  private readonly MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  private readonly FULL_MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];

  private readonly AIRLINES: Record<string, string> = {
    'LOT POLISH AIRLINES': 'LO',
    'LOT': 'LO',
    'LUFTHANSA': 'LH',
    'TURKISH AIRLINES': 'TK',
    'RYANAIR': 'FR',
    'WIZZ AIR': 'W6',
    'UKRAINE INTERNATIONAL AIRLINES': 'PS',
    'UIA': 'PS',
    'AIR FRANCE': 'AF',
    'KLM': 'KL',
    'EMIRATES': 'EK',
    'QATAR AIRWAYS': 'QR',
    'BRITISH AIRWAYS': 'BA',
    'PEGASUS': 'PC',
    'AUSTRIAN AIRLINES': 'OS',
    'SWISS': 'LX',
    'EASYJET': 'U2',
  };

  private readonly BLACKLIST_WORDS = [
    'EMBRAER', 'BOEING', 'AIRBUS', 'FLIGHT', 'BOARDING', 'GATE', 
    'SEAT', 'CLASS', 'DATE', 'FROM', 'TO', 'ECONOMY', 'BUSINESS', 
    'FIRST', 'TERMINAL', 'BAGGAGE', 'EQUIPMENT', 'MEAL', 'CONFIRMED', 
    'STATUS', 'DURATION', 'AGENCY', 'TELEPHONE', 'TICKET', 'PASSENGER',
    'TRAVELER', 'BOOKING', 'REF', 'DOCUMENT', 'ISSUE'
  ];

  parse(rawText: string): TicketData[] {
    const lines = rawText.toUpperCase()
      .replace(/[|]/g, 'I')
      .split('\n')
      .map(l => l.trim().replace(/\s+/g, ' '))
      .filter(l => l.length > 0);

    const passengerName = this.extractPassengerName(lines);
    const flightBlocks = this.splitIntoFlightBlocks(lines);

    const results: TicketData[] = [];

    for (const block of flightBlocks) {
      const { airlineName, airlineCode, flightNumber } = this.extractAirlineAndFlight(block);
      const { departureDate, departureAirport } = this.extractDepartureInfo(block);
      const arrivalAirport = this.extractArrivalAirport(block);
      const seat = this.extractSeat(block);
      const serviceClass = this.extractServiceClass(block);

      // Проверяем, есть ли хоть какие-то полезные данные в блоке
      if (!flightNumber && !airlineCode && !departureDate) continue;

      const ticketData: TicketData = {
        passengerName,
        airlineName,
        airlineCode: airlineCode || (flightNumber ? flightNumber.substring(0, 2) : null),
        flightNumber,
        departureDate: departureDate ? this.convertToISO8601(departureDate) : null,
        departureTime: null,
        departureCity: null,
        departureCountry: null,
        departureAirport,
        arrivalAirport,
        arrivalCity: null,
        arrivalCountry: null,
        seat,
        serviceClass,
        bookingReference: null,
        rawJson: '',
      };

      ticketData.rawJson = this.prettyPrint(ticketData);
      results.push(ticketData);
    }

    if (results.length === 0) {
      results.push({
        passengerName: this.extractPassengerName(lines),
        airlineName: null,
        airlineCode: null,
        flightNumber: null,
        departureDate: null,
        departureTime: null,
        departureCity: null,
        departureCountry: null,
        departureAirport: null,
        arrivalAirport: null,
        arrivalCity: null,
        arrivalCountry: null,
        seat: null,
        serviceClass: this.extractServiceClass(lines),
        bookingReference: null,
        rawJson: '',
      });
      results[0].rawJson = this.prettyPrint(results[0]);
    }

    return results;
  }

  prettyPrint(ticketData: TicketData): string {
    const { rawJson, ...dataWithoutRawJson } = ticketData;
    return JSON.stringify(dataWithoutRawJson, null, 2);
  }

  // Бьет текст на логические куски (сегменты), каждый начинается с названия компании или кода
  private splitIntoFlightBlocks(lines: string[]): string[][] {
    const blocks: string[][] = [];
    let currentBlock: string[] = [];

    for (const line of lines) {
      let isNewFlight = false;
      
      // 1. Идеальный разделитель для Amadeus: Заголовок с датой (WEDNESDAY 07 JANUARY 2026)
      const isDateHeader = /\b(?:MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY)\b\s+\d{1,2}\s+(?:JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)\s+\d{4}/.test(line);

      if (isDateHeader) {
        isNewFlight = true;
      } else {
        // 2. Строгая проверка на Авиакомпанию + Номер рейса В ОДНОЙ СТРОКЕ
        for (const [airlineName, code] of Object.entries(this.AIRLINES)) {
          // Если слово (например UIA) просто встречается в тексте - это НЕ рейс. 
          // Должно быть: Название компании + цифры рейса.
          if (line.includes(airlineName)) {
            const flightRegex = new RegExp(`(?:${code}|\\b)\\s*(\\d{3,4})\\b`);
            if (flightRegex.test(line) && !line.includes('GENERAL INFORMATION')) {
              isNewFlight = true;
              break;
            }
          }
        }
      }

      if (isNewFlight && currentBlock.length > 0) {
        blocks.push([...currentBlock]);
        currentBlock = [line];
      } else {
        currentBlock.push(line);
      }
    }

    if (currentBlock.length > 0) {
      blocks.push(currentBlock);
    }

    return blocks.length > 0 ? blocks : [lines];
  }

  private extractPassengerName(lines: string[]): string | null {
    const titleRegex = /\b(?:MRS|MR|MS|CH|CHILD|CHL)\b/;

    for (const line of lines) {
      if (titleRegex.test(line)) {
        const match = line.match(/\b(?:MRS|MR|MS|CH|CHILD|CHL)\b\s+(.*)/);
        if (match && match[1]) {
          const words = match[1].replace(/[^A-Z\s]/g, '').split(/\s+/).filter(w => w.length > 1);
          const cleanWords = words
            .filter(w => !this.BLACKLIST_WORDS.includes(w))
            .slice(0, 3);
          
          if (cleanWords.length >= 2) { 
            return cleanWords.join(' ');
          }
        }
      }
    }

    // Fallback: search for something like IVANOV/IVAN
    for (const line of lines) {
      if (line.includes('/') && !line.includes('FLIGHT') && !line.includes('BOARDING') && !line.includes('GATE')) {
        let cleanLine = line.replace(/PASSENGER:\s*/i, '').trim();
        const parts = cleanLine.split('/');
        if (parts.length >= 2 && parts[0].length > 1 && parts[1].length > 1) {
          return cleanLine;
        }
      }
    }

    return null;
  }

  private extractAirlineAndFlight(lines: string[]): { airlineName: string | null, airlineCode: string | null, flightNumber: string | null } {
    for (const line of lines) {
      for (const [airlineName, code] of Object.entries(this.AIRLINES)) {
        if (line.includes(airlineName)) {
          const flightRegex = new RegExp(`\\b${code}\\s*(\\d{1,4})\\b`);
          const flightMatch = line.match(flightRegex);
          
          if (flightMatch) {
            return { airlineName, airlineCode: code, flightNumber: `${code}${flightMatch[1]}` };
          }
          return { airlineName, airlineCode: code, flightNumber: null };
        }
      }

      const genericFlightMatch = line.match(/\b([A-Z]{2})\s*(\d{3,4})\b/);
      if (genericFlightMatch) {
        const code = genericFlightMatch[1];
        if (!['TO', 'ON', 'AT', 'IN'].includes(code)) {
          return { airlineName: null, airlineCode: code, flightNumber: `${code}${genericFlightMatch[2]}` };
        }
      }
    }
    return { airlineName: null, airlineCode: null, flightNumber: null };
  }

  private extractDepartureInfo(lines: string[]): { departureDate: string | null, departureAirport: string | null } {
    const monthsStr = [...this.MONTHS, ...this.FULL_MONTHS].join('|');
    // Паттерн даты: "07 JANUARY" или "07 JANUARY 2026"
    const dateRegex = new RegExp(`(\\d{1,2})\\s+(${monthsStr})(?:\\s+(\\d{4}))?`);
    
    let departureDate = null;
    let departureAirport = null;

    // 1. Сначала ищем Заголовок Блока (Среда 07 Января 2026) - это 100% дата вылета
    const headerRegex = new RegExp(`\\b(?:MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY)\\b\\s+(\\d{1,2}\\s+(?:${monthsStr})\\s+\\d{4})`);
    for (const line of lines) {
      const match = line.match(headerRegex);
      if (match && match[1]) {
        departureDate = match[1]; // "07 JANUARY 2026"
        break;
      }
    }

    // 2. Если заголовка нет, ищем просто первую попавшуюся дату в блоке. 
    // Поскольку мы уже разбили на строгие блоки, любая дата - это дата рейса.
    if (!departureDate) {
      for (const line of lines) {
        const dateMatch = line.match(dateRegex);
        if (dateMatch) {
          let dateResult = `${dateMatch[1].padStart(2, '0')} ${dateMatch[2]}`;
          if (dateMatch[3]) dateResult += ` ${dateMatch[3]}`; 
          departureDate = dateResult;
          break;
        }
      }
    }

    // 3. Ищем аэропорты (SVO-LED format or FROM ... TO ...)
    for (const line of lines) {
        const routeMatch = line.match(/\b([A-Z]{3})\s*(?:[-/]|TO)\s*([A-Z]{3})\b/i);
        if (routeMatch) {
            departureAirport = routeMatch[1];
            break;
        }
    }

    // 4. Ищем аэропорт (тупо по всему блоку, потому что OCR может разбить колонки)
    if (!departureAirport) {
        for (const line of lines) {
          const airportMatch = line.match(/\b([A-Z]{3})\b/);
          const forbidden = [...this.MONTHS, ...this.BLACKLIST_WORDS];
          let code = (airportMatch && !forbidden.includes(airportMatch[1])) ? airportMatch[1] : null;
          
          if (!code) {
            if (line.includes('WARSAW')) code = 'WAW';
            if (line.includes('LYON')) code = 'LYS';
            if (line.includes('KYIV')) code = 'KBP';
          }
    
          if (code) {
            departureAirport = code;
            break;
          }
        }
    }

    return { departureDate, departureAirport };
  }

  private extractArrivalAirport(lines: string[]): string | null {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Try SVO-LED or FROM ... TO ... format first
      const routeMatch = line.match(/\b([A-Z]{3})\s*(?:[-/]|TO)\s*([A-Z]{3})\b/i);
      if (routeMatch) return routeMatch[2];

      if (line.includes('ARRIVAL')) {
        let targetLine = line;
        if (i + 1 < lines.length) targetLine += " " + lines[i+1];

        const match = targetLine.match(/\b([A-Z]{3})\b/);
        const forbidden = [...this.MONTHS, ...this.BLACKLIST_WORDS];
        
        if (match && !forbidden.includes(match[1])) {
          return match[1];
        }
        
        if (targetLine.includes('WARSAW')) return 'WAW';
        if (targetLine.includes('LYON')) return 'LYS';
        if (targetLine.includes('KYIV')) return 'KBP';
      }
    }
    return null;
  }

  private extractSeat(lines: string[]): string | null {
    for (const line of lines) {
      if (line.includes('SEAT')) {
        const match = line.match(/\b(\d{1,3}[A-Z])\b/);
        if (match) return match[1];
      }
    }
    return null;
  }

  private extractServiceClass(lines: string[]): string | null {
    const fullText = lines.join(' ');
    if (fullText.includes('ECONOMY')) return 'Economy';
    if (fullText.includes('BUSINESS')) return 'Business';
    if (fullText.includes('FIRST')) return 'First';
    
    if (/CLASS[:\s]*Y/i.test(fullText)) return 'Economy';
    if (/CLASS[:\s]*C/i.test(fullText)) return 'Business';
    if (/CLASS[:\s]*F/i.test(fullText)) return 'First';
    
    return null;
  }

  private convertToISO8601(dateStr: string): string {
    const parts = dateStr.split(' ');
    const day = parts[0];
    let monthStr = parts[1];
    
    if (monthStr.length > 3) {
      const idx = this.FULL_MONTHS.indexOf(monthStr);
      if (idx !== -1) monthStr = this.MONTHS[idx];
    }
    
    const month = this.MONTHS.indexOf(monthStr) + 1;
    let year = parts[2] ? parts[2] : new Date().getFullYear().toString();
    
    if (month > 0) {
      return `${year}-${month.toString().padStart(2, '0')}-${day}T00:00:00Z`;
    }
    return new Date().toISOString();
  }
}

export const ticketParser = new TicketParser();
