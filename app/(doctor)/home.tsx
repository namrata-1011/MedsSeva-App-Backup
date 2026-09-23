import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  RefreshControl, StatusBar, ActivityIndicator, ScrollView, Platform, Share, Linking
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import ScreenWrapper from '../../src/components/ScreenWrapper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiService } from '../../src/services/api';
import { COLORS, SHADOWS } from '../../src/theme/theme';
import { showError } from '../../src/store/toastStore';

interface DoctorPortalData {
  doctor: {
    id: string;
    name: string;
    code: string;
    qualification: string;
    registrationNo: string;
    specialization: string;
    designation: string;
    commissionRate: number;
    paymentCycle: string;
    avatarUrl?: string;
    branch?: { name: string; city: string };
  };
  summary: {
    totalReferredSamples: number;
    totalTestsCount: number;
    totalBilledAmount: number;
    commissionRate: number;
    totalCommissionEarned: number;
    paidCommission: number;
    unpaidCommission: number;
    paymentCycle: string;
  };
  referrals: Array<{
    bookingId: string;
    bookingCode: string;
    patientName: string;
    patientAge?: number;
    patientGender?: string;
    patientMobile?: string;
    scheduledDate: string;
    bookingStatus: string;
    totalPaid: number;
    commissionAmount: number;
    payoutStatus: string;
    tests: Array<{ name: string; price: number }>;
    collectionMode?: string;
    collectionOtp?: string;
    assignedPartner?: { labName: string; mobile?: string } | null;
    statusTimeline?: Array<{ status: string; createdAt: string; note?: string }>;
    report?: {
      id: string;
      status: string;
      pdfUrl?: string;
      reportedDate?: string;
    } | null;
  }>;
}

