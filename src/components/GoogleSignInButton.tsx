import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  Platform,
} from 'react-native';
import { GoogleIcon } from './GoogleIcon';

interface GoogleSignInButtonProps {
  onPress: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  title?: string;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onPress,
  isLoading = false,
  disabled = false,
  title = 'Continue with Google',
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[
        styles.button,
        disabled && styles.buttonDisabled,
      ]}
      onPress={onPress}
      disabled={disabled || isLoading}
    >
      <View style={styles.contentContainer}>
        {isLoading ? (
          <ActivityIndicator size="small" color="#4285F4" style={styles.spinner} />
        ) : (
          <View style={styles.iconWrapper}>
            <GoogleIcon size={20} />
          </View>
        )}
        <Text style={[styles.text, disabled && styles.textDisabled]}>
          {isLoading ? 'Signing in...' : title}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#DADCE0',
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    width: '100%',
    maxWidth: 320,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      },
    }),
  },
  buttonDisabled: {
    opacity: 0.6,
    borderColor: '#E0E0E0',
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinner: {
    marginRight: 12,
  },
  text: {
    color: '#3C4043',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  textDisabled: {
    color: '#80868B',
  },
});
