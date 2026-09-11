import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, useWindowDimensions,
} from 'react-native';
import ScreenWrapper from '../../src/components/ScreenWrapper';
import QRCode from 'react-native-qrcode-svg';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { COLORS, SHADOWS } from '../../src/theme/theme';
import { apiService } from '../../src/services/api';
import { showError, showSuccess } from '../../src/store/toastStore';
import { ConfirmSheet } from '../../src/components/ConfirmSheet';

type Step = 'otp' | 'payment' | 'upi_waiting' | 'done' | 'sample_collected';

export default function CollectScreen() {
  const router = useRouter();
const { bookingId, paymentStatus, otpVerified } = useLocalSearchParams<{ bookingId: string; paymentStatus: string; otpVerified: string }>();

const isAlreadyPaid = paymentStatus === 'SUCCESS';

  const isOtpAlreadyVerified = otpVerified === 'true';

  const [step, setStep] = useState<Step>(
    isAlreadyPaid ? 'done' :
    isOtpAlreadyVerified ? 'payment' :
    'otp'
  );
const [otp, setOtp] = useState<string[]>(['', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const otpRefs = useRef<(TextInput | null)[]>([null, null, null, null]);
const [isCollectingCash, setIsCollectingCash] = useState(false);
  const [showCashConfirm, setShowCashConfirm] = useState(false);
const [isInitiatingUpi, setIsInitiatingUpi] = useState(false);
  const [qrData, setQrData] = useState<{ upiString: string; amount: number; bookingCode: string; patientName: string } | null>(null);
  const [upiPollCount, setUpiPollCount] = useState(0);
  const [upiMessage, setUpiMessage] = useState('Waiting for patient to scan and pay...');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { width } = useWindowDimensions();
  const qrSize = Math.min(width - 80, 260);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [barcode, setBarcode] = useState('');
  // If already paid online, skip straight to collect sample
  useEffect(() => {
    if (isAlreadyPaid) setStep('done');
  }, [isAlreadyPaid]);

useEffect(() => {
    if (step === 'upi_waiting') {
      pollRef.current = setInterval(async () => {
        try {
          const result = await apiService.checkUpiPaymentStatus(bookingId);
          setUpiPollCount(c => c + 1);
          if (result.paymentStatus === 'SUCCESS') {
            clearInterval(pollRef.current!);
            setStep('done');
          } else if (result.message) {
            setUpiMessage(result.message);
          }
        } catch {
        }
      }, 4000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [step, bookingId]);
const otpValue = otp.join('');

  const handleOtpChange = (text: string, index: number) => {
    const digit = text.replace(/[^0-9]/g, '');
    if (!digit) return; 

    const newOtp = [...otp];
    newOtp[index] = digit[digit.length - 1]; 
    setOtp(newOtp);
    setOtpError('');

    if (index < 3) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      setOtpError('');
      const newOtp = [...otp];
      if (newOtp[index]) {
        newOtp[index] = '';
        setOtp(newOtp);
     
      } else if (index > 0) {
        newOtp[index - 1] = '';
        setOtp(newOtp);
        otpRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleVerifyOtp = async () => {
    const joined = otp.join('');
    if (joined.length !== 4) {
      setOtpError('Please enter the 4-digit OTP.');
      return;
    }
    setOtpError('');
    setIsVerifyingOtp(true);
    try {
      await apiService.verifyBookingOtp(bookingId, joined);
      setStep('payment');
    } catch (e: any) {
      const msg = e?.response?.data?.error || 'Invalid OTP. Please try again.';
      setOtpError(msg);
   
      setOtp(['', '', '', '']);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

const handleCashCollected = () => {
    setShowCashConfirm(true);
  };

  const confirmCashCollected = async () => {
    setShowCashConfirm(false);
    setIsCollectingCash(true);
    try {
      await apiService.collectCash(bookingId);
      setStep('done');
    } catch (e: any) {
      showError(e?.response?.data?.error || 'Could not record payment. Try again.');
    } finally {
      setIsCollectingCash(false);
    }
  };

const handleInitiateUpi = async () => {
    setIsInitiatingUpi(true);
    console.log('[UPI] bookingId:', bookingId);
    try {
   const result = await apiService.initiateUpiCollection(bookingId);
      setQrData({
        upiString: result.upiString,
        amount: result.amount,
        bookingCode: result.bookingCode,
        patientName: result.patientName,
      });
      setStep('upi_waiting');
   } catch (e: any) {
      console.log('[UPI] error:', JSON.stringify(e?.response?.data), e?.message);
      showError(e?.response?.data?.error || 'Could not generate QR code.');
    } finally {
      setIsInitiatingUpi(false);
    }
  };
const handleCollectSample = async () => {
    if (!barcode) {
      showError('Please scan or enter the vial barcode.');
      return;
    }
    try {
      await apiService.updateBookingStatus(bookingId, 'SAMPLE_COLLECTED'); // Assuming backend might later take the barcode
      setStep('sample_collected');
    } catch (e: any) {
      showError(e?.response?.data?.error || 'Could not update status.');
    }
  };

const handleDeliverToLab = () => {
    router.push({
      pathname: '/phlebotomist-flow/select-branch',
      params: { bookingId },
    } as any);
  };


if (step === 'otp') {
    return (
      <View style={styles.container}>
        <ConfirmSheet
          visible={showCashConfirm}
          title="Confirm Cash Collection"
          message="Have you received the full cash payment from the patient?"
          confirmLabel="Yes, Collected"
          cancelLabel="Cancel"
          onConfirm={confirmCashCollected}
          onCancel={() => setShowCashConfirm(false)}
        />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Verify OTP</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScreenWrapper disableKeyboardDismiss contentContainerStyle={styles.scrollContent}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="shield-key-outline" size={40} color={COLORS.primary} />
          </View>
          <Text style={styles.stepTitle}>Enter Booking OTP</Text>
          <Text style={styles.stepSubtitle}>
            Ask the patient for their 4-digit booking verification OTP. This confirms you are at the correct location.
          </Text>

  <View style={styles.otpInputRow}>
            {[0, 1, 2, 3].map(i => (
             <TextInput
                key={i}
                ref={ref => { otpRefs.current[i] = ref; }}
                style={[
                  styles.otpBox,
                  styles.otpDigit,
                  otp[i] ? styles.otpBoxFilled : null,
                  otpError ? styles.otpBoxError : null,
                ]}
                value={otp[i]}
                onChangeText={text => handleOtpChange(text, i)}
                onKeyPress={e => handleOtpKeyPress(e, i)}
                onFocus={() => setOtpError('')}
                keyboardType="number-pad"
                maxLength={1}
                autoFocus={i === 0}
                caretHidden
                textAlign="center"
              />
            ))}
          </View>

          {otpError ? (
            <View style={styles.errorRow}>
              <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#EF4444" />
              <Text style={styles.errorText}>{otpError}</Text>
            </View>
          ) : null}

     <TouchableOpacity
            style={[styles.primaryBtn, (otpValue.length !== 4 || isVerifyingOtp) && styles.primaryBtnDisabled]}
            onPress={handleVerifyOtp}
            disabled={otpValue.length !== 4 || isVerifyingOtp}
          >
            {isVerifyingOtp
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.primaryBtnText}>Verify OTP</Text>
            }
       </TouchableOpacity>
        </ScreenWrapper>
      </View>
    );
  }


if (step === 'upi_waiting') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { clearInterval(pollRef.current!); setStep('payment'); }} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Collect Payment</Text>
          <View style={{ width: 36 }} />
        </View>
        <ScreenWrapper contentContainerStyle={styles.scrollContent}>
          <View style={styles.qrAmountRow}>
            <Text style={styles.qrAmountLabel}>Amount Payable</Text>
            <Text style={styles.qrAmountValue}>₹{qrData?.amount?.toFixed(2)}</Text>
          </View>
          <Text style={styles.qrPatientName}>{qrData?.patientName}</Text>
          <Text style={styles.qrBookingCode}>Booking #{qrData?.bookingCode}</Text>
  {qrData?.upiString ? (
            <View style={styles.qrImageCard}>
              <QRCode
                value={qrData.upiString}
                size={qrSize}
                color="#0F172A"
                backgroundColor="#FFFFFF"
              />
            </View>
          ) : (
            <View style={[styles.qrImageCard, { height: 260, justifyContent: 'center', alignItems: 'center' }]}>
              <ActivityIndicator color={COLORS.primary} size="large" />
            </View>
          )}
          <Text style={styles.qrScanLabel}>Scan using any UPI App</Text>
          <View style={styles.upiAppRow}>
            {['PhonePe', 'Google Pay', 'Paytm', 'BHIM'].map(app => (
              <View key={app} style={styles.upiAppChip}>
                <Text style={styles.upiAppText}>{app}</Text>
              </View>
            ))}
          </View>
       <View style={styles.pollingCard}>
            <ActivityIndicator color={COLORS.primary} size="small" />
            <Text style={styles.pollingText}>{upiMessage}</Text>
          </View>
          <TouchableOpacity
            style={[styles.primaryBtn, { marginTop: 8 }]}
            onPress={async () => {
              try {
                await apiService.collectCash(bookingId);
                setStep('done');
              } catch (e: any) {
                showError(e?.response?.data?.error || 'Could not confirm payment.');
              }
            }}
          >
            <MaterialCommunityIcons name="check-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.primaryBtnText}>Patient Paid - Confirm</Text>
          </TouchableOpacity>
     <Text style={styles.upiNote}>
            Tap above only after patient shows payment confirmation on their UPI app.
          </Text>
        </ScreenWrapper>
      </View>
    );
  }

if (step === 'payment') {
    return (
      <View style={styles.container}>
        <ConfirmSheet
          visible={showCashConfirm}
          title="Confirm Cash Collection"
          message="Have you received the full cash payment from the patient?"
          confirmLabel="Yes, Collected"
          cancelLabel="Cancel"
          onConfirm={confirmCashCollected}
          onCancel={() => setShowCashConfirm(false)}
        />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep('otp')} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Collect Payment</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScreenWrapper contentContainerStyle={styles.scrollContent}>
          <View style={[styles.iconCircle, { backgroundColor: '#FEF3C7' }]}>
            <MaterialCommunityIcons name="check-decagram-outline" size={40} color="#D97706" />
          </View>
          <Text style={styles.stepTitle}>OTP Verified</Text>
          <Text style={styles.stepSubtitle}>
            Select how the patient will pay. This amount will be recorded against the booking.
          </Text>

          <TouchableOpacity style={styles.paymentOption} onPress={handleCashCollected} disabled={isCollectingCash}>
            <View style={[styles.paymentIconBox, { backgroundColor: '#DCFCE7' }]}>
              <MaterialCommunityIcons name="cash" size={28} color="#059669" />
            </View>
            <View style={styles.paymentOptionText}>
              <Text style={styles.paymentOptionTitle}>Cash</Text>
              <Text style={styles.paymentOptionDesc}>Patient pays in cash. Tap after receiving the full amount.</Text>
            </View>
            {isCollectingCash
              ? <ActivityIndicator color={COLORS.primary} />
              : <MaterialCommunityIcons name="chevron-right" size={22} color="#94A3B8" />
            }
          </TouchableOpacity>

          <TouchableOpacity style={styles.paymentOption} onPress={handleInitiateUpi} disabled={isInitiatingUpi}>
            <View style={[styles.paymentIconBox, { backgroundColor: '#EDE9FE' }]}>
              <MaterialCommunityIcons name="qrcode-scan" size={28} color="#7C3AED" />
            </View>
            <View style={styles.paymentOptionText}>
              <Text style={styles.paymentOptionTitle}>UPI / QR Code</Text>
              <Text style={styles.paymentOptionDesc}>Patient scans Razorpay QR on your screen and pays online.</Text>
            </View>
            {isInitiatingUpi
              ? <ActivityIndicator color={COLORS.primary} />
              : <MaterialCommunityIcons name="chevron-right" size={22} color="#94A3B8" />
            }
   </TouchableOpacity>
        </ScreenWrapper>
      </View>
    );
  }


if (step === 'sample_collected') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={{ width: 36 }} />
          <Text style={styles.headerTitle}>Sample Collected</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScreenWrapper contentContainerStyle={styles.scrollContent}>
          <View style={[styles.iconCircle, { backgroundColor: '#EDE9FE' }]}>
            <MaterialCommunityIcons name="test-tube" size={40} color="#7C3AED" />
          </View>
          <Text style={styles.stepTitle}>Sample Collected</Text>
       <Text style={styles.stepSubtitle}>
            Sample collected successfully. Select the MedSeva branch you will deliver it to.
          </Text>

          <View style={styles.progressRow}>
            {(['OTP', 'Payment', 'Sample', 'Lab'] as const).map((label, idx) => (
              <React.Fragment key={label}>
                <View style={styles.progressStep}>
                  <View style={[styles.progressDot, idx <= 2 && styles.progressDotDone]}>
                    {idx <= 2
                      ? <MaterialCommunityIcons name="check" size={12} color="#fff" />
                      : <View style={styles.progressDotInner} />
                    }
                  </View>
                  <Text style={[styles.progressLabel, idx <= 2 && styles.progressLabelDone]}>{label}</Text>
                </View>
                {idx < 3 && (
                  <View style={[styles.progressLine, idx < 2 && styles.progressLineDone]} />
                )}
              </React.Fragment>
            ))}
          </View>

          <View style={styles.doneCard}>
            <MaterialCommunityIcons name="information-outline" size={20} color="#7C3AED" />
            <Text style={[styles.doneCardText, { color: '#7C3AED' }]}>
              Once you have delivered the sample to the lab, tap the button below to complete this booking.
            </Text>
          </View>

<TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#7C3AED' }]} onPress={handleDeliverToLab}>
            <MaterialCommunityIcons name="hospital-building" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.primaryBtnText}>Select Delivery Branch</Text>
          </TouchableOpacity>
        </ScreenWrapper>
      </View>
    );
  }

return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ width: 36 }} />
        <Text style={styles.headerTitle}>Collect Sample</Text>
        <View style={{ width: 36 }} />
      </View>

      {isScanning ? (
        <View style={styles.scannerContainer}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr', 'code128', 'ean13', 'ean8', 'pdf417'] }}
            onBarcodeScanned={({ data }) => {
              setBarcode(data);
              setIsScanning(false);
              showSuccess('Barcode scanned!');
            }}
          />
          <View style={styles.scannerOverlay}>
            <View style={styles.scannerBox} />
          </View>
          <TouchableOpacity style={styles.closeScannerBtn} onPress={() => setIsScanning(false)}>
            <MaterialCommunityIcons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      ) : (
        <ScreenWrapper contentContainerStyle={styles.scrollContent}>
          <View style={[styles.iconCircle, { backgroundColor: '#DCFCE7' }]}>
            <MaterialCommunityIcons name="check-circle" size={40} color="#059669" />
          </View>
          <Text style={styles.stepTitle}>
            {isAlreadyPaid ? 'Paid Online' : 'Payment Collected'}
          </Text>
          <Text style={styles.stepSubtitle}>
            {isAlreadyPaid
              ? 'This booking was paid online. No payment collection needed.'
              : 'Payment has been recorded successfully.'}
          </Text>

          <View style={styles.barcodeSection}>
            <Text style={styles.barcodeLabel}>Vial Barcode</Text>
            <View style={styles.barcodeInputRow}>
              <TextInput
                style={styles.barcodeInput}
                placeholder="Enter or scan barcode"
                value={barcode}
                onChangeText={setBarcode}
                autoCapitalize="characters"
              />
              <TouchableOpacity
                style={styles.scanBtn}
                onPress={async () => {
                  if (!cameraPermission?.granted) {
                    const res = await requestCameraPermission();
                    if (!res.granted) {
                      showError('Camera permission is required to scan barcodes.');
                      return;
                    }
                  }
                  setIsScanning(true);
                }}
              >
                <MaterialCommunityIcons name="barcode-scan" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.doneCard}>
            <MaterialCommunityIcons name="information-outline" size={20} color={COLORS.primary} />
            <Text style={styles.doneCardText}>
              Collect the sample from the patient and tap the button below. Verify fasting status if required.
            </Text>
          </View>

          <TouchableOpacity style={[styles.primaryBtn, !barcode && styles.primaryBtnDisabled]} onPress={handleCollectSample} disabled={!barcode}>
            <MaterialCommunityIcons name="test-tube" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.primaryBtnText}>Sample Collected</Text>
          </TouchableOpacity>
        </ScreenWrapper>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  scrollContent: { padding: 24, paddingBottom: 60, alignItems: 'center' },
  iconCircle: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: '#F0FDFA',
    justifyContent: 'center', alignItems: 'center', marginBottom: 24, marginTop: 16,
  },
  stepTitle: { fontSize: 22, fontWeight: '900', color: '#0F172A', marginBottom: 10, textAlign: 'center' },
  stepSubtitle: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 22, marginBottom: 32, paddingHorizontal: 8 },
  otpInputRow: { flexDirection: 'row', gap: 14, marginBottom: 8 },
 otpBox: {
    width: 58, height: 66, borderRadius: 14, borderWidth: 2, borderColor: '#E2E8F0',
    backgroundColor: '#fff', color: '#0F172A',
    ...SHADOWS.soft,
  },
  otpBoxFilled: { borderColor: COLORS.primary, backgroundColor: '#F0FDFA' },
  otpDigit: { fontSize: 26, fontWeight: '900', color: '#0F172A' },
  otpBoxError: { borderColor: '#EF4444', backgroundColor: '#FFF1F2' },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  errorText: { fontSize: 13, color: '#EF4444', fontWeight: '600' },
  primaryBtn: {
    flexDirection: 'row', backgroundColor: COLORS.primary, height: 52,
    borderRadius: 14, justifyContent: 'center', alignItems: 'center',
    width: '100%', marginTop: 16,
  },
  primaryBtnDisabled: { backgroundColor: '#CBD5E1' },
  primaryBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  paymentOption: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#E2E8F0',
    marginBottom: 14, width: '100%', ...SHADOWS.soft,
  },
  paymentIconBox: {
    width: 52, height: 52, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  paymentOptionText: { flex: 1 },
  paymentOptionTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  paymentOptionDesc: { fontSize: 12, color: '#64748B', lineHeight: 18 },

qrAmountRow: { alignItems: 'center', marginBottom: 4, marginTop: 8 },
  qrAmountLabel: { fontSize: 13, color: '#64748B', fontWeight: '600', marginBottom: 2 },
  qrAmountValue: { fontSize: 38, fontWeight: '900', color: '#0F172A' },
  qrPatientName: { fontSize: 16, fontWeight: '700', color: '#0F172A', textAlign: 'center', marginBottom: 2 },
  qrBookingCode: { fontSize: 12, color: '#94A3B8', textAlign: 'center', marginBottom: 20 },
  qrImageCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 16,
    borderWidth: 2, borderColor: '#E2E8F0', marginBottom: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  qrScanLabel: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 12, textAlign: 'center' },
  upiAppRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 20 },
  upiAppChip: {
    paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#F1F5F9',
    borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0',
  },
  upiAppText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  pollingCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F0FDFA', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#CCFBF1', marginBottom: 12, width: '100%',
  },
  pollingText: { fontSize: 13, color: '#0F172A', fontWeight: '600', flex: 1 },
  upiNote: { fontSize: 12, color: '#94A3B8', textAlign: 'center', lineHeight: 18, paddingHorizontal: 16 },
  doneCard: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#F0FDFA',
    borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#CCFBF1',
    marginBottom: 24, width: '100%', gap: 10,
  },
 doneCardText: { fontSize: 14, color: COLORS.primary, lineHeight: 20, flex: 1 },
  progressRow: {
    flexDirection: 'row', alignItems: 'center', width: '100%',
    marginBottom: 28, paddingHorizontal: 8,
  },
  progressStep: { alignItems: 'center', gap: 6 },
  progressDot: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: '#E2E8F0',
    justifyContent: 'center', alignItems: 'center',
  },
  progressDotDone: { backgroundColor: '#7C3AED' },
  progressDotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#94A3B8' },
  progressLabel: { fontSize: 10, fontWeight: '600', color: '#94A3B8' },
  progressLabelDone: { color: '#7C3AED' },
  progressLine: { flex: 1, height: 2, backgroundColor: '#E2E8F0', marginBottom: 16 },
  progressLineDone: { backgroundColor: '#7C3AED' },
  barcodeSection: { width: '100%', marginBottom: 20 },
  barcodeLabel: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 8 },
  barcodeInputRow: { flexDirection: 'row', gap: 10 },
  barcodeInput: { flex: 1, height: 50, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 16, fontSize: 16, color: '#0F172A' },
  scanBtn: { width: 50, height: 50, backgroundColor: COLORS.primary, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  scannerContainer: { flex: 1, backgroundColor: '#000' },
  scannerOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  scannerBox: { width: 250, height: 250, borderWidth: 2, borderColor: '#fff', backgroundColor: 'transparent' },
  closeScannerBtn: { position: 'absolute', top: 40, right: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }
});
