import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserProfile } from '../types/auth';
import { TaskHistoryItem } from '../types/campaign';

interface HistoryScreenProps {
  user: UserProfile;
  onNavigateToHome: () => void;
}

const SAMPLE_HISTORY: TaskHistoryItem[] = [
  {
    id: 'h-1',
    appName: 'Hopr App Installation & 3 Rides',
    reward: 300,
    status: 'Pending',
    date: 'Today, 12:30 PM',
    proofType: 'Screenshot',
  },
  {
    id: 'h-2',
    appName: 'Google Pay UPI First Transaction',
    reward: 51,
    status: 'Paid',
    date: 'Yesterday, 04:15 PM',
    proofType: 'Screenshot',
  },
  {
    id: 'h-3',
    appName: 'Groww Demat KYC Verification',
    reward: 100,
    status: 'Paid',
    date: '08 Sep 2026',
    proofType: 'Account ID',
  },
];

const STATUS_FILTERS = ['All', 'Paid', 'Pending', 'Rejected'];

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  user,
  onNavigateToHome,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [historyItems, setHistoryItems] = useState<TaskHistoryItem[]>(SAMPLE_HISTORY);

  const balance = user.backendUser?.balance || 0;
  const paidCount = historyItems.filter((i) => i.status === 'Paid').length;
  const pendingCount = historyItems.filter((i) => i.status === 'Pending').length;

  const filteredItems = historyItems.filter((item) => {
    if (selectedStatus === 'All') return true;
    return item.status.toLowerCase() === selectedStatus.toLowerCase();
  });

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'Paid':
        return { bg: '#DCFCE7', text: '#15803D' };
      case 'Pending':
        return { bg: '#FEF3C7', text: '#B45309' };
      case 'Rejected':
        return { bg: '#FEE2E2', text: '#DC2626' };
      default:
        return { bg: '#F1F5F9', text: '#64748B' };
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Activity & Earnings History</Text>
        <Text style={styles.headerSubtitle}>
          Track your task completions, verifications, and payouts
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Summary Stat Cards */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Balance</Text>
            <Text style={styles.statValue}>₹{balance.toFixed(2)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Paid Tasks</Text>
            <Text style={styles.statValue}>{paidCount}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Pending</Text>
            <Text style={styles.statValue}>{pendingCount}</Text>
          </View>
        </View>

        {/* Status Filter Chips */}
        <View style={styles.filtersSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersScroll}
          >
            {STATUS_FILTERS.map((filter) => {
              const active = selectedStatus === filter;
              return (
                <TouchableOpacity
                  key={filter}
                  onPress={() => setSelectedStatus(filter)}
                  style={[
                    styles.filterChip,
                    active && styles.filterChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      active && styles.filterChipTextActive,
                    ]}
                  >
                    {filter}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* History List */}
        <View style={styles.listContainer}>
          {filteredItems.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="document-text-outline" size={40} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>No Submissions Yet</Text>
              <Text style={styles.emptySubtitle}>
                Complete tasks from the Home tab to earn your first reward!
              </Text>
              <TouchableOpacity
                style={styles.exploreButton}
                onPress={onNavigateToHome}
              >
                <Text style={styles.exploreButtonText}>Browse Available Tasks</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredItems.map((item) => {
              const badgeColors = getStatusBadgeStyle(item.status);
              return (
                <View key={item.id} style={styles.historyCard}>
                  <View style={styles.historyCardHeader}>
                    <View style={styles.appIconCircle}>
                      <Ionicons name="phone-portrait-outline" size={18} color="#2563EB" />
                    </View>
                    <View style={styles.appDetails}>
                      <Text style={styles.historyAppName}>{item.appName}</Text>
                      <Text style={styles.historyDate}>{item.date}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: badgeColors.bg },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          { color: badgeColors.text },
                        ]}
                      >
                        {item.status}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.historyCardFooter}>
                    <Text style={styles.proofTypeText}>
                      Proof: {item.proofType || 'Verification'}
                    </Text>
                    <Text style={styles.historyRewardText}>
                      +{item.status === 'Paid' ? '₹' : '₹'}{item.reward.toFixed(2)}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  filtersSection: {
    marginBottom: 12,
  },
  filtersScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  historyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  appIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  appDetails: {
    flex: 1,
  },
  historyAppName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  historyDate: {
    fontSize: 11,
    color: '#94A3B8',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  historyCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  proofTypeText: {
    fontSize: 11,
    color: '#64748B',
  },
  historyRewardText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#15803D',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
  },
  emptyIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  exploreButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  exploreButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
