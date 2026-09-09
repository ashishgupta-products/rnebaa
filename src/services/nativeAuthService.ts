import { Platform } from 'react-native';
import {
  GoogleSignin,
  isSuccessResponse,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { GOOGLE_AUTH_CONFIG } from '../config/authConfig';
import { UserProfile } from '../types/auth';

let configured = false;

/**
 * Initialize Google Play Services native configuration
 */
export function initNativeGoogle() {
  if (Platform.OS === 'web' || configured) return;
  try {
    GoogleSignin.configure({
      webClientId: GOOGLE_AUTH_CONFIG.webClientId || undefined,
      offlineAccess: true,
    });
    configured = true;
  } catch (err) {
    console.log('GoogleSignin configuration error (expected in Expo Go/Web):', err);
  }
}

/**
 * Perform Native Android / iOS Google Sign In via Google Play Services (SHA-1 verified)
 */
export async function performNativeGoogleSignIn(): Promise<UserProfile> {
  if (Platform.OS === 'web') {
    throw new Error('Native SHA Google Sign-In is only available on Android / iOS devices.');
  }

  initNativeGoogle();

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();

    if (isSuccessResponse(response)) {
      const { data } = response;
      return {
        id: data.user.id,
        name: data.user.name || 'Google User',
        email: data.user.email,
        picture: data.user.photo || undefined,
        verifiedEmail: true,
        idToken: data.idToken || undefined,
      };
    }

    throw new Error('Google Sign-In was cancelled.');
  } catch (error: any) {
    if (isErrorWithCode(error)) {
      switch (error.code) {
        case statusCodes.SIGN_IN_CANCELLED:
          throw new Error('Sign in was cancelled.');
        case statusCodes.IN_PROGRESS:
          throw new Error('Sign in is already in progress.');
        case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
          throw new Error('Google Play Services not available or outdated.');
        default:
          throw new Error(error.message || `Google Sign-In error: ${error.code}`);
      }
    }
    throw error;
  }
}

/**
 * Sign out from Google Play Services
 */
export async function performNativeGoogleSignOut(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await GoogleSignin.signOut();
  } catch (err) {
    console.log('Native signOut error:', err);
  }
}
