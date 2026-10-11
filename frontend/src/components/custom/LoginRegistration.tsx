/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { Loader2, Mail, Lock, User, AlertCircle, Radio } from 'lucide-react';

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
import { cn } from '@/lib/utils';

export default function LoginRegistration() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
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
      setRegisterError('Passcodes do not match.');
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
          'Authentication failed. Please check credentials.'
      );
    } else if (typeof error?.data === 'string') {
      setError(error.data);
    } else {
      setError('Connection to gateway failed. Please retry.');
    }
  };

  const handleLoginFailure = () => {
    setLoginError('Google federated login failed.');
  };

  return (
    <div className="space-y-5">
      {/* Tactile Segmented Rocker */}
      <div className="flex rounded-lg border border-border bg-well p-1 gap-1">
        <button
          type="button"
          onClick={() => {
            setActiveTab('login');
            setLoginError('');
          }}
          className={cn(
            'flex-1 py-2 rounded font-mono text-xs font-bold transition-all cursor-pointer',
            activeTab === 'login'
              ? 'bg-card text-foreground shadow-key border border-border'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          SIGN IN
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('register');
            setRegisterError('');
          }}
          className={cn(
            'flex-1 py-2 rounded font-mono text-xs font-bold transition-all cursor-pointer',
            activeTab === 'register'
              ? 'bg-card text-foreground shadow-key border border-border'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          ENROLL OPERATOR
        </button>
      </div>

      {activeTab === 'login' ? (
        <div className="space-y-4">
          {loginError && (
            <div className="flex items-center gap-2 p-3 rounded-lg border border-destructive/40 bg-destructive/10 font-mono text-xs text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-3.5">
            <FormRow
              id="loginEmail"
              label="OPERATOR EMAIL"
              type="email"
              icon={Mail}
              value={loginEmail}
              onChange={setLoginEmail}
              placeholder="operator@station.net"
              autoComplete="email"
            />
            <FormRow
              id="loginPassword"
              label="ACCESS PASSCODE"
              type="password"
              icon={Lock}
              value={loginPassword}
              onChange={setLoginPassword}
              placeholder="Enter passcode"
              autoComplete="current-password"
            />

            <Button
              type="submit"
              className="w-full font-mono text-xs font-bold h-11 gap-2 shadow-key"
              disabled={isLoginLoading}
            >
              {isLoginLoading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  AUTHENTICATING...
                </>
              ) : (
                'ENTER CONSOLE'
              )}
            </Button>
          </form>
        </div>
      ) : (
        <div className="space-y-4">
          {registerError && (
            <div className="flex items-center gap-2 p-3 rounded-lg border border-destructive/40 bg-destructive/10 font-mono text-xs text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              <span>{registerError}</span>
            </div>
          )}

          <form onSubmit={handleRegisterSubmit} className="space-y-3">
            <FormRow
              id="registerName"
              label="OPERATOR CALLSIGN"
              icon={User}
              value={registerName}
              onChange={setRegisterName}
              placeholder="e.g. Echo-Seven"
              autoComplete="name"
            />
            <FormRow
              id="registerEmail"
              label="STATION EMAIL"
              type="email"
              icon={Mail}
              value={registerEmail}
              onChange={setRegisterEmail}
              placeholder="operator@station.net"
              autoComplete="email"
            />
            <FormRow
              id="registerPassword"
              label="MASTER PASSCODE"
              type="password"
              icon={Lock}
              value={registerPassword}
              onChange={setRegisterPassword}
              placeholder="Minimum 8 characters"
              autoComplete="new-password"
            />
            <FormRow
              id="registerPassword2"
              label="CONFIRM PASSCODE"
              type="password"
              icon={Lock}
              value={registerPassword2}
              onChange={setRegisterPassword2}
              placeholder="Confirm passcode"
              autoComplete="new-password"
            />

            <Button
              type="submit"
              className="w-full font-mono text-xs font-bold h-11 gap-2 shadow-key"
              disabled={isRegisterLoading}
            >
              {isRegisterLoading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  PROVISIONING OPERATOR...
                </>
              ) : (
                'ENROLL & CONNECT'
              )}
            </Button>
          </form>
        </div>
      )}

      {/* Federated Access Strip */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground uppercase">
          <span className="h-px flex-1 bg-border" />
          <span>FEDERATED IDENTITY</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <div className="w-full rounded-lg border border-border bg-well p-2 text-center">
          {isGoogleLoginLoading ? (
            <div className="flex items-center justify-center gap-2 font-mono text-xs text-muted-foreground py-2">
              <Loader2 className="size-3.5 animate-spin text-primary" />
              <span>EXCHANGING GOOGLE TOKENS...</span>
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

        {/* Demo Notice */}
        <div className="flex items-start gap-2 p-2.5 rounded-lg border border-border bg-well/40 font-mono text-[11px] text-muted-foreground">
          <Radio className="size-3.5 text-primary shrink-0 mt-0.5" />
          <p className="leading-tight">
            Portfolio environment &middot; Flash registers and session memory may be cleared periodically.
          </p>
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
    <div className="space-y-1">
      <Label htmlFor={id} className="label-engraved text-foreground">
        {label}
      </Label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
        <Input
          id={id}
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={event => onChange(event.target.value)}
          autoComplete={autoComplete}
          className="font-mono text-xs h-10 pl-9"
          required
        />
      </div>
    </div>
  );
}
