/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from "react";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import { useLoginMutation, useRegisterMutation, useGoogleLoginMutation } from "@/services/authApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppDispatch } from "@/app/hooks";
import { setCredentials } from "@/features/authSlice";
import { setCookie } from "@/utils/cookie";
import { Loader2, Mail, Lock, User } from "lucide-react";

import { useNavigate } from "react-router-dom";

export default function LoginRegistration() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerPassword2, setRegisterPassword2] = useState("");
  const [loginError, setLoginError] = useState("");
  const [registerError, setRegisterError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [login, { isLoading: isLoginLoading }] = useLoginMutation();
  const [register, { isLoading: isRegisterLoading }] = useRegisterMutation();
  const [googleLogin, { isLoading: isGoogleLoginLoading }] = useGoogleLoginMutation();

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    try {
      const userData = await login({ email: loginEmail, password: loginPassword }).unwrap();
      handleAuthSuccess(userData);
      setSuccessMessage("Login successful!");
    } catch (error: any) {
      handleAuthError(error, setLoginError);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError("");
    if (registerPassword !== registerPassword2) {
      setRegisterError("Passwords don't match.");
      return;
    }
    try {
      const userData = await register({
        email: registerEmail,
        name: registerName,
        password: registerPassword,
        password2: registerPassword2,
        tc: true,
      }).unwrap();
      handleAuthSuccess(userData);
      setSuccessMessage("Registration successful!");
    } catch (error: any) {
      handleAuthError(error, setRegisterError);
    }
  };

  const handleLoginSuccess = async (response: CredentialResponse) => {
    if (response.credential) {
      try {
        const userData = await googleLogin({ token: response.credential }).unwrap();
        handleAuthSuccess(userData);
        setSuccessMessage("Google login successful!");
      } catch (error: any) {
        handleAuthError(error, setLoginError);
      }
    } else {
      setLoginError("No credential received from Google.");
    }
  };

  const handleAuthSuccess = (userData: any) => {
    setCookie("access_token", userData.token.access, { expires: 1 });
    setCookie("refresh_token", userData.token.refresh, { expires: 7 });
    dispatch(
      setCredentials({
        accessToken: userData.token.access,
        refreshToken: userData.token.refresh,
        isAuthenticated: true,
      })
    );
    navigate("/dashboard");
  };

  const handleAuthError = (error: any, setError: (message: string) => void) => {
    console.error("Authentication error:", error);
    if (error.data && error.data.errors) {
      setError(error.data.errors.non_field_errors?.[0] || "An error occurred during authentication.");
    } else {
      setError("An error occurred during authentication.");
    }
  };

  const handleLoginFailure = () => {
    setLoginError("Google login failed.");
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-center">Welcome to MNK Chat</CardTitle>
        <CardDescription className="text-center">Sign in to your account or create a new one to start chatting.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleLoginSubmit} className="space-y-6">
              {loginError && <p className="text-sm font-medium text-destructive">{loginError}</p>}
              {successMessage && <p className="text-sm font-medium text-green-600">{successMessage}</p>}
              <div className="space-y-2">
                <Label htmlFor="loginEmail">Email</Label>
                <div className="relative">
                  <Mail className="absolute w-4 h-4 left-3 top-3 text-muted-foreground" />
                  <Input id="loginEmail" type="email" placeholder="Enter your email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required className="pl-10" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="loginPassword">Password</Label>
                <div className="relative">
                  <Lock className="absolute w-4 h-4 left-3 top-3 text-muted-foreground" />
                  <Input id="loginPassword" type="password" placeholder="Enter your password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required className="pl-10" />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isLoginLoading}>
                {isLoginLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {isLoginLoading ? "Signing In..." : "Sign In"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="register">
            <form onSubmit={handleRegisterSubmit} className="space-y-6">
              {registerError && <p className="text-sm font-medium text-destructive">{registerError}</p>}
              {successMessage && <p className="text-sm font-medium text-green-600">{successMessage}</p>}
              <div className="space-y-2">
                <Label htmlFor="registerName">Name</Label>
                <div className="relative">
                  <User className="absolute w-4 h-4 left-3 top-3 text-muted-foreground" />
                  <Input id="registerName" placeholder="Enter your name" value={registerName} onChange={(e) => setRegisterName(e.target.value)} required className="pl-10" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="registerEmail">Email</Label>
                <div className="relative">
                  <Mail className="absolute w-4 h-4 left-3 top-3 text-muted-foreground" />
                  <Input id="registerEmail" type="email" placeholder="Enter your email" value={registerEmail} onChange={(e) => setRegisterEmail(e.target.value)} required className="pl-10" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="registerPassword">Password</Label>
                <div className="relative">
                  <Lock className="absolute w-4 h-4 left-3 top-3 text-muted-foreground" />
                  <Input
                    id="registerPassword"
                    type="password"
                    placeholder="Choose a password"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    required
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="registerPassword2">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute w-4 h-4 left-3 top-3 text-muted-foreground" />
                  <Input
                    id="registerPassword2"
                    type="password"
                    placeholder="Confirm your password"
                    value={registerPassword2}
                    onChange={(e) => setRegisterPassword2(e.target.value)}
                    required
                    className="pl-10"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isRegisterLoading}>
                {isRegisterLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {isRegisterLoading ? "Registering..." : "Register"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>

      <CardFooter className="flex flex-col space-y-4">
        <div className="relative w-full">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="px-2 bg-background text-muted-foreground">Or continue with</span>
          </div>
        </div>
        <div className="w-full">
          {isGoogleLoginLoading ? (
            <div className="flex items-center justify-center">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              <span>Loading...</span>
            </div>
          ) : (
            <GoogleLogin onSuccess={handleLoginSuccess} onError={handleLoginFailure} useOneTap type="standard" theme="filled_black" size="large" shape="rectangular" />
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
