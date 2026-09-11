import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  StatusBar, ActivityIndicator, Alert
} from 'react-native';
import ScreenWrapper from '../../src/components/ScreenWrapper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useDispatch } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tokenStorage } from '../../src/utils/tokenStorage';
import { logout } from '../../src/store/slices/authSlice';
import { apiService } from '../../src/services/api';
import { COLORS, SHADOWS } from '../../src/theme/theme';

export default function DoctorProfileScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiService.getDoctorPortalData('ALL')
      .then(res => setData(res))
      .catch(err => console.error('Failed to load profile', err))
      .finally(() => setIsLoading(false));
  }, []);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to log out of Doctor Portal?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await tokenStorage.deleteItem('token');
              await AsyncStorage.removeItem('user');
              dispatch(logout());
              router.replace('/(auth)/doctor-login' as any);
            } catch (e) {
              console.error('Logout error', e);
            }
          },
        },
      ]
    );
  };

  const doc = data?.doctor;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScreenWrapper
        backgroundColor="#F8FAFC"
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 8,
            paddingBottom: 80 + insets.bottom,
          },
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Doctor Profile</Text>
          <Text style={styles.subtitle}>Verified Medical Professional Account</Text>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Identity Card */}
            <View style={styles.card}>
              <View style={styles.avatarRow}>
                <View style={styles.avatarCircle}>
                  <MaterialCommunityIcons name="stethoscope" size={32} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.doctorName}>Dr. {doc?.name || 'Doctor'}</Text>
                  <Text style={styles.doctorSub}>{doc?.designation || 'Consultant Specialist'}</Text>
                  <View style={styles.verifiedBadge}>
                    <MaterialCommunityIcons name="check-decagram" size={14} color="#10B981" />
                    <Text style={styles.verifiedText}>MedsSeva Verified</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Credentials Section */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Medical Credentials</Text>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Council Registration No</Text>
                <Text style={styles.infoValue}>{doc?.registrationNo || 'MCI Reg'}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Degree / Qualification</Text>
                <Text style={styles.infoValue}>{doc?.qualification || 'MBBS'}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Specialization</Text>
                <Text style={styles.infoValue}>{doc?.specialization || 'Pathology'}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Doctor Code</Text>
                <Text style={styles.infoValue}>{doc?.code || 'DOC-MEDS'}</Text>
              </View>
            </View>

            {/* Payout & Settlement Info */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Settlement & Commission Terms</Text>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Commission Rate</Text>
                <Text style={[styles.infoValue, { color: '#059669', fontWeight: '900' }]}>
                  {doc?.commissionRate ?? 30}% Per Booking
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Payout Settlement Cycle</Text>
                <Text style={styles.infoValue}>{doc?.paymentCycle || 'MONTHLY'}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Associated Lab Branch</Text>
                <Text style={styles.infoValue}>{doc?.branch?.name || 'Central Diagnostic Lab'}</Text>
              </View>
            </View>

            {/* Logout Button */}
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.88}>
              <MaterialCommunityIcons name="logout" size={20} color="#EF4444" />
              <Text style={styles.logoutBtnText}>Logout from Doctor Portal</Text>
            </TouchableOpacity>
          </>
        )}
      </ScreenWrapper>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 16, paddingBottom: 60 },
  header: { marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '900', color: '#0F172A' },
  subtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    ...SHADOWS.soft,
  },
  avatarRow: { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#006D6F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  doctorName: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  doctorSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  verifiedText: { fontSize: 10, fontWeight: '800', color: '#059669' },

  sectionTitle: { fontSize: 14, fontWeight: '900', color: '#0F172A', marginBottom: 12 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoLabel: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  infoValue: { fontSize: 13, color: '#0F172A', fontWeight: '800' },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    height: 50,
    borderRadius: 14,
    marginTop: 10,
    marginBottom: 20,
  },
  logoutBtnText: { fontSize: 14, fontWeight: '800', color: '#EF4444' },
});
