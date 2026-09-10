import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  TouchableOpacity,
  ScrollView,
  BackHandler,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppLogo } from '../components/AppLogo';
import { GoogleSignInButton } from '../components/GoogleSignInButton';
import { BottomNavBar } from '../components/BottomNavBar';
import { HomeScreen } from './HomeScreen';
import { HistoryScreen } from './HistoryScreen';
import { ProfileScreen } from './ProfileScreen';
import { TaskDetailsScreen } from './TaskDetailsScreen';
import { TabType } from '../types/navigation';
import { UserProfile } from '../types/auth';
import { Campaign, TaskHistoryItem } from '../types/campaign';
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
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [userSubmissions, setUserSubmissions] = useState<TaskHistoryItem[]>([]);
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

  // Global Android hardware back button and swipe gesture interceptor
  useEffect(() => {
    const onBackPress = () => {
      if (selectedCampaign) {
        setSelectedCampaign(null);
        return true; // Stay inside app, navigate back to Home
      }
      if (activeTab !== 'home') {
        setActiveTab('home');
        return true; // Stay inside app, navigate back to Home tab
      }
      return false; // On root home tab, default back exits/minimizes app
    };

    const backSubscription = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress
    );

    return () => backSubscription.remove();
  }, [selectedCampaign, activeTab]);

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
    if (selectedCampaign) {
      return (
        <SafeAreaView style={styles.mainContainer}>
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
          <TaskDetailsScreen
            campaign={selectedCampaign}
            userBalance={user.backendUser?.balance || 0}
            userName={user.name}
            userEmail={user.email}
            isAlreadySubmitted={userSubmissions.some((s) => s.appName === selectedCampaign.name)}
            onBack={() => setSelectedCampaign(null)}
            onSubmitProof={(submission) => {
              setUserSubmissions((prev) => [submission, ...prev]);
            }}
          />
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={styles.mainContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.screenContainer}>
          {activeTab === 'home' && (
            <HomeScreen
              user={user}
              onNavigateToTab={(tab) => {
                setSelectedCampaign(null);
                setActiveTab(tab);
              }}
              onSelectCampaign={(campaign) => setSelectedCampaign(campaign)}
            />
          )}
          {activeTab === 'history' && (
            <HistoryScreen
              user={user}
              submissions={userSubmissions}
              onNavigateToHome={() => {
                setSelectedCampaign(null);
                setActiveTab('home');
              }}
            />
          )}
          {activeTab === 'profile' && (
            <ProfileScreen
              user={user}
              onSignOut={handleSignOut}
            />
          )}
        </View>
        <BottomNavBar
          currentTab={activeTab}
          onSelectTab={(tab) => {
            setSelectedCampaign(null);
            setActiveTab(tab);
          }}
        />
      </SafeAreaView>
    );
  }

  // Not logged in: Show Google sign-in gateway
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.signInCard}>
          {/* Trust / Category Pill */}
          <View style={styles.trustBadge}>
            <Text style={styles.trustBadgeFlag}>🇮🇳</Text>
            <Text style={styles.trustBadgeText}>#1 Trusted Earning Platform</Text>
          </View>

          {/* App Branding Logo featuring Indian Rupee symbol */}
          <AppLogo size={70} showSparkle style={{ marginBottom: 14 }} />

          <Text style={styles.title}>EarnByApps</Text>
          <Text style={styles.subtitle}>India's Largest Earning App</Text>
          <Text style={styles.heroSubText}>
            Test apps, complete easy tasks & earn real cash directly via UPI or bank transfer.
          </Text>

          {/* Trust Value Highlights Card */}
          <View style={styles.featuresCard}>
            <View style={styles.featureRow}>
              <View style={[styles.featureIconWrap, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="flash" size={16} color="#2563EB" />
              </View>
              <View style={styles.featureTextWrap}>
                <Text style={styles.featureHeading}>Instant UPI & Bank Payouts</Text>
                <Text style={styles.featureSub}>Direct withdrawal to your account</Text>
              </View>
            </View>

            <View style={styles.featureDivider} />

            <View style={styles.featureRow}>
              <View style={[styles.featureIconWrap, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="shield-checkmark" size={16} color="#059669" />
              </View>
              <View style={styles.featureTextWrap}>
                <Text style={styles.featureHeading}>100% Verified Offers</Text>
                <Text style={styles.featureSub}>Safe, tested apps with guaranteed rewards</Text>
              </View>
            </View>

            <View style={styles.featureDivider} />

            <View style={styles.featureRow}>
              <View style={[styles.featureIconWrap, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="gift" size={16} color="#D97706" />
              </View>
              <View style={styles.featureTextWrap}>
                <Text style={styles.featureHeading}>Up to ₹1000 payout offers per task</Text>
                <Text style={styles.featureSub}>Highest reward rates in India</Text>
              </View>
            </View>
          </View>

          {/* Error Display */}
          {errorMessage ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color="#DC2626" style={{ marginRight: 6 }} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Action Card: Google Sign In + Security + Skip */}
          <View style={styles.actionCard}>
            <View style={styles.buttonWrapper}>
              <GoogleSignInButton
                onPress={handleGoogleSignIn}
                isLoading={isAuthenticating}
              />
            </View>

            <View style={styles.securityRow}>
              <Ionicons name="shield-checkmark" size={13} color="#059669" />
              <Text style={styles.securityText}>Official Google OAuth • 100% Safe</Text>
            </View>

            {/* Skip Login / Preview Mode Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.skipButton}
              onPress={handleSkipLogin}
            >
              <Text style={styles.skipButtonText}>
                Explore App Preview
              </Text>
              <Ionicons name="arrow-forward" size={14} color="#2563EB" />
            </TouchableOpacity>
          </View>

          {/* Platform environment pill */}
          <View style={styles.infoBadge}>
            <Ionicons
              name={Platform.OS === 'android' ? 'logo-android' : 'globe-outline'}
              size={13}
              color="#64748B"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.infoBadgeText}>
              {Platform.OS === 'android'
                ? 'Native Google Play Services (SHA-1 verified)'
                : 'Web Preview Mode'}
            </Text>
          </View>

          {/* Terms Footer */}
          <Text style={styles.termsText}>
            By continuing, you agree to our Terms of Service & Privacy Policy
          </Text>
        </View>
      </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
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
    maxWidth: 390,
    alignItems: 'center',
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginBottom: 16,
  },
  trustBadgeFlag: {
    fontSize: 12,
    marginRight: 6,
  },
  trustBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563EB',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  heroSubText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  featuresCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
      },
    }),
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  featureIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureTextWrap: {
    flex: 1,
  },
  featureHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  featureSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  featureDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 6,
  },
  actionCard: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 8,
  },
  buttonWrapper: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  securityText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 14,
    width: '100%',
    marginBottom: 12,
  },
  skipButtonText: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '700',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 16,
    width: '100%',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  infoBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  termsText: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 20,
  },
});
