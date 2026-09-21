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
import auth from '@react-native-firebase/auth';

const { width } = Dimensions.get('window');
const PRIMARY = COLORS.primary;

export default function OTPScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { mobile: paramMobile, expectedRole, verificationId: paramVerificationId } = useLocalSearchParams<{ mobile?: string; expectedRole?: string; verificationId?: string }>();

  const [step, setStep] = useState<'mobile' | 'otp'>(paramMobile ? 'otp' : 'mobile');
  const [mobileNumber, setMobileNumber] = useState(paramMobile || '');
  const [verificationId, setVerificationId] = useState(paramVerificationId || '');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [serverError, setServerError] = useState<string | null>(null);

  const inputRefs = useRef<Array<any>>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (paramMobile) {
      setMobileNumber(paramMobile);
      setStep('otp');
    }
  }, [paramMobile]);

  useEffect(() => {
    if (step === 'otp') {
      setCountdown(30);
      setCanResend(false);
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [step]);

  const maskedNumber = mobileNumber.length === 10
    ? `+91 ••••••${mobileNumber.slice(-4)}`
    : `+91 ${mobileNumber}`;

  const handleSendOtp = async () => {
    if (mobileNumber.length !== 10) return;
    setIsSending(true);
    setServerError(null);
    try {
      const result = await apiService.checkMobile(mobileNumber);
      if (!result?.exists) {
        setServerError('This mobile number is not registered. Please register first.');
        setIsSending(false);
        return;
      }
      try {
        const confirmation = await auth().signInWithPhoneNumber(`+91${mobileNumber}`);
        setVerificationId(confirmation.verificationId || '');
      } catch (firebaseErr: any) {
        console.error('Firebase Auth Error:', firebaseErr);
        setServerError(firebaseErr.message || 'Failed to send verification code via Firebase. Please try again.');
        setIsSending(false);
        return;
      }
      setStep('otp');
      setOtp(['', '', '', '', '', '']);
    } catch {
      setServerError('Failed to verify mobile number. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    const cleanVal = value.replace(/[^0-9]/g, '');

    // Handle SMS autofill or pasted 6-digit OTP
    if (cleanVal.length > 1) {
      const digits = cleanVal.slice(0, 6).split('');
      const newOtp = ['', '', '', '', '', ''];
      digits.forEach((d, i) => { newOtp[i] = d; });
      setOtp(newOtp);
      if (otpError) setOtpError('');

      if (digits.length === 6) {
        inputRefs.current[5]?.focus();
        setTimeout(() => {
          verifyOtp(digits.join(''));
        }, 150);
      } else {
        inputRefs.current[Math.min(digits.length, 5)]?.focus();
      }
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = cleanVal ? cleanVal.slice(-1) : '';
    setOtp(newOtp);
    if (otpError) setOtpError('');

    if (cleanVal && index < 5) {
      inputRefs.current[index + 1]?.focus();
    } else if (cleanVal && index === 5) {
      const fullCode = newOtp.join('');
      if (fullCode.length === 6) {
        setTimeout(() => {
          verifyOtp(fullCode);
        }, 150);
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setOtp(['', '', '', '', '', '']);
    setOtpError('');
    await handleSendOtp();
  };

  const verifyOtp = async (codeOverride?: string) => {
    const otpValue = typeof codeOverride === 'string' ? codeOverride : otp.join('');
    if (otpValue.length !== 6) return;
    setOtpError('');

    setIsLoading(true);
    try {
      if (!verificationId) throw new Error("No verification ID. Please request OTP again.");
      const credential = auth.PhoneAuthProvider.credential(verificationId, otpValue);
      const userCredential = await auth().signInWithCredential(credential);
      const firebaseIdToken = await userCredential.user.getIdToken();
      console.log('Firebase ID Token:', firebaseIdToken);

      // Temporarily blocking backend login logic because backend does not support Firebase Token Verification yet.
      setOtpError('Firebase Authentication Successful! (Backend login bypassed because backend needs update to verify Firebase tokens)');
      
      /*
      const loginResult = await apiService.loginWithOtp(mobileNumber, otpValue);
      */
      // Un-comment below when backend is updated
      /*
      const userObj = {
        id: loginResult.user.id,
        name: loginResult.user.name,
        email: loginResult.user.email,
        mobile: loginResult.user.mobile,
        role: loginResult.user.role,
        uhid: loginResult.user.uhid,
        referralCode: loginResult.user.referralCode,
        partner: loginResult.user.partner,
        doctor: loginResult.user.doctor,
        adminRoleSlug: loginResult.user.adminRoleSlug,
      };

      // If this screen expected a specific role, validate it
      if (expectedRole) {
        const uRole = (loginResult.user.role || '').toUpperCase();
        if (expectedRole === 'DOCTOR' && uRole !== 'DOCTOR' && uRole !== 'PATHOLOGIST' && uRole !== 'ADMIN') {
          setOtpError('This mobile number does not belong to a registered Doctor account.');
          setIsLoading(false);
          return;
        }
        if (expectedRole === 'PATHOLOGY_PARTNER' && uRole !== 'PATHOLOGY_PARTNER') {
          setOtpError('This mobile number does not belong to a registered Pathology Partner account.');
          setIsLoading(false);
          return;
        }
        if (expectedRole === 'EXECUTIVE') {
          const isPhleb = uRole === 'EXECUTIVE' || loginResult.user.partner?.role === 'PHLEBOTOMIST';
          if (!isPhleb) {
            setOtpError('This mobile number does not belong to a registered Phlebotomist account.');
            setIsLoading(false);
            return;
          }
        }
      }

      await AsyncStorage.setItem('user', JSON.stringify(userObj));
      await tokenStorage.setItem('token', loginResult.token);
      dispatch(loginSuccess(userObj));

      const { registerFcmToken } = await import('../../src/services/notificationService');
      registerFcmToken().catch(console.warn);

      // Route according to user role
      const uRole = (loginResult.user.role || '').toUpperCase();
      const pRole = (loginResult.user.partner?.role || '').toUpperCase();
      const adminSlug = (loginResult.user.adminRoleSlug || '').toLowerCase();

      const isPhlebo =
        uRole === 'EXECUTIVE' ||
        pRole === 'PHLEBOTOMIST' ||
        adminSlug === 'executive';

      if (isPhlebo) {
        router.replace('/(phlebotomist)/home' as any);
      } else if (uRole === 'PATHOLOGY_PARTNER') {
        router.replace('/(partner)/home' as any);
      } else if (uRole === 'DOCTOR' || uRole === 'PATHOLOGIST') {
        router.replace('/(doctor)/home' as any);
      } else {
        router.replace('/(tabs)' as any);
      }
      */
    } catch (error: any) {
      console.error('Firebase Verify Error:', error);
      const msg = error.message || error.response?.data?.error || 'Authentication failed. Please try again.';
      setOtpError(msg);
    } finally {
      setIsLoading(false);
    }
  };

 return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#E8F0F3" />
      <ScreenWrapper
        backgroundColor="#E8F0F3"
        contentContainerStyle={styles.scrollContent}
        disableKeyboardDismiss
      >
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => {
              if (step === 'otp') {
                if (paramMobile) {
                  router.back();
                } else {
                  setStep('mobile');
                  setOtp(['', '', '', '', '', '']);
                }
              } else {
                router.back();
              }
            }}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="arrow-left" size={22} color="#1E293B" />
          </TouchableOpacity>

          {step === 'mobile' ? (
            <>
              <Text style={styles.title}>Login with OTP</Text>
              <Text style={styles.subtitle}>Enter your registered mobile number to receive a verification code.</Text>

              <Text style={styles.fieldLabel}>Mobile Number</Text>
              <View style={styles.mobileInputWrap}>
                <View style={styles.countryCode}>
                  <Text style={styles.countryCodeText}>+91</Text>
                </View>
                <TextInput
                  style={styles.mobileInput}
                  placeholder="Enter 10 digit number"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={mobileNumber}
                  onChangeText={(text: string) => setMobileNumber(text.replace(/[^0-9]/g, ''))}
                />
                {mobileNumber.length === 10 && (
                  <MaterialCommunityIcons name="check-circle" size={20} color="#10B981" />
                )}
              </View>

          {serverError && (
                <View style={styles.serverErrorBox}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#EF4444" />
                  <Text style={styles.serverErrorText}>{serverError}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.primaryBtn, mobileNumber.length !== 10 && styles.btnDisabled]}
                onPress={handleSendOtp}
                disabled={isSending || mobileNumber.length !== 10}
                activeOpacity={0.85}
              >
                {isSending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.primaryBtnText}>Send Verification Code</Text>
                    <MaterialCommunityIcons name="arrow-right" size={18} color="#fff" style={{ marginLeft: 8 }} />
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.registerRow}>
                <Text style={styles.registerText}>Don't have an account? </Text>
                <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                  <Text style={styles.registerLink}>Create Account</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.title}>Verify Mobile Number</Text>
              <Text style={styles.subtitleOtp}>
                Enter the 4-digit code sent to{'\n'}
                <Text style={styles.maskedNum}>{maskedNumber} </Text>
                <Text
                  style={styles.changeLink}
                  onPress={() => {
                    if (router.canGoBack()) {
                      router.back();
                    } else {
                      setStep('mobile');
                      setOtp(['', '', '', '', '', '']);
                    }
                  }}
                >
                  Change
                </Text>
              </Text>



              <View style={styles.otpRow}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref: any) => { inputRefs.current[index] = ref; }}
                    style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
                    maxLength={index === 0 ? 6 : 1}
                    keyboardType="number-pad"
                    textContentType="oneTimeCode"
                    autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
                    value={digit}
                    onChangeText={(val: string) => handleOtpChange(val, index)}
                    onKeyPress={(e: any) => handleKeyPress(e, index)}
                  />
                ))}
              </View>

              {otpError ? <Text style={styles.otpError}>{otpError}</Text> : null}

              <View style={styles.resendRow}>
                <Text style={styles.resendText}>Didn't receive the code? </Text>
                {canResend ? (
                  <TouchableOpacity onPress={handleResend}>
                    <Text style={styles.resendLink}>Resend</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.countdownText}>{countdown}s</Text>
                )}
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, (isLoading || otp.join('').length !== 6) && styles.btnDisabled]}
                onPress={() => verifyOtp()}
                disabled={isLoading || otp.join('').length !== 6}
                activeOpacity={0.85}
              >
                {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Verify & Login</Text>}
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
  scrollContent: { flexGrow: 1, paddingHorizontal: 20, paddingVertical: 40, justifyContent: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 24 },
  backBtn: { marginBottom: 24, alignSelf: 'flex-start' },
  title: { fontSize: 26, fontWeight: '800', color: '#0F172A', marginBottom: 12 },
  subtitle: { fontSize: 14, color: '#64748B', lineHeight: 22, marginBottom: 28 },
  subtitleOtp: { fontSize: 14, color: '#64748B', lineHeight: 22, marginBottom: 32 },
  maskedNum: { color: '#0F172A', fontWeight: '600' },
  changeLink: { color: PRIMARY, fontWeight: '700', fontSize: 14 },
  hintBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 20,
    alignSelf: 'center',
  },
  hintText: {
    fontSize: 12,
    color: '#0F766E',
    fontWeight: '600',
  },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 8 },
mobileInputWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC',
    borderRadius: 14, borderWidth: 1.5, borderColor: '#E2E8F0',
    height: 56, paddingHorizontal: 14, marginBottom: 12,
  },
  countryCode: { borderRightWidth: 1.5, borderColor: '#E2E8F0', paddingRight: 12, marginRight: 12 },
  countryCodeText: { fontSize: 15, fontWeight: '700', color: '#475569' },
  mobileInput: { flex: 1, fontSize: 15, color: '#0F172A', fontWeight: '600', letterSpacing: 1 },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, paddingHorizontal: 4, gap: 8 },
  otpBox: {
    flex: 1, height: 60, borderRadius: 14,
    backgroundColor: '#F1F5F9', textAlign: 'center', fontSize: 24,
    fontWeight: '700', color: '#0F172A', elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
  },
  otpBoxFilled: { backgroundColor: '#E6F4F3', borderWidth: 1.5, borderColor: PRIMARY },
  resendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 28 },
  resendText: { fontSize: 13, color: '#64748B' },
  resendLink: { fontSize: 13, fontWeight: '700', color: PRIMARY },
  countdownText: { fontSize: 13, fontWeight: '700', color: PRIMARY },
  primaryBtn: {
    backgroundColor: PRIMARY, height: 54, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', flexDirection: 'row', marginBottom: 20,
    elevation: 3, shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
  },
  btnDisabled: { opacity: 0.5, backgroundColor: '#94A3B8', shadowOpacity: 0 },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
otpError: { fontSize: 13, color: '#EF4444', marginBottom: 12, marginLeft: 4 },
  serverErrorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#FECACA', width: '100%', marginBottom: 16,
  },
  serverErrorText: { fontSize: 13, color: '#EF4444', fontWeight: '600', flex: 1 },
  registerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  registerText: { fontSize: 13, color: '#64748B' },
  registerLink: { fontSize: 13, fontWeight: '700', color: PRIMARY },
});