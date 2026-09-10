import React, { useState, useEffect, useMemo } from 'react';
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
import { AppLogo } from '../components/AppLogo';
import { UserProfile } from '../types/auth';
import { Campaign } from '../types/campaign';
import { fetchLiveCampaigns } from '../services/campaignService';

interface HomeScreenProps {
  user: UserProfile;
  onNavigateToTab: (tab: 'history' | 'profile') => void;
  onSelectCampaign: (campaign: Campaign) => void;
}

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
    setLoading(true);
    const data = await fetchLiveCampaigns();
    setCampaigns(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    const data = await fetchLiveCampaigns();
    setCampaigns(data);
    setRefreshing(false);
  };

  // Dynamically extract real categories from live database campaigns
  const categories = useMemo(() => {
    const set = new Set<string>();
    campaigns.forEach((c) => {
      if (c.category && c.category.trim()) {
        set.add(c.category.trim());
      }
    });
    return ['All', ...Array.from(set)];
  }, [campaigns]);

  const filteredCampaigns = campaigns.filter((c) => {
    if (selectedCategory === 'All') return true;
    return c.category.trim().toLowerCase() === selectedCategory.trim().toLowerCase();
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
          <AppLogo size={42} showSparkle />
          <View style={styles.headerGreetingWrap}>
            <Text style={styles.greetingText}>
              Hello, {user.name.split(' ')[0]} 👋
            </Text>
            <Text style={styles.greetingSubText}>
              Ready to earn today?
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Category Filters */}
        <View style={styles.categoriesSection}>
          <Text style={styles.sectionTitle}>Available Tasks</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScroll}
          >
            {categories.map((cat) => {
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

        {/* Loading State */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Fetching available tasks from database...</Text>
          </View>
        ) : filteredCampaigns.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="folder-open-outline" size={36} color="#94A3B8" />
            </View>
            <Text style={styles.emptyTitle}>No Tasks Available</Text>
            <Text style={styles.emptySubtitle}>
              {selectedCategory === 'All'
                ? 'No active offers are currently open in the database. Check back soon!'
                : `No tasks found under "${selectedCategory}". Try selecting another category.`}
            </Text>
            <TouchableOpacity style={styles.refreshButton} onPress={loadData}>
              <Ionicons name="refresh" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.refreshButtonText}>Refresh Offers</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Live Campaigns List */
          <View style={styles.campaignsList}>
            {filteredCampaigns.map((item) => {
              const initialLetter = item.name.charAt(0).toUpperCase();
              const hasValidLogo =
                item.logoUrl &&
                (item.logoUrl.startsWith('http://') || item.logoUrl.startsWith('https://'));

              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.9}
                  style={styles.campaignCard}
                  onPress={() => onSelectCampaign(item)}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.cardIconBox}>
                      {hasValidLogo ? (
                        <Image
                          source={{ uri: item.logoUrl }}
                          style={styles.cardLogoImg}
                          resizeMode="contain"
                        />
                      ) : (
                        <Text style={styles.cardIconText}>{initialLetter}</Text>
                      )}
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
                      <Text style={styles.startTaskButtonText}>
                        {item.actionText || 'View Task'}
                      </Text>
                      <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerGreetingWrap: {
    justifyContent: 'center',
  },
  greetingText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  greetingSubText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  categoriesSection: {
    marginTop: 14,
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
