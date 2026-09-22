import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  StatusBar, ActivityIndicator, Alert, Image, Modal, TextInput, Platform, KeyboardAvoidingView
} from 'react-native';
import ScreenWrapper from '../../src/components/ScreenWrapper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useDispatch } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tokenStorage } from '../../src/utils/tokenStorage';
import { logout } from '../../src/store/slices/authSlice';
import { apiService } from '../../src/services/api';
import { COLORS, SHADOWS } from '../../src/theme/theme';
import * as ImagePicker from 'expo-image-picker';
import { ensurePhotosPermission } from '../../src/utils/imagePicker';
import { showSuccess, showError } from '../../src/store/toastStore';

export default function DoctorProfileScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = () => {
    apiService.getDoctorPortalData('ALL')
      .then(res => setData(res))
      .catch(err => console.error('Failed to load profile', err))
      .finally(() => setIsLoading(false));
  };

  const [isEditVisible, setIsEditVisible] = useState(false);
  const [editForm, setEditForm] = useState({
    designation: '',
    qualification: '',
    specialization: ''
  });

  const handleEditProfile = () => {
    setEditForm({
      designation: data?.doctor?.designation || '',
      qualification: data?.doctor?.qualification || '',
      specialization: data?.doctor?.specialization || ''
    });
    setIsEditVisible(true);
  };

  const handleSaveProfile = async () => {
    try {
      await apiService.updateDoctorProfile(editForm);
      showSuccess('Profile updated successfully');
      setIsEditVisible(false);
      loadProfile(); 
    } catch (e: any) {
      showError(e?.response?.data?.error || 'Failed to update profile');
    }
  };

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const handlePickAvatar = async () => {
    Alert.alert(
      'Upload Profile Photo',
      'Choose a source to upload your photo',
      [
        {
          text: 'Camera',
          onPress: async () => {
            try {
              const { status } = await ImagePicker.requestCameraPermissionsAsync();
              if (status !== 'granted') {
                showError('Permission required to access camera.');
                return;
              }
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
              });
              processImageResult(result);
            } catch (err) {
              console.error(err);
            }
          }
        },
        {
          text: 'Gallery',
          onPress: async () => {
            try {
              const hasPermission = await ensurePhotosPermission();
              if (!hasPermission) {
                showError('Permission required to access gallery.');
                return;
              }
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
              });
              processImageResult(result);
            } catch (err) {
              console.error(err);
            }
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const processImageResult = async (result: any) => {
    try {
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setIsUploadingAvatar(true);
        const asset = result.assets[0];
        const fileName = asset.uri.split('/').pop() || 'avatar.jpg';
        const mimeType = fileName.endsWith('.png') ? 'image/png' : 'image/jpeg';
        
        await apiService.uploadAvatar(asset.uri, mimeType, fileName);
        showSuccess('Profile photo updated successfully!');
        loadProfile(); // Refresh data to get new avatar URL
      }
    } catch (err: any) {
      console.error('Avatar upload error', err);
      showError(err?.response?.data?.error || 'Failed to upload profile photo');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to log out of Doctor Portal?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await tokenStorage.deleteItem('token');
              await AsyncStorage.removeItem('user');
              dispatch(logout());
              router.replace('/(auth)/doctor-login' as any);
            } catch (e) {
              console.error('Logout error', e);
            }
          },
        },
      ]
    );
  };

  const doc = data?.doctor;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
    <ScreenWrapper scrollable={false} backgroundColor="#F8FAFC">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 6 }]}>
        <Text style={styles.headerTitle}>Account & Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Profile Card */}
            <View style={styles.profileCard}>
              <TouchableOpacity
                style={styles.avatarWrap}
                onPress={handlePickAvatar}
                disabled={isUploadingAvatar}
                activeOpacity={0.8}
              >
                <View style={styles.avatarLarge}>
                  {doc?.avatarUrl ? (
                    <Image
                      source={{ uri: doc.avatarUrl }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <MaterialCommunityIcons name="stethoscope" size={32} color="#006D6F" />
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
              
              <Text style={styles.profileName}>Dr. {doc?.name || 'Doctor'}</Text>
              
              <View style={styles.badgeRow}>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>
                    {doc?.designation || 'Consultant Specialist'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.verifiedBadge}>
                <MaterialCommunityIcons name="check-decagram" size={14} color="#10B981" />
                <Text style={styles.verifiedText}>MedsSeva Verified</Text>
              </View>
            </View>

            {/* Credentials Section */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Medical Credentials</Text>

              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="card-account-details" size={18} color="#64748B" />
                <Text style={styles.infoLabel}>Council Registration No</Text>
                <Text style={styles.infoValue}>{doc?.registrationNo || 'MCI Reg'}</Text>
              </View>

              <TouchableOpacity style={styles.infoRow} onPress={handleEditProfile}>
                <MaterialCommunityIcons name="certificate" size={18} color="#64748B" />
                <Text style={styles.infoLabel}>Degree / Qualification</Text>
                <Text style={styles.infoValue}>{doc?.qualification || 'MBBS'}</Text>
                <MaterialCommunityIcons name="pencil-outline" size={16} color="#059669" style={{ marginLeft: 6 }} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.infoRow} onPress={handleEditProfile}>
                <MaterialCommunityIcons name="doctor" size={18} color="#64748B" />
                <Text style={styles.infoLabel}>Specialization</Text>
                <Text style={styles.infoValue}>{doc?.specialization || 'Pathology'}</Text>
                <MaterialCommunityIcons name="pencil-outline" size={16} color="#059669" style={{ marginLeft: 6 }} />
              </TouchableOpacity>

              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="identifier" size={18} color="#64748B" />
                <Text style={styles.infoLabel}>Doctor Code</Text>
                <Text style={styles.infoValue}>{doc?.code || 'DOC-MEDS'}</Text>
              </View>
            </View>

            {/* Payout & Settlement Info */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Settlement & Commission Terms</Text>

              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="percent" size={18} color="#059669" />
                <Text style={styles.infoLabel}>Commission Rate</Text>
                <Text style={[styles.infoValue, { color: '#059669', fontWeight: '900' }]}>
                  {doc?.commissionRate ?? 30}% Per Booking
                </Text>
              </View>

              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="calendar-sync" size={18} color="#64748B" />
                <Text style={styles.infoLabel}>Payout Settlement Cycle</Text>
                <Text style={styles.infoValue}>{doc?.paymentCycle || 'MONTHLY'}</Text>
              </View>

              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="hospital-building" size={18} color="#64748B" />
                <Text style={styles.infoLabel}>Associated Lab Branch</Text>
                <Text style={styles.infoValue}>{doc?.branch?.name || 'Not Assigned'}</Text>
              </View>
            </View>

            {/* Logout Button */}
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.88}>
              <MaterialCommunityIcons name="logout" size={20} color="#E11D48" />
              <Text style={styles.logoutBtnText}>Logout from Doctor Portal</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </ScreenWrapper>

      <Modal visible={isEditVisible} transparent animationType="fade" onRequestClose={() => setIsEditVisible(false)}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.editCard}>
            <TouchableOpacity 
              style={styles.modalCloseBtn}
              onPress={() => setIsEditVisible(false)}
            >
              <MaterialCommunityIcons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Profile Details</Text>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={styles.inputLabel}>Designation</Text>
              <TextInput
                style={styles.textInput}
                value={editForm.designation}
                onChangeText={(val: string) => setEditForm({ ...editForm, designation: val })}
                placeholder="e.g. Consultant Specialist"
              />

              <Text style={styles.inputLabel}>Qualification</Text>
              <TextInput
                style={styles.textInput}
                value={editForm.qualification}
                onChangeText={(val: string) => setEditForm({ ...editForm, qualification: val })}
                placeholder="e.g. MBBS, MD"
              />

              <Text style={styles.inputLabel}>Specialization</Text>
              <TextInput
                style={styles.textInput}
                value={editForm.specialization}
                onChangeText={(val: string) => setEditForm({ ...editForm, specialization: val })}
                placeholder="e.g. Pathology"
              />

              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile}>
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { 
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  scrollContent: { padding: 16, paddingBottom: 100 },

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
  avatarWrap: { position: 'relative', marginBottom: 12 },
  avatarLarge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#006D6F',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#CCFBF1',
    overflow: 'hidden',
  },
  avatarImage: { width: 68, height: 68, borderRadius: 34 },
  avatarOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 34,
    justifyContent: 'center', alignItems: 'center',
  },
  editDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 24, height: 24,
    borderRadius: 12, backgroundColor: '#006D6F',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  profileName: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  badgeRow: { marginTop: 4, marginBottom: 4 },
  roleBadge: {
    backgroundColor: '#DEF7EC',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  roleBadgeText: { fontSize: 11, fontWeight: '800', color: '#03543F' },
  
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
  },
  verifiedText: { fontSize: 11, fontWeight: '800', color: '#059669' },

  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    ...SHADOWS.sm,
  },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 12 },
  
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
    marginLeft: 10 
  },
  infoValue: { 
    fontSize: 13, 
    fontWeight: '700', 
    color: '#0F172A', 
    flexShrink: 1,
    textAlign: 'right' 
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
    marginBottom: 20,
  },
  logoutBtnText: { fontSize: 14, fontWeight: '800', color: '#E11D48' },

  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingHorizontal: 20 
  },
  editCard: { 
    width: '100%', 
    maxHeight: '85%',
    backgroundColor: '#fff', 
    borderRadius: 24, 
    padding: 24, 
    paddingTop: 30,
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
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#64748B', marginBottom: 6, marginTop: 12 },
  textInput: { 
    backgroundColor: '#F1F5F9', 
    borderRadius: 12, 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    fontSize: 15, 
    color: '#0F172A',
    fontWeight: '600'
  },
  cycleRow: { flexDirection: 'row', gap: 8 },
  cycleBtn: { 
    flex: 1, 
    backgroundColor: '#F1F5F9', 
    paddingVertical: 10, 
    borderRadius: 8, 
    alignItems: 'center' 
  },
  cycleBtnActive: { backgroundColor: '#0D9488' },
  cycleBtnText: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  cycleBtnTextActive: { color: '#FFFFFF' },
  saveBtn: { 
    backgroundColor: '#006D6F', 
    paddingVertical: 14, 
    borderRadius: 12, 
    alignItems: 'center', 
    marginTop: 24 
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
