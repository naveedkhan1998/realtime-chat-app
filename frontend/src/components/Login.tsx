import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import axios, { AxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Component() {
  const handleLoginSuccess = async (response: CredentialResponse) => {
    if (response.credential) {
      try {
        const backendResponse = await axios.post("http://localhost:8000/auth/social/google/", {
          token: response.credential,
        });
        console.log("Backend response:", backendResponse.data);
        // Handle successful login (e.g., store token, redirect)
      } catch (error) {
        console.error("Error during Google login:", error);
        // Handle error (e.g., show error message to user)
      }
    } else {
      console.error("No credential received from Google");
    }
  };

  const handleLoginFailure = (error: AxiosError) => {
    console.error("Login failed:", error);
    // Handle login failure (e.g., show error message to user)
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
            <TabsContent value="login">
              <form>
                <div className="grid w-full items-center gap-4">
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" placeholder="Enter your email" />
                  </div>
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" placeholder="Enter your password" />
                  </div>
                </div>
              </form>
            </TabsContent>
            <TabsContent value="register">
              <form>
                <div className="grid w-full items-center gap-4">
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" placeholder="Enter your name" />
                  </div>
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" placeholder="Enter your email" />
                  </div>
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" placeholder="Choose a password" />
                  </div>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button className="w-full">Sign In</Button>
          <div className="relative w-full">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>
          <GoogleLogin
            onSuccess={handleLoginSuccess}
            onError={() => handleLoginFailure}
            useOneTap
            type="standard"
            theme="filled_blue"
            size="large"
            text="continue_with"
            shape="rectangular"
            width="320"
          />
        </CardFooter>
      </Card>
    </div>
  );
}
