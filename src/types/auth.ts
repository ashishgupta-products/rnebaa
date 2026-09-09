export interface UserProfile {
  id: string;
  name: string;
  email: string;
  picture?: string;
  verifiedEmail?: boolean;
}

export interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  error: string | null;
}
