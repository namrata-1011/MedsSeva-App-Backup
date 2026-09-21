import React, { useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Linking, Alert, Platform,
} from 'react-native';
import ScreenWrapper from '../../src/components/ScreenWrapper';
import RNBlobUtil from 'react-native-blob-util';
import * as Sharing from 'expo-sharing';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SHADOWS } from '../../src/theme/theme';
import { apiService } from '../../src/services/api';
import api from '../../src/services/api';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  WAITING_FOR_ASSIGNMENT: 'Waiting for Assignment',
  WAITING_FOR_PARTNER: 'Waiting for Partner',
  ASSIGNED: 'Assigned',
  ACCEPTED: 'Accepted',
  ON_THE_WAY: 'Partner On the Way',
  REACHED_LOCATION: 'Partner Reached',
  SAMPLE_COLLECTED: 'Sample Collected',
  SELECTING_DELIVERY_BRANCH: 'Selecting Branch',
  DELIVERING_TO_BRANCH: 'Delivering to Lab',
  DELIVERED_TO_LAB: 'Delivered to Lab',
  PROCESSING: 'Processing',
  REPORT_READY: 'Report Ready',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  REJECTED: 'Rejected',
  PATIENT_REACHED_LAB: 'Patient at Lab',
};

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: '#16a34a',
  CANCELLED: '#dc2626',
  REJECTED: '#dc2626',
  CONFIRMED: '#2563eb',
  PROCESSING: '#7c3aed',
  REPORT_READY: '#0891b2',
  SAMPLE_COLLECTED: '#0d9488',
};

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

const { data: booking, isLoading, error } = useQuery({
    queryKey: ['bookingDetail', id],
    queryFn: () => apiService.getBookingDetails(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

const handleOpenPdf = useCallback(async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open PDF on this device.');
      }
    } catch {
      Alert.alert('Error', 'Failed to open PDF.');
    }
  }, []);

  const handleDownloadPdf = useCallback(async (url: string, invoiceNumber?: string) => {
    try {
      const fileName = invoiceNumber
        ? `MedSeva-Invoice-${invoiceNumber}.pdf`
        : `MedSeva-Invoice-${Date.now()}.pdf`;
      
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
        }).fetch('GET', url);
        
        Alert.alert('Success', 'Invoice downloaded to your Notifications and Downloads folder.');
        setTimeout(() => {
          RNBlobUtil.android.actionViewIntent(downloadPath, 'application/pdf').catch(() => {});
        }, 1000);
      } else {
        const tempPath = `${RNBlobUtil.fs.dirs.CacheDir}/${fileName}`;
        const res = await RNBlobUtil.config({ path: tempPath, fileCache: true }).fetch('GET', url);
        await RNBlobUtil.ios.previewDocument(res.path());
      }
    } catch {
      Alert.alert('Error', 'Failed to download and open invoice.');
    }
  }, []);

