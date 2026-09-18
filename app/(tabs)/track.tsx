import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, AppState } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { View as RNView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector } from 'react-redux';
import messaging from '@react-native-firebase/messaging';

import { COLORS, TYPOGRAPHY } from '../../src/theme/theme';
import { RootState } from '../../src/store';
import { apiService } from '../../src/services/api';

let MapView: any, Marker: any, Polyline: any;
MapView = ({ children, style }: any) => <RNView style={style}><Text>Map Placeholder</Text>{children}</RNView>;
Marker = ({ children }: any) => <RNView>{children}</RNView>;
Polyline = () => <RNView />;

const STATUS_STEPS = [
  { key: 'ACCEPTED', label: 'Booking Accepted', icon: 'calendar-check' },
  { key: 'ON_THE_WAY', label: 'Partner On The Way', icon: 'motorbike' },
  { key: 'REACHED_LOCATION', label: 'Partner Arrived', icon: 'map-marker-check' },
  { key: 'SAMPLE_COLLECTED', label: 'Sample Collected', icon: 'test-tube' },
  { key: 'DELIVERED_TO_LAB', label: 'Delivered to Lab', icon: 'flask' },
  { key: 'PROCESSING', label: 'Processing', icon: 'cog' },
  { key: 'REPORT_READY', label: 'Report Ready', icon: 'file-document-check' },
];

const STATUS_ORDER: Record<string, number> = {
  PENDING: 0,
  CONFIRMED: 0,
  WAITING_FOR_ASSIGNMENT: 0,
  WAITING_FOR_PARTNER: 0,
  ASSIGNED: 0,
  ACCEPTED: 1,
  ON_THE_WAY: 2,
  REACHED_LOCATION: 3,
  SAMPLE_COLLECTED: 4,
  DELIVERED_TO_LAB: 5,
  PROCESSING: 6,
  REPORT_READY: 7,
  COMPLETED: 8,
};

const getEtaText = (status: string): string => {
  switch (status) {
    case 'ACCEPTED': return 'Partner accepted your booking';
    case 'ON_THE_WAY': return 'Partner is on the way';
    case 'REACHED_LOCATION': return 'Partner has arrived';
    case 'SAMPLE_COLLECTED': return 'Sample collected successfully';
    case 'DELIVERED_TO_LAB': return 'Sample delivered to lab';
    case 'PROCESSING': return 'Lab is processing your sample';
    case 'REPORT_READY': return 'Your report is ready!';
    case 'COMPLETED': return 'Booking completed';
    default: return 'Finding a partner...';
  }
};

