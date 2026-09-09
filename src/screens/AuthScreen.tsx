import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  Platform,
  TouchableOpacity,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { GoogleSignInButton } from '../components/GoogleSignInButton';
import { UserProfileCard } from '../components/UserProfileCard';
import { UserProfile } from '../types/auth';
import {
  saveUserSession,
  getUserSession,
  clearUserSession,
  fetchGoogleUserInfo,
  getDemoUserProfile,
} from '../services/authService';
import {
  GOOGLE_AUTH_CONFIG,
  DEMO_CLIENT_ID,
  isPlatformConfigured,
  isGoogleConfigured,
} from '../config/authConfig';

// Complete auth session if redirected back to web/app
WebBrowser.maybeCompleteAuthSession();

export const AuthScreen: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isConfigured = isPlatformConfigured();

  // Initialize Google Auth Request with safe fallbacks so expo-auth-session does not crash
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_AUTH_CONFIG.webClientId || DEMO_CLIENT_ID,
    iosClientId: GOOGLE_AUTH_CONFIG.iosClientId || DEMO_CLIENT_ID,
    androidClientId: GOOGLE_AUTH_CONFIG.androidClientId || DEMO_CLIENT_ID,
    scopes: GOOGLE_AUTH_CONFIG.scopes,
  });

  // Load existing session on initial render
  useEffect(() => {
    async function loadSavedSession() {
      try {
        const savedUser = await getUserSession();
        if (savedUser) {
          setUser(savedUser);
        }
      } catch (err) {
        console.warn('Error restoring session:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSavedSession();
  }, []);

  // Handle Google Auth Response
  useEffect(() => {
    async function handleAuthResponse() {
      if (!response) return;

      if (response.type === 'success') {
        const { authentication } = response;
        if (authentication?.accessToken) {
          try {
            setIsAuthenticating(true);
            setErrorMessage(null);
            const profile = await fetchGoogleUserInfo(authentication.accessToken);
            await saveUserSession(profile);
            setUser(profile);
          } catch (err: any) {
            console.error('Error fetching user info:', err);
            setErrorMessage(err.message || 'Failed to fetch Google profile');
          } finally {
            setIsAuthenticating(false);
          }
        }
      } else if (response.type === 'error') {
        setIsAuthenticating(false);
        setErrorMessage(response.error?.message || 'Google Sign-In failed.');
      } else if (response.type === 'cancel' || response.type === 'dismiss') {
        setIsAuthenticating(false);
      }
    }

    handleAuthResponse();
  }, [response]);

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);

    // If client IDs are configured for this platform, trigger the actual Google OAuth flow
    if (isConfigured) {
      try {
        setIsAuthenticating(true);
        const result = await promptAsync();
        if (result.type !== 'success') {
          setIsAuthenticating(false);
        }
      } catch (err: any) {
        setIsAuthenticating(false);
        setErrorMessage(err.message || 'Could not initiate Google Sign-In.');
      }
    } else {
      // Demo preview mode when credentials are not yet configured for this platform
      setIsAuthenticating(true);
      setTimeout(async () => {
        const demoUser = getDemoUserProfile();
        await saveUserSession(demoUser);
        setUser(demoUser);
        setIsAuthenticating(false);
      }, 700);
    }
  };

  const handleSignOut = async () => {
    await clearUserSession();
    setUser(null);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading EarnByApps...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const noticeMessage =
    Platform.OS === 'web' && GOOGLE_AUTH_CONFIG.androidClientId
      ? 'Android Client ID configured. Web is in demo mode (add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to test in browser).'
      : 'Add your Google Client ID to .env to connect your Google Cloud project.';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <View style={styles.content}>
        {user ? (
          <UserProfileCard user={user} onSignOut={handleSignOut} />
        ) : (
          <View style={styles.signInCard}>
            {/* App Branding */}
            <View style={styles.logoBadge}>
              <Text style={styles.logoBadgeText}>E</Text>
            </View>

            <Text style={styles.title}>EarnByApps</Text>
            <Text style={styles.subtitle}>Sign in to continue</Text>

            {/* Error Display */}
            {errorMessage ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Continue with Google Button */}
            <View style={styles.buttonWrapper}>
              <GoogleSignInButton
                onPress={handleGoogleSignIn}
                isLoading={isAuthenticating}
                disabled={!request && isConfigured}
              />
            </View>

            {/* Configuration Hint Banner */}
            {!isConfigured && (
              <View style={styles.demoNotice}>
                <Text style={styles.demoNoticeTitle}>Demo Mode Active</Text>
                <Text style={styles.demoNoticeText}>{noticeMessage}</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#64748B',
    fontSize: 16,
  },
  signInCard: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  logoBadgeText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 36,
  },
  buttonWrapper: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 20,
    width: '100%',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    textAlign: 'center',
  },
  demoNotice: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    alignItems: 'center',
    width: '100%',
  },
  demoNoticeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
    marginBottom: 2,
  },
  demoNoticeText: {
    fontSize: 11,
    color: '#3B82F6',
    textAlign: 'center',
    lineHeight: 16,
  },
});
