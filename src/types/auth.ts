export interface BackendUser {
  id: string;
  email: string;
  name: string;
  role: string;
  balance: number;
  picture?: string;
  originAppId?: string;
  phone?: string;
  upiId?: string;
  gender?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  picture?: string;
  verifiedEmail?: boolean;
  idToken?: string;
  upiId?: string;
  phoneNumber?: string;
  gender?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankIfscCode?: string;
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
