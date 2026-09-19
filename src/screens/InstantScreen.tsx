import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Image,
  ActivityIndicator,
  LayoutAnimation,
  UIManager,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { Ionicons } from '@expo/vector-icons';
import { Campaign } from '../types/campaign';
import {
  fetchIndependentApps,
  getCachedIndependentApps,
  IndependentApp,
} from '../services/independentAppService';
import { CampaignLogo } from '../components/CampaignLogo';

const parseRewardNumber = (badge?: string): number => {
  if (!badge) return 50;
  const match = badge.replace(/,/g, '').match(/\d+/);
  return match ? parseInt(match[0], 10) : 50;
};

interface InstantScreenProps {
  onSelectCampaign: (campaign: Campaign) => void;
  onNavigateToTab?: (tab: any) => void;
}

export const InstantScreen: React.FC<InstantScreenProps> = ({
  onSelectCampaign,
}) => {
  const [apps, setApps] = useState<IndependentApp[]>(() => getCachedIndependentApps() || []);
  const [loading, setLoading] = useState<boolean>(() => !getCachedIndependentApps());
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [visibleCount, setVisibleCount] = useState<number>(3);
  const [isExplainerOpen, setIsExplainerOpen] = useState<boolean>(false);

  const displayedApps = apps.slice(0, visibleCount);
  const hasMore = visibleCount < apps.length;

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + 3);
  };

  const toggleExplainer = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExplainerOpen((prev) => !prev);
  };

  // Fetch direct payout apps from /api/independent (as created in admin and shown on /instantpayout)
  const loadApps = async (forceFresh = false) => {
    try {
      if (!getCachedIndependentApps() && apps.length === 0) {
        setLoading(true);
      }
      const data = await fetchIndependentApps(forceFresh);
      setApps(data || []);
    } catch (err) {
      console.warn('Error loading direct independent apps:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApps(true);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    setVisibleCount(3);
    await loadApps(true);
    setRefreshing(false);
  };

  const handleSelectApp = (item: IndependentApp) => {
    const rewardNum = parseRewardNumber(item.rewardBadge);
    const campaign: Campaign = {
      id: item.id,
      name: item.appName,
      category: item.category || 'Direct Pay App',
      platforms: ['Android', 'iOS'],
      reward: rewardNum,
      description: item.description || 'Install the app and use the referral code to get your reward directly.',
      externalUrl: item.appLink,
      logoUrl: item.appImage,
      referralCode: item.referralCode,
      actionText: 'Start',
      currencySymbol: '₹',
      isIndependent: true,
    };
    onSelectCampaign(campaign);
  };

  const renderRewardBadge = (item: IndependentApp) => {
    const rewardNum = parseRewardNumber(item.rewardBadge);
    const rewardStr = String(rewardNum);
    return (
      <View style={styles.coinWrapper}>
        <View style={styles.coinBackRim} />
        <View style={styles.coinOuterRing}>
          <View style={styles.coinInnerDisc}>
            <Text
              style={[
                styles.coinText,
                {
                  fontSize:
                    rewardStr.length >= 4
                      ? 12
                      : rewardStr.length >= 3
                      ? 14
                      : 16,
                },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              ₹{rewardNum}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Fixed Top Brand Header (stays pinned while direct apps scroll) */}
      <View style={styles.brandHeroContainer}>
        <View style={styles.brandHeroRow}>
          <Text style={styles.brandHeroBlue}>EarnBy</Text>
          <Text style={styles.brandHeroAmber}>Apps</Text>
        </View>
        <View style={styles.instantTagPill}>
          <Ionicons name="flash" size={13} color="#D97706" style={{ marginRight: 4 }} />
          <Text style={styles.instantTagText}>Direct Rewards</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Dynamic Cards List (Cards like Home, clicking opens offer details) */}
        <View style={styles.campaignsList}>
          {/* Live Independent Apps (Cards like Home, limited to visibleCount) */}
          {displayedApps.map((item) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.9}
              style={styles.campaignCard}
              onPress={() => handleSelectApp(item)}
            >
              <View style={styles.cardHeader}>
                <CampaignLogo
                  name={item.appName}
                  logoUrl={item.appImage}
                  size={58}
                  borderRadius={16}
                  style={{ marginRight: 14 }}
                />
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>{item.appName}</Text>
                  <View style={styles.paidDirectlyRow}>
                    <Ionicons name="checkmark-circle" size={14} color="#059669" style={{ marginRight: 4 }} />
                    <Text style={styles.paidDirectlyText} numberOfLines={1}>
                      Paid directly by {item.appName}
                    </Text>
                  </View>
                </View>
                {renderRewardBadge(item)}
              </View>
            </TouchableOpacity>
          ))}

          {/* Simple Load More Button */}
          {hasMore && (
            <TouchableOpacity
              style={styles.loadMoreButton}
              onPress={handleLoadMore}
              activeOpacity={0.8}
            >
              <Text style={styles.loadMoreText}>Load More</Text>
              <Ionicons name="chevron-down" size={16} color="#2563EB" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          )}

          {/* What is a 2-Way Referral Dropdown Card */}
          <View style={styles.explainerCard}>
            <TouchableOpacity
              style={styles.explainerHeaderToggle}
              onPress={toggleExplainer}
              activeOpacity={0.75}
            >
              <View style={styles.explainerIconWrap}>
                <Ionicons name="repeat" size={20} color="#2563EB" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <Text style={styles.explainerTitle}>What is a 2-Way Referral?</Text>
                  <View style={styles.winWinBadge}>
                    <Text style={styles.winWinBadgeText}>WIN-WIN</Text>
                  </View>
                </View>
                <Text style={styles.explainerSubtitle}>
                  {isExplainerOpen ? 'Tap to collapse' : 'Both you & inviter earn • Tap to learn more'}
                </Text>
              </View>
              <View style={[styles.chevronCircle, isExplainerOpen && styles.chevronCircleActive]}>
                <Ionicons
                  name={isExplainerOpen ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={isExplainerOpen ? '#2563EB' : '#64748B'}
                />
              </View>
            </TouchableOpacity>

            {isExplainerOpen && (
              <View style={styles.explainerBody}>
                <View style={styles.explainerDivider} />

                <Text style={styles.explainerDesc}>
                  In a standard referral program, only the person sharing the code receives money. With a <Text style={styles.boldText}>2-Way Referral</Text>, the partner app rewards <Text style={styles.highlightText}>BOTH sides</Text>!
                </Text>

                {/* Visual Mutual Reward Diagram */}
                <View style={styles.comparisonBox}>
                  <View style={styles.partyBox}>
                    <View style={styles.partyIconWrapYou}>
                      <Ionicons name="person" size={18} color="#059669" />
                    </View>
                    <Text style={styles.partyRole}>You (New User)</Text>
                    <Text style={styles.partyReward}>Earns Welcome Bonus</Text>
                  </View>

                  <View style={styles.mutualArrows}>
                    <Ionicons name="swap-horizontal" size={22} color="#4F46E5" />
                    <Text style={styles.mutualText}>Dual Reward</Text>
                  </View>

                  <View style={styles.partyBox}>
                    <View style={styles.partyIconWrapInviter}>
                      <Ionicons name="people" size={18} color="#2563EB" />
                    </View>
                    <Text style={styles.partyRole}>Inviter</Text>
                    <Text style={styles.partyReward}>Earns Referral Reward</Text>
                  </View>
                </View>

                {/* 3 Step Process */}
                <View style={styles.stepsContainer}>
                  <View style={styles.stepItem}>
                    <View style={styles.stepNumberBadge}>
                      <Text style={styles.stepNumberText}>1</Text>
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepTitle}>Tap Any App & Copy Code</Text>
                      <Text style={styles.stepSubtitle}>
                        Open the offer card above and tap to copy the verified referral code.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.stepItem}>
                    <View style={styles.stepNumberBadge}>
                      <Text style={styles.stepNumberText}>2</Text>
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepTitle}>Enter Code During Signup</Text>
                      <Text style={styles.stepSubtitle}>
                        Paste the code when registering your new account in that app.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.stepItem}>
                    <View style={[styles.stepNumberBadge, { backgroundColor: '#10B981' }]}>
                      <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={[styles.stepTitle, { color: '#059669' }]}>Get Paid Directly</Text>
                      <Text style={styles.stepSubtitle}>
                        Complete the first activity (e.g. KYC, first UPI or trade) and the app sends your cash/reward directly into your bank or wallet.
                      </Text>
                    </View>
                  </View>
                </View>

              </View>
            )}
          </View>

          {/* Inline Loading while fetching real apps */}
          {loading && apps.length === 0 && (
            <View style={styles.loadingBoxInline}>
              <ActivityIndicator size="small" color="#2563EB" />
              <Text style={styles.loadingText}>Loading direct pay apps...</Text>
            </View>
          )}

          {/* Empty state if finished loading and no real apps exist */}
          {!loading && apps.length === 0 && (
            <View style={styles.emptyBoxInline}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="flash-outline" size={32} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>No Direct Pay Apps Yet</Text>
              <Text style={styles.emptySubtitle}>
                Apps created in the admin panel will show up here automatically. Pull down to refresh!
              </Text>
              <TouchableOpacity style={styles.refreshButton} onPress={() => loadApps(true)}>
                <Ionicons name="refresh" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.refreshButtonText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: 32,
  },
  brandHeroContainer: {
    paddingTop: 8,
    paddingBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    zIndex: 10,
  },
  brandHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandHeroBlue: {
    fontSize: 34,
    fontWeight: '900',
    color: '#3A5998',
    letterSpacing: -0.5,
  },
  brandHeroAmber: {
    fontSize: 34,
    fontWeight: '900',
    color: '#EAA812',
    letterSpacing: -0.5,
  },
  instantTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  instantTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
    letterSpacing: 0.2,
  },

  /* Cards List (1:1 with HomeScreen) */
  campaignsList: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  campaignCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  cardCategory: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 3,
  },
  paidDirectlyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  paidDirectlyText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#059669',
    letterSpacing: 0.1,
  },
  /* Layered 3D Gold Coin (Matching HomeScreen) */
  coinWrapper: {
    width: 68,
    height: 64,
    position: 'relative',
    justifyContent: 'center',
    marginLeft: 8,
  },
  coinBackRim: {
    position: 'absolute',
    left: 1,
    top: 1,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E58A00',
  },
  coinOuterRing: {
    position: 'absolute',
    left: 5,
    top: 2.5,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FDE047',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinInnerDisc: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EAA812',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinText: {
    fontWeight: '900',
    color: '#000000',
    textAlign: 'center',
    letterSpacing: -0.5,
  },

  /* Loading & Empty States */
  loadingBoxInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  emptyBoxInline: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 8,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 18,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },

  /* 2-Way Referral Explainer Card */
  explainerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginTop: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#4338CA',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 4px 14px rgba(67, 56, 202, 0.05)',
      },
    }),
  },
  explainerHeaderToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  chevronCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronCircleActive: {
    backgroundColor: '#EFF6FF',
  },
  explainerBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  explainerDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 14,
  },
  explainerIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  explainerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  explainerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  winWinBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  winWinBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.5,
  },
  explainerDesc: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 19,
    marginBottom: 14,
  },
  boldText: {
    fontWeight: '700',
    color: '#0F172A',
  },
  highlightText: {
    fontWeight: '700',
    color: '#2563EB',
  },
  comparisonBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EEF2F6',
  },
  partyBox: {
    flex: 1,
    alignItems: 'center',
  },
  partyIconWrapYou: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  partyIconWrapInviter: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  partyRole: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  partyReward: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
    marginTop: 2,
    textAlign: 'center',
  },
  mutualArrows: {
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  mutualText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#4F46E5',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  stepsContainer: {
    gap: 12,
    marginBottom: 14,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  stepNumberBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  stepSubtitle: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    height: 48,
    marginTop: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)',
      },
    }),
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
    letterSpacing: 0.1,
  },
});
