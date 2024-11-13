/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Component() {
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

  // Handle login form submission
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    try {
      const response = await axios.post("http://localhost:8000/api/accounts/login/", {
        email: loginEmail,
        password: loginPassword,
      });
      console.log("Login response:", response.data);
      // Store tokens in localStorage or context
      localStorage.setItem("access_token", response.data.token.access);
      localStorage.setItem("refresh_token", response.data.token.refresh);
      // Redirect or update UI accordingly
      setSuccessMessage("Login successful!");
    } catch (error: any) {
      console.error("Error during login:", error);
      if (error.response && error.response.data) {
        setLoginError(error.response.data.errors.non_field_errors[0]);
      } else {
        setLoginError("An error occurred during login.");
      }
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
      const response = await axios.post("http://localhost:8000/api/accounts/register/", {
        email: registerEmail,
        name: registerName,
        password: registerPassword,
        password2: registerPassword2,
        tc: true, // Assuming terms and conditions are accepted
      });
      console.log("Registration response:", response.data);
      // Store tokens in localStorage or context
      localStorage.setItem("access_token", response.data.token.access);
      localStorage.setItem("refresh_token", response.data.token.refresh);
      // Redirect or update UI accordingly
      setSuccessMessage("Registration successful!");
    } catch (error: any) {
      console.error("Error during registration:", error);
      if (error.response && error.response.data) {
        setRegisterError("An error occurred during registration.");
      } else {
        setRegisterError("An error occurred during registration.");
      }
    }
  };

  // Handle Google login success
  const handleLoginSuccess = async (response: CredentialResponse) => {
    if (response.credential) {
      try {
        const backendResponse = await axios.post("http://localhost:8000/api/accounts/auth/social/google/", {
          token: response.credential,
        });
        console.log("Backend response:", backendResponse.data);
        // Store tokens
        localStorage.setItem("access_token", backendResponse.data.token.access);
        localStorage.setItem("refresh_token", backendResponse.data.token.refresh);
        // Redirect or update UI accordingly
        setSuccessMessage("Google login successful!");
      } catch (error) {
        console.error("Error during Google login:", error);
        // Handle error (e.g., show error message to user)
        setLoginError("An error occurred during Google login.");
      }
    } else {
      console.error("No credential received from Google");
      setLoginError("No credential received from Google.");
    }
  };

  // Handle Google login failure
  const handleLoginFailure = () => {
    console.error("Login failed");
    setLoginError("Google login failed.");
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>Welcome</CardTitle>
          <CardDescription>Sign in to your account or create a new one.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            {/* Login Form */}
            <TabsContent value="login">
              <form onSubmit={handleLoginSubmit}>
                <div className="grid items-center w-full gap-4">
                  {loginError && <p className="text-red-500">{loginError}</p>}
                  {successMessage && <p className="text-green-500">{successMessage}</p>}
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="loginEmail">Email</Label>
                    <Input id="loginEmail" type="email" placeholder="Enter your email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
                  </div>
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="loginPassword">Password</Label>
                    <Input id="loginPassword" type="password" placeholder="Enter your password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
                  </div>
                  <Button type="submit" className="w-full">
                    Sign In
                  </Button>
                </div>
              </form>
            </TabsContent>

            {/* Registration Form */}
            <TabsContent value="register">
              <form onSubmit={handleRegisterSubmit}>
                <div className="grid items-center w-full gap-4">
                  {registerError && <p className="text-red-500">{registerError}</p>}
                  {successMessage && <p className="text-green-500">{successMessage}</p>}
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="registerName">Name</Label>
                    <Input id="registerName" placeholder="Enter your name" value={registerName} onChange={(e) => setRegisterName(e.target.value)} required />
                  </div>
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="registerEmail">Email</Label>
                    <Input id="registerEmail" type="email" placeholder="Enter your email" value={registerEmail} onChange={(e) => setRegisterEmail(e.target.value)} required />
                  </div>
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="registerPassword">Password</Label>
                    <Input id="registerPassword" type="password" placeholder="Choose a password" value={registerPassword} onChange={(e) => setRegisterPassword(e.target.value)} required />
                  </div>
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="registerPassword2">Confirm Password</Label>
                    <Input id="registerPassword2" type="password" placeholder="Confirm your password" value={registerPassword2} onChange={(e) => setRegisterPassword2(e.target.value)} required />
                  </div>
                  <Button type="submit" className="w-full">
                    Register
                  </Button>
                </div>
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
          <GoogleLogin onSuccess={handleLoginSuccess} onError={handleLoginFailure} useOneTap type="standard" theme="filled_blue" size="large" text="continue_with" shape="rectangular" width="320" />
        </CardFooter>
      </Card>
    </div>
  );
}
