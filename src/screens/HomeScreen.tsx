import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Linking,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserProfile } from '../types/auth';
import { Campaign, TaskHistoryItem } from '../types/campaign';
import { fetchLiveCampaigns, getCachedCampaigns } from '../services/campaignService';
import { CampaignLogo } from '../components/CampaignLogo';
import { TabType } from '../types/navigation';

const COIN_STYLE_1 = require('../../assets/coin-style-1.png');

// Teaser placeholder cards (3 coming soon teaser cards)
const DUMMY_COMING_SOON_CARDS = [
  { id: 'dummy-cs-1' },
  { id: 'dummy-cs-2' },
  { id: 'dummy-cs-3' },
];

interface HomeScreenProps {
  user: UserProfile;
  userSubmissions?: TaskHistoryItem[];
  onNavigateToTab: (tab: TabType) => void;
  onSelectCampaign: (campaign: Campaign) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  user,
  userSubmissions = [],
  onNavigateToTab,
  onSelectCampaign,
}) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>(() => getCachedCampaigns() || []);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(() => !getCachedCampaigns());

  // Filter out any campaigns that the user has already submitted proof for
  const submittedAppNames = new Set(
    (userSubmissions || []).map((s) => s.appName?.toLowerCase().trim()).filter(Boolean)
  );
  const submittedAppIds = new Set(
    (userSubmissions || []).map((s) => s.appId?.toLowerCase().trim()).filter(Boolean)
  );

  const availableCampaigns = campaigns.filter((item) => {
    const isSubmittedByName = item.name && submittedAppNames.has(item.name.toLowerCase().trim());
    const isSubmittedById = item.id && submittedAppIds.has(item.id.toLowerCase().trim());
    return !isSubmittedByName && !isSubmittedById;
  });

  const balance = user.backendUser?.balance || 0;

  const loadData = async (forceFresh = false) => {
    // Only show the full-page spinner if we have no campaigns at all yet
    if (!getCachedCampaigns() && campaigns.length === 0) {
      setLoading(true);
    }
    const data = await fetchLiveCampaigns(forceFresh);
    setCampaigns(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    const data = await fetchLiveCampaigns(true);
    setCampaigns(data);
    setRefreshing(false);
  };

  const handleOpenCampaign = (url?: string) => {
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      Linking.openURL(url).catch(() => {});
    }
  };

  const renderRewardBadge = (item: Campaign) => {
    const rewardStr = String(item.reward || '');
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
              ₹{item.reward}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Fixed Brand Hero Header (stays pinned while offers scroll) */}
      <View style={styles.brandHeroContainer}>
        <View style={styles.brandHeroRow}>
          <Text style={styles.brandHeroBlue}>EarnBy</Text>
          <Text style={styles.brandHeroAmber}>Apps</Text>
        </View>
        <Text style={styles.brandHeroTagline}>India's Largest Earning App</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>All Offers!</Text>
        </View>

        <View style={styles.campaignsList}>
          {/* Real Live Campaigns List (On Top) */}
          {availableCampaigns.map((item) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.9}
              style={styles.campaignCard}
              onPress={() => onSelectCampaign(item)}
            >
              <View style={styles.cardHeader}>
                <CampaignLogo
                  name={item.name}
                  logoUrl={item.logoUrl}
                  size={58}
                  borderRadius={16}
                  style={{ marginRight: 14 }}
                />
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.cardCategory}>{item.category}</Text>
                </View>
                {renderRewardBadge(item)}
              </View>
            </TouchableOpacity>
          ))}

          {/* Dummy Cards (Below Real Cards) */}
          {DUMMY_COMING_SOON_CARDS.map((dummy) => (
            <View key={dummy.id} style={styles.dummyCard}>
              <View style={styles.cardHeader}>
                <View style={styles.dummyIconBox}>
                  <Ionicons name="sparkles" size={24} color="#3A5998" />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.dummyCardTitle}>New offers coming soon</Text>
                </View>
                <View style={styles.coinRewardRow}>
                  <Image source={COIN_STYLE_1} style={styles.coinRewardImg} resizeMode="contain" />
                </View>
              </View>
            </View>
          ))}

          {/* Inline Loading while fetching real campaigns */}
          {loading && availableCampaigns.length === 0 && (
            <View style={styles.loadingBoxInline}>
              <ActivityIndicator size="small" color="#2563EB" />
              <Text style={styles.loadingText}>Loading live tasks...</Text>
            </View>
          )}

          {/* Empty state if finished loading and no real campaigns are available */}
          {!loading && availableCampaigns.length === 0 && (
            <View style={styles.emptyBoxInline}>
              <View style={styles.emptyIconCircle}>
                <Ionicons
                  name={campaigns.length > 0 ? 'checkmark-done-circle' : 'folder-open-outline'}
                  size={32}
                  color={campaigns.length > 0 ? '#10B981' : '#94A3B8'}
                />
              </View>
              <Text style={styles.emptyTitle}>
                {campaigns.length > 0 ? 'All Caught Up!' : 'No Active Offers'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {campaigns.length > 0
                  ? 'You have submitted proof for all available offers. New tasks will show up here as soon as they are added!'
                  : 'Check back soon for new offers.'}
              </Text>
              <TouchableOpacity style={styles.refreshButton} onPress={() => loadData(true)}>
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
  brandHeroTagline: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 5,
    letterSpacing: 0.2,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginTop: 18,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
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
  cardIconBox: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardIconText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2563EB',
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
    backgroundColor: '#E58A00', // Deep amber 3D rim visible on the top-left
  },
  coinOuterRing: {
    position: 'absolute',
    left: 5,
    top: 2.5,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FDE047', // Light creamy yellow outer ring
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinInnerDisc: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EAA812', // Rich golden amber inner circular face
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinText: {
    fontWeight: '900',
    color: '#000000',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  coinRewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  coinRewardImg: {
    width: 28,
    height: 28,
  },
  coinRewardText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#15803D',
    letterSpacing: -0.3,
  },
  dummyCard: {
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
        shadowOpacity: 0.03,
        shadowRadius: 6,
      },
      android: {
        elevation: 1.5,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
      },
    }),
  },
  dummyIconBox: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  dummyCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  cardLogoImg: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  loadingBoxInline: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  emptyBoxInline: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 4,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
