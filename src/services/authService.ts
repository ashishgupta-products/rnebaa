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
export async function fetchGoogleUserInfo(accessToken: string): Promise<UserProfile> {
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
  };
}

/**
 * Demo user profile for instant testing in environments without Google credentials configured
 */
export function getDemoUserProfile(): UserProfile {
  return {
    id: 'demo-google-user-123',
    name: 'Alex Johnson',
    email: 'alex.johnson@gmail.com',
    picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    verifiedEmail: true,
  };
}
