import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Modal, Platform } from 'react-native';
import ScreenWrapper from '../../src/components/ScreenWrapper';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { COLORS, TYPOGRAPHY, SHADOWS } from '../../src/theme/theme';
import * as Linking from 'expo-linking';
import * as Sharing from 'expo-sharing';
import { apiService } from '../../src/services/api';
import QRCode from 'react-native-qrcode-svg';

export default function ReportDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
const [downloading, setDownloading] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [successFilePath, setSuccessFilePath] = useState<string | null>(null);
  const [successFileName, setSuccessFileName] = useState('');

const { data: report, isLoading } = useQuery({
    queryKey: ['report', id],
    queryFn: async () => {
      const found = await apiService.getReportById(id as string);
      if (!found) throw new Error('Report not found');

      const slotDate = new Date(found.reportedDate || found.createdAt).toLocaleDateString('en-IN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      });
      const timeStr = new Date(found.reportedDate || found.createdAt).toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit'
      });

      const age = found.booking?.patientAge ? `${found.booking.patientAge}` : '-';
      const gender = found.booking?.patientGender || '-';

      let refDoc = found.booking?.referringDoctor?.name
        ? `Dr. ${found.booking.referringDoctor.name}${
            found.booking.referringDoctor.qualification || found.booking.referringDoctor.designation 
              ? ` - ${[found.booking.referringDoctor.qualification, found.booking.referringDoctor.designation].filter(Boolean).join(', ')}`
              : ''
          }`
        : null;
      if (!refDoc && found.booking?.partnerNote?.startsWith('Ref:')) {
        refDoc = found.booking.partnerNote;
      }
      if (!refDoc) {
        refDoc = found.doctorName || 'Self';
      }

      return {
        id: found.id,
        testName: found.testName || 'Diagnostic Test',
        patientName: found.booking?.patientName || 'Patient',
        ageSex: `${age} / ${gender}`,
        referredBy: refDoc,
        regNo: found.booking?.bookingCode || found.id.substring(0, 8).toUpperCase(),
        mobile: found.booking?.user?.mobile || found.booking?.patientMobile || '',
        address: found.booking?.address ? `${found.booking.address.line1 || ''}, ${found.booking.address.city || ''}`.replace(/^,\s*/, '').replace(/,\s*$/, '') : '',
        registeredOn: `${slotDate} ${timeStr}`,
        collectedOn: slotDate,
        reportedOn: `${slotDate} ${timeStr}`,
        clinicalNotes: found.clinicalNotes || 'Parameter values within reference intervals. Clinical correlation advised.',
        verifiedBy: found.verifiedBy?.name || null,
        branch: found.booking?.branch?.name || null,
        pdfUrl: found.pdfUrl || null,
        sections: [
          {
            category: found.testName || 'General',
            parameters: (found.parameters || []).map((p: any) => ({
              name: p.parameterName,
              value: p.observedValue,
              unit: p.unit || '',
              referenceRange: p.referenceRange || '',
              flag: p.isAbnormal ? '*' : undefined,
            })),
          },
        ],
      };
    },
    enabled: !!id,
  });
if (isLoading) {
    return (
      <ScreenWrapper scrollable={false}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#006D6F" />
        </View>
      </ScreenWrapper>
    );
  }

  if (!report) {
    return (
      <ScreenWrapper scrollable={false}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text style={{ color: '#64748B', textAlign: 'center' }}>Report not found or not yet released.</Text>
        </View>
      </ScreenWrapper>
    );
  }

