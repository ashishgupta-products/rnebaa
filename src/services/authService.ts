import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile } from '../types/auth';

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
    id: '109849204918239019284',
    name: 'Ashish Gupta',
    email: 'aashish.gupta.mails@gmail.com',
    picture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
    verifiedEmail: true,
    idToken: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjFkZjg1YjI4Y2FlYWRlNzQ4In0.demo_google_id_token_sample',
    backendSyncStatus: 'synced',
    backendUser: {
      id: '1',
      email: 'aashish.gupta.mails@gmail.com',
      name: 'Ashish Gupta',
      role: 'admin',
      balance: 150.00,
      originAppId: 'mobile',
    },
    backendToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.demo_session_jwt_token',
  };
}
