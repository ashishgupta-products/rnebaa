import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Image,
  BackHandler,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { Campaign, TaskHistoryItem } from '../types/campaign';
import { submitTaskProof, uploadProofImageToCloudinary } from '../services/submissionService';
import { CampaignLogo } from '../components/CampaignLogo';

interface TaskDetailsScreenProps {
  campaign: Campaign;
  userBalance?: number;
  userName?: string;
  userEmail?: string;
  isAlreadySubmitted?: boolean;
  onBack: () => void;
  onSubmitProof: (item: TaskHistoryItem) => void;
}

export const TaskDetailsScreen: React.FC<TaskDetailsScreenProps> = ({
  campaign,
  userBalance = 0,
  userName = 'User',
  userEmail = '',
  isAlreadySubmitted = false,
  onBack,
  onSubmitProof,
}) => {
  const [selectedImage, setSelectedImage] = useState<{ uri: string; mimeType?: string; name?: string } | null>(null);
  const [submitted, setSubmitted] = useState<boolean>(isAlreadySubmitted);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [uploadProgressText, setUploadProgressText] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  const handleCopyReferralCode = async () => {
    if (!campaign.referralCode) return;
    try {
      await Clipboard.setStringAsync(campaign.referralCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (e) {
      console.warn('Could not copy referral code:', e);
    }
  };

  // Hardware back button handler for Android
  useEffect(() => {
    const handleBackPress = () => {
      onBack();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => sub.remove();
  }, [onBack]);

  const handleFollowLink = () => {
    if (campaign.externalUrl && (campaign.externalUrl.startsWith('http://') || campaign.externalUrl.startsWith('https://'))) {
      Linking.openURL(campaign.externalUrl).catch(() => {});
    }
  };

  const handlePickFile = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        setErrorMsg('Gallery permission is needed to attach proof media.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedImage({
          uri: asset.uri,
          mimeType: asset.mimeType || 'image/jpeg',
          name: asset.fileName || 'proof_media.jpg',
        });
        setErrorMsg(null);
      }
    } catch (err) {
      console.warn('Media picker error:', err);
      setErrorMsg('Could not open file picker.');
    }
  };

  const handleSubmit = async () => {
    if (!selectedImage) {
      setErrorMsg('Please upload your completion proof media before submitting.');
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);
    setUploadProgressText('Uploading media to Cloudinary...');

    try {
      let uploadedUrl: string | undefined = undefined;
      let uploadedPublicId: string = 'media_proof';

      // 1. Upload media to Cloudinary
      const uploadRes = await uploadProofImageToCloudinary(
        selectedImage.uri,
        selectedImage.mimeType,
        selectedImage.name
      );

      if (!uploadRes.success || !uploadRes.url) {
        throw new Error(uploadRes.error || 'Failed to upload media to Cloudinary');
      }

      uploadedUrl = uploadRes.url;
      uploadedPublicId = uploadRes.publicId || uploadedPublicId;

      // 2. Submit to backend
      setUploadProgressText('Saving submission...');
      const res = await submitTaskProof({
        userName,
        userEmail,
        appName: campaign.name,
        appId: campaign.id,
        reward: campaign.reward,
        proof: uploadedPublicId,
        proofType: 'image',
        proofUrl: uploadedUrl,
        appLogoUrl: campaign.logoUrl,
      });

      if (res.success && res.item) {
        onSubmitProof(res.item);
        setSubmitted(true);
      } else {
        setErrorMsg(res.error || 'Could not submit proof. Please try again.');
      }
    } catch (err: any) {
      console.error('Submission error:', err);
      setErrorMsg(err.message || 'Submission failed. Please check network and try again.');
    } finally {
      setIsSubmitting(false);
      setUploadProgressText('');
    }
  };

  // Build bullets from campaign description or default structured steps
  const getBullets = (): string[] => {
    if (campaign.description && campaign.description.trim().length > 0) {
      const lines = campaign.description
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      if (lines.length > 1) {
        return lines.map((l) => (l.startsWith('•') || l.startsWith('-') ? l.replace(/^[-•]\s*/, '') : l));
      }
    }
    return [
      `Install the ${campaign.name} App`,
      'Complete the registration and required actions as described.',
      'Come back to this App and upload the screenshot.',
      'Get paid in 24 hours',
    ];
  };

  const bullets = getBullets();

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Offers Details</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Main Hero Card (Exact replica of screenshot) */}
        <View style={styles.heroCard}>
          {/* Top-Right Ribbon Badge */}
          <View style={styles.ribbonBadge}>
            <Text style={styles.ribbonText}>Offer</Text>
          </View>

          <View style={styles.heroMainRow}>
            {/* Left Column: Logo & App Name directly below */}
            <View style={styles.heroLeftCol}>
              <View style={styles.logoWrapper}>
                <CampaignLogo
                  name={campaign.name}
                  logoUrl={campaign.logoUrl}
                  size={52}
                  borderRadius={14}
                />
              </View>
              <Text style={styles.appName}>
                {campaign.name}
              </Text>
            </View>

            {/* Right Column: Layered Gold Coin Graphic (Exact 1:1 match to screenshot) */}
            <View style={styles.coinWrapper}>
              <View style={styles.coinBackRim} />
              <View style={styles.coinOuterRing}>
                <View style={styles.coinInnerDisc}>
                  <Text
                    style={[
                      styles.coinText,
                      {
                        fontSize:
                          String(campaign.reward || '').length >= 4
                            ? 13
                            : String(campaign.reward || '').length >= 3
                            ? 16
                            : 21,
                      },
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                  >
                    ₹{campaign.reward}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* How to Avail Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeading}>How to Avail</Text>
          <View style={styles.bulletsList}>
            {bullets.map((b, idx) => (
              <View key={idx} style={styles.bulletRow}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>{b}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Optional Referral / Invite Code Box */}
        {campaign.referralCode ? (
          <View style={styles.referralCard}>
            <View style={styles.referralHeader}>
              <View style={styles.referralTag}>
                <Ionicons name="gift" size={13} color="#2563EB" />
                <Text style={styles.referralTagText}>Referral Code</Text>
              </View>
              <Text style={styles.referralHint}>Tap to copy & use during signup</Text>
            </View>

            <View style={styles.referralActionRow}>
              <View style={styles.codePill}>
                <Text style={styles.codeText} selectable>
                  {campaign.referralCode}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.copyButton, copiedCode && styles.copiedButton]}
                onPress={handleCopyReferralCode}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={copiedCode ? 'checkmark-circle' : 'copy-outline'}
                  size={16}
                  color={copiedCode ? '#059669' : '#2563EB'}
                />
                <Text style={[styles.copyButtonText, copiedCode && styles.copiedButtonText]}>
                  {copiedCode ? 'Copied!' : 'Copy'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* Action Button ("Launch Task") */}
        <TouchableOpacity
          style={styles.actionOutlineButton}
          onPress={handleFollowLink}
          activeOpacity={0.8}
        >
          <Text style={styles.actionOutlineText}>Launch Task</Text>
        </TouchableOpacity>

        {/* Upload Media Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeading}>Upload Media</Text>

          {selectedImage ? (
            <View style={styles.previewBox}>
              <Image
                source={{ uri: selectedImage.uri }}
                style={styles.previewImg}
                resizeMode="cover"
              />
              <View style={styles.previewMeta}>
                <Text style={styles.previewFileName} numberOfLines={1}>
                  {selectedImage.name || 'Proof Media Attached'}
                </Text>
                <Text style={styles.previewStatus}>Ready to submit</Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedImage(null)}
                style={styles.removeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.uploadBox}
              onPress={handlePickFile}
              activeOpacity={0.7}
            >
              <View style={styles.uploadIconWrap}>
                <Ionicons name="arrow-up" size={20} color="#0F172A" />
                <View style={styles.uploadTrayLine} />
              </View>
              <Text style={styles.uploadTitle}>Choose File To Upload</Text>
              <Text style={styles.uploadSubtitle}>
                (Supports MP4, JPG, PNG and JPEG up to 20MB)
              </Text>
            </TouchableOpacity>
          )}

          {errorMsg && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color="#DC2626" />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}
        </View>

        {/* Submit Action Button */}
        {submitted ? (
          <View style={styles.successBox}>
            <Ionicons name="checkmark-circle" size={26} color="#15803D" />
            <Text style={styles.successTitle}>Proof Submitted Successfully!</Text>
            <Text style={styles.successSub}>
              Your proof is in verification. You will be credited ₹ {campaign.reward} upon confirmation.
            </Text>
            <TouchableOpacity style={styles.backToOffersBtn} onPress={onBack}>
              <Text style={styles.backToOffersText}>Return to Offers</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.submitButtonText}>
                  {uploadProgressText || 'Submitting...'}
                </Text>
              </View>
            ) : (
              <Text style={styles.submitButtonText}>Submit</Text>
            )}
          </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 4,
    marginRight: 14,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: '#EEF4FF',
    borderRadius: 22,
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
    marginTop: 4,
  },
  ribbonBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#354C96',
    paddingVertical: 5,
    paddingHorizontal: 22,
    borderTopRightRadius: 22,
    borderBottomLeftRadius: 16,
  },
  ribbonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  heroMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 4,
  },
  heroLeftCol: {
    flex: 1,
    paddingRight: 14,
  },
  logoWrapper: {
    width: 62,
    height: 62,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 14,
  },
  appName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 26,
    letterSpacing: -0.3,
  },

  /* Exact 3D layered gold coin from cropped screenshot */
  coinWrapper: {
    width: 80,
    height: 76,
    position: 'relative',
    justifyContent: 'center',
    marginBottom: 4,
  },
  coinBackRim: {
    position: 'absolute',
    left: 1,
    top: 1,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E58A00', // Deep amber 3D rim visible on the top-left
  },
  coinOuterRing: {
    position: 'absolute',
    left: 6,
    top: 3,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FDE047', // Light creamy yellow outer ring
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinInnerDisc: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EAA812', // Rich golden amber inner circular face
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinText: {
    fontWeight: '900',
    color: '#000000',
    textAlign: 'center',
    letterSpacing: -0.5,
  },

  /* How to Avail Section */
  sectionContainer: {
    marginTop: 22,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  bulletsList: {
    gap: 4,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 3,
  },
  bulletDot: {
    fontSize: 18,
    color: '#0F172A',
    lineHeight: 22,
    marginRight: 8,
    marginTop: -1,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
    lineHeight: 22,
    fontWeight: '400',
  },

  /* Referral Code Card */
  referralCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 14,
    marginTop: 18,
  },
  referralHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  referralTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  referralTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  referralHint: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  referralActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  codePill: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 1.5,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  copiedButton: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  copyButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  copiedButtonText: {
    color: '#059669',
  },

  /* Action Button ("Install this app") */
  actionOutlineButton: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1.5,
    borderColor: '#4361EE',
    borderRadius: 12,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  actionOutlineText: {
    color: '#4361EE',
    fontSize: 16,
    fontWeight: '600',
  },

  /* Upload Box */
  uploadBox: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1.5,
    borderColor: '#4361EE',
    borderRadius: 14,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadIconWrap: {
    width: 28,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  uploadTrayLine: {
    width: 20,
    height: 2,
    backgroundColor: '#0F172A',
    borderRadius: 1,
    marginTop: 2,
  },
  uploadTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  uploadSubtitle: {
    fontSize: 11,
    color: '#475569',
    marginTop: 4,
  },

  previewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  previewImg: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  previewMeta: {
    flex: 1,
    marginLeft: 12,
  },
  previewFileName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  previewStatus: {
    fontSize: 12,
    color: '#15803D',
    fontWeight: '600',
    marginTop: 2,
  },
  removeBtn: {
    padding: 4,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
    flex: 1,
  },

  /* Submit Button */
  submitButton: {
    backgroundColor: '#4361EE',
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 36,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  successBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginTop: 22,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#15803D',
    marginTop: 6,
  },
  successSub: {
    fontSize: 13,
    color: '#166534',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  backToOffersBtn: {
    marginTop: 14,
    backgroundColor: '#15803D',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  backToOffersText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
