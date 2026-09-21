import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, RefreshControl, Linking, Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import RNBlobUtil from 'react-native-blob-util';
import * as Sharing from 'expo-sharing';
import { Platform, PermissionsAndroid } from 'react-native';
import { Image } from 'expo-image';
import { showSuccess, showError } from '../../src/store/toastStore';

import { COLORS, TYPOGRAPHY, SHADOWS } from '../../src/theme/theme';
import { apiService } from '../../src/services/api';
import api from '../../src/services/api';
const STATUS_ORDER = [
  'PENDING',
  'WAITING_FOR_PARTNER',
  'ASSIGNED',
  'ACCEPTED',
  'ON_THE_WAY',
  'REACHED_LOCATION',
  'SAMPLE_COLLECTED',
  'DELIVERING_TO_BRANCH',
  'DELIVERED_TO_LAB',
  'PROCESSING',
  'REPORT_READY',
  'COMPLETED',
];


const TRACKING_STEPS = [
  { id: 1, title: 'Booking Requested', icon: 'clock-outline',        doneAtRank: 0  },
  { id: 2, title: 'Partner Assigned',  icon: 'account-check',        doneAtRank: 2  },
  { id: 3, title: 'On The Way',        icon: 'motorbike',             doneAtRank: 4  },
  { id: 4, title: 'Arrived',           icon: 'map-marker-check',     doneAtRank: 5  },
  { id: 5, title: 'Sample Collected',  icon: 'test-tube',             doneAtRank: 6  },
  { id: 6, title: 'Heading to Lab',    icon: 'truck-delivery-outline', doneAtRank: 7 },
  { id: 7, title: 'Reached Lab',       icon: 'hospital-building',    doneAtRank: 8  },
  { id: 8, title: 'Report Ready',      icon: 'file-document-check',  doneAtRank: 10 },
];
const MINI_STEPS = [
  { label: 'Booking\nRequested', icon: 'clock-outline',          doneAtRank: 0  },
  { label: 'Partner\nAssigned',  icon: 'account-check',          doneAtRank: 2  },
  { label: 'On The\nWay',        icon: 'motorbike',               doneAtRank: 4  },
  { label: 'Sample\nCollected',  icon: 'test-tube',               doneAtRank: 6  },
  { label: 'To\nLab',            icon: 'truck-delivery-outline',  doneAtRank: 7  },
  { label: 'Reached\nLab',       icon: 'hospital-building',       doneAtRank: 8  },
];
const getStatusRank = (status: string): number => {
  const rank = STATUS_ORDER.indexOf(status);
  return rank === -1 ? 0 : rank;
};
export default function TrackingScreen() {
  const { id } = useLocalSearchParams();
  const bookingId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : '';
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

const { data: bookings = null, isLoading, refetch } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => apiService.getBookingDetails(bookingId),
    enabled: !!bookingId,
   refetchInterval: 5000, // poll every 5s for near real-time updates
  });

