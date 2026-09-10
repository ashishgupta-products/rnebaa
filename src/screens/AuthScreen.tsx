import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { GoogleSignInButton } from '../components/GoogleSignInButton';
import { UserProfileCard } from '../components/UserProfileCard';
import { UserProfile } from '../types/auth';
import {
  saveUserSession,
  getUserSession,
  clearUserSession,
  getDemoUserProfile,
} from '../services/authService';
import {
  performNativeGoogleSignIn,
  performNativeGoogleSignOut,
} from '../services/nativeAuthService';
import { GOOGLE_AUTH_CONFIG, isPlatformConfigured } from '../config/authConfig';

export const AuthScreen: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isConfigured = isPlatformConfigured();

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

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setIsAuthenticating(true);

    try {
      if (Platform.OS === 'web') {
        // Web preview mode
        setTimeout(async () => {
          const demoUser = getDemoUserProfile();
          await saveUserSession(demoUser);
          setUser(demoUser);
          setIsAuthenticating(false);
        }, 500);
        return;
      }

      // Native Google Play Services (SHA-1 verified)
      const profile = await performNativeGoogleSignIn();
      await saveUserSession(profile);
      setUser(profile);
      setIsAuthenticating(false);
    } catch (err: any) {
      console.log('Sign in error:', err);
      // In Expo Go, native Google Play Services module isn't present
      if (err.message?.includes('RNGoogleSignin') || err.message?.includes('null')) {
        // Expo Go fallback to demo mode
        const demoUser = getDemoUserProfile();
        await saveUserSession(demoUser);
        setUser(demoUser);
      } else {
        setErrorMessage(err.message || 'Google Sign-In failed.');
      }
      setIsAuthenticating(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await performNativeGoogleSignOut();
    } catch (e) {
      console.log('Signout error:', e);
    }
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <View style={[styles.content, user && styles.contentLoggedIn]}>
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
              />
            </View>

            {/* Platform info */}
            <View style={styles.infoBadge}>
              <Text style={styles.infoBadgeText}>
                {Platform.OS === 'android'
                  ? 'Native Google Play Services (SHA-1 verified)'
                  : 'Web Preview Mode'}
              </Text>
            </View>
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
  contentLoggedIn: {
    justifyContent: 'flex-start',
    paddingHorizontal: 12,
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
  infoBadge: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  infoBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
});
