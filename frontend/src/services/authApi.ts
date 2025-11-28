// services/authApi.ts

import { baseApi } from './baseApi';

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  email: string;
  name: string;
  password: string;
  password2: string;
  tc: boolean;
}

interface TokenResponse {
  token: {
    access: string;
    refresh: string;
  };
  msg: string;
}

interface GoogleLoginRequest {
  token: string;
}

interface LogoutRequest {
  refresh: string;
}

interface LogoutResponse {
  msg: string;
}

export const authApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    login: builder.mutation<TokenResponse, LoginRequest>({
      query: credentials => ({
        providesTags: ['Users', 'ChatRooms'],
        url: 'accounts/login/',
        method: 'POST',
        body: credentials,
      }),
    }),
    logout: builder.mutation<LogoutResponse, LogoutRequest>({
      query: data => ({
        url: 'accounts/logout/',
        method: 'POST',
        body: data,
      }),
    }),
    register: builder.mutation<TokenResponse, RegisterRequest>({
      query: userData => ({
        providesTags: ['Users', 'ChatRooms'],
        url: 'accounts/register/',
        method: 'POST',
        body: userData,
      }),
    }),
    googleLogin: builder.mutation<TokenResponse, GoogleLoginRequest>({
      query: data => ({
        providesTags: ['Users', 'ChatRooms'],
        url: 'accounts/social/google/',
        method: 'POST',
        body: data,
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useGoogleLoginMutation,
  useLogoutMutation,
} = authApi;