const liveBooking = bookings;
  // Single source of truth - everything derives from this one rank value
  const currentStatusRank = getStatusRank(liveBooking?.status || 'PENDING');
  const isAssigned = liveBooking?.assignedPartnerId != null || liveBooking?.assignedExecutiveId != null || liveBooking?.assignedExecutive != null;
  const isPaidOnline = liveBooking?.paymentStatus === 'SUCCESS';
  const otp = liveBooking?.collectionOtp;
  const showOtp = otp && !liveBooking?.otpVerified && ['ASSIGNED', 'ACCEPTED', 'ON_THE_WAY', 'REACHED_LOCATION'].includes(liveBooking?.status);

  const [downloading, setDownloading] = useState(false);

  const handleDownloadInvoice = async () => {
    let invoiceUrl = liveBooking?.payment?.invoiceUrl;
    const bookingCode = liveBooking?.bookingCode || 'Invoice';
    if (!invoiceUrl && liveBooking?.id) {
      const baseUrl = api.defaults.baseURL || 'http://localhost:5000/api';
      invoiceUrl = `${baseUrl}/payments/invoice/${liveBooking.id}/pdf`;
    }
    if (!invoiceUrl) return;

    setDownloading(true);
    try {
      const fileName = `MedSeva-Invoice-${bookingCode}.pdf`;
      
      if (Platform.OS === 'android') {
        const downloadPath = `${RNBlobUtil.fs.dirs.DownloadDir}/${fileName}`;
        await RNBlobUtil.config({
          path: downloadPath,
          addAndroidDownloads: {
            useDownloadManager: true,
            notification: true,
            title: fileName,
            description: 'MedsSeva Invoice PDF',
            mime: 'application/pdf',
            path: downloadPath,
          },
        }).fetch('GET', invoiceUrl);

        showSuccess('Invoice downloaded to your Notifications and Downloads folder.');
        setTimeout(() => {
          RNBlobUtil.android.actionViewIntent(downloadPath, 'application/pdf').catch(() => {});
        }, 1000);
      } else {
        const tempPath = `${RNBlobUtil.fs.dirs.CacheDir}/${fileName}`;
        const res = await RNBlobUtil.config({ path: tempPath, fileCache: true }).fetch('GET', invoiceUrl);
        await RNBlobUtil.ios.previewDocument(res.path());
      }
    } catch {
      Alert.alert('Error', 'Failed to download and open invoice.');
    } finally {
      setDownloading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleCall = () => {
    const mobile = liveBooking?.assignedPartner?.user?.mobile || liveBooking?.assignedExecutive?.mobile;
    if (mobile) Linking.openURL(`tel:${mobile}`);
  };

  const partnerName = liveBooking?.assignedPartner?.user?.name || liveBooking?.assignedExecutive?.name;
  const partnerRole = liveBooking?.assignedPartner?.role === 'PHLEBOTOMIST'
    ? 'Phlebotomist'
    : (liveBooking?.assignedPartner?.role || (liveBooking?.assignedExecutive ? 'Phlebotomist' : 'Sample Collection Executive'));
  const partnerRating = liveBooking?.assignedPartner?.rating?.toFixed(1) || '5.0';
  const testNames = liveBooking?.tests?.map((t: any) => t.test?.name).filter(Boolean).join(', ') || 'Diagnostic Test';

  const hasInvoice = !!liveBooking?.payment?.invoiceUrl || !!liveBooking?.id;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textLight} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Track Booking</Text>
        <View style={{ width: 24 }} />
      </View>

   {/* Live Partner Tracking Card - replaces fake map */}
      <View style={styles.trackingCard}>
     {/* Status Banner */}
      {(() => {
          const s = liveBooking?.status;
          const bannerColor =
            s === 'WAITING_FOR_PARTNER' ? '#F59E0B' :
            s === 'ASSIGNED' || s === 'ACCEPTED' ? COLORS.primary :
            s === 'ON_THE_WAY' ? '#7C3AED' :
            s === 'REACHED_LOCATION' ? '#059669' :
            s === 'SAMPLE_COLLECTED' ? '#0284C7' :
            s === 'DELIVERED_TO_LAB' || s === 'PROCESSING' ? '#0F172A' :
            s === 'REPORT_READY' || s === 'COMPLETED' ? '#059669' :
            '#F59E0B';

  const bannerConfig: { icon: string; text: string } =
            s === 'WAITING_FOR_PARTNER'  ? { icon: 'radar',               text: 'Searching for a nearby partner...' } :
            s === 'ASSIGNED'             ? { icon: 'account-search',       text: 'Partner found, Confirming assignment...' } :
            s === 'ACCEPTED'             ? { icon: 'account-check',        text: 'Partner Assigned, Preparing to visit' } :
            s === 'ON_THE_WAY'           ? { icon: 'motorbike',            text: `On The Way, ${partnerName || 'Partner'} is heading to you` } :
            s === 'REACHED_LOCATION'     ? { icon: 'map-marker-check',     text: `Arrived: ${partnerName || 'Partner'} is at your location` } :
            s === 'SAMPLE_COLLECTED'     ? { icon: 'test-tube',            text: 'Sample Collected - Heading to lab' } :
            s === 'DELIVERING_TO_BRANCH' ? { icon: 'truck-delivery-outline', text: 'Sample en route to the lab branch' } :
            s === 'DELIVERED_TO_LAB'     ? { icon: 'hospital-building',    text: 'Reached Lab, Sample handed over' } :
            s === 'PROCESSING'           ? { icon: 'flask-outline',        text: 'Processing, Tests underway at lab' } :
            s === 'REPORT_READY'         ? { icon: 'file-document-check',  text: 'Report Ready, Check your reports tab' } :
            s === 'COMPLETED'            ? { icon: 'check-circle-outline', text: 'Completed! Thank you for choosing MedSeva' } :
                                           { icon: 'clock-outline',        text: 'Booking received, finding a partner...' };

          return (
            <View style={[styles.statusBanner, { backgroundColor: bannerColor }]}>
              <MaterialCommunityIcons name={bannerConfig.icon as any} size={16} color="#fff" />
              <Text style={styles.statusBannerText}>{bannerConfig.text}</Text>
            </View>
          );
        })()}
        {/* Partner Info */}
        {isAssigned ? (
          <View style={styles.partnerInfoRow}>
            <View style={styles.partnerAvatarWrap}>
              <View style={styles.partnerAvatar}>
                {liveBooking?.assignedPartner?.user?.avatarUrl ? (
                  <Image source={{ uri: liveBooking.assignedPartner.user.avatarUrl }} style={{ width: 56, height: 56, borderRadius: 28 }} />
                ) : (
                  <MaterialCommunityIcons name="account" size={32} color={COLORS.primary} />
                )}
              </View>
              <View style={styles.onlineDot} />
            </View>
            <View style={styles.partnerDetails}>
              <Text style={styles.partnerNameText}>{partnerName || '-'}</Text>
              <Text style={styles.partnerRoleText}>{partnerRole}</Text>
              <View style={styles.ratingRow}>
                <MaterialCommunityIcons name="star" size={13} color="#F59E0B" />
                <Text style={styles.ratingText}>{partnerRating}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.callBtn} onPress={handleCall}>
              <MaterialCommunityIcons name="phone" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.searchingRow}>
            <View style={styles.searchIconWrap}>
              <MaterialCommunityIcons name="radar" size={28} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.searchingTitle}>Finding Nearest Executive</Text>
              <Text style={styles.searchingSubtitle}>We'll notify you as soon as one is assigned</Text>
            </View>
          </View>
        )}

