import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Linking, StatusBar
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { RootState } from '../../src/store';
import ScreenWrapper from '../../src/components/ScreenWrapper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { apiService } from '../../src/services/api';
import { COLORS, SHADOWS } from '../../src/theme/theme';
import { showSuccess, showError } from '../../src/store/toastStore';
import { ConfirmSheet } from '../../src/components/ConfirmSheet';

interface Booking {
  id: string;
  bookingCode: string;
  patientName: string;
  patientMobile?: string;
  scheduledDate: string;
  scheduledSlot: string;
  paymentStatus: string;
  status: string;
  collectionAddress?: string;
  tests: { name: string }[];
  packages?: { name: string }[];
  totalPaid: number;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  ASSIGNED: { label: 'New Request', bg: '#FEF3C7', text: '#92400E' },
  WAITING_FOR_PARTNER: { label: 'New Request', bg: '#FEF3C7', text: '#92400E' },
  ACCEPTED: { label: 'Accepted', bg: '#DBEAFE', text: '#1E40AF' },
  ON_THE_WAY: { label: 'On The Way', bg: '#EDE9FE', text: '#5B21B6' },
  REACHED_LOCATION: { label: 'Reached Location', bg: '#CFFAFE', text: '#155E75' },
  SAMPLE_COLLECTED: { label: 'Sample Collected', bg: '#D1FAE5', text: '#065F46' },
  DELIVERING_TO_BRANCH: { label: 'In Transit to Lab', bg: '#E0E7FF', text: '#3730A3' },
  DELIVERED_TO_LAB: { label: 'Delivered to Lab', bg: '#CCFBF1', text: '#115E59' },
  COMPLETED: { label: 'Completed', bg: '#D1FAE5', text: '#065F46' },
};

