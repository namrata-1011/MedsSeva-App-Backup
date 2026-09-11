import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView,StyleSheet, TouchableOpacity,
  ActivityIndicator, StatusBar, Switch,
} from 'react-native';
import ScreenWrapper from '@/src/components/ScreenWrapper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import { apiService } from '@/src/services/api';
import { COLORS, SHADOWS } from '@/src/theme/theme';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIMES = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];
const MAX_BOOKINGS = [5, 8, 10, 12, 15, 20];

interface AvailabilityConfig {
  workingDays: string[];
  startTime: string;
  endTime: string;
  lunchStart: string;
  lunchEnd: string;
  maxDailyBookings: number;
}

const DEFAULT_CONFIG: AvailabilityConfig = {
  workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  startTime: '08:00',
  endTime: '18:00',
  lunchStart: '13:00',
  lunchEnd: '14:00',
  maxDailyBookings: 10,
};

export default function AvailabilityScreen() {
  const router = useRouter();
  const [isAvailable, setIsAvailable] = useState(false);
  const [config, setConfig] = useState<AvailabilityConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    (apiService as any).getPartnerAvailabilitySchedule().then((data: any) => {
      setIsAvailable(data.isAvailable ?? false);
      if (data.availability) {
        setConfig({ ...DEFAULT_CONFIG, ...data.availability });
      }
    }).catch(() => {}).finally(() => setIsLoading(false));
  }, []);

  const toggleDay = (day: string) => {
    setConfig(prev => ({
      ...prev,
      workingDays: prev.workingDays.includes(day)
        ? prev.workingDays.filter(d => d !== day)
        : [...prev.workingDays, day],
    }));
  };

  const handleSave = async () => {
    if (config.workingDays.length === 0) {
      Toast.show({ type: 'error', text1: 'Select at least one working day' });
      return;
    }
    setIsSaving(true);
    try {
      await (apiService as any).updatePartnerAvailabilitySchedule({ isAvailable, availability: config });
      Toast.show({ type: 'success', text1: 'Availability saved successfully' });
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to save availability' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

 const saveButton = (
    <TouchableOpacity
      style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
      onPress={handleSave}
      disabled={isSaving}
      activeOpacity={0.85}
    >
      {isSaving
        ? <ActivityIndicator color="#fff" size="small" />
        : <Text style={styles.saveBtnText}>Save Availability</Text>
      }
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScreenWrapper bottomButton={saveButton} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <View style={[styles.statusDot, { backgroundColor: isAvailable ? '#10B981' : '#94A3B8' }]} />
              <View>
                <Text style={styles.toggleLabel}>{isAvailable ? 'Available' : 'Offline'}</Text>
                <Text style={styles.toggleSub}>{isAvailable ? 'You can receive booking assignments' : 'You will not receive new bookings'}</Text>
              </View>
            </View>
            <Switch
              value={isAvailable}
              onValueChange={setIsAvailable}
              trackColor={{ false: '#E2E8F0', true: '#CCFBF1' }}
              thumbColor={isAvailable ? COLORS.primary : '#94A3B8'}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Working Days</Text>
          <View style={styles.daysGrid}>
            {DAYS.map(day => {
              const selected = config.workingDays.includes(day);
              return (
                <TouchableOpacity
                  key={day}
                  style={[styles.dayChip, selected && styles.dayChipSelected]}
                  onPress={() => toggleDay(day)}
                >
                  <Text style={[styles.dayChipText, selected && styles.dayChipTextSelected]}>
                    {day.slice(0, 3)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Working Hours</Text>
          <View style={styles.timeRow}>
            <View style={styles.timeGroup}>
              <Text style={styles.timeLabel}>Start Time</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.timeChips}>
                  {TIMES.slice(0, 8).map(t => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.timeChip, config.startTime === t && styles.timeChipSelected]}
                      onPress={() => setConfig(p => ({ ...p, startTime: t }))}
                    >
                      <Text style={[styles.timeChipText, config.startTime === t && styles.timeChipTextSelected]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
            <View style={styles.timeGroup}>
              <Text style={styles.timeLabel}>End Time</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.timeChips}>
                  {TIMES.slice(8).map(t => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.timeChip, config.endTime === t && styles.timeChipSelected]}
                      onPress={() => setConfig(p => ({ ...p, endTime: t }))}
                    >
                      <Text style={[styles.timeChipText, config.endTime === t && styles.timeChipTextSelected]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Lunch Break</Text>
          <View style={styles.timeRow}>
            <View style={styles.timeGroup}>
              <Text style={styles.timeLabel}>From</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.timeChips}>
                  {TIMES.slice(5, 10).map(t => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.timeChip, config.lunchStart === t && styles.timeChipSelected]}
                      onPress={() => setConfig(p => ({ ...p, lunchStart: t }))}
                    >
                      <Text style={[styles.timeChipText, config.lunchStart === t && styles.timeChipTextSelected]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
            <View style={styles.timeGroup}>
              <Text style={styles.timeLabel}>To</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.timeChips}>
                  {TIMES.slice(6, 11).map(t => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.timeChip, config.lunchEnd === t && styles.timeChipSelected]}
                      onPress={() => setConfig(p => ({ ...p, lunchEnd: t }))}
                    >
                      <Text style={[styles.timeChipText, config.lunchEnd === t && styles.timeChipTextSelected]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Maximum Daily Bookings</Text>
          <View style={styles.maxRow}>
            {MAX_BOOKINGS.map(n => (
              <TouchableOpacity
                key={n}
                style={[styles.maxChip, config.maxDailyBookings === n && styles.maxChipSelected]}
                onPress={() => setConfig(p => ({ ...p, maxDailyBookings: n }))}
              >
                <Text style={[styles.maxChipText, config.maxDailyBookings === n && styles.maxChipTextSelected]}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

</ScreenWrapper>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  content: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff', borderRadius: 18, padding: 18,
    borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 12, ...SHADOWS.soft,
  },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  toggleLabel: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  toggleSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 14 },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0',
  },
  dayChipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  dayChipText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  dayChipTextSelected: { color: '#fff' },
  timeRow: { gap: 16 },
  timeGroup: { marginBottom: 4 },
  timeLabel: { fontSize: 12, fontWeight: '700', color: '#64748B', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  timeChips: { flexDirection: 'row', gap: 8 },
  timeChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0',
  },
  timeChipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  timeChipText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  timeChipTextSelected: { color: '#fff' },
  maxRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  maxChip: {
    width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0',
  },
  maxChipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  maxChipText: { fontSize: 15, fontWeight: '800', color: '#64748B' },
  maxChipTextSelected: { color: '#fff' },
  saveBtn: {
    backgroundColor: COLORS.primary, borderRadius: 16, height: 52,
    justifyContent: 'center', alignItems: 'center', marginTop: 4,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
