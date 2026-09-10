export interface BackendUser {
  id: string;
  email: string;
  name: string;
  role: string;
  balance: number;
  picture?: string;
  originAppId?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  picture?: string;
  verifiedEmail?: boolean;
  idToken?: string;
  backendUser?: BackendUser;
  backendToken?: string;
  backendSyncStatus?: 'synced' | 'pending' | 'failed';
  backendSyncError?: string;
}

export interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  error: string | null;
}
