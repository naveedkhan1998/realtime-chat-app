// features/auth/authSlice.ts

import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { removeCookie } from "@/utils/cookie";
import { UserProfile } from "@/services/userApi";

export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  user: UserProfile | null;
}

const initialState: AuthState = {
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  user: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{ accessToken: string; refreshToken: string; isAuthenticated: boolean }>) => {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.isAuthenticated = action.payload.isAuthenticated;
    },
    setUser: (state, action: PayloadAction<UserProfile>) => {
      state.user = action.payload;
    },
    logOut: (state) => {
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.user = null;
      // Also remove tokens from cookies
      removeCookie("access_token");
      removeCookie("refresh_token");
    },
  },
});

export const { setCredentials, setUser, logOut } = authSlice.actions;
export default authSlice.reducer;
