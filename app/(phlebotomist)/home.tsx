import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  RefreshControl, Switch, ActivityIndicator, Modal, FlatList, StatusBar
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenWrapper from '../../src/components/ScreenWrapper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { useRouter, useFocusEffect } from 'expo-router';
import { RootState } from '../../src/store';
import { apiService } from '../../src/services/api';
import { COLORS, SHADOWS } from '../../src/theme/theme';
import { showSuccess, showError } from '../../src/store/toastStore';
import { ConfirmSheet } from '../../src/components/ConfirmSheet';
import { NotificationCenter } from '../../src/components/NotificationCenter';
import { Image } from 'expo-image';

interface BookingRequest {
  id: string;
  bookingCode: string;
  patientName: string;
  patientMobile?: string;
  scheduledDate: string;
  scheduledSlot: string;
  collectionAddress?: string;
  totalPaid?: number;
  tests: { name: string }[];
  status: string;
}

interface Stats {
  todayJobs: number;
  pending: number;
  accepted: number;
  completedToday: number;
  completedPercent: number;
}

export default function PhlebotomistHomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useSelector((s: RootState) => s.auth.user as any);
  const isEmployee = user?.userType === 'FREELANCER' ? false : !!(
    user?.isEmployee === true ||
    user?.phlebotomistType === 'EMPLOYEE' ||
    user?.userType === 'STAFF' ||
    user?.userType === 'EMPLOYEE' ||
    user?.adminUser ||
    !!(user?.designation && /phlebotomist|collector|phlebo/i.test(user.designation))
  );
  const isFreelancer = !isEmployee;
  
  const [isAvailable, setIsAvailable] = useState(user?.partner?.isAvailable ?? true);
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [stats, setStats] = useState<Stats>({ todayJobs: 0, pending: 0, accepted: 0, completedToday: 0, completedPercent: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [declineTarget, setDeclineTarget] = useState<string | null>(null);
  const [showNotifCenter, setShowNotifCenter] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  const loadData = useCallback(async () => {
    try {
      const calls: Promise<any>[] = [
        apiService.getPartnerBookings().catch(() => []),
        apiService.getPartnerStats().catch(() => ({ todayJobs: 0, pending: 0, accepted: 0, completedToday: 0, completedPercent: 0 })),
        apiService.getPartnerNotifications().catch(() => []),
      ];

      const [bookingsRes, statsRes, notifsRes = []] = await Promise.all(calls);

      const assignedList = Array.isArray(bookingsRes) ? bookingsRes : [];
      const broadcastList = Array.isArray(notifsRes) ? notifsRes : [];

      const seen = new Set<string>();
      const combinedPending: BookingRequest[] = [];

      broadcastList.forEach((b: any) => {
        if (!seen.has(b.id)) {
          seen.add(b.id);
          combinedPending.push({
            id: b.id,
            bookingCode: b.bookingCode,
            patientName: b.patientName,
            patientMobile: b.patientMobile,
            scheduledDate: b.scheduledDate,
            scheduledSlot: b.scheduledSlot,
            collectionAddress: b.collectionAddress,
            totalPaid: b.totalPaid,
            tests: b.tests || [],
            status: b.status || 'WAITING_FOR_PARTNER',
          });
        }
      });

      assignedList.forEach((b: any) => {
        if (!seen.has(b.id) && (b.status === 'ASSIGNED' || b.status === 'WAITING_FOR_PARTNER' || b.status === 'WAITING_FOR_ASSIGNMENT' || b.status === 'PENDING')) {
          seen.add(b.id);
          combinedPending.push({
            id: b.id,
            bookingCode: b.bookingCode,
            patientName: b.patientName,
            patientMobile: b.patientMobile,
            scheduledDate: b.scheduledDate,
            scheduledSlot: b.scheduledSlot,
            collectionAddress: b.collectionAddress,
            totalPaid: b.totalPaid,
            tests: b.tests || [],
            status: b.status,
          });
        }
      });

      setRequests(combinedPending);

      const liveTodayJobs = Math.max(
        Number(statsRes?.todayJobs) || 0,
        assignedList.length
      );

      const liveDelivered = Math.max(
        Number(statsRes?.completedToday) || 0,
        assignedList.filter((b: any) => ['DELIVERED_TO_LAB', 'PROCESSING', 'REPORT_READY', 'COMPLETED'].includes(b.status)).length
      );

      const livePending = Math.max(
        Number(statsRes?.pending) || 0,
        assignedList.filter((b: any) => ['ASSIGNED', 'WAITING_FOR_PARTNER', 'ACCEPTED', 'ON_THE_WAY', 'REACHED_LOCATION', 'SAMPLE_COLLECTED', 'DELIVERING_TO_BRANCH', 'PENDING'].includes(b.status)).length
      );

      setStats({
        todayJobs: liveTodayJobs,
        pending: livePending,
        accepted: statsRes?.accepted || assignedList.filter((b: any) => ['ACCEPTED', 'ON_THE_WAY', 'REACHED_LOCATION'].includes(b.status)).length,
        completedToday: liveDelivered,
        completedPercent: liveTodayJobs > 0 ? Math.round((liveDelivered / liveTodayJobs) * 100) : 0,
      });
    } catch (e) {
      console.error('Failed to load phlebotomist home data', e);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useEffect(() => {
    apiService.getMyNotifications(1, 5).then(res => {
      setUnreadNotifCount(res?.unreadCount || 0);
    }).catch(() => {});
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleToggleAvailability = async (val: boolean) => {
    try {
      setIsAvailable(val);
      await apiService.toggleAvailability(val);
      showSuccess(val ? 'You are now Online for sample collections' : 'You are now Offline');
    } catch {
      setIsAvailable(!val);
      showError('Failed to update duty status');
    }
  };

  const handleAccept = async (id: string) => {
    setAcceptingId(id);
    try {
      await apiService.acceptBooking(id);
      showSuccess('Pickup Accepted! Proceed to patient address.');
      loadData();
      router.push({ pathname: '/(phlebotomist)/booking-detail' as any, params: { id } });
    } catch (e: any) {
      showError(e?.response?.data?.error || 'Failed to accept booking');
    } finally {
      setAcceptingId(null);
    }
  };

  const handleDecline = async (reason?: string) => {
    if (!declineTarget) return;
    try {
      await apiService.rejectBooking(declineTarget, reason);
      showSuccess('Booking declined.');
      setDeclineTarget(null);
      loadData();
    } catch (e: any) {
      showError(e?.response?.data?.error || 'Failed to decline');
    }
  };

  return (
    <ScreenWrapper scrollable={false} backgroundColor="#F8FAFC">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      {/* Header with Safe Area Insets to avoid Notch/Status Bar Overlap */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 6 }]}>
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={{ width: 42, height: 42, borderRadius: 21 }} />
            ) : (
              <MaterialCommunityIcons name="needle" size={24} color={COLORS.primary} />
            )}
          </View>
          <View>
            <View style={[styles.roleBadge, !isFreelancer && styles.roleBadgeEmployee]}>
              <Text style={[styles.roleBadgeText, !isFreelancer && styles.roleBadgeTextEmployee]}>
                {isFreelancer ? 'Freelance Phlebotomist' : (user?.branchName ? `In-House Staff (${user.branchName})` : 'In-House Staff')}
              </Text>
            </View>
            <Text style={styles.userName} numberOfLines={1}>{user?.name || 'Phlebotomist'}</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.notifBtn}
            onPress={() => setShowNotifCenter(true)}
          >
            <MaterialCommunityIcons name="bell-outline" size={22} color="#334155" />
            {unreadNotifCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{unreadNotifCount > 9 ? '9+' : unreadNotifCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.statusToggle}>
            <Text style={[styles.statusLabel, isAvailable ? styles.onlineText : styles.offlineText]}>
              {isAvailable ? 'ON' : 'OFF'}
            </Text>
            <Switch
              value={isAvailable}
              onValueChange={handleToggleAvailability}
              trackColor={{ false: '#E2E8F0', true: COLORS.primary }}
              thumbColor="#FFFFFF"
              style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
            />
          </View>
        </View>
      </View>

      <FlatList
        data={requests}
        keyExtractor={(item: any) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* KPI Cards Grid */}
            <View style={styles.statsCard}>
              <View style={styles.statRowHeader}>
                <View style={styles.statHeaderLeft}>
                  <MaterialCommunityIcons name="calendar-check" size={20} color={COLORS.primary} />
                  <Text style={styles.statTitle}>Today&apos;s Overview</Text>
                </View>
                {isFreelancer ? (
                  <View style={styles.commissionTag}>
                    <MaterialCommunityIcons name="percent" size={13} color="#065F46" />
                    <Text style={styles.commissionTagText}>30% Freelance Comm</Text>
                  </View>
                ) : (
                  <View style={styles.branchTag}>
                    <MaterialCommunityIcons name="office-building" size={13} color="#1E40AF" />
                    <Text style={styles.branchTagText}>{user?.branchName || 'Branch Duty'}</Text>
                  </View>
                )}
              </View>

              <View style={styles.metricsGrid}>
                <View style={styles.metricBox}>
                  <Text style={styles.metricValue}>{stats.todayJobs || 0}</Text>
                  <Text style={styles.metricLabel}>{isFreelancer ? 'Total Pickups' : 'Assigned'}</Text>
                </View>
                <View style={styles.metricBox}>
                  <Text style={[styles.metricValue, { color: '#D97706' }]}>{stats.pending !== undefined ? stats.pending : requests.length}</Text>
                  <Text style={styles.metricLabel}>Pending</Text>
                </View>
                <View style={styles.metricBox}>
                  <Text style={[styles.metricValue, { color: '#059669' }]}>{stats.completedToday || 0}</Text>
                  <Text style={styles.metricLabel}>Delivered</Text>
                </View>
              </View>

              {/* Commission Highlight Bar (Only for Freelancers) */}
              {isFreelancer && (
                <View style={styles.commissionHighlight}>
                  <View style={styles.commIconWrapper}>
                    <MaterialCommunityIcons name="cash-fast" size={22} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.commHighlightTitle}>Commission Earnings</Text>
                    <Text style={styles.commHighlightSub}>30% credited per sample delivered to lab</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => router.push('/(phlebotomist)/history' as any)}
                    style={styles.commViewBtn}
                  >
                    <Text style={styles.commViewBtnText}>View</Text>
                    <MaterialCommunityIcons name="chevron-right" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Section Header */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{isFreelancer ? 'Assigned Pickup Requests' : "Today's Collection Queue"}</Text>
              <TouchableOpacity onPress={() => router.push('/(phlebotomist)/bookings' as any)}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
          </>
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 24, marginBottom: 24 }} />
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="clipboard-check-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No pending pickup requests</Text>
              <Text style={styles.emptySub}>
                {isFreelancer ? 'New bookings assigned to you will appear here.' : 'Assigned tasks from the branch manager will appear here.'}
              </Text>
            </View>
          )
        }
        renderItem={({ item }: { item: any }) => {
          const estPayout = Math.round((item.totalPaid || 800) * 0.30);
          return (
            <View style={styles.requestCard}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.bookingCode}>{item.bookingCode}</Text>
                  <Text style={styles.patientName}>{item.patientName}</Text>
                </View>
                {isFreelancer && (
                  <View style={styles.payoutBadge}>
                    <Text style={styles.payoutLabel}>Est. 30% Payout</Text>
                    <Text style={styles.payoutValue}>₹{estPayout}</Text>
                  </View>
                )}
              </View>

              <View style={styles.cardDetails}>
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons name="clock-outline" size={15} color="#64748B" />
                  <Text style={styles.detailText}>{item.scheduledSlot || 'Morning Slot'}</Text>
                </View>
                {item.collectionAddress && (
                  <View style={styles.detailRow}>
                    <MaterialCommunityIcons name="map-marker-outline" size={15} color="#64748B" />
                    <Text style={styles.detailText} numberOfLines={1}>{item.collectionAddress}</Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons name="flask-outline" size={15} color="#64748B" />
                  <Text style={styles.detailText} numberOfLines={1}>
                    {item.tests?.map((t: any) => t.name).join(', ') || 'Diagnostic Investigation'}
                  </Text>
                </View>
              </View>

              <View style={styles.cardActions}>
                {isFreelancer && (
                  <TouchableOpacity
                    style={styles.declineBtn}
                    onPress={() => setDeclineTarget(item.id)}
                  >
                    <Text style={styles.declineBtnText}>Decline</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.acceptBtn, !isFreelancer && { flex: 1 }]}
                  disabled={acceptingId === item.id}
                  onPress={() => handleAccept(item.id)}
                >
                  {acceptingId === item.id ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="check-bold" size={16} color="#FFFFFF" />
                      <Text style={styles.acceptBtnText}>{isFreelancer ? 'Accept Pickup' : 'Start Pickup'}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListFooterComponent={
          <View style={styles.tipsCard}>
            <MaterialCommunityIcons name="shield-check" size={24} color="#0284C7" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.tipsTitle}>Sample Safety Protocol</Text>
              <Text style={styles.tipsSub}>
                Always verify the patient&apos;s 4-digit Collection OTP before packing tubes into the cold-chain sample bag.
              </Text>
            </View>
          </View>
        }
      />

      <ConfirmSheet
        visible={!!declineTarget}
        title="Decline Pickup Request?"
        message="This booking will be returned to the lab partner for reassignment."
        confirmLabel="Decline Job"
        onConfirm={handleDecline}
        onCancel={() => setDeclineTarget(null)}
      />

      <Modal visible={showNotifCenter} animationType="slide">
        <NotificationCenter onClose={() => setShowNotifCenter(false)} />
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#E6F4F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleBadge: {
    backgroundColor: '#DEF7EC',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 2,
  },
  roleBadgeEmployee: {
    backgroundColor: '#EFF6FF',
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#03543F',
  },
  roleBadgeTextEmployee: {
    color: '#1D4ED8',
  },
  userName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notifBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#E11D48',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  notifBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '700',
  },
  statusToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginRight: 2,
  },
  onlineText: {
    color: '#059669',
  },
  offlineText: {
    color: '#94A3B8',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
    marginBottom: 20,
  },
  statRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  statHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
  },
  commissionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  commissionTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#065F46',
  },
  branchTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  branchTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1E40AF',
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 14,
  },
  metricBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.primary,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  commissionHighlight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  commIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commHighlightTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  commHighlightSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
    fontWeight: '500',
  },
  commViewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 2,
  },
  commViewBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    ...SHADOWS.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  bookingCode: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
    textTransform: 'uppercase',
  },
  patientName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 1,
  },
  payoutBadge: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'flex-end',
  },
  payoutLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#059669',
  },
  payoutValue: {
    fontSize: 14,
    fontWeight: '900',
    color: '#065F46',
  },
  cardDetails: {
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
    flex: 1,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
  },
  declineBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  acceptBtn: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#006D6F',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    ...SHADOWS.sm,
  },
  acceptBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginTop: 8,
  },
  emptySub: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
  },
  tipsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 14,
    padding: 14,
    marginTop: 8,
  },
  tipsTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0369A1',
  },
  tipsSub: {
    fontSize: 11,
    color: '#0284C7',
    marginTop: 2,
    lineHeight: 16,
  },
});
