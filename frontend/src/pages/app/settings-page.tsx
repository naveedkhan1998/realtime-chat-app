import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Sun,
  Moon,
  Monitor,
  Volume2,
  VolumeX,
  BellRing,
  Radio,
  Eye,
  CheckCheck,
  ChevronRight,
  LogOut,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
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
import { toast } from '@/hooks/use-toast';
import { PageFrame, Module } from '@/components/console/PageFrame';
import { Led, channelNo, Kbd } from '@/components/console';

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

  const handleSoundToggle = (enabled: boolean) => {
    dispatch(setSoundEnabled(enabled));
    if (enabled) {
      playNotificationSound();
      toast({
        title: 'Acoustic Signal Enabled',
        description: 'Test chime tone transmitted.',
      });
    }
  };

  const handleTestSound = () => {
    playNotificationSound();
    toast({
      title: 'Acoustic Test',
      description: 'Chime signal transmitted to speaker monitor.',
    });
  };

  const handleDesktopNotificationsToggle = async () => {
    if (!isSupported) {
      toast({
        title: 'Telemetry Unsupported',
        description: 'Push notifications unavailable in this browser.',
        variant: 'destructive',
      });
      return;
    }

    if (isDefault) {
      const permission = await requestPermission();
      if (permission === 'granted') {
        dispatch(setDesktopEnabled(true));
        toast({
          title: 'Dispatch Channel Granted',
          description: 'Desktop alerts configured for background reception.',
        });
      }
    } else if (isDenied) {
      toast({
        title: 'Dispatch Channel Blocked',
        description: 'Please permit notifications in browser site permissions.',
        variant: 'destructive',
      });
    } else {
      dispatch(setDesktopEnabled(!desktopEnabled));
    }
  };

  const handleLogout = () => {
    dispatch(logOut());
    toast({
      title: 'Session Severed',
      description: 'Operator logged out. Cache flushed.',
    });
    navigate('/login');
  };

  return (
    <PageFrame
      code="05"
      section="System"
      title="Preferences"
      description="Console operating parameters, telemetry alerts, acoustic feedback, and chassis illumination."
      actions={
        <div className="flex items-center gap-2">
          <span className="font-mono text-2xs px-2 py-0.5 rounded border border-border bg-well text-muted-foreground">
            FIRMWARE V2.4·RT2
          </span>
        </div>
      }
    >
      <Helmet>
        <title>System Preferences | MNK Chat</title>
        <meta
          name="description"
          content="Configure system theme, acoustic telemetry, and console settings."
        />
      </Helmet>

      <div className="space-y-6">
        {/* MOD 01: Chassis Illumination */}
        <Module
          label="MOD·01 / CHASSIS ILLUMINATION"
          title="Display Surface Theme"
          description="Select ceramic bone day illumination or deep graphite night contrast"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Graphite / Dark */}
            <button
              type="button"
              onClick={() => dispatch(setTheme('dark'))}
              className={cn(
                'group relative p-4 rounded-xl border text-left transition-all cursor-pointer',
                theme === 'dark'
                  ? 'bg-well border-primary shadow-well ring-1 ring-primary/40'
                  : 'bg-card border-border hover:bg-well/50'
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-lg bg-black border border-neutral-800 flex items-center justify-center text-primary">
                    <Moon className="size-4" />
                  </div>
                  <div>
                    <h3 className="font-mono text-xs font-bold text-foreground">
                      GRAPHITE DARK
                    </h3>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      Deep matte black chassis
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                  {theme === 'dark' ? (
                    <span className="text-primary font-bold flex items-center gap-1">
                      <Led tone="signal" />
                      ACTIVE
                    </span>
                  ) : (
                    <span className="text-muted-foreground/60">STANDBY</span>
                  )}
                </div>
              </div>

              {/* Hardware Mock Preview */}
              <div className="h-14 rounded-lg bg-black border border-neutral-800 p-2 flex items-center gap-2">
                <div className="w-12 h-full rounded bg-neutral-900 border border-neutral-800 flex flex-col justify-center px-1.5 gap-1">
                  <div className="h-1 w-full bg-primary/60 rounded-full" />
                  <div className="h-1 w-2/3 bg-neutral-700 rounded-full" />
                </div>
                <div className="flex-1 h-full rounded bg-neutral-950 border border-neutral-850 p-1.5 flex flex-col justify-between">
                  <div className="h-1.5 w-1/3 bg-neutral-800 rounded" />
                  <div className="h-1.5 w-1/2 bg-primary/40 rounded self-end" />
                </div>
              </div>
            </button>

            {/* Ceramic / Light */}
            <button
              type="button"
              onClick={() => dispatch(setTheme('light'))}
              className={cn(
                'group relative p-4 rounded-xl border text-left transition-all cursor-pointer',
                theme === 'light'
                  ? 'bg-well border-primary shadow-well ring-1 ring-primary/40'
                  : 'bg-card border-border hover:bg-well/50'
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-lg bg-[#f0ede6] border border-[#d8d4cb] flex items-center justify-center text-primary">
                    <Sun className="size-4" />
                  </div>
                  <div>
                    <h3 className="font-mono text-xs font-bold text-foreground">
                      CERAMIC LIGHT
                    </h3>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      Studio high-contrast bone
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                  {theme === 'light' ? (
                    <span className="text-primary font-bold flex items-center gap-1">
                      <Led tone="signal" />
                      ACTIVE
                    </span>
                  ) : (
                    <span className="text-muted-foreground/60">STANDBY</span>
                  )}
                </div>
              </div>

              {/* Hardware Mock Preview */}
              <div className="h-14 rounded-lg bg-[#e8e4dc] border border-[#d2cdc3] p-2 flex items-center gap-2">
                <div className="w-12 h-full rounded bg-[#dfdbd2] border border-[#ccc6b9] flex flex-col justify-center px-1.5 gap-1">
                  <div className="h-1 w-full bg-primary/70 rounded-full" />
                  <div className="h-1 w-2/3 bg-[#b5aea0] rounded-full" />
                </div>
                <div className="flex-1 h-full rounded bg-[#f4f1ea] border border-[#dcd7cc] p-1.5 flex flex-col justify-between">
                  <div className="h-1.5 w-1/3 bg-[#ccc6b9] rounded" />
                  <div className="h-1.5 w-1/2 bg-primary/50 rounded self-end" />
                </div>
              </div>
            </button>
          </div>
        </Module>

        {/* MOD 02: Acoustic & Vox Engine */}
        <Module
          label="MOD·02 / ACOUSTIC & VOX ENGINE"
          title="Audio Hardware & Telemetry"
          description="WebRTC voice transceivers and acoustic chime signals"
        >
          <div className="divide-y divide-border -mx-4 sm:-mx-5 -my-4 sm:-my-5">
            {/* Audio Engine Row */}
            <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="size-9 rounded-lg bg-well border border-border flex items-center justify-center text-live shrink-0 mt-0.5">
                  <Radio className="size-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-foreground">
                      WEBRTC VOX ENGINE
                    </span>
                    <span className="flex items-center gap-1 font-mono text-[10px] text-live">
                      <Led tone="live" blink />
                      READY
                    </span>
                  </div>
                  <p className="font-mono text-[11px] text-muted-foreground mt-0.5">
                    Peer mesh for &le; 2 nodes &middot; Automatic Cloudflare SFU relay for groups
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground self-start sm:self-auto">
                <span className="px-2 py-0.5 rounded border border-border bg-well">
                  OPUS 48 kHz
                </span>
              </div>
            </div>

            {/* Chime Sounds Row */}
            <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-9 rounded-lg bg-well border border-border flex items-center justify-center text-primary shrink-0">
                  {soundEnabled ? (
                    <Volume2 className="size-4" />
                  ) : (
                    <VolumeX className="size-4 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0">
                  <span className="font-mono text-xs font-bold text-foreground block truncate">
                    MESSAGE ARRIVAL CHIME
                  </span>
                  <p className="font-mono text-[11px] text-muted-foreground truncate">
                    Acoustic two-tone chime upon incoming channel traffic
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestSound}
                  className="font-mono text-xs h-8 px-2.5 gap-1.5"
                >
                  <Volume2 className="size-3" />
                  TEST
                </Button>
                <Switch
                  checked={soundEnabled}
                  onCheckedChange={handleSoundToggle}
                  aria-label="Toggle arrival sound"
                />
              </div>
            </div>

            {/* VOX Shortcut Row */}
            <div className="p-4 sm:p-5 flex items-center justify-between gap-4 bg-well/30">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-lg bg-well border border-border flex items-center justify-center text-muted-foreground shrink-0">
                  <Monitor className="size-4" />
                </div>
                <div>
                  <span className="font-mono text-xs font-bold text-foreground block">
                    GLOBAL VOX KEYCAP SHORTCUT
                  </span>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    Hardware key combo to toggle transceiver microphone
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Kbd>Ctrl</Kbd>
                <Kbd>Shift</Kbd>
                <Kbd>M</Kbd>
              </div>
            </div>
          </div>
        </Module>

        {/* MOD 03: Telemetry & Dispatch */}
        <Module
          label="MOD·03 / TELEMETRY & DISPATCH"
          title="Operating System Notifications"
          description="Background dispatch alerts when console window is unfocused"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="size-9 rounded-lg bg-well border border-border flex items-center justify-center text-primary shrink-0 mt-0.5">
                <BellRing className="size-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-foreground">
                    BACKGROUND DESKTOP DISPATCH
                  </span>
                  {desktopPermission === 'granted' && desktopEnabled && (
                    <span className="font-mono text-[10px] text-live flex items-center gap-1">
                      <Led tone="live" />
                      ENGAGED
                    </span>
                  )}
                </div>
                <p className="font-mono text-[11px] text-muted-foreground mt-0.5">
                  {!isSupported
                    ? 'Engine unsupported by host browser'
                    : isDenied
                      ? 'Dispatch channel blocked in host browser permissions'
                      : 'Display native system banners for mentions and inbound direct signals'}
                </p>
                {isDenied && (
                  <p className="flex items-center gap-1 mt-1 font-mono text-[10px] text-destructive">
                    <AlertCircle className="size-3 shrink-0" />
                    Site permissions denied. Re-enable in browser location bar.
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
        </Module>

        {/* MOD 04: Presence & Privacy */}
        <Module
          label="MOD·04 / PRESENCE & PRIVACY"
          title="Telemetry Privacy Ciphers"
          description="Control public visibility of terminal activity and read confirmations"
        >
          <div className="divide-y divide-border -mx-4 sm:-mx-5 -my-4 sm:-my-5">
            {/* Online Status */}
            <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-9 rounded-lg bg-well border border-border flex items-center justify-center text-live shrink-0">
                  <Eye className="size-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-foreground">
                      BROADCAST ONLINE PRESENCE
                    </span>
                    {showOnlineStatus && <Led tone="live" />}
                  </div>
                  <p className="font-mono text-[11px] text-muted-foreground truncate">
                    Radiate live beacon LED on active station channels
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
            <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-9 rounded-lg bg-well border border-border flex items-center justify-center text-primary shrink-0">
                  <CheckCheck className="size-4" />
                </div>
                <div className="min-w-0">
                  <span className="font-mono text-xs font-bold text-foreground block truncate">
                    TRANSMIT READ RECEIPT CHECKS
                  </span>
                  <p className="font-mono text-[11px] text-muted-foreground truncate">
                    Transmit delivery confirmation tick upon message viewing
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
        </Module>

        {/* MOD 05: Operator Card & Gateway */}
        <Module
          label="MOD·05 / OPERATOR GATEWAY"
          title="Account Identity"
          description="Direct link to operator card and master configuration"
        >
          <Link
            to="/profile"
            className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-well/40 hover:bg-well hover:border-primary/50 transition-all group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="size-10 rounded-xl border border-border shrink-0">
                <AvatarImage src={getAvatarUrl(user?.avatar)} alt={user?.name} />
                <AvatarFallback className="font-mono text-xs font-bold bg-well text-foreground">
                  {user?.name?.slice(0, 2)?.toUpperCase() || 'OP'}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                    {user?.name || 'Operator'}
                  </span>
                  <span className="font-mono text-[10px] px-1.5 py-0.2 rounded border border-border bg-card text-muted-foreground">
                    OP·{channelNo(user?.id || 1)}
                  </span>
                </div>
                <p className="font-mono text-[11px] text-muted-foreground truncate">
                  {user?.email || 'Configure avatar, callsign, and encryption passcodes'}
                </p>
              </div>
            </div>

            <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
          </Link>
        </Module>

        {/* MOD 06: Session Flush */}
        <Module
          label="MOD·06 / SESSION TERMINATION"
          title="Disconnect Device"
          description="Flush cached authentication state and sever WebSocket links"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl bg-destructive/5 border border-destructive/20">
            <div>
              <h4 className="font-mono text-sm font-bold text-destructive">
                LOGOUT OPERATOR
              </h4>
              <p className="font-mono text-xs text-muted-foreground mt-0.5">
                Revoke local session tokens and return to front login panel.
              </p>
            </div>
            <Button
              type="button"
              variant="destructive"
              onClick={handleLogout}
              className="font-mono text-xs h-10 px-4 shrink-0 gap-2"
            >
              <LogOut className="size-3.5" />
              DISCONNECT
            </Button>
          </div>
        </Module>

        {/* Hardware Backplate Footer */}
        <div className="rounded-xl border border-border bg-well/30 p-4 font-mono text-center space-y-1 text-2xs text-muted-foreground/70">
          <div className="font-bold text-foreground/80 tracking-widest uppercase">
            MNK CONSOLE &middot; MODEL RT-2 &middot; SERIAL 084-2026
          </div>
          <div>
            CORE: DJANGO CHANNELS ASGI &middot; REDIS PUB/SUB &middot; REACT 18 &middot; WEBRTC MESH/SFU
          </div>
        </div>
      </div>
    </PageFrame>
  );
}
