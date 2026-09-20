import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tokenStorage } from '../utils/tokenStorage';

const getBaseUrl = () => {
  // If running in Expo Go, dynamically detect laptop's IP address
  let hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri && Constants.manifest2?.extra?.expoGo?.debuggerHost) {
    hostUri = Constants.manifest2.extra.expoGo.debuggerHost;
  }

  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:5000/api`;
  }

  // Fallback for APK build (connects to live Render server automatically)
  return 'https://medsseva-backend-cnud.onrender.com/api';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
    'Bypass-Tunnel-Reminder': 'true'
  },
});

api.interceptors.request.use(
  async (config) => {
    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.baseURL || ''}${config.url || ''}`);
    try {
      const token = await tokenStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.error('Failed to inject token in API request', e);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const couponApiService = {
  getPublicCoupons: () => api.get('/coupons').then(res => res.data),
  validate: async (data: {
    code: string;
    cartTotal: number;
    testIds?: string[];
    packageIds?: string[];
    collectionMode?: string;
    branchId?: string;
  }) => {
    const response = await api.post('/coupons/validate', data);
    return response.data;
  },
};

export const apiService = {
  getAllCategories: () => api.get('/categories').then(res => res.data),
  getAllTests: () => api.get('/tests').then(res => res.data),
  getAllPackages: () => api.get('/packages').then(res => res.data),
  getTestById: (id: string) => api.get(`/tests/${id}`).then(res => res.data),
  createBooking: (data: any) => api.post('/bookings', data).then(res => res.data),
createPaymentOrder: (data: {
    testIds: string[];
    packageIds: string[];
    collectionMode: string;
    couponCode?: string;
    scheduledDate?: string;
    scheduledSlot?: string;
    patientName?: string;
    patientAge?: number;
    patientGender?: string;
    mobile?: string;
    addressId?: string;
    branchId?: string;
  }) => api.post('/payments/create-order', data).then(res => res.data),
  verifyPayment: (data: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string; bookingId: string }) =>
    api.post('/bookings/verify-payment', data).then(res => res.data),
  getPricingPreview: (data: { testIds: string[]; packageIds: string[]; collectionMode: string; couponCode?: string }) =>
    api.post('/payments/pricing-preview', data).then(res => res.data),
  getInvoice: (bookingId: string) => api.get(`/payments/invoice/${bookingId}`).then(res => res.data),
  login: (data: any) => api.post('/auth/login', data).then(res => res.data),
  register: (data: any) => api.post('/auth/register', data).then(res => res.data),
checkMobile: (mobile: string) => api.get(`/auth/check-mobile?mobile=${encodeURIComponent(mobile)}`).then(res => res.data),
sendOtp: (mobile: string) => api.post('/auth/otp/send', { mobile }).then(res => res.data),
  verifyOtp: (mobile: string, otp: string) => api.post('/auth/otp/verify', { mobile, otp }).then(res => res.data),
  loginWithOtp: (mobile: string, otp: string) => api.post('/auth/otp/login', { mobile, otp }).then(res => res.data),
  sendEmailOtp: (email: string) => api.post('/auth/email/send-otp', { email }).then(res => res.data),
  verifyEmailOtp: (email: string, otp: string) => api.post('/auth/email/verify-otp', { email, otp }).then(res => res.data),
  sendForgotPasswordOtp: (email: string) => api.post('/auth/email/forgot-password', { email }).then(res => res.data),
  verifyForgotPasswordOtp: (email: string, otp: string) => api.post('/auth/email/verify-reset-otp', { email, otp }).then(res => res.data),
  resetPassword: (email: string, password: string) => api.post('/auth/reset-password', { email, password }).then(res => res.data),
  getAddresses: (mobile: string) => api.get(`/addresses?mobile=${encodeURIComponent(mobile)}`).then(res => res.data),
  addAddress: (data: any) => api.post('/addresses', data).then(res => res.data),
  removeAddress: (id: string) => api.delete(`/addresses/${id}`).then(res => res.data),
  getCities: () => api.get('/cities').then(res => res.data),
  getBookings: (mobile: string) => api.get(`/bookings?mobile=${encodeURIComponent(mobile)}`).then(res => res.data),
  getBookingById: (id: string) => api.get(`/bookings?id=${id}`).then(res => res.data),
  getMe: () => api.get('/users/me').then(res => res.data),
  getWallet: () => api.get('/users/wallet').then(res => res.data),
  addFamilyMember: (data: any) => api.post('/users/family', data).then(res => res.data),
  removeFamilyMember: (id: string) => api.delete(`/users/family/${id}`).then(res => res.data),
getPaymentMethods: (mobile: string) => api.get(`/payment-methods?mobile=${encodeURIComponent(mobile)}`).then(res => res.data),
  addPaymentMethod: (data: any) => api.post('/payment-methods', data).then(res => res.data),
  setDefaultPaymentMethod: (id: string, mobile: string) => api.patch(`/payment-methods/${id}/default`, { mobile }).then(res => res.data),
  removePaymentMethod: (id: string, mobile: string) => api.delete(`/payment-methods/${id}?mobile=${encodeURIComponent(mobile)}`).then(res => res.data),
  getUpiMethods: (mobile: string) => api.get(`/upi-methods?mobile=${encodeURIComponent(mobile)}`).then(res => res.data),
  addUpiMethod: (data: { mobile: string; upiId: string; provider: string }) => api.post('/upi-methods', data).then(res => res.data),
  setPrimaryUpi: (id: string, mobile: string) => api.patch(`/upi-methods/${id}/primary`, { mobile }).then(res => res.data),
  removeUpiMethod: (id: string, mobile: string) => api.delete(`/upi-methods/${id}?mobile=${encodeURIComponent(mobile)}`).then(res => res.data),
getMyReports: () => api.get('/reports/my-reports').then(res => res.data),
  getReportById: (id: string) => api.get(`/reports/${id}`).then(res => res.data),
 getAvailableSlots: (date: string) => api.get(`/bookings/available-slots?date=${encodeURIComponent(date)}`).then(res => res.data),
getBranches: (params?: { isActive?: boolean; homeCollection?: boolean; labVisit?: boolean; lat?: number; lng?: number }) =>
    api.get('/branches', { params }).then(res => res.data),
  getBranchById: (id: string) => api.get(`/branches/${id}`).then(res => res.data),
updateMe: (data: { name?: string; email?: string; dob?: string; gender?: string; bloodGroup?: string; altMobile?: string }) => api.patch('/users/me', data).then(res => res.data),
  deleteAccount: () => api.delete('/users/me').then(res => res.data),
  registerPartner: (data: any) => api.post('/auth/register/partner', data).then(res => res.data),
  uploadPartnerOnboardingDocument: (fileUri: string, mimeType: string, fileName: string, documentType: string, partnerId?: string) => {
    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      type: mimeType || 'application/pdf',
      name: fileName || `${documentType}.pdf`,
    } as any);
    formData.append('documentType', documentType);
    if (partnerId) formData.append('partnerId', partnerId);

    return api.post('/auth/register/partner-document', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(res => res.data);
  },
  getPartnerOnboardingDocuments: () => api.get('/partner/documents').then(res => res.data),
  getPartnerBookings: () => api.get('/partner/bookings').then(res => res.data),
  getPartnerHistory: () => api.get('/partner/history').then(res => res.data),
