import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Dimensions,
  ActivityIndicator,
  Image,
  Platform,
  KeyboardAvoidingView,
  StatusBar,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { apiService } from '../services/api';
import { COLORS, TYPOGRAPHY, SHADOWS } from '../theme/theme';
import { showSuccess, showError } from '../store/toastStore';
import { ensurePhotosPermission } from '../utils/imagePicker';

const { width, height } = Dimensions.get('window');

const MAX_FILE_SIZE = 20 * 1024 * 1024;

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'doc', 'docx'];

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

interface SelectedFile {
  uri: string;
  name: string;
  size: number;
  mimeType: string;
  source: 'camera' | 'gallery' | 'files';
  isImage: boolean;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onUploadSuccess?: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string): string {
  if (mimeType === 'application/pdf') return 'file-pdf-box';
  if (mimeType === 'application/msword' || mimeType.includes('wordprocessingml')) return 'file-word-box';
  return 'file-image';
}

function getFileIconColor(mimeType: string): string {
  if (mimeType === 'application/pdf') return '#EF4444';
  if (mimeType === 'application/msword' || mimeType.includes('wordprocessingml')) return '#2563EB';
  return COLORS.primary;
}

export function PrescriptionUploadModal({ visible, onClose, onUploadSuccess }: Props) {
  const user = useSelector((state: RootState) => state.auth.user);
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [notes, setNotes] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const validateFile = (name: string, mimeType: string, size: number): string | null => {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return `Unsupported file type. Allowed: JPG, PNG, WEBP, PDF, DOC, DOCX`;
    }
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return `Invalid file format detected.`;
    }
    if (size > MAX_FILE_SIZE) {
      return `File size exceeds 20 MB limit. Your file is ${formatFileSize(size)}.`;
    }
    return null;
  };

  const handleCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showError('Camera access is needed to capture prescriptions.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    const name = `prescription_${Date.now()}.jpg`;
    const mimeType = 'image/jpeg';
    const size = asset.fileSize || 0;
    const error = validateFile(name, mimeType, size);
    if (error) { showError(error); return; }
    setSelectedFile({ uri: asset.uri, name, size, mimeType, source: 'camera', isImage: true });
  };

  const handleGallery = async () => {
    const hasPermission = await ensurePhotosPermission();
    if (!hasPermission) {
      showError('Gallery access is needed to pick prescriptions.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'livePhotos'],
      quality: 0.85,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    const ext = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
    const name = asset.fileName || `prescription_${Date.now()}.${ext}`;
    const mimeType = asset.mimeType || `image/${ext}`;
    const size = asset.fileSize || 0;
    const error = validateFile(name, mimeType, size);
    if (error) { showError(error); return; }
    setSelectedFile({ uri: asset.uri, name, size, mimeType, source: 'gallery', isImage: true });
  };

  const handleDocumentPicker = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    const name = asset.name;
    const mimeType = asset.mimeType || 'application/octet-stream';
    const size = asset.size || 0;
    const error = validateFile(name, mimeType, size);
    if (error) { showError(error); return; }
    const isImage = mimeType.startsWith('image/');
    setSelectedFile({ uri: asset.uri, name, size, mimeType, source: 'files', isImage });
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      showError('Please select a prescription file before uploading.');
      return;
    }
    console.log('[Prescription] Starting upload for file:', selectedFile.name, selectedFile.mimeType, 'Size:', selectedFile.size);
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: Platform.OS === 'android' ? selectedFile.uri : selectedFile.uri.replace('file://', ''),
        name: selectedFile.name,
        type: selectedFile.mimeType,
      } as any);
      if (notes.trim()) {
        formData.append('notes', notes.trim());
      }
      console.log('[Prescription] Sending FormData to /api/prescriptions/upload...');
      const res = await apiService.uploadPrescription(formData);
      console.log('[Prescription] Upload SUCCESS! Cloudinary URL:', res?.data?.fileUrl || res);
      setSelectedFile(null);
      setNotes('');
      if (onUploadSuccess) onUploadSuccess();
      onClose();
      showSuccess('Prescription uploaded successfully. Our team will review it shortly.');
    } catch (error: any) {
      console.error('[Prescription] Upload ERROR:', error?.response?.data || error?.message);
      const msg = error?.response?.data?.message || 'Upload failed. Please try again.';
      showError(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (isUploading) return;
    setSelectedFile(null);
    setNotes('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          style={styles.kavWrapper}
          behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : StatusBar.currentHeight ?? 0}
        >
          <View style={styles.sheet}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              bounces={false}
            >
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <View style={styles.headerIconBox}>
                    <MaterialCommunityIcons name="file-document-edit-outline" size={20} color={COLORS.primary} />
                  </View>
                  <Text style={styles.headerTitle}>Upload Prescription</Text>
                </View>
                <TouchableOpacity style={styles.closeBtn} onPress={handleClose} disabled={isUploading}>
                  <MaterialCommunityIcons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              <Text style={styles.headerSubtitle}>
                Upload your prescription and our team will identify the required tests and assist with booking.
              </Text>

              {!selectedFile ? (
                <View style={styles.uploadOptionsSection}>
                  <View style={styles.uploadOptionsRow}>
                    <TouchableOpacity style={styles.uploadOption} onPress={handleCamera} activeOpacity={0.8}>
                      <View style={[styles.uploadOptionIcon, { backgroundColor: '#EFF6FF' }]}>
                        <MaterialCommunityIcons name="camera-outline" size={26} color="#2563EB" />
                      </View>
                      <Text style={styles.uploadOptionText}>Camera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.uploadOption} onPress={handleGallery} activeOpacity={0.8}>
                      <View style={[styles.uploadOptionIcon, { backgroundColor: '#F0FDF4' }]}>
                        <MaterialCommunityIcons name="image-outline" size={26} color="#16A34A" />
                      </View>
                      <Text style={styles.uploadOptionText}>Gallery</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.uploadOption} onPress={handleDocumentPicker} activeOpacity={0.8}>
                      <View style={[styles.uploadOptionIcon, { backgroundColor: '#FEF3C7' }]}>
                        <MaterialCommunityIcons name="folder-open-outline" size={26} color="#D97706" />
                      </View>
                      <Text style={styles.uploadOptionText}>Files</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.formatHint}>
                    Supported: JPG, PNG, WEBP, PDF, DOC, DOCX - Max 20 MB
                  </Text>
                </View>
              ) : (
                <View style={styles.previewSection}>
                  <View style={styles.previewHeader}>
                    <Text style={styles.uploadLabel}>Selected File</Text>
                    <View style={styles.previewActions}>
                      <TouchableOpacity style={styles.replaceBtn} onPress={handleDocumentPicker}>
                        <MaterialCommunityIcons name="swap-horizontal" size={14} color={COLORS.primary} />
                        <Text style={styles.replaceBtnText}>Replace</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.removeBtn} onPress={handleRemoveFile}>
                        <MaterialCommunityIcons name="trash-can-outline" size={14} color="#EF4444" />
                        <Text style={styles.removeBtnText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.previewCard}>
                    {selectedFile.isImage ? (
                      <Image source={{ uri: selectedFile.uri }} style={styles.imagePreview} resizeMode="cover" />
                    ) : (
                      <View style={styles.docPreview}>
                        <MaterialCommunityIcons
                          name={getFileIcon(selectedFile.mimeType) as any}
                          size={48}
                          color={getFileIconColor(selectedFile.mimeType)}
                        />
                      </View>
                    )}
                    <View style={styles.previewMeta}>
                      <Text style={styles.previewFileName} numberOfLines={2}>{selectedFile.name}</Text>
                      <View style={styles.previewMetaRow}>
                        <View style={styles.metaTag}>
                          <MaterialCommunityIcons name="database-outline" size={12} color="#64748B" />
                          <Text style={styles.metaTagText}>{formatFileSize(selectedFile.size)}</Text>
                        </View>
                        <View style={styles.metaTag}>
                          <MaterialCommunityIcons
                            name={selectedFile.source === 'camera' ? 'camera' : selectedFile.source === 'gallery' ? 'image' : 'folder'}
                            size={12}
                            color="#64748B"
                          />
                          <Text style={styles.metaTagText}>
                            {selectedFile.source.charAt(0).toUpperCase() + selectedFile.source.slice(1)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Prescription Notes <Text style={styles.optionalText}>(optional)</Text>
                </Text>
                <TextInput
                  style={styles.textArea}
                  placeholder="Add any notes for our team, e.g. preferred test timing, doctor instructions..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={3}
                  value={notes}
                  onChangeText={setNotes}
                  textAlignVertical="top"
                  scrollEnabled={false}
                />
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, (!selectedFile || isUploading) && styles.submitBtnDisabled]}
                activeOpacity={0.9}
                onPress={handleUpload}
                disabled={!selectedFile || isUploading}
              >
                <LinearGradient
                  colors={(!selectedFile || isUploading) ? ['#94A3B8', '#94A3B8'] : [COLORS.primary, '#14B8A6']}
                  style={styles.gradientBtn}
                >
                  {isUploading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="cloud-upload-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
                      <Text style={styles.submitBtnText}>Upload Prescription</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.secureRow}>
                <MaterialCommunityIcons name="shield-lock-outline" size={13} color="#64748B" />
                <Text style={styles.secureText}>Your prescription is encrypted and stored securely.</Text>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 51, 53, 0.7)',
    justifyContent: 'flex-end',
  },
  kavWrapper: {
    width: '100%',
    maxHeight: height * 0.9,
  },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    ...SHADOWS.soft,
    elevation: 10,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 48,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F0FDFA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  closeBtn: {
    backgroundColor: '#F1F5F9',
    padding: 8,
    borderRadius: 20,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 20,
  },
  uploadLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 12,
  },
  uploadOptionsSection: {
    marginBottom: 20,
  },
  uploadOptionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  uploadOption: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingVertical: 16,
    marginHorizontal: 4,
  },
  uploadOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  uploadOptionText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  formatHint: {
    fontSize: 10,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
  },
  previewSection: {
    marginBottom: 20,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  previewActions: {
    flexDirection: 'row',
    gap: 8,
  },
  replaceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  replaceBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    marginLeft: 4,
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  removeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
    marginLeft: 4,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 14,
  },
  imagePreview: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
  docPreview: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewMeta: {
    flex: 1,
    marginLeft: 14,
  },
  previewFileName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 8,
    lineHeight: 18,
  },
  previewMetaRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metaTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  metaTagText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    marginLeft: 4,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 8,
  },
  optionalText: {
    color: '#94A3B8',
    fontWeight: 'normal',
    fontSize: 11,
  },
  textArea: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 13,
    color: COLORS.textDark,
    minHeight: 80,
  },
  submitBtn: {
    borderRadius: 30,
    overflow: 'hidden',
    ...SHADOWS.soft,
    marginBottom: 12,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  gradientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
  },
  secureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secureText: {
    fontSize: 10,
    color: '#94A3B8',
    marginLeft: 4,
  },
});