export default function TrackScreen() {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams<{ bookingId?: string }>();
  const user = useSelector((s: RootState) => s.auth.user);

const [booking, setBooking] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const bookingIdRef = useRef<string | null>(null);
  const pollRef2 = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchBooking = useCallback(async (id: string) => {
    try {
      const data = await apiService.getBookingDetails(id);
      setBooking(data);
      bookingIdRef.current = data?.id || id;
    } catch (e) {
      console.warn('Failed to fetch booking for tracking', e);
    } finally {
      setIsLoading(false);
    }
  }, []);
  const loadLatestActiveBooking = useCallback(async () => {
    try {
      const bookings = await apiService.getBookings(user?.mobile || '');
      const active = Array.isArray(bookings)
        ? bookings.find((b: any) =>
            ['ACCEPTED', 'ON_THE_WAY', 'REACHED_LOCATION', 'SAMPLE_COLLECTED', 'DELIVERED_TO_LAB', 'PROCESSING', 'REPORT_READY'].includes(b.status)
          )
        : null;
      if (active) {
        setBooking(active);
      }
    } catch (e) {
      console.warn('Failed to load active booking', e);
    } finally {
      setIsLoading(false);
    }
  }, [user?.mobile]);

useEffect(() => {
    if (bookingId) {
      fetchBooking(bookingId);
    } else {
      loadLatestActiveBooking();
    }

    pollRef2.current = setInterval(() => {
      const id = bookingId || bookingIdRef.current;
      if (id) {
        fetchBooking(id);
      } else {
        loadLatestActiveBooking();
      }
    }, 5000);

    return () => {
      if (pollRef2.current) clearInterval(pollRef2.current);
    };
  }, [bookingId]);

useEffect(() => {
    const unsubscribe = messaging().onMessage(async (remoteMessage) => {
      const type = remoteMessage?.data?.type;
      const trackingTypes = [
        'BOOKING_ACCEPTED',
        'PARTNER_ON_THE_WAY',
        'PARTNER_ARRIVED',
        'SAMPLE_COLLECTED',
        'SAMPLE_RECEIVED_IN_LAB',
        'PAYMENT_SUCCESS',
        'REPORT_READY',
        'BOOKING_CANCELLED',
      ];
      if (trackingTypes.includes(String(type || ''))) {
        const id = bookingId || bookingIdRef.current;
        if (id) fetchBooking(id);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: any) => {
      if (state === 'active') {
        const id = bookingId || bookingIdRef.current;
        if (id) fetchBooking(id);
      }
    });

    return () => sub.remove();
  }, []);

  const currentStatusIndex = booking ? (STATUS_ORDER[booking.status] ?? 0) : 0;
  const partner = booking?.assignedPartner;
  const partnerName = partner?.user?.name || 'Partner';
  const partnerMobile = partner?.user?.mobile || '';

  return (
    <View style={styles.container}>
      <View style={styles.headerOverlay}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Live Tracking</Text>
        <TouchableOpacity style={styles.helpButton} onPress={() => router.push('/support' as any)}>
          <MaterialCommunityIcons name="help-circle-outline" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {Platform.OS === 'web' ? (
        <View style={styles.webMapFallback}>
          <MaterialCommunityIcons name="map-marker-radius" size={60} color={COLORS.primary} />
          <Text style={styles.webMapText}>Map view is not supported on web preview.</Text>
          <Text style={styles.webMapSubText}>Please use an iOS or Android device.</Text>
        </View>
      ) : (
        <MapView style={styles.map} />
      )}

      <View style={styles.bottomSheet}>
        <View style={styles.etaContainer}>
          <LinearGradient colors={['#F0F9FF', '#E0F2FE']} style={styles.etaBadge}>
            <MaterialCommunityIcons name="clock-fast" size={20} color={COLORS.primary} />
            <Text style={styles.etaText}>
              {isLoading ? 'Loading...' : getEtaText(booking?.status || '')}
            </Text>
          </LinearGradient>
          {booking?.bookingCode && (
            <Text style={styles.bookingId}>#{booking.bookingCode}</Text>
          )}
        </View>

        <View style={styles.timelineRow}>
          {STATUS_STEPS.map((step, idx) => {
            const isDone = idx < currentStatusIndex;
            const isActive = idx === currentStatusIndex - 1 || (currentStatusIndex === 0 && idx === 0);
            return (
              <React.Fragment key={step.key}>
                <View style={styles.timelineStep}>
                  <View style={[
                    styles.timelineDot,
                    isDone && styles.timelineDotDone,
                    isActive && styles.timelineDotActive,
                  ]}>
                    <MaterialCommunityIcons
                      name={step.icon as any}
                      size={10}
                      color={isDone || isActive ? '#fff' : '#CBD5E1'}
                    />
                  </View>
                  <Text style={[styles.timelineLabel, (isDone || isActive) && styles.timelineLabelActive]} numberOfLines={2}>
                    {step.label}
                  </Text>
                </View>
                {idx < STATUS_STEPS.length - 1 && (
                  <View style={[styles.timelineLine, isDone && styles.timelineLineDone]} />
                )}
              </React.Fragment>
            );
          })}
        </View>

        <View style={styles.divider} />

        {booking && partner ? (
          <View style={styles.techProfileRow}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatarCircle}>
                <MaterialCommunityIcons name="account" size={28} color={COLORS.primary} />
              </View>
              <View style={styles.ratingBadge}>
                <Text style={styles.ratingText}>{partner?.rating?.toFixed(1) || '5.0'}</Text>
                <MaterialCommunityIcons name="star" size={10} color="#fff" />
              </View>
            </View>
            <View style={styles.techInfo}>
              <Text style={styles.techName}>{partnerName}</Text>
              <Text style={styles.techRole}>Sample Collection Executive</Text>
            </View>
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/support/chat')}>
                <MaterialCommunityIcons name="message-processing" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.waitingRow}>
            <MaterialCommunityIcons name="account-search-outline" size={24} color="#94A3B8" />
            <Text style={styles.waitingText}>
              {isLoading ? 'Loading booking details...' : 'Finding a partner for your booking...'}
            </Text>
          </View>
        )}

        <View style={styles.preparationBox}>
          <MaterialCommunityIcons name="information" size={20} color="#D97706" />
          <Text style={styles.prepText}>
            {booking?.status === 'REPORT_READY'
              ? 'Your report is ready. Go to Reports tab to view and download it.'
              : 'Reminder: Please ensure 10-12 hours of fasting before the sample collection.'}
          </Text>
        </View>

        {booking?.status === 'REPORT_READY' && (
          <TouchableOpacity
            style={styles.reportBtn}
            onPress={() => router.push('/(tabs)/reports')}
          >
            <MaterialCommunityIcons name="file-document-check" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.reportBtnText}>View Report</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  headerOverlay: {
    position: 'absolute', top: 50, left: 20, right: 20, zIndex: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 30,
    paddingHorizontal: 16, paddingVertical: 12,
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
  },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { ...TYPOGRAPHY.h3, color: COLORS.textDark },
  helpButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F0F9FF', justifyContent: 'center', alignItems: 'center' },
  map: { flex: 1 },
  webMapFallback: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E2E8F0' },
  webMapText: { ...TYPOGRAPHY.h3, color: COLORS.textDark, marginTop: 16 },
  webMapSubText: { ...TYPOGRAPHY.body, color: '#64748B', marginTop: 8 },
  bottomSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30,
    padding: 20, paddingBottom: 36,
    elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.1, shadowRadius: 10,
  },
  etaContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  etaBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  etaText: { ...TYPOGRAPHY.subtitle, color: COLORS.primary, fontWeight: 'bold', marginLeft: 8 },
  bookingId: { ...TYPOGRAPHY.caption, color: '#64748B' },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16, paddingHorizontal: 4 },
  timelineStep: { alignItems: 'center', width: 44 },
  timelineDot: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  timelineDotDone: { backgroundColor: COLORS.primary },
  timelineDotActive: { backgroundColor: '#059669' },
  timelineLabel: { fontSize: 8, color: '#94A3B8', textAlign: 'center', lineHeight: 11 },
  timelineLabelActive: { color: COLORS.primary, fontWeight: '700' },
  timelineLine: { flex: 1, height: 2, backgroundColor: '#E2E8F0', marginTop: 10 },
  timelineLineDone: { backgroundColor: COLORS.primary },
  divider: { height: 1, backgroundColor: '#E2E8F0', marginBottom: 16 },
  techProfileRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatarContainer: { position: 'relative', marginRight: 16 },
  avatarCircle: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: '#F0FDFA', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#CCFBF1',
  },
  ratingBadge: {
    position: 'absolute', bottom: -5, right: -5,
    backgroundColor: '#059669', flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 5, paddingVertical: 2, borderRadius: 8, borderWidth: 1.5, borderColor: '#fff',
  },
  ratingText: { fontSize: 9, fontWeight: 'bold', color: '#fff', marginRight: 2 },
  techInfo: { flex: 1 },
  techName: { ...TYPOGRAPHY.h3, color: COLORS.textDark },
  techRole: { ...TYPOGRAPHY.caption, color: '#64748B', marginTop: 2 },
  actionButtons: { flexDirection: 'row' },
  iconButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#F0F9FF', justifyContent: 'center', alignItems: 'center', marginLeft: 8,
  },
  waitingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, paddingVertical: 8 },
  waitingText: { fontSize: 13, color: '#94A3B8', flex: 1 },
  preparationBox: {
    flexDirection: 'row', backgroundColor: '#FEF3C7',
    padding: 14, borderRadius: 12, alignItems: 'flex-start', marginBottom: 12,
  },
  prepText: { ...TYPOGRAPHY.caption, color: '#D97706', marginLeft: 10, flex: 1, lineHeight: 18 },
  reportBtn: {
    flexDirection: 'row', backgroundColor: '#059669',
    height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
  },
  reportBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },
});