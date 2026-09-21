import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import ScreenWrapper from '../../src/components/ScreenWrapper';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import dayjs from 'dayjs';

import { setSlot } from '../../src/store/slices/bookingSlice';
import { RootState } from '../../src/store';
import { COLORS, TYPOGRAPHY, SHADOWS } from '../../src/theme/theme';
import { MaterialDatePickerModal } from '../../src/components/MaterialDatePickerModal';
import { MaterialTimeSlotModal } from '../../src/components/MaterialTimeSlotModal';
import { apiService } from '../../src/services/api';

export default function SlotScreen() {
 const router = useRouter();
  const dispatch = useDispatch();

  const collectionMode = useSelector((state: RootState) => state.booking.collectionMode);
  const selectedBranchId = useSelector((state: RootState) => state.booking.selectedBranchId);
  const selectedBranchName = useSelector((state: RootState) => state.booking.selectedBranchName);

  const [selectedDateObj, setSelectedDateObj] = useState<dayjs.Dayjs>(dayjs());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [isTimePickerVisible, setTimePickerVisible] = useState(false);

  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotError] = useState<string | null>(null);
  const [noSlotsForToday, setNoSlotsForToday] = useState(false);

const fetchSlots = useCallback(async (date: dayjs.Dayjs) => {
    setSlotsLoading(true);
    setSlotError(null);
    setNoSlotsForToday(false);
    setAvailableSlots([]);
    setSelectedTime(null);

    try {
      if (collectionMode === 'lab') {
        // Lab mode: use branch's pre-configured slots, no date-based API call
        if (!selectedBranchId) {
          setSlotError('No branch selected. Please go back and select a branch.');
          return;
        }
        const response = await apiService.getBranchById(selectedBranchId);
        const slots: string[] = response?.data?.availableSlots || [];
        if (slots.length === 0) {
          setSlotError('No slots configured for this branch. Please try another branch.');
        } else {
          setAvailableSlots(slots);
        }
      } else {
        // Home mode: use date-based available slots API
        const dateStr = date.format('YYYY-MM-DD');
        const response = await apiService.getAvailableSlots(dateStr);
        const slots: string[] = response.availableSlots || [];
        if (slots.length === 0 && response.isToday) {
          setNoSlotsForToday(true);
        } else {
          setAvailableSlots(slots);
        }
      }
    } catch (err: any) {
      setSlotError('Could not load time slots. Please try again.');
    } finally {
      setSlotsLoading(false);
    }
  }, [collectionMode, selectedBranchId]);

  useEffect(() => {
    fetchSlots(selectedDateObj);
  }, [selectedDateObj, fetchSlots]);

  const handleDateSelect = (date: dayjs.Dayjs) => {
    setSelectedDateObj(date);
    // fetchSlots is triggered by useEffect on selectedDateObj change
  };

  const handleSuggestNextDay = () => {
    const tomorrow = dayjs().add(1, 'day');
    setSelectedDateObj(tomorrow);
  };

