/**
 * Типы маршрутов для React Navigation
 * 
 * Определяет параметры для всех экранов приложения
 */

import { TicketData } from '../types/ticket';
import { Airline } from '../types/airline';
import { Ticket } from '../types/ticket';

/**
 * Параметры для Bottom Tab Navigator
 */
export type BottomTabParamList = {
  Scanner: undefined;
  History: undefined;
  Airlines: undefined;
  Settings: undefined;
};

/**
 * Параметры для Stack Navigator
 */
export type RootStackParamList = {
  // Главный таб-навигатор
  MainTabs: undefined;
  
  // Экран результата сканирования
  ScanResult: {
    ticketDataList: TicketData[];
  };
  
  // Экран даты регистрации
  RegistrationDate: {
    ticketId: number;
  };
  
  // Экран деталей авиакомпании
  AirlineDetail: {
    airlineId: number;
    mode?: 'view' | 'edit';
  };
  
  // Экран деталей билета
  TicketDetail: {
    ticketId: number;
  };
};

/**
 * Объединённый тип для всех маршрутов
 */
export type AllRoutesParamList = BottomTabParamList & RootStackParamList;

/**
 * Типы для навигации
 */
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
