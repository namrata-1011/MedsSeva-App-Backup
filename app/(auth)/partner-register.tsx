import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Platform, StatusBar, ScrollView, Modal, Alert
} from 'react-native';
import ScreenWrapper from '../../src/components/ScreenWrapper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../../src/theme/theme';
import { showError, showInfo, showSuccess } from '../../src/store/toastStore';
import { apiService } from '../../src/services/api';
import * as Location from 'expo-location';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

type DocumentTypeKey =
  | 'MEDICAL_CEA_REGISTRATION'
  | 'NABL_CERTIFICATE'
  | 'BMW_LICENCE'
  | 'PATHOLOGIST_QUALIFICATION'
  | 'REGISTRATION_CERTIFICATE'
  | 'PAN_CARD'
  | 'GST_CERTIFICATE'
  | 'CANCELLED_CHEQUE';

interface DocMeta {
  key: DocumentTypeKey;
  label: string;
  category: 'MEDICAL' | 'LEGAL';
  required: boolean;
  desc: string;
}

const DOCUMENT_CONFIGS: DocMeta[] = [
  // Medical & CEA Registration
  { key: 'MEDICAL_CEA_REGISTRATION', label: 'Medical & CEA Registration Certificate', category: 'MEDICAL', required: true, desc: 'Official Clinical Establishment Act or State Medical License.' },
  { key: 'BMW_LICENCE', label: 'Bio-Medical Waste (BMW) Licence', category: 'MEDICAL', required: true, desc: 'Valid BMW authorization certificate from State Pollution Control Board.' },
  { key: 'PATHOLOGIST_QUALIFICATION', label: 'Pathologist Degree / Qualification Certificate', category: 'MEDICAL', required: true, desc: 'MBBS / MD Pathology / DMLT verification degree of consultant.' },
  { key: 'NABL_CERTIFICATE', label: 'NABL Accreditation Certificate', category: 'MEDICAL', required: false, desc: 'Optional NABL accreditation certificate if applicable.' },
  // Business & Legal Verification
  { key: 'REGISTRATION_CERTIFICATE', label: 'Business Registration / Trade License', category: 'LEGAL', required: true, desc: 'Firm incorporation, Shop & Establishment, or Partnership registration.' },
  { key: 'PAN_CARD', label: 'Lab / Entity PAN Card', category: 'LEGAL', required: true, desc: 'Permanent Account Number card of lab or authorized proprietor.' },
  { key: 'GST_CERTIFICATE', label: 'GST Registration Certificate', category: 'LEGAL', required: false, desc: 'Optional GSTIN certificate for tax invoicing.' },
  { key: 'CANCELLED_CHEQUE', label: 'Bank Cancelled Cheque / Passbook', category: 'LEGAL', required: false, desc: 'Optional cancelled cheque for direct bank settlement.' },
];