export default function PhlebotomistBookingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useSelector((s: RootState) => s.auth.user as any);
  const isFreelancer = !(user?.adminUser || user?.isEmployee || (user?.role === 'EXECUTIVE' && !user?.partner));

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'COLLECTED' | 'DELIVERED'>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [declineTarget, setDeclineTarget] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const getNextStatus = (current: string): string | null => {
    const flow: Record<string, string> = {
      ACCEPTED: 'ON_THE_WAY',
      ON_THE_WAY: 'REACHED_LOCATION',
    };
    return flow[current] || null;
  };

  const getNextStatusLabel = (current: string, paymentStatus?: string) => {
    if (current === 'REACHED_LOCATION') {
      return paymentStatus === 'SUCCESS'
        ? 'Collect Sample'
        : 'Verify OTP & Collect Payment';
    }
    const labels: Record<string, string> = {
      ACCEPTED: 'Start Journey',
      ON_THE_WAY: 'Reached Location',
      SAMPLE_COLLECTED: 'Select Delivery Branch',
      DELIVERING_TO_BRANCH: 'Confirm Delivery',
    };
    return labels[current] || '';
  };

  const handleAccept = async (bookingId: string) => {
    setUpdatingId(bookingId);
    try {
      await apiService.acceptBooking(bookingId);
      showSuccess('Pickup accepted successfully!');
      await loadBookings();
    } catch (e: any) {
      showError(e?.response?.data?.error || 'Could not accept booking.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleReject = (bookingId: string) => {
    setDeclineTarget(bookingId);
  };

  const handleUpdateStatus = async (booking: Booking) => {
    if (booking.status === 'SAMPLE_COLLECTED') {
      router.push({
        pathname: '/partner-flow/select-branch',
        params: { bookingId: booking.id },
      } as any);
      return;
    }
    if (booking.status === 'DELIVERING_TO_BRANCH') {
      router.push({
        pathname: '/partner-flow/deliver-sample',
        params: { bookingId: booking.id },
      } as any);
      return;
    }
    if (booking.status === 'REACHED_LOCATION') {
      router.push(
        `/partner-flow/collect?bookingId=${booking.id}&paymentStatus=${booking.paymentStatus}&otpVerified=${(booking as any).otpVerified ?? false}` as any
      );
      return;
    }
    const next = getNextStatus(booking.status);
    if (!next) return;
    setUpdatingId(booking.id);
    try {
      await apiService.updateBookingStatus(booking.id, next);
      setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: next } : b));
      showSuccess(`Status updated to ${next.replace(/_/g, ' ')}`);
    } catch {
      showError('Could not update status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const loadBookings = useCallback(async () => {
    try {
      const calls: Promise<any>[] = [
        apiService.getPartnerBookings().catch(() => []),
        apiService.getPartnerNotifications().catch(() => []),
      ];

      const [assignedRes = [], broadcastRes = []] = await Promise.all(calls);
      const assigned = Array.isArray(assignedRes) ? assignedRes : [];
      const broadcast = Array.isArray(broadcastRes) ? broadcastRes : [];

      const seen = new Set<string>();
      const combined: Booking[] = [];

      broadcast.forEach((b: any) => {
        if (!seen.has(b.id)) {
          seen.add(b.id);
          combined.push(b);
        }
      });

      assigned.forEach((b: any) => {
        if (!seen.has(b.id)) {
          seen.add(b.id);
          combined.push(b);
        }
      });

      setBookings(combined);
    } catch {
      setBookings([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadBookings();
    }, [loadBookings])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadBookings();
  };

  const handleDecline = async (reason?: string) => {
    if (!declineTarget) return;
    try {
      await apiService.rejectBooking(declineTarget, reason);
      showSuccess('Booking returned to branch.');
      setDeclineTarget(null);
      loadBookings();
    } catch {
      showError('Failed to decline booking.');
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (filter === 'ACTIVE') {
      return ['ASSIGNED', 'WAITING_FOR_PARTNER', 'WAITING_FOR_ASSIGNMENT', 'PENDING', 'ACCEPTED', 'ON_THE_WAY', 'REACHED_LOCATION'].includes(b.status);
    }
    if (filter === 'COLLECTED') {
      return ['SAMPLE_COLLECTED', 'DELIVERING_TO_BRANCH', 'SELECTING_DELIVERY_BRANCH'].includes(b.status);
    }
    if (filter === 'DELIVERED') {
      return ['DELIVERED_TO_LAB', 'PROCESSING', 'REPORT_READY', 'COMPLETED'].includes(b.status);
    }
    return true;
  });

  return (
    <ScreenWrapper scrollable={false} backgroundColor="#F8FAFC">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      {/* Header with Safe Area Inset */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 6 }]}>
        <Text style={styles.headerTitle}>{isFreelancer ? 'Sample Collection Jobs' : 'My Assigned Duties'}</Text>
        <Text style={styles.headerSub}>
          {isFreelancer ? 'Manage your assigned pickups and sample deliveries' : 'Daily patient pickup queue assigned to you'}
        </Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabBar}>
        {[
          { key: 'ALL', label: 'All Jobs' },
          { key: 'ACTIVE', label: 'Active Pickups' },
          { key: 'COLLECTED', label: 'Collected' },
          { key: 'DELIVERED', label: 'Delivered' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setFilter(tab.key as any)}
            style={[styles.tabBtn, filter === tab.key && styles.tabBtnActive]}
          >
            <Text style={[styles.tabBtnText, filter === tab.key && styles.tabBtnTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredBookings}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="clipboard-text-search-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No bookings found</Text>
              <Text style={styles.emptySub}>No pickups match the selected filter category.</Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const statusConf = STATUS_CONFIG[item.status] || { label: item.status, bg: '#F1F5F9', text: '#475569' };
          const estCommission = Math.round((item.totalPaid || 800) * 0.30);
          const nextLabel = getNextStatusLabel(item.status, item.paymentStatus);

          return (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => router.push({ pathname: '/(phlebotomist)/booking-detail' as any, params: { id: item.id } })}
              style={styles.card}
            >
              <View style={styles.cardTop}>
                <View>
                  <Text style={styles.bookingCode}>{item.bookingCode}</Text>
                  <Text style={styles.patientName}>{item.patientName}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusConf.bg }]}>
                  <Text style={[styles.statusBadgeText, { color: statusConf.text }]}>{statusConf.label}</Text>
                </View>
              </View>

              <View style={styles.detailsBox}>
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons name="clock-outline" size={15} color="#64748B" />
                  <Text style={styles.detailText}>{item.scheduledSlot || 'Regular Slot'}</Text>
                </View>
                {item.collectionAddress && (
                  <View style={styles.detailRow}>
                    <MaterialCommunityIcons name="map-marker" size={15} color="#EF4444" />
                    <Text style={styles.detailText} numberOfLines={1}>{item.collectionAddress}</Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons name="test-tube" size={15} color={COLORS.primary} />
                  <Text style={styles.detailText} numberOfLines={1}>
                    {item.tests?.map((t) => t.name).join(', ') || 'Standard Lab Panel'}
                  </Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                {isFreelancer ? (
                  <View style={styles.commissionTag}>
                    <Text style={styles.commLabel}>30% Comm: </Text>
                    <Text style={styles.commAmount}>₹{estCommission}</Text>
                  </View>
                ) : (
                  <View style={[styles.commissionTag, { backgroundColor: '#F1F5F9' }]}>
                    <MaterialCommunityIcons name="clipboard-check" size={13} color="#475569" />
                    <Text style={[styles.commLabel, { color: '#475569', marginLeft: 4 }]}>Duty Task</Text>
                  </View>
                )}

                <View style={styles.actionsRight}>
                  {item.patientMobile && (
                    <TouchableOpacity
                      onPress={() => Linking.openURL(`tel:${item.patientMobile}`)}
                      style={styles.actionIconBtn}
                    >
                      <MaterialCommunityIcons name="phone" size={18} color="#006D6F" />
                    </TouchableOpacity>
                  )}
                  <View style={styles.openDetailBtn}>
                    <Text style={styles.openDetailBtnText}>Details</Text>
                    <MaterialCommunityIcons name="arrow-right" size={14} color="#006D6F" />
                  </View>
                </View>
              </View>

              {/* Lifecycle Action Buttons matching Partner flow */}
              {item.status === 'WAITING_FOR_PARTNER' || item.status === 'ASSIGNED' ? (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.rejectBtn}
                    onPress={() => handleReject(item.id)}
                    disabled={updatingId === item.id}
                  >
                    <Text style={styles.rejectBtnText}>Decline</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.acceptBtn, updatingId === item.id && { opacity: 0.6 }]}
                    onPress={() => handleAccept(item.id)}
                    disabled={updatingId === item.id}
                  >
                    {updatingId === item.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <MaterialCommunityIcons name="check-bold" size={16} color="#fff" />
                        <Text style={styles.acceptBtnText}>Accept Booking</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              ) : nextLabel ? (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.statusUpdateBtn, updatingId === item.id && { opacity: 0.6 }]}
                    onPress={() => handleUpdateStatus(item)}
                    disabled={updatingId === item.id}
                  >
                    {updatingId === item.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.statusUpdateBtnText}>{nextLabel}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        }}
      />

      <ConfirmSheet
        visible={!!declineTarget}
        title="Decline Job?"
        message="This pickup will be returned to the branch for reassignment."
        confirmText="Confirm Decline"
        onConfirm={handleDecline}
        onCancel={() => setDeclineTarget(null)}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 8,
  },
  tabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  tabBtnActive: {
    backgroundColor: '#006D6F',
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    ...SHADOWS.sm,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  bookingCode: {
    fontSize: 11,
    fontWeight: '800',
    color: '#006D6F',
  },
  patientName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  detailsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    gap: 6,
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
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  commissionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  commLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#059669',
  },
  commAmount: {
    fontSize: 12,
    fontWeight: '900',
    color: '#065F46',
  },
  actionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E6F4F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  openDetailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E6F4F4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  openDetailBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#006D6F',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  rejectBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
  },
  acceptBtn: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  acceptBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  callBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#006D6F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusUpdateBtn: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#006D6F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusUpdateBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
