import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { logOut } from "@/features/authSlice";
import { Menu, Moon, Sun, X, Home, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { setThemeRedux } from "@/features/themeSlice";

const Navbar: React.FC = () => {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const user = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [theme, setTheme] = useState<"light" | "dark">(() => (localStorage.getItem("theme") as "light" | "dark") || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
    dispatch(setThemeRedux(theme));
  }, [theme, dispatch]);

  const handleLogout = () => {
    dispatch(logOut());
    setIsOpen(false);
  };

  const toggleTheme = () => setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));

  const NavItems = () => (
    <>
      <Button variant="ghost" className="flex items-center gap-2" onClick={() => navigate("/")}>
        <Home className="w-4 h-4" /> Home
      </Button>
      {isAuthenticated ? (
        <>
          <Button variant="ghost" className="flex items-center gap-2" onClick={() => navigate("/dashboard")}>
            <User className="w-4 h-4" /> Dashboard
          </Button>
          <span className="flex items-center text-sm">Welcome, {user?.name}!</span>
          <Button variant="ghost" className="flex items-center gap-2" onClick={handleLogout}>
            <LogOut className="w-4 h-4" /> Logout
          </Button>
        </>
      ) : (
        <Button variant="ghost" className="flex items-center gap-2" onClick={() => navigate("/login")}>
          <User className="w-4 h-4" /> Login
        </Button>
      )}
    </>
  );

  return (
    <nav className="sticky top-0 z-50 w-full bg-white border-b border-gray-200 shadow-md dark:bg-black dark:border-gray-700">
      <div className="container flex items-center justify-between h-16 px-4 m-auto">
        <Link to="/" className="text-2xl font-bold text-black dark:text-white">
          MNK Chat
        </Link>
        <div className="flex items-center space-x-4">
          <div className="hidden md:flex md:items-center md:space-x-4">
            <NavItems />
          </div>
          <Button variant="outline" size="icon" onClick={toggleTheme} className="relative">
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden">
                <Menu className="h-[1.2rem] w-[1.2rem]" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <div className="flex flex-col mt-8 space-y-4">
                <NavItems />
              </div>
              <SheetClose asChild>
                <Button variant="outline" size="icon" className="absolute right-4 top-4" onClick={() => setIsOpen(false)}>
                  <X className="w-4 h-4" />
                  <span className="sr-only">Close</span>
                </Button>
              </SheetClose>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
