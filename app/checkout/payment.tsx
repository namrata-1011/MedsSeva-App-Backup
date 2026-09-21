import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import ScreenWrapper from '../../src/components/ScreenWrapper';
import { showError } from '../../src/store/toastStore';
import { useRouter } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { RootState } from '../../src/store';
import { setPaymentMethod, finalizeBooking } from '../../src/store/slices/bookingSlice';
import { clearCart } from '../../src/store/slices/cartSlice';
import { COLORS, TYPOGRAPHY, SHADOWS } from '../../src/theme/theme';
import { apiService } from '../../src/services/api';
import { RazorpayWebView } from '../../components/RazorpayWebView';

// Payment methods shown depend on collectionMode - computed below from Redux
const HOME_PAYMENT_METHODS = [
  { id: 'upi', name: 'Pay Now via UPI', icon: 'qrcode-scan', description: 'Pay instantly. Booking confirmed immediately.' },
  { id: 'cash', name: 'Pay at Home (Cash)', icon: 'cash', description: 'Pay the lab assistant at your doorstep before sample collection.' },
];

const LAB_PAYMENT_METHODS = [
  { id: 'lab_walkin', name: 'Pay at Lab Counter', icon: 'hospital-building', description: 'Visit the branch and pay at the reception before your test.' },
];
export default function PaymentScreen() {
  const router = useRouter();
  const dispatch = useDispatch();

  const cart = useSelector((state: RootState) => state.cart);
  const booking = useSelector((state: RootState) => state.booking);

const isLabVisit = booking.collectionMode === 'lab';
  const branchId = booking.selectedBranchId;
  const PAYMENT_METHODS = isLabVisit ? LAB_PAYMENT_METHODS : HOME_PAYMENT_METHODS;

  // For lab visit: auto-select the only option
  const [selectedMethod, setSelectedMethod] = useState<string | null>(isLabVisit ? 'lab_walkin' : null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRazorpayVisible, setIsRazorpayVisible] = useState(false);
  const [razorpayOrderId, setRazorpayOrderId] = useState<string>('');
  const [razorpayKeyId, setRazorpayKeyId] = useState<string>('');
  const [razorpayAmount, setRazorpayAmount] = useState<number>(0);

  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [useWallet, setUseWallet] = useState<boolean>(false);

  React.useEffect(() => {
    apiService.getWallet().then(data => {
      if (data?.balance) {
        setWalletBalance(data.balance);
      }
    }).catch(console.error);
  }, []);

  const processBackendBooking = async (paymentData?: any) => {
    setIsProcessing(true);
    try {
      let response: any;

      if (paymentData?.razorpay_payment_id) {
        console.log('[Booking] Verifying Razorpay payment:', paymentData);
        response = await apiService.verifyPayment({
          razorpay_order_id: paymentData.razorpay_order_id,
          razorpay_payment_id: paymentData.razorpay_payment_id,
          razorpay_signature: paymentData.razorpay_signature,
          bookingId: '',
        });
      } else {
        const safeDate = booking.selectedDate || new Date(Date.now() + 86400000).toISOString().split('T')[0];
        const safeSlot = booking.selectedTimeSlot || '08:00 AM - 09:00 AM';
        const payload = {
          testIds: cart.items.filter(i => i.itemType === 'test').map(i => i.id),
          packageIds: cart.items.filter(i => i.itemType === 'package').map(i => i.id),
          scheduledDate: safeDate,
          scheduledSlot: safeSlot,
          patientName: booking.patientDetails?.name || 'Guest User',
          patientAge: booking.patientDetails?.age ? Number(booking.patientDetails.age) : undefined,
          patientGender: booking.patientDetails?.gender || undefined,
          mobile: booking.patientDetails?.mobile || undefined,
          addressId: booking.selectedAddressId,
          branchId: isLabVisit ? branchId : undefined,
          collectionMode: booking.collectionMode,
          paymentMethod: selectedMethod,
          couponCode: booking.appliedCouponCode || undefined,
          useWallet: useWallet,
        };
        console.log('[Booking] Sending Booking Payload to backend:', JSON.stringify(payload, null, 2));
        response = await apiService.createBooking(payload);
        console.log('[Booking] SUCCESS! Backend response:', response);
      }

      setIsProcessing(false);

 const newBooking = {
        id: response.id,
        bookingCode: response.bookingCode,  
        date: booking.selectedDate,
        time: booking.selectedTimeSlot,
        status: response.status || 'PENDING',
        collectionMode: response.collectionMode || booking.collectionMode,
        tests: cart.items,
        total: response.totalPaid,
        patientName: booking.patientDetails?.name,
        paymentMethod: selectedMethod,
      };

      dispatch(setPaymentMethod(selectedMethod as string));
      dispatch(finalizeBooking(newBooking));
      dispatch(clearCart());
      router.replace('/checkout/success');
    } catch (err: any) {
      setIsProcessing(false);
      console.error('[Booking] ERROR:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message,
      });
      const errorDetails = err.response?.data?.details
        ? err.response.data.details.map((d: any) => `${d.field}: ${d.message}`).join(', ')
        : '';
      const errorMessage = errorDetails || err.response?.data?.error || err.message || 'Network Error';
      showError(`Booking Failed: ${errorMessage}`);
    }
  };

  const handlePayNow = async () => {
    console.log('[Booking] handlePayNow clicked with method:', selectedMethod, 'isLabVisit:', isLabVisit);
    if (!selectedMethod) {
      showError('Please select a payment method');
      return;
    }

    if (selectedMethod === 'cash' || selectedMethod === 'lab_walkin') {
      processBackendBooking();
    } else {
      setIsProcessing(true);
      try {
        const order = await apiService.createPaymentOrder({
          testIds: cart.items.filter(i => i.itemType === 'test').map(i => i.id),
          packageIds: cart.items.filter(i => i.itemType === 'package').map(i => i.id),
          collectionMode: isLabVisit ? 'lab' : 'home',
          couponCode: booking.appliedCouponCode || undefined,
         scheduledDate: booking.selectedDate ?? undefined,
          scheduledSlot: booking.selectedTimeSlot ?? undefined,
          patientName: booking.patientDetails?.name || 'Guest User',
          patientAge: booking.patientDetails?.age ? Number(booking.patientDetails.age) : undefined,
          patientGender: booking.patientDetails?.gender || undefined,
          mobile: booking.patientDetails?.mobile || undefined,
          addressId: booking.selectedAddressId ?? undefined,
          branchId: (isLabVisit ? branchId : undefined) ?? undefined,
          useWallet: useWallet,
        });
        setRazorpayOrderId(order.razorpayOrderId);
        setRazorpayKeyId(order.keyId);
        setRazorpayAmount(Math.round(order.amount * 100));
        setIsProcessing(false);
        setIsRazorpayVisible(true);
      } catch (error: any) {
        setIsProcessing(false);
        showError('Could not connect to payment server. Please try again.');
      }
    }
  };
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textLight} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment</Text>
        <View style={{ width: 24 }} />
      </View>

     <ScreenWrapper
        bottomButton={
          <TouchableOpacity
            style={[styles.payBtn, !selectedMethod && styles.payBtnDisabled]}
            disabled={!selectedMethod}
            onPress={handlePayNow}
          >
            <Text style={styles.payBtnText}>
              {isLabVisit
                ? 'Confirm Booking'
                : selectedMethod === 'cash'
                ? 'Confirm (Pay at Home)'
                : 'Pay Now'}
            </Text>
          </TouchableOpacity>
        }
        contentContainerStyle={styles.scrollContent}
      >
        
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Booking Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Tests</Text>
            <Text style={styles.summaryValue}>{cart.items.length}</Text>
          </View>
          {isLabVisit ? (
            <Text style={[styles.amountHelperText, { fontSize: 13, color: COLORS.primary, fontWeight: '600', marginTop: 4 }]}>
              Amount will be calculated at checkout from lab.
            </Text>
          ) : (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Amount to Pay</Text>
              <Text style={styles.amountHighlight}>₹{cart.total}</Text>
            </View>
          )}
        </View>

      <Text style={styles.sectionTitle}>
          {isLabVisit ? 'Payment at Lab' : 'Select Payment Method'}
        </Text>

        {isLabVisit && (
          <View style={styles.labInfoBanner}>
            <MaterialCommunityIcons name="information-outline" size={20} color={COLORS.primary} />
            <Text style={styles.labInfoText}>
              No online payment needed. Visit the lab at your scheduled time and pay at the counter. Show your Booking ID to the receptionist.
            </Text>
          </View>
        )}

        {walletBalance > 0 && (
          <TouchableOpacity 
            style={[styles.methodCard, useWallet && styles.methodCardSelected]}
            onPress={() => setUseWallet(!useWallet)}
            activeOpacity={0.7}
          >
            <View style={[styles.methodIconBox, { backgroundColor: '#DCFCE7' }]}>
              <MaterialCommunityIcons name="wallet-giftcard" size={24} color="#16A34A" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.methodName, useWallet && styles.methodNameSelected]}>
                Use Wallet Balance
              </Text>
              <Text style={styles.methodDesc}>Available: ₹{walletBalance}</Text>
            </View>
            <View style={styles.radioContainer}>
              {useWallet ? (
                <MaterialCommunityIcons name="check-circle" size={22} color={COLORS.primary} />
              ) : (
                <MaterialCommunityIcons name="checkbox-blank-circle-outline" size={22} color="#CBD5E1" />
              )}
            </View>
          </TouchableOpacity>
        )}

        {PAYMENT_METHODS.map((method) => (
          <TouchableOpacity 
            key={method.id}
            style={[
              styles.methodCard,
              selectedMethod === method.id && styles.methodCardSelected,
              isLabVisit && styles.methodCardDisabled,
            ]}
            onPress={() => !isLabVisit && setSelectedMethod(method.id)}
            activeOpacity={isLabVisit ? 1 : 0.7}
          >
            <View style={styles.methodIconBox}>
              <MaterialCommunityIcons 
                name={method.icon as any} 
                size={24} 
                color={selectedMethod === method.id ? COLORS.primary : COLORS.textSecondary} 
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[
                styles.methodName,
                selectedMethod === method.id && styles.methodNameSelected
              ]}>
                {method.name}
              </Text>
              <Text style={styles.methodDesc}>{method.description}</Text>
            </View>
            {!isLabVisit && (
              <View style={styles.radioContainer}>
                {selectedMethod === method.id ? (
                  <MaterialCommunityIcons name="radiobox-marked" size={22} color={COLORS.primary} />
                ) : (
                  <MaterialCommunityIcons name="radiobox-blank" size={22} color="#CBD5E1" />
                )}
              </View>
            )}
          </TouchableOpacity>
        ))}
        <View style={styles.securityBox}>
          <MaterialCommunityIcons name="shield-check" size={20} color={COLORS.success} />
          <Text style={styles.securityText}>100% Secure & Encrypted Payments</Text>
        </View>