export default function DoctorHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<'ALL' | 'WEEKLY' | 'MONTHLY'>('ALL');
  const [data, setData] = useState<DoctorPortalData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (selectedPeriod = period) => {
    try {
      const res = await apiService.getDoctorPortalData(selectedPeriod);
      setData(res);
    } catch (e: any) {
      console.error('Failed to load doctor portal data', e);
      showError(e?.response?.data?.error || 'Failed to load doctor dashboard');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  useFocusEffect(
    useCallback(() => {
      loadData(period);
    }, [period, loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData(period);
  };

  const getStatusBadge = (status: string, hasReport: boolean) => {
    if (hasReport || status === 'COMPLETED') {
      return { bg: '#DCFCE7', text: '#15803D', label: 'Report Ready', icon: 'check-circle' as const };
    }
    if (status === 'DELIVERED_TO_LAB' || status === 'IN_LAB') {
      return { bg: '#DBEAFE', text: '#1D4ED8', label: 'At Lab (Testing)', icon: 'flask-round-bottom' as const };
    }
    if (status === 'SAMPLE_COLLECTED' || status === 'OUT_FOR_DELIVERY') {
      return { bg: '#F3E8FF', text: '#7E22CE', label: 'Sample In-Transit', icon: 'moped' as const };
    }
    return { bg: '#FEF3C7', text: '#B45309', label: 'Pickup Scheduled', icon: 'clock-outline' as const };
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <ScreenWrapper
        backgroundColor="#F8FAFC"
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 8,
            paddingBottom: 80 + insets.bottom,
          },
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      >
        {/* Doctor Header Banner */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View style={styles.doctorAvatar}>
              {data?.doctor?.avatarUrl ? (
                <Image source={{ uri: data.doctor.avatarUrl }} style={{ width: '100%', height: '100%', borderRadius: 28 }} />
              ) : (
                <MaterialCommunityIcons name="stethoscope" size={28} color="#FFFFFF" />
              )}
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={styles.badgeRow}>
                <View style={styles.verifiedPill}>
                  <View style={styles.verifiedDot} />
                  <Text style={styles.verifiedText}>Verified Doctor</Text>
                </View>
                <Text style={styles.regNoBadge}>{data?.doctor?.registrationNo || 'MCI Reg'}</Text>
              </View>
              <Text style={styles.doctorName}>Dr. {data?.doctor?.name || 'Doctor'}</Text>
              <Text style={styles.doctorSub}>
                {data?.doctor?.qualification || 'MBBS'} • {data?.doctor?.specialization || 'Consulting Specialist'}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Sample Action Cards (Removed as per requirements) */}

        {/* Period Filter Tabs */}
        <View style={styles.periodRow}>
          {(['ALL', 'MONTHLY', 'WEEKLY'] as const).map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.periodPill, period === p && styles.periodPillActive]}
              onPress={() => {
                setPeriod(p);
                loadData(p);
              }}
            >
              <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
                {p === 'ALL' ? 'All Time' : p === 'MONTHLY' ? 'This Month' : 'This Week'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Commission Stats Grid */}
        {isLoading && !refreshing ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: 30 }} />
        ) : (
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { borderLeftColor: '#10B981' }]}>
              <View style={styles.statTopRow}>
                <Text style={styles.statLabel}>Total Commission</Text>
                <MaterialCommunityIcons name="cash-check" size={20} color="#10B981" />
              </View>
              <Text style={styles.statValue}>₹{data?.summary?.totalCommissionEarned ?? 0}</Text>
              <Text style={styles.statHelper}>From ₹{data?.summary?.totalBilledAmount ?? 0} billed</Text>
            </View>

            <View style={[styles.statCard, { borderLeftColor: '#F59E0B' }]}>
              <View style={styles.statTopRow}>
                <Text style={styles.statLabel}>Pending Payout</Text>
                <MaterialCommunityIcons name="clock-alert-outline" size={20} color="#F59E0B" />
              </View>
              <Text style={styles.statValue}>₹{data?.summary?.unpaidCommission ?? 0}</Text>
              <Text style={styles.statHelper}>Cycle: {data?.summary?.paymentCycle || 'Monthly'}</Text>
            </View>

            <View style={[styles.statCard, { borderLeftColor: '#3B82F6' }]}>
              <View style={styles.statTopRow}>
                <Text style={styles.statLabel}>Referred Patients</Text>
                <MaterialCommunityIcons name="account-group" size={20} color="#3B82F6" />
              </View>
              <Text style={styles.statValue}>{data?.summary?.totalReferredSamples ?? 0}</Text>
              <Text style={styles.statHelper}>{data?.summary?.totalTestsCount ?? 0} tests ordered</Text>
            </View>

            <View style={[styles.statCard, { borderLeftColor: '#8B5CF6' }]}>
              <View style={styles.statTopRow}>
                <Text style={styles.statLabel}>Commission Rate</Text>
                <MaterialCommunityIcons name="percent" size={20} color="#8B5CF6" />
              </View>
              <Text style={styles.statValue}>{data?.summary?.commissionRate ?? 30}%</Text>
              <Text style={styles.statHelper}>Per test settlement</Text>
            </View>
          </View>
        )}

        {/* Recent Referrals & Live Patient Status */}
        <View style={styles.referralsHeader}>
          <Text style={styles.sectionHeading}>Recent Patients & Reports</Text>
          <TouchableOpacity onPress={() => router.navigate('/(doctor)/patients')}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {data?.referrals && data.referrals.length > 0 ? (
          data.referrals.slice(0, 5).map((r) => {
            const badge = getStatusBadge(r.bookingStatus, !!r.report);
            return (
              <View key={r.bookingId} style={styles.patientCard}>
                <View style={styles.patientCardHeader}>
                  <View>
                    <Text style={styles.patientName}>{r.patientName}</Text>
                    <Text style={styles.patientCode}>{r.bookingCode}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                    <MaterialCommunityIcons name={badge.icon} size={14} color={badge.text} />
                    <Text style={[styles.statusText, { color: badge.text }]}>{badge.label}</Text>
                  </View>
                </View>

                {/* Tests List */}
                <View style={styles.testsBox}>
                  <Text style={styles.testTitle} numberOfLines={1}>
                    🧪 {r.tests.map((t) => t.name).join(', ') || 'Diagnostic Investigation'}
                  </Text>
                </View>

                {/* Card Footer */}
                <View style={styles.cardFooter}>
                  <View>
                    <Text style={styles.commLabel}>Doctor Commission</Text>
                    <Text style={styles.commAmount}>+₹{Math.round(r.commissionAmount)}</Text>
                  </View>

                  {r.report ? (
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                      <TouchableOpacity
                        style={styles.iconBtn}
                        onPress={() => {
                           if (r.report?.pdfUrl) {
                             Share.share({
                               message: `Lab Report for ${r.patientName}. View here: ${r.report.pdfUrl}`
                             });
                           } else {
                             showError('Report PDF not available to share yet');
                           }
                        }}
                      >
                        <MaterialCommunityIcons name="share-variant" size={16} color="#006D6F" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.iconBtn}
                        onPress={async () => {
                           if (r.report?.pdfUrl) {
                             try {
                               const fileUri = FileSystem.documentDirectory + `report_${r.patientName.replace(/\s+/g, '_')}.pdf`;
                               const { uri } = await FileSystem.downloadAsync(r.report.pdfUrl, fileUri);
                               if (await Sharing.isAvailableAsync()) {
                                 await Sharing.shareAsync(uri);
                               } else {
                                 Linking.openURL(r.report.pdfUrl);
                               }
                             } catch (e) {
                               Linking.openURL(r.report.pdfUrl);
                             }
                           } else {
                             showError('Report PDF not available to download yet');
                           }
                        }}
                      >
                        <MaterialCommunityIcons name="download" size={16} color="#006D6F" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.reportBtn}
                        onPress={() => {
                          if (r.report?.id) {
                            router.push(`/report/${r.report.id}` as any);
                          }
                        }}
                      >
                        <MaterialCommunityIcons name="file-document-outline" size={16} color="#FFFFFF" />
                        <Text style={styles.reportBtnText}>View</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.pendingReportPill}>
                      <Text style={styles.pendingReportText}>Awaiting Lab Report</Text>
                    </View>
                  )}
                </View>

                {/* Tracking & OTP Section for Doctor */}
                {!r.report && r.collectionMode === 'HOME' && (
                  <TouchableOpacity 
                    style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}
                    onPress={() => router.push(`/tracking/${r.bookingId}` as any)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <MaterialCommunityIcons name="map-marker-path" size={14} color="#64748B" />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>Tracking Status</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {r.collectionOtp && r.bookingStatus !== 'COMPLETED' && r.bookingStatus !== 'CANCELLED' && (
                           <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                              <MaterialCommunityIcons name="shield-key-outline" size={12} color="#B45309" />
                              <Text style={{ fontSize: 10, fontWeight: '800', color: '#B45309' }}>OTP: {r.collectionOtp}</Text>
                           </View>
                        )}
                        <MaterialCommunityIcons name="chevron-right" size={16} color="#94A3B8" />
                      </View>
                    </View>
                    <Text style={{ fontSize: 12, color: '#334155', fontWeight: '600' }}>
                      {r.bookingStatus === 'WAITING_FOR_PARTNER' ? 'Waiting for Phlebotomist Assignment' :
                       r.bookingStatus === 'ACCEPTED' ? `Assigned to: ${r.assignedPartner?.labName || 'Collector'}` :
                       r.bookingStatus === 'ON_THE_WAY' ? `Collector is on the way` :
                       r.bookingStatus === 'REACHED_LOCATION' ? `Collector has reached the clinic` :
                       r.bookingStatus === 'SAMPLE_COLLECTED' ? `Sample collected, on the way to lab` :
                       r.bookingStatus === 'DELIVERING_TO_BRANCH' ? `Sample in-transit to branch` :
                       r.bookingStatus === 'DELIVERED_TO_LAB' ? `Sample reached lab. Testing in progress...` :
                       r.bookingStatus}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        ) : (
          !isLoading && (
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons name="flask-empty-outline" size={48} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No Patient Referrals Yet</Text>
              <Text style={styles.emptySub}>
                Use the buttons above to book a request or register collected clinic samples.
              </Text>
            </View>
          )
        )}
      </ScreenWrapper>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16, paddingBottom: 40 },
  headerCard: {
    backgroundColor: '#006D6F',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    ...SHADOWS.soft,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center' },
  doctorAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  verifiedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#15803D', marginRight: 4 },
  verifiedText: { fontSize: 10, fontWeight: '800', color: '#15803D' },
  regNoBadge: { fontSize: 11, fontWeight: '700', color: '#CCFBF1' },
  doctorName: { fontSize: 18, fontWeight: '900', color: '#FFFFFF' },
  doctorSub: { fontSize: 12, color: '#E6FFFA', marginTop: 2 },

  sectionHeading: { flexShrink: 1, fontSize: 15, fontWeight: '800', color: '#1E293B', marginBottom: 12, marginRight: 8 },
  actionsContainer: { gap: 12, marginBottom: 20 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    ...SHADOWS.soft,
  },
  pickupBtn: { backgroundColor: '#0F766E' },
  handoverBtn: { backgroundColor: '#0369A1' },
  actionIconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  actionBtnTitle: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  actionBtnSub: { fontSize: 12, color: '#E2E8F0', marginTop: 2, lineHeight: 16 },

  periodRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  periodPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  periodPillActive: { backgroundColor: '#006D6F', borderColor: '#006D6F' },
  periodText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  periodTextActive: { color: '#FFFFFF' },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', marginBottom: 24 },
  statCard: {
    flexBasis: '48%',
    flexGrow: 1,
    minWidth: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
    ...SHADOWS.soft,
  },
  statTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  statLabel: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  statValue: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  statHelper: { fontSize: 10, color: '#94A3B8', marginTop: 4 },

  referralsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  viewAllText: { fontSize: 13, fontWeight: '700', color: '#006D6F' },
  patientCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    ...SHADOWS.soft,
  },
  patientCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  patientName: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  patientCode: { fontSize: 11, fontWeight: '600', color: '#64748B', marginTop: 2 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  testsBox: { backgroundColor: '#F8FAFC', padding: 8, borderRadius: 8, marginBottom: 12 },
  testTitle: { fontSize: 12, color: '#334155', fontWeight: '600' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  commLabel: { fontSize: 10, color: '#64748B', fontWeight: '700' },
  commAmount: { fontSize: 14, fontWeight: '900', color: '#10B981' },
  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#006D6F',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  iconBtn: {
    backgroundColor: '#CCFBF1',
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportBtnText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  pendingReportPill: { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  pendingReportText: { fontSize: 11, color: '#64748B', fontWeight: '600' },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 8,
  },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: '#334155', marginTop: 12 },
  emptySub: { fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: 4, paddingHorizontal: 20 },
});
