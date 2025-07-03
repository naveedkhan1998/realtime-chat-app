import React, { useEffect, useState } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import { GOOGLE_CLIENT_ID } from "../constants/routes/api";

import ErrorToast from "./components/custom/ErrorToast";
import AuthInitializer from "./components/custom/AuthInitializer";
import HealthCheck from "./components/custom/HealthCheck";

import LoginPage from "./pages/login-page";
import { useAppSelector } from "./app/hooks";
import Sidebar from "./components/custom/Sidebar";
import HomePage from "./pages/home-page";
import FriendsPage from "./pages/friends-page";
import ChatPage from "./pages/chat-page";
import NewChat from "./components/custom/NewChat";

const clientId = GOOGLE_CLIENT_ID || "";

const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" />;
};

const App: React.FC = () => {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const [activeChat, setActiveChat] = useState<number | undefined>(undefined);
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
          <div className="flex h-screen">
            <Sidebar activeChat={activeChat} setActiveChat={setActiveChat} isMobile={isMobile} />
            <main className="flex flex-col flex-grow">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={isAuthenticated ? <Navigate to="/chat" /> : <LoginPage />} />
                <Route
                  path="/chat"
                  element={
                    <PrivateRoute>
                      <ChatPage activeChat={activeChat} setActiveChat={setActiveChat} isMobile={isMobile} />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/friends"
                  element={
                    <PrivateRoute>
                      <FriendsPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/new-chat"
                  element={
                    <PrivateRoute>
                      <NewChat />
                    </PrivateRoute>
                  }
                />
              </Routes>
              <ErrorToast />
            </main>
          </div>
        </Router>
      </GoogleOAuthProvider>
    </HealthCheck>
  );
};

export default App;