{/* Horizontal mini tracker - driven purely from currentStatusRank */}
        <View style={styles.miniStepsRow}>
          {MINI_STEPS.map((step, i, arr) => {
            const isDone = currentStatusRank >= step.doneAtRank;
            const nextIsDone = i < arr.length - 1
              ? currentStatusRank >= arr[i + 1].doneAtRank
              : false;
            return (
              <React.Fragment key={step.label}>
                <View style={styles.miniStep}>
                  <View style={[styles.miniStepCircle, isDone && styles.miniStepCircleActive]}>
                    <MaterialCommunityIcons name={step.icon as any} size={12} color={isDone ? '#fff' : '#CBD5E1'} />
                  </View>
                  <Text style={[styles.miniStepLabel, isDone && styles.miniStepLabelActive]}>{step.label}</Text>
                </View>
                {i < arr.length - 1 && (
                  <View style={[styles.miniStepLine, nextIsDone && styles.miniStepLineActive]} />
                )}
              </React.Fragment>
            );
          })}
        </View>
      </View>

  <ScrollView
        style={styles.timelineContainer}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      >
        {isLoading ? (
          <ActivityIndicator color={COLORS.primary} size="large" style={{ marginVertical: 20 }} />
        ) : (
          <>
            {/* OTP Box - only for pay-at-doorstep */}
            {showOtp && (
              <View style={styles.otpCard}>
                <MaterialCommunityIcons name="shield-key-outline" size={22} color={COLORS.primary} />
                <View style={styles.otpTextBlock}>
                  <Text style={styles.otpLabel}>Verification OTP</Text>
                  <Text style={styles.otpSubLabel}>Share this with the executive when they arrive</Text>
                </View>
                <Text style={styles.otpValue}>{otp}</Text>
              </View>
            )}

     {/* Payment status */}
            {isPaidOnline ? (
              <View style={styles.paidBadgeCard}>
                <MaterialCommunityIcons name="check-circle" size={18} color="#10B981" />
                <Text style={styles.paidBadgeText}>Payment Done</Text>
              </View>
            ) : liveBooking?.paymentStatus === 'PENDING' && ['ASSIGNED', 'ACCEPTED', 'ON_THE_WAY', 'REACHED_LOCATION'].includes(liveBooking?.status) ? (
              <View style={styles.pendingPayCard}>
                <MaterialCommunityIcons name="cash-clock" size={18} color="#D97706" />
                <Text style={styles.pendingPayText}>Payment pending, Partner will collect at your doorstep</Text>
              </View>
            ) : null}

            {/* Patient + Test info */}
            <View style={styles.patientInfoContainer}>
              <View style={styles.patientInfoCol}>
                <Text style={styles.patientLabel}>Patient</Text>
                <Text style={styles.patientValue}>{liveBooking?.patientName || '-'}</Text>
              </View>
              <View style={[styles.patientInfoCol, { marginLeft: 16 }]}>
                <Text style={styles.patientLabel}>Tests</Text>
                <Text style={styles.patientValue} numberOfLines={2}>{testNames}</Text>
              </View>
            </View>

           <Text style={styles.bookingIdText}>
              Booking Code: {liveBooking?.bookingCode || bookingId?.substring(0, 8).toUpperCase()}
            </Text>

            {['DELIVERED_TO_LAB', 'PROCESSING', 'REPORT_READY', 'COMPLETED'].includes(liveBooking?.status) &&
              liveBooking?.collectionMode === 'HOME' &&
              liveBooking?.assignedPartnerId ? (
              <TouchableOpacity
                style={styles.ratingPromptCard}
                onPress={() =>
                  router.push({
                    pathname: `/rating/${bookingId}`,
                    params: {
                      bookingCode: liveBooking?.bookingCode || '',
                      partnerName: liveBooking?.assignedPartner?.user?.name || '',
                    },
                  } as any)
                }
              >
                <View style={styles.ratingPromptLeft}>
                  <MaterialCommunityIcons name="star-outline" size={22} color="#F59E0B" />
                  <View>
                    <Text style={styles.ratingPromptTitle}>Rate Your Experience</Text>
                    <Text style={styles.ratingPromptSub}>How was your sample collection?</Text>
                  </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#F59E0B" />
              </TouchableOpacity>
            ) : null}
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
    marginHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    ...SHADOWS.soft,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    gap: 8,
  },
  statusBannerText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  partnerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  partnerAvatarWrap: {
    position: 'relative',
  },
  partnerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F0FDFA',
    borderWidth: 2,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#fff',
  },
  partnerDetails: {
    flex: 1,
  },
  partnerNameText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 2,
  },
  partnerRoleText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  callBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.soft,
  },
  searchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  searchIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F0FDFA',
    borderWidth: 2,
    borderColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchingTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 3,
  },
  searchingSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  miniStepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 4,
  },
  miniStep: {
    alignItems: 'center',
    gap: 4,
  },
miniStepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  miniStepCircleActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
miniStepLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 2,
  },
  miniStepLabelActive: {
    color: COLORS.primary,
  },
  miniStepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginBottom: 14,
    marginHorizontal: 4,
  },
  miniStepLineActive: {
    backgroundColor: COLORS.primary,
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
bookingIdText: {
    ...TYPOGRAPHY.subtitle,
    color: COLORS.textDark,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  ratingPromptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
  },
  ratingPromptLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  ratingPromptTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400E',
    marginBottom: 2,
  },
  ratingPromptSub: {
    fontSize: 12,
    color: '#B45309',
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
 pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
otpCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F0FDFA', borderRadius: 16, padding: 16,
    borderWidth: 1.5, borderColor: COLORS.primary,
    marginBottom: 16, gap: 12,
  },
  otpTextBlock: { flex: 1 },
  otpLabel: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  otpSubLabel: { fontSize: 11, color: '#64748B', marginTop: 2 },
  otpValue: { fontSize: 28, fontWeight: '900', color: COLORS.primary, letterSpacing: 4 },
  paidBadgeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#DCFCE7', borderRadius: 12, padding: 12,
    marginBottom: 16, borderWidth: 1, borderColor: '#BBF7D0',
  },
paidBadgeText: { fontSize: 13, fontWeight: '600', color: '#065F46', flex: 1 },
  pendingPayCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF3C7', borderRadius: 12, padding: 12,
    marginBottom: 16, borderWidth: 1, borderColor: '#FDE68A',
  },
  pendingPayText: { fontSize: 13, fontWeight: '600', color: '#92400E', flex: 1 },
  patientInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
 

});