const handleDownload = async () => {
    if (!report?.pdfUrl || downloading) return;
    setDownloading(true);
    try {
      const fileName = `MedsSeva_Report_${report.patientName.replace(/\s+/g, '_')}_${report.regNo}.pdf`;
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
        }).fetch('GET', report.pdfUrl);
        setSuccessFilePath(downloadPath);
        setSuccessFileName(fileName);
        setSuccessVisible(true);
      } else {
        const tempPath = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/${fileName}`;
        await ReactNativeBlobUtil.config({ path: tempPath }).fetch('GET', report.pdfUrl);
        await Sharing.shareAsync(`file://${tempPath}`, {
          mimeType: 'application/pdf',
          dialogTitle: `MedsSeva Report - ${report.testName}`,
          UTI: 'com.adobe.pdf',
        });
        setSuccessFilePath(null);
        setSuccessFileName(fileName);
        setSuccessVisible(true);
      }
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloading(false);
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

return (
    <View style={{ flex: 1 }}>
    <ScreenWrapper
      backgroundColor="#F8FAFC"
      bottomButton={
        report?.pdfUrl ? (
          <TouchableOpacity
            style={[styles.downloadFAB, downloading && { backgroundColor: COLORS.secondary }]}
            onPress={handleDownload}
            disabled={downloading}
            activeOpacity={0.8}
          >
            {downloading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <MaterialCommunityIcons name="file-download-outline" size={24} color="#FFF" />
            )}
            <Text style={styles.fabText}>{downloading ? 'Downloading...' : 'Download Report PDF'}</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.downloadFAB, { backgroundColor: '#94A3B8' }]}>
            <MaterialCommunityIcons name="clock-outline" size={24} color="#FFF" />
            <Text style={styles.fabText}>PDF not yet available</Text>
          </View>
        )
      }
    >
      <Stack.Screen
        options={{
          title: report.testName,
          headerShown: true,
          headerStyle: { backgroundColor: COLORS.primary },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: 'bold' },
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerBackBtn}>
              <MaterialCommunityIcons name="chevron-left" size={28} color="#FFF" />
            </TouchableOpacity>
          ),
        }}
      />

  <View style={styles.container}>
        <View style={styles.letterhead}>
          <View style={styles.brandRow}>
            <View style={styles.logoBox}>
              <Text style={styles.logoText}>+</Text>
            </View>
            <View style={styles.brandTextContainer}>
              <Text style={styles.brandTitle}>MedsSeva Diagnostics</Text>
              <Text style={styles.brandTagline}>Quality Diagnostics & Precision Care</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialCommunityIcons name="phone" size={12} color="#E0F2FE" style={{ marginRight: 4 }} />
            <Text style={styles.contactText}>+91 98765 43210</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialCommunityIcons name="email" size={12} color="#E0F2FE" style={{ marginRight: 4 }} />
            <Text style={styles.contactText}>reports@medsseva.com</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialCommunityIcons name="web" size={12} color="#E0F2FE" style={{ marginRight: 4 }} />
            <Text style={styles.contactText}>www.medsseva.com</Text>
          </View>
        </View>

        <View style={styles.metaContainer}>
          <View style={styles.patientColumn}>
            <Text style={styles.patientName}>{report.patientName}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Age / Sex</Text>
              <Text style={styles.metaValue}>: {report.ageSex}</Text>
            </View>
            {report.mobile ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Mobile</Text>
                <Text style={styles.metaValue}>: {report.mobile}</Text>
              </View>
            ) : null}
            {report.address ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Address</Text>
                <Text style={styles.metaValue} numberOfLines={2}>: {report.address}</Text>
              </View>
            ) : null}
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Referred by</Text>
              <Text style={styles.metaValue}>: {report.referredBy}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Reg. no.</Text>
              <Text style={styles.metaValue}>: {report.regNo}</Text>
            </View>
          </View>

          <View style={styles.barcodeColumn}>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', width: '100%', marginBottom: 12 }}>
              <View style={{ alignItems: 'flex-end', marginRight: 16 }}>
                <Text style={styles.barcodeVisual}>||||| || || |||| |||</Text>
                <Text style={{ fontSize: 8, color: '#64748B', marginTop: 2 }}>{report.regNo}</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <QRCode value="https://play.google.com/store/apps/details?id=com.medssevaglobal.app" size={45} />
                <Text style={{ fontSize: 7, color: '#64748B', marginTop: 4 }}>Scan to verify</Text>
              </View>
            </View>

            <View style={styles.metaRowRight}>
              <Text style={styles.metaLabelRight}>Registered on</Text>
              <Text style={styles.metaValueRight}>: {report.registeredOn}</Text>
            </View>
            <View style={styles.metaRowRight}>
              <Text style={styles.metaLabelRight}>Collected on</Text>
              <Text style={styles.metaValueRight}>: {report.collectedOn}</Text>
            </View>
            <View style={styles.metaRowRight}>
              <Text style={styles.metaLabelRight}>Reported on</Text>
              <Text style={styles.metaValueRight}>: {report.reportedOn}</Text>
            </View>
          </View>
        </View>

        <View style={styles.resultsSection}>
          {report.sections.map((section: any, sIdx: number) => (
            <View key={sIdx} style={styles.tableCard}>
              <View style={styles.tableHeaderBar}>
                <Text style={styles.tableHeaderTitle}>{section.category}</Text>
              </View>
              <View style={styles.tableColumnHeader}>
                <Text style={[styles.colHeadText, { flex: 4, textAlign: 'left' }]}>TEST</Text>
                <Text style={[styles.colHeadText, { flex: 2.5, textAlign: 'center' }]}>VALUE</Text>
                <Text style={[styles.colHeadText, { flex: 2, textAlign: 'center' }]}>UNIT</Text>
                <Text style={[styles.colHeadText, { flex: 3.5, textAlign: 'right' }]}>REFERENCE</Text>
              </View>
              {section.parameters.map((param: any, pIdx: number) => {
                const isFlagged = !!param.flag;
                return (
                  <View
                    key={pIdx}
                    style={[
                      styles.tableRow,
                      pIdx === section.parameters.length - 1 && { borderBottomWidth: 0 },
                      isFlagged && styles.flaggedRowBackground,
                    ]}
                  >
                    <Text style={[styles.paramName, { flex: 4 }]}>{param.name}</Text>
                    <View style={{ flex: 2.5, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
                      {isFlagged && <Text style={styles.flagIndicator}>{param.flag}</Text>}
                      <Text style={[styles.paramValue, isFlagged && styles.flaggedText]}>{param.value}</Text>
                    </View>
                    <Text style={[styles.paramUnit, { flex: 2 }]}>{param.unit}</Text>
                    <Text style={[styles.paramRef, { flex: 3.5 }]}>{param.referenceRange}</Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        <View style={styles.notesSection}>
          <View style={styles.notesCard}>
            <View style={styles.notesHeader}>
              <MaterialCommunityIcons name="notebook-outline" size={18} color={COLORS.textDark} />
              <Text style={styles.notesTitle}>Clinical Notes</Text>
            </View>
            <Text style={styles.notesBody}>{report.clinicalNotes}</Text>
          </View>
        </View>

        {report.verifiedBy && (
          <View style={styles.signaturesRow}>
            <View style={styles.sigBlock}>
              <View style={styles.sigLine} />
              <Text style={styles.sigName}>{report.verifiedBy}</Text>
              <Text style={styles.sigRole}>Verified By</Text>
            </View>
          </View>
        )}
<View style={styles.finePrint}>
          <Text style={styles.finePrintText}>NOT VALID FOR MEDICO LEGAL PURPOSE</Text>
          <Text style={styles.finePrintSub}>Diagnostic Verification Facility</Text>
        </View>
      </View>
    </ScreenWrapper>

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

  headerBackBtn: { marginLeft: -10, padding: 8 },
container: { flex: 1 },
  letterhead: { backgroundColor: COLORS.primary, padding: 20, paddingTop: 24, borderBottomRightRadius: 24, borderBottomLeftRadius: 24, ...SHADOWS.soft },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  logoBox: { width: 40, height: 40, borderRadius: 8, borderWidth: 2, borderColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  logoText: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  brandTextContainer: { flex: 1 },
  brandTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', letterSpacing: 0.5 },
  brandTagline: { color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 1 },
  contactBlock: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', paddingTop: 12 },
  contactText: { color: '#E0F2FE', fontSize: 10, marginRight: 10, fontWeight: '500' },
  metaContainer: { flexDirection: 'row', backgroundColor: '#FFF', marginHorizontal: 16, marginTop: 16, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.soft },
  patientColumn: { flex: 1.2 },
  barcodeColumn: { flex: 1, alignItems: 'flex-end' },
  patientName: { fontSize: 15, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 8 },
  metaRow: { flexDirection: 'row', marginBottom: 4 },
  metaLabel: { fontSize: 11, color: '#64748B', width: 70 },
  metaValue: { flex: 1, fontSize: 11, color: COLORS.textDark, fontWeight: '600' },
  barcodeVisual: { fontSize: 14, fontWeight: '600', letterSpacing: 1, color: COLORS.textSecondary, marginBottom: 6 },
  metaRowRight: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 4 },
  metaLabelRight: { fontSize: 10, color: '#64748B', width: 65, textAlign: 'right' },
  metaValueRight: { fontSize: 10, color: COLORS.textDark, fontWeight: '600', width: 80, textAlign: 'left', paddingLeft: 4 },
  resultsSection: { paddingHorizontal: 16, marginTop: 20 },
  tableCard: { backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden', ...SHADOWS.soft, marginBottom: 20 },
  tableHeaderBar: { backgroundColor: '#F1F5F9', borderBottomWidth: 2, borderBottomColor: COLORS.primary, padding: 12, alignItems: 'center' },
  tableHeaderTitle: { fontSize: 12, fontWeight: 'bold', letterSpacing: 1, color: COLORS.primary },
  tableColumnHeader: { flexDirection: 'row', backgroundColor: '#FFF', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#CBD5E1' },
  colHeadText: { fontSize: 10, fontWeight: 'bold', color: '#64748B' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  flaggedRowBackground: { backgroundColor: 'rgba(239, 68, 68, 0.03)' },
  paramName: { fontSize: 11, fontWeight: '600', color: '#334155' },
  paramValue: { fontSize: 12, fontWeight: '700', color: '#0F172A', textAlign: 'center' },
  flaggedText: { color: '#DC2626', fontWeight: '800' },
  flagIndicator: { fontSize: 11, fontWeight: '900', color: '#DC2626', marginRight: 4 },
  paramUnit: { fontSize: 11, color: '#64748B', textAlign: 'center' },
  paramRef: { fontSize: 11, color: '#64748B', textAlign: 'right', fontWeight: '500' },
  notesSection: { paddingHorizontal: 16 },
  notesCard: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderStyle: 'dashed', borderRadius: 12, padding: 16 },
  notesHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  notesTitle: { fontSize: 12, fontWeight: '800', color: COLORS.textDark, marginLeft: 6 },
  notesBody: { fontSize: 11, color: '#475569', lineHeight: 16, fontStyle: 'italic' },
  signaturesRow: { flexDirection: 'row', justifyContent: 'center', paddingHorizontal: 24, marginTop: 32 },
  sigBlock: { alignItems: 'center', width: '50%' },
  sigLine: { width: '100%', height: 1, backgroundColor: '#94A3B8', marginBottom: 6 },
  sigName: { fontSize: 11, fontWeight: '700', color: '#1E293B' },
  sigRole: { fontSize: 9, color: '#64748B', marginTop: 1 },
  finePrint: { alignItems: 'center', marginTop: 40, paddingBottom: 20 },
  finePrintText: { fontSize: 9, fontWeight: 'bold', color: '#94A3B8', letterSpacing: 0.5 },
  finePrintSub: { fontSize: 8, color: '#CBD5E1', marginTop: 2 },
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
downloadFAB: { backgroundColor: COLORS.primary, borderRadius: 30, height: 56, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', ...SHADOWS.glow },
  fabText: { color: '#FFF', fontSize: 15, fontWeight: 'bold', marginLeft: 10 },
});