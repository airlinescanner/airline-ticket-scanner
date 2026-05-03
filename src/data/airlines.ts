export interface AirlineData {
  name: string;
  country: string;
  // Сюда в будущем можно будет добавить: logo, baggageRulesUrl, checkInUrl и т.д.
}

export const AIRLINES_DATABASE: Record<string, AirlineData> = {
  // --- Европа ---
  "LH": { name: "Lufthansa", country: "Germany" },
  "LO": { name: "LOT Polish Airlines", country: "Poland" },
  "FR": { name: "Ryanair", country: "Ireland" },
  "W6": { name: "Wizz Air", country: "Hungary" },
  "AF": { name: "Air France", country: "France" },
  "BA": { name: "British Airways", country: "United Kingdom" },
  "KL": { name: "KLM Royal Dutch Airlines", country: "Netherlands" },
  "U2": { name: "easyJet", country: "United Kingdom" },
  "IB": { name: "Iberia", country: "Spain" },
  "VY": { name: "Vueling", country: "Spain" },
  "LX": { name: "Swiss International Air Lines", country: "Switzerland" },
  "OS": { name: "Austrian Airlines", country: "Austria" },
  "SN": { name: "Brussels Airlines", country: "Belgium" },
  "AY": { name: "Finnair", country: "Finland" },
  "SK": { name: "SAS Scandinavian Airlines", country: "Sweden" },
  "TP": { name: "TAP Air Portugal", country: "Portugal" },
  "A3": { name: "Aegean Airlines", country: "Greece" },
  "EI": { name: "Aer Lingus", country: "Ireland" },
  "UX": { name: "Air Europa", country: "Spain" },
  "BT": { name: "airBaltic", country: "Latvia" },
  "PS": { name: "Ukraine International Airlines", country: "Ukraine" },
  "PQ": { name: "SkyUp Airlines", country: "Ukraine" },
  "7W": { name: "Windrose Airlines", country: "Ukraine" },

  // --- Ближний Восток ---
  "TK": { name: "Turkish Airlines", country: "Turkey" },
  "PC": { name: "Pegasus Airlines", country: "Turkey" },
  "EK": { name: "Emirates", country: "United Arab Emirates" },
  "QR": { name: "Qatar Airways", country: "Qatar" },
  "EY": { name: "Etihad Airways", country: "United Arab Emirates" },
  "FZ": { name: "flydubai", country: "United Arab Emirates" },
  "LY": { name: "El Al Israel Airlines", country: "Israel" },

  // --- Северная Америка ---
  "AA": { name: "American Airlines", country: "United States" },
  "DL": { name: "Delta Air Lines", country: "United States" },
  "UA": { name: "United Airlines", country: "United States" },
  "WN": { name: "Southwest Airlines", country: "United States" },
  "B6": { name: "JetBlue Airways", country: "United States" },
  "AS": { name: "Alaska Airlines", country: "United States" },
  "AC": { name: "Air Canada", country: "Canada" },
  "WS": { name: "WestJet", country: "Canada" },

  // --- Азия и Океания ---
  "SQ": { name: "Singapore Airlines", country: "Singapore" },
  "CX": { name: "Cathay Pacific", country: "Hong Kong" },
  "NH": { name: "All Nippon Airways (ANA)", country: "Japan" },
  "JL": { name: "Japan Airlines", country: "Japan" },
  "KE": { name: "Korean Air", country: "South Korea" },
  "OZ": { name: "Asiana Airlines", country: "South Korea" },
  "TG": { name: "Thai Airways", country: "Thailand" },
  "QF": { name: "Qantas", country: "Australia" },
  "JQ": { name: "Jetstar Airways", country: "Australia" },
  "NZ": { name: "Air New Zealand", country: "New Zealand" },
  "CI": { name: "China Airlines", country: "Taiwan" },
  "BR": { name: "EVA Air", country: "Taiwan" },
  
  // --- Латинская Америка ---
  "LA": { name: "LATAM Airlines", country: "Chile" },
  "AM": { name: "Aeromexico", country: "Mexico" },
  "AV": { name: "Avianca", country: "Colombia" },
  "CM": { name: "Copa Airlines", country: "Panama" },

  // --- Африка ---
  "ET": { name: "Ethiopian Airlines", country: "Ethiopia" },
  "MS": { name: "EgyptAir", country: "Egypt" },
  "AT": { name: "Royal Air Maroc", country: "Morocco" },
  "KQ": { name: "Kenya Airways", country: "Kenya" },
};
