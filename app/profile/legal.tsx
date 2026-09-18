import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Image,
} from 'react-native';
import ScreenWrapper from '../../src/components/ScreenWrapper';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useRouter } from 'expo-router';
import { COLORS, SHADOWS } from '../../src/theme/theme';

type LegalItem = {
  icon: string;
  label: string;
  subtitle: string;
  onPress: () => void;
};

function LegalRow({ icon, label, subtitle, onPress }: LegalItem) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.rowIcon}>
        <MaterialCommunityIcons name={icon as any} size={22} color={COLORS.primary} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color="#CBD5E1" />
    </TouchableOpacity>
  );
}

export default function LegalScreen() {
  const router = useRouter();


  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Legal</Text>
        <View style={{ width: 40 }} />
      </View>

   <ScreenWrapper contentContainerStyle={styles.scroll}>
        <View style={styles.bannerCard}>
          <View style={styles.bannerIcon}>
            <Image source={require('../../assets/images/logo.png')} style={{ width: 140, height: 50 }} resizeMode="contain" />
          </View>
          <Text style={styles.bannerTitle}>MedsSeva Policies & Guidelines</Text>
        </View>

<View style={styles.group}>
 <LegalRow
            icon="file-document-outline"
            label="Terms & Conditions"
            subtitle="Rules and guidelines for using MedsSeva"
            onPress={() => router.push({ pathname: '/legal/LegalWebView', params: { type: 'terms' } })}
          />
          <View style={styles.divider} />
          <LegalRow
            icon="shield-check-outline"
            label="Privacy Policy"
            subtitle="How we manage and protect your data"
            onPress={() => router.push({ pathname: '/legal/LegalWebView', params: { type: 'privacy' } })}
          />
          <View style={styles.divider} />
          <LegalRow
            icon="information-outline"
            label="About Us"
            subtitle="Our mission and healthcare commitment"
            onPress={() => router.push({ pathname: '/legal/LegalWebView', params: { type: 'about' } })}
          />
        </View>

        <View style={styles.footer}>
        
         
        
        </View>
        <Text style={styles.footerVersion}>App Version 1.0.0 (Build 42)</Text>
      <Text style={styles.footerCopy}>© {new Date().getFullYear()} MedsSeva Diagnostics Private Limited</Text>
</ScreenWrapper>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === 'ios' ? 56 : 48,
    paddingBottom: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  scroll: {
    padding: 20,
    paddingBottom: 48,
  },
  bannerCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    ...SHADOWS.soft,
  },
  bannerIcon: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 8,
  },
  bannerSub: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
  group: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    ...SHADOWS.soft,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,109,111,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1B1B1B',
  },
  rowSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginLeft: 74,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 8,
  },
  footerLine: {
    width: 28,
    height: 2,
    borderRadius: 1,
    backgroundColor: COLORS.primary,
  },
  footerBrand: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  footerVersion: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 4,
  },
  footerCopy: {
    fontSize: 11,
    color: '#CBD5E1',
    textAlign: 'center',
  },
});