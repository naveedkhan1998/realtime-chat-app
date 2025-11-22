/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from "react";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import { Loader2, Mail, Lock, User, Sparkles, ShieldCheck, ArrowRight } from "lucide-react";

import { useLoginMutation, useRegisterMutation, useGoogleLoginMutation } from "@/services/authApi";
import { useAppDispatch } from "@/app/hooks";
import { setCredentials } from "@/features/authSlice";
import { setCookie } from "@/utils/cookie";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

  const [login, { isLoading: isLoginLoading }] = useLoginMutation();
  const [register, { isLoading: isRegisterLoading }] = useRegisterMutation();
  const [googleLogin, { isLoading: isGoogleLoginLoading }] = useGoogleLoginMutation();

  const handleLoginSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoginError("");

    try {
      const userData = await login({ email: loginEmail, password: loginPassword }).unwrap();
      handleAuthSuccess(userData);
    } catch (error: any) {
      handleAuthError(error, setLoginError);
    }
  };

  const handleRegisterSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setRegisterError("");

    if (registerPassword !== registerPassword2) {
      setRegisterError("Passwords do not match.");
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
    } catch (error: any) {
      handleAuthError(error, setRegisterError);
    }
  };

  const handleLoginSuccess = async (response: CredentialResponse) => {
    if (!response.credential) {
      setLoginError("No credential received from Google.");
      return;
    }

    try {
      const userData = await googleLogin({ token: response.credential }).unwrap();
      handleAuthSuccess(userData);
    } catch (error: any) {
      handleAuthError(error, setLoginError);
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
    navigate("/chat");
  };

  const handleAuthError = (error: any, setError: (message: string) => void) => {
    if (error?.data?.errors) {
      setError(error.data.errors.non_field_errors?.[0] || "Something went wrong. Please try again.");
    } else if (typeof error?.data === "string") {
      setError(error.data);
    } else {
      setError("Something went wrong. Please try again.");
    }
  };

  const handleLoginFailure = () => {
    setLoginError("Google login failed.");
  };

  return (
    <Card className="relative w-full overflow-hidden border border-primary/20 bg-card/80 shadow-2xl shadow-primary/20 backdrop-blur-xl">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 opacity-80" />
      <CardHeader className="space-y-4 pb-8">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          Access
        </div>
        <CardTitle className="text-3xl font-semibold text-foreground">Jump back into the flow</CardTitle>
        <CardDescription className="text-base text-muted-foreground">
          Sign in or create an account to sync conversations, files, and people instantly across every device.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <Tabs defaultValue="login" className="w-full space-y-6">
          <TabsList className="grid w-full grid-cols-2 rounded-full bg-muted/60 p-1 backdrop-blur">
            <TabsTrigger value="login" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Sign in
            </TabsTrigger>
            <TabsTrigger value="register" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Create account
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="space-y-6">
            {loginError && <p className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{loginError}</p>}
            <form onSubmit={handleLoginSubmit} className="space-y-5">
              <FormRow
                id="loginEmail"
                label="Work email"
                type="email"
                icon={Mail}
                value={loginEmail}
                onChange={setLoginEmail}
                placeholder="you@company.com"
                autoComplete="email"
              />
              <FormRow id="loginPassword" label="Password" type="password" icon={Lock} value={loginPassword} onChange={setLoginPassword} placeholder="Enter your password" autoComplete="current-password" />
              <Button type="submit" className="w-full gap-2 shadow-lg shadow-primary/20" size="lg" disabled={isLoginLoading}>
                {isLoginLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isLoginLoading ? "Signing in..." : "Access workspace"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="register" className="space-y-6">
            {registerError && <p className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{registerError}</p>}
            <form onSubmit={handleRegisterSubmit} className="space-y-5">
              <FormRow id="registerName" label="Full name" icon={User} value={registerName} onChange={setRegisterName} placeholder="Alex Morgan" autoComplete="name" />
              <FormRow id="registerEmail" label="Work email" type="email" icon={Mail} value={registerEmail} onChange={setRegisterEmail} placeholder="you@company.com" autoComplete="email" />
              <FormRow
                id="registerPassword"
                label="Password"
                type="password"
                icon={Lock}
                value={registerPassword}
                onChange={setRegisterPassword}
                placeholder="Create a strong password"
                autoComplete="new-password"
              />
              <FormRow
                id="registerPassword2"
                label="Confirm password"
                type="password"
                icon={Lock}
                value={registerPassword2}
                onChange={setRegisterPassword2}
                placeholder="Repeat your password"
                autoComplete="new-password"
              />
              <Button type="submit" className="w-full gap-2 shadow-lg shadow-primary/20" size="lg" disabled={isRegisterLoading}>
                {isRegisterLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isRegisterLoading ? "Creating workspace..." : "Create workspace"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="space-y-5">
          <Divider label="Or continue with" />
          <div className="flex flex-col gap-4">
            <div className="w-full rounded-2xl border border-border/40 bg-muted/70 p-3 text-center shadow-inner shadow-primary/10 backdrop-blur">
              {isGoogleLoginLoading ? (
                <div className="flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Preparing secure login...
                </div>
              ) : (
                <GoogleLogin onSuccess={handleLoginSuccess} onError={handleLoginFailure} useOneTap type="standard" theme="outline" size="large" shape="rectangular" />
              )}
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary shadow-inner shadow-primary/20">
              <ShieldCheck className="mt-1 h-4 w-4" />
              <p>
                Every plan includes SSO, SCIM provisioning, and audit-ready logging. Need help?{" "}
                <a href="mailto:support@mnkchat.com" className="inline-flex items-center gap-1 font-medium underline underline-offset-4">
                  Contact our team
                  <ArrowRight className="h-3 w-3" />
                </a>
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface FormRowProps {
  id: string;
  label: string;
  type?: string;
  icon: React.ElementType;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
}

function FormRow({ id, label, type = "text", icon: Icon, value, onChange, placeholder, autoComplete }: FormRowProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </Label>
      <div className="relative">
        <Icon className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          className="h-12 rounded-2xl border border-primary/20 bg-background/80 pl-11 text-sm shadow-sm shadow-primary/10 backdrop-blur transition focus:border-primary focus:ring-2 focus:ring-primary/30"
          required
        />
      </div>
    </div>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-muted-foreground">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      {label}
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
    </div>
  );
}
