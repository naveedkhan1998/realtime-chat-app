import React from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import Login from "./components/Login";
import { GOOGLE_CLIENT_ID } from "../constants/routes/api";

const clientId = GOOGLE_CLIENT_ID ? GOOGLE_CLIENT_ID : "";

const App: React.FC = () => {
  return (
    <GoogleOAuthProvider clientId={clientId}>
      <Login />
      <div className="">Holla</div>
    </GoogleOAuthProvider>
  );
};

export default App;
