import { useLocation, useNavigate, NavLink } from 'react-router-dom';
import {
  MessageSquare,
  Radio,
  Users,
  Bell,
  Settings,
  Plus,
  Compass,
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
import {
  useGetNotificationsQuery,
  useGetFriendRequestsQuery,
} from '@/services/chatApi';
import { useHuddle } from '@/contexts/HuddleContext';
import { cn, getAvatarUrl } from '@/lib/utils';

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
  isMobile = false,
  activeChat,
}: NavigationRailProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAppSelector(state => state.auth.user);
  const { isHuddleActive } = useHuddle();

  const { data: notifications } = useGetNotificationsQuery();
  const { data: friendRequests } = useGetFriendRequestsQuery();

  const unreadNotificationsCount =
    notifications?.filter(n => !n.is_read).length || 0;
  const pendingRequestsCount = friendRequests?.length || 0;

  const isChatActive = location.pathname.startsWith('/chat');
  const isFriendsActive = location.pathname === '/friends';
  const isNotificationsActive = location.pathname === '/notifications';
  const isSettingsActive = location.pathname === '/settings';
  const isProfileActive = location.pathname === '/profile';

  return (
    <>
      {/* 1. Desktop Vertical Navigation Rail (Column 1) */}
      <aside
        className={cn(
          'w-[68px] sm:w-[72px] h-full flex flex-col items-center justify-between py-3 px-2',
          'bg-card/90 dark:bg-card/95 border-r border-border/60 backdrop-blur-xl',
          'select-none flex-shrink-0 z-30 transition-all duration-300',
          className
        )}
      >
        {/* Top Section: App Brand & Primary Navigation */}
        <div className="flex flex-col items-center gap-2 w-full">
          {/* Brand Orb */}
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => navigate('/chat')}
                  className="group relative flex items-center justify-center w-12 h-12 rounded-[22px] hover:rounded-[14px] bg-gradient-to-tr from-primary to-indigo-600 text-white shadow-lg shadow-primary/25 transition-all duration-200"
                >
                  <Compass className="w-6 h-6 transition-transform duration-200 group-hover:rotate-45" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-semibold">
                Workspace Hub
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Divider */}
          <div className="w-8 h-[2px] bg-border/60 rounded-full my-1" />

          {/* Primary Navigation Rail Icons */}
          <div className="flex flex-col items-center gap-1.5 w-full">
            {/* 1. Direct Messages / All Chats */}
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative group w-full flex items-center justify-center">
                    {/* Left Active Pill */}
                    <span
                      className={cn(
                        'absolute left-0 w-1 bg-primary rounded-r-full transition-all duration-200',
                        isChatActive && !isVoiceFilterActive
                          ? 'h-9'
                          : 'h-0 group-hover:h-5'
                      )}
                    />

                    <button
                      onClick={() => {
                        if (isVoiceFilterActive && onVoiceFilterToggle) {
                          onVoiceFilterToggle();
                        }
                        navigate('/chat');
                      }}
                      className={cn(
                        'relative flex items-center justify-center w-12 h-12 rounded-[22px] transition-all duration-200',
                        'group-hover:rounded-[14px]',
                        isChatActive && !isVoiceFilterActive
                          ? 'bg-primary text-primary-foreground rounded-[14px] shadow-md shadow-primary/20'
                          : 'bg-muted/40 text-muted-foreground hover:bg-primary/10 hover:text-primary'
                      )}
                    >
                      <MessageSquare className="w-5 h-5" />
                    </button>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  Conversations & Chats
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* 2. Voice Lounges & Active Huddles */}
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative group w-full flex items-center justify-center">
                    {/* Left Active Pill */}
                    <span
                      className={cn(
                        'absolute left-0 w-1 bg-emerald-500 rounded-r-full transition-all duration-200',
                        isVoiceFilterActive || isHuddleActive
                          ? 'h-9'
                          : 'h-0 group-hover:h-5'
                      )}
                    />

                    <button
                      onClick={() => {
                        if (onVoiceFilterToggle) onVoiceFilterToggle();
                        if (!isChatActive) navigate('/chat');
                      }}
                      className={cn(
                        'relative flex items-center justify-center w-12 h-12 rounded-[22px] transition-all duration-200',
                        'group-hover:rounded-[14px]',
                        isVoiceFilterActive
                          ? 'bg-emerald-600 text-white rounded-[14px] shadow-md shadow-emerald-600/25'
                          : isHuddleActive
                            ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                            : 'bg-muted/40 text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-500'
                      )}
                    >
                      <Radio
                        className={cn(
                          'w-5 h-5',
                          isHuddleActive && 'animate-pulse text-emerald-500'
                        )}
                      />

                      {/* Active Voice Badge */}
                      {activeVoiceCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-background">
                          {activeVoiceCount}
                        </span>
                      )}
                    </button>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {isVoiceFilterActive
                    ? 'Showing Voice Channels'
                    : `Voice Huddles (${activeVoiceCount} active)`}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* 3. Connections & Friends */}
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative group w-full flex items-center justify-center">
                    <span
                      className={cn(
                        'absolute left-0 w-1 bg-primary rounded-r-full transition-all duration-200',
                        isFriendsActive ? 'h-9' : 'h-0 group-hover:h-5'
                      )}
                    />

                    <button
                      onClick={() => navigate('/friends')}
                      className={cn(
                        'relative flex items-center justify-center w-12 h-12 rounded-[22px] transition-all duration-200',
                        'group-hover:rounded-[14px]',
                        isFriendsActive
                          ? 'bg-primary text-primary-foreground rounded-[14px] shadow-md shadow-primary/20'
                          : 'bg-muted/40 text-muted-foreground hover:bg-primary/10 hover:text-primary'
                      )}
                    >
                      <Users className="w-5 h-5" />

                      {pendingRequestsCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white ring-2 ring-background">
                          {pendingRequestsCount}
                        </span>
                      )}
                    </button>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  Friends & Connections
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* 4. Notifications */}
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative group w-full flex items-center justify-center">
                    <span
                      className={cn(
                        'absolute left-0 w-1 bg-primary rounded-r-full transition-all duration-200',
                        isNotificationsActive ? 'h-9' : 'h-0 group-hover:h-5'
                      )}
                    />

                    <button
                      onClick={() => navigate('/notifications')}
                      className={cn(
                        'relative flex items-center justify-center w-12 h-12 rounded-[22px] transition-all duration-200',
                        'group-hover:rounded-[14px]',
                        isNotificationsActive
                          ? 'bg-primary text-primary-foreground rounded-[14px] shadow-md shadow-primary/20'
                          : 'bg-muted/40 text-muted-foreground hover:bg-primary/10 hover:text-primary'
                      )}
                    >
                      <Bell className="w-5 h-5" />

                      {unreadNotificationsCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white ring-2 ring-background">
                          {unreadNotificationsCount > 9
                            ? '9+'
                            : unreadNotificationsCount}
                        </span>
                      )}
                    </button>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">Notifications</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Bottom Section: Create Chat, Theme, Settings & Profile */}
        <div className="flex flex-col items-center gap-2 w-full pt-2">
          {/* Quick New Chat Button */}
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => navigate('/new-chat')}
                  className="flex items-center justify-center w-11 h-11 rounded-[20px] hover:rounded-[12px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 transition-all duration-200"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                Start New Chat or Group
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Theme Switcher */}
          <div className="flex items-center justify-center w-11 h-11">
            <ThemeSwitch
              variant="ghost"
              className="w-10 h-10 rounded-xl hover:bg-muted text-muted-foreground"
            />
          </div>

          {/* Settings */}
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <NavLink
                  to="/settings"
                  className={cn(
                    'flex items-center justify-center w-11 h-11 rounded-xl transition-colors',
                    isSettingsActive
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Settings className="w-5 h-5" />
                </NavLink>
              </TooltipTrigger>
              <TooltipContent side="right">Settings</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="w-8 h-[1px] bg-border/60 rounded-full my-0.5" />

          {/* User Profile Avatar with Online Dot */}
          {user && (
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => navigate('/profile')}
                    className={cn(
                      'relative group flex items-center justify-center p-0.5 rounded-full transition-all duration-200',
                      isProfileActive
                        ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                        : 'hover:ring-2 hover:ring-primary/40'
                    )}
                  >
                    <Avatar className="w-10 h-10 border border-border shadow-sm">
                      <AvatarImage
                        src={getAvatarUrl(user.avatar)}
                        alt={user.name}
                      />
                      <AvatarFallback className="font-bold bg-primary/10 text-primary text-xs">
                        {user.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 rounded-full border-background ring-1 ring-emerald-500/20" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p className="font-semibold">{user.name}</p>
                  <p className="text-xs text-muted-foreground">View Profile</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </aside>

      {/* 2. Mobile Bottom Navigation Dock (Shown only on small screens when not inside a chat) */}
      {isMobile && !activeChat && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden h-14 bg-card/95 backdrop-blur-xl border-t border-border/80 flex items-center justify-around px-2 shadow-lg">
          {/* Chats */}
          <button
            onClick={() => {
              if (isVoiceFilterActive && onVoiceFilterToggle)
                onVoiceFilterToggle();
              navigate('/chat');
            }}
            className={cn(
              'flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-colors relative',
              isChatActive && !isVoiceFilterActive
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-[10px] font-medium mt-0.5">Chats</span>
          </button>

          {/* Voice Lounges */}
          <button
            onClick={() => {
              if (onVoiceFilterToggle) onVoiceFilterToggle();
              if (!isChatActive) navigate('/chat');
            }}
            className={cn(
              'flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-colors relative',
              isVoiceFilterActive
                ? 'text-emerald-500'
                : 'text-muted-foreground hover:text-emerald-500'
            )}
          >
            <Radio
              className={cn(
                'w-5 h-5',
                isHuddleActive && 'animate-pulse text-emerald-500'
              )}
            />
            <span className="text-[10px] font-medium mt-0.5">Voice</span>
            {activeVoiceCount > 0 && (
              <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>

          {/* Friends */}
          <button
            onClick={() => navigate('/friends')}
            className={cn(
              'flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-colors relative',
              isFriendsActive
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px] font-medium mt-0.5">Friends</span>
            {pendingRequestsCount > 0 && (
              <span className="absolute top-1 right-2 flex h-3.5 min-w-3.5 px-0.5 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-white">
                {pendingRequestsCount}
              </span>
            )}
          </button>

          {/* Notifications */}
          <button
            onClick={() => navigate('/notifications')}
            className={cn(
              'flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-colors relative',
              isNotificationsActive
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Bell className="w-5 h-5" />
            <span className="text-[10px] font-medium mt-0.5">Alerts</span>
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1 right-2 flex h-3.5 min-w-3.5 px-0.5 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-white">
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* Profile */}
          <button
            onClick={() => navigate('/profile')}
            className={cn(
              'flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-colors',
              isProfileActive
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {user ? (
              <Avatar className="w-5 h-5 border border-border">
                <AvatarImage src={getAvatarUrl(user.avatar)} alt={user.name} />
                <AvatarFallback className="text-[9px] font-bold bg-muted">
                  {user.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
            ) : (
              <Users className="w-5 h-5" />
            )}
            <span className="text-[10px] font-medium mt-0.5">Profile</span>
          </button>
        </nav>
      )}
    </>
  );
}
