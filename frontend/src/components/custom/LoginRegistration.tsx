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
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function LoginRegistration() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  // State variables for login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // State variables for registration form
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerPassword2, setRegisterPassword2] = useState("");

  // Error and success messages
  const [loginError, setLoginError] = useState("");
  const [registerError, setRegisterError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // RTK Query mutations
  const [login, { isLoading: isLoginLoading }] = useLoginMutation();
  const [register, { isLoading: isRegisterLoading }] = useRegisterMutation();
  const [googleLogin] = useGoogleLoginMutation();

  // Handle login form submission
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

  // Handle registration form submission
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

  // Handle Google login success
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

  // Handle authentication success
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

  // Handle authentication error
  const handleAuthError = (error: any, setError: (message: string) => void) => {
    console.error("Authentication error:", error);
    if (error.data && error.data.errors) {
      setError(error.data.errors.non_field_errors?.[0] || "An error occurred during authentication.");
    } else {
      setError("An error occurred during authentication.");
    }
  };

  // Handle Google login failure
  const handleLoginFailure = () => {
    setLoginError("Google login failed.");
  };

  return (
    <Card className="w-[350px] dark:bg-gray-800">
      <CardHeader>
        <CardTitle className="text-2xl font-bold dark:text-white">Welcome</CardTitle>
        <CardDescription className="dark:text-gray-300">Sign in to your account or create a new one.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login" className="dark:text-gray-200 dark:data-[state=active]:bg-gray-700">
              Login
            </TabsTrigger>
            <TabsTrigger value="register" className="dark:text-gray-200 dark:data-[state=active]:bg-gray-700">
              Register
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleLoginSubmit}>
              <div className="grid items-center w-full gap-4">
                {loginError && <p className="text-red-500 dark:text-red-400">{loginError}</p>}
                {successMessage && <p className="text-green-500 dark:text-green-400">{successMessage}</p>}
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="loginEmail" className="dark:text-gray-200">
                    Email
                  </Label>
                  <Input
                    id="loginEmail"
                    type="email"
                    placeholder="Enter your email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    className="dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="loginPassword" className="dark:text-gray-200">
                    Password
                  </Label>
                  <Input
                    id="loginPassword"
                    type="password"
                    placeholder="Enter your password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    className="dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <Button type="submit" className="w-full dark:bg-blue-600 dark:hover:bg-blue-700" disabled={isLoginLoading}>
                  {isLoginLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {isLoginLoading ? "Signing In..." : "Sign In"}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="register">
            <form onSubmit={handleRegisterSubmit}>
              <div className="grid items-center w-full gap-4">
                {registerError && <p className="text-red-500 dark:text-red-400">{registerError}</p>}
                {successMessage && <p className="text-green-500 dark:text-green-400">{successMessage}</p>}
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="registerName" className="dark:text-gray-200">
                    Name
                  </Label>
                  <Input id="registerName" placeholder="Enter your name" value={registerName} onChange={(e) => setRegisterName(e.target.value)} required className="dark:bg-gray-700 dark:text-white" />
                </div>
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="registerEmail" className="dark:text-gray-200">
                    Email
                  </Label>
                  <Input
                    id="registerEmail"
                    type="email"
                    placeholder="Enter your email"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    required
                    className="dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="registerPassword" className="dark:text-gray-200">
                    Password
                  </Label>
                  <Input
                    id="registerPassword"
                    type="password"
                    placeholder="Choose a password"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    required
                    className="dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="registerPassword2" className="dark:text-gray-200">
                    Confirm Password
                  </Label>
                  <Input
                    id="registerPassword2"
                    type="password"
                    placeholder="Confirm your password"
                    value={registerPassword2}
                    onChange={(e) => setRegisterPassword2(e.target.value)}
                    required
                    className="dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <Button type="submit" className="w-full dark:bg-blue-600 dark:hover:bg-blue-700" disabled={isRegisterLoading}>
                  {isRegisterLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {isRegisterLoading ? "Registering..." : "Register"}
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>

      <CardFooter className="flex flex-col space-y-4">
        <div className="relative w-full">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t dark:border-gray-600" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="px-2 bg-background text-muted-foreground dark:bg-gray-800 dark:text-gray-400">Or continue with</span>
          </div>
        </div>
        <GoogleLogin onSuccess={handleLoginSuccess} onError={handleLoginFailure} useOneTap type="standard" theme="filled_blue" size="large" text="continue_with" shape="rectangular" width="320" />
      </CardFooter>
    </Card>
  );
}
