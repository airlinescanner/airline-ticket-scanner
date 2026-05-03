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
  seat: string | null;
  serviceClass: string | null;
  rawJson: string;                  
}

export interface Ticket {
  id: number;
  passengerName: string;
  airlineName: string | null;
  airlineCode: string;
  flightNumber: string;
  departureDate: string;      // ISO 8601 (YYYY-MM-DD)
  departureTime: string;      // HH:mm
  departureCity: string;
  departureCountry: string | null;
  departureAirport: string;
  arrivalAirport: string;
  seat: string | null;
  serviceClass: string | null;
  rawJson: string;
  scannedAt: string;          // ISO 8601
  notificationEnabled: boolean;
  notificationId: string | null;
}
