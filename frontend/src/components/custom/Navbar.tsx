import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { useTheme } from '@/hooks/useTheme';
import { logOut } from '@/features/authSlice';
import { useLogoutMutation } from '@/services/authApi';
import { Menu, Moon, Sun, Home, User, LogOut, Group } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { baseApi } from '@/services/baseApi';

const Navbar: React.FC = () => {
  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);
  const user = useAppSelector(state => state.auth.user);
  const refreshToken = useAppSelector(state => state.auth.refreshToken);
  const showNavbar = useAppSelector(state => state.ui.showNavbar);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [logout] = useLogoutMutation();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = async () => {
    try {
      if (refreshToken) {
        await logout({ refresh: refreshToken }).unwrap();
      }
    } catch (error) {
      // Even if the backend logout fails, we should still clear local state
      console.error('Logout error:', error);
    } finally {
      dispatch(logOut());
      dispatch(baseApi.util.resetApiState());
      setIsMenuOpen(false); // Close the menu after logout
    }
  };

  const NavItems = () => (
    <>
      <Button
        variant="ghost"
        className="flex items-center justify-start gap-2"
        onClick={() => {
          navigate('/');
          setIsMenuOpen(false); // Close menu after navigation
        }}
      >
        <Home className="w-5 h-5" /> Home
      </Button>
      {isAuthenticated ? (
        <>
          <Button
            variant="ghost"
            className="flex items-center justify-start gap-2"
            onClick={() => {
              navigate('/chat');
              setIsMenuOpen(false); // Close menu after navigation
            }}
          >
            <User className="w-5 h-5" /> Chat
          </Button>
          <Button
            variant="ghost"
            className="flex items-center justify-start gap-2"
            onClick={() => {
              navigate('/friends');
              setIsMenuOpen(false); // Close menu after navigation
            }}
          >
            <Group className="w-5 h-5" /> Friends
          </Button>
        </>
      ) : (
        <Button
          variant="ghost"
          className="flex items-center justify-start gap-2"
          onClick={() => {
            navigate('/login');
            setIsMenuOpen(false); // Close menu after navigation
          }}
        >
          <User className="w-5 h-5" /> Login
        </Button>
      )}
    </>
  );

  if (!showNavbar && isMobile) return null;

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background border-border">
      <div className="container flex items-center justify-between h-16 px-4 mx-auto">
        {/* Logo */}
        <Button
          variant="ghost"
          className="gap-2 text-2xl font-bold text-primary"
          onClick={() => navigate('/')}
        >
          <img
            src="/apple-touch-icon.png"
            alt="MNK Chat"
            className="w-8 h-8 rounded-lg"
          />
          MNK Chat
        </Button>

        {/* Desktop Navigation */}
        <div className="hidden space-x-6 md:flex">
          <NavItems />
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-4">
          {/* Theme Toggle */}
          <Button variant="outline" size="icon" onClick={toggleTheme}>
            {theme === 'light' ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </Button>

          {/* User Menu for Desktop */}
          {isAuthenticated && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user?.avatar} alt={user?.name} />
                    <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="hidden md:block">{user?.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <User className="w-5 h-5 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="w-5 h-5 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Mobile Menu */}
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              {/* Profile Info */}
              {isAuthenticated && (
                <div className="flex flex-col items-start p-4 border-b dark:border-gray-700">
                  <div className="flex items-center space-x-4">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={user?.avatar} alt={user?.name} />
                      <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-lg font-medium">{user?.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {user?.email}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Items */}
              <div className="flex flex-col mt-4 space-y-4">
                <NavItems />
                {isAuthenticated && (
                  <>
                    <Button
                      variant="ghost"
                      className="flex items-center justify-start gap-2"
                      onClick={() => {
                        navigate('/profile');
                        setIsMenuOpen(false);
                      }}
                    >
                      <User className="w-5 h-5" /> Profile
                    </Button>
                    <Button
                      variant="ghost"
                      className="flex items-center justify-start gap-2"
                      onClick={handleLogout}
                    >
                      <LogOut className="w-5 h-5" /> Logout
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
