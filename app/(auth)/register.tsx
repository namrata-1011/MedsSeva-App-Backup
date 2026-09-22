/*eslint-disabled*/

import React, { useState, useEffect } from 'react';

import {

  View, Text, StyleSheet, TouchableOpacity,

  ActivityIndicator, Platform, StatusBar, TextInput,

} from 'react-native';

import ScreenWrapper from '../../src/components/ScreenWrapper';

import { useRouter, useLocalSearchParams } from 'expo-router';

import { useForm, Controller } from 'react-hook-form';

import { yupResolver } from '@hookform/resolvers/yup';

import * as yup from 'yup';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { apiService } from '../../src/services/api';

import { firebaseAuthService } from '../../src/services/firebaseAuthService';

import { ConfirmSheet } from '../../src/components/ConfirmSheet';



import { COLORS } from '../../src/theme/theme';

const PRIMARY = COLORS.primary;



const registerSchema = yup.object().shape({

  name: yup.string().required('Full name is required').min(3, 'Name is too short'),
  email: yup.string().transform((value, originalValue) => originalValue === '' ? null : value).nullable().email('Invalid email format').optional(),
  mobile: yup.string()

    .required('Mobile number is required')

    .matches(/^[0-9]{10}$/, 'Mobile number must be exactly 10 digits'),

  referralCode: yup.string().optional(),

});



