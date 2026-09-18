import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PartnerInfo {
  id: string;
  labName: string;
  approvalStatus: string;
  isAvailable: boolean;
  rating: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  mobile: string;
  role?: string;
  adminRoleSlug?: string;
  uhid?: string;
  avatarUrl?: string | null;
  healthScore?: number;
  dob?: string;
  altMobile?: string;
  gender?: string;
  bloodGroup?: string;
  partner?: PartnerInfo;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isLoggingOut: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isLoggingOut: false,
  error: null,
};

export const updateProfileAndPersist = createAsyncThunk(
  'auth/updateProfileAndPersist',
  async (updates: Partial<User>, { getState }) => {
    const state = getState() as { auth: AuthState };
    const merged = { ...state.auth.user, ...updates } as User;
    const stored = await AsyncStorage.getItem('user');
    const base = stored ? JSON.parse(stored) : {};
    await AsyncStorage.setItem('user', JSON.stringify({ ...base, ...updates }));
    return merged;
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    loginSuccess: (state, action: PayloadAction<User>) => {
      state.isLoading = false;
      state.isAuthenticated = true;
      state.user = action.payload;
    },
    loginFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    setLoggingOut: (state, action: PayloadAction<boolean>) => {
      state.isLoggingOut = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.isLoggingOut = false;
    },
    updateProfile: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
  },
  extraReducers: (builder) => {
    builder.addCase(updateProfileAndPersist.fulfilled, (state, action) => {
      state.user = action.payload;
    });
  },
});

export const { loginStart, loginSuccess, loginFailure, logout, setLoggingOut, updateProfile } = authSlice.actions;

export default authSlice.reducer;