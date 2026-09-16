import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, StatusBar, Platform, Modal, ScrollView
} from 'react-native';
import ScreenWrapper from '../../src/components/ScreenWrapper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../../src/theme/theme';
import { showError, showSuccess, showInfo } from '../../src/store/toastStore';
import { apiService } from '../../src/services/api';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

type GovtDocType = 'AADHAAR' | 'PAN_CARD' | 'DRIVING_LICENSE' | 'SIGNATURE_DOC';

export default function DoctorRegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [qualification, setQualification] = useState('');
  const [registrationNo, setRegistrationNo] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [designation, setDesignation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  type DocEntry = { documentType: GovtDocType; fileName: string; fileUrl: string; mimeType?: string; fileSize?: number; };
  const [aadhaarDoc, setAadhaarDoc] = useState<DocEntry | null>(null);
  const [panDoc, setPanDoc] = useState<DocEntry | null>(null);
  const [dlDoc, setDlDoc] = useState<DocEntry | null>(null);
  const [signatureDoc, setSignatureDoc] = useState<DocEntry | null>(null);

  const [targetDocType, setTargetDocType] = useState<GovtDocType>('AADHAAR');
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [showPickerModal, setShowPickerModal] = useState(false);

  const handlePickDocument = async (source: 'camera' | 'gallery' | 'document') => {
    setShowPickerModal(false);
    setIsUploadingDoc(true);
    setServerError(null);

    try {
      let fileUri = '';
      let fileName = '';
      let mimeType = 'image/jpeg';
      let fileSize = 0;

      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          showError('Camera permission is required.');
          setIsUploadingDoc(false);
          return;
        }
        const res = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: false });
        if (res.canceled || !res.assets?.length) { setIsUploadingDoc(false); return; }
        const a = res.assets[0];
        fileUri = a.uri; fileName = a.fileName || `${targetDocType}_doc.jpg`; mimeType = a.mimeType || 'image/jpeg'; fileSize = a.fileSize || 0;
      } else if (source === 'gallery') {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          showError('Photo gallery permission is required.');
          setIsUploadingDoc(false);
          return;
        }
        const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, allowsEditing: false });
        if (res.canceled || !res.assets?.length) { setIsUploadingDoc(false); return; }
        const a = res.assets[0];
        fileUri = a.uri; fileName = a.fileName || `${targetDocType}_doc.jpg`; mimeType = a.mimeType || 'image/jpeg'; fileSize = a.fileSize || 0;
      } else if (source === 'document') {
        const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/jpeg', 'image/png'], copyToCacheDirectory: true });
        if (res.canceled || !res.assets?.length) { setIsUploadingDoc(false); return; }
        const a = res.assets[0];
        fileUri = a.uri; fileName = a.name || `${targetDocType}_doc.pdf`; mimeType = a.mimeType || 'application/pdf'; fileSize = a.size || 0;
      }

      let fileUrl = fileUri;
      try {
        const uploadRes = await apiService.uploadPartnerOnboardingDocument(fileUri, mimeType, fileName, targetDocType);
        if (uploadRes?.document?.fileUrl) {
          fileUrl = uploadRes.document.fileUrl;
        }
      } catch (uploadErr) {
        console.warn('Document server upload fallback to local URI:', uploadErr);
      }

      const docEntry: DocEntry = { documentType: targetDocType, fileName, fileUrl, mimeType, fileSize };

      if (targetDocType === 'AADHAAR') {
        setAadhaarDoc(docEntry);
        showSuccess('Aadhaar Card attached!');
      } else if (targetDocType === 'PAN_CARD') {
        setPanDoc(docEntry);
        showSuccess('PAN Card attached!');
      } else if (targetDocType === 'DRIVING_LICENSE') {
        setDlDoc(docEntry);
        showSuccess('Driving License attached!');
      } else if (targetDocType === 'SIGNATURE_DOC') {
        setSignatureDoc(docEntry);
        showSuccess('Signature attached!');
      }
    } catch (err: any) {
      console.error('Document selection error:', err);
      setServerError('Failed to attach document. Please try again.');
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleRegister = async () => {
    setServerError(null);
    if (!name.trim()) { setServerError('Please enter Full Name (Dr.).'); return; }
    if (!registrationNo.trim()) { setServerError('Please enter your Medical Council Registration No.'); return; }
    const cleanMobile = mobile.trim().replace(/\D/g, '');
    if (!cleanMobile || cleanMobile.length !== 10) { setServerError('Please enter a valid 10-digit mobile number.'); return; }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setServerError('Please enter a valid email address.'); return; }
    if (!password || password.length < 6) { setServerError('Password must be at least 6 characters long.'); return; }
    if (!qualification.trim()) { setServerError('Please enter Medical Degree / Qualification.'); return; }
    
    if (!aadhaarDoc && !panDoc && !dlDoc) { setServerError('Please upload at least one Government ID (Aadhaar, PAN, or Driving License).'); return; }
    if (!signatureDoc || !signatureDoc.fileUrl) { setServerError('Doctor Signature is required.'); return; }

    const docsList: DocEntry[] = [];
    if (aadhaarDoc && aadhaarDoc.fileUrl) docsList.push(aadhaarDoc);
    if (panDoc && panDoc.fileUrl) docsList.push(panDoc);
    if (dlDoc && dlDoc.fileUrl) docsList.push(dlDoc);
    if (signatureDoc && signatureDoc.fileUrl) docsList.push(signatureDoc);

    setIsLoading(true);
    try {
      await apiService.registerDoctor({
        name: name.trim(),
        email: email.trim() || undefined,
        mobile: cleanMobile,
        password,
        qualification: qualification.trim(),
        registrationNo: registrationNo.trim(),
        specialization: specialization.trim() || 'General Medicine / Pathology',
        designation: designation.trim() || 'Consulting Doctor',
        documents: docsList,
      } as any);

      router.replace('/(auth)/doctor-pending');
    } catch (error: any) {
      const errMsg = error.response?.data?.error || error.response?.data?.message || (typeof error.response?.data === 'string' ? error.response?.data : null) || error.message || 'Failed to submit registration. Try again.';
      setServerError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const renderDocRow = (type: GovtDocType, title: string, docState: DocEntry | null, isRequired: boolean) => (
    <View style={styles.inlineDocRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.inlineDocTitle}>{title} {isRequired && <Text style={{ color: '#EF4444' }}>*</Text>}</Text>
        {docState ? (
          <Text style={styles.inlineDocFileName} numberOfLines={1}>{docState.fileName}</Text>
        ) : (
          <Text style={styles.inlineDocSub}>{isRequired ? 'Required' : ''}</Text>
        )}
      </View>
      {docState ? (
        <View style={styles.inlineDocActions}>
          <View style={styles.inlineCheck}><MaterialCommunityIcons name="check" size={12} color="#059669" /></View>
          <TouchableOpacity
            style={styles.inlineRemoveBtn}
            onPress={() => {
              if (type === 'AADHAAR') setAadhaarDoc(null);
              if (type === 'PAN_CARD') setPanDoc(null);
              if (type === 'DRIVING_LICENSE') setDlDoc(null);
              if (type === 'SIGNATURE_DOC') setSignatureDoc(null);
            }}
          >
            <MaterialCommunityIcons name="trash-can-outline" size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.inlineUploadBtn}
          onPress={() => { setTargetDocType(type); setShowPickerModal(true); }}
        >
          <MaterialCommunityIcons name="cloud-upload-outline" size={16} color={COLORS.primary} />
          <Text style={styles.inlineUploadBtnText}>Upload</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const getModalTitle = () => {
    switch (targetDocType) {
      case 'AADHAAR': return 'Aadhaar Card';
      case 'PAN_CARD': return 'PAN Card';
      case 'DRIVING_LICENSE': return 'Driving License';
      case 'SIGNATURE_DOC': return 'Doctor Signature';
      default: return 'Document';
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#334155" />
        </TouchableOpacity>

        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="stethoscope" size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.cardTitle}>Doctor Registration</Text>
          <Text style={styles.cardSubtitle}>Register your medical profile with MedsSeva network.</Text>

          <Text style={styles.fieldLabel}>Full Name (Dr.) *</Text>
          <View style={styles.inputWrap}>
            <MaterialCommunityIcons name="account-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="Dr. Ananya Verma" placeholderTextColor="#94A3B8" value={name} onChangeText={setName} />
          </View>

          <Text style={styles.fieldLabel}>Medical Council Registration No. *</Text>
          <View style={styles.inputWrap}>
            <MaterialCommunityIcons name="card-account-details-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="e.g. MCI-123456" placeholderTextColor="#94A3B8" value={registrationNo} onChangeText={setRegistrationNo} />
          </View>

          <Text style={styles.fieldLabel}>Mobile Number *</Text>
          <View style={styles.inputWrap}>
            <MaterialCommunityIcons name="phone-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="10-digit mobile number" placeholderTextColor="#94A3B8" keyboardType="phone-pad" maxLength={10} value={mobile} onChangeText={setMobile} />
          </View>

          <Text style={styles.fieldLabel}>Email Address</Text>
          <View style={styles.inputWrap}>
            <MaterialCommunityIcons name="email-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="doctor@example.com" placeholderTextColor="#94A3B8" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
          </View>

          <Text style={styles.fieldLabel}>Password *</Text>
          <View style={styles.inputWrap}>
            <MaterialCommunityIcons name="lock-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="At least 6 characters" placeholderTextColor="#94A3B8" secureTextEntry={!showPassword} value={password} onChangeText={setPassword} />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
              <MaterialCommunityIcons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <Text style={styles.fieldLabel}>Medical Degree / Qualification *</Text>
          <View style={styles.inputWrap}>
            <MaterialCommunityIcons name="school-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="e.g. MBBS, MD (Pathology)" placeholderTextColor="#94A3B8" value={qualification} onChangeText={setQualification} />
          </View>

          <Text style={styles.fieldLabel}>Specialization</Text>
          <View style={styles.inputWrap}>
            <MaterialCommunityIcons name="domain" size={18} color="#94A3B8" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="e.g. Pathology / Internal Medicine" placeholderTextColor="#94A3B8" value={specialization} onChangeText={setSpecialization} />
          </View>

          {/* Government ID Section */}
          <View style={styles.docSection}>
            <View style={styles.docSectionHeader}>
              <MaterialCommunityIcons name="card-account-details-outline" size={18} color={COLORS.primary} />
              <Text style={styles.docSectionTitle}>Government ID Proof</Text>
            </View>
            <Text style={styles.docSectionSubtitle}>Upload at least one ID document (Aadhaar, PAN, or DL) *</Text>

            {isUploadingDoc && targetDocType !== 'SIGNATURE_DOC' && (
              <View style={styles.uploadingInline}>
                <ActivityIndicator color={COLORS.primary} size="small" />
                <Text style={styles.uploadingInlineText}>Uploading...</Text>
              </View>
            )}

            {renderDocRow('AADHAAR', 'Aadhaar Card', aadhaarDoc, false)}
            {renderDocRow('PAN_CARD', 'PAN Card', panDoc, false)}
            {renderDocRow('DRIVING_LICENSE', 'Driving License', dlDoc, false)}
          </View>

          {/* Signature Section */}
          <View style={[styles.docSection, { marginTop: 0 }]}>
            <View style={styles.docSectionHeader}>
              <MaterialCommunityIcons name="draw" size={18} color={COLORS.primary} />
              <Text style={styles.docSectionTitle}>Doctor Signature</Text>
            </View>
            <Text style={styles.docSectionSubtitle}>Upload a clear photo of your signature *</Text>

            {isUploadingDoc && targetDocType === 'SIGNATURE_DOC' && (
              <View style={styles.uploadingInline}>
                <ActivityIndicator color={COLORS.primary} size="small" />
                <Text style={styles.uploadingInlineText}>Uploading...</Text>
              </View>
            )}

            {renderDocRow('SIGNATURE_DOC', 'Signature Photo', signatureDoc, true)}
          </View>

          {serverError && (
            <View style={styles.serverErrorBox}>
              <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#EF4444" style={{ marginTop: 1 }} />
              <Text style={styles.serverErrorText}>{serverError}</Text>
            </View>
          )}

          <TouchableOpacity style={[styles.submitBtn, (isLoading || isUploadingDoc) && { opacity: 0.6 }]} onPress={handleRegister} disabled={isLoading || isUploadingDoc}>
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Submit Registration</Text>}
          </TouchableOpacity>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already registered? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/doctor-login')}>
              <Text style={styles.loginLink}>Login Here</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.copyright}>© {new Date().getFullYear()} MedsSeva Healthcare. All rights reserved.</Text>
      </ScrollView>

      {/* Upload Source Selection Modal */}
      <Modal visible={showPickerModal} transparent animationType="fade" onRequestClose={() => setShowPickerModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowPickerModal(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upload {getModalTitle()}</Text>
              <TouchableOpacity onPress={() => setShowPickerModal(false)} style={{ padding: 4 }}>
                <MaterialCommunityIcons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>Select a source to upload document</Text>

            <TouchableOpacity style={styles.modalOption} onPress={() => handlePickDocument('camera')} activeOpacity={0.7}>
              <View style={[styles.modalOptionIcon, { backgroundColor: '#EFF6FF' }]}><MaterialCommunityIcons name="camera-outline" size={22} color="#2563EB" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalOptionTitle}>Take Photo</Text>
                <Text style={styles.modalOptionDesc}>Capture using device camera</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalOption} onPress={() => handlePickDocument('gallery')} activeOpacity={0.7}>
              <View style={[styles.modalOptionIcon, { backgroundColor: '#F0FDF4' }]}><MaterialCommunityIcons name="image-outline" size={22} color="#16A34A" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalOptionTitle}>Choose from Gallery</Text>
                <Text style={styles.modalOptionDesc}>Pick existing photo from gallery</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalOption} onPress={() => handlePickDocument('document')} activeOpacity={0.7}>
              <View style={[styles.modalOptionIcon, { backgroundColor: '#FAF5FF' }]}><MaterialCommunityIcons name="file-document-outline" size={22} color="#9333EA" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalOptionTitle}>Upload PDF / File</Text>
                <Text style={styles.modalOptionDesc}>Browse documents & PDF files</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowPickerModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 24, paddingTop: Platform.OS === 'ios' ? 56 : 36, paddingBottom: 40 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 20, ...SHADOWS.soft,
  },
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', ...SHADOWS.soft,
  },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#F0FDFA',
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#CCFBF1', marginBottom: 16,
  },
  cardTitle: { fontSize: 20, fontWeight: '900', color: '#0F172A', marginBottom: 6 },
  cardSubtitle: { fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 24 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6, alignSelf: 'flex-start' },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC',
    borderRadius: 12, borderWidth: 1.5, borderColor: '#E2E8F0',
    paddingHorizontal: 14, height: 48, marginBottom: 14, width: '100%',
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 14, color: '#0F172A' },
  
  docSection: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 16,
    marginTop: 4,
  },
  docSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  docSectionTitle: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  docSectionSubtitle: { fontSize: 11, color: '#64748B', marginBottom: 12 },
  
  inlineDocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  inlineDocTitle: { fontSize: 12, fontWeight: '700', color: '#1E293B', marginBottom: 2 },
  inlineDocSub: { fontSize: 10, color: '#94A3B8' },
  inlineDocFileName: { fontSize: 10, color: '#059669', fontWeight: '600' },
  inlineUploadBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F0FDFA', paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 6, borderWidth: 1, borderColor: '#CCFBF1'
  },
  inlineUploadBtnText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  inlineDocActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  inlineCheck: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center' },
  inlineRemoveBtn: { padding: 4 },
  uploadingInline: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  uploadingInlineText: { fontSize: 11, color: COLORS.primary, fontWeight: '600' },

  serverErrorBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#FECACA', width: '100%', marginBottom: 16,
  },
  serverErrorText: { fontSize: 13, color: '#EF4444', fontWeight: '600', flex: 1 },

  submitBtn: {
    backgroundColor: COLORS.primary, height: 50, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', width: '100%', marginTop: 8, marginBottom: 20, ...SHADOWS.soft,
  },
  submitBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  loginRow: { flexDirection: 'row', marginBottom: 10 },
  loginText: { fontSize: 13, color: '#64748B' },
  loginLink: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  copyright: { fontSize: 12, color: '#7A9AAA', textAlign: 'center', marginTop: 24 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  modalSub: { fontSize: 13, color: '#64748B', marginBottom: 20 },
  modalOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalOptionIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  modalOptionTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 2 },
  modalOptionDesc: { fontSize: 12, color: '#64748B' },
  modalCancelBtn: { marginTop: 20, backgroundColor: '#F1F5F9', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalCancelText: { fontSize: 15, fontWeight: '700', color: '#334155' },
});
