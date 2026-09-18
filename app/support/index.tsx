import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Linking, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenWrapper from '../../src/components/ScreenWrapper';
import { COLORS, SHADOWS, TYPOGRAPHY } from '../../src/theme/theme';

export default function SupportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handleCallSupport = () => {
    Linking.openURL('tel:+918448030936');
  };

  const handleChatSupport = () => {
    router.push('/support/chat');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <MaterialCommunityIcons name="chevron-left" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScreenWrapper scrollable={true} backgroundColor="#F8FAFC" contentContainerStyle={styles.scrollContent}>
        
        {/* Main Logo Card */}
        <View style={styles.mainCard}>
          <Image 
            source={require('../../assets/images/logo.png')} 
            style={styles.logo} 
            resizeMode="contain" 
          />
          <Text style={styles.mainTitle}>Help & Support</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: '#10B981' }]} 
            onPress={handleChatSupport}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="chat-processing" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.actionBtnText}>Chat Support</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: '#F59E0B' }]} 
            onPress={handleCallSupport}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="phone" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.actionBtnText}>Call Support</Text>
          </TouchableOpacity>
        </View>

        {/* Accordions */}
        <View style={styles.accordionContainer}>
          
          {/* Section 1 */}
          <TouchableOpacity 
            style={styles.accordionHeader} 
            onPress={() => toggleSection('about')}
            activeOpacity={0.7}
          >
            <View style={styles.accordionHeaderLeft}>
              <View style={styles.numberBadge}>
                <Text style={styles.numberText}>1</Text>
              </View>
              <Text style={styles.accordionTitle}>We are here for you</Text>
            </View>
            <MaterialCommunityIcons 
              name={expandedSection === 'about' ? 'chevron-up' : 'chevron-down'} 
              size={24} 
              color={COLORS.primary} 
            />
          </TouchableOpacity>
          
          {expandedSection === 'about' && (
            <View style={styles.accordionContent}>
              <Text style={styles.accordionText}>
                MedsSeva is dedicated to providing you with the most reliable, secure, and fast diagnostic services. 
                Our support team is available to help you with your bookings, reports, and any other queries you might have.
              </Text>
            </View>
          )}

          {/* Section 2 */}
          <TouchableOpacity 
            style={[styles.accordionHeader, { marginTop: 12 }]} 
            onPress={() => toggleSection('contact')}
            activeOpacity={0.7}
          >
            <View style={styles.accordionHeaderLeft}>
              <View style={styles.numberBadge}>
                <Text style={styles.numberText}>2</Text>
              </View>
              <Text style={styles.accordionTitle}>Contact Details</Text>
            </View>
            <MaterialCommunityIcons 
              name={expandedSection === 'contact' ? 'chevron-up' : 'chevron-down'} 
              size={24} 
              color={COLORS.primary} 
            />
          </TouchableOpacity>
          
          {expandedSection === 'contact' && (
            <View style={styles.accordionContent}>
              <View style={styles.contactRow}>
                <MaterialCommunityIcons name="email-outline" size={20} color={COLORS.textSecondary} />
                <Text style={styles.contactText}>support@medsseva.com</Text>
              </View>
              <View style={[styles.contactRow, { marginTop: 12 }]}>
                <MaterialCommunityIcons name="phone-outline" size={20} color={COLORS.textSecondary} />
                <Text style={styles.contactText}>+91-80000-00000</Text>
              </View>
              <View style={[styles.contactRow, { marginTop: 12 }]}>
                <MaterialCommunityIcons name="map-marker-outline" size={20} color={COLORS.textSecondary} />
                <Text style={styles.contactText}>MedsSeva Headquarters, India</Text>
              </View>
            </View>
          )}

        </View>

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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    ...Platform.select({
      android: { elevation: 4 },
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 }
    }),
    zIndex: 10,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    ...TYPOGRAPHY.h2,
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 18,
  },
  scrollContent: {
    padding: 16,
  },
  mainCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    ...SHADOWS.soft,
  },
  logo: {
    width: 140,
    height: 50,
    marginBottom: 16,
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    width: '48%',
    ...SHADOWS.soft,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  accordionContainer: {
    marginBottom: 24,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    ...SHADOWS.soft,
  },
  accordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  numberBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 109, 111, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  numberText: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  accordionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  accordionContent: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    marginTop: -8,
    paddingTop: 20,
    ...SHADOWS.soft,
  },
  accordionText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactText: {
    fontSize: 14,
    color: COLORS.textDark,
    marginLeft: 12,
    fontWeight: '500',
  }
});
