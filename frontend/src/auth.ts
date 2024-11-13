import { useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import api from "./api";
import { ACCESS_TOKEN, REFRESH_TOKEN, GOOGLE_ACCESS_TOKEN } from "./token";

export const useAuthentication = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const auth = async () => {
      const accessToken = localStorage.getItem(ACCESS_TOKEN);
      const googleAccessToken = localStorage.getItem(GOOGLE_ACCESS_TOKEN);

      if (accessToken) {
        const decoded = jwtDecode(accessToken);
        const tokenExpired = decoded.exp;
        const now = Date.now() / 1000;

        if (tokenExpired) {
          if (tokenExpired < now) {
            await refreshToken();
          } else {
            setIsAuthenticated(true);
          }
        }
      } else if (googleAccessToken) {
        const isGoogleTokenValid = await validateGoogleToken(googleAccessToken);
        if (isGoogleTokenValid) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      }
    };

    auth().catch(() => setIsAuthenticated(false));
  }, []);

  const refreshToken = async () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN);
    if (refreshToken) {
      const response = await api.post("/api/token/refresh/", { refresh: refreshToken });
      localStorage.setItem(ACCESS_TOKEN, response.data.access);
      localStorage.setItem(REFRESH_TOKEN, response.data.refresh);
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(ACCESS_TOKEN);
    localStorage.removeItem(REFRESH_TOKEN);
    localStorage.removeItem(GOOGLE_ACCESS_TOKEN);
    setIsAuthenticated(false);
  };

  const validateGoogleToken = async (googleAccessToken: string) => {
    try {
      const response = await api.post("/api/google/validate-token/", { access_token: googleAccessToken }, { headers: { "Content-Type": "application/json" } });
      return response.data.valid;
    } catch (error) {
      console.log(error);
      return false;
    }
  };

  return { isAuthenticated, logout };
};
