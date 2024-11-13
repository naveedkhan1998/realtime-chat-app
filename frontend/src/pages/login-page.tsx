import LoginRegistration from "@/components/custom/LoginRegistration";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen">
      <div className="items-center justify-center hidden w-1/2 lg:flex bg-gradient-to-br from-blue-400 to-purple-500">
        <div className="max-w-md text-white">
          <h1 className="mb-6 text-5xl font-bold">Welcome Back</h1>
          <p className="text-xl">Log in to access your account and enjoy our services. New here? Create an account in seconds!</p>
        </div>
      </div>
      <div className="flex items-center justify-center w-full bg-gray-100 lg:w-1/2 dark:bg-gray-900">
        <LoginRegistration />
      </div>
    </div>
  );
}
