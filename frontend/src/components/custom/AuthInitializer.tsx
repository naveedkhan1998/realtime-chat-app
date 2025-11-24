import { useEffect } from 'react';

import { useGetUserProfileQuery } from '@/services/userApi';
import { useHealthCheckQuery } from '@/services/baseApi';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { logOut, setCredentials, setUser } from '@/features/authSlice';
import {
  setGlobalOnlineUsers,
  addGlobalOnlineUser,
  removeGlobalOnlineUser,
} from '@/features/chatSlice';
import { getCookie } from '@/utils/cookie';
import { baseApi } from '@/services/baseApi';
import {
  GlobalWebSocketService,
  GlobalOnlineUsersEvent,
  GlobalUserOnlineEvent,
  GlobalUserOfflineEvent,
} from '@/utils/websocket';

export default function AuthInitializer() {
  const dispatch = useAppDispatch();
  const accessToken = useAppSelector(state => state.auth.accessToken);
  const user = useAppSelector(state => state.auth.user);

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

  useEffect(() => {
    if (accessToken) {
      const ws = GlobalWebSocketService.getInstance();
      ws.connect(accessToken);

      const handleOnlineUsers = (data: GlobalOnlineUsersEvent) => {
        dispatch(setGlobalOnlineUsers(data.online_users));
      };

      const handleUserOnline = (data: GlobalUserOnlineEvent) => {
        dispatch(addGlobalOnlineUser(data.user_id));
      };

      const handleUserOffline = (data: GlobalUserOfflineEvent) => {
        dispatch(removeGlobalOnlineUser(data.user_id));
      };

      ws.on('global.online_users', handleOnlineUsers);
      ws.on('global.user_online', handleUserOnline);
      ws.on('global.user_offline', handleUserOffline);

      return () => {
        ws.off('global.online_users', handleOnlineUsers);
        ws.off('global.user_online', handleUserOnline);
        ws.off('global.user_offline', handleUserOffline);
      };
    }
  }, [accessToken, dispatch]);

  useEffect(() => {
    if (!accessToken) {
      GlobalWebSocketService.getInstance().disconnect();
    }
  }, [accessToken]);

  return null;
}
