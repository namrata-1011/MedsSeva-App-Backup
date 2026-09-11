import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, StatusBar,
} from 'react-native';
import ScreenWrapper from '@/src/components/ScreenWrapper';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import Toast from 'react-native-toast-message';

import { RootState, AppDispatch } from '@/src/store';
import { apiService } from '@/src/services/api';
import { updateProfileAndPersist } from '@/src/store/slices/authSlice';
import { COLORS, SHADOWS } from '@/src/theme/theme';

export default function EditProfileScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((s: RootState) => s.auth.user);

  const [name, setName] = useState(user?.name || '');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiService.getPartnerProfile().then((p: any) => {
      setAddress(p.address || '');
      setCity(p.city || '');
      setState(p.state || '');
      setPincode(p.pincode || '');
    }).catch(() => {}).finally(() => setIsLoading(false));
  }, []);

  const handleDetectLocation = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({ type: 'error', text1: 'Location permission denied' });
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const reverse = await Location.reverseGeocodeAsync(loc.coords);
      const place = reverse[0];
      if (place) {
        const line = [place.streetNumber, place.street].filter(Boolean).join(' ');
        setAddress(line || place.name || '');
        setCity(place.city || place.subregion || '');
        setState(place.region || '');
        setPincode(place.postalCode || '');
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to detect location' });
    } finally {
      setIsLocating(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Toast.show({ type: 'error', text1: 'Name is required' });
      return;
    }
    setIsSaving(true);
    try {
   await (apiService as any).updatePartnerProfile({ name: name.trim(), address, city, state, pincode });
      await dispatch(updateProfileAndPersist({ name: name.trim() }));
      Toast.show({ type: 'success', text1: 'Your profile has been updated.' });
      router.back();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e?.response?.data?.error || 'Failed to update profile' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

const saveButton = (
    <TouchableOpacity
      style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
      onPress={handleSave}
      disabled={isSaving}
      activeOpacity={0.85}
    >
      {isSaving
        ? <ActivityIndicator color="#fff" size="small" />
        : <Text style={styles.saveBtnText}>Save Changes</Text>
      }
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScreenWrapper bottomButton={saveButton} contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter your full name"
              placeholderTextColor="#94A3B8"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Mobile Number</Text>
            <View style={[styles.input, styles.readonlyInput]}>
              <Text style={styles.readonlyText}>{user?.mobile || '-'}</Text>
              <View style={styles.verifiedBadge}>
                <MaterialCommunityIcons name="check-circle" size={14} color="#059669" />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email Address</Text>
            <View style={[styles.input, styles.readonlyInput]}>
              <Text style={styles.readonlyText}>{user?.email || 'Not set'}</Text>
              {user?.email && (
                <View style={styles.verifiedBadge}>
                  <MaterialCommunityIcons name="check-circle" size={14} color="#059669" />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Address</Text>
            <TouchableOpacity
              style={styles.detectBtn}
              onPress={handleDetectLocation}
              disabled={isLocating}
            >
              {isLocating
                ? <ActivityIndicator size="small" color={COLORS.primary} />
                : <MaterialCommunityIcons name="crosshairs-gps" size={16} color={COLORS.primary} />
              }
              <Text style={styles.detectBtnText}>
                {isLocating ? 'Detecting...' : 'Refresh Location'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Address</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              value={address}
              onChangeText={setAddress}
              placeholder="Street address"
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={2}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>City</Text>
              <TextInput
                style={styles.input}
                value={city}
                onChangeText={setCity}
                placeholder="City"
                placeholderTextColor="#94A3B8"
              />
            </View>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.label}>Pincode</Text>
              <TextInput
                style={styles.input}
                value={pincode}
                onChangeText={setPincode}
                placeholder="Pincode"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>State</Text>
            <TextInput
              style={styles.input}
              value={state}
              onChangeText={setState}
              placeholder="State"
              placeholderTextColor="#94A3B8"
            />
          </View>
        </View>

</ScreenWrapper>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
 
  content: { padding: 16, paddingBottom: 40 },
  section: {
    backgroundColor: '#fff', borderRadius: 18, padding: 20,
    borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16, ...SHADOWS.soft,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A', marginBottom: 16 },
  detectBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F0FDFA', paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1, borderColor: '#CCFBF1',
  },
  detectBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  fieldGroup: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '700', color: '#64748B', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#0F172A', fontWeight: '500',
  },
  multilineInput: { minHeight: 60, textAlignVertical: 'top' },
  readonlyInput: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F1F5F9',
  },
  readonlyText: { fontSize: 14, color: '#64748B', fontWeight: '500', flex: 1 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  verifiedText: { fontSize: 11, fontWeight: '700', color: '#059669' },
  row: { flexDirection: 'row' },
  saveBtn: {
    backgroundColor: COLORS.primary, borderRadius: 16, height: 52,
    justifyContent: 'center', alignItems: 'center', marginTop: 4,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