if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Booking Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingBody}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading booking details...</Text>
        </View>
      </View>
    );
  }

  if (error || !booking) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Booking Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingBody}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color={COLORS.danger} />
          <Text style={styles.errorText}>Failed to load booking details.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()}>
            <Text style={styles.retryBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const statusColor = STATUS_COLORS[booking.status] || COLORS.primary;
  const statusLabel = STATUS_LABELS[booking.status] || booking.status;

  const testNames = (booking.tests || []).map((t: any) => t.test?.name).filter(Boolean).join(', ');
  const packageNames = (booking.packages || []).map((p: any) => p.package?.name).filter(Boolean).join(', ');

  const scheduledDate = booking.scheduledDate
    ? new Date(booking.scheduledDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : null;

  const createdDate = booking.createdAt
    ? new Date(booking.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null;

  const paymentMethod = booking.paymentMode || booking.payment?.method || null;
  
  let invoiceUrl = booking.payment?.invoiceUrl || null;
  if (!invoiceUrl && booking.id) {
    const baseUrl = api.defaults.baseURL || 'http://localhost:5000/api';
    invoiceUrl = `${baseUrl}/payments/invoice/${booking.id}/pdf`;
  }
  const hasInvoice = !!invoiceUrl;

  const pricingSnapshot = booking.pricingSnapshot;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking Details</Text>
        <View style={{ width: 40 }} />
      </View>

    <ScreenWrapper contentContainerStyle={styles.scrollContent}>
        <View style={styles.topCard}>
          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
            <Text style={styles.bookingCode}>#{booking.bookingCode}</Text>
          </View>

          <Text style={styles.testNameLarge}>{testNames || packageNames || 'Diagnostic Test'}</Text>

          <View style={styles.topMeta}>
            <View style={styles.topMetaItem}>
              <MaterialCommunityIcons name="calendar-month-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.topMetaText}>{scheduledDate || 'TBD'}</Text>
            </View>
            <View style={styles.topMetaItem}>
              <MaterialCommunityIcons name="clock-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.topMetaText}>{booking.scheduledSlot || 'Morning Slot'}</Text>
            </View>
          </View>

          <View style={[styles.modeBadge, booking.collectionMode === 'HOME' ? styles.modeBadgeHome : styles.modeBadgeLab]}>
            <MaterialCommunityIcons
              name={booking.collectionMode === 'HOME' ? 'home-plus-outline' : 'office-building-outline'}
              size={14}
              color={booking.collectionMode === 'HOME' ? COLORS.success : '#7c3aed'}
            />
            <Text style={[styles.modeBadgeText, { color: booking.collectionMode === 'HOME' ? COLORS.success : '#7c3aed' }]}>
              {booking.collectionMode === 'HOME' ? 'Home Collection' : 'Lab Visit'}
            </Text>
          </View>
        </View>

        <Section title="Patient Information">
          <InfoRow label="Name" value={booking.patientName} />
          <InfoRow label="Age" value={booking.patientAge ? `${booking.patientAge} years` : null} />
          <InfoRow label="Gender" value={booking.patientGender} />
          <InfoRow label="Mobile" value={booking.patientMobile} />
        </Section>

        <Section title="Test / Package">
          {testNames ? <InfoRow label="Tests" value={testNames} /> : null}
          {packageNames ? <InfoRow label="Packages" value={packageNames} /> : null}
        </Section>

        <Section title="Booking Information">
          <InfoRow label="Booking ID" value={booking.bookingCode} />
          <InfoRow label="Booking Date" value={scheduledDate} />
          <InfoRow label="Time Slot" value={booking.scheduledSlot} />
          <InfoRow label="Collection Mode" value={booking.collectionMode === 'HOME' ? 'Home Collection' : 'Lab Visit'} />
          {booking.branch && <InfoRow label="Branch" value={booking.branch.name} />}
          {booking.branch && <InfoRow label="Lab Address" value={`${booking.branch.line1}, ${booking.branch.city} - ${booking.branch.pincode}`} />}
          {booking.assignedPartner?.user?.name && (
            <InfoRow label="Partner" value={booking.assignedPartner.user.name} />
          )}
          <InfoRow label="Created At" value={createdDate} />
        </Section>

        <Section title="Payment Details">
          <InfoRow label="Payment Method" value={paymentMethod} />
          <InfoRow
            label="Payment Status"
            value={booking.paymentStatus === 'SUCCESS' ? 'Paid' : booking.paymentStatus}
          />
          {pricingSnapshot && (
            <>
              <InfoRow label="Subtotal" value={`₹${pricingSnapshot.subtotal}`} />
              {pricingSnapshot.testDiscount > 0 && (
                <InfoRow label="Discount" value={`- ₹${pricingSnapshot.testDiscount}`} />
              )}
              {pricingSnapshot.couponCode && pricingSnapshot.couponDiscount > 0 && (
                <InfoRow label={`Coupon (${pricingSnapshot.couponCode})`} value={`- ₹${pricingSnapshot.couponDiscount}`} />
              )}
              {pricingSnapshot.collectionCharge > 0 && (
                <InfoRow label="Collection Charge" value={`₹${pricingSnapshot.collectionCharge}`} />
              )}
            </>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Paid</Text>
            <Text style={styles.totalValue}>₹{booking.totalPaid}</Text>
          </View>
        </Section>

        {hasInvoice && (
          <Section title="Invoice">
            <View style={styles.invoiceReady}>
              <MaterialCommunityIcons name="file-check-outline" size={22} color={COLORS.success} />
              <Text style={styles.invoiceReadyText}>Invoice Ready</Text>
            </View>
            <View style={styles.invoiceBtnRow}>
              <TouchableOpacity
                style={[styles.invoiceBtn, styles.invoiceBtnPrimary, { flex: 1 }]}
                onPress={() => handleDownloadPdf(invoiceUrl, booking.payment?.invoiceNumber || booking.bookingCode)}
              >
                <MaterialCommunityIcons name="download-outline" size={18} color="#fff" />
                <Text style={styles.invoiceBtnText}>Download Invoice</Text>
              </TouchableOpacity>
            </View>
            {booking.payment?.invoiceNumber && (
              <Text style={styles.invoiceNumber}>Invoice No: {booking.payment.invoiceNumber}</Text>
            )}
          </Section>
        )}

     <View style={{ height: 40 }} />
      </ScreenWrapper>
    </View>
  );
}

const styles = StyleSheet.create({
container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, backgroundColor: COLORS.background },
  loadingHeader: {
    backgroundColor: COLORS.primary,
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  loadingBody: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: COLORS.background,
  },
  loadingText: { marginTop: 12, color: COLORS.textSecondary, fontSize: 14 },
  errorText: { marginTop: 12, color: COLORS.danger, fontSize: 14, textAlign: 'center' },
  retryBtn: { marginTop: 16, backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 30 },
  retryBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: { padding: 8 },
  headerTitle: { ...TYPOGRAPHY.h2, color: '#fff' },
  scrollContent: { padding: 16 },
  topCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.soft,
  },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  bookingCode: { fontSize: 12, fontWeight: 'bold', color: COLORS.textSecondary },
  testNameLarge: { fontSize: 18, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 12 },
  topMeta: { flexDirection: 'row', gap: 20, marginBottom: 12 },
  topMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  topMetaText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  modeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
  },
  modeBadgeHome: { backgroundColor: '#f0fdf4' },
  modeBadgeLab: { backgroundColor: '#f5f3ff' },
  modeBadgeText: { fontSize: 12, fontWeight: '700' },
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: COLORS.primary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionBody: {},
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  infoLabel: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },
  infoValue: { fontSize: 13, color: COLORS.textDark, fontWeight: '600', flex: 1.5, textAlign: 'right' },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 12, marginTop: 4,
  },
  totalLabel: { fontSize: 15, fontWeight: 'bold', color: COLORS.textDark },
  totalValue: { fontSize: 18, fontWeight: 'bold', color: COLORS.primary },
  invoiceReady: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  invoiceReadyText: { fontSize: 15, fontWeight: 'bold', color: COLORS.success },
  invoiceBtnRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  invoiceBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: 12,
  },
  invoiceBtnPrimary: { backgroundColor: COLORS.primary },
  invoiceBtnSecondary: { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: COLORS.primary },
  invoiceBtnText: { fontSize: 13, fontWeight: 'bold', color: '#fff' },
  invoiceNumber: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center', marginTop: 4 },
});