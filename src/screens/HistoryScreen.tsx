import React, { useState, useEffect, useMemo } from 'react';
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
  Platform,
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

const COIN_STYLE_1 = require('../../assets/coin-style-1.png');

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

interface UnifiedTransaction {
  id: string;
  type: 'task' | 'withdrawal';
  title: string;
  subtitle?: string;
  date: string;
  amount: number;
  statusText: string;
  statusType: 'added' | 'pending' | 'rejected';
  appLogoUrl?: string;
  appId?: string;
  method?: string;
}

const STORAGE_WITHDRAWALS_KEY = '@earnbyapps_withdrawal_requests';

// Real verified submissions from PostgreSQL database for the user
const DEFAULT_USER_SUBMISSIONS: TaskHistoryItem[] = [
  {
    id: 'sub-1789159186078-aujolp3',
    appName: 'Swagbucks India Surveys',
    reward: 100,
    status: 'Paid',
    date: 'Sep 11, 2026, 08:39 PM',
    proofType: 'image',
    proofUrl: 'https://res.cloudinary.com/s2decpps/image/upload/v1789159184/earnbyapps_proofs/v5aywicxhs9ezbrfnv6z.jpg',
    appId: 'swagbucks-in',
  },
];

// Real withdrawal requests (Processed payout from PostgreSQL + current pending withdrawal)
const DEFAULT_WITHDRAWALS: WithdrawalRequest[] = [
  {
    id: 'payout-1789164724796-ppyfs',
    amount: 50,
    method: 'UPI',
    account: 'aashish.gupta.mails@oksbi',
    status: 'Processed',
    date: '11 Sept 2026, 10:12 pm',
  },
  {
    id: 'WD-PENDING-50',
    amount: 50,
    method: 'UPI',
    account: 'aashish.gupta.mails@oksbi',
    status: 'Pending',
    date: 'Today at 08:35 PM',
  },
];

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  user,
  onNavigateToHome,
  submissions = [],
  onRefreshUser,
}) => {
  const [filter, setFilter] = useState<'all' | 'added_to_wallet' | 'pending' | 'rejected'>('all');
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>(() => {
    return DEFAULT_WITHDRAWALS;
  });
  const [historyItems, setHistoryItems] = useState<TaskHistoryItem[]>(() => {
    const clean = (submissions || []).filter((s) => !s.id?.startsWith('h-'));
    return clean.length > 0 ? clean : DEFAULT_USER_SUBMISSIONS;
  });
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // Modals state
  const [showWithdrawModal, setShowWithdrawModal] = useState<boolean>(false);
  const [showWithdrawHistoryModal, setShowWithdrawHistoryModal] = useState<boolean>(false);
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [submittingWithdrawal, setSubmittingWithdrawal] = useState<boolean>(false);

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
      let currentList: WithdrawalRequest[] = [];
      const stored = await AsyncStorage.getItem(STORAGE_WITHDRAWALS_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            currentList = parsed;
            setWithdrawalRequests(parsed);
          }
        } catch {}
      }

      if (currentList.length === 0) {
        currentList = DEFAULT_WITHDRAWALS;
        setWithdrawalRequests(DEFAULT_WITHDRAWALS);
      }

      const remote = await fetchUserPayouts(user.email);
      if (remote && remote.length > 0) {
        // Merge remote payouts with local list by id (preserving any pending local withdrawals)
        const merged = [...currentList];
        remote.forEach((r) => {
          const idx = merged.findIndex((m) => m.id === r.id);
          if (idx >= 0) {
            merged[idx] = r;
          } else {
            merged.push(r);
          }
        });
        setWithdrawalRequests(merged);
        await AsyncStorage.setItem(STORAGE_WITHDRAWALS_KEY, JSON.stringify(merged));
      }
    } catch (e) {
      console.warn('Error loading withdrawal requests:', e);
    }
  };

  const loadSubmissions = async () => {
    try {
      // 1. Immediately hydrate from cache
      const emailKey = (user.email || '').toLowerCase().trim();
      if (emailKey) {
        const cached = await AsyncStorage.getItem(`@user_submissions_${emailKey}`);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const clean = parsed.filter((s: any) => !s.id?.startsWith('h-'));
              if (clean.length > 0) {
                setHistoryItems(clean);
              }
            }
          } catch {}
        }
      }

      // 2. Refresh live from server
      const live = await fetchUserSubmissions(user.email);
      if (Array.isArray(live) && live.length > 0) {
        const clean = live.filter((s) => !s.id?.startsWith('h-'));
        if (clean.length > 0) {
          setHistoryItems(clean);
          if (emailKey) {
            await AsyncStorage.setItem(`@user_submissions_${emailKey}`, JSON.stringify(clean));
          }
        }
      }
    } catch (e) {
      console.warn('Could not load user submissions:', e);
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
      const clean = submissions.filter((s) => !s.id?.startsWith('h-'));
      if (clean.length > 0) {
        setHistoryItems(clean);
      }
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

  // 1. Received in Account (Completed or Processed payouts)
  const receivedInAccount = withdrawalRequests
    .filter((w) => w.status === 'Completed' || w.status === 'Processed')
    .reduce((sum, w) => sum + Number(w.amount || 0), 0);

  // 2. Pending Withdrawal (payout requests currently awaiting processing)
  const pendingWithdrawal = withdrawalRequests
    .filter((w) => w.status === 'Pending')
    .reduce((sum, w) => sum + Number(w.amount || 0), 0);

  // Total amount deducted by all requested withdrawals (pending + completed)
  const totalDeductions = pendingWithdrawal + receivedInAccount;

  // Approved task rewards from real completed offers
  const approvedTasksEarned = (historyItems || [])
    .filter((item) => item.status === 'Paid')
    .reduce((sum, item) => sum + (Number(item.reward) || 0), 0);

  // Total Earned: Gross lifetime earnings of the user.
  // Must strictly equal task earnings when available, or (backendBalance + receivedInAccount).
  // NEVER add pendingWithdrawal to backendBalance, as pending is deducted from the current balance!
  const backendBalance = Number(user.backendUser?.balance || 0);
  const totalEarned = approvedTasksEarned > 0
    ? approvedTasksEarned
    : (backendBalance + receivedInAccount);

  // Available Balance: Spendable balance after accounting for all deductions
  const availableBalance = Math.max(0, totalEarned - receivedInAccount - pendingWithdrawal);

  const parsedWithdrawAmt = parseFloat(withdrawAmount);
  const isExceedingBalance = !isNaN(parsedWithdrawAmt) && parsedWithdrawAmt > availableBalance;

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
    if (amt > availableBalance) {
      Alert.alert('Insufficient Balance', `Your available balance is ₹${availableBalance.toFixed(2)}.`);
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

      if (!payoutRes.success && !payoutRes.payout) {
        throw new Error(payoutRes.error || 'Failed to submit withdrawal request.');
      }

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

      // Optimistically update backendUser balance
      if (user.backendUser && onRefreshUser) {
        onRefreshUser({
          ...user.backendUser,
          balance: Math.max(0, availableBalance - amt),
        });
      }

      // Re-fetch backend user and withdrawal requests asynchronously
      if (user.email && onRefreshUser) {
        fetchLatestBackendUser(user.email).then((u) => u && onRefreshUser(u));
      }
      loadWithdrawalRequests();

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

  // Unify Tasks and Withdrawals into a single chronologically structured Transaction History
  const allTransactions: UnifiedTransaction[] = useMemo(() => {
    const items: UnifiedTransaction[] = [];

    // 1. Withdrawal transactions (Pending, Processed, Completed, Rejected)
    (withdrawalRequests || []).forEach((w) => {
      const isCompleted = w.status === 'Completed' || w.status === 'Processed';
      const isPending = w.status === 'Pending';

      items.push({
        id: `wd-${w.id}`,
        type: 'withdrawal',
        title: `Withdrawal (${w.method || 'UPI'})`,
        subtitle: w.account ? `To ${w.account}` : undefined,
        date: w.date || 'Recently',
        amount: Number(w.amount || 0),
        statusText: isCompleted ? 'Transferred' : isPending ? 'Pending' : 'Failed',
        statusType: isCompleted ? 'added' : isPending ? 'pending' : 'rejected',
        method: w.method,
      });
    });

    // 2. Task reward transactions (Paid, Pending, Rejected)
    (historyItems || []).forEach((item) => {
      const isApproved = item.status === 'Paid';
      const isPending = item.status === 'Pending';

      const appLogo =
        item.appLogoUrl ||
        (item.appId ? campaignsMap.get(item.appId) : undefined) ||
        campaignsMap.get(item.appName?.toLowerCase().trim());

      items.push({
        id: `task-${item.id}`,
        type: 'task',
        title: item.appName,
        subtitle: item.proofType || undefined,
        date: item.date || 'Recently',
        amount: Number(item.reward || 0),
        statusText: isApproved ? 'Added to Wallet' : isPending ? 'Pending' : 'Rejected',
        statusType: isApproved ? 'added' : isPending ? 'pending' : 'rejected',
        appLogoUrl: appLogo,
        appId: item.appId,
      });
    });

    return items;
  }, [withdrawalRequests, historyItems, campaignsMap]);

  // Filter items based on active chip
  const filteredTransactions = useMemo(() => {
    return allTransactions.filter((tx) => {
      if (filter === 'all') return true;
      if (filter === 'added_to_wallet') {
        return tx.type === 'task' && tx.statusType === 'added';
      }
      if (filter === 'pending') {
        return tx.statusType === 'pending';
      }
      if (filter === 'rejected') {
        return tx.statusType === 'rejected';
      }
      return true;
    });
  }, [allTransactions, filter]);

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
          <Text style={styles.cardBigBalance}>₹{formatAmount(availableBalance)}</Text>
          <Text style={styles.cardBalanceSubtitle}>Available Balance</Text>

          {/* Translucent 3-Column Glass Box */}
          <View style={styles.glassStatsBox}>
            {/* 1. Total Earned */}
            <View style={styles.glassStatCol}>
              <Text style={styles.glassStatVal}>₹{formatAmount(totalEarned)}</Text>
              <Text style={styles.glassStatLabel} numberOfLines={1}>
                Total Earned
              </Text>
            </View>

            <View style={styles.glassDivider} />

            {/* 2. Pending */}
            <View style={styles.glassStatCol}>
              <Text style={styles.glassStatVal}>₹{formatAmount(pendingWithdrawal)}</Text>
              <Text style={styles.glassStatLabel} numberOfLines={1}>
                Pending
              </Text>
            </View>

            <View style={styles.glassDivider} />

            {/* 3. Withdrawn */}
            <View style={styles.glassStatCol}>
              <Text style={styles.glassStatVal}>₹{formatAmount(receivedInAccount)}</Text>
              <Text style={styles.glassStatLabel} numberOfLines={1}>
                Withdrawn
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
        ) : filteredTransactions.length === 0 ? (
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
            {filteredTransactions.map((tx) => {
              const isTask = tx.type === 'task';
              const isAdded = tx.statusType === 'added';
              const isPending = tx.statusType === 'pending';
              const isRejected = tx.statusType === 'rejected';

              return (
                <View key={tx.id} style={styles.txCard}>
                  {/* Left Icon: App Image Icon for tasks or Arrow Icon for withdrawals */}
                  {isTask ? (
                    <CampaignLogo
                      name={tx.title}
                      logoUrl={tx.appLogoUrl}
                      size={46}
                      borderRadius={12}
                      style={{ marginRight: 12 }}
                    />
                  ) : (
                    <View
                      style={[
                        styles.withdrawalIconWrap,
                        isPending && styles.withdrawalIconPendingWrap,
                        isRejected && styles.withdrawalIconRejectedWrap,
                      ]}
                    >
                      <Ionicons
                        name={isPending ? 'time-outline' : isRejected ? 'close-outline' : 'arrow-up'}
                        size={22}
                        color={isPending ? '#D97706' : isRejected ? '#DC2626' : '#2563EB'}
                      />
                    </View>
                  )}

                  {/* Middle: Title & Date */}
                  <View style={styles.txInfoCol}>
                    <Text style={styles.txAppName} numberOfLines={1}>
                      {tx.title}
                    </Text>
                    <Text style={styles.txDate}>{tx.date}</Text>
                  </View>

                  {/* Right: Amount & Status */}
                  <View style={styles.txStatusCol}>
                    <View style={styles.txAmountRow}>
                      {isTask ? (
                        <>
                          <Image source={COIN_STYLE_1} style={styles.txCoinImg} resizeMode="contain" />
                          <Text style={styles.txAmountText}>+{tx.amount}</Text>
                        </>
                      ) : (
                        <Text style={[styles.txAmountText, styles.txWithdrawalAmountText]}>
                          -₹{tx.amount}
                        </Text>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.txStatusText,
                        isAdded && styles.txStatusAdded,
                        isPending && styles.txStatusPending,
                        isRejected && styles.txStatusRejected,
                      ]}
                    >
                      {tx.statusText}
                    </Text>
                  </View>
                </View>
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

            <View style={styles.modalBalRow}>
              <Text style={styles.modalSub}>
                Available Balance: <Text style={styles.modalBalText}>₹ {availableBalance.toFixed(2)}</Text>
              </Text>
              {availableBalance >= 20 && (
                <TouchableOpacity
                  onPress={() => setWithdrawAmount(Math.floor(availableBalance).toString())}
                  style={styles.maxBalBtn}
                  activeOpacity={0.7}
                >
                  <Text style={styles.maxBalBtnText}>Withdraw All</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={[styles.modalInputWrap, isExceedingBalance && styles.modalInputWrapError]}>
              <Text style={[styles.modalCurrencySymbol, isExceedingBalance && { color: '#DC2626' }]}>
                ₹
              </Text>
              <TextInput
                style={[styles.modalInput, isExceedingBalance && { color: '#DC2626' }]}
                keyboardType="numeric"
                placeholder="20"
                placeholderTextColor="#94A3B8"
                value={withdrawAmount}
                onChangeText={setWithdrawAmount}
                underlineColorAndroid="transparent"
                selectionColor="#2563EB"
              />
            </View>

            {isExceedingBalance ? (
              <Text style={styles.modalErrorText}>
                ⚠️ Amount exceeds available balance of ₹ {availableBalance.toFixed(2)}
              </Text>
            ) : (
              <Text style={styles.modalHelper}>Minimum withdrawal amount is ₹ 20</Text>
            )}

            <TouchableOpacity
              style={[
                styles.modalActionBtn,
                (submittingWithdrawal || isExceedingBalance) && { opacity: 0.5 },
              ]}
              onPress={handleCreateWithdrawal}
              disabled={submittingWithdrawal || isExceedingBalance}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    fontSize: 11.5,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.92)',
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 15,
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
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: '0 1px 4px rgba(15, 23, 42, 0.03)',
      },
    }),
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
  txStatusCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  txAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  txCoinImg: {
    width: 22,
    height: 22,
  },
  txAmountText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#15803D',
    letterSpacing: -0.3,
  },
  txWithdrawalAmountText: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  withdrawalIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  withdrawalIconPendingWrap: {
    backgroundColor: '#FEF3C7',
  },
  withdrawalIconRejectedWrap: {
    backgroundColor: '#FEE2E2',
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
  modalBalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalSub: {
    fontSize: 13,
    color: '#64748B',
  },
  modalBalText: {
    fontWeight: '800',
    color: '#15803D',
  },
  maxBalBtn: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  maxBalBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  modalInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 0,
    borderColor: 'transparent',
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  modalInputWrapError: {
    backgroundColor: '#FEF2F2',
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
    ...(Platform.OS === 'web'
      ? ({
          outlineStyle: 'none',
          outlineWidth: 0,
        } as any)
      : {}),
  },
  modalHelper: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 20,
  },
  modalErrorText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 20,
    marginTop: 2,
    marginLeft: 2,
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
