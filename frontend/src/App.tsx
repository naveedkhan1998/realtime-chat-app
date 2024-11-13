import React from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { GOOGLE_CLIENT_ID } from "../constants/routes/api";
import Login from "./components/Login";

const clientId = GOOGLE_CLIENT_ID ? GOOGLE_CLIENT_ID : "";

const App: React.FC = () => {
  return (
    <GoogleOAuthProvider clientId={clientId}>
      <Login />
    </GoogleOAuthProvider>
  );
};

export default App;
