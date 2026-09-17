import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Modal, Animated,
} from 'react-native';
import ScreenWrapper from '../../src/components/ScreenWrapper';
import { useRouter } from 'expo-router';
import { useDispatch } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { setPatientDetails } from '../../src/store/slices/bookingSlice';
import { COLORS, TYPOGRAPHY, SHADOWS } from '../../src/theme/theme';
import { apiService } from '../../src/services/api';

export default function PatientScreen() {
  const router = useRouter();
  const dispatch = useDispatch();

  // Form fields
const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [dobExists, setDobExists] = useState(false);

  const [profileLoading, setProfileLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const originalProfile = useRef<{ name: string; email: string; mobile: string }>({
    name: '', email: '', mobile: ''
  });
  // Update profile modal
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [pendingContinue, setPendingContinue] = useState(false);

  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  // Banner fade animation
  const bannerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchProfile();
  }, []);

  // Auto-hide the "pre-filled" banner after 3 seconds
  useEffect(() => {
    if (profileLoaded) {
      Animated.sequence([
        Animated.timing(bannerOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.delay(2500),
        Animated.timing(bannerOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    }
  }, [profileLoaded]);

const calculateAgeFromDob = (dob: string): string => {
    const parts = dob.split('/');
    if (parts.length !== 3) return '';
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return '';
    const birthDate = new Date(year, month, day);
    const today = new Date();
    let years = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      years--;
    }
    return years > 0 ? String(years) : '';
  };

  const fetchProfile = async () => {
    setProfileLoading(true);
    setProfileError(null);
    try {
      const user = await apiService.getMe();

      const fetchedName = user.name || '';
      const fetchedMobile = user.mobile || '';
      const fetchedEmail = user.email || '';
      const fetchedDob = (user.dob || '').trim();
      const fetchedGender = user.gender || 'Male';

      setName(fetchedName);
      setMobile(fetchedMobile.replace('+91', '').replace(/\s/g, '').slice(-10));
      setEmail(fetchedEmail);
      setGender(fetchedGender);

      if (fetchedDob) {
        setDobExists(true);
        const calculatedAge = calculateAgeFromDob(fetchedDob);
        setAge(calculatedAge);
      } else {
        setDobExists(false);
        setAge('');
      }

      originalProfile.current = {
        name: fetchedName,
        email: fetchedEmail,
        mobile: fetchedMobile,
      };

      setProfileLoaded(true);
    } catch (err) {
      setProfileError('Could not load your profile. Please fill in your details.');
    } finally {
      setProfileLoading(false);
    }
  };
  // Detect if user changed any profile-syncable fields
  const hasProfileChanges = () => {
    return (
      name.trim() !== originalProfile.current.name.trim() ||
      email.trim() !== originalProfile.current.email.trim()
    );
  };

  const isValid = name.trim().length > 2 && Number(age) > 0 && Number(age) < 120 && Boolean(gender) && mobile.length === 10;

  const handleContinue = () => {
    if (!isValid) return;

    if (hasProfileChanges()) {
      // User edited profile fields - ask what to do
      setShowUpdateModal(true);
      setPendingContinue(true);
    } else {
      proceedToPayment();
    }
  };

  const proceedToPayment = () => {
    dispatch(setPatientDetails({ name, age, gender, mobile, symptoms }));
    router.push('/checkout/payment');
  };

  const handleUpdateProfileAndContinue = async () => {
    setUpdateLoading(true);
    try {
      await apiService.updateMe({
        name: name.trim(),
        email: email.trim() || undefined,
        gender: gender || undefined,
      });
      // Update local reference so re-entry doesn't re-trigger modal
      originalProfile.current.name = name.trim();
      originalProfile.current.email = email.trim();
    } catch (err) {
      // Even if update fails, don't block the booking
      console.warn('Profile update failed, continuing with booking only.');
    } finally {
      setUpdateLoading(false);
      setShowUpdateModal(false);
      proceedToPayment();
    }
  };

  const handleThisBookingOnly = () => {
    setShowUpdateModal(false);
    proceedToPayment();
  };

  const getBorderColor = (inputId: string) => {
    return focusedInput === inputId ? COLORS.primary : COLORS.border;
  };
return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textLight} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Patient Details</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Pre-filled banner */}
      <Animated.View style={[styles.prefillBanner, { opacity: bannerOpacity }]}>
        <MaterialCommunityIcons name="check-circle" size={16} color="#065F46" />
        <Text style={styles.prefillBannerText}>Details pre-filled from your profile</Text>
      </Animated.View>

      {profileLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading your profile...</Text>
        </View>
      ) : (
      <ScreenWrapper
          bottomButton={
            <TouchableOpacity
              style={[styles.continueBtn, !isValid && styles.continueBtnDisabled]}
              disabled={!isValid}
              onPress={handleContinue}
            >
              <Text style={styles.continueBtnText}>Proceed to Payment</Text>
            </TouchableOpacity>
          }
   contentContainerStyle={styles.scrollContent}
          extraScrollHeight={120}
        >

          {profileError && (
            <View style={styles.errorBanner}>
              <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#991B1B" />
              <Text style={styles.errorBannerText}>{profileError}</Text>
              <TouchableOpacity onPress={fetchProfile}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.formCard}>

            <Text style={styles.label}>Patient Name *</Text>
            <TextInput
              style={[styles.input, { borderColor: getBorderColor('name') }]}
              placeholder="Enter full name"
              placeholderTextColor={COLORS.textSecondary}
              value={name}
              onChangeText={setName}
              onFocus={() => setFocusedInput('name')}
              onBlur={() => setFocusedInput(null)}
            />

            <View style={styles.row}>
<View style={styles.halfWidth}>
                <Text style={styles.label}>Age *</Text>
                <View style={{ position: 'relative' }}>
            <TextInput
                    style={[
                      styles.input,
                      { borderColor: dobExists ? getBorderColor('age') : getBorderColor('age') },
                    ]}
                    placeholder="Years"
                    placeholderTextColor={COLORS.textSecondary}
                    keyboardType="numeric"
                    maxLength={3}
                    value={age}
                onChangeText={setAge}
                    editable={!dobExists}
                    onFocus={() => !dobExists && setFocusedInput('age')}
                    onBlur={() => setFocusedInput(null)}
                  />
                </View>
              </View>
              <View style={styles.halfWidth}>
                <Text style={styles.label}>Gender *</Text>
                <View style={styles.genderRow}>
                  {['Male', 'Female'].map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={[styles.genderBtn, gender === g && styles.genderBtnActive]}
                      onPress={() => setGender(g)}
                    >
                      <Text style={[styles.genderText, gender === g && styles.genderTextActive]}>{g}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <Text style={styles.label}>Mobile Number *</Text>
            <View style={[styles.phoneInputContainer, { borderColor: getBorderColor('mobile') }]}>
              <Text style={styles.countryCode}>+91</Text>
              <TextInput
                style={styles.phoneInput}
                placeholder="Enter 10 digit number"
                placeholderTextColor={COLORS.textSecondary}
                keyboardType="numeric"
                maxLength={10}
                value={mobile}
                onChangeText={setMobile}
                editable={false}  // Mobile is identity - not editable
                onFocus={() => setFocusedInput('mobile')}
                onBlur={() => setFocusedInput(null)}
              />
              <View style={styles.lockedBadge}>
                <MaterialCommunityIcons name="lock" size={14} color={COLORS.textSecondary} />
              </View>
            </View>

            <Text style={styles.label}>Email Address (Optional)</Text>
            <TextInput
              style={[styles.input, { borderColor: getBorderColor('email') }]}
              placeholder="your@email.com"
              placeholderTextColor={COLORS.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              onFocus={() => setFocusedInput('email')}
              onBlur={() => setFocusedInput(null)}
            />

      <Text style={styles.label}>Symptoms / Notes (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea, { borderColor: getBorderColor('symptoms') }]}
              placeholder="Any specific symptoms or instructions for the technician?"
              placeholderTextColor={COLORS.textSecondary}
              multiline
              numberOfLines={4}
              value={symptoms}
              onChangeText={setSymptoms}
              onFocus={() => setFocusedInput('symptoms')}
              onBlur={() => setFocusedInput(null)}
              textAlignVertical="top"
              scrollEnabled={false}
            />
          </View>
 </ScreenWrapper>
      )}

      {/* Update Profile Modal */}
      <Modal visible={showUpdateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconRow}>
              <MaterialCommunityIcons name="account-edit-outline" size={32} color={COLORS.primary} />
            </View>
            <Text style={styles.modalTitle}>Save Profile Changes?</Text>
            <Text style={styles.modalSubtitle}>
              You've updated your details. Would you like to save these changes to your profile for future bookings?
            </Text>

            <TouchableOpacity
              style={[styles.modalBtn, styles.modalBtnPrimary]}
              onPress={handleUpdateProfileAndContinue}
              disabled={updateLoading}
            >
              {updateLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <MaterialCommunityIcons name="content-save-outline" size={18} color="#fff" />
                  <Text style={styles.modalBtnPrimaryText}>Update Profile & Continue</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalBtn, styles.modalBtnSecondary]}
              onPress={handleThisBookingOnly}
              disabled={updateLoading}
            >
              <MaterialCommunityIcons name="bookmark-outline" size={18} color={COLORS.primary} />
              <Text style={styles.modalBtnSecondaryText}>Only for This Booking</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
  prefillBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  prefillBannerText: {
    ...TYPOGRAPHY.caption,
    color: '#065F46',
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorBannerText: {
    ...TYPOGRAPHY.caption,
    color: '#991B1B',
    flex: 1,
  },
  retryText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary,
    fontWeight: '700',
  },
lockedBadge: {
    paddingRight: 14,
  },
  ageAutobadge: {
    position: 'absolute',
    right: 10,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  ageAutobadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.5,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 28,
    paddingBottom: 40,
  },
  modalIconRow: {
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textDark,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  modalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 12,
    gap: 8,
  },
  modalBtnPrimary: {
    backgroundColor: COLORS.primary,
  },
  modalBtnPrimaryText: {
    ...TYPOGRAPHY.subtitle,
    color: '#fff',
    fontWeight: 'bold',
  },
  modalBtnSecondary: {
    backgroundColor: COLORS.primary + '12',
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
  },
  modalBtnSecondaryText: {
    ...TYPOGRAPHY.subtitle,
    color: COLORS.primary,
    fontWeight: '600',
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.textLight,
  },
scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  formCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.soft,
  },
  label: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textDark,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    ...TYPOGRAPHY.body,
    color: COLORS.textDark,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  halfWidth: {
    width: '48%',
  },
  genderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  genderBtn: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  genderBtnActive: {
    backgroundColor: COLORS.primaryLight + '10',
    borderColor: COLORS.primary,
  },
  genderText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  genderTextActive: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    marginBottom: 20,
  },
  countryCode: {
    ...TYPOGRAPHY.body,
    color: COLORS.textDark,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    ...TYPOGRAPHY.body,
    color: COLORS.textDark,
  },
  textArea: {
    height: 100,
  },

  continueBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  continueBtnDisabled: {
    backgroundColor: COLORS.border,
  },
  continueBtnText: {
    ...TYPOGRAPHY.subtitle,
    color: COLORS.textLight,
    fontWeight: 'bold',
  }
});
