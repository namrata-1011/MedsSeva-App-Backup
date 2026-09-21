import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, Platform, StatusBar, Dimensions,
} from 'react-native';
import ScreenWrapper from '../../src/components/ScreenWrapper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useDispatch } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tokenStorage } from '../../src/utils/tokenStorage';
import { COLORS } from '../../src/theme/theme';
import { loginSuccess } from '../../src/store/slices/authSlice';
import { apiService } from '../../src/services/api';
import { showError } from '../../src/store/toastStore';

const { width } = Dimensions.get('window');
const PRIMARY = COLORS.primary;

export default function VerifyEmailScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const params = useLocalSearchParams();

  const email = (params.email as string) || '';
  const mobile = (params.mobile as string) || '';
  const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => a + '*'.repeat(Math.max(0, b.length)) + c);
  const maskedMobile = mobile.length === 10
    ? `+91 ••••••${mobile.slice(-4)}`
    : mobile;

  const [otp, setOtp] = useState(['', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [serverError, setServerError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef<Array<TextInput | null>>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    startCountdown();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const startCountdown = () => {
    setCountdown(30);
    setCanResend(false);
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleOtpChange = (value: string, index: number) => {
    const cleanVal = value.replace(/[^0-9]/g, '');
    const newOtp = [...otp];
    newOtp[index] = cleanVal ? cleanVal.slice(-1) : '';
    setOtp(newOtp);
    setOtpError('');
    if (cleanVal && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setIsResending(true);
    setOtp(['', '', '', '']);
    setOtpError('');
    try {
      await apiService.sendEmailOtp(email);
      startCountdown();
      setServerError(null);
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Failed to resend code. Please try again.';
      setServerError(msg);
    } finally {
      setIsResending(false);
    }
  };

  const handleVerify = async () => {
    const otpValue = otp.join('');
    if (otpValue.length !== 4) return;
    setOtpError('');
    setIsLoading(true);
    try {
      const result = await apiService.verifyEmailOtp(email, otpValue);
      const userObj = {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        mobile: result.user.mobile,
        role: result.user.role,
      };
      await AsyncStorage.setItem('user', JSON.stringify(userObj));
      await tokenStorage.setItem('token', result.token);
      dispatch(loginSuccess(userObj));

      const { registerFcmToken } = await import('../../src/services/notificationService');
      registerFcmToken().catch(console.warn);

      router.replace('/(tabs)');
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Incorrect code. Please try again.';
      setOtpError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const otpFilled = otp.join('').length === 4;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#E8F0F3" />
      <ScreenWrapper
        backgroundColor="#E8F0F3"
        contentContainerStyle={styles.scrollContent}
        disableKeyboardDismiss
      >
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="email-check-outline" size={32} color={PRIMARY} />
          </View>

          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.subtitle}>
            We sent a 4-digit verification code to{'\n'}
            <Text style={styles.emailText}>{maskedEmail}</Text>
            {maskedMobile ? <Text style={styles.emailText}>{` & ${maskedMobile}`}</Text> : null}
          </Text>

          <View style={styles.otpRow}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={ref => { inputRefs.current[index] = ref; }}
                style={[styles.otpBox, digit ? styles.otpBoxFilled : null, otpError ? styles.otpBoxError : null]}
                maxLength={1}
                keyboardType="number-pad"
                value={digit}
                onChangeText={val => handleOtpChange(val, index)}
                onKeyPress={e => handleKeyPress(e, index)}
              />
            ))}
          </View>

          {otpError ? (
            <View style={styles.errorRow}>
              <MaterialCommunityIcons name="alert-circle-outline" size={14} color="#EF4444" />
              <Text style={styles.otpError}>{otpError}</Text>
            </View>
          ) : null}

          <View style={styles.resendRow}>
            <Text style={styles.resendText}>Didn't receive the code? </Text>
            {isResending ? (
              <ActivityIndicator size="small" color={PRIMARY} />
            ) : canResend ? (
              <TouchableOpacity onPress={handleResend}>
                <Text style={styles.resendLink}>Resend</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.countdownText}>Resend in {countdown}s</Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.verifyBtn, (!otpFilled || isLoading) && styles.btnDisabled]}
            onPress={handleVerify}
            disabled={!otpFilled || isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.verifyBtnText}>Verify & Continue</Text>
                <MaterialCommunityIcons name="arrow-right" size={18} color="#fff" style={{ marginLeft: 8 }} />
              </>
            )}
          </TouchableOpacity>

     {serverError && (
            <View style={styles.serverErrorBox}>
              <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#EF4444" />
              <Text style={styles.serverErrorText}>{serverError}</Text>
            </View>
          )}

          <View style={styles.infoBox}>
            <MaterialCommunityIcons name="information-outline" size={14} color="#64748B" />
            <Text style={styles.infoText}>Check your spam folder if you don't see the email.</Text>
          </View>
        </View>

        <Text style={styles.copyright}>© {new Date().getFullYear()} MedsSeva Healthcare. All rights reserved.</Text>
 </ScreenWrapper>
    </View>
  );
}

const BOX_SIZE = Math.min(64, (width - 48 - 48 - 36) / 4);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8F0F3' },
  scrollContent: {
    flexGrow: 1, padding: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40, justifyContent: 'center',
  },
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center',
    elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8,
  },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#F0FDFA', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#CCFBF1', marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: '900', color: '#0F172A', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  emailText: { fontWeight: '700', color: '#0F172A' },
  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: 14, width: '100%', marginBottom: 20 },
  otpBox: {
    width: BOX_SIZE, height: 60, borderRadius: 14,
    backgroundColor: '#F1F5F9', textAlign: 'center', fontSize: 24,
    fontWeight: '700', color: '#0F172A', borderWidth: 1.5, borderColor: '#E2E8F0',
  },
  otpBoxFilled: { backgroundColor: '#F0FDFA', borderColor: PRIMARY },
  otpBoxError: { borderColor: '#EF4444', backgroundColor: '#FFF5F5' },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12, alignSelf: 'flex-start' },
  otpError: { fontSize: 13, color: '#EF4444' },
  resendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, alignSelf: 'flex-start' },
  resendText: { fontSize: 13, color: '#64748B' },
  resendLink: { fontSize: 13, fontWeight: '700', color: PRIMARY },
  countdownText: { fontSize: 13, fontWeight: '600', color: '#94A3B8' },
  verifyBtn: {
    backgroundColor: PRIMARY, height: 50, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    flexDirection: 'row', width: '100%', marginBottom: 16,
    elevation: 2,
  },
  btnDisabled: { opacity: 0.5, backgroundColor: '#94A3B8' },
  verifyBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  infoBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F8FAFC', borderRadius: 8, padding: 10,
    borderWidth: 1, borderColor: '#E2E8F0', width: '100%',
  },
  infoText: { fontSize: 12, color: '#64748B', flex: 1 },
copyright: { fontSize: 12, color: '#7A9AAA', textAlign: 'center', marginTop: 24 },
  serverErrorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#FECACA', width: '100%', marginBottom: 16,
  },
  serverErrorText: { fontSize: 13, color: '#EF4444', fontWeight: '600', flex: 1 },
});