import React from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { GOOGLE_CLIENT_ID } from "../constants/routes/api";
import AuthPage from "./pages/AuthPage";

const clientId = GOOGLE_CLIENT_ID ? GOOGLE_CLIENT_ID : "";

const App: React.FC = () => {
  return (
    <GoogleOAuthProvider clientId={clientId}>
      <AuthPage initialMethod="login" />
    </GoogleOAuthProvider>
  );
};

export default App;
