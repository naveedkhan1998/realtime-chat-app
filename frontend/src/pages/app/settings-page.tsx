import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Palette,
  Bell,
  BellRing,
  Volume2,
  Shield,
  Eye,
  CheckCheck,
  User,
  UserCog,
  Trash2,
  Info,
  ChevronRight,
  Sun,
  Moon,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { setTheme, selectTheme } from '@/features/themeSlice';
import {
  selectSoundEnabled,
  selectDesktopEnabled,
  selectDesktopPermission,
  setSoundEnabled,
  setDesktopEnabled,
} from '@/features/notificationSettingsSlice';
import { useNotificationPermission } from '@/hooks/useNotifications';
import { playNotificationSound } from '@/utils/notificationSound';

export default function SettingsPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const theme = useAppSelector(selectTheme);

  // Notification settings from Redux
  const soundEnabled = useAppSelector(selectSoundEnabled);
  const desktopEnabled = useAppSelector(selectDesktopEnabled);
  const desktopPermission = useAppSelector(selectDesktopPermission);
  const { requestPermission, isSupported, isDenied, isDefault } =
    useNotificationPermission();

  // Local storage settings for privacy (not related to notifications)
  const [showOnlineStatus, setShowOnlineStatus] = useState(() => {
    return localStorage.getItem('showOnlineStatus') !== 'false';
  });
  const [showReadReceipts, setShowReadReceipts] = useState(() => {
    return localStorage.getItem('showReadReceipts') !== 'false';
  });

  useEffect(() => {
    localStorage.setItem('showOnlineStatus', String(showOnlineStatus));
  }, [showOnlineStatus]);

  useEffect(() => {
    localStorage.setItem('showReadReceipts', String(showReadReceipts));
  }, [showReadReceipts]);

  const handleSoundToggle = (enabled: boolean) => {
    dispatch(setSoundEnabled(enabled));
    // Play a test sound when enabling
    if (enabled) {
      playNotificationSound();
    }
  };

  const handleDesktopNotificationsToggle = async () => {
    if (!isSupported) return;

    if (isDefault) {
      // Request permission first
      const permission = await requestPermission();
      if (permission === 'granted') {
        dispatch(setDesktopEnabled(true));
      }
    } else if (isDenied) {
      // Can't enable if denied - user must change in browser settings
      return;
    } else {
      // Toggle the setting
      dispatch(setDesktopEnabled(!desktopEnabled));
    }
  };

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    dispatch(setTheme(newTheme));
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center gap-4 px-6 py-4 border-b bg-background/80 backdrop-blur-xl border-border/50">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="rounded-xl"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Customize your experience
          </p>
        </div>
      </header>

      <div className="flex-1 max-w-2xl p-6 mx-auto space-y-10">
        {/* Appearance */}
        <section>
          <h2 className="flex items-center gap-2 mb-5 text-xl font-semibold text-foreground">
            <Palette className="w-5 h-5 text-primary" />
            Appearance
          </h2>

          <div className="overflow-hidden border glass-card rounded-2xl border-border/50">
            <div className="flex items-center justify-between p-5">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 bg-muted/50 rounded-xl">
                  {theme === 'dark' ? (
                    <Moon className="w-6 h-6 text-muted-foreground" />
                  ) : (
                    <Sun className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-foreground">Theme</p>
                  <p className="text-sm text-muted-foreground">
                    Choose your preferred theme
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl">
                <button
                  onClick={() => handleThemeChange('light')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    theme === 'light'
                      ? 'bg-background shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Light
                </button>
                <button
                  onClick={() => handleThemeChange('dark')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    theme === 'dark'
                      ? 'bg-background shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Dark
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Notifications */}
        <section>
          <h2 className="flex items-center gap-2 mb-5 text-xl font-semibold text-foreground">
            <Bell className="w-5 h-5 text-primary" />
            Notifications
          </h2>

          <div className="overflow-hidden border divide-y glass-card rounded-2xl border-border/50 divide-border/30">
            {/* Sound */}
            <div className="flex items-center justify-between p-5">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 bg-muted/50 rounded-xl">
                  <Volume2 className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    Notification Sound
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Play a sound for new messages
                  </p>
                </div>
              </div>
              <Switch
                checked={soundEnabled}
                onCheckedChange={handleSoundToggle}
              />
            </div>

            {/* Desktop Notifications */}
            <div className="flex items-center justify-between p-5">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 bg-muted/50 rounded-xl">
                  <BellRing className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    Desktop Notifications
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {!isSupported
                      ? 'Not supported in this browser'
                      : isDenied
                        ? 'Blocked - enable in browser settings'
                        : 'Get notified even when the app is in background'}
                  </p>
                  {isDenied && (
                    <p className="flex items-center gap-1 mt-1 text-xs text-destructive">
                      <AlertCircle className="w-3 h-3" />
                      Change permission in browser settings
                    </p>
                  )}
                </div>
              </div>
              <Switch
                checked={desktopEnabled && desktopPermission === 'granted'}
                onCheckedChange={handleDesktopNotificationsToggle}
                disabled={!isSupported || isDenied}
              />
            </div>
          </div>
        </section>

        {/* Privacy */}
        <section>
          <h2 className="flex items-center gap-2 mb-5 text-xl font-semibold text-foreground">
            <Shield className="w-5 h-5 text-primary" />
            Privacy
          </h2>

          <div className="overflow-hidden border divide-y glass-card rounded-2xl border-border/50 divide-border/30">
            {/* Online Status */}
            <div className="flex items-center justify-between p-5">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 bg-muted/50 rounded-xl">
                  <Eye className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    Show Online Status
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Let others see when you're online
                  </p>
                </div>
              </div>
              <Switch
                checked={showOnlineStatus}
                onCheckedChange={setShowOnlineStatus}
              />
            </div>

            {/* Read Receipts */}
            <div className="flex items-center justify-between p-5">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 bg-muted/50 rounded-xl">
                  <CheckCheck className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Read Receipts</p>
                  <p className="text-sm text-muted-foreground">
                    Let others know when you've read their messages
                  </p>
                </div>
              </div>
              <Switch
                checked={showReadReceipts}
                onCheckedChange={setShowReadReceipts}
              />
            </div>
          </div>
        </section>

        {/* Account */}
        <section>
          <h2 className="flex items-center gap-2 mb-5 text-xl font-semibold text-foreground">
            <User className="w-5 h-5 text-primary" />
            Account
          </h2>

          <div className="space-y-3">
            <Link
              to="/profile"
              className="flex items-center justify-between p-5 transition-all duration-200 border glass-card rounded-2xl border-border/50 hover:bg-muted/30 group"
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 transition-colors bg-muted/50 rounded-xl group-hover:bg-primary/10">
                  <UserCog className="w-6 h-6 transition-colors text-muted-foreground group-hover:text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Edit Profile</p>
                  <p className="text-sm text-muted-foreground">
                    Change your name and avatar
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 transition-colors text-muted-foreground group-hover:text-foreground" />
            </Link>

            <button
              className="flex items-center justify-between w-full p-5 text-left transition-all duration-200 border rounded-2xl bg-destructive/5 border-destructive/20 hover:bg-destructive/10"
              onClick={() => {
                if (
                  confirm(
                    'Are you sure you want to delete your account? This action cannot be undone.'
                  )
                ) {
                  // Handle account deletion
                }
              }}
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 bg-destructive/10 rounded-xl">
                  <Trash2 className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <p className="font-semibold text-destructive">
                    Delete Account
                  </p>
                  <p className="text-sm text-destructive/70">
                    Permanently delete your account and all data
                  </p>
                </div>
              </div>
            </button>
          </div>
        </section>

        {/* About */}
        <section>
          <h2 className="flex items-center gap-2 mb-5 text-xl font-semibold text-foreground">
            <Info className="w-5 h-5 text-primary" />
            About
          </h2>

          <div className="p-5 border glass-card rounded-2xl border-border/50">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center justify-center overflow-hidden shadow-lg w-14 h-14 rounded-2xl shadow-primary/20">
                <img
                  src="/apple-touch-icon.png"
                  alt="MNK Chat Logo"
                  className="object-cover w-full h-full"
                />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">MNK Chat</p>
                <p className="text-sm text-muted-foreground">Version 1.0.0</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Built with React, Redux Toolkit, and Tailwind CSS
              <br />© {new Date().getFullYear()} MNK Chat. All rights reserved.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
