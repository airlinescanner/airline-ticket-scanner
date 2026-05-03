import { ticketRepository } from './TicketRepository';
import { databaseService } from './DatabaseService';
import { Ticket } from '../../types/ticket';

describe('TicketRepository', () => {
  beforeEach(async () => {
    // Очищаем базу перед каждым тестом
    await databaseService.clearAllData();
  });

  afterAll(async () => {
    await databaseService.close();
  });

  describe('Сохранение билета', () => {
    it('должен сохранить билет с автоматическим scanned_at', async () => {
      const ticket: Omit<Ticket, 'id' | 'scannedAt'> = {
        passengerName: 'IVANOV/IVAN',
        airlineCode: 'SU',
        flightNumber: 'SU1234',
        departureDate: '2025-06-15T10:00:00Z',
        departureAirport: 'SVO',
        arrivalAirport: 'LED',
        seat: '14A',
        serviceClass: 'Economy',
        rawJson: '{}',
        notificationEnabled: false,
        notificationId: null,
      };

      const saved = await ticketRepository.save(ticket);

      expect(saved.id).toBeDefined();
      expect(saved.passengerName).toBe('IVANOV/IVAN');
      expect(saved.scannedAt).toBeDefined();
      expect(new Date(saved.scannedAt).getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('должен сохранить билет с null полями', async () => {
      const ticket: Omit<Ticket, 'id' | 'scannedAt'> = {
        passengerName: 'IVANOV/IVAN',
        airlineCode: 'SU',
        flightNumber: 'SU1234',
        departureDate: '2025-06-15T10:00:00Z',
        departureAirport: 'SVO',
        arrivalAirport: 'LED',
        seat: null,
        serviceClass: null,
        rawJson: '{}',
        notificationEnabled: false,
        notificationId: null,
      };

      const saved = await ticketRepository.save(ticket);

      expect(saved.seat).toBeNull();
      expect(saved.serviceClass).toBeNull();
    });
  });

  describe('Поиск билетов', () => {
    beforeEach(async () => {
      // Создаём несколько билетов для тестирования
      await ticketRepository.save({
        passengerName: 'IVANOV/IVAN',
        airlineCode: 'SU',
        flightNumber: 'SU1234',
        departureDate: '2025-06-15T10:00:00Z',
        departureAirport: 'SVO',
        arrivalAirport: 'LED',
        seat: '14A',
        serviceClass: 'Economy',
        rawJson: '{}',
        notificationEnabled: false,
        notificationId: null,
      });

      // Небольшая задержка для разных scanned_at
      await new Promise(resolve => setTimeout(resolve, 10));

      await ticketRepository.save({
        passengerName: 'PETROV/PETR',
        airlineCode: 'LH',
        flightNumber: 'LH5678',
        departureDate: '2025-07-20T14:00:00Z',
        departureAirport: 'FRA',
        arrivalAirport: 'MUC',
        seat: '22B',
        serviceClass: 'Business',
        rawJson: '{}',
        notificationEnabled: true,
        notificationId: 'notif-123',
      });
    });

    it('должен возвращать все билеты, отсортированные по дате сканирования (DESC)', async () => {
      const tickets = await ticketRepository.findAll();

      expect(tickets).toHaveLength(2);
      // Последний добавленный должен быть первым
      expect(tickets[0].passengerName).toBe('PETROV/PETR');
      expect(tickets[1].passengerName).toBe('IVANOV/IVAN');
    });

    it('должен ограничивать количество результатов', async () => {
      const tickets = await ticketRepository.findAll(1);
      expect(tickets).toHaveLength(1);
    });

    it('должен находить билет по ID', async () => {
      const saved = await ticketRepository.save({
        passengerName: 'SIDOROV/SIDR',
        airlineCode: 'BA',
        flightNumber: 'BA9999',
        departureDate: '2025-08-01T08:00:00Z',
        departureAirport: 'LHR',
        arrivalAirport: 'JFK',
        seat: '1A',
        serviceClass: 'First',
        rawJson: '{}',
        notificationEnabled: false,
        notificationId: null,
      });

      const found = await ticketRepository.findById(saved.id);

      expect(found).not.toBeNull();
      expect(found?.id).toBe(saved.id);
      expect(found?.passengerName).toBe('SIDOROV/SIDR');
    });

    it('должен возвращать null для несуществующего ID', async () => {
      const found = await ticketRepository.findById(99999);
      expect(found).toBeNull();
    });
  });

  describe('Обновление уведомлений', () => {
    it('должен обновлять статус уведомления', async () => {
      const saved = await ticketRepository.save({
        passengerName: 'IVANOV/IVAN',
        airlineCode: 'SU',
        flightNumber: 'SU1234',
        departureDate: '2025-06-15T10:00:00Z',
        departureAirport: 'SVO',
        arrivalAirport: 'LED',
        seat: '14A',
        serviceClass: 'Economy',
        rawJson: '{}',
        notificationEnabled: false,
        notificationId: null,
      });

      await ticketRepository.updateNotification(saved.id, true, 'notif-456');

      const updated = await ticketRepository.findById(saved.id);
      expect(updated?.notificationEnabled).toBe(true);
      expect(updated?.notificationId).toBe('notif-456');
    });

    it('должен отключать уведомление', async () => {
      const saved = await ticketRepository.save({
        passengerName: 'IVANOV/IVAN',
        airlineCode: 'SU',
        flightNumber: 'SU1234',
        departureDate: '2025-06-15T10:00:00Z',
        departureAirport: 'SVO',
        arrivalAirport: 'LED',
        seat: '14A',
        serviceClass: 'Economy',
        rawJson: '{}',
        notificationEnabled: true,
        notificationId: 'notif-789',
      });

      await ticketRepository.updateNotification(saved.id, false);

      const updated = await ticketRepository.findById(saved.id);
      expect(updated?.notificationEnabled).toBe(false);
      expect(updated?.notificationId).toBeNull();
    });
  });

  describe('Удаление билета', () => {
    it('должен удалять билет по ID', async () => {
      const saved = await ticketRepository.save({
        passengerName: 'IVANOV/IVAN',
        airlineCode: 'SU',
        flightNumber: 'SU1234',
        departureDate: '2025-06-15T10:00:00Z',
        departureAirport: 'SVO',
        arrivalAirport: 'LED',
        seat: '14A',
        serviceClass: 'Economy',
        rawJson: '{}',
        notificationEnabled: false,
        notificationId: null,
      });

      await ticketRepository.delete(saved.id);

      const found = await ticketRepository.findById(saved.id);
      expect(found).toBeNull();
    });
  });

  describe('Замена всех билетов (для бэкапа)', () => {
    it('должен заменять все билеты', async () => {
      // Создаём начальные билеты
      await ticketRepository.save({
        passengerName: 'OLD/TICKET',
        airlineCode: 'SU',
        flightNumber: 'SU1111',
        departureDate: '2025-06-15T10:00:00Z',
        departureAirport: 'SVO',
        arrivalAirport: 'LED',
        seat: '1A',
        serviceClass: 'Economy',
        rawJson: '{}',
        notificationEnabled: false,
        notificationId: null,
      });

      // Заменяем на новые
      const newTickets: Ticket[] = [
        {
          id: 1,
          passengerName: 'NEW/TICKET1',
          airlineCode: 'LH',
          flightNumber: 'LH2222',
          departureDate: '2025-07-20T14:00:00Z',
          departureAirport: 'FRA',
          arrivalAirport: 'MUC',
          seat: '2B',
          serviceClass: 'Business',
          rawJson: '{}',
          scannedAt: '2025-05-01T12:00:00Z',
          notificationEnabled: true,
          notificationId: 'notif-new',
        },
        {
          id: 2,
          passengerName: 'NEW/TICKET2',
          airlineCode: 'BA',
          flightNumber: 'BA3333',
          departureDate: '2025-08-01T08:00:00Z',
          departureAirport: 'LHR',
          arrivalAirport: 'JFK',
          seat: '3C',
          serviceClass: 'First',
          rawJson: '{}',
          scannedAt: '2025-05-02T12:00:00Z',
          notificationEnabled: false,
          notificationId: null,
        },
      ];

      await ticketRepository.replaceAll(newTickets);

      const allTickets = await ticketRepository.findAll();
      expect(allTickets).toHaveLength(2);
      expect(allTickets.find(t => t.passengerName === 'OLD/TICKET')).toBeUndefined();
      expect(allTickets.find(t => t.passengerName === 'NEW/TICKET1')).toBeDefined();
      expect(allTickets.find(t => t.passengerName === 'NEW/TICKET2')).toBeDefined();
    });
  });
});
