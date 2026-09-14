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
} from 'react-native';
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
        {/* Feature Notice Banner - Statement requested by user */}
        <View style={styles.bannerContainer}>
          <View style={styles.bannerHeaderRow}>
            <View style={styles.flashIconCircle}>
              <Ionicons name="flash" size={18} color="#2563EB" />
            </View>
            <View style={styles.instantBadge}>
              <Ionicons name="sparkles" size={11} color="#2563EB" style={{ marginRight: 3 }} />
              <Text style={styles.instantBadgeText}>Instant Payouts</Text>
            </View>
          </View>

          {/* User Requested Statement */}
          <View style={styles.bannerNoticeBox}>
            <Text style={styles.bannerNoticeText}>
              Instant page contains apps that pay directly to their new users , direct reward zero waiting signup with these codes and the apps will send your rewards directly to you
            </Text>
          </View>

          {/* Key Advantages Pills */}
          <View style={styles.perksRow}>
            <View style={styles.perkItem}>
              <Ionicons name="checkmark-circle" size={14} color="#059669" />
              <Text style={styles.perkText}>Direct App Payout</Text>
            </View>
            <View style={styles.perkDivider} />
            <View style={styles.perkItem}>
              <Ionicons name="timer-outline" size={14} color="#2563EB" />
              <Text style={styles.perkText}>Zero Waiting</Text>
            </View>
            <View style={styles.perkDivider} />
            <View style={styles.perkItem}>
              <Ionicons name="key-outline" size={14} color="#D97706" />
              <Text style={styles.perkText}>Signup Codes</Text>
            </View>
          </View>
        </View>

        {/* Dynamic Cards List (Cards like Home, clicking opens offer details) */}
        <View style={styles.campaignsList}>
          {/* Live Independent Apps (Cards like Home) */}
          {apps.map((item) => (
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
                    <Text style={styles.paidDirectlyText}>Paid directly by app</Text>
                  </View>
                </View>
                {renderRewardBadge(item)}
              </View>
            </TouchableOpacity>
          ))}

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

  /* Feature Notice Banner */
  bannerContainer: {
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
      },
    }),
  },
  bannerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  flashIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  instantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  instantBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#2563EB',
  },
  bannerNoticeBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#2563EB',
    marginBottom: 12,
  },
  bannerNoticeText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#1E3A8A',
    lineHeight: 18,
  },
  perksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 4,
  },
  perkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  perkText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  perkDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#CBD5E1',
  },

  /* Cards List (1:1 with HomeScreen) */
  campaignsList: {
    paddingHorizontal: 16,
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
});
