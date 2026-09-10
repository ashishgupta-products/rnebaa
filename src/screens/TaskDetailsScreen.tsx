import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Campaign, TaskHistoryItem } from '../types/campaign';

interface TaskDetailsScreenProps {
  campaign: Campaign;
  userBalance?: number;
  isAlreadySubmitted?: boolean;
  onBack: () => void;
  onSubmitProof: (item: TaskHistoryItem) => void;
}

export const TaskDetailsScreen: React.FC<TaskDetailsScreenProps> = ({
  campaign,
  userBalance = 0,
  isAlreadySubmitted = false,
  onBack,
  onSubmitProof,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [proofText, setProofText] = useState<string>('');
  const [proofType, setProofType] = useState<string>('Account ID / Username');
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(isAlreadySubmitted);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const initialLetter = campaign.name.charAt(0).toUpperCase();

  const handleCopyCode = (code: string) => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleStartTask = () => {
    setHasStarted(true);
    if (campaign.externalUrl && (campaign.externalUrl.startsWith('http://') || campaign.externalUrl.startsWith('https://'))) {
      Linking.openURL(campaign.externalUrl).catch(() => {});
    }
  };

  const handleSubmit = () => {
    if (!proofText.trim()) {
      setErrorMsg('Please enter your proof details (e.g. registered email or account ID)');
      return;
    }

    setErrorMsg(null);
    const newSubmission: TaskHistoryItem = {
      id: `task-${Date.now()}`,
      appName: campaign.name,
      reward: campaign.reward,
      status: 'Pending',
      date: 'Just now',
      proofType,
    };

    onSubmitProof(newSubmission);
    setSubmitted(true);
  };

  return (
    <View style={styles.container}>
      {/* Top App Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.backButton}
          onPress={onBack}
        >
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Task Details</Text>

        <View style={styles.walletPill}>
          <Ionicons name="wallet-outline" size={14} color="#15803D" />
          <Text style={styles.walletAmount}>₹{userBalance.toFixed(2)}</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Campaign Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.appIconBox}>
              <Text style={styles.appIconText}>{initialLetter}</Text>
            </View>
            <View style={styles.heroInfo}>
              <Text style={styles.appName}>{campaign.name}</Text>
              <Text style={styles.appCategory}>{campaign.category}</Text>
              <View style={styles.platformsRow}>
                {campaign.platforms.map((p) => (
                  <View key={p} style={styles.platformBadge}>
                    <Text style={styles.platformBadgeText}>{p}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.payoutBox}>
            <View>
              <Text style={styles.payoutLabel}>Completion Payout</Text>
              <Text style={styles.payoutAmount}>
                +{campaign.currencySymbol || '₹'}{campaign.reward.toFixed(2)}
              </Text>
            </View>
            <View style={styles.payoutBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#15803D" />
              <Text style={styles.payoutBadgeText}>Verified Reward</Text>
            </View>
          </View>
        </View>

        {/* Referral Code Box (if applicable) */}
        {campaign.referralCode ? (
          <View style={styles.referralCard}>
            <View style={styles.referralHeaderRow}>
              <View style={styles.referralTag}>
                <Ionicons name="gift-outline" size={14} color="#2563EB" />
                <Text style={styles.referralTagText}>REFERRAL CODE</Text>
              </View>
              <Text style={styles.referralHelper}>Use during signup</Text>
            </View>
            <View style={styles.codeRow}>
              <Text selectable style={styles.codeText}>
                {campaign.referralCode}
              </Text>
              <TouchableOpacity
                style={[styles.copyButton, copied && styles.copyButtonActive]}
                onPress={() => handleCopyCode(campaign.referralCode!)}
              >
                <Ionicons
                  name={copied ? 'checkmark' : 'copy-outline'}
                  size={16}
                  color={copied ? '#15803D' : '#2563EB'}
                />
                <Text style={[styles.copyButtonText, copied && styles.copyButtonTextActive]}>
                  {copied ? 'Copied!' : 'Copy Code'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* Step-by-Step Checklist */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>📋 Steps to Earn</Text>
          <View style={styles.stepsList}>
            <View style={styles.stepItem}>
              <View style={styles.stepNumberCircle}>
                <Text style={styles.stepNumber}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Install & Open</Text>
                <Text style={styles.stepDescription}>
                  Click the "Start Task & Launch" button below to open the official application.
                </Text>
              </View>
            </View>

            <View style={styles.stepItem}>
              <View style={styles.stepNumberCircle}>
                <Text style={styles.stepNumber}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Sign Up & Complete Requirements</Text>
                <Text style={styles.stepDescription}>
                  {campaign.description || 'Register your account and perform the required action.'}
                </Text>
              </View>
            </View>

            <View style={styles.stepItem}>
              <View style={styles.stepNumberCircle}>
                <Text style={styles.stepNumber}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Submit Verification Proof</Text>
                <Text style={styles.stepDescription}>
                  Enter your registered username, phone, or account ID below to claim your ₹{campaign.reward.toFixed(2)}.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Task Description & Details */}
        {campaign.longDescription || campaign.description ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionHeading}>ℹ️ Task Description</Text>
            <Text style={styles.bodyDescription}>
              {campaign.longDescription || campaign.description}
            </Text>
          </View>
        ) : null}

        {/* Action Button: Start Task */}
        {!submitted && (
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.primaryActionButton}
            onPress={handleStartTask}
          >
            <Ionicons name="rocket-outline" size={20} color="#FFFFFF" />
            <Text style={styles.primaryActionText}>
              {hasStarted ? 'Reopen Official App 🚀' : 'Start Task & Launch App 🚀'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Submission Form Section */}
        {submitted ? (
          <View style={styles.successCard}>
            <View style={styles.successIconCircle}>
              <Ionicons name="time" size={28} color="#B45309" />
            </View>
            <Text style={styles.successTitle}>Proof Submitted!</Text>
            <Text style={styles.successSubtitle}>
              Your proof is currently awaiting verification. Once verified, ₹{campaign.reward.toFixed(2)} will be credited to your wallet balance.
            </Text>
            <TouchableOpacity
              style={styles.viewHistoryButton}
              onPress={onBack}
            >
              <Text style={styles.viewHistoryButtonText}>Back to Tasks</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.proofCard}>
            <Text style={styles.proofCardTitle}>📤 Submit Task Proof</Text>
            <Text style={styles.proofCardSubtitle}>
              Provide your details so our verification system can confirm your task completion.
            </Text>

            {errorMsg ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            <Text style={styles.inputLabel}>Proof Details (Username / Phone / Account ID):</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Registered Email, User ID, or Phone..."
              placeholderTextColor="#94A3B8"
              value={proofText}
              onChangeText={setProofText}
              autoCapitalize="none"
            />

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.submitButton}
              onPress={handleSubmit}
            >
              <Text style={styles.submitButtonText}>
                Submit Proof for ₹{campaign.reward.toFixed(2)}
              </Text>
            </TouchableOpacity>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  backText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  walletPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  walletAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: '#15803D',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
      },
    }),
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  appIconBox: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  appIconText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#2563EB',
  },
  heroInfo: {
    flex: 1,
  },
  appName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  appCategory: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 6,
  },
  platformsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  platformBadge: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  platformBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  payoutBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  payoutLabel: {
    fontSize: 11,
    color: '#166534',
    fontWeight: '600',
    marginBottom: 2,
  },
  payoutAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: '#15803D',
  },
  payoutBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  payoutBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
  },
  referralCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 14,
  },
  referralHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  referralTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  referralTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563EB',
    letterSpacing: 0.5,
  },
  referralHelper: {
    fontSize: 11,
    color: '#64748B',
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  codeText: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#1E293B',
    letterSpacing: 1,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  copyButtonActive: {
    backgroundColor: '#DCFCE7',
  },
  copyButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  copyButtonTextActive: {
    color: '#15803D',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  stepsList: {
    gap: 14,
  },
  stepItem: {
    flexDirection: 'row',
    gap: 12,
  },
  stepNumberCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepNumber: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  stepDescription: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },
  bodyDescription: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
  },
  primaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
      },
    }),
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  proofCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  proofCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  proofCardSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 14,
    lineHeight: 16,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
    marginBottom: 14,
  },
  submitButton: {
    backgroundColor: '#0F172A',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  successCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  successIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#92400E',
    marginBottom: 6,
  },
  successSubtitle: {
    fontSize: 13,
    color: '#B45309',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  viewHistoryButton: {
    backgroundColor: '#92400E',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  viewHistoryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
