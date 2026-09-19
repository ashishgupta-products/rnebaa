import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Image,
  StyleSheet,
  StyleProp,
  ViewStyle,
  Platform,
} from 'react-native';

const DEFAULT_APP_LOGO = require('../../assets/icon.png');

interface CampaignLogoProps {
  name: string;
  logoUrl?: string;
  size?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * CampaignLogo displays the task's brand/app image on the card.
 * Shows the official EarnByApps logo instantly as a placeholder until the actual
 * task image has downloaded, then smoothly renders the actual image.
 */
export const CampaignLogo: React.FC<CampaignLogoProps> = ({
  name,
  logoUrl,
  size = 46,
  borderRadius = 14,
  style,
}) => {
  const [imageError, setImageError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<any>(null);

  // Reset loading and error state when logoUrl changes
  useEffect(() => {
    setImageError(false);
    setIsLoaded(false);

    // On web, if the image is already cached by the browser, it may already be complete
    if (Platform.OS === 'web' && imgRef.current) {
      if (imgRef.current.complete && imgRef.current.naturalWidth > 0) {
        setIsLoaded(true);
      }
    }
  }, [logoUrl]);

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
      {/* 1. Logo placeholder: shown until actual image appears, or if image fails */}
      {(!isValidUrl || !isLoaded) && (
        <Image
          source={DEFAULT_APP_LOGO}
          style={{
            width: size,
            height: size,
            borderRadius,
          }}
          resizeMode="cover"
        />
      )}

      {/* 2. Actual image: rendered on top, appears immediately once loaded */}
      {isValidUrl &&
        (Platform.OS === 'web' ? (
          <img
            ref={imgRef}
            src={logoUrl}
            alt={name}
            referrerPolicy="no-referrer"
            style={{
              position: isLoaded ? 'relative' : 'absolute',
              top: 0,
              left: 0,
              width: size,
              height: size,
              borderRadius,
              objectFit: 'cover',
              border: 'none',
              outline: 'none',
              display: isLoaded ? 'block' : 'block',
              visibility: imageError ? 'hidden' : 'visible',
            }}
            onLoad={() => setIsLoaded(true)}
            onError={() => {
              setImageError(true);
              setIsLoaded(false);
            }}
          />
        ) : (
          <Image
            source={{ uri: logoUrl }}
            style={{
              position: isLoaded ? 'relative' : 'absolute',
              top: 0,
              left: 0,
              width: size,
              height: size,
              borderRadius,
            }}
            resizeMode="cover"
            onLoad={() => setIsLoaded(true)}
            onError={() => {
              setImageError(true);
              setIsLoaded(false);
            }}
          />
        ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 0,
  },
});
