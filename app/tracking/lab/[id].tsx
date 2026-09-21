import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, RefreshControl
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import { COLORS, TYPOGRAPHY, SHADOWS } from '../../../src/theme/theme';
import { apiService } from '../../../src/services/api';

const STATUS_ORDER = [
  'PENDING',
  'WAITING_FOR_ASSIGNMENT',
  'CONFIRMED',
  'PATIENT_REACHED_LAB',
  'PAYMENT_PENDING',
  'PAYMENT_COMPLETED',
  'SAMPLE_COLLECTED',
  'PROCESSING',
  'REPORT_READY',
  'COMPLETED',
];

const TRACKING_STEPS = [
  { id: 1, title: 'Booking Created', icon: 'calendar-check', doneAtRank: 0 },
  { id: 2, title: 'Waiting for Lab Approval', icon: 'clock-outline', doneAtRank: 1 },
  { id: 3, title: 'Booking Accepted', icon: 'check-decagram-outline', doneAtRank: 2 },
  { id: 4, title: 'Visit Lab on Scheduled Date & Time', icon: 'hospital-building', doneAtRank: 2 },
  { id: 5, title: 'Reached the Lab', icon: 'map-marker-check', doneAtRank: 3 },
  { id: 6, title: 'Payment Pending', icon: 'credit-card-clock-outline', doneAtRank: 4 },
  { id: 7, title: 'Payment Completed', icon: 'credit-card-check-outline', doneAtRank: 5 },
  { id: 8, title: 'Sample Collected', icon: 'test-tube', doneAtRank: 6 },
  { id: 9, title: 'Processing', icon: 'flask-outline', doneAtRank: 7 },
  { id: 10, title: 'Report Ready', icon: 'file-document-check', doneAtRank: 8 },
  { id: 11, title: 'Completed', icon: 'check-circle', doneAtRank: 9 },
];

