/* eslint-disable */
import React, { useState ,useEffect} from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Modal, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { getMessaging, onMessage } from '@react-native-firebase/messaging';

import { COLORS, TYPOGRAPHY, SHADOWS } from '../../src/theme/theme';
import * as Linking from 'expo-linking';
import * as Sharing from 'expo-sharing';
import { apiService } from '../../src/services/api';
import { RootState } from '../../src/store';

export default function ReportsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('all');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [successVisible, setSuccessVisible] = useState(false);
  const [successFilePath, setSuccessFilePath] = useState<string | null>(null);
  const [successFileName, setSuccessFileName] = useState('');

 const user = useSelector((state: RootState) => state.auth.user);
  const queryClient = useQueryClient();

useEffect(() => {
    const messaging = getMessaging();
    const unsub = onMessage(messaging, async (msg) => {
 const type = msg.data?.type;
      if (type === 'REPORT_READY' || type === 'REPORT_SENT' || type === 'REPORT_APPROVED' || type === 'PAYMENT_SUCCESS') {
        queryClient.invalidateQueries({ queryKey: ['my-reports'] });
      }
    });
    return unsub;
  }, []);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['my-reports'],
    queryFn: () => apiService.getMyReports(),
    enabled: !!user,
  });

  const reportsList = React.useMemo(() => {
    return reports.map((r: any) => {
      const testNames = r.testName ||
        r.booking?.tests?.map((t: any) => t.test?.name).filter(Boolean).join(', ') ||
        r.booking?.packages?.map((p: any) => p.package?.name).filter(Boolean).join(', ') ||
        'Diagnostic Test';

      const reportedOn = r.reportedDate
        ? new Date(r.reportedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : 'TBD';

      const scheduledDate = r.booking?.scheduledDate
        ? new Date(r.booking.scheduledDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : reportedOn;

      const flags = (r.parameters || []).filter((p: any) => p.isAbnormal).map((p: any) => p.parameterName);

      return {
        id: r.id,
        testName: testNames,
        date: scheduledDate,
        reportedOn,
        status: 'Ready',
        abnormal: r.hasAbnormalFlags || flags.length > 0,
        flags,
        booking: r.booking,
        report: r,
      };
    });
  }, [reports]);

  const handleDownload = async (item: any) => {
    const pdfUrl = item.report?.pdfUrl;
    if (!pdfUrl || downloadingId === item.id) return;
    setDownloadingId(item.id);
    try {
      const patientName = item.booking?.patientName?.replace(/\s+/g, '_') || 'Report';
      const bookingCode = item.booking?.bookingCode || item.id.slice(0, 8);
      const fileName = `MedsSeva_Report_${patientName}_${bookingCode}.pdf`;

      if (Platform.OS === 'android') {
        const downloadPath = `${ReactNativeBlobUtil.fs.dirs.DownloadDir}/${fileName}`;
        await ReactNativeBlobUtil.config({
          path: downloadPath,
          addAndroidDownloads: {
            useDownloadManager: true,
            notification: true,
            title: fileName,
            description: 'MedsSeva Report PDF',
            mime: 'application/pdf',
            path: downloadPath,
          },
        }).fetch('GET', pdfUrl);
        setSuccessFilePath(downloadPath);
        setSuccessFileName(fileName);
        setSuccessVisible(true);
      } else {
        const tempPath = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/${fileName}`;
        await ReactNativeBlobUtil.config({ path: tempPath }).fetch('GET', pdfUrl);
        await Sharing.shareAsync(`file://${tempPath}`, {
          mimeType: 'application/pdf',
          dialogTitle: `MedsSeva Report - ${item.testName}`,
          UTI: 'com.adobe.pdf',
        });
        setSuccessFilePath(null);
        setSuccessFileName(fileName);
        setSuccessVisible(true);
      }
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleViewFile = async () => {
    try {
      if (Platform.OS === 'android' && successFilePath) {
        await ReactNativeBlobUtil.android.actionViewIntent(successFilePath, 'application/pdf');
      }
    } catch (err) {
      console.error('Could not open file:', err);
    } finally {
      setSuccessVisible(false);
    }
  };

  const closeSuccess = () => {
    setSuccessVisible(false);
    setSuccessFilePath(null);
    setSuccessFileName('');
  };

  const renderReportCard = ({ item }: { item: any }) => {
    const isDownloading = downloadingId === item.id;
    return (
      <View style={styles.reportCard}>
        <View style={styles.cardHeader}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name={item.status === 'Processing' ? 'microscope' : 'file-document-outline'}
              size={24}
              color={COLORS.primary}
            />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.testName}>{item.testName}</Text>
            <Text style={styles.dateText}>{item.date}</Text>
          </View>
          <View style={[
            styles.statusBadge,
            item.status === 'Processing' ? styles.statusProcessing : styles.statusReady
          ]}>
            <Text style={[
              styles.statusText,
              item.status === 'Processing' ? styles.statusTextProcessing : styles.statusTextReady
            ]}>
              {item.status}
            </Text>
          </View>
        </View>

        {item.abnormal && (
          <View style={styles.abnormalContainer}>
            <MaterialCommunityIcons name="alert-circle" size={16} color={COLORS.danger} />
            <Text style={styles.abnormalText}>
              Attention: {item.flags.join(', ')}
            </Text>
          </View>
        )}

        {item.status === 'Ready' && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.actionButtonSecondary}
              onPress={() => {
                const invoiceUrl = item.booking?.payment?.invoiceUrl;
                if (invoiceUrl) {
                  Linking.openURL(invoiceUrl);
                } else if (item.booking?.id) {
                  Linking.openURL(`http://localhost:5000/api/payments/invoice/${item.booking.id}/pdf`);
                }
              }}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="receipt" size={20} color={COLORS.primary} />
              <Text style={styles.actionButtonTextSecondary}>Download Invoice</Text>
            </TouchableOpacity>

            {item.report?.pdfUrl ? (
              <TouchableOpacity
                style={[styles.actionButtonPrimary, isDownloading && { backgroundColor: COLORS.success }]}
                onPress={() => handleDownload(item)}
                disabled={isDownloading}
                activeOpacity={0.7}
              >
                {isDownloading ? (
                  <ActivityIndicator color={COLORS.textLight} size="small" />
                ) : (
                  <MaterialCommunityIcons name="download" size={20} color={COLORS.textLight} />
                )}
                <Text style={styles.actionButtonTextPrimary}>
                  {isDownloading ? 'Downloading...' : 'Download PDF'}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.actionButtonPrimary, { backgroundColor: '#94A3B8' }]}>
                <MaterialCommunityIcons name="clock-outline" size={20} color={COLORS.textLight} />
                <Text style={styles.actionButtonTextPrimary}>PDF Pending</Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Reports</Text>
      </View>

      <View style={styles.analyticsContainer}>
        <View style={styles.analyticBox}>
          <Text style={styles.analyticNumber}>{reportsList.length}</Text>
          <Text style={styles.analyticLabel}>Total Tests</Text>
        </View>
        <View style={styles.analyticDivider} />
        <View style={styles.analyticBox}>
          <Text style={[styles.analyticNumber, { color: COLORS.danger }]}>{reportsList.filter((r: any) => r.abnormal).length}</Text>
          <Text style={styles.analyticLabel}>Requires Attention</Text>
        </View>
      </View>

{isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Fetching your reports...</Text>
        </View>
      ) : (
        <FlatList
          data={reportsList.filter((r: any) =>
            activeTab === 'all' ? true :
            activeTab === 'abnormal' ? r.abnormal :
            r.status.toLowerCase() === activeTab
          )}
          keyExtractor={item => item.id}
          renderItem={renderReportCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="file-document-remove-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyText}>No reports matching this status</Text>
            </View>
          }
        />
      )}
      <Modal
        visible={successVisible}
        transparent
        animationType="fade"
        onRequestClose={closeSuccess}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <TouchableOpacity onPress={closeSuccess} style={styles.modalClose}>
              <MaterialCommunityIcons name="close" size={18} color="#6B7280" />
            </TouchableOpacity>
            <View style={styles.modalIconWrap}>
              <MaterialCommunityIcons name="check-circle-outline" size={40} color={COLORS.success} />
            </View>
            <Text style={styles.modalTitle}>Download Complete</Text>
            <Text style={styles.modalSubtitle}>
              {Platform.OS === 'android'
                ? 'Your report has been saved to the Downloads folder.'
                : 'Your report is ready to view in the Files app.'}
            </Text>
            {successFileName ? (
              <Text style={styles.modalFileName} numberOfLines={1}>{successFileName}</Text>
            ) : null}
            <View style={styles.modalActions}>
              {Platform.OS === 'android' && successFilePath ? (
                <TouchableOpacity style={styles.modalBtnPrimary} onPress={handleViewFile} activeOpacity={0.8}>
                  <Text style={styles.modalBtnPrimaryText}>View File</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity style={styles.modalBtnSecondary} onPress={closeSuccess} activeOpacity={0.8}>
                <Text style={styles.modalBtnSecondaryText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingTop: 60, paddingBottom: 40, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.primary },
  headerTitle: { ...TYPOGRAPHY.h1, color: COLORS.textLight },
  analyticsContainer: { flexDirection: 'row', backgroundColor: COLORS.surface, marginHorizontal: 16, marginTop: -20, borderRadius: 22, padding: 20, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.soft, marginBottom: 24 },
  analyticBox: { flex: 1, alignItems: 'center' },
  analyticNumber: { ...TYPOGRAPHY.h2, color: COLORS.primary, marginBottom: 4 },
  analyticLabel: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, textAlign: 'center' },
  analyticDivider: { width: 1, backgroundColor: COLORS.border, marginHorizontal: 10 },
  tabsContainer: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 16 },
  tab: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, marginRight: 10, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  activeTab: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabText: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, fontWeight: 'bold' },
  activeTabText: { color: '#FFFFFF' },
  listContent: { paddingHorizontal: 16, paddingBottom: 40 },
  reportCard: { backgroundColor: COLORS.surface, borderRadius: 22, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.soft },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  iconContainer: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#E0F2FE', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  headerTextContainer: { flex: 1 },
  testName: { ...TYPOGRAPHY.subtitle, color: COLORS.textDark, fontWeight: 'bold', marginBottom: 4 },
  dateText: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusReady: { backgroundColor: COLORS.successLight },
  statusProcessing: { backgroundColor: COLORS.warningLight },
  statusText: { ...TYPOGRAPHY.caption, fontWeight: 'bold', fontSize: 10 },
  statusTextReady: { color: COLORS.success },
  statusTextProcessing: { color: '#D97706' },
  abnormalContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.dangerLight, padding: 12, borderRadius: 12, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: COLORS.danger },
  abnormalText: { ...TYPOGRAPHY.caption, color: COLORS.danger, marginLeft: 8, fontWeight: '600' },
  actionRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 16 },
  actionButtonSecondary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 30, backgroundColor: '#F1F5F9', marginRight: 10 },
  actionButtonPrimary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 30, backgroundColor: COLORS.primary },
  actionButtonTextSecondary: { ...TYPOGRAPHY.caption, color: COLORS.primary, fontWeight: 'bold', marginLeft: 8 },
  actionButtonTextPrimary: { ...TYPOGRAPHY.caption, color: COLORS.textLight, fontWeight: 'bold', marginLeft: 8 },
 loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  loadingText: { ...TYPOGRAPHY.body, color: COLORS.textSecondary, marginTop: 16 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { ...TYPOGRAPHY.body, color: COLORS.textSecondary, marginTop: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  modalCard: { width: '100%', backgroundColor: '#FFF', borderRadius: 24, padding: 24, alignItems: 'center' },
  modalClose: { alignSelf: 'flex-end', padding: 4, marginBottom: 8 },
  modalIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.successLight, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 8, textAlign: 'center' },
  modalSubtitle: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 8 },
  modalFileName: { fontSize: 11, color: '#94A3B8', marginBottom: 20, textAlign: 'center' },
  modalActions: { width: '100%', gap: 10 },
  modalBtnPrimary: { backgroundColor: COLORS.primary, borderRadius: 30, paddingVertical: 14, alignItems: 'center' },
  modalBtnPrimaryText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  modalBtnSecondary: { backgroundColor: '#F1F5F9', borderRadius: 30, paddingVertical: 14, alignItems: 'center' },
  modalBtnSecondaryText: { color: COLORS.textDark, fontWeight: 'bold', fontSize: 15 },
});