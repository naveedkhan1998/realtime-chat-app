import { useEffect } from 'react';

import { useGetUserProfileQuery } from '@/services/userApi';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { logOut, setCredentials, setUser } from '@/features/authSlice';
import { getCookie } from '@/utils/cookie';
import { baseApi } from '@/services/baseApi';

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

  const { data: userData, error } = useGetUserProfileQuery(undefined, {
    skip: !accessToken || !!user,
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
