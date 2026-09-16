import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, Modal, Linking, Alert, StatusBar
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { RootState } from '../../src/store';
import ScreenWrapper from '../../src/components/ScreenWrapper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { apiService } from '../../src/services/api';
import { COLORS, SHADOWS } from '../../src/theme/theme';
import { showSuccess, showError } from '../../src/store/toastStore';

export default function PhlebotomistBookingDetailScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string; bookingData?: string }>();
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

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [branchModalVisible, setBranchModalVisible] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [selectingBranchId, setSelectingBranchId] = useState<string | null>(null);

  const loadBooking = useCallback(async () => {
    try {
      if (params.bookingData) {
        setBooking(JSON.parse(params.bookingData));
        setLoading(false);
        return;
      }

      if (params.id) {
        // 1. Try getPartnerBookings first
        const list = await apiService.getPartnerBookings().catch(() => []);
        let found = Array.isArray(list) ? list.find((b: any) => b.id === params.id) : null;

        // 2. Fallback to direct getBookingDetails
        if (!found) {
          const detail = await apiService.getBookingDetails(params.id).catch(() => null);
          if (detail && detail.id) {
            found = {
              ...detail,
              collectionAddress: detail.address
                ? [detail.address.line1, detail.address.line2, detail.address.city, detail.address.pincode].filter(Boolean).join(', ')
                : detail.collectionAddress || null,
              tests: (detail.tests || []).map((t: any) => ({ name: t.test?.name || t.name })),
              packages: (detail.packages || []).map((p: any) => ({ name: p.package?.name || p.name })),
            };
          }
        }

        // 3. Fallback to getPartnerNotifications
        if (!found) {
          const notifs = await apiService.getPartnerNotifications().catch(() => []);
          found = Array.isArray(notifs) ? notifs.find((b: any) => b.id === params.id) : null;
        }

        if (found) {
          setBooking(found);
        } else {
          showError('Booking not found');
        }
      }
    } catch {
      showError('Failed to load booking details');
    } finally {
      setLoading(false);
    }
  }, [params.id, params.bookingData]);

  useEffect(() => {
    let active = true;
    if (active) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadBooking();
    }
    return () => { active = false; };
  }, [loadBooking]);

  const openBranchModal = async () => {
    setBranchModalVisible(true);
    setLoadingBranches(true);
    try {
      const data = await apiService.getDeliveryBranches();
      setBranches(Array.isArray(data) ? data : []);
    } catch {
      showError('Failed to load delivery branches.');
    } finally {
      setLoadingBranches(false);
    }
  };

  const handleSelectDeliveryBranch = async (branch: any) => {
    if (!booking) return;
    setSelectingBranchId(branch.id);
    try {
      await apiService.selectDeliveryBranch(booking.id, branch.id);
      showSuccess(`Delivery branch selected: ${branch.name}`);
      setBranchModalVisible(false);
      setBooking((prev: any) => prev ? { ...prev, status: 'DELIVERING_TO_BRANCH', deliveryBranch: branch } : prev);
    } catch (e: any) {
      showError(e?.response?.data?.message || e?.response?.data?.error || 'Failed to select branch.');
    } finally {
      setSelectingBranchId(null);
    }
  };

  const handleConfirmBranchDelivery = async () => {
    if (!booking) return;
    setActionLoading(true);
    try {
      await apiService.confirmBranchDelivery(booking.id);
      showSuccess('Sample delivered to lab successfully!');
      setBooking((prev: any) => prev ? { ...prev, status: 'DELIVERED_TO_LAB' } : prev);
      Alert.alert(
        'Sample Delivered!',
        isFreelancer
          ? '30% commission has been added to your earnings wallet.'
          : 'Sample handed over to branch laboratory successfully.',
        [{ text: 'OK', onPress: () => router.push('/(phlebotomist)/home' as any) }]
      );
    } catch (e: any) {
      showError(e?.response?.data?.message || e?.response?.data?.error || 'Failed to confirm delivery.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAccept = async (id: string) => {
    setActionLoading(true);
    try {
      await apiService.acceptBooking(id);
      showSuccess('Pickup Accepted! Proceed to patient address.');
      setBooking((prev: any) => prev ? { ...prev, status: 'ACCEPTED' } : prev);
    } catch (e: any) {
      showError(e?.response?.data?.message || e?.response?.data?.error || 'Failed to accept booking');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async (reason?: string) => {
    if (!booking) return;
    setActionLoading(true);
    try {
      await apiService.rejectBooking(booking.id, reason);
      showSuccess('Booking returned to branch.');
      router.back();
    } catch (e: any) {
      showError(e?.response?.data?.message || e?.response?.data?.error || 'Failed to decline booking');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!booking) return;
    setActionLoading(true);
    try {
      await apiService.updateBookingStatus(booking.id, newStatus);
      showSuccess(`Status updated to ${newStatus.replace(/_/g, ' ')}`);
      setBooking((prev: any) => prev ? { ...prev, status: newStatus } : prev);
      if (newStatus === 'DELIVERED_TO_LAB') {
        Alert.alert(
          'Sample Delivered!',
          isFreelancer
            ? '30% commission has been added to your earnings ledger.'
            : 'Sample delivered to branch laboratory successfully.',
          [{ text: 'OK', onPress: () => router.push('/(phlebotomist)/home' as any) }]
        );
      }
    } catch (e: any) {
      showError(e?.response?.data?.message || e?.response?.data?.error || 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyOtpAndCollect = async () => {
    if (!otpInput || otpInput.trim().length < 4) {
      showError('Please enter valid 4-digit Collection OTP.');
      return;
    }
    setActionLoading(true);
    try {
      await apiService.verifySampleOtp(booking.id, otpInput.trim());
      showSuccess('Sample marked as Collected!');
      setOtpModalVisible(false);
      setBooking((prev: any) => prev ? { ...prev, status: 'SAMPLE_COLLECTED', otpVerified: true } : prev);
    } catch (e: any) {
      showError(e?.response?.data?.message || e?.response?.data?.error || 'Invalid OTP or collection failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <ScreenWrapper scrollable={false} style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </ScreenWrapper>
    );
  }

  if (!booking) {
    return (
      <ScreenWrapper scrollable={false} style={styles.centered}>
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#94A3B8" />
        <Text style={styles.emptyText}>Booking details not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </ScreenWrapper>
    );
  }

  const estPayout = Math.round((booking.totalPaid || 800) * 0.30);
  const testNames = (booking.tests || []).map((bt: any) => bt.test?.name || bt.name).filter(Boolean);
  const packageNames = (booking.packages || []).map((bp: any) => bp.package?.name || bp.name).filter(Boolean);
  const allTests = [...testNames, ...packageNames];

  return (
    <ScreenWrapper scrollable={false} backgroundColor="#F8FAFC">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      {/* Header with Safe Area Inset */}
      <View style={[styles.topNav, { paddingTop: Math.max(insets.top, 16) + 6 }]}>
        <TouchableOpacity style={styles.navBackBtn} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#0F172A" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.navTitle}>{booking.bookingCode}</Text>
          <Text style={styles.navSub}>Sample Collection Order</Text>
        </View>
        <View style={styles.statusPill}>
          <Text style={styles.statusPillText}>{booking.status?.replace(/_/g, ' ')}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Commission Banner (Freelancers only) */}
        {isFreelancer ? (
          <View style={styles.payoutCard}>
            <View style={styles.payoutIconBox}>
              <MaterialCommunityIcons name="wallet-outline" size={24} color="#065F46" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.payoutLabel}>Freelance Payout (30% Commission)</Text>
              <Text style={styles.payoutAmount}>₹{estPayout}</Text>
            </View>
            <View style={styles.payoutBadge}>
              <Text style={styles.payoutBadgeText}>On Lab Delivery</Text>
            </View>
          </View>
        ) : (
          <View style={[styles.payoutCard, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
            <View style={[styles.payoutIconBox, { backgroundColor: '#DBEAFE' }]}>
              <MaterialCommunityIcons name="clipboard-text-outline" size={24} color="#1D4ED8" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.payoutLabel, { color: '#1E40AF' }]}>In-House Branch Assignment</Text>
              <Text style={[styles.payoutAmount, { color: '#1E3A8A', fontSize: 13, marginTop: 2 }]}>Direct Lab Staff Order</Text>
            </View>
          </View>
        )}

        {/* Patient Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Patient Details</Text>
          <View style={styles.patientRow}>
            <View style={styles.patientAvatar}>
              <Text style={styles.patientAvatarText}>{booking.patientName?.charAt(0) || 'P'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.patientName}>{booking.patientName}</Text>
              <Text style={styles.patientSub}>
                {booking.patientGender || 'Patient'} • {booking.patientAge ? `${booking.patientAge} Yrs` : 'Adult'}
              </Text>
            </View>
            {booking.patientMobile && (
              <TouchableOpacity
                onPress={() => Linking.openURL(`tel:${booking.patientMobile}`)}
                style={styles.callCircleBtn}
              >
                <MaterialCommunityIcons name="phone" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>

          {booking.collectionAddress && (
            <View style={styles.addressBox}>
              <MaterialCommunityIcons name="map-marker" size={18} color="#EF4444" style={{ marginTop: 2 }} />
              <View style={{ flex: 1, marginLeft: 6 }}>
                <Text style={styles.addressText}>{booking.collectionAddress}</Text>
                <TouchableOpacity
                  onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(booking.collectionAddress)}`)}
                  style={styles.mapLinkBtn}
                >
                  <Text style={styles.mapLinkText}>Open Navigation in Google Maps</Text>
                  <MaterialCommunityIcons name="launch" size={12} color="#006D6F" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.slotRow}>
            <MaterialCommunityIcons name="calendar-clock" size={16} color="#64748B" />
            <Text style={styles.slotText}>
              Slot: {booking.scheduledSlot || 'Standard Slot'} ({booking.scheduledDate ? new Date(booking.scheduledDate).toLocaleDateString() : 'Scheduled'})
            </Text>
          </View>
        </View>

        {/* Tests & Samples Required */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Investigation & Tube Requirements</Text>
          {allTests.length === 0 ? (
            <Text style={styles.testItem}>1. Standard Pathology Panel</Text>
          ) : (
            allTests.map((t, idx) => (
              <View key={idx} style={styles.testRow}>
                <MaterialCommunityIcons name="test-tube" size={18} color="#006D6F" />
                <Text style={styles.testItem}>{t}</Text>
              </View>
            ))
          )}

          <View style={styles.tubesChecklist}>
            <Text style={styles.tubesHeader}>Recommended Sample Collection Tubes:</Text>
            <View style={styles.tubeChipsRow}>
              <View style={[styles.tubeChip, { backgroundColor: '#EDE9FE' }]}>
                <Text style={[styles.tubeChipText, { color: '#6D28D9' }]}>🟣 EDTA (Purple)</Text>
              </View>
              <View style={[styles.tubeChip, { backgroundColor: '#FEE2E2' }]}>
                <Text style={[styles.tubeChipText, { color: '#B91C1C' }]}>🔴 Plain/Gel (Red)</Text>
              </View>
              <View style={[styles.tubeChip, { backgroundColor: '#F1F5F9' }]}>
                <Text style={[styles.tubeChipText, { color: '#475569' }]}>⚪ Fluoride (Grey)</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Workflow Actions */}
        <View style={styles.actionCard}>
          <Text style={styles.cardTitle}>Collection Lifecycle Status</Text>

          {(booking.status === 'WAITING_FOR_PARTNER' || booking.status === 'ASSIGNED') && (
            <View style={styles.initialActionRow}>
              <TouchableOpacity
                style={styles.detailDeclineBtn}
                disabled={actionLoading}
                onPress={() => handleDecline()}
              >
                <Text style={styles.detailDeclineBtnText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.detailAcceptBtn}
                disabled={actionLoading}
                onPress={() => handleAccept(booking.id)}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="check-bold" size={18} color="#FFF" />
                    <Text style={styles.detailAcceptBtnText}>Accept Booking</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {booking.status === 'ACCEPTED' && (
            <TouchableOpacity
              style={styles.primaryActionBtn}
              disabled={actionLoading}
              onPress={() => handleUpdateStatus('ON_THE_WAY')}
            >
              {actionLoading ? <ActivityIndicator color="#FFF" /> : (
                <>
                  <MaterialCommunityIcons name="motorbike" size={20} color="#FFF" />
                  <Text style={styles.primaryActionBtnText}>1. Start Journey (On The Way)</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {booking.status === 'ON_THE_WAY' && (
            <TouchableOpacity
              style={styles.primaryActionBtn}
              disabled={actionLoading}
              onPress={() => handleUpdateStatus('REACHED_LOCATION')}
            >
              {actionLoading ? <ActivityIndicator color="#FFF" /> : (
                <>
                  <MaterialCommunityIcons name="map-marker-check" size={20} color="#FFF" />
                  <Text style={styles.primaryActionBtnText}>2. Reached Patient Location</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {booking.status === 'REACHED_LOCATION' && (
            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: '#059669' }]}
              disabled={actionLoading}
              onPress={() => {
                router.push(
                  `/partner-flow/collect?bookingId=${booking.id}&paymentStatus=${booking.paymentStatus}&otpVerified=${booking.otpVerified ?? false}` as any
                );
              }}
            >
              <MaterialCommunityIcons name="shield-key-outline" size={20} color="#FFF" />
              <Text style={styles.primaryActionBtnText}>3. Verify OTP & Collect Payment</Text>
            </TouchableOpacity>
          )}

          {booking.status === 'SAMPLE_COLLECTED' && (
            isFreelancer ? (
              <TouchableOpacity
                style={[styles.primaryActionBtn, { backgroundColor: '#7C3AED' }]}
                disabled={actionLoading}
                onPress={openBranchModal}
              >
                <MaterialCommunityIcons name="hospital-building" size={20} color="#FFF" />
                <Text style={styles.primaryActionBtnText}>4. Select Delivery Branch</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.primaryActionBtn, { backgroundColor: '#0D9488' }]}
                disabled={actionLoading}
                onPress={() => handleUpdateStatus('DELIVERED_TO_LAB')}
              >
                {actionLoading ? <ActivityIndicator color="#FFF" /> : (
                  <>
                    <MaterialCommunityIcons name="hospital-building" size={20} color="#FFF" />
                    <Text style={styles.primaryActionBtnText}>4. Deliver Sample to Branch Lab</Text>
                  </>
                )}
              </TouchableOpacity>
            )
          )}

          {booking.status === 'DELIVERING_TO_BRANCH' && (
            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: '#006D6F' }]}
              disabled={actionLoading}
              onPress={handleConfirmBranchDelivery}
            >
              <MaterialCommunityIcons name="truck-delivery-outline" size={20} color="#FFF" />
              <Text style={styles.primaryActionBtnText}>5. Confirm Sample Handover at Lab</Text>
            </TouchableOpacity>
          )}

          {booking.status === 'DELIVERED_TO_LAB' && (
            <View style={styles.completedBox}>
              <MaterialCommunityIcons name="check-decagram" size={24} color="#059669" />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.completedTitle}>Sample Delivered to Lab</Text>
                <Text style={styles.completedSub}>
                  {isFreelancer
                    ? `30% Commission (₹${estPayout}) credited to your wallet.`
                    : 'Sample handed over to branch laboratory successfully.'}
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Collection OTP Modal */}
      <Modal visible={otpModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <MaterialCommunityIcons name="shield-key-outline" size={28} color="#006D6F" />
              <Text style={styles.modalTitle}>Verify Collection OTP</Text>
              <Text style={styles.modalSub}>Ask the patient for their 4-digit Collection OTP</Text>
            </View>

            <TextInput
              style={styles.otpInput}
              placeholder="e.g. 4821"
              keyboardType="number-pad"
              maxLength={4}
              value={otpInput}
              onChangeText={setOtpInput}
              autoFocus
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setOtpModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmOtpBtn}
                disabled={actionLoading}
                onPress={handleVerifyOtpAndCollect}
              >
                {actionLoading ? <ActivityIndicator color="#FFF" /> : (
                  <Text style={styles.confirmOtpBtnText}>Verify & Collect</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Select Delivery Branch Modal */}
      <Modal
        visible={branchModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setBranchModalVisible(false)}
      >
        <View style={styles.bottomModalOverlay}>
          <View style={styles.bottomModalBox}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>Select Delivery Branch</Text>
                <Text style={styles.modalSub}>Where will you deposit the collected sample?</Text>
              </View>
              <TouchableOpacity
                onPress={() => setBranchModalVisible(false)}
                style={styles.closeBtn}
              >
                <MaterialCommunityIcons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {loadingBranches ? (
              <View style={{ padding: 30, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={{ marginTop: 10, color: '#64748B', fontSize: 12 }}>Loading partner branches...</Text>
              </View>
            ) : branches.length === 0 ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: '#64748B', fontSize: 13 }}>No active branches found.</Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                {branches.map((b) => {
                  const isSelecting = selectingBranchId === b.id;
                  return (
                    <TouchableOpacity
                      key={b.id}
                      style={styles.branchCard}
                      disabled={!!selectingBranchId}
                      onPress={() => handleSelectDeliveryBranch(b)}
                    >
                      <View style={styles.branchIconWrapper}>
                        <MaterialCommunityIcons name="hospital-building" size={22} color="#006D6F" />
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.branchName}>{b.name}</Text>
                        <Text style={styles.branchAddress} numberOfLines={1}>
                          {[b.line1, b.city, b.pincode].filter(Boolean).join(', ')}
                        </Text>
                        {b.contactNumber && (
                          <Text style={styles.branchContact}>📞 {b.contactNumber}</Text>
                        )}
                      </View>
                      <View style={styles.selectBranchBtn}>
                        {isSelecting ? (
                          <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                          <Text style={styles.selectBranchBtnText}>Drop Here</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 10,
  },
  backBtn: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#006D6F',
  },
  backBtnText: {
    color: '#FFF',
    fontWeight: '700',
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  navBackBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  navTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  navSub: {
    fontSize: 11,
    color: '#64748B',
  },
  statusPill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065F46',
    textTransform: 'capitalize',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  payoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    marginBottom: 16,
  },
  payoutIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payoutLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  payoutAmount: {
    fontSize: 20,
    fontWeight: '900',
    color: '#065F46',
  },
  payoutBadge: {
    backgroundColor: '#059669',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  payoutBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    ...SHADOWS.sm,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  patientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  patientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E6F4F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  patientAvatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#006D6F',
  },
  patientName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  patientSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  callCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#006D6F',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  addressBox: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },
  addressText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
    fontWeight: '500',
  },
  mapLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  mapLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#006D6F',
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  slotText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  testRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  testItem: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  tubesChecklist: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  tubesHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 8,
  },
  tubeChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tubeChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tubeChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    ...SHADOWS.sm,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#006D6F',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    ...SHADOWS.md,
  },
  primaryActionBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  completedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  completedTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#065F46',
  },
  completedSub: {
    fontSize: 12,
    color: '#047857',
    marginTop: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    ...SHADOWS.lg,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 6,
  },
  modalSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  otpInput: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 10,
    textAlign: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#006D6F',
    borderRadius: 12,
    paddingVertical: 12,
    color: '#0F172A',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  confirmOtpBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#006D6F',
    alignItems: 'center',
  },
  confirmOtpBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  bottomModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bottomModalBox: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '75%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 10,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  branchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  branchIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E6F4F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  branchName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  branchAddress: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  branchContact: {
    fontSize: 11,
    color: '#006D6F',
    fontWeight: '600',
    marginTop: 2,
  },
  selectBranchBtn: {
    backgroundColor: '#006D6F',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  selectBranchBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  initialActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  detailDeclineBtn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
  },
  detailDeclineBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#EF4444',
  },
  detailAcceptBtn: {
    flex: 1,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    ...SHADOWS.sm,
  },
  detailAcceptBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
