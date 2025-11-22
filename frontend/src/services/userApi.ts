// services/userApi.ts

import { baseApi } from './baseApi';

export interface UserProfile {
  id: number;
  email: string;
  avatar: string;
  name: string;
}

export const userApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    getUserProfile: builder.query<UserProfile, void>({
      query: () => 'accounts/profile/',
    }),
    searchUsers: builder.query<UserProfile[], { query: string }>({
      query: ({ query }) =>
        `accounts/users/?search=${encodeURIComponent(query)}`,
      providesTags: ['Users'],
    }),
  }),

  overrideExisting: false,
});

export const { useGetUserProfileQuery, useSearchUsersQuery } = userApi;
