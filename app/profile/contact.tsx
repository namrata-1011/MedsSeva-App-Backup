import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Linking } from 'react-native';
import ScreenWrapper from '../../src/components/ScreenWrapper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

import { COLORS, TYPOGRAPHY, SHADOWS } from '../../src/theme/theme';

export default function ContactScreen() {
  const router = useRouter();

  const handleAction = (type: 'call' | 'email' | 'web' | 'map') => {
    let url = '';
    switch (type) {
      case 'call':
        url = 'tel:+918448030936';
        break;
      case 'email':
        url = 'mailto:pathology@medsseva.com';
        break;
      case 'web':
        url = 'https://lab.medsseva.com';
        break;
      case 'map':
        url = Platform.select({
          ios: 'maps:0,0?q=Noida, Uttar Pradesh, India',
          android: 'geo:0,0?q=Noida, Uttar Pradesh, India'
        }) || '';
        break;
    }
    if (url) {
      Linking.openURL(url).catch(() => {
        // Fail-safe catch
      });
    }
  };

  const renderContactRow = (
    icon: string, 
    title: string, 
    value: string, 
    onPress?: () => void
  ) => (
    <TouchableOpacity 
      style={styles.rowCard} 
      activeOpacity={onPress ? 0.7 : 1}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.iconWrapper}>
        <LinearGradient 
          colors={['rgba(0, 109, 111, 0.1)', 'rgba(20, 184, 166, 0.1)']} 
          style={styles.iconBg}
        >
          <MaterialCommunityIcons name={icon as any} size={22} color={COLORS.primary} />
        </LinearGradient>
      </View>
      <View style={styles.textWrapper}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
      {onPress && (
        <MaterialCommunityIcons name="chevron-right" size={18} color="#94A3B8" />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Teal Gradient Header */}
      <LinearGradient 
        colors={[COLORS.primary, '#008587']} 
        style={styles.header}
      >
        <View style={styles.headerBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Contact Us</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Premium Graphic Banner */}
        <View style={styles.banner}>
          <View style={styles.supportIconCircle}>
            <MaterialCommunityIcons name="face-agent" size={48} color="#FFF" />
          </View>
          <Text style={styles.bannerHeading}>How can we help you today?</Text>
          <Text style={styles.bannerSubtext}>Reach out to our specialized diagnostics support desk for any inquiries.</Text>
        </View>
      </LinearGradient>
<ScreenWrapper contentContainerStyle={styles.scrollBody}> 
        <View style={styles.contentCard}>
          <Text style={styles.sectionHeading}>Diagnostic Center Details</Text>
          
          {renderContactRow(
            'map-marker-outline', 
            'Location', 
            'Noida, Uttar Pradesh, India',
            () => handleAction('map')
          )}
          
          <View style={styles.divider} />

          {renderContactRow(
            'phone-in-talk', 
            'Phone Number', 
            '+91-8448030936',
            () => handleAction('call')
          )}
          
          <View style={styles.divider} />

          {renderContactRow(
            'email-edit-outline', 
            'Email Address', 
            'pathology@medsseva.com',
            () => handleAction('email')
          )}
          
          <View style={styles.divider} />

          {renderContactRow(
            'clock-time-five-outline', 
            'Operational Timings', 
            'Mon–Sat: 7 AM – 8 PM'
          )}
          
          <View style={styles.divider} />

          {renderContactRow(
            'web', 
            'Official Website', 
            'lab.medsseva.com',
            () => handleAction('web')
          )}
        </View>

        <View style={styles.footerMessage}>
          <Text style={styles.footerText}>MedsSeva is committed to giving you prompt assistance for all lab reports and test booking queries.</Text>
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
    paddingTop: Platform.OS === 'ios' ? 50 : 45,
    paddingBottom: 32,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    ...SHADOWS.soft,
    elevation: 6,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 48,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  banner: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: 16,
  },
  supportIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  bannerHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 6,
  },
  bannerSubtext: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  scrollBody: {
    padding: 20,
    paddingBottom: 40,
  },
  contentCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
    ...SHADOWS.soft,
    elevation: 3,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  iconWrapper: {
    marginRight: 16,
  },
  iconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textWrapper: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 3,
  },
  rowValue: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  footerMessage: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  footerText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    fontStyle: 'italic',
  },
});
