import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Platform,
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
  const initial = user.name ? user.name.charAt(0).toUpperCase() : 'U';

  return (
    <View style={styles.card}>
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

      <View style={styles.providerBadge}>
        <Text style={styles.providerBadgeText}>Signed in with Google</Text>
      </View>

      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.signOutButton}
        onPress={onSignOut}
      >
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: '#ECEFF1',
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
    marginBottom: 16,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    borderColor: '#4285F4',
  },
  avatarFallback: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallbackText: {
    fontSize: 34,
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
    backgroundColor: '#34A853',
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#202124',
    marginBottom: 4,
    textAlign: 'center',
  },
  userEmail: {
    fontSize: 14,
    color: '#5F6368',
    marginBottom: 16,
    textAlign: 'center',
  },
  providerBadge: {
    backgroundColor: '#E8F0FE',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginBottom: 24,
  },
  providerBadgeText: {
    color: '#1A73E8',
    fontSize: 12,
    fontWeight: '600',
  },
  signOutButton: {
    backgroundColor: '#F1F3F4',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 20,
    width: '100%',
    alignItems: 'center',
  },
  signOutText: {
    color: '#3C4043',
    fontSize: 14,
    fontWeight: '600',
  },
});
