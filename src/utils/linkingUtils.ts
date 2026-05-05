import { Linking, Alert } from 'react-native';

/**
 * Открыть URL во внешнем браузере
 */
export const openUrl = async (url: string) => {
  if (!url) return;
  
  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Error', `Cannot open URL: ${url}`);
    }
  } catch (error) {
    console.error('Error opening URL:', error);
    Alert.alert('Error', 'An unexpected error occurred while opening the website.');
  }
};
