import { useEffect } from 'react';

import { useGetUserProfileQuery } from '@/services/userApi';
import { useHealthCheckQuery } from '@/services/baseApi';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { logOut, setCredentials, setUser } from '@/features/authSlice';
import { getCookie } from '@/utils/cookie';
import { baseApi } from '@/services/baseApi';
import { useUnifiedWebSocket } from '@/hooks/useUnifiedWebSocket';
import {
  loadUserSettings,
  clearUserSettings,
} from '@/features/notificationSettingsSlice';

export default function AuthInitializer() {
  const dispatch = useAppDispatch();
  const accessToken = useAppSelector(state => state.auth.accessToken);
  const user = useAppSelector(state => state.auth.user);

  // Initialize WebSocket connection with the unified service
  // This hook handles all global online user events automatically via Redux
  useUnifiedWebSocket(accessToken);

  // Load user-specific notification settings when user changes
  useEffect(() => {
    if (user?.id) {
      dispatch(loadUserSettings(user.id));
    } else {
      dispatch(clearUserSettings());
    }
  }, [user?.id, dispatch]);

  useEffect(() => {
    if (!accessToken || !user) {
      const accessTokenFromCookie = getCookie('access_token');
      const refreshToken = getCookie('refresh_token');
      if (accessTokenFromCookie && refreshToken) {
        dispatch(
          setCredentials({
            accessToken: accessTokenFromCookie,
            refreshToken,
            isAuthenticated: true,
          })
        );
      }
    }
  }, [accessToken, user, dispatch]);

  const { isError: isHealthError, isLoading: isHealthLoading } =
    useHealthCheckQuery();
  const isBackendReady = !isHealthLoading && !isHealthError;

  const { data: userData, error } = useGetUserProfileQuery(undefined, {
    skip: !accessToken || !!user || !isBackendReady,
  });

  useEffect(() => {
    if (userData) {
      dispatch(setUser(userData));
    } else if (error) {
      console.error('Error fetching user profile:', error);
      dispatch(logOut());
      dispatch(baseApi.util.resetApiState());
    }
  }, [userData, error, dispatch]);

  return null;
}