const handleContinue = () => {
    if (selectedDateObj && selectedTime) {
      dispatch(setSlot({
        date: selectedDateObj.format('YYYY-MM-DD'),
        time: selectedTime,
      }));
      router.push('/checkout/patient');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textLight} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Slot</Text>
        <View style={{ width: 24 }} />
      </View>

  <ScreenWrapper
        bottomButton={
          <TouchableOpacity
            style={[styles.continueBtn, (!selectedDateObj || !selectedTime) && styles.continueBtnDisabled]}
            disabled={!selectedDateObj || !selectedTime}
            onPress={handleContinue}
          >
            <Text style={styles.continueBtnText}>Continue to Patient Details</Text>
          </TouchableOpacity>
        }
        contentContainerStyle={styles.scrollContent}
      >
        
      <View style={styles.pickerContainer}>
          <Text style={styles.sectionTitle}>Schedule Appointment</Text>

          {/* Lab mode: show selected branch info */}
          {collectionMode === 'lab' && selectedBranchName && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginTop: 4 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#E0F2F1', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                <MaterialCommunityIcons name="hospital-building" size={18} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', fontWeight: '700', letterSpacing: 0.5, marginBottom: 2 }}>
                  Selected Branch
                </Text>
                <Text style={{ fontSize: 15, color: COLORS.textDark, fontWeight: 'bold' }}>
                  {selectedBranchName}
                </Text>
              </View>
            </View>
          )}
          
          {/* Date Selector Card */}
      <TouchableOpacity 
            style={styles.premiumSelectCard} 
            activeOpacity={0.8}
         onPress={() => {
              setDatePickerVisible(true);
            }}
          >
            <View style={styles.selectIconBox}>
              <MaterialCommunityIcons name="calendar-month" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.selectMeta}>
              <Text style={styles.selectLabel}>Preferred Date</Text>
              <Text style={styles.selectValue}>
                {selectedDateObj.format('dddd, DD MMMM YYYY')}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color="#94A3B8" />
          </TouchableOpacity>

       {/* Slot Loading / Error / No Slots States */}
          {slotsLoading && (
            <View style={styles.slotStatusCard}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.slotStatusText}>Checking available slots...</Text>
            </View>
          )}

          {!slotsLoading && slotsError && (
            <View style={[styles.slotStatusCard, styles.slotErrorCard]}>
              <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#DC2626" />
              <Text style={[styles.slotStatusText, { color: '#DC2626' }]}>{slotsError}</Text>
              <TouchableOpacity onPress={() => fetchSlots(selectedDateObj)} style={styles.retryBtn}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {!slotsLoading && noSlotsForToday && (
            <View style={[styles.slotStatusCard, styles.slotWarningCard]}>
              <MaterialCommunityIcons name="calendar-clock" size={20} color="#D97706" />
              <Text style={[styles.slotStatusText, { color: '#92400E', flex: 1 }]}>
                No time slots are available for today. Please select another date.
              </Text>
              <TouchableOpacity onPress={handleSuggestNextDay} style={styles.suggestBtn}>
                <Text style={styles.suggestText}>Tomorrow →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Time Selector Card */}
          {!slotsLoading && !slotsError && !noSlotsForToday && (
            <TouchableOpacity 
              style={[
                styles.premiumSelectCard, 
                { marginTop: 16 },
                availableSlots.length === 0 && styles.disabledCard
              ]} 
              activeOpacity={availableSlots.length > 0 ? 0.8 : 1}
              onPress={() => availableSlots.length > 0 && setTimePickerVisible(true)}
            >
              <View style={[styles.selectIconBox, !selectedTime && { backgroundColor: '#F1F5F9' }]}>
                <MaterialCommunityIcons 
                  name="clock-outline" 
                  size={24} 
                  color={selectedTime ? COLORS.primary : '#64748B'} 
                />
              </View>
              <View style={styles.selectMeta}>
                <Text style={styles.selectLabel}>Arrival Time Slot</Text>
                <Text style={[styles.selectValue, !selectedTime && { color: '#64748B', fontWeight: '500' }]}>
                  {selectedTime || 'Tap to choose your time window'}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

     <View style={styles.infoCard}>
          <MaterialCommunityIcons name="information" size={20} color={COLORS.primary} />
          <Text style={styles.infoText}>
            {collectionMode === 'lab'
              ? 'Please arrive at the branch within your selected time window. Carry a valid ID and any prior reports if applicable.'
              : 'A certified phlebotomist will arrive at your address within the selected time slot. Please ensure you have completed any required fasting.'}
          </Text>
        </View>

  </ScreenWrapper>

      {/* Custom Material Picker Modals */}
<MaterialDatePickerModal
        visible={isDatePickerVisible}
        onClose={() => setDatePickerVisible(false)}
        initialDate={selectedDateObj}
        onDateSelect={handleDateSelect}
      />

 <MaterialTimeSlotModal
        visible={isTimePickerVisible}
        onClose={() => setTimePickerVisible(false)}
        slots={availableSlots}
        initialSlot={selectedTime || ''}
        onSlotSelect={(slot) => setSelectedTime(slot)}
        selectedDate={selectedDateObj}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    paddingBottom: 100,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textDark,
    marginBottom: 16,
    marginTop: 8,
  },
  dateScroll: {
    marginBottom: 24,
  },
  dateCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginRight: 12,
    ...SHADOWS.soft,
  },
  dateCardSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dayText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  dateNum: {
    ...TYPOGRAPHY.h2,
    color: COLORS.textDark,
    marginBottom: 4,
  },
  monthText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  textSelected: {
    color: COLORS.textLight,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  slotCard: {
    width: '48%',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
    ...SHADOWS.soft,
  },
  slotCardSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  slotText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textDark,
    fontWeight: 'bold',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.primaryLight + '10',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primaryLight + '30',
  },
  infoText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary,
    flex: 1,
    marginLeft: 8,
    lineHeight: 20,
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
  },
  pickerContainer: {
    marginBottom: 24,
  },
  premiumSelectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    ...SHADOWS.soft,
  },
  selectIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0F2F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  selectMeta: {
    flex: 1,
  },
  selectLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
selectValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  slotStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginTop: 16,
    gap: 10,
    ...SHADOWS.soft,
  },
  slotErrorCard: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  slotWarningCard: {
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB',
  },
  slotStatusText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  retryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },
  retryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  suggestBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  suggestText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  disabledCard: {
    opacity: 0.5,
  },
});