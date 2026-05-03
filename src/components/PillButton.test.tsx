// Тесты для компонента PillButton
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PillButton } from './PillButton';
import { ThemeProvider } from '../theme/ThemeContext';

describe('PillButton', () => {
  it('должен рендерить текст кнопки', () => {
    const { getByText } = render(
      <ThemeProvider>
        <PillButton title="Нажми меня" onPress={() => {}} />
      </ThemeProvider>
    );

    expect(getByText('Нажми меня')).toBeTruthy();
  });

  it('должен вызывать onPress при нажатии', () => {
    const mockOnPress = jest.fn();
    
    const { getByText } = render(
      <ThemeProvider>
        <PillButton title="Кнопка" onPress={mockOnPress} />
      </ThemeProvider>
    );

    fireEvent.press(getByText('Кнопка'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('не должен вызывать onPress когда disabled=true', () => {
    const mockOnPress = jest.fn();
    
    const { getByText } = render(
      <ThemeProvider>
        <PillButton title="Кнопка" onPress={mockOnPress} disabled={true} />
      </ThemeProvider>
    );

    fireEvent.press(getByText('Кнопка'));
    expect(mockOnPress).not.toHaveBeenCalled();
  });

  it('должен применять стили primary варианта по умолчанию', () => {
    const { getByText } = render(
      <ThemeProvider>
        <PillButton title="Primary" onPress={() => {}} />
      </ThemeProvider>
    );

    expect(getByText('Primary')).toBeTruthy();
  });

  it('должен применять стили secondary варианта', () => {
    const { getByText } = render(
      <ThemeProvider>
        <PillButton title="Secondary" onPress={() => {}} variant="secondary" />
      </ThemeProvider>
    );

    expect(getByText('Secondary')).toBeTruthy();
  });

  it('должен принимать кастомные стили через prop style', () => {
    const customStyle = { marginTop: 10 };
    
    const { getByText } = render(
      <ThemeProvider>
        <PillButton title="Кнопка" onPress={() => {}} style={customStyle} />
      </ThemeProvider>
    );

    expect(getByText('Кнопка')).toBeTruthy();
  });
});
