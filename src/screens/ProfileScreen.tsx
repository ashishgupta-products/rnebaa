import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserProfile } from '../types/auth';
import { updateUserProfileDetails } from '../services/authService';

interface ProfileScreenProps {
  user: UserProfile;
  onSignOut: () => void;
  onUpdateUser?: (updated: UserProfile) => void;
  onRequestEdit?: boolean;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  user,
  onSignOut,
  onUpdateUser,
}) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [isDirty, setIsDirty] = useState<boolean>(false);

  // Form states
  const [fullName, setFullName] = useState<string>(user.name || 'Ashish Gupta');
  const [email, setEmail] = useState<string>(user.email || 'aashish.gupta.mails@gmail.com');
  const [upiId, setUpiId] = useState<string>(user.upiId || 'aashish.gupta.mails@oksbi');
  const [phone, setPhone] = useState<string>(user.phoneNumber || '8319250462');
  const [gender, setGender] = useState<string>(user.gender || 'male');
  const [bankName, setBankName] = useState<string>(user.bankAccountName || '');
  const [bankAccountNumber, setBankAccountNumber] = useState<string>(user.bankAccountNumber || '');
  const [bankIfsc, setBankIfsc] = useState<string>(user.bankIfscCode || '');

  // Modal states
  const [showGenderPicker, setShowGenderPicker] = useState<boolean>(false);

  // Sync state if user prop changes
  useEffect(() => {
    setFullName(user.name || 'Ashish Gupta');
    setEmail(user.email || 'aashish.gupta.mails@gmail.com');
    setUpiId(user.upiId || 'aashish.gupta.mails@oksbi');
    setPhone(user.phoneNumber || '8319250462');
    setGender(user.gender || 'male');
    setBankName(user.bankAccountName || '');
    setBankAccountNumber(user.bankAccountNumber || '');
    setBankIfsc(user.bankIfscCode || '');
    setIsDirty(false);
  }, [user]);

  const markDirty = () => {
    if (!isDirty) setIsDirty(true);
  };

  const handleCancel = () => {
    // Reset to user values
    setFullName(user.name || 'Ashish Gupta');
    setEmail(user.email || 'aashish.gupta.mails@gmail.com');
    setUpiId(user.upiId || 'aashish.gupta.mails@oksbi');
    setPhone(user.phoneNumber || '8319250462');
    setGender(user.gender || 'male');
    setBankName(user.bankAccountName || '');
    setBankAccountNumber(user.bankAccountNumber || '');
    setBankIfsc(user.bankIfscCode || '');
    setIsDirty(false);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Validation Error', 'Full Name is required.');
      return;
    }
    if (!upiId.trim()) {
      Alert.alert('Validation Error', 'UPI ID is required.');
      return;
    }

    setSaving(true);
    try {
      const updated = await updateUserProfileDetails({
        name: fullName.trim(),
        email: email.trim(),
        upiId: upiId.trim(),
        phoneNumber: phone.trim(),
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
      {/* Top Header only when editing */}
      {isEditing && (
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
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {!isEditing && (
          /* Unboxed Brand Hero without Tagline */
          <View style={styles.brandHeroContainer}>
            <View style={styles.brandHeroRow}>
              <Text style={styles.brandHeroBlue}>EarnBy</Text>
              <Text style={styles.brandHeroAmber}>Apps</Text>
              <Text style={styles.brandHeroArrow}> ↗</Text>
            </View>
          </View>
        )}
        {isEditing ? (
          /* ================= EDIT PROFILE VIEW (Screenshots 3 & 5) ================= */
          <View style={styles.editContainer}>
            {/* Banner Card */}
            <View style={styles.bannerCard}>
              <Text style={styles.bannerTitle}>Update Your Profile</Text>
              <Text style={styles.bannerSubtitle}>
                Keep your information up to date for better experience
              </Text>
            </View>

            {/* Form Fields */}
            <View style={styles.formCard}>
              {/* Full Name Field */}
              <View style={styles.formField}>
                <View style={styles.fieldLabelRow}>
                  <Ionicons name="person-outline" size={17} color="#4361EE" style={styles.fieldIcon} />
                  <Text style={styles.fieldLabel}>Full Name</Text>
                  <Text style={styles.asterisk}> *</Text>
                </View>
                <TextInput
                  value={fullName}
                  onChangeText={(text) => {
                    setFullName(text);
                    markDirty();
                  }}
                  placeholder="Enter full name"
                  placeholderTextColor="#94A3B8"
                  style={styles.input}
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
                  style={[styles.input, styles.readOnlyInput]}
                />
              </View>

              {/* UPI ID Field */}
              <View style={styles.formField}>
                <View style={styles.fieldLabelRow}>
                  <Ionicons name="card-outline" size={17} color="#4361EE" style={styles.fieldIcon} />
                  <Text style={styles.fieldLabel}>UPI ID</Text>
                  <Text style={styles.asterisk}> *</Text>
                </View>
                <TextInput
                  value={upiId}
                  onChangeText={(text) => {
                    setUpiId(text);
                    markDirty();
                  }}
                  placeholder="Enter UPI ID (e.g. name@oksbi)"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                  style={styles.input}
                />
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
                  style={styles.input}
                />
              </View>

              {/* Gender Field */}
              <View style={styles.formField}>
                <View style={styles.fieldLabelRow}>
                  <Ionicons name="person-outline" size={17} color="#4361EE" style={styles.fieldIcon} />
                  <Text style={styles.fieldLabel}>Gender</Text>
                </View>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => setShowGenderPicker(true)}
                  activeOpacity={0.8}
                >
                  <Text style={gender ? styles.dropdownValue : styles.dropdownPlaceholder}>
                    {gender ? gender.charAt(0).toUpperCase() + gender.slice(1) : 'Select Gender'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="#64748B" />
                </TouchableOpacity>
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
                  <Ionicons name="save-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          /* ================= VIEW PROFILE (Screenshots 1 & 4) ================= */
          <View style={styles.profileViewContainer}>
            <Text style={styles.screenHeading}>My Profile</Text>

            {/* 1. Full Name Card */}
            <View style={styles.infoCard}>
              <View style={styles.iconBox}>
                <Ionicons name="person-outline" size={18} color="#4361EE" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Full Name</Text>
                <Text style={styles.infoValue}>{fullName || user.name || 'Ashish Gupta'}</Text>
              </View>
            </View>

            {/* 2. Email Address Card */}
            <View style={styles.infoCard}>
              <View style={styles.iconBox}>
                <Ionicons name="mail-outline" size={18} color="#4361EE" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email Address</Text>
                <Text style={styles.infoValue}>{email || user.email || 'aashish.gupta.mails@gmail.com'}</Text>
              </View>
            </View>

            {/* 3. UPI ID Card */}
            <View style={styles.infoCard}>
              <View style={styles.iconBox}>
                <Ionicons name="wallet-outline" size={18} color="#4361EE" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>UPI ID</Text>
                <Text style={styles.infoValue}>{upiId || 'UPI ID not set'}</Text>
              </View>
            </View>

            {/* 4. Phone Number Card */}
            <View style={styles.infoCard}>
              <View style={styles.iconBox}>
                <Ionicons name="call-outline" size={18} color="#4361EE" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Phone Number</Text>
                <Text style={styles.infoValue}>{phone || '8319250462'}</Text>
              </View>
            </View>

            {/* 5. Gender Card */}
            <View style={styles.infoCard}>
              <View style={styles.iconBox}>
                <Ionicons name="man-outline" size={18} color="#4361EE" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Gender</Text>
                <Text style={styles.infoValue}>{gender || 'male'}</Text>
              </View>
            </View>

            {/* 6. Bank Account Name Card */}
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

            {/* 7. Bank Account Number Card */}
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

            {/* 8. Bank IFSC Code Card */}
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

            {/* Edit Profile Action Button */}
            <TouchableOpacity
              style={styles.editProfileButton}
              onPress={() => setIsEditing(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="pencil" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.editProfileButtonText}>Edit Profile</Text>
            </TouchableOpacity>

            {/* Subtle Sign Out Option */}
            <TouchableOpacity
              style={styles.signOutButton}
              onPress={onSignOut}
              activeOpacity={0.8}
            >
              <Ionicons name="log-out-outline" size={16} color="#64748B" style={{ marginRight: 6 }} />
              <Text style={styles.signOutButtonText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Gender Picker Modal */}
      <Modal
        visible={showGenderPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowGenderPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowGenderPicker(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Gender</Text>
              <TouchableOpacity onPress={() => setShowGenderPicker(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>
            {['Male', 'Female', 'Other'].map((item) => {
              const isSelected = gender.toLowerCase() === item.toLowerCase();
              return (
                <TouchableOpacity
                  key={item}
                  style={[styles.modalOption, isSelected && styles.modalOptionSelected]}
                  onPress={() => {
                    setGender(item.toLowerCase());
                    markDirty();
                    setShowGenderPicker(false);
                  }}
                >
                  <Text style={[styles.modalOptionText, isSelected && styles.modalOptionTextSelected]}>
                    {item}
                  </Text>
                  {isSelected && <Ionicons name="checkmark" size={20} color="#4361EE" />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },

  /* Unboxed Brand Hero */
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
    paddingTop: 16,
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
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#4361EE',
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 10,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#4361EE',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 12px rgba(67, 97, 238, 0.3)',
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
    paddingVertical: 12,
    borderRadius: 12,
  },
  signOutButtonText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
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
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
  },
  readOnlyInput: {
    backgroundColor: '#F1F5F9',
    color: '#64748B',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 12,
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
    backgroundColor: '#4361EE',
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 6,
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#4361EE',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 12px rgba(67, 97, 238, 0.3)',
      },
    }),
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
      web: {
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  modalOptionSelected: {
    backgroundColor: '#EFF6FF',
  },
  modalOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
  modalOptionTextSelected: {
    color: '#4361EE',
    fontWeight: '700',
  },
});
