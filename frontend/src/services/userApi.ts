// services/userApi.ts

import { baseApi } from './baseApi';

export interface UserProfile {
  id: number;
  email: string;
  avatar: string;
  name: string;
  auth_provider?: string;
  date_joined?: string;
}

export interface User {
  id: number;
  avatar: string;
  name: string;
}

export interface UpdateProfilePayload {
  name?: string;
  avatar?: File;
}

export interface ChangePasswordPayload {
  password: string;
  password2: string;
}

export const userApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    getUserProfile: builder.query<UserProfile, void>({
      query: () => 'accounts/profile/',
      providesTags: ['Users'],
    }),
    updateProfile: builder.mutation<UserProfile, FormData>({
      query: body => ({
        url: 'accounts/profile/',
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Users'],
    }),
    changePassword: builder.mutation<{ msg: string }, ChangePasswordPayload>({
      query: body => ({
        url: 'accounts/change-password/',
        method: 'PUT',
        body,
      }),
    }),
    searchUsers: builder.query<User[], { query: string }>({
      query: ({ query }) =>
        `accounts/users/?search=${encodeURIComponent(query)}`,
      providesTags: ['Users'],
    }),
  }),

  overrideExisting: false,
});

export const {
  useGetUserProfileQuery,
  useUpdateProfileMutation,
  useChangePasswordMutation,
  useSearchUsersQuery,
} = userApi;
