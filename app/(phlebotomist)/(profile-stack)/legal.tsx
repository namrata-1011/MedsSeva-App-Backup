import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { COLORS, SHADOWS } from '@/src/theme/theme';

const LEGAL_ITEMS = [
  {
    icon: 'file-document-outline',
    label: 'Terms & Conditions',
    subtitle: 'Our terms of service',
    type: 'terms',
  },
  {
    icon: 'shield-lock-outline',
    label: 'Privacy Policy',
    subtitle: 'How we handle your data',
    type: 'privacy',
  },
  {
    icon: 'information-outline',
    label: 'About App',
    subtitle: 'Version and app information',
    type: 'about',
  },
];

export default function LegalScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
   

      <View style={styles.content}>
        <View style={styles.card}>
          {LEGAL_ITEMS.map((item, idx) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.row, idx < LEGAL_ITEMS.length - 1 && styles.rowBorder]}
           onPress={() => router.push({ pathname: '/legal/LegalWebView', params: { type: item.type } })}
              activeOpacity={0.7}
            >
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name={item.icon as any} size={20} color={COLORS.primary} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>{item.label}</Text>
                <Text style={styles.rowSub}>{item.subtitle}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#CBD5E1" />
            </TouchableOpacity>
          ))}
        </View>
      </View>


    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  content: { padding: 16 },
  card: {
    backgroundColor: '#fff', borderRadius: 18,
    borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.soft,
  },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  iconCircle: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#F0FDFA',
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  rowSub: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
 
});
