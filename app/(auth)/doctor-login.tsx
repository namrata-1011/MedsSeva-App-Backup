import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, StatusBar, Platform, BackHandler
} from 'react-native';
import ScreenWrapper from '../../src/components/ScreenWrapper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tokenStorage } from '../../src/utils/tokenStorage';
import { COLORS, SHADOWS } from '../../src/theme/theme';
import { showInfo } from '../../src/store/toastStore';
import { loginSuccess } from '../../src/store/slices/authSlice';
import { apiService } from '../../src/services/api';

export default function DoctorLoginScreen() {
  const router = useRouter();
  const [mobile, setMobile] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  useEffect(() => {
    const onBackPress = () => {
      handleBack();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, []);

  const handleContinue = async () => {
    const cleanMobile = mobile.trim().replace(/[^0-9]/g, '');
    if (cleanMobile.length !== 10) {
      showInfo('Please enter a valid 10-digit mobile number.');
      return;
    }
    setIsLoading(true);
    setServerError(null);
    try {
      // 1. Check if mobile number is registered
      const checkRes = await apiService.checkMobile(cleanMobile);
      if (!checkRes?.exists) {
        setServerError('This mobile number is not registered with any Doctor account.');
        setIsLoading(false);
        return;
      }

      // 2. Trigger dummy/backend OTP send
      await apiService.sendOtp(cleanMobile).catch(() => {});

      // 3. Navigate to OTP screen with expectedRole
      router.push({
        pathname: '/(auth)/otp',
        params: { mobile: cleanMobile, expectedRole: 'DOCTOR' },
      });
    } catch (error: any) {
      console.error('Doctor Login check error:', error);
      setServerError(error.response?.data?.error || 'Failed to verify mobile number. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <ScreenWrapper backgroundColor="#F8FAFC" contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#334155" />
        </TouchableOpacity>

        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="stethoscope" size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.cardTitle}>Doctor Portal Login</Text>
          <Text style={styles.cardSubtitle}>Enter your registered mobile number to receive a verification OTP.</Text>

          <Text style={styles.fieldLabel}>Mobile Number</Text>
          <View style={styles.inputWrap}>
            <View style={{ paddingRight: 10, marginRight: 8, borderRightWidth: 1, borderRightColor: '#CBD5E1' }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#334155' }}>+91</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Enter 10 digit number"
              placeholderTextColor="#94A3B8"
              value={mobile}
              onChangeText={(text: string) => {
                setMobile(text.replace(/[^0-9]/g, ''));
                if (serverError) setServerError(null);
              }}
              keyboardType="numeric"
              maxLength={10}
              autoFocus
            />
          </View>

          {serverError && (
            <View style={styles.serverErrorBox}>
              <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#EF4444" />
              <Text style={styles.serverErrorText}>{serverError}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.loginBtn, (isLoading || mobile.length !== 10) && { opacity: 0.6 }]}
            onPress={handleContinue}
            disabled={isLoading || mobile.length !== 10}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.loginBtnText}>Continue</Text>
                <MaterialCommunityIcons name="arrow-right" size={18} color="#fff" />
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.registerRow}>
            <Text style={styles.registerText}>Don't have a doctor account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/doctor-register')}>
              <Text style={styles.registerLink}>Register as Doctor</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.copyright}>© {new Date().getFullYear()} MedsSeva Healthcare. All rights reserved.</Text>
      </ScreenWrapper>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 24, paddingTop: Platform.OS === 'ios' ? 56 : 36, paddingBottom: 40 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 20, ...SHADOWS.soft,
  },
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', ...SHADOWS.soft,
  },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#F0FDFA',
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#CCFBF1', marginBottom: 16,
  },
  cardTitle: { fontSize: 20, fontWeight: '900', color: '#0F172A', marginBottom: 6 },
  cardSubtitle: { fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 28 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6, alignSelf: 'flex-start' },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC',
    borderRadius: 12, borderWidth: 1.5, borderColor: '#E2E8F0',
    paddingHorizontal: 14, height: 50, marginBottom: 16, width: '100%',
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 14, color: '#0F172A' },
  serverErrorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#FECACA', width: '100%', marginBottom: 16,
  },
  serverErrorText: { fontSize: 13, color: '#EF4444', fontWeight: '600', flex: 1 },
  loginBtn: {
    backgroundColor: COLORS.primary, height: 50, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', width: '100%', marginTop: 8, marginBottom: 20, ...SHADOWS.soft,
  },
  loginBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  registerRow: { flexDirection: 'row', marginBottom: 10 },
  registerText: { fontSize: 13, color: '#64748B' },
  registerLink: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  copyright: { fontSize: 12, color: '#7A9AAA', textAlign: 'center', marginTop: 24 },
});
