import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, StatusBar, Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../../src/theme/theme';

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: 'Pending', color: '#D97706', bg: '#FEF3C7' },
  CONFIRMED: { label: 'Confirmed', color: '#2563EB', bg: '#DBEAFE' },
  ASSIGNED: { label: 'Assigned', color: '#7C3AED', bg: '#EDE9FE' },
  ACCEPTED: { label: 'Accepted', color: '#0891B2', bg: '#CFFAFE' },
  ON_THE_WAY: { label: 'On The Way', color: '#0891B2', bg: '#CFFAFE' },
  REACHED_LOCATION: { label: 'Reached', color: '#0891B2', bg: '#CFFAFE' },
  SAMPLE_COLLECTED: { label: 'Sample Collected', color: '#059669', bg: '#D1FAE5' },
  DELIVERED_TO_LAB: { label: 'Delivered to Lab', color: '#059669', bg: '#D1FAE5' },
  PROCESSING: { label: 'Processing', color: '#7C3AED', bg: '#EDE9FE' },
  REPORT_READY: { label: 'Report Ready', color: '#059669', bg: '#D1FAE5' },
  COMPLETED: { label: 'Completed', color: '#059669', bg: '#D1FAE5' },
  CANCELLED: { label: 'Cancelled', color: '#EF4444', bg: '#FEE2E2' },
  REJECTED: { label: 'Rejected', color: '#EF4444', bg: '#FEE2E2' },
};

const PAYMENT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pending', color: '#D97706' },
  SUCCESS: { label: 'Paid', color: '#059669' },
  FAILED: { label: 'Failed', color: '#EF4444' },
  REFUNDED: { label: 'Refunded', color: '#7C3AED' },
};

