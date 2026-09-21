import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Switch,
  StatusBar, Alert
} from 'react-native';
import ScreenWrapper from '../../../src/components/ScreenWrapper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import { COLORS, SHADOWS } from '../../../src/theme/theme';

export default function SettingsScreen() {
  const router = useRouter();
  
  // Local state for UI functionality
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [biometricAuth, setBiometricAuth] = useState(false);

  const handleToggle = (setter: React.Dispatch<React.SetStateAction<boolean>>, name: string) => (val: boolean) => {
    setter(val);
    Toast.show({
      type: 'success',
      text1: `${name} ${val ? 'Enabled' : 'Disabled'}`,
      position: 'bottom',
    });
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: () => console.log('Account deletion requested') 
        }
      ]
    );
  };

  const isDark = darkMode;
  const currentColors = {
    bg: isDark ? '#0F172A' : '#F8FAFC',
    card: isDark ? '#1E293B' : '#fff',
    text: isDark ? '#F1F5F9' : '#0F172A',
    subText: isDark ? '#94A3B8' : '#64748B',
    border: isDark ? '#334155' : '#E2E8F0',
    iconBg: isDark ? '#334155' : '#F0FDFA',
    divider: isDark ? '#334155' : '#F1F5F9',
  };

  return (
    <View style={[styles.container, { backgroundColor: currentColors.bg }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={currentColors.bg} />
      <ScreenWrapper contentContainerStyle={[styles.content, { backgroundColor: currentColors.bg }]}>
        
        {/* Notifications Section */}
        <View style={[styles.section, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.sectionIcon, { backgroundColor: currentColors.iconBg }]}>
              <MaterialCommunityIcons name="bell-ring-outline" size={18} color={COLORS.primary} />
            </View>
            <Text style={[styles.sectionTitle, { color: currentColors.text }]}>Notification Preferences</Text>
          </View>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: currentColors.text }]}>Push & SMS Alerts</Text>
              <Text style={[styles.settingDesc, { color: currentColors.subText }]}>Receive alerts for new bookings</Text>
            </View>
            <Switch
              value={pushNotifications}
              onValueChange={handleToggle(setPushNotifications, 'Push Alerts')}
              trackColor={{ false: '#E2E8F0', true: COLORS.primary + '80' }}
              thumbColor={pushNotifications ? COLORS.primary : '#f4f3f4'}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: currentColors.divider }]} />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: currentColors.text }]}>Email Alerts</Text>
              <Text style={[styles.settingDesc, { color: currentColors.subText }]}>Weekly reports and payouts</Text>
            </View>
            <Switch
              value={emailAlerts}
              onValueChange={handleToggle(setEmailAlerts, 'Email Alerts')}
              trackColor={{ false: '#E2E8F0', true: COLORS.primary + '80' }}
              thumbColor={emailAlerts ? COLORS.primary : '#f4f3f4'}
            />
          </View>
        </View>

        {/* App Preferences Section */}
        <View style={[styles.section, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.sectionIcon, { backgroundColor: currentColors.iconBg }]}>
              <MaterialCommunityIcons name="cellphone-cog" size={18} color={COLORS.primary} />
            </View>
            <Text style={[styles.sectionTitle, { color: currentColors.text }]}>App Preferences</Text>
          </View>

          <TouchableOpacity style={styles.settingRow} activeOpacity={0.7} onPress={() => Toast.show({ type: 'info', text1: 'Language set to English', position: 'bottom' })}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: currentColors.text }]}>Language</Text>
              <Text style={[styles.settingDesc, { color: currentColors.subText }]}>English</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={currentColors.subText} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: currentColors.divider }]} />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: currentColors.text }]}>Dark Mode</Text>
              <Text style={[styles.settingDesc, { color: currentColors.subText }]}>Switch to a darker theme</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: '#E2E8F0', true: COLORS.primary + '80' }}
              thumbColor={darkMode ? COLORS.primary : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Security Section */}
        <View style={[styles.section, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.sectionIcon, { backgroundColor: currentColors.iconBg }]}>
              <MaterialCommunityIcons name="shield-check-outline" size={18} color={COLORS.primary} />
            </View>
            <Text style={[styles.sectionTitle, { color: currentColors.text }]}>Security</Text>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: currentColors.text }]}>Biometric Login</Text>
              <Text style={[styles.settingDesc, { color: currentColors.subText }]}>Use FaceID or Fingerprint</Text>
            </View>
            <Switch
              value={biometricAuth}
              onValueChange={handleToggle(setBiometricAuth, 'Biometric Login')}
              trackColor={{ false: '#E2E8F0', true: COLORS.primary + '80' }}
              thumbColor={biometricAuth ? COLORS.primary : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Account Management Section */}
        <View style={[styles.section, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.sectionIcon, { backgroundColor: currentColors.iconBg }]}>
              <MaterialCommunityIcons name="account-cog-outline" size={18} color={COLORS.primary} />
            </View>
            <Text style={[styles.sectionTitle, { color: currentColors.text }]}>Account Management</Text>
          </View>

          <TouchableOpacity style={[styles.destructiveBtn, { backgroundColor: isDark ? '#3F1616' : '#FEF2F2', borderColor: isDark ? '#EF4444' : '#FEE2E2' }]} onPress={handleDeleteAccount} activeOpacity={0.7}>
            <MaterialCommunityIcons name="delete-outline" size={20} color="#EF4444" />
            <Text style={styles.destructiveBtnText}>Request Account Deletion</Text>
          </TouchableOpacity>
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
    marginBottom: 16,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  sectionIcon: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#F0FDFA',
    justifyContent: 'center', alignItems: 'center',
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 4,
  },
  settingInfo: { flex: 1, paddingRight: 16 },
  settingLabel: { fontSize: 15, fontWeight: '600', color: '#1E293B', marginBottom: 2 },
  settingDesc: { fontSize: 12, color: '#64748B' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 14 },
  destructiveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#FEF2F2', paddingVertical: 14, borderRadius: 12,
    borderWidth: 1, borderColor: '#FEE2E2',
  },
  destructiveBtnText: { fontSize: 14, fontWeight: '700', color: '#EF4444' },
});