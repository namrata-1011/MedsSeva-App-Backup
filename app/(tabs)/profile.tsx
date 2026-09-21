import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';

import { COLORS, TYPOGRAPHY, SHADOWS } from '../../src/theme/theme';
import { fetchFamilyMembers } from '../../src/store/slices/familySlice';
import { RootState, AppDispatch } from '../../src/store';
import { performLogout } from '../../src/utils/logout';
import { ConfirmSheet } from '../../src/components/ConfirmSheet';
import { updateProfile } from '../../src/store/slices/authSlice';
import { apiService } from '../../src/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProfileScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const members = useSelector((state: RootState) => state.family.members);

  const [showLogoutSheet, setShowLogoutSheet] = useState(false);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const uploadLockRef = useRef(false);

  useEffect(() => {
    dispatch(fetchFamilyMembers());
  }, [dispatch]);

  const handleLogout = () => {
    setShowLogoutSheet(true);
  };

  const handleAvatarPress = () => {
    if (uploadLockRef.current || isUploadingAvatar) return;
    setShowPhotoOptions(true);
  };

  const handlePhotoOptionSelect = async (option: 'camera' | 'gallery') => {
    setShowPhotoOptions(false);
    
    if (option === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      openCamera(status);
    } else {
      openGallery();
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
    const uri = asset.uri;
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
      const response = await apiService.uploadAvatar(uri, mimeType, fileName);
      dispatch(updateProfile({ avatarUrl: response.avatarUrl }));
      const userRaw = await AsyncStorage.getItem('user');
      if (userRaw) {
        const stored = JSON.parse(userRaw);
        await AsyncStorage.setItem('user', JSON.stringify({ ...stored, avatarUrl: response.avatarUrl }));
      }
      Toast.show({ type: 'success', text1: 'Profile image updated successfully.' });
    } catch (error: any) {
      const message = error?.response?.data?.error ?? 'Failed to upload profile image. Please try again.';
      Toast.show({ type: 'error', text1: 'Upload failed', text2: message });
    } finally {
      setIsUploadingAvatar(false);
      uploadLockRef.current = false;
    }
  };



  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.primary, COLORS.primaryLight]} style={styles.header}>
        <TouchableOpacity
          style={styles.profileHeaderRow}
          activeOpacity={0.85}
          onPress={() => router.push('/profile/edit')}
        >
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={handleAvatarPress}
            disabled={isUploadingAvatar}
            activeOpacity={0.8}
          >
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

            {isUploadingAvatar ? (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator size="small" color="#fff" />
              </View>
            ) : (
              <View style={styles.editAvatarButton}>
                <MaterialCommunityIcons name="camera-outline" size={12} color="#fff" />
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name ?? ''}</Text>
            <Text style={styles.profilePhone}>{user?.mobile ? `+91 ${user.mobile}` : ''}</Text>
            <View style={styles.uhidBadge}>
              <Text style={styles.uhidText}>{user?.uhid ? `UHID: ${user.uhid}` : 'Generating UHID...'}</Text>
            </View>
          </View>
        </TouchableOpacity>
      </LinearGradient>

     <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

  <View style={styles.familyCard}>
    <View style={styles.familyCardHeader}>
      <Text style={styles.familyCardTitle}>Family Members</Text>
      <TouchableOpacity onPress={() => router.push('/profile/family')} activeOpacity={0.7}>
        <Text style={styles.familyAddLink}>+ Add New</Text>
      </TouchableOpacity>
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.familyScroll}>
      <TouchableOpacity style={styles.familyAddChip} onPress={() => router.push('/profile/family')} activeOpacity={0.7}>
        <View style={styles.familyAddIcon}>
          <MaterialCommunityIcons name="plus" size={22} color="#94A3B8" />
        </View>
        <Text style={styles.familyChipName}>Add</Text>
      </TouchableOpacity>
      {members.map((member) => (
        <View key={member.id} style={styles.familyChip}>
          <View style={styles.familyChipAvatar}>
            <MaterialCommunityIcons
              name={
                member.relation === 'Wife' || member.relation === 'Daughter' || member.relation === 'Mother'
                  ? 'face-woman'
                  : member.relation === 'Son'
                  ? 'human-child'
                  : 'account'
              }
              size={24}
              color={COLORS.primary}
            />
          </View>
          <Text style={styles.familyChipName} numberOfLines={1}>{member.name}</Text>
          <Text style={styles.familyChipRelation}>{member.relation}</Text>
        </View>
      ))}
    </ScrollView>
  </View>

  <Text style={styles.sectionLabel}>ACCOUNT</Text>
  <View style={styles.menuGroup}>
    <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/profile/addresses')} activeOpacity={0.7}>
      <View style={styles.menuIconWrap}>
        <MaterialCommunityIcons name="map-marker-outline" size={20} color={COLORS.primary} />
      </View>
      <View style={styles.menuTextWrap}>
        <Text style={styles.menuLabel}>Saved Addresses</Text>
        <Text style={styles.menuSubtitle}>Manage home and office locations</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color="#CBD5E1" />
    </TouchableOpacity>
    <View style={styles.divider} />
    <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(tabs)/bookings')} activeOpacity={0.7}>
      <View style={styles.menuIconWrap}>
        <MaterialCommunityIcons name="calendar-check-outline" size={20} color={COLORS.primary} />
      </View>
      <View style={styles.menuTextWrap}>
        <Text style={styles.menuLabel}>Booking History</Text>
        <Text style={styles.menuSubtitle}>View past and upcoming tests</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color="#CBD5E1" />
    </TouchableOpacity>
    <View style={styles.divider} />
    <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/wallet')} activeOpacity={0.7}>
      <View style={styles.menuIconWrap}>
        <MaterialCommunityIcons name="wallet-outline" size={20} color={COLORS.primary} />
      </View>
      <View style={styles.menuTextWrap}>
        <Text style={styles.menuLabel}>My Wallet</Text>
        <Text style={styles.menuSubtitle}>View balance and history</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color="#CBD5E1" />
    </TouchableOpacity>
    <View style={styles.divider} />
    <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/profile/payment')} activeOpacity={0.7}>
      <View style={styles.menuIconWrap}>
        <MaterialCommunityIcons name="credit-card-outline" size={20} color={COLORS.primary} />
      </View>
      <View style={styles.menuTextWrap}>
        <Text style={styles.menuLabel}>Payment Methods</Text>
        <Text style={styles.menuSubtitle}>Manage saved cards and UPI</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color="#CBD5E1" />
    </TouchableOpacity>
  </View>

  <Text style={styles.sectionLabel}>MORE</Text>
  <View style={styles.menuGroup}>
    <TouchableOpacity style={styles.menuItem} onPress={() => router.push('../profile/settings')} activeOpacity={0.7}>
      <View style={styles.menuIconWrap}>
        <MaterialCommunityIcons name="cog-outline" size={20} color={COLORS.primary} />
      </View>
      <View style={styles.menuTextWrap}>
        <Text style={styles.menuLabel}>Settings</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color="#CBD5E1" />
    </TouchableOpacity>
    <View style={styles.divider} />
    <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/support' as any)} activeOpacity={0.7}>
      <View style={styles.menuIconWrap}>
        <MaterialCommunityIcons name="help-circle-outline" size={20} color={COLORS.primary} />
      </View>
      <View style={styles.menuTextWrap}>
        <Text style={styles.menuLabel}>Support Center</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color="#CBD5E1" />
    </TouchableOpacity>
    <View style={styles.divider} />
    <TouchableOpacity style={styles.menuItem} onPress={() => router.push('../profile/legal')} activeOpacity={0.7}>
      <View style={styles.menuIconWrap}>
        <MaterialCommunityIcons name="shield-check-outline" size={20} color={COLORS.primary} />
      </View>
      <View style={styles.menuTextWrap}>
        <Text style={styles.menuLabel}>Legal</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color="#CBD5E1" />
    </TouchableOpacity>
  </View>

  <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
    <MaterialCommunityIcons name="logout" size={20} color={COLORS.danger} />
    <Text style={styles.logoutText}>Log Out</Text>
  </TouchableOpacity>

  <Text style={styles.versionText}>App Version 1.0.0 (Build 42)</Text>
