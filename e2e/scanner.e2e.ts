import { by, device, expect, element } from 'detox';

describe('Airline Ticket Scanner - E2E User Journey', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('должен успешно запускаться и открывать экран сканирования билетов', async () => {
    // Проверяем, что оверлей видоискателя камеры виден на старте
    await expect(element(by.id('viewfinder_overlay'))).toBeVisible();
    
    // Проверяем наличие кнопки спуска затвора камеры
    await expect(element(by.label('Сфотографировать билет'))).toBeVisible();
  });

  it('должен проходить полный путь: сканирование билета -> отображение результатов -> проверка бэкапа', async () => {
    // 1. Имитируем нажатие на кнопку захвата кадра
    const captureButton = element(by.label('Сфотографировать билет'));
    await captureButton.tap();

    // Ждем окончания автофокусировки и локального/сетевого OCR разбора
    await waitFor(element(by.text('Результаты сканирования')))
      .toBeVisible()
      .withTimeout(10000);

    // 2. На экране результатов проверяем распознанные поля билета
    await expect(element(by.id('ticket_passenger_name'))).toHaveText('JOHN SMITH');
    await expect(element(by.id('ticket_flight_number'))).toHaveText('LH1234');
    await expect(element(by.id('ticket_airline_code'))).toHaveText('LH');
    await expect(element(by.id('ticket_booking_reference'))).toHaveText('K8Y9P2');

    // Нажимаем на кнопку "Сохранить билет" для импорта в базу SQLite
    const saveButton = element(by.id('save_ticket_button'));
    await saveButton.tap();

    // 3. Переходим на вкладку настроек для создания резервной копии базы данных
    const settingsTab = element(by.id('settings_tab_button'));
    await settingsTab.tap();

    await expect(element(by.text('Резервное копирование'))).toBeVisible();

    // Инициируем бэкап базы данных
    const backupButton = element(by.id('create_backup_button'));
    await backupButton.tap();

    // Должно всплыть модальное окно успешного создания бэкапа
    await expect(element(by.text('Резервная копия успешно создана!'))).toBeVisible();
    
    const closeAlertButton = element(by.text('OK'));
    await closeAlertButton.tap();
  });
});
