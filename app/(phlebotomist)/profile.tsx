import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, StatusBar
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenWrapper from '../../src/components/ScreenWrapper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'expo-router';
import { RootState } from '../../src/store';
import { logout } from '../../src/store/slices/authSlice';
import { tokenStorage } from '../../src/utils/tokenStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SHADOWS } from '../../src/theme/theme';
import { showSuccess } from '../../src/store/toastStore';

export default function PhlebotomistProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector((s: RootState) => s.auth.user as any);
  const isEmployee = user?.userType === 'FREELANCER' ? false : !!(
    user?.isEmployee === true ||
    user?.phlebotomistType === 'EMPLOYEE' ||
    user?.userType === 'STAFF' ||
    user?.userType === 'EMPLOYEE' ||
    user?.adminUser ||
    !!(user?.designation && /phlebotomist|collector|phlebo/i.test(user.designation))
  );
  const isFreelancer = !isEmployee;
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out from your Phlebotomist account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setLoggingOut(true);
            try {
              await tokenStorage.deleteItem('token');
              await AsyncStorage.removeItem('user');
              dispatch(logout());
              showSuccess('Logged out successfully');
              router.replace('/onboarding' as any);
            } catch {
              router.replace('/onboarding' as any);
            } finally {
              setLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScreenWrapper scrollable={false} backgroundColor="#F8FAFC">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      {/* Top Header with Safe Area Insets */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 6 }]}>
        <Text style={styles.headerTitle}>Account & Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarLarge}>
            <MaterialCommunityIcons name="needle" size={32} color="#006D6F" />
          </View>
          <Text style={styles.profileName}>{user?.name || 'Phlebotomist'}</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.roleBadge, !isFreelancer && { backgroundColor: '#EFF6FF' }]}>
              <Text style={[styles.roleBadgeText, !isFreelancer && { color: '#1D4ED8' }]}>
                {isFreelancer ? 'Freelance Collection Partner (30%)' : 'In-House Staff (Branch Phlebotomist)'}
              </Text>
            </View>
          </View>
          <Text style={styles.mobileText}>{user?.mobile || user?.phone || 'Verified Executive'}</Text>
        </View>

        {/* Commission & Terms Card (Freelancer) vs Staff & Branch Details (Employee) */}
        {isFreelancer ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Partner Terms & Payout</Text>

            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="percent" size={18} color="#059669" />
              <Text style={styles.infoLabel}>Commission Rate</Text>
              <Text style={[styles.infoValue, { color: '#059669', fontWeight: '900' }]}>30.0% / Test</Text>
            </View>

            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="calendar-sync" size={18} color="#006D6F" />
              <Text style={styles.infoLabel}>Payout Frequency</Text>
              <Text style={styles.infoValue}>Weekly Transfer</Text>
            </View>

            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="hospital-building" size={18} color="#64748B" />
              <Text style={styles.infoLabel}>Assigned Branch</Text>
              <Text style={styles.infoValue}>{user?.partner?.labName || 'Central Processing Lab'}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Staff & Branch Details</Text>

            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="badge-account-horizontal-outline" size={18} color="#006D6F" />
              <Text style={styles.infoLabel}>Designation</Text>
              <Text style={[styles.infoValue, { color: '#0F172A', fontWeight: '700' }]}>{user?.designation || 'In-House Phlebotomist'}</Text>
            </View>

            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="hospital-building" size={18} color="#64748B" />
              <Text style={styles.infoLabel}>Assigned Branch</Text>
              <Text style={styles.infoValue}>{user?.branchName || 'Assigned Branch'}</Text>
            </View>
          </View>
        )}

        {/* App & Support Shortcuts */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Support & Help</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/support' as any)}
          >
            <MaterialCommunityIcons name="headset" size={20} color="#006D6F" />
            <Text style={styles.menuItemText}>Lab Support & Helpdesk</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/legal/privacy-policy' as any)}
          >
            <MaterialCommunityIcons name="shield-check-outline" size={20} color="#006D6F" />
            <Text style={styles.menuItemText}>Privacy Policy & Terms</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutBtn}
          disabled={loggingOut}
          onPress={handleLogout}
        >
          {loggingOut ? (
            <ActivityIndicator color="#E11D48" />
          ) : (
            <>
              <MaterialCommunityIcons name="logout" size={20} color="#E11D48" />
              <Text style={styles.logoutBtnText}>Sign Out from Portal</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    ...SHADOWS.sm,
  },
  avatarLarge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#E6F4F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  badgeRow: {
    marginTop: 4,
    marginBottom: 4,
  },
  roleBadge: {
    backgroundColor: '#DEF7EC',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#03543F',
  },
  mobileText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    ...SHADOWS.sm,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoLabel: {
    flex: 1,
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
    marginLeft: 10,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  menuItemText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    marginLeft: 10,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginTop: 10,
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#E11D48',
  },
});
