import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
} from 'react-native';
import { UserProfile } from '../types/auth';

interface UserProfileCardProps {
  user: UserProfile;
  onSignOut: () => void;
}

export const UserProfileCard: React.FC<UserProfileCardProps> = ({
  user,
  onSignOut,
}) => {
  const [showFullToken, setShowFullToken] = useState(false);
  const [tokenCopiedNotice, setTokenCopiedNotice] = useState(false);

  const initial = user.name ? user.name.charAt(0).toUpperCase() : 'U';
  const hasToken = Boolean(user.idToken);

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      style={styles.scrollView}
    >
      <View style={styles.card}>
        {/* Avatar & Status */}
        <View style={styles.avatarContainer}>
          {user.picture ? (
            <Image source={{ uri: user.picture }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarFallbackText}>{initial}</Text>
            </View>
          )}
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
          </View>
        </View>

        <Text style={styles.userName}>{user.name}</Text>
        <Text style={styles.userEmail}>{user.email}</Text>

        {/* Method Badge */}
        <View style={styles.providerBadge}>
          <Text style={styles.providerBadgeText}>
            {Platform.OS === 'android'
              ? '✓ Native Google Play Services'
              : '✓ Google Session'}
          </Text>
        </View>

        {/* Developer & Auth Inspection Section */}
        <View style={styles.devSection}>
          <View style={styles.devHeaderRow}>
            <Text style={styles.devSectionTitle}>🛠️ Auth & Developer Info</Text>
            <View style={styles.verifiedTag}>
              <Text style={styles.verifiedTagText}>SHA-1 VERIFIED</Text>
            </View>
          </View>

          {/* Login Method Explanation */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Auth Method:</Text>
            <Text style={styles.infoValue}>
              Native Android Google Play Services (Bottom Sheet API)
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Signature Verification:</Text>
            <Text style={styles.infoMonoSmall}>
              SHA-1: E0:BA:0A:07...86:D6 (com.earnbyapps.app)
            </Text>
          </View>

          {/* User ID (Google Subject ID) */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Google User ID (sub):</Text>
            <Text selectable style={styles.infoMono}>
              {user.id || 'N/A'}
            </Text>
          </View>

          {/* ID Token Section */}
          <View style={styles.tokenContainer}>
            <View style={styles.tokenHeaderRow}>
              <Text style={styles.infoLabel}>Google ID Token (JWT):</Text>
              {hasToken && (
                <TouchableOpacity
                  onPress={() => setShowFullToken(!showFullToken)}
                >
                  <Text style={styles.expandToggle}>
                    {showFullToken ? 'Collapse' : 'Expand Full'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {hasToken ? (
              <>
                <Text
                  selectable
                  numberOfLines={showFullToken ? undefined : 3}
                  style={styles.tokenText}
                >
                  {user.idToken}
                </Text>
                <Text style={styles.tokenHelperText}>
                  💡 Long press to copy token. Ready to send to your backend (earnbyapps.com) for verification.
                </Text>
              </>
            ) : (
              <Text style={styles.tokenMissingText}>
                No ID token received (check webClientId configuration).
              </Text>
            )}
          </View>

          {/* Next.js Backend Verification Info */}
          <View style={styles.backendNotice}>
            <Text style={styles.backendNoticeTitle}>🚀 Next.js Backend Integration:</Text>
            <Text style={styles.backendNoticeBody}>
              Send this ID Token in POST request header or body to earnbyapps.com. Your Next.js backend verifies it with google-auth-library to issue session cookies/JWT.
            </Text>
          </View>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.signOutButton}
          onPress={onSignOut}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    width: '100%',
  },
  scrollContent: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#1A237E',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 8px 24px rgba(26, 35, 126, 0.08)',
      },
    }),
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#4285F4',
  },
  avatarFallback: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallbackText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statusBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 3,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
    textAlign: 'center',
  },
  userEmail: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 12,
    textAlign: 'center',
  },
  providerBadge: {
    backgroundColor: '#DCFCE7',
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginBottom: 20,
  },
  providerBadgeText: {
    color: '#15803D',
    fontSize: 12,
    fontWeight: '700',
  },
  devSection: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  devHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 8,
  },
  devSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  verifiedTag: {
    backgroundColor: '#EFF6FF',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  verifiedTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563EB',
    letterSpacing: 0.5,
  },
  infoRow: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#0F172A',
  },
  infoMono: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  infoMonoSmall: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#475569',
  },
  tokenContainer: {
    marginTop: 4,
    marginBottom: 12,
  },
  tokenHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  expandToggle: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '600',
  },
  tokenText: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  tokenHelperText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
    fontStyle: 'italic',
  },
  tokenMissingText: {
    fontSize: 12,
    color: '#EF4444',
    fontStyle: 'italic',
  },
  backendNotice: {
    backgroundColor: '#EFF6FF',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    marginTop: 4,
  },
  backendNoticeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
    marginBottom: 2,
  },
  backendNoticeBody: {
    fontSize: 11,
    color: '#1E40AF',
    lineHeight: 16,
  },
  signOutButton: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
  },
  signOutText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
  },
});
