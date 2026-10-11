import { useLocation, useNavigate, NavLink } from 'react-router-dom';
import {
  MessageSquare,
  Radio,
  User,
  Bell,
  Settings,
  Plus,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import ThemeSwitch from './ThemeSwitch';
import { useAppSelector } from '@/app/hooks';
import { useGetNotificationsQuery } from '@/services/chatApi';
import { useHuddle } from '@/contexts/HuddleContext';
import { cn, getAvatarUrl } from '@/lib/utils';
import { BrandMark } from '@/components/console/BrandMark';
import { Led } from '@/components/console';

interface NavigationRailProps {
  onVoiceFilterToggle?: () => void;
  isVoiceFilterActive?: boolean;
  activeVoiceCount?: number;
  className?: string;
  isMobile?: boolean;
  activeChat?: number;
}

export default function NavigationRail({
  onVoiceFilterToggle,
  isVoiceFilterActive = false,
  activeVoiceCount = 0,
  className,
}: NavigationRailProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAppSelector(state => state.auth.user);
  const { isHuddleActive } = useHuddle();

  const { data: notifications } = useGetNotificationsQuery();

  const unreadNotificationsCount =
    notifications?.filter(n => !n.is_read).length || 0;

  const isChatActive = location.pathname.startsWith('/chat');
  const isNotificationsActive = location.pathname === '/notifications';
  const isSettingsActive = location.pathname === '/settings';
  const isProfileActive = location.pathname === '/profile';

  return (
    <aside
      className={cn(
        'w-[74px] h-full flex flex-col items-center justify-between py-3 px-2',
        'bg-background select-none flex-shrink-0 z-30',
        className
      )}
    >
      {/* Top: Rotary Knob Brand Mark & Section Keys */}
      <div className="flex flex-col items-center gap-2.5 w-full">
        {/* Brand Key */}
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => navigate('/chat')}
                className="group relative flex items-center justify-center p-1 rounded-full transition-transform active:scale-95"
                aria-label="MNK Chat Hub"
              >
                <BrandMark size={42} spin={isHuddleActive} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <span className="font-mono text-xs">CONSOLE HUB [MNK/CHAT]</span>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Hairline Divider / Ruler Ticks */}
        <div className="w-8 h-px bg-border my-1" />

        {/* Primary Controls */}
        <div className="flex flex-col items-center gap-2 w-full">
          {/* 1. Conversations (MSG) */}
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative group w-full flex items-center justify-center">
                  <button
                    onClick={() => {
                      if (isVoiceFilterActive && onVoiceFilterToggle) {
                        onVoiceFilterToggle();
                      }
                      navigate('/chat');
                    }}
                    className={cn(
                      'relative flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all duration-150',
                      isChatActive && !isVoiceFilterActive
                        ? 'key-signal font-bold'
                        : 'key hover:bg-accent text-muted-foreground hover:text-foreground'
                    )}
                    aria-label="Conversations"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span className="font-mono text-[9px] uppercase tracking-wider mt-0.5">
                      MSG
                    </span>
                  </button>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <span className="font-mono text-xs">CHANNELS & DMS</span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* 2. Voice Lounges (VOX) */}
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative group w-full flex items-center justify-center">
                  <button
                    onClick={() => {
                      if (onVoiceFilterToggle) onVoiceFilterToggle();
                      if (!isChatActive) navigate('/chat');
                    }}
                    className={cn(
                      'relative flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all duration-150',
                      isVoiceFilterActive
                        ? 'bg-live text-live-foreground shadow-key font-bold'
                        : isHuddleActive
                          ? 'key border border-live/50 text-live font-semibold'
                          : 'key hover:bg-accent text-muted-foreground hover:text-foreground'
                    )}
                    aria-label="Voice Lounges"
                  >
                    <Radio
                      className={cn(
                        'w-4 h-4',
                        isHuddleActive && 'animate-pulse text-live'
                      )}
                    />
                    <span className="font-mono text-[9px] uppercase tracking-wider mt-0.5">
                      VOX
                    </span>

                    {/* Active Voice Pill / LED */}
                    {activeVoiceCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-live text-[9px] font-mono font-bold text-live-foreground shadow-xs ring-2 ring-background">
                        {activeVoiceCount}
                      </span>
                    )}
                  </button>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <span className="font-mono text-xs">
                  {isVoiceFilterActive
                    ? 'FILTER: VOICE CHANNELS'
                    : `VOICE HUDDLES (${activeVoiceCount} ACTIVE)`}
                </span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* 3. Signals / Notifications (SIG) */}
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative group w-full flex items-center justify-center">
                  <button
                    onClick={() => navigate('/notifications')}
                    className={cn(
                      'relative flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all duration-150',
                      isNotificationsActive
                        ? 'key-signal font-bold'
                        : 'key hover:bg-accent text-muted-foreground hover:text-foreground'
                    )}
                    aria-label="Notifications"
                  >
                    <Bell className="w-4 h-4" />
                    <span className="font-mono text-[9px] uppercase tracking-wider mt-0.5">
                      SIG
                    </span>

                    {unreadNotificationsCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-primary text-[9px] font-mono font-bold text-primary-foreground ring-2 ring-background shadow-xs">
                        {unreadNotificationsCount > 9
                          ? '9+'
                          : unreadNotificationsCount}
                      </span>
                    )}
                  </button>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <span className="font-mono text-xs">ACTIVITY & SIGNALS</span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Bottom: Patch/Add Key, Theme, Settings & Profile */}
      <div className="flex flex-col items-center gap-2.5 w-full pt-2">
        {/* New Channel / Patch Key */}
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => navigate('/new-chat')}
                className="flex items-center justify-center w-10 h-10 rounded-full key hover:bg-accent text-foreground transition-all duration-150"
                aria-label="New Channel or DM"
              >
                <Plus className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <span className="font-mono text-xs">OPEN NEW CHANNEL [PATCH]</span>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Theme Toggle Key */}
        <div className="flex items-center justify-center">
          <ThemeSwitch
            variant="ghost"
            className="w-10 h-10 rounded-full text-muted-foreground hover:text-foreground"
          />
        </div>

        {/* Settings Key */}
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <NavLink
                to="/settings"
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-full transition-colors',
                  isSettingsActive
                    ? 'key text-foreground font-bold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )}
                aria-label="Settings"
              >
                <Settings className="w-4 h-4" />
              </NavLink>
            </TooltipTrigger>
            <TooltipContent side="right">
              <span className="font-mono text-xs">SYSTEM SETTINGS</span>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="w-8 h-px bg-border my-0.5" />

        {/* User Identity Avatar */}
        {user && (
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => navigate('/profile')}
                  className={cn(
                    'relative group flex items-center justify-center p-0.5 rounded-full transition-all duration-150',
                    isProfileActive
                      ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                      : 'hover:ring-1 hover:ring-border'
                  )}
                  aria-label="Operator Profile"
                >
                  <Avatar className="w-9 h-9 border border-border shadow-xs">
                    <AvatarImage
                      src={getAvatarUrl(user.avatar)}
                      alt={user.name}
                    />
                    <AvatarFallback className="font-mono font-bold text-xs bg-well">
                      {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <Led
                    tone="live"
                    className="absolute bottom-0 right-0 ring-2 ring-background"
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="font-bold text-xs">{user.name}</p>
                <p className="font-mono text-[10px] text-muted-foreground">OPERATOR PROFILE</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </aside>
  );
}