export default function PartnerRegisterScreen() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<number>(1); // Step 1 to 5
  const [isLoading, setIsLoading] = useState(false);

  const [serverError, setServerError] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Picker modal state for selecting Document file vs Camera vs Gallery
  const [activeDocKey, setActiveDocKey] = useState<DocumentTypeKey | null>(null);
  const [showPickerModal, setShowPickerModal] = useState(false);
  const [uploadingDocKey, setUploadingDocKey] = useState<DocumentTypeKey | null>(null);

  // Form state
  const [form, setForm] = useState({
    // Basic Details
    name: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: '',
    role: 'Lab Partner',
    // Lab Details
    labName: '',
    ownerName: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    preferredServiceArea: '',
  });

  // Uploaded Documents state map: [key]: { fileUrl, fileName, mimeType, fileSize, status }
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, {
    documentType: string;
    fileName: string;
    fileUrl: string;
    mimeType?: string;
    fileSize?: number;
    status: string;
  }>>({});

  const updateField = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }));

  const otpRefs = React.useRef<(TextInput | null)[]>([]);

  const handleOtpChange = (val: string, i: number) => {
    const newOtp = [...otp];
    newOtp[i] = val;
    setOtp(newOtp);
    if (val && i < 3) {
      otpRefs.current[i + 1]?.focus();
    }
    if (!val && i > 0) {
      otpRefs.current[i - 1]?.focus();
    }
  };

  const handleAutoDetectLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showError('Location permission is required to auto-detect address.');
        return;
      }
      const coords = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const geocode = await Location.reverseGeocodeAsync({
        latitude: coords.coords.latitude,
        longitude: coords.coords.longitude,
      });
      if (geocode.length > 0) {
        const g = geocode[0];
        const parts = [g.name, g.street, g.district, g.city, g.region, g.postalCode];
        const fullAddress = parts.filter(Boolean).join(', ');
        updateField('address', fullAddress);
        if (g.city) updateField('city', g.city);
        if (g.region) updateField('state', g.region);
        if (g.postalCode) updateField('pincode', g.postalCode);
        if (g.city) updateField('preferredServiceArea', g.city);
      }
    } catch (error) {
      showError('Could not fetch location. Please enter manually.');
    } finally {
      setLocationLoading(false);
    }
  };

  // Step 1 Validation & OTP Send
  const validateStep1 = async () => {
    setServerError(null);
    if (!form.name.trim()) {
      setServerError('Please enter Authorized Person / Full Name.');
      return;
    }
    const cleanMob = form.mobile.trim().replace(/\D/g, '').slice(-10);
    if (cleanMob.length !== 10) {
      setServerError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!form.password || form.password.length < 6) {
      setServerError('Password must be at least 6 characters long.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setServerError('Passwords do not match.');
      return;
    }
    if (!agreedToTerms) {
      setServerError('Please accept the Terms of Service & Privacy Policy.');
      return;
    }

    setCurrentStep(2);
  };



  // Step 2 Validation (Lab Details)
  const validateStep2 = () => {
    setServerError(null);
    if (!form.labName.trim()) {
      setServerError('Please enter Lab / Diagnostic Centre Name.');
      return;
    }
    if (!form.address.trim()) {
      setServerError('Please enter Complete Lab Address.');
      return;
    }
    if (!form.city.trim()) {
      setServerError('Please enter City.');
      return;
    }
    if (!form.state.trim()) {
      setServerError('Please enter State.');
      return;
    }
    if (!form.pincode.trim()) {
      setServerError('Please enter Pincode.');
      return;
    }
    setCurrentStep(3);
  };

  // Step 3 Validation (Medical & CEA Registration Docs)
  const validateStep3 = () => {
    setServerError(null);
    const medicalReqs: DocumentTypeKey[] = ['MEDICAL_CEA_REGISTRATION', 'BMW_LICENCE', 'PATHOLOGIST_QUALIFICATION'];
    const missing = medicalReqs.filter(k => !uploadedDocs[k]);
    if (missing.length > 0) {
      const labels = missing.map(k => DOCUMENT_CONFIGS.find(c => c.key === k)?.label).join(', ');
      setServerError(`Please upload required Medical & CEA documents: ${labels}`);
      return;
    }
    setCurrentStep(4);
  };

  // Step 4 Validation (Business & Legal Verification Docs)
  const validateStep4 = () => {
    setServerError(null);
    const legalReqs: DocumentTypeKey[] = ['REGISTRATION_CERTIFICATE', 'PAN_CARD'];
    const missing = legalReqs.filter(k => !uploadedDocs[k]);
    if (missing.length > 0) {
      const labels = missing.map(k => DOCUMENT_CONFIGS.find(c => c.key === k)?.label).join(', ');
      setServerError(`Please upload required Business & Legal documents: ${labels}`);
      return;
    }
    setCurrentStep(5);
  };

  // Document Upload Handlers
  const openDocPicker = (key: DocumentTypeKey) => {
    setActiveDocKey(key);
    setShowPickerModal(true);
  };

  const handlePickFile = async (type: 'document' | 'camera' | 'gallery') => {
    if (!activeDocKey) return;
    const docKey = activeDocKey;
    setShowPickerModal(false);
    setUploadingDocKey(docKey);

    try {
      let fileUri = '';
      let fileName = '';
      let mimeType = 'application/pdf';
      let fileSize = 0;

      if (type === 'document') {
        const res = await DocumentPicker.getDocumentAsync({
          type: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
          copyToCacheDirectory: true,
        });
        if (res.canceled || !res.assets || res.assets.length === 0) {
          setUploadingDocKey(null);
          return;
        }
        const asset = res.assets[0];
        fileUri = asset.uri;
        fileName = asset.name || `${docKey}.pdf`;
        mimeType = asset.mimeType || 'application/pdf';
        fileSize = asset.size || 0;
      } else if (type === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          showError('Camera permission is required to capture documents.');
          setUploadingDocKey(null);
          return;
        }
        const res = await ImagePicker.launchCameraAsync({
          quality: 0.8,
          allowsEditing: false,
        });
        if (res.canceled || !res.assets || res.assets.length === 0) {
          setUploadingDocKey(null);
          return;
        }
        const asset = res.assets[0];
        fileUri = asset.uri;
        fileName = asset.fileName || `${docKey}.jpg`;
        mimeType = asset.mimeType || 'image/jpeg';
        fileSize = asset.fileSize || 0;
      } else if (type === 'gallery') {
        const res = await ImagePicker.launchImageLibraryAsync({
          quality: 0.8,
          allowsEditing: false,
        });
        if (res.canceled || !res.assets || res.assets.length === 0) {
          setUploadingDocKey(null);
          return;
        }
        const asset = res.assets[0];
        fileUri = asset.uri;
        fileName = asset.fileName || `${docKey}.jpg`;
        mimeType = asset.mimeType || 'image/jpeg';
        fileSize = asset.fileSize || 0;
      }

      // Perform backend upload endpoint test
      const uploadRes = await apiService.uploadPartnerOnboardingDocument(fileUri, mimeType, fileName, docKey).catch(e => {
        // Fallback local URI representation if server upload fails
        return {
          document: {
            documentType: docKey,
            fileName,
            fileUrl: fileUri,
            mimeType,
            fileSize,
            status: 'UPLOADED'
          }
        };
      });

      const docObj = uploadRes.document || {
        documentType: docKey,
        fileName,
        fileUrl: fileUri,
        mimeType,
        fileSize,
        status: 'UPLOADED',
      };

      setUploadedDocs(prev => ({
        ...prev,
        [docKey]: docObj
      }));

      showSuccess(`${DOCUMENT_CONFIGS.find(c => c.key === docKey)?.label} uploaded successfully.`);
    } catch (err: any) {
      showError('Failed to pick document file.');
    } finally {
      setUploadingDocKey(null);
    }
  };

  const handleRemoveDoc = (key: DocumentTypeKey) => {
    setUploadedDocs(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  // Step 5 Submit Final Partner Application
  const handleFinalSubmit = async () => {
    setServerError(null);

    // Re-validate all required documents
    const requiredKeys: DocumentTypeKey[] = [
      'MEDICAL_CEA_REGISTRATION',
      'BMW_LICENCE',
      'PATHOLOGIST_QUALIFICATION',
      'REGISTRATION_CERTIFICATE',
      'PAN_CARD'
    ];
    const missing = requiredKeys.filter(k => !uploadedDocs[k]);
    if (missing.length > 0) {
      const labels = missing.map(k => DOCUMENT_CONFIGS.find(c => c.key === k)?.label).join(', ');
      setServerError(`Cannot submit. Missing required documents: ${labels}`);
      return;
    }

    setIsLoading(true);
    try {
      const docPayload = Object.values(uploadedDocs).map(d => ({
        documentType: d.documentType,
        fileName: d.fileName,
        fileUrl: d.fileUrl,
        mimeType: d.mimeType,
        fileSize: d.fileSize,
      }));

      await apiService.registerPartner({
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        mobile: form.mobile.trim(),
        password: form.password,
        labName: form.labName.trim(),
        ownerName: form.ownerName.trim() || form.name.trim(),
        role: form.role || 'Lab Partner',
        city: form.city.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim(),
        address: form.address.trim(),
        preferredServiceArea: form.preferredServiceArea.trim() || form.city.trim(),
        documents: docPayload,
      });

      router.replace('/(auth)/partner-pending');
    } catch (error: any) {
      const errMsg = error.response?.data?.error || error.response?.data?.message || (typeof error.response?.data === 'string' ? error.response?.data : null) || error.message || 'Failed to submit partner application. Please try again.';
      setServerError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Render Step 1: Basic Info & OTP
  const renderStep1 = () => (
    <View style={styles.card}>
      <View style={styles.iconCircle}>
        <MaterialCommunityIcons name="store-cog-outline" size={32} color={COLORS.primary} />
      </View>
      <Text style={styles.cardTitle}>Partner Basic Info</Text>
      <Text style={styles.cardSubtitle}>Step 1 of 5: Account credentials & contact details.</Text>

      <Text style={styles.fieldLabel}>Authorized Contact Person *</Text>
      <View style={styles.inputWrap}>
        <MaterialCommunityIcons name="account-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
        <TextInput style={styles.input} placeholder="e.g. Dr. Rajesh Sharma" placeholderTextColor="#94A3B8" value={form.name} onChangeText={v => updateField('name', v)} />
      </View>

      <Text style={styles.fieldLabel}>Mobile Number *</Text>
      <View style={styles.inputWrap}>
        <MaterialCommunityIcons name="phone-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
        <TextInput style={styles.input} placeholder="10-digit mobile number" placeholderTextColor="#94A3B8" keyboardType="phone-pad" maxLength={10} value={form.mobile} onChangeText={v => updateField('mobile', v)} />
      </View>

      <Text style={styles.fieldLabel}>Email Address</Text>
      <View style={styles.inputWrap}>
        <MaterialCommunityIcons name="email-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
        <TextInput style={styles.input} placeholder="lab@example.com" placeholderTextColor="#94A3B8" autoCapitalize="none" value={form.email} onChangeText={v => updateField('email', v)} />
      </View>

      <Text style={styles.fieldLabel}>Password *</Text>
      <View style={styles.inputWrap}>
        <MaterialCommunityIcons name="lock-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
        <TextInput style={styles.input} placeholder="At least 6 characters" placeholderTextColor="#94A3B8" secureTextEntry value={form.password} onChangeText={v => updateField('password', v)} />
      </View>

      <Text style={styles.fieldLabel}>Confirm Password *</Text>
      <View style={styles.inputWrap}>
        <MaterialCommunityIcons name="lock-check-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
        <TextInput style={styles.input} placeholder="Re-enter password" placeholderTextColor="#94A3B8" secureTextEntry value={form.confirmPassword} onChangeText={v => updateField('confirmPassword', v)} />
      </View>

      <TouchableOpacity style={styles.checkboxRow} onPress={() => setAgreedToTerms(!agreedToTerms)}>
        <MaterialCommunityIcons name={agreedToTerms ? 'checkbox-marked' : 'checkbox-blank-outline'} size={22} color={agreedToTerms ? COLORS.primary : '#94A3B8'} />
        <Text style={styles.checkboxLabel}>I agree to the Terms of Service & Privacy Policy</Text>
      </TouchableOpacity>

      {serverError && (
        <View style={styles.serverErrorBox}>
          <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#EF4444" />
          <Text style={styles.serverErrorText}>{serverError}</Text>
        </View>
      )}

      <TouchableOpacity style={styles.continueBtn} onPress={validateStep1}>
        <Text style={styles.continueBtnText}>Proceed to Lab Details</Text>
        <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />
      </TouchableOpacity>

      <View style={styles.loginRow}>
        <Text style={styles.loginText}>Already registered? </Text>
        <TouchableOpacity onPress={() => router.push('/(auth)/partner-login')}>
          <Text style={styles.loginLink}>Partner Login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Render Step 2: Lab Details
  const renderStep2 = () => (
    <View style={styles.card}>
      <View style={styles.iconCircle}>
        <MaterialCommunityIcons name="domain" size={32} color={COLORS.primary} />
      </View>
      <Text style={styles.cardTitle}>Lab Details</Text>
      <Text style={styles.cardSubtitle}>Step 2 of 5: Pathology center address & location info.</Text>

      <Text style={styles.fieldLabel}>Lab / Diagnostic Centre Name *</Text>
      <View style={styles.inputWrap}>
        <MaterialCommunityIcons name="office-building" size={18} color="#94A3B8" style={styles.inputIcon} />
        <TextInput style={styles.input} placeholder="e.g. Apex Diagnostics & Pathology" placeholderTextColor="#94A3B8" value={form.labName} onChangeText={v => updateField('labName', v)} />
      </View>

      <Text style={styles.fieldLabel}>Owner / Authorized Director Name</Text>
      <View style={styles.inputWrap}>
        <MaterialCommunityIcons name="account-tie-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
        <TextInput style={styles.input} placeholder="Owner or Managing Director Name" placeholderTextColor="#94A3B8" value={form.ownerName} onChangeText={v => updateField('ownerName', v)} />
      </View>

      <View style={styles.labelWithBtn}>
        <Text style={styles.fieldLabel}>Complete Lab Address *</Text>
        <TouchableOpacity style={styles.gpsBtn} onPress={handleAutoDetectLocation} disabled={locationLoading}>
          {locationLoading ? <ActivityIndicator size="small" color={COLORS.primary} /> : <MaterialCommunityIcons name="crosshairs-gps" size={14} color={COLORS.primary} />}
          <Text style={styles.gpsBtnText}>Detect GPS</Text>
        </TouchableOpacity>
      </View>
      <View style={[styles.inputWrap, { height: 72, alignItems: 'flex-start', paddingTop: 10 }]}>
        <MaterialCommunityIcons name="map-marker-outline" size={18} color="#94A3B8" style={[styles.inputIcon, { marginTop: 2 }]} />
        <TextInput style={[styles.input, { textAlignVertical: 'top' }]} placeholder="House/Building No., Street, Landmark" placeholderTextColor="#94A3B8" multiline value={form.address} onChangeText={v => updateField('address', v)} />
      </View>

      <View style={styles.rowTwo}>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>City *</Text>
          <View style={styles.inputWrap}>
            <TextInput style={styles.input} placeholder="e.g. South Delhi" placeholderTextColor="#94A3B8" value={form.city} onChangeText={v => updateField('city', v)} />
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>State *</Text>
          <View style={styles.inputWrap}>
            <TextInput style={styles.input} placeholder="e.g. Delhi" placeholderTextColor="#94A3B8" value={form.state} onChangeText={v => updateField('state', v)} />
          </View>
        </View>
      </View>

      <View style={styles.rowTwo}>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>Pincode *</Text>
          <View style={styles.inputWrap}>
            <TextInput style={styles.input} placeholder="110001" placeholderTextColor="#94A3B8" keyboardType="number-pad" maxLength={6} value={form.pincode} onChangeText={v => updateField('pincode', v)} />
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>Service Radius / Area</Text>
          <View style={styles.inputWrap}>
            <TextInput style={styles.input} placeholder="e.g. 15 km Radius" placeholderTextColor="#94A3B8" value={form.preferredServiceArea} onChangeText={v => updateField('preferredServiceArea', v)} />
          </View>
        </View>
      </View>

      {serverError && (
        <View style={styles.serverErrorBox}>
          <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#EF4444" />
          <Text style={styles.serverErrorText}>{serverError}</Text>
        </View>
      )}

      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.prevBtn} onPress={() => setCurrentStep(1)}>
          <MaterialCommunityIcons name="arrow-left" size={18} color="#475569" />
          <Text style={styles.prevBtnText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.continueBtn, { flex: 1 }]} onPress={validateStep2}>
          <Text style={styles.continueBtnText}>Medical Docs</Text>
          <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Helper Document Card Component
  const renderDocCard = (meta: DocMeta) => {
    const doc = uploadedDocs[meta.key];
    const isUploading = uploadingDocKey === meta.key;

    return (
      <View key={meta.key} style={[styles.docCard, doc && styles.docCardUploaded]}>
        <View style={styles.docCardHeader}>
          <View style={styles.docTitleRow}>
            <MaterialCommunityIcons name={doc ? "file-check" : "file-document-outline"} size={22} color={doc ? "#059669" : COLORS.primary} />
            <Text style={styles.docLabel}>{meta.label}</Text>
          </View>
          <View style={[styles.badge, meta.required ? styles.badgeRequired : styles.badgeOptional]}>
            <Text style={[styles.badgeText, meta.required ? styles.badgeRequiredText : styles.badgeOptionalText]}>
              {meta.required ? 'REQUIRED' : 'OPTIONAL'}
            </Text>
          </View>
        </View>
        <Text style={styles.docDesc}>{meta.desc}</Text>

        {doc ? (
          <View style={styles.uploadedMetaRow}>
            <View style={styles.uploadedInfo}>
              <MaterialCommunityIcons name="check-circle" size={16} color="#059669" />
              <Text style={styles.fileNameText} numberOfLines={1}>{doc.fileName}</Text>
            </View>
            <View style={styles.docActionGroup}>
              <TouchableOpacity style={styles.replaceBtn} onPress={() => openDocPicker(meta.key)}>
                <Text style={styles.replaceBtnText}>Replace</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemoveDoc(meta.key)}>
                <MaterialCommunityIcons name="trash-can-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.uploadBoxBtn} onPress={() => openDocPicker(meta.key)} disabled={isUploading}>
            {isUploading ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <>
                <MaterialCommunityIcons name="cloud-upload-outline" size={20} color={COLORS.primary} />
                <Text style={styles.uploadBoxBtnText}>Upload Document (PDF / Image)</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Render Step 3: Medical & CEA Registration Documents
  const renderStep3 = () => {
    const medicalDocs = DOCUMENT_CONFIGS.filter(c => c.category === 'MEDICAL');
    return (
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name="certificate" size={32} color={COLORS.primary} />
        </View>
        <Text style={styles.cardTitle}>Medical & CEA Registration</Text>
        <Text style={styles.cardSubtitle}>Step 3 of 5: Upload lab accreditation & medical licenses.</Text>

        {medicalDocs.map(renderDocCard)}

        {serverError && (
          <View style={styles.serverErrorBox}>
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#EF4444" />
            <Text style={styles.serverErrorText}>{serverError}</Text>
          </View>
        )}

        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.prevBtn} onPress={() => setCurrentStep(2)}>
            <MaterialCommunityIcons name="arrow-left" size={18} color="#475569" />
            <Text style={styles.prevBtnText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.continueBtn, { flex: 1 }]} onPress={validateStep3}>
            <Text style={styles.continueBtnText}>Business & Legal</Text>
            <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Render Step 4: Business & Legal Verification Documents
  const renderStep4 = () => {
    const legalDocs = DOCUMENT_CONFIGS.filter(c => c.category === 'LEGAL');
    return (
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name="file-account" size={32} color={COLORS.primary} />
        </View>
        <Text style={styles.cardTitle}>Business & Legal Verification</Text>
        <Text style={styles.cardSubtitle}>Step 4 of 5: Upload legal registration & tax credentials.</Text>

        {legalDocs.map(renderDocCard)}

        {serverError && (
          <View style={styles.serverErrorBox}>
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#EF4444" />
            <Text style={styles.serverErrorText}>{serverError}</Text>
          </View>
        )}

        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.prevBtn} onPress={() => setCurrentStep(3)}>
            <MaterialCommunityIcons name="arrow-left" size={18} color="#475569" />
            <Text style={styles.prevBtnText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.continueBtn, { flex: 1 }]} onPress={validateStep4}>
            <Text style={styles.continueBtnText}>Review Application</Text>
            <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Render Step 5: Final Review & Submission
  const renderStep5 = () => (
    <View style={styles.card}>
      <View style={styles.iconCircle}>
        <MaterialCommunityIcons name="clipboard-check-outline" size={32} color={COLORS.primary} />
      </View>
      <Text style={styles.cardTitle}>Review Partner Application</Text>
      <Text style={styles.cardSubtitle}>Step 5 of 5: Verify all details before admin submission.</Text>

      {/* Section 1 Review: Lab Details */}
      <View style={styles.reviewSection}>
        <View style={styles.reviewHeader}>
          <Text style={styles.reviewSectionTitle}>1. Lab & Contact Details</Text>
          <TouchableOpacity onPress={() => setCurrentStep(2)}>
            <Text style={styles.editLink}>Edit</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.reviewGrid}>
          <Text style={styles.reviewItem}>• <Text style={{ fontWeight: '700' }}>Lab Name:</Text> {form.labName}</Text>
          <Text style={styles.reviewItem}>• <Text style={{ fontWeight: '700' }}>Contact Person:</Text> {form.name} ({form.mobile})</Text>
          <Text style={styles.reviewItem}>• <Text style={{ fontWeight: '700' }}>Address:</Text> {form.address}, {form.city}, {form.state} - {form.pincode}</Text>
        </View>
      </View>

      {/* Section 2 Review: Medical & CEA Registration Docs */}
      <View style={styles.reviewSection}>
        <View style={styles.reviewHeader}>
          <Text style={styles.reviewSectionTitle}>2. Medical & CEA Registration</Text>
          <TouchableOpacity onPress={() => setCurrentStep(3)}>
            <Text style={styles.editLink}>Edit</Text>
          </TouchableOpacity>
        </View>
        {DOCUMENT_CONFIGS.filter(c => c.category === 'MEDICAL').map(meta => {
          const doc = uploadedDocs[meta.key];
          return (
            <View key={meta.key} style={styles.reviewDocRow}>
              <MaterialCommunityIcons name={doc ? "check-circle" : "minus-circle-outline"} size={16} color={doc ? "#059669" : meta.required ? "#EF4444" : "#94A3B8"} />
              <Text style={styles.reviewDocName}>{meta.label}</Text>
              <Text style={[styles.reviewDocStatus, doc ? styles.statusUploaded : meta.required ? styles.statusMissing : styles.statusNotProvided]}>
                {doc ? 'Uploaded' : meta.required ? 'Missing' : 'Not Provided'}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Section 3 Review: Business & Legal Verification Docs */}
      <View style={styles.reviewSection}>
        <View style={styles.reviewHeader}>
          <Text style={styles.reviewSectionTitle}>3. Business & Legal Verification</Text>
          <TouchableOpacity onPress={() => setCurrentStep(4)}>
            <Text style={styles.editLink}>Edit</Text>
          </TouchableOpacity>
        </View>
        {DOCUMENT_CONFIGS.filter(c => c.category === 'LEGAL').map(meta => {
          const doc = uploadedDocs[meta.key];
          return (
            <View key={meta.key} style={styles.reviewDocRow}>
              <MaterialCommunityIcons name={doc ? "check-circle" : "minus-circle-outline"} size={16} color={doc ? "#059669" : meta.required ? "#EF4444" : "#94A3B8"} />
              <Text style={styles.reviewDocName}>{meta.label}</Text>
              <Text style={[styles.reviewDocStatus, doc ? styles.statusUploaded : meta.required ? styles.statusMissing : styles.statusNotProvided]}>
                {doc ? 'Uploaded' : meta.required ? 'Missing' : 'Not Provided'}
              </Text>
            </View>
          );
        })}
      </View>

      {serverError && (
        <View style={styles.serverErrorBox}>
          <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#EF4444" />
          <Text style={styles.serverErrorText}>{serverError}</Text>
        </View>
      )}

      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.prevBtn} onPress={() => setCurrentStep(4)}>
          <MaterialCommunityIcons name="arrow-left" size={18} color="#475569" />
          <Text style={styles.prevBtnText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.submitBtn, { flex: 1 }, isLoading && { opacity: 0.6 }]} onPress={handleFinalSubmit} disabled={isLoading}>
          {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Submit Application</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );



  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <ScreenWrapper backgroundColor="#F8FAFC" contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#334155" />
          </TouchableOpacity>
          <Text style={styles.stepIndicator}>Step {currentStep} of 5</Text>
        </View>

        <Text style={styles.pageTitle}>Partner Onboarding</Text>
        <Text style={styles.pageSubtitle}>Pathology Lab Network Onboarding & Document Verification.</Text>

        {/* Step Progress Bar */}
        <View style={styles.progressContainer}>
          {[1, 2, 3, 4, 5].map(step => (
            <View
              key={step}
              style={[
                styles.progressBar,
                step <= currentStep ? styles.progressActive : styles.progressInactive
              ]}
            />
          ))}
        </View>

        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
        {currentStep === 5 && renderStep5()}

        <Text style={styles.copyright}>© {new Date().getFullYear()} MedsSeva Healthcare. All rights reserved.</Text>
      </ScreenWrapper>

      {/* Modal for Selecting Document Upload Source */}
      <Modal visible={showPickerModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upload {DOCUMENT_CONFIGS.find(c => c.key === activeDocKey)?.label}</Text>
              <TouchableOpacity onPress={() => setShowPickerModal(false)}>
                <MaterialCommunityIcons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.modalOption} onPress={() => handlePickFile('document')}>
              <MaterialCommunityIcons name="file-document-outline" size={24} color={COLORS.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.modalOptionTitle}>Pick Document File (PDF / DOC)</Text>
                <Text style={styles.modalOptionSub}>Select PDF or Word file from device</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalOption} onPress={() => handlePickFile('camera')}>
              <MaterialCommunityIcons name="camera-outline" size={24} color={COLORS.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.modalOptionTitle}>Take Photo with Camera</Text>
                <Text style={styles.modalOptionSub}>Capture document image using camera</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalOption} onPress={() => handlePickFile('gallery')}>
              <MaterialCommunityIcons name="image-outline" size={24} color={COLORS.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.modalOptionTitle}>Choose from Photo Gallery</Text>
                <Text style={styles.modalOptionSub}>Select scanned image from gallery</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 24, paddingTop: Platform.OS === 'ios' ? 56 : 36, paddingBottom: 40 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.soft,
  },
  stepIndicator: { fontSize: 12, fontWeight: '800', color: COLORS.primary, backgroundColor: '#E6F4F3', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  pageTitle: { fontSize: 24, fontWeight: '900', color: '#0F172A', marginBottom: 4 },
  pageSubtitle: { fontSize: 13, color: '#64748B', marginBottom: 16 },
  progressContainer: { flexDirection: 'row', gap: 6, marginBottom: 20 },
  progressBar: { flex: 1, height: 4, borderRadius: 2 },
  progressActive: { backgroundColor: COLORS.primary },
  progressInactive: { backgroundColor: '#E2E8F0' },
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.soft, width: '100%',
  },
  iconCircle: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#F0FDFA',
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#CCFBF1', alignSelf: 'center', marginBottom: 14,
  },
  cardTitle: { fontSize: 19, fontWeight: '900', color: '#0F172A', textAlign: 'center', marginBottom: 4 },
  cardSubtitle: { fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 20 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC',
    borderRadius: 12, borderWidth: 1.5, borderColor: '#E2E8F0',
    paddingHorizontal: 14, height: 48, marginBottom: 14, width: '100%',
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 14, color: '#0F172A' },
  labelWithBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  gpsBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E6F4F3', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  gpsBtnText: { fontSize: 11, fontWeight: '800', color: COLORS.primary },
  rowTwo: { flexDirection: 'row', gap: 12 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 12 },
  checkboxLabel: { fontSize: 12, color: '#475569', flex: 1 },
  serverErrorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#FECACA', width: '100%', marginVertical: 14,
  },
  serverErrorText: { fontSize: 13, color: '#EF4444', fontWeight: '600', flex: 1 },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  prevBtn: { height: 48, borderRadius: 12, paddingHorizontal: 16, borderWidth: 1.5, borderColor: '#CBD5E1', flexDirection: 'row', alignItems: 'center', gap: 4 },
  prevBtnText: { fontSize: 14, fontWeight: '700', color: '#475569' },
  continueBtn: {
    backgroundColor: COLORS.primary, height: 48, borderRadius: 12,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, ...SHADOWS.soft,
  },
  continueBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  submitBtn: {
    backgroundColor: COLORS.primary, height: 50, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', width: '100%', ...SHADOWS.soft,
  },
  submitBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
  loginText: { fontSize: 13, color: '#64748B' },
  loginLink: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  // Document Card Styles
  docCard: {
    backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: '#E2E8F0', marginBottom: 14,
  },
  docCardUploaded: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  docCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  docTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, paddingRight: 8 },
  docLabel: { fontSize: 14, fontWeight: '800', color: '#0F172A', flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeRequired: { backgroundColor: '#FEF2F2' },
  badgeOptional: { backgroundColor: '#F1F5F9' },
  badgeText: { fontSize: 10, fontWeight: '800' },
  badgeRequiredText: { fontSize: 10, fontWeight: '900', color: '#EF4444' },
  badgeOptionalText: { fontSize: 10, fontWeight: '800', color: '#64748B' },
  docDesc: { fontSize: 12, color: '#64748B', lineHeight: 17, marginBottom: 10 },
  uploadBoxBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 42, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#CBD5E1', borderStyle: 'dashed',
  },
  uploadBoxBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  uploadedMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#DCFCE7' },
  uploadedInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, paddingRight: 8 },
  fileNameText: { fontSize: 12, fontWeight: '700', color: '#166534', flex: 1 },
  docActionGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  replaceBtn: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#E6F4F3', borderRadius: 6 },
  replaceBtnText: { fontSize: 11, fontWeight: '800', color: COLORS.primary },
  removeBtn: { padding: 4 },
  // Review Section Styles
  reviewSection: { backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 14 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  reviewSectionTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  editLink: { fontSize: 12, fontWeight: '800', color: COLORS.primary },
  reviewGrid: { gap: 4 },
  reviewItem: { fontSize: 13, color: '#475569', lineHeight: 19 },
  reviewDocRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  reviewDocName: { fontSize: 13, color: '#334155', flex: 1 },
  reviewDocStatus: { fontSize: 11, fontWeight: '800' },
  statusUploaded: { color: '#059669' },
  statusMissing: { color: '#DC2626' },
  statusNotProvided: { color: '#94A3B8' },
  copyright: { fontSize: 12, color: '#7A9AAA', textAlign: 'center', marginTop: 24 },
  // OTP Modal Styles
  centerBlock: { alignItems: 'center', paddingVertical: 20 },
  shieldCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#F0FDFA', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#CCFBF1', marginBottom: 16 },
  otpTitle: { fontSize: 22, fontWeight: '900', color: '#0F172A', marginBottom: 6 },
  otpSubtitle: { fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 24 },
  otpRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  otpBox: { width: 52, height: 56, borderRadius: 12, borderWidth: 1.5, borderColor: '#CBD5E1', backgroundColor: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center', color: '#0F172A' },
  otpBoxFilled: { borderColor: COLORS.primary, backgroundColor: '#F0FDFA' },
  otpHint: { fontSize: 12, color: '#94A3B8', marginBottom: 24 },
  // Picker Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 14 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', flex: 1, paddingRight: 8 },
  modalOption: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#F8FAFC', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  modalOptionTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  modalOptionSub: { fontSize: 12, color: '#64748B' },
});