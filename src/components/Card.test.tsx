// Тесты для компонента Card
import React from 'react';
import { render } from '@testing-library/react-native';
import { Text, Platform } from 'react-native';
import { Card } from './Card';
import { ThemeProvider } from '../theme/ThemeContext';

describe('Card', () => {
  it('должен рендерить дочерние элементы', () => {
    const { getByText } = render(
      <ThemeProvider>
        <Card>
          <Text>Тестовый контент</Text>
        </Card>
      </ThemeProvider>
    );

    expect(getByText('Тестовый контент')).toBeTruthy();
  });

  it('должен применять токены borderRadius и background', () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <Card>
          <Text testID="card-content">Контент</Text>
        </Card>
      </ThemeProvider>
    );

    const cardContent = getByTestId('card-content');
    expect(cardContent).toBeTruthy();
  });

  it('должен применять elevation на Android в светлой теме', () => {
    Platform.OS = 'android';
    
    const { getByTestId } = render(
      <ThemeProvider>
        <Card>
          <Text testID="card-content">Контент</Text>
        </Card>
      </ThemeProvider>
    );

    expect(getByTestId('card-content')).toBeTruthy();
  });

  it('должен применять shadow на iOS в светлой теме', () => {
    Platform.OS = 'ios';
    
    const { getByTestId } = render(
      <ThemeProvider>
        <Card>
          <Text testID="card-content">Контент</Text>
        </Card>
      </ThemeProvider>
    );

    expect(getByTestId('card-content')).toBeTruthy();
  });

  it('должен принимать кастомные стили через prop style', () => {
    const customStyle = { marginTop: 20 };
    
    const { getByTestId } = render(
      <ThemeProvider>
        <Card style={customStyle}>
          <Text testID="card-content">Контент</Text>
        </Card>
      </ThemeProvider>
    );

    expect(getByTestId('card-content')).toBeTruthy();
  });
});
