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

  const currentColors = {
    bg: '#F8FAFC',
    card: '#fff',
    text: '#0F172A',
    subText: '#64748B',
    border: '#E2E8F0',
    iconBg: '#F0FDFA',
    divider: '#F1F5F9',
  };

  return (
    <View style={[styles.container, { backgroundColor: currentColors.bg }]}>
      <StatusBar barStyle="dark-content" backgroundColor={currentColors.bg} />
      <ScreenWrapper contentContainerStyle={[styles.content, { backgroundColor: currentColors.bg }]}>
        
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