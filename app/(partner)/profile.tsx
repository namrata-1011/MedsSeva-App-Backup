import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import ScreenWrapper from '../../src/components/ScreenWrapper';
import { Image } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';

import { RootState, AppDispatch } from '../../src/store';
import { apiService } from '../../src/services/api';
import { performLogout } from '../../src/utils/logout';
import { updateProfileAndPersist } from '../../src/store/slices/authSlice';
import { SHADOWS, COLORS } from '../../src/theme/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ConfirmSheet } from '../../src/components/ConfirmSheet';

interface PartnerProfile {
  labName: string;
  role: string;
  approvalStatus: string;
  rating: number;
  totalCollections: number;
  reviewCount?: number;
  branchName?: string;
}

export default function PartnerProfileScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((s: RootState) => s.auth.user);
  const [profile, setProfile] = useState<PartnerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showLogoutSheet, setShowLogoutSheet] = useState(false);
  const uploadLockRef = useRef(false);

  useEffect(() => {
    apiService.getPartnerProfile()
      .then(setProfile)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const [showPhotoOptions, setShowPhotoOptions] = useState(false);

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
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
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

  const menuItems = [
    {
      icon: 'account-edit-outline',
      label: 'Edit Profile',
      subtitle: 'Update your personal information',
     onPress: () => router.push('/(partner)/(profile-stack)/edit-profile' as any),
    },
{
      icon: 'cog-outline',
      label: 'Settings',
      subtitle: 'App preferences and security',
      onPress: () => router.push('/(partner)/(profile-stack)/settings' as any),
    },
    {
      icon: 'calendar-clock',
      label: 'Availability',
      subtitle: 'Manage your working hours',
      onPress: () => router.push('/(partner)/(profile-stack)/availability' as any),
    },
    {
      icon: 'hospital-building',
      label: 'My Branch',
      subtitle: profile?.branchName || 'View branch information',
      onPress: () => router.push('/(partner)/(profile-stack)/my-branch' as any),
    },
    {
      icon: 'star-outline',
      label: 'Ratings',
      subtitle: 'View feedback and performance',
      value: profile?.rating ? profile.rating.toFixed(1) : undefined,
      onPress: () => router.push('/(partner)/(profile-stack)/ratings' as any),
    },
    {
      icon: 'robot-outline',
      label: 'SevaBot Support',
      subtitle: 'AI chat and customer support',
      onPress: () => router.push('/support/chat' as any),
    },
    {
      icon: 'file-document-outline',
      label: 'Legal',
      subtitle: 'Terms, privacy policy and about',
      onPress: () => router.push('/(partner)/(profile-stack)/legal' as any),
    },
  ];

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
   <View style={styles.header} />

    <ScreenWrapper contentContainerStyle={styles.content}>
        <View style={styles.profileCard}>
          <TouchableOpacity
            style={styles.avatarWrap}
            onPress={handleAvatarPress}
            disabled={isUploadingAvatar}
            activeOpacity={0.8}
          >
            <View style={styles.avatar}>
              {user?.avatarUrl ? (
                <Image
                  source={{ uri: user.avatarUrl }}
                  style={styles.avatarImage}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <MaterialCommunityIcons name="account" size={40} color={COLORS.primary} />
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

          <Text style={styles.partnerName}>{user?.name || 'Partner'}</Text>
          <View style={styles.idStatusRow}>
            <Text style={styles.partnerId}>ID: {user?.id?.slice(-5) || '00000'}</Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: profile?.approvalStatus === 'APPROVED' ? '#DCFCE7' : '#FEF9C3' }
            ]}>
              <Text style={[
                styles.statusBadgeText,
                { color: profile?.approvalStatus === 'APPROVED' ? '#059669' : '#B45309' }
              ]}>
                {profile?.approvalStatus === 'APPROVED' ? 'Active Partner' : profile?.approvalStatus}
              </Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="star" size={16} color="#F59E0B" />
              <Text style={styles.statValue}>{profile?.rating?.toFixed(1) || '0.0'}/5</Text>
              <Text style={styles.statSub}>{profile?.reviewCount || 0} Reviews</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="clipboard-check-outline" size={16} color={COLORS.primary} />
              <Text style={styles.statValue}>{profile?.totalCollections?.toLocaleString() || '0'}</Text>
              <Text style={styles.statSub}>Total Collections</Text>
            </View>
          </View>
        </View>

        <View style={styles.menuCard}>
          {menuItems.map((item, idx) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.menuItem, idx < menuItems.length - 1 && styles.menuItemBorder]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.menuIconCircle}>
                <MaterialCommunityIcons name={item.icon as any} size={20} color={COLORS.primary} />
              </View>
              <View style={styles.menuInfo}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              <View style={styles.menuRight}>
                {item.value && <Text style={styles.menuValue}>{item.value}</Text>}
                <MaterialCommunityIcons name="chevron-right" size={20} color="#CBD5E1" />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutCard} onPress={() => setShowLogoutSheet(true)} activeOpacity={0.8}>
          <View style={[styles.menuIconCircle, { backgroundColor: '#FEF2F2' }]}>
            <MaterialCommunityIcons name="logout" size={20} color="#EF4444" />
          </View>
          <View style={styles.menuInfo}>
            <Text style={[styles.menuLabel, { color: '#EF4444' }]}>Logout</Text>
            <Text style={styles.menuSubtitle}>Sign out of your account</Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.versionText}>App Version 2.4.1 Build 8801</Text>
</ScreenWrapper>

      <ConfirmSheet
        visible={showLogoutSheet}
        title="Log Out"
        message="Are you sure you want to log out of your account?"
        confirmLabel="Log Out"
        cancelLabel="Cancel"
        confirmDestructive
        onConfirm={() => { setShowLogoutSheet(false); performLogout(); }}
        onCancel={() => setShowLogoutSheet(false)}
      />

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },

  content: { padding: 16, paddingBottom: 40 },
  profileCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center',
    borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16, ...SHADOWS.soft,
  },
  avatarWrap: { position: 'relative', marginBottom: 16 },
  avatar: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: '#F0FDFA',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#CCFBF1', overflow: 'hidden',
  },
  avatarImage: { width: 88, height: 88, borderRadius: 44 },
  avatarOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 44,
    justifyContent: 'center', alignItems: 'center',
  },
  editDot: {
    position: 'absolute', bottom: 2, right: 2,
    width: 26, height: 26, borderRadius: 13, backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff',
  },
  partnerName: { fontSize: 20, fontWeight: '900', color: '#0F172A', marginBottom: 8 },
  idStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  partnerId: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },
  statsRow: {
    flexDirection: 'row', width: '100%', backgroundColor: '#F8FAFC',
    borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#F1F5F9',
  },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statDivider: { width: 1, backgroundColor: '#E2E8F0', marginHorizontal: 8 },
  statValue: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  statSub: { fontSize: 11, color: '#64748B', textAlign: 'center' },
  menuCard: {
    backgroundColor: '#fff', borderRadius: 18,
    borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 12, ...SHADOWS.soft,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  menuIconCircle: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#F0FDFA',
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  menuInfo: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  menuSubtitle: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  menuValue: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  logoutCard: {
    backgroundColor: '#fff', borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#FEE2E2', marginBottom: 20, ...SHADOWS.soft,
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#E11D48',
  },
  versionText: { fontSize: 11, color: '#CBD5E1', textAlign: 'center' },
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