/**
 * Hardware tactile bottom dock for small screens
 */
export function MobileDock({
  onVoiceFilterToggle,
  isVoiceFilterActive = false,
  activeVoiceCount = 0,
}: {
  onVoiceFilterToggle?: () => void;
  isVoiceFilterActive?: boolean;
  activeVoiceCount?: number;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAppSelector(state => state.auth.user);
  const { isHuddleActive } = useHuddle();
  const { data: notifications } = useGetNotificationsQuery();

  const unreadNotificationsCount =
    notifications?.filter(n => !n.is_read).length || 0;

  const isChatActive = location.pathname.startsWith('/chat');
  const isNotificationsActive = location.pathname === '/notifications';
  const isProfileActive = location.pathname === '/profile';

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40 md:hidden',
        'h-[calc(4rem+env(safe-area-inset-bottom,0px))] pb-[env(safe-area-inset-bottom,0px)]',
        'bg-card border-t border-border shadow-panel',
        'flex items-center justify-around px-2'
      )}
    >
      {/* Channels (MSG) */}
      <button
        onClick={() => {
          if (isVoiceFilterActive && onVoiceFilterToggle) onVoiceFilterToggle();
          navigate('/chat');
        }}
        className={cn(
          'flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-all active:scale-95',
          isChatActive && !isVoiceFilterActive
            ? 'key-signal py-1.5 px-3.5'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <MessageSquare className="w-4 h-4" />
        <span className="font-mono text-[9px] uppercase tracking-wider mt-0.5">
          MSG
        </span>
      </button>

      {/* Voice Huddle (VOX) */}
      <button
        onClick={() => {
          if (onVoiceFilterToggle) onVoiceFilterToggle();
          if (!isChatActive) navigate('/chat');
        }}
        className={cn(
          'flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-all relative active:scale-95',
          isVoiceFilterActive
            ? 'bg-live text-live-foreground shadow-key py-1.5 px-3.5 font-bold'
            : isHuddleActive
              ? 'text-live font-semibold'
              : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <Radio
          className={cn(
            'w-4 h-4',
            isHuddleActive && 'animate-pulse text-live'
          )}
        />
        <span className="font-mono text-[9px] uppercase tracking-wider mt-0.5">
          VOX
        </span>
        {activeVoiceCount > 0 && (
          <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-live animate-pulse" />
        )}
      </button>

      {/* Activity Signals (SIG) */}
      <button
        onClick={() => navigate('/notifications')}
        className={cn(
          'flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-all relative active:scale-95',
          isNotificationsActive
            ? 'key-signal py-1.5 px-3.5'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <Bell className="w-4 h-4" />
        <span className="font-mono text-[9px] uppercase tracking-wider mt-0.5">
          SIG
        </span>
        {unreadNotificationsCount > 0 && (
          <span className="absolute top-1 right-2 flex h-3.5 min-w-3.5 px-0.5 items-center justify-center rounded-full bg-primary text-[8px] font-mono font-bold text-primary-foreground">
            {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
          </span>
        )}
      </button>

      {/* Operator Profile */}
      <button
        onClick={() => navigate('/profile')}
        className={cn(
          'flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-all active:scale-95',
          isProfileActive
            ? 'key-signal py-1.5 px-3.5'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        {user ? (
          <Avatar className="w-4 h-4 border border-border">
            <AvatarImage src={getAvatarUrl(user.avatar)} alt={user.name} />
            <AvatarFallback className="text-[8px] font-bold">
              {user.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ) : (
          <User className="w-4 h-4" />
        )}
        <span className="font-mono text-[9px] uppercase tracking-wider mt-0.5">
          USER
        </span>
      </button>
    </nav>
  );
}
