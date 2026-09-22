import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, StatusBar, TextInput
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenWrapper from '../../src/components/ScreenWrapper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter, useFocusEffect } from 'expo-router';
import { RootState, AppDispatch } from '../../src/store';
import { logout, updateProfile, updateProfileAndPersist } from '../../src/store/slices/authSlice';
import { tokenStorage } from '../../src/utils/tokenStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SHADOWS, COLORS } from '../../src/theme/theme';
import { showSuccess } from '../../src/store/toastStore';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';
import { Modal, Pressable } from 'react-native';
import { apiService } from '../../src/services/api';
import { ensurePhotosPermission } from '../../src/utils/imagePicker';


export default function PhlebotomistProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((s: RootState) => s.auth.user as any);
  const isEmployee = user?.userType === 'FREELANCER' ? false : !!(
    user?.isEmployee === true ||
    user?.phlebotomistType === 'EMPLOYEE' ||
    user?.userType === 'STAFF' ||
    user?.userType === 'EMPLOYEE' ||
    user?.adminUser ||
    !!(user?.designation && /phlebotomist|collector|phlebo/i.test(user.designation))
  );
  const isFreelancer = !isEmployee;
  const [loggingOut, setLoggingOut] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutFreq, setPayoutFreq] = useState('WEEKLY');
  const [commissionRate, setCommissionRate] = useState('30.0');
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [tempCommission, setTempCommission] = useState('30.0');
  const uploadLockRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      apiService.getMe().then((res: any) => {
        if (res?.user) {
          dispatch(updateProfile(res.user));
        }
      }).catch(() => {});
      if (isFreelancer) {
        apiService.getPartnerEarnings().then((res: any) => {
          if (res?.payoutFrequency) setPayoutFreq(res.payoutFrequency);
          if (res?.commissionRate) setCommissionRate(res.commissionRate.toString());
        }).catch(() => {});
      }
    }, [dispatch, isFreelancer])
  );

  const handleAvatarPress = async () => {
    if (uploadLockRef.current || isUploadingAvatar) return;
    setShowPhotoOptions(true);
  };

  const handlePhotoOptionSelect = async (option: 'camera' | 'gallery') => {
    setShowPhotoOptions(false);
    
    if (option === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      await openCamera(status);
    } else {
      const hasPermission = await ensurePhotosPermission();
      if (!hasPermission) {
        Alert.alert('Permission Required', 'Please allow access to your photo library to upload a profile image.');
        return;
      }
      await openGallery();
    }
  };

  const openCamera = async (cameraStatus: string) => {
    if (cameraStatus !== 'granted') {
      Alert.alert('Permission Required', 'Please allow camera access to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      await processAndUpload(result.assets[0]);
    }
  };

  const openGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      await processAndUpload(result.assets[0]);
    }
  };

  const processAndUpload = async (asset: ImagePicker.ImagePickerAsset) => {
    if (uploadLockRef.current) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const mimeType = asset.mimeType ?? 'image/jpeg';
    const fileSize = asset.fileSize ?? 0;

    if (!allowedTypes.includes(mimeType)) {
      Toast.show({ type: 'error', text1: 'Invalid file type', text2: 'Only JPG, PNG, and WEBP images are supported.' });
      return;
    }

    if (fileSize > 5 * 1024 * 1024) {
      Toast.show({ type: 'error', text1: 'File too large', text2: 'Please choose an image smaller than 5MB.' });
      return;
    }

    const ext = mimeType.split('/')[1] ?? 'jpg';
    const fileName = `avatar_${Date.now()}.${ext}`;

    uploadLockRef.current = true;
    setIsUploadingAvatar(true);

    try {
      const response = await apiService.uploadAvatar(asset.uri, mimeType, fileName);
      await dispatch(updateProfileAndPersist({ avatarUrl: response.avatarUrl }));
      Toast.show({ type: 'success', text1: 'Profile image updated successfully.' });
    } catch (error: any) {
      const message = error?.response?.data?.error ?? 'Failed to upload profile image. Please try again.';
      Toast.show({ type: 'error', text1: 'Upload failed', text2: message });
    } finally {
      setIsUploadingAvatar(false);
      uploadLockRef.current = false;
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out from your Phlebotomist account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setLoggingOut(true);
            try {
              await tokenStorage.deleteItem('token');
              await AsyncStorage.removeItem('user');
              dispatch(logout());
              showSuccess('Logged out successfully');
              router.replace('/onboarding' as any);
            } catch {
              router.replace('/onboarding' as any);
            } finally {
              setLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScreenWrapper scrollable={false} backgroundColor="#F8FAFC">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      {/* Top Header with Safe Area Insets */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 6 }]}>
        <Text style={styles.headerTitle}>Account & Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <TouchableOpacity
            style={styles.avatarWrap}
            onPress={handleAvatarPress}
            disabled={isUploadingAvatar}
            activeOpacity={0.8}
          >
            <View style={styles.avatarLarge}>
              {user?.avatarUrl ? (
                <Image
                  source={{ uri: user.avatarUrl }}
                  style={styles.avatarImage}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <MaterialCommunityIcons name="needle" size={32} color="#006D6F" />
              )}
            </View>
            {isUploadingAvatar ? (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator size="small" color="#fff" />
              </View>
            ) : (
              <View style={styles.editDot}>
                <MaterialCommunityIcons name="camera" size={12} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.profileName}>{user?.name || 'Phlebotomist'}</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.roleBadge, !isFreelancer && { backgroundColor: '#EFF6FF' }]}>
              <Text style={[styles.roleBadgeText, !isFreelancer && { color: '#1D4ED8' }]}>
                {isFreelancer ? 'Freelance Collection Partner (30%)' : 'In-House Staff (Branch Phlebotomist)'}
              </Text>
            </View>
          </View>
          <Text style={styles.mobileText}>{user?.mobile || user?.phone || 'Verified Executive'}</Text>
        </View>

        {/* Commission & Terms Card (Freelancer) vs Staff & Branch Details (Employee) */}
        {isFreelancer ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Partner Terms & Payout</Text>

            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="percent" size={18} color="#059669" />
              <Text style={styles.infoLabel}>Commission Rate</Text>
              <Text style={[styles.infoValue, { color: '#059669', fontWeight: '900' }]}>{commissionRate}% / Test</Text>
            </View>

            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="calendar-sync" size={18} color="#64748B" />
              <Text style={styles.infoLabel}>Payout Frequency</Text>
              <Text style={styles.infoValue}>
                {payoutFreq === 'DAILY' ? 'Daily Transfer' : payoutFreq === 'WEEKLY' ? 'Weekly Transfer' : 'Monthly Transfer'}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="hospital-building" size={18} color="#64748B" />
              <Text style={styles.infoLabel}>Assigned Branch</Text>
              <Text style={styles.infoValue}>
                {user?.branchName || 'Not Assigned'}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Staff & Branch Details</Text>

            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="badge-account-horizontal-outline" size={18} color="#006D6F" />
              <Text style={styles.infoLabel}>Designation</Text>
              <Text style={[styles.infoValue, { color: '#0F172A', fontWeight: '700' }]}>{user?.designation || 'In-House Phlebotomist'}</Text>
            </View>

            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="hospital-building" size={18} color="#64748B" />
              <Text style={styles.infoLabel}>Assigned Branch</Text>
              <Text style={styles.infoValue}>
                {user?.branchName && user.branchName !== user.name ? user.branchName : 'Not Assigned'}
              </Text>
            </View>
          </View>
        )}

        {/* App & Support Shortcuts */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Support & Help</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/support' as any)}
          >
            <MaterialCommunityIcons name="headset" size={20} color="#006D6F" />
            <Text style={styles.menuItemText}>Lab Support & Helpdesk</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/legal/LegalWebView?type=privacy' as any)}
          >
            <MaterialCommunityIcons name="shield-check-outline" size={20} color="#006D6F" />
            <Text style={styles.menuItemText}>Privacy Policy & Terms</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutBtn}
          disabled={loggingOut}
          onPress={handleLogout}
        >
          {loggingOut ? (
            <ActivityIndicator color="#E11D48" />
          ) : (
            <>
              <MaterialCommunityIcons name="logout" size={20} color="#E11D48" />
              <Text style={styles.logoutBtnText}>Logout</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      <Modal transparent visible={showPhotoOptions} animationType="slide" onRequestClose={() => setShowPhotoOptions(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.photoOptionsCard}>
            <TouchableOpacity 
              style={styles.modalCloseBtn}
              onPress={() => setShowPhotoOptions(false)}
            >
              <MaterialCommunityIcons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Update Profile Photo</Text>
            
            <TouchableOpacity style={styles.photoOptionBtn} onPress={() => handlePhotoOptionSelect('camera')}>
              <View style={[styles.photoOptionIcon, { backgroundColor: COLORS.primary + '15' }]}>
                <MaterialCommunityIcons name="camera" size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.photoOptionText}>Take Photo</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#CBD5E1" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.photoOptionBtn} onPress={() => handlePhotoOptionSelect('gallery')}>
              <View style={[styles.photoOptionIcon, { backgroundColor: COLORS.primary + '15' }]}>
                <MaterialCommunityIcons name="image-multiple" size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.photoOptionText}>Choose from Gallery</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#CBD5E1" />
            </TouchableOpacity>
          </View>
        </View>
    </Modal>

      <Modal visible={showPayoutModal} transparent animationType="fade" onRequestClose={() => setShowPayoutModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.photoOptionsCard}>
            <TouchableOpacity 
              style={styles.modalCloseBtn}
              onPress={() => setShowPayoutModal(false)}
            >
              <MaterialCommunityIcons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Payout Frequency</Text>
            {['DAILY', 'WEEKLY', 'MONTHLY'].map((option) => (
              <TouchableOpacity 
                key={option} 
                style={[styles.photoOptionBtn, payoutFreq === option && { backgroundColor: '#F0FDF4' }]} 
                onPress={() => {
                  setPayoutFreq(option);
                  setShowPayoutModal(false);
                  apiService.updatePayoutFrequency(option).then(() => {
                    Toast.show({ type: 'success', text1: 'Payout frequency updated' });
                  }).catch(() => {
                    Toast.show({ type: 'error', text1: 'Failed to update frequency' });
                  });
                }}
              >
                <View style={[styles.photoOptionIcon, { backgroundColor: payoutFreq === option ? '#D1FAE5' : '#F1F5F9' }]}>
                  <MaterialCommunityIcons name={payoutFreq === option ? "check-circle" : "circle-outline"} size={24} color={payoutFreq === option ? "#10B981" : "#94A3B8"} />
                </View>
                <Text style={[styles.photoOptionText, payoutFreq === option && { color: '#10B981', fontWeight: '700' }]}>
                  {option === 'DAILY' ? 'Daily Transfer' : option === 'WEEKLY' ? 'Weekly Transfer' : 'Monthly Transfer'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      <Modal visible={showCommissionModal} transparent animationType="fade" onRequestClose={() => setShowCommissionModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.photoOptionsCard}>
            <TouchableOpacity 
              style={styles.modalCloseBtn}
              onPress={() => setShowCommissionModal(false)}
            >
              <MaterialCommunityIcons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Set Commission Rate</Text>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 20 }}>
              <MaterialCommunityIcons name="percent" size={24} color="#64748B" style={{ marginRight: 10 }} />
              <TextInput
                style={{ flex: 1, fontSize: 18, fontWeight: '700', color: '#0F172A' }}
                value={tempCommission}
                onChangeText={setTempCommission}
                keyboardType="numeric"
                maxLength={5}
                placeholder="0.0"
              />
            </View>

            <TouchableOpacity 
              style={{ backgroundColor: '#006D6F', paddingVertical: 14, borderRadius: 12, alignItems: 'center' }}
              onPress={() => {
                const num = parseFloat(tempCommission);
                if (isNaN(num) || num < 0 || num > 100) {
                  Toast.show({ type: 'error', text1: 'Enter a valid rate between 0-100' });
                  return;
                }
                setCommissionRate(tempCommission);
                setShowCommissionModal(false);
                apiService.updateCommissionRate(tempCommission).then(() => {
                  Toast.show({ type: 'success', text1: 'Commission rate updated' });
                }).catch(() => {
                  Toast.show({ type: 'error', text1: 'Failed to update commission' });
                });
              }}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>Save Rate</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    ...SHADOWS.sm,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 10,
  },
  avatarLarge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#E6F4F4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#CCFBF1',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 68,
    height: 68,
    borderRadius: 34,
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editDot: {
    position: 'absolute',
    bottom: 0, right: 0,
    width: 24, height: 24,
    borderRadius: 12,
    backgroundColor: '#006D6F',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  badgeRow: {
    marginTop: 4,
    marginBottom: 4,
  },
  roleBadge: {
    backgroundColor: '#DEF7EC',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#03543F',
  },
  mobileText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    ...SHADOWS.sm,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoLabel: {
    flex: 1,
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
    marginLeft: 10,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  menuItemText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    marginLeft: 10,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginTop: 10,
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#E11D48',
  },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingHorizontal: 20 
  },
  photoOptionsCard: { 
    width: '100%', 
    backgroundColor: '#fff', 
    borderRadius: 24, 
    padding: 24, 
    ...SHADOWS.md 
  },
  modalCloseBtn: { 
    position: 'absolute', 
    top: 16, 
    right: 16, 
    padding: 4, 
    zIndex: 1 
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 20, textAlign: 'center' },
  photoOptionBtn: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  photoOptionIcon: {
    width: 48, height: 48, borderRadius: 24, justifyContent: 'center',
    alignItems: 'center', marginRight: 16,
  },
  photoOptionText: { fontSize: 16, fontWeight: '600', color: '#334155', flex: 1 },
});