getPartnerNotifications: () => api.get('/partner/notifications').then(res => res.data),
  getBookingOtp: (bookingId: string) => api.get(`/bookings/${bookingId}/collection-otp`).then(res => res.data),
  verifyBookingOtp: async (bookingId: string, otp: string) => {
    try {
      const res = await api.post(`/partner/bookings/${bookingId}/verify-otp`, { otp });
      return res.data;
    } catch {
      const fallbackRes = await api.post(`/bookings/${bookingId}/verify-otp`, { otp });
      return fallbackRes.data;
    }
  },
  verifySampleOtp: async (bookingId: string, otp: string) => {
    try {
      const res = await api.post(`/partner/bookings/${bookingId}/verify-otp`, { otp });
      return res.data;
    } catch {
      const fallbackRes = await api.post(`/bookings/${bookingId}/verify-otp`, { otp });
      return fallbackRes.data;
    }
  },
getBookingDetails: (bookingId: string) => api.get(`/bookings?id=${bookingId}`).then(res => {
    const data = res.data;
    return Array.isArray(data) ? data[0] ?? null : data;
  }),
acceptBooking: (bookingId: string) => api.patch(`/partner/bookings/${bookingId}/accept`).then(res => res.data),
acceptLabBooking: (bookingId: string) => api.patch(`/bookings/${bookingId}/accept-lab`).then(res => res.data),
  patientReachedLab: (bookingId: string) => api.patch(`/bookings/${bookingId}/patient-reached`).then(res => res.data),
  rejectLabBooking: (bookingId: string, reason?: string) => api.patch(`/bookings/${bookingId}/reject-lab`, { reason }).then(res => res.data),
  rejectBooking: async (bookingId: string, reason?: string) => {
    try {
      const res = await api.patch(`/partner/bookings/${bookingId}/reject`, { reason });
      return res.data;
    } catch {
      const fallbackRes = await api.patch(`/bookings/${bookingId}/reject-lab`, { reason });
      return fallbackRes.data;
    }
  },
  updateBookingStatus: async (bookingId: string, status: string, note?: string) => {
    try {
      const res = await api.patch(`/partner/bookings/${bookingId}/status`, { status, note });
      return res.data;
    } catch (err: any) {
      if (err?.response?.status === 404 || err?.response?.data?.message?.includes('not found')) {
        const fallbackRes = await api.patch(`/bookings/${bookingId}/status`, { status, note });
        return fallbackRes.data;
      }
      throw err;
    }
  },
  toggleAvailability: (isAvailable: boolean) => api.patch('/partner/availability', { isAvailable }).then(res => res.data),
  getPartnerProfile: () => api.get('/partner/profile').then(res => res.data),
