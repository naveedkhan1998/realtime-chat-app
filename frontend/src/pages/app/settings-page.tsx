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
  ChevronRight,
  Sun,
  Moon,
  AlertCircle,
  Radio,
  Sparkles,
  Check,
  Laptop,
  LogOut,
  VolumeX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { logOut } from '@/features/authSlice';
import { getAvatarUrl, cn } from '@/lib/utils';
import { Helmet } from 'react-helmet-async';
import { toast } from '@/hooks/use-toast';

export default function SettingsPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const theme = useAppSelector(selectTheme);
  const user = useAppSelector(state => state.auth.user);

  // Notification settings from Redux
  const soundEnabled = useAppSelector(selectSoundEnabled);
  const desktopEnabled = useAppSelector(selectDesktopEnabled);
  const desktopPermission = useAppSelector(selectDesktopPermission);
  const { requestPermission, isSupported, isDenied, isDefault } =
    useNotificationPermission();

  // Local storage settings for privacy
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

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/chat');
    }
  };

  const handleSoundToggle = (enabled: boolean) => {
    dispatch(setSoundEnabled(enabled));
    if (enabled) {
      playNotificationSound();
      toast({
        title: 'Sound enabled',
        description: 'Chime sound played as test confirmation.',
      });
    }
  };

  const handleTestSound = () => {
    playNotificationSound();
    toast({
      title: 'Audio Test',
      description: 'Playing chime notification audio.',
    });
  };

  const handleDesktopNotificationsToggle = async () => {
    if (!isSupported) {
      toast({
        title: 'Not supported',
        description: 'Desktop notifications are not supported in this browser.',
        variant: 'destructive',
      });
      return;
    }

    if (isDefault) {
      const permission = await requestPermission();
      if (permission === 'granted') {
        dispatch(setDesktopEnabled(true));
        toast({
          title: 'Permission granted',
          description: 'You will receive desktop push notifications.',
        });
      }
    } else if (isDenied) {
      toast({
        title: 'Permission blocked',
        description:
          'Please enable notifications in your browser site settings.',
        variant: 'destructive',
      });
    } else {
      dispatch(setDesktopEnabled(!desktopEnabled));
    }
  };

  const handleLogout = () => {
    dispatch(logOut());
    toast({
      title: 'Signed out',
      description: 'You have been safely signed out.',
    });
    navigate('/login');
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-background/50">
      <Helmet>
        <title>Settings & Preferences | MNK Chat</title>
        <meta
          name="description"
          content="Configure audio huddles, notifications, theme, and privacy preferences"
        />
      </Helmet>

      {/* Header - Modern Glass Banner */}
      <header className="sticky top-0 z-20 flex items-center justify-between px-3.5 sm:px-6 py-3 sm:py-4 border-b bg-card/60 backdrop-blur-xl border-border/50">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted/50"
            aria-label="Back to chat"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-bold truncate text-foreground tracking-tight flex items-center gap-2">
              <span>Settings & Preferences</span>
            </h1>
            <p className="text-xs sm:text-sm truncate text-muted-foreground hidden xs:block">
              Customize voice huddles, theme, sound, and privacy
            </p>
          </div>
        </div>

        <Badge
          variant="outline"
          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-primary/10 text-primary border-primary/20 shrink-0"
        >
          v1.0.0
        </Badge>
      </header>

      {/* Content Container */}
      <div className="flex-1 max-w-3xl w-full mx-auto px-3.5 sm:px-6 py-5 sm:py-8 space-y-8 pb-28 sm:pb-12">
        {/* SECTION 1: Appearance & Theme */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Palette className="w-4 h-4 text-primary" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Interface Appearance
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Dark Theme Card */}
            <div
              onClick={() => dispatch(setTheme('dark'))}
              role="button"
              tabIndex={0}
              className={cn(
                'group relative p-4 rounded-2xl border transition-all duration-200 cursor-pointer overflow-hidden backdrop-blur-xl',
                theme === 'dark'
                  ? 'bg-card/90 border-primary shadow-md shadow-primary/10 ring-2 ring-primary/20'
                  : 'bg-card/40 border-border/50 hover:bg-card/70 hover:border-border'
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-primary shadow-inner">
                    <Moon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      Obsidian Dark
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Deep contrast, OLED friendly
                    </p>
                  </div>
                </div>

                {theme === 'dark' ? (
                  <span className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                ) : (
                  <span className="w-5 h-5 rounded-full border border-border/70" />
                )}
              </div>

              {/* Theme Mockup Visual */}
              <div className="h-16 rounded-xl bg-slate-950 border border-slate-800/80 p-2 flex gap-2 overflow-hidden shadow-inner">
                <div className="w-1/4 h-full rounded-lg bg-slate-900 border border-slate-800/60 flex flex-col gap-1 p-1">
                  <div className="w-full h-1.5 rounded-full bg-primary/40" />
                  <div className="w-3/4 h-1.5 rounded-full bg-slate-700/50" />
                </div>
                <div className="flex-1 h-full rounded-lg bg-slate-900/60 border border-slate-800/40 p-1.5 flex flex-col justify-between">
                  <div className="w-1/2 h-2 rounded bg-slate-800" />
                  <div className="w-2/3 h-2 rounded bg-primary/30 self-end" />
                </div>
              </div>
            </div>

            {/* Light Theme Card */}
            <div
              onClick={() => dispatch(setTheme('light'))}
              role="button"
              tabIndex={0}
              className={cn(
                'group relative p-4 rounded-2xl border transition-all duration-200 cursor-pointer overflow-hidden backdrop-blur-xl',
                theme === 'light'
                  ? 'bg-card/90 border-primary shadow-md shadow-primary/10 ring-2 ring-primary/20'
                  : 'bg-card/40 border-border/50 hover:bg-card/70 hover:border-border'
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-300 flex items-center justify-center text-amber-500 shadow-inner">
                    <Sun className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      Studio Light
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Crisp, high illumination
                    </p>
                  </div>
                </div>

                {theme === 'light' ? (
                  <span className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                ) : (
                  <span className="w-5 h-5 rounded-full border border-border/70" />
                )}
              </div>

              {/* Light Theme Mockup */}
              <div className="h-16 rounded-xl bg-slate-100 border border-slate-200 p-2 flex gap-2 overflow-hidden shadow-inner">
                <div className="w-1/4 h-full rounded-lg bg-white border border-slate-200 flex flex-col gap-1 p-1">
                  <div className="w-full h-1.5 rounded-full bg-primary/40" />
                  <div className="w-3/4 h-1.5 rounded-full bg-slate-300" />
                </div>
                <div className="flex-1 h-full rounded-lg bg-white border border-slate-200 p-1.5 flex flex-col justify-between">
                  <div className="w-1/2 h-2 rounded bg-slate-200" />
                  <div className="w-2/3 h-2 rounded bg-primary/30 self-end" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: Voice Lounges & Audio Huddles */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Radio className="w-4 h-4 text-emerald-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Voice Lounges & Audio Engine
            </h2>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border/50 bg-card/50 backdrop-blur-xl divide-y divide-border/40 shadow-sm">
            {/* WebRTC Status Row */}
            <div className="p-4 sm:p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
                  <Radio className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      WebRTC Audio Mesh & SFU Engine
                    </p>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    P2P mesh under 4 users, auto-switches to Cloudflare TURN/SFU
                    for larger rooms
                  </p>
                </div>
              </div>

              <Badge
                variant="outline"
                className="self-start sm:self-auto text-[11px] font-semibold border-emerald-500/30 text-emerald-500 bg-emerald-500/10"
              >
                Ultra-Low Latency
              </Badge>
            </div>

            {/* Notification Sound Row */}
            <div className="p-4 sm:p-4.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                  {soundEnabled ? (
                    <Volume2 className="w-5 h-5" />
                  ) : (
                    <VolumeX className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    Incoming Message Audio Chimes
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    Play a gentle two-tone harmonic tone on direct messages
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestSound}
                  className="h-8 px-2.5 text-xs rounded-lg border-border/60 hover:bg-primary/10 hover:text-primary transition-all hidden xs:flex items-center gap-1.5"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  Test
                </Button>
                <Switch
                  checked={soundEnabled}
                  onCheckedChange={handleSoundToggle}
                  aria-label="Toggle notification sounds"
                />
              </div>
            </div>

            {/* Shortcut Info */}
            <div className="p-4 sm:p-4.5 flex items-center justify-between gap-4 bg-muted/20">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-muted/40 border border-border/50 flex items-center justify-center text-muted-foreground shrink-0">
                  <Laptop className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Global Voice Shortcuts
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Quickly toggle microphone state during any active huddle
                  </p>
                </div>
              </div>

              <kbd className="px-2.5 py-1 text-xs font-mono font-semibold rounded-lg bg-card border border-border/60 text-muted-foreground shadow-sm">
                Ctrl + Shift + M
              </kbd>
            </div>
          </div>
        </section>

        {/* SECTION 3: System Notifications */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Bell className="w-4 h-4 text-primary" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Notifications & Alerts
            </h2>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border/50 bg-card/50 backdrop-blur-xl divide-y divide-border/40 shadow-sm">
            {/* Desktop Push Notifications */}
            <div className="p-4 sm:p-4.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                  <BellRing className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      Desktop Push Notifications
                    </p>
                    {desktopPermission === 'granted' && (
                      <Badge
                        variant="outline"
                        className="text-[10px] font-semibold border-emerald-500/30 text-emerald-500 bg-emerald-500/10 px-1.5 py-0"
                      >
                        Active
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {!isSupported
                      ? 'Not supported by this browser'
                      : isDenied
                        ? 'Blocked in browser settings'
                        : 'Show system banners when browser window is in background'}
                  </p>
                  {isDenied && (
                    <p className="flex items-center gap-1 mt-1 text-xs text-destructive">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      Notifications are blocked. Allow permissions in your
                      browser.
                    </p>
                  )}
                </div>
              </div>

              <Switch
                checked={desktopEnabled && desktopPermission === 'granted'}
                onCheckedChange={handleDesktopNotificationsToggle}
                disabled={!isSupported || isDenied}
                aria-label="Toggle desktop notifications"
              />
            </div>
          </div>
        </section>

        {/* SECTION 4: Privacy & Status */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Shield className="w-4 h-4 text-primary" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Privacy & Presence
            </h2>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border/50 bg-card/50 backdrop-blur-xl divide-y divide-border/40 shadow-sm">
            {/* Online Status */}
            <div className="p-4 sm:p-4.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-muted/40 border border-border/50 flex items-center justify-center text-muted-foreground shrink-0">
                  <Eye className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    Broadcast Online Status
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Display green active presence ring to teammates in workspace
                  </p>
                </div>
              </div>
              <Switch
                checked={showOnlineStatus}
                onCheckedChange={setShowOnlineStatus}
                aria-label="Toggle online presence"
              />
            </div>

            {/* Read Receipts */}
            <div className="p-4 sm:p-4.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-muted/40 border border-border/50 flex items-center justify-center text-muted-foreground shrink-0">
                  <CheckCheck className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    Send Read Receipts
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Show blue checkmarks when you open and view direct messages
                  </p>
                </div>
              </div>
              <Switch
                checked={showReadReceipts}
                onCheckedChange={setShowReadReceipts}
                aria-label="Toggle read receipts"
              />
            </div>
          </div>
        </section>

        {/* SECTION 5: Account & Profile Gateway */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <User className="w-4 h-4 text-primary" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Account Profile
            </h2>
          </div>

          <Link
            to="/profile"
            className="group flex items-center justify-between p-4 sm:p-4.5 rounded-2xl border border-border/50 bg-card/50 hover:bg-card/80 hover:border-primary/40 backdrop-blur-xl transition-all shadow-sm"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <Avatar className="w-11 h-11 rounded-xl border border-border/60 shrink-0">
                <AvatarImage
                  src={getAvatarUrl(user?.avatar)}
                  alt={user?.name}
                />
                <AvatarFallback className="text-sm font-bold bg-primary/10 text-primary rounded-xl">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                    {user?.name || 'Your Profile'}
                  </h3>
                  <Badge
                    variant="outline"
                    className="text-[10px] py-0 px-1.5 rounded-md border-border/50"
                  >
                    Edit
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email || 'Manage avatar, password, and identity'}
                </p>
              </div>
            </div>

            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
          </Link>
        </section>

        {/* SECTION 6: Session & Danger Zone */}
        <section className="space-y-3">
          <div className="p-4 sm:p-5 rounded-2xl border border-destructive/25 bg-destructive/5 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-destructive">
                Sign Out of MNK Chat
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                End your authenticated session on this device.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="rounded-xl border-destructive/30 text-destructive hover:bg-destructive/15 hover:border-destructive/50 transition-all font-semibold h-9 px-4 gap-2 self-start sm:self-auto"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </section>

        {/* About Footer */}
        <div className="text-center pt-4 text-xs text-muted-foreground/60 space-y-1">
          <p className="font-semibold text-foreground/70 flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            MNK Real-Time Chat & Voice Workspace
          </p>
          <p>
            © {new Date().getFullYear()} MNK Chat. Powered by Django Channels &
            WebRTC.
          </p>
        </div>
      </div>
    </div>
  );
}
