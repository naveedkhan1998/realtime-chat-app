import { useState, FormEvent } from "react";
import api from "../api";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../token";

interface AuthFormProps {
  route: string;
  method: "login" | "register";
}

const AuthForm: React.FC<AuthFormProps> = ({ route, method }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await api.post(route, { username, password });
      if (method === "login") {
        localStorage.setItem(ACCESS_TOKEN, response.data.access);
        localStorage.setItem(REFRESH_TOKEN, response.data.refresh);
      } else {
        setSuccess("Registration successful, please login.");
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      setError(error.response.data.detail);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL}/api/allauth/accounts/google/login/`;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      {loading && (
        <div className="text-center">
          Loading...
          {error ? <span className="text-red-500">{error}</span> : <p>working</p>}
        </div>
      )}
      {!loading && (
        <form onSubmit={handleSubmit} className="w-full max-w-sm p-6 bg-white rounded shadow-md">
          <input type="text" placeholder="username" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full p-2 mb-4 border border-gray-300 rounded" />
          <input type="password" placeholder="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-2 mb-4 border border-gray-300 rounded" />
          <button type="submit" className="w-full px-4 py-2 text-white bg-blue-500 rounded">
            {method === "login" ? "Login" : "Register"}
          </button>
        </form>
      )}
      {method === "login" && (
        <button type="button" onClick={handleGoogleLogin} className="px-4 py-2 mt-4 text-white bg-red-500 rounded">
          Google Login
        </button>
      )}
      {error && <span className="mt-4 text-red-500">{error}</span>}
      {success && <span className="mt-4 text-green-500">{success}</span>}
    </div>
  );
};

export default AuthForm;
