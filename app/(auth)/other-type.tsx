import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, StatusBar, Platform, Modal,
  PanResponder
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../../src/theme/theme';

const PRIMARY = COLORS.primary;

type OtherRole = 'phlebotomist' | 'doctor' | 'channel_partner';

export default function OtherTypeScreen() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<OtherRole>('phlebotomist');
  const [showChannelModal, setShowChannelModal] = useState(false);

  const panResponder = React.useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_: any, gestureState: any) => {
        return gestureState.dy > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderRelease: (_: any, gestureState: any) => {
        if (gestureState.dy > 50) {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(auth)/account-type');
          }
        }
      },
    })
  ).current;

  const handleContinue = () => {
    if (selectedRole === 'phlebotomist') {
      router.push('/(auth)/phlebotomist-login');
    } else if (selectedRole === 'doctor') {
      router.push('/(auth)/doctor-login');
    } else if (selectedRole === 'channel_partner') {
      setShowChannelModal(true);
    }
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#637C8E" />
      <View style={styles.bottomSheet}>
        <TouchableOpacity style={styles.dragArea} onPress={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(auth)/account-type');
          }
        }} activeOpacity={0.8} {...panResponder.panHandlers}>
          <View style={styles.dragHandle} />
        </TouchableOpacity>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          <Text style={styles.title}>Other Roles</Text>
          <Text style={styles.subtitle}>Select your professional role to access specialized MedsSeva portals.</Text>

          <TouchableOpacity
            style={[styles.card, selectedRole === 'phlebotomist' && styles.cardSelected]}
            onPress={() => setSelectedRole('phlebotomist')}
            activeOpacity={0.7}
          >
            <View style={styles.cardLeft}>
              <View style={styles.iconBox}>
                <MaterialCommunityIcons name="needle" size={22} color={PRIMARY} />
              </View>
              <View style={styles.cardTextCol}>
                <Text style={styles.cardTitle}>Phlebotomist</Text>
                <Text style={styles.cardDesc}>Independent sample collection partner. Manage home pickups.</Text>
              </View>
            </View>
            <View style={[styles.radio, selectedRole === 'phlebotomist' && styles.radioSelected]}>
              {selectedRole === 'phlebotomist' && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.card, selectedRole === 'doctor' && styles.cardSelected]}
            onPress={() => setSelectedRole('doctor')}
            activeOpacity={0.7}
          >
            <View style={styles.cardLeft}>
              <View style={styles.iconBox}>
                <MaterialCommunityIcons name="stethoscope" size={22} color={PRIMARY} />
              </View>
              <View style={styles.cardTextCol}>
                <Text style={styles.cardTitle}>Doctor</Text>
                <Text style={styles.cardDesc}>Consulting doctor portal. Track referrals and test verification.</Text>
              </View>
            </View>
            <View style={[styles.radio, selectedRole === 'doctor' && styles.radioSelected]}>
              {selectedRole === 'doctor' && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.card, selectedRole === 'channel_partner' && styles.cardSelected]}
            onPress={() => setSelectedRole('channel_partner')}
            activeOpacity={0.7}
          >
            <View style={styles.cardLeft}>
              <View style={styles.iconBox}>
                <MaterialCommunityIcons name="handshake-outline" size={22} color={PRIMARY} />
              </View>
              <View style={styles.cardTextCol}>
                <View style={styles.titleRow}>
                  <Text style={styles.cardTitle}>Channel Partner</Text>
                  <View style={styles.comingSoonBadge}>
                    <Text style={styles.comingSoonBadgeText}>SOON</Text>
                  </View>
                </View>
                <Text style={styles.cardDesc}>Franchise and network business partners. Expand healthcare reach.</Text>
              </View>
            </View>
            <View style={[styles.radio, selectedRole === 'channel_partner' && styles.radioSelected]}>
              {selectedRole === 'channel_partner' && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>

          <View style={styles.spacer} />

          <TouchableOpacity style={[styles.continueBtn, !selectedRole && styles.continueBtnDisabled]} onPress={handleContinue} activeOpacity={0.85}>
            <Text style={styles.continueBtnText}>Continue</Text>
          </TouchableOpacity>

          <View style={styles.footerLinks}>
            <TouchableOpacity onPress={() => router.push({ pathname: '/legal/LegalWebView', params: { type: 'terms' } })}>
              <Text style={styles.footerLink}>Terms of Service</Text>
            </TouchableOpacity>
            <Text style={styles.footerSep}> · </Text>
            <TouchableOpacity onPress={() => router.push({ pathname: '/legal/LegalWebView', params: { type: 'privacy' } })}>
              <Text style={styles.footerLink}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.copyright}>
            © {new Date().getFullYear()} MedsSeva Healthcare.
          </Text>
        </ScrollView>
      </View>

      <Modal visible={showChannelModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconBox}>
              <MaterialCommunityIcons name="clock-fast" size={36} color={PRIMARY} />
            </View>
            <Text style={styles.modalTitle}>Channel Partner</Text>
            <View style={styles.modalBadge}>
              <Text style={styles.modalBadgeText}>COMING SOON</Text>
            </View>
            <Text style={styles.modalDesc}>
              Channel Partner onboarding and business portal will be launched soon.{'\n\n'}Thank you for your interest.
            </Text>
            <TouchableOpacity style={styles.modalBtn} onPress={() => setShowChannelModal(false)}>
              <Text style={styles.modalBtnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: PRIMARY, justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: '#FFF', maxHeight: '85%', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  dragArea: { width: '100%', height: 40, justifyContent: 'center', alignItems: 'center' },
  dragHandle: { width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2 },
  content: { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 10 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#0F172A', marginBottom: 8 },
  subtitle: { fontSize: 13, color: '#64748B', lineHeight: 20, marginBottom: 24 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardSelected: {
    borderColor: PRIMARY,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 16,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E6F4F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardTextCol: {
    flex: 1,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  comingSoonBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#FDE68A' },
  comingSoonBadgeText: { fontSize: 9, fontWeight: '800', color: '#D97706' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  cardDesc: { fontSize: 11, color: '#64748B', lineHeight: 16 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: PRIMARY,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: PRIMARY,
  },
  spacer: { height: 24 },
  continueBtn: {
    backgroundColor: PRIMARY,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  continueBtnDisabled: {
    opacity: 0.5,
    backgroundColor: '#CBD5E1',
  },
  continueBtnText: { fontSize: 15, fontWeight: 'bold', color: '#FFF' },
  footerLinks: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  footerLink: { fontSize: 12, color: '#94A3B8' },
  footerSep: { fontSize: 12, color: '#94A3B8' },
  copyright: { fontSize: 11, color: '#94A3B8', textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { backgroundColor: '#fff', borderRadius: 24, padding: 28, alignItems: 'center', width: '100%', maxWidth: 340, ...SHADOWS.soft },
  modalIconBox: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#E6F4F3', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#0F2937', marginBottom: 4 },
  modalBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginBottom: 16 },
  modalBadgeText: { fontSize: 11, fontWeight: '800', color: '#D97706' },
  modalDesc: { fontSize: 14, color: '#475569', textAlign: 'center', lineHeight: 21, marginBottom: 24 },
  modalBtn: { backgroundColor: PRIMARY, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', width: '100%' },
  modalBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
