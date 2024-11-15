import React from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import { GOOGLE_CLIENT_ID } from "../constants/routes/api";

import ErrorToast from "./components/custom/ErrorToast";
import AuthInitializer from "./components/custom/AuthInitializer";
import HealthCheck from "./components/custom/HealthCheck";

import LoginPage from "./pages/login-page";
import { useAppSelector } from "./app/hooks";
import Navbar from "./components/custom/Navbar";
import HomePage from "./pages/home-page";
import FriendsPage from "./pages/friends-page";
import ChatPage from "./pages/chat-page";

const clientId = GOOGLE_CLIENT_ID || "";

const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" />;
};

const App: React.FC = () => {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  return (
    <HealthCheck>
      <AuthInitializer />
      <GoogleOAuthProvider clientId={clientId}>
        <Router>
          <div className="flex flex-col h-screen">
            <Navbar />
            <main className="flex-grow">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={isAuthenticated ? <Navigate to="/chat" /> : <LoginPage />} />
                <Route
                  path="/chat"
                  element={
                    <PrivateRoute>
                      <ChatPage />
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
              </Routes>
            </main>
            <ErrorToast />
          </div>
        </Router>
      </GoogleOAuthProvider>
    </HealthCheck>
  );
};

export default App;