function InfoRow({ icon, label, value, valueColor }: { icon: string; label: string; value: string; valueColor?: string }) {
  return (
    <View style={infoStyles.row}>
      <MaterialCommunityIcons name={icon as any} size={16} color="#94A3B8" style={infoStyles.icon} />
      <Text style={infoStyles.label}>{label}</Text>
      <Text style={[infoStyles.value, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  icon: { marginRight: 10 },
  label: { flex: 1, fontSize: 13, color: '#64748B', fontWeight: '500' },
  value: { fontSize: 13, fontWeight: '700', color: '#0F172A', maxWidth: '55%', textAlign: 'right' },
});

export default function PartnerBookingDetailScreen() {
const { bookingData } = useLocalSearchParams<{ bookingData: string }>();
  const router = useRouter();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

useEffect(() => {
    try {
      if (!bookingData) { setError(true); setLoading(false); return; }
      const parsed = JSON.parse(bookingData);
    
      setBooking(parsed);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [bookingData]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (error || !booking) {
    return (
      <View style={styles.centered}>
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#CBD5E1" />
        <Text style={styles.errorText}>Failed to load booking details</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()}>
          <Text style={styles.retryBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusCfg = STATUS_LABELS[booking.status] || { label: booking.status, color: '#64748B', bg: '#F1F5F9' };
  const paymentCfg = PAYMENT_STATUS_LABELS[booking.paymentStatus] || { label: booking.paymentStatus, color: '#64748B' };

  const testNames = (booking.tests || []).map((bt: any) => bt.test?.name || bt.name).filter(Boolean);
  const packageNames = (booking.packages || []).map((bp: any) => bp.package?.name || bp.name).filter(Boolean);
  const allTests = [...testNames, ...packageNames];

  const timeline: { status: string; time?: string }[] = booking.statusTimeline || [];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.header}>
   <TouchableOpacity style={styles.backBtn} onPress={() => router.navigate('/(partner)/history')} activeOpacity={0.7}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking Details</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.bookingCode}>{booking.bookingCode}</Text>
              <Text style={styles.bookingDate}>
                {new Date(booking.scheduledDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} • {booking.scheduledSlot}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
              <Text style={[styles.statusBadgeText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Patient Details</Text>
          <View style={styles.card}>
         <InfoRow icon="account-outline" label="Name" value={String(booking.patientName || '-')} />
            <InfoRow icon="calendar-outline" label="Age" value={booking.patientAge != null ? `${booking.patientAge} yrs` : 'Not provided'} />
            <InfoRow icon="gender-male-female" label="Gender" value={booking.patientGender != null ? String(booking.patientGender) : 'Not provided'} />
            <InfoRow icon="phone-outline" label="Mobile" value={String(booking.patientMobile || booking.user?.mobile || '-')} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tests / Packages</Text>
          <View style={styles.card}>
            {allTests.length > 0 ? allTests.map((name: string, i: number) => (
              <View key={i} style={[infoStyles.row, i === allTests.length - 1 && { borderBottomWidth: 0 }]}>
                <MaterialCommunityIcons name="flask-outline" size={16} color="#94A3B8" style={infoStyles.icon} />
                <Text style={[infoStyles.label, { flex: 1, color: '#0F172A', fontWeight: '600' }]}>{name}</Text>
              </View>
            )) : (
              <Text style={styles.emptyText}>No tests found</Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment</Text>
          <View style={styles.card}>
            <InfoRow icon="currency-inr" label="Amount Paid" value={`₹${(booking.totalPaid || 0).toFixed(2)}`} valueColor={COLORS.primary} />
            <InfoRow icon="credit-card-outline" label="Payment Status" value={paymentCfg.label} valueColor={paymentCfg.color} />
            {booking.paymentMode && <InfoRow icon="cash-multiple" label="Payment Mode" value={booking.paymentMode} />}
            {booking.payment?.couponCode && <InfoRow icon="ticket-percent-outline" label="Coupon Used" value={booking.payment.couponCode} valueColor="#7C3AED" />}
            {booking.payment?.couponDiscount > 0 && <InfoRow icon="tag-outline" label="Coupon Discount" value={`-₹${booking.payment.couponDiscount.toFixed(2)}`} valueColor="#059669" />}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Collection</Text>
          <View style={styles.card}>
            <InfoRow icon="home-map-marker" label="Mode" value={booking.collectionMode || '-'} />
            {booking.branch?.name && <InfoRow icon="hospital-building" label="Branch" value={booking.branch.name} />}
            {booking.assignedPartner?.user?.name && (
              <InfoRow icon="account-tie-outline" label="Phlebotomist" value={booking.assignedPartner.user.name} />
            )}
            {booking.sampleCollectedAt && (
              <InfoRow icon="clock-check-outline" label="Sample Collected" value={new Date(booking.sampleCollectedAt).toLocaleString('en-IN')} />
            )}
            {booking.deliveredToLabAt && (
              <InfoRow icon="truck-check-outline" label="Delivered to Lab" value={new Date(booking.deliveredToLabAt).toLocaleString('en-IN')} />
            )}
          </View>
        </View>

        {booking.report && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Report</Text>
            <View style={styles.card}>
              <InfoRow icon="file-chart-outline" label="Status" value={booking.report.status} valueColor={booking.report.status === 'RELEASED' ? '#059669' : '#D97706'} />
              {booking.report.reportedDate && (
                <InfoRow icon="calendar-check-outline" label="Reported On" value={new Date(booking.report.reportedDate).toLocaleDateString('en-IN')} />
              )}
              {booking.report.pdfUrl && (
                <TouchableOpacity
                  style={styles.downloadBtn}
                  onPress={() => Linking.openURL(booking.report.pdfUrl)}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="download-outline" size={18} color="#fff" />
                  <Text style={styles.downloadBtnText}>Download Report PDF</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {timeline.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Booking Timeline</Text>
            <View style={styles.card}>
              {timeline.map((entry: any, i: number) => {
                const cfg = STATUS_LABELS[entry.status] || { label: entry.status, color: '#64748B', bg: '#F1F5F9' };
                return (
                  <View key={i} style={[styles.timelineRow, i === timeline.length - 1 && { borderLeftColor: 'transparent' }]}>
                    <View style={[styles.timelineDot, { backgroundColor: cfg.color }]} />
                    <View style={styles.timelineContent}>
                      <Text style={[styles.timelineStatus, { color: cfg.color }]}>{cfg.label}</Text>
                      {entry.createdAt && (
                        <Text style={styles.timelineTime}>{new Date(entry.createdAt).toLocaleString('en-IN')}</Text>
                      )}
                      {entry.note && <Text style={styles.timelineNote}>{entry.note}</Text>}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  errorText: { fontSize: 15, color: '#94A3B8', fontWeight: '600' },
  retryBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: COLORS.primary, borderRadius: 12 },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#F8FAFC',
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  scroll: { padding: 16 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#94A3B8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.soft,
  },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  bookingCode: { fontSize: 18, fontWeight: '900', color: '#0F172A', letterSpacing: 0.5 },
  bookingDate: { fontSize: 13, color: '#64748B', marginTop: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  statusBadgeText: { fontSize: 11, fontWeight: '800' },
  emptyText: { fontSize: 13, color: '#94A3B8', textAlign: 'center', paddingVertical: 8 },
  downloadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 12, marginTop: 12,
  },
  downloadBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  timelineRow: {
    flexDirection: 'row', paddingLeft: 8, paddingBottom: 16,
    borderLeftWidth: 2, borderLeftColor: '#E2E8F0', marginLeft: 6,
  },
  timelineDot: {
    width: 12, height: 12, borderRadius: 6,
    position: 'absolute', left: -7, top: 2,
  },
  timelineContent: { marginLeft: 16, flex: 1 },
  timelineStatus: { fontSize: 13, fontWeight: '700' },
  timelineTime: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  timelineNote: { fontSize: 12, color: '#64748B', marginTop: 2 },
});