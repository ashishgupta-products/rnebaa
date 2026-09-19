import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile } from '../types/auth';
import { API_CONFIG } from '../config/authConfig';
import { getSavedBackendToken } from './backendAuthService';

const USER_STORAGE_KEY = '@earnbyapps_user_session';

/**
 * Persist user profile to local storage
 */
export async function saveUserSession(user: UserProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('Failed to save user session:', error);
  }
}

/**
 * Retrieve persisted user profile from local storage
 */
export async function getUserSession(): Promise<UserProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserProfile;
  } catch (error) {
    console.error('Failed to load user session:', error);
    return null;
  }
}

/**
 * Clear persisted user session
 */
export async function clearUserSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(USER_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear user session:', error);
  }
}

/**
 * Fetch Google User Info using OAuth access token
 */
export async function fetchGoogleUserInfo(
  accessToken: string,
  idToken?: string
): Promise<UserProfile> {
  const response = await fetch('https://www.googleapis.com/userinfo/v2/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Google profile: ${response.statusText}`);
  }

  const data = await response.json();

  return {
    id: data.id,
    name: data.name || data.email?.split('@')[0] || 'Google User',
    email: data.email,
    picture: data.picture,
    verifiedEmail: data.verified_email,
    idToken,
  };
}

export function getDemoUserProfile(): UserProfile {
  return {
    id: 'demo-user-id',
    name: 'Demo User',
    email: 'demo.user@earnbyapps.com',
    picture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
    verifiedEmail: true,
    idToken: 'demo_google_id_token',
    upiId: '',
    phoneNumber: '',
    gender: '',
    backendSyncStatus: 'synced',
    backendUser: {
      id: 'demo-user-id',
      email: 'demo.user@earnbyapps.com',
      name: 'Demo User',
      role: 'user',
      balance: 0.00,
      originAppId: 'mobile',
    },
    backendToken: '',
  };
}

/**
 * Updates user profile details in persistent storage
 */
export async function updateUserProfileDetails(
  updates: Partial<UserProfile>,
  fallbackUser?: UserProfile
): Promise<UserProfile | null> {
  try {
    const session = await getUserSession();
    const current = session || fallbackUser;
    if (!current) return null;

    const updated: UserProfile = {
      ...current,
      ...updates,
      upiId: updates.upiId !== undefined ? updates.upiId : current.upiId,
      phoneNumber: updates.phoneNumber !== undefined ? updates.phoneNumber : current.phoneNumber,
      gender: updates.gender !== undefined ? updates.gender : current.gender,
      backendUser: current.backendUser
        ? {
            ...current.backendUser,
            ...(updates.name ? { name: updates.name } : {}),
            ...(updates.email ? { email: updates.email } : {}),
            ...(updates.upiId ? { upiId: updates.upiId } : {}),
            ...(updates.phoneNumber ? { phone: updates.phoneNumber } : {}),
            ...(updates.gender ? { gender: updates.gender } : {}),
          }
        : undefined,
    };
    await saveUserSession(updated);

    // Sync profile and payment details with the backend database
    try {
      const token = (await getSavedBackendToken()) || current.backendToken;
      const email = (updates.email || current.email || '').toLowerCase().trim();
      if (email) {
        const paymentDetails = updates.upiId || current.upiId || 'N/A';
        const paymentMethod = 'UPI';

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        fetch(`${API_CONFIG.baseUrl}/api/users`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            email,
            fullName: updates.name || current.name,
            phone: updates.phoneNumber || current.phoneNumber,
            gender: updates.gender || current.gender,
            paymentMethod,
            paymentDetails,
          }),
        }).catch((e) => console.warn('Could not sync user profile to backend:', e));
      }
    } catch (e) {
      // Non-blocking background sync
    }

    return updated;
  } catch (error) {
    console.error('Failed to update user profile details:', error);
    return null;
  }
}