collectCash: (bookingId: string) => api.post(`/partner/bookings/${bookingId}/collect-cash`).then(res => res.data),
initiateUpiCollection: (bookingId: string) => api.post(`/partner/bookings/${bookingId}/collect-upi`).then(res => res.data),
  checkUpiPaymentStatus: (bookingId: string) => api.get(`/partner/bookings/${bookingId}/upi-status`).then(res => res.data),
  verifyPartnerUpiPayment: (bookingId: string, data: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) =>
    api.post(`/partner/bookings/${bookingId}/verify-upi`, data).then(res => res.data),
getPartnerStats: () => api.get('/partner/stats').then(res => res.data),

  uploadPrescription: (formData: FormData) =>
    api.post('/prescriptions/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(res => res.data),

  getMyPrescriptions: () => api.get('/prescriptions/my').then(res => res.data),

deletePrescription: (id: string) => api.delete(`/prescriptions/${id}`).then(res => res.data),

registerFcmToken: (token: string, platform: string) => api.post('/notifications/token/register', { token, platform }).then(res => res.data),
  unregisterFcmToken: (token: string) => api.post('/notifications/token/unregister', { token }).then(res => res.data),
  getCmsBanners: () => api.get('/cms/banners').then(res => {
    if (Array.isArray(res.data)) return res.data;
    if (res.data && Array.isArray(res.data.banners)) return res.data.banners;
    if (res.data && Array.isArray(res.data.data)) return res.data.data;
    return [];
  }),
  getMyNotifications: (page = 1, limit = 20) => api.get(`/notifications/my?page=${page}&limit=${limit}`).then(res => res.data),
  markNotificationRead: (id: string) => api.patch(`/notifications/my/${id}/read`).then(res => res.data),
  markAllNotificationsRead: () => api.patch('/notifications/my/read-all').then(res => res.data),
  deleteNotification: (id: string) => api.delete(`/notifications/my/${id}`).then(res => res.data),
  sendBroadcast: (data: any) => api.post('/notifications/broadcast', data).then(res => res.data),
  getNotificationLogs: (page = 1, status?: string) => api.get(`/notifications/logs?page=${page}${status ? `&status=${status}` : ''}`).then(res => res.data),
  retryFailedNotifications: () => api.post('/notifications/retry-failed').then(res => res.data),

uploadAvatar: (imageUri: string, mimeType: string, fileName: string) => {
    const formData = new FormData();
    formData.append('avatar', {
      uri: imageUri,
      type: mimeType,
      name: fileName,
    } as any);
    return api.post('/users/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(res => res.data);
  },

 updatePartnerProfile: (data: { name?: string; address?: string; city?: string; state?: string; pincode?: string }) =>
    api.patch('/partner/profile', data).then(res => res.data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/partner/change-password', { currentPassword, newPassword }).then(res => res.data),
  getPartnerAvailabilitySchedule: () => api.get('/partner/availability/schedule').then(res => res.data),
  updatePartnerAvailabilitySchedule: (data: any) => api.patch('/partner/availability/schedule', data).then(res => res.data),
  getPartnerBranch: () => api.get('/partner/branch').then(res => res.data),
  getPartnerRatings: () => api.get('/partner/ratings').then(res => res.data),
  getPartnerBranchStaff: () => api.get('/partner/branch-staff').then(res => res.data),
  assignPartnerStaff: (bookingId: string, executiveId: string) =>
    api.patch(`/partner/bookings/${bookingId}/assign-staff`, { executiveId }).then(res => res.data),
  getDeliveryBranches: () => api.get('/partner/delivery-branches').then(res => res.data),
  selectDeliveryBranch: (bookingId: string, branchId: string) =>
    api.post(`/partner/bookings/${bookingId}/select-branch`, { branchId }).then(res => res.data),
  confirmBranchDelivery: (bookingId: string) =>
    api.post(`/partner/bookings/${bookingId}/confirm-delivery`).then(res => res.data),

submitRating: (data: { bookingId: string; rating: number; review?: string }) =>
    api.post('/ratings', data).then(res => res.data),
  getBookingRating: (bookingId: string) =>
    api.get(`/ratings/booking/${bookingId}`).then(res => res.data),

  getOrCreateConversation: () => api.get('/chat/conversation').then(res => res.data),
  getChatMessages: (conversationId: string, cursor?: string) =>
    api.get(`/chat/conversation/${conversationId}/messages`, { params: cursor ? { cursor } : {} }).then(res => res.data),
  getChatUnreadCount: () => api.get('/chat/conversation/unread').then(res => res.data),
  getMyReferralInfo: () => api.get('/referrals/my-referral').then(res => res.data),
  registerDoctor: (data: any) => api.post('/auth/register/doctor', data).then(res => res.data),
  registerPhlebotomist: (data: any) => api.post('/auth/register/phlebotomist', data).then(res => res.data),

  // Doctor Portal & Sample Actions
  getDoctorPortalData: (period?: string) =>
    api.get('/commissions/doctor/portal-data', { params: period ? { period } : {} }).then(res => res.data),
  requestDoctorSamplePickup: (data: {
    patientName: string;
    patientMobile: string;
    patientAge?: number;
    patientGender?: string;
    testIds?: string[];
    address?: string;
    notes?: string;
  }) => api.post('/doctors/pickup-request', data).then(res => res.data),
  doctorDirectSampleHandover: (data: {
    targetBranchId: string;
    patientName: string;
    patientMobile?: string;
    patientAge?: number;
    patientGender?: string;
    testIds?: string[];
    sampleType?: string;
    notes?: string;
  }) => api.post('/doctors/direct-handover', data).then(res => res.data),
};
export default api;

  