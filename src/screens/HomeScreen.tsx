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

const COIN_STYLE_1 = require('../../assets/coin-style-1.png');

// Blank / Teaser placeholder cards displayed below real offers
const DUMMY_COMING_SOON_CARDS = [
  {
    id: 'dummy-cs-1',
    title: 'New Offers Coming Soon',
    category: 'Verification in progress',
    icon: 'sparkles-outline' as const,
    badgeText: 'Coming Soon',
    badgeIcon: 'time-outline' as const,
  },
  {
    id: 'dummy-cs-2',
    title: 'More High-Reward Tasks',
    category: 'Unlocking new partners',
    icon: 'gift-outline' as const,
    badgeText: 'Soon',
    badgeIcon: 'lock-closed-outline' as const,
  },
  {
    id: 'dummy-cs-3',
    title: 'Surveys & App Testing',
    category: 'Special bonus campaigns',
    icon: 'rocket-outline' as const,
    badgeText: 'Stay Tuned',
    badgeIcon: 'flash-outline' as const,
  },
];

interface HomeScreenProps {
  user: UserProfile;
  userSubmissions?: TaskHistoryItem[];
  onNavigateToTab: (tab: 'history' | 'profile') => void;
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
    return (
      <View style={styles.coinRewardRow}>
        <Image source={COIN_STYLE_1} style={styles.coinRewardImg} resizeMode="contain" />
        <Text style={styles.coinRewardText}>{item.reward}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Unboxed Brand Hero with Tagline */}
        <View style={styles.brandHeroContainer}>
          <View style={styles.brandHeroRow}>
            <Text style={styles.brandHeroBlue}>EarnBy</Text>
            <Text style={styles.brandHeroAmber}>Apps</Text>
            <Text style={styles.brandHeroArrow}> ↗</Text>
          </View>
          <Text style={styles.brandHeroTagline}>India's Largest Earning App</Text>
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>All Offers!</Text>
        </View>

        {/* Loading State */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Fetching offers from database...</Text>
          </View>
        ) : availableCampaigns.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconCircle}>
              <Ionicons
                name={campaigns.length > 0 ? 'checkmark-done-circle' : 'folder-open-outline'}
                size={38}
                color={campaigns.length > 0 ? '#10B981' : '#94A3B8'}
              />
            </View>
            <Text style={styles.emptyTitle}>
              {campaigns.length > 0 ? 'All Caught Up!' : 'No Offers Available'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {campaigns.length > 0
                ? 'You have submitted proof for all available offers. New tasks will show up here as soon as they are added!'
                : 'No active offers are currently open in the database. Check back soon!'}
            </Text>
            <TouchableOpacity style={styles.refreshButton} onPress={() => loadData(true)}>
              <Ionicons name="refresh" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.refreshButtonText}>Refresh Offers</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Live Campaigns List */
          <View style={styles.campaignsList}>
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

            {/* Blank / Teaser Placeholder Cards (New Offers Coming Soon) */}
            {DUMMY_COMING_SOON_CARDS.map((dummy) => (
              <View key={dummy.id} style={styles.dummyCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.dummyIconBox}>
                    <Ionicons name={dummy.icon} size={26} color="#94A3B8" />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.dummyCardTitle}>{dummy.title}</Text>
                    <Text style={styles.dummyCardCategory}>{dummy.category}</Text>
                  </View>
                  <View style={styles.comingSoonBadge}>
                    <Ionicons
                      name={dummy.badgeIcon}
                      size={12}
                      color="#64748B"
                      style={{ marginRight: 4 }}
                    />
                    <Text style={styles.comingSoonText}>{dummy.badgeText}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  brandHeroContainer: {
    paddingTop: 26,
    paddingBottom: 14,
    alignItems: 'center',
    justifyContent: 'center',
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
  brandHeroArrow: {
    fontSize: 26,
    fontWeight: '900',
    color: '#3A5998',
    marginLeft: 3,
  },
  brandHeroTagline: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 5,
    letterSpacing: 0.3,
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
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    opacity: 0.85,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.02,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
      },
    }),
  },
  dummyIconBox: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dummyCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: -0.2,
  },
  dummyCardCategory: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 3,
  },
  comingSoonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  comingSoonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  cardLogoImg: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginHorizontal: 16,
    marginTop: 8,
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
