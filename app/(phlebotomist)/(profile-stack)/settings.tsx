import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, StatusBar,
} from 'react-native';
import ScreenWrapper from '../../../src/components/ScreenWrapper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import { apiService } from '../../../src/services/api';
import { COLORS, SHADOWS } from '../../../src/theme/theme';

function getStrength(pw: string): { score: number; label: string; color: string } {
  if (pw.length === 0) return { score: 0, label: '', color: '#E2E8F0' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const map = [
    { score: 1, label: 'Weak', color: '#EF4444' },
    { score: 2, label: 'Fair', color: '#F59E0B' },
    { score: 3, label: 'Good', color: '#3B82F6' },
    { score: 4, label: 'Strong', color: '#10B981' },
  ];
  return map[score - 1] || { score: 0, label: '', color: '#E2E8F0' };
}

export default function SettingsScreen() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const strength = getStrength(newPassword);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Toast.show({ type: 'error', text1: 'All fields are required' });
      return;
    }
    if (newPassword.length < 8) {
      Toast.show({ type: 'error', text1: 'New password must be at least 8 characters' });
      return;
    }
    if (newPassword !== confirmPassword) {
      Toast.show({ type: 'error', text1: 'Passwords do not match' });
      return;
    }
    setIsSaving(true);
    try {
      await (apiService as any).changePassword(currentPassword, newPassword);
      Toast.show({ type: 'success', text1: 'Password changed successfully' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e?.response?.data?.error || 'Failed to change password' });
    } finally {
      setIsSaving(false);
    }
  };

const saveButton = (
    <TouchableOpacity
      style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
      onPress={handleChangePassword}
      disabled={isSaving}
      activeOpacity={0.85}
    >
      {isSaving
        ? <ActivityIndicator color="#fff" size="small" />
        : <Text style={styles.saveBtnText}>Update Password</Text>
      }
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScreenWrapper bottomButton={saveButton} contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionIcon}>
              <MaterialCommunityIcons name="lock-outline" size={18} color={COLORS.primary} />
            </View>
            <Text style={styles.sectionTitle}>Change Password</Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Current Password</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter current password"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showCurrent}
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowCurrent(v => !v)}>
                <MaterialCommunityIcons name={showCurrent ? 'eye-off-outline' : 'eye-outline'} size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>New Password</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showNew}
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowNew(v => !v)}>
                <MaterialCommunityIcons name={showNew ? 'eye-off-outline' : 'eye-outline'} size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            {newPassword.length > 0 && (
              <View style={styles.strengthRow}>
                {[1, 2, 3, 4].map(i => (
                  <View
                    key={i}
                    style={[styles.strengthBar, { backgroundColor: i <= strength.score ? strength.color : '#E2E8F0' }]}
                  />
                ))}
                <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
              </View>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Confirm New Password</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter new password"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirm(v => !v)}>
                <MaterialCommunityIcons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            {confirmPassword.length > 0 && newPassword !== confirmPassword && (
              <Text style={styles.errorText}>Passwords do not match</Text>
            )}
          </View>

</View>
      </ScreenWrapper>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
 
  content: { padding: 16, paddingBottom: 40 },
  section: {
    backgroundColor: '#fff', borderRadius: 18, padding: 20,
    borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.soft,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  sectionIcon: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#F0FDFA',
    justifyContent: 'center', alignItems: 'center',
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '700', color: '#64748B', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', position: 'relative' },
  input: {
    flex: 1, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    paddingRight: 44, fontSize: 14, color: '#0F172A', fontWeight: '500',
  },
  eyeBtn: { position: 'absolute', right: 12 },
  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  strengthBar: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: { fontSize: 11, fontWeight: '700', minWidth: 40 },
  errorText: { fontSize: 12, color: '#EF4444', marginTop: 4, fontWeight: '500' },
  saveBtn: {
    backgroundColor: COLORS.primary, borderRadius: 14, height: 50,
    justifyContent: 'center', alignItems: 'center', marginTop: 4,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
