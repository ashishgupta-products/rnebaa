/**
 * Google OAuth Configuration for EarnByApps
 * 
 * To set up Google Sign-In with your own credentials:
 * 1. Visit Google Cloud Console: https://console.cloud.google.com/
 * 2. Create an OAuth 2.0 Client ID for Web, iOS, or Android
 * 3. Add your client IDs to a .env file:
 *    EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID="your-web-client-id.apps.googleusercontent.com"
 *    EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID="your-ios-client-id.apps.googleusercontent.com"
 *    EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID="your-android-client-id.apps.googleusercontent.com"
 */

import { Platform } from 'react-native';

// Fallback dummy client ID to prevent expo-auth-session from throwing invariantClientId
// during local development before .env credentials are added.
export const DEMO_CLIENT_ID = 'demo-client-id.apps.googleusercontent.com';

export const GOOGLE_AUTH_CONFIG = {
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '',
  
  // Scopes requested from Google
  scopes: ['profile', 'email'],
};

/**
 * Checks if credentials exist specifically for the currently active platform
 */
export const isPlatformConfigured = (): boolean => {
  if (Platform.OS === 'android') {
    return Boolean(GOOGLE_AUTH_CONFIG.androidClientId);
  }
  if (Platform.OS === 'ios') {
    return Boolean(GOOGLE_AUTH_CONFIG.iosClientId);
  }
  if (Platform.OS === 'web') {
    return Boolean(GOOGLE_AUTH_CONFIG.webClientId);
  }
  return false;
};

/**
 * Checks if user has configured real Google OAuth credentials on any platform
 */
export const isGoogleConfigured = (): boolean => {
  return Boolean(
    GOOGLE_AUTH_CONFIG.webClientId ||
    GOOGLE_AUTH_CONFIG.iosClientId ||
    GOOGLE_AUTH_CONFIG.androidClientId
  );
};