</ScreenWrapper>

      {/* Processing Overlay */}
      {isProcessing && (
        <View style={[StyleSheet.absoluteFill, styles.processingOverlay, { zIndex: 1000, elevation: 10 }]}>
          <View style={styles.processingCard}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.processingTitle}>Processing Payment</Text>
            <Text style={styles.processingSub}>Please do not close this window or press back.</Text>
          </View>
        </View>
      )}

     
<RazorpayWebView
        isVisible={isRazorpayVisible}
        options={{
          key: razorpayKeyId,
          order_id: razorpayOrderId,
          amount: razorpayAmount,
          currency: 'INR',
          name: 'MedsSeva',
          description: 'Checkout Booking',
          prefill: {
            name: booking.patientDetails?.name || '',
            contact: booking.patientDetails?.mobile || '',
          },
          theme: { color: COLORS.primary }
        }}
        onSuccess={(data) => {
          setIsRazorpayVisible(false);
          processBackendBooking(data);
        }}
      onFailed={(error) => {
          setIsRazorpayVisible(false);
          showError('Payment was not completed. Please retry or choose a different method.');
        }}
        onClose={() => setIsRazorpayVisible(false)}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.textLight,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  summaryCard: {
    backgroundColor: COLORS.primaryLight + '15',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.primaryLight + '40',
  },
  summaryTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.primary,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.textDark,
  },
  summaryValue: {
    ...TYPOGRAPHY.subtitle,
    color: COLORS.textDark,
    fontWeight: 'bold',
  },
