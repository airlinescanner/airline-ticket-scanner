import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  Animated, 
  Dimensions,
  Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { PillButton } from './PillButton';

// Временно отключаем BlurView из-за ошибки кэша Metro
// import { BlurView } from 'expo-blur';
const BlurView: any = View;

const { width } = Dimensions.get('window');

export type AlertType = 'info' | 'success' | 'warning' | 'error' | 'delete';

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface AlertModalProps {
  visible: boolean;
  title: string;
  message: string;
  type?: AlertType;
  buttons?: AlertButton[];
  onClose: () => void;
}

export const AlertModal: React.FC<AlertModalProps> = ({
  visible,
  title,
  message,
  type = 'info',
  buttons = [],
  onClose,
}) => {
  const { tokens } = useTheme();
  const [slideAnim] = React.useState(new Animated.Value(Dimensions.get('window').height));
  const [opacityAnim] = React.useState(new Animated.Value(0));

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 60,
          friction: 10,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(Dimensions.get('window').height);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success': return { name: 'checkmark-circle', color: '#34C759' };
      case 'warning': return { name: 'warning', color: '#FF9500' };
      case 'error': return { name: 'alert-circle', color: '#FF3B30' };
      case 'delete': return { name: 'trash', color: '#FF3B30' };
      default: return { name: 'information-circle', color: tokens.colors.accent.primary };
    }
  };

  const icon = getIcon();

  const handleButtonPress = (onPress?: () => void) => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: Dimensions.get('window').height,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
      if (onPress) onPress();
    });
  };

  return (
    <Modal transparent visible={visible} animationType="none">
      <View style={styles.overlay}>
        <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
          <TouchableOpacity 
            style={styles.backdropTouch} 
            activeOpacity={1} 
            onPress={() => handleButtonPress()} 
          />
        </Animated.View>

        <Animated.View 
          style={[
            styles.container, 
            { 
              transform: [{ translateY: slideAnim }],
              backgroundColor: tokens.colors.background.card,
              paddingBottom: Platform.OS === 'ios' ? 40 : 24,
            }
          ]}
        >
          <View style={[styles.handle, { backgroundColor: tokens.colors.border.default }]} />
          
          <View style={styles.content}>
            <View style={[styles.iconContainer, { backgroundColor: icon.color + '15' }]}>
              <Ionicons name={icon.name as any} size={32} color={icon.color} />
            </View>

            <Text style={[styles.title, { color: tokens.colors.text.primary }]}>
              {title}
            </Text>
            
            <Text style={[styles.message, { color: tokens.colors.text.secondary }]}>
              {message}
            </Text>

            <View style={styles.footer}>
              {buttons.length > 0 ? (
                buttons.map((btn, index) => {
                  const isDestructive = btn.style === 'destructive';
                  const isCancel = btn.style === 'cancel';
                  
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.button,
                        index > 0 && styles.buttonMargin,
                        isCancel && { backgroundColor: tokens.colors.background.card },
                        !isCancel && !isDestructive && { backgroundColor: tokens.colors.accent.primary },
                        isDestructive && { backgroundColor: '#FF3B30' }
                      ]}
                      onPress={() => handleButtonPress(btn.onPress)}
                    >
                      <Text 
                        style={[
                          styles.buttonText, 
                          { 
                            color: isCancel ? tokens.colors.text.primary : '#FFFFFF',
                            fontWeight: '600'
                          }
                        ]}
                      >
                        {btn.text}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <PillButton 
                  title="OK" 
                  onPress={() => handleButtonPress()} 
                  style={{ width: '100%' }}
                />
              )}
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  backdropTouch: {
    flex: 1,
  },
  container: {
    width: '100%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: {
        elevation: 20,
      },
    }),
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
  },
  content: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  footer: {
    width: '100%',
  },
  button: {
    width: '100%',
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 16,
  },
  buttonMargin: {
    marginTop: 10,
  },
  buttonText: {
    fontSize: 16,
  },
});
