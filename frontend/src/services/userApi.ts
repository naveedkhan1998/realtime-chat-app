// services/userApi.ts

import { baseApi } from "./baseApi";

export interface UserProfile {
  id: number;
  email: string;
  name: string;
}

export const userApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUserProfile: builder.query<UserProfile, void>({
      query: () => "accounts/profile/",
    }),

  }),
  overrideExisting: false,
});

export const { useGetUserProfileQuery } = userApi;
