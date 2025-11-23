import {
  createApi,
  fetchBaseQuery,
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';

import { RootState } from '@/app/store';
import { logOut, setCredentials } from '@/features/authSlice';
import { setError } from '@/features/errorSlice';
import { setCookie } from '@/utils/cookie';

// Determine the base URL dynamically
const getBaseUrl = () => {
  const API_URL = import.meta.env.VITE_API_URL;
  const baseUrl = API_URL ? API_URL : null;
  return baseUrl || 'http://localhost:8000/api/';
};

const baseQuery = fetchBaseQuery({
  baseUrl: getBaseUrl(),
  prepareHeaders: (headers, { getState }) => {
    const accessToken = (getState() as RootState).auth.accessToken;
    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }
    return headers;
  },
});

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);

  if (result.error) {
    // Dispatch the setError action with the error message
    api.dispatch(setError(getErrorMessage(result.error)));
  }

  if (result.error && result.error.status === 401) {
    // Try to refresh the token
    const refreshToken = (api.getState() as RootState).auth.refreshToken;
    if (refreshToken) {
      const refreshResult = await baseQuery(
        {
          url: 'accounts/refresh_token/',
          method: 'POST',
          body: { refresh: refreshToken },
        },
        api,
        extraOptions
      );
      if (refreshResult.data) {
        const newAccessToken = (refreshResult.data as { access: string })
          .access;
        const newRefreshToken = (refreshResult.data as { refresh: string })
          .refresh;

        // Update tokens in cookies
        setCookie('access_token', newAccessToken, { expires: 1 });
        setCookie('refresh_token', newRefreshToken, { expires: 7 });

        // Update Redux store
        api.dispatch(
          setCredentials({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            isAuthenticated: true,
          })
        );
        // Retry the original request with new token
        result = await baseQuery(args, api, extraOptions);
      } else {
        // Refresh token invalid, log out
        api.dispatch(logOut());
        api.dispatch({ type: 'api/resetApiState' });
      }
    } else {
      // No refresh token, log out
      api.dispatch(logOut());
      api.dispatch({ type: 'api/resetApiState' });
    }
  }

  return result;
};

// Helper function to extract error messages

const getErrorMessage = (error: FetchBaseQueryError): string => {
  if ('status' in error) {
    const data = error.data as { errors?: Record<string, string[]> };
    if (data && data.errors) {
      // Extract error messages from the 'errors' key
      const errorMessages = extractErrorMessages(data.errors);
      return errorMessages.join('\n');
    }
    return 'An unknown server error occurred.';
  }
  return (error as { message: string }).message || 'An unknown error occurred';
};

// Helper function to flatten error messages
const extractErrorMessages = (errors: Record<string, string[]>): string[] => {
  const messages: string[] = [];
  for (const key in errors) {
    if (Array.isArray(errors[key])) {
      messages.push(...errors[key]);
    } else if (typeof errors[key] === 'object') {
      messages.push(...extractErrorMessages(errors[key]));
    } else {
      messages.push(String(errors[key]));
    }
  }
  return messages;
};

// Create the base API slice
export const baseApi = createApi({
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'FriendRequests',
    'Friendships',
    'ChatRooms',
    'Messages',
    'TypingStatus',
    'Users',
    'Notifications',
  ],
  endpoints: builder => ({
    // Existing endpoints

    healthCheck: builder.query<void, void>({
      query: () => ({
        url: '',
        method: 'GET',
      }),
    }),
  }),
});

// Export the auto-generated hook
export const { useHealthCheckQuery } = baseApi;
