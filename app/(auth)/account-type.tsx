import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, StatusBar, Platform, Linking,
  PanResponder
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../src/theme/theme';

const PRIMARY = COLORS.primary;

export default function AccountTypeScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<'user' | 'partner' | 'other'>('user');

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
            router.replace('/onboarding');
          }
        }
      },
    })
  ).current;

  const handleContinue = () => {
    if (selected === 'user') router.push('/(auth)/login');
    else if (selected === 'partner') router.push('/(auth)/partner-login');
    else router.push('/(auth)/other-type');
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#637C8E" />
      <View style={styles.bottomSheet}>
        <TouchableOpacity style={styles.dragArea} onPress={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/onboarding');
          }
        }} activeOpacity={0.8} {...panResponder.panHandlers}>
          <View style={styles.dragHandle} />
        </TouchableOpacity>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          <Text style={styles.title}>Select your role</Text>
          <Text style={styles.subtitle}>Choose how you will be using the platform to customize your experience.</Text>

          <TouchableOpacity
            style={[styles.card, selected === 'user' && styles.cardSelected]}
            onPress={() => setSelected('user')}
            activeOpacity={0.7}
          >
            <View style={styles.cardLeft}>
              <View style={styles.iconBox}>
                <MaterialCommunityIcons name="pencil-outline" size={22} color={PRIMARY} />
              </View>
              <View style={styles.cardTextCol}>
                <Text style={styles.cardTitle}>User</Text>
                <Text style={styles.cardDesc}>Book lab tests, and manage health records.</Text>
              </View>
            </View>
            <View style={[styles.radio, selected === 'user' && styles.radioSelected]}>
              {selected === 'user' && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.card, selected === 'partner' && styles.cardSelected]}
            onPress={() => setSelected('partner')}
            activeOpacity={0.7}
          >
            <View style={styles.cardLeft}>
              <View style={styles.iconBox}>
                <MaterialCommunityIcons name="office-building" size={22} color={PRIMARY} />
              </View>
              <View style={styles.cardTextCol}>
                <Text style={styles.cardTitle}>Partner</Text>
                <Text style={styles.cardDesc}>Join our pathology lab network and manage diagnostic operations.</Text>
              </View>
            </View>
            <View style={[styles.radio, selected === 'partner' && styles.radioSelected]}>
              {selected === 'partner' && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.card, selected === 'other' && styles.cardSelected]}
            onPress={() => setSelected('other')}
            activeOpacity={0.7}
          >
            <View style={styles.cardLeft}>
              <View style={styles.iconBox}>
                <MaterialCommunityIcons name="cart-outline" size={22} color={PRIMARY} />
              </View>
              <View style={styles.cardTextCol}>
                <Text style={styles.cardTitle}>Other</Text>
                <Text style={styles.cardDesc}>Phlebotomist sample collection and business channel portals.</Text>
              </View>
            </View>
            <View style={[styles.radio, selected === 'other' && styles.radioSelected]}>
              {selected === 'other' && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>

          <View style={styles.spacer} />

          <TouchableOpacity style={[styles.continueBtn, !selected && styles.continueBtnDisabled]} onPress={handleContinue} activeOpacity={0.85}>
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
});