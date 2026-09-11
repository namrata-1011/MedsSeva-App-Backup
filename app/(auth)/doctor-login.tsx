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
  const dispatch = useDispatch();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

  const handleLogin = async () => {
    const cleanIdentifier = identifier.trim();
    if (!cleanIdentifier || !password) {
      showInfo('Please enter your email/mobile and password.');
      return;
    }
    setIsLoading(true);
    setServerError(null);
    try {
      const isEmail = cleanIdentifier.includes('@');
      const response = await apiService.login({
        ...(isEmail ? { email: cleanIdentifier.toLowerCase() } : { mobile: cleanIdentifier }),
        identifier: cleanIdentifier,
        password,
      });

      if (response.user.role !== 'PATHOLOGIST' && response.user.role !== 'DOCTOR' && response.user.role !== 'ADMIN') {
        setServerError('This portal is strictly for Doctors & Pathologists.');
        setIsLoading(false);
        return;
      }

      const userObj = {
        id: response.user.id,
        name: response.user.name,
        email: response.user.email,
        mobile: response.user.mobile,
        role: response.user.role,
        doctor: response.user.doctor,
      };

      await AsyncStorage.setItem('user', JSON.stringify(userObj));
      await tokenStorage.setItem('token', response.token);
      dispatch(loginSuccess(userObj));
      router.replace('/(doctor)/home' as any);
    } catch (error: any) {
      const err = error.response?.data;
      if (err?.pendingApproval) {
        router.replace('/(auth)/doctor-pending');
        return;
      }
      setServerError(err?.error || 'Authentication failed. Please check credentials.');
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
          <Text style={styles.cardSubtitle}>Consulting Doctor & Pathologist Portal.</Text>

          <Text style={styles.fieldLabel}>Email or Mobile Number</Text>
          <View style={styles.inputWrap}>
            <MaterialCommunityIcons name="at" size={18} color="#94A3B8" style={styles.inputIcon} />
            <TextInput
              style={styles.input} placeholder="doctor@medsseva.com"
              placeholderTextColor="#94A3B8" value={identifier}
              onChangeText={setIdentifier} autoCapitalize="none"
            />
          </View>

          <Text style={styles.fieldLabel}>Password</Text>
          <View style={styles.inputWrap}>
            <MaterialCommunityIcons name="lock-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { flex: 1 }]} placeholder="••••••••"
              placeholderTextColor="#94A3B8" secureTextEntry={!showPassword}
              value={password} onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <MaterialCommunityIcons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {serverError && (
            <View style={styles.serverErrorBox}>
              <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#EF4444" />
              <Text style={styles.serverErrorText}>{serverError}</Text>
            </View>
          )}

          <TouchableOpacity style={[styles.loginBtn, isLoading && { opacity: 0.6 }]} onPress={handleLogin} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginBtnText}>Login</Text>}
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
