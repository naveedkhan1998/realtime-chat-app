import { useState, useEffect, FC } from "react";
import AuthForm from "@/components/AuthForm";

interface AuthPageProps {
  initialMethod: "login" | "register";
}

const AuthPage: FC<AuthPageProps> = ({ initialMethod }) => {
  const [method, setMethod] = useState<"login" | "register">(initialMethod);

  useEffect(() => {
    setMethod(initialMethod);
  }, [initialMethod]);

  const route = method === "login" ? "/api/accounts/token/" : "/api/accounts/user/register/";

  return (
    <div>
      <div>
        <button onClick={() => setMethod("login")} disabled={method === "login"}>
          Login
        </button>
        <button onClick={() => setMethod("register")} disabled={method === "register"}>
          Register
        </button>
      </div>
      <AuthForm route={route} method={method} />
    </div>
  );
};

export default AuthPage;
