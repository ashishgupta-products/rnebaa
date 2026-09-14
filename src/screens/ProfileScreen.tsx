import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
  BackHandler,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserProfile } from '../types/auth';
import { updateUserProfileDetails } from '../services/authService';

interface ProfileScreenProps {
  user: UserProfile;
  onSignOut: () => void;
  onUpdateUser?: (updated: UserProfile) => void;
  onRequestEdit?: boolean;
  isActive?: boolean;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  user,
  onSignOut,
  onUpdateUser,
  onRequestEdit = false,
  isActive = true,
}) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [isDirty, setIsDirty] = useState<boolean>(false);

  const resolveUpiNumber = (val?: string, fallbackPhone?: string) => {
    if (val && /^\d{10}$/.test(val.trim())) return val.trim();
    if (fallbackPhone) {
      const digits = fallbackPhone.replace(/\D/g, '');
      if (digits.length >= 10) return digits.slice(-10);
    }
    return '';
  };

  const resolveGender = (rawGender?: string, userId?: string) => {
    if (!rawGender) return '';
    if (userId === 'demo-user-id' && rawGender.toLowerCase() === 'male') return '';
    return rawGender;
  };

  // Form states
  const [fullName, setFullName] = useState<string>(user.name || '');
  const [email, setEmail] = useState<string>(user.email || '');
  const [upiId, setUpiId] = useState<string>(resolveUpiNumber(user.upiId, user.phoneNumber));
  const [phone, setPhone] = useState<string>(user.phoneNumber || '');
  const [gender, setGender] = useState<string>(resolveGender(user.gender, user.id));
  const [bankName, setBankName] = useState<string>(user.bankAccountName || '');
  const [bankAccountNumber, setBankAccountNumber] = useState<string>(user.bankAccountNumber || '');
  const [bankIfsc, setBankIfsc] = useState<string>(user.bankIfscCode || '');

  // Dropdown states
  const [isGenderOpen, setIsGenderOpen] = useState<boolean>(false);

  // Sync state if user prop changes
  useEffect(() => {
    setFullName(user.name || '');
    setEmail(user.email || '');
    setUpiId(resolveUpiNumber(user.upiId, user.phoneNumber));
    setPhone(user.phoneNumber || '');
    setGender(resolveGender(user.gender, user.id));
    setBankName(user.bankAccountName || '');
    setBankAccountNumber(user.bankAccountNumber || '');
    setBankIfsc(user.bankIfscCode || '');
    setIsGenderOpen(false);
    setIsDirty(false);
  }, [user]);

  const markDirty = () => {
    if (!isDirty) setIsDirty(true);
  };

  const handleCancel = () => {
    // Reset to user values
    setFullName(user.name || '');
    setEmail(user.email || '');
    setUpiId(resolveUpiNumber(user.upiId, user.phoneNumber));
    setPhone(user.phoneNumber || '');
    setGender(resolveGender(user.gender, user.id));
    setBankName(user.bankAccountName || '');
    setBankAccountNumber(user.bankAccountNumber || '');
    setBankIfsc(user.bankIfscCode || '');
    setIsGenderOpen(false);
    setIsDirty(false);
    setIsEditing(false);
  };

  // Intercept Android hardware back button / back swipe when in Edit mode
  useEffect(() => {
    if (!isEditing || !isActive) return;

    const onBackPress = () => {
      handleCancel();
      return true; // Consume back event, exit edit mode and stay on Profile tab
    };

    const backSubscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backSubscription.remove();
  }, [isEditing, isActive]);

  // If user navigates away to another bottom tab while in edit mode, reset back to view mode
  useEffect(() => {
    if (!isActive && isEditing) {
      handleCancel();
    }
  }, [isActive]);

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Validation Error', 'Full Name is required.');
      return;
    }
    const cleanUpiNumber = upiId.replace(/\D/g, '');
    if (!cleanUpiNumber || cleanUpiNumber.length !== 10) {
      Alert.alert('Validation Error', 'Please enter a valid 10-digit UPI linked phone number not upi id');
      return;
    }

    setSaving(true);
    try {
      const updated = await updateUserProfileDetails({
        name: fullName.trim(),
        email: email.trim(),
        upiId: cleanUpiNumber,
        phoneNumber: cleanUpiNumber,
        gender: gender.trim(),
        bankAccountName: bankName.trim(),
        bankAccountNumber: bankAccountNumber.trim(),
        bankIfscCode: bankIfsc.trim().toUpperCase(),
      });

      if (updated && onUpdateUser) {
        onUpdateUser(updated);
      }
      setIsDirty(false);
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {isEditing ? (
        <View style={styles.editHeader}>
          <TouchableOpacity
            onPress={handleCancel}
            style={styles.backButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.editHeaderTitle}>Edit Profile</Text>
          {isDirty ? (
            <View style={styles.unsavedBadge}>
              <Text style={styles.unsavedBadgeText}>Unsaved</Text>
            </View>
          ) : (
            <View style={{ width: 60 }} />
          )}
        </View>
      ) : (
        /* Fixed Top Brand Header (stays pinned while profile scrolls) */
        <View style={styles.brandHeroContainer}>
          <View style={styles.brandHeroRow}>
            <Text style={styles.brandHeroBlue}>EarnBy</Text>
            <Text style={styles.brandHeroAmber}>Apps</Text>
          </View>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {isEditing ? (
          /* ================= EDIT PROFILE VIEW (Screenshots 3 & 5) ================= */
          <View style={styles.editContainer}>
            {/* Banner Card */}
            <View style={styles.bannerCard}>
              <View style={styles.editAvatarWrapper}>
                {user.picture ? (
                  <Image source={{ uri: user.picture }} style={styles.editAvatar} />
                ) : (
                  <View style={styles.editAvatarFallback}>
                    <Text style={styles.avatarFallbackText}>
                      {(fullName || user.name || 'U').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.bannerTitle}>Update Your Profile</Text>
              <Text style={styles.bannerSubtitle}>
                Keep your information up to date for better experience
              </Text>
            </View>

            {/* Form Fields */}
            <View style={styles.formCard}>
              {/* Full Name Field (Read Only) */}
              <View style={styles.formField}>
                <View style={styles.fieldLabelRow}>
                  <Ionicons name="person-outline" size={17} color="#4361EE" style={styles.fieldIcon} />
                  <Text style={styles.fieldLabel}>Full Name</Text>
                </View>
                <TextInput
                  value={fullName}
                  editable={false}
                  placeholder="Full name"
                  placeholderTextColor="#94A3B8"
                  underlineColorAndroid="transparent"
                  selectionColor="#4361EE"
                  style={[styles.input, styles.readOnlyInput]}
                />
              </View>

              {/* Email Address Field */}
              <View style={styles.formField}>
                <View style={styles.fieldLabelRow}>
                  <Ionicons name="mail-outline" size={17} color="#4361EE" style={styles.fieldIcon} />
                  <Text style={styles.fieldLabel}>Email Address</Text>
                </View>
                <TextInput
                  value={email}
                  editable={false}
                  placeholder="Enter email address"
                  placeholderTextColor="#94A3B8"
                  underlineColorAndroid="transparent"
                  selectionColor="#4361EE"
                  style={[styles.input, styles.readOnlyInput]}
                />
              </View>


              {/* UPI Linked Phone Number to receive Payment Field */}
              <View style={styles.formField}>
                <View style={styles.fieldLabelRow}>
                  <Ionicons name="wallet-outline" size={17} color="#4361EE" style={styles.fieldIcon} />
                  <Text style={styles.fieldLabel}>UPI Linked Phone Number to receive Payment</Text>
                  <Text style={styles.asterisk}> *</Text>
                </View>
                <TextInput
                  value={upiId}
                  onChangeText={(text) => {
                    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 10);
                    setUpiId(cleaned);
                    markDirty();
                  }}
                  placeholder="Enter 10-digit UPI linked phone number not upi id"
                  placeholderTextColor="#94A3B8"
                  keyboardType="number-pad"
                  maxLength={10}
                  underlineColorAndroid="transparent"
                  selectionColor="#4361EE"
                  style={styles.input}
                />
                <Text style={styles.fieldHelperText}>
                  Please enter a valid 10-digit UPI linked phone number not upi id
                </Text>
              </View>

              {/* Bank Account Name Field */}
              <View style={styles.formField}>
                <View style={styles.fieldLabelRow}>
                  <Ionicons name="business-outline" size={17} color="#4361EE" style={styles.fieldIcon} />
                  <Text style={styles.fieldLabel}>Bank Account Name</Text>
                </View>
                <TextInput
                  value={bankName}
                  onChangeText={(text) => {
                    setBankName(text);
                    markDirty();
                  }}
                  placeholder="Enter your bank account name (optional)"
                  placeholderTextColor="#94A3B8"
                  underlineColorAndroid="transparent"
                  selectionColor="#4361EE"
                  style={styles.input}
                />
              </View>

              {/* Bank Account Number Field */}
              <View style={styles.formField}>
                <View style={styles.fieldLabelRow}>
                  <View style={styles.hashIconBox}>
                    <Text style={styles.hashIconText}>#</Text>
                  </View>
                  <Text style={styles.fieldLabel}>Bank Account Number</Text>
                </View>
                <TextInput
                  value={bankAccountNumber}
                  onChangeText={(text) => {
                    setBankAccountNumber(text);
                    markDirty();
                  }}
                  placeholder="Enter your bank account number (optional)"
                  placeholderTextColor="#94A3B8"
                  keyboardType="number-pad"
                  underlineColorAndroid="transparent"
                  selectionColor="#4361EE"
                  style={styles.input}
                />
              </View>

              {/* Bank IFSC Code Field */}
              <View style={styles.formField}>
                <View style={styles.fieldLabelRow}>
                  <Ionicons name="qr-code-outline" size={17} color="#4361EE" style={styles.fieldIcon} />
                  <Text style={styles.fieldLabel}>Bank IFSC Code</Text>
                </View>
                <TextInput
                  value={bankIfsc}
                  onChangeText={(text) => {
                    setBankIfsc(text.toUpperCase());
                    markDirty();
                  }}
                  placeholder="Enter your bank IFSC code (optional)"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="characters"
                  underlineColorAndroid="transparent"
                  selectionColor="#4361EE"
                  style={styles.input}
                />
              </View>

              {/* Gender Field */}
              <View style={styles.formField}>
                <View style={styles.fieldLabelRow}>
                  <Ionicons name="man-outline" size={17} color="#4361EE" style={styles.fieldIcon} />
                  <Text style={styles.fieldLabel}>Gender</Text>
                </View>
                <TouchableOpacity
                  style={[styles.dropdownButton, isGenderOpen && styles.dropdownButtonActive]}
                  onPress={() => setIsGenderOpen(!isGenderOpen)}
                  activeOpacity={0.8}
                >
                  <Text style={gender ? styles.dropdownValue : styles.dropdownPlaceholder}>
                    {gender ? gender.charAt(0).toUpperCase() + gender.slice(1) : 'Select Gender'}
                  </Text>
                  <Ionicons
                    name={isGenderOpen ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={isGenderOpen ? '#4361EE' : '#64748B'}
                  />
                </TouchableOpacity>

                {/* Inline Dropdown Options */}
                {isGenderOpen && (
                  <View style={styles.dropdownMenu}>
                    {['Male', 'Female', 'Other'].map((item, index) => {
                      const isSelected = gender.toLowerCase() === item.toLowerCase();
                      const isLast = index === 2;
                      return (
                        <TouchableOpacity
                          key={item}
                          style={[
                            styles.dropdownItem,
                            isSelected && styles.dropdownItemSelected,
                            isLast && { borderBottomWidth: 0 },
                          ]}
                          onPress={() => {
                            setGender(item.toLowerCase());
                            markDirty();
                            setIsGenderOpen(false);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.dropdownItemText,
                              isSelected && styles.dropdownItemTextSelected,
                            ]}
                          >
                            {item}
                          </Text>
                          {isSelected && <Ionicons name="checkmark" size={18} color="#4361EE" />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            </View>

            {/* Save Changes Button */}
            <TouchableOpacity
              style={[styles.saveButton, saving && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity
              style={styles.cancelEditButton}
              onPress={handleCancel}
              activeOpacity={0.7}
              disabled={saving}
            >
              <Text style={styles.cancelEditButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* ================= VIEW PROFILE (Screenshots 1 & 4) ================= */
          <View style={styles.profileViewContainer}>
            {/* User Profile Avatar & Identity Header */}
            <View style={styles.userHeaderContainer}>
              <View style={styles.avatarWrapper}>
                {user.picture ? (
                  <Image source={{ uri: user.picture }} style={styles.userAvatar} />
                ) : (
                  <View style={styles.userAvatarFallback}>
                    <Text style={styles.avatarFallbackText}>
                      {(fullName || user.name || 'U').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.activeStatusDot} />
              </View>
            </View>

            {/* 1. Full Name Card */}
            <View style={styles.infoCard}>
              <View style={styles.iconBox}>
                <Ionicons name="person-outline" size={18} color="#4361EE" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Full Name</Text>
                <Text style={styles.infoValue}>{fullName || user.name || 'User'}</Text>
              </View>
            </View>

            {/* 2. Email Address Card */}
            <View style={styles.infoCard}>
              <View style={styles.iconBox}>
                <Ionicons name="mail-outline" size={18} color="#4361EE" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email Address</Text>
                <Text style={styles.infoValue}>{email || user.email || 'Email not set'}</Text>
              </View>
            </View>


            {/* 3. UPI Linked Phone Number to receive Payment Card */}
            <View style={styles.infoCard}>
              <View style={styles.iconBox}>
                <Ionicons name="wallet-outline" size={18} color="#4361EE" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>UPI Linked Phone Number to receive Payment</Text>
                <Text style={styles.infoValue}>{upiId || '10-digit UPI Phone Number not set'}</Text>
              </View>
            </View>

            {/* 5. Bank Account Name Card */}
            <View style={styles.infoCard}>
              <View style={styles.iconBox}>
                <Ionicons name="business-outline" size={18} color="#4361EE" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Bank Account Name</Text>
                <Text style={[styles.infoValue, !bankName && styles.unsetPlaceholder]}>
                  {bankName || 'Bank Account Name not set'}
                </Text>
              </View>
            </View>

            {/* Bank Account Number Card */}
            <View style={styles.infoCard}>
              <View style={styles.iconBox}>
                <Text style={styles.hashCardIcon}>#</Text>
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Bank Account Number</Text>
                <Text style={[styles.infoValue, !bankAccountNumber && styles.unsetPlaceholder]}>
                  {bankAccountNumber || 'Bank Account Number not set'}
                </Text>
              </View>
            </View>

            {/* Bank IFSC Code Card */}
            <View style={styles.infoCard}>
              <View style={styles.iconBox}>
                <Ionicons name="qr-code-outline" size={18} color="#4361EE" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Bank IFSC Code</Text>
                <Text style={[styles.infoValue, !bankIfsc && styles.unsetPlaceholder]}>
                  {bankIfsc || 'Bank IFSC Code not set'}
                </Text>
              </View>
            </View>

            {/* 6. Gender Card */}
            <View style={styles.infoCard}>
              <View style={styles.iconBox}>
                <Ionicons name="man-outline" size={18} color="#4361EE" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Gender</Text>
                <Text style={[styles.infoValue, !gender && styles.unsetPlaceholder]}>
                  {gender ? gender.charAt(0).toUpperCase() + gender.slice(1) : 'Gender not set'}
                </Text>
              </View>
            </View>

            {/* Edit Profile Action Button */}
            <TouchableOpacity
              style={styles.editProfileButton}
              onPress={() => setIsEditing(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="pencil" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.editProfileButtonText}>Edit Profile</Text>
            </TouchableOpacity>

            {/* Logout Option */}
            <TouchableOpacity
              style={styles.signOutButton}
              onPress={onSignOut}
              activeOpacity={0.85}
            >
              <Ionicons name="log-out-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.signOutButtonText}>Logout</Text>
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
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },

  /* Unboxed Brand Hero */
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

  /* Edit Header */
  editHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  editHeaderTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
  },
  unsavedBadge: {
    backgroundColor: '#F59E0B',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  unsavedBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  /* Profile View */
  profileViewContainer: {
    paddingTop: 8,
  },
  /* Profile Avatar Header */
  userHeaderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    paddingBottom: 14,
  },
  avatarWrapper: {
    position: 'relative',
  },
  userAvatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 3,
    borderColor: '#4361EE',
    backgroundColor: '#EFF6FF',
  },
  userAvatarFallback: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: '#4361EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  activeStatusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#10B981',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  profileHeaderName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
    marginBottom: 3,
  },
  profileHeaderEmail: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  miniAvatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
  },
  editAvatarWrapper: {
    marginBottom: 12,
  },
  editAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EFF6FF',
  },
  editAvatarFallback: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#4361EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginRight: 6,
  },
  screenHeading: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
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
        elevation: 1.5,
      },
      web: {
        boxShadow: '0 1px 4px rgba(15, 23, 42, 0.04)',
      },
    }),
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  hashCardIcon: {
    fontSize: 18,
    fontWeight: '800',
    color: '#4361EE',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  unsetPlaceholder: {
    color: '#94A3B8',
    fontWeight: '400',
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 16,
    height: 52,
    marginTop: 10,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.28,
        shadowRadius: 10,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
      },
    }),
  },
  editProfileButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    borderRadius: 16,
    height: 52,
    marginTop: 4,
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#DC2626',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.22,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)',
      },
    }),
  },
  signOutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  /* Edit View Form */
  editContainer: {
    paddingTop: 16,
  },
  bannerCard: {
    backgroundColor: '#5C6BC0',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 18,
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
    textAlign: 'center',
  },
  bannerSubtitle: {
    fontSize: 13,
    color: '#E0E7FF',
    textAlign: 'center',
    lineHeight: 18,
  },
  formCard: {
    marginBottom: 16,
  },
  formField: {
    marginBottom: 16,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldIcon: {
    marginRight: 6,
  },
  hashIconBox: {
    width: 17,
    alignItems: 'center',
    marginRight: 6,
  },
  hashIconText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#4361EE',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  asterisk: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '700',
  },
  fieldHelperText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 6,
    marginLeft: 4,
    lineHeight: 16,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 0,
    borderColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 14,
    color: '#0F172A',
    ...(Platform.OS === 'web'
      ? ({
          outlineStyle: 'none',
          outlineWidth: 0,
        } as any)
      : {}),
  },
  readOnlyInput: {
    backgroundColor: '#F1F5F9',
    color: '#64748B',
    borderWidth: 0,
    borderColor: 'transparent',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 0,
    borderColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  dropdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  dropdownPlaceholder: {
    fontSize: 14,
    color: '#94A3B8',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 16,
    height: 52,
    marginTop: 10,
    marginBottom: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.28,
        shadowRadius: 10,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
      },
    }),
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  cancelEditButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginBottom: 24,
  },
  cancelEditButtonText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },

  /* Dropdown Menu */
  dropdownButtonActive: {
    backgroundColor: '#EFF6FF',
    borderWidth: 0,
    borderColor: 'transparent',
  },
  dropdownMenu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginTop: 6,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 4px 14px rgba(15, 23, 42, 0.08)',
      },
    }),
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownItemSelected: {
    backgroundColor: '#EFF6FF',
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  dropdownItemTextSelected: {
    color: '#4361EE',
    fontWeight: '700',
  },
});
