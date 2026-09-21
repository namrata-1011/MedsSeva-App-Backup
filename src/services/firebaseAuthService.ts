import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

let confirmationResult: FirebaseAuthTypes.ConfirmationResult | null = null;

export const firebaseAuthService = {
  /**
   * Request Firebase Phone Authentication OTP
   * Sends SMS OTP directly to the specified mobile number via Firebase
   */
  async sendPhoneOtp(mobile: string): Promise<{ success: boolean; error?: string }> {
    try {
      const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
      const fullPhoneNumber = `+91${cleanMobile}`;
      console.log('[FirebaseAuth] Requesting phone OTP for:', fullPhoneNumber);

      confirmationResult = await auth().signInWithPhoneNumber(fullPhoneNumber);
      return { success: true };
    } catch (err: any) {
      console.error('[FirebaseAuth] Error sending phone OTP:', err);
      return {
        success: false,
        error: err?.message || 'Failed to send SMS OTP via Firebase. Please check your network or phone number.',
      };
    }
  },

  /**
   * Verify the received SMS OTP with Firebase
   * Returns the verified Firebase ID Token to send to MedsSeva backend
   */
  async verifyOtpCode(otp: string): Promise<{ success: boolean; idToken?: string; error?: string }> {
    try {
      if (!confirmationResult) {
        // If confirmation session was lost, check if currentUser is already verified
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

      console.log('[FirebaseAuth] Confirming OTP code with Firebase...');
      const userCredential = await confirmationResult.confirm(otp);
      if (!userCredential || !userCredential.user) {
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

  /**
   * Reset session
   */
  clearSession() {
    confirmationResult = null;
  },
};
