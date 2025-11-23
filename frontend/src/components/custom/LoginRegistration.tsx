/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { Loader2, Mail, Lock, User, Info } from 'lucide-react';

import {
  useLoginMutation,
  useRegisterMutation,
  useGoogleLoginMutation,
} from '@/services/authApi';
import { useAppDispatch } from '@/app/hooks';
import { setCredentials } from '@/features/authSlice';
import { setCookie } from '@/utils/cookie';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function LoginRegistration() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerPassword2, setRegisterPassword2] = useState('');
  const [loginError, setLoginError] = useState('');
  const [registerError, setRegisterError] = useState('');

  const [login, { isLoading: isLoginLoading }] = useLoginMutation();
  const [register, { isLoading: isRegisterLoading }] = useRegisterMutation();
  const [googleLogin, { isLoading: isGoogleLoginLoading }] =
    useGoogleLoginMutation();

  const handleLoginSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoginError('');

    try {
      const userData = await login({
        email: loginEmail,
        password: loginPassword,
      }).unwrap();
      handleAuthSuccess(userData);
    } catch (error: any) {
      handleAuthError(error, setLoginError);
    }
  };

  const handleRegisterSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setRegisterError('');

    if (registerPassword !== registerPassword2) {
      setRegisterError('Passwords do not match.');
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
      setLoginError('No credential received from Google.');
      return;
    }

    try {
      const userData = await googleLogin({
        token: response.credential,
      }).unwrap();
      handleAuthSuccess(userData);
    } catch (error: any) {
      handleAuthError(error, setLoginError);
    }
  };

  const handleAuthSuccess = (userData: any) => {
    setCookie('access_token', userData.token.access, { expires: 1 });
    setCookie('refresh_token', userData.token.refresh, { expires: 7 });
    dispatch(
      setCredentials({
        accessToken: userData.token.access,
        refreshToken: userData.token.refresh,
        isAuthenticated: true,
      })
    );
    navigate('/chat');
  };

  const handleAuthError = (error: any, setError: (message: string) => void) => {
    if (error?.data?.errors) {
      setError(
        error.data.errors.non_field_errors?.[0] ||
          'Something went wrong. Please try again.'
      );
    } else if (typeof error?.data === 'string') {
      setError(error.data);
    } else {
      setError('Something went wrong. Please try again.');
    }
  };

  const handleLoginFailure = () => {
    setLoginError('Google login failed.');
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="login" className="w-full space-y-6">
        <TabsList className="grid w-full grid-cols-2 rounded-xl bg-muted/50 border border-border p-1 backdrop-blur-md">
          <TabsTrigger
            value="login"
            className="rounded-lg data-[state=active]:bg-primary/60 data-[state=active]:text-primary-foreground data-[state=active]:shadow-none transition-all duration-300"
          >
            Sign in
          </TabsTrigger>
          <TabsTrigger
            value="register"
            className="rounded-lg data-[state=active]:bg-primary/60 data-[state=active]:text-primary-foreground data-[state=active]:shadow-none transition-all duration-300"
          >
            Create account
          </TabsTrigger>
        </TabsList>

        <TabsContent value="login" className="space-y-4">
          {loginError && (
            <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive backdrop-blur-sm">
              {loginError}
            </p>
          )}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <FormRow
              id="loginEmail"
              label="Email"
              type="email"
              icon={Mail}
              value={loginEmail}
              onChange={setLoginEmail}
              placeholder="name@example.com"
              autoComplete="email"
            />
            <FormRow
              id="loginPassword"
              label="Password"
              type="password"
              icon={Lock}
              value={loginPassword}
              onChange={setLoginPassword}
              placeholder="Enter your password"
              autoComplete="current-password"
            />
            <Button
              type="submit"
              className="w-full gap-2 rounded-xl h-11 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300"
              size="lg"
              disabled={isLoginLoading}
            >
              {isLoginLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLoginLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="register" className="space-y-4">
          {registerError && (
            <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive backdrop-blur-sm">
              {registerError}
            </p>
          )}
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <FormRow
              id="registerName"
              label="Full name"
              icon={User}
              value={registerName}
              onChange={setRegisterName}
              placeholder="John Doe"
              autoComplete="name"
            />
            <FormRow
              id="registerEmail"
              label="Email"
              type="email"
              icon={Mail}
              value={registerEmail}
              onChange={setRegisterEmail}
              placeholder="name@example.com"
              autoComplete="email"
            />
            <FormRow
              id="registerPassword"
              label="Password"
              type="password"
              icon={Lock}
              value={registerPassword}
              onChange={setRegisterPassword}
              placeholder="Create a password"
              autoComplete="new-password"
            />
            <FormRow
              id="registerPassword2"
              label="Confirm password"
              type="password"
              icon={Lock}
              value={registerPassword2}
              onChange={setRegisterPassword2}
              placeholder="Confirm your password"
              autoComplete="new-password"
            />
            <Button
              type="submit"
              className="w-full gap-2 rounded-xl h-11 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300"
              size="lg"
              disabled={isRegisterLoading}
            >
              {isRegisterLoading && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {isRegisterLoading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>
        </TabsContent>
      </Tabs>

      <div className="space-y-5">
        <Divider label="Or continue with" />
        <div className="flex flex-col gap-4">
          <div className="w-full rounded-xl border border-border bg-muted/50 p-2 text-center backdrop-blur-sm hover:bg-accent/50 transition-colors">
            {isGoogleLoginLoading ? (
              <div className="flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Connecting...
              </div>
            ) : (
              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={handleLoginSuccess}
                  onError={handleLoginFailure}
                  useOneTap
                  type="standard"
                  theme="outline"
                  size="large"
                  shape="rectangular"
                  width="100%"
                />
              </div>
            )}
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-muted-foreground backdrop-blur-sm">
            <Info className="mt-0.5 h-4 w-4 text-primary flex-shrink-0" />
            <p className="text-xs leading-relaxed">
              This is a portfolio project. Please do not use sensitive
              passwords. Data is stored for demonstration purposes only.
            </p>
          </div>
        </div>
      </div>
    </div>
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

function FormRow({
  id,
  label,
  type = 'text',
  icon: Icon,
  value,
  onChange,
  placeholder,
  autoComplete,
}: FormRowProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium text-foreground/80">
        {label}
      </Label>
      <div className="relative group">
        <Icon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70 group-focus-within:text-primary transition-colors" />
        <Input
          id={id}
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={event => onChange(event.target.value)}
          autoComplete={autoComplete}
          className="h-11 rounded-xl border-border bg-muted/50 pl-10 text-sm shadow-sm transition-all focus:bg-background focus:border-primary/50 focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/50"
          required
        />
      </div>
    </div>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-muted-foreground/60">
      <span className="h-px flex-1 bg-border/60" />
      {label}
      <span className="h-px flex-1 bg-border/60" />
    </div>
  );
}
