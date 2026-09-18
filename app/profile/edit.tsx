import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  Modal,
  Dimensions,
  FlatList,
  ScrollView,
  StatusBar,
} from 'react-native';
import ScreenWrapper from '../../src/components/ScreenWrapper';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { RootState } from '../../src/store';
import { updateProfile } from '../../src/store/slices/authSlice';
import { apiService } from '../../src/services/api';
import { COLORS, TYPOGRAPHY, SHADOWS } from '../../src/theme/theme';
import { showSuccess, showError } from '../../src/store/toastStore';

const { width } = Dimensions.get('window');

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'A1+', 'A1-', 'A1B+', 'A1B-', 'A2+', 'A2-', 'A2B+', 'A2B-', 'Bombay (Oh)'];

export default function EditProfileScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone] = useState(user?.mobile || '');
  const [altPhone, setAltPhone] = useState(user?.altMobile || '');
  const [dob, setDob] = useState(user?.dob || 'Select Date');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>((user?.gender as any) || 'Male');
  const [bloodGroup, setBloodGroup] = useState(user?.bloodGroup || '');
  const [isSaving, setIsSaving] = useState(false);

  const [isCalendarVisible, setIsCalendarVisible] = useState(false);
  const [currYear, setCurrYear] = useState(new Date().getFullYear() - 25);
  const [currMonth, setCurrMonth] = useState(0);

  const [isBloodGroupVisible, setIsBloodGroupVisible] = useState(false);

  const yearsList: number[] = [];
  for (let y = new Date().getFullYear(); y >= 1950; y--) {
    yearsList.push(y);
  }

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const daysArray = Array.from({ length: getDaysInMonth(currYear, currMonth) }, (_, i) => i + 1);

  const handleSelectDay = (day: number) => {
    const d = day < 10 ? '0' + day : day;
    const m = currMonth + 1 < 10 ? '0' + (currMonth + 1) : currMonth + 1;
    setDob(`${d}/${m}/${currYear}`);
    setIsCalendarVisible(false);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      showError('Please provide your full name.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
      showError('Please enter a valid email address.');
      return;
    }
    if (altPhone && !/^[0-9]{10}$/.test(altPhone)) {
      showError('Alternative Mobile number must be exactly 10 digits.');
      return;
    }

    setIsSaving(true);
    try {
      await apiService.updateMe({
        name: name.trim(),
        email: email.trim() || undefined,
        dob: dob !== 'Select Date' ? dob : undefined,
        gender,
        bloodGroup: bloodGroup || undefined,
        altMobile: altPhone.trim() || undefined,
      });

      dispatch(updateProfile({
        name: name.trim(),
        email: email.trim(),
        altMobile: altPhone.trim(),
        dob: dob !== 'Select Date' ? dob : undefined,
        gender,
        bloodGroup: bloodGroup || undefined,
      }));

      showSuccess('Profile updated successfully!');
      router.back();
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to update profile.';
      showError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <MaterialCommunityIcons name="chevron-left" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Profile</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveBtnTop} activeOpacity={0.8} disabled={isSaving}>
          <Text style={styles.saveTextTop}>{isSaving ? 'Saving...' : 'Save'}</Text>
        </TouchableOpacity>
      </View>

 <ScreenWrapper
        contentContainerStyle={styles.scrollContent}
        bottomButton={
          <TouchableOpacity
            style={[styles.primaryUpdateBtn, isSaving && { opacity: 0.7 }]}
            onPress={handleSave}
            activeOpacity={0.85}
            disabled={isSaving}
          >
            <Text style={styles.primaryUpdateBtnText}>{isSaving ? 'Saving...' : 'Save Changes & Sync'}</Text>
            <MaterialCommunityIcons name="sync" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        }
      >
        <View style={styles.formSection}>
          <View style={styles.cardContainer}>
            <Text style={styles.inputLabel}>FULL NAME</Text>
            <View style={styles.inputRow}>
              <MaterialCommunityIcons name="account-outline" size={20} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Enter full name"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
            <View style={styles.inputRow}>
              <MaterialCommunityIcons name="email-outline" size={20} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="user@email.com"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <Text style={styles.inputLabel}>VERIFIED MOBILE NUMBER</Text>
            <View style={[styles.inputRow, styles.lockedRow]}>
              <MaterialCommunityIcons name="phone-check" size={20} color="#059669" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: '#64748B' }]}
                value={phone}
                editable={false}
              />
              <MaterialCommunityIcons name="lock" size={16} color="#94A3B8" style={{ marginRight: 12 }} />
            </View>
            <Text style={styles.lockNotice}>Primary contact locked after OTP verification.</Text>

            <Text style={styles.inputLabel}>DATE OF BIRTH (DOB)</Text>
            <TouchableOpacity
              style={styles.inputRow}
              onPress={() => setIsCalendarVisible(true)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="calendar-month" size={20} color={COLORS.primary} style={styles.inputIcon} />
              <Text style={[styles.input, styles.dateText, dob === 'Select Date' && styles.placeholderDate]}>
                {dob}
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={20} color="#64748B" style={{ marginRight: 12 }} />
            </TouchableOpacity>

            <Text style={styles.inputLabel}>ALTERNATIVE MOBILE (OPTIONAL)</Text>
            <View style={styles.inputRow}>
              <MaterialCommunityIcons name="cellphone" size={20} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={altPhone}
                onChangeText={(txt) => setAltPhone(txt.replace(/[^0-9]/g, ''))}
                placeholder="Enter 10 digit secondary mobile"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>

            <View style={styles.gridBlock}>
              <View style={{ flex: 1.3, marginRight: 8 }}>
                <Text style={styles.inputLabel}>GENDER</Text>
                <View style={styles.selectionRow}>
                  {(['Male', 'Female'] as const).map((g) => {
                    const isSel = gender === g;
                    return (
                      <TouchableOpacity
                        key={g}
                        style={[styles.chip, isSel && styles.chipActive]}
                        onPress={() => setGender(g)}
                      >
                        <Text style={[styles.chipText, isSel && styles.chipTextActive]}>{g}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.inputLabel}>BLOOD GROUP</Text>
                <View style={styles.bloodPicker}>
                  <TextInput
                    style={styles.bloodInput}
                    value={bloodGroup}
                    onChangeText={setBloodGroup}
                    placeholder="Select or Type"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="characters"
                  />
                  <TouchableOpacity onPress={() => setIsBloodGroupVisible(true)} style={styles.bloodChevronBtn}>
                    <MaterialCommunityIcons name="chevron-down" size={20} color="#64748B" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScreenWrapper>
      <Modal visible={isCalendarVisible} transparent animationType="slide">
        <View style={[styles.modalBackdrop, { justifyContent: 'flex-end' }]}>
          <View style={styles.calendarSheet}>
            <View style={styles.calSheetHeader}>
              <Text style={styles.calSheetHeadline}>Select Date of Birth</Text>
              <TouchableOpacity onPress={() => setIsCalendarVisible(false)}>
                <MaterialCommunityIcons name="close-circle" size={26} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <View style={styles.pickerSelectorsRow}>
              <View style={styles.pickerDropdownWrapper}>
                <Text style={styles.pickerLabel}>MONTH</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthsHScroll}>
                  {MONTHS.map((m, idx) => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.monthPill, currMonth === idx && styles.monthPillActive]}
                      onPress={() => setCurrMonth(idx)}
                    >
                      <Text style={[styles.monthPillText, currMonth === idx && styles.monthPillTextActive]}>{m.substring(0, 3)}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View style={styles.pickerSelectorsRow}>
              <View style={{ width: '100%' }}>
                <Text style={styles.pickerLabel}>YEAR: {currYear}</Text>
                <FlatList
                  data={yearsList}
                  keyExtractor={(item) => item.toString()}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.yearsHScroll}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.yearPill, currYear === item && styles.yearPillActive]}
                      onPress={() => setCurrYear(item)}
                    >
                      <Text style={[styles.yearPillText, currYear === item && styles.yearPillTextActive]}>{item}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            </View>

            <Text style={[styles.pickerLabel, { marginTop: 20, marginBottom: 12 }]}>SELECT DAY IN {MONTHS[currMonth].toUpperCase()}</Text>
            <View style={styles.daysMatrix}>
              {daysArray.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={styles.dayCell}
                  onPress={() => handleSelectDay(d)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dayCellText}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ height: 20 }} />
          </View>
        </View>
      </Modal>
      <Modal visible={isBloodGroupVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.centeredDialog}>
            <View style={styles.dialogHeader}>
              <Text style={styles.dialogHeadline}>Select Blood Group</Text>
              <TouchableOpacity onPress={() => setIsBloodGroupVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.dialogScroll} showsVerticalScrollIndicator={false}>
              {BLOOD_GROUPS.map((bg, idx) => (
                <TouchableOpacity
                  key={bg}
                  style={[styles.dialogItem, idx === BLOOD_GROUPS.length - 1 && { borderBottomWidth: 0 }]}
                  onPress={() => { setBloodGroup(bg); setIsBloodGroupVisible(false); }}
                >
                  <Text style={[styles.dialogItemText, bloodGroup === bg && styles.dialogItemTextActive]}>{bg}</Text>
                  {bloodGroup === bg && <MaterialCommunityIcons name="check-circle" size={20} color={COLORS.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === 'ios' ? 60 : 45,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 4,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { ...TYPOGRAPHY.h2, color: '#FFFFFF', fontWeight: '800' },
  saveBtnTop: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  saveTextTop: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
  scrollContent: { padding: 20 },
  formSection: { width: '100%' },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.soft,
    elevation: 3,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.2,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    height: 52,
  },
  lockedRow: { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' },
  inputIcon: { marginLeft: 14, marginRight: 10 },
  input: { flex: 1, height: '100%', fontSize: 14, color: '#1E293B', fontWeight: '600' },
  dateText: { lineHeight: 50 },
  placeholderDate: { color: '#94A3B8', fontWeight: '500' },
  lockNotice: { fontSize: 10, color: '#94A3B8', marginTop: 5, fontStyle: 'italic', paddingLeft: 4 },
  gridBlock: { flexDirection: 'row', marginTop: 8 },
  selectionRow: { flexDirection: 'row', height: 48 },
  chip: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: { backgroundColor: 'rgba(13, 148, 136, 0.1)', borderColor: COLORS.primary },
  chipText: { fontSize: 12, color: '#64748B', fontWeight: '700' },
  chipTextActive: { color: COLORS.primary },
  bloodPicker: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.2,
    borderColor: '#CBD5E1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 12,
    paddingRight: 8,
  },
  bloodInput: {
    flex: 1,
    height: '100%',
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
  },
  bloodChevronBtn: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryUpdateBtn: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
    ...SHADOWS.glow,
    elevation: 4,
  },
  primaryUpdateBtnText: { fontSize: 16, color: '#FFFFFF', fontWeight: '800' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
  },
  calendarSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '80%',
  },
  bloodSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  calSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  calSheetHeadline: { fontSize: 18, fontWeight: '900', color: '#1E293B' },
  pickerSelectorsRow: { marginBottom: 16 },
  pickerLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  pickerDropdownWrapper: { width: '100%' },
  monthsHScroll: { paddingRight: 20 },
  monthPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 15,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
  },
  monthPillActive: { backgroundColor: COLORS.primary },
  monthPillText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  monthPillTextActive: { color: '#FFFFFF' },
  yearsHScroll: { paddingRight: 20 },
  yearPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 15,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
  },
  yearPillActive: { backgroundColor: COLORS.primary },
  yearPillText: { fontSize: 12, fontWeight: '800', color: '#64748B' },
  yearPillTextActive: { color: '#FFFFFF' },
  daysMatrix: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  dayCell: {
    width: (width - 56) / 7,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
  },
  dayCellText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    textAlign: 'center',
    lineHeight: 32,
  },
  dayCellText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    textAlign: 'center',
    lineHeight: 32,
  },
  centeredDialog: {
    backgroundColor: '#FFFFFF',
    width: '85%',
    maxHeight: '65%',
    borderRadius: 20,
    alignSelf: 'center',
    overflow: 'hidden',
    paddingBottom: 8,
    elevation: 10,
    marginBottom: Platform.OS === 'ios' ? 0 : 50, // slightly above center
  },
  dialogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dialogHeadline: { fontSize: 17, fontWeight: '800', color: '#1E293B' },
  dialogScroll: { paddingHorizontal: 8 },
  dialogItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  dialogItemText: { fontSize: 15, color: '#475569', fontWeight: '600' },
  dialogItemTextActive: { color: COLORS.primary, fontWeight: '800' },
});