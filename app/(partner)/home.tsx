import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  RefreshControl, StatusBar, Switch, ActivityIndicator, Platform
} from 'react-native';
import ScreenWrapper from '../../src/components/ScreenWrapper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useSelector } from 'react-redux';
import { useRouter } from 'expo-router';
import { RootState } from '../../src/store';
import { apiService } from '../../src/services/api';
import { COLORS, SHADOWS } from '../../src/theme/theme';
import { showError } from '../../src/store/toastStore';
import { ConfirmSheet } from '../../src/components/ConfirmSheet';
import { useNotificationPermission } from '../../src/hooks/useNotificationPermission';
import { NotificationCenter } from '../../src/components/NotificationCenter';
import { Modal } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';


interface BookingRequest {
  id: string;
  bookingCode: string;
  patientName: string;
  patientMobile?: string;
  scheduledDate: string;
  scheduledSlot: string;
  collectionAddress?: string;
  distanceKm?: string;
  tests: { name: string }[];
  status: string;
}

interface Stats {
  todayJobs: number;
  pending: number;
  accepted: number;
  completedToday: number;
  completedPercent: number;
  trendPercentage?: number;
}

export default function PartnerHomeScreen() {
  const router = useRouter();
  const user = useSelector((s: RootState) => s.auth.user);
  const [isAvailable, setIsAvailable] = useState(user?.partner?.isAvailable ?? false);
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [stats, setStats] = useState<Stats>({ todayJobs: 0, pending: 0, accepted: 0, completedToday: 0, completedPercent: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
const [acceptingId, setAcceptingId] = useState<string | null>(null);
const [declineTarget, setDeclineTarget] = useState<string | null>(null);
 useNotificationPermission();
  const [showNotifCenter, setShowNotifCenter] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showProfilePhoto, setShowProfilePhoto] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const [bookingsRes, statsRes] = await Promise.all([
        apiService.getPartnerNotifications(),
        apiService.getPartnerStats(dateStr),
      ]);
      setRequests(bookingsRes);
      setStats(statsRes);
    } catch (e) {
      console.error('Failed to load partner home data', e);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate]);

useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    apiService.getMyNotifications(1, 5).then(res => {
      setUnreadNotifCount(res.unreadCount);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const { default: messaging } = require('@react-native-firebase/messaging');
    const unsubscribe = messaging().onMessage(async (remoteMessage: any) => {
      const type = remoteMessage?.data?.type;
      if (
        type === 'NEW_BOOKING_ASSIGNED' ||
        type === 'BOOKING_CANCELLED_BY_USER' ||
        type === 'BOOKING_RESCHEDULED'
      ) {
        loadData();
      }
    });
    return () => unsubscribe();
  }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const handleToggleAvailability = async (val: boolean) => {
    try {
      setIsAvailable(val);
      await apiService.toggleAvailability(val);
    } catch {
      setIsAvailable(!val);
   showError('Could not update availability. Try again.');
    }
  };

const handleAccept = async (bookingId: string) => {
    setAcceptingId(bookingId);
    try {
      await apiService.acceptBooking(bookingId);
      setRequests(prev => prev.filter(b => b.id !== bookingId));
      setStats(prev => ({ ...prev, pending: Math.max(0, prev.pending - 1), accepted: prev.accepted + 1 }));
      // Navigate to Bookings tab where the accepted job now appears
      router.navigate('/(partner)/bookings');
    } catch {
     showError('Could not accept booking. Try again.');
    } finally {
      setAcceptingId(null);
    }
  };

const handleDecline = (bookingId: string) => {
    setDeclineTarget(bookingId);
  };

  const confirmDecline = async () => {
    if (!declineTarget) return;
    const id = declineTarget;
    setDeclineTarget(null);
    try {
      await apiService.rejectBooking(id);
      setRequests(prev => prev.filter(b => b.id !== id));
      setStats(prev => ({ ...prev, pending: Math.max(0, prev.pending - 1) }));
    } catch {
      showError('Could not decline booking.');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
 <View style={styles.container}>
  <Modal visible={showNotifCenter} animationType="slide" onRequestClose={() => setShowNotifCenter(false)}>
        <NotificationCenter onClose={() => setShowNotifCenter(false)} />
      </Modal>

      <ConfirmSheet
        visible={declineTarget !== null}
        title="Decline Booking"
        message="Are you sure you want to decline this booking?"
        confirmLabel="Decline"
        cancelLabel="Cancel"
        confirmDestructive
        onConfirm={confirmDecline}
        onCancel={() => setDeclineTarget(null)}
      />
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => setShowProfilePhoto(true)}>
            <View style={styles.avatarCircle}>
              {user?.avatarUrl ? (
                <Image
                  source={{ uri: user.avatarUrl }}
                  style={styles.avatarImage}
                  contentFit="cover"
                 cachePolicy="none"
                  transition={200}
                />
              ) : (
                <MaterialCommunityIcons name="account" size={22} color={COLORS.primary} />
              )}
            </View>
          </TouchableOpacity>
          <View>
            <Text style={styles.helloText}>Hello, Partner</Text>
            <Text style={styles.partnerName}>{user?.name || 'Partner'}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
        <TouchableOpacity style={styles.notifBtn} onPress={() => setShowNotifCenter(true)}>
            <MaterialCommunityIcons name="bell-outline" size={22} color="#475569" />
            {unreadNotifCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{unreadNotifCount > 9 ? '9+' : unreadNotifCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.availToggle}>
            <Text style={[styles.availLabel, { color: isAvailable ? COLORS.primary : '#94A3B8' }]}>
              {isAvailable ? 'ON' : 'OFF'}
            </Text>
            <Switch
              value={isAvailable}
              onValueChange={handleToggleAvailability}
              trackColor={{ false: '#E2E8F0', true: '#CCFBF1' }}
              thumbColor={isAvailable ? COLORS.primary : '#94A3B8'}
            />
          </View>
        </View>
      </View>

   <ScreenWrapper
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      >
        <View style={styles.statsCard}>
          <View style={styles.statsTopRow}>
            <View style={styles.todayJobsBlock}>
              <TouchableOpacity onPress={() => setShowDatePicker(true)} style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                <MaterialCommunityIcons name="calendar-today" size={24} color={COLORS.primary} />
                <Text style={{fontSize: 12, color: COLORS.primary, fontWeight: '700'}}>
                  {selectedDate.toDateString() === new Date().toDateString() ? "Today" : selectedDate.toLocaleDateString()}
                </Text>
                <MaterialCommunityIcons name="chevron-down" size={16} color={COLORS.primary} />
              </TouchableOpacity>
              
              <Text style={styles.statsLabel}>Total Jobs</Text>
              <Text style={styles.todayCount}>{stats.todayJobs}</Text>
            </View>
            {stats.trendPercentage !== undefined && (
              <Text style={[
                styles.vsText, 
                stats.trendPercentage < 0 ? { color: '#EF4444', backgroundColor: '#FEE2E2' } : 
                stats.trendPercentage === 0 ? { color: '#64748B', backgroundColor: '#F1F5F9' } : {}
              ]}>
                {stats.trendPercentage > 0 ? '+' : ''}{stats.trendPercentage}% vs yesterday
              </Text>
            )}
          </View>
          <View style={styles.statsMiniRow}>
            <View style={styles.miniStat}>
              <Text style={styles.miniStatLabel}>PENDING</Text>
              <Text style={[styles.miniStatValue, { color: '#F59E0B' }]}>{String(stats.pending).padStart(2, '0')}</Text>
            </View>
            <View style={[styles.miniStat, styles.miniStatRight]}>
              <Text style={styles.miniStatLabel}>ACCEPTED</Text>
              <Text style={[styles.miniStatValue, { color: COLORS.primary }]}>{String(stats.accepted).padStart(2, '0')}</Text>
            </View>
          </View>
          <View style={styles.completedCard}>
            <View>
              <Text style={styles.completedLabel}>Completed Today</Text>
              <Text style={styles.completedValue}>{String(stats.completedToday).padStart(2, '0')} Samples</Text>
            </View>
            <Text style={styles.completedPercent}>{stats.completedPercent}%</Text>
          </View>
        </View>

        {/* Recent Requests */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Requests</Text>
         <TouchableOpacity onPress={() => router.navigate('/(partner)/bookings')}>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>

        {requests.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="inbox-outline" size={40} color="#CBD5E1" />
            <Text style={styles.emptyText}>No pending requests</Text>
            <Text style={styles.emptySubText}>New booking requests will appear here</Text>
          </View>
        ) : (
          requests.map(req => (
            <View key={req.id} style={styles.requestCard}>
              <View style={styles.requestCardTop}>
                <View style={styles.requestIconCircle}>
                  <MaterialCommunityIcons name="account-outline" size={20} color={COLORS.primary} />
                </View>
                <View style={styles.requestInfo}>
                  <Text style={styles.requestName}>{req.patientName}</Text>
                  <Text style={styles.requestMeta}>
                    {req.distanceKm ? `${req.distanceKm} km away` : ''}{req.collectionAddress ? ` • ${req.collectionAddress}` : ''}
                  </Text>
                </View>
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>New Request</Text>
                </View>
              </View>

              <View style={styles.testTagRow}>
                {req.tests.slice(0, 2).map(t => (
                  <View key={t.name} style={styles.testTag}>
                    <Text style={styles.testTagText}>{t.name}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.requestActions}>
                <TouchableOpacity
                  style={styles.acceptBtn}
                  onPress={() => handleAccept(req.id)}
                  disabled={acceptingId === req.id}
                >
                  {acceptingId === req.id
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.acceptBtnText}>Accept Job</Text>
                  }
                </TouchableOpacity>
                <TouchableOpacity style={styles.declineBtn} onPress={() => handleDecline(req.id)}>
                  <Text style={styles.declineBtnText}>Decline</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {/* Partner Tip */}
        <View style={styles.tipCard}>
          <MaterialCommunityIcons name="lightbulb-outline" size={18} color="#F59E0B" />
          <Text style={styles.tipText}>Keep your sample collection kit sanitized before every visit to maintain high hygiene ratings.</Text>
</View>
      </ScreenWrapper>
      
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => {
            setShowDatePicker(Platform.OS === 'ios');
            if (date) setSelectedDate(date);
          }}
        />
      )}
      
      {/* Profile Photo Modal */}
      <Modal visible={showProfilePhoto} transparent animationType="fade" onRequestClose={() => setShowProfilePhoto(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity 
            style={{ position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10 }}
            onPress={() => setShowProfilePhoto(false)}
          >
            <MaterialCommunityIcons name="close" size={30} color="#fff" />
          </TouchableOpacity>
          {user?.avatarUrl ? (
            <Image
              source={{ uri: user.avatarUrl }}
              style={{ width: '90%', height: '60%', borderRadius: 16 }}
              contentFit="contain"
            />
          ) : (
            <MaterialCommunityIcons name="account" size={150} color="#fff" />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
avatarCircle: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#F0FDFA',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#CCFBF1', overflow: 'hidden',
  },
  avatarImage: { width: 44, height: 44, borderRadius: 22 },
  helloText: { fontSize: 12, color: '#64748B' },
  partnerName: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
notifBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#F8FAFC',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#E2E8F0',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: '#EF4444', borderRadius: 8,
    minWidth: 16, height: 16,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 3, borderWidth: 1.5, borderColor: '#fff',
  },
  notifBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  availToggle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  availLabel: { fontSize: 12, fontWeight: '800' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  statsCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 24, ...SHADOWS.soft,
  },
  statsTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  todayJobsBlock: {},
  statsLabel: { fontSize: 12, color: '#64748B', marginTop: 4 },
  todayCount: { fontSize: 32, fontWeight: '900', color: '#0F172A' },
  vsText: { fontSize: 12, color: '#10B981', fontWeight: '600', backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statsMiniRow: { flexDirection: 'row', marginBottom: 16 },
  miniStat: { flex: 1 },
  miniStatRight: { borderLeftWidth: 1, borderLeftColor: '#F1F5F9', paddingLeft: 16 },
  miniStatLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  miniStatValue: { fontSize: 24, fontWeight: '900' },
  completedCard: {
    backgroundColor: COLORS.primary, borderRadius: 14, padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  completedLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  completedValue: { fontSize: 18, fontWeight: '900', color: '#fff' },
  completedPercent: { fontSize: 24, fontWeight: '900', color: 'rgba(255,255,255,0.9)' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  viewAll: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  emptyCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 32,
    alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16,
  },
  emptyText: { fontSize: 15, fontWeight: '700', color: '#94A3B8', marginTop: 12 },
  emptySubText: { fontSize: 13, color: '#CBD5E1', marginTop: 4 },
  requestCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 14, ...SHADOWS.soft,
  },
  requestCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  requestIconCircle: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#F0FDFA',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
    borderWidth: 1, borderColor: '#CCFBF1',
  },
  requestInfo: { flex: 1 },
  requestName: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  requestMeta: { fontSize: 12, color: '#64748B', marginTop: 2 },
  newBadge: { backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  newBadgeText: { fontSize: 11, fontWeight: '700', color: '#059669' },
  testTagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  testTag: { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  testTagText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  requestActions: { flexDirection: 'row', gap: 12 },
  acceptBtn: {
    flex: 1, backgroundColor: COLORS.primary, height: 44,
    borderRadius: 12, justifyContent: 'center', alignItems: 'center',
  },
  acceptBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  declineBtn: {
    paddingHorizontal: 20, height: 44, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E2E8F0',
  },
  declineBtnText: { fontSize: 14, fontWeight: '700', color: '#64748B' },
  tipCard: {
    flexDirection: 'row', backgroundColor: '#FFFBEB', borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: '#FDE68A',
    alignItems: 'flex-start', gap: 10, marginTop: 8,
  },
  tipText: { fontSize: 13, color: '#92400E', lineHeight: 20, flex: 1 },
});