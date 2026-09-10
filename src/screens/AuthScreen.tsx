import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { GoogleSignInButton } from '../components/GoogleSignInButton';
import { BottomNavBar } from '../components/BottomNavBar';
import { HomeScreen } from './HomeScreen';
import { HistoryScreen } from './HistoryScreen';
import { ProfileScreen } from './ProfileScreen';
import { TabType } from '../types/navigation';
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
import {
  syncMobileGoogleWithBackend,
  getSavedBackendUser,
  getSavedBackendToken,
  clearBackendSession,
} from '../services/backendAuthService';
import { GOOGLE_AUTH_CONFIG, isPlatformConfigured } from '../config/authConfig';

export const AuthScreen: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('home');
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
          const backendUser = await getSavedBackendUser();
          const backendToken = await getSavedBackendToken();
          setUser({
            ...savedUser,
            backendUser: backendUser || undefined,
            backendToken: backendToken || undefined,
            backendSyncStatus: backendToken ? 'synced' : 'pending',
          });
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

      // 1. Native Google Play Services (SHA-1 verified)
      const profile = await performNativeGoogleSignIn();
      profile.backendSyncStatus = profile.idToken ? 'pending' : 'failed';
      await saveUserSession(profile);
      setUser(profile);
      setIsAuthenticating(false);

      // 2. Synchronize idToken with production Next.js backend (earnbyapps.com)
      if (profile.idToken) {
        syncMobileGoogleWithBackend(profile.idToken, profile).then(async (backendRes) => {
          if (backendRes.success && backendRes.user) {
            const enrichedProfile: UserProfile = {
              ...profile,
              backendUser: backendRes.user,
              backendToken: backendRes.token,
              backendSyncStatus: 'synced',
            };
            await saveUserSession(enrichedProfile);
            setUser(enrichedProfile);
          } else {
            const fallbackProfile: UserProfile = {
              ...profile,
              backendSyncStatus: 'failed',
              backendSyncError: backendRes.error || 'Could not sync with earnbyapps.com',
            };
            await saveUserSession(fallbackProfile);
            setUser(fallbackProfile);
          }
        });
      }
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
      await clearBackendSession();
    } catch (e) {
      console.log('Signout error:', e);
    }
    await clearUserSession();
    setUser(null);
    setActiveTab('home');
  };

  const handleSkipLogin = async () => {
    const demoUser = getDemoUserProfile();
    await saveUserSession(demoUser);
    setUser(demoUser);
    setActiveTab('home');
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

  // If user is authenticated, render the main app experience with bottom navigation
  if (user) {
    return (
      <SafeAreaView style={styles.mainContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.screenContainer}>
          {activeTab === 'home' && (
            <HomeScreen
              user={user}
              onNavigateToTab={(tab) => setActiveTab(tab)}
            />
          )}
          {activeTab === 'history' && (
            <HistoryScreen
              user={user}
              onNavigateToHome={() => setActiveTab('home')}
            />
          )}
          {activeTab === 'profile' && (
            <ProfileScreen
              user={user}
              onSignOut={handleSignOut}
            />
          )}
        </View>
        <BottomNavBar currentTab={activeTab} onSelectTab={setActiveTab} />
      </SafeAreaView>
    );
  }

  // Not logged in: Show Google sign-in gateway
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <View style={styles.content}>
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

          {/* Skip Login / Preview Mode Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.skipButton}
            onPress={handleSkipLogin}
          >
            <Text style={styles.skipButtonText}>
              Skip Login (Explore App Preview) →
            </Text>
          </TouchableOpacity>

          {/* Platform info */}
          <View style={styles.infoBadge}>
            <Text style={styles.infoBadgeText}>
              {Platform.OS === 'android'
                ? 'Native Google Play Services (SHA-1 verified)'
                : 'Web Preview Mode'}
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  mainContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  screenContainer: {
    flex: 1,
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
    marginBottom: 12,
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '700',
    textDecorationLine: 'underline',
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