amountHighlight: {
    ...TYPOGRAPHY.body,
    color: COLORS.primary,
    fontWeight: '600',
  },
  amountHelperText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
    marginBottom: 4,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textDark,
    marginBottom: 16,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  methodCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(0, 128, 128, 0.02)',
    borderWidth: 1.5,
  },
  methodIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
methodName: {
    ...TYPOGRAPHY.subtitle,
    color: COLORS.textDark,
    fontWeight: '600',
    marginBottom: 2,
  },
  methodDesc: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  methodCardDisabled: {
    opacity: 1,
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(0, 128, 128, 0.03)',
    borderWidth: 1.5,
  },
  labInfoBanner: {
    flexDirection: 'row',
    backgroundColor: COLORS.primaryLight + '15',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.primaryLight + '40',
    alignItems: 'flex-start',
  },
  labInfoText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary,
    flex: 1,
    marginLeft: 10,
    lineHeight: 18,
  },
  methodNameSelected: {
    color: COLORS.primary,
  },
  radioContainer: {
    marginLeft: 8,
  },
  securityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  securityText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.success,
    marginLeft: 8,
    fontWeight: 'bold',
  },
  
  payBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  payBtnDisabled: {
    backgroundColor: COLORS.border,
  },
  payBtnText: {
    ...TYPOGRAPHY.subtitle,
    color: COLORS.textLight,
    fontWeight: 'bold',
  },
  processingOverlay: {
  position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingCard: {
    backgroundColor: COLORS.surface,
    padding: 32,
    borderRadius: 24,
    alignItems: 'center',
    width: '80%',
  },
  processingTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textDark,
    marginTop: 20,
    marginBottom: 8,
  },
  processingSub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textAlign: 'center',
  }
});
