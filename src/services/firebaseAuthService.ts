import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

let confirmationResult: FirebaseAuthTypes.ConfirmationResult | null = null;

function getFirebasePhoneError(err: any): string {
  if (err?.code === 'auth/missing-client-identifier') {
    return 'Firebase app verification failed. Re-download google-services.json after adding SHA keys, then rebuild the app (Expo reload is not enough).';
  }
  if (err?.code === 'auth/too-many-requests') {
    return 'Too many OTP requests. Please wait a few minutes and try again.';
  }
  if (err?.code === 'auth/invalid-phone-number') {
    return 'Invalid mobile number format.';
  }
  return err?.message || 'Failed to send verification code via Firebase.';
}

export const firebaseAuthService = {
  async sendPhoneOtp(mobile: string): Promise<{ success: boolean; verificationId?: string; error?: string }> {
    try {
      const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
      const fullPhoneNumber = `+91${cleanMobile}`;
      console.log('[FirebaseAuth] Requesting phone OTP for:', fullPhoneNumber);

      confirmationResult = await auth().signInWithPhoneNumber(fullPhoneNumber);
      return {
        success: true,
        verificationId: confirmationResult.verificationId || '',
      };
    } catch (err: any) {
      console.error('[FirebaseAuth] Error sending phone OTP:', err);
      confirmationResult = null;
      return {
        success: false,
        error: getFirebasePhoneError(err),
      };
    }
  },

  async verifyOtpCode(
    otp: string,
    verificationId?: string,
  ): Promise<{ success: boolean; idToken?: string; error?: string }> {
    try {
      if (verificationId) {
        const credential = auth.PhoneAuthProvider.credential(verificationId, otp);
        const userCredential = await auth().signInWithCredential(credential);
        const idToken = await userCredential.user.getIdToken(true);
        return { success: true, idToken };
      }

      if (!confirmationResult) {
        const currentUser = auth().currentUser;
        if (currentUser) {
          const idToken = await currentUser.getIdToken(true);
          return { success: true, idToken };
        }
        return {
          success: false,
          error: 'Verification session expired. Please request a new OTP.',
        };
      }

      const userCredential = await confirmationResult.confirm(otp);
      if (!userCredential?.user) {
        return { success: false, error: 'Failed to verify OTP with Firebase.' };
      }

      const idToken = await userCredential.user.getIdToken(true);
      return { success: true, idToken };
    } catch (err: any) {
      console.error('[FirebaseAuth] Error confirming OTP:', err);
      let errorMsg = 'Invalid OTP code. Please try again.';
      if (err?.code === 'auth/invalid-verification-code') {
        errorMsg = 'Incorrect OTP entered. Please check and re-enter.';
      } else if (err?.code === 'auth/session-expired') {
        errorMsg = 'OTP has expired. Please request a new code.';
      } else if (err?.message) {
        errorMsg = err.message;
      }
      return { success: false, error: errorMsg };
    }
  },

  clearSession() {
    confirmationResult = null;
  },
};
