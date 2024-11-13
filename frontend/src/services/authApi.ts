// services/authApi.ts

import { baseApi } from "./baseApi";

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

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<TokenResponse, LoginRequest>({
      query: (credentials) => ({
        url: "accounts/login/",
        method: "POST",
        body: credentials,
      }),
    }),
    register: builder.mutation<TokenResponse, RegisterRequest>({
      query: (userData) => ({
        url: "accounts/register/",
        method: "POST",
        body: userData,
      }),
    }),
    googleLogin: builder.mutation<TokenResponse, GoogleLoginRequest>({
      query: (data) => ({
        url: "accounts/social/google/",
        method: "POST",
        body: data,
      }),
    }),
  }),
  overrideExisting: false,
});

export const { useLoginMutation, useRegisterMutation, useGoogleLoginMutation } = authApi;
