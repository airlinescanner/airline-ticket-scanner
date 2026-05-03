// Типы для авиакомпаний
export interface Airline {
  id: number;
  iataCode: string;           // 2 символа, верхний регистр
  icaoCode: string;           // 3 символа, верхний регистр
  name: string;
  country: string;
  logoUrl: string | null;
  registrationUrl: string | null;
  supportPhone: string | null;
  checkInHoursBefore: number; // 1–720
  notes: string | null;
  updatedAt: string;          // ISO 8601
}
