// components/AuthInitializer.tsx

import { useEffect } from "react";

import { useGetUserProfileQuery } from "@/services/userApi";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { logOut, setCredentials, setUser } from "@/features/authSlice";
import { getCookie } from "@/utils/cookie";

export default function AuthInitializer() {
  const dispatch = useAppDispatch();
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const user = useAppSelector((state) => state.auth.user);
  if (!accessToken || user) {
    const accessToken = getCookie("access_token");
    const refreshToken = getCookie("refresh_token");
    if (accessToken && refreshToken) {
      dispatch(
        setCredentials({
          accessToken,
          refreshToken,
          isAuthenticated: true,
        })
      );
    }
  }

  const { data: userData, error } = useGetUserProfileQuery(undefined, {
    skip: !accessToken || !!user,
  });

  useEffect(() => {
    if (userData) {
      dispatch(setUser(userData));
    } else if (error) {
      console.error("Error fetching user profile:", error);
      // Handle error (e.g., dispatch logOut action)
      dispatch(logOut());
    }
  }, [userData, error, dispatch]);

  return null;
}
