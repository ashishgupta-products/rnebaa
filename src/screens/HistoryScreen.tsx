import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserProfile, BackendUser } from '../types/auth';
import { TaskHistoryItem } from '../types/campaign';
import { fetchUserSubmissions } from '../services/submissionService';
import { requestPayout, fetchUserPayouts } from '../services/payoutService';
import { getCachedCampaigns, fetchLiveCampaigns } from '../services/campaignService';
import { fetchLatestBackendUser } from '../services/backendAuthService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BrandLogo } from '../components/BrandLogo';
import { CampaignLogo } from '../components/CampaignLogo';

interface HistoryScreenProps {
  user: UserProfile;
  onNavigateToHome: () => void;
  submissions?: TaskHistoryItem[];
  onRefreshUser?: (updated: BackendUser) => void;
}

interface WithdrawalRequest {
  id: string;
  amount: number;
  method: string;
  account: string;
  status: 'Pending' | 'Completed' | 'Rejected' | 'Processed';
  date: string;
}

const STORAGE_WITHDRAWALS_KEY = '@earnbyapps_withdrawal_requests';

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  user,
  onNavigateToHome,
  submissions = [],
  onRefreshUser,
}) => {
  const [filter, setFilter] = useState<'all' | 'added_to_wallet' | 'pending' | 'rejected'>('all');
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [historyItems, setHistoryItems] = useState<TaskHistoryItem[]>(() => submissions || []);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // Modals state
  const [showWithdrawModal, setShowWithdrawModal] = useState<boolean>(false);
  const [showWithdrawHistoryModal, setShowWithdrawHistoryModal] = useState<boolean>(false);
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [submittingWithdrawal, setSubmittingWithdrawal] = useState<boolean>(false);
  const [selectedProofItem, setSelectedProofItem] = useState<TaskHistoryItem | null>(null);

  // In-memory campaign logo lookup map (resolves app logo by appId or appName)
  const [campaignsMap, setCampaignsMap] = useState<Map<string, string>>(() => {
    const map = new Map<string, string>();
    const cached = getCachedCampaigns() || [];
    cached.forEach((c) => {
      if (c.id && c.logoUrl) map.set(c.id, c.logoUrl);
      if (c.name && c.logoUrl) map.set(c.name.toLowerCase().trim(), c.logoUrl);
    });
    return map;
  });

  const loadCampaigns = async () => {
    try {
      const list = await fetchLiveCampaigns();
      const map = new Map<string, string>();
      list.forEach((c) => {
        if (c.id && c.logoUrl) map.set(c.id, c.logoUrl);
        if (c.name && c.logoUrl) map.set(c.name.toLowerCase().trim(), c.logoUrl);
      });
      setCampaignsMap(map);
    } catch (e) {
      console.warn('Could not load campaigns for logo map:', e);
    }
  };

  // Load stored withdrawals from local cache and sync with live database
  const loadWithdrawalRequests = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_WITHDRAWALS_KEY);
      if (stored) {
        setWithdrawalRequests(JSON.parse(stored));
      }
      const remote = await fetchUserPayouts(user.email);
      if (remote && remote.length > 0) {
        setWithdrawalRequests(remote);
        await AsyncStorage.setItem(STORAGE_WITHDRAWALS_KEY, JSON.stringify(remote));
      }
    } catch (e) {
      console.warn('Error loading withdrawal requests:', e);
    }
  };

  const loadSubmissions = async () => {
    try {
      const live = await fetchUserSubmissions(user.email);
      setHistoryItems(live || []);
    } catch (e) {
      console.warn('Could not load user submissions:', e);
      setHistoryItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadWithdrawalRequests();
    loadSubmissions();
    loadCampaigns();
  }, [user.email]);

  useEffect(() => {
    if (submissions && submissions.length > 0) {
      setHistoryItems((prev) => {
        const ids = new Set(prev.map((p) => p.id));
        const newItems = submissions.filter((s) => !ids.has(s.id));
        return [...newItems, ...prev];
      });
    }
  }, [submissions]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadWithdrawalRequests(),
      loadSubmissions(),
      loadCampaigns(),
      user.email && onRefreshUser
        ? fetchLatestBackendUser(user.email).then((u) => u && onRefreshUser(u))
        : Promise.resolve(),
    ]);
    setRefreshing(false);
  };

  const balance = user.backendUser?.balance ?? 0;

  // 1. Received in Account (Completed or Processed payouts)
  const receivedInAccount = withdrawalRequests
    .filter((w) => w.status === 'Completed' || w.status === 'Processed')
    .reduce((sum, w) => sum + w.amount, 0);

  // 2. Pending Withdrawal (payout requests currently awaiting processing)
  const pendingWithdrawal = withdrawalRequests
    .filter((w) => w.status === 'Pending')
    .reduce((sum, w) => sum + w.amount, 0);

  // Approved task rewards (ensures total earned never drops below verified task rewards)
  const approvedTasksEarned = (historyItems || [])
    .filter((item) => item.status === 'Paid')
    .reduce((sum, item) => sum + (Number(item.reward) || 0), 0);

  // Total Earned = Available Balance + Pending Withdrawal + Received in Account
  // Ensures that when withdrawing amount X, available balance decreases but Total Earned remains intact!
  const calculatedTotalEarned = balance + pendingWithdrawal + receivedInAccount;
  const totalEarned = Math.max(calculatedTotalEarned, approvedTasksEarned);

  const formatAmount = (num: number): string => {
    if (isNaN(num)) return '0';
    return num % 1 === 0 ? num.toString() : num.toFixed(2);
  };

  const handleCreateWithdrawal = async () => {
    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount to withdraw.');
      return;
    }
    if (amt < 20) {
      Alert.alert('Minimum Withdrawal', 'Minimum withdrawal amount is ₹ 20.');
      return;
    }
    if (amt > balance) {
      Alert.alert('Insufficient Balance', `Your available balance is ₹${balance.toFixed(2)}.`);
      return;
    }

    const payoutDest = user.upiId || user.bankAccountNumber || 'UPI ID';
    setSubmittingWithdrawal(true);
    try {
      const payoutRes = await requestPayout({
        amount: amt,
        method: user.upiId ? 'UPI' : 'Bank Transfer',
        account: payoutDest,
        upiId: user.upiId,
        email: user.email,
      });

      const newReq: WithdrawalRequest = payoutRes.payout || {
        id: `WD-${Date.now().toString().slice(-6)}`,
        amount: amt,
        method: user.upiId ? 'UPI' : 'Bank Transfer',
        account: payoutDest,
        status: 'Pending',
        date: new Date().toISOString().replace('T', ' at ').slice(0, 19),
      };

      const updated = [newReq, ...withdrawalRequests.filter((w) => w.id !== newReq.id)];
      await AsyncStorage.setItem(STORAGE_WITHDRAWALS_KEY, JSON.stringify(updated));
      setWithdrawalRequests(updated);
      setShowWithdrawModal(false);
      setWithdrawAmount('');

      // Optimistically update backendUser balance immediately so UI updates without flicker
      if (user.backendUser && onRefreshUser) {
        onRefreshUser({
          ...user.backendUser,
          balance: Math.max(0, (user.backendUser.balance || 0) - amt),
        });
      }

      // Refresh user balance from database
      if (user.email && onRefreshUser) {
        fetchLatestBackendUser(user.email).then((u) => u && onRefreshUser(u));
      }

      Alert.alert(
        'Request Submitted',
        `Your withdrawal request of ₹ ${amt.toFixed(2)} has been submitted successfully.`
      );
    } catch (e: any) {
      console.error('Failed to submit withdrawal:', e);
      Alert.alert('Error', e.message || 'Failed to submit withdrawal request.');
    } finally {
      setSubmittingWithdrawal(false);
    }
  };

  // Filter items based on active chip
  const filteredItems = historyItems.filter((item) => {
    if (filter === 'all') return true;
    if (filter === 'added_to_wallet') return item.status === 'Paid';
    if (filter === 'pending') return item.status === 'Pending';
    if (filter === 'rejected') return item.status === 'Rejected';
    return true;
  });

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Top Centered Brand Logo */}
        <View style={styles.header}>
          <BrandLogo fontSize={28} />
        </View>

        {/* Hero Blue Wallet Card (Matching Screenshot 2) */}
        <View style={styles.blueHeroCard}>
          {/* Card Top Row: Label & "Withdraw History >" */}
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardHeaderLabel}>TOTAL WALLET AMOUNT</Text>
            <TouchableOpacity
              style={styles.withdrawHistoryPill}
              onPress={() => setShowWithdrawHistoryModal(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.withdrawHistoryText}>Withdraw History</Text>
              <Ionicons name="chevron-forward" size={13} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Big Available Balance */}
          <Text style={styles.cardBigBalance}>₹{formatAmount(balance)}</Text>
          <Text style={styles.cardBalanceSubtitle}>Available Balance</Text>

          {/* Translucent 3-Column Glass Box */}
          <View style={styles.glassStatsBox}>
            {/* 1. Total Earned */}
            <View style={styles.glassStatCol}>
              <Text style={styles.glassStatVal}>₹{formatAmount(totalEarned)}</Text>
              <Text style={styles.glassStatLabel} numberOfLines={2}>
                Total Earned
              </Text>
            </View>

            <View style={styles.glassDivider} />

            {/* 2. Pending Withdrawal */}
            <View style={styles.glassStatCol}>
              <Text style={styles.glassStatVal}>₹{formatAmount(pendingWithdrawal)}</Text>
              <Text style={styles.glassStatLabel} numberOfLines={2}>
                Pending Withdrawal
              </Text>
            </View>

            <View style={styles.glassDivider} />

            {/* 3. Received in Account */}
            <View style={styles.glassStatCol}>
              <Text style={styles.glassStatVal}>₹{formatAmount(receivedInAccount)}</Text>
              <Text style={styles.glassStatLabel} numberOfLines={2}>
                Received in Account
              </Text>
            </View>
          </View>
        </View>

        {/* Withdraw Amount Action Button */}
        <TouchableOpacity
          style={styles.withdrawButton}
          onPress={() => setShowWithdrawModal(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="download-outline" size={20} color="#FFFFFF" />
          <Text style={styles.withdrawButtonText}>Withdraw Amount</Text>
        </TouchableOpacity>
        <Text style={styles.minWithdrawText}>Min withdrawal: ₹ 20</Text>

        {/* Transaction History Section */}
        <Text style={styles.sectionTitle}>Transaction History</Text>

        {/* Filter Pills Row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {/* All */}
          <TouchableOpacity
            style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
            onPress={() => setFilter('all')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="reorder-four-outline"
              size={16}
              color={filter === 'all' ? '#FFFFFF' : '#334155'}
            />
            <Text style={[styles.filterChipText, filter === 'all' && styles.filterChipTextActive]}>
              All
            </Text>
          </TouchableOpacity>

          {/* Added to Wallet */}
          <TouchableOpacity
            style={[styles.filterChip, filter === 'added_to_wallet' && styles.filterChipActive]}
            onPress={() => setFilter('added_to_wallet')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={16}
              color={filter === 'added_to_wallet' ? '#FFFFFF' : '#16A34A'}
            />
            <Text
              style={[
                styles.filterChipText,
                filter === 'added_to_wallet' && styles.filterChipTextActive,
              ]}
            >
              Added to Wallet
            </Text>
          </TouchableOpacity>

          {/* Pending */}
          <TouchableOpacity
            style={[styles.filterChip, filter === 'pending' && styles.filterChipActive]}
            onPress={() => setFilter('pending')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="time-outline"
              size={16}
              color={filter === 'pending' ? '#FFFFFF' : '#D97706'}
            />
            <Text style={[styles.filterChipText, filter === 'pending' && styles.filterChipTextActive]}>
              Pending
            </Text>
          </TouchableOpacity>

          {/* Rejected */}
          <TouchableOpacity
            style={[styles.filterChip, filter === 'rejected' && styles.filterChipActive]}
            onPress={() => setFilter('rejected')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="close-circle-outline"
              size={16}
              color={filter === 'rejected' ? '#FFFFFF' : '#DC2626'}
            />
            <Text
              style={[
                styles.filterChipText,
                filter === 'rejected' && styles.filterChipTextActive,
              ]}
            >
              Rejected
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Transactions List */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#2563EB" />
            <Text style={styles.loadingText}>Loading history...</Text>
          </View>
        ) : filteredItems.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="folder-open-outline" size={40} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No Transactions Found</Text>
            <Text style={styles.emptySub}>
              {filter === 'all'
                ? 'Complete offers from the Home tab to earn and see transaction records here.'
                : `No transactions found under "${filter === 'added_to_wallet' ? 'Added to Wallet' : filter}".`}
            </Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {filteredItems.map((item) => {
              const dateStr = item.date || '2026-08-07 at 04:54:24';

              const isApproved = item.status === 'Paid';
              const isPending = item.status === 'Pending';
              const isRejected = item.status === 'Rejected';
              const statusText = isApproved ? 'Added to Wallet' : isPending ? 'Pending' : 'Rejected';

              // Resolve genuine application logo icon
              const appLogo =
                item.appLogoUrl ||
                (item.appId ? campaignsMap.get(item.appId) : undefined) ||
                campaignsMap.get(item.appName?.toLowerCase().trim());

              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={item.proofUrl ? 0.75 : 1}
                  onPress={() => {
                    if (item.proofUrl) {
                      setSelectedProofItem(item);
                    }
                  }}
                  style={styles.txCard}
                >
                  {/* Left Logo: App Image Icon */}
                  <CampaignLogo
                    name={item.appName}
                    logoUrl={appLogo}
                    size={46}
                    borderRadius={12}
                    style={{ marginRight: 12 }}
                  />

                  {/* Middle: App Name, Date, and Proof badge */}
                  <View style={styles.txInfoCol}>
                    <Text style={styles.txAppName}>{item.appName}</Text>
                    <Text style={styles.txDate}>{dateStr}</Text>
                    {item.proofUrl ? (
                      <View style={styles.proofBadge}>
                        <Ionicons name="image-outline" size={11} color="#2563EB" />
                        <Text style={styles.proofBadgeText}>View Screenshot</Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Right: Amount & Status */}
                  <View style={styles.txStatusCol}>
                    <Text style={styles.txAmountText}>+₹ {item.reward}</Text>
                    <Text
                      style={[
                        styles.txStatusText,
                        isApproved && styles.txStatusAdded,
                        isPending && styles.txStatusPending,
                        isRejected && styles.txStatusRejected,
                      ]}
                    >
                      {statusText}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Withdraw Modal */}
      <Modal
        visible={showWithdrawModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowWithdrawModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Withdraw Funds</Text>
              <TouchableOpacity onPress={() => setShowWithdrawModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Available Balance: <Text style={styles.modalBalText}>₹ {balance.toFixed(2)}</Text>
            </Text>

            <View style={styles.modalInputWrap}>
              <Text style={styles.modalCurrencySymbol}>₹</Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="numeric"
                placeholder="20"
                placeholderTextColor="#94A3B8"
                value={withdrawAmount}
                onChangeText={setWithdrawAmount}
              />
            </View>
            <Text style={styles.modalHelper}>Minimum withdrawal amount is ₹ 20</Text>

            <TouchableOpacity
              style={[styles.modalActionBtn, submittingWithdrawal && { opacity: 0.7 }]}
              onPress={handleCreateWithdrawal}
              disabled={submittingWithdrawal}
            >
              {submittingWithdrawal ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.modalActionText}>Confirm Withdrawal</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Withdraw History Modal */}
      <Modal
        visible={showWithdrawHistoryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowWithdrawHistoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '75%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Withdrawal Requests</Text>
              <TouchableOpacity onPress={() => setShowWithdrawHistoryModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {withdrawalRequests.length === 0 ? (
                <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                  <Text style={{ color: '#94A3B8', fontSize: 14 }}>No withdrawal requests yet.</Text>
                </View>
              ) : (
                withdrawalRequests.map((req) => (
                  <View key={req.id} style={styles.reqItemRow}>
                    <View>
                      <Text style={styles.reqAmountText}>₹ {req.amount.toFixed(2)}</Text>
                      <Text style={styles.reqDateText}>{req.date}</Text>
                    </View>
                    <View
                      style={[
                        styles.reqStatusBadge,
                        req.status === 'Completed' && styles.reqStatusCompleted,
                        req.status === 'Rejected' && styles.reqStatusRejected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.reqStatusBadgeText,
                          req.status === 'Completed' && { color: '#16A34A' },
                          req.status === 'Rejected' && { color: '#DC2626' },
                        ]}
                      >
                        {req.status}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Proof Preview Modal */}
      <Modal
        visible={Boolean(selectedProofItem)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedProofItem(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <CampaignLogo
                  name={selectedProofItem?.appName || ''}
                  logoUrl={
                    selectedProofItem
                      ? selectedProofItem.appLogoUrl ||
                        (selectedProofItem.appId ? campaignsMap.get(selectedProofItem.appId) : undefined) ||
                        campaignsMap.get(selectedProofItem.appName?.toLowerCase().trim())
                      : undefined
                  }
                  size={36}
                  borderRadius={10}
                />
                <View>
                  <Text style={styles.modalTitle}>{selectedProofItem?.appName}</Text>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Submitted Proof</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setSelectedProofItem(null)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            {selectedProofItem?.proofUrl ? (
              <ScrollView style={{ marginTop: 12 }} contentContainerStyle={{ alignItems: 'center' }}>
                <Image
                  source={{ uri: selectedProofItem.proofUrl }}
                  style={{ width: '100%', height: 320, borderRadius: 12, backgroundColor: '#F1F5F9' }}
                  resizeMode="contain"
                />
                <View
                  style={{
                    marginTop: 14,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    width: '100%',
                    paddingHorizontal: 4,
                  }}
                >
                  <Text style={{ fontSize: 13, color: '#64748B' }}>Status</Text>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '700',
                      color:
                        selectedProofItem.status === 'Paid'
                          ? '#16A34A'
                          : selectedProofItem.status === 'Rejected'
                          ? '#DC2626'
                          : '#EAB308',
                    }}
                  >
                    {selectedProofItem.status === 'Paid' ? 'Added to Wallet' : selectedProofItem.status}
                  </Text>
                </View>
                <View
                  style={{
                    marginTop: 6,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    width: '100%',
                    paddingHorizontal: 4,
                  }}
                >
                  <Text style={{ fontSize: 13, color: '#64748B' }}>Reward</Text>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#15803D' }}>
                    +₹ {selectedProofItem.reward}
                  </Text>
                </View>
              </ScrollView>
            ) : (
              <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                <Text style={{ color: '#64748B' }}>No screenshot proof attached.</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.modalActionBtn, { marginTop: 16 }]}
              onPress={() => setSelectedProofItem(null)}
            >
              <Text style={styles.modalActionText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingTop: 26,
    paddingBottom: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 36,
  },
  blueHeroCard: {
    backgroundColor: '#2F65F6',
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 6,
    shadowColor: '#2F65F6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 0.5,
  },
  withdrawHistoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4.5,
    borderRadius: 20,
  },
  withdrawHistoryText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  cardBigBalance: {
    fontSize: 42,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 10,
    letterSpacing: -0.5,
  },
  cardBalanceSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  glassStatsBox: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 6,
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  glassStatCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  glassStatVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  glassStatLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 14,
  },
  glassDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  withdrawButton: {
    backgroundColor: '#2747B8',
    borderRadius: 14,
    height: 52,
    marginHorizontal: 16,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#2747B8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  withdrawButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  minWithdrawText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginHorizontal: 16,
    marginTop: 22,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  filterRow: {
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 22,
  },
  filterChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    paddingHorizontal: 16,
    gap: 10,
  },
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  txInfoCol: {
    flex: 1,
  },
  txAppName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  txDate: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 3,
  },
  proofBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  proofBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563EB',
  },
  txStatusCol: {
    alignItems: 'flex-end',
    gap: 6,
  },
  txAmountText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  txStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  txStatusAdded: {
    color: '#16A34A',
    fontWeight: '700',
    fontSize: 13,
  },
  txStatusPending: {
    color: '#D97706',
    fontWeight: '700',
    fontSize: 13,
  },
  txStatusRejected: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 13,
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 36,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
  },
  emptySub: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSub: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
  },
  modalBalText: {
    fontWeight: '800',
    color: '#15803D',
  },
  modalInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  modalCurrencySymbol: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginRight: 8,
  },
  modalInput: {
    flex: 1,
    height: 52,
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalHelper: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 20,
  },
  modalActionBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalActionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  reqItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  reqAmountText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  reqDateText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  reqStatusBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  reqStatusCompleted: {
    backgroundColor: '#DCFCE7',
  },
  reqStatusRejected: {
    backgroundColor: '#FEE2E2',
  },
  reqStatusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
  },
});
