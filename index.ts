import { registerRootComponent } from 'expo';
import { LogBox } from 'react-native';

// Игнорируем предупреждения о переезде на новую файловую систему Expo
LogBox.ignoreLogs(['expo-file-system', 'readAsStringAsync']);

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