const getDerivedStatusRank = (status: string, paymentStatus?: string): number => {
  if (status === 'PATIENT_REACHED_LAB') {
    return paymentStatus === 'SUCCESS' ? 5 : 4;
  }
  const rank = STATUS_ORDER.indexOf(status);
  return rank === -1 ? 0 : rank;
};
export default function LabTrackingScreen() {
  const { id } = useLocalSearchParams();
  const bookingId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : '';
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [reachingLab, setReachingLab] = useState(false);

  const { data: bookings = null, isLoading, refetch } = useQuery({
    queryKey: ['lab-booking', bookingId],
    queryFn: () => apiService.getBookingDetails(bookingId),
    enabled: !!bookingId,
    refetchInterval: 8000,
  });

const liveBooking = bookings;
  const isRejected = liveBooking?.status === 'REJECTED';
  const currentStatusRank = getDerivedStatusRank(liveBooking?.status || 'PENDING', liveBooking?.paymentStatus);
  const branchName = liveBooking?.branch?.name;
  const testNames = liveBooking?.tests?.map((t: any) => t.test?.name).filter(Boolean).join(', ') || 'Diagnostic Test';

const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleReachedLab = async () => {
    if (!bookingId || reachingLab) return;
    setReachingLab(true);
    try {
      await apiService.patientReachedLab(bookingId);
      await refetch();
    } catch (e) {
      console.error('Failed to mark reached lab', e);
    }
    setReachingLab(false);
  };

  const statusBannerConfig = (() => {
    if (isRejected) {
      return { color: '#DC2626', icon: 'close-circle', text: 'Booking Rejected by Lab' };
    }
    const s = liveBooking?.status;
    if (s === 'PENDING' || s === 'WAITING_FOR_ASSIGNMENT') {
      return { color: '#F59E0B', icon: 'clock-outline', text: 'Waiting for Lab Approval' };
    }
if (s === 'CONFIRMED') {
      return { color: COLORS.primary, icon: 'check-decagram-outline', text: 'Accepted - Visit the lab at your scheduled slot' };
    }
 if (s === 'PATIENT_REACHED_LAB' && liveBooking?.paymentStatus !== 'SUCCESS') {
      return { color: '#7C3AED', icon: 'map-marker-check', text: 'You have reached the lab, Please complete payment at the counter' };
    }
    if (s === 'PATIENT_REACHED_LAB' && liveBooking?.paymentStatus === 'SUCCESS') {
      return { color: '#059669', icon: 'credit-card-check-outline', text: 'Payment received - Waiting for sample collection' };
    }
    if (s === 'SAMPLE_COLLECTED') {
      return { color: '#0284C7', icon: 'test-tube', text: 'Sample Collected at Lab' };
    }
    if (s === 'PROCESSING') {
      return { color: '#0F172A', icon: 'flask-outline', text: 'Processing - Tests underway at lab' };
    }
    if (s === 'REPORT_READY') {
      return { color: '#059669', icon: 'file-document-check', text: 'Report Ready - Check your reports tab' };
    }
    if (s === 'COMPLETED') {
      return { color: '#059669', icon: 'check-circle-outline', text: 'Completed - Thank you for choosing MedsSeva' };
    }
    return { color: '#F59E0B', icon: 'clock-outline', text: 'Processing your booking...' };
  })();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textLight} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Track Lab Visit</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.trackingCard}>
        <View style={[styles.statusBanner, { backgroundColor: statusBannerConfig.color }]}>
          <MaterialCommunityIcons name={statusBannerConfig.icon as any} size={16} color="#fff" />
          <Text style={styles.statusBannerText}>{statusBannerConfig.text}</Text>
        </View>


        {liveBooking?.status === 'CONFIRMED' && (
          <TouchableOpacity
            style={styles.reachedBtn}
            onPress={handleReachedLab}
            disabled={reachingLab}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="map-marker-check" size={18} color="#fff" />
            <Text style={styles.reachedBtnText}>
              {reachingLab ? 'Updating...' : 'I Reached the Lab'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

 <ScrollView
        style={styles.timelineContainer}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      >
        {isLoading ? (
          <ActivityIndicator color={COLORS.primary} size="large" style={{ marginVertical: 20 }} />
        ) : isRejected ? (
          <View style={styles.rejectedCard}>
            <MaterialCommunityIcons name="close-circle-outline" size={32} color="#DC2626" />
            <Text style={styles.rejectedTitle}>Booking Rejected</Text>
            <Text style={styles.rejectedText}>
              {liveBooking?.rejectionReason || 'The lab was unable to accept this booking.'}
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.patientInfoContainer}>
              <View style={{ flexDirection: 'row', marginBottom: branchName ? 16 : 0 }}>
                <View style={styles.patientInfoCol}>
                  <Text style={styles.patientLabel}>Patient</Text>
                  <Text style={styles.patientValue}>{liveBooking?.patientName || '-'}</Text>
                </View>
                <View style={[styles.patientInfoCol, { marginLeft: 16 }]}>
                  <Text style={styles.patientLabel}>Tests</Text>
                  <Text style={styles.patientValue} numberOfLines={2}>{testNames}</Text>
                </View>
              </View>
              {branchName && (
                <View>
                  <Text style={styles.patientLabel}>Selected Branch</Text>
                  <Text style={styles.patientValue}>{branchName}</Text>
                </View>
              )}
            </View>

            <Text style={styles.bookingIdText}>
              Booking Code: {liveBooking?.bookingCode || bookingId?.substring(0, 8).toUpperCase()}
            </Text>

            <View style={styles.timeline}>
              {TRACKING_STEPS.map((step, index) => {
                const isCompleted = currentStatusRank >= step.doneAtRank;
                const prevDoneAtRank = index === 0 ? -1 : TRACKING_STEPS[index - 1].doneAtRank;
                const isCurrent = !isCompleted && currentStatusRank >= prevDoneAtRank;
                const isLast = index === TRACKING_STEPS.length - 1;
                return (
                  <View key={step.id} style={styles.stepRow}>
                    <View style={styles.stepIndicatorContainer}>
                      <View style={[
                        styles.stepCircle,
                        isCompleted && styles.stepCircleCompleted,
                        isCurrent && styles.stepCircleCurrent,
                      ]}>
                        {isCompleted
                          ? <MaterialCommunityIcons name="check" size={14} color={COLORS.textLight} />
                          : <MaterialCommunityIcons name={step.icon as any} size={14} color={isCurrent ? COLORS.primary : COLORS.border} />
                        }
                      </View>
                      {!isLast && <View style={[styles.stepLine, isCompleted && styles.stepLineCompleted]} />}
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={[styles.stepTitle, (isCompleted || isCurrent) && styles.stepTitleCompleted]}>
                        {step.title}
                      </Text>
                      <Text style={[styles.stepTime, isCompleted && styles.stepTimeDone, isCurrent && styles.stepTimeCurrent]}>
                        {isCompleted ? 'Done' : isCurrent ? 'In Progress' : 'Pending'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
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
  trackingCard: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    ...SHADOWS.soft,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  statusBannerText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  branchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 10,
  },
  branchText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  timelineContainer: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    padding: 24,
    ...SHADOWS.soft,
  },
  rejectedCard: {
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 16,
    padding: 24,
    marginTop: 16,
  },
  rejectedTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#991B1B',
    marginTop: 10,
    marginBottom: 6,
  },
  rejectedText: {
    fontSize: 13,
    color: '#991B1B',
    textAlign: 'center',
    lineHeight: 18,
  },
  patientInfoContainer: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
    ...SHADOWS.soft,
  },
  patientInfoCol: {
    flex: 1,
  },
  patientLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  patientValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  bookingIdText: {
    ...TYPOGRAPHY.subtitle,
    color: COLORS.textDark,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  timeline: {
    paddingLeft: 8,
  },
  stepRow: {
    flexDirection: 'row',
  },
  stepIndicatorContainer: {
    alignItems: 'center',
    marginRight: 16,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleCompleted: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  stepCircleCurrent: {
    borderWidth: 3,
    borderColor: COLORS.primaryLight,
  },
  stepLine: {
    width: 2,
    height: 40,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  stepLineCompleted: {
    backgroundColor: COLORS.primary,
  },
  stepContent: {
    flex: 1,
    paddingTop: 4,
    paddingBottom: 24,
  },
  stepTitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  stepTitleCompleted: {
    color: COLORS.textDark,
  },
  stepTime: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  stepTimeDone: {
    color: COLORS.primary,
    fontWeight: '700',
  },
stepTimeCurrent: {
    color: '#D97706',
    fontWeight: '700',
  },
  reachedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C3AED',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  reachedBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
});