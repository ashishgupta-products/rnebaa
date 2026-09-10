import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config/authConfig';
import { UserProfile, BackendUser } from '../types/auth';

const STORAGE_KEYS = {
  BACKEND_TOKEN: '@earnbyapps_backend_token',
  BACKEND_USER: '@earnbyapps_backend_user',
};

export interface BackendAuthResponse {
  success: boolean;
  token?: string;
  user?: BackendUser;
  error?: string;
  details?: string;
}

/**
 * Exchange Google ID Token with the production EarnByApps Next.js backend (earnbyapps.com)
 * to verify the user and issue a server-side session token.
 */
export async function syncMobileGoogleWithBackend(
  idToken: string,
  localProfile: UserProfile
): Promise<BackendAuthResponse> {
  const url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.mobileGoogleAuth}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        idToken,
        user: {
          name: localProfile.name,
          email: localProfile.email,
          picture: localProfile.picture,
        },
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.success) {
      const errMsg = data.error || `Backend responded with HTTP ${response.status}`;
      return {
        success: false,
        error: errMsg,
        details: data.details,
      };
    }

    // Persist backend session securely
    if (data.token) {
      await AsyncStorage.setItem(STORAGE_KEYS.BACKEND_TOKEN, data.token);
    }
    if (data.user) {
      await AsyncStorage.setItem(
        STORAGE_KEYS.BACKEND_USER,
        JSON.stringify(data.user)
      );
    }

    return {
      success: true,
      token: data.token,
      user: data.user,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Network error connecting to earnbyapps.com',
    };
  }
}

/**
 * Retrieve saved backend session token
 */
export async function getSavedBackendToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.BACKEND_TOKEN);
  } catch {
    return null;
  }
}

/**
 * Retrieve saved backend user data
 */
export async function getSavedBackendUser(): Promise<BackendUser | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.BACKEND_USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Clear backend session on logout
 */
export async function clearBackendSession(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.BACKEND_TOKEN,
      STORAGE_KEYS.BACKEND_USER,
    ]);
  } catch (err) {
    console.warn('Error clearing backend session:', err);
  }
}
