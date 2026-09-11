import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, StyleProp, ViewStyle, Platform } from 'react-native';

interface CampaignLogoProps {
  name: string;
  logoUrl?: string;
  size?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export const CampaignLogo: React.FC<CampaignLogoProps> = ({
  name,
  logoUrl,
  size = 46,
  borderRadius = 14,
  style,
}) => {
  const [imageError, setImageError] = useState(false);
  const initialLetter = (name || 'C').trim().charAt(0).toUpperCase();

  const isValidUrl =
    !imageError &&
    Boolean(logoUrl) &&
    (logoUrl!.startsWith('http://') || logoUrl!.startsWith('https://'));

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius,
        },
        style,
      ]}
    >
      {isValidUrl ? (
        Platform.OS === 'web' ? (
          // Web-optimized rendering with no-referrer (prevents ImgBB hotlink 403 on localhost/web)
          // and explicit numeric pixel sizing (prevents 0x0 flex collapse in react-native-web)
          <img
            src={logoUrl}
            alt={name}
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
            style={{
              width: size,
              height: size,
              borderRadius,
              objectFit: 'cover',
              display: 'block',
            }}
            onError={() => setImageError(true)}
          />
        ) : (
          <Image
            source={{ uri: logoUrl }}
            style={{
              width: size,
              height: size,
              borderRadius,
            }}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        )
      ) : (
        <Text style={[styles.letter, { fontSize: Math.round(size * 0.45) }]}>
          {initialLetter}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    overflow: 'hidden',
  },
  letter: {
    fontWeight: '800',
    color: '#2563EB',
  },
});
