const fs = require('fs');
const airlines = [
  { iata: "LH", icao: "DLH", name: "Lufthansa", country: "Germany", checkIn: 30 },
  { iata: "LO", icao: "LOT", name: "LOT Polish Airlines", country: "Poland", checkIn: 36 },
  { iata: "FR", icao: "RYR", name: "Ryanair", country: "Ireland", checkIn: 24 },
  { iata: "W6", icao: "WZZ", name: "Wizz Air", country: "Hungary", checkIn: 24 },
  { iata: "AF", icao: "AFR", name: "Air France", country: "France", checkIn: 30 },
  { iata: "BA", icao: "BAW", name: "British Airways", country: "United Kingdom", checkIn: 24 },
  { iata: "KL", icao: "KLM", name: "KLM Royal Dutch Airlines", country: "Netherlands", checkIn: 30 },
  { iata: "U2", icao: "EZY", name: "easyJet", country: "United Kingdom", checkIn: 720 },
  { iata: "IB", icao: "IBE", name: "Iberia", country: "Spain", checkIn: 24 },
  { iata: "VY", icao: "VLG", name: "Vueling", country: "Spain", checkIn: 72 },
  { iata: "LX", icao: "SWR", name: "Swiss International Air Lines", country: "Switzerland", checkIn: 23 },
  { iata: "OS", icao: "AUA", name: "Austrian Airlines", country: "Austria", checkIn: 47 },
  { iata: "SN", icao: "BEL", name: "Brussels Airlines", country: "Belgium", checkIn: 24 },
  { iata: "AY", icao: "FIN", name: "Finnair", country: "Finland", checkIn: 36 },
  { iata: "SK", icao: "SAS", name: "SAS Scandinavian Airlines", country: "Sweden", checkIn: 22 },
  { iata: "TP", icao: "TAP", name: "TAP Air Portugal", country: "Portugal", checkIn: 36 },
  { iata: "A3", icao: "AEE", name: "Aegean Airlines", country: "Greece", checkIn: 48 },
  { iata: "EI", icao: "EIN", name: "Aer Lingus", country: "Ireland", checkIn: 48 },
  { iata: "UX", icao: "AEA", name: "Air Europa", country: "Spain", checkIn: 48 },
  { iata: "BT", icao: "BTI", name: "airBaltic", country: "Latvia", checkIn: 36 },
  { iata: "PS", icao: "AUI", name: "Ukraine International Airlines", country: "Ukraine", checkIn: 24 },
  { iata: "PQ", icao: "SQP", name: "SkyUp Airlines", country: "Ukraine", checkIn: 48 },
  { iata: "7W", icao: "WRC", name: "Windrose Airlines", country: "Ukraine", checkIn: 24 },
  { iata: "TK", icao: "THY", name: "Turkish Airlines", country: "Turkey", checkIn: 24 },
  { iata: "PC", icao: "PGT", name: "Pegasus Airlines", country: "Turkey", checkIn: 72 },
  { iata: "EK", icao: "UAE", name: "Emirates", country: "United Arab Emirates", checkIn: 48 },
  { iata: "QR", icao: "QTR", name: "Qatar Airways", country: "Qatar", checkIn: 48 },
  { iata: "EY", icao: "ETD", name: "Etihad Airways", country: "United Arab Emirates", checkIn: 30 },
  { iata: "FZ", icao: "FDB", name: "flydubai", country: "United Arab Emirates", checkIn: 48 },
  { iata: "LY", icao: "ELY", name: "El Al Israel Airlines", country: "Israel", checkIn: 24 },
  { iata: "AA", icao: "AAL", name: "American Airlines", country: "United States", checkIn: 24 },
  { iata: "DL", icao: "DAL", name: "Delta Air Lines", country: "United States", checkIn: 24 },
  { iata: "UA", icao: "UAL", name: "United Airlines", country: "United States", checkIn: 24 },
  { iata: "SQ", icao: "SIA", name: "Singapore Airlines", country: "Singapore", checkIn: 48 },
  { iata: "CX", icao: "CPA", name: "Cathay Pacific", country: "Hong Kong", checkIn: 48 },
  { iata: "JL", icao: "JAL", name: "Japan Airlines", country: "Japan", checkIn: 24 },
  { iata: "KE", icao: "KAL", name: "Korean Air", country: "South Korea", checkIn: 24 },
  { iata: "TG", icao: "THA", name: "Thai Airways", country: "Thailand", checkIn: 24 },
  { iata: "QF", icao: "QFA", name: "Qantas", country: "Australia", checkIn: 24 },
  { iata: "NZ", icao: "ANZ", name: "Air New Zealand", country: "New Zealand", checkIn: 24 },
  { iata: "CI", icao: "CAL", name: "China Airlines", country: "Taiwan", checkIn: 48 },
  { iata: "BR", icao: "EVA", name: "EVA Air", country: "Taiwan", checkIn: 48 },
  { iata: "ET", icao: "ETH", name: "Ethiopian Airlines", country: "Ethiopia", checkIn: 36 },
  { iata: "MS", icao: "MSR", name: "EgyptAir", country: "Egypt", checkIn: 48 },
  { iata: "AT", icao: "RAM", name: "Royal Air Maroc", country: "Morocco", checkIn: 48 },
  { iata: "KQ", icao: "KQA", name: "Kenya Airways", country: "Kenya", checkIn: 30 },
  { iata: "DY", icao: "NOZ", name: "Norwegian", country: "Norway", checkIn: 24 },

  // --- CIS / Центральная Азия и Кавказ ---
  { iata: "J2", icao: "AHY", name: "Azerbaijan Airlines", country: "Azerbaijan", checkIn: 24 },
  { iata: "HY", icao: "UZB", name: "Uzbekistan Airways", country: "Uzbekistan", checkIn: 24 },
  { iata: "T5", icao: "TUA", name: "Turkmenistan Airlines", country: "Turkmenistan", checkIn: 24 },
  { iata: "A9", icao: "TGZ", name: "Georgian Airways", country: "Georgia", checkIn: 24 },
  { iata: "9U", icao: "MLD", name: "Air Moldova", country: "Moldova", checkIn: 24 },
  { iata: "5F", icao: "FIA", name: "FlyOne", country: "Moldova", checkIn: 24 },
  { iata: "KC", icao: "KZR", name: "Air Astana", country: "Kazakhstan", checkIn: 36 },
  { iata: "DV", icao: "VSV", name: "SCAT Airlines", country: "Kazakhstan", checkIn: 24 },
  { iata: "FS", icao: "KFS", name: "FlyArystan", country: "Kazakhstan", checkIn: 24 },
  { iata: "IQ", icao: "KZA", name: "Qazaq Air", country: "Kazakhstan", checkIn: 24 },
];

let output = "import { Airline } from '../types/airline';\n\n";
output += "export const seedAirlines: Omit<Airline, 'id' | 'updatedAt'>[] = [\n";

for (const data of airlines) {
  output += "  {\n";
  output += "    iataCode: '" + data.iata + "',\n";
  output += "    icaoCode: '" + data.icao + "',\n";
  output += "    name: '" + data.name + "',\n";
  output += "    country: '" + data.country + "',\n";
  output += "    logoUrl: null,\n";
  output += "    registrationUrl: '',\n";
  output += "    supportPhone: '',\n";
  output += "    checkInHoursBefore: " + (data.checkIn || 24) + ",\n";
  output += "    notes: null,\n";
  output += "  },\n";
}

output += "];\n";

fs.writeFileSync('src/utils/seedData.ts', output);
