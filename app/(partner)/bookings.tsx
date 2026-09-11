import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, StatusBar, ActivityIndicator, Linking, Modal
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
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
  packages: { name: string }[];
  totalPaid: number;
}

const STATUS_COLORS: Record<string, string> = {
  ASSIGNED: '#F59E0B',
  ACCEPTED: '#3B82F6',
  ON_THE_WAY: '#8B5CF6',
  REACHED_LOCATION: '#06B6D4',
  SAMPLE_COLLECTED: '#10B981',
  DELIVERED_TO_LAB: COLORS.primary,
};

export default function PartnerBookingsScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [declineTarget, setDeclineTarget] = useState<string | null>(null);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedBookingForAssign, setSelectedBookingForAssign] = useState<Booking | null>(null);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [assigningStaffId, setAssigningStaffId] = useState<string | null>(null);

  const openAssignModal = async (booking: Booking) => {
    setSelectedBookingForAssign(booking);
    setAssignModalVisible(true);
    setLoadingStaff(true);
    try {
      const data = await apiService.getPartnerBranchStaff();
      setStaffList(Array.isArray(data) ? data : []);
    } catch {
      showError('Failed to load branch employee staff.');
    } finally {
      setLoadingStaff(false);
    }
  };

  const handleAssignStaff = async (staffMember: any) => {
    if (!selectedBookingForAssign) return;
    setAssigningStaffId(staffMember.userId || staffMember.id);
    try {
      await apiService.assignPartnerStaff(selectedBookingForAssign.id, staffMember.userId || staffMember.id);
      showSuccess(`Booking assigned to ${staffMember.name}`);
      setAssignModalVisible(false);
      setSelectedBookingForAssign(null);
      await loadBookings();
    } catch (e: any) {
      showError(e?.response?.data?.error || 'Failed to assign staff.');
    } finally {
      setAssigningStaffId(null);
    }
  };

const loadBookings = useCallback(async () => {
    try {
      // Fetch both: pending requests (not yet assigned) + active assigned jobs
      const [assignedData, pendingData] = await Promise.all([
        apiService.getPartnerBookings(),
        apiService.getPartnerNotifications(),
      ]);

const activeAssigned = assignedData.filter((b: Booking) =>
        ['ACCEPTED', 'ON_THE_WAY', 'REACHED_LOCATION', 'SAMPLE_COLLECTED', 'SELECTING_DELIVERY_BRANCH', 'DELIVERING_TO_BRANCH', 'DELIVERED_TO_LAB', 'PROCESSING'].includes(b.status)
      );
      const pendingRequests = pendingData.map((b: any) => ({
        ...b,
        patientMobile: b.patientMobile || null,
        collectionAddress: b.collectionAddress || null,
        paymentStatus: b.paymentStatus || 'PENDING',
        packages: b.packages || [],
      }));

      // Merge: pending first, then active assigned; deduplicate by id
      const seen = new Set<string>();
      const merged = [...pendingRequests, ...activeAssigned].filter((b: Booking) => {
        if (seen.has(b.id)) return false;
        seen.add(b.id);
        return true;
      });

merged.sort((a: Booking, b: Booking) => {
        const order: Record<string, number> = {
          WAITING_FOR_PARTNER: 0,
          ASSIGNED: 1,
          ACCEPTED: 2,
          ON_THE_WAY: 3,
          REACHED_LOCATION: 4,
          SAMPLE_COLLECTED: 5,
          SELECTING_DELIVERY_BRANCH: 6,
          DELIVERING_TO_BRANCH: 7,
          DELIVERED_TO_LAB: 8,
          PROCESSING: 9,
        };
        return (order[a.status] ?? 99) - (order[b.status] ?? 99);
      });

      setBookings(merged);
 } catch {
      showError('Could not load bookings.');
    }finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

useEffect(() => { loadBookings(); }, [loadBookings]);

  useEffect(() => {
    loadBookings();
  }, [pathname]);

  const onRefresh = () => { setRefreshing(true); loadBookings(); };

const getNextStatus = (current: string): string | null => {
    const flow: Record<string, string> = {
      ACCEPTED: 'ON_THE_WAY',
      ON_THE_WAY: 'REACHED_LOCATION',
    };
    return flow[current] || null;
  };
const getNextStatusLabel = (current: string, paymentStatus: string): string => {
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
      if (booking.paymentStatus === 'SUCCESS') {
        // Online-paid: skip OTP/payment screen, go straight to SAMPLE_COLLECTED
        setUpdatingId(booking.id);
        try {
          await apiService.updateBookingStatus(booking.id, 'SAMPLE_COLLECTED');
          setBookings(prev =>
            prev.map(b => b.id === booking.id ? { ...b, status: 'SAMPLE_COLLECTED' } : b)
          );
   } catch {
          showError('Could not update status.');
        } finally {
          setUpdatingId(null);
        }
      } else {
      router.push(
          `/partner-flow/collect?bookingId=${booking.id}&paymentStatus=${booking.paymentStatus}&otpVerified=${(booking as any).otpVerified ?? false}` as any
        );
      }
      return;
    }
    const next = getNextStatus(booking.status);
    if (!next) return;
    setUpdatingId(booking.id);
    try {
      await apiService.updateBookingStatus(booking.id, next);
      setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: next } : b));
    } catch {
      showError('Could not update status.');
    } finally {
      setUpdatingId(null);
    }
  };