export default function RegisterScreen() {

  const router = useRouter();

  const params = useLocalSearchParams();

  const [isLoading, setIsLoading] = useState(false);

  const [showAccountSheet, setShowAccountSheet] = useState(false);

  const [serverError, setServerError] = useState<string | null>(null);

  const [termsAccepted, setTermsAccepted] = useState(false);



  const prefilledMobile = (params?.mobile as string) || '';

  const prefilledName = (params?.name as string) || '';

  const isFromOtp = params?.fromOtp === '1';



  const { control: rawControl, handleSubmit, setValue, formState: { errors } } = useForm({

    resolver: yupResolver(registerSchema),

    defaultValues: {

      name: prefilledName,

      email: '',

      mobile: prefilledMobile,

      referralCode: '',

    },

  });

  const control = rawControl as any;



  useEffect(() => {

    if (prefilledMobile) setValue('mobile', prefilledMobile);

    if (prefilledName) setValue('name', prefilledName);

  }, [prefilledMobile, prefilledName]);



  const onSubmit = async (data: any) => {

    if (!termsAccepted) {

      setServerError('Please accept Terms & Conditions and Privacy Policy.');

      return;

    }

    setIsLoading(true);

    setServerError(null);

    try {

      const checkRes = await apiService.checkMobile(data.mobile);

      if (checkRes?.exists) {

        setShowAccountSheet(true);

        return;

      }



      const firebaseResult = await firebaseAuthService.sendPhoneOtp(data.mobile);

      if (!firebaseResult.success || !firebaseResult.verificationId) {

        setServerError(firebaseResult.error || 'Failed to send Firebase OTP. Please try again.');

        return;

      }



      router.push({

        pathname: '/(auth)/otp',

        params: {

          mobile: data.mobile,

          verificationId: firebaseResult.verificationId,

          flow: 'register',

          name: data.name,

          email: data.email,

          referralCode: data.referralCode?.trim() || '',

        },

      });

    } catch (error: any) {

      setServerError(error.response?.data?.error || 'Failed to start registration. Please try again.');

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

      >



        <ConfirmSheet

          visible={showAccountSheet}

          title="Account Exists"

          message="This mobile is already registered. Please login instead."

          confirmLabel="Go to Login"

          cancelLabel="Cancel"

          onConfirm={() => { setShowAccountSheet(false); router.replace('/(auth)/login'); }}

          onCancel={() => setShowAccountSheet(false)}

        />



        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>

          <MaterialCommunityIcons name="arrow-left" size={22} color="#334155" />

        </TouchableOpacity>



        {prefilledMobile.length > 0 && (

          <View style={styles.verifiedBadge}>

            <MaterialCommunityIcons name="check-decagram" size={14} color="#10B981" style={{ marginRight: 4 }} />

            <Text style={styles.verifiedBadgeText}>Number Verified</Text>

          </View>

        )}



        <Text style={styles.pageTitle}>Create Account</Text>

        <Text style={styles.pageSubtitle}>Join MedsSeva with your mobile number. We will send a one-time code to verify it.</Text>



        <View style={styles.section}>

          <View style={styles.sectionHeader}>

            <MaterialCommunityIcons name="account-outline" size={18} color={PRIMARY} />

            <Text style={styles.sectionTitle}>Personal Details</Text>

          </View>



          <Text style={styles.fieldLabel}>Full Name</Text>

          <Controller

            control={control}

            name="name"

            render={({ field: { onChange, value } }) => (

              <View style={[styles.inputWrap, errors.name && styles.inputWrapError]}>

                <TextInput style={styles.input} placeholder="Enter your full name" placeholderTextColor="#94A3B8" value={value} onChangeText={onChange} />

              </View>

            )}

          />

          {errors.name && <Text style={styles.errorText}>{errors.name.message}</Text>}

          <Text style={styles.fieldLabel}>
            Email Address <Text style={styles.optionalTag}>(Optional)</Text>
          </Text>
          <Controller

            control={control}

            name="email"

            render={({ field: { onChange, value } }) => (

              <View style={[styles.inputWrap, errors.email && styles.inputWrapError]}>

                <TextInput style={styles.input} placeholder="Enter your email address" placeholderTextColor="#94A3B8" value={value} onChangeText={onChange} keyboardType="email-address" autoCapitalize="none" />

              </View>

            )}

          />

          {errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}



          <Text style={styles.fieldLabel}>Mobile Number</Text>

          <Controller

            control={control}

            name="mobile"

            render={({ field: { onChange, value } }) => (

              <View style={[styles.inputWrap, errors.mobile && styles.inputWrapError]}>

                <TextInput style={styles.input} placeholder="Enter your mobile number" placeholderTextColor="#94A3B8" value={value} onChangeText={onChange} keyboardType="numeric" maxLength={10} editable={!isFromOtp} />

              </View>

            )}

          />

          {errors.mobile && <Text style={styles.errorText}>{errors.mobile.message}</Text>}



          <Text style={styles.fieldLabel}>

            Referral Code <Text style={styles.optionalTag}>(Optional)</Text>

          </Text>

          <Controller

            control={control}

            name="referralCode"

            render={({ field: { onChange, value } }) => (

              <View style={styles.inputWrap}>

                <TextInput

                  style={[styles.input, { textTransform: 'uppercase' }]}

                  placeholder="Enter referral code (e.g. NAM5D93H)"

                  placeholderTextColor="#94A3B8"

                  value={value}

                  onChangeText={(text: string) => onChange(text.toUpperCase())}

                  autoCapitalize="characters"

                />

                {value ? (

                  <TouchableOpacity onPress={() => onChange('')}>

                    <MaterialCommunityIcons name="close-circle-outline" size={18} color="#94A3B8" />

                  </TouchableOpacity>

                ) : (

                  <MaterialCommunityIcons name="gift-outline" size={18} color={PRIMARY} />

                )}

              </View>

            )}

          />

        </View>



        <TouchableOpacity style={styles.checkboxRow} onPress={() => setTermsAccepted(!termsAccepted)} activeOpacity={0.8}>

          <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>

            {termsAccepted && <MaterialCommunityIcons name="check" size={14} color="#fff" />}

          </View>

    <Text style={styles.checkboxText}>

            By clicking "Continue", you agree to MedsSeva's{' '}

            <Text style={styles.checkboxLink} onPress={() => router.push({ pathname: '/legal/LegalWebView', params: { type: 'terms' } })}>Terms & Conditions</Text>

            {' '}and{' '}

            <Text style={styles.checkboxLink} onPress={() => router.push({ pathname: '/legal/LegalWebView', params: { type: 'privacy' } })}>Privacy Policy</Text>

            .

          </Text>

        </TouchableOpacity>



     {serverError && (

          <View style={styles.serverErrorBox}>

            <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#EF4444" />

            <Text style={styles.serverErrorText}>{serverError}</Text>

          </View>

        )}



        <TouchableOpacity

          style={[styles.submitBtn, isLoading && styles.btnDisabled]}

          onPress={handleSubmit(onSubmit)}

          disabled={isLoading}

          activeOpacity={0.85}

        >

          {isLoading ? <ActivityIndicator color="#fff" /> : (

            <>

              <Text style={styles.submitBtnText}>Continue</Text>

              <MaterialCommunityIcons name="arrow-right" size={18} color="#fff" style={{ marginLeft: 8 }} />

            </>

          )}

        </TouchableOpacity>



        <View style={styles.signinRow}>

          <Text style={styles.signinText}>Already have an account? </Text>

          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>

            <Text style={styles.signinLink}>Sign In</Text>

          </TouchableOpacity>

        </View>



        <Text style={styles.copyright}>© {new Date().getFullYear()} MedsSeva Healthcare. All rights reserved.</Text>

<View style={styles.footerLinks}>

          <TouchableOpacity onPress={() => router.push({ pathname: '/legal/LegalWebView', params: { type: 'terms' } })}>

            <Text style={styles.footerLink}>Terms of Service</Text>

          </TouchableOpacity>

          <Text style={styles.footerSep}> · </Text>

          <TouchableOpacity onPress={() => router.push({ pathname: '/legal/LegalWebView', params: { type: 'privacy' } })}>

            <Text style={styles.footerLink}>Privacy Policy</Text>

          </TouchableOpacity>

        </View>

</ScreenWrapper>

    </View>

  );

}

const styles = StyleSheet.create({

  container: { flex: 1, backgroundColor: '#E8F0F3' },

  scrollContent: { flexGrow: 1, padding: 20, paddingTop: Platform.OS === 'ios' ? 56 : 36, paddingBottom: 40 },

  backBtn: {

    width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff',

    justifyContent: 'center', alignItems: 'center',

    borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 20,

    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,

  },

  verifiedBadge: {

    flexDirection: 'row', alignItems: 'center',

    backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0',

    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,

    alignSelf: 'flex-start', marginBottom: 16,

  },

  verifiedBadgeText: { fontSize: 12, color: '#059669', fontWeight: '700' },

  pageTitle: { fontSize: 22, fontWeight: '900', color: '#0F172A', marginBottom: 4 },

  pageSubtitle: { fontSize: 13, color: '#64748B', marginBottom: 24 },

  section: {

    backgroundColor: '#fff', borderRadius: 16, padding: 16,

    borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16,

    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4,

  },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },

  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A' },

  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 },

  optionalTag: { fontSize: 11, fontWeight: '500', color: '#94A3B8' },

  inputWrap: {

    flexDirection: 'row', alignItems: 'center',

    backgroundColor: '#F8FAFC', borderRadius: 10,

    paddingHorizontal: 14, height: 50, marginBottom: 14,

    borderWidth: 1, borderColor: '#E2E8F0',

  },

  inputWrapError: { borderColor: '#EF4444' },

  input: { flex: 1, fontSize: 14, color: '#0F172A' },

  errorText: { fontSize: 12, color: '#EF4444', marginTop: -10, marginBottom: 10, marginLeft: 4 },

  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20, gap: 10 },

  checkbox: {

    width: 20, height: 20, borderRadius: 5,

    borderWidth: 2, borderColor: '#CBD5E1',

    justifyContent: 'center', alignItems: 'center',

    marginTop: 2, flexShrink: 0,

  },

  checkboxChecked: { backgroundColor: PRIMARY, borderColor: PRIMARY },

  checkboxText: { flex: 1, fontSize: 12, color: '#64748B', lineHeight: 20 },

  checkboxLink: { color: PRIMARY, fontWeight: '700' },

  submitBtn: {

    backgroundColor: PRIMARY, height: 52, borderRadius: 14,

    justifyContent: 'center', alignItems: 'center',

    flexDirection: 'row', marginBottom: 20,

    elevation: 2,

  },

  btnDisabled: { opacity: 0.65 },

  submitBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },

  signinRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },

  signinText: { fontSize: 14, color: '#64748B' },

  signinLink: { fontSize: 14, fontWeight: '800', color: PRIMARY },

  copyright: { fontSize: 12, color: '#7A9AAA', textAlign: 'center', marginBottom: 8 },

  footerLinks: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },

  footerLink: { fontSize: 13, color: '#5A7080' },

footerSep: { fontSize: 13, color: '#94A3B8', marginHorizontal: 4 },

  serverErrorBox: {

    flexDirection: 'row', alignItems: 'center', gap: 8,

    backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12,

    borderWidth: 1, borderColor: '#FECACA', width: '100%', marginBottom: 16,

  },

  serverErrorText: { fontSize: 13, color: '#EF4444', fontWeight: '600', flex: 1 },

});

