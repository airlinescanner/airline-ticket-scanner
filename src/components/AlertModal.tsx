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
  const { tokens, theme } = useTheme();
  const [scaleAnim] = React.useState(new Animated.Value(0.9));
  const [opacityAnim] = React.useState(new Animated.Value(0));

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.9);
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
    onClose();
    if (onPress) {
      setTimeout(onPress, 300); // Даем время модалке закрыться
    }
  };

  return (
    <Modal transparent visible={visible} animationType="none">
      <View style={styles.overlay}>
        <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
          <TouchableOpacity 
            style={styles.backdropTouch} 
            activeOpacity={1} 
            onPress={onClose} 
          />
        </Animated.View>

        <Animated.View 
          style={[
            styles.container, 
            { 
              transform: [{ scale: scaleAnim }], 
              opacity: opacityAnim,
              backgroundColor: theme === 'dark' ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
              borderColor: tokens.colors.border,
            }
          ]}
        >
          {Platform.OS === 'ios' && (
            <BlurView intensity={theme === 'dark' ? 40 : 60} style={StyleSheet.absoluteFill} tint={theme} />
          )}

          <View style={styles.content}>
            <View style={[styles.iconContainer, { backgroundColor: icon.color + '15' }]}>
              <Ionicons name={icon.name as any} size={40} color={icon.color} />
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
                        isCancel && styles.cancelButton,
                        { borderColor: isCancel ? tokens.colors.border : 'transparent' }
                      ]}
                      onPress={() => handleButtonPress(btn.onPress)}
                    >
                      <Text 
                        style={[
                          styles.buttonText, 
                          { 
                            color: isDestructive ? '#FF3B30' : isCancel ? tokens.colors.text.secondary : tokens.colors.accent.primary,
                            fontWeight: isCancel ? '500' : '700'
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
                  onPress={onClose} 
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  backdropTouch: {
    flex: 1,
  },
  container: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  footer: {
    width: '100%',
    flexDirection: 'column',
  },
  button: {
    width: '100%',
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 16,
  },
  buttonMargin: {
    marginTop: 8,
  },
  cancelButton: {
    borderWidth: 0,
  },
  buttonText: {
    fontSize: 17,
  },
});
