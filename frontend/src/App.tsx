import React, { useEffect, useState } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { BrowserRouter as Router, Route, Routes, Navigate, Outlet } from "react-router-dom";
import { GOOGLE_CLIENT_ID } from "../constants/routes/api";

import ErrorToast from "./components/custom/ErrorToast";
import AuthInitializer from "./components/custom/AuthInitializer";
import HealthCheck from "./components/custom/HealthCheck";

import LoginPage from "./pages/auth/login-page";
import { useAppSelector } from "./app/hooks";
import HomePage from "./pages/app/home-page";
import FriendsPage from "./pages/app/friends-page";
import ChatPage from "./pages/app/chat-page";
import NewChat from "./components/custom/NewChat";
import AppShell from "./layouts/AppShell";
import PublicLayout from "./layouts/PublicLayout";
import AuthLayout from "./layouts/AuthLayout";

const clientId = GOOGLE_CLIENT_ID || "";

const PrivateRoute = () => {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

const App: React.FC = () => {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return (
    <HealthCheck>
      <AuthInitializer />
      <GoogleOAuthProvider clientId={clientId}>
        <Router>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route path="/" element={<HomePage />} />
            </Route>
            <Route element={<AuthLayout />}>
              <Route path="/login" element={isAuthenticated ? <Navigate to="/chat" replace /> : <LoginPage />} />
            </Route>
            <Route element={<PrivateRoute />}>
              <Route element={<AppShell isMobile={isMobile} />}>
                <Route path="/chat" element={<ChatPage />} />
                <Route path="/chat/:chatId" element={<ChatPage />} />
                <Route path="/friends" element={<FriendsPage />} />
                <Route path="/new-chat" element={<NewChat />} />
              </Route>
            </Route>
          </Routes>
        </Router>
        <ErrorToast />
      </GoogleOAuthProvider>
    </HealthCheck>
  );
};

export default App;
