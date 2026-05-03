# ✈️ PROJECT MASTER HANDOVER: Airline Ticket Scanner

This document serves as the **Single Source of Truth** for the development of the Airline Ticket Scanner mobile application. It contains the complete history, architectural decisions, technical specifications, and current progress.

---

## 📋 1. Project Vision
**Goal**: A premium mobile app (React Native/Expo) that scans airline tickets (from laptop screens or paper), extracts flight details using AI/OCR, and provides automated, timezone-aware check-in notifications tailored to specific passengers.

---

## 🛠️ 2. Technical Stack
- **Core**: React Native + TypeScript (Expo SDK 52+)
- **AI/LLM**: Google Gemini (via `GoogleGenerativeAI` SDK) for intelligent data extraction.
- **OCR**: Google ML Kit Text Recognition (On-device fallback).
- **Time Management**: `Luxon` (High-precision timezone and DST handling).
- **Database**: `expo-sqlite` (Relational storage with V6 schema).
- **Notifications**: `expo-notifications` (Local scheduling).
- **Localization**: `i18next` (Supports Ukrainian [Primary] and Russian).
- **Theme**: Custom Context API (Glassmorphism & Vibrant Design).

---

## 🏗️ 3. Architecture & Services

### Core Services (`src/services/`)
1. **GeminiService.ts**: 
    - Handles screenshot analysis.
    - **Prompt Logic**: Instructs Gemini to extract: Passenger Name, Flight Number, Airline, Route, Departure Date, Departure Time, City, and Country.
    - Returns an array of flight segments.
2. **TimezoneService.ts**:
    - Maps IATA codes (WAW, KBP, DXB) to IANA Timezones (`Europe/Warsaw`, `Europe/Kyiv`, etc.).
    - Calculates UTC opening times for registration based on local airport schedules and airline rules.
3. **RegistrationMatcher.ts**:
    - Matches flights with the local airline database.
    - Calculates the "Online Registration Opens" moment.
    - Provides real-time countdown strings.
4. **NotificationScheduler.ts**:
    - Schedules local push notifications.
    - Personalizes messages with passenger names (e.g., "Time to check in [Name]!").
5. **DatabaseService.ts**:
    - Manages SQLite lifecycle.
    - **Current Schema (V6)**: Includes fields for `passenger_name`, `departure_time`, `departure_city`, and `departure_country`.

---

## 📊 4. Database Schema (V6)

### `tickets` Table
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | INTEGER | Primary Key |
| `passenger_name` | TEXT | Extracted from ticket (e.g. IVANOV/IVAN) |
| `airline_code` | TEXT | IATA/ICAO code |
| `flight_number` | TEXT | Flight ID |
| `departure_date` | TEXT | Format: YYYY-MM-DD |
| `departure_time` | TEXT | Format: HH:mm |
| `departure_city` | TEXT | City name for timezone resolution |
| `departure_airport` | TEXT | IATA code (e.g. WAW) |
| `arrival_airport` | TEXT | IATA code |
| `notification_enabled` | INTEGER | 0 or 1 |
| `notification_id` | TEXT | Expo notification identifier |

---

## 🎨 5. Design Standards
- **Date Format**: Standardized across the entire app to `DD.MM.YYYY` (e.g., 03.05.2026).
- **Formatting**: Handled via `src/utils/dateUtils.ts`.
- **Aesthetics**: High-contrast dark/light modes with glassmorphism effects. Accent colors: Green (`#00C853`) for Dark, Orange (`#F5A623`) for Light.

---

## ✅ 6. Implementation Progress (Summary)

### Phase 1: Infrastructure (100%)
- ✅ Theme & Localization systems.
- ✅ Base UI Components (Card, Button, Input).
- ✅ SQLite initialization & Repositories.

### Phase 2: Intelligence (100%)
- ✅ Gemini integration for high-accuracy extraction.
- ✅ Timezone mapping for international airports.
- ✅ DST-aware check-in calculations using Luxon.
- ✅ Personalised notification triggers.

### Phase 3: UI/Screens (80%)
- ✅ **ScannerScreen**: Camera view with viewfinder.
- ✅ **ScanResultScreen**: Multi-segment editing and verification.
- ✅ **HistoryScreen**: List of tickets with passenger names.
- ✅ **TicketDetailScreen**: Full flight info, countdown, and notification management.
- ⏳ **AirlinesScreen**: List of airlines (implemented but needs polish).
- ⏳ **SettingsScreen**: (Basic version exists).

---

## 🚀 7. Pending Tasks (Roadmap)
1. **Airlines Management**:
    - Enhance `AirlinesScreen` to allow manual editing of check-in rules (e.g., changing 24h to 48h).
    - Add more airports to `TimezoneService` mapping or implement a fallback API lookup.
2. **Polishing**:
    - Add micro-animations (Lottie or Reanimated) to the scanning process.
    - Implement "Pull to Refresh" on the History screen.
3. **Robustness**:
    - Add "Test Notification" button in settings to verify permissions.
    - Handle edge cases where Gemini returns incomplete data (e.g., prompt user for missing city).

---

## 💡 8. Critical Context for Future Devs
- **Timezone Logic**: Never calculate registration time on the server or using phone local time alone. Always resolve the timezone of the **departure airport** first.
- **Data Persistence**: When adding new fields to the database, always increment the version in `DatabaseService.ts` and add a migration block to prevent user data loss.
- **AI Prompts**: If you modify the prompt in `GeminiService.ts`, ensure it continues to return valid JSON as a string to avoid parsing errors.

---
*Last Updated: May 3, 2026*
