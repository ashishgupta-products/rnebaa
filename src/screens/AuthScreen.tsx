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
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppLogo } from '../components/AppLogo';
import { BrandLogo } from '../components/BrandLogo';
import { GoogleSignInButton } from '../components/GoogleSignInButton';
import { BottomNavBar } from '../components/BottomNavBar';
import { HomeScreen } from './HomeScreen';
import { InstantScreen } from './InstantScreen';
import { HistoryScreen } from './HistoryScreen';
import { ProfileScreen } from './ProfileScreen';
import { TaskDetailsScreen } from './TaskDetailsScreen';
import { TabType } from '../types/navigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  syncMobileGoogleWithBackend,
  getSavedBackendUser,
  getSavedBackendToken,
  clearBackendSession,
  fetchLatestBackendUser,
} from '../services/backendAuthService';
import { fetchUserSubmissions } from '../services/submissionService';
import { GOOGLE_AUTH_CONFIG, isPlatformConfigured } from '../config/authConfig';

export const AuthScreen: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [userSubmissions, setUserSubmissions] = useState<TaskHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [splashAnim] = useState(() => new Animated.Value(1));

  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'android'
    ? Math.max(insets.top, StatusBar.currentHeight || 0, 42)
    : (insets.top > 0 ? insets.top : 44);

  const isConfigured = isPlatformConfigured();

  // Load existing session and cached submissions concurrently before dismissing splash
  useEffect(() => {
    let isMounted = true;

    async function loadSavedSession() {
      try {
        const [savedUser, backendUser, backendToken] = await Promise.all([
          getUserSession(),
          getSavedBackendUser(),
          getSavedBackendToken(),
        ]);

        let initialSubmissions: TaskHistoryItem[] = [];
        if (savedUser?.email) {
          const emailKey = savedUser.email.toLowerCase().trim();
          const cacheKey = `@user_submissions_${emailKey}`;
          const cached = await AsyncStorage.getItem(cacheKey).catch(() => null);
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              if (Array.isArray(parsed) && parsed.length > 0) {
                // Filter out any stale dummy items (h-1, h-2, h-3)
                initialSubmissions = parsed.filter((p: any) => !p.id?.startsWith('h-'));
              }
            } catch {}
          }
        }

        if (!isMounted) return;

        if (savedUser) {
          setUser({
            ...savedUser,
            backendUser: backendUser || undefined,
            backendToken: backendToken || undefined,
            backendSyncStatus: backendToken ? 'synced' : 'pending',
          });
          setUserSubmissions(initialSubmissions);

          // Concurrently refresh latest live user & balance from PostgreSQL silently
          if (savedUser.email) {
            fetchLatestBackendUser(savedUser.email).then((fresh) => {
              if (isMounted && fresh) {
                setUser((prev) => (prev ? { ...prev, backendUser: fresh } : prev));
              }
            });
            fetchUserSubmissions(savedUser.email).then((live) => {
              if (isMounted && Array.isArray(live) && live.length > 0) {
                setUserSubmissions(live);
                const emailKey = savedUser.email.toLowerCase().trim();
                AsyncStorage.setItem(`@user_submissions_${emailKey}`, JSON.stringify(live)).catch(() => {});
              }
            });
          }
        }
      } catch (err) {
        console.warn('Error restoring session:', err);
      } finally {
        if (isMounted) {
          // Smooth 280ms crossfade to eliminate any harsh layout jump or flicker
          Animated.timing(splashAnim, {
            toValue: 0,
            duration: 280,
            useNativeDriver: true,
          }).start(() => {
            if (isMounted) {
              setIsLoading(false);
            }
          });
        }
      }
    }
    loadSavedSession();

    return () => {
      isMounted = false;
    };
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

  // Synchronize and cache user task submissions to eliminate completed tasks from HomeScreen
  useEffect(() => {
    if (!user?.email || isLoading) return;

    // Refresh live balance from PostgreSQL
    fetchLatestBackendUser(user.email).then((fresh) => {
      if (fresh) {
        setUser((prev) => (prev ? { ...prev, backendUser: fresh } : prev));
      }
    });

    const emailKey = user.email.toLowerCase().trim();
    const cacheKey = `@user_submissions_${emailKey}`;

    // 1. Immediately hydrate from AsyncStorage for 0ms delay
    AsyncStorage.getItem(cacheKey)
      .then((cached) => {
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setUserSubmissions(parsed);
            }
          } catch (e) {}
        }
      })
      .catch(() => {});

    // 2. Fetch fresh live submissions from database
    fetchUserSubmissions(user.email)
      .then((live) => {
        if (Array.isArray(live) && live.length > 0) {
          setUserSubmissions(live);
          AsyncStorage.setItem(cacheKey, JSON.stringify(live)).catch(() => {});
        }
      })
      .catch((e) => {
        console.warn('Error fetching live submissions in AuthScreen:', e);
      });
  }, [user?.email]);

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
    setUserSubmissions([]);
    setActiveTab('home');
  };

  const handleSkipLogin = async () => {
    const demoUser = getDemoUserProfile();
    await saveUserSession(demoUser);
    setUser(demoUser);
    setUserSubmissions([]);
    setActiveTab('home');
  };

  return (
    <View style={styles.rootContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />

      {user ? (
        <View style={[styles.mainContainer, { paddingTop: topInset }]}>
          {/* Main Tab Screens - kept mounted in memory to preserve state, scroll, and prevent reloading */}
          <View style={{ flex: 1, display: selectedCampaign ? 'none' : 'flex' }}>
            <View style={styles.screenContainer}>
              <View style={{ flex: 1, display: activeTab === 'home' ? 'flex' : 'none' }}>
                <HomeScreen
                  user={user}
                  userSubmissions={userSubmissions}
                  onNavigateToTab={(tab) => {
                    setSelectedCampaign(null);
                    setActiveTab(tab);
                  }}
                  onSelectCampaign={(campaign) => setSelectedCampaign(campaign)}
                />
              </View>
              <View style={{ flex: 1, display: activeTab === 'instant' ? 'flex' : 'none' }}>
                <InstantScreen
                  onSelectCampaign={(campaign) => setSelectedCampaign(campaign)}
                />
              </View>
              <View style={{ flex: 1, display: activeTab === 'history' ? 'flex' : 'none' }}>
                <HistoryScreen
                  user={user}
                  submissions={userSubmissions}
                  onNavigateToHome={() => {
                    setSelectedCampaign(null);
                    setActiveTab('home');
                  }}
                  onRefreshUser={(freshBackendUser) => {
                    setUser((prev) => (prev ? { ...prev, backendUser: freshBackendUser } : prev));
                  }}
                />
              </View>
              <View style={{ flex: 1, display: activeTab === 'profile' ? 'flex' : 'none' }}>
                <ProfileScreen
                  user={user}
                  onSignOut={handleSignOut}
                  onUpdateUser={(updated) => setUser(updated)}
                  isActive={activeTab === 'profile'}
                />
              </View>
            </View>
            <BottomNavBar
              currentTab={activeTab}
              onSelectTab={(tab) => {
                setSelectedCampaign(null);
                setActiveTab(tab);
                if (user?.email) {
                  fetchLatestBackendUser(user.email).then((fresh) => {
                    if (fresh) {
                      setUser((prev) => (prev ? { ...prev, backendUser: fresh } : prev));
                    }
                  });
                }
              }}
            />
          </View>

          {/* Task Details view - mounts over tabs so returning is instant with zero reload */}
          {selectedCampaign && (
            <View style={{ flex: 1 }}>
              <TaskDetailsScreen
                campaign={selectedCampaign}
                userBalance={user.backendUser?.balance || 0}
                userName={user.name}
                userEmail={user.email}
                isAlreadySubmitted={userSubmissions.some((s) => s.appName === selectedCampaign.name)}
                onBack={() => setSelectedCampaign(null)}
                onSubmitProof={(submission) => {
                  setUserSubmissions((prev) => {
                    const updated = [submission, ...prev.filter((p) => p.id !== submission.id)];
                    if (user?.email) {
                      const cacheKey = `@user_submissions_${user.email.toLowerCase().trim()}`;
                      AsyncStorage.setItem(cacheKey, JSON.stringify(updated)).catch(() => {});
                    }
                    return updated;
                  });
                }}
              />
            </View>
          )}
        </View>
      ) : (
        <View style={[styles.container, { paddingTop: topInset }]}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.authMainWrap}>
              <View style={styles.signInCard}>
                {/* Trust / Category Pill - Secret Preview Trigger */}
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={handleSkipLogin}
                  style={styles.trustBadge}
                >
                  <Text style={styles.trustBadgeFlag}>🇮🇳</Text>
                  <Text style={styles.trustBadgeText}>#1 Trusted Earning Platform</Text>
                </TouchableOpacity>

                {/* App Branding Logo */}
                <AppLogo size={64} showSparkle style={{ marginBottom: 12 }} />

                <BrandLogo fontSize={32} style={{ marginBottom: 4 }} />
                <Text style={styles.subtitle}>India's Largest Earning App</Text>

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

                {/* Action Card: Google Sign In */}
                <View style={styles.actionCard}>
                  <View style={styles.buttonWrapper}>
                    <GoogleSignInButton
                      onPress={handleGoogleSignIn}
                      isLoading={isAuthenticating}
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* Terms Footer - Positioned at the very bottom */}
            <View style={styles.termsFooter}>
              <Text style={styles.termsText}>
                By continuing, you agree to our Terms of Service & Privacy Policy
              </Text>
            </View>
          </ScrollView>
        </View>
      )}

      {/* Branded Launch Splash Overlay (Smooth 60fps fade-out with zero flicker or layout shift) */}
      {isLoading && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.splashOverlay,
            { opacity: splashAnim, paddingTop: topInset + 40 },
          ]}
          pointerEvents="none"
        >
          <View style={styles.splashContent}>
            <AppLogo size={76} showSparkle style={{ marginBottom: 18 }} />
            <BrandLogo fontSize={34} style={{ marginBottom: 8 }} />
            <Text style={styles.splashSubtitle}>India's Largest Earning App</Text>
          </View>

          <View style={styles.splashFooterWrap}>
            <ActivityIndicator size="small" color="#2563EB" style={{ marginBottom: 14 }} />
            <View style={styles.splashPill}>
              <Ionicons name="shield-checkmark" size={14} color="#059669" style={{ marginRight: 6 }} />
              <Text style={styles.splashPillText}>100% Verified & Secure Payouts</Text>
            </View>
          </View>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  mainContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 0,
  },
  screenContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  authMainWrap: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  splashOverlay: {
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 64,
    zIndex: 9999,
    elevation: 9999,
  },
  splashContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
    letterSpacing: 0.2,
    marginTop: 4,
  },
  splashFooterWrap: {
    alignItems: 'center',
    paddingBottom: 24,
  },
  splashPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  splashPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#166534',
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
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 16,
    letterSpacing: 0.2,
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
    marginBottom: 4,
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
  termsFooter: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 12 : 16,
  },
  termsText: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 20,
  },
});
