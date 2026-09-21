import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Platform, StatusBar, TextInput, Dimensions,
} from 'react-native';
import ScreenWrapper from '../../src/components/ScreenWrapper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { showError } from '../../src/store/toastStore';
import { apiService } from '../../src/services/api';
import { COLORS } from '../../src/theme/theme';

const { width } = Dimensions.get('window');
const PRIMARY = COLORS.primary;

type Step = 'email' | 'otp' | 'reset' | 'done';

export default function ForgotPasswordScreen() {
  const router = useRouter();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [serverError, setServerError] = useState<string | null>(null);

  const inputRefs = useRef<Array<TextInput | null>>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (step === 'otp') startCountdown();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [step]);

  const startCountdown = () => {
    setCountdown(30);
    setCanResend(false);
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(timerRef.current!); setCanResend(true); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => a + '*'.repeat(Math.max(0, b.length)) + c);

  const handleSendOtp = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showError('Please enter a valid email address.');
      return;
    }
    setIsSending(true);
    setServerError(null);
    try {
      await apiService.sendForgotPasswordOtp(email);
      setStep('otp');
    } catch (error: any) {
      setServerError(error.response?.data?.error || 'Failed to send reset code. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    const cleanVal = value.replace(/[^0-9]/g, '');
    const newOtp = [...otp];
    newOtp[index] = cleanVal ? cleanVal.slice(-1) : '';
    setOtp(newOtp);
    setOtpError('');
    if (cleanVal && index < 3) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const otpValue = otp.join('');
    if (otpValue.length !== 4) return;
    setOtpError('');
    setIsLoading(true);
    try {
      await apiService.verifyForgotPasswordOtp(email, otpValue);
      setStep('reset');
    } catch (error: any) {
      setOtpError(error.response?.data?.error || 'Incorrect code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
 if (!newPassword || newPassword.length < 6) {
      setServerError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setServerError('Passwords do not match.');
      return;
    }
    setIsLoading(true);
    setServerError(null);
    try {
      await apiService.resetPassword(email, newPassword);
      setStep('done');
    } catch (error: any) {
      setServerError(error.response?.data?.error || 'Failed to reset password.');
    } finally {
      setIsLoading(false);
    }
  };

  const otpFilled = otp.join('').length === 4;
  const BOX_SIZE = Math.min(64, (width - 48 - 48 - 36) / 4);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#E8F0F3" />
      <ScreenWrapper
        backgroundColor="#E8F0F3"
        contentContainerStyle={styles.scrollContent}
        disableKeyboardDismiss
      >

        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (step === 'otp') { setStep('email'); setOtp(['', '', '', '']); }
            else if (step === 'reset') setStep('otp');
            else router.back();
          }}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color="#334155" />
        </TouchableOpacity>

        <View style={styles.card}>
          {step === 'email' && (
            <>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="lock-reset" size={30} color={PRIMARY} />
              </View>
              <Text style={styles.title}>Forgot Password</Text>
              <Text style={styles.subtitle}>Enter your registered email address. We'll send a verification code.</Text>

              <Text style={styles.fieldLabel}>Email Address</Text>
              <View style={styles.inputWrap}>
                <MaterialCommunityIcons name="email-outline" size={18} color="#94A3B8" style={{ marginRight: 10 }} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email address"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              {serverError && (
                <View style={styles.serverErrorBox}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#EF4444" />
                  <Text style={styles.serverErrorText}>{serverError}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.primaryBtn, (isSending || !email) && styles.btnDisabled]}
                onPress={handleSendOtp}
                disabled={isSending || !email}
                activeOpacity={0.85}
              >
                {isSending ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Send Reset Code</Text>}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => router.push('/(auth)/register')} style={styles.createRow}>
                <Text style={styles.createText}>Don't have an account? </Text>
                <Text style={styles.createLink}>Create Account</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'otp' && (
            <>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="message-check-outline" size={30} color={PRIMARY} />
              </View>
              <Text style={styles.title}>Enter Code</Text>
              <Text style={styles.subtitleOtp}>
                Enter the 4-digit code sent to{'\n'}
                <Text style={styles.maskedEmail}>{maskedEmail} </Text>
                <Text style={styles.changeLink} onPress={() => { setStep('email'); setOtp(['', '', '', '']); }}>Change</Text>
              </Text>

              <View style={styles.otpRow}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={ref => { inputRefs.current[index] = ref; }}
                    style={[styles.otpBox, { width: BOX_SIZE, height: 60 }, digit ? styles.otpBoxFilled : null, otpError ? styles.otpBoxError : null]}
                    maxLength={1}
                    keyboardType="number-pad"
                    value={digit}
                    onChangeText={val => handleOtpChange(val, index)}
                    onKeyPress={e => handleKeyPress(e, index)}
                  />
                ))}
              </View>

              {otpError ? <Text style={styles.otpError}>{otpError}</Text> : null}

              <View style={styles.resendRow}>
                <Text style={styles.resendText}>Didn't receive the code? </Text>
                {canResend ? (
                  <TouchableOpacity onPress={() => { setOtp(['', '', '', '']); handleSendOtp(); }}>
                    <Text style={styles.resendLink}>Resend</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.countdownText}>{countdown}s</Text>
                )}
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, (!otpFilled || isLoading) && styles.btnDisabled]}
                onPress={handleVerifyOtp}
                disabled={!otpFilled || isLoading}
                activeOpacity={0.85}
              >
                {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Verify Code</Text>}
              </TouchableOpacity>
            </>
          )}

          {step === 'reset' && (
            <>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="lock-outline" size={30} color={PRIMARY} />
              </View>
              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.subtitle}>Create a new password for your account.</Text>

              <Text style={styles.fieldLabel}>New Password</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter new password"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showNew}
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
                <TouchableOpacity onPress={() => setShowNew(!showNew)}>
                  <MaterialCommunityIcons name={showNew ? 'eye-outline' : 'eye-off-outline'} size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <Text style={styles.fieldLabel}>Confirm Password</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  placeholder="Re-enter new password"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showConfirm}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
                <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                  <MaterialCommunityIcons name={showConfirm ? 'eye-outline' : 'eye-off-outline'} size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>

          {serverError && (
                <View style={styles.serverErrorBox}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#EF4444" />
                  <Text style={styles.serverErrorText}>{serverError}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.primaryBtn, isLoading && styles.btnDisabled]}
                onPress={handleResetPassword}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Update Password</Text>}
              </TouchableOpacity>
            </>
          )}

          {step === 'done' && (
            <>
              <View style={[styles.iconCircle, { backgroundColor: '#DCFCE7', borderColor: '#A7F3D0' }]}>
                <MaterialCommunityIcons name="check-circle-outline" size={30} color="#10B981" />
              </View>
              <Text style={styles.title}>Password Updated</Text>
              <Text style={styles.subtitle}>Your password has been reset successfully. You can now login with your new password.</Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/(auth)/login')} activeOpacity={0.85}>
                <Text style={styles.primaryBtnText}>Back to Login</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
</ScreenWrapper>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8F0F3' },
  scrollContent: { flexGrow: 1, padding: 24, paddingTop: Platform.OS === 'ios' ? 56 : 36, paddingBottom: 40 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 20, elevation: 2,
  },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', elevation: 2 },
  iconCircle: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#F0FDFA',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#CCFBF1', marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: '900', color: '#0F172A', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  subtitleOtp: { fontSize: 14, color: '#64748B', lineHeight: 22, marginBottom: 32, textAlign: 'center' },
  maskedEmail: { color: '#0F172A', fontWeight: '600' },
  changeLink: { color: PRIMARY, fontWeight: '700', fontSize: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 6, alignSelf: 'flex-start' },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC',
    borderRadius: 12, borderWidth: 1.5, borderColor: '#E2E8F0',
    paddingHorizontal: 14, height: 50, marginBottom: 16, width: '100%',
  },
  input: { flex: 1, fontSize: 14, color: '#0F172A' },
  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginBottom: 16, width: '100%' },
  otpBox: {
    borderRadius: 14, backgroundColor: '#F1F5F9', textAlign: 'center',
    fontSize: 24, fontWeight: '700', color: '#0F172A', borderWidth: 1.5, borderColor: '#E2E8F0',
  },
  otpBoxFilled: { backgroundColor: '#F0FDFA', borderColor: PRIMARY },
  otpBoxError: { borderColor: '#EF4444', backgroundColor: '#FFF5F5' },
  resendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, alignSelf: 'flex-start' },
  resendText: { fontSize: 13, color: '#64748B' },
  resendLink: { fontSize: 13, fontWeight: '700', color: PRIMARY },
  countdownText: { fontSize: 13, fontWeight: '700', color: PRIMARY },
otpError: { fontSize: 13, color: '#EF4444', marginBottom: 12, alignSelf: 'flex-start' },
  serverErrorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#FECACA', width: '100%', marginBottom: 16,
  },
  serverErrorText: { fontSize: 13, color: '#EF4444', fontWeight: '600', flex: 1 },
  primaryBtn: {
    backgroundColor: PRIMARY, height: 50, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', width: '100%', marginBottom: 16, elevation: 2,
  },
  btnDisabled: { opacity: 0.55, backgroundColor: '#94A3B8' },
  primaryBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  createRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  createText: { fontSize: 13, color: '#64748B' },
  createLink: { fontSize: 13, fontWeight: '700', color: PRIMARY },
});