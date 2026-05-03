// Тесты для компонента EmptyState
import React from 'react';
import { render } from '@testing-library/react-native';
import { EmptyState } from './EmptyState';
import { ThemeProvider } from '../theme/ThemeContext';

describe('EmptyState', () => {
  it('должен рендерить сообщение', () => {
    const { getByText } = render(
      <ThemeProvider>
        <EmptyState message="Список пуст" />
      </ThemeProvider>
    );

    expect(getByText('Список пуст')).toBeTruthy();
  });

  it('должен рендерить иконку если передана', () => {
    const { getByText } = render(
      <ThemeProvider>
        <EmptyState message="Нет данных" icon="📭" />
      </ThemeProvider>
    );

    expect(getByText('📭')).toBeTruthy();
    expect(getByText('Нет данных')).toBeTruthy();
  });

  it('не должен рендерить иконку если не передана', () => {
    const { queryByText } = render(
      <ThemeProvider>
        <EmptyState message="Только текст" />
      </ThemeProvider>
    );

    expect(queryByText('📭')).toBeNull();
    expect(queryByText('Только текст')).toBeTruthy();
  });

  it('должен применять токены для цвета текста', () => {
    const { getByText } = render(
      <ThemeProvider>
        <EmptyState message="Тестовое сообщение" />
      </ThemeProvider>
    );

    expect(getByText('Тестовое сообщение')).toBeTruthy();
  });

  it('должен применять токены для отступов', () => {
    const { getByText } = render(
      <ThemeProvider>
        <EmptyState message="Проверка отступов" icon="🔍" />
      </ThemeProvider>
    );

    expect(getByText('Проверка отступов')).toBeTruthy();
  });
});
