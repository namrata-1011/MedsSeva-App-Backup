import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { COLORS, SHADOWS } from '../../src/theme/theme';
import { apiService } from '../../src/services/api';
import { showError, showSuccess } from '../../src/store/toastStore';
import ScreenWrapper from '../../src/components/ScreenWrapper';

export default function DeliverSampleScreen() {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [isConfirming, setIsConfirming] = useState(false);

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking-delivery', bookingId],
    queryFn: () => apiService.getBookingDetails(bookingId),
    enabled: !!bookingId,
  });

  const delivery = booking?.sampleDelivery;
  const branch = delivery?.branch;

  const handleConfirmDelivery = async () => {
    if (!bookingId) return;
    setIsConfirming(true);
    try {
      await apiService.confirmBranchDelivery(bookingId);
      showSuccess('Sample delivered successfully.');
  router.replace('/(phlebotomist)/bookings' as any);
    } catch (e: any) {
      showError(e?.response?.data?.error || 'Failed to confirm delivery.');
    } finally {
      setIsConfirming(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

return (
    <ScreenWrapper
      scrollable={false}
      bottomButton={
        <TouchableOpacity
          style={[styles.confirmBtn, isConfirming && styles.confirmBtnDisabled]}
          onPress={handleConfirmDelivery}
          disabled={isConfirming}
          activeOpacity={0.85}
        >
          {isConfirming ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialCommunityIcons name="check-bold" size={20} color="#fff" />
              <Text style={styles.confirmBtnText}>Confirm Delivery</Text>
            </>
          )}
        </TouchableOpacity>
      }
    >
      <View style={styles.header}>
        <View style={{ width: 36 }} />
        <Text style={styles.headerTitle}>Deliver Sample</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name="truck-delivery-outline" size={40} color={COLORS.primary} />
        </View>

        <Text style={styles.title}>Head to Selected Branch</Text>
        <Text style={styles.subtitle}>
          Deliver the collected sample to the branch below and tap confirm once handed over.
        </Text>

        {branch ? (
          <View style={styles.branchCard}>
            <View style={styles.branchIconWrap}>
              <MaterialCommunityIcons name="hospital-building" size={26} color={COLORS.primary} />
            </View>
            <View style={styles.branchDetails}>
              <Text style={styles.branchName}>{branch.name}</Text>
              <Text style={styles.branchCity}>{branch.city}</Text>
              <Text style={styles.branchAddress}>{branch.line1}, {branch.pincode}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.stepsCard}>
          {[
            { icon: 'test-tube', text: 'Sample is sealed and ready' },
            { icon: 'navigation', text: 'Travel to the selected branch' },
            { icon: 'hand-okay', text: 'Hand over to lab reception' },
            { icon: 'check-circle-outline', text: 'Tap confirm below' },
          ].map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepDot}>
                <MaterialCommunityIcons name={step.icon as any} size={16} color={COLORS.primary} />
              </View>
              <Text style={styles.stepText}>{step.text}</Text>
            </View>
          ))}
        </View>
      </View>

</ScreenWrapper>
  );
}

const styles = StyleSheet.create({
container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  content: { flex: 1, padding: 24, alignItems: 'center' },
  iconCircle: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: '#F0FDFA',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#CCFBF1', marginBottom: 24, marginTop: 16,
  },
  title: { fontSize: 22, fontWeight: '900', color: '#0F172A', marginBottom: 10, textAlign: 'center' },
  subtitle: {
    fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 22, marginBottom: 24,
  },
  branchCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    width: '100%', backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1.5, borderColor: COLORS.primary, marginBottom: 20, ...SHADOWS.soft,
  },
  branchIconWrap: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: '#F0FDFA',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  branchDetails: { flex: 1 },
  branchName: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 2 },
  branchCity: { fontSize: 12, fontWeight: '600', color: COLORS.primary, marginBottom: 2 },
  branchAddress: { fontSize: 12, color: '#64748B' },
  stepsCard: {
    width: '100%', backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#E2E8F0', gap: 14, ...SHADOWS.soft,
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepDot: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: '#F0FDFA',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#CCFBF1',
  },
  stepText: { fontSize: 14, fontWeight: '600', color: '#334155', flex: 1 },

  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.primary, height: 52, borderRadius: 14, gap: 10,
  },
  confirmBtnDisabled: { backgroundColor: '#CBD5E1' },
  confirmBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});