const handleAccept = async (bookingId: string) => {
    setUpdatingId(bookingId);
    try {
      await apiService.acceptBooking(bookingId);
      // Refresh full list so the booking moves from WAITING → ASSIGNED with correct data
      await loadBookings();
    } catch {
       showError('Could not accept booking.');
    } finally {
      setUpdatingId(null);
    }
  };

const handleReject = (bookingId: string) => {
    setDeclineTarget(bookingId);
  };

  const confirmDecline = async () => {
    if (!declineTarget) return;
    const id = declineTarget;
    setDeclineTarget(null);
    try {
      await apiService.rejectBooking(id);
      await loadBookings();
    } catch {
      showError('Could not decline booking.');
    }
  };

  const handleCall = (mobile?: string) => {
    if (!mobile) return;
    Linking.openURL(`tel:${mobile}`);
  };

  const renderBooking = ({ item }: { item: Booking }) => {
    const statusColor = STATUS_COLORS[item.status] || '#64748B';
   const nextLabel = getNextStatusLabel(item.status, item.paymentStatus);
    const allItems = [...item.tests.map(t => t.name), ...item.packages.map(p => p.name)];

    return (
      <View style={styles.card}>
        <View style={styles.cardTopRow}>
          <View>
            <Text style={styles.bookingId}>BOOKING ID</Text>
            <Text style={styles.bookingCode}>{item.bookingCode}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20', borderColor: statusColor }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {item.status.replace(/_/g, ' ')}
            </Text>
          </View>
        </View>

        <View style={styles.patientRow}>
          <View style={styles.patientAvatar}>
            <Text style={styles.patientInitial}>{item.patientName[0]}</Text>
          </View>
          <View style={styles.patientInfo}>
            <Text style={styles.patientName}>{item.patientName}</Text>
            {item.collectionAddress && (
              <View style={styles.addressRow}>
                <MaterialCommunityIcons name="map-marker-outline" size={13} color="#64748B" />
                <Text style={styles.addressText} numberOfLines={2}>{item.collectionAddress}</Text>
              </View>
            )}
          </View>
        </View>

        {allItems.length > 0 && (
          <View style={styles.testsSection}>
            <Text style={styles.testsLabel}>TESTS INCLUDED ({allItems.length})</Text>
            {allItems.slice(0, 2).map(name => (
              <View key={name} style={styles.testRow}>
                <MaterialCommunityIcons name="clipboard-text-outline" size={16} color={COLORS.primary} />
                <Text style={styles.testName}>{name}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Collection Time</Text>
            <Text style={styles.metaValue}>{new Date(item.scheduledDate).toLocaleDateString()}, {item.scheduledSlot}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Payment Status</Text>
            <View style={styles.paidRow}>
              <MaterialCommunityIcons
                name={item.paymentStatus === 'SUCCESS' ? 'check-circle' : 'clock-outline'}
                size={14}
                color={item.paymentStatus === 'SUCCESS' ? '#10B981' : '#F59E0B'}
              />
              <Text style={[styles.metaValue, { color: item.paymentStatus === 'SUCCESS' ? '#10B981' : '#F59E0B' }]}>
                {item.paymentStatus === 'SUCCESS' ? 'Paid Online' : 'Pending'}
              </Text>
            </View>
          </View>
        </View>

      {/* Action Buttons */}
{item.status === 'WAITING_FOR_PARTNER' ? (
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(item.id)}>
              <Text style={styles.rejectBtnText}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.acceptBtn, updatingId === item.id && { opacity: 0.6 }]}
              onPress={() => handleAccept(item.id)}
              disabled={updatingId === item.id}
            >
              {updatingId === item.id
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.acceptBtnText}>Accept Booking</Text>
              }
            </TouchableOpacity>
          </View>
        ) : nextLabel ? (
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.callBtn} onPress={() => handleCall(item.patientMobile)}>
              <MaterialCommunityIcons name="phone-outline" size={18} color={COLORS.primary} />
            </TouchableOpacity>

            {item.status === 'ACCEPTED' && (
              <TouchableOpacity
                style={styles.assignToBtn}
                onPress={() => openAssignModal(item)}
              >
                <MaterialCommunityIcons name="account-arrow-right-outline" size={16} color="#1D4ED8" />
                <Text style={styles.assignToBtnText}>Assign To</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.statusUpdateBtn, updatingId === item.id && { opacity: 0.6 }]}
              onPress={() => handleUpdateStatus(item)}
              disabled={updatingId === item.id}
            >
              {updatingId === item.id
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.statusUpdateBtnText}>{getNextStatusLabel(item.status, item.paymentStatus)}</Text>
              }
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    );
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
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <View style={styles.header}>
        <View />
      </View>

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

      <FlatList
        data={bookings}
        keyExtractor={item => item.id}
        renderItem={renderBooking}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrapper}>
              <MaterialCommunityIcons name="calendar-blank-outline" size={56} color="#CBD5E1" />
            </View>
            <Text style={styles.emptyText}>No active bookings</Text>
            <Text style={styles.emptySubText}>New bookings assigned to you will appear here</Text>
          </View>
        }
      />

      {/* Assign To Branch Employee Phlebotomist Modal */}
      <Modal
        visible={assignModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAssignModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Assign to Branch Employee</Text>
                <Text style={styles.modalSub}>
                  Booking: {selectedBookingForAssign?.bookingCode} ({selectedBookingForAssign?.patientName})
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setAssignModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <MaterialCommunityIcons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {loadingStaff ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={{ marginTop: 12, color: '#64748B', fontSize: 13, fontWeight: '600' }}>
                  Loading branch staff...
                </Text>
              </View>
            ) : staffList.length === 0 ? (
              <View style={{ padding: 30, alignItems: 'center' }}>
                <MaterialCommunityIcons name="account-search-outline" size={48} color="#CBD5E1" />
                <Text style={{ marginTop: 10, fontSize: 14, fontWeight: '700', color: '#334155' }}>
                  No In-House Phlebotomists Found
                </Text>
                <Text style={{ marginTop: 4, fontSize: 12, color: '#94A3B8', textAlign: 'center' }}>
                  Create employee phlebotomists from the Admin Staff panel first.
                </Text>
              </View>
            ) : (
              <FlatList
                data={staffList}
                keyExtractor={(item) => item.id || item.userId}
                contentContainerStyle={{ paddingVertical: 10 }}
                renderItem={({ item }) => {
                  const isAssigning = assigningStaffId === (item.userId || item.id);
                  return (
                    <TouchableOpacity
                      style={styles.staffItemCard}
                      disabled={!!assigningStaffId}
                      onPress={() => handleAssignStaff(item)}
                    >
                      <View style={styles.staffAvatar}>
                        <MaterialCommunityIcons name="needle" size={20} color="#1D4ED8" />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.staffName}>{item.name}</Text>
                        <Text style={styles.staffDesignation}>{item.designation || 'In-House Phlebotomist'}</Text>
                        {item.mobile ? <Text style={styles.staffMobile}>📱 {item.mobile}</Text> : null}
                      </View>
                      <View style={styles.assignActionBtn}>
                        {isAssigning ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={styles.assignActionBtnText}>Assign</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  listContent: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff', borderRadius: 18, padding: 18,
    borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16, ...SHADOWS.soft,
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  bookingId: { fontSize: 10, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.5 },
  bookingCode: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  statusBadge: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 10, borderWidth: 1,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  patientRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  patientAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  patientInitial: { fontSize: 18, fontWeight: '900', color: '#fff' },
  patientInfo: { flex: 1 },
  patientName: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  addressText: { fontSize: 13, color: '#64748B', flex: 1, lineHeight: 18 },
  testsSection: {
    backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14,
    marginBottom: 14, borderWidth: 1, borderColor: '#F1F5F9',
  },
  testsLabel: { fontSize: 10, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.5, marginBottom: 10 },
  testRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  testName: { fontSize: 14, fontWeight: '600', color: '#334155' },
  metaRow: { flexDirection: 'row', marginBottom: 16, gap: 16 },
  metaItem: { flex: 1 },
  metaLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '600', marginBottom: 4 },
  metaValue: { fontSize: 13, fontWeight: '700', color: '#334155' },
  paidRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionRow: { flexDirection: 'row', gap: 10 },
  rejectBtn: {
    flex: 1, height: 46, borderRadius: 12, borderWidth: 1.5,
    borderColor: '#FCA5A5', justifyContent: 'center', alignItems: 'center',
  },
  rejectBtnText: { fontSize: 14, fontWeight: '700', color: '#EF4444' },
  acceptBtn: {
    flex: 2, height: 46, borderRadius: 12, backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  acceptBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  callBtn: {
    width: 46, height: 46, borderRadius: 12, borderWidth: 1.5,
    borderColor: '#CCFBF1', backgroundColor: '#F0FDFA',
    justifyContent: 'center', alignItems: 'center',
  },
  assignToBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    paddingHorizontal: 12,
    height: 46,
    borderRadius: 12,
  },
  assignToBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  statusUpdateBtn: {
    flex: 1, height: 46, borderRadius: 12, backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  statusUpdateBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  emptyContainer: {
    flex: 1,
    minHeight: 500,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyText: { fontSize: 17, fontWeight: '700', color: '#64748B', marginBottom: 8, textAlign: 'center' },
  emptySubText: { fontSize: 13, fontWeight: '400', color: '#94A3B8', textAlign: 'center', lineHeight: 20 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  staffAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  staffDesignation: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563EB',
    marginTop: 1,
  },
  staffMobile: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  assignActionBtn: {
    backgroundColor: '#1D4ED8',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  assignActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});