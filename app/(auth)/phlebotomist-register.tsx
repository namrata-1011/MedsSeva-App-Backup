import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, StatusBar, Platform, Modal, Image
} from 'react-native';
import ScreenWrapper from '../../src/components/ScreenWrapper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../../src/theme/theme';
import { apiService } from '../../src/services/api';
import { showError, showSuccess } from '../../src/store/toastStore';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

type GovtDocType = 'AADHAAR' | 'PAN_CARD';

export default function PhlebotomistRegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [qualification, setQualification] = useState('');
  const [experience, setExperience] = useState('');
  const [serviceArea, setServiceArea] = useState('');
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Government ID upload state
  const [selectedDocType, setSelectedDocType] = useState<GovtDocType>('AADHAAR');
  const [uploadedDoc, setUploadedDoc] = useState<{
    documentType: GovtDocType;
    fileName: string;
    fileUrl: string;
    mimeType?: string;
    fileSize?: number;
  } | null>(null);
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
          showError('Camera permission is required to capture government ID.');
          setIsUploadingDoc(false);
          return;
        }
        const res = await ImagePicker.launchCameraAsync({
          quality: 0.8,
          allowsEditing: false,
        });
        if (res.canceled || !res.assets?.length) {
          setIsUploadingDoc(false);
          return;
        }
        const a = res.assets[0];
        fileUri = a.uri;
        fileName = a.fileName || `${selectedDocType}_doc.jpg`;
        mimeType = a.mimeType || 'image/jpeg';
        fileSize = a.fileSize || 0;
      } else if (source === 'gallery') {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          showError('Photo gallery permission is required to upload document.');
          setIsUploadingDoc(false);
          return;
        }
        const res = await ImagePicker.launchImageLibraryAsync({
          quality: 0.8,
          allowsEditing: false,
        });
        if (res.canceled || !res.assets?.length) {
          setIsUploadingDoc(false);
          return;
        }
        const a = res.assets[0];
        fileUri = a.uri;
        fileName = a.fileName || `${selectedDocType}_doc.jpg`;
        mimeType = a.mimeType || 'image/jpeg';
        fileSize = a.fileSize || 0;
      } else if (source === 'document') {
        const res = await DocumentPicker.getDocumentAsync({
          type: ['application/pdf', 'image/jpeg', 'image/png'],
          copyToCacheDirectory: true,
        });
        if (res.canceled || !res.assets?.length) {
          setIsUploadingDoc(false);
          return;
        }
        const a = res.assets[0];
        fileUri = a.uri;
        fileName = a.name || `${selectedDocType}_doc.pdf`;
        mimeType = a.mimeType || 'application/pdf';
        fileSize = a.size || 0;
      }

      let fileUrl = fileUri;
      try {
        const uploadRes = await apiService.uploadPartnerOnboardingDocument(
          fileUri,
          mimeType,
          fileName,
          selectedDocType
        );
        if (uploadRes?.document?.fileUrl) {
          fileUrl = uploadRes.document.fileUrl;
        }
      } catch (uploadErr) {
        console.warn('Document server upload fallback to local URI:', uploadErr);
      }

      setUploadedDoc({
        documentType: selectedDocType,
        fileName,
        fileUrl,
        mimeType,
        fileSize,
      });
      showSuccess(`${selectedDocType === 'AADHAAR' ? 'Aadhaar Card' : 'PAN Card'} attached!`);
    } catch (err: any) {
      console.error('Document selection error:', err);
      setServerError('Failed to attach document. Please try again.');
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleRegister = async () => {
    setServerError(null);
    if (!name.trim()) {
      setServerError('Please enter your Full Name.');
      return;
    }
    const cleanMobile = mobile.trim().replace(/\D/g, '');
    if (!cleanMobile || cleanMobile.length !== 10) {
      setServerError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setServerError('Please enter a valid email address.');
      return;
    }
    if (!password || password.length < 6) {
      setServerError('Password must be at least 6 characters long.');
      return;
    }
    if (!qualification.trim()) {
      setServerError('Please enter your Qualification / Certification.');
      return;
    }

    // Government ID is required: Either Aadhaar or PAN
    if (!uploadedDoc || !uploadedDoc.fileUrl) {
      setServerError('Please select and upload Government ID (Aadhaar Card or PAN Card).');
      return;
    }

    setIsLoading(true);
    try {
      await apiService.registerPhlebotomist({
        name: name.trim(),
        email: email.trim() || undefined,
        mobile: cleanMobile,
        password,
        qualification: qualification.trim(),
        experience: experience.trim(),
        serviceArea: serviceArea.trim(),
        address: address.trim() || serviceArea.trim() || 'Independent',
        document: {
          documentType: uploadedDoc.documentType,
          fileName: uploadedDoc.fileName,
          fileUrl: uploadedDoc.fileUrl,
          mimeType: uploadedDoc.mimeType,
          fileSize: uploadedDoc.fileSize,
        },
      });

      router.replace('/(auth)/phlebotomist-pending');
    } catch (error: any) {
      const errMsg = error.response?.data?.error || error.response?.data?.message || (typeof error.response?.data === 'string' ? error.response?.data : null) || error.message || 'Failed to submit application. Try again.';
      setServerError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <ScreenWrapper backgroundColor="#F8FAFC" contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#334155" />
        </TouchableOpacity>

        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="needle" size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.cardTitle}>Phlebotomist Registration</Text>
          <Text style={styles.cardSubtitle}>Apply to become a verified MedsSeva Sample Collection Partner.</Text>

          <Text style={styles.fieldLabel}>Full Name *</Text>
          <View style={styles.inputWrap}>
            <MaterialCommunityIcons name="account-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="e.g. Rahul Sharma" placeholderTextColor="#94A3B8" value={name} onChangeText={setName} />
          </View>

          <Text style={styles.fieldLabel}>Mobile Number *</Text>
          <View style={styles.inputWrap}>
            <MaterialCommunityIcons name="phone-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="10-digit mobile number" placeholderTextColor="#94A3B8" keyboardType="phone-pad" maxLength={10} value={mobile} onChangeText={setMobile} />
          </View>

          <Text style={styles.fieldLabel}>Email Address</Text>
          <View style={styles.inputWrap}>
            <MaterialCommunityIcons name="email-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="rahul@example.com" placeholderTextColor="#94A3B8" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
          </View>

          <Text style={styles.fieldLabel}>Password *</Text>
          <View style={styles.inputWrap}>
            <MaterialCommunityIcons name="lock-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="At least 6 characters" placeholderTextColor="#94A3B8" secureTextEntry value={password} onChangeText={setPassword} />
          </View>

          <Text style={styles.fieldLabel}>Qualification / Certification *</Text>
          <View style={styles.inputWrap}>
            <MaterialCommunityIcons name="certificate-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="e.g. DMLT / B.Sc MLT" placeholderTextColor="#94A3B8" value={qualification} onChangeText={setQualification} />
          </View>

          <Text style={styles.fieldLabel}>Years of Experience</Text>
          <View style={styles.inputWrap}>
            <MaterialCommunityIcons name="briefcase-clock-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="e.g. 3 Years" placeholderTextColor="#94A3B8" value={experience} onChangeText={setExperience} />
          </View>

          <Text style={styles.fieldLabel}>Preferred Service Area / City</Text>
          <View style={styles.inputWrap}>
            <MaterialCommunityIcons name="map-marker-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="e.g. South Delhi / Noida" placeholderTextColor="#94A3B8" value={serviceArea} onChangeText={setServiceArea} />
          </View>

          {/* Government ID Section */}
          <View style={styles.docSection}>
            <View style={styles.docSectionHeader}>
              <MaterialCommunityIcons name="card-account-details-outline" size={18} color={COLORS.primary} />
              <Text style={styles.docSectionTitle}>Government ID Proof *</Text>
            </View>
            <Text style={styles.docSectionSubtitle}>Select ID type and upload Aadhaar Card or PAN Card proof</Text>

            {/* Document Selector Pills */}
            <View style={styles.docTypeSelector}>
              <TouchableOpacity
                style={[styles.docTypeTab, selectedDocType === 'AADHAAR' && styles.docTypeTabActive]}
                onPress={() => {
                  setSelectedDocType('AADHAAR');
                  if (uploadedDoc && uploadedDoc.documentType !== 'AADHAAR') {
                    setUploadedDoc(null);
                  }
                }}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name="card-account-details"
                  size={16}
                  color={selectedDocType === 'AADHAAR' ? COLORS.primary : '#64748B'}
                />
                <Text style={[styles.docTypeTabText, selectedDocType === 'AADHAAR' && styles.docTypeTabTextActive]}>
                  Aadhaar Card
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.docTypeTab, selectedDocType === 'PAN_CARD' && styles.docTypeTabActive]}
                onPress={() => {
                  setSelectedDocType('PAN_CARD');
                  if (uploadedDoc && uploadedDoc.documentType !== 'PAN_CARD') {
                    setUploadedDoc(null);
                  }
                }}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name="credit-card-outline"
                  size={16}
                  color={selectedDocType === 'PAN_CARD' ? COLORS.primary : '#64748B'}
                />
                <Text style={[styles.docTypeTabText, selectedDocType === 'PAN_CARD' && styles.docTypeTabTextActive]}>
                  PAN Card
                </Text>
              </TouchableOpacity>
            </View>

            {/* Document Upload Status / Box */}
            {isUploadingDoc ? (
              <View style={styles.uploadingBox}>
                <ActivityIndicator color={COLORS.primary} size="small" />
                <Text style={styles.uploadingText}>Attaching document...</Text>
              </View>
            ) : uploadedDoc ? (
              <View style={styles.uploadedCard}>
                <View style={styles.uploadedLeft}>
                  <View style={styles.checkCircle}>
                    <MaterialCommunityIcons name="check" size={16} color="#059669" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.uploadedType}>
                      {uploadedDoc.documentType === 'AADHAAR' ? 'Aadhaar Card' : 'PAN Card'} Uploaded
                    </Text>
                    <Text style={styles.uploadedName} numberOfLines={1}>
                      {uploadedDoc.fileName}
                    </Text>
                  </View>
                </View>

                <View style={styles.uploadedActions}>
                  <TouchableOpacity
                    style={styles.changeBtn}
                    onPress={() => setShowPickerModal(true)}
                  >
                    <Text style={styles.changeBtnText}>Change</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => setUploadedDoc(null)}
                  >
                    <MaterialCommunityIcons name="trash-can-outline" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.uploadBox}
                onPress={() => setShowPickerModal(true)}
                activeOpacity={0.8}
              >
                <View style={styles.uploadIconCircle}>
                  <MaterialCommunityIcons name="cloud-upload-outline" size={24} color={COLORS.primary} />
                </View>
                <Text style={styles.uploadBoxTitle}>
                  Upload {selectedDocType === 'AADHAAR' ? 'Aadhaar Card' : 'PAN Card'}
                </Text>
                <Text style={styles.uploadBoxSub}>
                  Camera, Photo Gallery, or PDF file
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {serverError && (
            <View style={styles.serverErrorBox}>
              <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#EF4444" style={{ marginTop: 1 }} />
              <Text style={styles.serverErrorText}>{serverError}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitBtn, (isLoading || isUploadingDoc) && { opacity: 0.6 }]}
            onPress={handleRegister}
            disabled={isLoading || isUploadingDoc}
          >
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Submit Application</Text>}
          </TouchableOpacity>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already registered? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/phlebotomist-login')}>
              <Text style={styles.loginLink}>Login Here</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.copyright}>© {new Date().getFullYear()} MedsSeva Healthcare. All rights reserved.</Text>
      </ScreenWrapper>

      {/* Upload Source Selection Modal */}
      <Modal
        visible={showPickerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPickerModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPickerModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upload {selectedDocType === 'AADHAAR' ? 'Aadhaar Card' : 'PAN Card'}</Text>
              <TouchableOpacity onPress={() => setShowPickerModal(false)}>
                <MaterialCommunityIcons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>Select a source to upload government ID document</Text>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => handlePickDocument('camera')}
              activeOpacity={0.7}
            >
              <View style={[styles.modalOptionIcon, { backgroundColor: '#EFF6FF' }]}>
                <MaterialCommunityIcons name="camera-outline" size={22} color="#2563EB" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalOptionTitle}>Take Photo</Text>
                <Text style={styles.modalOptionDesc}>Capture ID using device camera</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => handlePickDocument('gallery')}
              activeOpacity={0.7}
            >
              <View style={[styles.modalOptionIcon, { backgroundColor: '#F0FDF4' }]}>
                <MaterialCommunityIcons name="image-outline" size={22} color="#16A34A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalOptionTitle}>Choose from Gallery</Text>
                <Text style={styles.modalOptionDesc}>Pick existing photo from gallery</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => handlePickDocument('document')}
              activeOpacity={0.7}
            >
              <View style={[styles.modalOptionIcon, { backgroundColor: '#FAF5FF' }]}>
                <MaterialCommunityIcons name="file-document-outline" size={22} color="#9333EA" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalOptionTitle}>Upload PDF / File</Text>
                <Text style={styles.modalOptionDesc}>Browse documents & PDF files</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setShowPickerModal(false)}
            >
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

  // Document Section Styles
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
  docSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  docSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  docSectionSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 12,
  },
  docTypeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  docTypeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  docTypeTabActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#F0FDFA',
  },
  docTypeTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  docTypeTabTextActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  uploadBox: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0FDFA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  uploadBoxTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  uploadBoxSub: {
    fontSize: 11,
    color: '#94A3B8',
  },
  uploadingBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  uploadedCard: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  uploadedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadedType: {
    fontSize: 12,
    fontWeight: '800',
    color: '#065F46',
  },
  uploadedName: {
    fontSize: 11,
    color: '#047857',
    marginTop: 1,
  },
  uploadedActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  changeBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  changeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  removeBtn: {
    padding: 5,
  },

  // Server error
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

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSub: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 20,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    marginBottom: 10,
    gap: 12,
  },
  modalOptionIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalOptionDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  modalCancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 6,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
});
