import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

interface BrandLogoProps {
  fontSize?: number;
  style?: ViewStyle;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ fontSize = 26, style }) => {
  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.textBlue, { fontSize }]}>EarnBy</Text>
      <Text style={[styles.textAmber, { fontSize }]}>Apps</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlue: {
    fontWeight: '900',
    color: '#3A5998',
    letterSpacing: -0.5,
  },
  textAmber: {
    fontWeight: '900',
    color: '#EAA812',
    letterSpacing: -0.5,
  },
});
