// Типы для билетов
export interface TicketData {
  passengerName: string | null;
  airlineName: string | null;       // ПОЛНОЕ название компании (e.g. Lot Polish Airlines)
  airlineCode: string | null;       // IATA (2 символа) или ICAO (3 символа)
  flightNumber: string | null;
  departureDate: string | null;     // ISO 8601 (YYYY-MM-DD)
  departureTime: string | null;     // HH:mm
  departureCity: string | null;     
  departureCountry: string | null;  
  departureAirport: string | null;  // IATA-код или название
  arrivalAirport: string | null;    // IATA-код или название
  arrivalCity: string | null;
  arrivalCountry: string | null;
  seat: string | null;
  serviceClass: string | null;
  bookingReference: string | null;
  operatingAirlineName?: string | null; // Авиакомпания, которая выполняет рейс (если отличается)
  operatingAirlineCode?: string | null; // Код оперирующей авиакомпании
  rawJson: string;                  
}

export interface Ticket {
  id: number;
  passengerName: string;
  airlineName: string | null;
  airlineCode: string;
  operatingAirlineName: string | null;
  operatingAirlineCode: string | null;
  flightNumber: string;
  departureDate: string;      // ISO 8601 (YYYY-MM-DD)
  departureTime: string | null;      // HH:mm (nullable)
  departureCity: string | null;
  departureCountry: string | null;
  departureAirport: string;
  arrivalAirport: string;
  arrivalCity: string | null;
  arrivalCountry: string | null;
  seat: string | null;
  serviceClass: string | null;
  rawJson: string;
  scannedAt: string;          // ISO 8601
  notificationEnabled: boolean;
  notificationId: string | null;
  bookingReference: string | null;
  tripId: number | null;
}

export interface Trip {
  id: number;
  passengerName: string;
  pnr: string | null;
  title: string | null;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  tickets?: Ticket[]; // Массив билетов, входящих в эту поездку
}
