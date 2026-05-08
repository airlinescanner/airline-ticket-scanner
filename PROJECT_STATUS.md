# Project Status: Airline Ticket Scanner

This document serves as a handover for any AI assistant or developer picking up the project.

## 🚀 Project Overview
The "Airline Ticket Scanner" is an Expo/React Native application designed to scan airline tickets (via OCR and Gemini/Groq AI), extract flight information, and provide automated check-in notifications.

## ✅ Key Accomplishments (May 2026)

### 1. Test Suite Stabilization (100% Pass Rate)
- **Total Tests**: 111 passed out of 111.
- **Mocking**: A robust, stateful SQLite mock is implemented in `jest.setup.js`. It accurately simulates `INSERT`, `UPDATE`, `DELETE`, `LIMIT`, and `PRAGMA` operations.
- **Integration**: `database.integration.test.ts` and `business-logic.integration.test.ts` are fully synchronized with the production schema and seed data.

### 2. Database & Data Layer
- **Schema**: Tables for `airlines`, `tickets`, `trips`, and `app_meta` are finalized.
- **Seed Data**: Populated with ~600 global airlines.
- **Policy Compliance**: All Russian airlines (including Aeroflot/SU) have been removed from the seed data and test suites per user request.
- **Repositories**: `TicketRepository` and `AirlineRepository` handle all CRUD operations with proper snake_case to camelCase mapping.

### 3. Logic & Parsing
- **TicketParser**: Hardened regex-based parser that handles various OCR layouts, route formats (e.g., `FRA-MUC`, `FROM FRA TO MUC`), and service classes (`Economy`, `Business`, `First`).
- **RegistrationMatcher**: Correctly calculates check-in opening times based on airline-specific rules (e.g., 24h, 30h, 48h before departure).

### 4. Cleanup & Security
- **Garbage Cleanup**: All temporary report and task files have been removed from the root directory.
- **Secrets**: `src/config/ApiConfig.ts` is ignored by Git. A template `src/config/ApiConfig.template.ts` is provided for environment setup.

## 🛠 Tech Stack
- **Framework**: Expo (React Native)
- **Database**: `expo-sqlite`
- **AI/OCR**: Google Gemini / Groq / ML Kit Text Recognition
- **Testing**: Jest & Testing Library
- **Localization**: i18next (supports UA, RU, EN)

## 📖 How to Run
- **Start App**: `npx expo start`
- **Run Tests**: `npm test`
- **Run Tests (Silent)**: `npm test --silent`

## 📋 Next Steps
1. **OCR Hardening**: Further refine regex patterns in `TicketParser.ts` as more real-world OCR results are collected.
2. **Notification Logic**: Verify live notification dispatching via `expo-notifications` (tests cover the logic, but native integration needs verification).
3. **UI Polishing**: Finalize the "Trips" view and ensure smooth transitions between scan and result screens.

## ⚠️ Important Notes for AI
- **Mock DB**: If you modify the SQL schema, remember to update the mock implementation in `jest.setup.js`, otherwise tests will fail.
- **Airlines**: Avoid adding Russian carriers back to the project.
- **API Keys**: Ensure `ApiConfig.ts` exists locally with valid keys before testing AI features.

---
*Last Updated: May 8, 2026*
