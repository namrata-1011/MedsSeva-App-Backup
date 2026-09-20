import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Platform 
} from 'react-native';
import ScreenWrapper from '../../src/components/ScreenWrapper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { COLORS, TYPOGRAPHY, SHADOWS } from '../../src/theme/theme';

export default function InfoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type: string; title: string }>();
  
  const type = params.type || 'privacy';
  const title = params.title || 'Information';

  const renderPrivacyPolicy = () => (
    <>
      <Text style={styles.introText}>Last updated: May 13, 2026</Text>
      <Text style={styles.paragraph}>
        At MedsSeva, we are committed to protecting your privacy and ensuring your medical data remains fully secured. This policy outlines how we handle patient information.
      </Text>
      
      <Text style={styles.sectionHeader}>1. Data Collection</Text>
      <Text style={styles.paragraph}>
        We collect demographic details, contact numbers, and medical test prescriptions solely for the purpose of rendering diagnostic lab bookings and generating digital reports.
      </Text>

      <Text style={styles.sectionHeader}>2. Report Storage</Text>
      <Text style={styles.paragraph}>
        All diagnostic results are stored in end-to-end encrypted digital clouds. Access is limited strictly to verified account owners and designated clinical partners.
      </Text>

      <Text style={styles.sectionHeader}>3. Third-Party Sharing</Text>
      <Text style={styles.paragraph}>
        We never sell, trade, or lease patient medical history to advertisement networks or uncertified pharmaceutical corporations.
      </Text>
    </>
  );

  const renderTermsOfService = () => (
    <>
      <Text style={styles.introText}>Effective from: January 2026</Text>
      <Text style={styles.paragraph}>
        By accessing the MedsSeva platform, you agree to strictly comply with the terms governing digital booking and diagnostic scheduling.
      </Text>
      
      <Text style={styles.sectionHeader}>1. Booking Schedules</Text>
      <Text style={styles.paragraph}>
        All slot timings represent approximate windows. Home-sample collection technicians strive for absolute punctuality but may fluctuate slightly due to transit disruptions.
      </Text>

      <Text style={styles.sectionHeader}>2. Payment & Refund</Text>
      <Text style={styles.paragraph}>
        Cancellations initiated at least 4 hours prior to the slot schedule qualify for automated full wallet refunds. Failures to appear at scheduled collections are non-refundable.
      </Text>

      <Text style={styles.sectionHeader}>3. Clinical Diagnosis Disclaimer</Text>
      <Text style={styles.paragraph}>
        MedsSeva delivers diagnostic reports authored by accredited pathology labs. Users must consult licensed medical doctors to interpret findings; our reports do not constitute auto-prescriptions.
      </Text>
    </>
  );

  const renderHelpCenter = () => (
    <>
      <Text style={styles.introText}>Frequently Asked Questions</Text>
      
      <TouchableOpacity style={styles.faqCard} onPress={() => router.push('/support/chat')} activeOpacity={0.7}>
        <Text style={styles.faqQuestion}>How do I download my lab reports?</Text>
        <Text style={styles.faqAnswer}>Navigate to the 'Reports' tab on the bottom navigation. Locate your completed test and tap 'Download PDF Report' instantly.</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.faqCard} onPress={() => router.push('/support/chat')} activeOpacity={0.7}>
        <Text style={styles.faqQuestion}>Is fasting required for a Complete Blood Count?</Text>
        <Text style={styles.faqAnswer}>CBC tests do not strictly require fasting, but related packages including sugar or lipid profiling often mandate 8-12 hours of fasting beforehand.</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.faqCard} onPress={() => router.push('/support/chat')} activeOpacity={0.7}>
        <Text style={styles.faqQuestion}>How do I cancel or reschedule a slot?</Text>
        <Text style={styles.faqAnswer}>{"Open 'Bookings' -> select active test -> tap 'Modify Booking'. Rescheduling is free if completed 4 hours ahead of the slot."}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.supportBtn} onPress={() => router.push('/support/chat')} activeOpacity={0.8}>
        <MaterialCommunityIcons name="chat-processing-outline" size={24} color="#FFF" />
        <Text style={styles.supportBtnText}>Chat with Live Support Agent</Text>
      </TouchableOpacity>
    </>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textLight} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={{ width: 24 }} />
      </View>

  <ScreenWrapper contentContainerStyle={styles.scrollContent}>
        {type === 'privacy' && renderPrivacyPolicy()}
        {type === 'terms' && renderTermsOfService()}
        {type === 'help' && renderHelpCenter()}
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
    paddingTop: Platform.OS === 'ios' ? 50 : 45,
    paddingBottom: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.textLight,
  },
  scrollContent: {
    padding: 20,
  },
  introText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.primary,
    textTransform: 'uppercase',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  sectionHeader: {
    ...TYPOGRAPHY.subtitle,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginTop: 24,
    marginBottom: 8,
  },
  paragraph: {
    ...TYPOGRAPHY.body,
    color: '#475569',
    lineHeight: 22,
    marginBottom: 16,
  },
  faqCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.soft,
    elevation: 2,
  },
  faqQuestion: {
    ...TYPOGRAPHY.subtitle,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 8,
  },
  faqAnswer: {
    ...TYPOGRAPHY.body,
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  supportBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    ...SHADOWS.soft,
    elevation: 3,
  },
  supportBtnText: {
    ...TYPOGRAPHY.subtitle,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginLeft: 10,
  },

});
