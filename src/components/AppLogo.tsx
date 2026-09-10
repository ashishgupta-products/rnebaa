import React from 'react';
import { View, StyleSheet, Platform, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RupeeIcon } from './RupeeIcon';

interface AppLogoProps {
  size?: number;
  iconColor?: string;
  backgroundColor?: string;
  showSparkle?: boolean;
  style?: ViewStyle;
}

/**
 * Official App Logo for EarnByApps featuring the Indian Rupee symbol (₹).
 * Designed with a modern squircle container, glossy elevation, and optional sparkle badge.
 */
export const AppLogo: React.FC<AppLogoProps> = ({
  size = 40,
  iconColor = '#FFFFFF',
  backgroundColor = '#0F172A',
  showSparkle = false,
  style,
}) => {
  const borderRadius = Math.round(size * 0.32);
  const iconSize = Math.round(size * 0.54);
  const sparkleSize = Math.max(18, Math.round(size * 0.35));

  return (
    <View style={[styles.container, style]}>
      <View
        style={[
          styles.badge,
          {
            width: size,
            height: size,
            borderRadius,
            backgroundColor,
          },
        ]}
      >
        <RupeeIcon size={iconSize} color={iconColor} />
      </View>

      {showSparkle ? (
        <View
          style={[
            styles.sparkleBadge,
            {
              width: sparkleSize,
              height: sparkleSize,
              borderRadius: sparkleSize / 2,
              top: -Math.round(size * 0.06),
              right: -Math.round(size * 0.06),
            },
          ]}
        >
          <Ionicons
            name="sparkles"
            size={Math.round(sparkleSize * 0.55)}
            color="#D97706"
          />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  badge: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 6px 16px rgba(15, 23, 42, 0.16)',
      },
    }),
  },
  sparkleBadge: {
    position: 'absolute',
    backgroundColor: '#FEF3C7',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
      },
    }),
  },
});
