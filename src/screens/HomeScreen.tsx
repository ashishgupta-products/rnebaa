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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserProfile } from '../types/auth';
import { Campaign } from '../types/campaign';
import { fetchLiveCampaigns } from '../services/campaignService';

interface HomeScreenProps {
  user: UserProfile;
  onNavigateToTab: (tab: 'history' | 'profile') => void;
  onSelectCampaign: (campaign: Campaign) => void;
}

const CATEGORIES = ['All', 'App Install', 'Finance', 'Gaming'];

export const HomeScreen: React.FC<HomeScreenProps> = ({
  user,
  onNavigateToTab,
  onSelectCampaign,
}) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const balance = user.backendUser?.balance || 0;

  const loadData = async () => {
    const data = await fetchLiveCampaigns();
    setCampaigns(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const filteredCampaigns = campaigns.filter((c) => {
    if (selectedCategory === 'All') return true;
    return c.category.toLowerCase().includes(selectedCategory.toLowerCase());
  });

  const handleOpenCampaign = (url?: string) => {
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      Linking.openURL(url).catch(() => {});
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.appLogoBadge}>
            <Text style={styles.appLogoText}>E</Text>
          </View>
          <View>
            <Text style={styles.brandTitle}>EarnByApps</Text>
            <Text style={styles.greetingText}>
              Hi, {user.name.split(' ')[0]} 👋
            </Text>
          </View>
        </View>

        {/* Wallet Pill Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.walletPill}
          onPress={() => onNavigateToTab('profile')}
        >
          <Ionicons name="wallet-outline" size={16} color="#15803D" />
          <Text style={styles.walletAmount}>₹{balance.toFixed(2)}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Hero Banner */}
        <View style={styles.heroBanner}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>⚡ INSTANT PAYOUTS</Text>
          </View>
          <Text style={styles.heroTitle}>Test Apps, Earn Real Cash</Text>
          <Text style={styles.heroSubtitle}>
            Complete easy tasks, review apps, and receive instant cash via UPI or bank transfer.
          </Text>
          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatNumber}>₹300+</Text>
              <Text style={styles.heroStatLabel}>Max reward/app</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatNumber}>100%</Text>
              <Text style={styles.heroStatLabel}>Verified offers</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatNumber}>UPI / Bank</Text>
              <Text style={styles.heroStatLabel}>Fast withdrawal</Text>
            </View>
          </View>
        </View>

        {/* Category Filters */}
        <View style={styles.categoriesSection}>
          <Text style={styles.sectionTitle}>Available Tasks</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScroll}
          >
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setSelectedCategory(cat)}
                  style={[
                    styles.categoryChip,
                    active && styles.categoryChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      active && styles.categoryChipTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Campaigns List */}
        <View style={styles.campaignsList}>
          {filteredCampaigns.map((item) => {
            const initialLetter = item.name.charAt(0).toUpperCase();
            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.9}
                style={styles.campaignCard}
                onPress={() => onSelectCampaign(item)}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardIconBox}>
                    <Text style={styles.cardIconText}>{initialLetter}</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    <Text style={styles.cardCategory}>{item.category}</Text>
                  </View>
                  <View style={styles.rewardBadge}>
                    <Text style={styles.rewardText}>
                      +{item.currencySymbol || '₹'}{item.reward}
                    </Text>
                  </View>
                </View>

                {item.description ? (
                  <Text style={styles.cardDescription} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}

                <View style={styles.cardFooter}>
                  <View style={styles.platformsRow}>
                    {item.platforms.map((p) => (
                      <View key={p} style={styles.platformBadge}>
                        <Text style={styles.platformBadgeText}>{p}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.startTaskButton}>
                    <Text style={styles.startTaskButtonText}>View Task</Text>
                    <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  appLogoBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appLogoText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  greetingText: {
    fontSize: 12,
    color: '#64748B',
  },
  walletPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  walletAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#15803D',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  heroBanner: {
    margin: 16,
    padding: 20,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
      },
    }),
  },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 10,
  },
  heroBadgeText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
    marginBottom: 16,
  },
  heroStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: 12,
    borderRadius: 14,
  },
  heroStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  heroStatNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroStatLabel: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  heroDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  categoriesSection: {
    marginTop: 4,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  categoriesScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  campaignsList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  campaignCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
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
    marginBottom: 10,
  },
  cardIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardIconText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2563EB',
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardCategory: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  rewardBadge: {
    backgroundColor: '#DCFCE7',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  rewardText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#15803D',
  },
  cardDescription: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  platformsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  platformBadge: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  platformBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  startTaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2563EB',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  startTaskButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