</ScrollView>

      {/* Photo Options Modal */}
      <Modal visible={showPhotoOptions} transparent animationType="fade">
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
    position: 'relative',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 40,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.textDark,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    ...TYPOGRAPHY.h2,
    color: '#fff',
    marginBottom: 4,
  },
  profilePhone: {
    ...TYPOGRAPHY.body,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 8,
  },
  uhidBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  uhidText: {
    ...TYPOGRAPHY.caption,
    color: '#fff',
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  familyCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  familyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  familyCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  familyAddLink: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  familyScroll: {
    marginHorizontal: -4,
  },
  familyChip: {
    alignItems: 'center',
    marginHorizontal: 6,
    width: 72,
  },
  familyChipAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0,109,111,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,109,111,0.12)',
  },
  familyAddChip: {
    alignItems: 'center',
    marginHorizontal: 6,
    width: 72,
  },
  familyAddIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  familyChipName: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textDark,
    textAlign: 'center',
  },
  familyChipRelation: {
    fontSize: 10,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 1,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginLeft: 4,
  },
  menuGroup: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(0,109,111,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuTextWrap: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginLeft: 68,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.danger,
    marginLeft: 8,
  },
  versionText: {
    fontSize: 12,
    color: '#CBD5E1',
    textAlign: 'center',
    marginTop: 20,
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